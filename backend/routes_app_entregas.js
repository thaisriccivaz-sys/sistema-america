// ═══════════════════════════════════════════════════════════════════════════════
// ROTAS: APP › LIDERANÇA › ENTREGAS  (uso operacional, mobile-first)
// Arquivo: backend/routes_app_entregas.js
// Registro no server.js:
//   require('./routes_app_entregas')(app, db, authenticateToken, r2);
//
// - Lista as entregas do pipeline (os_logistica) por data (agenda) com filtros
// - Cada equipamento entregue (1 por unidade da OS) tem um checklist por modelo
//   (👍 OK / 👎 avariado, observação, FOTO obrigatória por item, vídeo opcional)
// - Motorista + veículo vêm do Resumo de Rota do dia (logistica_resumo_rota)
// - Pendência vale para TODOS os líderes liberados no Controle de Acesso (sem regra de turno)
// - Arquivos: Cloudflare R2 (nunca disco local) — streaming privado via /midia/:id
// ═══════════════════════════════════════════════════════════════════════════════
"use strict";

const multer = require('multer');
const crypto = require('crypto');
const escalaUtil = require('./utils/lideranca_escala');

module.exports = function registerAppEntregasRoutes(app, db, authenticateToken, r2) {

    const PAGE_ID = 'app-lideranca-entregas';
    const ORIGEM = 'entrega';
    const ORIGEM_TXT = 'entrega';
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
        ELX: { nome: 'Banheiro ELX', icone: 'ph-toilet', itens: BASE_LX.concat(['Pia/lavatório', 'Torneira', 'Saboneteira', 'Papeleira']) },
        GUARITA: { nome: 'Guarita', icone: 'ph-house-line', itens: ['Porta', 'Lateral', 'Teto', 'Pintura', 'Fechadura', 'Chave', 'Vidros/janelas', 'Piso', 'Soquete', 'Interruptor', 'Balcão'] },
        MICTORIO: { nome: 'Mictório', icone: 'ph-drop', itens: ['Tampinhas', 'Parte de cima', 'Parte de baixo'] },
        PIA: { nome: 'Pia PBII e PBIII', icone: 'ph-drop-half', itens: ['Torneiras', 'Saboneteira', 'Papeleira', 'Reservatório de água limpa', 'Reservatório de água suja', 'Bomba', 'Chicotes'] },
        HIDRAULICO: { nome: 'Hidráulico', icone: 'ph-toilet', itens: ['Porta', 'Dobradiça', 'Cabo de aço porta', 'Laterais', 'Teto', 'Fechadura', 'Telas', 'Assento sanitário', 'Placa/adesivo', 'Piso', 'Vaso sanitário', 'Caixa de descarga', 'Tubo para descarga', 'Pia/lavatório', 'Torneira', 'Chicotes', 'Saboneteira', 'Papeleira'] },
        CHUVEIRO: { nome: 'Chuveiro', icone: 'ph-shower', itens: ['Porta', 'Dobradiça', 'Cabo de aço porta', 'Laterais', 'Teto', 'Fechadura', 'Telas', 'Placa/adesivo', 'Piso', 'Encanamentos', 'Ralo', 'Chuveiro'] },
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

    // Uma "unidade" por equipamento entregue (OS com 3 STD → 3 checklists independentes)
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

    // ── Migrações (garante colunas unit_key / checklist_id mesmo em banco legado) ──
    let _schemaReadyPromise = null;
    function ensureSchemaReady() {
        if (_schemaReadyPromise) return _schemaReadyPromise;
        _schemaReadyPromise = (async () => {
            try {
                await dbRun(`CREATE TABLE IF NOT EXISTS configuracoes_sistema (chave TEXT PRIMARY KEY, valor TEXT)`);
                await dbRun(`INSERT OR IGNORE INTO configuracoes_sistema (chave, valor) VALUES ('entregas_inicio_controle', '${INICIO_CONTROLE_PADRAO}')`);

                const colsCk = await dbAll(`PRAGMA table_info(entregas_checklist)`);
                const colNamesCk = new Set(colsCk.map(c => c.name));
                const legacyUnidadeKeyNotNull = colsCk.some(c => c.name === 'unidade_key' && c.notnull);

                if (colsCk.length > 0 && (!colNamesCk.has('unit_key') || legacyUnidadeKeyNotNull)) {
                    await dbRun(`DROP TABLE IF EXISTS entregas_checklist_v1_bak`);
                    await dbRun(`ALTER TABLE entregas_checklist RENAME TO entregas_checklist_v1_bak`);
                }

                await dbRun(`CREATE TABLE IF NOT EXISTS entregas_checklist (
                    id             INTEGER PRIMARY KEY AUTOINCREMENT,
                    os_id          INTEGER NOT NULL,
                    unit_key       TEXT NOT NULL,
                    numero_os      TEXT,
                    data_entrega  TEXT,
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

                const bakExists = await dbGet(`SELECT name FROM sqlite_master WHERE type='table' AND name='entregas_checklist_v1_bak'`);
                if (bakExists) {
                    const bakCols = new Set((await dbAll(`PRAGMA table_info(entregas_checklist_v1_bak)`)).map(c => c.name));
                    const exprUnitKey = bakCols.has('unit_key') ? 'COALESCE(unit_key, unidade_key)' : (bakCols.has('unidade_key') ? 'unidade_key' : "'1-1'");
                    const exprItens = bakCols.has('itens_json') ? 'COALESCE(itens_json, checklist_json, "{}")' : (bakCols.has('checklist_json') ? 'COALESCE(checklist_json, "{}")' : "'{}'");
                    const exprIdx = bakCols.has('unidade_idx') ? 'unidade_idx' : (bakCols.has('indice') ? 'indice' : '1');
                    const exprTot = bakCols.has('unidade_total') ? 'unidade_total' : (bakCols.has('total_modelo') ? 'total_modelo' : '1');
                    const exprLidId = bakCols.has('lider_id') ? 'lider_id' : (bakCols.has('conferido_por_id') ? 'conferido_por_id' : 'NULL');
                    const exprLidNome = bakCols.has('lider_nome') ? 'lider_nome' : (bakCols.has('conferido_por_nome') ? 'conferido_por_nome' : 'NULL');
                    const exprConcl = bakCols.has('concluido_em') ? 'concluido_em' : (bakCols.has('conferido_em') ? 'conferido_em' : 'NULL');
                    try {
                        await dbRun(`INSERT OR IGNORE INTO entregas_checklist
                            (id, os_id, unit_key, modelo, unidade_idx, unidade_total, itens_json, tem_avaria, veiculo, motorista, lider_id, lider_nome, atualizado_em, concluido_em)
                            SELECT id, os_id, ${exprUnitKey}, modelo, ${exprIdx}, ${exprTot}, ${exprItens}, COALESCE(tem_avaria, 0), veiculo, motorista, ${exprLidId}, ${exprLidNome}, COALESCE(atualizado_em, CURRENT_TIMESTAMP), ${exprConcl}
                            FROM entregas_checklist_v1_bak WHERE os_id IS NOT NULL AND ${exprUnitKey} IS NOT NULL`);
                    } catch (eMig) {
                        console.warn('[APP-ENTREGAS] Aviso ao migrar entregas_checklist_v1_bak:', eMig.message);
                    }
                    await dbRun(`DROP TABLE IF EXISTS entregas_checklist_v1_bak`);
                } else if (colsCk.length > 0) {
                    const addCols = [
                        ['numero_os', 'TEXT'], ['data_entrega', 'TEXT'], ['modelo', 'TEXT'],
                        ['unidade_idx', 'INTEGER'], ['unidade_total', 'INTEGER'], ['itens_json', 'TEXT'],
                        ['tem_avaria', 'INTEGER DEFAULT 0'], ['veiculo', 'TEXT'], ['motorista', 'TEXT'],
                        ['lider_id', 'INTEGER'], ['lider_nome', 'TEXT'], ['lider_colab_id', 'INTEGER'],
                        ['iniciado_em', 'DATETIME'], ['atualizado_em', 'DATETIME'], ['concluido_em', 'DATETIME']
                    ];
                    for (const [cn, ct] of addCols) {
                        if (!colNamesCk.has(cn)) {
                            try { await dbRun(`ALTER TABLE entregas_checklist ADD COLUMN ${cn} ${ct}`); } catch (_) {}
                        }
                    }
                }

                const colsMid = await dbAll(`PRAGMA table_info(entregas_checklist_midias)`);
                const colNamesMid = new Set(colsMid.map(c => c.name));
                const legacyMidNotNull = colsMid.some(c => (c.name === 'os_id' || c.name === 'unidade_key') && c.notnull);

                if (colsMid.length > 0 && (!colNamesMid.has('checklist_id') || legacyMidNotNull)) {
                    await dbRun(`DROP TABLE IF EXISTS entregas_checklist_midias_v1_bak`);
                    await dbRun(`ALTER TABLE entregas_checklist_midias RENAME TO entregas_checklist_midias_v1_bak`);
                    await dbRun(`DROP TABLE IF EXISTS entregas_checklist_midias_v1_bak`);
                }

                await dbRun(`CREATE TABLE IF NOT EXISTS entregas_checklist_midias (
                    id           INTEGER PRIMARY KEY AUTOINCREMENT,
                    checklist_id INTEGER NOT NULL,
                    tipo         TEXT NOT NULL,
                    item         TEXT,
                    r2_key       TEXT,
                    content_type TEXT,
                    criado_em    DATETIME DEFAULT CURRENT_TIMESTAMP
                )`);

                await dbRun(`CREATE INDEX IF NOT EXISTS idx_ent_ck_data ON entregas_checklist (data_entrega)`);
                await dbRun(`CREATE INDEX IF NOT EXISTS idx_ent_mid_ck ON entregas_checklist_midias (checklist_id)`);
            } catch (e) {
                console.error('[APP-ENTREGAS] Erro na migração de schema:', e.message);
            }
        })();
        return _schemaReadyPromise;
    }
    ensureSchemaReady();

    // ── Permissão (Controle de Acesso → página 'app-lideranca-entregas') ──────
    function isTopAdmin(u) {
        return !!u && (u.role === 'Diretoria' || u.role === 'Administrador' || u.departamento === 'Diretoria'
            || (u.grupo_nome && String(u.grupo_nome).toLowerCase() === 'diretoria'));
    }
    async function requireApp(req, res, next) {
        try {
            await ensureSchemaReady();
            if (isTopAdmin(req.user)) return next();
            const gid = req.user && req.user.grupo_permissao_id;
            if (!gid) return res.status(403).json({ error: 'Sem permissão para acessar Entregas.' });
            const row = await dbGet('SELECT visualizar FROM permissoes_grupo WHERE grupo_id = ? AND pagina_id = ?', [gid, PAGE_ID]);
            const v = row && row.visualizar;
            if (v === 1 || v === '1' || v === true || v === 'true') return next();
            return res.status(403).json({ error: 'Sem permissão para acessar Entregas.' });
        } catch (e) { return res.status(500).json({ error: e.message }); }
    }
    const guard = [authenticateToken, requireApp];

    async function inicioControle() {
        const r = await dbGet(`SELECT valor FROM configuracoes_sistema WHERE chave = 'entregas_inicio_controle'`);
        return (r && isoDate(r.valor)) || INICIO_CONTROLE_PADRAO;
    }

    // Líder que está conferindo (nome do colaborador + colaborador_id para a foto)
    async function liderDoReq(req) {
        return escalaUtil.resolverLiderDoReq(db, req);
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
                if (!/ENTREGA/.test(tipo)) return;
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

    // ── Montagem de uma entrega (OS) com situação por unidade ─────────────────
    function estadoDoRow(row) { return row ? parseJson(row.itens_json, {}) : {}; }
    function resumoUnidade(u, row, fotosItem, resolverColab) {
        const itens = MODELOS[u.modelo].itens;
        const estado = estadoDoRow(row);
        const feitos = itens.filter(i => { const e = estado[i.id]; return e && (e.ok || e.nao) && fotosItem.has(i.id); }).length;
        const concluido = !!(row && row.concluido_em);
        const avaria = concluido && !!row.tem_avaria;
        const resolved = (concluido && resolverColab && (row.lider_id || row.lider_nome || row.lider_colab_id))
            ? resolverColab({ usuario_id: row.lider_id, colab_id: row.lider_colab_id, nome: row.lider_nome })
            : null;
        return {
            key: u.key, modelo: u.modelo, modelo_nome: MODELOS[u.modelo].nome, icone: MODELOS[u.modelo].icone,
            rotulo: u.rotulo, produto: u.produto, indice: u.indice, total: u.total,
            itens_total: itens.length, itens_feitos: feitos,
            status: concluido ? (avaria ? 'avaria' : 'ok') : (feitos > 0 ? 'andamento' : 'pendente'),
            concluido, tem_avaria: avaria,
            lider_nome: concluido ? ((resolved && resolved.nome) || row.lider_nome) : null,
            lider_colab_id: concluido ? ((resolved && resolved.colab_id) || row.lider_colab_id) : null,
            lider_foto_url: concluido ? ((resolved && resolved.foto_url) || (row.lider_colab_id ? `/api/colaboradores/foto/${row.lider_colab_id}` : null)) : null,
            concluido_em: concluido ? row.concluido_em : null
        };
    }
    function resumoOS(os, units, rows, fotosPorCk, rota, hoje, inicio, escalaDia, resolverColab) {
        const unidades = units.map(u => {
            const row = rows[`${os.id}|${u.key}`];
            return resumoUnidade(u, row, row ? (fotosPorCk[row.id] || new Set()) : new Set(), resolverColab);
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
        const ehNoturno = (rota && rota.turno === 'Noite') || /noturn|noite/i.test(norm((os.turno || '') + ' ' + ((rota && rota.resumo) || '')));
        const turnoEscala = ehNoturno ? 'noturno' : 'diurno';
        const respTurno = escalaDia ? (turnoEscala === 'noturno' ? escalaDia.noturno : escalaDia.diurno) : null;

        const realizadoresMap = new Map();
        unidades.forEach(u => {
            if (u.concluido && u.lider_nome) {
                const k = norm(u.lider_nome).toLowerCase();
                if (!realizadoresMap.has(k)) {
                    realizadoresMap.set(k, {
                        nome: u.lider_nome,
                        colab_id: u.lider_colab_id || null,
                        foto_url: u.lider_foto_url || (u.lider_colab_id ? `/api/colaboradores/foto/${u.lider_colab_id}` : null),
                        concluido_em: u.concluido_em || null
                    });
                }
            }
        });

        return {
            os_id: os.id, numero_os: os.numero_os, cliente: os.cliente, endereco: os.endereco, complemento: os.complemento || '',
            contrato: os.contrato || '', data_entrega: data, tipo_servico: os.tipo_servico,
            hora_inicio: os.hora_inicio || '', hora_fim: os.hora_fim || '', turno_os: os.turno || '',
            turno_escala: turnoEscala,
            responsavel_escala: respTurno ? {
                turno: turnoEscala,
                nomes: respTurno.nomes,
                escalados: respTurno.escalados,
                folga: respTurno.folga
            } : null,
            realizado_por: [...realizadoresMap.values()],
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
            const rs = await dbAll(`SELECT * FROM entregas_checklist WHERE os_id IN (${ph})`, lote);
            rs.forEach(r => { rows[`${r.os_id}|${r.unit_key}`] = r; });
        }
        const ckIds = Object.values(rows).map(r => r.id);
        for (const lote of chunk(ckIds, 400)) {
            const ph = lote.map(() => '?').join(',');
            const ms = await dbAll(`SELECT checklist_id, item FROM entregas_checklist_midias WHERE tipo = 'foto' AND checklist_id IN (${ph})`, lote);
            ms.forEach(m => { (fotosPorCk[m.checklist_id] = fotosPorCk[m.checklist_id] || new Set()).add(m.item); });
        }
        return { rows, fotosPorCk };
    }

    // ── GET lista (agenda + filtros no front) ───────────────────────────────────
    // ?de=YYYY-MM-DD&ate=YYYY-MM-DD   (entregas do intervalo + TODAS as pendentes desde o início do controle)
    app.get('/api/app/entregas', guard, async (req, res) => {
        try {
            const hoje = hojeSP();
            const inicio = await inicioControle();
            const de = isoDate(req.query.de) || somaDias(hoje, -7);
            const ate = isoDate(req.query.ate) || somaDias(hoje, 14);
            const q = String(req.query.q || '').replace(/[^\w-]/g, '').slice(0, 20); // pesquisa por nº da OS (em qualquer data)
            const uid = req.user && req.user.id;
            const lideresBase = await escalaUtil.carregarLideresBase(db);
            const resolverColab = await escalaUtil.criarResolvedorColaborador(db);

            const oss = (await dbAll(`SELECT id, numero_os, cliente, endereco, complemento, contrato, data_os, tipo_servico, produtos, hora_inicio, hora_fim, turno
                FROM os_logistica
                WHERE status = 'ativo' AND LOWER(tipo_servico) LIKE '%entrega%' AND data_os IS NOT NULL AND data_os != ''
                  AND ((data_os >= ? AND data_os <= ?) OR (data_os >= ? AND data_os <= ?)${q ? ' OR CAST(numero_os AS TEXT) LIKE ?' : ''})
                ORDER BY data_os ASC, cliente ASC, CAST(numero_os AS REAL) ASC`, q ? [de, ate, inicio, hoje, '%' + q + '%'] : [de, ate, inicio, hoje]))
                .filter(os => !soVisitaTecnica(os));
            const { rows, fotosPorCk } = await carregarRowsEFotos(oss.map(o => o.id));
            const datas = [...new Set(oss.map(o => isoDate(o.data_os)).filter(Boolean))];
            const rotas = {};
            const escalaPorDia = {};
            const obterEscala = dIso => {
                if (!escalaPorDia[dIso]) {
                    escalaPorDia[dIso] = escalaUtil.calcularEscalaEmData(lideresBase, dIso, uid);
                }
                return escalaPorDia[dIso];
            };
            for (let delta = -15; delta <= 21; delta++) {
                obterEscala(somaDias(hoje, delta));
            }
            for (const d of datas) {
                rotas[d] = await mapaRotaDoDia(d);
                obterEscala(d);
            }
            const itens = oss.map(os => {
                const data = isoDate(os.data_os);
                const rota = (rotas[data] || {})[String(os.numero_os || '').trim()] || null;
                return resumoOS(os, unidadesDaOS(os), rows, fotosPorCk, rota, hoje, inicio, obterEscala(data), resolverColab);
            });
            const escHoje = obterEscala(hoje);
            res.json({
                hoje,
                inicio_controle: inicio,
                de,
                ate,
                turno_usuario: escHoje ? escHoje.turno_usuario : null,
                escala_hoje: escHoje,
                escala_por_dia: escalaPorDia,
                itens
            });
        } catch (e) {
            console.error('[APP-ENTREGAS] GET lista:', e);
            res.status(500).json({ error: 'Erro ao carregar entregas: ' + e.message });
        }
    });

    // ── Detalhe de uma entrega (OS) com itens, estado e mídias ────────────────
    async function detalheOS(osId, uidLogado) {
        const os = await dbGet(`SELECT id, numero_os, cliente, endereco, complemento, contrato, data_os, tipo_servico, produtos, hora_inicio, hora_fim, turno, observacoes
            FROM os_logistica WHERE id = ? AND status = 'ativo'`, [osId]);
        if (!os) return null;
        const hoje = hojeSP(); const inicio = await inicioControle();
        const data = isoDate(os.data_os);
        const rota = ((await mapaRotaDoDia(data))[String(os.numero_os || '').trim()]) || null;
        const units = unidadesDaOS(os);
        const { rows, fotosPorCk } = await carregarRowsEFotos([os.id]);
        const resolverColab = await escalaUtil.criarResolvedorColaborador(db);
        const escalaDia = data ? await escalaUtil.obterEscalaLideresNoDia(db, data, uidLogado) : null;
        const base = resumoOS(os, units, rows, fotosPorCk, rota, hoje, inicio, escalaDia, resolverColab);
        const midiasPorCk = {};
        const ckIds = Object.values(rows).map(r => r.id);
        if (ckIds.length) {
            const ms = await dbAll(`SELECT id, checklist_id, tipo, item FROM entregas_checklist_midias WHERE checklist_id IN (${ckIds.map(() => '?').join(',')}) ORDER BY id ASC`, ckIds);
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
    app.get('/api/app/entregas/os/:id', guard, async (req, res) => {
        try {
            const d = await detalheOS(parseInt(req.params.id, 10), req.user && req.user.id);
            if (!d) return res.status(404).json({ error: 'Entrega não encontrada.' });
            res.json(d);
        } catch (e) {
            console.error('[APP-ENTREGAS] GET detalhe:', e);
            res.status(500).json({ error: e.message });
        }
    });

    // Localiza OS + unidade e garante a linha do checklist
    async function contextoUnidade(osId, key) {
        const os = await dbGet(`SELECT id, numero_os, data_os, tipo_servico, produtos FROM os_logistica WHERE id = ? AND status = 'ativo'`, [osId]);
        if (!os) return { erro: 'Entrega não encontrada.', status: 404 };
        const unit = unidadesDaOS(os).find(u => u.key === key);
        if (!unit) return { erro: 'Equipamento não encontrado nesta entrega.', status: 404 };
        const data = isoDate(os.data_os);
        const rota = ((await mapaRotaDoDia(data))[String(os.numero_os || '').trim()]) || {};
        let row = await dbGet('SELECT * FROM entregas_checklist WHERE os_id = ? AND unit_key = ?', [os.id, unit.key]);
        if (!row) {
            await dbRun(`INSERT OR IGNORE INTO entregas_checklist (os_id, unit_key, numero_os, data_entrega, modelo, unidade_idx, unidade_total, itens_json, veiculo, motorista)
                VALUES (?, ?, ?, ?, ?, ?, ?, '{}', ?, ?)`,
                [os.id, unit.key, String(os.numero_os || ''), data, unit.modelo, unit.indice, unit.total, rota.veiculo || null, rota.motorista || null]);
            row = await dbGet('SELECT * FROM entregas_checklist WHERE os_id = ? AND unit_key = ?', [os.id, unit.key]);
        }
        return { os, unit, row, data, rota };
    }

    // ── PUT rascunho do checklist (a cada toque) ────────────────────────────────
    app.put('/api/app/entregas/os/:id/unidades/:key/checklist', guard, async (req, res) => {
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
            await dbRun(`UPDATE entregas_checklist SET itens_json = ?, atualizado_em = CURRENT_TIMESTAMP,
                veiculo = COALESCE(?, veiculo), motorista = COALESCE(?, motorista) WHERE id = ?`,
                [JSON.stringify(limpo), ctx.rota.veiculo || null, ctx.rota.motorista || null, ctx.row.id]);
            res.json({ ok: true });
        } catch (e) {
            console.error('[APP-ENTREGAS] PUT checklist:', e);
            res.status(500).json({ error: e.message });
        }
    });

    // ── POST foto (1 por item), áudio gravado ou vídeo (opcional, 1 por equipamento) → R2 ─────
    app.post('/api/app/entregas/os/:id/unidades/:key/midia', guard, uploadMem.single('arquivo'), async (req, res) => {
        try {
            if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
            const ctx = await contextoUnidade(parseInt(req.params.id, 10), req.params.key);
            if (ctx.erro) return res.status(ctx.status).json({ error: ctx.erro });
            if (ctx.row.concluido_em) return res.status(409).json({ error: 'Esta conferência já foi concluída.' });
            if (!r2 || !r2.isReady()) return res.status(503).json({ error: 'Armazenamento de arquivos (R2) não está configurado. Tente novamente mais tarde.' });

            const item = String((req.body && req.body.item) || '').trim();
            const mime = String(req.file.mimetype || '').toLowerCase();
            const ehAudio = item === 'audio';
            const ehVideo = item === 'video';
            if (ehAudio) {
                if (!/^(audio|video)\/|octet-stream/.test(mime)) return res.status(400).json({ error: 'O arquivo precisa ser um áudio gravado.' });
            } else if (ehVideo) {
                if (!/^video\//.test(mime)) return res.status(400).json({ error: 'O arquivo precisa ser um vídeo.' });
            } else {
                if (!/^image\//.test(mime)) return res.status(400).json({ error: 'O arquivo precisa ser uma foto.' });
                if (!MODELOS[ctx.unit.modelo].itens.some(i => i.id === item)) return res.status(400).json({ error: 'Item inválido para este equipamento.' });
                if (req.file.size > 15 * 1024 * 1024) return res.status(413).json({ error: 'Foto muito grande (máx. 15 MB).' });
            }
            const ext = ehAudio
                ? (/mp4|m4a|aac/.test(mime) ? 'm4a' : (/ogg/.test(mime) ? 'ogg' : 'webm'))
                : (ehVideo ? (/quicktime/.test(mime) ? 'mov' : (/webm/.test(mime) ? 'webm' : 'mp4')) : (/png/.test(mime) ? 'png' : (/webp/.test(mime) ? 'webp' : 'jpg')));
            const tipoMidia = ehAudio ? 'audio' : (ehVideo ? 'video' : 'foto');
            const itemMidia = ehAudio ? 'audio' : (ehVideo ? 'video' : item);
            const [y, m, d] = (ctx.data || hojeSP()).split('-');
            const hash = crypto.randomBytes(4).toString('hex');
            const r2Key = `entregas-checklist/${y}/${m}/${d}/OS${String(ctx.os.numero_os || ctx.os.id).replace(/[^\w-]/g, '')}_${ctx.unit.modelo}${ctx.unit.indice}_${itemMidia}_${Date.now()}_${hash}.${ext}`;
            await r2.uploadToR2(r2Key, req.file.buffer, req.file.mimetype || (ehAudio ? 'audio/webm' : 'image/jpeg'));

            // substitui o registro anterior do mesmo item no banco (mantendo arquivo no R2 conforme regra global)
            const antigas = await dbAll(`SELECT id FROM entregas_checklist_midias WHERE checklist_id = ? AND tipo IN (?, 'video', 'audio') AND item IN (?, 'video', 'audio')`,
                [ctx.row.id, tipoMidia, itemMidia]);
            const ins = await dbRun(`INSERT INTO entregas_checklist_midias (checklist_id, tipo, item, r2_key, content_type) VALUES (?, ?, ?, ?, ?)`,
                [ctx.row.id, tipoMidia, itemMidia, r2Key, req.file.mimetype || (ehAudio ? 'audio/webm' : 'image/jpeg')]);
            for (const a of antigas) {
                if (ehAudio || ehVideo || a.id) {
                    if ((ehAudio || ehVideo) || itemMidia === item) {
                        await dbRun('DELETE FROM entregas_checklist_midias WHERE id = ?', [a.id]);
                    }
                }
            }
            await dbRun('UPDATE entregas_checklist SET atualizado_em = CURRENT_TIMESTAMP WHERE id = ?', [ctx.row.id]);
            res.json({ ok: true, midia: { id: ins.lastID, tipo: tipoMidia, item: itemMidia } });
        } catch (e) {
            console.error('[APP-ENTREGAS] POST midia:', e);
            if (e && e.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: `Arquivo acima de ${MAX_VIDEO_MB} MB.` });
            res.status(500).json({ error: 'Erro ao enviar arquivo: ' + e.message });
        }
    });
    // multer: erro de tamanho cai aqui antes do handler
    app.use('/api/app/entregas', (err, req, res, next) => {
        if (err && err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: `Arquivo acima de ${MAX_VIDEO_MB} MB.` });
        next(err);
    });

    // ── DELETE mídia (antes de concluir): remove registro do banco (mantém no R2) ──
    app.delete('/api/app/entregas/midia/:id', guard, async (req, res) => {
        try {
            const m = await dbGet(`SELECT m.id, m.r2_key, c.concluido_em FROM entregas_checklist_midias m JOIN entregas_checklist c ON c.id = m.checklist_id WHERE m.id = ?`, [req.params.id]);
            if (!m) return res.status(404).json({ error: 'Arquivo não encontrado.' });
            if (m.concluido_em) return res.status(409).json({ error: 'Esta conferência já foi concluída.' });
            await dbRun('DELETE FROM entregas_checklist_midias WHERE id = ?', [m.id]);
            res.json({ ok: true });
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    // ── GET mídia (stream privado do R2; aceita ?token= para <img>/<video>) ────
    app.get('/api/app/entregas/midia/:id', guard, async (req, res) => {
        try {
            const m = await dbGet('SELECT r2_key, content_type FROM entregas_checklist_midias WHERE id = ?', [req.params.id]);
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
            console.error('[APP-ENTREGAS] GET midia:', e.message);
            if (!res.headersSent) res.status(404).end(); else try { res.end(); } catch (e2) { /* ignora */ }
        }
    });


    // ── Notificação de avaria (Notificações → quadro "Avaria de equipamento"): popup + e-mail ──
    async function notificarAvaria(ctx, estado, lider) {
        const os = await dbGet('SELECT cliente FROM os_logistica WHERE id = ?', [ctx.os.id]);
        const cliente = String((os && os.cliente) || '').replace(/^[^\p{L}\p{N}]+/u, '').trim() || '-'; // sem emoji (e-mail externo ao sistema)
        const modelo = MODELOS[ctx.unit.modelo];
        const equipamento = modelo.nome + (ctx.unit.total > 1 ? ` ${ctx.unit.indice}/${ctx.unit.total}` : '');
        const itensAv = modelo.itens.filter(it => estado[it.id] && estado[it.id].nao).map(it => ({ item: it.texto, obs: String(estado[it.id].obs || '').trim() }));
        const dataBr = (ctx.data || '').split('-').reverse().join('/');
        const dados = {
            origem: ORIGEM, os_id: ctx.os.id, numero_os: String(ctx.os.numero_os || ''), cliente, equipamento,
            motorista: ctx.rota.motorista || '', veiculo: ctx.rota.veiculo || '', data: dataBr, lider: lider.nome, itens: itensAv
        };
        const msg = `Avaria em ${equipamento} — OS ${dados.numero_os} (${cliente}): ${itensAv.map(i => i.item).join(', ')}`;
        const dest = await dbAll("SELECT usuario_id FROM config_notificacoes WHERE tipo = 'avaria_equipamento'");
        for (const d of dest) {
            try { await dbRun('INSERT INTO notificacoes_usuarios (usuario_id, tipo, mensagem, dados) VALUES (?, ?, ?, ?)', [d.usuario_id, 'avaria_equipamento', msg, JSON.stringify(dados)]); } catch (e) { console.error('[APP-ENTREGAS] popup avaria:', e.message); }
        }
        const sendMail = app.locals && app.locals.sendEmailParaNotificados;
        if (typeof sendMail !== 'function') return;
        const e = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const td = 'padding:8px 12px;border:1px solid #fecaca;';
        const linhas = itensAv.map(i => `<tr><td style="${td}font-weight:bold;color:#dc2626;">${e(i.item)}</td><td style="${td}">${e(i.obs || '—')}</td></tr>`).join('');
        const html = '<div style="font-family:Arial,sans-serif;color:#333;line-height:1.6;max-width:640px;margin:0 auto;border:1px solid #eee;border-radius:10px;overflow:hidden;">'
            + '<div style="text-align:center;padding:20px 20px 10px;"><img src="cid:empresa-logo" style="max-height:80px;"></div>'
            + '<div style="padding:20px 24px;"><h2 style="color:#dc2626;border-bottom:2px solid #ef4444;padding-bottom:10px;margin-top:0;">⚠️ Avaria registrada na ' + ORIGEM_TXT + '</h2>'
            + `<table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:16px;">
                <tr><td style="${td}background:#fef2f2;font-weight:bold;width:34%;">Cliente</td><td style="${td}">${e(cliente)}</td></tr>
                <tr><td style="${td}background:#fef2f2;font-weight:bold;">Número da OS</td><td style="${td}">${e(dados.numero_os)}</td></tr>
                <tr><td style="${td}background:#fef2f2;font-weight:bold;">Motorista</td><td style="${td}">${e(dados.motorista || 'Não definido')}</td></tr>
                <tr><td style="${td}background:#fef2f2;font-weight:bold;">Veículo</td><td style="${td}">${e(dados.veiculo || 'Não definido')}</td></tr>
                <tr><td style="${td}background:#fef2f2;font-weight:bold;">Data da ${ORIGEM_TXT}</td><td style="${td}">${e(dataBr)}</td></tr>
                <tr><td style="${td}background:#fef2f2;font-weight:bold;">Equipamento</td><td style="${td}">${e(equipamento)}</td></tr>
                <tr><td style="${td}background:#fef2f2;font-weight:bold;">Conferido por</td><td style="${td}">${e(lider.nome)}</td></tr>
            </table>`
            + '<h3 style="color:#b91c1c;margin:0 0 8px;">Avarias registradas</h3>'
            + `<table style="width:100%;border-collapse:collapse;font-size:14px;"><thead><tr style="background:#fee2e2;color:#991b1b;"><th style="${td}text-align:left;">Item avariado</th><th style="${td}text-align:left;">Observação</th></tr></thead><tbody>${linhas}</tbody></table>`
            + '<p style="margin-top:24px;font-size:0.9em;color:#64748b;">Atenciosamente,<br>Sistema América Rental</p></div></div>';
        await sendMail('avaria_equipamento', { subject: `⚠️ Avaria na ${ORIGEM_TXT} — OS ${dados.numero_os} — ${cliente}`, html });
    }

    // ── POST concluir conferência de uma unidade ────────────────────────────────
    app.post('/api/app/entregas/os/:id/unidades/:key/concluir', guard, async (req, res) => {
        try {
            const ctx = await contextoUnidade(parseInt(req.params.id, 10), req.params.key);
            if (ctx.erro) return res.status(ctx.status).json({ error: ctx.erro });
            if (ctx.row.concluido_em) return res.status(409).json({ error: 'Esta conferência já foi concluída.' });
            const estado = estadoDoRow(ctx.row);
            const fotos = new Set((await dbAll(`SELECT item FROM entregas_checklist_midias WHERE checklist_id = ? AND tipo = 'foto'`, [ctx.row.id])).map(r => r.item));
            const semMarca = [], semFoto = [];
            let avaria = false;
            MODELOS[ctx.unit.modelo].itens.forEach(it => {
                const e = estado[it.id];
                if (!e || !(e.ok || e.nao)) { semMarca.push(it.texto); return; }
                if (e.nao) avaria = true; // observação é opcional (positivo ou negativo)
                if (!fotos.has(it.id)) semFoto.push(it.texto);
            });
            const lista = a => a.slice(0, 4).join(', ') + (a.length > 4 ? ` e mais ${a.length - 4}` : '');
            if (semMarca.length) return res.status(400).json({ error: `Faltam marcar 👍 ou 👎: ${lista(semMarca)}.` });
            if (semFoto.length) return res.status(400).json({ error: `Falta a foto de: ${lista(semFoto)}.` });

            const lider = await liderDoReq(req);
            await dbRun(`UPDATE entregas_checklist SET concluido_em = CURRENT_TIMESTAMP, atualizado_em = CURRENT_TIMESTAMP, tem_avaria = ?,
                lider_id = ?, lider_nome = ?, lider_colab_id = ?, veiculo = COALESCE(?, veiculo), motorista = COALESCE(?, motorista) WHERE id = ?`,
                [avaria ? 1 : 0, lider.id, lider.nome, lider.colabId, ctx.rota.veiculo || null, ctx.rota.motorista || null, ctx.row.id]);
            if (avaria) { notificarAvaria(ctx, estado, lider).catch(e3 => console.error('[APP-ENTREGAS] notificar avaria:', e3.message)); }
            res.json({ ok: true, tem_avaria: avaria });
        } catch (e) {
            console.error('[APP-ENTREGAS] POST concluir:', e);
            res.status(500).json({ error: e.message });
        }
    });

    // ── POST reabrir (somente Diretoria/Administrador) ──────────────────────────
    app.post('/api/app/entregas/os/:id/unidades/:key/reabrir', authenticateToken, async (req, res) => {
        try {
            if (!isTopAdmin(req.user)) return res.status(403).json({ error: 'Apenas Diretoria/Administrador pode reabrir.' });
            const r = await dbRun(`UPDATE entregas_checklist SET concluido_em = NULL, tem_avaria = 0, lider_id = NULL, lider_nome = NULL, lider_colab_id = NULL,
                atualizado_em = CURRENT_TIMESTAMP WHERE os_id = ? AND unit_key = ?`, [parseInt(req.params.id, 10), req.params.key]);
            res.json({ ok: true, changes: r.changes });
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    console.log('[APP-ENTREGAS] Rotas registradas (/api/app/entregas).');
};
