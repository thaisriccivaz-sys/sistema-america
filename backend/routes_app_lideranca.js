// ═══════════════════════════════════════════════════════════════════════════════
// ROTAS: APP › LIDERANÇA › CANDIDATOS  (uso operacional, mobile-first)
// Arquivo: backend/routes_app_lideranca.js
// Registro no server.js:
//   require('./routes_app_lideranca')(app, db, authenticateToken, r2);
//
// - Agenda dos candidatos com 1º dia de teste (candidatos_teste.data_teste_1)
// - Checklist do que o líder ensinou (motorista / ajudante)
// - Perguntas do 1º dia (M1 / A1) → grava em candidatos_teste_avaliacoes (dia = '1'),
//   o mesmo lugar que a tela de candidatos do RH já lê
// - Áudio obrigatório (Cloudflare R2, mesmo padrão da avaliação pública)
// - "Pendente" só para o líder que estava de plantão (turno do dia + escala) na data do teste
// - PWA + Web Push (aviso às 07h para o líder de plantão no dia)
// ═══════════════════════════════════════════════════════════════════════════════
"use strict";

const multer = require('multer');

module.exports = function registerAppLiderancaRoutes(app, db, authenticateToken, r2) {

    const PAGE_ID = 'app-lideranca-candidatos';
    const TZ = 'America/Sao_Paulo';
    const PUSH_URL = '/?abrir=app-lideranca-candidatos';
    const uploadMem = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

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
    const normTxt = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
    const isoDate = s => {
        const str = String(s || '').trim();
        const m = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (m) return `${m[1]}-${m[2]}-${m[3]}`;
        const mBr = str.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
        if (mBr) return `${mBr[3]}-${mBr[2]}-${mBr[1]}`;
        return null;
    };
    const hojeSP = () => new Date().toLocaleDateString('en-CA', { timeZone: TZ });
    const usuarioReq = req => (req.user && (req.user.nome || req.user.username)) || 'Líder';
    const isTipoMotorista = t => normTxt(t).includes('motorista');
    // A categoria da CNH vem do tipo do candidato ("Motorista B" / "Motorista D")
    const cnhDoTipo = t => { const m = String(t || '').match(/motorista\s*([bd])\b/i); return m ? m[1].toUpperCase() : null; };
    async function nomeUsuario(req) {
        try {
            const u = await dbGet("SELECT COALESCE(NULLIF(TRIM(nome),''), username) AS n FROM usuarios WHERE id = ?", [req.user && req.user.id]);
            if (u && u.n) return u.n;
        } catch (e) { /* usa fallback */ }
        return usuarioReq(req);
    }

    // ── Migrações ───────────────────────────────────────────────────────────────
    db.serialize(() => {
        db.run(`CREATE TABLE IF NOT EXISTS configuracoes_sistema (chave TEXT PRIMARY KEY, valor TEXT)`);
        db.run(`CREATE TABLE IF NOT EXISTS candidatos_checklist_lider (
            id             INTEGER PRIMARY KEY AUTOINCREMENT,
            candidato_id   INTEGER NOT NULL,
            dia            TEXT NOT NULL DEFAULT '1',
            tipo           TEXT,
            itens_json     TEXT,
            cnh_categoria  TEXT,
            lider_id       INTEGER,
            lider_nome     TEXT,
            iniciado_em    DATETIME DEFAULT CURRENT_TIMESTAMP,
            atualizado_em  DATETIME DEFAULT CURRENT_TIMESTAMP,
            concluido_em   DATETIME,
            UNIQUE (candidato_id, dia)
        )`);
        db.run(`CREATE TABLE IF NOT EXISTS app_lider_config (
            colaborador_id INTEGER PRIMARY KEY,
            usuario_id     INTEGER,
            plantao_dia    INTEGER DEFAULT 0,
            atualizado_em  DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);
        db.run(`CREATE TABLE IF NOT EXISTS push_subscriptions (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            usuario_id  INTEGER NOT NULL,
            endpoint    TEXT NOT NULL UNIQUE,
            p256dh      TEXT,
            auth        TEXT,
            user_agent  TEXT,
            criado_em   DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);
        db.run(`ALTER TABLE candidatos_teste ADD COLUMN cnh_categoria TEXT`, () => { /* já existe */ });
    });

    // ── Itens do checklist do 1º dia ────────────────────────────────────────────
    const CHECKLIST = {
        motorista: [
            { id: 1, texto: 'Apresentação dos equipamentos', icone: 'ph-wrench' },
            { id: 2, texto: 'Manuseio de mangueiras', icone: 'ph-drop' },
            { id: 3, texto: 'Manuseio da VAC', icone: 'ph-wind' },
            { id: 4, texto: 'Manuseio dos equipamentos', icone: 'ph-toolbox' },
            { id: 5, texto: 'Conhecimento do segundo espaço', icone: 'ph-map-pin' },
            { id: 6, texto: 'Acompanhamento de lavagem dos banheiros', icone: 'ph-shower' },
            { id: 7, texto: 'Amarração dos banheiros químicos', icone: 'ph-link' },
            { id: 8, texto: 'Manobras de veículos', icone: 'ph-steering-wheel', cnh: true },
            { id: 9, texto: 'Direção de veículo', icone: 'ph-truck' },
            { id: 10, texto: 'Atendimento ao cliente', icone: 'ph-handshake' },
            { id: 11, texto: 'Sucção na prática', icone: 'ph-arrow-fat-lines-down' },
            { id: 12, texto: 'Utilização do APP', icone: 'ph-device-mobile' },
            { id: 13, texto: 'Utilização de EPI na prática', icone: 'ph-hard-hat' }
        ],
        ajudante: [
            { id: 1, texto: 'Apresentação dos equipamentos', icone: 'ph-wrench' },
            { id: 2, texto: 'Manuseio de mangueiras', icone: 'ph-drop' },
            { id: 3, texto: 'Manuseio da VAC', icone: 'ph-wind' },
            { id: 4, texto: 'Manuseio dos equipamentos', icone: 'ph-toolbox' },
            { id: 5, texto: 'Lavagem detalhada dos banheiros e equipamentos', icone: 'ph-shower' },
            { id: 6, texto: 'Apresentação dos produtos químicos e de lavagem', icone: 'ph-flask' },
            { id: 7, texto: 'Limpeza das dependências da empresa', icone: 'ph-broom' },
            { id: 8, texto: 'Reparos básicos em banheiros (troca de assento sanitário, dispenser de papel toalha e sabonete...)', icone: 'ph-wrench' },
            { id: 9, texto: 'Ensinar a auxiliar na manobra dos veículos', icone: 'ph-traffic-cone' },
            { id: 10, texto: 'Utilização de EPI na prática', icone: 'ph-hard-hat' }
        ]
    };
    const itensDoTipo = tipo => isTipoMotorista(tipo) ? CHECKLIST.motorista : CHECKLIST.ajudante;

    // Perguntas do 1º dia (mesmas M1 / A1 da avaliação do RH)
    const PERGUNTAS_DIA1 = {
        motorista: [
            'Demonstrou disposição e vontade de trabalhar?',
            'Demonstrou respeito, educação e bom comportamento com a equipe?',
            'Demonstrou capacidade e disposição para auxiliar no carregamento e descarregamento?',
            'Demonstrou capacidade de aprender a manusear o motor de sucção e executar a atividade corretamente, estando apto para acompanhar uma rota?',
            'Demonstrou atenção às normas de segurança e ao uso correto dos EPIs, sem precisar de advertências?',
            'Demonstrou iniciativa e procurou ajudar sem precisar ser constantemente orientado?',
            'Demonstrou facilidade e rapidez para aprender as atividades?',
            'Trabalhou com agilidade, atenção e foco nas atividades?',
            'Demonstrou tranquilidade e profissionalismo ao lidar com dejetos, sem demonstrar nojo ou repulsa?'
        ],
        ajudante: [
            'Demonstrou disposição e vontade de trabalhar?',
            'Demonstrou respeito, educação e bom comportamento com a equipe?',
            'Demonstrou capacidade e disposição para auxiliar no carregamento e descarregamento?',
            'Demonstrou capacidade de aprender a lavar os banheiros e executar a atividade corretamente, estando apto para acompanhar uma rota?',
            'Demonstrou atenção às normas de segurança e ao uso correto dos EPIs, sem precisar de advertências?',
            'Demonstrou iniciativa e procurou ajudar sem precisar ser constantemente orientado?',
            'Demonstrou facilidade e rapidez para aprender as atividades?',
            'Trabalhou com agilidade, atenção e foco nas atividades?',
            'Demonstrou tranquilidade e profissionalismo ao lidar com dejetos, sem demonstrar nojo ou repulsa?'
        ]
    };
    const perguntasDoTipo = tipo => isTipoMotorista(tipo) ? PERGUNTAS_DIA1.motorista : PERGUNTAS_DIA1.ajudante;

    // ── Permissão (Controle de Acesso → página 'app-lideranca-candidatos') ─────
    function isTopAdmin(u) {
        return !!u && (u.role === 'Diretoria' || u.role === 'Administrador' || u.departamento === 'Diretoria'
            || (u.grupo_nome && String(u.grupo_nome).toLowerCase() === 'diretoria'));
    }
    async function requireApp(req, res, next) {
        try {
            if (isTopAdmin(req.user)) return next();
            const gid = req.user && req.user.grupo_permissao_id;
            if (!gid) return res.status(403).json({ error: 'Sem permissão para acessar o APP Liderança.' });
            const row = await dbGet('SELECT visualizar FROM permissoes_grupo WHERE grupo_id = ? AND pagina_id = ?', [gid, PAGE_ID]);
            const v = row && row.visualizar;
            if (v === 1 || v === '1' || v === true || v === 'true') return next();
            return res.status(403).json({ error: 'Sem permissão para acessar o APP Liderança.' });
        } catch (e) { return res.status(500).json({ error: e.message }); }
    }
    function requireTopAdmin(req, res, next) {
        if (isTopAdmin(req.user)) return next();
        return res.status(403).json({ error: 'Apenas Diretoria/Administrador.' });
    }
    const guard = [authenticateToken, requireApp];

    // ── Escala: o colaborador está de folga em determinada data? ───────────────
    // (mesma regra usada na agenda de disponibilidade: folgas fixas, 12x36, sábado alternado,
    //  Domingo de Lei, 5x2 e 6x1; também considera férias programadas)
    const DIA_MAP = { dom: 0, domingo: 0, seg: 1, segunda: 1, ter: 2, terca: 2, qua: 3, quarta: 3, qui: 4, quinta: 4, sex: 5, sexta: 5, sab: 6, sabado: 6 };
    function colabDeFolga(c, dateStr) {
        const escalaStr = String(c.escala_tipo || '').toLowerCase();
        let explicitas = [];
        try {
            const p = JSON.parse(c.escala_folgas || '[]');
            explicitas = Array.isArray(p) ? p.map(f => normTxt(f)) : [normTxt(p)];
        } catch (e) { explicitas = String(c.escala_folgas || '').split(/[,;]+/).map(f => normTxt(f)).filter(Boolean); }
        const folgasDow = explicitas.map(f => DIA_MAP[f]).filter(v => v !== undefined);
        const temCiclo = !!c.escala_ciclo_inicio && escalaStr.includes('folga');
        const cicloBase = temCiclo ? new Date(c.escala_ciclo_inicio + 'T12:00:00') : null;
        const ultimoFolgaDow = folgasDow.length >= 2 ? folgasDow[0] : null;
        const dayMs = 1000 * 60 * 60 * 24;
        const isDomingoDeLei = ds => {
            if (!temCiclo || !cicloBase) return false;
            const d = new Date(ds + 'T12:00:00');
            if (d.getDay() !== 0) return false;
            const ref = new Date(cicloBase);
            while (ref.getDay() !== 0) ref.setDate(ref.getDate() + 1);
            const n = Math.round(Math.round((d - ref) / dayMs) / 7);
            return ((n % 3) + 3) % 3 === 0;
        };

        // Férias programadas
        const fi = isoDate(c.ferias_programadas_inicio), ff = isoDate(c.ferias_programadas_fim);
        if (fi && ff && dateStr >= fi && dateStr <= ff) return true;

        const d = new Date(dateStr + 'T12:00:00');
        const dow = d.getDay();
        if (escalaStr.includes('12x36')) {
            if (!c.escala_ciclo_inicio) return false;
            const diff = d - new Date(c.escala_ciclo_inicio + 'T12:00:00');
            if (diff < 0) return false;
            return Math.round(diff / dayMs) % 2 === 1;
        }
        if (dow === 0 && isDomingoDeLei(dateStr)) return true;
        if (ultimoFolgaDow !== null && dow === ultimoFolgaDow) {
            const dom = new Date(dateStr + 'T12:00:00');
            dom.setDate(dom.getDate() - dow);
            if (isDomingoDeLei(dom.toISOString().split('T')[0])) return false;
        }
        if (escalaStr.includes('escala_uma_folga') || escalaStr.includes('escala_duas_folgas')) {
            if (folgasDow.length > 0) return folgasDow.includes(dow);
        }
        if (escalaStr.includes('sab_alternado') || escalaStr.includes('sabado_alternado')) {
            if (dow === 0) return true;
            if (dow === 6 && c.escala_ciclo_inicio) {
                const diff = d - new Date(c.escala_ciclo_inicio + 'T12:00:00');
                if (diff < 0) return false;
                return Math.round(diff / (dayMs * 7)) % 2 === 1;
            }
            return false;
        }
        if (escalaStr.includes('seg_sexta') || escalaStr.includes('5x2') || escalaStr.includes('5 x 2')) return dow === 0 || dow === 6;
        if (escalaStr.includes('6x1') || escalaStr.includes('6 x 1')) return dow === 0;
        return dow === 0;
    }

    // ── Líderes: configuração (turno do dia) e vínculo usuário ↔ colaborador ───
    const isDeptLider = dep => normTxt(dep).includes('lider');
    const primeiroNome = s => normTxt(s).split(/\s+/)[0] || '';
    const PLANTAO_PADRAO = ['eduardo', 'vivian']; // turno do dia (Ana Paula e Vitor são da noite)

    async function sincronizarLideres() {
        try {
            const lideres = (await dbAll(`SELECT id, nome_completo, departamento, status FROM colaboradores`))
                .filter(c => isDeptLider(c.departamento) && normTxt(c.status) !== 'desligado');
            const usuarios = await dbAll(`SELECT id, username, nome FROM usuarios`);
            for (const c of lideres) {
                const cfg = await dbGet('SELECT colaborador_id, usuario_id FROM app_lider_config WHERE colaborador_id = ?', [c.id]);
                const pn = primeiroNome(c.nome_completo);
                const candidatos = usuarios.filter(u => primeiroNome(u.nome) === pn || primeiroNome(u.username) === pn);
                const uid = candidatos.length === 1 ? candidatos[0].id : null;
                if (!cfg) {
                    await dbRun('INSERT INTO app_lider_config (colaborador_id, usuario_id, plantao_dia) VALUES (?, ?, ?)',
                        [c.id, uid, PLANTAO_PADRAO.includes(pn) ? 1 : 0]);
                } else if (!cfg.usuario_id && uid) {
                    await dbRun('UPDATE app_lider_config SET usuario_id = ? WHERE colaborador_id = ?', [uid, c.id]);
                }
            }
        } catch (e) { console.error('[APP-LIDERANCA] Erro ao sincronizar líderes:', e.message); }
    }
    setTimeout(sincronizarLideres, 7000);

    // Líderes de plantão (turno do dia, ativos, fora de folga) em uma data
    async function plantonistasDoDia(dataIso) {
        const rows = await dbAll(`SELECT cfg.colaborador_id, cfg.usuario_id, c.nome_completo, c.status, c.escala_tipo, c.escala_folgas,
                                         c.escala_ciclo_inicio, c.ferias_programadas_inicio, c.ferias_programadas_fim
                                  FROM app_lider_config cfg JOIN colaboradores c ON c.id = cfg.colaborador_id
                                  WHERE cfg.plantao_dia = 1`);
        return rows.filter(r => normTxt(r.status) !== 'desligado' && !colabDeFolga(r, dataIso));
    }

    // ── Checklist: cálculo de progresso ─────────────────────────────────────────
    function resumoChecklist(tipo, row) {
        const itens = itensDoTipo(tipo);
        let obj = {};
        try { obj = JSON.parse((row && row.itens_json) || '{}'); } catch (e) { obj = {}; }
        const feitos = itens.filter(i => obj[i.id] && (obj[i.id].ok || obj[i.id].nao)).length; // avaliados: feito (✓) ou não feito (✕)
        const naoFeitos = itens.filter(i => obj[i.id] && obj[i.id].nao && !obj[i.id].ok).length;
        return { total: itens.length, feitos, nao_feitos: naoFeitos, concluido: !!(row && row.concluido_em), itens: obj };
    }

    // ═══ ROTAS ═══════════════════════════════════════════════════════════════════

    // Lista de candidatos com 1º dia agendado + situação para o líder logado
    app.get('/api/app/lideranca/candidatos', guard, async (req, res) => {
        try {
            const hoje = isoDate(req.query.hoje) || hojeSP();

            const cands = await dbAll(`SELECT id, nome, tipo, status,
                                              COALESCE(NULLIF(TRIM(data_teste_1), ''), NULLIF(TRIM(data_teste), '')) AS data_teste_1,
                                              cnh_categoria,
                                              (foto_base64 IS NOT NULL AND foto_base64 != '') AS tem_foto
                                       FROM candidatos_teste
                                       WHERE COALESCE(status, '') != 'ARQUIVADO'
                                         AND COALESCE(NULLIF(TRIM(data_teste_1), ''), NULLIF(TRIM(data_teste), '')) IS NOT NULL
                                       ORDER BY COALESCE(NULLIF(TRIM(data_teste_1), ''), NULLIF(TRIM(data_teste), '')) DESC, nome`);
            const checks = await dbAll(`SELECT candidato_id, tipo, itens_json, concluido_em FROM candidatos_checklist_lider WHERE dia = '1'`);
            const avals = await dbAll(`SELECT candidato_id FROM candidatos_teste_avaliacoes WHERE dia = '1'`);
            const chkMap = {}; checks.forEach(c => { chkMap[c.candidato_id] = c; });
            const avSet = new Set(avals.map(a => a.candidato_id));

            const meuId = req.user && req.user.id;
            const cachePlantao = {};
            const souPlantao = async data => {
                if (!(data in cachePlantao)) cachePlantao[data] = (await plantonistasDoDia(data)).some(p => p.usuario_id && p.usuario_id === meuId);
                return cachePlantao[data];
            };

            const itens = [];
            for (const c of cands) {
                const data = isoDate(c.data_teste_1);
                if (!data) continue;
                const respondido = avSet.has(c.id);
                const ck = resumoChecklist(c.tipo, chkMap[c.id]);
                let situacao;
                if (respondido) situacao = 'respondido';
                else if (data < hoje) situacao = 'passado';
                else if (data === hoje) situacao = 'hoje';
                else situacao = 'futuro';
                const pendente = !respondido && data < hoje && await souPlantao(data);
                itens.push({
                    id: c.id, nome: c.nome, tipo: c.tipo, data_teste_1: data,
                    tem_foto: !!c.tem_foto, cnh_categoria: cnhDoTipo(c.tipo) || c.cnh_categoria || null,
                    checklist: { feitos: ck.feitos, nao_feitos: ck.nao_feitos, total: ck.total, concluido: ck.concluido },
                    respondido, situacao, pendente
                });
            }
            const cfgMe = meuId ? await dbGet('SELECT plantao_dia FROM app_lider_config WHERE usuario_id = ?', [meuId]) : null;
            res.json({ hoje, itens, plantao_dia: !!(cfgMe && cfgMe.plantao_dia) });
        } catch (e) {
            console.error('[APP-LIDERANCA] GET candidatos:', e);
            res.status(500).json({ error: e.message });
        }
    });

    // Foto do candidato (img src com ?token=)
    app.get('/api/app/lideranca/candidatos/:id/foto', guard, async (req, res) => {
        try {
            const row = await dbGet('SELECT foto_base64 FROM candidatos_teste WHERE id = ?', [req.params.id]);
            if (!row || !row.foto_base64) return res.status(404).end();
            const m = String(row.foto_base64).match(/^data:(image\/[\w.+-]+);base64,(.*)$/s);
            const mime = m ? m[1] : 'image/jpeg';
            const buf = Buffer.from(m ? m[2] : row.foto_base64, 'base64');
            res.setHeader('Content-Type', mime);
            res.setHeader('Cache-Control', 'private, max-age=3600');
            res.send(buf);
        } catch (e) { res.status(500).end(); }
    });

    // Detalhe: dados, checklist, perguntas e (se já respondido) as respostas
    app.get('/api/app/lideranca/candidatos/:id', guard, async (req, res) => {
        try {
            const c = await dbGet(`SELECT id, nome, tipo, status,
                                          COALESCE(NULLIF(TRIM(data_teste_1), ''), NULLIF(TRIM(data_teste), '')) AS data_teste_1,
                                          cnh_categoria
                                   FROM candidatos_teste WHERE id = ?`, [req.params.id]);
            if (!c) return res.status(404).json({ error: 'Candidato não encontrado.' });
            const ckRow = await dbGet(`SELECT * FROM candidatos_checklist_lider WHERE candidato_id = ? AND dia = '1'`, [c.id]);
            const ck = resumoChecklist(c.tipo, ckRow);
            const av = await dbGet(`SELECT id, avaliador_nome, respostas_json, media_notas, created_at FROM candidatos_teste_avaliacoes WHERE candidato_id = ? AND dia = '1' ORDER BY id DESC LIMIT 1`, [c.id]);
            let respostas = null;
            if (av) { try { respostas = JSON.parse(av.respostas_json || '{}'); } catch (e) { respostas = {}; } }
            res.json({
                id: c.id, nome: c.nome, tipo: c.tipo, data_teste_1: isoDate(c.data_teste_1),
                eh_motorista: isTipoMotorista(c.tipo),
                cnh_categoria: cnhDoTipo(c.tipo) || (ckRow && ckRow.cnh_categoria) || c.cnh_categoria || null,
                cnh_fixa: !!cnhDoTipo(c.tipo),
                itens: itensDoTipo(c.tipo),
                checklist: { feitos: ck.feitos, nao_feitos: ck.nao_feitos, total: ck.total, concluido: ck.concluido, estado: ck.itens, lider_nome: ckRow ? ckRow.lider_nome : null, concluido_em: ckRow ? ckRow.concluido_em : null },
                perguntas: perguntasDoTipo(c.tipo),
                avaliacao: av ? { avaliador_nome: av.avaliador_nome, media: av.media_notas, respostas, created_at: av.created_at } : null
            });
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    // Salva o checklist (rascunho a cada toque; conclui quando todos os itens estão marcados)
    app.put('/api/app/lideranca/candidatos/:id/checklist', guard, async (req, res) => {
        try {
            const c = await dbGet('SELECT id, tipo FROM candidatos_teste WHERE id = ?', [req.params.id]);
            if (!c) return res.status(404).json({ error: 'Candidato não encontrado.' });
            const ja = await dbGet(`SELECT id FROM candidatos_teste_avaliacoes WHERE candidato_id = ? AND dia = '1'`, [c.id]);
            if (ja) return res.status(409).json({ error: 'A avaliação do 1º dia já foi enviada; o checklist não pode mais ser alterado.' });

            const itensDef = itensDoTipo(c.tipo);
            const body = req.body || {};
            const entrada = body.itens && typeof body.itens === 'object' ? body.itens : {};
            const limpo = {};
            itensDef.forEach(i => {
                const v = entrada[i.id] || entrada[String(i.id)];
                if (v && v.ok) limpo[i.id] = { ok: true, obs: String(v.obs || '').slice(0, 500), em: v.em || new Date().toISOString() };
                else if (v && v.nao) limpo[i.id] = { ok: false, nao: true, obs: String(v.obs || '').slice(0, 500), em: v.em || new Date().toISOString() };
                else if (v && v.obs) limpo[i.id] = { ok: false, obs: String(v.obs).slice(0, 500) };
            });
            let cnh = String(body.cnh_categoria || '').trim().toUpperCase();
            if (!['B', 'D'].includes(cnh)) cnh = null;
            cnh = cnhDoTipo(c.tipo) || cnh;
            // Conclui quando TODOS os itens foram avaliados: feito (✓) ou não feito (✕)
            const todos = itensDef.every(i => limpo[i.id] && (limpo[i.id].ok || limpo[i.id].nao));
            const exigeCnh = isTipoMotorista(c.tipo);
            const concluir = todos && (!exigeCnh || !!cnh);

            const existe = await dbGet(`SELECT id, concluido_em FROM candidatos_checklist_lider WHERE candidato_id = ? AND dia = '1'`, [c.id]);
            const lider = await nomeUsuario(req);
            if (!existe) {
                await dbRun(`INSERT INTO candidatos_checklist_lider (candidato_id, dia, tipo, itens_json, cnh_categoria, lider_id, lider_nome, concluido_em)
                             VALUES (?, '1', ?, ?, ?, ?, ?, ${concluir ? 'CURRENT_TIMESTAMP' : 'NULL'})`,
                    [c.id, isTipoMotorista(c.tipo) ? 'motorista' : 'ajudante', JSON.stringify(limpo), cnh, req.user.id || null, lider]);
            } else {
                await dbRun(`UPDATE candidatos_checklist_lider
                             SET itens_json = ?, cnh_categoria = ?, lider_id = ?, lider_nome = ?, atualizado_em = CURRENT_TIMESTAMP,
                                 concluido_em = ${concluir ? 'COALESCE(concluido_em, CURRENT_TIMESTAMP)' : 'NULL'}
                             WHERE id = ?`,
                    [JSON.stringify(limpo), cnh, req.user.id || null, lider, existe.id]);
            }
            if (cnh && exigeCnh) await dbRun('UPDATE candidatos_teste SET cnh_categoria = ? WHERE id = ?', [cnh, c.id]);
            const feitos = itensDef.filter(i => limpo[i.id] && (limpo[i.id].ok || limpo[i.id].nao)).length;
            res.json({ success: true, feitos, total: itensDef.length, concluido: concluir });
        } catch (e) {
            console.error('[APP-LIDERANCA] PUT checklist:', e);
            res.status(500).json({ error: e.message });
        }
    });

    // Enviar as respostas do 1º dia (notas 1–5 + áudio obrigatório)
    app.post('/api/app/lideranca/candidatos/:id/avaliacao', authenticateToken, requireApp, uploadMem.single('audio'), async (req, res) => {
        try {
            const c = await dbGet('SELECT id, nome, tipo FROM candidatos_teste WHERE id = ?', [req.params.id]);
            if (!c) return res.status(404).json({ error: 'Candidato não encontrado.' });
            const ckRow = await dbGet(`SELECT concluido_em FROM candidatos_checklist_lider WHERE candidato_id = ? AND dia = '1'`, [c.id]);
            if (!ckRow || !ckRow.concluido_em) return res.status(409).json({ error: 'Conclua o checklist antes de responder as perguntas.' });
            const ja = await dbGet(`SELECT id FROM candidatos_teste_avaliacoes WHERE candidato_id = ? AND dia = '1'`, [c.id]);
            if (ja) return res.status(409).json({ error: 'A avaliação do 1º dia já foi respondida.' });
            if (!req.file || !req.file.buffer || !req.file.buffer.length) return res.status(400).json({ error: 'O áudio é obrigatório para enviar a avaliação.' });

            let respostas = {};
            try { respostas = JSON.parse((req.body && req.body.respostas) || '{}'); } catch (e) { /* inválido */ }
            const perguntas = perguntasDoTipo(c.tipo);
            const resp = {};
            for (let i = 0; i < perguntas.length; i++) {
                const v = parseInt(respostas[i], 10);
                if (!(v >= 1 && v <= 5)) return res.status(400).json({ error: `Responda todas as ${perguntas.length} perguntas (nota de 1 a 5).` });
                resp[i] = v;
            }
            const notas = Object.values(resp);
            const media = notas.reduce((a, b) => a + b, 0) / notas.length;

            let audioUrl = null, audioKey = null;
            if (r2 && typeof r2.isReady === 'function' && r2.isReady()) {
                try {
                    const mimeAudio = req.file.mimetype || 'audio/webm';
                    const extAudio = /mp4|m4a|aac/i.test(mimeAudio) ? 'm4a' : (/ogg/i.test(mimeAudio) ? 'ogg' : 'webm');
                    audioKey = `candidatos-avaliacoes/${c.id}/1-${Date.now()}.${extAudio}`;
                    audioUrl = await r2.uploadToR2(audioKey, req.file.buffer, mimeAudio);
                } catch (e2) { console.error('[APP-LIDERANCA] Erro ao enviar áudio ao R2:', e2.message); audioKey = null; audioUrl = null; }
            } else {
                console.warn('[R2] Storage não configurado — áudio da avaliação não foi guardado.');
            }

            const avaliador = await nomeUsuario(req);
            await dbRun(`INSERT INTO candidatos_teste_avaliacoes (candidato_id, dia, avaliador_nome, respostas_json, media_notas, audio_url, audio_key)
                         VALUES (?, '1', ?, ?, ?, ?, ?)`,
                [c.id, avaliador, JSON.stringify(resp), media, audioUrl, audioKey]);

            // Notifica o RH exatamente como a avaliação pública faz
            try {
                if (typeof app.locals.notificarTestesCandidatos === 'function') {
                    app.locals.notificarTestesCandidatos(`Avaliação recebida para o candidato ${c.nome}`, {
                        isAvaliacao: true, nome: c.nome, tipoCandidato: c.tipo, diaAvaliado: '1',
                        dataRealizada: new Date().toLocaleDateString('pt-BR', { timeZone: TZ })
                    });
                }
            } catch (eN) { console.error('[APP-LIDERANCA] Falha ao notificar RH:', eN.message); }
            res.json({ success: true, media });
        } catch (e) {
            console.error('[APP-LIDERANCA] POST avaliacao:', e);
            res.status(500).json({ error: e.message });
        }
    });

    // RH: checklist do líder de um candidato (usado no detalhe da tela de candidatos do RH)
    app.get('/api/app/lideranca/candidatos/:id/checklist-rh', authenticateToken, async (req, res) => {
        try {
            const c = await dbGet('SELECT id, tipo FROM candidatos_teste WHERE id = ?', [req.params.id]);
            if (!c) return res.status(404).json({ error: 'Candidato não encontrado.' });
            const row = await dbGet(`SELECT * FROM candidatos_checklist_lider WHERE candidato_id = ? AND dia = '1'`, [c.id]);
            if (!row) return res.json({ existe: false });
            const ck = resumoChecklist(c.tipo, row);
            res.json({
                existe: true, concluido: ck.concluido, feitos: ck.feitos, nao_feitos: ck.nao_feitos, total: ck.total, lider_nome: row.lider_nome,
                concluido_em: row.concluido_em, cnh_categoria: row.cnh_categoria,
                itens: itensDoTipo(c.tipo).map(i => ({ texto: i.texto, ok: !!(ck.itens[i.id] && ck.itens[i.id].ok), nao: !!(ck.itens[i.id] && ck.itens[i.id].nao && !ck.itens[i.id].ok), obs: (ck.itens[i.id] && ck.itens[i.id].obs) || '' }))
            });
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    // ── Configuração dos líderes (turno do dia) — Diretoria/Administrador ──────
    app.get('/api/app/lideranca/config', authenticateToken, requireTopAdmin, async (req, res) => {
        try {
            await sincronizarLideres();
            const lideres = await dbAll(`SELECT cfg.colaborador_id, cfg.usuario_id, cfg.plantao_dia, c.nome_completo, c.status, c.departamento
                                         FROM app_lider_config cfg JOIN colaboradores c ON c.id = cfg.colaborador_id
                                         ORDER BY c.nome_completo`);
            const usuarios = await dbAll(`SELECT id, username, nome FROM usuarios WHERE COALESCE(ativo,1) = 1 ORDER BY COALESCE(NULLIF(nome,''), username)`);
            res.json({ lideres: lideres.filter(l => normTxt(l.status) !== 'desligado'), usuarios: usuarios.map(u => ({ id: u.id, nome: u.nome || u.username })) });
        } catch (e) { res.status(500).json({ error: e.message }); }
    });
    app.put('/api/app/lideranca/config/:colabId', authenticateToken, requireTopAdmin, async (req, res) => {
        try {
            const b = req.body || {};
            const colabId = parseInt(req.params.colabId, 10);
            await dbRun('INSERT OR IGNORE INTO app_lider_config (colaborador_id) VALUES (?)', [colabId]);
            if (b.plantao_dia !== undefined) await dbRun('UPDATE app_lider_config SET plantao_dia = ?, atualizado_em = CURRENT_TIMESTAMP WHERE colaborador_id = ?', [b.plantao_dia ? 1 : 0, colabId]);
            if (b.usuario_id !== undefined) await dbRun('UPDATE app_lider_config SET usuario_id = ?, atualizado_em = CURRENT_TIMESTAMP WHERE colaborador_id = ?', [b.usuario_id ? parseInt(b.usuario_id, 10) : null, colabId]);
            res.json({ success: true });
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    // ═══ PUSH (PWA) ═════════════════════════════════════════════════════════════
    let webpush = null;
    try { webpush = require('web-push'); } catch (e) { console.warn('[APP-LIDERANCA] web-push não instalado — avisos no celular desativados.'); }
    let _vapidPronto = null;

    async function getConfigVal(chave) {
        const r = await dbGet('SELECT valor FROM configuracoes_sistema WHERE chave = ?', [chave]);
        return r && r.valor ? String(r.valor) : null;
    }
    async function setConfigVal(chave, valor) {
        await dbRun('INSERT INTO configuracoes_sistema (chave, valor) VALUES (?, ?) ON CONFLICT(chave) DO UPDATE SET valor = excluded.valor', [chave, String(valor)]);
    }
    async function garantirVapid() {
        if (!webpush) return null;
        if (_vapidPronto) return _vapidPronto;
        let pub = process.env.VAPID_PUBLIC_KEY || await getConfigVal('push_vapid_public');
        let priv = process.env.VAPID_PRIVATE_KEY || await getConfigVal('push_vapid_private');
        if (!pub || !priv) {
            const k = webpush.generateVAPIDKeys();
            pub = k.publicKey; priv = k.privateKey;
            await setConfigVal('push_vapid_public', pub);
            await setConfigVal('push_vapid_private', priv);
        }
        webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:contas@americarental.com.br', pub, priv);
        _vapidPronto = { pub, priv };
        return _vapidPronto;
    }

    async function enviarPushUsuario(usuarioId, payload) {
        if (!webpush) return { enviados: 0, removidos: 0 };
        await garantirVapid();
        const subs = await dbAll('SELECT id, endpoint, p256dh, auth FROM push_subscriptions WHERE usuario_id = ?', [usuarioId]);
        let enviados = 0, removidos = 0;
        for (const s of subs) {
            try {
                await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(payload));
                enviados++;
            } catch (e) {
                if (e && (e.statusCode === 404 || e.statusCode === 410)) { await dbRun('DELETE FROM push_subscriptions WHERE id = ?', [s.id]); removidos++; }
                else console.error('[APP-LIDERANCA] Falha no push:', e && e.message);
            }
        }
        return { enviados, removidos };
    }

    app.get('/api/app/push/key', authenticateToken, async (req, res) => {
        try {
            if (!webpush) return res.status(503).json({ error: 'Avisos no celular indisponíveis no servidor.' });
            const v = await garantirVapid();
            res.json({ publicKey: v.pub });
        } catch (e) { res.status(500).json({ error: e.message }); }
    });
    app.post('/api/app/push/subscribe', authenticateToken, async (req, res) => {
        try {
            const s = req.body && req.body.subscription;
            if (!s || !s.endpoint || !s.keys) return res.status(400).json({ error: 'Assinatura inválida.' });
            await dbRun(`INSERT INTO push_subscriptions (usuario_id, endpoint, p256dh, auth, user_agent) VALUES (?, ?, ?, ?, ?)
                         ON CONFLICT(endpoint) DO UPDATE SET usuario_id = excluded.usuario_id, p256dh = excluded.p256dh, auth = excluded.auth, user_agent = excluded.user_agent`,
                [req.user.id, s.endpoint, s.keys.p256dh, s.keys.auth, String(req.headers['user-agent'] || '').slice(0, 250)]);
            res.json({ success: true });
        } catch (e) { res.status(500).json({ error: e.message }); }
    });
    app.post('/api/app/push/unsubscribe', authenticateToken, async (req, res) => {
        try {
            const ep = req.body && req.body.endpoint;
            if (ep) await dbRun('DELETE FROM push_subscriptions WHERE endpoint = ? AND usuario_id = ?', [ep, req.user.id]);
            res.json({ success: true });
        } catch (e) { res.status(500).json({ error: e.message }); }
    });
    app.get('/api/app/push/status', authenticateToken, async (req, res) => {
        try {
            const r = await dbGet('SELECT COUNT(*) AS n FROM push_subscriptions WHERE usuario_id = ?', [req.user.id]);
            res.json({ ativo: !!(r && r.n), disponivel: !!webpush });
        } catch (e) { res.status(500).json({ error: e.message }); }
    });
    app.post('/api/app/push/teste', authenticateToken, async (req, res) => {
        try {
            const r = await enviarPushUsuario(req.user.id, { title: 'Aviso de teste ✅', body: 'As notificações do APP Liderança estão funcionando neste aparelho.', url: PUSH_URL, tag: 'teste' });
            if (!r.enviados) return res.status(404).json({ error: 'Nenhum aparelho com avisos ativos para este usuário.' });
            res.json({ success: true, ...r });
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    // Aviso diário às 07h (horário de Brasília): só para o líder de plantão (turno do dia + escala)
    async function avisarTestesDoDia() {
        try {
            const hoje = hojeSP();
            const cands = await dbAll(`SELECT ct.id, ct.nome, ct.tipo FROM candidatos_teste ct
                                       WHERE COALESCE(ct.status, '') != 'ARQUIVADO'
                                         AND SUBSTR(COALESCE(NULLIF(TRIM(ct.data_teste_1), ''), NULLIF(TRIM(ct.data_teste), '')), 1, 10) = ?
                                         AND NOT EXISTS (SELECT 1 FROM candidatos_teste_avaliacoes a WHERE a.candidato_id = ct.id AND a.dia = '1')`, [hoje]);
            if (!cands.length) return;
            const plantao = (await plantonistasDoDia(hoje)).filter(p => p.usuario_id);
            const nomes = cands.map(c => `${c.nome} (${isTipoMotorista(c.tipo) ? 'Motorista' : 'Ajudante'})`);
            const body = cands.length === 1 ? `Hoje tem teste: ${nomes[0]}.` : `Hoje tem ${cands.length} testes: ${nomes.join(', ')}.`;
            for (const p of plantao) {
                await enviarPushUsuario(p.usuario_id, { title: '🧪 Teste de candidato hoje', body, url: PUSH_URL, tag: 'testes-' + hoje });
            }
            console.log(`[APP-LIDERANCA] Aviso das 07h enviado para ${plantao.length} líder(es); ${cands.length} candidato(s).`);
        } catch (e) { console.error('[APP-LIDERANCA] Erro no aviso diário:', e.message); }
    }
    try {
        const cron = require('node-cron');
        cron.schedule('0 7 * * *', avisarTestesDoDia, { timezone: TZ });
    } catch (e) { console.warn('[APP-LIDERANCA] node-cron indisponível — aviso das 07h desativado:', e.message); }

    console.log('[APP-LIDERANCA] Rotas registradas com sucesso.');
};
