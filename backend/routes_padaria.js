// ═══════════════════════════════════════════════════════════════════════════════
// ROTAS: RH › PAGAMENTOS › PADARIA
// Arquivo: backend/routes_padaria.js
// Registro no server.js:
//   require('./routes_padaria')(app, db, authenticateToken, r2, sendMailHelper);
//
// - Anexo da imagem (foto) do fechamento manuscrito da padaria
// - Leitura e análise via IA (Gemini) → linhas: data, quantidade, valor, observação
// - Tabela editável na tela (conferência da leitura), planilha XLSX
// - Envio ao financeiro (e-mail editável) com a planilha em anexo e os dados para pagamento
// - Imagem guardada no Cloudflare R2 (fallback base64 no banco quando o R2 não está configurado)
// ═══════════════════════════════════════════════════════════════════════════════
"use strict";

const path = require('path');
const multer = require('multer');
const ExcelJS = require('exceljs');
const { GoogleGenerativeAI } = require('@google/generative-ai');
let sharp = null;
try { sharp = require('sharp'); } catch (e) { /* sharp opcional: usa a imagem original */ }

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const pad2 = n => String(n).padStart(2, '0');
const mesValido = m => /^\d{4}-(0[1-9]|1[0-2])$/.test(String(m || ''));
const mesLabel = m => { const [y, mm] = String(m).split('-'); return `${MESES[parseInt(mm, 10) - 1]}/${y}`; };
const round2 = v => Math.round((Number(v) || 0) * 100) / 100;

// ── Normalização de valores lidos pela IA ───────────────────────────────────
function parseNumeroBR(v) {
    if (typeof v === 'number') return isFinite(v) ? v : 0;
    let s = String(v == null ? '' : v).replace(/[^\d.,-]/g, '');
    if (!s) return 0;
    if (s.includes(',') && s.includes('.')) s = s.replace(/\./g, '').replace(',', '.');   // 1.234,56
    else if (s.includes(',')) s = s.replace(',', '.');                                       // 41,25
    const n = parseFloat(s);
    return isFinite(n) ? n : 0;
}

function parseDataDDMM(txt) {
    const m = String(txt || '').match(/(\d{1,2})\s*[\/.\-]\s*(\d{1,2})(?:\s*[\/.\-]\s*(\d{2,4}))?/);
    if (!m) return null;
    const dia = parseInt(m[1], 10), mes = parseInt(m[2], 10);
    if (dia < 1 || dia > 31 || mes < 1 || mes > 12) return null;
    let ano = null;
    if (m[3]) { ano = parseInt(m[3], 10); if (ano < 100) ano += 2000; }
    return { dia, mes, ano };
}

// ── Análise da imagem via IA (Gemini) ───────────────────────────────────────
async function candidatosGemini() {
    const preferencia = ['models/gemini-3.6-flash', 'models/gemini-3.5-flash', 'models/gemini-3.7-flash', 'models/gemini-flash-latest', 'models/gemini-2.5-flash', 'models/gemini-pro-latest'];
    let disponiveis = [];
    try {
        const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`);
        if (r.ok) { const d = await r.json(); disponiveis = (d.models || []).map(m => m.name); }
    } catch (e) { console.warn('[PADARIA] Aviso ao listar modelos do Gemini:', e.message); }
    let lista = [];
    if (disponiveis.length) {
        lista = preferencia.filter(m => disponiveis.includes(m)).map(m => m.replace('models/', ''));
        if (!lista.length) {
            lista = disponiveis.filter(n => n.includes('flash') && !/lite|preview|tts|image/.test(n)).map(m => m.replace('models/', ''));
        }
    }
    if (!lista.length) lista = ['gemini-3.6-flash', 'gemini-2.5-flash'];
    return lista;
}

const PROMPT_PADARIA = `Você é um assistente de leitura de documentos manuscritos. A imagem é a foto de uma folha de fechamento mensal de uma padaria (fornecedora de lanches), preenchida à mão, com colunas: DATA, QUANTIDADE, VALOR e NOME. No topo há o nome da firma/empresa e, no rodapé, pode haver um campo "Valor" com o total escrito à mão.

Leia TODAS as linhas preenchidas da tabela, de cima para baixo, e responda SOMENTE com um JSON válido (sem markdown, sem comentários), neste formato exato:
{
  "linhas": [
    { "data": "dd/mm", "quantidade": 55, "valor": 41.25, "observacao": "", "incerto": false }
  ],
  "total_escrito": 907.5,
  "observacao_geral": ""
}

Regras:
- "data": exatamente dd/mm (se houver o ano escrito, use dd/mm/aaaa). Zeros à esquerda (ex.: "01/10").
- "quantidade": número inteiro.
- "valor": número decimal com ponto (ex.: 41.25). Nunca inclua "R$".
- "observacao": texto escrito na coluna NOME ou anotação ao lado da linha; use "" quando não houver nada.
- "incerto": true somente se a leitura daquela linha (data, quantidade ou valor) estiver duvidosa/ilegível; caso contrário false.
- NÃO invente linhas: ignore as linhas em branco. NÃO corrija nem "complete" valores: transcreva o que está escrito.
- "total_escrito": o total escrito à mão no campo "Valor" do rodapé (número decimal com ponto). Se houver um número de telefone/PIX ao lado, ignore-o e use apenas o valor monetário. Use null se não houver.
- "observacao_geral": qualquer outra anotação relevante da folha (ex.: nome da firma, avisos). Use "" se não houver.`;

async function analisarImagemIA(buffer, mimeType) {
    if (!process.env.GEMINI_API_KEY) throw new Error('Chave da API do Gemini não configurada no servidor.');
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const candidatos = await candidatosGemini();
    const parte = { inlineData: { data: buffer.toString('base64'), mimeType: mimeType || 'image/jpeg' } };
    let ultimoErro = null;
    for (const nome of candidatos) {
        try {
            console.log(`[PADARIA][Gemini] Tentando modelo: ${nome}`);
            const model = genAI.getGenerativeModel({ model: nome, generationConfig: { temperature: 0, responseMimeType: 'application/json' } });
            const result = await model.generateContent([PROMPT_PADARIA, parte]);
            const texto = result.response.text();
            const json = extrairJson(texto);
            console.log(`[PADARIA][Gemini] Sucesso com modelo: ${nome}`);
            return json;
        } catch (e) {
            const msg = String(e.message || '');
            console.warn(`[PADARIA][Gemini] Falha com ${nome}: ${msg.substring(0, 140)}`);
            ultimoErro = e;
            const tentarOutro = /503|high demand|404|no longer available|not found|JSON|429|overloaded/i.test(msg);
            if (!tentarOutro) break;
        }
    }
    throw new Error('Falha ao analisar a imagem via IA: ' + (ultimoErro ? ultimoErro.message : 'erro desconhecido'));
}

function extrairJson(texto) {
    let t = String(texto || '').trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
    const ini = t.indexOf('{'), fim = t.lastIndexOf('}');
    if (ini < 0 || fim < ini) throw new Error('A IA não retornou um JSON válido (JSON ausente).');
    return JSON.parse(t.slice(ini, fim + 1));
}

// Converte o JSON da IA em linhas normalizadas + mês de referência
function normalizarAnalise(json, mesPadrao, hoje) {
    hoje = hoje || new Date();
    const brutas = Array.isArray(json && json.linhas) ? json.linhas : [];
    const parsed = brutas.map(l => ({ l, d: parseDataDDMM(l && l.data) }));

    // Mês de referência: o mês mais frequente entre as datas lidas
    const cont = {};
    parsed.forEach(p => { if (p.d) cont[p.d.mes] = (cont[p.d.mes] || 0) + 1; });
    let mesRef = mesValido(mesPadrao) ? mesPadrao : `${hoje.getFullYear()}-${pad2(hoje.getMonth() + 1)}`;
    const meses = Object.keys(cont).sort((a, b) => cont[b] - cont[a]);
    if (meses.length) {
        const mm = parseInt(meses[0], 10);
        let ano = hoje.getFullYear();
        const comAno = parsed.find(p => p.d && p.d.mes === mm && p.d.ano);
        if (comAno) ano = comAno.d.ano;
        else if (mm > hoje.getMonth() + 1) ano -= 1;     // ex.: folha de dezembro lida em janeiro
        mesRef = `${ano}-${pad2(mm)}`;
    }
    const anoRef = mesRef.slice(0, 4);

    const linhas = parsed.map(({ l, d }) => ({
        data: d ? `${d.ano || anoRef}-${pad2(d.mes)}-${pad2(d.dia)}` : '',
        quantidade: Math.max(0, Math.round(parseNumeroBR(l && l.quantidade))),
        valor: round2(Math.max(0, parseNumeroBR(l && l.valor))),
        observacao: String((l && l.observacao) || '').trim().slice(0, 500),
        incerto: !!(l && l.incerto) || !d
    }));
    const totalEscrito = (json && json.total_escrito != null && json.total_escrito !== '') ? round2(parseNumeroBR(json.total_escrito)) : null;
    return { mesRef, linhas, totalEscrito: totalEscrito && totalEscrito > 0 ? totalEscrito : null, observacaoGeral: String((json && json.observacao_geral) || '').trim().slice(0, 1000) };
}

// ── Validação das linhas vindas do frontend ─────────────────────────────────
function sanitizarLinhas(arr) {
    if (!Array.isArray(arr)) throw new Error('Linhas inválidas.');
    if (arr.length > 400) throw new Error('Linhas demais (máximo 400).');
    return arr.map(l => {
        const data = /^\d{4}-\d{2}-\d{2}$/.test(String(l && l.data || '')) ? l.data : '';
        return {
            data,
            quantidade: Math.max(0, Math.round(parseNumeroBR(l && l.quantidade))),
            valor: round2(Math.max(0, parseNumeroBR(l && l.valor))),
            observacao: String((l && l.observacao) || '').slice(0, 500),
            incerto: !!(l && l.incerto)
        };
    });
}
const totaisLinhas = linhas => ({
    qtd: linhas.reduce((a, l) => a + (Number(l.quantidade) || 0), 0),
    valor: round2(linhas.reduce((a, l) => a + (Number(l.valor) || 0), 0))
});

module.exports = function registerPadariaRoutes(app, db, authenticateToken, r2, sendMailHelper) {

    const PAGE_ID = 'rh-padaria';
    const CFG_DEFAULTS = {
        padaria_email_financeiro: 'contas@americarental.com.br',
        padaria_pagto_favorecido: 'Pedro Lucas Silva dos Santos',
        padaria_pagto_cpf: '454.522.508-08',
        padaria_pagto_pix: '(17) 98170-4008'
    };
    const uploadMem = multer({
        storage: multer.memoryStorage(),
        limits: { fileSize: 20 * 1024 * 1024 },
        fileFilter: (req, file, cb) => cb(null, /^image\//i.test(file.mimetype))
    });

    // ── Helpers de banco (promises) ────────────────────────────────────────────
    const dbRun = (sql, params = []) => new Promise((resolve, reject) => {
        db.run(sql, params, function (err) { if (err) reject(err); else resolve({ lastID: this.lastID, changes: this.changes }); });
    });
    const dbGet = (sql, params = []) => new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => err ? reject(err) : resolve(row || null));
    });
    const dbAll = (sql, params = []) => new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows || []));
    });

    // ── Migração ────────────────────────────────────────────────────────────────
    db.serialize(() => {
        db.run(`CREATE TABLE IF NOT EXISTS configuracoes_sistema (chave TEXT PRIMARY KEY, valor TEXT)`);
        db.run(`CREATE TABLE IF NOT EXISTS padaria_fechamentos (
            id                  INTEGER PRIMARY KEY AUTOINCREMENT,
            mes_ref             TEXT NOT NULL UNIQUE,
            linhas_json         TEXT NOT NULL DEFAULT '[]',
            qtd_total           INTEGER NOT NULL DEFAULT 0,
            valor_total         REAL NOT NULL DEFAULT 0,
            valor_total_escrito REAL,
            observacao_geral    TEXT,
            r2_key              TEXT,
            imagem_base64       TEXT,
            mime                TEXT,
            nome_arquivo        TEXT,
            criado_por          TEXT,
            criado_em           DATETIME DEFAULT CURRENT_TIMESTAMP,
            atualizado_em       DATETIME DEFAULT CURRENT_TIMESTAMP,
            enviado_em          DATETIME,
            enviado_por         TEXT,
            email_destino       TEXT,
            enviado_valor       REAL
        )`);
    });

    // ── Configurações ──────────────────────────────────────────────────────────
    async function getConfig() {
        const keys = Object.keys(CFG_DEFAULTS);
        const rows = await dbAll(`SELECT chave, valor FROM configuracoes_sistema WHERE chave IN (${keys.map(() => '?').join(',')})`, keys);
        const cfg = { ...CFG_DEFAULTS };
        rows.forEach(r => { if (r.valor !== null && String(r.valor).trim() !== '') cfg[r.chave] = String(r.valor).trim(); });
        return cfg;
    }
    async function setConfig(chave, valor) {
        await dbRun(`INSERT INTO configuracoes_sistema (chave, valor) VALUES (?, ?) ON CONFLICT(chave) DO UPDATE SET valor = excluded.valor`, [chave, String(valor)]);
    }

    // ── Utilidades ──────────────────────────────────────────────────────────────
    const isoHoje = () => { const d = new Date(); return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; };
    const fmtDataBR = iso => { const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? `${m[3]}/${m[2]}/${m[1]}` : ''; };
    const brl = v => (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const usuarioReq = req => (req.user && (req.user.username || req.user.nome)) || 'Sistema';
    function parseEmails(str) {
        const lista = String(str || '').split(/[;,\s]+/).map(s => s.trim()).filter(Boolean);
        if (lista.length === 0) return { ok: false, lista };
        return { ok: lista.every(e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)), lista };
    }

    // ── Permissão da tela (Controle de Acesso → página 'rh-padaria') ───────────
    function isTopAdmin(u) {
        return !!u && (u.role === 'Diretoria' || u.role === 'Administrador' || u.departamento === 'Diretoria'
            || (u.grupo_nome && String(u.grupo_nome).toLowerCase() === 'diretoria'));
    }
    async function requirePadaria(req, res, next) {
        try {
            if (isTopAdmin(req.user)) return next();
            const gid = req.user && req.user.grupo_permissao_id;
            if (!gid) return res.status(403).json({ error: 'Sem permissão para acessar a tela Padaria.' });
            const row = await dbGet('SELECT visualizar FROM permissoes_grupo WHERE grupo_id = ? AND pagina_id = ?', [gid, PAGE_ID]);
            const v = row && row.visualizar;
            if (v === 1 || v === '1' || v === true || v === 'true') return next();
            return res.status(403).json({ error: 'Sem permissão para acessar a tela Padaria.' });
        } catch (e) {
            return res.status(500).json({ error: e.message });
        }
    }
    const guard = [authenticateToken, requirePadaria];

    // ── R2 ──────────────────────────────────────────────────────────────────────
    const r2Pronto = () => !!(r2 && typeof r2.isReady === 'function' && r2.isReady());
    async function r2Baixar(key) {
        const f = await r2.downloadStreamFromR2(key);
        if (f && f.stream && typeof f.stream.transformToByteArray === 'function') return Buffer.from(await f.stream.transformToByteArray());
        if (f && f.stream) { const chunks = []; for await (const c of f.stream) chunks.push(Buffer.from(c)); return Buffer.concat(chunks); }
        throw new Error('Arquivo não encontrado no R2');
    }
    function r2KeyPadaria(mes, ext) {
        const [y, m] = mes.split('-');
        const dd = isoHoje().slice(8, 10);
        const hash = Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
        return `Financeiro/Padaria/Fechamentos/${y}/${m}/${dd}_Padaria_${mes}_${hash}.${ext}`;
    }
    async function apagarImagemR2(key) {
        if (key && r2Pronto()) {
            try { await r2.deleteFromR2(key); } catch (e) { console.warn('[PADARIA] Falha ao apagar imagem do R2:', e.message); }
        }
    }

    // ── Planilha XLSX ───────────────────────────────────────────────────────────
    async function gerarPlanilhaBuffer(mes, linhas, pagto) {
        const wb = new ExcelJS.Workbook();
        wb.creator = 'América Rental';
        const ws = wb.addWorksheet('Padaria');
        ws.columns = [{ key: 'data', width: 16 }, { key: 'qtd', width: 14 }, { key: 'valor', width: 16 }, { key: 'obs', width: 50 }];
        ws.mergeCells('A1:D1');
        ws.getCell('A1').value = `Padaria — Fechamento — ${mesLabel(mes)}`;
        ws.getCell('A1').font = { bold: true, size: 14 };
        ws.getRow(1).height = 24;
        ws.addRow([]);
        const head = ws.addRow(['Data', 'Quantidade', 'Valor (R$)', 'Observação']);
        head.eachCell(c => {
            c.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFB45309' } };
            c.alignment = { vertical: 'middle', horizontal: 'center' };
        });
        const ordenadas = linhas.slice().sort((a, b) => String(a.data || '9999').localeCompare(String(b.data || '9999')));
        ordenadas.forEach(l => {
            const r = ws.addRow([fmtDataBR(l.data), l.quantidade, l.valor, l.observacao || '']);
            r.getCell(1).alignment = { horizontal: 'center' };
            r.getCell(2).alignment = { horizontal: 'center' };
            r.getCell(3).numFmt = '"R$" #,##0.00';
            r.getCell(4).alignment = { wrapText: true, vertical: 'top' };
        });
        const t = totaisLinhas(linhas);
        const tr = ws.addRow([`TOTAL — ${linhas.length} dia(s)`, t.qtd, t.valor, '']);
        tr.font = { bold: true };
        tr.getCell(2).alignment = { horizontal: 'center' };
        tr.getCell(3).numFmt = '"R$" #,##0.00';
        tr.eachCell(c => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } }; });
        if (pagto) {
            ws.addRow([]);
            const h = ws.addRow(['Dados para pagamento']);
            h.font = { bold: true };
            ws.addRow(['Favorecido', pagto.favorecido || '']);
            ws.addRow(['CPF', pagto.cpf || '']);
            ws.addRow(['Chave PIX (celular)', pagto.pix || '']);
        }
        ws.views = [{ state: 'frozen', ySplit: 3 }];
        return Buffer.from(await wb.xlsx.writeBuffer());
    }

    // ── E-mail padrão do sistema (logo no topo) ─────────────────────────────────
    const LOGO_PATH = path.join(__dirname, '..', 'frontend', 'assets', 'logo-header.png');
    function emailShell(titulo, corpoHtml) {
        return `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;border:1px solid #ddd;border-radius:8px;overflow:hidden;">
            <div style="text-align:center;background:#fff;border-bottom:1px solid #eee;">
                <img src="cid:empresa-logo" alt="América Rental" style="width:100%;max-width:600px;height:auto;display:block;">
            </div>
            <div style="padding:24px;">
                <h2 style="color:#b45309;text-align:center;margin-top:0;">${esc(titulo)}</h2>
                ${corpoHtml}
                <p style="font-size:12px;color:#999;text-align:center;margin-top:24px;"><i>Mensagem enviada pelo Sistema América Rental.</i></p>
            </div>
        </div>`;
    }
    const logoAttachment = () => ({ filename: 'logo-header.png', path: LOGO_PATH, cid: 'empresa-logo' });
    const paragrafos = txt => String(txt || '').split(/\n{2,}/).map(p => `<p style="margin:0 0 12px;line-height:1.5;color:#334155;">${esc(p).replace(/\n/g, '<br>')}</p>`).join('');
    const caixaResumo = (linhas, titulo) => `<div style="background:#fffbeb;padding:16px;border-radius:8px;margin:16px 0;border-left:4px solid #b45309;">${
        titulo ? `<p style="margin:0 0 8px;font-weight:bold;color:#92400e;">${esc(titulo)}</p>` : ''}${
        linhas.map(([k, v]) => `<p style="margin:4px 0;"><strong>${esc(k)}:</strong> ${esc(v)}</p>`).join('')}</div>`;

    // ── Serialização de um fechamento para o frontend ──────────────────────────
    function paraCliente(row) {
        if (!row) return null;
        let linhas = [];
        try { linhas = JSON.parse(row.linhas_json || '[]'); } catch (e) { linhas = []; }
        const t = totaisLinhas(linhas);
        return {
            id: row.id, mes_ref: row.mes_ref, linhas,
            qtd_total: t.qtd, valor_total: t.valor,
            valor_total_escrito: row.valor_total_escrito,
            observacao_geral: row.observacao_geral || '',
            nome_arquivo: row.nome_arquivo, tem_imagem: !!(row.r2_key || row.imagem_base64),
            criado_por: row.criado_por, criado_em: row.criado_em, atualizado_em: row.atualizado_em,
            enviado_em: row.enviado_em, enviado_por: row.enviado_por, email_destino: row.email_destino, enviado_valor: row.enviado_valor,
            alterado_apos_envio: row.enviado_em ? Math.round((row.enviado_valor || 0) * 100) !== Math.round(t.valor * 100) : false
        };
    }
    const cfgParaCliente = cfg => ({
        email_financeiro: cfg.padaria_email_financeiro,
        favorecido: cfg.padaria_pagto_favorecido,
        cpf: cfg.padaria_pagto_cpf,
        pix: cfg.padaria_pagto_pix
    });

    // ── Rotas ───────────────────────────────────────────────────────────────────
    app.get('/api/padaria/config', guard, async (req, res) => {
        try { res.json(cfgParaCliente(await getConfig())); }
        catch (e) { res.status(500).json({ error: e.message }); }
    });
    app.put('/api/padaria/config', guard, async (req, res) => {
        try {
            const b = req.body || {};
            if (b.email_financeiro !== undefined) {
                if (!parseEmails(b.email_financeiro).ok) return res.status(400).json({ error: 'E-mail do financeiro inválido.' });
                await setConfig('padaria_email_financeiro', String(b.email_financeiro).trim());
            }
            if (b.favorecido !== undefined) await setConfig('padaria_pagto_favorecido', String(b.favorecido).trim().slice(0, 200));
            if (b.cpf !== undefined) await setConfig('padaria_pagto_cpf', String(b.cpf).trim().slice(0, 40));
            if (b.pix !== undefined) await setConfig('padaria_pagto_pix', String(b.pix).trim().slice(0, 120));
            res.json({ success: true });
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    // Fechamento do mês
    app.get('/api/padaria/fechamento', guard, async (req, res) => {
        try {
            const mes = mesValido(req.query.mes) ? req.query.mes : isoHoje().slice(0, 7);
            const row = await dbGet('SELECT id, mes_ref, linhas_json, qtd_total, valor_total, valor_total_escrito, observacao_geral, r2_key, imagem_base64, nome_arquivo, criado_por, criado_em, atualizado_em, enviado_em, enviado_por, email_destino, enviado_valor FROM padaria_fechamentos WHERE mes_ref = ?', [mes]);
            res.json({ mes, fechamento: paraCliente(row), config: cfgParaCliente(await getConfig()) });
        } catch (e) {
            console.error('[PADARIA] GET fechamento:', e);
            res.status(500).json({ error: e.message });
        }
    });

    // Anexar imagem → análise via IA → grava/atualiza o fechamento do mês
    app.post('/api/padaria/analisar', authenticateToken, requirePadaria, uploadMem.single('imagem'), async (req, res) => {
        try {
            if (!req.file || !req.file.buffer) return res.status(400).json({ error: 'Anexe a imagem do fechamento (JPG, PNG ou WEBP).' });

            // Normaliza (rotação EXIF + tamanho máximo) para uma leitura melhor e arquivo menor
            let buf = req.file.buffer, mime = req.file.mimetype, ext = (mime.split('/')[1] || 'jpg').replace('jpeg', 'jpg');
            if (sharp) {
                try {
                    buf = await sharp(req.file.buffer).rotate().resize({ width: 2200, height: 2200, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 88 }).toBuffer();
                    mime = 'image/jpeg'; ext = 'jpg';
                } catch (eS) { console.warn('[PADARIA] Falha ao normalizar imagem (usando original):', eS.message); }
            }

            const json = await analisarImagemIA(buf, mime);
            const an = normalizarAnalise(json, req.body && req.body.mes);
            if (!an.linhas.length) return res.status(422).json({ error: 'A IA não encontrou linhas preenchidas na imagem. Verifique se a foto está nítida e inteira.' });
            const mes = an.mesRef;
            const t = totaisLinhas(an.linhas);

            // Guarda a imagem (R2; fallback base64 no banco)
            let r2Key = null, b64 = null;
            if (r2Pronto()) {
                try { r2Key = r2KeyPadaria(mes, ext); await r2.uploadToR2(r2Key, buf, mime); }
                catch (eR2) { console.error('[PADARIA] Erro ao enviar imagem ao R2:', eR2.message); r2Key = null; }
            }
            if (!r2Key) { console.warn('[R2] Storage não configurado/indisponível — imagem da padaria guardada como base64 no banco.'); b64 = buf.toString('base64'); }

            const nomeArq = String(req.file.originalname || `Padaria_${mes}.${ext}`).replace(/[\\/:*?"<>|]/g, '_');
            const antigo = await dbGet('SELECT id, r2_key FROM padaria_fechamentos WHERE mes_ref = ?', [mes]);
            let id;
            if (antigo) {
                await dbRun(`UPDATE padaria_fechamentos SET linhas_json = ?, qtd_total = ?, valor_total = ?, valor_total_escrito = ?, observacao_geral = ?,
                             r2_key = ?, imagem_base64 = ?, mime = ?, nome_arquivo = ?, criado_por = ?, atualizado_em = CURRENT_TIMESTAMP,
                             enviado_em = NULL, enviado_por = NULL, email_destino = NULL, enviado_valor = NULL WHERE id = ?`,
                    [JSON.stringify(an.linhas), t.qtd, t.valor, an.totalEscrito, an.observacaoGeral, r2Key, b64, mime, nomeArq, usuarioReq(req), antigo.id]);
                id = antigo.id;
                if (antigo.r2_key && antigo.r2_key !== r2Key) await apagarImagemR2(antigo.r2_key);
            } else {
                const ins = await dbRun(`INSERT INTO padaria_fechamentos (mes_ref, linhas_json, qtd_total, valor_total, valor_total_escrito, observacao_geral, r2_key, imagem_base64, mime, nome_arquivo, criado_por)
                                         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [mes, JSON.stringify(an.linhas), t.qtd, t.valor, an.totalEscrito, an.observacaoGeral, r2Key, b64, mime, nomeArq, usuarioReq(req)]);
                id = ins.lastID;
            }
            const row = await dbGet('SELECT * FROM padaria_fechamentos WHERE id = ?', [id]);
            res.json({ success: true, mes, fechamento: paraCliente(row) });
        } catch (e) {
            console.error('[PADARIA] Erro ao analisar imagem:', e);
            res.status(500).json({ error: e.message });
        }
    });

    // Salvar edição das linhas (conferência da leitura da IA)
    app.put('/api/padaria/fechamento/:id', guard, async (req, res) => {
        try {
            const row = await dbGet('SELECT id FROM padaria_fechamentos WHERE id = ?', [req.params.id]);
            if (!row) return res.status(404).json({ error: 'Fechamento não encontrado.' });
            const linhas = sanitizarLinhas(req.body && req.body.linhas);
            const t = totaisLinhas(linhas);
            await dbRun('UPDATE padaria_fechamentos SET linhas_json = ?, qtd_total = ?, valor_total = ?, atualizado_em = CURRENT_TIMESTAMP WHERE id = ?',
                [JSON.stringify(linhas), t.qtd, t.valor, row.id]);
            res.json({ success: true, qtd_total: t.qtd, valor_total: t.valor });
        } catch (e) { res.status(400).json({ error: e.message }); }
    });

    // Remover fechamento (R2 antes do banco)
    app.delete('/api/padaria/fechamento/:id', guard, async (req, res) => {
        try {
            const row = await dbGet('SELECT id, r2_key FROM padaria_fechamentos WHERE id = ?', [req.params.id]);
            if (!row) return res.status(404).json({ error: 'Fechamento não encontrado.' });
            await apagarImagemR2(row.r2_key);
            await dbRun('DELETE FROM padaria_fechamentos WHERE id = ?', [row.id]);
            res.json({ success: true });
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    // Imagem anexada (stream privado)
    app.get('/api/padaria/fechamento/:id/imagem', guard, async (req, res) => {
        try {
            const row = await dbGet('SELECT r2_key, imagem_base64, mime, nome_arquivo FROM padaria_fechamentos WHERE id = ?', [req.params.id]);
            if (!row) return res.status(404).json({ error: 'Fechamento não encontrado.' });
            let buf;
            if (row.r2_key && r2Pronto()) buf = await r2Baixar(row.r2_key);
            else if (row.imagem_base64) buf = Buffer.from(row.imagem_base64, 'base64');
            else return res.status(404).json({ error: 'Imagem não encontrada.' });
            res.setHeader('Content-Type', row.mime || 'image/jpeg');
            res.setHeader('Content-Disposition', `inline; filename="${row.nome_arquivo || 'Padaria.jpg'}"`);
            res.send(buf);
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    // Planilha (download)
    app.get('/api/padaria/fechamento/:id/planilha', guard, async (req, res) => {
        try {
            const row = await dbGet('SELECT mes_ref, linhas_json FROM padaria_fechamentos WHERE id = ?', [req.params.id]);
            if (!row) return res.status(404).json({ error: 'Fechamento não encontrado.' });
            const cfg = await getConfig();
            const buf = await gerarPlanilhaBuffer(row.mes_ref, JSON.parse(row.linhas_json || '[]'),
                { favorecido: cfg.padaria_pagto_favorecido, cpf: cfg.padaria_pagto_cpf, pix: cfg.padaria_pagto_pix });
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename="Padaria_${row.mes_ref}.xlsx"`);
            res.send(buf);
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    // Enviar ao financeiro (planilha em anexo + dados para pagamento no corpo do e-mail)
    app.post('/api/padaria/fechamento/:id/enviar', guard, async (req, res) => {
        try {
            const row = await dbGet('SELECT * FROM padaria_fechamentos WHERE id = ?', [req.params.id]);
            if (!row) return res.status(404).json({ error: 'Fechamento não encontrado.' });
            const b = req.body || {};
            const em = parseEmails(b.email_destino);
            if (!em.ok) return res.status(400).json({ error: 'E-mail do financeiro inválido.' });

            const linhas = JSON.parse(row.linhas_json || '[]');
            if (!linhas.length) return res.status(400).json({ error: 'O fechamento não possui linhas.' });
            const t = totaisLinhas(linhas);
            if (t.valor <= 0) return res.status(400).json({ error: 'O valor total do fechamento é zero.' });

            const cfg = await getConfig();
            const pagto = {
                favorecido: String(b.favorecido !== undefined ? b.favorecido : cfg.padaria_pagto_favorecido).trim(),
                cpf: String(b.cpf !== undefined ? b.cpf : cfg.padaria_pagto_cpf).trim(),
                pix: String(b.pix !== undefined ? b.pix : cfg.padaria_pagto_pix).trim()
            };
            const mes = row.mes_ref;
            const nomeArq = `Padaria_${mes}.xlsx`;
            const buf = await gerarPlanilhaBuffer(mes, linhas, pagto);
            const assunto = String(b.assunto || '').trim() || `Padaria — Fechamento para pagamento — ${mesLabel(mes)}`;
            const mensagem = String(b.mensagem || '').trim()
                || `Prezados,\n\nSegue em anexo a planilha de fechamento da padaria referente a ${mesLabel(mes)}, para pagamento.\n\nAbaixo seguem o valor total e os dados para pagamento.\n\nAtenciosamente,\nRH — América Rental`;

            const html = emailShell('Padaria — Fechamento para Pagamento', paragrafos(mensagem)
                + caixaResumo([
                    ['Mês de referência', mesLabel(mes)],
                    ['Dias lançados', String(linhas.length)],
                    ['Quantidade total', String(t.qtd)],
                    ['Valor total', brl(t.valor)]
                ], 'Resumo do fechamento')
                + caixaResumo([
                    ['Favorecido', pagto.favorecido || '-'],
                    ['CPF', pagto.cpf || '-'],
                    ['Chave PIX (celular)', pagto.pix || '-']
                ], 'Dados para pagamento'));

            await sendMailHelper({
                to: em.lista.join(', '),
                subject: assunto,
                html,
                attachments: [logoAttachment(), { filename: nomeArq, content: buf, contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }]
            });

            await dbRun('UPDATE padaria_fechamentos SET enviado_em = CURRENT_TIMESTAMP, enviado_por = ?, email_destino = ?, enviado_valor = ? WHERE id = ?',
                [usuarioReq(req), em.lista.join(', '), t.valor, row.id]);
            if (b.salvar_padrao) {
                await setConfig('padaria_email_financeiro', em.lista.join(', '));
                await setConfig('padaria_pagto_favorecido', pagto.favorecido);
                await setConfig('padaria_pagto_cpf', pagto.cpf);
                await setConfig('padaria_pagto_pix', pagto.pix);
            }
            res.json({ success: true, valor_total: t.valor });
        } catch (e) {
            console.error('[PADARIA] Erro ao enviar ao financeiro:', e);
            res.status(500).json({ error: 'Falha ao enviar e-mail: ' + e.message });
        }
    });

    console.log('[PADARIA] Rotas registradas com sucesso.');
};

// Exposto para testes
module.exports.analisarImagemIA = analisarImagemIA;
module.exports.normalizarAnalise = normalizarAnalise;
