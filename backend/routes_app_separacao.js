// ═══════════════════════════════════════════════════════════════════════════════
// ROTAS: APP › LIDERANÇA › SEPARAÇÃO NOTURNA (Equipamentos, Insumos e Sucção)
// Arquivo: backend/routes_app_separacao.js
// Registro no server.js:
//   require('./routes_app_separacao')(app, db, authenticateToken);
//
// Regras de negócio:
// 1. À noite, o líder noturno faz a separação dos equipamentos e insumos que sairão
//    na rota do dia seguinte, separado por placa de veículo.
// 2. Equipamentos exibidos com o devido ícone cadastrado no sistema:
//    💜 STD Evento, 💙 STD Obra, ⬜ Guarita Individual, ⚪ Guarita Dupla, ♿ PCD, etc.
// 3. Insumos que devem ser separados no dia anterior (Química, Papel Higiênico,
//    Papel Toalha, Sabonete Líquido) calculados por veículo.
// 4. Mostra também todos os veículos que saíram no dia (inclusive na rota noturna
//    do dia) para avisar que precisa realizar a sucção.
// 5. Todos os itens são registrados com foto (checklist simples com foto no R2).
// 6. NUNCA apagar arquivos do Cloudflare R2 (apenas remover/atualizar no SQLite).
// ═══════════════════════════════════════════════════════════════════════════════
"use strict";

const crypto = require('crypto');
const escalaUtil = require('./utils/lideranca_escala');

module.exports = function registerAppSeparacaoRoutes(app, db, authenticateToken) {

    const PAGE_ID = 'app-lideranca-separacao';
    const TZ = 'America/Sao_Paulo';

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
    const normLow = s => norm(s).toLowerCase().replace(/\s+/g, ' ');
    const slug = s => norm(s).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    const parseJson = (s, fb) => { try { const v = JSON.parse(s); return v == null ? fb : v; } catch (e) { return fb; } };
    const hojeSP = () => new Date().toLocaleDateString('en-CA', { timeZone: TZ });
    const somaDias = (iso, n) => {
        const d = new Date(iso + 'T12:00:00');
        d.setDate(d.getDate() + n);
        return d.toISOString().slice(0, 10);
    };
    const isoDate = s => {
        const str = String(s || '').trim();
        const m = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (m) return `${m[1]}-${m[2]}-${m[3]}`;
        const mBr = str.match(/^(\d{2})[-/](\d{2})[-/](\d{4})/);
        if (mBr) return `${mBr[3]}-${mBr[2]}-${mBr[1]}`;
        return null;
    };
    const fmtBR = iso => {
        const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
        return m ? `${m[3]}/${m[2]}/${m[1]}` : String(iso || '');
    };

    // ── Dicionário de Equipamentos e Ícones do Sistema ─────────────────────────
    const RR_EQ = {
        'STD O':  { nome: 'STD OBRA',              icon: '💙' },
        'STD E':  { nome: 'STD EVENTO',            icon: '💜' },
        'LX O':   { nome: 'LX OBRA',               icon: '🟦' },
        'LX E':   { nome: 'LX EVENTO',             icon: '🟪' },
        'ELX O':  { nome: 'ELX OBRA',              icon: '🔵' },
        'ELX E':  { nome: 'ELX EVENTO',            icon: '🟣' },
        'SLX O':  { nome: 'ELX OBRA',              icon: '🔵' },
        'SLX E':  { nome: 'ELX EVENTO',            icon: '🟣' },
        'PCD O':  { nome: 'PCD OBRA',              icon: '♿' },
        'PCD E':  { nome: 'PCD EVENTO',            icon: '🧑🏾‍🦽' },
        'CHUVEIRO O':  { nome: 'CHUVEIRO OBRA',    icon: '🚿' },
        'CHUVEIRO E':  { nome: 'CHUVEIRO EVENTO',  icon: '🚿' },
        'HIDRAULICO O':{ nome: 'HIDRÁULICO OBRA',  icon: '🚽' },
        'HIDRAULICO E':{ nome: 'HIDRÁULICO EVENTO',icon: '🚽' },
        'MICTORIO O':  { nome: 'MICTÓRIO OBRA',    icon: '💦' },
        'MICTORIO E':  { nome: 'MICTÓRIO EVENTO',  icon: '💦' },
        'PIA II O':    { nome: 'PBII OBRA',         icon: '🧼' },
        'PIA II E':    { nome: 'PBII EVENTO',       icon: '🧼' },
        'PIA III O':   { nome: 'PBIII OBRA',        icon: '🧼' },
        'PIA III E':   { nome: 'PBIII EVENTO',      icon: '🧼' },
        'PBII O':      { nome: 'PBII OBRA',         icon: '🧼' },
        'PBII E':      { nome: 'PBII EVENTO',       icon: '🧼' },
        'PBIII O':     { nome: 'PBIII OBRA',        icon: '🧼' },
        'PBIII E':     { nome: 'PBIII EVENTO',      icon: '🧼' },
        'PB II O':     { nome: 'PBII OBRA',         icon: '🧼' },
        'PB II E':     { nome: 'PBII EVENTO',       icon: '🧼' },
        'PB III O':    { nome: 'PBIII OBRA',        icon: '🧼' },
        'PB III E':    { nome: 'PBIII EVENTO',      icon: '🧼' },
        'GUARITA INDIVIDUAL O':      { nome: 'GUARITA INDIVIDUAL OBRA',   icon: '⬜' },
        'GUARITA INDIVIDUAL E':      { nome: 'GUARITA INDIVIDUAL EVENTO', icon: '⬜' },
        'GUARITA DUPLA O':           { nome: 'GUARITA DUPLA OBRA',        icon: '⚪' },
        'GUARITA DUPLA E':           { nome: 'GUARITA DUPLA EVENTO',      icon: '⚪' },
        'GUARITA INDIVIDUAL OBRA':   { nome: 'GUARITA INDIVIDUAL OBRA',   icon: '⬜' },
        'GUARITA INDIVIDUAL EVENTO': { nome: 'GUARITA INDIVIDUAL EVENTO', icon: '⬜' },
        'GUARITA DUPLA OBRA':        { nome: 'GUARITA DUPLA OBRA',        icon: '⚪' },
        'GUARITA DUPLA EVENTO':      { nome: 'GUARITA DUPLA EVENTO',      icon: '⚪' },
        'GUARITA OBRA':              { nome: 'GUARITA INDIVIDUAL OBRA',   icon: '⬜' },
        'GUARITA EVENTO':            { nome: 'GUARITA INDIVIDUAL EVENTO', icon: '⬜' },
        'GUARITA O':                 { nome: 'GUARITA INDIVIDUAL OBRA',   icon: '⬜' },
        'GUARITA E':                 { nome: 'GUARITA INDIVIDUAL EVENTO', icon: '⬜' },
        'LIMPA FOSSA':    { nome: 'LIMPA FOSSA',    icon: '💧' },
        'VISITA TECNICA': { nome: 'VISITA TÉCNICA', icon: '⚙️' },
        'CARRINHO':       { nome: 'CARRINHO',        icon: '🛞' },
        'STD OBRA':       { nome: 'STD OBRA',        icon: '💙' },
        'STD EVENTO':     { nome: 'STD EVENTO',      icon: '💜' },
        'LX OBRA':        { nome: 'LX OBRA',         icon: '🟦' },
        'LX EVENTO':      { nome: 'LX EVENTO',       icon: '🟪' },
        'ELX OBRA':       { nome: 'ELX OBRA',        icon: '🔵' },
        'ELX EVENTO':     { nome: 'ELX EVENTO',      icon: '🟣' },
        'PCD OBRA':       { nome: 'PCD OBRA',        icon: '♿' },
        'PCD EVENTO':     { nome: 'PCD EVENTO',      icon: '🧑🏾‍🦽' },
        'PBII OBRA':      { nome: 'PBII OBRA',       icon: '🧼' },
        'PBII EVENTO':    { nome: 'PBII EVENTO',     icon: '🧼' },
        'PBIII OBRA':     { nome: 'PBIII OBRA',      icon: '🧼' },
        'PBIII EVENTO':   { nome: 'PBIII EVENTO',    icon: '🧼' },
        'CHUVEIRO OBRA':  { nome: 'CHUVEIRO OBRA',   icon: '🚿' },
        'CHUVEIRO EVENTO':{ nome: 'CHUVEIRO EVENTO', icon: '🚿' },
        'HIDRAULICO OBRA':  { nome: 'HIDRÁULICO OBRA',   icon: '🚽' },
        'HIDRAULICO EVENTO':{ nome: 'HIDRÁULICO EVENTO', icon: '🚽' },
        'MICTORIO OBRA':  { nome: 'MICTÓRIO OBRA',   icon: '💦' },
        'MICTORIO EVENTO':{ nome: 'MICTÓRIO EVENTO', icon: '💦' },
    };

    const REGRAS_SAIDA_SEPARACAO = [
        { id: 'CARRINHO',    icon: '🛒', label: 'LEVAR CARRINHO',   regex: /🛒|LEVAR\s+CARRINHO/i },
        { id: 'EXTENSORA',   icon: '🌀', label: 'LEVAR EXTENSORA',  regex: /🌀|LEVAR\s+EXTENSORA|\bEXTENSORA\b/i },
        { id: 'SUCCAO',      icon: '💧', label: 'APOIO DE SUCÇÃO',  regex: /💧|APOIO\s+(?:DE\s+)?SUCC?[AÃ]O/i },
        { id: 'EPI',         icon: '🦺', label: 'LEVAR EPI',        regex: /🦺|LEVAR\s+EPI|\bEPI\b/i },
        { id: 'VAC',         icon: '🏗️', label: 'VAC',              regex: /🏗️|\bVAC\b/i },
        { id: 'REPAROS',     icon: '🔧', label: 'REPAROS',          regex: /🔧|\bREPAROS?\b/i },
        { id: 'DESMONTAGEM', icon: '🛠️', label: 'DESMONTAGEM',      regex: /\bDESMONTAGEM\b/i },
        { id: 'MONTAGEM',    icon: '🛠️', label: 'MONTAGEM',         regex: /🛠️|\bMONTAGEM\b/i },
    ];

    function rrEquip(codigo) {
        const original = String(codigo || '').trim().toUpperCase();
        const c = norm(original).toUpperCase();
        if (RR_EQ[c]) return RR_EQ[c];
        for (const [k, v] of Object.entries(RR_EQ)) {
            if (c.startsWith(k)) return v;
        }
        if (/GUARITA.*DUPLA/.test(c)) {
            return { nome: c.includes('EVENTO') ? 'GUARITA DUPLA EVENTO' : 'GUARITA DUPLA OBRA', icon: '⚪' };
        }
        if (/GUARITA/.test(c)) {
            return { nome: c.includes('EVENTO') ? 'GUARITA INDIVIDUAL EVENTO' : 'GUARITA INDIVIDUAL OBRA', icon: '⬜' };
        }
        if (/\bPCD\b/.test(c)) {
            return { nome: c.includes('EVENTO') ? 'PCD EVENTO' : 'PCD OBRA', icon: c.includes('EVENTO') ? '🧑🏾‍🦽' : '♿' };
        }
        if (/HIDRAUL/.test(c)) {
            return { nome: c.includes('EVENTO') ? 'HIDRÁULICO EVENTO' : 'HIDRÁULICO OBRA', icon: '🚽' };
        }
        if (/CHUVEIRO/.test(c)) {
            return { nome: c.includes('EVENTO') ? 'CHUVEIRO EVENTO' : 'CHUVEIRO OBRA', icon: '🚿' };
        }
        if (/MICTORIO/.test(c)) {
            return { nome: c.includes('EVENTO') ? 'MICTÓRIO EVENTO' : 'MICTÓRIO OBRA', icon: '💦' };
        }
        if (/PB\s*III|PIA\s*III/.test(c)) {
            return { nome: c.includes('EVENTO') ? 'PBIII EVENTO' : 'PBIII OBRA', icon: '🧼' };
        }
        if (/PB\s*II|PIA\s*II/.test(c)) {
            return { nome: c.includes('EVENTO') ? 'PBII EVENTO' : 'PBII OBRA', icon: '🧼' };
        }
        if (/\b(ELX|SLX)\b|EXTRA\s*LUXO/.test(c)) {
            return { nome: c.includes('EVENTO') ? 'ELX EVENTO' : 'ELX OBRA', icon: c.includes('EVENTO') ? '🟣' : '🔵' };
        }
        if (/\bLX\b/.test(c)) {
            return { nome: c.includes('EVENTO') ? 'LX EVENTO' : 'LX OBRA', icon: c.includes('EVENTO') ? '🟪' : '🟦' };
        }
        if (/\bSTD\b|STANDARD/.test(c)) {
            return { nome: c.includes('EVENTO') ? 'STD EVENTO' : 'STD OBRA', icon: c.includes('EVENTO') ? '💜' : '💙' };
        }
        return { nome: original, icon: '📦' };
    }

    function calcularInsumosEquipamento(nomeEquip, qtd) {
        const q = Math.max(1, parseInt(qtd, 10) || 1);
        const t = norm(nomeEquip).toUpperCase();
        const ehEvento = /\bEVENTO\b/.test(t);

        if (/\bPB\s*III\b|\bPIA\s*III\b/.test(t)) {
            const pacToalha = 3 * q;
            const mlSab = 400 * q;
            return [
                { id: 'papel_toalha', icone: '📄', nome: 'Papel toalha', qtd: pacToalha, unidade: 'pacote(s)' },
                { id: 'sabonete',     icone: '🧴', nome: 'Sabonete líquido', qtd: mlSab, unidade: 'ml' }
            ];
        }
        if (/\bPB\s*II\b|\bPIA\s*II\b/.test(t)) {
            const pacToalha = 2 * q;
            const mlSab = 200 * q;
            return [
                { id: 'papel_toalha', icone: '📄', nome: 'Papel toalha', qtd: pacToalha, unidade: 'pacote(s)' },
                { id: 'sabonete',     icone: '🧴', nome: 'Sabonete líquido', qtd: mlSab, unidade: 'ml' }
            ];
        }
        if (/\b(ELX|SLX)\b|EXTRA\s*LUXO/.test(t)) {
            const quim = 1 * q;
            const pacHig = ehEvento ? Math.ceil(0.5 * q) : (1 * q);
            const pacToalha = 1 * q;
            const mlSab = 200 * q;
            return [
                { id: 'quimica',         icone: '🧪', nome: 'Química',          qtd: quim,      unidade: 'unid.' },
                { id: 'papel_higienico', icone: '🧻', nome: 'Papel higiênico',  qtd: pacHig,    unidade: 'pacote(s)' },
                { id: 'papel_toalha',    icone: '📄', nome: 'Papel toalha',     qtd: pacToalha, unidade: 'pacote(s)' },
                { id: 'sabonete',        icone: '🧴', nome: 'Sabonete líquido', qtd: mlSab,     unidade: 'ml' }
            ];
        }
        if (/\bSTD\b|STANDARD|\bLX\b/.test(t)) {
            const quim = 1 * q;
            const pacHig = ehEvento ? Math.ceil(0.5 * q) : (1 * q);
            return [
                { id: 'quimica',         icone: '🧪', nome: 'Química',         qtd: quim,   unidade: 'unid.' },
                { id: 'papel_higienico', icone: '🧻', nome: 'Papel higiênico', qtd: pacHig, unidade: 'pacote(s)' }
            ];
        }
        return [];
    }

    function formatarTextoInsumo(ins) {
        if (ins.id === 'quimica') return `${ins.qtd} ${ins.qtd === 1 ? 'química' : 'químicas'}`;
        if (ins.id === 'papel_higienico') return `${ins.qtd} ${ins.qtd === 1 ? 'pacote' : 'pacotes'} de papel higiênico`;
        if (ins.id === 'papel_toalha') return `${ins.qtd} ${ins.qtd === 1 ? 'pacote' : 'pacotes'} de papel toalha`;
        if (ins.id === 'sabonete') return `${ins.qtd}ml sabonete líquido`;
        return `${ins.qtd} ${ins.unidade || ''} ${ins.nome}`;
    }

    function detectarItensSaidaTexto(texto) {
        const s = String(texto || '');
        const normS = norm(s).toUpperCase();
        const encontrados = [];
        for (const r of REGRAS_SAIDA_SEPARACAO) {
            if (r.id === 'MONTAGEM' && /\bDESMONTAGEM\b/i.test(normS) && !/\bMONTAGEM\b/i.test(normS.replace(/\bDESMONTAGEM\b/gi, ''))) {
                continue;
            }
            if (r.regex.test(s) || r.regex.test(normS)) {
                encontrados.push(r);
            }
        }
        return encontrados;
    }

    // ── Migrações ───────────────────────────────────────────────────────────────
    db.serialize(() => {
        db.run(`CREATE TABLE IF NOT EXISTS app_separacao_checks (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            data_ref        TEXT NOT NULL,
            veiculo_key     TEXT NOT NULL,
            veiculo_nome    TEXT,
            item_key        TEXT NOT NULL,
            categoria       TEXT NOT NULL,
            titulo          TEXT,
            checked         INTEGER DEFAULT 0,
            observacao      TEXT,
            lider_id        INTEGER,
            lider_nome      TEXT,
            lider_colab_id  INTEGER,
            concluido_em    DATETIME,
            atualizado_em   DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE (data_ref, veiculo_key, item_key)
        )`);
        db.run(`CREATE INDEX IF NOT EXISTS idx_app_sep_chk_data ON app_separacao_checks (data_ref)`);

        db.run(`CREATE TABLE IF NOT EXISTS app_separacao_midias (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            data_ref        TEXT NOT NULL,
            veiculo_key     TEXT NOT NULL,
            item_key        TEXT NOT NULL,
            r2_key          TEXT NOT NULL,
            content_type    TEXT DEFAULT 'image/jpeg',
            lider_id        INTEGER,
            lider_nome      TEXT,
            lider_colab_id  INTEGER,
            criado_em       DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);
        db.run(`CREATE INDEX IF NOT EXISTS idx_app_sep_mid_data ON app_separacao_midias (data_ref, veiculo_key, item_key)`);

        // Auto-liberar permissão de 'app-lideranca-separacao' para grupos que têm acesso ao APP Liderança
        db.all(
            `SELECT DISTINCT grupo_id FROM permissoes_grupo WHERE pagina_id IN ('app-lideranca-entregas', 'app-lideranca-retiradas', 'app-lideranca-candidatos', 'app-lideranca-resumo-rota') AND (visualizar = 1 OR visualizar = '1' OR visualizar = 'true')`,
            [],
            (err, rows) => {
                if (!err && Array.isArray(rows)) {
                    rows.forEach(r => {
                        db.get(`SELECT id FROM permissoes_grupo WHERE grupo_id = ? AND pagina_id = ?`, [r.grupo_id, PAGE_ID], (e2, ex) => {
                            if (!e2 && !ex) {
                                db.run(
                                    `INSERT INTO permissoes_grupo (grupo_id, pagina_id, pagina_nome, modulo, visualizar, incluir, alterar, excluir) VALUES (?, ?, 'Liderança › Separação', 'APP', 1, 1, 1, 0)`,
                                    [r.grupo_id, PAGE_ID]
                                );
                            }
                        });
                    });
                }
            }
        );
    });

    // ── Permissão ───────────────────────────────────────────────────────────────
    function isTopAdmin(u) {
        return !!u && (u.role === 'Diretoria' || u.role === 'Administrador' || u.departamento === 'Diretoria'
            || (u.grupo_nome && String(u.grupo_nome).toLowerCase() === 'diretoria'));
    }
    async function requireApp(req, res, next) {
        try {
            if (isTopAdmin(req.user)) return next();
            const uid = req.user && req.user.id;
            const gid = req.user && req.user.grupo_permissao_id;
            if (gid) {
                const row = await dbGet(
                    `SELECT visualizar FROM permissoes_grupo WHERE grupo_id = ? AND pagina_id IN (?, 'app-lideranca-entregas', 'app-lideranca-retiradas', 'app-lideranca-candidatos', 'app-lideranca-resumo-rota') AND (visualizar = 1 OR visualizar = '1' OR visualizar = 'true') LIMIT 1`,
                    [gid, PAGE_ID]
                );
                if (row) return next();
            }
            if (uid) {
                try {
                    const rowU = await dbGet(
                        `SELECT visualizar FROM permissoes_usuario WHERE usuario_id = ? AND pagina_id IN (?, 'app-lideranca-entregas', 'app-lideranca-retiradas', 'app-lideranca-candidatos', 'app-lideranca-resumo-rota') AND (visualizar = 1 OR visualizar = '1' OR visualizar = 'true') LIMIT 1`,
                        [uid, PAGE_ID]
                    );
                    if (rowU) return next();
                } catch (_) { /* tabela opcional */ }
                const rowLider = await dbGet(`SELECT colaborador_id FROM app_lider_config WHERE usuario_id = ? LIMIT 1`, [uid]);
                if (rowLider) return next();
            }
            if (req.user && /lider/i.test(norm(req.user.departamento || req.user.grupo_nome || req.user.role || ''))) {
                return next();
            }
            return res.status(403).json({ error: 'Sem permissão para acessar Separação.' });
        } catch (e) { return res.status(500).json({ error: e.message }); }
    }
    const guard = [authenticateToken, requireApp];

    // ── Resolver foto e ID de colaborador por nome ──────────────────────────────
    function buildColabMatcher(colabs) {
        const byExact = new Map();
        const list = [];
        (colabs || []).forEach(c => {
            const n = normLow(c.nome_completo);
            if (!n) return;
            const info = {
                id: c.id,
                nome_completo: c.nome_completo,
                cargo: c.cargo || '',
                departamento: c.departamento || '',
                foto_url: c.foto_base64 || `/api/colaboradores/foto/${c.id}`
            };
            byExact.set(n, info);
            const parts = n.split(' ').filter(Boolean);
            if (parts.length >= 2) {
                const firstTwo = parts.slice(0, 2).join(' ');
                if (!byExact.has(firstTwo)) byExact.set(firstTwo, info);
            }
            list.push({ n, parts, info });
        });

        return function matchColab(nomeBusca) {
            const q = normLow(nomeBusca);
            if (!q) return null;
            if (byExact.has(q)) return byExact.get(q);
            const qParts = q.split(' ').filter(Boolean);
            const found = list.find(item => item.n.startsWith(q) || q.startsWith(item.n) || (qParts.length >= 2 && qParts.every(p => item.parts.includes(p))));
            if (found) return found.info;
            if (qParts.length === 1 && qParts[0].length >= 3) {
                const single = list.filter(item => item.parts[0] === qParts[0]);
                if (single.length === 1) return single[0].info;
            }
            return null;
        };
    }

    function parseProdutoStr(p) {
        const m = String(p || '').trim().match(/^(\d+)\s*(?:[×xX]\s*)?(.+)/);
        if (m) return { qtd: parseInt(m[1], 10), codigo: m[2].trim() };
        return null;
    }

    function extrairPlacaDeTituloVeiculo(tituloVeiculo) {
        const s = String(tituloVeiculo || '').toUpperCase().trim();
        const m = s.match(/\b([A-Z]{3}[- ]?\d[A-Z0-9]\d{2})\b/);
        return m ? m[1].replace(/\s+/g, '-') : '';
    }

    // ── Extrair equipamentos e insumos de um veículo do resumo de rota ──────────
    function extrairItensSeparacaoVeiculo(v) {
        const colB = String(v.colBEditado || '').trim();
        const equipMap = new Map(); // nomeEq -> { nome, icone, qtd, tipo_entrega }
        const manutMap = new Map(); // nomeEq -> { nome, icone, qtd }
        const itensSaidaMap = new Map(); // id -> { id, icon, label, clientes: Set }

        const registrarEquipEntrega = (codigoOuNome, qtd, ehEventoHint) => {
            let codigo = String(codigoOuNome || '').trim();
            if (/^GUARITA\s+OBRA$/i.test(norm(codigo))) codigo = 'GUARITA INDIVIDUAL OBRA';
            if (/^GUARITA\s+EVENTO$/i.test(norm(codigo))) codigo = 'GUARITA INDIVIDUAL EVENTO';
            const eq = rrEquip(codigo);
            let nome = eq.nome || codigo.toUpperCase();
            if (ehEventoHint && !/OBRA|EVENTO/.test(nome)) {
                nome = nome + ' EVENTO';
            }
            const eqFinal = rrEquip(nome);
            const icone = eqFinal.icon || eq.icon || '📦';
            const nomeFinal = eqFinal.nome || nome;
            const atual = equipMap.get(nomeFinal) || { nome: nomeFinal, icone, qtd: 0 };
            atual.qtd += Math.max(1, parseInt(qtd, 10) || 1);
            equipMap.set(nomeFinal, atual);
        };

        const registrarEquipManut = (codigoOuNome, qtd) => {
            const eq = rrEquip(codigoOuNome);
            const nome = eq.nome || String(codigoOuNome || '').toUpperCase();
            const icone = eq.icon || '📦';
            const atual = manutMap.get(nome) || { nome, icone, qtd: 0 };
            atual.qtd += Math.max(1, parseInt(qtd, 10) || 1);
            manutMap.set(nome, atual);
        };

        // 1. Se houver colBEditado, extrair das seções do texto para bater 100% com o Resumo da Rota
        if (colB) {
            const suffixIdx = colB.indexOf('\nMotorista:');
            const cleanColB = suffixIdx !== -1 ? colB.substring(0, suffixIdx) : colB;
            const lines = cleanColB.replace(/\r\n/g, '\n').split('\n');
            let secao = 'OBS';
            let ehEntregaEvento = false;

            for (const rawLine of lines) {
                const tr = rawLine.trim();
                if (!tr) continue;
                const up = norm(tr).toUpperCase();
                if (tr.endsWith(':')) {
                    if (up.includes('ENTREGA')) {
                        secao = 'ENTREGA';
                        ehEntregaEvento = up.includes('EVENTO');
                        continue;
                    }
                    if (up.includes('RETIRADA')) { secao = 'RETIRADA'; continue; }
                    if (up.includes('MANUTENCAO')) { secao = 'MANUTENCAO'; continue; }
                    if (up.includes('COMPRAS')) { secao = 'COMPRAS'; continue; }
                }

                if (secao === 'OBS') {
                    detectarItensSaidaTexto(tr).forEach(it => {
                        if (!itensSaidaMap.has(it.id)) {
                            itensSaidaMap.set(it.id, { id: it.id, icon: it.icon, label: it.label, detalhes: [] });
                        }
                        itensSaidaMap.get(it.id).detalhes.push(tr);
                    });
                    continue;
                }

                const semIcone = tr.replace(/^[\u{1F000}-\u{1FFFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{2B00}-\u{2BFF}\uFE0F\u{200D}\s💙💜🟦🟪🔵🟣♿🧑🏾‍🦽🚿🚽💦🧼⬜⚪💧⚙️🛞⭕❗]+/gu, '').trim();
                const mProd = semIcone.match(/^(\d+)\s*(?:[×xX]\s*)?(.+)$/);
                if (!mProd) continue;
                const qtd = parseInt(mProd[1], 10) || 1;
                const nomeRaw = mProd[2].trim();

                if (secao === 'ENTREGA') {
                    registrarEquipEntrega(nomeRaw, qtd, ehEntregaEvento);
                } else if (secao === 'MANUTENCAO') {
                    registrarEquipManut(nomeRaw, qtd);
                }
            }
        }

        // 2. Complementar / fallback a partir de v.os caso colBEditado não estivesse preenchido
        if (equipMap.size === 0 && manutMap.size === 0 && Array.isArray(v.os)) {
            v.os.forEach(os => {
                const prods = (Array.isArray(os.produtos) && os.produtos.length > 0) ? os.produtos : (os.produto ? [os.produto] : []);
                const ehEv = /EVENTO/i.test(String(os.servico || ''));
                prods.forEach(pStr => {
                    const p = parseProdutoStr(pStr);
                    if (!p) return;
                    if (os.tipo === 'ENTREGA') {
                        registrarEquipEntrega(p.codigo, p.qtd, ehEv);
                    } else if (os.tipo === 'MANUTENCAO' || os.tipo === 'AVULSA') {
                        registrarEquipManut(p.codigo, p.qtd);
                    }
                });
            });
        }

        // 3. Garantir que itens de saída (Carrinho, Extensora, EPI, VAC, Reparos, Montagem, Desmontagem) das OSs também entrem
        (v.os || []).forEach(os => {
            const habs = Array.isArray(os.habilidades) ? os.habilidades.join(' ') : (os.habilidades || '');
            const vars = Array.isArray(os.variaveis) ? os.variaveis.join(' ') : (os.variaveis || '');
            const habEq = Array.isArray(os.habilidade_equipe) ? os.habilidade_equipe.join(' ') : (os.habilidade_equipe || '');
            const comb = [vars, habEq, habs, os.cliente, os.obs, os.observacoes_internas].filter(Boolean).join(' ');
            detectarItensSaidaTexto(comb).forEach(it => {
                if (!itensSaidaMap.has(it.id)) {
                    itensSaidaMap.set(it.id, { id: it.id, icon: it.icon, label: it.label, detalhes: [] });
                }
            });
        });

        // 4. Calcular insumos consolidados do veículo (Manutenções + Entregas de banheiros/pias)
        const insumosConsolidados = new Map(); // id -> { id, icone, nome, qtd, unidade }
        const somarInsumosDeLista = (mapaEquip) => {
            for (const eq of mapaEquip.values()) {
                const insList = calcularInsumosEquipamento(eq.nome, eq.qtd);
                insList.forEach(ins => {
                    const ex = insumosConsolidados.get(ins.id) || { id: ins.id, icone: ins.icone, nome: ins.nome, qtd: 0, unidade: ins.unidade };
                    ex.qtd += ins.qtd;
                    insumosConsolidados.set(ins.id, ex);
                });
            }
        };
        somarInsumosDeLista(manutMap);
        somarInsumosDeLista(equipMap);

        return {
            equipamentos: [...equipMap.values()],
            manutencoes_base: [...manutMap.values()],
            itens_saida: [...itensSaidaMap.values()],
            insumos: [...insumosConsolidados.values()].map(ins => Object.assign({}, ins, {
                texto: formatarTextoInsumo(ins)
            }))
        };
    }

    // ── Buscar resumos de rota salvos para uma data ISO ─────────────────────────
    async function buscarResumosDaData(iso) {
        const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (!m) return { diurno: null, noturno: null, todos: [] };
        const prefixoBr = `${m[3]}-${m[2]}-${m[1]}`;
        const rows = await dbAll(
            `SELECT id, nome, dados, criado_em, usuario_nome FROM logistica_resumo_rota WHERE nome LIKE ? ORDER BY id ASC`,
            [prefixoBr + '%']
        );
        const rowsDiurnos = rows.filter(r => !/noturn|noite/i.test(norm(r.nome || '')));
        const rowsNoturnos = rows.filter(r => /noturn|noite/i.test(norm(r.nome || '')));
        return {
            diurno: rowsDiurnos.length ? rowsDiurnos[rowsDiurnos.length - 1] : null,
            noturno: rowsNoturnos.length ? rowsNoturnos[rowsNoturnos.length - 1] : null,
            todos: rows
        };
    }

    // ── Montar dados completos da tela de Separação para uma data base ──────────
    async function montarSeparacaoDoDia(isoNoite, modoRotaOpcional, uidLogado) {
        const escalaDia = await escalaUtil.obterEscalaLideresNoDia(db, isoNoite, uidLogado);
        const resolverColab = await escalaUtil.criarResolvedorColaborador(db);
        const colabs = await dbAll(`/* INCLUIR_SERVICO */ SELECT id, nome_completo, cargo, departamento, foto_path, foto_base64 FROM colaboradores`);
        const matchColab = buildColabMatcher(colabs);

        // Na noite da data `isoNoite`:
        // 1) A sucção é referente aos veículos que saíram no próprio dia `isoNoite` (diurno + noturno)
        // 2) A separação de equipamentos e insumos é para os veículos que sairão no dia seguinte (`isoSeguinte`),
        //    mas caso ainda não tenham importado a rota de `isoSeguinte` e exista rota em `isoNoite`, permitimos
        //    alternar ou exibir automaticamente para nunca ficar em branco durante operação/testes.
        const isoSeguinte = somaDias(isoNoite, 1);
        const resumosHoje = await buscarResumosDaData(isoNoite);
        const resumosAmanha = await buscarResumosDaData(isoSeguinte);

        let dataRotaSeparacao = isoSeguinte;
        let resumosSeparacao = resumosAmanha;
        if (modoRotaOpcional === 'mesmo_dia') {
            dataRotaSeparacao = isoNoite;
            resumosSeparacao = resumosHoje;
        } else if (modoRotaOpcional === 'dia_seguinte') {
            dataRotaSeparacao = isoSeguinte;
            resumosSeparacao = resumosAmanha;
        } else {
            // Auto: prioriza dia seguinte (regra operacional noturna), mas se não houver rota no dia seguinte e houver no dia selecionado, usa o dia selecionado
            if (!resumosAmanha.todos.length && resumosHoje.todos.length) {
                dataRotaSeparacao = isoNoite;
                resumosSeparacao = resumosHoje;
            }
        }

        // Carregar checks e fotos tanto de isoNoite quanto de dataRotaSeparacao
        const datasRef = [...new Set([isoNoite, dataRotaSeparacao])];
        const checksRows = await dbAll(
            `SELECT * FROM app_separacao_checks WHERE data_ref IN (${datasRef.map(() => '?').join(',')})`,
            datasRef
        );
        const midiasRows = await dbAll(
            `SELECT * FROM app_separacao_midias WHERE data_ref IN (${datasRef.map(() => '?').join(',')}) ORDER BY id DESC`,
            datasRef
        );

        const checksMap = new Map(); // `${data_ref}|${veiculo_key}|${item_key}` -> row
        checksRows.forEach(r => {
            const resolved = (r.lider_id || r.lider_nome || r.lider_colab_id)
                ? resolverColab({ usuario_id: r.lider_id, colab_id: r.lider_colab_id, nome: r.lider_nome })
                : null;
            const nomeRes = (resolved && resolved.nome) || r.lider_nome || null;
            const cidRes = (resolved && resolved.colab_id) || r.lider_colab_id || null;
            const fotoRes = (resolved && resolved.foto_url) || (cidRes ? `/api/colaboradores/foto/${cidRes}` : null);
            checksMap.set(`${r.data_ref}|${r.veiculo_key}|${r.item_key}`, Object.assign({}, r, {
                lider_nome: nomeRes,
                lider_colab_id: cidRes,
                lider_foto_url: fotoRes
            }));
        });

        const midiasMap = new Map(); // `${data_ref}|${veiculo_key}|${item_key}` -> [midia, ...]
        midiasRows.forEach(m => {
            const k = `${m.data_ref}|${m.veiculo_key}|${m.item_key}`;
            if (!midiasMap.has(k)) midiasMap.set(k, []);
            midiasMap.get(k).push({
                id: m.id,
                url: `/api/app/separacao/midia/${m.id}`,
                criado_em: m.criado_em,
                lider_nome: m.lider_nome
            });
        });

        // ── 1. Montar lista de veículos para SEPARAÇÃO (por placa de veículo) ─────
        const veiculosSeparacaoMap = new Map();
        const rowsParaSeparacao = [resumosSeparacao.diurno, resumosSeparacao.noturno].filter(Boolean);
        // Evitar processar o mesmo resumo duas vezes
        const idsProcessadosSep = new Set();
        rowsParaSeparacao.forEach(rRow => {
            if (idsProcessadosSep.has(rRow.id)) return;
            idsProcessadosSep.add(rRow.id);
            const ehNoturno = /noturn|noite/i.test(norm(rRow.nome || ''));
            const pDados = parseJson(rRow.dados, {});
            const vList = Array.isArray(pDados) ? pDados : (pDados && Array.isArray(pDados.veiculos) ? pDados.veiculos : []);
            vList.forEach((v, idx) => {
                const tituloVeic = String(v.veiculo || `Veículo ${idx + 1}`).trim();
                const placa = extrairPlacaDeTituloVeiculo(tituloVeic);
                const vKey = slug(placa || tituloVeic);
                const extraidos = extrairItensSeparacaoVeiculo(v);

                const motInfo = matchColab(v.motorista);
                const ajuInfo = matchColab(v.ajudante);

                const itemEquipamentos = extraidos.equipamentos.map(eq => {
                    const ik = `eq_${slug(eq.nome)}`;
                    const chk = checksMap.get(`${dataRotaSeparacao}|${vKey}|${ik}`);
                    const fotos = midiasMap.get(`${dataRotaSeparacao}|${vKey}|${ik}`) || [];
                    const concluido = !!(chk && chk.checked && fotos.length > 0);
                    return {
                        item_key: ik,
                        categoria: 'equipamento',
                        icone: eq.icone || '📦',
                        qtd: eq.qtd,
                        nome: eq.nome,
                        texto: `${eq.icone ? eq.icone + ' ' : ''}${eq.qtd} × ${eq.nome}`,
                        checked: concluido,
                        fotos,
                        ultima_foto_url: fotos[0] ? fotos[0].url : null,
                        lider_nome: concluido ? chk.lider_nome : null,
                        lider_foto_url: concluido ? chk.lider_foto_url : null,
                        atualizado_em: concluido ? (chk.concluido_em || chk.atualizado_em) : null
                    };
                });

                const itemAcessSaida = extraidos.itens_saida.map(sa => {
                    const ik = `saida_${slug(sa.id)}`;
                    const chk = checksMap.get(`${dataRotaSeparacao}|${vKey}|${ik}`);
                    const fotos = midiasMap.get(`${dataRotaSeparacao}|${vKey}|${ik}`) || [];
                    const concluido = !!(chk && chk.checked && fotos.length > 0);
                    return {
                        item_key: ik,
                        categoria: 'equipamento',
                        icone: sa.icon || '🛠️',
                        qtd: 1,
                        nome: sa.label,
                        texto: `${sa.icon ? sa.icon + ' ' : ''}${sa.label}`,
                        checked: concluido,
                        fotos,
                        ultima_foto_url: fotos[0] ? fotos[0].url : null,
                        lider_nome: concluido ? chk.lider_nome : null,
                        lider_foto_url: concluido ? chk.lider_foto_url : null,
                        atualizado_em: concluido ? (chk.concluido_em || chk.atualizado_em) : null
                    };
                });

                const itemInsumos = extraidos.insumos.map(ins => {
                    const ik = `ins_${slug(ins.id)}`;
                    const chk = checksMap.get(`${dataRotaSeparacao}|${vKey}|${ik}`);
                    const fotos = midiasMap.get(`${dataRotaSeparacao}|${vKey}|${ik}`) || [];
                    const concluido = !!(chk && chk.checked && fotos.length > 0);
                    return {
                        item_key: ik,
                        categoria: 'insumo',
                        icone: ins.icone || '🧪',
                        qtd: ins.qtd,
                        unidade: ins.unidade,
                        nome: ins.nome,
                        texto: `${ins.icone ? ins.icone + ' ' : ''}${ins.texto}`,
                        checked: concluido,
                        fotos,
                        ultima_foto_url: fotos[0] ? fotos[0].url : null,
                        lider_nome: concluido ? chk.lider_nome : null,
                        lider_foto_url: concluido ? chk.lider_foto_url : null,
                        atualizado_em: concluido ? (chk.concluido_em || chk.atualizado_em) : null
                    };
                });

                const todosEquipEAcess = [...itemEquipamentos, ...itemAcessSaida];

                if (!veiculosSeparacaoMap.has(vKey)) {
                    veiculosSeparacaoMap.set(vKey, {
                        data_ref: dataRotaSeparacao,
                        veiculo_key: vKey,
                        placa: placa || tituloVeic,
                        veiculo: tituloVeic,
                        turno_rota: ehNoturno ? 'noturno' : 'diurno',
                        motorista: {
                            nome: v.motorista || '—',
                            foto_url: (motInfo && motInfo.foto_url) || null
                        },
                        ajudante: {
                            nome: v.ajudante || '—',
                            foto_url: (ajuInfo && ajuInfo.foto_url) || null
                        },
                        equipamentos: todosEquipEAcess,
                        insumos: itemInsumos,
                        manutencoes_base: extraidos.manutencoes_base
                    });
                } else {
                    const exV = veiculosSeparacaoMap.get(vKey);
                    todosEquipEAcess.forEach(eq => {
                        if (!exV.equipamentos.some(x => x.item_key === eq.item_key)) {
                            exV.equipamentos.push(eq);
                        }
                    });
                    itemInsumos.forEach(ins => {
                        if (!exV.insumos.some(x => x.item_key === ins.item_key)) {
                            exV.insumos.push(ins);
                        }
                    });
                }
            });
        });

        // ── 2. Montar lista de SUCÇÃO dos veículos que saíram no dia `isoNoite` (Diurno + Noturno)
        const veiculosSuccaoMap = new Map();
        const rowsHoje = [resumosHoje.diurno, resumosHoje.noturno].filter(Boolean);
        const idsProcessadosHoje = new Set();

        rowsHoje.forEach(rRow => {
            if (idsProcessadosHoje.has(rRow.id)) return;
            idsProcessadosHoje.add(rRow.id);
            const ehNoturno = /noturn|noite/i.test(norm(rRow.nome || ''));
            const pDados = parseJson(rRow.dados, {});
            const vList = Array.isArray(pDados) ? pDados : (pDados && Array.isArray(pDados.veiculos) ? pDados.veiculos : []);
            vList.forEach((v, idx) => {
                const tituloVeic = String(v.veiculo || `Veículo ${idx + 1}`).trim();
                const placa = extrairPlacaDeTituloVeiculo(tituloVeic);
                const vKey = slug(placa || tituloVeic);
                const motInfo = matchColab(v.motorista);
                const ajuInfo = matchColab(v.ajudante);

                const ik = 'succao_veiculo';
                const chk = checksMap.get(`${isoNoite}|${vKey}|${ik}`);
                const fotos = midiasMap.get(`${isoNoite}|${vKey}|${ik}`) || [];
                const concluido = !!(chk && chk.checked && fotos.length > 0);

                if (!veiculosSuccaoMap.has(vKey)) {
                    veiculosSuccaoMap.set(vKey, {
                        data_ref: isoNoite,
                        veiculo_key: vKey,
                        placa: placa || tituloVeic,
                        veiculo: tituloVeic,
                        turnos_saida: [ehNoturno ? 'noturno' : 'diurno'],
                        motorista: {
                            nome: v.motorista || '—',
                            foto_url: (motInfo && motInfo.foto_url) || null
                        },
                        ajudante: {
                            nome: v.ajudante || '—',
                            foto_url: (ajuInfo && ajuInfo.foto_url) || null
                        },
                        item_key: ik,
                        categoria: 'succao',
                        icone: '💦',
                        texto: '💦 Realizar sucção do veículo (pós-rota)',
                        checked: concluido,
                        fotos,
                        ultima_foto_url: fotos[0] ? fotos[0].url : null,
                        lider_nome: concluido ? chk.lider_nome : null,
                        lider_foto_url: concluido ? chk.lider_foto_url : null,
                        atualizado_em: concluido ? (chk.concluido_em || chk.atualizado_em) : null
                    });
                } else {
                    const exS = veiculosSuccaoMap.get(vKey);
                    const tStr = ehNoturno ? 'noturno' : 'diurno';
                    if (!exS.turnos_saida.includes(tStr)) exS.turnos_saida.push(tStr);
                }
            });
        });

        // Calcular status visual (verde = concluído, amarelo = iniciado, vermelho = atrasado) para cada veículo de separação
        const hoje = hojeSP();
        const veiculosSeparacao = [...veiculosSeparacaoMap.values()].map(v => {
            // Vincular também a sucção caso o veículo tenha saído hoje
            const succaoHoje = veiculosSuccaoMap.get(v.veiculo_key) || null;
            const todosItens = [
                ...v.equipamentos,
                ...v.insumos,
                ...(succaoHoje ? [succaoHoje] : [])
            ];
            const totalItens = todosItens.length;
            const concluidosItens = todosItens.filter(i => i.checked).length;
            const atrasado = v.data_ref < hoje && concluidosItens < totalItens;
            let estadoVisual = 'pendente';
            if (totalItens > 0 && concluidosItens >= totalItens) {
                estadoVisual = 'concluido'; // verde claro
            } else if (concluidosItens > 0) {
                estadoVisual = 'em_andamento'; // amarelo claro
            } else if (atrasado) {
                estadoVisual = 'atrasado'; // vermelho claro
            }

            return Object.assign({}, v, {
                succao_hoje: succaoHoje,
                total_itens: totalItens,
                itens_concluidos: concluidosItens,
                estado_visual: estadoVisual
            });
        });

        const veiculosSuccao = [...veiculosSuccaoMap.values()].map(s => {
            const atrasado = s.data_ref < hoje && !s.checked;
            return Object.assign({}, s, {
                estado_visual: s.checked ? 'concluido' : (atrasado ? 'atrasado' : 'pendente')
            });
        });

        // Contadores gerais
        const totalEquipamentos = veiculosSeparacao.reduce((acc, v) => acc + v.equipamentos.length, 0);
        const concluidosEquipamentos = veiculosSeparacao.reduce((acc, v) => acc + v.equipamentos.filter(i => i.checked).length, 0);

        const totalInsumos = veiculosSeparacao.reduce((acc, v) => acc + v.insumos.length, 0);
        const concluidosInsumos = veiculosSeparacao.reduce((acc, v) => acc + v.insumos.filter(i => i.checked).length, 0);

        const totalSuccao = veiculosSuccao.length;
        const concluidosSuccao = veiculosSuccao.filter(s => s.checked).length;

        const totalGeral = totalEquipamentos + totalInsumos + totalSuccao;
        const concluidosGeral = concluidosEquipamentos + concluidosInsumos + concluidosSuccao;

        return {
            data_noite: isoNoite,
            data_noite_br: fmtBR(isoNoite),
            data_rota_separacao: dataRotaSeparacao,
            data_rota_separacao_br: fmtBR(dataRotaSeparacao),
            data_seguinte: isoSeguinte,
            data_seguinte_br: fmtBR(isoSeguinte),
            tem_rota_dia_seguinte: resumosAmanha.todos.length > 0,
            tem_rota_mesmo_dia: resumosHoje.todos.length > 0,
            modo_rota: dataRotaSeparacao === isoSeguinte ? 'dia_seguinte' : 'mesmo_dia',
            escala_dia: escalaDia,
            contadores: {
                total_geral: totalGeral,
                concluidos_geral: concluidosGeral,
                pendentes_geral: Math.max(0, totalGeral - concluidosGeral),
                total_veiculos_separacao: veiculosSeparacao.length,
                total_equipamentos: totalEquipamentos,
                concluidos_equipamentos: concluidosEquipamentos,
                total_insumos: totalInsumos,
                concluidos_insumos: concluidosInsumos,
                total_succao: totalSuccao,
                concluidos_succao: concluidosSuccao
            },
            veiculos_separacao: veiculosSeparacao,
            veiculos_succao: veiculosSuccao
        };
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ENDPOINTS HTTP
    // ═══════════════════════════════════════════════════════════════════════════

    // GET /api/app/separacao?data=YYYY-MM-DD&modo_rota=dia_seguinte|mesmo_dia
    app.get('/api/app/separacao', guard, async (req, res) => {
        try {
            const iso = isoDate(req.query.data) || hojeSP();
            const modoRota = req.query.modo_rota || 'auto';
            const uid = req.user && req.user.id;
            const payload = await montarSeparacaoDoDia(iso, modoRota, uid);
            res.json(payload);
        } catch (e) {
            console.error('[APP SEPARACAO GET]', e);
            res.status(500).json({ error: e.message });
        }
    });

    // GET /api/app/separacao/calendario?ini=YYYY-MM-DD&fim=YYYY-MM-DD
    app.get('/api/app/separacao/calendario', guard, async (req, res) => {
        try {
            const hoje = hojeSP();
            const ini = isoDate(req.query.ini) || somaDias(hoje, -7);
            const fim = isoDate(req.query.fim) || somaDias(hoje, 14);
            const dias = {};
            let cur = ini;
            let guardLoop = 0;
            while (cur <= fim && guardLoop < 45) {
                guardLoop++;
                const resumosDia = await buscarResumosDaData(cur);
                const resumosSeg = await buscarResumosDaData(somaDias(cur, 1));
                const checksDia = await dbGet(
                    `SELECT COUNT(*) as tot, SUM(CASE WHEN checked = 1 THEN 1 ELSE 0 END) as concl
                     FROM app_separacao_checks WHERE data_ref IN (?, ?)`,
                    [cur, somaDias(cur, 1)]
                );
                const temRota = resumosDia.todos.length > 0 || resumosSeg.todos.length > 0;
                const concl = Number((checksDia && checksDia.concl) || 0);
                dias[cur] = {
                    tem_rota: temRota,
                    checks_concluidos: concl,
                    status: !temRota ? 'vazio' : (concl > 0 ? 'andamento' : 'pendente')
                };
                cur = somaDias(cur, 1);
            }
            res.json({ ini, fim, hoje, dias });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    });

    // POST /api/app/separacao/foto — Upload de foto no Cloudflare R2 + marcação automática do check
    app.post('/api/app/separacao/foto', guard, async (req, res) => {
        try {
            const { data_ref, veiculo_key, veiculo_nome, item_key, categoria, titulo, foto_base64 } = req.body || {};
            const iso = isoDate(data_ref) || hojeSP();
            if (!veiculo_key || !item_key) {
                return res.status(400).json({ error: 'veiculo_key e item_key são obrigatórios.' });
            }
            if (!foto_base64 || typeof foto_base64 !== 'string') {
                return res.status(400).json({ error: 'A foto é obrigatória para concluir o item da separação.' });
            }

            const lider = await escalaUtil.resolverLiderDoReq(db, req);
            const m = foto_base64.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
            const contentType = m ? m[1] : 'image/jpeg';
            const b64Clean = m ? m[2] : foto_base64;
            const buffer = Buffer.from(b64Clean, 'base64');
            const ext = contentType.includes('png') ? 'png' : (contentType.includes('webp') ? 'webp' : 'jpg');

            const [yyyy, mm, dd] = iso.split('-');
            const hash = crypto.randomBytes(4).toString('hex');
            const r2Key = `separacao-noturna/${yyyy}/${mm}/${dd}/${slug(veiculo_key)}_${slug(item_key)}_${Date.now()}_${hash}.${ext}`;

            const r2 = require('./utils/r2');
            if (r2.isReady()) {
                await r2.uploadToR2(r2Key, buffer, contentType);
            } else {
                console.warn('[APP SEPARACAO R2] R2 não configurado no ambiente local.');
            }

            const insMidia = await dbRun(
                `INSERT INTO app_separacao_midias (data_ref, veiculo_key, item_key, r2_key, content_type, lider_id, lider_nome, lider_colab_id)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [iso, veiculo_key, item_key, r2Key, contentType, lider.usuario_id, lider.nome, lider.colab_id]
            );

            await dbRun(
                `INSERT INTO app_separacao_checks (data_ref, veiculo_key, veiculo_nome, item_key, categoria, titulo, checked, lider_id, lider_nome, lider_colab_id, concluido_em, atualizado_em)
                 VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                 ON CONFLICT(data_ref, veiculo_key, item_key) DO UPDATE SET
                    checked = 1,
                    veiculo_nome = COALESCE(excluded.veiculo_nome, app_separacao_checks.veiculo_nome),
                    titulo = COALESCE(excluded.titulo, app_separacao_checks.titulo),
                    lider_id = excluded.lider_id,
                    lider_nome = excluded.lider_nome,
                    lider_colab_id = excluded.lider_colab_id,
                    concluido_em = CURRENT_TIMESTAMP,
                    atualizado_em = CURRENT_TIMESTAMP`,
                [iso, veiculo_key, veiculo_nome || veiculo_key, item_key, categoria || 'equipamento', titulo || item_key, lider.usuario_id, lider.nome, lider.colab_id]
            );

            res.json({
                ok: true,
                midia_id: insMidia.lastID,
                foto_url: `/api/app/separacao/midia/${insMidia.lastID}`,
                r2_key: r2Key,
                checked: true,
                lider_nome: lider.nome,
                lider_foto_url: lider.foto_url
            });
        } catch (e) {
            console.error('[APP SEPARACAO FOTO POST]', e);
            res.status(500).json({ error: e.message });
        }
    });

    // DELETE /api/app/separacao/foto/:id — Remove vínculo no banco (NUNCA apaga do Cloudflare R2)
    app.delete('/api/app/separacao/foto/:id', guard, async (req, res) => {
        try {
            const id = Number(req.params.id);
            const row = await dbGet(`SELECT * FROM app_separacao_midias WHERE id = ?`, [id]);
            if (!row) return res.status(404).json({ error: 'Foto não encontrada.' });

            // REGRA OBRIGATÓRIA: NUNCA chamar r2.deleteFromR2 — apenas remover registro no SQLite
            await dbRun(`DELETE FROM app_separacao_midias WHERE id = ?`, [id]);

            const restantes = await dbGet(
                `SELECT COUNT(*) as qtd FROM app_separacao_midias WHERE data_ref = ? AND veiculo_key = ? AND item_key = ?`,
                [row.data_ref, row.veiculo_key, row.item_key]
            );
            const aindaTemFoto = Number((restantes && restantes.qtd) || 0) > 0;
            if (!aindaTemFoto) {
                await dbRun(
                    `UPDATE app_separacao_checks SET checked = 0, atualizado_em = CURRENT_TIMESTAMP WHERE data_ref = ? AND veiculo_key = ? AND item_key = ?`,
                    [row.data_ref, row.veiculo_key, row.item_key]
                );
            }
            res.json({ ok: true, checked: aindaTemFoto });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    });

    // GET /api/app/separacao/midia/:id — Stream da foto via Cloudflare R2
    app.get('/api/app/separacao/midia/:id', async (req, res) => {
        try {
            const row = await dbGet(`SELECT r2_key, content_type FROM app_separacao_midias WHERE id = ?`, [req.params.id]);
            if (!row || !row.r2_key) return res.status(404).send('Mídia não encontrada');

            const r2 = require('./utils/r2');
            if (!r2.isReady()) return res.status(503).send('Storage R2 não configurado');

            const { stream, contentType } = await r2.downloadStreamFromR2(row.r2_key);
            res.setHeader('Content-Type', row.content_type || contentType || 'image/jpeg');
            res.setHeader('Cache-Control', 'public, max-age=86400');
            stream.pipe(res);
        } catch (e) {
            res.status(404).send('Arquivo não encontrado no R2');
        }
    });
};
