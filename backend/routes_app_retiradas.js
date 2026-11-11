// ═══════════════════════════════════════════════════════════════════════════════
// ROTAS: APP › LIDERANÇA › RETIRADAS  (uso operacional, mobile-first)
// Arquivo: backend/routes_app_retiradas.js
// Registro no server.js:
//   require('./routes_app_retiradas')(app, db, authenticateToken, r2);
//
// - Lista as retiradas do pipeline (os_logistica) por data (agenda) com filtros
// - Cada equipamento retirado (1 por unidade da OS) tem um checklist por modelo
//   (👍 OK / 👎 avariado, observação, FOTO obrigatória por item, vídeo opcional)
// - Motorista + veículo vêm do Resumo de Rota do dia (logistica_resumo_rota)
// - Pendência vale para TODOS os líderes liberados no Controle de Acesso (sem regra de turno)
// - Arquivos: Cloudflare R2 (nunca disco local) — streaming privado via /midia/:id
// ═══════════════════════════════════════════════════════════════════════════════
"use strict";

const multer = require('multer');
const crypto = require('crypto');

module.exports = function registerAppRetiradasRoutes(app, db, authenticateToken, r2) {

    const PAGE_ID = 'app-lideranca-retiradas';
    const TZ = 'America/Sao_Paulo';
    const INICIO_CONTROLE_PADRAO = '2026-11-10'; // "a partir de ontem" (pedido em 11/11/2026)
    const MAX_VIDEO_MB = 60;
    const uploadMem = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_VIDEO_MB * 1024 * 1024 } });

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

    // ── Utilidades ──────────────────────────────────────────────────────────────
    const norm = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    const isoDate = s => {
        const str = String(s || '').trim();
        const m = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (m) return `${m[1]}-${m[2]}-${m[3]}`;
        const mBr = str.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
        if (mBr) return `${mBr[3]}-${mBr[2]}-${mBr[1]}`;
        return null;
    };
    const hojeSP = () => new Date().toLocaleDateString('en-CA', { timeZone: TZ });
    const somaDias = (iso, n) => { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
    const slug = s => norm(s).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    const parseJson = (s, fb) => { try { const v = JSON.parse(s); return v == null ? fb : v; } catch (e) { return fb; } };
    const chunk = (arr, n) => { const out = []; for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n)); return out; };

    // ── Checklists por modelo (exatamente os itens enviados pelo RH/Diretoria) ──
    const BASE_STD = ['Porta', 'Dobradiça', 'Cabo de aço porta', 'Laterais', 'Teto', 'Fechadura', 'Telas', 'Assento sanitário', 'Placa/adesivo', 'Tubo de respiro', 'Piso', 'Caixa de dejetos', 'Mictório'];
    const BASE_LX = BASE_STD.concat(['Cuba', 'Bomba de descarga']);
    const MODELOS = {
        STD: { nome: 'Banheiro STD', icone: 'ph-toilet', itens: BASE_STD },
        LX: { nome: 'Banheiro LX', icone: 'ph-toilet', itens: BASE_LX },
        ELX: { nome: 'Banheiro ELX', icone: 'ph-toilet', itens: BASE_LX.concat(['Pia/lavatório', 'Torneira', 'Dispensers']) },
        GUARITA: { nome: 'Guarita', icone: 'ph-house-line', itens: ['Porta', 'Lateral', 'Teto', 'Pintura', 'Fechadura', 'Chave', 'Vidros/janelas', 'Piso', 'Soquete', 'Interruptor', 'Balcão'] },
        MICTORIO: { nome: 'Mictório', icone: 'ph-drop', itens: ['Tampinhas', 'Parte de cima', 'Parte de baixo'] },
        PIA: { nome: 'Pia PBII e PBIII', icone: 'ph-drop-half', itens: ['Torneiras', 'Dispensers', 'Reservatório de água limpa', 'Reservatório de água suja', 'Bomba', 'Chicotes'] },
        HIDRAULICO: { nome: 'Hidráulico', icone: 'ph-toilet', itens: ['Porta', 'Dobradiça', 'Cabo de aço porta', 'Laterais', 'Teto', 'Fechadura', 'Telas', 'Assento sanitário', 'Placa/adesivo', 'Piso', 'Vaso sanitário', 'Caixa de descarga', 'Tubo para descarga', 'Pia/lavatório', 'Torneira', 'Chicotes', 'Dispensers'] },
        CHUVEIRO: { nome: 'Chuveiro', icone: 'ph-shower', itens: ['Porta', 'Dobradiça', 'Cabo de aço porta', 'Laterais', 'Teto', 'Fechadura', 'Telas', 'Placa/adesivo', 'Piso', 'Encanamentos', 'Ralo'] },
        PCD: { nome: 'Banheiro PCD', icone: 'ph-wheelchair', itens: ['Porta', 'Dobradiça', 'Cabo de aço porta', 'Laterais', 'Teto', 'Fechadura', 'Telas', 'Assento sanitário', 'Placa/adesivo', 'Tubo de respiro', 'Piso', 'Caixa de dejetos', 'Barras de apoio'] }
    };
    Object.keys(MODELOS).forEach(k => { MODELOS[k].itens = MODELOS[k].itens.map(t => ({ id: slug(t), texto: t })); });

    // Nome do produto na OS → modelo do checklist (Carrinho, Limpa Fossa e Visita Técnica não têm checklist)
    function mapModelo(desc) {
        const t = norm(desc).toUpperCase();
        if (!t) return null;
        if (/VISITA|CARRINHO|FOSSA/.test(t)) return null;
        if (/\bPCD\b/.test(t)) return 'PCD';
        if (/GUARITA/.test(t)) return 'GUARITA';
        if (/CHUVEIRO/.test(t)) return 'CHUVEIRO';
        if (/HIDRAUL/.test(t)) return 'HIDRAULICO';
        if (/MICTORIO/.test(t)) return 'MICTORIO';
        if (/\bPIA\b|PB\s?I{2,3}\b/.test(t)) return 'PIA';
        if (/\b(ELX|SLX)\b|EXTRA\s?LUXO/.test(t)) return 'ELX';
        if (/\bLX\b/.test(t)) return 'LX';
        if (/\bSTD\b|STANDARD/.test(t)) return 'STD';
        return null;
    }

    // Uma "unidade" por equipamento retirado (OS com 3 STD → 3 checklists independentes)
    function unidadesDaOS(os) {
        const prods = parseJson(os.produtos, []);
        const units = [];
        (Array.isArray(prods) ? prods : []).forEach((p, pi) => {
            const modelo = mapModelo(p && (p.desc || p.produto));
            if (!modelo) return;
            const qtd = Math.min(50, Math.max(1, parseInt(p.qtd, 10) || 1));
            for (let n = 1; n <= qtd; n++) units.push({ key: `${pi + 1}-${n}`, modelo, produto: String((p.desc || p.produto || '')).trim() });
        });
        const total = {}; units.forEach(u => { total[u.modelo] = (total[u.modelo] || 0) + 1; });
        const visto = {};
        units.forEach(u => {
            visto[u.modelo] = (visto[u.modelo] || 0) + 1;
            u.indice = visto[u.modelo];
            u.total = total[u.modelo];
            u.rotulo = MODELOS[u.modelo].nome + (u.total > 1 ? ` ${u.indice}/${u.total}` : '');
        });
        return units;
    }
    const soVisitaTecnica = os => {
        const prods = parseJson(os.produtos, []);
        return Array.isArray(prods) && prods.length > 0 && prods.every(p => /VISITA/.test(norm(p && (p.desc || p.produto)).toUpperCase()));
    };

    // ── Migrações ───────────────────────────────────────────────────────────────
    db.serialize(() => {
        db.run(`CREATE TABLE IF NOT EXISTS configuracoes_sistema (chave TEXT PRIMARY KEY, valor TEXT)`);
        db.run(`INSERT OR IGNORE INTO configuracoes_sistema (chave, valor) VALUES ('retiradas_inicio_controle', '${INICIO_CONTROLE_PADRAO}')`);
        db.run(`CREATE TABLE IF NOT EXISTS retiradas_checklist (
            id             INTEGER PRIMARY KEY AUTOINCREMENT,
            os_id          INTEGER NOT NULL,
            unit_key       TEXT NOT NULL,
            numero_os      TEXT,
            data_retirada  TEXT,
            modelo         TEXT,
            unidade_idx    INTEGER,
            unidade_total  INTEGER,
            itens_json     TEXT,
            tem_avaria     INTEGER DEFAULT 0,
            veiculo        TEXT,
            motorista      TEXT,
            lider_id       INTEGER,
            lider_nome     TEXT,
            lider_colab_id INTEGER,
            iniciado_em    DATETIME DEFAULT CURRENT_TIMESTAMP,
            atualizado_em  DATETIME DEFAULT CURRENT_TIMESTAMP,
            concluido_em   DATETIME,
            UNIQUE (os_id, unit_key)
        )`);
        db.run(`CREATE TABLE IF NOT EXISTS retiradas_checklist_midias (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            checklist_id INTEGER NOT NULL,
            tipo         TEXT NOT NULL,
            item         TEXT,
            r2_key       TEXT,
            content_type TEXT,
            criado_em    DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);
        db.run(`CREATE INDEX IF NOT EXISTS idx_ret_ck_data ON retiradas_checklist (data_retirada)`);
        db.run(`CREATE INDEX IF NOT EXISTS idx_ret_mid_ck ON retiradas_checklist_midias (checklist_id)`);
    });

    // ── Permissão (Controle de Acesso → página 'app-lideranca-retiradas') ──────
    function isTopAdmin(u) {
        return !!u && (u.role === 'Diretoria' || u.role === 'Administrador' || u.departamento === 'Diretoria'
            || (u.grupo_nome && String(u.grupo_nome).toLowerCase() === 'diretoria'));
    }
    async function requireApp(req, res, next) {
        try {
            if (isTopAdmin(req.user)) return next();
            const gid = req.user && req.user.grupo_permissao_id;
            if (!gid) return res.status(403).json({ error: 'Sem permissão para acessar Retiradas.' });
            const row = await dbGet('SELECT visualizar FROM permissoes_grupo WHERE grupo_id = ? AND pagina_id = ?', [gid, PAGE_ID]);
            const v = row && row.visualizar;
            if (v === 1 || v === '1' || v === true || v === 'true') return next();
            return res.status(403).json({ error: 'Sem permissão para acessar Retiradas.' });
        } catch (e) { return res.status(500).json({ error: e.message }); }
    }
    const guard = [authenticateToken, requireApp];

    async function inicioControle() {
        const r = await dbGet(`SELECT valor FROM configuracoes_sistema WHERE chave = 'retiradas_inicio_controle'`);
        return (r && isoDate(r.valor)) || INICIO_CONTROLE_PADRAO;
    }

    // Líder que está conferindo (nome do usuário + colaborador para a foto)
    async function liderDoReq(req) {
        const uid = (req.user && req.user.id) || null;
        let nome = (req.user && (req.user.nome || req.user.username)) || 'Líder';
        try {
            const u = await dbGet("SELECT COALESCE(NULLIF(TRIM(nome),''), username) AS n FROM usuarios WHERE id = ?", [uid]);
            if (u && u.n) nome = u.n;
        } catch (e) { /* usa fallback */ }
        let colabId = null;
        try {
            const cfg = uid ? await dbGet('SELECT colaborador_id FROM app_lider_config WHERE usuario_id = ?', [uid]) : null;
            if (cfg) colabId = cfg.colaborador_id;
            if (!colabId) {
                const c = await dbGet('SELECT id FROM colaboradores WHERE LOWER(TRIM(nome_completo)) = LOWER(TRIM(?)) LIMIT 1', [nome]);
                if (c) colabId = c.id;
            }
        } catch (e) { /* sem foto */ }
        return { id: uid, nome, colabId };
    }

    // ── Rota do dia: numero_os → veículo / motorista (Resumo de Rota) ──────────
    const cacheResumo = new Map(); // id → { len, mapa }
    function montarMapaResumo(nome, dadosStr) {
        const mapa = {};
        const dados = parseJson(dadosStr, null);
        const veic = Array.isArray(dados) ? dados : (dados && Array.isArray(dados.veiculos) ? dados.veiculos : []);
        const turno = /NOITE/i.test(norm(nome)) ? 'Noite' : 'Dia';
        veic.forEach(v => {
            (v.os || []).forEach(o => {
                const num = String(o._numero_os || '').trim();
                if (!num) return;
                const tipo = norm((o.tipo || '') + ' ' + (o.servico || '')).toUpperCase();
                if (!/RETIRADA/.test(tipo)) return;
                mapa[num] = {
                    veiculo: v.veiculo || '', motorista: v.motorista || '', ajudante: v.ajudante || '',
                    motorista_foto: v._fotoMotorista || null, ajudante_foto: v._fotoAjudante || null,
                    resumo: nome, turno
                };
            });
        });
        return mapa;
    }
    async function mapaRotaDoDia(iso) {
        const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (!m) return {};
        const prefixo = `${m[3]}-${m[2]}-${m[1]}`;
        const rows = await dbAll(`SELECT id, nome, length(dados) AS len FROM logistica_resumo_rota WHERE nome LIKE ? ORDER BY id ASC`, [prefixo + '%']);
        const mapa = {};
        for (const r of rows) {
            let c = cacheResumo.get(r.id);
            if (!c || c.len !== r.len) {
                const full = await dbGet('SELECT dados FROM logistica_resumo_rota WHERE id = ?', [r.id]);
                c = { len: r.len, mapa: montarMapaResumo(r.nome, full && full.dados) };
                cacheResumo.set(r.id, c);
            }
            Object.assign(mapa, c.mapa);
        }
        return mapa;
    }

    // ── Montagem de uma retirada (OS) com situação por unidade ─────────────────
    function estadoDoRow(row) { return row ? parseJson(row.itens_json, {}) : {}; }
    function resumoUnidade(u, row, fotosItem) {
        const itens = MODELOS[u.modelo].itens;
        const estado = estadoDoRow(row);
        const feitos = itens.filter(i => { const e = estado[i.id]; return e && (e.ok || e.nao) && fotosItem.has(i.id); }).length;
        const concluido = !!(row && row.concluido_em);
        const avaria = concluido && !!row.tem_avaria;
        return {
            key: u.key, modelo: u.modelo, modelo_nome: MODELOS[u.modelo].nome, icone: MODELOS[u.modelo].icone,
            rotulo: u.rotulo, produto: u.produto, indice: u.indice, total: u.total,
            itens_total: itens.length, itens_feitos: feitos,
            status: concluido ? (avaria ? 'avaria' : 'ok') : (feitos > 0 ? 'andamento' : 'pendente'),
            concluido, tem_avaria: avaria,
            lider_nome: concluido ? row.lider_nome : null, lider_colab_id: concluido ? row.lider_colab_id : null,
            concluido_em: concluido ? row.concluido_em : null
        };
    }
    function resumoOS(os, units, rows, fotosPorCk, rota, hoje, inicio) {
        const unidades = units.map(u => {
            const row = rows[`${os.id}|${u.key}`];
            return resumoUnidade(u, row, row ? (fotosPorCk[row.id] || new Set()) : new Set());
        });
        const concl = unidades.filter(u => u.concluido).length;
        const algumaAvaria = unidades.some(u => u.tem_avaria);
        let situacao;
        if (!unidades.length) situacao = 'sem_checklist';
        else if (concl === unidades.length) situacao = algumaAvaria ? 'avaria' : 'ok';
        else if (concl > 0 || unidades.some(u => u.itens_feitos > 0)) situacao = 'andamento';
        else situacao = 'pendente';
        const data = isoDate(os.data_os);
        const incompleta = unidades.length > 0 && concl < unidades.length;
        return {
            os_id: os.id, numero_os: os.numero_os, cliente: os.cliente, endereco: os.endereco, complemento: os.complemento || '',
            contrato: os.contrato || '', data_retirada: data, tipo_servico: os.tipo_servico,
            hora_inicio: os.hora_inicio || '', hora_fim: os.hora_fim || '', turno_os: os.turno || '',
            unidades, concluidas: concl, total_unidades: unidades.length,
            situacao, tem_avaria: algumaAvaria,
            pendente: incompleta && data >= inicio && data <= hoje,
            futura: data > hoje,
            rota: rota || null
        };
    }

    async function carregarRowsEFotos(osIds, de, ate) {
        const rows = {}; const fotosPorCk = {};
        if (!osIds.length) return { rows, fotosPorCk };
        for (const lote of chunk(osIds, 400)) {
            const ph = lote.map(() => '?').join(',');
            const rs = await dbAll(`SELECT * FROM retiradas_checklist WHERE os_id IN (${ph})`, lote);
            rs.forEach(r => { rows[`${r.os_id}|${r.unit_key}`] = r; });
        }
        const ckIds = Object.values(rows).map(r => r.id);
        for (const lote of chunk(ckIds, 400)) {
            const ph = lote.map(() => '?').join(',');
            const ms = await dbAll(`SELECT checklist_id, item FROM retiradas_checklist_midias WHERE tipo = 'foto' AND checklist_id IN (${ph})`, lote);
            ms.forEach(m => { (fotosPorCk[m.checklist_id] = fotosPorCk[m.checklist_id] || new Set()).add(m.item); });
        }
        return { rows, fotosPorCk };
    }

    // ── GET lista (agenda + filtros no front) ───────────────────────────────────
    // ?de=YYYY-MM-DD&ate=YYYY-MM-DD   (retiradas do intervalo + TODAS as pendentes desde o início do controle)
    app.get('/api/app/retiradas', guard, async (req, res) => {
        try {
            const hoje = hojeSP();
            const inicio = await inicioControle();
            const de = isoDate(req.query.de) || somaDias(hoje, -7);
            const ate = isoDate(req.query.ate) || somaDias(hoje, 14);
            const oss = (await dbAll(`SELECT id, numero_os, cliente, endereco, complemento, contrato, data_os, tipo_servico, produtos, hora_inicio, hora_fim, turno
                FROM os_logistica
                WHERE status = 'ativo' AND LOWER(tipo_servico) LIKE '%retirada%' AND data_os IS NOT NULL AND data_os != ''
                  AND ((data_os >= ? AND data_os <= ?) OR (data_os >= ? AND data_os <= ?))
                ORDER BY data_os ASC, cliente ASC, CAST(numero_os AS REAL) ASC`, [de, ate, inicio, hoje]))
                .filter(os => !soVisitaTecnica(os));
            const { rows, fotosPorCk } = await carregarRowsEFotos(oss.map(o => o.id));
            const datas = [...new Set(oss.map(o => isoDate(o.data_os)).filter(Boolean))];
            const rotas = {};
            for (const d of datas) rotas[d] = await mapaRotaDoDia(d);
            const itens = oss.map(os => {
                const data = isoDate(os.data_os);
                const rota = (rotas[data] || {})[String(os.numero_os || '').trim()] || null;
                return resumoOS(os, unidadesDaOS(os), rows, fotosPorCk, rota, hoje, inicio);
            });
            res.json({ hoje, inicio_controle: inicio, de, ate, itens });
        } catch (e) {
            console.error('[APP-RETIRADAS] GET lista:', e);
            res.status(500).json({ error: 'Erro ao carregar retiradas: ' + e.message });
        }
    });

    // ── Detalhe de uma retirada (OS) com itens, estado e mídias ────────────────
    async function detalheOS(osId) {
        const os = await dbGet(`SELECT id, numero_os, cliente, endereco, complemento, contrato, data_os, tipo_servico, produtos, hora_inicio, hora_fim, turno, observacoes
            FROM os_logistica WHERE id = ? AND status = 'ativo'`, [osId]);
        if (!os) return null;
        const hoje = hojeSP(); const inicio = await inicioControle();
        const data = isoDate(os.data_os);
        const rota = ((await mapaRotaDoDia(data))[String(os.numero_os || '').trim()]) || null;
        const units = unidadesDaOS(os);
        const { rows, fotosPorCk } = await carregarRowsEFotos([os.id]);
        const base = resumoOS(os, units, rows, fotosPorCk, rota, hoje, inicio);
        const midiasPorCk = {};
        const ckIds = Object.values(rows).map(r => r.id);
        if (ckIds.length) {
            const ms = await dbAll(`SELECT id, checklist_id, tipo, item FROM retiradas_checklist_midias WHERE checklist_id IN (${ckIds.map(() => '?').join(',')}) ORDER BY id ASC`, ckIds);
            ms.forEach(m => { (midiasPorCk[m.checklist_id] = midiasPorCk[m.checklist_id] || []).push({ id: m.id, tipo: m.tipo, item: m.item }); });
        }
        base.observacoes = os.observacoes || '';
        base.unidades = base.unidades.map(u => {
            const row = rows[`${os.id}|${u.key}`];
            return Object.assign({}, u, {
                itens: MODELOS[u.modelo].itens,
                estado: estadoDoRow(row),
                midias: row ? (midiasPorCk[row.id] || []) : []
            });
        });
        return base;
    }
    app.get('/api/app/retiradas/os/:id', guard, async (req, res) => {
        try {
            const d = await detalheOS(parseInt(req.params.id, 10));
            if (!d) return res.status(404).json({ error: 'Retirada não encontrada.' });
            res.json(d);
        } catch (e) {
            console.error('[APP-RETIRADAS] GET detalhe:', e);
            res.status(500).json({ error: e.message });
        }
    });

    // Localiza OS + unidade e garante a linha do checklist
    async function contextoUnidade(osId, key) {
        const os = await dbGet(`SELECT id, numero_os, data_os, tipo_servico, produtos FROM os_logistica WHERE id = ? AND status = 'ativo'`, [osId]);
        if (!os) return { erro: 'Retirada não encontrada.', status: 404 };
        const unit = unidadesDaOS(os).find(u => u.key === key);
        if (!unit) return { erro: 'Equipamento não encontrado nesta retirada.', status: 404 };
        const data = isoDate(os.data_os);
        const rota = ((await mapaRotaDoDia(data))[String(os.numero_os || '').trim()]) || {};
        let row = await dbGet('SELECT * FROM retiradas_checklist WHERE os_id = ? AND unit_key = ?', [os.id, unit.key]);
        if (!row) {
            await dbRun(`INSERT OR IGNORE INTO retiradas_checklist (os_id, unit_key, numero_os, data_retirada, modelo, unidade_idx, unidade_total, itens_json, veiculo, motorista)
                VALUES (?, ?, ?, ?, ?, ?, ?, '{}', ?, ?)`,
                [os.id, unit.key, String(os.numero_os || ''), data, unit.modelo, unit.indice, unit.total, rota.veiculo || null, rota.motorista || null]);
            row = await dbGet('SELECT * FROM retiradas_checklist WHERE os_id = ? AND unit_key = ?', [os.id, unit.key]);
        }
        return { os, unit, row, data, rota };
    }

    // ── PUT rascunho do checklist (a cada toque) ────────────────────────────────
    app.put('/api/app/retiradas/os/:id/unidades/:key/checklist', guard, async (req, res) => {
        try {
            const ctx = await contextoUnidade(parseInt(req.params.id, 10), req.params.key);
            if (ctx.erro) return res.status(ctx.status).json({ error: ctx.erro });
            if (ctx.row.concluido_em) return res.status(409).json({ error: 'Esta conferência já foi concluída.' });
            const entrada = (req.body && req.body.itens) || {};
            const antigo = estadoDoRow(ctx.row);
            const limpo = {};
            MODELOS[ctx.unit.modelo].itens.forEach(it => {
                const e = entrada[it.id];
                if (!e) { if (antigo[it.id]) limpo[it.id] = antigo[it.id]; return; }
                const ok = !!e.ok;
                limpo[it.id] = { ok, nao: !!e.nao && !ok, obs: String(e.obs || '').slice(0, 500), em: e.em || (antigo[it.id] && antigo[it.id].em) || new Date().toISOString() };
            });
            await dbRun(`UPDATE retiradas_checklist SET itens_json = ?, atualizado_em = CURRENT_TIMESTAMP,
                veiculo = COALESCE(?, veiculo), motorista = COALESCE(?, motorista) WHERE id = ?`,
                [JSON.stringify(limpo), ctx.rota.veiculo || null, ctx.rota.motorista || null, ctx.row.id]);
            res.json({ ok: true });
        } catch (e) {
            console.error('[APP-RETIRADAS] PUT checklist:', e);
            res.status(500).json({ error: e.message });
        }
    });

    // ── POST foto (1 por item) ou vídeo (opcional, 1 por equipamento) → R2 ─────
    app.post('/api/app/retiradas/os/:id/unidades/:key/midia', guard, uploadMem.single('arquivo'), async (req, res) => {
        try {
            if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
            const ctx = await contextoUnidade(parseInt(req.params.id, 10), req.params.key);
            if (ctx.erro) return res.status(ctx.status).json({ error: ctx.erro });
            if (ctx.row.concluido_em) return res.status(409).json({ error: 'Esta conferência já foi concluída.' });
            if (!r2 || !r2.isReady()) return res.status(503).json({ error: 'Armazenamento de arquivos (R2) não está configurado. Tente novamente mais tarde.' });

            const item = String((req.body && req.body.item) || '').trim();
            const mime = String(req.file.mimetype || '').toLowerCase();
            const ehVideo = item === 'video';
            if (ehVideo) {
                if (!/^video\//.test(mime)) return res.status(400).json({ error: 'O arquivo precisa ser um vídeo.' });
            } else {
                if (!/^image\//.test(mime)) return res.status(400).json({ error: 'O arquivo precisa ser uma foto.' });
                if (!MODELOS[ctx.unit.modelo].itens.some(i => i.id === item)) return res.status(400).json({ error: 'Item inválido para este equipamento.' });
                if (req.file.size > 12 * 1024 * 1024) return res.status(413).json({ error: 'Foto muito grande (máx. 12 MB).' });
            }
            const ext = ehVideo ? (/quicktime/.test(mime) ? 'mov' : (/webm/.test(mime) ? 'webm' : 'mp4')) : (/png/.test(mime) ? 'png' : (/webp/.test(mime) ? 'webp' : 'jpg'));
            const [y, m, d] = (ctx.data || hojeSP()).split('-');
            const hash = crypto.randomBytes(4).toString('hex');
            const r2Key = `retiradas-checklist/${y}/${m}/${d}/OS${String(ctx.os.numero_os || ctx.os.id).replace(/[^\w-]/g, '')}_${ctx.unit.modelo}${ctx.unit.indice}_${ehVideo ? 'video' : item}_${Date.now()}_${hash}.${ext}`;
            await r2.uploadToR2(r2Key, req.file.buffer, req.file.mimetype);

            // substitui a mídia anterior do mesmo item (foto) / do vídeo
            const antigas = await dbAll(`SELECT id, r2_key FROM retiradas_checklist_midias WHERE checklist_id = ? AND tipo = ? AND item = ?`,
                [ctx.row.id, ehVideo ? 'video' : 'foto', ehVideo ? 'video' : item]);
            const ins = await dbRun(`INSERT INTO retiradas_checklist_midias (checklist_id, tipo, item, r2_key, content_type) VALUES (?, ?, ?, ?, ?)`,
                [ctx.row.id, ehVideo ? 'video' : 'foto', ehVideo ? 'video' : item, r2Key, req.file.mimetype]);
            for (const a of antigas) {
                try { await r2.deleteFromR2(a.r2_key); } catch (e2) { /* segue */ }
                await dbRun('DELETE FROM retiradas_checklist_midias WHERE id = ?', [a.id]);
            }
            await dbRun('UPDATE retiradas_checklist SET atualizado_em = CURRENT_TIMESTAMP WHERE id = ?', [ctx.row.id]);
            res.json({ ok: true, midia: { id: ins.lastID, tipo: ehVideo ? 'video' : 'foto', item: ehVideo ? 'video' : item } });
        } catch (e) {
            console.error('[APP-RETIRADAS] POST midia:', e);
            if (e && e.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: `Arquivo acima de ${MAX_VIDEO_MB} MB.` });
            res.status(500).json({ error: 'Erro ao enviar arquivo: ' + e.message });
        }
    });
    // multer: erro de tamanho cai aqui antes do handler
    app.use('/api/app/retiradas', (err, req, res, next) => {
        if (err && err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: `Arquivo acima de ${MAX_VIDEO_MB} MB.` });
        next(err);
    });

    // ── DELETE mídia (antes de concluir): apaga do R2 e depois do banco ────────
    app.delete('/api/app/retiradas/midia/:id', guard, async (req, res) => {
        try {
            const m = await dbGet(`SELECT m.id, m.r2_key, c.concluido_em FROM retiradas_checklist_midias m JOIN retiradas_checklist c ON c.id = m.checklist_id WHERE m.id = ?`, [req.params.id]);
            if (!m) return res.status(404).json({ error: 'Arquivo não encontrado.' });
            if (m.concluido_em) return res.status(409).json({ error: 'Esta conferência já foi concluída.' });
            if (m.r2_key && r2 && r2.isReady()) { try { await r2.deleteFromR2(m.r2_key); } catch (e2) { /* segue */ } }
            await dbRun('DELETE FROM retiradas_checklist_midias WHERE id = ?', [m.id]);
            res.json({ ok: true });
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    // ── GET mídia (stream privado do R2; aceita ?token= para <img>/<video>) ────
    app.get('/api/app/retiradas/midia/:id', guard, async (req, res) => {
        try {
            const m = await dbGet('SELECT r2_key, content_type FROM retiradas_checklist_midias WHERE id = ?', [req.params.id]);
            if (!m || !m.r2_key) return res.status(404).end();
            if (!r2 || !r2.isReady()) return res.status(503).end();
            const range = req.headers.range || null;
            const f = await r2.downloadStreamFromR2(m.r2_key, range);
            res.setHeader('Content-Type', m.content_type || f.contentType || 'application/octet-stream');
            res.setHeader('Cache-Control', 'private, max-age=3600');
            res.setHeader('Accept-Ranges', 'bytes');
            if (range && f.contentRange) {
                res.status(206);
                res.setHeader('Content-Range', f.contentRange);
            }
            if (f.contentLength != null) res.setHeader('Content-Length', f.contentLength);
            f.stream.on('error', () => { try { res.end(); } catch (e2) { /* ignora */ } });
            f.stream.pipe(res);
        } catch (e) {
            console.error('[APP-RETIRADAS] GET midia:', e.message);
            if (!res.headersSent) res.status(404).end(); else try { res.end(); } catch (e2) { /* ignora */ }
        }
    });

    // ── POST concluir conferência de uma unidade ────────────────────────────────
    app.post('/api/app/retiradas/os/:id/unidades/:key/concluir', guard, async (req, res) => {
        try {
            const ctx = await contextoUnidade(parseInt(req.params.id, 10), req.params.key);
            if (ctx.erro) return res.status(ctx.status).json({ error: ctx.erro });
            if (ctx.row.concluido_em) return res.status(409).json({ error: 'Esta conferência já foi concluída.' });
            const estado = estadoDoRow(ctx.row);
            const fotos = new Set((await dbAll(`SELECT item FROM retiradas_checklist_midias WHERE checklist_id = ? AND tipo = 'foto'`, [ctx.row.id])).map(r => r.item));
            const semMarca = [], semFoto = [], semObs = [];
            let avaria = false;
            MODELOS[ctx.unit.modelo].itens.forEach(it => {
                const e = estado[it.id];
                if (!e || !(e.ok || e.nao)) { semMarca.push(it.texto); return; }
                if (e.nao) { avaria = true; if (!String(e.obs || '').trim()) semObs.push(it.texto); }
                if (!fotos.has(it.id)) semFoto.push(it.texto);
            });
            const lista = a => a.slice(0, 4).join(', ') + (a.length > 4 ? ` e mais ${a.length - 4}` : '');
            if (semMarca.length) return res.status(400).json({ error: `Faltam marcar 👍 ou 👎: ${lista(semMarca)}.` });
            if (semFoto.length) return res.status(400).json({ error: `Falta a foto de: ${lista(semFoto)}.` });
            if (semObs.length) return res.status(400).json({ error: `Descreva a avaria (observação) em: ${lista(semObs)}.` });

            const lider = await liderDoReq(req);
            await dbRun(`UPDATE retiradas_checklist SET concluido_em = CURRENT_TIMESTAMP, atualizado_em = CURRENT_TIMESTAMP, tem_avaria = ?,
                lider_id = ?, lider_nome = ?, lider_colab_id = ?, veiculo = COALESCE(?, veiculo), motorista = COALESCE(?, motorista) WHERE id = ?`,
                [avaria ? 1 : 0, lider.id, lider.nome, lider.colabId, ctx.rota.veiculo || null, ctx.rota.motorista || null, ctx.row.id]);
            res.json({ ok: true, tem_avaria: avaria });
        } catch (e) {
            console.error('[APP-RETIRADAS] POST concluir:', e);
            res.status(500).json({ error: e.message });
        }
    });

    // ── POST reabrir (somente Diretoria/Administrador) ──────────────────────────
    app.post('/api/app/retiradas/os/:id/unidades/:key/reabrir', authenticateToken, async (req, res) => {
        try {
            if (!isTopAdmin(req.user)) return res.status(403).json({ error: 'Apenas Diretoria/Administrador pode reabrir.' });
            const r = await dbRun(`UPDATE retiradas_checklist SET concluido_em = NULL, tem_avaria = 0, lider_id = NULL, lider_nome = NULL, lider_colab_id = NULL,
                atualizado_em = CURRENT_TIMESTAMP WHERE os_id = ? AND unit_key = ?`, [parseInt(req.params.id, 10), req.params.key]);
            res.json({ ok: true, changes: r.changes });
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    console.log('[APP-RETIRADAS] Rotas registradas (/api/app/retiradas).');
};
