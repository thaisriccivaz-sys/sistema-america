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
const fs = require('fs');

module.exports = function registerUniAmerica(app, db, authenticateToken, r2, sendMailHelper) {
    const PAGE_GESTOR_ADMIN = 'uniamerica-gestao-admin';
    const PAGE_GESTOR_USUARIO = 'uniamerica-gestao-usuario';
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

        db.run(`ALTER TABLE uniamerica_aulas ADD COLUMN ultima_aula INTEGER DEFAULT 0`, () => {});
        db.run(`ALTER TABLE uniamerica_presencas ADD COLUMN token_formulario TEXT`, () => {});
        db.run(`ALTER TABLE uniamerica_presencas ADD COLUMN email_formulario_enviado_em DATETIME`, () => {});
        db.run(`ALTER TABLE uniamerica_presencas ADD COLUMN email_formulario_destino TEXT`, () => {});
        db.run(`ALTER TABLE uniamerica_submissoes_missao ADD COLUMN avaliacao_campos_json TEXT DEFAULT '{}'`, () => {});
        db.run(`ALTER TABLE uniamerica_cursos ADD COLUMN ministrado_por_usuario_id INTEGER`, () => {});
        db.run(`ALTER TABLE uniamerica_cursos ADD COLUMN ministrado_por_nome TEXT`, () => {});
        db.run(`CREATE INDEX IF NOT EXISTS idx_ua_aulas_curso ON uniamerica_aulas(curso_id, ordem)`);
        db.run(`CREATE INDEX IF NOT EXISTS idx_ua_pres_curso ON uniamerica_presencas(curso_id, aula_id)`);
        db.run(`CREATE INDEX IF NOT EXISTS idx_ua_sub_teste ON uniamerica_submissoes_teste(curso_id, aula_id)`);
        db.run(`CREATE INDEX IF NOT EXISTS idx_ua_sub_missao ON uniamerica_submissoes_missao(curso_id, aula_id, status)`);
    });

    // ── Helpers R2 & Normalização UTF-8 de Nomes de Arquivo ───────────────────
    function corrigirMojibakeNome(str) {
        if (!str) return '';
        let s = String(str);
        // Se houver sequência típica de UTF-8 lido como Latin-1 (ex: Ã, Â, Ì, Î)
        if (/[ÃÂÌÎ]/.test(s)) {
            try {
                const decoded = Buffer.from(s, 'latin1').toString('utf8');
                if (!decoded.includes('\uFFFD')) s = decoded;
            } catch (_) {}
        }
        return s.normalize('NFC').trim();
    }

    function extrairNomeOriginalUpload(req, file) {
        if (req && req.body && req.body.nome_original) {
            return corrigirMojibakeNome(req.body.nome_original);
        }
        return corrigirMojibakeNome(file ? file.originalname : 'arquivo');
    }

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

    async function isAdminUniAmerica(u) {
        return (await temPagina(u, PAGE_GESTOR_ADMIN)) || (await temPagina(u, PAGE_GESTOR));
    }

    async function isGestorUniAmerica(u) {
        return (await isAdminUniAmerica(u)) || (await temPagina(u, PAGE_GESTOR_USUARIO));
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
        for (const cand of candidatos) {
            if (cand.length >= 3) {
                const inc = todos.find(x => {
                    const cn = normTokens(x.nome_completo);
                    return cn && (cn.includes(cand) || cand.includes(cn));
                });
                if (inc) return inc;
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

    async function obterNomeInstrutorUsuario(user) {
        if (!user) return '';
        try {
            const colab = await resolverColaboradorDoUsuario(user, null);
            if (colab && colab.nome_completo) {
                return String(colab.nome_completo).replace(/^[💎🥇🥈🥉\s]+/u, '').trim();
            }
        } catch (_) {}
        if (user.id) {
            try {
                const u = await dbGet('SELECT id, username, nome, email FROM usuarios WHERE id = ?', [user.id]);
                if (u) {
                    const raw = String(u.nome || u.username || '').trim();
                    if (raw) {
                        return raw
                            .replace(/[._-]+/g, ' ')
                            .replace(/\s+/g, ' ')
                            .trim()
                            .split(' ')
                            .map(w => w ? (w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()) : '')
                            .join(' ');
                    }
                }
            } catch (_) {}
        }
        const fallback = String(user.nome || user.username || '').trim();
        return fallback
            .replace(/[._-]+/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    // ── Colaboradores vinculados ao CURSO INTEIRO (por Depto + Colaborador + Presença registrada) ────
    async function listarColaboradoresDoCurso(curso) {
        if (!curso) return [];
        const [todosAtivos, presCurso] = await Promise.all([
            dbAll(
                `SELECT id, nome_completo, cargo, departamento, email, email_corporativo, foto_path, status
                 FROM colaboradores
                 WHERE status NOT LIKE 'Desligado%'
                 ORDER BY nome_completo ASC`
            ),
            curso.id
                ? dbAll(`SELECT DISTINCT colaborador_id FROM uniamerica_presencas WHERE curso_id = ? AND presente = 1`, [curso.id])
                : Promise.resolve([])
        ]);
        const presSet = new Set((presCurso || []).map(p => Number(p.colaborador_id)));
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
            if (presSet.has(Number(c.id))) return true;
            if (deptSet.size > 0 && deptSet.has(norm(c.departamento))) return true;
            return false;
        });
    }

    // ── Helper: Verifica se o prazo da aula expirou (expira quando a PRÓXIMA aula do curso é concluída) ──
    function verificarPrazoExpiradoPorProximaAula(aula, todasAulasOrdenadas, cursoOpcional = null) {
        if (!aula) return { prazoExpirado: false, proximaAula: null };
        const lista = Array.isArray(todasAulasOrdenadas) ? todasAulasOrdenadas : [];
        const idx = lista.findIndex(x => Number(x.id) === Number(aula.id));
        const proximaAula = (idx >= 0 && idx + 1 < lista.length) ? lista[idx + 1] : null;

        // Se existir próxima aula (ou qualquer aula posterior) e ela já estiver concluída, o prazo expirou!
        if (idx >= 0 && idx + 1 < lista.length) {
            const algumaPosteriorConcluida = lista.slice(idx + 1).some(x => x.status_aula === 'concluida');
            return {
                prazoExpirado: algumaPosteriorConcluida || (cursoOpcional && cursoOpcional.status === 'concluido'),
                proximaAula
            };
        }

        // Se for a última aula do curso, expira quando a própria última aula ou o curso for concluído
        const expUltima = aula.status_aula === 'concluida' || (cursoOpcional && cursoOpcional.status === 'concluido');
        return { prazoExpirado: !!expUltima, proximaAula: null };
    }

    async function baixarBufferDoR2(r2Key) {
        if (!r2Key || !r2 || !r2.isReady()) return null;
        try {
            const { stream, contentType } = await r2.downloadStreamFromR2(r2Key);
            const chunks = [];
            for await (const chunk of stream) {
                chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
            }
            return { buffer: Buffer.concat(chunks), contentType: contentType || 'image/jpeg' };
        } catch (e) {
            return null;
        }
    }

    // ── Helper: Envio do Formulário da Aula por E-mail (no e-mail particular do colaborador + Prêmios com fotos) ──
    async function enviarEmailFormularioAulaParaColaborador(curso, aula, colabId, opcoes = {}) {
        try {
            if (!aula || !curso || !colabId) return { enviado: false, motivo: 'dados_invalidos' };
            const perguntas = parseJson(aula.perguntas_json, []);
            if (Number(aula.ultima_aula) === 1 || !Array.isArray(perguntas) || perguntas.length === 0) {
                return { enviado: false, motivo: 'sem_perguntas' };
            }

            const jaResp = await dbGet(
                `SELECT id FROM uniamerica_submissoes_teste WHERE aula_id = ? AND colaborador_id = ?`,
                [aula.id, colabId]
            );
            if (jaResp) return { enviado: false, motivo: 'ja_respondido' };

            const presRow = await dbGet(
                `SELECT * FROM uniamerica_presencas WHERE aula_id = ? AND colaborador_id = ?`,
                [aula.id, colabId]
            );
            if (!presRow || Number(presRow.presente) !== 1) {
                return { enviado: false, motivo: 'nao_presente' };
            }

            let token = presRow.token_formulario;
            if (!token) {
                token = crypto.randomBytes(16).toString('hex');
                await dbRun(
                    `UPDATE uniamerica_presencas SET token_formulario = ? WHERE aula_id = ? AND colaborador_id = ?`,
                    [token, aula.id, colabId]
                );
            }

            if (presRow.email_formulario_enviado_em && !opcoes.forcarReenvio) {
                return { enviado: false, motivo: 'ja_enviado', email: presRow.email_formulario_destino, token };
            }

            const colab = await dbGet(
                `SELECT id, nome_completo, email, email_corporativo FROM colaboradores WHERE id = ?`,
                [colabId]
            );
            if (!colab) return { enviado: false, motivo: 'colaborador_nao_encontrado', token };

            // Prioridade estrita para o e-mail particular do colaborador (colaboradores.email)
            const emailParticular = String(colab.email || '').trim();
            const emailCorp = String(colab.email_corporativo || '').trim();
            const emailDestino = (emailParticular && emailParticular.includes('@'))
                ? emailParticular
                : ((emailCorp && emailCorp.includes('@')) ? emailCorp : '');

            if (!emailDestino) {
                return { enviado: false, motivo: 'sem_email', token };
            }

            const baseUrl = (typeof global.obterUrlPublicaSistema === 'function'
                ? global.obterUrlPublicaSistema(process.env.BASE_URL)
                : (process.env.BASE_URL || 'https://fluxoar.com.br')).replace(/\/+$/, '');
            const link = `${baseUrl}/formulario-aula-uniamerica.html?token=${token}`;
            const nomeLimpo = String(colab.nome_completo || '').replace(/^[💎🥇🥈🥉\s]+/u, '').trim();
            const nomeFirst = nomeLimpo.split(' ')[0] || 'Colaborador';
            const missoes = parseJson(aula.missoes_json, []);
            const logoPath = path.join(__dirname, '..', 'frontend', 'assets', 'logo-header.png');

            // Buscar prêmios do curso (com fotos no R2) para incluir no corpo do e-mail
            const premiosCurso = await dbAll(
                `SELECT * FROM uniamerica_premios WHERE curso_id = ? ORDER BY colocacao ASC`,
                [curso.id]
            );
            const attachments = fs.existsSync(logoPath)
                ? [{ filename: 'logo-header.png', path: logoPath, cid: 'empresa-logo' }]
                : [];

            let premiosHtml = '';
            if (premiosCurso.length > 0) {
                const cardsPremios = [];
                for (const pr of premiosCurso) {
                    const med = Number(pr.colocacao) === 1 ? '🥇 1º Lugar'
                        : Number(pr.colocacao) === 2 ? '🥈 2º Lugar'
                        : Number(pr.colocacao) === 3 ? '🥉 3º Lugar'
                        : `${pr.colocacao}º Lugar`;
                    let imgTag = '';
                    if (pr.imagem_r2_key) {
                        const cidPremio = `premio-curso-${pr.id}`;
                        const r2Buf = await baixarBufferDoR2(pr.imagem_r2_key);
                        if (r2Buf && r2Buf.buffer) {
                            const ext = path.extname(pr.imagem_r2_key) || '.jpg';
                            attachments.push({
                                filename: `premio_${pr.colocacao}${ext}`,
                                content: r2Buf.buffer,
                                contentType: r2Buf.contentType,
                                cid: cidPremio
                            });
                            imgTag = `<img src="cid:${cidPremio}" alt="${pr.titulo}" style="width:76px;height:76px;object-fit:cover;border-radius:10px;border:1px solid #fde68a;display:block;margin-right:12px;flex-shrink:0;">`;
                        } else {
                            const pubImgUrl = `${baseUrl}/api/public/uniamerica-premio-imagem/${pr.id}`;
                            imgTag = `<img src="${pubImgUrl}" alt="${pr.titulo}" style="width:76px;height:76px;object-fit:cover;border-radius:10px;border:1px solid #fde68a;display:block;margin-right:12px;flex-shrink:0;">`;
                        }
                    }
                    cardsPremios.push(`
                        <div style="display:flex;align-items:center;background:#ffffff;border:1px solid #fde68a;border-radius:10px;padding:10px 12px;margin-top:8px;">
                            ${imgTag}
                            <div>
                                <div style="font-size:12px;font-weight:bold;color:#b45309;margin-bottom:2px;">${med}</div>
                                <div style="font-size:14px;font-weight:bold;color:#0f172a;">${pr.titulo || ''}</div>
                                ${pr.recompensa ? `<div style="font-size:13px;font-weight:bold;color:#15803d;margin-top:2px;">${pr.recompensa}</div>` : ''}
                                ${pr.descricao ? `<div style="font-size:12px;color:#64748b;margin-top:2px;">${pr.descricao}</div>` : ''}
                            </div>
                        </div>
                    `);
                }
                premiosHtml = `
                    <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:14px 16px;margin:20px 0;">
                        <div style="font-size:14px;font-weight:bold;color:#92400e;margin-bottom:6px;">🏆 Prêmios deste Curso (Ranking Final):</div>
                        <div style="font-size:12px;color:#78350f;margin-bottom:8px;">Responda os formulários e cumpra as missões até a próxima aula para somar pontos e concorrer aos prêmios:</div>
                        ${cardsPremios.join('')}
                    </div>
                `;
            }

            if (typeof sendMailHelper === 'function') {
                await sendMailHelper({
                    to: emailDestino,
                    subject: `Formulário da Aula ${aula.ordem}: ${aula.titulo} - ${curso.nome}`,
                    html: `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;"><div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#333;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;"><div style="background:#fff;padding:0;"><img src="cid:empresa-logo" alt="América Rental" style="width:100%;display:block;max-height:120px;object-fit:cover;"></div><div style="padding:1.5rem 2rem;"><h2 style="color:#0e7490;margin-top:0;">Formulário da Aula ${aula.ordem} — ${curso.nome}</h2><p>Olá <strong>${nomeFirst}</strong>,</p><p>Sua participação na <strong>Aula ${aula.ordem}: ${aula.titulo}</strong> do treinamento <strong>${curso.nome}</strong> (UniAmérica) foi confirmada!</p><p>Clique no botão abaixo para responder ao formulário desta aula (cada resposta certa soma <strong>1 ponto</strong> na sua nota do curso). <strong>Atenção:</strong> o preenchimento deve ser realizado antes da conclusão da próxima aula:</p><div style="text-align:center;margin:26px 0;"><a href="${link}" style="background-color:#0e7490;color:white;padding:14px 28px;text-decoration:none;border-radius:6px;font-weight:bold;display:inline-block;font-size:16px;">Responder Formulário da Aula</a></div>${premiosHtml}${missoes.length > 0 ? `<div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:12px 14px;margin:18px 0;font-size:13px;color:#1e3a8a;"><strong>Missões da Aula:</strong> Esta aula também possui <strong>${missoes.length} missão(ões)</strong> disponíveis para você preencher na tela <strong>Missões</strong> (menu Treinamentos / APP › Missões) até a próxima aula ser concluída!</div>` : `<p style="font-size:13px;color:#475569;">Você também pode responder a este formulário diretamente pela tela <strong>Missões</strong> no sistema.</p>`}<p style="color:#666;font-size:12px;">Se o botão não funcionar, copie e cole este link no navegador:<br><a href="${link}" style="color:#0e7490;">${link}</a></p><hr style="border:none;border-top:1px solid #eee;margin:25px 0;"><p style="color:#999;font-size:11px;">Este é um e-mail automático enviado pela UniAmérica - América Rental.</p></div></div></body></html>`,
                    attachments
                });
            }

            await dbRun(
                `UPDATE uniamerica_presencas
                 SET token_formulario = ?, email_formulario_enviado_em = CURRENT_TIMESTAMP, email_formulario_destino = ?
                 WHERE aula_id = ? AND colaborador_id = ?`,
                [token, emailDestino, aula.id, colabId]
            );

            return { enviado: true, email: emailDestino, token, link };
        } catch (errMail) {
            console.error('[UNIAMERICA-EMAIL] Erro ao enviar formulário da aula:', errMail.message);
            return { enviado: false, motivo: 'erro_envio', erro: errMail.message };
        }
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

        // Calcular pontuação máxima possível do curso (1 ponto por pergunta + 1 ponto por cada campo/item de missão)
        let maxPontosTestes = 0;
        let maxPontosMissoes = 0;
        aulas.forEach(a => {
            if (Number(a.ultima_aula) === 1) return;
            const pergs = parseJson(a.perguntas_json, []);
            maxPontosTestes += pergs.length;
            const missoes = parseJson(a.missoes_json, []);
            missoes.forEach(m => {
                const qtdCampos = Array.isArray(m.campos) && m.campos.length > 0 ? m.campos.length : 1;
                maxPontosMissoes += qtdCampos;
            });
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

                const pergsAula = parseJson(a.perguntas_json, []);
                const st = testeMap[`${a.id}_${c.id}`];
                let ptsTeste = 0;
                if (st) {
                    const respObj = parseJson(st.respostas_json, {});
                    if (pergsAula.length > 0 && respObj && Object.keys(respObj).length > 0) {
                        pergsAula.forEach(q => {
                            const rIdx = respObj[q.id] !== undefined && respObj[q.id] !== null ? parseInt(respObj[q.id], 10) : -1;
                            if (rIdx === Number(q.correta_idx)) ptsTeste += 1;
                        });
                    } else {
                        ptsTeste = Number(st.pontos_calculados || 0);
                    }
                }
                somaTestes += ptsTeste;

                const missoesAula = parseJson(a.missoes_json, []);
                let ptsMissoesAula = 0;
                missoesAula.forEach(m => {
                    const maxPtsM = Array.isArray(m.campos) && m.campos.length > 0 ? m.campos.length : 1;
                    const sm = missaoMap[`${a.id}_${m.id}_${c.id}`];
                    if (sm) {
                        missoesEntregues++;
                        if (sm.status === 'avaliada' && sm.nota_gestor !== null && sm.nota_gestor !== undefined) {
                            missoesAvaliadas++;
                            const notaNum = Math.max(0, Math.min(maxPtsM, Number(sm.nota_gestor) || 0));
                            ptsMissoesAula += notaNum;
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
                email_particular: c.email || c.email_corporativo || '',
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

        // Ordenar: primeiro quem realizou TODAS as aulas (elegivel_certificado = true), depois por maior nota_total, presença e nome
        participantes.sort((a, b) => {
            if (Boolean(b.elegivel_certificado) !== Boolean(a.elegivel_certificado)) {
                return b.elegivel_certificado ? 1 : -1;
            }
            if (b.nota_total !== a.nota_total) return b.nota_total - a.nota_total;
            if (b.aulas_presentes !== a.aulas_presentes) return b.aulas_presentes - a.aulas_presentes;
            return String(a.nome_completo || '').localeCompare(String(b.nome_completo || ''), 'pt-BR');
        });

        // Regra obrigatória (Anexo 5): Colaboradores que NÃO realizaram todas as aulas não ficam em nenhuma posição de ranking nem ganham prêmio
        let colocacaoElegivel = 0;
        participantes.forEach((p) => {
            if (p.elegivel_certificado) {
                colocacaoElegivel += 1;
                p.posicao = colocacaoElegivel;
                p.premio = premioPorColocacao[colocacaoElegivel] || null;
            } else {
                p.posicao = null;
                p.premio = null;
            }
        });

        let ministradoPorNome = String(curso.ministrado_por_nome || '').trim();
        if (!ministradoPorNome && (curso.ministrado_por_usuario_id || curso.created_by)) {
            ministradoPorNome = await obterNomeInstrutorUsuario({ id: curso.ministrado_por_usuario_id || curso.created_by });
        }

        const cargaHorariaCalculada = parseFloat(aulas.reduce((acc, a) => acc + (parseFloat(a.carga_horaria) || 0), 0).toFixed(2));

        return {
            curso: {
                ...curso,
                ministrado_por_nome: ministradoPorNome,
                carga_horaria: cargaHorariaCalculada,
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

    async function recalcularCargaHorariaCurso(cursoId) {
        if (!cursoId) return 0;
        const row = await dbGet(`SELECT COALESCE(SUM(COALESCE(carga_horaria, 0)), 0) AS soma FROM uniamerica_aulas WHERE curso_id = ?`, [cursoId]);
        const soma = parseFloat(Number(row ? row.soma : 0).toFixed(2)) || 0;
        await dbRun(`UPDATE uniamerica_cursos SET carga_horaria = ? WHERE id = ?`, [soma, cursoId]);
        return soma;
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
            const admin = await isAdminUniAmerica(req.user);
            const gestor = admin || (await temPagina(req.user, PAGE_GESTOR_USUARIO));
            const participante = gestor || (await temPagina(req.user, PAGE_MISSOES));
            const colab = await resolverColaboradorDoUsuario(req.user, req);
            res.json({
                ok: true,
                is_admin: admin,
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
            const premiosRows = await dbAll(`SELECT * FROM uniamerica_premios ORDER BY colocacao ASC, id ASC`);
            const presencasRows = await dbAll(`SELECT aula_id, COUNT(*) AS qtd FROM uniamerica_presencas WHERE presente = 1 GROUP BY aula_id`);
            const subTestesRows = await dbAll(`
                SELECT st.curso_id, st.aula_id, st.colaborador_id, st.respostas_json, st.pontos_calculados, st.enviado_em,
                       c.nome_completo, a.ordem AS aula_ordem, a.titulo AS aula_titulo, a.perguntas_json
                FROM uniamerica_submissoes_teste st
                LEFT JOIN colaboradores c ON c.id = st.colaborador_id
                LEFT JOIN uniamerica_aulas a ON a.id = st.aula_id
                ORDER BY a.ordem ASC, c.nome_completo ASC
            `);
            const notasPorCurso = {};
            const notasPorAula = {};
            subTestesRows.forEach(st => {
                const pergs = parseJson(st.perguntas_json, []);
                const resps = parseJson(st.respostas_json, {});
                let acertos = 0;
                if (pergs.length > 0 && resps && Object.keys(resps).length > 0) {
                    pergs.forEach(q => {
                        const rIdx = resps[q.id] !== undefined && resps[q.id] !== null ? parseInt(resps[q.id], 10) : -1;
                        if (rIdx === Number(q.correta_idx)) acertos += 1;
                    });
                } else {
                    acertos = Number(st.pontos_calculados || 0);
                }
                const itemNota = {
                    curso_id: st.curso_id,
                    aula_id: st.aula_id,
                    aula_ordem: st.aula_ordem || 1,
                    aula_titulo: st.aula_titulo || '',
                    colaborador_id: st.colaborador_id,
                    nome_completo: st.nome_completo || ('Colaborador #' + st.colaborador_id),
                    nota: acertos,
                    total_perguntas: pergs.length,
                    enviado_em: st.enviado_em
                };
                if (!notasPorCurso[st.curso_id]) notasPorCurso[st.curso_id] = [];
                notasPorCurso[st.curso_id].push(itemNota);
                if (!notasPorAula[st.aula_id]) notasPorAula[st.aula_id] = [];
                notasPorAula[st.aula_id].push(itemNota);
            });

            const pendMap = {};
            subMissoesPend.forEach(r => { pendMap[`${r.curso_id}_${r.aula_id}`] = r.qtd; });
            const premiosMap = {};
            const premiosPorCurso = {};
            premiosRows.forEach(r => {
                premiosMap[r.curso_id] = (premiosMap[r.curso_id] || 0) + 1;
                if (!premiosPorCurso[r.curso_id]) premiosPorCurso[r.curso_id] = [];
                premiosPorCurso[r.curso_id].push({
                    ...r,
                    imagem_url: r.imagem_r2_key ? r2StreamUrl(r.imagem_r2_key) : null
                });
            });
            const presencasMap = {};
            presencasRows.forEach(r => { presencasMap[r.aula_id] = Number(r.qtd) || 0; });

            const anexosPorAula = {};
            anexos.forEach(an => {
                if (!anexosPorAula[an.aula_id]) anexosPorAula[an.aula_id] = [];
                anexosPorAula[an.aula_id].push({
                    ...an,
                    nome_arquivo: corrigirMojibakeNome(an.nome_arquivo),
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
                const perguntas = parseJson(a.perguntas_json, []);
                const presentesConf = presencasMap[a.id] || 0;
                const aulaFeita = a.status_aula === 'concluida' || presentesConf > 0;
                aulasPorCurso[a.curso_id].push({
                    ...a,
                    perguntas,
                    missoes,
                    anexos: anexosPorAula[a.id] || [],
                    presentes_confirmados: presentesConf,
                    aula_feita: aulaFeita,
                    missoes_pendentes_avaliacao: pendMap[`${a.curso_id}_${a.id}`] || 0,
                    notas_formulario: notasPorAula[a.id] || []
                });
            });

            const out = [];
            for (const c of cursos) {
                const colabsVinc = await listarColaboradoresDoCurso(c);
                const listaAulas = aulasPorCurso[c.id] || [];
                const pendCurso = listaAulas.reduce((acc, x) => acc + (x.missoes_pendentes_avaliacao || 0), 0);
                const cargaSomada = parseFloat(listaAulas.reduce((acc, x) => acc + (parseFloat(x.carga_horaria) || 0), 0).toFixed(2));
                const totalAulas = listaAulas.length;
                const aulasFeitas = listaAulas.filter(x => x.aula_feita).length;
                const aulasRestantes = Math.max(0, totalAulas - aulasFeitas);
                const progressoPct = totalAulas > 0 ? Math.round((aulasFeitas / totalAulas) * 100) : 0;
                const totalPremios = premiosMap[c.id] || 0;
                const aulasSemPesquisa = listaAulas.filter(x => Number(x.ultima_aula) !== 1 && (!Array.isArray(x.perguntas) || x.perguntas.length === 0)).map(x => ({ id: x.id, ordem: x.ordem, titulo: x.titulo }));
                const aulasSemMissoes = listaAulas.filter(x => Number(x.ultima_aula) !== 1 && (!Array.isArray(x.missoes) || x.missoes.length === 0)).map(x => ({ id: x.id, ordem: x.ordem, titulo: x.titulo }));
                const prontoParaIniciar = colabsVinc.length > 0 && totalAulas > 0 && aulasSemPesquisa.length === 0 && aulasSemMissoes.length === 0 && totalPremios > 0;

                out.push({
                    ...c,
                    carga_horaria: cargaSomada,
                    capa_stream_url: c.capa_r2_key ? r2StreamUrl(c.capa_r2_key) : (c.capa_url || null),
                    aulas: listaAulas,
                    premios: premiosPorCurso[c.id] || [],
                    total_aulas: totalAulas,
                    aulas_feitas: aulasFeitas,
                    aulas_restantes: aulasRestantes,
                    progresso_pct: progressoPct,
                    total_premios: totalPremios,
                    aulas_sem_pesquisa: aulasSemPesquisa,
                    aulas_sem_missoes: aulasSemMissoes,
                    pronto_para_iniciar: prontoParaIniciar,
                    total_participantes: colabsVinc.length,
                    missoes_pendentes_avaliacao: pendCurso,
                    notas_formulario: notasPorCurso[c.id] || []
                });
            }

            const isAdmin = await isAdminUniAmerica(req.user);
            res.json({ ok: true, is_admin: isAdmin, cursos: out });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    });

    app.get('/api/uniamerica/cursos/:id', guardGestor, async (req, res) => {
        try {
            const cursoId = parseInt(req.params.id, 10);
            const curso = await dbGet(`SELECT * FROM uniamerica_cursos WHERE id = ?`, [cursoId]);
            if (!curso) return res.status(404).json({ error: 'Curso não encontrado.' });

            const [aulas, anexos, colabsVinc, rankingData, premiosCountRow, presencasRows] = await Promise.all([
                dbAll(`SELECT * FROM uniamerica_aulas WHERE curso_id = ? ORDER BY ordem ASC, id ASC`, [cursoId]),
                dbAll(`SELECT * FROM uniamerica_aula_anexos WHERE curso_id = ? ORDER BY id ASC`, [cursoId]),
                listarColaboradoresDoCurso(curso),
                calcularQuadroRankingCurso(cursoId),
                dbGet(`SELECT COUNT(*) AS qtd FROM uniamerica_premios WHERE curso_id = ?`, [cursoId]),
                dbAll(`SELECT aula_id, COUNT(*) AS qtd FROM uniamerica_presencas WHERE curso_id = ? AND presente = 1 GROUP BY aula_id`, [cursoId])
            ]);

            const presencasMap = {};
            presencasRows.forEach(r => { presencasMap[r.aula_id] = Number(r.qtd) || 0; });

            const anexosPorAula = {};
            anexos.forEach(an => {
                if (!anexosPorAula[an.aula_id]) anexosPorAula[an.aula_id] = [];
                anexosPorAula[an.aula_id].push({ ...an, nome_arquivo: corrigirMojibakeNome(an.nome_arquivo), url: r2StreamUrl(an.r2_key) });
            });

            const aulasFormatadas = aulas.map(a => {
                const perguntas = parseJson(a.perguntas_json, []);
                const missoes = parseJson(a.missoes_json, []).map(m => ({
                    ...m,
                    pdf_url: m.pdf_r2_key ? r2StreamUrl(m.pdf_r2_key) : null
                }));
                const presentesConf = presencasMap[a.id] || 0;
                return {
                    ...a,
                    perguntas,
                    missoes,
                    presentes_confirmados: presentesConf,
                    aula_feita: a.status_aula === 'concluida' || presentesConf > 0,
                    anexos: anexosPorAula[a.id] || []
                };
            });

            const cargaSomada = parseFloat(aulas.reduce((acc, a) => acc + (parseFloat(a.carga_horaria) || 0), 0).toFixed(2));
            const totalAulas = aulasFormatadas.length;
            const aulasFeitas = aulasFormatadas.filter(x => x.aula_feita).length;
            const aulasRestantes = Math.max(0, totalAulas - aulasFeitas);
            const progressoPct = totalAulas > 0 ? Math.round((aulasFeitas / totalAulas) * 100) : 0;
            const totalPremios = Number(premiosCountRow ? premiosCountRow.qtd : 0) || 0;
            const aulasSemPesquisa = aulasFormatadas.filter(x => Number(x.ultima_aula) !== 1 && (!Array.isArray(x.perguntas) || x.perguntas.length === 0)).map(x => ({ id: x.id, ordem: x.ordem, titulo: x.titulo }));
            const aulasSemMissoes = aulasFormatadas.filter(x => Number(x.ultima_aula) !== 1 && (!Array.isArray(x.missoes) || x.missoes.length === 0)).map(x => ({ id: x.id, ordem: x.ordem, titulo: x.titulo }));
            const prontoParaIniciar = colabsVinc.length > 0 && totalAulas > 0 && aulasSemPesquisa.length === 0 && aulasSemMissoes.length === 0 && totalPremios > 0;

            res.json({
                ok: true,
                curso: {
                    ...curso,
                    carga_horaria: cargaSomada,
                    capa_stream_url: curso.capa_r2_key ? r2StreamUrl(curso.capa_r2_key) : (curso.capa_url || null),
                    total_aulas: totalAulas,
                    aulas_feitas: aulasFeitas,
                    aulas_restantes: aulasRestantes,
                    progresso_pct: progressoPct,
                    total_premios: totalPremios,
                    aulas_sem_pesquisa: aulasSemPesquisa,
                    aulas_sem_missoes: aulasSemMissoes,
                    pronto_para_iniciar: prontoParaIniciar
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

            // Regra obrigatória: Para salvar um curso deve ser necessário vincular a pelo menos 1 colaborador
            const colabsVinc = await listarColaboradoresDoCurso({ departamentos, colaboradores_avulsos });
            if (colabsVinc.length === 0) {
                return res.status(400).json({ error: 'Para salvar o curso, é obrigatório vincular pelo menos 1 colaborador (por departamento ou colaborador específico).' });
            }

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

            // Regra obrigatória: Para salvar um curso deve ser necessário vincular a pelo menos 1 colaborador
            const colabsVinc = await listarColaboradoresDoCurso({ departamentos, colaboradores_avulsos });
            if (colabsVinc.length === 0) {
                return res.status(400).json({ error: 'Para salvar o curso, é obrigatório vincular pelo menos 1 colaborador (por departamento ou colaborador específico).' });
            }

            let capaR2Key = atual.capa_r2_key;
            if (req.body.remover_capa === '1') {
                // Regra obrigatória: nunca excluir arquivos do R2
                capaR2Key = null;
            }
            if (req.file && req.file.buffer) {
                capaR2Key = await salvarNoR2('CapasCursos', req.file.originalname, req.file.buffer, req.file.mimetype);
            }

            await dbRun(
                `UPDATE uniamerica_cursos
                 SET nome = ?, descricao = ?, departamentos = ?, colaboradores_avulsos = ?, capa_r2_key = ?,
                     carga_horaria = ?, data_inicio = ?, data_fim = ?, status = ?, avaliacao_geral_obs = ?, updated_at = CURRENT_TIMESTAMP
                 WHERE id = ?`,
                [nome, descricao, departamentos, colaboradores_avulsos, capaR2Key, carga_horaria, data_inicio, data_fim, status, avaliacao_geral_obs, cursoId]
            );
            await recalcularCargaHorariaCurso(cursoId);

            res.json({ ok: true, id: cursoId });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    });

    // Duplicar Curso (sem colaboradores vinculados, copiando capa, aulas, anexos, perguntas, missões e prêmios)
    app.post('/api/uniamerica/cursos/:id/duplicar', guardGestor, async (req, res) => {
        try {
            const origId = parseInt(req.params.id, 10);
            const orig = await dbGet(`SELECT * FROM uniamerica_cursos WHERE id = ?`, [origId]);
            if (!orig) return res.status(404).json({ error: 'Curso original não encontrado.' });

            const novoNome = String(req.body && req.body.nome ? req.body.nome : `${orig.nome} (Cópia)`).trim();

            const insCurso = await dbRun(
                `INSERT INTO uniamerica_cursos
                 (nome, descricao, departamentos, colaboradores_avulsos, capa_r2_key, capa_url, carga_horaria, status, created_by)
                 VALUES (?, ?, 'Nenhum', '', ?, ?, ?, 'ativo', ?)`,
                [novoNome, orig.descricao || '', orig.capa_r2_key || null, orig.capa_url || null, orig.carga_horaria || 0, req.user.id || null]
            );
            const novoCursoId = insCurso.lastID;

            // Copiar todas as aulas, perguntas, missões e seus anexos (mantendo as mesmas chaves R2)
            const aulasOrig = await dbAll(`SELECT * FROM uniamerica_aulas WHERE curso_id = ? ORDER BY ordem ASC, id ASC`, [origId]);
            for (const a of aulasOrig) {
                const insAula = await dbRun(
                    `INSERT INTO uniamerica_aulas
                     (curso_id, ordem, titulo, descricao, carga_horaria, status_aula, ultima_aula, perguntas_json, missoes_json)
                     VALUES (?, ?, ?, ?, ?, 'agendada', ?, ?, ?)`,
                    [novoCursoId, a.ordem, a.titulo, a.descricao || '', a.carga_horaria || 0, Number(a.ultima_aula) === 1 ? 1 : 0, a.perguntas_json || '[]', a.missoes_json || '[]']
                );
                const novaAulaId = insAula.lastID;

                const anexosAula = await dbAll(`SELECT * FROM uniamerica_aula_anexos WHERE aula_id = ? ORDER BY id ASC`, [a.id]);
                for (const an of anexosAula) {
                    await dbRun(
                        `INSERT INTO uniamerica_aula_anexos (curso_id, aula_id, nome_arquivo, tipo_mime, tamanho_bytes, r2_key)
                         VALUES (?, ?, ?, ?, ?, ?)`,
                        [novoCursoId, novaAulaId, an.nome_arquivo, an.tipo_mime, an.tamanho_bytes || 0, an.r2_key]
                    );
                }
            }

            // Copiar os prêmios do curso (mantendo as mesmas chaves R2 de imagem)
            const premiosOrig = await dbAll(`SELECT * FROM uniamerica_premios WHERE curso_id = ? ORDER BY colocacao ASC`, [origId]);
            for (const pr of premiosOrig) {
                await dbRun(
                    `INSERT INTO uniamerica_premios (curso_id, colocacao, titulo, descricao, recompensa, imagem_r2_key)
                     VALUES (?, ?, ?, ?, ?, ?)`,
                    [novoCursoId, pr.colocacao, pr.titulo, pr.descricao || '', pr.recompensa || '', pr.imagem_r2_key || null]
                );
            }

            await recalcularCargaHorariaCurso(novoCursoId);
            res.json({ ok: true, id: novoCursoId, nome: novoNome });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    });

    app.delete('/api/uniamerica/cursos/:id', guardGestor, async (req, res) => {
        try {
            const cursoId = parseInt(req.params.id, 10);
            const curso = await dbGet(`SELECT * FROM uniamerica_cursos WHERE id = ?`, [cursoId]);
            if (!curso) return res.status(404).json({ error: 'Curso não encontrado.' });

            // Regra obrigatória: NUNCA apagar os arquivos do Cloudflare R2 ao excluir o curso;
            // apenas excluir os registros do banco de dados para remover o curso da tela.
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
            const corretaIdx = Math.max(0, Math.min(Math.max(0, opcoes.length - 1), parseInt(q.correta_idx, 10) || 0));
            return {
                id: q.id || `q_${Date.now()}_${idx}`,
                pergunta: String(q.pergunta || '').trim(),
                opcoes,
                correta_idx: corretaIdx,
                nota_pontos: 1
            };
        }).filter(q => q.pergunta && q.opcoes.length >= 2);
    }

    function normalizarMissoesAula(raw) {
        const arr = Array.isArray(raw) ? raw : parseJson(raw, []);
        return arr.map((m, idx) => {
            const campos = Array.isArray(m.campos) ? m.campos.map((c, cIdx) => ({
                id: c.id || `campo_${Date.now()}_${idx}_${cIdx}`,
                tipo: ['texto', 'documento', 'audio', 'imagem', 'estrelas'].includes(c.tipo) ? c.tipo : 'texto',
                label: String(c.label || '').trim(),
                obrigatorio: false,
                opcoes: []
            })).filter(c => c.label) : [];

            return {
                id: m.id || `m_${Date.now()}_${idx}`,
                titulo: String(m.titulo || '').trim(),
                descricao: String(m.descricao || '').trim(),
                nota_maxima: Math.max(1, campos.length),
                prazo_dias: 7, // Regra obrigatória: missões válidas até a próxima aula
                pdf_r2_key: m.pdf_r2_key || null,
                pdf_nome: m.pdf_nome ? corrigirMojibakeNome(m.pdf_nome) : null,
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
            const ultima_aula = (req.body.ultima_aula === 1 || req.body.ultima_aula === '1' || req.body.ultima_aula === true) ? 1 : 0;
            const perguntas = ultima_aula ? [] : normalizarPerguntasAula(req.body.perguntas || []);
            const missoes = ultima_aula ? [] : normalizarMissoesAula(req.body.missoes || []);

            const ins = await dbRun(
                `INSERT INTO uniamerica_aulas
                 (curso_id, ordem, titulo, descricao, data_aula, carga_horaria, ultima_aula, perguntas_json, missoes_json)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [cursoId, ordem, titulo, descricao, data_aula, carga_horaria, ultima_aula, JSON.stringify(perguntas), JSON.stringify(missoes)]
            );
            await recalcularCargaHorariaCurso(cursoId);

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
            const ultima_aula = req.body.ultima_aula !== undefined
                ? ((req.body.ultima_aula === 1 || req.body.ultima_aula === '1' || req.body.ultima_aula === true) ? 1 : 0)
                : (Number(atual.ultima_aula) === 1 ? 1 : 0);
            const perguntas = ultima_aula ? [] : (req.body.perguntas !== undefined ? normalizarPerguntasAula(req.body.perguntas) : parseJson(atual.perguntas_json, []));
            const missoes = ultima_aula ? [] : (req.body.missoes !== undefined ? normalizarMissoesAula(req.body.missoes) : parseJson(atual.missoes_json, []));

            await dbRun(
                `UPDATE uniamerica_aulas
                 SET ordem = ?, titulo = ?, descricao = ?, data_aula = ?, carga_horaria = ?,
                     ultima_aula = ?, perguntas_json = ?, missoes_json = ?, updated_at = CURRENT_TIMESTAMP
                 WHERE id = ?`,
                [ordem, titulo, descricao, data_aula, carga_horaria, ultima_aula, JSON.stringify(perguntas), JSON.stringify(missoes), aulaId]
            );
            await recalcularCargaHorariaCurso(atual.curso_id);

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

            // Regra obrigatória: nunca excluir arquivos do R2 ao excluir a aula

            await dbRun(`DELETE FROM uniamerica_aula_anexos WHERE aula_id = ?`, [aulaId]);
            await dbRun(`DELETE FROM uniamerica_presencas WHERE aula_id = ?`, [aulaId]);
            await dbRun(`DELETE FROM uniamerica_submissoes_teste WHERE aula_id = ?`, [aulaId]);
            await dbRun(`DELETE FROM uniamerica_submissoes_missao WHERE aula_id = ?`, [aulaId]);
            await dbRun(`DELETE FROM uniamerica_missao_arquivos WHERE aula_id = ?`, [aulaId]);
            await dbRun(`DELETE FROM uniamerica_aulas WHERE id = ?`, [aulaId]);
            await recalcularCargaHorariaCurso(atual.curso_id);

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

            const nomeOriginal = extrairNomeOriginalUpload(req, req.file);
            const r2Key = await salvarNoR2('MissoesPDF', nomeOriginal, req.file.buffer, 'application/pdf');
            res.json({
                ok: true,
                pdf_r2_key: r2Key,
                pdf_nome: nomeOriginal,
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

            const nomeOriginal = extrairNomeOriginalUpload(req, req.file);
            const r2Key = await salvarNoR2('MateriaisAula', nomeOriginal, req.file.buffer, req.file.mimetype);
            const ins = await dbRun(
                `INSERT INTO uniamerica_aula_anexos (curso_id, aula_id, nome_arquivo, tipo_mime, tamanho_bytes, r2_key)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [aula.curso_id, aulaId, nomeOriginal, req.file.mimetype || 'application/octet-stream', req.file.size || 0, r2Key]
            );

            res.json({
                ok: true,
                id: ins.lastID,
                nome_arquivo: nomeOriginal,
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

            // Regra obrigatória: nunca excluir arquivos do R2
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
            const premiosRow = await dbGet(`SELECT COUNT(*) AS qtd FROM uniamerica_premios WHERE curso_id = ?`, [aula.curso_id]);
            const totalPremios = Number(premiosRow ? premiosRow.qtd : 0) || 0;

            // Regra obrigatória: Apenas pode iniciar o curso se TODAS as aulas (exceto a última aula marcada com ultima_aula = 1) estiverem com pesquisa e missões preenchidas e os prêmios cadastrados!
            const semPesquisa = todasAulas.filter(x => Number(x.ultima_aula) !== 1 && parseJson(x.perguntas_json, []).length === 0);
            const semMissoes = todasAulas.filter(x => Number(x.ultima_aula) !== 1 && parseJson(x.missoes_json, []).length === 0);
            if (todasAulas.length === 0 || semPesquisa.length > 0 || semMissoes.length > 0 || totalPremios === 0) {
                const pendencias = [];
                if (todasAulas.length === 0) pendencias.push('Nenhuma aula cadastrada no curso.');
                if (semPesquisa.length > 0) pendencias.push(`Pesquisa não preenchida em: ${semPesquisa.map(a => `Aula ${a.ordem} (${a.titulo})`).join(', ')}.`);
                if (semMissoes.length > 0) pendencias.push(`Missões não preenchidas em: ${semMissoes.map(a => `Aula ${a.ordem} (${a.titulo})`).join(', ')}.`);
                if (totalPremios === 0) pendencias.push('Prêmios do ranking ainda não foram cadastrados no curso.');
                return res.status(409).json({
                    error: 'Apenas é possível iniciar o curso quando todas as aulas estiverem com Pesquisa e Missões preenchidas e os Prêmios cadastrados.',
                    codigo: 'CURSO_INCOMPLETO_PARA_INICIAR',
                    pendencias
                });
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
            const aula = await dbGet(`SELECT * FROM uniamerica_aulas WHERE id = ?`, [aulaId]);
            if (!aula) return res.status(404).json({ error: 'Aula não encontrada.' });

            // Regra obrigatória: Apenas deve ser possível concluir a aula/curso se tiver pelo menos um colaborador selecionado na lista de presença!
            const presRow = await dbGet(`SELECT COUNT(*) AS qtd FROM uniamerica_presencas WHERE aula_id = ? AND presente = 1`, [aulaId]);
            const presentesQtd = Number(presRow ? presRow.qtd : 0) || 0;
            if (presentesQtd === 0) {
                return res.status(400).json({
                    error: 'Apenas é possível concluir a aula e o curso se houver pelo menos um colaborador selecionado como Presente na Lista de Presença.'
                });
            }

            await dbRun(
                `UPDATE uniamerica_aulas
                 SET status_aula = 'concluida', concluida_em = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
                 WHERE id = ?`,
                [aulaId]
            );

            // Verificar se todas as aulas do curso já foram concluídas; se sim, marcar o curso como concluído e gravar o usuário logado que ministrou/concluiu a última aula
            const todasAulas = await dbAll(`SELECT id, ordem, ultima_aula, status_aula FROM uniamerica_aulas WHERE curso_id = ? ORDER BY ordem ASC, id ASC`, [aula.curso_id]);
            const todasConcluidas = todasAulas.length > 0 && todasAulas.every(a => a.status_aula === 'concluida');
            const ehUltimaAula = Number(aula.ultima_aula) === 1 || (todasAulas.length > 0 && Number(todasAulas[todasAulas.length - 1].id) === Number(aulaId));
            const nomeInstrutor = await obterNomeInstrutorUsuario(req.user);

            if (todasConcluidas) {
                await dbRun(
                    `UPDATE uniamerica_cursos
                     SET status = 'concluido',
                         ministrado_por_usuario_id = ?,
                         ministrado_por_nome = CASE WHEN ? != '' THEN ? ELSE ministrado_por_nome END,
                         updated_at = CURRENT_TIMESTAMP
                     WHERE id = ?`,
                    [req.user.id || null, nomeInstrutor, nomeInstrutor, aula.curso_id]
                );
            } else if (ehUltimaAula && nomeInstrutor) {
                await dbRun(
                    `UPDATE uniamerica_cursos
                     SET ministrado_por_usuario_id = ?,
                         ministrado_por_nome = ?,
                         updated_at = CURRENT_TIMESTAMP
                     WHERE id = ?`,
                    [req.user.id || null, nomeInstrutor, aula.curso_id]
                );
            }

            // Garantir que todos os presentes nesta aula recebam o formulário por e-mail caso ainda não tenha sido enviado
            (async () => {
                try {
                    const cursoRow = await dbGet(`SELECT * FROM uniamerica_cursos WHERE id = ?`, [aula.curso_id]);
                    const presList = await dbAll(`SELECT colaborador_id FROM uniamerica_presencas WHERE aula_id = ? AND presente = 1`, [aulaId]);
                    for (const pr of presList) {
                        await enviarEmailFormularioAulaParaColaborador(cursoRow, aula, pr.colaborador_id, { forcarReenvio: false });
                    }
                } catch (_) {}
            })();

            res.json({ ok: true, status_aula: 'concluida', curso_concluido: todasConcluidas });
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
            const [colabs, presRows, testesRows] = await Promise.all([
                listarColaboradoresDoCurso(curso),
                dbAll(`SELECT * FROM uniamerica_presencas WHERE aula_id = ?`, [aulaId]),
                dbAll(`SELECT * FROM uniamerica_submissoes_teste WHERE aula_id = ?`, [aulaId])
            ]);

            const perguntas = parseJson(aula.perguntas_json, []);
            const presMap = {};
            presRows.forEach(p => { presMap[p.colaborador_id] = p; });
            const testeMap = {};
            testesRows.forEach(t => {
                const resps = parseJson(t.respostas_json, {});
                let acertos = 0;
                if (perguntas.length > 0 && resps && Object.keys(resps).length > 0) {
                    perguntas.forEach(q => {
                        const rIdx = resps[q.id] !== undefined && resps[q.id] !== null ? parseInt(resps[q.id], 10) : -1;
                        if (rIdx === Number(q.correta_idx)) acertos += 1;
                    });
                } else {
                    acertos = Number(t.pontos_calculados || 0);
                }
                testeMap[t.colaborador_id] = { ...t, pontos_calculados: acertos, total_perguntas: perguntas.length };
            });

            const lista = colabs.map(c => {
                const pr = presMap[c.id];
                const st = testeMap[c.id] || null;
                return {
                    colaborador_id: c.id,
                    nome_completo: c.nome_completo,
                    cargo: c.cargo,
                    departamento: c.departamento,
                    email_particular: c.email || c.email_corporativo || '',
                    foto_url: `/api/colaboradores/foto/${c.id}`,
                    presente: !!(pr && Number(pr.presente) === 1),
                    liberado_missao_em: pr ? pr.liberado_missao_em : null,
                    registrado_em: pr ? pr.registrado_em : null,
                    email_formulario_enviado_em: pr ? pr.email_formulario_enviado_em : null,
                    email_formulario_destino: pr ? pr.email_formulario_destino : null,
                    teste_respondido: !!st,
                    teste_nota: st ? st.pontos_calculados : null,
                    total_perguntas: perguntas.length
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
            if (aula.status_aula === 'concluida') {
                return res.status(409).json({ error: 'A presença não pode ser editada após a conclusão da aula.' });
            }

            // Aceita tanto atualização individual { colaborador_id, presente } quanto em lote { presencas: [{colaborador_id, presente}] }
            const itens = Array.isArray(req.body.presencas)
                ? req.body.presencas
                : [{ colaborador_id: req.body.colaborador_id, presente: req.body.presente }];

            const curso = await dbGet(`SELECT * FROM uniamerica_cursos WHERE id = ?`, [aula.curso_id]);
            const presentesIds = [];

            for (const item of itens) {
                const colabId = parseInt(item.colaborador_id, 10);
                if (!colabId) continue;
                const pres = item.presente ? 1 : 0;

                if (pres === 1) {
                    const novoToken = crypto.randomBytes(16).toString('hex');
                    await dbRun(
                        `INSERT INTO uniamerica_presencas (curso_id, aula_id, colaborador_id, presente, token_formulario, liberado_missao_em, registrado_por, registrado_em)
                         VALUES (?, ?, ?, 1, ?, CURRENT_TIMESTAMP, ?, CURRENT_TIMESTAMP)
                         ON CONFLICT(aula_id, colaborador_id)
                         DO UPDATE SET presente = 1,
                                       token_formulario = COALESCE(uniamerica_presencas.token_formulario, excluded.token_formulario),
                                       liberado_missao_em = COALESCE(uniamerica_presencas.liberado_missao_em, CURRENT_TIMESTAMP),
                                       registrado_por = excluded.registrado_por,
                                       registrado_em = CURRENT_TIMESTAMP`,
                        [aula.curso_id, aulaId, colabId, novoToken, req.user.id || null]
                    );
                    presentesIds.push(colabId);
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

            // Disparar envio automático do formulário da aula para o e-mail particular dos colaboradores presentes
            let emailsEnviados = 0;
            for (const cId of presentesIds) {
                const rEnv = await enviarEmailFormularioAulaParaColaborador(curso, aula, cId, { forcarReenvio: false });
                if (rEnv && rEnv.enviado) emailsEnviados++;
            }

            res.json({ ok: true, emails_enviados: emailsEnviados });
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
            const perguntas = parseJson(aula.perguntas_json, []);
            const testeMap = {};
            testesRows.forEach(t => {
                const respostas = parseJson(t.respostas_json, {});
                let acertos = 0;
                if (perguntas.length > 0 && respostas && Object.keys(respostas).length > 0) {
                    perguntas.forEach(q => {
                        const rIdx = respostas[q.id] !== undefined && respostas[q.id] !== null ? parseInt(respostas[q.id], 10) : -1;
                        if (rIdx === Number(q.correta_idx)) acertos += 1;
                    });
                } else {
                    acertos = Number(t.pontos_calculados || 0);
                }
                testeMap[t.colaborador_id] = { ...t, respostas, acertos, TotalPerguntas: perguntas.length, pontos_calculados: acertos };
            });
            const missaoMap = {};
            missoesRows.forEach(m => {
                missaoMap[`${m.colaborador_id}_${m.missao_id}`] = {
                    ...m,
                    respostas: parseJson(m.respostas_json, {}),
                    avaliacao_campos: parseJson(m.avaliacao_campos_json, {})
                };
            });

            const arqMap = {};
            arquivosRows.forEach(ar => {
                const k = `${ar.colaborador_id}_${ar.missao_id}`;
                if (!arqMap[k]) arqMap[k] = [];
                arqMap[k].push({ ...ar, nome_arquivo: corrigirMojibakeNome(ar.nome_arquivo), url: r2StreamUrl(ar.r2_key) });
            });
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
                    email_particular: c.email || c.email_corporativo || '',
                    email_formulario_enviado_em: pr ? pr.email_formulario_enviado_em : null,
                    email_formulario_destino: pr ? pr.email_formulario_destino : null,
                    token_formulario: pr ? pr.token_formulario : null,
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

    // Enviar / Reenviar link do Formulário da Aula para o e-mail particular do(s) colaborador(es) presente(s)
    app.post('/api/uniamerica/aulas/:aulaId/enviar-formulario-email', guardGestor, async (req, res) => {
        try {
            const aulaId = parseInt(req.params.aulaId, 10);
            const aula = await dbGet(`SELECT * FROM uniamerica_aulas WHERE id = ?`, [aulaId]);
            if (!aula) return res.status(404).json({ error: 'Aula não encontrada.' });

            const curso = await dbGet(`SELECT * FROM uniamerica_cursos WHERE id = ?`, [aula.curso_id]);
            if (!curso) return res.status(404).json({ error: 'Curso não encontrado.' });

            const perguntas = parseJson(aula.perguntas_json, []);
            if (Number(aula.ultima_aula) === 1 || !Array.isArray(perguntas) || perguntas.length === 0) {
                return res.status(400).json({ error: 'Esta aula não possui perguntas configuradas no formulário.' });
            }

            const colabIdEsp = parseInt(req.body.colaborador_id, 10);
            let alvos = [];
            if (colabIdEsp > 0) {
                alvos = [colabIdEsp];
            } else {
                const presRows = await dbAll(`SELECT colaborador_id FROM uniamerica_presencas WHERE aula_id = ? AND presente = 1`, [aulaId]);
                alvos = presRows.map(p => Number(p.colaborador_id));
            }

            if (alvos.length === 0) {
                return res.status(400).json({ error: 'Nenhum colaborador marcado como presente nesta aula para receber o formulário.' });
            }

            let enviados = 0;
            let semEmail = 0;
            let jaRespondidos = 0;
            const detalhes = [];

            for (const cId of alvos) {
                const rEnv = await enviarEmailFormularioAulaParaColaborador(curso, aula, cId, { forcarReenvio: true });
                detalhes.push({ colaborador_id: cId, ...rEnv });
                if (rEnv.enviado) enviados++;
                else if (rEnv.motivo === 'sem_email') semEmail++;
                else if (rEnv.motivo === 'ja_respondido') jaRespondidos++;
            }

            res.json({
                ok: true,
                enviados,
                sem_email: semEmail,
                ja_respondidos: jaRespondidos,
                detalhes
            });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    });

    // ═══════════════════════════════════════════════════════════════════════════
    //  ROTAS PÚBLICAS DO FORMULÁRIO DA AULA ENVIADO POR E-MAIL (TOKEN ÚNICO + IMAGEM DO PRÊMIO)
    // ═══════════════════════════════════════════════════════════════════════════
    app.get('/api/public/uniamerica-premio-imagem/:premioId', async (req, res) => {
        try {
            const premioId = parseInt(req.params.premioId, 10);
            const pr = await dbGet(`SELECT * FROM uniamerica_premios WHERE id = ?`, [premioId]);
            if (!pr || !pr.imagem_r2_key || !r2 || !r2.isReady()) {
                return res.status(404).send('Imagem não encontrada');
            }
            const { stream, contentType } = await r2.downloadStreamFromR2(pr.imagem_r2_key);
            res.setHeader('Content-Type', contentType || 'image/jpeg');
            res.setHeader('Cache-Control', 'public, max-age=86400');
            stream.pipe(res);
        } catch (e) {
            res.status(404).send('Imagem não disponível');
        }
    });

    app.get('/api/public/uniamerica-formulario/:token', async (req, res) => {
        try {
            const token = String(req.params.token || '').trim();
            if (!token) return res.status(400).json({ error: 'Token inválido.' });

            const pres = await dbGet(`SELECT * FROM uniamerica_presencas WHERE token_formulario = ?`, [token]);
            if (!pres || Number(pres.presente) !== 1) {
                return res.status(404).json({ error: 'Formulário não encontrado ou presença não confirmada nesta aula.' });
            }

            const [aula, curso, colab, subTeste, todasAulas, premiosRows] = await Promise.all([
                dbGet(`SELECT * FROM uniamerica_aulas WHERE id = ?`, [pres.aula_id]),
                dbGet(`SELECT * FROM uniamerica_cursos WHERE id = ?`, [pres.curso_id]),
                dbGet(`SELECT id, nome_completo FROM colaboradores WHERE id = ?`, [pres.colaborador_id]),
                dbGet(`SELECT * FROM uniamerica_submissoes_teste WHERE aula_id = ? AND colaborador_id = ?`, [pres.aula_id, pres.colaborador_id]),
                dbAll(`SELECT * FROM uniamerica_aulas WHERE curso_id = ? ORDER BY ordem ASC, id ASC`, [pres.curso_id]),
                dbAll(`SELECT * FROM uniamerica_premios WHERE curso_id = ? ORDER BY colocacao ASC`, [pres.curso_id])
            ]);

            if (!aula || !curso || !colab) {
                return res.status(404).json({ error: 'Dados da aula ou do curso não encontrados.' });
            }

            const { prazoExpirado } = verificarPrazoExpiradoPorProximaAula(aula, todasAulas, curso);
            const perguntasRaw = parseJson(aula.perguntas_json, []);
            const missoesRaw = parseJson(aula.missoes_json, []);
            const respostasSalvas = subTeste ? parseJson(subTeste.respostas_json, {}) : {};

            let acertos = 0;
            if (subTeste) {
                if (perguntasRaw.length > 0 && Object.keys(respostasSalvas).length > 0) {
                    perguntasRaw.forEach(q => {
                        const rIdx = respostasSalvas[q.id] !== undefined && respostasSalvas[q.id] !== null && respostasSalvas[q.id] !== ''
                            ? parseInt(respostasSalvas[q.id], 10)
                            : -1;
                        if (rIdx === Number(q.correta_idx)) acertos += 1;
                    });
                } else {
                    acertos = Number(subTeste.pontos_calculados || 0);
                }
            }

            const nomeLimpo = String(colab.nome_completo || '').replace(/^[💎🥇🥈🥉\s]+/u, '').trim();
            const mostrarGabarito = !!subTeste || prazoExpirado;

            res.json({
                ok: true,
                curso_id: curso.id,
                curso_nome: curso.nome,
                aula_id: aula.id,
                aula_ordem: aula.ordem,
                aula_titulo: aula.titulo,
                aula_descricao: aula.descricao,
                colaborador_id: colab.id,
                colaborador_nome: nomeLimpo,
                respondido: !!subTeste,
                respondido_em: subTeste ? subTeste.enviado_em : null,
                prazo_expirado: prazoExpirado,
                acertos,
                pontos_calculados: acertos,
                total_perguntas: perguntasRaw.length,
                total_missoes: missoesRaw.length,
                premios: premiosRows.map(pr => ({
                    id: pr.id,
                    colocacao: pr.colocacao,
                    titulo: pr.titulo,
                    recompensa: pr.recompensa,
                    descricao: pr.descricao,
                    imagem_url: pr.imagem_r2_key ? `/api/public/uniamerica-premio-imagem/${pr.id}` : null
                })),
                perguntas: perguntasRaw.map(q => ({
                    id: q.id,
                    pergunta: q.pergunta,
                    opcoes: q.opcoes || [],
                    ...(mostrarGabarito ? { correta_idx: q.correta_idx, resposta_dada: respostasSalvas[q.id] } : {})
                }))
            });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    });

    app.post('/api/public/uniamerica-formulario/:token', async (req, res) => {
        try {
            const token = String(req.params.token || '').trim();
            if (!token) return res.status(400).json({ error: 'Token inválido.' });

            const pres = await dbGet(`SELECT * FROM uniamerica_presencas WHERE token_formulario = ?`, [token]);
            if (!pres || Number(pres.presente) !== 1) {
                return res.status(404).json({ error: 'Formulário não encontrado ou presença não confirmada nesta aula.' });
            }

            const [aula, curso, todasAulas, jaRespondeu] = await Promise.all([
                dbGet(`SELECT * FROM uniamerica_aulas WHERE id = ?`, [pres.aula_id]),
                dbGet(`SELECT * FROM uniamerica_cursos WHERE id = ?`, [pres.curso_id]),
                dbAll(`SELECT * FROM uniamerica_aulas WHERE curso_id = ? ORDER BY ordem ASC, id ASC`, [pres.curso_id]),
                dbGet(`SELECT * FROM uniamerica_submissoes_teste WHERE aula_id = ? AND colaborador_id = ?`, [pres.aula_id, pres.colaborador_id])
            ]);

            if (!aula) return res.status(404).json({ error: 'Aula não encontrada.' });
            if (jaRespondeu) {
                return res.status(400).json({ error: 'Você já enviou suas respostas para o formulário desta aula.' });
            }

            const { prazoExpirado } = verificarPrazoExpiradoPorProximaAula(aula, todasAulas, curso);
            if (prazoExpirado) {
                return res.status(403).json({ error: 'Prazo expirado: a próxima aula já foi concluída e não é mais possível preencher o formulário desta aula.' });
            }

            const respostas = req.body.respostas || {};
            const perguntas = parseJson(aula.perguntas_json, []);

            // Se responder apenas parcialmente, as perguntas não preenchidas valem 0 e as preenchidas certas valem 1
            let somaPontos = 0;
            let acertos = 0;
            perguntas.forEach(q => {
                const raw = respostas[q.id];
                const respIdx = (raw !== undefined && raw !== null && raw !== '') ? parseInt(raw, 10) : -1;
                if (respIdx === Number(q.correta_idx)) {
                    acertos++;
                    somaPontos += 1;
                }
            });

            await dbRun(
                `INSERT INTO uniamerica_submissoes_teste
                 (curso_id, aula_id, colaborador_id, respostas_json, pontos_calculados, enviado_em)
                 VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
                [pres.curso_id, pres.aula_id, pres.colaborador_id, JSON.stringify(respostas), somaPontos]
            );

            res.json({
                ok: true,
                acertos,
                total_perguntas: perguntas.length,
                pontos_calculados: somaPontos,
                perguntas: perguntas.map(q => ({
                    id: q.id,
                    pergunta: q.pergunta,
                    opcoes: q.opcoes || [],
                    correta_idx: q.correta_idx,
                    resposta_dada: respostas[q.id]
                }))
            });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    });

    // Gestor avalia / confirma pontuação de cada item/campo da Missão (1 ponto por item cumprido, 0 por não cumprido)
    app.put('/api/uniamerica/submissoes-missao/avaliar', guardGestor, async (req, res) => {
        try {
            const aulaId = parseInt(req.body.aula_id, 10);
            const colaboradorId = parseInt(req.body.colaborador_id, 10);
            const missaoId = String(req.body.missao_id || '').trim();
            const feedbackGestor = String(req.body.feedback_gestor || '').trim();
            const avaliacaoCamposRaw = (req.body.avaliacao_campos && typeof req.body.avaliacao_campos === 'object')
                ? req.body.avaliacao_campos
                : null;

            if (!aulaId || !colaboradorId || !missaoId) {
                return res.status(400).json({ error: 'Dados incompletos para avaliar a missão.' });
            }

            const aula = await dbGet(`SELECT * FROM uniamerica_aulas WHERE id = ?`, [aulaId]);
            if (!aula) return res.status(404).json({ error: 'Aula não encontrada.' });

            const missoesAula = parseJson(aula.missoes_json, []);
            const defMissao = missoesAula.find(m => String(m.id) === missaoId) || { campos: [] };
            const camposMissao = Array.isArray(defMissao.campos) && defMissao.campos.length > 0
                ? defMissao.campos
                : [{ id: '_unico', label: defMissao.titulo || 'Missão' }];
            const maxPts = camposMissao.length;

            let notaFinal = NaN;
            const avaliacaoCamposFinal = {};

            if (avaliacaoCamposRaw) {
                let soma = 0;
                for (const cp of camposMissao) {
                    const v = avaliacaoCamposRaw[cp.id];
                    const n = (v === 1 || v === '1' || v === true) ? 1 : ((v === 0 || v === '0' || v === false) ? 0 : NaN);
                    if (isNaN(n)) {
                        return res.status(400).json({ error: `Selecione se o item "${cp.label || 'Missão'}" foi cumprido (1 ponto) ou não cumprido (0 ponto).` });
                    }
                    avaliacaoCamposFinal[cp.id] = n;
                    soma += n;
                }
                notaFinal = soma;
            } else {
                const n = parseFloat(req.body.nota_gestor);
                if (isNaN(n) || n < 0 || n > maxPts) {
                    return res.status(400).json({ error: `Selecione uma pontuação válida (0 a ${maxPts} ponto(s)).` });
                }
                notaFinal = n;
                camposMissao.forEach((cp, idx) => {
                    avaliacaoCamposFinal[cp.id] = idx < notaFinal ? 1 : 0;
                });
            }

            await dbRun(
                `INSERT INTO uniamerica_submissoes_missao
                 (curso_id, aula_id, missao_id, colaborador_id, respostas_json, nota_gestor, avaliacao_campos_json, feedback_gestor, status, avaliado_por, avaliado_em)
                 VALUES (?, ?, ?, ?, '{}', ?, ?, ?, 'avaliada', ?, CURRENT_TIMESTAMP)
                 ON CONFLICT(aula_id, missao_id, colaborador_id)
                 DO UPDATE SET nota_gestor = excluded.nota_gestor,
                               avaliacao_campos_json = excluded.avaliacao_campos_json,
                               feedback_gestor = excluded.feedback_gestor,
                               status = 'avaliada',
                               avaliado_por = excluded.avaliado_por,
                               avaliado_em = CURRENT_TIMESTAMP`,
                [aula.curso_id, aulaId, missaoId, colaboradorId, notaFinal, JSON.stringify(avaliacaoCamposFinal), feedbackGestor, req.user.id || null]
            );

            res.json({ ok: true, nota_gestor: notaFinal, max_pontos: maxPts, avaliacao_campos: avaliacaoCamposFinal });
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
                // Regra obrigatória: nunca excluir arquivos do R2
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

            // Regra obrigatória: nunca excluir arquivos do R2
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
                // Regra obrigatória: nunca excluir arquivos do R2
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
                ministrado_por_nome: quadro.curso.ministrado_por_nome || '',
                arquivo_url: r2Key ? r2StreamUrl(r2Key) : null
            });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    });

    // Enviar Certificado do Curso para o e-mail pessoal do colaborador
    app.post('/api/uniamerica/cursos/:cursoId/certificados/enviar-email', guardGestor, async (req, res) => {
        try {
            const cursoId = parseInt(req.params.cursoId, 10);
            const colaboradorId = parseInt(req.body.colaborador_id, 10);
            const imagemBase64 = String(req.body.imagem_base64 || '').trim();

            if (!cursoId || !colaboradorId) {
                return res.status(400).json({ error: 'Informe o curso e o colaborador.' });
            }

            const [curso, colab, cert] = await Promise.all([
                dbGet(`SELECT * FROM uniamerica_cursos WHERE id = ?`, [cursoId]),
                dbGet(`SELECT id, nome_completo, email, email_corporativo FROM colaboradores WHERE id = ?`, [colaboradorId]),
                dbGet(`SELECT * FROM uniamerica_certificados WHERE curso_id = ? AND colaborador_id = ?`, [cursoId, colaboradorId])
            ]);

            if (!curso) return res.status(404).json({ error: 'Curso não encontrado.' });
            if (!colab) return res.status(404).json({ error: 'Colaborador não encontrado.' });

            const emailParticular = String(colab.email || '').trim();
            const emailCorp = String(colab.email_corporativo || '').trim();
            const emailDestino = (emailParticular && emailParticular.includes('@'))
                ? emailParticular
                : ((emailCorp && emailCorp.includes('@')) ? emailCorp : '');

            if (!emailDestino) {
                return res.status(400).json({ error: 'Este colaborador não possui e-mail pessoal cadastrado na tela de Colaboradores.' });
            }

            let certBuffer = null;
            if (imagemBase64) {
                const raw = imagemBase64.replace(/^data:image\/\w+;base64,/, '');
                certBuffer = Buffer.from(raw, 'base64');
            } else if (cert && cert.r2_key) {
                const dl = await baixarBufferDoR2(cert.r2_key);
                if (dl && dl.buffer) certBuffer = dl.buffer;
            }

            if (!certBuffer) {
                return res.status(400).json({ error: 'Imagem do certificado não encontrada para envio.' });
            }

            const nomeLimpo = String(colab.nome_completo || '').replace(/^[💎🥇🥈🥉\s]+/u, '').trim();
            const nomeFirst = nomeLimpo.split(' ')[0] || 'Colaborador';
            const nomeArquivo = `Certificado_${sanitizeFileName(nomeLimpo)}_${sanitizeFileName(curso.nome)}.png`;
            const logoPath = path.join(__dirname, '..', 'frontend', 'assets', 'logo-header.png');

            const attachments = [];
            if (fs.existsSync(logoPath)) {
                attachments.push({ filename: 'logo-header.png', path: logoPath, cid: 'empresa-logo' });
            }
            attachments.push({
                filename: nomeArquivo,
                content: certBuffer,
                contentType: 'image/png',
                cid: 'certificado-uniamerica'
            });

            if (typeof sendMailHelper !== 'function') {
                return res.status(500).json({ error: 'Serviço de envio de e-mail não configurado no servidor.' });
            }

            await sendMailHelper({
                to: emailDestino,
                subject: `Certificado de Conclusão — ${curso.nome} (UniAmérica)`,
                html: `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;"><div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;color:#333;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;"><div style="background:#fff;padding:0;"><img src="cid:empresa-logo" alt="América Rental" style="width:100%;display:block;max-height:120px;object-fit:cover;"></div><div style="padding:1.5rem 2rem;"><h2 style="color:#0e7490;margin-top:0;">Parabéns pela conclusão do treinamento, ${nomeFirst}!</h2><p>Olá <strong>${nomeLimpo}</strong>,</p><p>Segue abaixo e em anexo o seu <strong>Certificado de Conclusão</strong> do treinamento <strong>${curso.nome}</strong>, realizado na <strong>UniAmérica - América Rental</strong>.</p><div style="margin:20px 0;text-align:center;"><img src="cid:certificado-uniamerica" alt="Certificado ${curso.nome}" style="max-width:100%;height:auto;border-radius:8px;border:1px solid #cbd5e1;"></div><p style="font-size:13px;color:#475569;">Você também pode baixar o arquivo em alta resolução anexado a este e-mail.</p><hr style="border:none;border-top:1px solid #eee;margin:25px 0;"><p style="color:#999;font-size:11px;">Este é um e-mail enviado pela UniAmérica - América Rental.</p></div></div></body></html>`,
                attachments
            });

            res.json({ ok: true, email: emailDestino });
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
                missoesRows.forEach(m => {
                    missaoMap[`${m.aula_id}_${m.missao_id}`] = {
                        ...m,
                        respostas: parseJson(m.respostas_json, {}),
                        avaliacao_campos: parseJson(m.avaliacao_campos_json, {})
                    };
                });
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

                // Regra obrigatória: Na tela de missões deve aparecer APENAS os cursos em que o colaborador foi selecionado E teve presença confirmada!
                const temPresencaConfirmadaNoCurso = presRows.some(p => Number(p.presente) === 1);
                if (!temPresencaConfirmadaNoCurso) continue;

                const aulasDetalhe = aulas.map(a => {
                    const pr = presMap[a.id];
                    const presente = !!(pr && Number(pr.presente) === 1);

                    // Regra obrigatória: O colaborador tem até a PRÓXIMA aula ser concluída para preencher as perguntas e missões da aula anterior!
                    const { prazoExpirado, proximaAula } = verificarPrazoExpiradoPorProximaAula(a, aulas, curso);

                    const subTeste = testeMap[a.id] || null;
                    const mostrarGabarito = !!subTeste || prazoExpirado;
                    const perguntasPublicas = parseJson(a.perguntas_json, []).map(q => ({
                        id: q.id,
                        pergunta: q.pergunta,
                        opcoes: q.opcoes,
                        nota_pontos: q.nota_pontos,
                        ...(mostrarGabarito ? { correta_idx: q.correta_idx } : {})
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
                        ultima_aula: Number(a.ultima_aula) === 1 ? 1 : 0,
                        status_aula: a.status_aula,
                        presente,
                        liberada_para_responder: presente,
                        token_formulario: pr ? pr.token_formulario : null,
                        email_formulario_enviado_em: pr ? pr.email_formulario_enviado_em : null,
                        proxima_aula_ordem: proximaAula ? proximaAula.ordem : null,
                        proxima_aula_titulo: proximaAula ? proximaAula.titulo : null,
                        prazo_expirado: prazoExpirado,
                        anexos: presente ? (anexosPorAula[a.id] || []) : [],
                        perguntas: perguntasPublicas,
                        submissao_teste: subTeste,
                        missoes: missoesPublicas
                    };
                }).filter(a => a.presente);

                if (aulasDetalhe.length === 0) continue;

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

            const [cursoRow, todasAulas] = await Promise.all([
                dbGet(`SELECT * FROM uniamerica_cursos WHERE id = ?`, [aula.curso_id]),
                dbAll(`SELECT * FROM uniamerica_aulas WHERE curso_id = ? ORDER BY ordem ASC, id ASC`, [aula.curso_id])
            ]);
            const { prazoExpirado } = verificarPrazoExpiradoPorProximaAula(aula, todasAulas, cursoRow);
            if (prazoExpirado) {
                return res.status(403).json({ error: 'Prazo expirado: a próxima aula já foi concluída e não é mais possível preencher o formulário desta aula.' });
            }

            const respostas = req.body.respostas || {};
            const perguntas = parseJson(aula.perguntas_json, []);

            // Cada pergunta vale 1 ponto quando acertar e 0 quando errar ou não preenchida
            let somaPontos = 0;
            let acertos = 0;
            perguntas.forEach(q => {
                const raw = respostas[q.id];
                const respIdx = (raw !== undefined && raw !== null && raw !== '') ? parseInt(raw, 10) : -1;
                if (respIdx === Number(q.correta_idx)) {
                    acertos++;
                    somaPontos += 1;
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

            const [cursoUp, todasAulasUp] = await Promise.all([
                dbGet(`SELECT * FROM uniamerica_cursos WHERE id = ?`, [aula.curso_id]),
                dbAll(`SELECT * FROM uniamerica_aulas WHERE curso_id = ? ORDER BY ordem ASC, id ASC`, [aula.curso_id])
            ]);
            const { prazoExpirado: expUp } = verificarPrazoExpiradoPorProximaAula(aula, todasAulasUp, cursoUp);
            if (expUp) {
                return res.status(403).json({ error: 'Prazo expirado: a próxima aula já foi concluída e não é mais possível enviar arquivos nesta missão.' });
            }

            const nomeOriginal = extrairNomeOriginalUpload(req, req.file);
            const r2Key = await salvarNoR2(`EntregasMissoes/Curso_${aula.curso_id}/Aula_${aulaId}`, nomeOriginal, req.file.buffer, req.file.mimetype);
            const ins = await dbRun(
                `INSERT INTO uniamerica_missao_arquivos
                 (curso_id, aula_id, missao_id, colaborador_id, campo_id, nome_arquivo, tipo_mime, tamanho_bytes, r2_key)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [aula.curso_id, aulaId, missaoId, colab.id, campoId, nomeOriginal, req.file.mimetype || 'application/octet-stream', req.file.size || 0, r2Key]
            );

            res.json({
                ok: true,
                arquivo_id: ins.lastID,
                campo_id: campoId,
                nome_arquivo: nomeOriginal,
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

            // Regra obrigatória: o colaborador tem até a próxima aula ser concluída para enviar as missões da aula anterior
            const [cursoResp, todasAulasResp] = await Promise.all([
                dbGet(`SELECT * FROM uniamerica_cursos WHERE id = ?`, [aula.curso_id]),
                dbAll(`SELECT * FROM uniamerica_aulas WHERE curso_id = ? ORDER BY ordem ASC, id ASC`, [aula.curso_id])
            ]);
            const { prazoExpirado: expMissao } = verificarPrazoExpiradoPorProximaAula(aula, todasAulasResp, cursoResp);
            if (expMissao) {
                return res.status(403).json({ error: 'Prazo expirado: a próxima aula já foi concluída e não é mais possível enviar ou editar esta missão.' });
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
