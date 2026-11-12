// ═══════════════════════════════════════════════════════════════════════════════
// ROTAS: TREINAMENTOS › UNIAMÉRICA (Gestão de Cursos, Aulas, Testes em Aula,
// Missões Semanais Dinâmicas, Presença por Aula, Avaliação do Gestor, Ranking,
// Prêmios e Certificados)
// Arquivo: backend/routes_uniamerica.js
// Armazenamento de todos os arquivos: Cloudflare R2 (r2_key)
// ═══════════════════════════════════════════════════════════════════════════════
'use strict';

const multer = require('multer');
const crypto = require('crypto');
const path = require('path');

module.exports = function registerUniAmerica(app, db, authenticateToken, r2) {
    const PAGE_GESTOR = 'uniamerica-gestao';
    const PAGE_MISSOES = 'uniamerica-missoes';
    const MAX_MB = 150;

    const upload = multer({
        storage: multer.memoryStorage(),
        limits: { fileSize: MAX_MB * 1024 * 1024 }
    });

    const dbRun = (sql, p = []) => new Promise((res, rej) => db.run(sql, p, function (e) { e ? rej(e) : res({ lastID: this.lastID, changes: this.changes }); }));
    const dbGet = (sql, p = []) => new Promise((res, rej) => db.get(sql, p, (e, r) => e ? rej(e) : res(r || null)));
    const dbAll = (sql, p = []) => new Promise((res, rej) => db.all(sql, p, (e, r) => e ? rej(e) : res(r || [])));
    const parseJson = (s, fb) => { try { const v = JSON.parse(s); return v == null ? fb : v; } catch (e) { return fb; } };
    const norm = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();

    // ── Migrações SQLite (/data/hr_system_v2.sqlite) ───────────────────────────
    db.serialize(() => {
        db.run(`CREATE TABLE IF NOT EXISTS uniamerica_cursos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            descricao TEXT DEFAULT '',
            departamentos TEXT DEFAULT 'Nenhum',
            colaboradores_avulsos TEXT DEFAULT '',
            capa_r2_key TEXT,
            capa_url TEXT,
            carga_horaria REAL DEFAULT 0,
            data_inicio TEXT,
            data_fim TEXT,
            status TEXT DEFAULT 'ativo',
            avaliacao_geral_obs TEXT DEFAULT '',
            created_by INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS uniamerica_aulas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            curso_id INTEGER NOT NULL,
            ordem INTEGER DEFAULT 1,
            titulo TEXT NOT NULL,
            descricao TEXT DEFAULT '',
            data_aula TEXT,
            carga_horaria REAL DEFAULT 0,
            status_aula TEXT DEFAULT 'agendada',
            iniciada_em DATETIME,
            concluida_em DATETIME,
            perguntas_json TEXT DEFAULT '[]',
            missoes_json TEXT DEFAULT '[]',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (curso_id) REFERENCES uniamerica_cursos(id) ON DELETE CASCADE
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS uniamerica_aula_anexos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            curso_id INTEGER NOT NULL,
            aula_id INTEGER NOT NULL,
            nome_arquivo TEXT NOT NULL,
            tipo_mime TEXT DEFAULT 'application/octet-stream',
            tamanho_bytes INTEGER DEFAULT 0,
            r2_key TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (aula_id) REFERENCES uniamerica_aulas(id) ON DELETE CASCADE
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS uniamerica_presencas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            curso_id INTEGER NOT NULL,
            aula_id INTEGER NOT NULL,
            colaborador_id INTEGER NOT NULL,
            presente INTEGER DEFAULT 0,
            liberado_missao_em DATETIME,
            registrado_por INTEGER,
            registrado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(aula_id, colaborador_id)
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS uniamerica_submissoes_teste (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            curso_id INTEGER NOT NULL,
            aula_id INTEGER NOT NULL,
            colaborador_id INTEGER NOT NULL,
            respostas_json TEXT DEFAULT '{}',
            pontos_calculados REAL DEFAULT 0,
            pontos_gestor REAL,
            feedback_gestor TEXT DEFAULT '',
            avaliado_por INTEGER,
            avaliado_em DATETIME,
            enviado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(aula_id, colaborador_id)
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS uniamerica_submissoes_missao (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            curso_id INTEGER NOT NULL,
            aula_id INTEGER NOT NULL,
            missao_id TEXT NOT NULL,
            colaborador_id INTEGER NOT NULL,
            respostas_json TEXT DEFAULT '{}',
            nota_gestor REAL,
            feedback_gestor TEXT DEFAULT '',
            status TEXT DEFAULT 'enviada',
            enviado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
            avaliado_por INTEGER,
            avaliado_em DATETIME,
            UNIQUE(aula_id, missao_id, colaborador_id)
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS uniamerica_missao_arquivos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            curso_id INTEGER NOT NULL,
            aula_id INTEGER NOT NULL,
            missao_id TEXT NOT NULL,
            colaborador_id INTEGER NOT NULL,
            campo_id TEXT NOT NULL,
            nome_arquivo TEXT NOT NULL,
            tipo_mime TEXT DEFAULT 'application/octet-stream',
            tamanho_bytes INTEGER DEFAULT 0,
            r2_key TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS uniamerica_premios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            curso_id INTEGER NOT NULL,
            colocacao INTEGER NOT NULL,
            titulo TEXT NOT NULL,
            descricao TEXT DEFAULT '',
            recompensa TEXT DEFAULT '',
            imagem_r2_key TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(curso_id, colocacao)
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS uniamerica_certificados (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            curso_id INTEGER NOT NULL,
            colaborador_id INTEGER NOT NULL,
            codigo_validacao TEXT NOT NULL UNIQUE,
            nome_colaborador TEXT,
            nome_curso TEXT,
            carga_horaria REAL DEFAULT 0,
            periodo_texto TEXT DEFAULT '',
            r2_key TEXT,
            emitido_por INTEGER,
            emitido_em DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(curso_id, colaborador_id)
        )`);

        db.run(`CREATE INDEX IF NOT EXISTS idx_ua_aulas_curso ON uniamerica_aulas(curso_id, ordem)`);
        db.run(`CREATE INDEX IF NOT EXISTS idx_ua_pres_curso ON uniamerica_presencas(curso_id, aula_id)`);
        db.run(`CREATE INDEX IF NOT EXISTS idx_ua_sub_teste ON uniamerica_submissoes_teste(curso_id, aula_id)`);
        db.run(`CREATE INDEX IF NOT EXISTS idx_ua_sub_missao ON uniamerica_submissoes_missao(curso_id, aula_id, status)`);
    });

    // ── Helpers R2 ─────────────────────────────────────────────────────────────
    function sanitizeFileName(name) {
        return String(name || 'arquivo')
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-zA-Z0-9._-]/g, '_')
            .replace(/_+/g, '_')
            .slice(0, 90);
    }

    function buildUniAmericaR2Key(subcategoria, originalName) {
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        const hash = crypto.randomBytes(4).toString('hex');
        const clean = sanitizeFileName(originalName);
        return `UniAmerica/${subcategoria}/${yyyy}/${mm}/${dd}_${hash}_${clean}`;
    }

    function detectContentType(mime, filename) {
        if (mime && mime !== 'application/octet-stream') return mime;
        const ext = path.extname(String(filename || '')).toLowerCase();
        const map = {
            '.pdf': 'application/pdf',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.webp': 'image/webp',
            '.mp4': 'video/mp4',
            '.webm': 'video/webm',
            '.mp3': 'audio/mpeg',
            '.wav': 'audio/wav',
            '.ogg': 'audio/ogg',
            '.m4a': 'audio/mp4',
            '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        };
        return map[ext] || 'application/octet-stream';
    }

    async function salvarNoR2(subcategoria, originalName, buffer, mimeType) {
        if (!r2 || !r2.isReady()) {
            throw new Error('Armazenamento Cloudflare R2 não está configurado no servidor.');
        }
        const r2Key = buildUniAmericaR2Key(subcategoria, originalName);
        const ct = detectContentType(mimeType, originalName);
        await r2.uploadToR2(r2Key, buffer, ct);
        return r2Key;
    }

    function r2StreamUrl(r2Key) {
        if (!r2Key) return null;
        return `/api/uniamerica/arquivo?key=${encodeURIComponent(r2Key)}`;
    }

    // ── Permissões e Resolução Usuário → Colaborador ───────────────────────────
    function isTopAdmin(u) {
        return !!u && (
            u.role === 'Diretoria' ||
            u.role === 'Administrador' ||
            u.departamento === 'Diretoria' ||
            (u.grupo_nome && String(u.grupo_nome).toLowerCase() === 'diretoria')
        );
    }

    async function temPagina(u, pagina) {
        if (isTopAdmin(u)) return true;
        const gid = u && u.grupo_permissao_id;
        if (!gid) return false;
        const row = await dbGet('SELECT visualizar FROM permissoes_grupo WHERE grupo_id = ? AND pagina_id = ?', [gid, pagina]);
        const v = row && row.visualizar;
        return v === 1 || v === '1' || v === true || v === 'true';
    }

    async function isGestorUniAmerica(u) {
        return await temPagina(u, PAGE_GESTOR);
    }

    const guardGestor = [authenticateToken, async (req, res, next) => {
        try {
            if (await isGestorUniAmerica(req.user)) return next();
            return res.status(403).json({ error: 'Apenas usuários com perfil Gestor do UniAmérica possuem permissão para esta ação.' });
        } catch (e) {
            return res.status(500).json({ error: e.message });
        }
    }];

    const guardParticipante = [authenticateToken, async (req, res, next) => {
        try {
            if ((await temPagina(req.user, PAGE_MISSOES)) || (await isGestorUniAmerica(req.user))) return next();
            return res.status(403).json({ error: 'Sem permissão para acessar as Missões da UniAmérica.' });
        } catch (e) {
            return res.status(500).json({ error: e.message });
        }
    }];

    const normTokens = s => norm(s).replace(/[._\-]+/g, ' ').replace(/\s+/g, ' ').trim();
    function matchUsuarioColab(u, todos) {
        if (!u) return null;
        if (u.email && String(u.email).includes('@')) {
            const mail = String(u.email).trim().toLowerCase();
            const byEmail = todos.find(x =>
                (x.email && String(x.email).trim().toLowerCase() === mail) ||
                (x.email_corporativo && String(x.email_corporativo).trim().toLowerCase() === mail)
            );
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

    async function resolverColaboradorDoUsuario(user, req) {
        const uid = user && user.id;
        if (!uid) return null;
        const cols = 'id, nome_completo, cargo, departamento, email, email_corporativo, foto_path, status';

        // Gestor pode inspecionar/simular a visão de qualquer colaborador via colab_id
        if (req && await isGestorUniAmerica(user)) {
            const overrideId = parseInt((req.query && req.query.colab_id) || (req.body && req.body.colab_id), 10);
            if (overrideId > 0) {
                const c = await dbGet(`SELECT ${cols} FROM colaboradores WHERE id = ?`, [overrideId]);
                if (c) return c;
            }
        }
        try {
            const vinc = await dbGet('SELECT colaborador_id FROM acl_usuario_vinculo WHERE usuario_id = ?', [uid]);
            if (vinc && vinc.colaborador_id) {
                const c = await dbGet(`SELECT ${cols} FROM colaboradores WHERE id = ?`, [vinc.colaborador_id]);
                if (c) return c;
            }
        } catch (e) { /* ignore */ }
        try {
            const cfg = await dbGet('SELECT colaborador_id FROM app_lider_config WHERE usuario_id = ?', [uid]);
            if (cfg && cfg.colaborador_id) {
                const c = await dbGet(`SELECT ${cols} FROM colaboradores WHERE id = ?`, [cfg.colaborador_id]);
                if (c) return c;
            }
        } catch (e) { /* ignore */ }

        const u = await dbGet('SELECT id, username, nome, email FROM usuarios WHERE id = ?', [uid]);
        const todos = await dbAll(`SELECT ${cols} FROM colaboradores WHERE status NOT LIKE 'Desligado%' ORDER BY nome_completo ASC`);
        return matchUsuarioColab(u, todos);
    }

    // ── Colaboradores vinculados ao CURSO INTEIRO (por Depto + Colaborador) ────
    async function listarColaboradoresDoCurso(curso) {
        const todosAtivos = await dbAll(
            `SELECT id, nome_completo, cargo, departamento, foto_path, status
             FROM colaboradores
             WHERE status NOT LIKE 'Desligado%'
             ORDER BY nome_completo ASC`
        );
        const deptRaw = String(curso.departamentos || '').trim();
        const isTodos = deptRaw.toLowerCase() === 'todos';
        const deptSet = new Set(
            deptRaw && deptRaw.toLowerCase() !== 'nenhum' && !isTodos
                ? deptRaw.split(',').map(d => norm(d)).filter(Boolean)
                : []
        );
        const avulsosSet = new Set(
            String(curso.colaboradores_avulsos || '')
                .split(',')
                .map(x => parseInt(x.trim(), 10))
                .filter(n => !isNaN(n) && n > 0)
        );

        return todosAtivos.filter(c => {
            if (isTodos) return true;
            if (avulsosSet.has(Number(c.id))) return true;
            if (deptSet.size > 0 && deptSet.has(norm(c.departamento))) return true;
            return false;
        });
    }

    // ── Cálculo de Pontuação (SOMA de pontos: perguntas 1..10 + missões 1..10) e Ranking ─
    async function calcularQuadroRankingCurso(cursoId) {
        const curso = await dbGet(`SELECT * FROM uniamerica_cursos WHERE id = ?`, [cursoId]);
        if (!curso) return null;

        const [aulas, colabs, presencas, subTestes, subMissoes, premios, certificados] = await Promise.all([
            dbAll(`SELECT * FROM uniamerica_aulas WHERE curso_id = ? ORDER BY ordem ASC, id ASC`, [cursoId]),
            listarColaboradoresDoCurso(curso),
            dbAll(`SELECT * FROM uniamerica_presencas WHERE curso_id = ?`, [cursoId]),
            dbAll(`SELECT * FROM uniamerica_submissoes_teste WHERE curso_id = ?`, [cursoId]),
            dbAll(`SELECT * FROM uniamerica_submissoes_missao WHERE curso_id = ?`, [cursoId]),
            dbAll(`SELECT * FROM uniamerica_premios WHERE curso_id = ? ORDER BY colocacao ASC`, [cursoId]),
            dbAll(`SELECT * FROM uniamerica_certificados WHERE curso_id = ?`, [cursoId])
        ]);

        const totalAulas = aulas.length;
        const todasAulasConcluidas = totalAulas > 0 && aulas.every(a => a.status_aula === 'concluida');

        const presMap = {}; // `${aula_id}_${colab_id}` -> row
        presencas.forEach(p => { presMap[`${p.aula_id}_${p.colaborador_id}`] = p; });

        const testeMap = {}; // `${aula_id}_${colab_id}` -> row
        subTestes.forEach(t => { testeMap[`${t.aula_id}_${t.colaborador_id}`] = t; });

        const missaoMap = {}; // `${aula_id}_${missao_id}_${colab_id}` -> row
        subMissoes.forEach(m => { missaoMap[`${m.aula_id}_${m.missao_id}_${m.colaborador_id}`] = m; });

        const certMap = {};
        certificados.forEach(cert => { certMap[cert.colaborador_id] = cert; });

        const premioPorColocacao = {};
        premios.forEach(pr => {
            premioPorColocacao[pr.colocacao] = {
                ...pr,
                imagem_url: pr.imagem_r2_key ? r2StreamUrl(pr.imagem_r2_key) : null
            };
        });

        // Calcular pontuação máxima possível do curso (soma das perguntas + soma das missões)
        let maxPontosTestes = 0;
        let maxPontosMissoes = 0;
        aulas.forEach(a => {
            const pergs = parseJson(a.perguntas_json, []);
            pergs.forEach(q => { maxPontosTestes += Math.max(1, Math.min(10, Number(q.nota_pontos || 1))); });
            const missoes = parseJson(a.missoes_json, []);
            missoes.forEach(m => { maxPontosMissoes += Math.max(1, Math.min(10, Number(m.nota_maxima || 10))); });
        });

        const participantes = colabs.map(c => {
            let aulasPresentes = 0;
            let somaTestes = 0;
            let somaMissoes = 0;
            let missoesEntregues = 0;
            let missoesAvaliadas = 0;
            const porAula = [];

            aulas.forEach(a => {
                const pr = presMap[`${a.id}_${c.id}`];
                const presente = !!(pr && Number(pr.presente) === 1);
                if (presente) aulasPresentes++;

                const st = testeMap[`${a.id}_${c.id}`];
                const ptsTeste = st
                    ? (st.pontos_gestor !== null && st.pontos_gestor !== undefined ? Number(st.pontos_gestor) : Number(st.pontos_calculados || 0))
                    : 0;
                somaTestes += ptsTeste;

                const missoesAula = parseJson(a.missoes_json, []);
                let ptsMissoesAula = 0;
                missoesAula.forEach(m => {
                    const sm = missaoMap[`${a.id}_${m.id}_${c.id}`];
                    if (sm) {
                        missoesEntregues++;
                        if (sm.status === 'avaliada' && sm.nota_gestor !== null && sm.nota_gestor !== undefined) {
                            missoesAvaliadas++;
                            ptsMissoesAula += Number(sm.nota_gestor || 0);
                        }
                    }
                });
                somaMissoes += ptsMissoesAula;

                porAula.push({
                    aula_id: a.id,
                    ordem: a.ordem,
                    titulo: a.titulo,
                    presente,
                    pontos_teste: ptsTeste,
                    teste_respondido: !!st,
                    pontos_missoes: ptsMissoesAula
                });
            });

            const notaTotal = parseFloat((somaTestes + somaMissoes).toFixed(2));
            const elegivelCertificado = totalAulas > 0 && aulasPresentes === totalAulas;
            const cert = certMap[c.id] || null;

            return {
                colaborador_id: c.id,
                nome_completo: c.nome_completo,
                cargo: c.cargo,
                departamento: c.departamento,
                foto_url: `/api/colaboradores/foto/${c.id}`,
                aulas_presentes: aulasPresentes,
                total_aulas: totalAulas,
                soma_testes: parseFloat(somaTestes.toFixed(2)),
                soma_missoes: parseFloat(somaMissoes.toFixed(2)),
                nota_total: notaTotal,
                missoes_entregues: missoesEntregues,
                missoes_avaliadas: missoesAvaliadas,
                elegivel_certificado: elegivelCertificado,
                certificado: cert ? {
                    ...cert,
                    arquivo_url: cert.r2_key ? r2StreamUrl(cert.r2_key) : null
                } : null,
                por_aula: porAula
            };
        });

        // Ordenar da maior nota para a menor nota (desempate por presença e nome)
        participantes.sort((a, b) => {
            if (b.nota_total !== a.nota_total) return b.nota_total - a.nota_total;
            if (b.aulas_presentes !== a.aulas_presentes) return b.aulas_presentes - a.aulas_presentes;
            return String(a.nome_completo || '').localeCompare(String(b.nome_completo || ''), 'pt-BR');
        });

        participantes.forEach((p, idx) => {
            p.posicao = idx + 1;
            p.premio = premioPorColocacao[idx + 1] || null;
        });

        return {
            curso: {
                ...curso,
                capa_stream_url: curso.capa_r2_key ? r2StreamUrl(curso.capa_r2_key) : (curso.capa_url || null)
            },
            total_aulas: totalAulas,
            todas_aulas_concluidas: todasAulasConcluidas,
            max_pontos_testes: maxPontosTestes,
            max_pontos_missoes: maxPontosMissoes,
            max_pontos_total: maxPontosTestes + maxPontosMissoes,
            premios: Object.values(premioPorColocacao).sort((a, b) => a.colocacao - b.colocacao),
            ranking: participantes
        };
    }

    // ═══════════════════════════════════════════════════════════════════════════
    //  STREAMING PRIVADO DE ARQUIVOS DO CLOUDFLARE R2
    // ═══════════════════════════════════════════════════════════════════════════
    app.get('/api/uniamerica/arquivo', (req, res, next) => {
        if (!req.headers.authorization && req.query && req.query.token) {
            req.headers.authorization = 'Bearer ' + req.query.token;
        }
        authenticateToken(req, res, next);
    }, async (req, res) => {
        try {
            const key = String(req.query.key || '').trim();
            if (!key || !key.startsWith('UniAmerica/')) {
                return res.status(400).json({ error: 'Chave de arquivo inválida.' });
            }
            if (!r2 || !r2.isReady()) {
                return res.status(503).json({ error: 'Cloudflare R2 indisponível.' });
            }
            const dl = await r2.downloadStreamFromR2(key, req.headers.range);
            res.setHeader('Content-Type', dl.contentType || 'application/octet-stream');
            res.setHeader('Accept-Ranges', 'bytes');
            if (dl.contentLength) res.setHeader('Content-Length', dl.contentLength);
            if (dl.contentRange) {
                res.setHeader('Content-Range', dl.contentRange);
                res.status(206);
            }
            if (req.query.download === '1') {
                const base = path.basename(key).replace(/^\d{2}_[0-9a-f]+_/, '');
                res.setHeader('Content-Disposition', `attachment; filename="${base}"`);
            }
            dl.stream.pipe(res);
        } catch (e) {
            res.status(404).json({ error: 'Arquivo não encontrado no R2: ' + e.message });
        }
    });

    // ═══════════════════════════════════════════════════════════════════════════
    //  PERFIL DE ACESSO DO USUÁRIO NA UNIAMÉRICA
    // ═══════════════════════════════════════════════════════════════════════════
    app.get('/api/uniamerica/meu-perfil', authenticateToken, async (req, res) => {
        try {
            const gestor = await isGestorUniAmerica(req.user);
            const participante = gestor || (await temPagina(req.user, PAGE_MISSOES));
            const colab = await resolverColaboradorDoUsuario(req.user, req);
            res.json({
                ok: true,
                is_gestor: gestor,
                can_missoes: participante,
                colaborador: colab ? {
                    id: colab.id,
                    nome_completo: colab.nome_completo,
                    cargo: colab.cargo,
                    departamento: colab.departamento,
                    foto_url: `/api/colaboradores/foto/${colab.id}`
                } : null
            });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    });

    // ═══════════════════════════════════════════════════════════════════════════
    //  CURSOS — LISTAGEM, CRIAÇÃO, EDIÇÃO, EXCLUSÃO E CAPA R2
    // ═══════════════════════════════════════════════════════════════════════════
    app.get('/api/uniamerica/cursos', guardGestor, async (req, res) => {
        try {
            const cursos = await dbAll(`SELECT * FROM uniamerica_cursos ORDER BY created_at DESC, id DESC`);
            const aulas = await dbAll(`SELECT * FROM uniamerica_aulas ORDER BY ordem ASC, id ASC`);
            const anexos = await dbAll(`SELECT * FROM uniamerica_aula_anexos ORDER BY id ASC`);
            const subMissoesPend = await dbAll(`SELECT curso_id, aula_id, COUNT(*) AS qtd FROM uniamerica_submissoes_missao WHERE status = 'enviada' GROUP BY curso_id, aula_id`);

            const pendMap = {};
            subMissoesPend.forEach(r => { pendMap[`${r.curso_id}_${r.aula_id}`] = r.qtd; });

            const anexosPorAula = {};
            anexos.forEach(an => {
                if (!anexosPorAula[an.aula_id]) anexosPorAula[an.aula_id] = [];
                anexosPorAula[an.aula_id].push({
                    ...an,
                    url: r2StreamUrl(an.r2_key)
                });
            });

            const aulasPorCurso = {};
            aulas.forEach(a => {
                if (!aulasPorCurso[a.curso_id]) aulasPorCurso[a.curso_id] = [];
                const missoes = parseJson(a.missoes_json, []).map(m => ({
                    ...m,
                    pdf_url: m.pdf_r2_key ? r2StreamUrl(m.pdf_r2_key) : null
                }));
                aulasPorCurso[a.curso_id].push({
                    ...a,
                    perguntas: parseJson(a.perguntas_json, []),
                    missoes,
                    anexos: anexosPorAula[a.id] || [],
                    missoes_pendentes_avaliacao: pendMap[`${a.curso_id}_${a.id}`] || 0
                });
            });

            const out = [];
            for (const c of cursos) {
                const colabsVinc = await listarColaboradoresDoCurso(c);
                const listaAulas = aulasPorCurso[c.id] || [];
                const pendCurso = listaAulas.reduce((acc, x) => acc + (x.missoes_pendentes_avaliacao || 0), 0);
                out.push({
                    ...c,
                    capa_stream_url: c.capa_r2_key ? r2StreamUrl(c.capa_r2_key) : (c.capa_url || null),
                    aulas: listaAulas,
                    total_aulas: listaAulas.length,
                    total_participantes: colabsVinc.length,
                    missoes_pendentes_avaliacao: pendCurso
                });
            }

            res.json({ ok: true, cursos: out });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    });

    app.get('/api/uniamerica/cursos/:id', guardGestor, async (req, res) => {
        try {
            const cursoId = parseInt(req.params.id, 10);
            const curso = await dbGet(`SELECT * FROM uniamerica_cursos WHERE id = ?`, [cursoId]);
            if (!curso) return res.status(404).json({ error: 'Curso não encontrado.' });

            const [aulas, anexos, colabsVinc, rankingData] = await Promise.all([
                dbAll(`SELECT * FROM uniamerica_aulas WHERE curso_id = ? ORDER BY ordem ASC, id ASC`, [cursoId]),
                dbAll(`SELECT * FROM uniamerica_aula_anexos WHERE curso_id = ? ORDER BY id ASC`, [cursoId]),
                listarColaboradoresDoCurso(curso),
                calcularQuadroRankingCurso(cursoId)
            ]);

            const anexosPorAula = {};
            anexos.forEach(an => {
                if (!anexosPorAula[an.aula_id]) anexosPorAula[an.aula_id] = [];
                anexosPorAula[an.aula_id].push({ ...an, url: r2StreamUrl(an.r2_key) });
            });

            const aulasFormatadas = aulas.map(a => ({
                ...a,
                perguntas: parseJson(a.perguntas_json, []),
                missoes: parseJson(a.missoes_json, []).map(m => ({
                    ...m,
                    pdf_url: m.pdf_r2_key ? r2StreamUrl(m.pdf_r2_key) : null
                })),
                anexos: anexosPorAula[a.id] || []
            }));

            res.json({
                ok: true,
                curso: {
                    ...curso,
                    capa_stream_url: curso.capa_r2_key ? r2StreamUrl(curso.capa_r2_key) : (curso.capa_url || null)
                },
                aulas: aulasFormatadas,
                participantes: colabsVinc,
                quadro: rankingData
            });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    });

    app.post('/api/uniamerica/cursos', guardGestor, upload.single('capa'), async (req, res) => {
        try {
            const nome = String(req.body.nome || '').trim();
            if (!nome) return res.status(400).json({ error: 'Informe o nome do curso.' });

            const descricao = String(req.body.descricao || '').trim();
            const departamentos = String(req.body.departamentos || 'Nenhum').trim() || 'Nenhum';
            const colaboradores_avulsos = String(req.body.colaboradores_avulsos || '').trim();
            const carga_horaria = parseFloat(req.body.carga_horaria || '0') || 0;
            const data_inicio = String(req.body.data_inicio || '').trim() || null;
            const data_fim = String(req.body.data_fim || '').trim() || null;
            const status = String(req.body.status || 'ativo').trim();

            let capaR2Key = null;
            if (req.file && req.file.buffer) {
                capaR2Key = await salvarNoR2('CapasCursos', req.file.originalname, req.file.buffer, req.file.mimetype);
            }

            const ins = await dbRun(
                `INSERT INTO uniamerica_cursos
                 (nome, descricao, departamentos, colaboradores_avulsos, capa_r2_key, carga_horaria, data_inicio, data_fim, status, created_by)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [nome, descricao, departamentos, colaboradores_avulsos, capaR2Key, carga_horaria, data_inicio, data_fim, status, req.user.id || null]
            );

            res.json({ ok: true, id: ins.lastID });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    });

    app.put('/api/uniamerica/cursos/:id', guardGestor, upload.single('capa'), async (req, res) => {
        try {
            const cursoId = parseInt(req.params.id, 10);
            const atual = await dbGet(`SELECT * FROM uniamerica_cursos WHERE id = ?`, [cursoId]);
            if (!atual) return res.status(404).json({ error: 'Curso não encontrado.' });

            const nome = String(req.body.nome !== undefined ? req.body.nome : atual.nome).trim();
            if (!nome) return res.status(400).json({ error: 'Informe o nome do curso.' });

            const descricao = req.body.descricao !== undefined ? String(req.body.descricao).trim() : atual.descricao;
            const departamentos = req.body.departamentos !== undefined ? (String(req.body.departamentos).trim() || 'Nenhum') : atual.departamentos;
            const colaboradores_avulsos = req.body.colaboradores_avulsos !== undefined ? String(req.body.colaboradores_avulsos).trim() : atual.colaboradores_avulsos;
            const carga_horaria = req.body.carga_horaria !== undefined ? (parseFloat(req.body.carga_horaria) || 0) : atual.carga_horaria;
            const data_inicio = req.body.data_inicio !== undefined ? (String(req.body.data_inicio).trim() || null) : atual.data_inicio;
            const data_fim = req.body.data_fim !== undefined ? (String(req.body.data_fim).trim() || null) : atual.data_fim;
            const status = req.body.status !== undefined ? String(req.body.status).trim() : atual.status;
            const avaliacao_geral_obs = req.body.avaliacao_geral_obs !== undefined ? String(req.body.avaliacao_geral_obs).trim() : atual.avaliacao_geral_obs;

            let capaR2Key = atual.capa_r2_key;
            if (req.body.remover_capa === '1' && capaR2Key && r2 && r2.isReady()) {
                await r2.deleteFromR2(capaR2Key);
                capaR2Key = null;
            }
            if (req.file && req.file.buffer) {
                if (capaR2Key && r2 && r2.isReady()) await r2.deleteFromR2(capaR2Key);
                capaR2Key = await salvarNoR2('CapasCursos', req.file.originalname, req.file.buffer, req.file.mimetype);
            }

            await dbRun(
                `UPDATE uniamerica_cursos
                 SET nome = ?, descricao = ?, departamentos = ?, colaboradores_avulsos = ?, capa_r2_key = ?,
                     carga_horaria = ?, data_inicio = ?, data_fim = ?, status = ?, avaliacao_geral_obs = ?, updated_at = CURRENT_TIMESTAMP
                 WHERE id = ?`,
                [nome, descricao, departamentos, colaboradores_avulsos, capaR2Key, carga_horaria, data_inicio, data_fim, status, avaliacao_geral_obs, cursoId]
            );

            res.json({ ok: true, id: cursoId });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    });

    app.delete('/api/uniamerica/cursos/:id', guardGestor, async (req, res) => {
        try {
            const cursoId = parseInt(req.params.id, 10);
            const curso = await dbGet(`SELECT * FROM uniamerica_cursos WHERE id = ?`, [cursoId]);
            if (!curso) return res.status(404).json({ error: 'Curso não encontrado.' });

            // Limpar todos os objetos do R2 antes de excluir do banco
            if (r2 && r2.isReady()) {
                if (curso.capa_r2_key) await r2.deleteFromR2(curso.capa_r2_key);
                const aulas = await dbAll(`SELECT missoes_json FROM uniamerica_aulas WHERE curso_id = ?`, [cursoId]);
                for (const a of aulas) {
                    const missoes = parseJson(a.missoes_json, []);
                    for (const m of missoes) {
                        if (m.pdf_r2_key) await r2.deleteFromR2(m.pdf_r2_key);
                    }
                }
                const anexos = await dbAll(`SELECT r2_key FROM uniamerica_aula_anexos WHERE curso_id = ?`, [cursoId]);
                for (const an of anexos) if (an.r2_key) await r2.deleteFromR2(an.r2_key);

                const arqMissoes = await dbAll(`SELECT r2_key FROM uniamerica_missao_arquivos WHERE curso_id = ?`, [cursoId]);
                for (const arq of arqMissoes) if (arq.r2_key) await r2.deleteFromR2(arq.r2_key);

                const premios = await dbAll(`SELECT imagem_r2_key FROM uniamerica_premios WHERE curso_id = ?`, [cursoId]);
                for (const pr of premios) if (pr.imagem_r2_key) await r2.deleteFromR2(pr.imagem_r2_key);

                const certs = await dbAll(`SELECT r2_key FROM uniamerica_certificados WHERE curso_id = ?`, [cursoId]);
                for (const ct of certs) if (ct.r2_key) await r2.deleteFromR2(ct.r2_key);
            }

            await dbRun(`DELETE FROM uniamerica_aula_anexos WHERE curso_id = ?`, [cursoId]);
            await dbRun(`DELETE FROM uniamerica_presencas WHERE curso_id = ?`, [cursoId]);
            await dbRun(`DELETE FROM uniamerica_submissoes_teste WHERE curso_id = ?`, [cursoId]);
            await dbRun(`DELETE FROM uniamerica_submissoes_missao WHERE curso_id = ?`, [cursoId]);
            await dbRun(`DELETE FROM uniamerica_missao_arquivos WHERE curso_id = ?`, [cursoId]);
            await dbRun(`DELETE FROM uniamerica_premios WHERE curso_id = ?`, [cursoId]);
            await dbRun(`DELETE FROM uniamerica_certificados WHERE curso_id = ?`, [cursoId]);
            await dbRun(`DELETE FROM uniamerica_aulas WHERE curso_id = ?`, [cursoId]);
            await dbRun(`DELETE FROM uniamerica_cursos WHERE id = ?`, [cursoId]);

            res.json({ ok: true });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    });

    // ═══════════════════════════════════════════════════════════════════════════
    //  AULAS DO CURSO — DETALHES, PERGUNTAS (1..10 pts), MISSÕES (1..10 pts + PDF R2)
    // ═══════════════════════════════════════════════════════════════════════════
    function normalizarPerguntasAula(raw) {
        const arr = Array.isArray(raw) ? raw : parseJson(raw, []);
        return arr.map((q, idx) => {
            const opcoes = Array.isArray(q.opcoes) ? q.opcoes.map(o => String(o || '').trim()).filter(Boolean) : [];
            const notaPts = Math.max(1, Math.min(10, parseFloat(q.nota_pontos) || 1));
            const corretaIdx = Math.max(0, Math.min(Math.max(0, opcoes.length - 1), parseInt(q.correta_idx, 10) || 0));
            return {
                id: q.id || `q_${Date.now()}_${idx}`,
                pergunta: String(q.pergunta || '').trim(),
                opcoes,
                correta_idx: corretaIdx,
                nota_pontos: notaPts
            };
        }).filter(q => q.pergunta && q.opcoes.length >= 2);
    }

    function normalizarMissoesAula(raw) {
        const arr = Array.isArray(raw) ? raw : parseJson(raw, []);
        return arr.map((m, idx) => {
            const notaMax = Math.max(1, Math.min(10, parseFloat(m.nota_maxima) || 10));
            const campos = Array.isArray(m.campos) ? m.campos.map((c, cIdx) => ({
                id: c.id || `campo_${Date.now()}_${idx}_${cIdx}`,
                tipo: ['texto', 'multipla_escolha', 'documento', 'audio', 'imagem', 'estrelas'].includes(c.tipo) ? c.tipo : 'texto',
                label: String(c.label || '').trim(),
                obrigatorio: !!c.obrigatorio,
                opcoes: Array.isArray(c.opcoes) ? c.opcoes.map(o => String(o || '').trim()).filter(Boolean) : [],
                correta_idx: c.correta_idx !== undefined && c.correta_idx !== null && c.correta_idx !== '' ? parseInt(c.correta_idx, 10) : null
            })).filter(c => c.label) : [];

            return {
                id: m.id || `m_${Date.now()}_${idx}`,
                titulo: String(m.titulo || '').trim(),
                descricao: String(m.descricao || '').trim(),
                nota_maxima: notaMax,
                prazo_dias: 7, // Regra obrigatória: missões válidas por 1 semana (7 dias)
                pdf_r2_key: m.pdf_r2_key || null,
                pdf_nome: m.pdf_nome || null,
                campos
            };
        }).filter(m => m.titulo);
    }

    app.post('/api/uniamerica/cursos/:cursoId/aulas', guardGestor, async (req, res) => {
        try {
            const cursoId = parseInt(req.params.cursoId, 10);
            const titulo = String(req.body.titulo || '').trim();
            if (!titulo) return res.status(400).json({ error: 'Informe o título da aula.' });

            const maxOrd = await dbGet(`SELECT COALESCE(MAX(ordem), 0) AS m FROM uniamerica_aulas WHERE curso_id = ?`, [cursoId]);
            const ordem = req.body.ordem ? parseInt(req.body.ordem, 10) : ((maxOrd ? maxOrd.m : 0) + 1);
            const descricao = String(req.body.descricao || '').trim();
            const data_aula = String(req.body.data_aula || '').trim() || null;
            const carga_horaria = parseFloat(req.body.carga_horaria || '0') || 0;
            const perguntas = normalizarPerguntasAula(req.body.perguntas || []);
            const missoes = normalizarMissoesAula(req.body.missoes || []);

            const ins = await dbRun(
                `INSERT INTO uniamerica_aulas
                 (curso_id, ordem, titulo, descricao, data_aula, carga_horaria, perguntas_json, missoes_json)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [cursoId, ordem, titulo, descricao, data_aula, carga_horaria, JSON.stringify(perguntas), JSON.stringify(missoes)]
            );

            res.json({ ok: true, id: ins.lastID });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    });

    app.put('/api/uniamerica/aulas/:aulaId', guardGestor, async (req, res) => {
        try {
            const aulaId = parseInt(req.params.aulaId, 10);
            const atual = await dbGet(`SELECT * FROM uniamerica_aulas WHERE id = ?`, [aulaId]);
            if (!atual) return res.status(404).json({ error: 'Aula não encontrada.' });

            const titulo = req.body.titulo !== undefined ? String(req.body.titulo).trim() : atual.titulo;
            if (!titulo) return res.status(400).json({ error: 'Informe o título da aula.' });

            const ordem = req.body.ordem !== undefined ? (parseInt(req.body.ordem, 10) || atual.ordem) : atual.ordem;
            const descricao = req.body.descricao !== undefined ? String(req.body.descricao).trim() : atual.descricao;
            const data_aula = req.body.data_aula !== undefined ? (String(req.body.data_aula).trim() || null) : atual.data_aula;
            const carga_horaria = req.body.carga_horaria !== undefined ? (parseFloat(req.body.carga_horaria) || 0) : atual.carga_horaria;
            const perguntas = req.body.perguntas !== undefined ? normalizarPerguntasAula(req.body.perguntas) : parseJson(atual.perguntas_json, []);
            const missoes = req.body.missoes !== undefined ? normalizarMissoesAula(req.body.missoes) : parseJson(atual.missoes_json, []);

            await dbRun(
                `UPDATE uniamerica_aulas
                 SET ordem = ?, titulo = ?, descricao = ?, data_aula = ?, carga_horaria = ?,
                     perguntas_json = ?, missoes_json = ?, updated_at = CURRENT_TIMESTAMP
                 WHERE id = ?`,
                [ordem, titulo, descricao, data_aula, carga_horaria, JSON.stringify(perguntas), JSON.stringify(missoes), aulaId]
            );

            res.json({ ok: true, id: aulaId });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    });

    app.delete('/api/uniamerica/aulas/:aulaId', guardGestor, async (req, res) => {
        try {
            const aulaId = parseInt(req.params.aulaId, 10);
            const atual = await dbGet(`SELECT * FROM uniamerica_aulas WHERE id = ?`, [aulaId]);
            if (!atual) return res.status(404).json({ error: 'Aula não encontrada.' });

            if (r2 && r2.isReady()) {
                const missoes = parseJson(atual.missoes_json, []);
                for (const m of missoes) if (m.pdf_r2_key) await r2.deleteFromR2(m.pdf_r2_key);

                const anexos = await dbAll(`SELECT r2_key FROM uniamerica_aula_anexos WHERE aula_id = ?`, [aulaId]);
                for (const an of anexos) if (an.r2_key) await r2.deleteFromR2(an.r2_key);

                const arqMissoes = await dbAll(`SELECT r2_key FROM uniamerica_missao_arquivos WHERE aula_id = ?`, [aulaId]);
                for (const arq of arqMissoes) if (arq.r2_key) await r2.deleteFromR2(arq.r2_key);
            }

            await dbRun(`DELETE FROM uniamerica_aula_anexos WHERE aula_id = ?`, [aulaId]);
            await dbRun(`DELETE FROM uniamerica_presencas WHERE aula_id = ?`, [aulaId]);
            await dbRun(`DELETE FROM uniamerica_submissoes_teste WHERE aula_id = ?`, [aulaId]);
            await dbRun(`DELETE FROM uniamerica_submissoes_missao WHERE aula_id = ?`, [aulaId]);
            await dbRun(`DELETE FROM uniamerica_missao_arquivos WHERE aula_id = ?`, [aulaId]);
            await dbRun(`DELETE FROM uniamerica_aulas WHERE id = ?`, [aulaId]);

            res.json({ ok: true });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    });

    // Upload de PDF de Instrução de uma Missão da Aula (R2)
    app.post('/api/uniamerica/aulas/:aulaId/missao-pdf', guardGestor, upload.single('pdf'), async (req, res) => {
        try {
            const aulaId = parseInt(req.params.aulaId, 10);
            const aula = await dbGet(`SELECT * FROM uniamerica_aulas WHERE id = ?`, [aulaId]);
            if (!aula) return res.status(404).json({ error: 'Aula não encontrada.' });
            if (!req.file || !req.file.buffer) return res.status(400).json({ error: 'Envie o arquivo PDF da missão.' });

            const r2Key = await salvarNoR2('MissoesPDF', req.file.originalname, req.file.buffer, 'application/pdf');
            res.json({
                ok: true,
                pdf_r2_key: r2Key,
                pdf_nome: req.file.originalname,
                pdf_url: r2StreamUrl(r2Key)
            });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    });

    // Upload e exclusão de Materiais/Anexos da Aula (mesmo layout de Materiais de Treinamento, salvo no R2)
    app.post('/api/uniamerica/aulas/:aulaId/anexos', guardGestor, upload.single('arquivo'), async (req, res) => {
        try {
            const aulaId = parseInt(req.params.aulaId, 10);
            const aula = await dbGet(`SELECT * FROM uniamerica_aulas WHERE id = ?`, [aulaId]);
            if (!aula) return res.status(404).json({ error: 'Aula não encontrada.' });
            if (!req.file || !req.file.buffer) return res.status(400).json({ error: 'Nenhum arquivo enviado.' });

            const r2Key = await salvarNoR2('MateriaisAula', req.file.originalname, req.file.buffer, req.file.mimetype);
            const ins = await dbRun(
                `INSERT INTO uniamerica_aula_anexos (curso_id, aula_id, nome_arquivo, tipo_mime, tamanho_bytes, r2_key)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [aula.curso_id, aulaId, req.file.originalname, req.file.mimetype || 'application/octet-stream', req.file.size || 0, r2Key]
            );

            res.json({
                ok: true,
                id: ins.lastID,
                nome_arquivo: req.file.originalname,
                tipo_mime: req.file.mimetype,
                r2_key: r2Key,
                url: r2StreamUrl(r2Key)
            });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    });

    app.delete('/api/uniamerica/aulas/:aulaId/anexos/:anexoId', guardGestor, async (req, res) => {
        try {
            const anexoId = parseInt(req.params.anexoId, 10);
            const row = await dbGet(`SELECT * FROM uniamerica_aula_anexos WHERE id = ?`, [anexoId]);
            if (!row) return res.status(404).json({ error: 'Anexo não encontrado.' });

            if (row.r2_key && r2 && r2.isReady()) {
                await r2.deleteFromR2(row.r2_key);
            }
            await dbRun(`DELETE FROM uniamerica_aula_anexos WHERE id = ?`, [anexoId]);
            res.json({ ok: true });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    });

    // ═══════════════════════════════════════════════════════════════════════════
    //  FLUXO DE AULA: INICIAR AULA (BLOQUEIA SE HOUVER MISSÃO DA AULA ANTERIOR SEM AVALIAÇÃO!) & CONCLUIR AULA
    // ═══════════════════════════════════════════════════════════════════════════
    app.post('/api/uniamerica/aulas/:aulaId/iniciar', guardGestor, async (req, res) => {
        try {
            const aulaId = parseInt(req.params.aulaId, 10);
            const aula = await dbGet(`SELECT * FROM uniamerica_aulas WHERE id = ?`, [aulaId]);
            if (!aula) return res.status(404).json({ error: 'Aula não encontrada.' });

            const todasAulas = await dbAll(`SELECT * FROM uniamerica_aulas WHERE curso_id = ? ORDER BY ordem ASC, id ASC`, [aula.curso_id]);
            const idx = todasAulas.findIndex(x => x.id === aula.id);

            // Regra obrigatória: Antes de iniciar a próxima aula, é obrigatório avaliar todas as missões
            // realizadas pelos colaboradores nas aulas anteriores (dando nota de 1 a 10 para cada missão)!
            if (idx > 0) {
                const aulasAnterioresIds = todasAulas.slice(0, idx).map(x => x.id);
                const placeholders = aulasAnterioresIds.map(() => '?').join(',');
                const pendentes = await dbAll(
                    `SELECT sm.*, c.nome_completo, a.titulo AS aula_titulo, a.ordem AS aula_ordem
                     FROM uniamerica_submissoes_missao sm
                     JOIN colaboradores c ON c.id = sm.colaborador_id
                     JOIN uniamerica_aulas a ON a.id = sm.aula_id
                     WHERE sm.aula_id IN (${placeholders})
                       AND sm.status != 'avaliada'`,
                    aulasAnterioresIds
                );

                if (pendentes.length > 0) {
                    return res.status(409).json({
                        error: `Antes de iniciar a aula "${aula.titulo}", é obrigatório avaliar e atribuir nota (de 1 a 10) para todas as ${pendentes.length} missão(ões) realizada(s) pelos colaboradores na aula anterior!`,
                        codigo: 'MISSOES_ANTERIORES_PENDENTES',
                        aula_anterior_id: pendentes[0].aula_id,
                        pendentes
                    });
                }
            }

            await dbRun(
                `UPDATE uniamerica_aulas
                 SET status_aula = 'em_andamento', iniciada_em = COALESCE(iniciada_em, CURRENT_TIMESTAMP), updated_at = CURRENT_TIMESTAMP
                 WHERE id = ?`,
                [aulaId]
            );

            res.json({ ok: true, status_aula: 'em_andamento' });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    });

    app.post('/api/uniamerica/aulas/:aulaId/concluir', guardGestor, async (req, res) => {
        try {
            const aulaId = parseInt(req.params.aulaId, 10);
            await dbRun(
                `UPDATE uniamerica_aulas
                 SET status_aula = 'concluida', concluida_em = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
                 WHERE id = ?`,
                [aulaId]
            );
            res.json({ ok: true, status_aula: 'concluida' });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    });

    // ═══════════════════════════════════════════════════════════════════════════
    //  LISTA DE PRESENÇA POR AULA (LIBERA AS MISSÕES DA SEMANA PARA OS PRESENTES!)
    // ═══════════════════════════════════════════════════════════════════════════
    app.get('/api/uniamerica/aulas/:aulaId/presenca', guardGestor, async (req, res) => {
        try {
            const aulaId = parseInt(req.params.aulaId, 10);
            const aula = await dbGet(`SELECT * FROM uniamerica_aulas WHERE id = ?`, [aulaId]);
            if (!aula) return res.status(404).json({ error: 'Aula não encontrada.' });

            const curso = await dbGet(`SELECT * FROM uniamerica_cursos WHERE id = ?`, [aula.curso_id]);
            const colabs = await listarColaboradoresDoCurso(curso);
            const presRows = await dbAll(`SELECT * FROM uniamerica_presencas WHERE aula_id = ?`, [aulaId]);

            const presMap = {};
            presRows.forEach(p => { presMap[p.colaborador_id] = p; });

            const lista = colabs.map(c => {
                const pr = presMap[c.id];
                return {
                    colaborador_id: c.id,
                    nome_completo: c.nome_completo,
                    cargo: c.cargo,
                    departamento: c.departamento,
                    foto_url: `/api/colaboradores/foto/${c.id}`,
                    presente: !!(pr && Number(pr.presente) === 1),
                    liberado_missao_em: pr ? pr.liberado_missao_em : null,
                    registrado_em: pr ? pr.registrado_em : null
                };
            });

            res.json({ ok: true, aula, lista });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    });

    app.put('/api/uniamerica/aulas/:aulaId/presenca', guardGestor, async (req, res) => {
        try {
            const aulaId = parseInt(req.params.aulaId, 10);
            const aula = await dbGet(`SELECT * FROM uniamerica_aulas WHERE id = ?`, [aulaId]);
            if (!aula) return res.status(404).json({ error: 'Aula não encontrada.' });

            // Aceita tanto atualização individual { colaborador_id, presente } quanto em lote { presencas: [{colaborador_id, presente}] }
            const itens = Array.isArray(req.body.presencas)
                ? req.body.presencas
                : [{ colaborador_id: req.body.colaborador_id, presente: req.body.presente }];

            for (const item of itens) {
                const colabId = parseInt(item.colaborador_id, 10);
                if (!colabId) continue;
                const pres = item.presente ? 1 : 0;

                if (pres === 1) {
                    await dbRun(
                        `INSERT INTO uniamerica_presencas (curso_id, aula_id, colaborador_id, presente, liberado_missao_em, registrado_por, registrado_em)
                         VALUES (?, ?, ?, 1, CURRENT_TIMESTAMP, ?, CURRENT_TIMESTAMP)
                         ON CONFLICT(aula_id, colaborador_id)
                         DO UPDATE SET presente = 1,
                                       liberado_missao_em = COALESCE(uniamerica_presencas.liberado_missao_em, CURRENT_TIMESTAMP),
                                       registrado_por = excluded.registrado_por,
                                       registrado_em = CURRENT_TIMESTAMP`,
                        [aula.curso_id, aulaId, colabId, req.user.id || null]
                    );
                } else {
                    await dbRun(
                        `INSERT INTO uniamerica_presencas (curso_id, aula_id, colaborador_id, presente, liberado_missao_em, registrado_por, registrado_em)
                         VALUES (?, ?, ?, 0, NULL, ?, CURRENT_TIMESTAMP)
                         ON CONFLICT(aula_id, colaborador_id)
                         DO UPDATE SET presente = 0,
                                       liberado_missao_em = NULL,
                                       registrado_por = excluded.registrado_por,
                                       registrado_em = CURRENT_TIMESTAMP`,
                        [aula.curso_id, aulaId, colabId, req.user.id || null]
                    );
                }
            }

            res.json({ ok: true });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    });

    // ═══════════════════════════════════════════════════════════════════════════
    //  AVALIAÇÃO PELO GESTOR UNIAMÉRICA (RESPOSTAS DO TESTE EM AULA & MISSÕES 1..10)
    // ═══════════════════════════════════════════════════════════════════════════
    app.get('/api/uniamerica/aulas/:aulaId/avaliacoes', guardGestor, async (req, res) => {
        try {
            const aulaId = parseInt(req.params.aulaId, 10);
            const aula = await dbGet(`SELECT * FROM uniamerica_aulas WHERE id = ?`, [aulaId]);
            if (!aula) return res.status(404).json({ error: 'Aula não encontrada.' });

            const curso = await dbGet(`SELECT * FROM uniamerica_cursos WHERE id = ?`, [aula.curso_id]);
            const [colabs, presRows, testesRows, missoesRows, arquivosRows] = await Promise.all([
                listarColaboradoresDoCurso(curso),
                dbAll(`SELECT * FROM uniamerica_presencas WHERE aula_id = ?`, [aulaId]),
                dbAll(`SELECT * FROM uniamerica_submissoes_teste WHERE aula_id = ?`, [aulaId]),
                dbAll(`SELECT * FROM uniamerica_submissoes_missao WHERE aula_id = ?`, [aulaId]),
                dbAll(`SELECT * FROM uniamerica_missao_arquivos WHERE aula_id = ?`, [aulaId])
            ]);

            const presMap = {};
            presRows.forEach(p => { presMap[p.colaborador_id] = p; });
            const testeMap = {};
            testesRows.forEach(t => { testeMap[t.colaborador_id] = { ...t, respostas: parseJson(t.respostas_json, {}) }; });
            const missaoMap = {};
            missoesRows.forEach(m => { missaoMap[`${m.colaborador_id}_${m.missao_id}`] = { ...m, respostas: parseJson(m.respostas_json, {}) }; });

            const arqMap = {};
            arquivosRows.forEach(ar => {
                const k = `${ar.colaborador_id}_${ar.missao_id}`;
                if (!arqMap[k]) arqMap[k] = [];
                arqMap[k].push({ ...ar, url: r2StreamUrl(ar.r2_key) });
            });

            const perguntas = parseJson(aula.perguntas_json, []);
            const missoes = parseJson(aula.missoes_json, []).map(m => ({
                ...m,
                pdf_url: m.pdf_r2_key ? r2StreamUrl(m.pdf_r2_key) : null
            }));

            const participantes = colabs.map(c => {
                const pr = presMap[c.id];
                const st = testeMap[c.id] || null;
                const entregasMissoes = missoes.map(m => {
                    const sm = missaoMap[`${c.id}_${m.id}`] || null;
                    return {
                        missao_id: m.id,
                        titulo: m.titulo,
                        nota_maxima: m.nota_maxima,
                        submissao: sm,
                        arquivos: arqMap[`${c.id}_${m.id}`] || []
                    };
                });
                return {
                    colaborador_id: c.id,
                    nome_completo: c.nome_completo,
                    cargo: c.cargo,
                    departamento: c.departamento,
                    foto_url: `/api/colaboradores/foto/${c.id}`,
                    presente: !!(pr && Number(pr.presente) === 1),
                    teste: st,
                    missoes: entregasMissoes
                };
            });

            res.json({
                ok: true,
                aula: { ...aula, perguntas, missoes },
                participantes
            });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    });

    // Gestor avalia / confirma pontuação da Missão (nota obrigatória de 1 a 10)
    app.put('/api/uniamerica/submissoes-missao/avaliar', guardGestor, async (req, res) => {
        try {
            const aulaId = parseInt(req.body.aula_id, 10);
            const colaboradorId = parseInt(req.body.colaborador_id, 10);
            const missaoId = String(req.body.missao_id || '').trim();
            const notaGestor = parseFloat(req.body.nota_gestor);
            const feedbackGestor = String(req.body.feedback_gestor || '').trim();

            if (!aulaId || !colaboradorId || !missaoId || isNaN(notaGestor) || notaGestor < 1 || notaGestor > 10) {
                return res.status(400).json({ error: 'Informe uma nota válida de 1 a 10 para avaliar a missão do colaborador.' });
            }

            const aula = await dbGet(`SELECT * FROM uniamerica_aulas WHERE id = ?`, [aulaId]);
            if (!aula) return res.status(404).json({ error: 'Aula não encontrada.' });

            await dbRun(
                `INSERT INTO uniamerica_submissoes_missao
                 (curso_id, aula_id, missao_id, colaborador_id, respostas_json, nota_gestor, feedback_gestor, status, avaliado_por, avaliado_em)
                 VALUES (?, ?, ?, ?, '{}', ?, ?, 'avaliada', ?, CURRENT_TIMESTAMP)
                 ON CONFLICT(aula_id, missao_id, colaborador_id)
                 DO UPDATE SET nota_gestor = excluded.nota_gestor,
                               feedback_gestor = excluded.feedback_gestor,
                               status = 'avaliada',
                               avaliado_por = excluded.avaliado_por,
                               avaliado_em = CURRENT_TIMESTAMP`,
                [aula.curso_id, aulaId, missaoId, colaboradorId, notaGestor, feedbackGestor, req.user.id || null]
            );

            res.json({ ok: true, nota_gestor: notaGestor });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    });

    // Gestor avalia / ajusta pontuação do Teste em Aula
    app.put('/api/uniamerica/submissoes-teste/avaliar', guardGestor, async (req, res) => {
        try {
            const aulaId = parseInt(req.body.aula_id, 10);
            const colaboradorId = parseInt(req.body.colaborador_id, 10);
            const pontosGestor = parseFloat(req.body.pontos_gestor);
            const feedbackGestor = String(req.body.feedback_gestor || '').trim();

            if (!aulaId || !colaboradorId || isNaN(pontosGestor) || pontosGestor < 0) {
                return res.status(400).json({ error: 'Informe uma pontuação válida para o formulário de aula.' });
            }

            const aula = await dbGet(`SELECT * FROM uniamerica_aulas WHERE id = ?`, [aulaId]);
            if (!aula) return res.status(404).json({ error: 'Aula não encontrada.' });

            await dbRun(
                `INSERT INTO uniamerica_submissoes_teste
                 (curso_id, aula_id, colaborador_id, respostas_json, pontos_calculados, pontos_gestor, feedback_gestor, avaliado_por, avaliado_em)
                 VALUES (?, ?, ?, '{}', ?, ?, ?, ?, CURRENT_TIMESTAMP)
                 ON CONFLICT(aula_id, colaborador_id)
                 DO UPDATE SET pontos_gestor = excluded.pontos_gestor,
                               feedback_gestor = excluded.feedback_gestor,
                               avaliado_por = excluded.avaliado_por,
                               avaliado_em = CURRENT_TIMESTAMP`,
                [aula.curso_id, aulaId, colaboradorId, pontosGestor, pontosGestor, feedbackGestor, req.user.id || null]
            );

            res.json({ ok: true, pontos_gestor: pontosGestor });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    });

    // ═══════════════════════════════════════════════════════════════════════════
    //  RANKING POR CURSO, ABA PRÊMIOS E EMISSÃO DE CERTIFICADOS (ANEXO 2)
    // ═══════════════════════════════════════════════════════════════════════════
    app.get('/api/uniamerica/ranking', guardGestor, async (req, res) => {
        try {
            const idsRaw = String(req.query.curso_ids || '').trim();
            let cursos = await dbAll(`SELECT id FROM uniamerica_cursos ORDER BY created_at DESC, id DESC`);
            if (idsRaw) {
                const filtroSet = new Set(idsRaw.split(',').map(x => parseInt(x.trim(), 10)).filter(n => !isNaN(n)));
                if (filtroSet.size > 0) cursos = cursos.filter(c => filtroSet.has(c.id));
            }

            const quadros = [];
            for (const c of cursos) {
                const q = await calcularQuadroRankingCurso(c.id);
                if (q) quadros.push(q);
            }
            res.json({ ok: true, quadros });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    });

    app.get('/api/uniamerica/cursos/:cursoId/premios', authenticateToken, async (req, res) => {
        try {
            const cursoId = parseInt(req.params.cursoId, 10);
            const rows = await dbAll(`SELECT * FROM uniamerica_premios WHERE curso_id = ? ORDER BY colocacao ASC`, [cursoId]);
            res.json({
                ok: true,
                premios: rows.map(p => ({
                    ...p,
                    imagem_url: p.imagem_r2_key ? r2StreamUrl(p.imagem_r2_key) : null
                }))
            });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    });

    app.post('/api/uniamerica/cursos/:cursoId/premios', guardGestor, upload.single('imagem'), async (req, res) => {
        try {
            const cursoId = parseInt(req.params.cursoId, 10);
            const colocacao = parseInt(req.body.colocacao, 10);
            const titulo = String(req.body.titulo || '').trim();
            const descricao = String(req.body.descricao || '').trim();
            const recompensa = String(req.body.recompensa || '').trim();

            if (!cursoId || !colocacao || colocacao < 1 || !titulo) {
                return res.status(400).json({ error: 'Informe a colocação no ranking (1º, 2º, 3º...) e o nome do prêmio.' });
            }

            const existente = await dbGet(`SELECT * FROM uniamerica_premios WHERE curso_id = ? AND colocacao = ?`, [cursoId, colocacao]);
            let imgR2Key = existente ? existente.imagem_r2_key : null;

            if (req.file && req.file.buffer) {
                if (imgR2Key && r2 && r2.isReady()) await r2.deleteFromR2(imgR2Key);
                imgR2Key = await salvarNoR2('Premios', req.file.originalname, req.file.buffer, req.file.mimetype);
            }

            await dbRun(
                `INSERT INTO uniamerica_premios (curso_id, colocacao, titulo, descricao, recompensa, imagem_r2_key)
                 VALUES (?, ?, ?, ?, ?, ?)
                 ON CONFLICT(curso_id, colocacao)
                 DO UPDATE SET titulo = excluded.titulo,
                               descricao = excluded.descricao,
                               recompensa = excluded.recompensa,
                               imagem_r2_key = excluded.imagem_r2_key`,
                [cursoId, colocacao, titulo, descricao, recompensa, imgR2Key]
            );

            res.json({ ok: true });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    });

    app.delete('/api/uniamerica/premios/:premioId', guardGestor, async (req, res) => {
        try {
            const premioId = parseInt(req.params.premioId, 10);
            const row = await dbGet(`SELECT * FROM uniamerica_premios WHERE id = ?`, [premioId]);
            if (!row) return res.status(404).json({ error: 'Prêmio não encontrado.' });

            if (row.imagem_r2_key && r2 && r2.isReady()) {
                await r2.deleteFromR2(row.imagem_r2_key);
            }
            await dbRun(`DELETE FROM uniamerica_premios WHERE id = ?`, [premioId]);
            res.json({ ok: true });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    });

    // Emissão e persistência do Certificado (apenas para quem participou de TODAS as aulas do curso!)
    app.post('/api/uniamerica/cursos/:cursoId/certificados', guardGestor, async (req, res) => {
        try {
            const cursoId = parseInt(req.params.cursoId, 10);
            const colaboradorId = parseInt(req.body.colaborador_id, 10);
            const imagemBase64 = String(req.body.imagem_base64 || '').trim();
            const periodoTexto = String(req.body.periodo_texto || '').trim();

            const quadro = await calcularQuadroRankingCurso(cursoId);
            if (!quadro) return res.status(404).json({ error: 'Curso não encontrado.' });
            if (quadro.total_aulas === 0) {
                return res.status(400).json({ error: 'Este curso ainda não possui aulas cadastradas.' });
            }

            const part = quadro.ranking.find(p => p.colaborador_id === colaboradorId);
            if (!part) {
                return res.status(404).json({ error: 'Colaborador não está vinculado a este curso.' });
            }

            // Regra obrigatória: Apenas colaboradores que participaram de TODAS as aulas recebem certificado!
            if (!part.elegivel_certificado) {
                return res.status(403).json({
                    error: `Certificado bloqueado: ${part.nome_completo} participou de ${part.aulas_presentes} de ${part.total_aulas} aula(s). Apenas colaboradores com presença em todas as aulas podem receber o certificado.`
                });
            }

            const existente = await dbGet(`SELECT * FROM uniamerica_certificados WHERE curso_id = ? AND colaborador_id = ?`, [cursoId, colaboradorId]);
            let r2Key = existente ? existente.r2_key : null;

            if (imagemBase64 && r2 && r2.isReady()) {
                const raw = imagemBase64.replace(/^data:image\/\w+;base64,/, '');
                const buf = Buffer.from(raw, 'base64');
                if (r2Key) await r2.deleteFromR2(r2Key);
                r2Key = await salvarNoR2('Certificados', `Certificado_${part.nome_completo}_${quadro.curso.nome}.png`, buf, 'image/png');
            }

            const codigo = existente ? existente.codigo_validacao : `UA-${cursoId}-${colaboradorId}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

            await dbRun(
                `INSERT INTO uniamerica_certificados
                 (curso_id, colaborador_id, codigo_validacao, nome_colaborador, nome_curso, carga_horaria, periodo_texto, r2_key, emitido_por, emitido_em)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                 ON CONFLICT(curso_id, colaborador_id)
                 DO UPDATE SET carga_horaria = excluded.carga_horaria,
                               periodo_texto = excluded.periodo_texto,
                               r2_key = COALESCE(excluded.r2_key, uniamerica_certificados.r2_key),
                               emitido_por = excluded.emitido_por,
                               emitido_em = CURRENT_TIMESTAMP`,
                [cursoId, colaboradorId, codigo, part.nome_completo, quadro.curso.nome, quadro.curso.carga_horaria || 0, periodoTexto, r2Key, req.user.id || null]
            );

            res.json({
                ok: true,
                codigo_validacao: codigo,
                arquivo_url: r2Key ? r2StreamUrl(r2Key) : null
            });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    });

    // ═══════════════════════════════════════════════════════════════════════════
    //  TELA "MISSÕES" DO COLABORADOR (ATIVADA SOMENTE COM PRESENÇA NA AULA + PRAZO DE 7 DIAS)
    // ═══════════════════════════════════════════════════════════════════════════
    app.get('/api/uniamerica/minhas-missoes', guardParticipante, async (req, res) => {
        try {
            const gestor = await isGestorUniAmerica(req.user);
            const colab = await resolverColaboradorDoUsuario(req.user, req);

            // Lista de colaboradores ativos caso o gestor queira visualizar como qualquer colaborador
            const listaColabsGestor = gestor
                ? await dbAll(`SELECT id, nome_completo, cargo, departamento FROM colaboradores WHERE status NOT LIKE 'Desligado%' ORDER BY nome_completo ASC`)
                : [];

            if (!colab) {
                return res.json({
                    ok: true,
                    sem_vinculo: true,
                    is_gestor: gestor,
                    colaboradores_seletor: listaColabsGestor,
                    cursos: []
                });
            }

            const todosCursos = await dbAll(`SELECT * FROM uniamerica_cursos WHERE status != 'arquivado' ORDER BY created_at DESC, id DESC`);
            const meusCursos = [];

            for (const curso of todosCursos) {
                const vinculados = await listarColaboradoresDoCurso(curso);
                if (!vinculados.some(v => Number(v.id) === Number(colab.id))) continue;

                const quadro = await calcularQuadroRankingCurso(curso.id);
                const meuRank = quadro ? quadro.ranking.find(r => r.colaborador_id === colab.id) : null;

                const [aulas, anexos, presRows, testesRows, missoesRows, arqRows] = await Promise.all([
                    dbAll(`SELECT * FROM uniamerica_aulas WHERE curso_id = ? ORDER BY ordem ASC, id ASC`, [curso.id]),
                    dbAll(`SELECT * FROM uniamerica_aula_anexos WHERE curso_id = ? ORDER BY id ASC`, [curso.id]),
                    dbAll(`SELECT * FROM uniamerica_presencas WHERE curso_id = ? AND colaborador_id = ?`, [curso.id, colab.id]),
                    dbAll(`SELECT * FROM uniamerica_submissoes_teste WHERE curso_id = ? AND colaborador_id = ?`, [curso.id, colab.id]),
                    dbAll(`SELECT * FROM uniamerica_submissoes_missao WHERE curso_id = ? AND colaborador_id = ?`, [curso.id, colab.id]),
                    dbAll(`SELECT * FROM uniamerica_missao_arquivos WHERE curso_id = ? AND colaborador_id = ?`, [curso.id, colab.id])
                ]);

                const presMap = {};
                presRows.forEach(p => { presMap[p.aula_id] = p; });
                const testeMap = {};
                testesRows.forEach(t => { testeMap[t.aula_id] = { ...t, respostas: parseJson(t.respostas_json, {}) }; });
                const missaoMap = {};
                missoesRows.forEach(m => { missaoMap[`${m.aula_id}_${m.missao_id}`] = { ...m, respostas: parseJson(m.respostas_json, {}) }; });
                const arqMap = {};
                arqRows.forEach(ar => {
                    const k = `${ar.aula_id}_${ar.missao_id}`;
                    if (!arqMap[k]) arqMap[k] = [];
                    arqMap[k].push({ ...ar, url: r2StreamUrl(ar.r2_key) });
                });
                const anexosPorAula = {};
                anexos.forEach(an => {
                    if (!anexosPorAula[an.aula_id]) anexosPorAula[an.aula_id] = [];
                    anexosPorAula[an.aula_id].push({ ...an, url: r2StreamUrl(an.r2_key) });
                });

                const agoraMs = Date.now();
                const aulasDetalhe = aulas.map(a => {
                    const pr = presMap[a.id];
                    const presente = !!(pr && Number(pr.presente) === 1);

                    // Regra de validade de 1 semana (7 dias) a partir da presença na aula
                    let expiraEmIso = null;
                    let prazoExpirado = false;
                    let diasRestantes = 7;
                    if (presente && pr.liberado_missao_em) {
                        const baseMs = new Date(pr.liberado_missao_em.replace(' ', 'T') + (pr.liberado_missao_em.includes('Z') ? '' : 'Z')).getTime() || Date.now();
                        const fimMs = baseMs + (7 * 24 * 60 * 60 * 1000);
                        expiraEmIso = new Date(fimMs).toISOString();
                        prazoExpirado = agoraMs > fimMs;
                        diasRestantes = Math.max(0, Math.ceil((fimMs - agoraMs) / (24 * 60 * 60 * 1000)));
                    }

                    const subTeste = testeMap[a.id] || null;
                    // Ocultar gabarito para quem ainda não respondeu o teste
                    const perguntasPublicas = parseJson(a.perguntas_json, []).map(q => ({
                        id: q.id,
                        pergunta: q.pergunta,
                        opcoes: q.opcoes,
                        nota_pontos: q.nota_pontos,
                        ...(subTeste ? { correta_idx: q.correta_idx } : {})
                    }));

                    const missoesPublicas = parseJson(a.missoes_json, []).map(m => {
                        const sm = missaoMap[`${a.id}_${m.id}`] || null;
                        return {
                            id: m.id,
                            titulo: m.titulo,
                            descricao: m.descricao,
                            nota_maxima: m.nota_maxima,
                            prazo_dias: 7,
                            pdf_nome: m.pdf_nome,
                            pdf_url: presente && m.pdf_r2_key ? r2StreamUrl(m.pdf_r2_key) : null,
                            campos: (m.campos || []).map(cp => ({
                                id: cp.id,
                                tipo: cp.tipo,
                                label: cp.label,
                                obrigatorio: cp.obrigatorio,
                                opcoes: cp.opcoes || []
                            })),
                            submissao: sm,
                            arquivos: arqMap[`${a.id}_${m.id}`] || []
                        };
                    });

                    return {
                        id: a.id,
                        ordem: a.ordem,
                        titulo: a.titulo,
                        descricao: a.descricao,
                        data_aula: a.data_aula,
                        carga_horaria: a.carga_horaria,
                        status_aula: a.status_aula,
                        presente,
                        liberada_para_responder: presente,
                        expira_em: expiraEmIso,
                        prazo_expirado: prazoExpirado,
                        dias_restantes: diasRestantes,
                        anexos: presente ? (anexosPorAula[a.id] || []) : [],
                        perguntas: presente ? perguntasPublicas : [],
                        submissao_teste: subTeste,
                        missoes: missoesPublicas
                    };
                });

                meusCursos.push({
                    id: curso.id,
                    nome: curso.nome,
                    descricao: curso.descricao,
                    carga_horaria: curso.carga_horaria,
                    data_inicio: curso.data_inicio,
                    data_fim: curso.data_fim,
                    capa_stream_url: curso.capa_r2_key ? r2StreamUrl(curso.capa_r2_key) : (curso.capa_url || null),
                    meu_desempenho: meuRank || null,
                    premios: quadro ? quadro.premios : [],
                    ranking_resumo: quadro ? quadro.ranking.slice(0, 10).map(r => ({
                        posicao: r.posicao,
                        colaborador_id: r.colaborador_id,
                        nome_completo: r.nome_completo,
                        foto_url: r.foto_url,
                        nota_total: r.nota_total,
                        premio: r.premio ? r.premio.titulo : null
                    })) : [],
                    aulas: aulasDetalhe
                });
            }

            res.json({
                ok: true,
                sem_vinculo: false,
                is_gestor: gestor,
                colaborador: {
                    id: colab.id,
                    nome_completo: colab.nome_completo,
                    cargo: colab.cargo,
                    departamento: colab.departamento,
                    foto_url: `/api/colaboradores/foto/${colab.id}`
                },
                colaboradores_seletor: listaColabsGestor,
                cursos: meusCursos
            });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    });

    // Colaborador responde o Teste de Múltipla Escolha em Aula (somente se presente na aula!)
    app.post('/api/uniamerica/aulas/:aulaId/responder-teste', guardParticipante, async (req, res) => {
        try {
            const aulaId = parseInt(req.params.aulaId, 10);
            const colab = await resolverColaboradorDoUsuario(req.user, req);
            if (!colab) return res.status(400).json({ error: 'Seu usuário não está vinculado a um colaborador.' });

            const aula = await dbGet(`SELECT * FROM uniamerica_aulas WHERE id = ?`, [aulaId]);
            if (!aula) return res.status(404).json({ error: 'Aula não encontrada.' });

            const pres = await dbGet(`SELECT * FROM uniamerica_presencas WHERE aula_id = ? AND colaborador_id = ?`, [aulaId, colab.id]);
            if (!pres || Number(pres.presente) !== 1) {
                return res.status(403).json({ error: 'Você precisa ter presença confirmada na lista de presença desta aula para responder às perguntas.' });
            }

            const jaRespondeu = await dbGet(`SELECT id FROM uniamerica_submissoes_teste WHERE aula_id = ? AND colaborador_id = ?`, [aulaId, colab.id]);
            if (jaRespondeu) {
                return res.status(400).json({ error: 'Você já enviou suas respostas para o formulário desta aula.' });
            }

            const respostas = req.body.respostas || {};
            const perguntas = parseJson(aula.perguntas_json, []);

            // Soma dos pontos (1 a 10 por pergunta acertada — NÃO é média!)
            let somaPontos = 0;
            let acertos = 0;
            perguntas.forEach(q => {
                const respIdx = respostas[q.id] !== undefined && respostas[q.id] !== null ? parseInt(respostas[q.id], 10) : -1;
                if (respIdx === Number(q.correta_idx)) {
                    acertos++;
                    somaPontos += Math.max(1, Math.min(10, Number(q.nota_pontos || 1)));
                }
            });

            await dbRun(
                `INSERT INTO uniamerica_submissoes_teste
                 (curso_id, aula_id, colaborador_id, respostas_json, pontos_calculados, enviado_em)
                 VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
                [aula.curso_id, aulaId, colab.id, JSON.stringify(respostas), somaPontos]
            );

            res.json({
                ok: true,
                acertos,
                total_perguntas: perguntas.length,
                pontos_calculados: somaPontos
            });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    });

    // Upload de arquivo de um campo dinâmico da Missão (documento, áudio, imagem -> R2)
    app.post('/api/uniamerica/aulas/:aulaId/missoes/:missaoId/upload-campo', guardParticipante, upload.single('arquivo'), async (req, res) => {
        try {
            const aulaId = parseInt(req.params.aulaId, 10);
            const missaoId = String(req.params.missaoId || '').trim();
            const campoId = String(req.body.campo_id || '').trim();
            const colab = await resolverColaboradorDoUsuario(req.user, req);
            if (!colab) return res.status(400).json({ error: 'Colaborador não identificado.' });
            if (!req.file || !req.file.buffer) return res.status(400).json({ error: 'Nenhum arquivo selecionado.' });

            const aula = await dbGet(`SELECT * FROM uniamerica_aulas WHERE id = ?`, [aulaId]);
            if (!aula) return res.status(404).json({ error: 'Aula não encontrada.' });

            const pres = await dbGet(`SELECT * FROM uniamerica_presencas WHERE aula_id = ? AND colaborador_id = ?`, [aulaId, colab.id]);
            if (!pres || Number(pres.presente) !== 1) {
                return res.status(403).json({ error: 'Missão bloqueada: é necessário ter presença confirmada nesta aula.' });
            }

            const r2Key = await salvarNoR2(`EntregasMissoes/Curso_${aula.curso_id}/Aula_${aulaId}`, req.file.originalname, req.file.buffer, req.file.mimetype);
            const ins = await dbRun(
                `INSERT INTO uniamerica_missao_arquivos
                 (curso_id, aula_id, missao_id, colaborador_id, campo_id, nome_arquivo, tipo_mime, tamanho_bytes, r2_key)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [aula.curso_id, aulaId, missaoId, colab.id, campoId, req.file.originalname, req.file.mimetype || 'application/octet-stream', req.file.size || 0, r2Key]
            );

            res.json({
                ok: true,
                arquivo_id: ins.lastID,
                campo_id: campoId,
                nome_arquivo: req.file.originalname,
                tipo_mime: req.file.mimetype,
                r2_key: r2Key,
                url: r2StreamUrl(r2Key)
            });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    });

    // Colaborador envia a Missão da Semana preenchida (somente se presente na aula e dentro do prazo de 1 semana)
    app.post('/api/uniamerica/aulas/:aulaId/missoes/:missaoId/responder', guardParticipante, async (req, res) => {
        try {
            const aulaId = parseInt(req.params.aulaId, 10);
            const missaoId = String(req.params.missaoId || '').trim();
            const colab = await resolverColaboradorDoUsuario(req.user, req);
            if (!colab) return res.status(400).json({ error: 'Seu usuário não está vinculado a um colaborador.' });

            const aula = await dbGet(`SELECT * FROM uniamerica_aulas WHERE id = ?`, [aulaId]);
            if (!aula) return res.status(404).json({ error: 'Aula não encontrada.' });

            // Regra obrigatória: somente quem participou da aula (lista de presença) pode responder as missões!
            const pres = await dbGet(`SELECT * FROM uniamerica_presencas WHERE aula_id = ? AND colaborador_id = ?`, [aulaId, colab.id]);
            if (!pres || Number(pres.presente) !== 1) {
                return res.status(403).json({ error: 'As missões desta aula só ficam disponíveis após a confirmação da sua presença na lista de presença.' });
            }

            // Verificar validade de 1 semana (7 dias)
            if (pres.liberado_missao_em) {
                const baseMs = new Date(pres.liberado_missao_em.replace(' ', 'T') + (pres.liberado_missao_em.includes('Z') ? '' : 'Z')).getTime();
                if (!isNaN(baseMs) && Date.now() > baseMs + (7 * 24 * 60 * 60 * 1000)) {
                    return res.status(403).json({ error: 'O prazo de 1 semana (7 dias) para envio desta missão foi encerrado.' });
                }
            }

            const existente = await dbGet(
                `SELECT * FROM uniamerica_submissoes_missao WHERE aula_id = ? AND missao_id = ? AND colaborador_id = ?`,
                [aulaId, missaoId, colab.id]
            );
            if (existente && existente.status === 'avaliada') {
                return res.status(400).json({ error: 'Esta missão já foi avaliada pelo Gestor e não pode mais ser alterada.' });
            }

            const respostas = req.body.respostas || {};

            await dbRun(
                `INSERT INTO uniamerica_submissoes_missao
                 (curso_id, aula_id, missao_id, colaborador_id, respostas_json, status, enviado_em)
                 VALUES (?, ?, ?, ?, ?, 'enviada', CURRENT_TIMESTAMP)
                 ON CONFLICT(aula_id, missao_id, colaborador_id)
                 DO UPDATE SET respostas_json = excluded.respostas_json,
                               status = 'enviada',
                               enviado_em = CURRENT_TIMESTAMP`,
                [aula.curso_id, aulaId, missaoId, colab.id, JSON.stringify(respostas)]
            );

            res.json({ ok: true });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    });
};
