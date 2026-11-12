// ═══════════════════════════════════════════════════════════════════════════════
// ROTAS: TREINAMENTOS › ACADEMIA DE LÍDERES  (Fase 1: trilhas, módulos, aulas, prazos,
// matrículas e progresso obrigatório)
// Arquivo: backend/routes_academia_lideres.js
// Registro no server.js:  require('./routes_academia_lideres')(app, db, authenticateToken, r2);
//
// - Reaproveita usuarios/colaboradores/login do sistema (sem novas senhas, sem users/employees)
// - Permissão: Diretoria/Administrador sempre; demais pelo Controle de Acesso
//     'academia-lideres-admin' (painel) e 'academia-lideres-minha' (jornada do participante)
// - Missões NUNCA entram no progresso obrigatório (serão adicionadas nas próximas fases como bônus)
// - Arquivos/vídeos das aulas: Cloudflare R2 (r2_key) — streaming privado
// ═══════════════════════════════════════════════════════════════════════════════
"use strict";

const multer = require('multer');
const crypto = require('crypto');

module.exports = function registerAcademiaLideres(app, db, authenticateToken, r2) {

    const TZ = 'America/Sao_Paulo';
    const PAGE_ADMIN = 'academia-lideres-admin';
    const PAGE_MINHA = 'academia-lideres-minha';
    const MAX_MB = 60;
    const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_MB * 1024 * 1024 } });

    // ── Helpers ────────────────────────────────────────────────────────────────
    const dbRun = (sql, p = []) => new Promise((res, rej) => db.run(sql, p, function (e) { e ? rej(e) : res({ lastID: this.lastID, changes: this.changes }); }));
    const dbGet = (sql, p = []) => new Promise((res, rej) => db.get(sql, p, (e, r) => e ? rej(e) : res(r || null)));
    const dbAll = (sql, p = []) => new Promise((res, rej) => db.all(sql, p, (e, r) => e ? rej(e) : res(r || [])));
    const parseJson = (s, fb) => { try { const v = JSON.parse(s); return v == null ? fb : v; } catch (e) { return fb; } };
    const hojeSP = () => new Date().toLocaleDateString('en-CA', { timeZone: TZ });
    const isoDate = s => { const m = String(s || '').trim().match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? `${m[1]}-${m[2]}-${m[3]}` : null; };
    const diffDias = (a, b) => Math.round((new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00')) / 86400000);
    const norm = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
    const txt = (v, max) => String(v == null ? '' : v).trim().slice(0, max || 4000);
    const fotoUrl = id => `/api/colaboradores/foto/${id}`;

    // ── Migrações ──────────────────────────────────────────────────────────────
    db.serialize(() => {
        db.run(`CREATE TABLE IF NOT EXISTS acl_trilhas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL, descricao TEXT, objetivo TEXT,
            publico_json TEXT DEFAULT '[]',
            data_inicio TEXT, data_fim TEXT, carga_horaria REAL DEFAULT 0,
            gera_certificado INTEGER DEFAULT 1,
            status TEXT DEFAULT 'rascunho',
            demonstracao INTEGER DEFAULT 0,
            criado_por INTEGER, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);
        db.run(`CREATE TABLE IF NOT EXISTS acl_modulos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            track_id INTEGER NOT NULL, titulo TEXT NOT NULL, descricao TEXT,
            ordem INTEGER DEFAULT 0, ativo INTEGER DEFAULT 1,
            data_inicio TEXT, data_fim TEXT, demonstracao INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (track_id) REFERENCES acl_trilhas(id) ON DELETE CASCADE
        )`);
        db.run(`CREATE TABLE IF NOT EXISTS acl_aulas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            module_id INTEGER NOT NULL, titulo TEXT NOT NULL, descricao TEXT, objetivo TEXT, conteudo TEXT,
            video_url TEXT, video_r2_key TEXT, video_nome TEXT,
            arquivo_r2_key TEXT, arquivo_nome TEXT, link TEXT,
            duracao_min INTEGER DEFAULT 0, ordem INTEGER DEFAULT 0,
            obrigatoria INTEGER DEFAULT 1, prazo TEXT, demonstracao INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (module_id) REFERENCES acl_modulos(id) ON DELETE CASCADE
        )`);
        db.run(`CREATE TABLE IF NOT EXISTS acl_matriculas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            track_id INTEGER NOT NULL, colaborador_id INTEGER NOT NULL,
            status TEXT DEFAULT 'ativo', data_matricula TEXT, data_conclusao TEXT,
            excecao_ate TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE (track_id, colaborador_id),
            FOREIGN KEY (track_id) REFERENCES acl_trilhas(id) ON DELETE CASCADE
        )`);
        db.run(`CREATE TABLE IF NOT EXISTS acl_progresso (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            matricula_id INTEGER NOT NULL, aula_id INTEGER NOT NULL, concluida_em DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE (matricula_id, aula_id)
        )`);
        db.run(`CREATE INDEX IF NOT EXISTS idx_acl_mod_track ON acl_modulos (track_id)`);
        db.run(`CREATE INDEX IF NOT EXISTS idx_acl_aula_mod ON acl_aulas (module_id)`);
        db.run(`CREATE INDEX IF NOT EXISTS idx_acl_mat_track ON acl_matriculas (track_id)`);
        db.run(`CREATE INDEX IF NOT EXISTS idx_acl_prog_mat ON acl_progresso (matricula_id)`, () => { seedDemo().catch(e => console.error('[ACL] seed:', e.message)); });
    });

    // ── Permissões ─────────────────────────────────────────────────────────────
    function isTopAdmin(u) {
        return !!u && (u.role === 'Diretoria' || u.role === 'Administrador' || u.departamento === 'Diretoria'
            || (u.grupo_nome && String(u.grupo_nome).toLowerCase() === 'diretoria'));
    }
    async function temPagina(u, pagina) {
        if (isTopAdmin(u)) return true;
        const gid = u && u.grupo_permissao_id;
        if (!gid) return false;
        const row = await dbGet('SELECT visualizar FROM permissoes_grupo WHERE grupo_id = ? AND pagina_id = ?', [gid, pagina]);
        const v = row && row.visualizar;
        return v === 1 || v === '1' || v === true || v === 'true';
    }
    const guardAdmin = [authenticateToken, async (req, res, next) => {
        try { if (await temPagina(req.user, PAGE_ADMIN)) return next(); return res.status(403).json({ error: 'Sem permissão para administrar a Academia de Líderes.' }); }
        catch (e) { return res.status(500).json({ error: e.message }); }
    }];
    const guardMinha = [authenticateToken, async (req, res, next) => {
        try { if (await temPagina(req.user, PAGE_MINHA) || await temPagina(req.user, PAGE_ADMIN)) return next(); return res.status(403).json({ error: 'Sem permissão para acessar a Academia.' }); }
        catch (e) { return res.status(500).json({ error: e.message }); }
    }];

    // usuário logado → colaborador (sem nova senha/convite: reaproveita o cadastro existente)
    async function colabDoUsuario(user) {
        const uid = user && user.id;
        if (!uid) return null;
        const u = await dbGet('SELECT id, username, nome, email FROM usuarios WHERE id = ?', [uid]);
        const cols = 'id, nome_completo, cargo, departamento, foto_path, status';
        try {
            const cfg = await dbGet('SELECT colaborador_id FROM app_lider_config WHERE usuario_id = ?', [uid]);
            if (cfg && cfg.colaborador_id) { const c = await dbGet(`SELECT ${cols} FROM colaboradores WHERE id = ?`, [cfg.colaborador_id]); if (c) return c; }
        } catch (e) { /* tabela pode não existir */ }
        if (u && u.email && String(u.email).includes('@')) {
            const c = await dbGet(`SELECT ${cols} FROM colaboradores WHERE LOWER(TRIM(email)) = LOWER(TRIM(?)) LIMIT 1`, [u.email]);
            if (c) return c;
        }
        const nome = norm((u && (u.nome || u.username)) || '');
        if (nome) {
            const todos = await dbAll(`SELECT ${cols} FROM colaboradores WHERE status NOT LIKE 'Desligado%'`);
            const c = todos.find(x => norm(x.nome_completo) === nome);
            if (c) return c;
        }
        return null;
    }

    // ── Regras de prazo ────────────────────────────────────────────────────────
    function statusEfetivo(t) {
        const h = hojeSP();
        if (t.status === 'publicada' || t.status === 'em_andamento') {
            if (t.data_fim && h > t.data_fim) return 'encerrada';
            if (t.data_inicio && h >= t.data_inicio) return 'em_andamento';
            return 'publicada';
        }
        return t.status;
    }
    function infoPrazo(ini, fim) {
        const h = hojeSP();
        if (!ini || !fim) return { total_dias: null, restantes: null, situacao: 'sem_prazo' };
        const total = diffDias(ini, fim);
        if (h < ini) return { total_dias: total, restantes: diffDias(h, ini), situacao: 'nao_iniciada' };
        if (h > fim) return { total_dias: total, restantes: 0, situacao: 'encerrada' };
        return { total_dias: total, restantes: diffDias(h, fim), situacao: 'em_andamento' };
    }
    const dentro = (ini, fim, a, b) => (!a || !ini || a >= ini) && (!b || !fim || b <= fim);
    function validaIntervalo(ini, fim, rotulo) {
        if (ini && fim && fim < ini) return `A data final ${rotulo} não pode ser anterior à data inicial.`;
        return null;
    }

    // ── Progresso obrigatório (missões nunca entram aqui) ──────────────────────
    async function aulasObrigatorias(trackId) {
        return dbAll(`SELECT a.id, a.module_id FROM acl_aulas a JOIN acl_modulos m ON m.id = a.module_id
            WHERE m.track_id = ? AND m.ativo = 1 AND a.obrigatoria = 1`, [trackId]);
    }
    async function progressoDaTrilha(trackId) {
        const obrig = await aulasObrigatorias(trackId);
        const ids = new Set(obrig.map(a => a.id));
        const mats = await dbAll('SELECT id, colaborador_id, status FROM acl_matriculas WHERE track_id = ?', [trackId]);
        const out = {};
        if (!mats.length) return { total: ids.size, porMatricula: out };
        const prog = await dbAll(`SELECT p.matricula_id, p.aula_id FROM acl_progresso p JOIN acl_matriculas m ON m.id = p.matricula_id WHERE m.track_id = ?`, [trackId]);
        const cont = {};
        prog.forEach(p => { if (ids.has(p.aula_id)) cont[p.matricula_id] = (cont[p.matricula_id] || 0) + 1; });
        mats.forEach(m => { out[m.id] = ids.size ? Math.min(100, Math.round(((cont[m.id] || 0) * 100) / ids.size)) : 0; });
        return { total: ids.size, porMatricula: out };
    }
    async function sincronizarConclusao(matriculaId, pct) {
        const m = await dbGet('SELECT id, status FROM acl_matriculas WHERE id = ?', [matriculaId]);
        if (!m || m.status === 'inativo') return;
        if (pct >= 100 && m.status !== 'concluido') await dbRun(`UPDATE acl_matriculas SET status = 'concluido', data_conclusao = ? WHERE id = ?`, [hojeSP(), matriculaId]);
        else if (pct < 100 && m.status === 'concluido') await dbRun(`UPDATE acl_matriculas SET status = 'ativo', data_conclusao = NULL WHERE id = ?`, [matriculaId]);
    }

    // ── Montagem da trilha (módulos + aulas) ───────────────────────────────────
    async function estruturaTrilha(trackId, apenasAtivos) {
        const mods = await dbAll(`SELECT * FROM acl_modulos WHERE track_id = ? ${apenasAtivos ? 'AND ativo = 1' : ''} ORDER BY ordem ASC, id ASC`, [trackId]);
        for (const m of mods) {
            m.aulas = await dbAll(`SELECT id, module_id, titulo, descricao, objetivo, conteudo, video_url, video_r2_key IS NOT NULL AND video_r2_key != '' AS tem_video_arquivo,
                video_nome, arquivo_r2_key IS NOT NULL AND arquivo_r2_key != '' AS tem_arquivo, arquivo_nome, link, duracao_min, ordem, obrigatoria, prazo, demonstracao
                FROM acl_aulas WHERE module_id = ? ORDER BY ordem ASC, id ASC`, [m.id]);
        }
        return mods;
    }
    function resumoTrilha(t, extra) {
        const prazo = infoPrazo(t.data_inicio, t.data_fim);
        return Object.assign({}, t, { publico: parseJson(t.publico_json, []), status_efetivo: statusEfetivo(t), prazo }, extra || {});
    }
    async function contagensTrilha(t) {
        const q = async (sql, p) => (await dbGet(sql, p)).n;
        const mods = await q('SELECT COUNT(*) n FROM acl_modulos WHERE track_id = ?', [t.id]);
        const aulas = await q('SELECT COUNT(*) n FROM acl_aulas a JOIN acl_modulos m ON m.id = a.module_id WHERE m.track_id = ?', [t.id]);
        const part = await q('SELECT COUNT(*) n FROM acl_matriculas WHERE track_id = ?', [t.id]);
        const pr = await progressoDaTrilha(t.id);
        const vals = Object.values(pr.porMatricula);
        const media = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
        return { qtd_modulos: mods, qtd_aulas: aulas, qtd_avaliacoes: 0, qtd_missoes: 0, qtd_participantes: part, progresso_medio: media };
    }

    // ═══ ADMIN: trilhas ═══════════════════════════════════════════════════════
    app.get('/api/acl/trilhas', guardAdmin, async (req, res) => {
        try {
            const ts = await dbAll('SELECT * FROM acl_trilhas ORDER BY id DESC');
            const out = [];
            for (const t of ts) out.push(resumoTrilha(t, await contagensTrilha(t)));
            res.json(out);
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    function lerTrilha(b) {
        const publico = Array.isArray(b.publico) ? b.publico.map(x => txt(x, 60)).filter(Boolean) : [];
        return {
            nome: txt(b.nome, 160), descricao: txt(b.descricao), objetivo: txt(b.objetivo), publico,
            data_inicio: isoDate(b.data_inicio), data_fim: isoDate(b.data_fim),
            carga_horaria: Math.max(0, parseFloat(b.carga_horaria) || 0),
            gera_certificado: b.gera_certificado === false || b.gera_certificado === 0 || b.gera_certificado === '0' ? 0 : 1,
            status: ['rascunho', 'publicada', 'encerrada', 'arquivada'].includes(b.status) ? b.status : 'rascunho'
        };
    }
    app.post('/api/acl/trilhas', guardAdmin, async (req, res) => {
        try {
            const t = lerTrilha(req.body || {});
            if (!t.nome) return res.status(400).json({ error: 'Informe o nome da trilha.' });
            if (!t.data_inicio || !t.data_fim) return res.status(400).json({ error: 'Informe a data de início e a data de encerramento da trilha.' });
            const e1 = validaIntervalo(t.data_inicio, t.data_fim, 'da trilha'); if (e1) return res.status(400).json({ error: e1 });
            const r = await dbRun(`INSERT INTO acl_trilhas (nome, descricao, objetivo, publico_json, data_inicio, data_fim, carga_horaria, gera_certificado, status, criado_por)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [t.nome, t.descricao, t.objetivo, JSON.stringify(t.publico), t.data_inicio, t.data_fim, t.carga_horaria, t.gera_certificado, t.status, req.user.id || null]);
            res.json({ ok: true, id: r.lastID });
        } catch (e) { res.status(500).json({ error: e.message }); }
    });
    app.put('/api/acl/trilhas/:id', guardAdmin, async (req, res) => {
        try {
            const id = parseInt(req.params.id, 10);
            const atual = await dbGet('SELECT * FROM acl_trilhas WHERE id = ?', [id]);
            if (!atual) return res.status(404).json({ error: 'Trilha não encontrada.' });
            const t = lerTrilha(Object.assign({}, atual, { publico: parseJson(atual.publico_json, []) }, req.body || {}));
            if (!t.nome) return res.status(400).json({ error: 'Informe o nome da trilha.' });
            const e1 = validaIntervalo(t.data_inicio, t.data_fim, 'da trilha'); if (e1) return res.status(400).json({ error: e1 });
            // módulos/aulas/missões já cadastrados precisam continuar dentro do novo prazo
            const mods = await dbAll('SELECT titulo, data_inicio, data_fim FROM acl_modulos WHERE track_id = ?', [id]);
            const fora = mods.filter(m => !dentro(t.data_inicio, t.data_fim, m.data_inicio, m.data_fim)).map(m => m.titulo);
            if (fora.length) return res.status(409).json({ error: `O novo prazo deixa módulos fora do período da trilha: ${fora.slice(0, 3).join(', ')}${fora.length > 3 ? '…' : ''}. Ajuste os prazos dos módulos antes.` });
            await dbRun(`UPDATE acl_trilhas SET nome = ?, descricao = ?, objetivo = ?, publico_json = ?, data_inicio = ?, data_fim = ?, carga_horaria = ?,
                gera_certificado = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
                [t.nome, t.descricao, t.objetivo, JSON.stringify(t.publico), t.data_inicio, t.data_fim, t.carga_horaria, t.gera_certificado, t.status, id]);
            res.json({ ok: true });
        } catch (e) { res.status(500).json({ error: e.message }); }
    });
    async function apagarMidiasDaTrilha(trackId) {
        if (!r2 || !r2.isReady()) return;
        const rows = await dbAll(`SELECT a.video_r2_key, a.arquivo_r2_key FROM acl_aulas a JOIN acl_modulos m ON m.id = a.module_id WHERE m.track_id = ?`, [trackId]);
        for (const r of rows) for (const k of [r.video_r2_key, r.arquivo_r2_key]) if (k) { try { await r2.deleteFromR2(k); } catch (e) { /* segue */ } }
    }
    app.delete('/api/acl/trilhas/:id', guardAdmin, async (req, res) => {
        try {
            const id = parseInt(req.params.id, 10);
            const n = await dbGet('SELECT COUNT(*) n FROM acl_matriculas WHERE track_id = ?', [id]);
            if (n.n > 0 && req.query.forcar !== '1') return res.status(409).json({ error: `Esta trilha tem ${n.n} participante(s). Arquive a trilha ou confirme a exclusão definitiva.`, participantes: n.n });
            await apagarMidiasDaTrilha(id);
            await dbRun('DELETE FROM acl_progresso WHERE matricula_id IN (SELECT id FROM acl_matriculas WHERE track_id = ?)', [id]);
            await dbRun('DELETE FROM acl_matriculas WHERE track_id = ?', [id]);
            await dbRun('DELETE FROM acl_aulas WHERE module_id IN (SELECT id FROM acl_modulos WHERE track_id = ?)', [id]);
            await dbRun('DELETE FROM acl_modulos WHERE track_id = ?', [id]);
            await dbRun('DELETE FROM acl_trilhas WHERE id = ?', [id]);
            res.json({ ok: true });
        } catch (e) { res.status(500).json({ error: e.message }); }
    });
    app.get('/api/acl/trilhas/:id', guardAdmin, async (req, res) => {
        try {
            const id = parseInt(req.params.id, 10);
            const t = await dbGet('SELECT * FROM acl_trilhas WHERE id = ?', [id]);
            if (!t) return res.status(404).json({ error: 'Trilha não encontrada.' });
            res.json(Object.assign(resumoTrilha(t, await contagensTrilha(t)), { modulos: await estruturaTrilha(id, false) }));
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    // ═══ ADMIN: módulos ═══════════════════════════════════════════════════════
    async function lerModulo(b, trilha) {
        const m = { titulo: txt(b.titulo, 200), descricao: txt(b.descricao), data_inicio: isoDate(b.data_inicio), data_fim: isoDate(b.data_fim), ativo: b.ativo === false || b.ativo === 0 || b.ativo === '0' ? 0 : 1 };
        if (!m.titulo) return { erro: 'Informe o título do módulo.' };
        const e1 = validaIntervalo(m.data_inicio, m.data_fim, 'do módulo'); if (e1) return { erro: e1 };
        if (!dentro(trilha.data_inicio, trilha.data_fim, m.data_inicio, m.data_fim)) return { erro: 'O prazo do módulo deve estar dentro do prazo da trilha.' };
        return { m };
    }
    app.post('/api/acl/trilhas/:id/modulos', guardAdmin, async (req, res) => {
        try {
            const tid = parseInt(req.params.id, 10);
            const trilha = await dbGet('SELECT * FROM acl_trilhas WHERE id = ?', [tid]);
            if (!trilha) return res.status(404).json({ error: 'Trilha não encontrada.' });
            const r = await lerModulo(req.body || {}, trilha); if (r.erro) return res.status(400).json({ error: r.erro });
            const ord = await dbGet('SELECT COALESCE(MAX(ordem), 0) + 1 AS o FROM acl_modulos WHERE track_id = ?', [tid]);
            const ins = await dbRun('INSERT INTO acl_modulos (track_id, titulo, descricao, ordem, ativo, data_inicio, data_fim) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [tid, r.m.titulo, r.m.descricao, ord.o, r.m.ativo, r.m.data_inicio, r.m.data_fim]);
            res.json({ ok: true, id: ins.lastID });
        } catch (e) { res.status(500).json({ error: e.message }); }
    });
    app.put('/api/acl/modulos/:id', guardAdmin, async (req, res) => {
        try {
            const id = parseInt(req.params.id, 10);
            const atual = await dbGet('SELECT * FROM acl_modulos WHERE id = ?', [id]);
            if (!atual) return res.status(404).json({ error: 'Módulo não encontrado.' });
            const trilha = await dbGet('SELECT * FROM acl_trilhas WHERE id = ?', [atual.track_id]);
            const r = await lerModulo(Object.assign({}, atual, req.body || {}), trilha); if (r.erro) return res.status(400).json({ error: r.erro });
            const fora = await dbAll('SELECT titulo FROM acl_aulas WHERE module_id = ? AND prazo IS NOT NULL AND prazo != \'\' AND ((? IS NOT NULL AND prazo < ?) OR (? IS NOT NULL AND prazo > ?))',
                [id, r.m.data_inicio, r.m.data_inicio, r.m.data_fim, r.m.data_fim]);
            if (fora.length) return res.status(409).json({ error: `Há aulas com prazo fora do novo período do módulo: ${fora.slice(0, 3).map(a => a.titulo).join(', ')}.` });
            await dbRun('UPDATE acl_modulos SET titulo = ?, descricao = ?, ativo = ?, data_inicio = ?, data_fim = ? WHERE id = ?',
                [r.m.titulo, r.m.descricao, r.m.ativo, r.m.data_inicio, r.m.data_fim, id]);
            res.json({ ok: true });
        } catch (e) { res.status(500).json({ error: e.message }); }
    });
    app.delete('/api/acl/modulos/:id', guardAdmin, async (req, res) => {
        try {
            const id = parseInt(req.params.id, 10);
            if (r2 && r2.isReady()) {
                const rows = await dbAll('SELECT video_r2_key, arquivo_r2_key FROM acl_aulas WHERE module_id = ?', [id]);
                for (const r of rows) for (const k of [r.video_r2_key, r.arquivo_r2_key]) if (k) { try { await r2.deleteFromR2(k); } catch (e) { /* segue */ } }
            }
            await dbRun('DELETE FROM acl_progresso WHERE aula_id IN (SELECT id FROM acl_aulas WHERE module_id = ?)', [id]);
            await dbRun('DELETE FROM acl_aulas WHERE module_id = ?', [id]);
            await dbRun('DELETE FROM acl_modulos WHERE id = ?', [id]);
            res.json({ ok: true });
        } catch (e) { res.status(500).json({ error: e.message }); }
    });
    app.post('/api/acl/trilhas/:id/modulos/ordem', guardAdmin, async (req, res) => {
        try {
            const tid = parseInt(req.params.id, 10);
            const ids = Array.isArray(req.body && req.body.ids) ? req.body.ids.map(Number).filter(Boolean) : [];
            for (let i = 0; i < ids.length; i++) await dbRun('UPDATE acl_modulos SET ordem = ? WHERE id = ? AND track_id = ?', [i + 1, ids[i], tid]);
            res.json({ ok: true });
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    // ═══ ADMIN: aulas ═════════════════════════════════════════════════════════
    async function lerAula(b, modulo, trilha) {
        const a = {
            titulo: txt(b.titulo, 200), descricao: txt(b.descricao), objetivo: txt(b.objetivo), conteudo: txt(b.conteudo, 20000),
            video_url: txt(b.video_url, 500), link: txt(b.link, 500), duracao_min: Math.max(0, parseInt(b.duracao_min, 10) || 0),
            obrigatoria: b.obrigatoria === false || b.obrigatoria === 0 || b.obrigatoria === '0' ? 0 : 1, prazo: isoDate(b.prazo)
        };
        if (!a.titulo) return { erro: 'Informe o título da aula.' };
        if (a.prazo) {
            const ini = modulo.data_inicio || trilha.data_inicio, fim = modulo.data_fim || trilha.data_fim;
            if (!dentro(ini, fim, a.prazo, a.prazo)) return { erro: 'O prazo da aula deve respeitar o prazo do módulo/trilha.' };
        }
        return { a };
    }
    async function ctxModulo(modId) {
        const m = await dbGet('SELECT * FROM acl_modulos WHERE id = ?', [modId]);
        if (!m) return null;
        return { m, t: await dbGet('SELECT * FROM acl_trilhas WHERE id = ?', [m.track_id]) };
    }
    app.post('/api/acl/modulos/:id/aulas', guardAdmin, async (req, res) => {
        try {
            const mid = parseInt(req.params.id, 10);
            const c = await ctxModulo(mid); if (!c) return res.status(404).json({ error: 'Módulo não encontrado.' });
            const r = await lerAula(req.body || {}, c.m, c.t); if (r.erro) return res.status(400).json({ error: r.erro });
            const ord = await dbGet('SELECT COALESCE(MAX(ordem), 0) + 1 AS o FROM acl_aulas WHERE module_id = ?', [mid]);
            const ins = await dbRun(`INSERT INTO acl_aulas (module_id, titulo, descricao, objetivo, conteudo, video_url, link, duracao_min, ordem, obrigatoria, prazo)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [mid, r.a.titulo, r.a.descricao, r.a.objetivo, r.a.conteudo, r.a.video_url, r.a.link, r.a.duracao_min, ord.o, r.a.obrigatoria, r.a.prazo]);
            res.json({ ok: true, id: ins.lastID });
        } catch (e) { res.status(500).json({ error: e.message }); }
    });
    app.put('/api/acl/aulas/:id', guardAdmin, async (req, res) => {
        try {
            const id = parseInt(req.params.id, 10);
            const atual = await dbGet('SELECT * FROM acl_aulas WHERE id = ?', [id]);
            if (!atual) return res.status(404).json({ error: 'Aula não encontrada.' });
            const c = await ctxModulo(atual.module_id);
            const r = await lerAula(Object.assign({}, atual, req.body || {}), c.m, c.t); if (r.erro) return res.status(400).json({ error: r.erro });
            await dbRun(`UPDATE acl_aulas SET titulo = ?, descricao = ?, objetivo = ?, conteudo = ?, video_url = ?, link = ?, duracao_min = ?, obrigatoria = ?, prazo = ? WHERE id = ?`,
                [r.a.titulo, r.a.descricao, r.a.objetivo, r.a.conteudo, r.a.video_url, r.a.link, r.a.duracao_min, r.a.obrigatoria, r.a.prazo, id]);
            res.json({ ok: true });
        } catch (e) { res.status(500).json({ error: e.message }); }
    });
    app.delete('/api/acl/aulas/:id', guardAdmin, async (req, res) => {
        try {
            const id = parseInt(req.params.id, 10);
            const a = await dbGet('SELECT video_r2_key, arquivo_r2_key FROM acl_aulas WHERE id = ?', [id]);
            if (a && r2 && r2.isReady()) for (const k of [a.video_r2_key, a.arquivo_r2_key]) if (k) { try { await r2.deleteFromR2(k); } catch (e) { /* segue */ } }
            await dbRun('DELETE FROM acl_progresso WHERE aula_id = ?', [id]);
            await dbRun('DELETE FROM acl_aulas WHERE id = ?', [id]);
            res.json({ ok: true });
        } catch (e) { res.status(500).json({ error: e.message }); }
    });
    app.post('/api/acl/modulos/:id/aulas/ordem', guardAdmin, async (req, res) => {
        try {
            const mid = parseInt(req.params.id, 10);
            const ids = Array.isArray(req.body && req.body.ids) ? req.body.ids.map(Number).filter(Boolean) : [];
            for (let i = 0; i < ids.length; i++) await dbRun('UPDATE acl_aulas SET ordem = ? WHERE id = ? AND module_id = ?', [i + 1, ids[i], mid]);
            res.json({ ok: true });
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    // ── Arquivo / vídeo da aula → R2 ────────────────────────────────────────────
    app.post('/api/acl/aulas/:id/midia', guardAdmin, upload.single('arquivo'), async (req, res) => {
        try {
            if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
            if (!r2 || !r2.isReady()) return res.status(503).json({ error: 'Armazenamento de arquivos (R2) não está configurado.' });
            const id = parseInt(req.params.id, 10);
            const campo = req.body && req.body.campo === 'video' ? 'video' : 'arquivo';
            const aula = await dbGet('SELECT id, module_id, video_r2_key, arquivo_r2_key FROM acl_aulas WHERE id = ?', [id]);
            if (!aula) return res.status(404).json({ error: 'Aula não encontrada.' });
            const mime = String(req.file.mimetype || '').toLowerCase();
            if (campo === 'video' && !/^video\//.test(mime)) return res.status(400).json({ error: 'O arquivo precisa ser um vídeo.' });
            const nome = String(req.file.originalname || campo).replace(/[^\w.\- ]+/g, '_').slice(0, 120);
            const ext = (nome.match(/\.([A-Za-z0-9]{1,6})$/) || [null, campo === 'video' ? 'mp4' : 'bin'])[1].toLowerCase();
            const hoje = hojeSP().split('-');
            const key = `academia-lideres/${hoje[0]}/${hoje[1]}/aula${id}_${campo}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}.${ext}`;
            await r2.uploadToR2(key, req.file.buffer, req.file.mimetype);
            const antigo = campo === 'video' ? aula.video_r2_key : aula.arquivo_r2_key;
            if (campo === 'video') await dbRun('UPDATE acl_aulas SET video_r2_key = ?, video_nome = ? WHERE id = ?', [key, nome, id]);
            else await dbRun('UPDATE acl_aulas SET arquivo_r2_key = ?, arquivo_nome = ? WHERE id = ?', [key, nome, id]);
            if (antigo) { try { await r2.deleteFromR2(antigo); } catch (e) { /* segue */ } }
            res.json({ ok: true, nome });
        } catch (e) {
            if (e && e.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: `Arquivo acima de ${MAX_MB} MB.` });
            res.status(500).json({ error: e.message });
        }
    });
    app.delete('/api/acl/aulas/:id/midia/:campo', guardAdmin, async (req, res) => {
        try {
            const id = parseInt(req.params.id, 10);
            const campo = req.params.campo === 'video' ? 'video' : 'arquivo';
            const a = await dbGet('SELECT video_r2_key, arquivo_r2_key FROM acl_aulas WHERE id = ?', [id]);
            if (!a) return res.status(404).json({ error: 'Aula não encontrada.' });
            const key = campo === 'video' ? a.video_r2_key : a.arquivo_r2_key;
            if (key && r2 && r2.isReady()) { try { await r2.deleteFromR2(key); } catch (e) { /* segue */ } }
            if (campo === 'video') await dbRun('UPDATE acl_aulas SET video_r2_key = NULL, video_nome = NULL WHERE id = ?', [id]);
            else await dbRun('UPDATE acl_aulas SET arquivo_r2_key = NULL, arquivo_nome = NULL WHERE id = ?', [id]);
            res.json({ ok: true });
        } catch (e) { res.status(500).json({ error: e.message }); }
    });
    // stream privado (admin ou participante matriculado na trilha da aula)
    app.get('/api/acl/aulas/:id/midia/:campo', authenticateToken, async (req, res) => {
        try {
            const id = parseInt(req.params.id, 10);
            const campo = req.params.campo === 'video' ? 'video' : 'arquivo';
            const a = await dbGet(`SELECT a.video_r2_key, a.arquivo_r2_key, a.video_nome, a.arquivo_nome, m.track_id FROM acl_aulas a JOIN acl_modulos m ON m.id = a.module_id WHERE a.id = ?`, [id]);
            if (!a) return res.status(404).end();
            let ok = await temPagina(req.user, PAGE_ADMIN);
            if (!ok) {
                const colab = await colabDoUsuario(req.user);
                const mat = colab ? await dbGet(`SELECT id FROM acl_matriculas WHERE track_id = ? AND colaborador_id = ? AND status != 'inativo'`, [a.track_id, colab.id]) : null;
                ok = !!mat;
            }
            if (!ok) return res.status(403).end();
            const key = campo === 'video' ? a.video_r2_key : a.arquivo_r2_key;
            if (!key) return res.status(404).end();
            if (!r2 || !r2.isReady()) return res.status(503).end();
            const range = req.headers.range || null;
            const f = await r2.downloadStreamFromR2(key, range);
            res.setHeader('Content-Type', f.contentType || 'application/octet-stream');
            res.setHeader('Cache-Control', 'private, max-age=3600');
            res.setHeader('Accept-Ranges', 'bytes');
            const nome = (campo === 'video' ? a.video_nome : a.arquivo_nome) || 'arquivo';
            if (campo === 'arquivo') res.setHeader('Content-Disposition', `inline; filename="${String(nome).replace(/"/g, '')}"`);
            if (range && f.contentRange) { res.status(206); res.setHeader('Content-Range', f.contentRange); }
            if (f.contentLength != null) res.setHeader('Content-Length', f.contentLength);
            f.stream.on('error', () => { try { res.end(); } catch (e2) { /* ignora */ } });
            f.stream.pipe(res);
        } catch (e) { if (!res.headersSent) res.status(404).end(); }
    });

    // ═══ ADMIN: participantes / matrículas ════════════════════════════════════
    app.get('/api/acl/colaboradores', guardAdmin, async (req, res) => {
        try {
            const tid = parseInt(req.query.trilha, 10) || 0;
            const rows = await dbAll(`SELECT c.id, c.nome_completo, c.cargo, c.departamento, c.status,
                (SELECT 1 FROM acl_matriculas m WHERE m.track_id = ? AND m.colaborador_id = c.id) AS matriculado
                FROM colaboradores c WHERE c.status IN ('Ativo', 'Férias', 'Processo iniciado') ORDER BY c.nome_completo COLLATE NOCASE`, [tid]);
            res.json(rows.map(r => ({ id: r.id, nome: r.nome_completo, cargo: r.cargo || '', departamento: r.departamento || '', status: r.status, matriculado: !!r.matriculado, foto: fotoUrl(r.id) })));
        } catch (e) { res.status(500).json({ error: e.message }); }
    });
    app.get('/api/acl/trilhas/:id/participantes', guardAdmin, async (req, res) => {
        try {
            const tid = parseInt(req.params.id, 10);
            const pr = await progressoDaTrilha(tid);
            const rows = await dbAll(`SELECT m.id AS matricula_id, m.status, m.data_matricula, m.data_conclusao, m.excecao_ate, c.id AS colaborador_id, c.nome_completo, c.cargo, c.departamento
                FROM acl_matriculas m JOIN colaboradores c ON c.id = m.colaborador_id WHERE m.track_id = ? ORDER BY c.nome_completo COLLATE NOCASE`, [tid]);
            res.json({ total_obrigatorias: pr.total, participantes: rows.map(r => ({
                matricula_id: r.matricula_id, colaborador_id: r.colaborador_id, nome: r.nome_completo, cargo: r.cargo || '', departamento: r.departamento || '',
                foto: fotoUrl(r.colaborador_id), status: r.status, progresso: pr.porMatricula[r.matricula_id] || 0,
                data_matricula: r.data_matricula, data_conclusao: r.data_conclusao, excecao_ate: r.excecao_ate,
                evolucao: null, missoes: 0, pontos: 0 // preenchidos nas próximas fases
            })) });
        } catch (e) { res.status(500).json({ error: e.message }); }
    });
    app.post('/api/acl/trilhas/:id/matriculas', guardAdmin, async (req, res) => {
        try {
            const tid = parseInt(req.params.id, 10);
            const ids = Array.isArray(req.body && req.body.colaborador_ids) ? req.body.colaborador_ids.map(Number).filter(Boolean) : [];
            if (!ids.length) return res.status(400).json({ error: 'Selecione ao menos um colaborador.' });
            let novos = 0;
            for (const cid of ids) {
                const r = await dbRun('INSERT OR IGNORE INTO acl_matriculas (track_id, colaborador_id, status, data_matricula) VALUES (?, ?, \'ativo\', ?)', [tid, cid, hojeSP()]);
                if (r.changes) novos++;
            }
            res.json({ ok: true, novos });
        } catch (e) { res.status(500).json({ error: e.message }); }
    });
    app.delete('/api/acl/matriculas/:id', guardAdmin, async (req, res) => {
        try {
            const id = parseInt(req.params.id, 10);
            await dbRun('DELETE FROM acl_progresso WHERE matricula_id = ?', [id]);
            await dbRun('DELETE FROM acl_matriculas WHERE id = ?', [id]);
            res.json({ ok: true });
        } catch (e) { res.status(500).json({ error: e.message }); }
    });
    // exceção de prazo: libera o participante a concluir conteúdos após o fim (ou limpa)
    app.put('/api/acl/matriculas/:id/excecao', guardAdmin, async (req, res) => {
        try {
            const id = parseInt(req.params.id, 10);
            const ate = isoDate(req.body && req.body.ate);
            await dbRun('UPDATE acl_matriculas SET excecao_ate = ? WHERE id = ?', [ate, id]);
            res.json({ ok: true });
        } catch (e) { res.status(500).json({ error: e.message }); }
    });
    app.get('/api/acl/trilhas/:id/participantes/:colabId', guardAdmin, async (req, res) => {
        try {
            const tid = parseInt(req.params.id, 10), cid = parseInt(req.params.colabId, 10);
            const jornada = await jornadaDoColab(tid, cid);
            if (!jornada) return res.status(404).json({ error: 'Participante não encontrado nesta trilha.' });
            res.json(jornada);
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    // ── Dashboard do administrador ──────────────────────────────────────────────
    app.get('/api/acl/dashboard', guardAdmin, async (req, res) => {
        try {
            const trilhas = await dbAll(`SELECT * FROM acl_trilhas WHERE status != 'arquivada'`);
            let totalPart = 0, ativos = 0, concluidos = 0, naoIniciaram = 0, emDesenv = 0, somaPct = 0, nPct = 0;
            const porTrilha = [];
            for (const t of trilhas) {
                const pr = await progressoDaTrilha(t.id);
                const mats = await dbAll('SELECT id, status FROM acl_matriculas WHERE track_id = ?', [t.id]);
                const prog = await dbAll('SELECT p.matricula_id FROM acl_progresso p JOIN acl_matriculas m ON m.id = p.matricula_id WHERE m.track_id = ? GROUP BY p.matricula_id', [t.id]);
                const iniciou = new Set(prog.map(x => x.matricula_id));
                let soma = 0;
                mats.forEach(m => {
                    totalPart++;
                    const pct = pr.porMatricula[m.id] || 0;
                    somaPct += pct; nPct++; soma += pct;
                    if (m.status === 'concluido') concluidos++; else if (m.status !== 'inativo') { ativos++; if (iniciou.has(m.id)) emDesenv++; else naoIniciaram++; }
                });
                porTrilha.push({ id: t.id, nome: t.nome, participantes: mats.length, media: mats.length ? Math.round(soma / mats.length) : 0 });
            }
            const totalColab = await dbGet(`SELECT COUNT(*) n FROM colaboradores WHERE status IN ('Ativo', 'Férias')`);
            res.json({
                total_colaboradores: totalColab.n, participantes: totalPart, ativos, concluidos, em_desenvolvimento: emDesenv, nao_iniciaram: naoIniciaram,
                trilhas_cadastradas: trilhas.length, trilhas_concluidas: concluidos,
                media_conclusao: nPct ? Math.round(somaPct / nPct) : 0, certificados_emitidos: 0, por_trilha: porTrilha
            });
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    // ═══ PARTICIPANTE: Minha Academia ═════════════════════════════════════════
    async function jornadaDoColab(trackId, colabId) {
        const trilha = await dbGet('SELECT * FROM acl_trilhas WHERE id = ?', [trackId]);
        const mat = await dbGet('SELECT * FROM acl_matriculas WHERE track_id = ? AND colaborador_id = ?', [trackId, colabId]);
        if (!trilha || !mat) return null;
        const mods = await estruturaTrilha(trackId, true);
        const feitas = new Set((await dbAll('SELECT aula_id FROM acl_progresso WHERE matricula_id = ?', [mat.id])).map(r => r.aula_id));
        const h = hojeSP();
        const colab = await dbGet('SELECT id, nome_completo, cargo, departamento FROM colaboradores WHERE id = ?', [colabId]);
        let totalObr = 0, feitasObr = 0, proximoModulo = null, proximaAula = null;
        mods.forEach(m => {
            m.encerrado = !!(m.data_fim && h > m.data_fim);
            m.aulas.forEach(a => {
                a.concluida = feitas.has(a.id);
                a.encerrada = !!((a.prazo && h > a.prazo) || m.encerrado || (trilha.data_fim && h > trilha.data_fim));
                if (a.obrigatoria) { totalObr++; if (a.concluida) feitasObr++; }
                if (!a.concluida && a.obrigatoria && !proximaAula) { proximaAula = { id: a.id, titulo: a.titulo, modulo: m.titulo }; proximoModulo = m.titulo; }
            });
            const obr = m.aulas.filter(a => a.obrigatoria);
            m.progresso = obr.length ? Math.round(obr.filter(a => a.concluida).length * 100 / obr.length) : 0;
        });
        const pct = totalObr ? Math.round(feitasObr * 100 / totalObr) : 0;
        return {
            colaborador: colab && { id: colab.id, nome: colab.nome_completo, cargo: colab.cargo, departamento: colab.departamento, foto: fotoUrl(colab.id) },
            matricula: { id: mat.id, status: mat.status, data_matricula: mat.data_matricula, data_conclusao: mat.data_conclusao, excecao_ate: mat.excecao_ate },
            trilha: resumoTrilha(trilha), modulos: mods,
            progresso: { obrigatorio: pct, aulas_obrigatorias: totalObr, aulas_concluidas: feitasObr, missoes_realizadas: 0, pontos_bonus: 0 },
            proximo_modulo: proximoModulo, proxima_aula: proximaAula
        };
    }
    app.get('/api/acl/minha', guardMinha, async (req, res) => {
        try {
            const colab = await colabDoUsuario(req.user);
            if (!colab) return res.json({ vinculado: false, trilhas: [] });
            const mats = await dbAll(`SELECT m.track_id FROM acl_matriculas m JOIN acl_trilhas t ON t.id = m.track_id
                WHERE m.colaborador_id = ? AND m.status != 'inativo' AND t.status NOT IN ('rascunho', 'arquivada') ORDER BY t.id DESC`, [colab.id]);
            const trilhas = [];
            for (const m of mats) {
                const j = await jornadaDoColab(m.track_id, colab.id);
                if (j) trilhas.push({ trilha: j.trilha, matricula: j.matricula, progresso: j.progresso, proximo_modulo: j.proximo_modulo, proxima_aula: j.proxima_aula,
                    qtd_modulos: j.modulos.length, qtd_aulas: j.modulos.reduce((n, x) => n + x.aulas.length, 0) });
            }
            res.json({ vinculado: true, colaborador: { id: colab.id, nome: colab.nome_completo, cargo: colab.cargo, departamento: colab.departamento, foto: fotoUrl(colab.id) }, trilhas });
        } catch (e) { res.status(500).json({ error: e.message }); }
    });
    app.get('/api/acl/minha/trilhas/:id', guardMinha, async (req, res) => {
        try {
            const colab = await colabDoUsuario(req.user);
            if (!colab) return res.status(404).json({ error: 'Seu usuário não está vinculado a um colaborador.' });
            const tid = parseInt(req.params.id, 10);
            const j = await jornadaDoColab(tid, colab.id);
            if (!j || ['rascunho', 'arquivada'].includes(j.trilha.status)) return res.status(404).json({ error: 'Trilha não disponível para você.' });
            res.json(j);
        } catch (e) { res.status(500).json({ error: e.message }); }
    });
    app.post('/api/acl/minha/aulas/:id/concluir', guardMinha, async (req, res) => {
        try {
            const colab = await colabDoUsuario(req.user);
            if (!colab) return res.status(404).json({ error: 'Seu usuário não está vinculado a um colaborador.' });
            const aulaId = parseInt(req.params.id, 10);
            const a = await dbGet(`SELECT a.id, a.prazo, m.id AS mid, m.data_fim AS mfim, m.ativo, t.id AS tid, t.data_fim AS tfim, t.status FROM acl_aulas a
                JOIN acl_modulos m ON m.id = a.module_id JOIN acl_trilhas t ON t.id = m.track_id WHERE a.id = ?`, [aulaId]);
            if (!a || !a.ativo || ['rascunho', 'arquivada'].includes(a.status)) return res.status(404).json({ error: 'Aula não encontrada.' });
            const mat = await dbGet(`SELECT * FROM acl_matriculas WHERE track_id = ? AND colaborador_id = ? AND status != 'inativo'`, [a.tid, colab.id]);
            if (!mat) return res.status(403).json({ error: 'Você não está matriculado nesta trilha.' });
            const concluir = !(req.body && (req.body.concluida === false || req.body.concluida === 0));
            const h = hojeSP();
            const limite = [a.prazo, a.mfim, a.tfim].filter(Boolean).sort()[0] || null; // menor prazo aplicável
            const efetivo = mat.excecao_ate && mat.excecao_ate > (limite || '') ? mat.excecao_ate : limite;
            if (concluir && efetivo && h > efetivo) return res.status(409).json({ error: 'Esta aula está encerrada (prazo vencido). Procure o administrador para liberar uma exceção.' });
            if (concluir) await dbRun('INSERT OR IGNORE INTO acl_progresso (matricula_id, aula_id) VALUES (?, ?)', [mat.id, aulaId]);
            else await dbRun('DELETE FROM acl_progresso WHERE matricula_id = ? AND aula_id = ?', [mat.id, aulaId]);
            const pr = await progressoDaTrilha(a.tid);
            const pct = pr.porMatricula[mat.id] || 0;
            await sincronizarConclusao(mat.id, pct);
            res.json({ ok: true, progresso: pct, concluido_trilha: pct >= 100 });
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    // ═══ Conteúdo de demonstração (identificado como tal) ═════════════════════
    async function seedDemo() {
        const n = await dbGet('SELECT COUNT(*) n FROM acl_trilhas');
        if (n.n > 0) return;
        const h = hojeSP();
        const fim = new Date(h + 'T12:00:00'); fim.setDate(fim.getDate() + 90);
        const fimIso = fim.toISOString().slice(0, 10);
        const t = await dbRun(`INSERT INTO acl_trilhas (nome, descricao, objetivo, publico_json, data_inicio, data_fim, carga_horaria, gera_certificado, status, demonstracao)
            VALUES (?, ?, ?, ?, ?, ?, ?, 1, 'rascunho', 1)`,
            ['Academia de Sucesso — Líderes', 'Conteúdo de demonstração: trilha de desenvolvimento para líderes. Edite, publique e matricule os participantes.',
                'Desenvolver as competências de liderança, comunicação, gestão de pessoas, segurança e resultados.', JSON.stringify(['Líder']), h, fimIso, 40]);
        const modulos = [
            ['O Papel do Líder', ['O que significa ser líder', 'Diferença entre chefe e líder', 'Responsabilidade do líder', 'Liderança pelo exemplo']],
            ['Comunicação', ['Comunicação clara', 'Escuta ativa', 'Feedback', 'Comunicação com a equipe', 'Comunicação em situações difíceis']],
            ['Gestão de Pessoas', ['Perfil dos colaboradores', 'Motivação', 'Delegação', 'Acompanhamento', 'Desenvolvimento da equipe']],
            ['Gestão de Conflitos', ['Identificação de conflitos', 'Como agir', 'Conversas difíceis', 'Postura profissional']],
            ['Cultura e Comportamento', ['Cultura da empresa', 'Valores', 'Ética', 'Respeito', 'Comprometimento']],
            ['Segurança', ['Cultura de segurança', 'Responsabilidade do líder', 'Identificação de riscos', 'Prevenção', 'Segurança como responsabilidade de todos']],
            ['Gestão de Resultados', ['Metas', 'Indicadores', 'Acompanhamento', 'Produtividade', 'Organização']],
            ['Desenvolvimento do Líder', ['Autoconhecimento', 'Inteligência emocional', 'Tomada de decisão', 'Plano de desenvolvimento individual']]
        ];
        for (let i = 0; i < modulos.length; i++) {
            const m = await dbRun('INSERT INTO acl_modulos (track_id, titulo, descricao, ordem, ativo, demonstracao) VALUES (?, ?, ?, ?, 1, 1)',
                [t.lastID, `Módulo ${i + 1} — ${modulos[i][0]}`, 'Conteúdo de demonstração', i + 1]);
            for (let k = 0; k < modulos[i][1].length; k++) {
                await dbRun(`INSERT INTO acl_aulas (module_id, titulo, descricao, objetivo, conteudo, duracao_min, ordem, obrigatoria, demonstracao) VALUES (?, ?, ?, ?, ?, 15, ?, 1, 1)`,
                    [m.lastID, modulos[i][1][k], 'Conteúdo de demonstração', 'Conteúdo de demonstração — substitua pelo objetivo real da aula.', 'Conteúdo de demonstração.\n\nEdite esta aula para incluir o texto, vídeo, material de apoio ou link definitivos.', k + 1]);
            }
        }
        console.log('[ACL] Trilha de demonstração criada (rascunho).');
    }

    console.log('[ACADEMIA-LIDERES] Rotas registradas (/api/acl).');
};
