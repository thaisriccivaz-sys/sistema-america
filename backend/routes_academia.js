// ═══════════════════════════════════════════════════════════════════════════════
// ROTAS: RH › PAGAMENTOS › ACADEMIA
// Arquivo: backend/routes_academia.js
// Registro no server.js:
//   require('./routes_academia')(app, db, authenticateToken, r2, sendMailHelper);
//
// - Controle de todos os colaboradores que já tiveram academia (histórico por períodos)
// - Valor por colaborador pago à academia (padrão R$ 70) separado por mês
// - Planilha XLSX, envio para a academia, conferência da NF e envio ao financeiro
// - Arquivos (planilha e NF) no Cloudflare R2
// ═══════════════════════════════════════════════════════════════════════════════
"use strict";

const path = require('path');
const multer = require('multer');
const ExcelJS = require('exceljs');

module.exports = function registerAcademiaRoutes(app, db, authenticateToken, r2, sendMailHelper) {

    const PAGE_ID = 'rh-academia';
    const SIM_SQL = "LOWER(TRIM(COALESCE(c.academia_participa,''))) = 'sim'";
    const CFG_DEFAULTS = {
        academia_email_destino: 'jeffersonpspg@yahoo.com.br',
        academia_email_financeiro: 'contas@americarental.com.br',
        academia_valor_unitario: '70',
        academia_cnpj_prestador: '03.434.448/0001-01'
    };
    const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const uploadMem = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });

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

    // ── Migrações ───────────────────────────────────────────────────────────────
    db.serialize(() => {
        db.run(`CREATE TABLE IF NOT EXISTS configuracoes_sistema (chave TEXT PRIMARY KEY, valor TEXT)`);
        db.run(`CREATE TABLE IF NOT EXISTS academia_colaboradores (
            id             INTEGER PRIMARY KEY AUTOINCREMENT,
            colaborador_id INTEGER NOT NULL UNIQUE,
            observacoes    TEXT,
            criado_em      DATETIME DEFAULT CURRENT_TIMESTAMP,
            atualizado_em  DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);
        db.run(`CREATE TABLE IF NOT EXISTS academia_periodos (
            id             INTEGER PRIMARY KEY AUTOINCREMENT,
            colaborador_id INTEGER NOT NULL,
            data_entrada   TEXT NOT NULL,
            data_saida     TEXT,
            criado_em      DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);
        db.run(`ALTER TABLE academia_colaboradores ADD COLUMN era_desligado INTEGER DEFAULT 0`, () => {});
        db.run(`ALTER TABLE academia_colaboradores ADD COLUMN mes_desligamento TEXT`, () => {});
        db.run(`CREATE INDEX IF NOT EXISTS idx_academia_periodos_colab ON academia_periodos (colaborador_id)`);
        db.run(`CREATE TABLE IF NOT EXISTS academia_envios (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            mes_ref         TEXT NOT NULL,
            valor_total     REAL NOT NULL DEFAULT 0,
            valor_unitario  REAL NOT NULL DEFAULT 0,
            qtd_colaboradores INTEGER NOT NULL DEFAULT 0,
            email_destino   TEXT,
            assunto         TEXT,
            mensagem        TEXT,
            snapshot_json   TEXT,
            r2_key          TEXT,
            nome_arquivo    TEXT,
            enviado_por     TEXT,
            enviado_em      DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);
        db.run(`CREATE TABLE IF NOT EXISTS academia_notas (
            id               INTEGER PRIMARY KEY AUTOINCREMENT,
            envio_id         INTEGER,
            mes_ref          TEXT NOT NULL,
            nf_numero        TEXT,
            nf_valor         REAL,
            nf_emissao       TEXT,
            nf_cnpjs         TEXT,
            nf_fantasia      TEXT,
            prestador_ok     INTEGER DEFAULT 0,
            valor_esperado   REAL,
            diferenca        REAL,
            status           TEXT NOT NULL DEFAULT 'nao_lida',
            r2_key           TEXT,
            arquivo_base64   TEXT,
            nome_arquivo     TEXT,
            anexado_por      TEXT,
            anexado_em       DATETIME DEFAULT CURRENT_TIMESTAMP,
            enviado_financeiro_em  DATETIME,
            financeiro_email       TEXT,
            enviado_financeiro_por TEXT
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
    function valorUnitario(cfg) {
        const v = parseFloat(String(cfg.academia_valor_unitario).replace(',', '.'));
        return (isFinite(v) && v >= 0) ? v : 70;
    }

    // ── Utilidades ──────────────────────────────────────────────────────────────
    const pad2 = n => String(n).padStart(2, '0');
    const isoHoje = () => { const d = new Date(); return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; };
    const isoDate = s => { const m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? `${m[1]}-${m[2]}-${m[3]}` : null; };
    const normTxt = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
    const isSim = s => normTxt(s) === 'sim';
    const fmtDataBR = s => { const iso = isoDate(s); return iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : (s || ''); };
    const brl = v => (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const mesValido = m => /^\d{4}-(0[1-9]|1[0-2])$/.test(String(m || ''));
    const mesLabel = m => { const [y, mm] = String(m).split('-'); return `${MESES[parseInt(mm, 10) - 1]}/${y}`; };
    const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const usuarioReq = req => (req.user && (req.user.username || req.user.nome)) || 'Sistema';
    const cents = v => Math.round((Number(v) || 0) * 100);

    function parseEmails(str) {
        const lista = String(str || '').split(/[;,\s]+/).map(s => s.trim()).filter(Boolean);
        if (lista.length === 0) return { ok: false, lista };
        const ok = lista.every(e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
        return { ok, lista };
    }

    // ── Permissão da tela (Controle de Acesso → página 'rh-academia') ──────────
    function isTopAdmin(u) {
        return !!u && (u.role === 'Diretoria' || u.role === 'Administrador' || u.departamento === 'Diretoria'
            || (u.grupo_nome && String(u.grupo_nome).toLowerCase() === 'diretoria'));
    }
    async function requireAcademia(req, res, next) {
        try {
            if (isTopAdmin(req.user)) return next();
            const gid = req.user && req.user.grupo_permissao_id;
            if (!gid) return res.status(403).json({ error: 'Sem permissão para acessar a tela Academia.' });
            const row = await dbGet('SELECT visualizar FROM permissoes_grupo WHERE grupo_id = ? AND pagina_id = ?', [gid, PAGE_ID]);
            const v = row && row.visualizar;
            if (v === 1 || v === '1' || v === true || v === 'true') return next();
            return res.status(403).json({ error: 'Sem permissão para acessar a tela Academia.' });
        } catch (e) {
            return res.status(500).json({ error: e.message });
        }
    }

    // ── Sincronização: histórico de períodos com academia ──────────────────────
    async function backfillAuditoria() {
        const rows = await dbAll(`SELECT registro_id, conteudo_anterior, conteudo_atual, data_hora FROM auditoria
                                  WHERE programa = 'Colaboradores' AND campo = 'academia_participa'
                                  ORDER BY registro_id, data_hora, id`);
        const porColab = {};
        rows.forEach(r => { (porColab[r.registro_id] = porColab[r.registro_id] || []).push(r); });
        for (const idStr of Object.keys(porColab)) {
            const colabId = parseInt(idStr, 10);
            const colab = await dbGet('SELECT id, academia_data_inicio FROM colaboradores WHERE id = ?', [colabId]);
            if (!colab) continue;
            const lista = porColab[idStr];
            let aberto = isSim(lista[0].conteudo_anterior) ? (isoDate(colab.academia_data_inicio) || '2000-01-01') : null;
            for (const r of lista) {
                const d = isoDate(r.data_hora) || isoHoje();
                if (isSim(r.conteudo_atual) && !aberto) {
                    aberto = d;
                } else if (!isSim(r.conteudo_atual) && aberto) {
                    await dbRun('INSERT INTO academia_periodos (colaborador_id, data_entrada, data_saida) VALUES (?, ?, ?)', [colabId, aberto, d < aberto ? aberto : d]);
                    aberto = null;
                }
            }
            if (aberto) await dbRun('INSERT INTO academia_periodos (colaborador_id, data_entrada, data_saida) VALUES (?, ?, NULL)', [colabId, aberto]);
        }
    }

    let _initDesligadosDone = false;

    // Colaboradores ocultos da tela Academia, da planilha e do e-mail: "Teste" e "Thais Ricci Vaz"
    function academiaColabOculto(nome) {
        const n = normTxt(nome);
        if (!n) return false;
        if (n === 'teste' || /\bteste\b/.test(n)) return true;
        if (n.includes('thais') && n.includes('ricci')) return true;
        return false;
    }

    function formatarObsDesligado(obs) {
        const obsTrim = String(obs || '').trim();
        if (!obsTrim) return 'Colaborador desligado';
        if (normTxt(obsTrim).startsWith('colaborador desligado')) return obsTrim;
        return 'Colaborador desligado - ' + obsTrim;
    }

    async function syncImpl(mesContexto, mesHojeCliente) {
        const hoje = isoHoje();
        const nPer = (await dbGet('SELECT COUNT(*) AS n FROM academia_periodos')).n;
        const primeiraVez = nPer === 0;
        if (primeiraVez) await backfillAuditoria();

        // 1) Quem está com Academia = Sim e não tem período aberto → abre período (ou reabre se ainda está marcado como Sim)
        const abrir = await dbAll(`SELECT c.id, c.academia_data_inicio FROM colaboradores c
            WHERE ${SIM_SQL}
              AND NOT EXISTS (SELECT 1 FROM academia_periodos p WHERE p.colaborador_id = c.id AND p.data_saida IS NULL)`);
        for (const c of abrir) {
            const ultRow = await dbGet('SELECT id, data_saida FROM academia_periodos WHERE colaborador_id = ? ORDER BY id DESC LIMIT 1', [c.id]);
            const inicio = isoDate(c.academia_data_inicio);
            if (ultRow && ultRow.id) {
                await dbRun('UPDATE academia_periodos SET data_saida = NULL WHERE id = ?', [ultRow.id]);
            } else {
                const entrada = inicio || (primeiraVez ? '2000-01-01' : hoje);
                await dbRun('INSERT INTO academia_periodos (colaborador_id, data_entrada, data_saida) VALUES (?, ?, NULL)', [c.id, entrada]);
            }
        }

        // 2) Período aberto, mas o colaborador não está mais com Academia = Sim → fecha período
        const fechar = await dbAll(`SELECT p.id, p.data_entrada FROM academia_periodos p
            LEFT JOIN colaboradores c ON c.id = p.colaborador_id
            WHERE p.data_saida IS NULL AND (c.id IS NULL OR NOT (${SIM_SQL}))`);
        for (const p of fechar) {
            await dbRun('UPDATE academia_periodos SET data_saida = ? WHERE id = ?', [hoje < p.data_entrada ? p.data_entrada : hoje, p.id]);
        }

        // 3) Garante linha de controle (observações) para todos que já tiveram academia
        await dbRun(`INSERT OR IGNORE INTO academia_colaboradores (colaborador_id)
                     SELECT DISTINCT p.colaborador_id FROM academia_periodos p
                     WHERE EXISTS (SELECT 1 FROM colaboradores c WHERE c.id = p.colaborador_id)`);

        // 4) Controle de colaboradores desligados:
        //    - Na observação, prefixa "Colaborador desligado"
        //    - Guarda o mês do desligamento (mes_desligamento): dentro desse mês continua Ativo (com valor se Academia=Sim),
        //      e a partir do próximo mês (mes > mes_desligamento) passa automaticamente a Inativo (valor zerado).
        const envMin = await dbGet('SELECT MIN(mes_ref) AS m FROM academia_envios');
        const mesBaseAntigo = (envMin && mesValido(envMin.m)) ? envMin.m : '2026-10';
        const mesHojeRef = mesValido(mesHojeCliente) ? mesHojeCliente : '2026-11';

        // Colaboradores cujo status mudou para Desligado hoje na auditoria
        const audDesligHoje = await dbAll(`SELECT DISTINCT registro_id FROM auditoria
            WHERE programa = 'Colaboradores' AND campo = 'status'
              AND LOWER(TRIM(COALESCE(conteudo_atual,''))) = 'desligado'
              AND SUBSTR(data_hora, 1, 10) = ?`, [hoje]);
        const idsDesligHoje = new Set(audDesligHoje.map(a => Number(a.registro_id)));

        const acRows = await dbAll(`SELECT ac.colaborador_id, ac.observacoes, ac.era_desligado, ac.mes_desligamento,
                                           c.status AS colab_status, c.nome_completo
                                    FROM academia_colaboradores ac
                                    JOIN colaboradores c ON c.id = ac.colaborador_id`);
        for (const r of acRows) {
            const isDeslig = normTxt(r.colab_status) === 'desligado';
            if (isDeslig) {
                const novaObs = formatarObsDesligado(r.observacoes);
                let mesDeslig = r.mes_desligamento;
                let eraDeslig = r.era_desligado ? 1 : 0;
                const desligadoHoje = idsDesligHoje.has(Number(r.colaborador_id)) || normTxt(r.nome_completo) === 'teste';

                if (desligadoHoje && (!mesValido(mesDeslig) || mesDeslig < mesHojeRef)) {
                    mesDeslig = mesHojeRef;
                    eraDeslig = 1;
                } else if (!mesValido(mesDeslig)) {
                    if (!_initDesligadosDone) {
                        mesDeslig = mesBaseAntigo;
                        eraDeslig = 1;
                    } else {
                        mesDeslig = mesValido(mesHojeCliente) ? mesHojeCliente : (mesValido(mesContexto) ? mesContexto : mesHojeRef);
                        eraDeslig = 1;
                    }
                } else {
                    eraDeslig = 1;
                }

                if (novaObs !== String(r.observacoes || '') || mesDeslig !== r.mes_desligamento || eraDeslig !== (r.era_desligado ? 1 : 0)) {
                    await dbRun(`UPDATE academia_colaboradores
                                 SET observacoes = ?, era_desligado = ?, mes_desligamento = ?, atualizado_em = CURRENT_TIMESTAMP
                                 WHERE colaborador_id = ?`,
                        [novaObs, eraDeslig, mesDeslig || null, r.colaborador_id]);
                }
            } else if (r.era_desligado || r.mes_desligamento) {
                await dbRun(`UPDATE academia_colaboradores
                             SET era_desligado = 0, mes_desligamento = NULL, atualizado_em = CURRENT_TIMESTAMP
                             WHERE colaborador_id = ?`, [r.colaborador_id]);
            }
        }
        _initDesligadosDone = true;
    }
    let _syncChain = Promise.resolve();
    function sync(mesContexto, mesHojeCliente) {
        _syncChain = _syncChain.then(() => syncImpl(mesContexto, mesHojeCliente)).catch(e => { console.error('[ACADEMIA] Erro na sincronização:', e.message); });
        return _syncChain;
    }

    // Quando um colaborador é criado/alterado/inativado, atualiza o histórico da academia
    app.use('/api/colaboradores', (req, res, next) => {
        if ((req.method === 'PUT' || req.method === 'POST' || req.method === 'DELETE') && /^\/(\d+)?\/?$/.test(req.path)) {
            res.on('finish', () => { if (res.statusCode >= 200 && res.statusCode < 300) sync(); });
        }
        next();
    });
    setTimeout(() => { sync(); }, 8000);

    // ── Montagem da lista por mês ───────────────────────────────────────────────
    async function montarLista(mes, mesHojeCliente) {
        await sync(mes, mesHojeCliente);
        const cfg = await getConfig();
        const unit = valorUnitario(cfg);
        const rowsRaw = await dbAll(`SELECT ac.colaborador_id, ac.observacoes, ac.mes_desligamento,
                                            c.nome_completo, c.cpf, c.data_nascimento, c.status AS colab_status, c.academia_participa
                                     FROM academia_colaboradores ac JOIN colaboradores c ON c.id = ac.colaborador_id`);
        const rows = rowsRaw.filter(r => !academiaColabOculto(r.nome_completo));
        const pers = await dbAll('SELECT colaborador_id, data_entrada, data_saida FROM academia_periodos ORDER BY data_entrada, id');
        const porColab = {};
        pers.forEach(p => { (porColab[p.colaborador_id] = porColab[p.colaborador_id] || []).push(p); });
        const itens = rows.map(r => {
            const ps = porColab[r.colaborador_id] || [];
            const ult = ps[ps.length - 1] || null;
            const desligado = normTxt(r.colab_status) === 'desligado';
            const temSim = isSim(r.academia_participa);
            const mesDeslig = mesValido(r.mes_desligamento) ? r.mes_desligamento : mes;

            // Se colaborador NÃO é desligado: Ativo quando academia_participa = Sim.
            // Se colaborador É desligado: se estava marcado como Sim na academia, fica com valor (Ativo)
            // dentro do mês do desligamento (mes <= mesDeslig) e no próximo mês (mes > mesDeslig) fica automaticamente Inativo (valor zerado).
            const isAtivo = !desligado ? temSim : (temSim && mes <= mesDeslig);
            const obsFinal = desligado ? formatarObsDesligado(r.observacoes) : (r.observacoes || '');

            return {
                colaborador_id: r.colaborador_id,
                nome: r.nome_completo || '',
                data_nascimento: r.data_nascimento || '',
                cpf: r.cpf || '',
                status: isAtivo ? 'ativo' : 'inativo',
                data_saida: isAtivo ? null : (ult ? ult.data_saida : null),
                desligado,
                mes_desligamento: desligado ? mesDeslig : null,
                cobrado_mes: isAtivo,
                valor: isAtivo ? unit : 0,
                observacoes: obsFinal
            };
        });
        itens.sort((a, b) => (a.status === b.status ? 0 : (a.status === 'ativo' ? -1 : 1)) || a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' }));
        const qtdAtivos = itens.filter(i => i.status === 'ativo').length;
        return {
            mes, valor_unitario: unit, itens,
            qtd_mes: qtdAtivos,
            total: Math.round(qtdAtivos * unit * 100) / 100,
            qtd_ativos: qtdAtivos,
            qtd_inativos: itens.filter(i => i.status === 'inativo').length
        };
    }

    // ── Planilha XLSX ───────────────────────────────────────────────────────────
    async function gerarPlanilhaBuffer(mes, itens, unit) {
        itens = (itens || []).filter(i => !academiaColabOculto(i && i.nome));
        const wb = new ExcelJS.Workbook();
        wb.creator = 'América Rental';
        const ws = wb.addWorksheet('Academia');
        ws.columns = [
            { key: 'nome', width: 44 }, { key: 'nasc', width: 18 }, { key: 'cpf', width: 18 },
            { key: 'status', width: 12 }, { key: 'valor', width: 16 }, { key: 'obs', width: 50 }
        ];
        ws.mergeCells('A1:F1');
        ws.getCell('A1').value = `Academia — Colaboradores — ${mesLabel(mes)}`;
        ws.getCell('A1').font = { bold: true, size: 14 };
        ws.getRow(1).height = 24;
        ws.addRow([]);
        const head = ws.addRow(['Nome', 'Data de Nascimento', 'CPF', 'Status', 'Valor (R$)', 'Observações']);
        head.eachCell(c => {
            c.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF7C3AED' } };
            c.alignment = { vertical: 'middle', horizontal: 'center' };
        });
        itens.forEach(i => {
            const isAtivo = i.status === 'ativo';
            const valCell = isAtivo ? (i.valor != null && i.valor > 0 ? i.valor : unit) : null;
            const r = ws.addRow([i.nome, fmtDataBR(i.data_nascimento), i.cpf, isAtivo ? 'Ativo' : 'Inativo', valCell, i.observacoes || '']);
            if (isAtivo) r.getCell(5).numFmt = '"R$" #,##0.00';
            r.getCell(2).alignment = { horizontal: 'center' };
            r.getCell(4).alignment = { horizontal: 'center' };
            r.getCell(4).font = { bold: true, color: { argb: isAtivo ? 'FF15803D' : 'FF64748B' } };
            r.getCell(6).alignment = { wrapText: true, vertical: 'top' };
        });
        const total = itens.reduce((acc, i) => acc + (i.status === 'ativo' ? (i.valor != null && i.valor > 0 ? i.valor : unit) : 0), 0);
        const qtd = itens.filter(i => i.status === 'ativo').length;
        const tr = ws.addRow([`TOTAL — ${qtd} colaborador(es) ativo(s)`, '', '', '', Math.round(total * 100) / 100, '']);
        tr.font = { bold: true };
        tr.getCell(5).numFmt = '"R$" #,##0.00';
        tr.eachCell(c => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3E8FF' } }; });
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
                <h2 style="color:#7c3aed;text-align:center;margin-top:0;">${esc(titulo)}</h2>
                ${corpoHtml}
                <p style="font-size:12px;color:#999;text-align:center;margin-top:24px;"><i>Mensagem enviada pelo Sistema América Rental.</i></p>
            </div>
        </div>`;
    }
    const logoAttachment = () => ({ filename: 'logo-header.png', path: LOGO_PATH, cid: 'empresa-logo' });
    const paragrafos = txt => String(txt || '').split(/\n{2,}/).map(p => `<p style="margin:0 0 12px;line-height:1.5;color:#334155;">${esc(p).replace(/\n/g, '<br>')}</p>`).join('');
    const caixaResumo = linhas => `<div style="background:#f5f3ff;padding:16px;border-radius:8px;margin:16px 0;border-left:4px solid #7c3aed;">${
        linhas.map(([k, v]) => `<p style="margin:4px 0;"><strong>${esc(k)}:</strong> ${esc(v)}</p>`).join('')}</div>`;

    // ── R2 ──────────────────────────────────────────────────────────────────────
    const r2Pronto = () => !!(r2 && typeof r2.isReady === 'function' && r2.isReady());
    async function r2Baixar(key) {
        const f = await r2.downloadStreamFromR2(key);
        if (f && f.stream && typeof f.stream.transformToByteArray === 'function') return Buffer.from(await f.stream.transformToByteArray());
        if (f && f.stream) { const chunks = []; for await (const c of f.stream) chunks.push(Buffer.from(c)); return Buffer.concat(chunks); }
        throw new Error('Arquivo não encontrado no R2');
    }
    function r2KeyAcademia(sub, mes, nome) {
        const [y, m] = mes.split('-');
        const hash = Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
        return `Financeiro/Academia/${sub}/${y}/${m}/${nome}_${hash}`;
    }

    // ── Leitura da NF (PDF com texto) ───────────────────────────────────────────
    async function lerNfPdf(buffer) {
        let text = '';
        try {
            const { PDFParse } = require('pdf-parse');
            const parser = new PDFParse({ verbosity: 0, data: buffer });
            const r = await parser.getText();
            text = (r && r.text) || '';
            if (typeof parser.destroy === 'function') { try { await parser.destroy(); } catch (e) { /* ignora */ } }
        } catch (e) {
            console.warn('[ACADEMIA] Falha ao ler PDF da NF:', e.message);
        }
        const out = { texto_lido: text.trim().length > 0, valor: null, numero: null, emissao: null, cnpjs: [], fantasia: null };
        if (!out.texto_lido) return out;
        // Valor: o valor da NF se repete (Valor dos Serviços, Valor Líquido, Base de Cálculo...). Usa o não-zero mais frequente.
        const dinheiro = text.match(/\b\d{1,3}(?:\.\d{3})*,\d{2}\b/g) || [];
        const freq = {};
        dinheiro.forEach(s => { const c = Math.round(parseFloat(s.replace(/\./g, '').replace(',', '.')) * 100); if (c > 0) freq[c] = (freq[c] || 0) + 1; });
        const cands = Object.keys(freq).map(Number).sort((a, b) => (freq[b] - freq[a]) || (b - a));
        if (cands.length) out.valor = cands[0] / 100;
        const mNum = text.match(/FINAN[ÇC]AS\s+(\d{1,10})\b/i);
        if (mNum) out.numero = mNum[1];
        const mEm = text.match(/(\d{2}\/\d{2}\/\d{4})\s+\d{2}:\d{2}:\d{2}/);
        if (mEm) out.emissao = mEm[1];
        out.cnpjs = Array.from(new Set(text.match(/\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/g) || []));
        const mFan = text.match(/Nome Fantasia\s+([^\n]+)/i);
        if (mFan) out.fantasia = mFan[1].trim();
        return out;
    }
    function statusNota(valorNf, esperado) {
        if (valorNf == null) return 'nao_lida';
        return cents(valorNf) === cents(esperado) ? 'conferida' : 'divergente';
    }

    // ── Rotas ───────────────────────────────────────────────────────────────────
    const guard = [authenticateToken, requireAcademia];

    // Configurações (e-mails e valor por colaborador)
    app.get('/api/academia/config', guard, async (req, res) => {
        try {
            const cfg = await getConfig();
            res.json({ email_academia: cfg.academia_email_destino, email_financeiro: cfg.academia_email_financeiro, valor_unitario: valorUnitario(cfg), cnpj_prestador: cfg.academia_cnpj_prestador });
        } catch (e) { res.status(500).json({ error: e.message }); }
    });
    app.put('/api/academia/config', guard, async (req, res) => {
        try {
            const b = req.body || {};
            if (b.email_academia !== undefined) { if (!parseEmails(b.email_academia).ok) return res.status(400).json({ error: 'E-mail da academia inválido.' }); await setConfig('academia_email_destino', b.email_academia.trim()); }
            if (b.email_financeiro !== undefined) { if (!parseEmails(b.email_financeiro).ok) return res.status(400).json({ error: 'E-mail do financeiro inválido.' }); await setConfig('academia_email_financeiro', b.email_financeiro.trim()); }
            if (b.valor_unitario !== undefined) {
                const v = parseFloat(String(b.valor_unitario).replace(',', '.'));
                if (!isFinite(v) || v < 0) return res.status(400).json({ error: 'Valor por colaborador inválido.' });
                await setConfig('academia_valor_unitario', v);
            }
            res.json({ success: true });
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    // Dados do mês: lista + totais + último envio + NF
    app.get('/api/academia/colaboradores', guard, async (req, res) => {
        try {
            const mes = mesValido(req.query.mes) ? req.query.mes : isoHoje().slice(0, 7);
            const lista = await montarLista(mes, req.query.hoje);
            const cfg = await getConfig();
            const envios = await dbAll(`SELECT id, mes_ref, valor_total, valor_unitario, qtd_colaboradores, email_destino, enviado_por, enviado_em, nome_arquivo
                                        FROM academia_envios WHERE mes_ref = ? ORDER BY id DESC`, [mes]);
            const envio = envios[0] || null;
            let nota = null;
            if (envio) {
                const n = await dbGet(`SELECT id, envio_id, mes_ref, nf_numero, nf_valor, nf_emissao, nf_cnpjs, nf_fantasia, prestador_ok, valor_esperado, diferenca, status,
                                              nome_arquivo, anexado_por, anexado_em, enviado_financeiro_em, financeiro_email, enviado_financeiro_por
                                       FROM academia_notas WHERE mes_ref = ? ORDER BY id DESC LIMIT 1`, [mes]);
                if (n) nota = { ...n, desatualizada: n.envio_id !== envio.id };
            }
            res.json({
                ...lista,
                email_academia: cfg.academia_email_destino,
                email_financeiro: cfg.academia_email_financeiro,
                envio, envios, nota,
                alterado_apos_envio: envio ? cents(envio.valor_total) !== cents(lista.total) : false
            });
        } catch (e) {
            console.error('[ACADEMIA] GET colaboradores:', e);
            res.status(500).json({ error: e.message });
        }
    });

    // Observação por colaborador
    app.put('/api/academia/colaboradores/:colabId/observacao', guard, async (req, res) => {
        try {
            const colabId = parseInt(req.params.colabId, 10);
            const obs = String((req.body && req.body.observacoes) || '').slice(0, 2000);
            await dbRun('INSERT OR IGNORE INTO academia_colaboradores (colaborador_id) VALUES (?)', [colabId]);
            const antes = await dbGet('SELECT observacoes FROM academia_colaboradores WHERE colaborador_id = ?', [colabId]);
            await dbRun('UPDATE academia_colaboradores SET observacoes = ?, atualizado_em = CURRENT_TIMESTAMP WHERE colaborador_id = ?', [obs, colabId]);
            if (String((antes && antes.observacoes) || '') !== obs) {
                db.run(`INSERT INTO auditoria (usuario, programa, campo, conteudo_anterior, conteudo_atual, registro_id) VALUES (?, ?, ?, ?, ?, ?)`,
                    [usuarioReq(req), 'Academia', 'observacoes', (antes && antes.observacoes) || '', obs, colabId], () => { });
            }
            res.json({ success: true });
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    // Planilha do mês (download)
    app.get('/api/academia/planilha', guard, async (req, res) => {
        try {
            const mes = mesValido(req.query.mes) ? req.query.mes : isoHoje().slice(0, 7);
            const lista = await montarLista(mes, req.query.hoje);
            const buf = await gerarPlanilhaBuffer(mes, lista.itens, lista.valor_unitario);
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename="Academia_${mes}.xlsx"`);
            res.send(buf);
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    // Planilha exatamente como foi enviada em um envio (histórico)
    async function planilhaDoEnvio(envio) {
        if (envio.r2_key && r2Pronto()) {
            try { return await r2Baixar(envio.r2_key); } catch (e) { console.warn('[ACADEMIA] R2 indisponível para planilha, regenerando do snapshot:', e.message); }
        }
        const snap = JSON.parse(envio.snapshot_json || '[]');
        return gerarPlanilhaBuffer(envio.mes_ref, snap, envio.valor_unitario);
    }
    app.get('/api/academia/envios/:id/planilha', guard, async (req, res) => {
        try {
            const envio = await dbGet('SELECT * FROM academia_envios WHERE id = ?', [req.params.id]);
            if (!envio) return res.status(404).json({ error: 'Envio não encontrado.' });
            const buf = await planilhaDoEnvio(envio);
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename="${envio.nome_arquivo || ('Academia_' + envio.mes_ref + '.xlsx')}"`);
            res.send(buf);
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    // Enviar para a academia
    app.post('/api/academia/enviar', guard, async (req, res) => {
        try {
            const b = req.body || {};
            const mes = b.mes;
            if (!mesValido(mes)) return res.status(400).json({ error: 'Mês inválido.' });
            const em = parseEmails(b.email_destino);
            if (!em.ok) return res.status(400).json({ error: 'E-mail de destino inválido.' });
            const lista = await montarLista(mes, b.hoje);
            if (lista.qtd_mes === 0) return res.status(400).json({ error: 'Não há colaboradores com academia neste mês.' });

            const nomeArq = `Academia_${mes}.xlsx`;
            const buf = await gerarPlanilhaBuffer(mes, lista.itens, lista.valor_unitario);
            const assunto = String(b.assunto || '').trim() || `Academia — Relação de colaboradores — ${mesLabel(mes)}`;
            const mensagem = String(b.mensagem || '').trim()
                || `Prezados,\n\nSegue em anexo a relação de colaboradores da academia referente a ${mesLabel(mes)}.\n\nTotal de colaboradores ativos: ${lista.qtd_ativos}\nValor total: ${brl(lista.total)}\n\nSolicitamos o envio da nota fiscal referente a este valor para darmos andamento ao pagamento.\n\nAtenciosamente,\nAmérica Rental`;

            const html = emailShell('Academia — Relação de Colaboradores', paragrafos(mensagem) + caixaResumo([
                ['Mês de referência', mesLabel(mes)],
                ['Colaboradores ativos', String(lista.qtd_ativos)],
                ['Valor por colaborador', brl(lista.valor_unitario)],
                ['Valor total', brl(lista.total)]
            ]));
            await sendMailHelper({
                to: em.lista.join(', '),
                subject: assunto,
                html,
                attachments: [logoAttachment(), { filename: nomeArq, content: buf, contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }]
            });

            let r2Key = null;
            if (r2Pronto()) {
                try {
                    r2Key = r2KeyAcademia('Planilhas', mes, `Academia_${mes}`) + '.xlsx';
                    await r2.uploadToR2(r2Key, buf, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
                } catch (eR2) { console.error('[ACADEMIA] Erro ao enviar planilha ao R2:', eR2.message); r2Key = null; }
            } else {
                console.warn('[R2] Storage não configurado — planilha da academia guardada apenas como snapshot no banco.');
            }
            const snapshot = lista.itens.map(i => ({ nome: i.nome, data_nascimento: i.data_nascimento, cpf: i.cpf, status: i.status, cobrado_mes: i.cobrado_mes, valor: i.valor, observacoes: i.observacoes }));
            const ins = await dbRun(`INSERT INTO academia_envios (mes_ref, valor_total, valor_unitario, qtd_colaboradores, email_destino, assunto, mensagem, snapshot_json, r2_key, nome_arquivo, enviado_por)
                                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [mes, lista.total, lista.valor_unitario, lista.qtd_mes, em.lista.join(', '), assunto, mensagem, JSON.stringify(snapshot), r2Key, nomeArq, usuarioReq(req)]);
            if (b.salvar_padrao) await setConfig('academia_email_destino', em.lista.join(', '));
            res.json({ success: true, id: ins.lastID, valor_total: lista.total, qtd: lista.qtd_mes });
        } catch (e) {
            console.error('[ACADEMIA] Erro ao enviar para a academia:', e);
            res.status(500).json({ error: 'Falha ao enviar e-mail: ' + e.message });
        }
    });

    // Anexar NF + conferência
    app.post('/api/academia/nota', authenticateToken, requireAcademia, uploadMem.single('nf'), async (req, res) => {
        try {
            const mes = req.body && req.body.mes;
            if (!mesValido(mes)) return res.status(400).json({ error: 'Mês inválido.' });
            if (!req.file || !req.file.buffer) return res.status(400).json({ error: 'Anexe o PDF da nota fiscal.' });
            const isPdf = req.file.buffer.slice(0, 4).toString() === '%PDF';
            if (!isPdf) return res.status(400).json({ error: 'A nota fiscal deve ser um arquivo PDF.' });
            const envio = await dbGet('SELECT id, valor_total FROM academia_envios WHERE mes_ref = ? ORDER BY id DESC LIMIT 1', [mes]);
            if (!envio) return res.status(400).json({ error: 'Envie primeiro a planilha para a academia neste mês para poder conferir a nota.' });

            const cfg = await getConfig();
            const nf = await lerNfPdf(req.file.buffer);
            const cnpjCfg = String(cfg.academia_cnpj_prestador).replace(/\D/g, '');
            const prestadorOk = nf.cnpjs.some(c => c.replace(/\D/g, '') === cnpjCfg) ? 1 : 0;
            const status = statusNota(nf.valor, envio.valor_total);
            const diferenca = nf.valor == null ? null : Math.round((nf.valor - envio.valor_total) * 100) / 100;

            const nomeArq = (req.file.originalname || `NF_Academia_${mes}.pdf`).replace(/[\\/:*?"<>|]/g, '_');
            let r2Key = null; let b64 = null;
            if (r2Pronto()) {
                try {
                    r2Key = r2KeyAcademia('NotasFiscais', mes, `NF_Academia_${mes}`) + '.pdf';
                    await r2.uploadToR2(r2Key, req.file.buffer, 'application/pdf');
                } catch (eR2) { console.error('[ACADEMIA] Erro ao enviar NF ao R2:', eR2.message); r2Key = null; }
            }
            if (!r2Key) { console.warn('[R2] Storage não configurado/indisponível — NF guardada como base64 no banco.'); b64 = req.file.buffer.toString('base64'); }

            const ins = await dbRun(`INSERT INTO academia_notas (envio_id, mes_ref, nf_numero, nf_valor, nf_emissao, nf_cnpjs, nf_fantasia, prestador_ok, valor_esperado, diferenca, status, r2_key, arquivo_base64, nome_arquivo, anexado_por)
                                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [envio.id, mes, nf.numero, nf.valor, nf.emissao, JSON.stringify(nf.cnpjs), nf.fantasia, prestadorOk, envio.valor_total, diferenca, status, r2Key, b64, nomeArq, usuarioReq(req)]);
            res.json({ success: true, id: ins.lastID, status, nf_valor: nf.valor, valor_esperado: envio.valor_total, diferenca, nf_numero: nf.numero, prestador_ok: !!prestadorOk, texto_lido: nf.texto_lido });
        } catch (e) {
            console.error('[ACADEMIA] Erro ao conferir NF:', e);
            res.status(500).json({ error: e.message });
        }
    });

    // Informar o valor manualmente (PDF sem texto legível)
    app.put('/api/academia/nota/:id/valor', guard, async (req, res) => {
        try {
            const nota = await dbGet('SELECT * FROM academia_notas WHERE id = ?', [req.params.id]);
            if (!nota) return res.status(404).json({ error: 'Nota não encontrada.' });
            const v = parseFloat(String((req.body && req.body.valor) ?? '').replace(/\./g, '').replace(',', '.'));
            if (!isFinite(v) || v <= 0) return res.status(400).json({ error: 'Valor inválido.' });
            const status = statusNota(v, nota.valor_esperado);
            const dif = Math.round((v - nota.valor_esperado) * 100) / 100;
            await dbRun('UPDATE academia_notas SET nf_valor = ?, diferenca = ?, status = ? WHERE id = ?', [v, dif, status, nota.id]);
            res.json({ success: true, status, diferenca: dif });
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    async function bufferDaNota(nota) {
        if (nota.r2_key && r2Pronto()) return r2Baixar(nota.r2_key);
        if (nota.arquivo_base64) return Buffer.from(nota.arquivo_base64, 'base64');
        throw new Error('Arquivo da nota fiscal não encontrado.');
    }
    app.get('/api/academia/nota/:id/arquivo', guard, async (req, res) => {
        try {
            const nota = await dbGet('SELECT * FROM academia_notas WHERE id = ?', [req.params.id]);
            if (!nota) return res.status(404).json({ error: 'Nota não encontrada.' });
            const buf = await bufferDaNota(nota);
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `inline; filename="${nota.nome_arquivo || 'NF_Academia.pdf'}"`);
            res.send(buf);
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    // Enviar NF conferida + planilha para o financeiro
    app.post('/api/academia/nota/:id/enviar-financeiro', guard, async (req, res) => {
        try {
            const nota = await dbGet('SELECT * FROM academia_notas WHERE id = ?', [req.params.id]);
            if (!nota) return res.status(404).json({ error: 'Nota não encontrada.' });
            if (nota.status !== 'conferida') return res.status(400).json({ error: 'Só é possível enviar ao financeiro uma nota fiscal conferida.' });
            const ultimo = await dbGet('SELECT id FROM academia_envios WHERE mes_ref = ? ORDER BY id DESC LIMIT 1', [nota.mes_ref]);
            if (!ultimo || ultimo.id !== nota.envio_id) return res.status(400).json({ error: 'A planilha foi reenviada após esta nota. Anexe a nota fiscal novamente para conferir.' });
            const envio = await dbGet('SELECT * FROM academia_envios WHERE id = ?', [nota.envio_id]);
            if (!envio) return res.status(400).json({ error: 'Envio da planilha não encontrado.' });
            const b = req.body || {};
            const em = parseEmails(b.email_destino);
            if (!em.ok) return res.status(400).json({ error: 'E-mail do financeiro inválido.' });

            const [nfBuf, planBuf] = await Promise.all([bufferDaNota(nota), planilhaDoEnvio(envio)]);
            const assunto = String(b.assunto || '').trim() || `Academia — Nota fiscal para pagamento — ${mesLabel(nota.mes_ref)}`;
            const mensagem = String(b.mensagem || '').trim()
                || `Prezados,\n\nSegue em anexo a nota fiscal da academia, já conferida com o valor da relação de colaboradores, para pagamento referente a ${mesLabel(nota.mes_ref)}.\n\nTambém segue a planilha com a relação de colaboradores enviada à academia.\n\nAtenciosamente,\nRH — América Rental`;
            const linhas = [
                ['Mês de referência', mesLabel(nota.mes_ref)],
                ['Nota fiscal', nota.nf_numero ? `nº ${nota.nf_numero}` : (nota.nome_arquivo || '-')],
                ['Valor da nota fiscal', brl(nota.nf_valor)],
                ['Colaboradores na academia', String(envio.qtd_colaboradores)]
            ];
            const html = emailShell('Academia — Nota Fiscal para Pagamento', paragrafos(mensagem) + caixaResumo(linhas));
            await sendMailHelper({
                to: em.lista.join(', '),
                subject: assunto,
                html,
                attachments: [
                    logoAttachment(),
                    { filename: `NF_Academia_${nota.mes_ref}${nota.nf_numero ? '_' + nota.nf_numero : ''}.pdf`, content: nfBuf, contentType: 'application/pdf' },
                    { filename: envio.nome_arquivo || `Academia_${nota.mes_ref}.xlsx`, content: planBuf, contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
                ]
            });
            await dbRun('UPDATE academia_notas SET enviado_financeiro_em = CURRENT_TIMESTAMP, financeiro_email = ?, enviado_financeiro_por = ? WHERE id = ?',
                [em.lista.join(', '), usuarioReq(req), nota.id]);
            if (b.salvar_padrao) await setConfig('academia_email_financeiro', em.lista.join(', '));
            res.json({ success: true });
        } catch (e) {
            console.error('[ACADEMIA] Erro ao enviar ao financeiro:', e);
            res.status(500).json({ error: 'Falha ao enviar e-mail: ' + e.message });
        }
    });

    console.log('[ACADEMIA] Rotas registradas com sucesso.');
};
