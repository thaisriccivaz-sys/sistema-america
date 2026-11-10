// ═══════════════════════════════════════════════════════════════════════════════
// ROTAS: RH › PAGAMENTOS › FACULDADE
// Arquivo: backend/routes_faculdade_pagamentos.js
// Registro no server.js:
//   require('./routes_faculdade_pagamentos')(app, db, authenticateToken, r2);
//
// - Controle de todos os colaboradores que já tiveram faculdade = Sim (Ativo/Inativo, como na Academia)
// - Boleto mensal (todos os meses) e Boletim (ciclos de Janeiro e Julho) por colaborador
// - Os arquivos são gravados na MESMA tabela `documentos` da aba Faculdade do prontuário
//   (tab_name='Faculdade', document_type='Boleto'|'Boletim', year, month) → aparecem nas duas telas
// - Upload/visualização/envio reutilizam as rotas existentes (/api/documentos, /api/send-boleto-financeiro)
// - Arquivos ficam no Cloudflare R2 (documentos.r2_key)
// ═══════════════════════════════════════════════════════════════════════════════
"use strict";

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const pad2 = n => String(n).padStart(2, '0');
const mesValido = m => /^\d{4}-(0[1-9]|1[0-2])$/.test(String(m || ''));
const mesLabel = m => { const [y, mm] = String(m).split('-'); return `${MESES[parseInt(mm, 10) - 1]}/${y}`; };
const normTxt = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
const isSim = s => normTxt(s) === 'sim';
const isoDate = s => { const m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? `${m[1]}-${m[2]}-${m[3]}` : null; };

// ── Regras puras (exportadas para teste) ────────────────────────────────────
// Boletim: ciclos que começam em Janeiro e Julho. Controle começa no ciclo de Julho/2026.
const PRIMEIRO_CICLO = '2026-07';
const MESES_CICLO = ['01', '07'];

function ciclosAte(mes) {
    const y = parseInt(String(mes).slice(0, 4), 10);
    const out = [];
    for (let yy = 2026; yy <= y; yy++) {
        for (const mm of MESES_CICLO) {
            const c = `${yy}-${mm}`;
            if (c >= PRIMEIRO_CICLO && c <= mes) out.push(c);
        }
    }
    return out;
}

// docsPorCiclo: { 'YYYY-MM': doc }   mesInicio: 'YYYY-MM' | null (início do curso)
function statusBoletim(mes, mesInicio, docsPorCiclo, ativo) {
    const ciclos = ciclosAte(mes);
    // Ciclo só é exigido se o curso já tinha começado até o início do ciclo
    const exigidos = ciclos.filter(c => !mesInicio || mesInicio <= c);
    if (!exigidos.length) return { estado: 'nao_exigido', ciclo: null, doc: null, pendentes_qtd: 0 };
    if (!ativo) {
        // Inativo: nada é cobrado; apenas exibe o boletim do último ciclo, se existir
        const ult = exigidos[exigidos.length - 1];
        return docsPorCiclo[ult] ? { estado: 'anexado', ciclo: ult, doc: docsPorCiclo[ult], pendentes_qtd: 0 } : { estado: 'nao_exigido', ciclo: null, doc: null, pendentes_qtd: 0 };
    }
    const pend = exigidos.filter(c => !docsPorCiclo[c]);
    if (pend.length) return { estado: 'pendente', ciclo: pend[0], doc: null, pendentes_qtd: pend.length };
    const ult = exigidos[exigidos.length - 1];
    return { estado: 'anexado', ciclo: ult, doc: docsPorCiclo[ult], pendentes_qtd: 0 };
}

function mesInicioColab(faculdadeDataInicio, periodoAberto) {
    const di = isoDate(faculdadeDataInicio);
    if (di) return di.slice(0, 7);
    if (periodoAberto && periodoAberto.data_entrada && !String(periodoAberto.data_entrada).startsWith('2000')) return String(periodoAberto.data_entrada).slice(0, 7);
    return null;
}

module.exports = function registerFaculdadePagamentosRoutes(app, db, authenticateToken, r2) {

    const PAGE_ID = 'rh-faculdade-pagamentos';
    const CFG_DEFAULTS = { faculdade_email_financeiro: 'contas@americarental.com.br' };
    const SIM_SQL = "LOWER(TRIM(COALESCE(c.faculdade_participa,''))) = 'sim'";
    const DESLIG_SQL = "LOWER(TRIM(COALESCE(c.status,''))) = 'desligado'";

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
        db.run(`CREATE TABLE IF NOT EXISTS faculdade_periodos (
            id             INTEGER PRIMARY KEY AUTOINCREMENT,
            colaborador_id INTEGER NOT NULL,
            data_entrada   TEXT NOT NULL,
            data_saida     TEXT,
            criado_em      DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);
        db.run(`CREATE INDEX IF NOT EXISTS idx_faculdade_periodos_colab ON faculdade_periodos (colaborador_id)`);
    });

    // ── Utilidades ──────────────────────────────────────────────────────────────
    const isoHoje = () => { const d = new Date(); return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; };
    function parseEmails(str) {
        const lista = String(str || '').split(/[;,\s]+/).map(s => s.trim()).filter(Boolean);
        if (lista.length === 0) return { ok: false, lista };
        return { ok: lista.every(e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)), lista };
    }
    async function getEmailFinanceiro() {
        const r = await dbGet('SELECT valor FROM configuracoes_sistema WHERE chave = ?', ['faculdade_email_financeiro']);
        return (r && r.valor && String(r.valor).trim()) || CFG_DEFAULTS.faculdade_email_financeiro;
    }

    // ── Permissão da tela (Controle de Acesso → página 'rh-faculdade-pagamentos') ──
    function isTopAdmin(u) {
        return !!u && (u.role === 'Diretoria' || u.role === 'Administrador' || u.departamento === 'Diretoria'
            || (u.grupo_nome && String(u.grupo_nome).toLowerCase() === 'diretoria'));
    }
    async function requireFaculdadePag(req, res, next) {
        try {
            if (isTopAdmin(req.user)) return next();
            const gid = req.user && req.user.grupo_permissao_id;
            if (!gid) return res.status(403).json({ error: 'Sem permissão para acessar a tela Faculdade.' });
            const row = await dbGet('SELECT visualizar FROM permissoes_grupo WHERE grupo_id = ? AND pagina_id = ?', [gid, PAGE_ID]);
            const v = row && row.visualizar;
            if (v === 1 || v === '1' || v === true || v === 'true') return next();
            return res.status(403).json({ error: 'Sem permissão para acessar a tela Faculdade.' });
        } catch (e) {
            return res.status(500).json({ error: e.message });
        }
    }
    const guard = [authenticateToken, requireFaculdadePag];

    // ── Sincronização: histórico de períodos com faculdade = Sim ───────────────
    async function backfillAuditoria() {
        const rows = await dbAll(`SELECT registro_id, conteudo_anterior, conteudo_atual, data_hora FROM auditoria
                                  WHERE programa = 'Colaboradores' AND campo = 'faculdade_participa'
                                  ORDER BY registro_id, data_hora, id`);
        const porColab = {};
        rows.forEach(r => { (porColab[r.registro_id] = porColab[r.registro_id] || []).push(r); });
        for (const idStr of Object.keys(porColab)) {
            const colabId = parseInt(idStr, 10);
            const colab = await dbGet('SELECT id, faculdade_data_inicio FROM colaboradores WHERE id = ?', [colabId]);
            if (!colab) continue;
            const lista = porColab[idStr];
            let aberto = isSim(lista[0].conteudo_anterior) ? (isoDate(colab.faculdade_data_inicio) || '2000-01-01') : null;
            for (const r of lista) {
                const d = isoDate(r.data_hora) || isoHoje();
                if (isSim(r.conteudo_atual) && !aberto) {
                    aberto = d;
                } else if (!isSim(r.conteudo_atual) && aberto) {
                    await dbRun('INSERT INTO faculdade_periodos (colaborador_id, data_entrada, data_saida) VALUES (?, ?, ?)', [colabId, aberto, d < aberto ? aberto : d]);
                    aberto = null;
                }
            }
            if (aberto) await dbRun('INSERT INTO faculdade_periodos (colaborador_id, data_entrada, data_saida) VALUES (?, ?, NULL)', [colabId, aberto]);
        }
    }

    async function syncImpl() {
        const hoje = isoHoje();
        const nPer = (await dbGet('SELECT COUNT(*) AS n FROM faculdade_periodos')).n;
        const primeiraVez = nPer === 0;
        if (primeiraVez) await backfillAuditoria();

        // 1a) Faculdade = Sim, NÃO desligado e sem período aberto → abre período
        const abrir = await dbAll(`SELECT c.id, c.faculdade_data_inicio FROM colaboradores c
            WHERE ${SIM_SQL} AND NOT (${DESLIG_SQL})
              AND NOT EXISTS (SELECT 1 FROM faculdade_periodos p WHERE p.colaborador_id = c.id AND p.data_saida IS NULL)`);
        for (const c of abrir) {
            const jaTeve = await dbGet('SELECT id FROM faculdade_periodos WHERE colaborador_id = ? LIMIT 1', [c.id]);
            const inicio = isoDate(c.faculdade_data_inicio);
            const entrada = jaTeve ? hoje : (inicio || (primeiraVez ? '2000-01-01' : hoje));
            await dbRun('INSERT INTO faculdade_periodos (colaborador_id, data_entrada, data_saida) VALUES (?, ?, NULL)', [c.id, entrada]);
        }

        // 1b) Desligado com Faculdade = Sim e nunca teve período → grava período já encerrado (aparece como Inativo)
        const desligSemPeriodo = await dbAll(`SELECT c.id, c.faculdade_data_inicio FROM colaboradores c
            WHERE ${SIM_SQL} AND (${DESLIG_SQL})
              AND NOT EXISTS (SELECT 1 FROM faculdade_periodos p WHERE p.colaborador_id = c.id)`);
        for (const c of desligSemPeriodo) {
            const inicio = isoDate(c.faculdade_data_inicio) || '2000-01-01';
            await dbRun('INSERT INTO faculdade_periodos (colaborador_id, data_entrada, data_saida) VALUES (?, ?, ?)', [c.id, inicio, hoje < inicio ? inicio : hoje]);
        }

        // 2) Período aberto, mas deixou de ser "Sim" OU foi desligado → fecha o período (vira Inativo na hora)
        const fechar = await dbAll(`SELECT p.id, p.data_entrada FROM faculdade_periodos p
            LEFT JOIN colaboradores c ON c.id = p.colaborador_id
            WHERE p.data_saida IS NULL AND (c.id IS NULL OR NOT (${SIM_SQL}) OR (${DESLIG_SQL}))`);
        for (const p of fechar) {
            await dbRun('UPDATE faculdade_periodos SET data_saida = ? WHERE id = ?', [hoje < p.data_entrada ? p.data_entrada : hoje, p.id]);
        }
    }
    let _syncChain = Promise.resolve();
    function sync() {
        _syncChain = _syncChain.then(syncImpl).catch(e => { console.error('[FACULDADE-PAG] Erro na sincronização:', e.message); });
        return _syncChain;
    }
    // Quando um colaborador é criado/alterado/inativado, atualiza o histórico
    app.use('/api/colaboradores', (req, res, next) => {
        if ((req.method === 'PUT' || req.method === 'POST' || req.method === 'DELETE') && /^\/(\d+)?\/?$/.test(req.path)) {
            res.on('finish', () => { if (res.statusCode >= 200 && res.statusCode < 300) sync(); });
        }
        next();
    });
    setTimeout(() => { sync(); }, 9000);

    // ── Montagem da lista do mês ────────────────────────────────────────────────
    async function montarLista(mes) {
        await sync();
        const [Y, M] = [mes.slice(0, 4), mes.slice(5, 7)];
        const colabs = await dbAll(`SELECT c.id, c.nome_completo, c.cpf, c.status AS colab_status, c.faculdade_participa, c.faculdade_data_inicio,
                                           cf.nome_curso, cf.instituicao
                                    FROM colaboradores c
                                    LEFT JOIN cursos_faculdade cf ON cf.id = c.faculdade_curso_id
                                    WHERE c.id IN (SELECT DISTINCT colaborador_id FROM faculdade_periodos)`);
        const pers = await dbAll('SELECT colaborador_id, data_entrada, data_saida FROM faculdade_periodos ORDER BY id');
        const porColab = {};
        pers.forEach(p => { (porColab[p.colaborador_id] = porColab[p.colaborador_id] || []).push(p); });

        const docs = await dbAll(`SELECT id, colaborador_id, document_type, year, month, file_name, upload_date, boleto_financeiro_enviado_em
                                  FROM documentos
                                  WHERE tab_name = 'Faculdade' AND document_type IN ('Boleto', 'Boletim')
                                    AND COALESCE(TRIM(file_name), '') <> ''
                                  ORDER BY id`);
        const boletos = {};      // `${colab}|YYYY-MM` -> doc
        const boletins = {};     // colab -> { 'YYYY-MM': doc }
        docs.forEach(d => {
            const ym = `${String(d.year || '').trim()}-${pad2(parseInt(d.month, 10) || 0)}`;
            if (!mesValido(ym)) return;
            const doc = { id: d.id, file_name: d.file_name, upload_date: d.upload_date, enviado_em: d.boleto_financeiro_enviado_em || null };
            if (d.document_type === 'Boleto') boletos[`${d.colaborador_id}|${ym}`] = doc;
            else (boletins[d.colaborador_id] = boletins[d.colaborador_id] || {})[ym] = doc;
        });

        const itens = colabs.map(c => {
            const ps = porColab[c.id] || [];
            const desligado = normTxt(c.colab_status) === 'desligado';
            const aberto = ps.find(p => !p.data_saida) || null;
            const ativo = !desligado && isSim(c.faculdade_participa) && !!aberto;
            const ult = ps[ps.length - 1] || null;
            const mesInicio = mesInicioColab(c.faculdade_data_inicio, aberto);
            const boletoExigido = ativo && (!mesInicio || mes >= mesInicio);
            return {
                colaborador_id: c.id,
                nome: c.nome_completo || '',
                cpf: c.cpf || '',
                curso: c.nome_curso || '',
                instituicao: c.instituicao || '',
                status: ativo ? 'ativo' : 'inativo',
                desligado,
                data_saida: ativo ? null : (ult ? ult.data_saida : null),
                mes_inicio: mesInicio,
                boleto: { exigido: boletoExigido, doc: boletos[`${c.id}|${mes}`] || null },
                boletim: statusBoletim(mes, mesInicio, boletins[c.id] || {}, ativo)
            };
        });
        itens.sort((a, b) => (a.status === b.status ? 0 : (a.status === 'ativo' ? -1 : 1)) || a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' }));

        const ativos = itens.filter(i => i.status === 'ativo');
        const resumo = {
            qtd_ativos: ativos.length,
            qtd_inativos: itens.length - ativos.length,
            boletos_pendentes: ativos.filter(i => i.boleto.exigido && !i.boleto.doc).length,
            boletos_anexados: itens.filter(i => i.boleto.doc && !i.boleto.doc.enviado_em).length,
            boletos_enviados: itens.filter(i => i.boleto.doc && i.boleto.doc.enviado_em).length,
            boletins_pendentes: itens.filter(i => i.boletim.estado === 'pendente').length
        };
        return { mes, ano: Y, mes_num: M, itens, resumo };
    }

    // ── Rotas ───────────────────────────────────────────────────────────────────
    app.get('/api/faculdade-pagamentos/config', guard, async (req, res) => {
        try { res.json({ email_financeiro: await getEmailFinanceiro() }); }
        catch (e) { res.status(500).json({ error: e.message }); }
    });
    app.put('/api/faculdade-pagamentos/config', guard, async (req, res) => {
        try {
            const b = req.body || {};
            if (b.email_financeiro !== undefined) {
                if (!parseEmails(b.email_financeiro).ok) return res.status(400).json({ error: 'E-mail do financeiro inválido.' });
                await dbRun(`INSERT INTO configuracoes_sistema (chave, valor) VALUES (?, ?) ON CONFLICT(chave) DO UPDATE SET valor = excluded.valor`,
                    ['faculdade_email_financeiro', String(b.email_financeiro).trim()]);
            }
            res.json({ success: true });
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    app.get('/api/faculdade-pagamentos', guard, async (req, res) => {
        try {
            const mes = mesValido(req.query.mes) ? req.query.mes : isoHoje().slice(0, 7);
            const lista = await montarLista(mes);
            res.json({ ...lista, email_financeiro: await getEmailFinanceiro() });
        } catch (e) {
            console.error('[FACULDADE-PAG] GET lista:', e);
            res.status(500).json({ error: e.message });
        }
    });

    // Após (re)anexar um boleto: zera o status "enviado ao financeiro" (o arquivo mudou)
    app.post('/api/faculdade-pagamentos/pos-upload', guard, async (req, res) => {
        try {
            const b = req.body || {};
            const colabId = parseInt(b.colaborador_id, 10);
            if (!colabId || b.tipo !== 'Boleto') return res.json({ success: true });
            const mm = pad2(parseInt(b.month, 10) || 0);
            await dbRun(`UPDATE documentos SET boleto_financeiro_enviado_em = NULL
                         WHERE colaborador_id = ? AND tab_name = 'Faculdade' AND document_type = 'Boleto'
                           AND year = ? AND (month = ? OR month = ?)`, [colabId, String(b.year || ''), mm, String(parseInt(mm, 10))]);
            res.json({ success: true });
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    // Remover boleto/boletim (R2 antes do banco)
    app.delete('/api/faculdade-pagamentos/documento/:id', guard, async (req, res) => {
        try {
            const row = await dbGet(`SELECT id, tab_name, document_type, r2_key, signed_r2_key, file_path FROM documentos WHERE id = ?`, [req.params.id]);
            if (!row || row.tab_name !== 'Faculdade' || !['Boleto', 'Boletim'].includes(row.document_type)) {
                return res.status(404).json({ error: 'Documento não encontrado.' });
            }
            const pronto = !!(r2 && typeof r2.isReady === 'function' && r2.isReady());
            for (const key of [row.r2_key, row.signed_r2_key]) {
                if (key && pronto) { try { await r2.deleteFromR2(key); } catch (e) { console.warn('[FACULDADE-PAG] Falha ao apagar do R2:', e.message); } }
            }
            try { const fs = require('fs'); if (row.file_path && fs.existsSync(row.file_path)) fs.unlinkSync(row.file_path); } catch (e) { /* arquivo local legado */ }
            await dbRun('DELETE FROM documentos WHERE id = ?', [row.id]);
            res.json({ success: true });
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    console.log('[FACULDADE-PAG] Rotas registradas com sucesso.');
};

module.exports.ciclosAte = ciclosAte;
module.exports.statusBoletim = statusBoletim;
module.exports.mesInicioColab = mesInicioColab;
