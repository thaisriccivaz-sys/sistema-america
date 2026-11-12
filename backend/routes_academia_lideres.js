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
    const PAGE_NORMAL = 'academia-lideres-normal';
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
        db.run(`CREATE TABLE IF NOT EXISTS acl_avaliacoes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            track_id INTEGER NOT NULL, module_id INTEGER, nome TEXT NOT NULL, descricao TEXT,
            nota_minima REAL DEFAULT 70, tentativas INTEGER DEFAULT 1, data_abertura TEXT, data_limite TEXT,
            obrigatoria INTEGER DEFAULT 1, ativo INTEGER DEFAULT 1, ordem INTEGER DEFAULT 0, demonstracao INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (track_id) REFERENCES acl_trilhas(id) ON DELETE CASCADE
        )`);
        db.run(`CREATE TABLE IF NOT EXISTS acl_perguntas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            quiz_id INTEGER NOT NULL, tipo TEXT NOT NULL, enunciado TEXT NOT NULL, ordem INTEGER DEFAULT 0
        )`);
        db.run(`CREATE TABLE IF NOT EXISTS acl_alternativas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            pergunta_id INTEGER NOT NULL, texto TEXT NOT NULL, correta INTEGER DEFAULT 0, ordem INTEGER DEFAULT 0
        )`);
        db.run(`CREATE TABLE IF NOT EXISTS acl_tentativas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            matricula_id INTEGER NOT NULL, quiz_id INTEGER NOT NULL, numero INTEGER DEFAULT 1,
            nota REAL, aprovado INTEGER DEFAULT 0, respostas_json TEXT, enviado_em DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);
        db.run(`CREATE TABLE IF NOT EXISTS acl_certificados (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            matricula_id INTEGER NOT NULL UNIQUE, track_id INTEGER NOT NULL, colaborador_id INTEGER NOT NULL,
            numero TEXT NOT NULL UNIQUE, nome_colaborador TEXT, nome_trilha TEXT, carga_horaria REAL DEFAULT 0,
            data_conclusao TEXT, emitido_em DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);
        db.run(`CREATE TABLE IF NOT EXISTS acl_missoes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            track_id INTEGER NOT NULL, module_id INTEGER, nome TEXT NOT NULL, descricao TEXT, objetivo TEXT, como_realizar TEXT,
            pontos_base INTEGER DEFAULT 20, pontos_bonus INTEGER DEFAULT 10, data_inicio TEXT, data_fim TEXT,
            status TEXT DEFAULT 'rascunho', permite_nova_tentativa INTEGER DEFAULT 1, demonstracao INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (track_id) REFERENCES acl_trilhas(id) ON DELETE CASCADE
        )`);
        db.run(`CREATE TABLE IF NOT EXISTS acl_missoes_envios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            mission_id INTEGER NOT NULL, matricula_id INTEGER NOT NULL, colaborador_id INTEGER NOT NULL,
            anotacoes TEXT NOT NULL, status TEXT DEFAULT 'em_analise', pontos_base INTEGER DEFAULT 0, pontos_bonus INTEGER DEFAULT 0,
            tentativa INTEGER DEFAULT 1, enviado_em DATETIME DEFAULT CURRENT_TIMESTAMP, avaliado_em DATETIME, avaliado_por INTEGER,
            motivo_recusa TEXT, pontos_concedidos INTEGER DEFAULT 0
        )`);
        db.run(`CREATE TABLE IF NOT EXISTS acl_missoes_anexos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            envio_id INTEGER NOT NULL, nome TEXT, mime TEXT, r2_key TEXT, tamanho INTEGER DEFAULT 0
        )`);
        db.run(`CREATE TABLE IF NOT EXISTS acl_pontos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            matricula_id INTEGER NOT NULL, colaborador_id INTEGER NOT NULL, track_id INTEGER NOT NULL, mission_id INTEGER,
            envio_id INTEGER NOT NULL UNIQUE, pontos_base INTEGER DEFAULT 0, pontos_bonus INTEGER DEFAULT 0, total INTEGER DEFAULT 0,
            motivo TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);
        db.run(`CREATE TABLE IF NOT EXISTS acl_usuario_vinculo (
            usuario_id INTEGER PRIMARY KEY,
            colaborador_id INTEGER NOT NULL,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);
        db.run(`CREATE INDEX IF NOT EXISTS idx_acl_miss_track ON acl_missoes (track_id)`);
        db.run(`CREATE INDEX IF NOT EXISTS idx_acl_env_miss ON acl_missoes_envios (mission_id, matricula_id)`);
        db.run(`CREATE INDEX IF NOT EXISTS idx_acl_pts_mat ON acl_pontos (matricula_id)`);
        db.run(`CREATE INDEX IF NOT EXISTS idx_acl_av_track ON acl_avaliacoes (track_id)`);
        db.run(`CREATE INDEX IF NOT EXISTS idx_acl_perg_quiz ON acl_perguntas (quiz_id)`);
        db.run(`CREATE INDEX IF NOT EXISTS idx_acl_tent_mat ON acl_tentativas (matricula_id, quiz_id)`);
        db.run(`CREATE INDEX IF NOT EXISTS idx_acl_mod_track ON acl_modulos (track_id)`);
        db.run(`CREATE INDEX IF NOT EXISTS idx_acl_aula_mod ON acl_aulas (module_id)`);
        db.run(`CREATE INDEX IF NOT EXISTS idx_acl_mat_track ON acl_matriculas (track_id)`);
        db.run(`CREATE INDEX IF NOT EXISTS idx_acl_prog_mat ON acl_progresso (matricula_id)`, () => { dbRun("UPDATE acl_trilhas SET status = 'publicada' WHERE status = 'rascunho' AND (demonstracao = 1 OR id IN (SELECT track_id FROM acl_matriculas))").catch(() => {}).then(() => seedDemo()).then(() => seedDemoAvaliacao()).then(() => seedDemoMissoes()).catch(e => console.error('[ACL] seed:', e.message)); });
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
    async function isAclAdmin(u) {
        return await temPagina(u, PAGE_ADMIN);
    }
    async function canGerenciarAcl(u) {
        return (await isAclAdmin(u)) || (await temPagina(u, PAGE_NORMAL));
    }
    const guardAdmin = [authenticateToken, async (req, res, next) => {
        try { if (await canGerenciarAcl(req.user)) return next(); return res.status(403).json({ error: 'Sem permissão para acessar Gerenciar Academia de Líderes.' }); }
        catch (e) { return res.status(500).json({ error: e.message }); }
    }];
    const guardAdminStrict = [authenticateToken, async (req, res, next) => {
        try { if (await isAclAdmin(req.user)) return next(); return res.status(403).json({ error: 'Apenas usuários com permissão Gerenciar Academia (Líderes) Admin podem vincular ou desvincular colaboradores.' }); }
        catch (e) { return res.status(500).json({ error: e.message }); }
    }];
    const guardMinha = [authenticateToken, async (req, res, next) => {
        try { if (await temPagina(req.user, PAGE_MINHA) || await canGerenciarAcl(req.user)) return next(); return res.status(403).json({ error: 'Sem permissão para acessar a Academia.' }); }
        catch (e) { return res.status(500).json({ error: e.message }); }
    }];

    const normTokens = s => norm(s).replace(/[._\-]+/g, ' ').replace(/\s+/g, ' ').trim();
    function matchUsuarioColab(u, todos) {
        if (!u) return null;
        if (u.email && String(u.email).includes('@')) {
            const mail = String(u.email).trim().toLowerCase();
            const byEmail = todos.find(x => x.email && String(x.email).trim().toLowerCase() === mail);
            if (byEmail) return byEmail;
        }
        const candidatos = [u.nome, u.username].map(normTokens).filter(Boolean);
        for (const cand of candidatos) {
            const exato = todos.find(x => normTokens(x.nome_completo) === cand);
            if (exato) return exato;
        }
        for (const cand of candidatos) {
            const toks = cand.split(' ').filter(w => w.length >= 2);
            if (toks.length >= 2) {
                const sub = todos.find(x => {
                    const words = normTokens(x.nome_completo).split(' ');
                    return toks.every(t => words.includes(t));
                });
                if (sub) return sub;
            }
        }
        return null;
    }

    // usuário logado → colaborador (sem nova senha/convite: reaproveita o cadastro existente)
    async function colabDoUsuario(user, req) {
        const uid = user && user.id;
        if (!uid) return null;
        const cols = 'id, nome_completo, cargo, departamento, email, foto_path, status';
        if (req && await temPagina(user, PAGE_ADMIN)) {
            const overrideId = parseInt((req.query && req.query.colab_id) || (req.body && req.body.colab_id), 10);
            if (overrideId > 0) {
                const c = await dbGet(`SELECT ${cols} FROM colaboradores WHERE id = ?`, [overrideId]);
                if (c) return c;
            }
        }
        try {
            const vinc = await dbGet('SELECT colaborador_id FROM acl_usuario_vinculo WHERE usuario_id = ?', [uid]);
            if (vinc && vinc.colaborador_id) { const c = await dbGet(`SELECT ${cols} FROM colaboradores WHERE id = ?`, [vinc.colaborador_id]); if (c) return c; }
        } catch (e) { /* segue */ }
        try {
            const cfg = await dbGet('SELECT colaborador_id FROM app_lider_config WHERE usuario_id = ?', [uid]);
            if (cfg && cfg.colaborador_id) { const c = await dbGet(`SELECT ${cols} FROM colaboradores WHERE id = ?`, [cfg.colaborador_id]); if (c) return c; }
        } catch (e) { /* tabela pode não existir */ }
        const u = await dbGet('SELECT id, username, nome, email FROM usuarios WHERE id = ?', [uid]);
        const todos = await dbAll(`SELECT ${cols} FROM colaboradores WHERE status NOT LIKE 'Desligado%'
            ORDER BY (SELECT COUNT(*) FROM acl_matriculas m WHERE m.colaborador_id = colaboradores.id AND m.status != 'inativo') DESC, id ASC`);
        return matchUsuarioColab(u, todos);
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

    // ── Progresso obrigatório: aulas obrigatórias + avaliações obrigatórias (missões NUNCA entram) ──
    async function itensObrigatorios(trackId) {
        const aulas = await dbAll(`SELECT a.id FROM acl_aulas a JOIN acl_modulos m ON m.id = a.module_id WHERE m.track_id = ? AND m.ativo = 1 AND a.obrigatoria = 1`, [trackId]);
        const quizzes = await dbAll(`SELECT q.id FROM acl_avaliacoes q WHERE q.track_id = ? AND q.ativo = 1 AND q.obrigatoria = 1
            AND EXISTS (SELECT 1 FROM acl_perguntas p WHERE p.quiz_id = q.id)
            AND (q.module_id IS NULL OR q.module_id IN (SELECT id FROM acl_modulos WHERE ativo = 1))`, [trackId]);
        return { aulas: new Set(aulas.map(a => a.id)), quizzes: new Set(quizzes.map(q => q.id)) };
    }
    async function progressoDaTrilha(trackId) {
        const it = await itensObrigatorios(trackId);
        const total = it.aulas.size + it.quizzes.size;
        const mats = await dbAll('SELECT id, colaborador_id, status FROM acl_matriculas WHERE track_id = ?', [trackId]);
        const out = {};
        if (!mats.length) return { total, porMatricula: out };
        const prog = await dbAll(`SELECT p.matricula_id, p.aula_id FROM acl_progresso p JOIN acl_matriculas m ON m.id = p.matricula_id WHERE m.track_id = ?`, [trackId]);
        const apr = await dbAll(`SELECT DISTINCT t.matricula_id, t.quiz_id FROM acl_tentativas t JOIN acl_matriculas m ON m.id = t.matricula_id WHERE m.track_id = ? AND t.aprovado = 1`, [trackId]);
        const cont = {};
        prog.forEach(p => { if (it.aulas.has(p.aula_id)) cont[p.matricula_id] = (cont[p.matricula_id] || 0) + 1; });
        apr.forEach(a => { if (it.quizzes.has(a.quiz_id)) cont[a.matricula_id] = (cont[a.matricula_id] || 0) + 1; });
        mats.forEach(m => { out[m.id] = total ? Math.min(100, Math.round(((cont[m.id] || 0) * 100) / total)) : 0; });
        return { total, porMatricula: out };
    }
    async function sincronizarConclusao(matriculaId, pct) {
        const m = await dbGet('SELECT id, status FROM acl_matriculas WHERE id = ?', [matriculaId]);
        if (!m || m.status === 'inativo') return;
        if (pct >= 100 && m.status !== 'concluido') await dbRun(`UPDATE acl_matriculas SET status = 'concluido', data_conclusao = ? WHERE id = ?`, [hojeSP(), matriculaId]);
        else if (pct < 100 && m.status === 'concluido') await dbRun(`UPDATE acl_matriculas SET status = 'ativo', data_conclusao = NULL WHERE id = ?`, [matriculaId]);
        if (pct >= 100) { try { await emitirCertificado(matriculaId); } catch (e) { console.error('[ACL] certificado:', e.message); } }
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
        const avs = await q('SELECT COUNT(*) n FROM acl_avaliacoes WHERE track_id = ?', [t.id]);
        return { qtd_modulos: mods, qtd_aulas: aulas, qtd_avaliacoes: avs, qtd_missoes: (await q('SELECT COUNT(*) n FROM acl_missoes WHERE track_id = ?', [t.id])), qtd_participantes: part, progresso_medio: media };
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
            const missFora = await dbAll('SELECT nome FROM acl_missoes WHERE track_id = ? AND ((data_fim IS NOT NULL AND data_fim != \'\' AND ((? IS NOT NULL AND data_fim > ?) OR (? IS NOT NULL AND data_fim < ?))) OR (data_inicio IS NOT NULL AND data_inicio != \'\' AND (? IS NOT NULL AND data_inicio < ?)))', [id, t.data_fim, t.data_fim, t.data_inicio, t.data_inicio, t.data_inicio, t.data_inicio]);
            if (missFora.length) return res.status(409).json({ error: `O novo prazo deixa missões fora do período da trilha: ${missFora.slice(0, 3).map(x => x.nome).join(', ')}. Ajuste os prazos das missões antes.` });
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
            await apagarEnvios('e.mission_id IN (SELECT id FROM acl_missoes WHERE track_id = ?)', [id]);
            await dbRun('DELETE FROM acl_missoes WHERE track_id = ?', [id]);
            await dbRun('DELETE FROM acl_tentativas WHERE matricula_id IN (SELECT id FROM acl_matriculas WHERE track_id = ?)', [id]);
            await dbRun('DELETE FROM acl_alternativas WHERE pergunta_id IN (SELECT p.id FROM acl_perguntas p JOIN acl_avaliacoes q ON q.id = p.quiz_id WHERE q.track_id = ?)', [id]);
            await dbRun('DELETE FROM acl_perguntas WHERE quiz_id IN (SELECT id FROM acl_avaliacoes WHERE track_id = ?)', [id]);
            await dbRun('DELETE FROM acl_avaliacoes WHERE track_id = ?', [id]);
            await dbRun('DELETE FROM acl_certificados WHERE track_id = ?', [id]);
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
            res.json(Object.assign(resumoTrilha(t, await contagensTrilha(t)), { modulos: await estruturaTrilha(id, false), avaliacoes: await listarAvaliacoes(id), missoes: await listarMissoes(id) }));
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
            await dbRun('UPDATE acl_avaliacoes SET module_id = NULL WHERE module_id = ?', [id]);
            await dbRun('UPDATE acl_missoes SET module_id = NULL WHERE module_id = ?', [id]);
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
                const colab = await colabDoUsuario(req.user, req);
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
            const rows = await dbAll(`SELECT c.id, c.nome_completo, c.cargo, c.departamento, c.email, c.status,
                (SELECT 1 FROM acl_matriculas m WHERE m.track_id = ? AND m.colaborador_id = c.id) AS matriculado
                FROM colaboradores c WHERE c.status IN ('Ativo', 'Férias', 'Processo iniciado') ORDER BY c.nome_completo COLLATE NOCASE`, [tid]);
            const usuarios = await dbAll('SELECT id, username, nome, email FROM usuarios WHERE ativo = 1 ORDER BY username COLLATE NOCASE');
            const vinculos = await dbAll('SELECT usuario_id, colaborador_id FROM acl_usuario_vinculo');
            const cfgLider = await dbAll('SELECT usuario_id, colaborador_id FROM app_lider_config WHERE usuario_id IS NOT NULL').catch(() => []);
            const mats = await dbAll(`SELECT m.id AS matricula_id, m.track_id, m.colaborador_id, m.status, t.nome AS trilha_nome
                FROM acl_matriculas m JOIN acl_trilhas t ON t.id = m.track_id ORDER BY t.id DESC`);
            const progPorTrilha = {};
            const trackIds = [...new Set(mats.map(m => m.track_id))];
            for (const tk of trackIds) progPorTrilha[tk] = (await progressoDaTrilha(tk)).porMatricula;
            const ptsAll = await dbAll('SELECT colaborador_id, COUNT(*) missoes, COALESCE(SUM(total), 0) pontos FROM acl_pontos GROUP BY colaborador_id');
            const ptsPorColab = {}; ptsAll.forEach(p => { ptsPorColab[p.colaborador_id] = p; });

            const vincManualPorColab = {};
            cfgLider.forEach(v => { if (v.colaborador_id && v.usuario_id) vincManualPorColab[v.colaborador_id] = v.usuario_id; });
            vinculos.forEach(v => { if (v.colaborador_id && v.usuario_id) vincManualPorColab[v.colaborador_id] = v.usuario_id; });

            const matsPorColab = {};
            mats.forEach(m => {
                if (!matsPorColab[m.colaborador_id]) matsPorColab[m.colaborador_id] = [];
                matsPorColab[m.colaborador_id].push({
                    matricula_id: m.matricula_id, track_id: m.track_id, trilha_nome: m.trilha_nome, status: m.status,
                    progresso: (progPorTrilha[m.track_id] || {})[m.matricula_id] || 0
                });
            });

            res.json(rows.map(r => {
                let usu = null, manual = false;
                if (vincManualPorColab[r.id]) {
                    usu = usuarios.find(u => u.id === vincManualPorColab[r.id]) || null;
                    manual = !!usu;
                }
                if (!usu) {
                    usu = usuarios.find(u => {
                        const m = matchUsuarioColab(u, [r]);
                        return m && m.id === r.id;
                    }) || null;
                }
                const ms = matsPorColab[r.id] || [];
                const pt = ptsPorColab[r.id] || { missoes: 0, pontos: 0 };
                return {
                    id: r.id, nome: r.nome_completo, cargo: r.cargo || '', departamento: r.departamento || '', status: r.status,
                    matriculado: !!r.matriculado, foto: fotoUrl(r.id),
                    usuario_id: usu ? usu.id : null, usuario_login: usu ? (usu.username || usu.nome) : null, vinculo_manual: manual,
                    trilhas: ms, missoes: pt.missoes, pontos: pt.pontos
                };
            }));
        } catch (e) { res.status(500).json({ error: e.message }); }
    });
    app.get('/api/acl/usuarios-ativos', guardAdmin, async (req, res) => {
        try {
            const rows = await dbAll('SELECT id, username, nome, email, role, departamento FROM usuarios WHERE ativo = 1 ORDER BY username COLLATE NOCASE');
            res.json(rows);
        } catch (e) { res.status(500).json({ error: e.message }); }
    });
    app.post('/api/acl/vincular-usuario', guardAdminStrict, async (req, res) => {
        try {
            const uid = parseInt(req.body && req.body.usuario_id, 10) || 0;
            const cid = parseInt(req.body && req.body.colaborador_id, 10) || 0;
            if (!cid) return res.status(400).json({ error: 'Informe o colaborador.' });
            await dbRun('DELETE FROM acl_usuario_vinculo WHERE colaborador_id = ?', [cid]);
            if (uid > 0) {
                await dbRun('INSERT OR REPLACE INTO acl_usuario_vinculo (usuario_id, colaborador_id, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)', [uid, cid]);
            }
            res.json({ ok: true });
        } catch (e) { res.status(500).json({ error: e.message }); }
    });
    app.get('/api/acl/trilhas/:id/participantes', guardAdmin, async (req, res) => {
        try {
            const tid = parseInt(req.params.id, 10);
            const pr = await progressoDaTrilha(tid);
            const ptsMap = {};
            (await dbAll('SELECT matricula_id, COUNT(*) n, SUM(total) p FROM acl_pontos WHERE track_id = ? GROUP BY matricula_id', [tid])).forEach(x => { ptsMap[x.matricula_id] = x; });
            const rows = await dbAll(`SELECT m.id AS matricula_id, m.status, m.data_matricula, m.data_conclusao, m.excecao_ate, c.id AS colaborador_id, c.nome_completo, c.cargo, c.departamento
                FROM acl_matriculas m JOIN colaboradores c ON c.id = m.colaborador_id WHERE m.track_id = ? ORDER BY c.nome_completo COLLATE NOCASE`, [tid]);
            res.json({ total_obrigatorias: pr.total, participantes: rows.map(r => ({
                matricula_id: r.matricula_id, colaborador_id: r.colaborador_id, nome: r.nome_completo, cargo: r.cargo || '', departamento: r.departamento || '',
                foto: fotoUrl(r.colaborador_id), status: r.status, progresso: pr.porMatricula[r.matricula_id] || 0,
                data_matricula: r.data_matricula, data_conclusao: r.data_conclusao, excecao_ate: r.excecao_ate,
                evolucao: null, missoes: (ptsMap[r.matricula_id] || {}).n || 0, pontos: (ptsMap[r.matricula_id] || {}).p || 0 // evolução: fase 4
            })) });
        } catch (e) { res.status(500).json({ error: e.message }); }
    });
    app.post('/api/acl/trilhas/:id/matriculas', guardAdminStrict, async (req, res) => {
        try {
            const tid = parseInt(req.params.id, 10);
            const ids = Array.isArray(req.body && req.body.colaborador_ids) ? req.body.colaborador_ids.map(Number).filter(Boolean) : [];
            if (!ids.length) return res.status(400).json({ error: 'Selecione ao menos um colaborador.' });
            // Se a trilha estava em rascunho ao receber matrículas, promover para publicada para que apareça imediatamente aos participantes
            await dbRun("UPDATE acl_trilhas SET status = 'publicada', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'rascunho'", [tid]);
            const usuariosAtivos = await dbAll('SELECT id, username, nome, email FROM usuarios WHERE ativo = 1');
            let novos = 0;
            for (const cid of ids) {
                const r = await dbRun('INSERT OR IGNORE INTO acl_matriculas (track_id, colaborador_id, status, data_matricula) VALUES (?, ?, \'ativo\', ?)', [tid, cid, hojeSP()]);
                if (r.changes) novos++;
                // Garantir vínculo automático em acl_usuario_vinculo se ainda não houver
                const jaVinc = await dbGet('SELECT usuario_id FROM acl_usuario_vinculo WHERE colaborador_id = ?', [cid]);
                if (!jaVinc) {
                    const col = await dbGet('SELECT id, nome_completo, email FROM colaboradores WHERE id = ?', [cid]);
                    if (col) {
                        const usuMatch = usuariosAtivos.find(u => {
                            const m = matchUsuarioColab(u, [col]);
                            return m && m.id === col.id;
                        });
                        if (usuMatch) {
                            await dbRun('INSERT OR IGNORE INTO acl_usuario_vinculo (usuario_id, colaborador_id, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)', [usuMatch.id, col.id]);
                        }
                    }
                }
            }
            res.json({ ok: true, novos });
        } catch (e) { res.status(500).json({ error: e.message }); }
    });
    app.delete('/api/acl/matriculas/:id', guardAdminStrict, async (req, res) => {
        try {
            const id = parseInt(req.params.id, 10);
            await dbRun('DELETE FROM acl_progresso WHERE matricula_id = ?', [id]);
            await dbRun('DELETE FROM acl_tentativas WHERE matricula_id = ?', [id]);
            await apagarEnvios('e.matricula_id = ?', [id]);
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
            const isAdminFull = await isAclAdmin(req.user);
            res.json({
                is_admin_full: isAdminFull,
                total_colaboradores: totalColab.n, participantes: totalPart, ativos, concluidos, em_desenvolvimento: emDesenv, nao_iniciaram: naoIniciaram,
                trilhas_cadastradas: trilhas.length, missoes_pendentes: (await dbGet("SELECT COUNT(*) n FROM acl_missoes_envios WHERE status = 'em_analise'")).n, trilhas_concluidas: concluidos,
                media_conclusao: nPct ? Math.round(somaPct / nPct) : 0, certificados_emitidos: (await dbGet('SELECT COUNT(*) n FROM acl_certificados')).n, por_trilha: porTrilha
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
        const tent = {};
        (await dbAll('SELECT quiz_id, COUNT(*) n, MAX(aprovado) ap, MAX(nota) melhor FROM acl_tentativas WHERE matricula_id = ? GROUP BY quiz_id', [mat.id])).forEach(x => { tent[x.quiz_id] = x; });
        const modIds = new Set(mods.map(m => m.id));
        const quizzes = (await dbAll(`SELECT q.*, (SELECT COUNT(*) FROM acl_perguntas p WHERE p.quiz_id = q.id) AS qtd_perguntas FROM acl_avaliacoes q WHERE q.track_id = ? AND q.ativo = 1 ORDER BY q.ordem, q.id`, [trackId]))
            .filter(q => q.qtd_perguntas > 0 && (!q.module_id || modIds.has(q.module_id)));
        const avs = quizzes.map(q => {
            const t = tent[q.id] || { n: 0, ap: 0, melhor: null };
            return { id: q.id, nome: q.nome, descricao: q.descricao, module_id: q.module_id, nota_minima: q.nota_minima, tentativas: q.tentativas, usadas: t.n, melhor_nota: t.melhor,
                aprovada: !!t.ap, obrigatoria: !!q.obrigatoria, data_abertura: q.data_abertura, data_limite: q.data_limite, demonstracao: q.demonstracao, qtd_perguntas: q.qtd_perguntas,
                situacao: situacaoAvaliacao(q, t.n, !!t.ap, mat.excecao_ate) };
        });
        let totalAulas = 0, feitasAulas = 0, proximoModulo = null, proximaAula = null;
        mods.forEach(m => {
            m.encerrado = !!(m.data_fim && h > m.data_fim);
            m.aulas.forEach(a => {
                a.concluida = feitas.has(a.id);
                a.encerrada = !!((a.prazo && h > a.prazo) || m.encerrado || (trilha.data_fim && h > trilha.data_fim));
                if (a.obrigatoria) { totalAulas++; if (a.concluida) feitasAulas++; }
                if (!a.concluida && a.obrigatoria && !proximaAula) { proximaAula = { tipo: 'aula', id: a.id, titulo: a.titulo, modulo: m.titulo }; proximoModulo = m.titulo; }
            });
            m.avaliacoes = avs.filter(a => a.module_id === m.id);
            const obrA = m.aulas.filter(a => a.obrigatoria), obrQ = m.avaliacoes.filter(a => a.obrigatoria);
            const tot = obrA.length + obrQ.length;
            m.progresso = tot ? Math.round((obrA.filter(a => a.concluida).length + obrQ.filter(a => a.aprovada).length) * 100 / tot) : 0;
        });
        const gerais = avs.filter(a => !a.module_id);
        const obrQAll = avs.filter(a => a.obrigatoria);
        if (!proximaAula) { const q = obrQAll.find(a => !a.aprovada); if (q) { const mm = mods.find(x => x.id === q.module_id); proximaAula = { tipo: 'avaliacao', id: q.id, titulo: q.nome, modulo: mm ? mm.titulo : 'Avaliação geral' }; proximoModulo = proximaAula.modulo; } }
        const totalItens = totalAulas + obrQAll.length, feitosItens = feitasAulas + obrQAll.filter(a => a.aprovada).length;
        const pct = totalItens ? Math.round(feitosItens * 100 / totalItens) : 0;
        const cert = await dbGet('SELECT id, numero FROM acl_certificados WHERE matricula_id = ?', [mat.id]);
        const ptsRow = await dbGet('SELECT COUNT(*) n, COALESCE(SUM(total), 0) p FROM acl_pontos WHERE matricula_id = ?', [mat.id]);
        const missoesJ = await missoesDaJornada(trilha, mat);
        const hist = await dbAll('SELECT motivo AS missao, pontos_base, pontos_bonus, total, created_at AS data FROM acl_pontos WHERE matricula_id = ? ORDER BY id DESC', [mat.id]);
        return {
            colaborador: colab && { id: colab.id, nome: colab.nome_completo, cargo: colab.cargo, departamento: colab.departamento, foto: fotoUrl(colab.id) },
            matricula: { id: mat.id, status: mat.status, data_matricula: mat.data_matricula, data_conclusao: mat.data_conclusao, excecao_ate: mat.excecao_ate },
            trilha: resumoTrilha(trilha), modulos: mods, avaliacoes_gerais: gerais,
            progresso: { obrigatorio: pct, itens_obrigatorios: totalItens, itens_concluidos: feitosItens, aulas_obrigatorias: totalAulas, aulas_concluidas: feitasAulas,
                avaliacoes_obrigatorias: obrQAll.length, avaliacoes_aprovadas: obrQAll.filter(a => a.aprovada).length, missoes_realizadas: ptsRow.n, pontos_bonus: ptsRow.p },
            missoes: missoesJ, pontos_historico: hist,
            certificado: cert ? { id: cert.id, numero: cert.numero } : null,
            proximo_modulo: proximoModulo, proxima_aula: proximaAula
        };
    }
    async function jornadaPreviewAdmin(trackId) {
        const trilha = await dbGet('SELECT * FROM acl_trilhas WHERE id = ?', [trackId]);
        if (!trilha) return null;
        const mods = await estruturaTrilha(trackId, true);
        const h = hojeSP();
        const modIds = new Set(mods.map(m => m.id));
        const quizzes = (await dbAll(`SELECT q.*, (SELECT COUNT(*) FROM acl_perguntas p WHERE p.quiz_id = q.id) AS qtd_perguntas FROM acl_avaliacoes q WHERE q.track_id = ? AND q.ativo = 1 ORDER BY q.ordem, q.id`, [trackId]))
            .filter(q => q.qtd_perguntas > 0 && (!q.module_id || modIds.has(q.module_id)));
        const avs = quizzes.map(q => ({
            id: q.id, nome: q.nome, descricao: q.descricao, module_id: q.module_id, nota_minima: q.nota_minima, tentativas: q.tentativas,
            usadas: 0, melhor_nota: null, aprovada: false, obrigatoria: !!q.obrigatoria, data_abertura: q.data_abertura, data_limite: q.data_limite,
            demonstracao: q.demonstracao, qtd_perguntas: q.qtd_perguntas, situacao: situacaoAvaliacao(q, 0, false, null)
        }));
        let totalAulas = 0, proximoModulo = null, proximaAula = null;
        mods.forEach(m => {
            m.encerrado = !!(m.data_fim && h > m.data_fim);
            m.aulas.forEach(a => {
                a.concluida = false;
                a.encerrada = !!((a.prazo && h > a.prazo) || m.encerrado || (trilha.data_fim && h > trilha.data_fim));
                if (a.obrigatoria) { totalAulas++; if (!proximaAula) { proximaAula = { tipo: 'aula', id: a.id, titulo: a.titulo, modulo: m.titulo }; proximoModulo = m.titulo; } }
            });
            m.avaliacoes = avs.filter(a => a.module_id === m.id);
            m.progresso = 0;
        });
        const gerais = avs.filter(a => !a.module_id);
        const obrQAll = avs.filter(a => a.obrigatoria);
        const totalItens = totalAulas + obrQAll.length;
        const ms = await dbAll(`SELECT m.* FROM acl_missoes m WHERE m.track_id = ? AND m.status != 'rascunho' ORDER BY m.id ASC`, [trackId]);
        const missoesJ = ms.map(m => ({
            id: m.id, nome: m.nome, descricao: m.descricao, module_id: m.module_id, pontos_base: m.pontos_base, pontos_bonus: m.pontos_bonus,
            data_inicio: m.data_inicio || trilha.data_inicio, data_fim: m.data_fim || trilha.data_fim, demonstracao: m.demonstracao,
            prazo_situacao: situacaoPrazoMissao(m, trilha, null), envio: null, pode_realizar: false
        }));
        return {
            modo_preview_admin: true,
            colaborador: { id: 0, nome: 'Visão do Administrador', cargo: 'Administrador', departamento: 'Administração', foto: null },
            matricula: { id: 0, status: 'ativo', data_matricula: h, data_conclusao: null, excecao_ate: null },
            trilha: resumoTrilha(trilha), modulos: mods, avaliacoes_gerais: gerais,
            progresso: { obrigatorio: 0, itens_obrigatorios: totalItens, itens_concluidos: 0, aulas_obrigatorias: totalAulas, aulas_concluidas: 0,
                avaliacoes_obrigatorias: obrQAll.length, avaliacoes_aprovadas: 0, missoes_realizadas: 0, pontos_bonus: 0 },
            missoes: missoesJ, pontos_historico: [], certificado: null, proximo_modulo: proximoModulo, proxima_aula: proximaAula
        };
    }

    app.get('/api/acl/minha', guardMinha, async (req, res) => {
        try {
            const isAdmin = await temPagina(req.user, PAGE_ADMIN);
            const colab = await colabDoUsuario(req.user, req);
            let adminOpcoes = [];
            if (isAdmin) {
                adminOpcoes = await dbAll(`SELECT c.id, c.nome_completo AS nome, c.cargo, c.departamento,
                    (SELECT COUNT(*) FROM acl_matriculas m WHERE m.colaborador_id = c.id AND m.status != 'inativo') AS qtd_trilhas
                    FROM colaboradores c WHERE c.status IN ('Ativo', 'Férias', 'Processo iniciado')
                    ORDER BY qtd_trilhas DESC, c.nome_completo COLLATE NOCASE`);
            }
            if (!colab) {
                if (!isAdmin) return res.json({ vinculado: false, is_admin: false, trilhas: [] });
                // Admin sem vínculo direto a colaborador: exibe todas as trilhas em modo visualização
                const todasTrilhas = await dbAll(`SELECT id FROM acl_trilhas WHERE status != 'arquivada' ORDER BY id DESC`);
                const trilhas = [];
                for (const t of todasTrilhas) {
                    const j = await jornadaPreviewAdmin(t.id);
                    if (j) trilhas.push({ trilha: j.trilha, matricula: j.matricula, progresso: j.progresso, certificado: null, proximo_modulo: j.proximo_modulo, proxima_aula: j.proxima_aula,
                        qtd_modulos: j.modulos.length, qtd_aulas: j.modulos.reduce((n, x) => n + x.aulas.length, 0), modo_preview_admin: true });
                }
                const u = await dbGet('SELECT username, nome FROM usuarios WHERE id = ?', [req.user.id]);
                return res.json({
                    vinculado: true, is_admin: true, modo_preview_admin: true,
                    colaborador: { id: 0, nome: (u && (u.nome || u.username)) || 'Administrador', cargo: 'Administrador', departamento: 'Visão Geral', foto: null },
                    trilhas, admin_colaboradores: adminOpcoes
                });
            }
            const mats = await dbAll(`SELECT m.track_id FROM acl_matriculas m JOIN acl_trilhas t ON t.id = m.track_id
                WHERE m.colaborador_id = ? AND m.status != 'inativo' AND (t.status != 'arquivada' OR ? = 1) ORDER BY t.id DESC`, [colab.id, isAdmin ? 1 : 0]);
            const trilhas = [];
            for (const m of mats) {
                const j = await jornadaDoColab(m.track_id, colab.id);
                if (j) trilhas.push({ trilha: j.trilha, matricula: j.matricula, progresso: j.progresso, certificado: j.certificado, proximo_modulo: j.proximo_modulo, proxima_aula: j.proxima_aula,
                    qtd_modulos: j.modulos.length, qtd_aulas: j.modulos.reduce((n, x) => n + x.aulas.length, 0) });
            }
            // Se é admin e o colaborador selecionado ainda não está matriculado em nenhuma trilha, mostrar também as trilhas disponíveis para visualizar/matricular
            let trilhasDisponiveisAdmin = [];
            if (isAdmin && !trilhas.length) {
                const todasTrilhas = await dbAll(`SELECT id FROM acl_trilhas WHERE status != 'arquivada' ORDER BY id DESC`);
                for (const t of todasTrilhas) {
                    const j = await jornadaPreviewAdmin(t.id);
                    if (j) trilhasDisponiveisAdmin.push({ trilha: j.trilha, matricula: j.matricula, progresso: j.progresso, certificado: null, proximo_modulo: j.proximo_modulo, proxima_aula: j.proxima_aula,
                        qtd_modulos: j.modulos.length, qtd_aulas: j.modulos.reduce((n, x) => n + x.aulas.length, 0), modo_preview_admin: true });
                }
            }
            res.json({
                vinculado: true, is_admin: isAdmin,
                colaborador: { id: colab.id, nome: colab.nome_completo, cargo: colab.cargo, departamento: colab.departamento, foto: fotoUrl(colab.id) },
                trilhas: trilhas.length ? trilhas : trilhasDisponiveisAdmin,
                sem_matricula_propria: isAdmin && !trilhas.length,
                admin_colaboradores: adminOpcoes
            });
        } catch (e) { res.status(500).json({ error: e.message }); }
    });
    app.get('/api/acl/minha/trilhas/:id', guardMinha, async (req, res) => {
        try {
            const isAdmin = await temPagina(req.user, PAGE_ADMIN);
            const colab = await colabDoUsuario(req.user, req);
            const tid = parseInt(req.params.id, 10);
            if (colab) {
                const j = await jornadaDoColab(tid, colab.id);
                if (j && (j.trilha.status !== 'arquivada' || isAdmin)) return res.json(j);
            }
            if (isAdmin) {
                const jp = await jornadaPreviewAdmin(tid);
                if (jp) return res.json(jp);
            }
            if (!colab) return res.status(404).json({ error: 'Seu usuário não está vinculado a um colaborador.' });
            return res.status(404).json({ error: 'Trilha não disponível para você.' });
        } catch (e) { res.status(500).json({ error: e.message }); }
    });
    app.post('/api/acl/minha/aulas/:id/concluir', guardMinha, async (req, res) => {
        try {
            const colab = await colabDoUsuario(req.user, req);
            if (!colab) return res.status(404).json({ error: 'Seu usuário não está vinculado a um colaborador.' });
            const aulaId = parseInt(req.params.id, 10);
            const a = await dbGet(`SELECT a.id, a.prazo, m.id AS mid, m.data_fim AS mfim, m.ativo, t.id AS tid, t.data_fim AS tfim, t.status FROM acl_aulas a
                JOIN acl_modulos m ON m.id = a.module_id JOIN acl_trilhas t ON t.id = m.track_id WHERE a.id = ?`, [aulaId]);
            if (!a || !a.ativo || a.status === 'arquivada') return res.status(404).json({ error: 'Aula não encontrada.' });
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

    // ═══════════════════════════════════════════════════════════════════════════
    //  FASE 2 — Avaliações, resultados, desempenho e certificados
    //  Regras: nota mínima padrão 70%; só perguntas objetivas (múltipla escolha e V/F) entram na nota;
    //  perguntas abertas ficam registradas para leitura do admin; avaliação obrigatória aprovada conta no progresso.
    // ═══════════════════════════════════════════════════════════════════════════
    async function listarAvaliacoes(trackId) {
        const rows = await dbAll(`SELECT q.*, (SELECT COUNT(*) FROM acl_perguntas p WHERE p.quiz_id = q.id) AS qtd_perguntas,
            (SELECT COUNT(*) FROM acl_tentativas t WHERE t.quiz_id = q.id) AS qtd_tentativas,
            (SELECT COUNT(DISTINCT t.matricula_id) FROM acl_tentativas t WHERE t.quiz_id = q.id AND t.aprovado = 1) AS qtd_aprovados
            FROM acl_avaliacoes q WHERE q.track_id = ? ORDER BY q.ordem ASC, q.id ASC`, [trackId]);
        return rows;
    }
    function lerAvaliacao(b, trilha) {
        const a = {
            nome: txt(b.nome, 200), descricao: txt(b.descricao),
            module_id: parseInt(b.module_id, 10) || null,
            nota_minima: Math.min(100, Math.max(0, parseFloat(b.nota_minima))), tentativas: Math.max(1, parseInt(b.tentativas, 10) || 1),
            data_abertura: isoDate(b.data_abertura), data_limite: isoDate(b.data_limite),
            obrigatoria: b.obrigatoria === false || b.obrigatoria === 0 || b.obrigatoria === '0' ? 0 : 1,
            ativo: b.ativo === false || b.ativo === 0 || b.ativo === '0' ? 0 : 1
        };
        if (isNaN(a.nota_minima)) a.nota_minima = 70;
        if (!a.nome) return { erro: 'Informe o nome da avaliação.' };
        const e1 = validaIntervalo(a.data_abertura, a.data_limite, 'da avaliação'); if (e1) return { erro: e1 };
        if (!dentro(trilha.data_inicio, trilha.data_fim, a.data_abertura, a.data_limite)) return { erro: 'O prazo da avaliação deve estar dentro do prazo da trilha.' };
        return { a };
    }
    app.get('/api/acl/trilhas/:id/avaliacoes', guardAdmin, async (req, res) => {
        try { res.json(await listarAvaliacoes(parseInt(req.params.id, 10))); } catch (e) { res.status(500).json({ error: e.message }); }
    });
    app.post('/api/acl/trilhas/:id/avaliacoes', guardAdmin, async (req, res) => {
        try {
            const tid = parseInt(req.params.id, 10);
            const trilha = await dbGet('SELECT * FROM acl_trilhas WHERE id = ?', [tid]);
            if (!trilha) return res.status(404).json({ error: 'Trilha não encontrada.' });
            const r = lerAvaliacao(req.body || {}, trilha); if (r.erro) return res.status(400).json({ error: r.erro });
            if (r.a.module_id) { const m = await dbGet('SELECT id FROM acl_modulos WHERE id = ? AND track_id = ?', [r.a.module_id, tid]); if (!m) return res.status(400).json({ error: 'O módulo precisa pertencer a esta trilha.' }); }
            const ord = await dbGet('SELECT COALESCE(MAX(ordem), 0) + 1 AS o FROM acl_avaliacoes WHERE track_id = ?', [tid]);
            const ins = await dbRun(`INSERT INTO acl_avaliacoes (track_id, module_id, nome, descricao, nota_minima, tentativas, data_abertura, data_limite, obrigatoria, ativo, ordem)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [tid, r.a.module_id, r.a.nome, r.a.descricao, r.a.nota_minima, r.a.tentativas, r.a.data_abertura, r.a.data_limite, r.a.obrigatoria, r.a.ativo, ord.o]);
            res.json({ ok: true, id: ins.lastID });
        } catch (e) { res.status(500).json({ error: e.message }); }
    });
    app.put('/api/acl/avaliacoes/:id', guardAdmin, async (req, res) => {
        try {
            const id = parseInt(req.params.id, 10);
            const atual = await dbGet('SELECT * FROM acl_avaliacoes WHERE id = ?', [id]);
            if (!atual) return res.status(404).json({ error: 'Avaliação não encontrada.' });
            const trilha = await dbGet('SELECT * FROM acl_trilhas WHERE id = ?', [atual.track_id]);
            const r = lerAvaliacao(Object.assign({}, atual, req.body || {}), trilha); if (r.erro) return res.status(400).json({ error: r.erro });
            if (r.a.module_id) { const m = await dbGet('SELECT id FROM acl_modulos WHERE id = ? AND track_id = ?', [r.a.module_id, atual.track_id]); if (!m) return res.status(400).json({ error: 'O módulo precisa pertencer a esta trilha.' }); }
            await dbRun(`UPDATE acl_avaliacoes SET module_id = ?, nome = ?, descricao = ?, nota_minima = ?, tentativas = ?, data_abertura = ?, data_limite = ?, obrigatoria = ?, ativo = ? WHERE id = ?`,
                [r.a.module_id, r.a.nome, r.a.descricao, r.a.nota_minima, r.a.tentativas, r.a.data_abertura, r.a.data_limite, r.a.obrigatoria, r.a.ativo, id]);
            res.json({ ok: true });
        } catch (e) { res.status(500).json({ error: e.message }); }
    });
    async function apagarPerguntasDaAvaliacao(id) {
        await dbRun('DELETE FROM acl_alternativas WHERE pergunta_id IN (SELECT id FROM acl_perguntas WHERE quiz_id = ?)', [id]);
        await dbRun('DELETE FROM acl_perguntas WHERE quiz_id = ?', [id]);
    }
    app.delete('/api/acl/avaliacoes/:id', guardAdmin, async (req, res) => {
        try {
            const id = parseInt(req.params.id, 10);
            await dbRun('DELETE FROM acl_tentativas WHERE quiz_id = ?', [id]);
            await apagarPerguntasDaAvaliacao(id);
            await dbRun('DELETE FROM acl_avaliacoes WHERE id = ?', [id]);
            res.json({ ok: true });
        } catch (e) { res.status(500).json({ error: e.message }); }
    });
    async function avaliacaoCompleta(id, comGabarito) {
        const q = await dbGet('SELECT * FROM acl_avaliacoes WHERE id = ?', [id]);
        if (!q) return null;
        const ps = await dbAll('SELECT * FROM acl_perguntas WHERE quiz_id = ? ORDER BY ordem ASC, id ASC', [id]);
        for (const p of ps) {
            const alts = await dbAll('SELECT id, texto, correta FROM acl_alternativas WHERE pergunta_id = ? ORDER BY ordem ASC, id ASC', [p.id]);
            p.alternativas = alts.map(a => comGabarito ? a : { id: a.id, texto: a.texto });
        }
        q.perguntas = ps;
        return q;
    }
    app.get('/api/acl/avaliacoes/:id', guardAdmin, async (req, res) => {
        try { const q = await avaliacaoCompleta(parseInt(req.params.id, 10), true); if (!q) return res.status(404).json({ error: 'Avaliação não encontrada.' }); res.json(q); } catch (e) { res.status(500).json({ error: e.message }); }
    });
    // substitui todas as perguntas da avaliação (editor único)
    app.put('/api/acl/avaliacoes/:id/perguntas', guardAdmin, async (req, res) => {
        try {
            const id = parseInt(req.params.id, 10);
            const q = await dbGet('SELECT id FROM acl_avaliacoes WHERE id = ?', [id]);
            if (!q) return res.status(404).json({ error: 'Avaliação não encontrada.' });
            const lista = Array.isArray(req.body && req.body.perguntas) ? req.body.perguntas : [];
            const limpas = [];
            for (let i = 0; i < lista.length; i++) {
                const p = lista[i] || {};
                const tipo = ['multipla', 'vf', 'aberta'].includes(p.tipo) ? p.tipo : 'multipla';
                const enunciado = txt(p.enunciado, 1500);
                if (!enunciado) return res.status(400).json({ error: `A pergunta ${i + 1} está sem enunciado.` });
                let alts = [];
                if (tipo === 'multipla') {
                    alts = (Array.isArray(p.alternativas) ? p.alternativas : []).map(a => ({ texto: txt(a && a.texto, 500), correta: a && (a.correta === true || a.correta === 1 || a.correta === '1') ? 1 : 0 })).filter(a => a.texto);
                    if (alts.length < 2) return res.status(400).json({ error: `A pergunta ${i + 1} precisa de pelo menos 2 alternativas.` });
                    if (alts.filter(a => a.correta).length !== 1) return res.status(400).json({ error: `A pergunta ${i + 1} precisa ter exatamente 1 alternativa correta.` });
                } else if (tipo === 'vf') {
                    const v = p.resposta_vf === 'falso' ? 'falso' : (p.resposta_vf === 'verdadeiro' ? 'verdadeiro' : null);
                    if (!v) return res.status(400).json({ error: `Informe se a pergunta ${i + 1} (V/F) é verdadeira ou falsa.` });
                    alts = [{ texto: 'Verdadeiro', correta: v === 'verdadeiro' ? 1 : 0 }, { texto: 'Falso', correta: v === 'falso' ? 1 : 0 }];
                }
                limpas.push({ tipo, enunciado, alts });
            }
            const usadas = await dbGet('SELECT COUNT(*) n FROM acl_tentativas WHERE quiz_id = ?', [id]);
            if (usadas.n > 0 && !(req.body && req.body.forcar)) return res.status(409).json({ error: `Esta avaliação já tem ${usadas.n} tentativa(s) respondida(s). Alterar as perguntas pode invalidar os resultados.`, tentativas: usadas.n });
            await apagarPerguntasDaAvaliacao(id);
            for (let i = 0; i < limpas.length; i++) {
                const p = await dbRun('INSERT INTO acl_perguntas (quiz_id, tipo, enunciado, ordem) VALUES (?, ?, ?, ?)', [id, limpas[i].tipo, limpas[i].enunciado, i + 1]);
                for (let k = 0; k < limpas[i].alts.length; k++) await dbRun('INSERT INTO acl_alternativas (pergunta_id, texto, correta, ordem) VALUES (?, ?, ?, ?)', [p.lastID, limpas[i].alts[k].texto, limpas[i].alts[k].correta, k + 1]);
            }
            res.json({ ok: true, total: limpas.length });
        } catch (e) { res.status(500).json({ error: e.message }); }
    });
    app.get('/api/acl/avaliacoes/:id/resultados', guardAdmin, async (req, res) => {
        try {
            const id = parseInt(req.params.id, 10);
            const ps = await dbAll('SELECT id, tipo, enunciado FROM acl_perguntas WHERE quiz_id = ? ORDER BY ordem ASC, id ASC', [id]);
            const rows = await dbAll(`SELECT t.id, t.numero, t.nota, t.aprovado, t.enviado_em, t.respostas_json, c.id AS colaborador_id, c.nome_completo
                FROM acl_tentativas t JOIN acl_matriculas m ON m.id = t.matricula_id JOIN colaboradores c ON c.id = m.colaborador_id WHERE t.quiz_id = ? ORDER BY t.enviado_em DESC`, [id]);
            res.json({ perguntas: ps, tentativas: rows.map(r => ({ id: r.id, colaborador: r.nome_completo, colaborador_id: r.colaborador_id, numero: r.numero, nota: r.nota, aprovado: !!r.aprovado, enviado_em: r.enviado_em,
                abertas: ps.filter(p => p.tipo === 'aberta').map(p => ({ pergunta: p.enunciado, resposta: (parseJson(r.respostas_json, {}) || {})[p.id] || '' })) })) });
        } catch (e) { res.status(500).json({ error: e.message }); }
    });
    app.get('/api/acl/trilhas/:id/desempenho', guardAdmin, async (req, res) => {
        try {
            const tid = parseInt(req.params.id, 10);
            const pr = await progressoDaTrilha(tid);
            const mats = await dbAll('SELECT id, status FROM acl_matriculas WHERE track_id = ?', [tid]);
            const vals = mats.map(m => pr.porMatricula[m.id] || 0);
            const media = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
            const concl = mats.filter(m => m.status === 'concluido').length;
            const iniciaram = await dbGet(`SELECT COUNT(DISTINCT x.mid) n FROM (SELECT p.matricula_id AS mid FROM acl_progresso p JOIN acl_matriculas m ON m.id = p.matricula_id WHERE m.track_id = ?
                UNION SELECT t.matricula_id FROM acl_tentativas t JOIN acl_matriculas m ON m.id = t.matricula_id WHERE m.track_id = ?) x`, [tid, tid]);
            const notas = await dbAll(`SELECT MAX(t.nota) AS melhor FROM acl_tentativas t JOIN acl_avaliacoes q ON q.id = t.quiz_id WHERE q.track_id = ? AND t.nota IS NOT NULL GROUP BY t.matricula_id, t.quiz_id`, [tid]);
            const mediaNotas = notas.length ? Math.round(notas.reduce((a, b) => a + (b.melhor || 0), 0) / notas.length) : null;
            const certs = await dbGet('SELECT COUNT(*) n FROM acl_certificados WHERE track_id = ?', [tid]);
            res.json({ participantes: mats.length, media_progresso: media, taxa_conclusao: mats.length ? Math.round(concl * 100 / mats.length) : 0, media_avaliacoes: mediaNotas,
                certificados: certs.n, missoes_aprovadas: (await dbGet("SELECT COUNT(*) n FROM acl_missoes_envios e JOIN acl_missoes m ON m.id = e.mission_id WHERE m.track_id = ? AND e.status = 'aprovada'", [tid])).n,
                pontos_distribuidos: (await dbGet('SELECT COALESCE(SUM(total), 0) p FROM acl_pontos WHERE track_id = ?', [tid])).p,
                missoes_pendentes: (await dbGet("SELECT COUNT(*) n FROM acl_missoes_envios e JOIN acl_missoes m ON m.id = e.mission_id WHERE m.track_id = ? AND e.status = 'em_analise'", [tid])).n, participacao: mats.length ? Math.round(iniciaram.n * 100 / mats.length) : 0, itens_obrigatorios: pr.total });
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    // ── Certificados ───────────────────────────────────────────────────────────
    async function emitirCertificado(matriculaId) {
        const ja = await dbGet('SELECT id FROM acl_certificados WHERE matricula_id = ?', [matriculaId]);
        if (ja) return ja.id;
        const m = await dbGet(`SELECT m.id, m.track_id, m.colaborador_id, m.data_conclusao, t.nome AS trilha, t.carga_horaria, t.gera_certificado, c.nome_completo
            FROM acl_matriculas m JOIN acl_trilhas t ON t.id = m.track_id JOIN colaboradores c ON c.id = m.colaborador_id WHERE m.id = ?`, [matriculaId]);
        if (!m || !m.gera_certificado) return null;
        const ano = (m.data_conclusao || hojeSP()).slice(0, 4);
        for (let tentativa = 0; tentativa < 5; tentativa++) {
            const numero = `ACS-${ano}-${String(m.id).padStart(5, '0')}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
            try {
                const r = await dbRun(`INSERT INTO acl_certificados (matricula_id, track_id, colaborador_id, numero, nome_colaborador, nome_trilha, carga_horaria, data_conclusao, emitido_em)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`, [m.id, m.track_id, m.colaborador_id, numero, m.nome_completo, m.trilha, m.carga_horaria || 0, m.data_conclusao || hojeSP()]);
                return r.lastID;
            } catch (e) { if (!/UNIQUE/i.test(e.message)) throw e; }
        }
        return null;
    }
    const pdfTxt = s => String(s == null ? '' : s).replace(/[^\x20-\x7E\u00A0-\u00FF\u2013\u2014\u2018\u2019\u201C\u201D]/g, '').trim();
    async function gerarCertificadoPdf(c) {
        const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
        const pdf = await PDFDocument.create();
        const W = 841.89, H = 595.28;
        const page = pdf.addPage([W, H]);
        const bold = await pdf.embedFont(StandardFonts.HelveticaBold), reg = await pdf.embedFont(StandardFonts.Helvetica), ital = await pdf.embedFont(StandardFonts.HelveticaOblique);
        const roxo = rgb(0.486, 0.227, 0.929), azul = rgb(0.145, 0.388, 0.922), cinza = rgb(0.28, 0.33, 0.41), escuro = rgb(0.06, 0.09, 0.16);
        page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: rgb(1, 1, 1) });
        page.drawRectangle({ x: 18, y: 18, width: W - 36, height: H - 36, borderColor: roxo, borderWidth: 4 });
        page.drawRectangle({ x: 30, y: 30, width: W - 60, height: H - 60, borderColor: azul, borderWidth: 1 });
        page.drawRectangle({ x: 30, y: H - 120, width: W - 60, height: 90, color: roxo });
        const centro = (t, y, font, size, cor, maxW) => {
            t = pdfTxt(t); let s = size; const lim = maxW || (W - 120);
            while (s > 9 && font.widthOfTextAtSize(t, s) > lim) s -= 1;
            page.drawText(t, { x: (W - font.widthOfTextAtSize(t, s)) / 2, y, size: s, font, color: cor });
        };
        centro('ACADEMIA DE SUCESSO', H - 82, bold, 34, rgb(1, 1, 1));
        centro('Desenvolvimento que transforma pessoas em grandes profissionais.', H - 106, ital, 12, rgb(0.93, 0.9, 1));
        centro('CERTIFICADO', H - 165, bold, 20, roxo);
        centro('Certificamos que', H - 205, reg, 15, cinza);
        centro(String(c.nome_colaborador || '').toUpperCase(), H - 250, bold, 30, escuro);
        page.drawLine({ start: { x: 180, y: H - 262 }, end: { x: W - 180, y: H - 262 }, thickness: 1, color: azul });
        centro('concluiu a trilha:', H - 295, reg, 15, cinza);
        centro(c.nome_trilha, H - 330, bold, 24, roxo);
        const ch = Number(c.carga_horaria) || 0;
        const dt = String(c.data_conclusao || '').split('-').reverse().join('/');
        centro(`Carga horária: ${ch ? String(ch).replace('.', ',') + ' horas' : 'não informada'}`, H - 375, reg, 15, escuro);
        centro(`Data de conclusão: ${dt}`, H - 400, reg, 15, escuro);
        centro(`Certificado nº ${c.numero}`, 62, bold, 11, cinza);
        centro('Documento emitido digitalmente pela plataforma Academia de Sucesso.', 46, ital, 9, cinza);
        return Buffer.from(await pdf.save());
    }
    async function podeVerCertificado(user, cert) {
        if (await temPagina(user, PAGE_ADMIN)) return true;
        const colab = await colabDoUsuario(user);
        return !!(colab && colab.id === cert.colaborador_id);
    }
    app.get('/api/acl/certificados', guardAdmin, async (req, res) => {
        try {
            const rows = await dbAll(`SELECT c.*, col.cargo FROM acl_certificados c LEFT JOIN colaboradores col ON col.id = c.colaborador_id ORDER BY c.id DESC`);
            res.json(rows.map(r => ({ id: r.id, numero: r.numero, colaborador: r.nome_colaborador, cargo: r.cargo || '', trilha: r.nome_trilha, carga_horaria: r.carga_horaria, data_conclusao: r.data_conclusao, emitido_em: r.emitido_em })));
        } catch (e) { res.status(500).json({ error: e.message }); }
    });
    app.delete('/api/acl/certificados/:id', guardAdmin, async (req, res) => {
        try { await dbRun('DELETE FROM acl_certificados WHERE id = ?', [parseInt(req.params.id, 10)]); res.json({ ok: true }); } catch (e) { res.status(500).json({ error: e.message }); }
    });
    app.get('/api/acl/certificados/:id/pdf', authenticateToken, async (req, res) => {
        try {
            const c = await dbGet('SELECT * FROM acl_certificados WHERE id = ?', [parseInt(req.params.id, 10)]);
            if (!c) return res.status(404).json({ error: 'Certificado não encontrado.' });
            if (!await podeVerCertificado(req.user, c)) return res.status(403).json({ error: 'Sem permissão para este certificado.' });
            const buf = await gerarCertificadoPdf(c);
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `inline; filename="${c.numero}.pdf"`);
            res.send(buf);
        } catch (e) { res.status(500).json({ error: e.message }); }
    });
    app.get('/api/acl/minha/certificados', guardMinha, async (req, res) => {
        try {
            const colab = await colabDoUsuario(req.user, req);
            if (!colab) return res.json([]);
            const rows = await dbAll('SELECT id, numero, nome_trilha, carga_horaria, data_conclusao FROM acl_certificados WHERE colaborador_id = ? ORDER BY id DESC', [colab.id]);
            res.json(rows);
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    // ── Participante: fazer avaliação ──────────────────────────────────────────
    function situacaoAvaliacao(q, usadas, aprovada, excecaoAte) {
        const h = hojeSP();
        if (aprovada) return 'aprovada';
        if (q.data_abertura && h < q.data_abertura) return 'nao_aberta';
        const lim = q.data_limite || null;
        const efetivo = excecaoAte && excecaoAte > (lim || '') ? excecaoAte : lim;
        if (efetivo && h > efetivo) return 'encerrada';
        if (usadas >= q.tentativas) return 'esgotada';
        return 'aberta';
    }
    async function ctxAvaliacaoMinha(req, res) {
        const colab = await colabDoUsuario(req.user, req);
        if (!colab) { res.status(404).json({ error: 'Seu usuário não está vinculado a um colaborador.' }); return null; }
        const q = await dbGet(`SELECT q.*, t.status AS tstatus, t.data_fim AS tfim FROM acl_avaliacoes q JOIN acl_trilhas t ON t.id = q.track_id WHERE q.id = ?`, [parseInt(req.params.id, 10)]);
        if (!q || !q.ativo || q.tstatus === 'arquivada') { res.status(404).json({ error: 'Avaliação não encontrada.' }); return null; }
        const mat = await dbGet(`SELECT * FROM acl_matriculas WHERE track_id = ? AND colaborador_id = ? AND status != 'inativo'`, [q.track_id, colab.id]);
        if (!mat) { res.status(403).json({ error: 'Você não está matriculado nesta trilha.' }); return null; }
        const t = await dbGet('SELECT COUNT(*) n, MAX(aprovado) ap, MAX(nota) melhor FROM acl_tentativas WHERE matricula_id = ? AND quiz_id = ?', [mat.id, q.id]);
        const situacao = situacaoAvaliacao(q, t.n, !!t.ap, mat.excecao_ate);
        return { colab, q, mat, usadas: t.n, melhor: t.melhor, situacao };
    }
    app.get('/api/acl/minha/avaliacoes/:id', guardMinha, async (req, res) => {
        try {
            const c = await ctxAvaliacaoMinha(req, res); if (!c) return;
            const base = { id: c.q.id, nome: c.q.nome, descricao: c.q.descricao, nota_minima: c.q.nota_minima, tentativas: c.q.tentativas, usadas: c.usadas, melhor_nota: c.melhor, data_abertura: c.q.data_abertura, data_limite: c.q.data_limite, obrigatoria: !!c.q.obrigatoria, situacao: c.situacao };
            if (c.situacao !== 'aberta') return res.json(Object.assign(base, { perguntas: [] }));
            const full = await avaliacaoCompleta(c.q.id, false);
            res.json(Object.assign(base, { perguntas: full.perguntas.map(p => ({ id: p.id, tipo: p.tipo, enunciado: p.enunciado, alternativas: p.alternativas })) }));
        } catch (e) { res.status(500).json({ error: e.message }); }
    });
    app.post('/api/acl/minha/avaliacoes/:id/enviar', guardMinha, async (req, res) => {
        try {
            const c = await ctxAvaliacaoMinha(req, res); if (!c) return;
            if (c.situacao !== 'aberta') {
                const msg = { aprovada: 'Você já foi aprovado nesta avaliação.', nao_aberta: 'Esta avaliação ainda não foi aberta.', encerrada: 'Esta avaliação está encerrada (prazo vencido).', esgotada: 'Você usou todas as tentativas desta avaliação.' }[c.situacao];
                return res.status(409).json({ error: msg || 'Avaliação indisponível.' });
            }
            const full = await avaliacaoCompleta(c.q.id, true);
            if (!full.perguntas.length) return res.status(409).json({ error: 'Esta avaliação ainda não tem perguntas.' });
            const resp = (req.body && req.body.respostas) || {};
            let objetivas = 0, acertos = 0;
            const salvas = {};
            for (const p of full.perguntas) {
                const r = resp[p.id];
                if (p.tipo === 'aberta') {
                    const t = txt(r, 3000);
                    if (!t) return res.status(400).json({ error: 'Responda todas as perguntas antes de enviar.' });
                    salvas[p.id] = t;
                } else {
                    const altId = parseInt(r, 10);
                    const alt = p.alternativas.find(a => a.id === altId);
                    if (!alt) return res.status(400).json({ error: 'Responda todas as perguntas antes de enviar.' });
                    objetivas++; if (alt.correta) acertos++;
                    salvas[p.id] = altId;
                }
            }
            const nota = objetivas ? Math.round((acertos * 1000) / objetivas) / 10 : null;
            const aprovado = objetivas ? nota >= c.q.nota_minima : true;
            await dbRun('INSERT INTO acl_tentativas (matricula_id, quiz_id, numero, nota, aprovado, respostas_json, enviado_em) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)',
                [c.mat.id, c.q.id, c.usadas + 1, nota, aprovado ? 1 : 0, JSON.stringify(salvas)]);
            const pr = await progressoDaTrilha(c.q.track_id);
            const pct = pr.porMatricula[c.mat.id] || 0;
            await sincronizarConclusao(c.mat.id, pct);
            const restantes = Math.max(0, c.q.tentativas - (c.usadas + 1));
            res.json({ ok: true, nota, aprovado, tentativas_restantes: aprovado ? 0 : restantes, progresso: pct, concluido_trilha: pct >= 100,
                mensagem: aprovado ? 'Parabéns! Você concluiu esta etapa da Academia de Sucesso.' : 'Você não atingiu a nota mínima. Revise o conteúdo e tente novamente.' });
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    // Avaliação de demonstração (somente se a trilha demo existir sem avaliações)
    async function seedDemoAvaliacao() {
        const t = await dbGet('SELECT id FROM acl_trilhas WHERE demonstracao = 1 ORDER BY id LIMIT 1');
        if (!t) return;
        const ja = await dbGet('SELECT COUNT(*) n FROM acl_avaliacoes WHERE track_id = ?', [t.id]);
        if (ja.n > 0) return;
        const m = await dbGet('SELECT id FROM acl_modulos WHERE track_id = ? ORDER BY ordem LIMIT 1', [t.id]);
        const q = await dbRun(`INSERT INTO acl_avaliacoes (track_id, module_id, nome, descricao, nota_minima, tentativas, obrigatoria, ativo, ordem, demonstracao)
            VALUES (?, ?, 'Avaliação do Módulo 1 (conteúdo de demonstração)', 'Conteúdo de demonstração — substitua pelas perguntas reais.', 70, 3, 1, 1, 1, 1)`, [t.id, m ? m.id : null]);
        const perg = [
            ['multipla', 'Conteúdo de demonstração: qual é a principal característica de um líder?', [['Dar o exemplo', 1], ['Apenas dar ordens', 0], ['Evitar conversas difíceis', 0]]],
            ['vf', 'Conteúdo de demonstração: o feedback deve ser claro e respeitoso.', [['Verdadeiro', 1], ['Falso', 0]]],
            ['aberta', 'Conteúdo de demonstração: descreva uma situação em que você aplicaria o que aprendeu.', []]
        ];
        for (let i = 0; i < perg.length; i++) {
            const p = await dbRun('INSERT INTO acl_perguntas (quiz_id, tipo, enunciado, ordem) VALUES (?, ?, ?, ?)', [q.lastID, perg[i][0], perg[i][1], i + 1]);
            for (let k = 0; k < perg[i][2].length; k++) await dbRun('INSERT INTO acl_alternativas (pergunta_id, texto, correta, ordem) VALUES (?, ?, ?, ?)', [p.lastID, perg[i][2][k][0], perg[i][2][k][1], k + 1]);
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    //  FASE 3 — Missões OPCIONAIS (pontos bônus). Missões NUNCA entram no progresso,
    //  na nota, no certificado nem bloqueiam módulos/aulas/avaliações.
    // ═══════════════════════════════════════════════════════════════════════════
    const MAX_ANEXO_MB = 15;
    const uploadMissao = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_ANEXO_MB * 1024 * 1024, files: 5 } });
    const EXT_ANEXO = {
        jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', pdf: 'application/pdf', doc: 'application/msword',
        docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', xls: 'application/vnd.ms-excel',
        xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    };

    async function listarMissoes(trackId) {
        return dbAll(`SELECT m.*, (SELECT COUNT(*) FROM acl_missoes_envios e WHERE e.mission_id = m.id) AS qtd_envios,
            (SELECT COUNT(*) FROM acl_missoes_envios e WHERE e.mission_id = m.id AND e.status = 'em_analise') AS qtd_pendentes,
            (SELECT COUNT(*) FROM acl_missoes_envios e WHERE e.mission_id = m.id AND e.status = 'aprovada') AS qtd_aprovadas
            FROM acl_missoes m WHERE m.track_id = ? ORDER BY m.id ASC`, [trackId]);
    }
    function lerMissao(b, trilha) {
        const pb = parseInt(b.pontos_base, 10), pn = parseInt(b.pontos_bonus, 10);
        const m = {
            nome: txt(b.nome, 200), module_id: parseInt(b.module_id, 10) || null, descricao: txt(b.descricao), objetivo: txt(b.objetivo), como_realizar: txt(b.como_realizar),
            pontos_base: isNaN(pb) ? 20 : Math.max(0, pb), pontos_bonus: isNaN(pn) ? 10 : Math.max(0, pn),
            data_inicio: isoDate(b.data_inicio), data_fim: isoDate(b.data_fim),
            status: ['rascunho', 'publicada', 'encerrada'].includes(b.status) ? b.status : 'rascunho',
            permite_nova_tentativa: b.permite_nova_tentativa === false || b.permite_nova_tentativa === 0 || b.permite_nova_tentativa === '0' ? 0 : 1
        };
        if (!m.nome) return { erro: 'Informe o nome da missão.' };
        if (!m.descricao) return { erro: 'Descreva a atividade: explique exatamente o que o líder deve fazer.' };
        if (m.data_inicio && m.data_fim && m.data_fim < m.data_inicio) return { erro: 'A data limite da missão não pode ser anterior à data de início.' };
        if (m.data_fim && trilha.data_fim && m.data_fim > trilha.data_fim) return { erro: 'A data limite da missão não pode ultrapassar o prazo final da trilha.' };
        if ((m.data_inicio && trilha.data_inicio && m.data_inicio < trilha.data_inicio) || (m.data_fim && trilha.data_inicio && m.data_fim < trilha.data_inicio)) return { erro: 'O prazo da missão não pode começar antes do início da trilha.' };
        if (m.data_inicio && trilha.data_fim && m.data_inicio > trilha.data_fim) return { erro: 'A data de início da missão não pode ultrapassar o prazo final da trilha.' };
        return { m };
    }
    async function apagarEnvios(cond, params) {
        const envios = await dbAll(`SELECT e.id FROM acl_missoes_envios e WHERE ${cond}`, params);
        for (const e of envios) {
            const anex = await dbAll('SELECT r2_key FROM acl_missoes_anexos WHERE envio_id = ?', [e.id]);
            if (r2 && r2.isReady()) for (const a of anex) if (a.r2_key) { try { await r2.deleteFromR2(a.r2_key); } catch (e2) { /* segue */ } }
            await dbRun('DELETE FROM acl_missoes_anexos WHERE envio_id = ?', [e.id]);
            await dbRun('DELETE FROM acl_pontos WHERE envio_id = ?', [e.id]);
            await dbRun('DELETE FROM acl_missoes_envios WHERE id = ?', [e.id]);
        }
    }
    app.get('/api/acl/trilhas/:id/missoes', guardAdmin, async (req, res) => {
        try { res.json(await listarMissoes(parseInt(req.params.id, 10))); } catch (e) { res.status(500).json({ error: e.message }); }
    });
    async function moduloValido(moduleId, tid) { if (!moduleId) return true; return !!(await dbGet('SELECT id FROM acl_modulos WHERE id = ? AND track_id = ?', [moduleId, tid])); }
    app.post('/api/acl/trilhas/:id/missoes', guardAdmin, async (req, res) => {
        try {
            const tid = parseInt(req.params.id, 10);
            const trilha = await dbGet('SELECT * FROM acl_trilhas WHERE id = ?', [tid]);
            if (!trilha) return res.status(404).json({ error: 'Trilha não encontrada.' });
            const r = lerMissao(req.body || {}, trilha); if (r.erro) return res.status(400).json({ error: r.erro });
            if (!await moduloValido(r.m.module_id, tid)) return res.status(400).json({ error: 'O módulo precisa pertencer a esta trilha.' });
            const ins = await dbRun(`INSERT INTO acl_missoes (track_id, module_id, nome, descricao, objetivo, como_realizar, pontos_base, pontos_bonus, data_inicio, data_fim, status, permite_nova_tentativa)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [tid, r.m.module_id, r.m.nome, r.m.descricao, r.m.objetivo, r.m.como_realizar, r.m.pontos_base, r.m.pontos_bonus, r.m.data_inicio, r.m.data_fim, r.m.status, r.m.permite_nova_tentativa]);
            res.json({ ok: true, id: ins.lastID });
        } catch (e) { res.status(500).json({ error: e.message }); }
    });
    app.put('/api/acl/missoes/:id', guardAdmin, async (req, res) => {
        try {
            const id = parseInt(req.params.id, 10);
            const atual = await dbGet('SELECT * FROM acl_missoes WHERE id = ?', [id]);
            if (!atual) return res.status(404).json({ error: 'Missão não encontrada.' });
            const trilha = await dbGet('SELECT * FROM acl_trilhas WHERE id = ?', [atual.track_id]);
            const r = lerMissao(Object.assign({}, atual, req.body || {}), trilha); if (r.erro) return res.status(400).json({ error: r.erro });
            if (!await moduloValido(r.m.module_id, atual.track_id)) return res.status(400).json({ error: 'O módulo precisa pertencer a esta trilha.' });
            await dbRun(`UPDATE acl_missoes SET module_id = ?, nome = ?, descricao = ?, objetivo = ?, como_realizar = ?, pontos_base = ?, pontos_bonus = ?, data_inicio = ?, data_fim = ?, status = ?, permite_nova_tentativa = ? WHERE id = ?`,
                [r.m.module_id, r.m.nome, r.m.descricao, r.m.objetivo, r.m.como_realizar, r.m.pontos_base, r.m.pontos_bonus, r.m.data_inicio, r.m.data_fim, r.m.status, r.m.permite_nova_tentativa, id]);
            res.json({ ok: true });
        } catch (e) { res.status(500).json({ error: e.message }); }
    });
    app.delete('/api/acl/missoes/:id', guardAdmin, async (req, res) => {
        try {
            const id = parseInt(req.params.id, 10);
            const n = await dbGet('SELECT COUNT(*) n FROM acl_missoes_envios WHERE mission_id = ?', [id]);
            if (n.n > 0 && req.query.forcar !== '1') return res.status(409).json({ error: `Esta missão tem ${n.n} envio(s) (e possíveis pontos). Encerre a missão ou confirme a exclusão definitiva.`, envios: n.n });
            await apagarEnvios('e.mission_id = ?', [id]);
            await dbRun('DELETE FROM acl_missoes WHERE id = ?', [id]);
            res.json({ ok: true });
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    // ── Admin: MISSÕES PARA AVALIAR ────────────────────────────────────────────
    app.get('/api/acl/trilhas/:id/envios', guardAdmin, async (req, res) => {
        try {
            const tid = parseInt(req.params.id, 10);
            const st = ['em_analise', 'aprovada', 'recusada'].includes(req.query.status) ? req.query.status : null;
            const rows = await dbAll(`SELECT e.*, m.nome AS missao, m.module_id, m.permite_nova_tentativa, c.nome_completo, c.cargo, md.titulo AS modulo
                FROM acl_missoes_envios e JOIN acl_missoes m ON m.id = e.mission_id JOIN colaboradores c ON c.id = e.colaborador_id
                LEFT JOIN acl_modulos md ON md.id = m.module_id
                WHERE m.track_id = ? ${st ? 'AND e.status = ?' : ''} ORDER BY CASE e.status WHEN 'em_analise' THEN 0 ELSE 1 END, e.enviado_em DESC`, st ? [tid, st] : [tid]);
            const out = [];
            for (const r of rows) {
                const anex = await dbAll('SELECT id, nome, mime, tamanho FROM acl_missoes_anexos WHERE envio_id = ? ORDER BY id', [r.id]);
                out.push({ id: r.id, colaborador: r.nome_completo, colaborador_id: r.colaborador_id, cargo: r.cargo || '', foto: fotoUrl(r.colaborador_id), missao: r.missao, mission_id: r.mission_id, modulo: r.modulo || 'Trilha',
                    anotacoes: r.anotacoes, enviado_em: r.enviado_em, status: r.status, tentativa: r.tentativa, pontos_base: r.pontos_base, pontos_bonus: r.pontos_bonus,
                    pontos_potenciais: r.pontos_base + (anex.length ? r.pontos_bonus : 0), pontos_concedidos: r.pontos_concedidos, motivo_recusa: r.motivo_recusa, avaliado_em: r.avaliado_em, anexos: anex });
            }
            res.json(out);
        } catch (e) { res.status(500).json({ error: e.message }); }
    });
    app.post('/api/acl/envios/:id/aprovar', guardAdmin, async (req, res) => {
        try {
            const id = parseInt(req.params.id, 10);
            const e = await dbGet('SELECT * FROM acl_missoes_envios WHERE id = ?', [id]);
            if (!e) return res.status(404).json({ error: 'Envio não encontrado.' });
            const anex = await dbGet('SELECT COUNT(*) n FROM acl_missoes_anexos WHERE envio_id = ?', [id]);
            const bonus = anex.n > 0 ? e.pontos_bonus : 0, total = e.pontos_base + bonus;
            // transição atômica: só o primeiro clique aprova (evita pontos em duplicidade)
            const up = await dbRun(`UPDATE acl_missoes_envios SET status = 'aprovada', avaliado_em = CURRENT_TIMESTAMP, avaliado_por = ?, pontos_concedidos = ?, motivo_recusa = NULL WHERE id = ? AND status = 'em_analise'`, [req.user.id || null, total, id]);
            if (!up.changes) return res.status(409).json({ error: 'Este envio já foi avaliado.' });
            const m = await dbGet('SELECT m.track_id, m.nome FROM acl_missoes m WHERE m.id = ?', [e.mission_id]);
            await dbRun(`INSERT OR IGNORE INTO acl_pontos (matricula_id, colaborador_id, track_id, mission_id, envio_id, pontos_base, pontos_bonus, total, motivo)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [e.matricula_id, e.colaborador_id, m.track_id, e.mission_id, id, e.pontos_base, bonus, total, m.nome]);
            res.json({ ok: true, pontos: total, base: e.pontos_base, bonus });
        } catch (err) { res.status(500).json({ error: err.message }); }
    });
    app.post('/api/acl/envios/:id/recusar', guardAdmin, async (req, res) => {
        try {
            const id = parseInt(req.params.id, 10);
            const motivo = txt(req.body && req.body.motivo, 1500);
            if (!motivo) return res.status(400).json({ error: 'Informe o motivo da recusa (ele será mostrado ao participante).' });
            const up = await dbRun(`UPDATE acl_missoes_envios SET status = 'recusada', avaliado_em = CURRENT_TIMESTAMP, avaliado_por = ?, motivo_recusa = ?, pontos_concedidos = 0 WHERE id = ? AND status = 'em_analise'`, [req.user.id || null, motivo, id]);
            if (!up.changes) return res.status(409).json({ error: 'Este envio já foi avaliado.' });
            res.json({ ok: true });
        } catch (e) { res.status(500).json({ error: e.message }); }
    });
    // stream privado dos anexos (admin ou autor do envio)
    app.get('/api/acl/envios/:id/anexos/:aid', authenticateToken, async (req, res) => {
        try {
            const e = await dbGet('SELECT colaborador_id FROM acl_missoes_envios WHERE id = ?', [parseInt(req.params.id, 10)]);
            if (!e) return res.status(404).end();
            let ok = await temPagina(req.user, PAGE_ADMIN);
            if (!ok) { const colab = await colabDoUsuario(req.user, req); ok = !!(colab && colab.id === e.colaborador_id); }
            if (!ok) return res.status(403).end();
            const a = await dbGet('SELECT * FROM acl_missoes_anexos WHERE id = ? AND envio_id = ?', [parseInt(req.params.aid, 10), parseInt(req.params.id, 10)]);
            if (!a || !a.r2_key) return res.status(404).end();
            if (!r2 || !r2.isReady()) return res.status(503).end();
            const f = await r2.downloadStreamFromR2(a.r2_key, null);
            res.setHeader('Content-Type', a.mime || f.contentType || 'application/octet-stream');
            res.setHeader('Content-Disposition', `inline; filename="${String(a.nome || 'anexo').replace(/"/g, '')}"`);
            res.setHeader('Cache-Control', 'private, max-age=3600');
            if (f.contentLength != null) res.setHeader('Content-Length', f.contentLength);
            f.stream.on('error', () => { try { res.end(); } catch (e2) { /* ignora */ } });
            f.stream.pipe(res);
        } catch (e) { if (!res.headersSent) res.status(404).end(); }
    });

    // ── Participante: ver e realizar missão ────────────────────────────────────
    function situacaoPrazoMissao(m, trilha, excecaoAte) {
        const h = hojeSP();
        if (m.status === 'encerrada') return 'encerrada';
        const ini = m.data_inicio || trilha.data_inicio, fim = m.data_fim || trilha.data_fim;
        if (ini && h < ini) return 'nao_iniciada';
        const efetivo = excecaoAte && excecaoAte > (fim || '') ? excecaoAte : fim;
        if (efetivo && h > efetivo) return 'encerrada';
        return 'disponivel';
    }
    async function ctxMissaoMinha(req, res) {
        const colab = await colabDoUsuario(req.user, req);
        if (!colab) { res.status(404).json({ error: 'Seu usuário não está vinculado a um colaborador.' }); return null; }
        const m = await dbGet(`SELECT m.*, t.data_inicio AS t_ini, t.data_fim AS t_fim, t.status AS tstatus, t.nome AS trilha_nome FROM acl_missoes m JOIN acl_trilhas t ON t.id = m.track_id WHERE m.id = ?`, [parseInt(req.params.id, 10)]);
        if (!m || m.status === 'rascunho' || m.tstatus === 'arquivada') { res.status(404).json({ error: 'Missão não encontrada.' }); return null; }
        const mat = await dbGet(`SELECT * FROM acl_matriculas WHERE track_id = ? AND colaborador_id = ? AND status != 'inativo'`, [m.track_id, colab.id]);
        if (!mat) { res.status(403).json({ error: 'Você não está matriculado nesta trilha.' }); return null; }
        const envios = await dbAll('SELECT * FROM acl_missoes_envios WHERE mission_id = ? AND matricula_id = ? ORDER BY id DESC', [m.id, mat.id]);
        const trilha = { data_inicio: m.t_ini, data_fim: m.t_fim };
        const prazo = situacaoPrazoMissao(m, trilha, mat.excecao_ate);
        const ultimo = envios[0] || null;
        const podeRealizar = prazo === 'disponivel' && (!ultimo || (ultimo.status === 'recusada' && !!m.permite_nova_tentativa));
        return { colab, m, mat, envios, prazo, ultimo, podeRealizar };
    }
    async function enviosComAnexos(envios) {
        const out = [];
        for (const e of envios) {
            const anex = await dbAll('SELECT id, nome, mime FROM acl_missoes_anexos WHERE envio_id = ? ORDER BY id', [e.id]);
            out.push({ id: e.id, status: e.status, tentativa: e.tentativa, enviado_em: e.enviado_em, anotacoes: e.anotacoes, motivo_recusa: e.motivo_recusa, avaliado_em: e.avaliado_em,
                pontos_concedidos: e.pontos_concedidos, pontos_base: e.pontos_base, pontos_bonus: e.pontos_bonus, anexos: anex });
        }
        return out;
    }
    app.get('/api/acl/minha/missoes/:id', guardMinha, async (req, res) => {
        try {
            const c = await ctxMissaoMinha(req, res); if (!c) return;
            const m = c.m;
            res.json({ id: m.id, track_id: m.track_id, trilha: m.trilha_nome, nome: m.nome, descricao: m.descricao, objetivo: m.objetivo, como_realizar: m.como_realizar, pontos_base: m.pontos_base, pontos_bonus: m.pontos_bonus,
                data_inicio: m.data_inicio || m.t_ini, data_fim: m.data_fim || m.t_fim, demonstracao: m.demonstracao, permite_nova_tentativa: !!m.permite_nova_tentativa,
                prazo_situacao: c.prazo, pode_realizar: c.podeRealizar, envios: await enviosComAnexos(c.envios) });
        } catch (e) { res.status(500).json({ error: e.message }); }
    });
    app.post('/api/acl/minha/missoes/:id/enviar', ...guardMinha, (req, res) => {
        uploadMissao.array('arquivos', 5)(req, res, async (errUp) => {
            try {
                if (errUp) return res.status(errUp.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({ error: errUp.code === 'LIMIT_FILE_SIZE' ? `Cada anexo pode ter até ${MAX_ANEXO_MB} MB.` : 'Não foi possível ler os anexos (máximo 5 arquivos).' });
                const c = await ctxMissaoMinha(req, res); if (!c) return;
                const anotacoes = txt(req.body && req.body.anotacoes, 8000);
                if (!anotacoes) return res.status(400).json({ error: 'As anotações são obrigatórias: conte como você realizou esta missão.' });
                if (!c.podeRealizar) {
                    const msg = c.ultimo && c.ultimo.status === 'em_analise' ? 'Sua missão já foi enviada e está em análise.' : c.ultimo && c.ultimo.status === 'aprovada' ? 'Esta missão já foi aprovada.'
                        : c.ultimo && c.ultimo.status === 'recusada' ? 'Esta missão não permite nova tentativa.' : c.prazo === 'nao_iniciada' ? 'Esta missão ainda não começou.' : 'O prazo desta missão está encerrado.';
                    return res.status(409).json({ error: msg });
                }
                const files = req.files || [];
                for (const f of files) {
                    const ext = (String(f.originalname || '').match(/\.([A-Za-z0-9]{1,5})$/) || [null, ''])[1].toLowerCase();
                    if (!EXT_ANEXO[ext]) return res.status(400).json({ error: `Tipo de arquivo não permitido: ${f.originalname}. Use JPG, JPEG, PNG, PDF, DOC, DOCX, XLS ou XLSX.` });
                    if (/^image\//.test(EXT_ANEXO[ext]) && !/^image\//.test(String(f.mimetype || ''))) return res.status(400).json({ error: `O arquivo ${f.originalname} não é uma imagem válida.` });
                    f._ext = ext;
                }
                if (files.length && (!r2 || !r2.isReady())) return res.status(503).json({ error: 'Armazenamento de arquivos (R2) não está configurado. Tente novamente mais tarde.' });
                const m = c.m;
                const ins = await dbRun(`INSERT INTO acl_missoes_envios (mission_id, matricula_id, colaborador_id, anotacoes, status, pontos_base, pontos_bonus, tentativa, enviado_em)
                    VALUES (?, ?, ?, ?, 'em_analise', ?, ?, ?, CURRENT_TIMESTAMP)`, [m.id, c.mat.id, c.colab.id, anotacoes, m.pontos_base, m.pontos_bonus, c.envios.length + 1]);
                const hoje = hojeSP().split('-'); const subidas = [];
                try {
                    for (const f of files) {
                        const nome = String(f.originalname || 'anexo').replace(/[^\w.\- ]+/g, '_').slice(0, 120);
                        const key = `academia-lideres/missoes/${hoje[0]}/${hoje[1]}/envio${ins.lastID}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}.${f._ext}`;
                        await r2.uploadToR2(key, f.buffer, EXT_ANEXO[f._ext]); subidas.push(key);
                        await dbRun('INSERT INTO acl_missoes_anexos (envio_id, nome, mime, r2_key, tamanho) VALUES (?, ?, ?, ?, ?)', [ins.lastID, nome, EXT_ANEXO[f._ext], key, f.size]);
                    }
                } catch (eUp) {
                    for (const k of subidas) { try { await r2.deleteFromR2(k); } catch (e3) { /* segue */ } }
                    await dbRun('DELETE FROM acl_missoes_anexos WHERE envio_id = ?', [ins.lastID]); await dbRun('DELETE FROM acl_missoes_envios WHERE id = ?', [ins.lastID]);
                    return res.status(500).json({ error: 'Falha ao enviar os anexos: ' + eUp.message });
                }
                res.json({ ok: true, envio_id: ins.lastID, status: 'em_analise', anexos: files.length, pontos_potenciais: m.pontos_base + (files.length ? m.pontos_bonus : 0) });
            } catch (e) { if (!res.headersSent) res.status(500).json({ error: e.message }); }
        });
    });
    app.get('/api/acl/minha/pontos', guardMinha, async (req, res) => {
        try {
            const colab = await colabDoUsuario(req.user, req);
            if (!colab) return res.json({ total: 0, itens: [] });
            const rows = await dbAll(`SELECT p.*, t.nome AS trilha FROM acl_pontos p JOIN acl_trilhas t ON t.id = p.track_id WHERE p.colaborador_id = ? ORDER BY p.id DESC`, [colab.id]);
            res.json({ total: rows.reduce((a, r) => a + r.total, 0), itens: rows.map(r => ({ missao: r.motivo, trilha: r.trilha, pontos_base: r.pontos_base, pontos_bonus: r.pontos_bonus, total: r.total, data: r.created_at, status: 'Aprovado' })) });
        } catch (e) { res.status(500).json({ error: e.message }); }
    });
    // resumo das missões de uma trilha para a jornada do participante
    async function missoesDaJornada(trilha, mat) {
        const ms = await dbAll(`SELECT m.* FROM acl_missoes m WHERE m.track_id = ? AND m.status != 'rascunho' ORDER BY m.id ASC`, [trilha.id]);
        const out = [];
        for (const m of ms) {
            const ultimo = await dbGet('SELECT id, status, pontos_concedidos, motivo_recusa, enviado_em FROM acl_missoes_envios WHERE mission_id = ? AND matricula_id = ? ORDER BY id DESC LIMIT 1', [m.id, mat.id]);
            const prazo = situacaoPrazoMissao(m, trilha, mat.excecao_ate);
            out.push({ id: m.id, nome: m.nome, descricao: m.descricao, module_id: m.module_id, pontos_base: m.pontos_base, pontos_bonus: m.pontos_bonus, data_inicio: m.data_inicio || trilha.data_inicio, data_fim: m.data_fim || trilha.data_fim,
                demonstracao: m.demonstracao, prazo_situacao: prazo, envio: ultimo || null,
                pode_realizar: prazo === 'disponivel' && (!ultimo || (ultimo.status === 'recusada' && !!m.permite_nova_tentativa)) });
        }
        return out;
    }
    async function seedDemoMissoes() {
        const t = await dbGet('SELECT id FROM acl_trilhas WHERE demonstracao = 1 ORDER BY id LIMIT 1');
        if (!t) return;
        const ja = await dbGet('SELECT COUNT(*) n FROM acl_missoes WHERE track_id = ?', [t.id]);
        if (ja.n > 0) return;
        const mods = await dbAll('SELECT id FROM acl_modulos WHERE track_id = ? ORDER BY ordem', [t.id]);
        const itens = [
            [mods[1], 'Pratique o Feedback (conteúdo de demonstração)', 'Conteúdo de demonstração: coloque em prática uma conversa de feedback com sua equipe.', 'Desenvolver a habilidade de dar feedback claro e respeitoso.', '1. Escolha um colaborador.\n2. Prepare os pontos principais.\n3. Converse em particular.\n4. Registre o resultado.'],
            [mods[5], 'Conversa de Segurança (conteúdo de demonstração)', 'Conteúdo de demonstração: conduza uma conversa rápida sobre segurança com a equipe antes do turno.', 'Reforçar a cultura de segurança como responsabilidade de todos.', '1. Defina o tema.\n2. Reúna a equipe por 5 minutos.\n3. Registre os combinados.']
        ];
        for (const it of itens) {
            await dbRun(`INSERT INTO acl_missoes (track_id, module_id, nome, descricao, objetivo, como_realizar, pontos_base, pontos_bonus, status, permite_nova_tentativa, demonstracao)
                VALUES (?, ?, ?, ?, ?, ?, 20, 10, 'publicada', 1, 1)`, [t.id, it[0] ? it[0].id : null, it[1], it[2], it[3], it[4]]);
        }
    }

    // ═══ Conteúdo de demonstração (identificado como tal) ═════════════════════
    async function seedDemo() {
        const n = await dbGet('SELECT COUNT(*) n FROM acl_trilhas');
        if (n.n > 0) return;
        const h = hojeSP();
        const fim = new Date(h + 'T12:00:00'); fim.setDate(fim.getDate() + 90);
        const fimIso = fim.toISOString().slice(0, 10);
        const t = await dbRun(`INSERT INTO acl_trilhas (nome, descricao, objetivo, publico_json, data_inicio, data_fim, carga_horaria, gera_certificado, status, demonstracao)
            VALUES (?, ?, ?, ?, ?, ?, ?, 1, 'publicada', 1)`,
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
