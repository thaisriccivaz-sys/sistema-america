/* ══════════════════════════════════════════════════════════════════════
   LINK PÚBLICO DA PROPOSTA  —  /proposta/:codigo/:token
   Segurança:
     • Token aleatório de 192 bits (crypto.randomBytes) — impossível de adivinhar.
       O número/código da proposta sozinho NÃO dá acesso (precisa do token).
     • Comparação do token em tempo constante (timingSafeEqual).
     • Resposta genérica (404) para token inválido, revogado ou expirado: não revela
       se a proposta existe.
     • Expira na "Validade da Proposta" (regra por tipo) e pode ser revogado a qualquer momento.
     • Rate limit por IP (mais restrito para tentativas que falham).
     • Somente leitura. Devolve apenas o que aparece no Quadro de Valores (sem dados internos:
       atendente, comissão, margem, fase de negociação etc.).
     • Cabeçalhos noindex / no-store / no-referrer.
     • Sem sessão e sem acesso a nenhuma outra rota da API do sistema.
   Dados sempre atualizados: a página consulta a proposta a cada abertura.
   ══════════════════════════════════════════════════════════════════════ */
const crypto = require('crypto');
const path = require('path');
const rateLimit = require('express-rate-limit');

module.exports = function registrarPropostaPublica(app, db, authenticateToken, sendMailHelper) {
    const dbGet = (sql, p) => new Promise((ok, ko) => db.get(sql, p || [], (e, r) => e ? ko(e) : ok(r)));
    const dbAll = (sql, p) => new Promise((ok, ko) => db.all(sql, p || [], (e, r) => e ? ko(e) : ok(r || [])));
    const dbRun = (sql, p) => new Promise((ok, ko) => db.run(sql, p || [], function (e) { e ? ko(e) : ok(this); }));

    const TOKEN_RE = /^[A-Za-z0-9_-]{32}$/;
    const CODIGO_RE = /^[A-Za-z0-9._-]{1,40}$/;
    const baseLink = () => String(process.env.PUBLIC_LINK_BASE || 'https://fluxoar.com.br').replace(/\/+$/, '');

    const norm = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
    const tipoLimpo = (t) => String(t || '').trim().toUpperCase().replace(/^PROPOSTA\s+/i, '');
    const tipoNorm = (t) => norm(tipoLimpo(t)).toUpperCase();
    const tipoEhEventoLike = (t) => ['EVENTO', 'LOCACAO CONTAINER', 'EQUIPAMENTOS'].includes(tipoNorm(t));
    const hojeBr = () => new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const isoData = (v) => { const s = String(v || '').trim().slice(0, 10); return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : ''; };
    const fmtDataIso = (d) => { const s = isoData(d); return s ? s.split('-').reverse().join('/') : String(d || '').trim(); };

    // ── Migrations (somente colunas novas e opcionais) ───────────────────────────
    [
        'token_publico TEXT',
        'token_publico_criado_em TEXT',
        'token_publico_revogado INTEGER DEFAULT 0',
        'visualizacoes_publicas INTEGER DEFAULT 0',
        'ultima_visualizacao_publica TEXT',
        'aceite_publico_em TEXT',
        'proposta_comparativa INTEGER DEFAULT 0',
        'produtos_aprovados TEXT'
    ].forEach(col => {
        db.run(`ALTER TABLE propostas ADD COLUMN ${col}`, (err) => {
            if (err && !String(err.message).includes('duplicate column name')) {
                console.log('[PROPOSTA-PUBLICA] Alerta migration:', err.message);
            }
        });
    });
    db.run('ALTER TABLE auditoria ADD COLUMN snapshot_json TEXT', (err) => {
        if (err && !String(err.message).includes('duplicate column name')) {
            console.log('[PROPOSTA-PUBLICA] Alerta migration auditoria:', err.message);
        }
    });
    db.run('CREATE INDEX IF NOT EXISTS idx_propostas_codigo_publico ON propostas(codigo)', () => {});

    // ── Expiração: último dia em que o link funciona ─────────────────────────────
    function ultimoDiaValido(p) {
        const val = isoData(p.validade_proposta);
        if (val) return val;
        if (tipoEhEventoLike(p.tipo)) {
            const ini = isoData(p.periodo_inicio);
            if (ini) return ini;
        }
        const base = isoData(p.data_cadastro) || isoData(p.criado_em);
        if (!base) return '';
        const d = new Date(base + 'T12:00:00Z');
        d.setUTCDate(d.getUTCDate() + 30);
        return d.toISOString().slice(0, 10);
    }

    function propostaInativa(p) {
        const st = norm(p.status);
        return st.includes('cancel') || st.includes('inativ') || st.includes('exclu');
    }

    function statusLink(p) {
        if (!p.token_publico) return { ativo: false, motivo: 'sem_link' };
        if (Number(p.token_publico_revogado) === 1) return { ativo: false, motivo: 'revogado' };
        if (propostaInativa(p)) return { ativo: false, motivo: 'proposta_inativa' };
        const ate = ultimoDiaValido(p);
        if (ate && hojeBr() > ate) return { ativo: false, motivo: 'expirado', expira_em: ate };
        return { ativo: true, expira_em: ate };
    }

    function tokenConfere(recebido, guardado) {
        if (!TOKEN_RE.test(String(recebido || '')) || !guardado) return false;
        const a = Buffer.from(String(recebido));
        const b = Buffer.from(String(guardado));
        return a.length === b.length && crypto.timingSafeEqual(a, b);
    }

    const novoToken = () => crypto.randomBytes(24).toString('base64url'); // 32 caracteres

    async function resolverNomeColabAudit(req) {
        const rawUser = String((req.body && req.body.usuario) || (req.user && (req.user.nome || req.user.username)) || 'Sistema').trim();
        try {
            const colab = await dbGet(
                "SELECT nome_completo FROM colaboradores WHERE LOWER(TRIM(nome_completo)) = LOWER(TRIM(?)) OR LOWER(REPLACE(TRIM(nome_completo), ' ', '.')) = LOWER(TRIM(?)) LIMIT 1",
                [rawUser, rawUser]
            );
            return (colab && colab.nome_completo) || rawUser;
        } catch (_) {
            return rawUser;
        }
    }

    // ── Rotas autenticadas (usuário do sistema) ──────────────────────────────────
    // POST /api/propostas/:id/link-publico  { renovar?: boolean }
    app.post('/api/propostas/:id/link-publico', authenticateToken, async (req, res) => {
        try {
            const p = await dbGet('SELECT * FROM propostas WHERE id = ?', [req.params.id]);
            if (!p) return res.status(404).json({ error: 'Proposta não encontrada. Salve a proposta antes de copiar o link.' });
            if (!p.codigo || !CODIGO_RE.test(p.codigo)) return res.status(400).json({ error: 'Proposta sem código válido.' });
            let token = p.token_publico;
            const tokenAntigo = p.token_publico || '';
            const estavaRevogado = Boolean(tokenAntigo && Number(p.token_publico_revogado) === 1);
            const renovar = !!(req.body && req.body.renovar);
            let gerouNovoLink = false;
            const agora = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString().replace('T', ' ').substring(0, 19);
            if (!token || Number(p.token_publico_revogado) === 1 || renovar) {
                token = novoToken();
                gerouNovoLink = true;
                await dbRun('UPDATE propostas SET token_publico = ?, token_publico_criado_em = ?, token_publico_revogado = 0 WHERE id = ?', [token, agora, p.id]);
                p.token_publico = token;
                p.token_publico_revogado = 0;
            }
            const urlLink = `${baseLink()}/proposta/${encodeURIComponent(p.codigo)}/${token}`;
            const nomeColab = await resolverNomeColabAudit(req);
            if (gerouNovoLink && estavaRevogado) {
                const urlAntiga = `${baseLink()}/proposta/${encodeURIComponent(p.codigo)}/${tokenAntigo}`;
                await dbRun(
                    `INSERT INTO auditoria (usuario, programa, campo, conteudo_anterior, conteudo_atual, registro_id)
                     VALUES (?, 'Proposta', 'Novo Link da Proposta', ?, ?, ?)`,
                    [nomeColab, `Link anterior desativado (${urlAntiga})`, `Novo link público gerado (${urlLink})`, p.id]
                ).catch(() => {});
            }
            if (!req.body || req.body.registrar_historico !== false) {
                const faseAtualNorm = String(p.fase_negociacao || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toUpperCase();
                if (faseAtualNorm !== 'APROVADA' && faseAtualNorm !== 'PRE APROVADA' && faseAtualNorm !== 'PROPOSTA ENVIADA') {
                    const faseAnt = String(p.fase_negociacao || 'Em Elaboração');
                    await dbRun("UPDATE propostas SET fase_negociacao = 'Proposta Enviada', atualizado_em = CURRENT_TIMESTAMP WHERE id = ?", [p.id]).catch(() => {});
                    p.fase_negociacao = 'Proposta Enviada';
                    const snapEnv = JSON.stringify(Object.assign({}, p, { fase_negociacao: 'Proposta Enviada', assinatura_r2_key: null, aceite_publico_em: null }));
                    await dbRun(
                        `INSERT INTO auditoria (usuario, programa, campo, conteudo_anterior, conteudo_atual, registro_id, snapshot_json)
                         VALUES (?, 'Proposta', 'Fase de Negociação', ?, 'Proposta Enviada', ?, ?)`,
                        [nomeColab, faseAnt, p.id, snapEnv]
                    ).catch(() => {});
                }
                await dbRun(
                    `INSERT INTO auditoria (usuario, programa, campo, conteudo_anterior, conteudo_atual, registro_id)
                     VALUES (?, 'Proposta', 'Copiar Link', '—', ?, ?)`,
                    [nomeColab, `Link público copiado (${urlLink})`, p.id]
                ).catch(() => {});
            }
            const st = statusLink(p);
            res.set('Cache-Control', 'no-store');
            res.json({
                success: true,
                url: urlLink,
                ativo: st.ativo,
                expira_em: st.expira_em || null,
                motivo: st.motivo || null
            });
        } catch (e) {
            console.error('[PROPOSTA-PUBLICA] Erro ao gerar link:', e.message);
            res.status(500).json({ error: 'Erro ao gerar o link da proposta.' });
        }
    });

    // DELETE /api/propostas/:id/link-publico  → revoga o link atual
    app.delete('/api/propostas/:id/link-publico', authenticateToken, async (req, res) => {
        try {
            const r = await dbRun('UPDATE propostas SET token_publico_revogado = 1 WHERE id = ?', [req.params.id]);
            if (!r.changes) return res.status(404).json({ error: 'Proposta não encontrada.' });
            const nomeColab = await resolverNomeColabAudit(req);
            await dbRun(
                `INSERT INTO auditoria (usuario, programa, campo, conteudo_anterior, conteudo_atual, registro_id)
                 VALUES (?, 'Proposta', 'Desativar Link', 'Link Ativo', 'Link público desativado', ?)`,
                [nomeColab, req.params.id]
            ).catch(() => {});
            res.json({ success: true });
        } catch (e) {
            console.error('[PROPOSTA-PUBLICA] Erro ao revogar link:', e.message);
            res.status(500).json({ error: 'Erro ao revogar o link.' });
        }
    });

    // ── Rotas públicas ───────────────────────────────────────────────────────────
    const ipDe = (req) => String(req.headers['cf-connecting-ip'] || (req.headers['x-forwarded-for'] || '').split(',')[0] || req.ip || '').trim();
    const limiteGeral = rateLimit({
        windowMs: 15 * 60 * 1000, limit: 120, standardHeaders: true, legacyHeaders: false,
        keyGenerator: ipDe, validate: false,
        message: { error: 'Muitas requisições. Tente novamente em alguns minutos.' }
    });
    const limiteFalhas = rateLimit({
        windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false,
        skipSuccessfulRequests: true, keyGenerator: ipDe, validate: false,
        message: { error: 'Muitas tentativas inválidas. Tente novamente em alguns minutos.' }
    });
    const cabecalhosPublicos = (res) => {
        res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
        res.set('Pragma', 'no-cache');
        res.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
        res.set('Referrer-Policy', 'no-referrer');
        res.set('X-Content-Type-Options', 'nosniff');
    };

    // Página (HTML estático, sem dados: os dados vêm do endpoint JSON abaixo)
    app.get('/proposta/:codigo/:token', limiteGeral, (req, res) => {
        cabecalhosPublicos(res);
        res.sendFile(path.join(__dirname, '../frontend/proposta-publica.html'));
    });

    function urlBox(row, variante) {
        const key = variante === 'mobile' ? row.mobile_r2_key : row.r2_key;
        if (!key) return null;
        if (process.env.R2_PUBLIC_URL) return `${process.env.R2_PUBLIC_URL}/${key}`;
        return `/api/comercial/boxes/${row.id}/arquivo?v=${variante === 'mobile' ? 'mobile' : 'desktop'}`;
    }
    const parseJson = (raw) => { try { const v = JSON.parse(raw || '[]'); return Array.isArray(v) ? v : []; } catch (e) { return []; } };
    const parseObjJson = (raw) => {
        if (raw && typeof raw === 'object' && !Array.isArray(raw)) return raw;
        try { const v = JSON.parse(raw || '{}'); return (v && typeof v === 'object' && !Array.isArray(v)) ? v : {}; } catch (e) { return {}; }
    };

    const MODELOS_PADRAO_CODIGOS = [
        'EVENTO', 'OBRA',
        'LIMPA FOSSA', 'LOCAÇÃO CONTAINER',
        'EQUIPAMENTOS', 'VENDA', 'VISITA TÉCNICA', 'AVARIA', 'ADITIVO'
    ];
    function normalizarModeloTipoPublico(raw) {
        const limpo = norm(raw).toUpperCase().replace(/^PROPOSTA\s+/i, '').trim();
        if (!limpo) return 'EVENTO';
        const exato = MODELOS_PADRAO_CODIGOS.find(c => norm(c).toUpperCase() === limpo);
        if (exato) return exato;
        if (limpo.includes('ADITIVO')) return 'ADITIVO';
        if (limpo.includes('OBRA')) return 'OBRA';
        if (limpo.includes('FOSSA')) return 'LIMPA FOSSA';
        if (limpo.includes('CONTAINER')) return 'LOCAÇÃO CONTAINER';
        if (limpo.includes('EQUIPAMENTO')) return 'EQUIPAMENTOS';
        if (limpo.includes('VENDA')) return 'VENDA';
        if (limpo.includes('VISITA')) return 'VISITA TÉCNICA';
        if (limpo.includes('AVARIA')) return 'AVARIA';
        return 'EVENTO';
    }

    function extrairSubtituloLimpaFossaTexto(raw) {
        const s = norm(raw).toUpperCase();
        if (!s || !s.includes('FOSSA')) return '';
        if (s.includes('MENS')) return 'LIMPA FOSSA MENSAL';
        return 'LIMPA FOSSA';
    }

    async function resolverSubtituloLimpaFossaPublico(p) {
        if (!p) return 'LIMPA FOSSA';
        const direto = extrairSubtituloLimpaFossaTexto(p.tipo) || extrairSubtituloLimpaFossaTexto(p.contrato_vinculado_tipo) || extrairSubtituloLimpaFossaTexto(p.tabela_precos);
        if (direto && !norm(p.tipo).toUpperCase().includes('ADITIVO')) return direto;
        const cvId = Number(p.contrato_vinculado_id) || 0;
        if (cvId > 0) {
            const ctRow = await dbGet('SELECT * FROM contratos WHERE id = ?', [cvId]).catch(() => null);
            const subCt = ctRow ? extrairSubtituloLimpaFossaTexto(ctRow.tipo) : '';
            if (subCt) return subCt;
            const propIdRef = (ctRow && ctRow.proposta_id) ? ctRow.proposta_id : cvId;
            const prRow = await dbGet('SELECT tipo, tabela_precos FROM propostas WHERE id = ?', [propIdRef]).catch(() => null);
            const subPr = prRow ? (extrairSubtituloLimpaFossaTexto(prRow.tipo) || extrairSubtituloLimpaFossaTexto(prRow.tabela_precos)) : '';
            if (subPr) return subPr;
        }
        const cvNum = String(p.contrato_vinculado || '').trim();
        if (cvNum) {
            const prNumRow = await dbGet(
                `SELECT tipo, tabela_precos FROM propostas
                 WHERE (UPPER(TRIM(contrato)) = UPPER(TRIM(?)) OR UPPER(TRIM(codigo)) = UPPER(TRIM(?)))
                   AND UPPER(TRIM(COALESCE(tipo, ''))) NOT IN ('ADITIVO', 'PROPOSTA ADITIVO')
                 ORDER BY id DESC LIMIT 1`,
                [cvNum, cvNum]
            ).catch(() => null);
            const subPr2 = prNumRow ? (extrairSubtituloLimpaFossaTexto(prNumRow.tipo) || extrairSubtituloLimpaFossaTexto(prNumRow.tabela_precos)) : '';
            if (subPr2) return subPr2;
        }
        return direto || 'LIMPA FOSSA';
    }

    function extrairSubtituloObraTexto(raw) {
        const s = norm(raw).toUpperCase();
        if (!s) return '';
        if (s.includes('QUINZ')) return 'OBRA QUINZENAL';
        if (s.includes('SEMAN')) return 'OBRA SEMANAL';
        if (s.includes('MENS') || s.includes('OBRA')) return 'OBRA MENSAL';
        return '';
    }

    async function resolverSubtituloObraPublico(p) {
        if (!p) return 'OBRA MENSAL';
        const direto = extrairSubtituloObraTexto(p.tipo) || extrairSubtituloObraTexto(p.contrato_vinculado_tipo) || extrairSubtituloObraTexto(p.tabela_precos);
        if (direto && !norm(p.tipo).toUpperCase().includes('ADITIVO')) return direto;
        const cvId = Number(p.contrato_vinculado_id) || 0;
        if (cvId > 0) {
            const ctRow = await dbGet('SELECT * FROM contratos WHERE id = ?', [cvId]).catch(() => null);
            const subCt = ctRow ? extrairSubtituloObraTexto(ctRow.tipo) : '';
            if (subCt) return subCt;
            const propIdRef = (ctRow && ctRow.proposta_id) ? ctRow.proposta_id : cvId;
            const prRow = await dbGet('SELECT tipo, tabela_precos FROM propostas WHERE id = ?', [propIdRef]).catch(() => null);
            const subPr = prRow ? (extrairSubtituloObraTexto(prRow.tipo) || extrairSubtituloObraTexto(prRow.tabela_precos)) : '';
            if (subPr) return subPr;
        }
        const cvNum = String(p.contrato_vinculado || '').trim();
        if (cvNum) {
            const prNumRow = await dbGet(
                `SELECT tipo, tabela_precos FROM propostas
                 WHERE (UPPER(TRIM(contrato)) = UPPER(TRIM(?)) OR UPPER(TRIM(codigo)) = UPPER(TRIM(?)))
                   AND UPPER(TRIM(COALESCE(tipo, ''))) NOT IN ('ADITIVO', 'PROPOSTA ADITIVO')
                 ORDER BY id DESC LIMIT 1`,
                [cvNum, cvNum]
            ).catch(() => null);
            const subPr2 = prNumRow ? (extrairSubtituloObraTexto(prNumRow.tipo) || extrairSubtituloObraTexto(prNumRow.tabela_precos)) : '';
            if (subPr2) return subPr2;
        }
        return direto || 'OBRA MENSAL';
    }

    async function resolverModeloOriginarioAditivoPublico(p) {
        if (!p) return 'EVENTO';
        if (p.contrato_vinculado_tipo) {
            const tExplicito = normalizarModeloTipoPublico(p.contrato_vinculado_tipo);
            if (tExplicito && tExplicito !== 'ADITIVO') return tExplicito;
        }
        const cvId = Number(p.contrato_vinculado_id) || 0;
        if (cvId > 0) {
            const ctRow = await dbGet('SELECT * FROM contratos WHERE id = ?', [cvId]).catch(() => null);
            if (ctRow && ctRow.tipo && normalizarModeloTipoPublico(ctRow.tipo) !== 'ADITIVO') {
                return normalizarModeloTipoPublico(ctRow.tipo);
            }
            const propIdRef = (ctRow && ctRow.proposta_id) ? ctRow.proposta_id : cvId;
            const prRow = await dbGet('SELECT tipo, tabela_precos FROM propostas WHERE id = ?', [propIdRef]).catch(() => null);
            if (prRow) {
                const tPr = normalizarModeloTipoPublico(prRow.tipo || prRow.tabela_precos);
                if (tPr && tPr !== 'ADITIVO') return tPr;
            }
        }
        const cvNum = String(p.contrato_vinculado || '').trim();
        if (cvNum) {
            const ctNumRow = await dbGet('SELECT * FROM contratos WHERE UPPER(TRIM(numero_contrato)) = UPPER(TRIM(?))', [cvNum]).catch(() => null);
            if (ctNumRow && ctNumRow.tipo && normalizarModeloTipoPublico(ctNumRow.tipo) !== 'ADITIVO') {
                return normalizarModeloTipoPublico(ctNumRow.tipo);
            }
            const prNumRow = await dbGet(
                `SELECT tipo, tabela_precos FROM propostas
                 WHERE (UPPER(TRIM(contrato)) = UPPER(TRIM(?)) OR UPPER(TRIM(codigo)) = UPPER(TRIM(?)))
                   AND UPPER(TRIM(COALESCE(tipo, ''))) NOT IN ('ADITIVO', 'PROPOSTA ADITIVO')
                 ORDER BY id DESC LIMIT 1`,
                [cvNum, cvNum]
            ).catch(() => null);
            if (prNumRow) {
                const tPr2 = normalizarModeloTipoPublico(prNumRow.tipo || prNumRow.tabela_precos);
                if (tPr2 && tPr2 !== 'ADITIVO') return tPr2;
            }
        }
        if (p.tabela_precos) {
            const tTab = normalizarModeloTipoPublico(p.tabela_precos);
            if (tTab && tTab !== 'ADITIVO') return tTab;
        }
        return 'EVENTO';
    }

    function mapearRowBoxPublico(r, modeloForcado) {
        return {
            id: r.id,
            nome: r.nome,
            tipo: r.tipo,
            modelo_tipo: normalizarModeloTipoPublico(modeloForcado || r.modelo_tipo || 'EVENTO'),
            config_quadro: parseObjJson(r.config_quadro),
            url: urlBox(r, 'desktop'),
            mobile_url: urlBox(r, 'mobile'),
            mobile_tipo: r.mobile_tipo || null,
            mobile_modo: r.mobile_modo || 'mesma',
            mobile_proporcao: r.mobile_proporcao || '4:5',
            foco_x: r.foco_x, foco_y: r.foco_y,
            hotspots_desktop: parseJson(r.hotspots_desktop),
            hotspots_mobile: parseJson(r.hotspots_mobile)
        };
    }

    async function propostaTemProdutoParceirosPublico(p, equipPreloaded) {
        if (!p) return false;
        let itensArr = [];
        try {
            itensArr = Array.isArray(p.itens) ? p.itens : JSON.parse(p.itens || '[]');
        } catch (_) { itensArr = []; }
        if (!Array.isArray(itensArr) || itensArr.length === 0) return false;
        const eqList = Array.isArray(equipPreloaded)
            ? equipPreloaded
            : await dbAll('SELECT codigo, nome, fonte_fornecimento FROM estoque_equipamentos').catch(() => []);
        return itensArr.some(it => {
            if (!it) return false;
            const fDireta = norm(it.fonte_fornecimento || it.grupo_fornecimento || '');
            if (fDireta.includes('parceiro')) return true;
            const cod = norm(it.codigo);
            const nm = norm(String(it.produto || it.descricao || it.nome || '').replace(/^\d+\s*-\s*/, ''));
            const eq = eqList.find(e => (cod && cod !== '—' && norm(e.codigo) === cod) || (nm && norm(e.nome) === nm));
            return Boolean(eq && norm(eq.fonte_fornecimento).includes('parceiro'));
        });
    }

    async function listarBoxesPublicos(p) {
        const tipoPropNorm = normalizarModeloTipoPublico(p && p.tipo);
        const ehAditivo = tipoPropNorm === 'ADITIVO';
        const temParceiros = await propostaTemProdutoParceirosPublico(p);
        const modeloBase = temParceiros
            ? 'EQUIPAMENTOS'
            : (ehAditivo ? await resolverModeloOriginarioAditivoPublico(p) : tipoPropNorm);

        let rowsBase = await dbAll(
            'SELECT * FROM comercial_boxes WHERE ativo = 1 AND modelo_tipo = ? ORDER BY ordem ASC, id ASC',
            [modeloBase]
        );
        if (!rowsBase.length) {
            rowsBase = await dbAll(
                "SELECT * FROM comercial_boxes WHERE ativo = 1 AND (modelo_tipo = 'EVENTO' OR modelo_tipo IS NULL OR TRIM(modelo_tipo) = '') ORDER BY ordem ASC, id ASC"
            );
        }
        const lista = rowsBase.map(r => mapearRowBoxPublico(r, modeloBase));
        if (!lista.some(b => b.tipo === 'quadro_evento')) {
            lista.push({
                id: 0,
                nome: 'Quadro de Valores',
                tipo: 'quadro_evento',
                modelo_tipo: modeloBase,
                config_quadro: { modelo_tipo: modeloBase, titulo_topo: modeloBase },
                mobile_modo: 'mesma',
                hotspots_desktop: [],
                hotspots_mobile: []
            });
        }

        if (ehAditivo) {
            const modelosPropAll = await dbAll('SELECT * FROM comercial_modelos_proposta ORDER BY ordem ASC, id ASC').catch(() => []);
            const acharModAdt = (codAlvo) => {
                const cNorm = norm(codAlvo).replace(/^proposta\s+/i, '').trim();
                return modelosPropAll.find(m => {
                    const mCod = norm(m.codigo_tipo).replace(/^proposta\s+/i, '').trim();
                    const mNom = norm(m.nome).replace(/^proposta\s+/i, '').trim();
                    if (mCod === cNorm || mNom === cNorm) return true;
                    if (cNorm.startsWith('obra') && (mCod === 'obra' || mCod.startsWith('obra'))) return true;
                    if (cNorm.includes('fossa') && (mCod === 'limpa fossa' || mCod.includes('fossa'))) return true;
                    return false;
                }) || null;
            };
            const modRefAdt = acharModAdt(modeloBase) || acharModAdt('ADITIVO') || null;
            const boxesAditivo = [];
            if (modRefAdt && (modRefAdt.aditivo_r2_key || modRefAdt.aditivo_mobile_r2_key)) {
                const pubBase = process.env.R2_PUBLIC_URL ? String(process.env.R2_PUBLIC_URL).replace(/\/+$/, '') : '';
                const deskKey = modRefAdt.aditivo_r2_key || modRefAdt.aditivo_mobile_r2_key;
                const mobKey = modRefAdt.aditivo_mobile_r2_key || modRefAdt.aditivo_r2_key;
                const urlDesk = pubBase ? `${pubBase}/${deskKey}` : `/api/public/modelos-proposta/${modRefAdt.id}/aditivo-arquivo?v=desktop`;
                const urlMob = pubBase ? `${pubBase}/${mobKey}` : `/api/public/modelos-proposta/${modRefAdt.id}/aditivo-arquivo?v=mobile`;
                boxesAditivo.push({
                    id: 900000 + Number(modRefAdt.id || 1),
                    nome: `Aditivo - ${modRefAdt.nome || modeloBase}`,
                    tipo: 'imagem',
                    modelo_tipo: 'ADITIVO',
                    origem_aditivo: true,
                    config_quadro: {},
                    url: urlDesk,
                    mobile_url: urlMob,
                    mobile_tipo: 'imagem',
                    mobile_modo: modRefAdt.aditivo_mobile_r2_key ? 'separada' : 'mesma',
                    mobile_proporcao: 'auto',
                    foco_x: 50, foco_y: 50,
                    hotspots_desktop: [],
                    hotspots_mobile: []
                });
            } else {
                const rowsAditivo = await dbAll(
                    "SELECT * FROM comercial_boxes WHERE ativo = 1 AND modelo_tipo = 'ADITIVO' AND tipo != 'quadro_evento' ORDER BY ordem ASC, id ASC"
                );
                rowsAditivo.forEach(r => boxesAditivo.push(Object.assign(mapearRowBoxPublico(r, 'ADITIVO'), { origem_aditivo: true })));
            }
            if (boxesAditivo.length > 0) {
                const idxQuadro = lista.findIndex(b => b.tipo === 'quadro_evento');
                const posInserir = idxQuadro >= 0 ? idxQuadro + 1 : lista.length;
                lista.splice(posInserir, 0, ...boxesAditivo);
            }
        }
        return lista;
    }

    const lerJson = (raw) => {
        if (Array.isArray(raw)) return raw;
        try { const v = JSON.parse(raw || '[]'); return Array.isArray(v) ? v : []; } catch (e) { return []; }
    };

    // Equivalente ao montarDadosQuadroEventoProposta do frontend, mas no servidor e só com o que é exibido.
    async function montarDadosQuadro(p) {
        const cliNomeLimpo = String(p.cliente_nome || '').replace(/^[\u2600-\u27BF\uD83C-\uDBFF\uDC00-\uDFFF]+\s*/, '').trim();
        const cliNorm = norm(cliNomeLimpo);
        let cliente = null;
        if (cliNorm) {
            const clientes = await dbAll('SELECT * FROM clientes');
            cliente = clientes.find(c => norm(c.nome_razao_social) === cliNorm || norm(c.nome_fantasia) === cliNorm) || null;
        }

        const contatoNome = String(p.contato_nome || '').trim();
        let celular = '';
        if (contatoNome) {
            const cn = norm(contatoNome);
            const contatos = cliente
                ? await dbAll('SELECT * FROM contatos WHERE cliente_id = ?', [cliente.id])
                : await dbAll('SELECT * FROM contatos');
            const ct = contatos.find(c => norm(c.nome || c.nome_contato) === cn);
            if (ct) celular = String(ct.celular || ct.telefone || ct.whatsapp || '').trim();
        }
        if (!celular && cliente) celular = String(cliente.celular || cliente.telefone || '').trim();

        // Endereço de instalação em 2 linhas: Linha 1 = Nome do Local, Linha 2 = Rua e Número - Bairro - Cidade
        let inst = { linha1: '', linha2: '', rua: '', bairro_cidade: '' };
        const separarRuaBairro = (l2) => {
            const s = String(l2 || '').trim();
            if (!s) return { rua: '', bairro_cidade: '' };
            const ps = s.split(/\s+-\s+/);
            return ps.length >= 2 ? { rua: ps[0].trim(), bairro_cidade: ps.slice(1).join(' - ').trim() } : { rua: s, bairro_cidade: '' };
        };
        const rawOriginal = String(p.endereco_instalacao || '').trim();
        const mPrefixo = rawOriginal.match(/^\s*(ENDERE[ÇC]O\s+(?:DE\s+)?(?:FATURAMENTO|ENTREGA|INSTALA[ÇC][ÃA]O|COBRAN[ÇC]A|COMERCIAL)|MATRIZ|FILIAL)\s*[-:–]\s*(.*)$/i);
        const prefixoExplicito = mPrefixo ? String(mPrefixo[1] || '').trim().toUpperCase() : '';
        const rawEnd = (mPrefixo ? String(mPrefixo[2] || '') : rawOriginal).trim();
        if (rawOriginal) {
            let match = null;
            if (cliente) {
                const ends = await dbAll('SELECT * FROM enderecos_entrega WHERE cliente_id = ?', [cliente.id]).catch(() => []);
                const en = norm(rawEnd || rawOriginal);
                match = ends.find(e => { const rua = norm(e.endereco); return rua && en.includes(rua); }) || null;
            }
            if (match) {
                const j = (a) => a.map(x => String(x || '').trim()).filter(Boolean);
                const nomeLocal = String(match.nome_local || prefixoExplicito || '').trim();
                const ruaNum = j([match.endereco, match.numero, match.complemento]).join(', ');
                const bairroCid = j([match.bairro, j([match.municipio, match.uf]).join('/')]).join(' - ');
                const endCompleto = j([ruaNum, bairroCid]).join(' - ');
                inst.rua = ruaNum || rawEnd;
                inst.bairro_cidade = bairroCid;
                if (nomeLocal) {
                    inst.linha1 = nomeLocal;
                    inst.linha2 = endCompleto || rawEnd;
                } else {
                    inst.linha1 = ruaNum || rawEnd;
                    inst.linha2 = bairroCid;
                }
            } else if (prefixoExplicito) {
                const sep = separarRuaBairro(rawEnd);
                inst.linha1 = prefixoExplicito;
                inst.linha2 = rawEnd;
                inst.rua = sep.rua;
                inst.bairro_cidade = sep.bairro_cidade;
            } else {
                const partes = rawOriginal.split(/\s+-\s+/);
                if (partes.length >= 2) {
                    const l2 = partes.slice(1).join(' - ').trim();
                    const sep = separarRuaBairro(l2);
                    inst = { linha1: partes[0].trim(), linha2: l2, rua: sep.rua, bairro_cidade: sep.bairro_cidade };
                } else {
                    inst = { linha1: rawOriginal, linha2: '', rua: '', bairro_cidade: '' };
                }
            }
        }

        const equip = await dbAll('SELECT * FROM estoque_equipamentos').catch(() => []);
        const acharEquip = (it, nomeProd) => {
            const cod = norm(it.codigo);
            const nm = norm(String(nomeProd || '').replace(/^\d+\s*-\s*/, ''));
            return equip.find(eq => (cod && cod !== '—' && norm(eq.codigo) === cod) || (nm && norm(eq.nome) === nm)) || null;
        };
        const descricaoDe = (it, nomeProd) => {
            if (it.descricao_proposta && String(it.descricao_proposta).trim()) return String(it.descricao_proposta).trim();
            const a = acharEquip(it, nomeProd);
            return a ? String(a.descricao_proposta || a.especificacao_tecnica || '').trim() : '';
        };
        const fotoDe = (it, nomeProd) => {
            if (it.foto_url && String(it.foto_url).trim()) return String(it.foto_url).trim();
            const a = acharEquip(it, nomeProd);
            if (!a) return '';
            if (a.r2_key) {
                return process.env.R2_PUBLIC_URL
                    ? `${String(process.env.R2_PUBLIC_URL).replace(/\/+$/, '')}/${a.r2_key}`
                    : `/api/public/equipamento-foto/${a.id}`;
            }
            return String(a.foto_url || '').trim();
        };
        const normUrl = (u) => {
            const s = String(u || '').trim();
            if (!s) return '';
            if (/^https?:\/\//i.test(s) || s.startsWith('/')) return s;
            return 'https://' + s;
        };
        const linkDe = (it, nomeProd) => {
            if (it.link_url && String(it.link_url).trim()) return normUrl(it.link_url);
            const a = acharEquip(it, nomeProd);
            return a && a.link_url ? normUrl(a.link_url) : '';
        };

        const itensRaw = lerJson(p.itens);
        const servRaw = lerJson(p.itens_servicos);
        let somaPorDia = 0, somaTotalGeral = 0, somaTotalServicos = 0;

        const formatarDiasCurtoItem = (it) => {
            let diasArr = Array.isArray(it && it.dias_evento) ? it.dias_evento.filter(Boolean) : [];
            if (diasArr.length === 0 && p && p.dias_evento) {
                diasArr = lerJson(p.dias_evento);
                if (!diasArr.length && typeof p.dias_evento === 'string') {
                    diasArr = String(p.dias_evento).split(',').filter(Boolean);
                }
            }
            const datasIso = [];
            diasArr.forEach(entry => {
                const s = (entry && typeof entry === 'object') ? String(entry.data || entry.iso || '') : String(entry || '');
                const iso = s.trim().split(/[\sT]+/)[0].slice(0, 10);
                if (/^\d{4}-\d{2}-\d{2}$/.test(iso) && !datasIso.includes(iso)) datasIso.push(iso);
            });
            datasIso.sort();
            if (datasIso.length === 0) return '';
            return datasIso.map(iso => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`).join(', ');
        };

        const ehEventoCalcPub = String(p.tipo || '').trim().toUpperCase().replace(/^PROPOSTA\s+/i, '') === 'EVENTO';
        const diasContratoPubNum = Number(p.dias_contrato || 0);
        const itens = itensRaw.map(it => {
            const qtd = Math.max(1, Number(it.quantidade ?? it.qtde ?? 1) || 1);
            const nome = String(it.produto || it.descricao || it.nome || 'EQUIPAMENTO').replace(/^\d+\s*-\s*/, '').trim();
            const dias = Array.isArray(it.dias_evento) ? it.dias_evento.filter(Boolean) : [];
            const nDiarias = dias.length > 0
                ? dias.length
                : ((ehEventoCalcPub && diasContratoPubNum > 0)
                    ? diasContratoPubNum
                    : Math.max(1, Number(it.diarias ?? p.dias_contrato ?? 1) || 1));
            const unitLiq = Number(it.valor_unitario ?? it.valor ?? 0) || 0;
            const base = Number(it.valor_base) > 0 ? Number(it.valor_base) : unitLiq;
            const netDia = (it.valor_total !== undefined && !isNaN(parseFloat(it.valor_total))) ? parseFloat(it.valor_total) : unitLiq * qtd;
            const grossDia = base * qtd;
            somaPorDia += netDia;
            somaTotalGeral += netDia * nDiarias;
            return {
                quantidade: qtd, nome, descricao_proposta: descricaoDe(it, nome),
                foto_url: fotoDe(it, nome),
                link_url: linkDe(it, nome),
                observacao: String(it.observacao || '').trim().toUpperCase(),
                dias_evento_texto: formatarDiasCurtoItem(it),
                quant_diarias: nDiarias, unit: base, por_dia: grossDia,
                desconto: Math.max(0, grossDia - netDia) * nDiarias, total: netDia * nDiarias, cortesia: netDia <= 0
            };
        });

        const servicos = servRaw.map(s => {
            const qtd = Math.max(1, Number(s.quantidade ?? 1) || 1);
            const nome = String(s.servico || s.descricao || s.nome || 'SERVIÇO').replace(/^\d+\s*-\s*/, '').trim();
            const isFob = !!s.frete_fob;
            const unitLiq = isFob ? 0 : (Number(s.valor_unitario ?? s.valor ?? 0) || 0);
            const base = isFob ? 0 : (Number(s.valor_base) > 0 ? Number(s.valor_base) : unitLiq);
            const net = isFob ? 0 : ((s.valor_total !== undefined && !isNaN(parseFloat(s.valor_total))) ? parseFloat(s.valor_total) : unitLiq * qtd);
            const gross = isFob ? 0 : (base * qtd);
            if (!isFob) somaTotalServicos += net;
            return {
                quantidade: qtd, nome, descricao_proposta: descricaoDe({ codigo: s.codigo }, nome),
                link_url: linkDe({ codigo: s.codigo, link_url: s.link_url }, nome),
                observacao: String(s.observacao || '').trim().toUpperCase(),
                quant_diarias: '—', unit: base, por_dia: gross, desconto: isFob ? 0 : Math.max(0, gross - net), total: net,
                fob: isFob, cortesia: !isFob && net <= 0
            };
        });

        const ini = fmtDataIso(p.periodo_inicio), fim = fmtDataIso(p.periodo_fim);
        const diarias = (ini && fim) ? (ini === fim ? ini : `${ini} A ${fim}`) : (ini || fim || '—');
        const eventoLike = tipoEhEventoLike(p.tipo);

        const formatarSeq = (codRaw, contRaw, idRaw) => {
            const c1 = String(codRaw || '').trim();
            if (/^\d+$/.test(c1)) return String(parseInt(c1, 10)).padStart(2, '0');
            const m1 = c1.match(/^(?:PR|CT)\d{4}\/?0*(\d+)$/i);
            if (m1) return String(parseInt(m1[1], 10)).padStart(2, '0');
            const c2 = String(contRaw || '').trim();
            const m2 = c2.match(/^(?:PR|CT)\d{4}\/?0*(\d+)$/i);
            if (m2) return String(parseInt(m2[1], 10)).padStart(2, '0');
            if (idRaw && /^\d+$/.test(String(idRaw))) return String(parseInt(idRaw, 10)).padStart(2, '0');
            return c1 || '01';
        };
        const gerarDatasIntervalo = (iniIso, fimIso) => {
            const i = isoData(iniIso), f = isoData(fimIso);
            if (!i || !f || i > f) return [];
            const out = [];
            const cur = new Date(i + 'T12:00:00Z'), end = new Date(f + 'T12:00:00Z');
            let guard = 0;
            while (cur <= end && guard < 730) { out.push(cur.toISOString().slice(0, 10)); cur.setUTCDate(cur.getUTCDate() + 1); guard++; }
            return out;
        };
        const datasSet = new Set();
        let flagManutDiaria = false;
        const extrairDataIso = (entry) => {
            if (!entry) return '';
            if (typeof entry === 'object') return String(entry.data || entry.dia || '').trim().slice(0, 10);
            return String(entry).trim().split(/[\sT]+/)[0].slice(0, 10);
        };
        itensRaw.forEach(it => {
            if (it && it.manutencao_diaria) flagManutDiaria = true;
            (Array.isArray(it && it.dias_evento) ? it.dias_evento : []).forEach(d => {
                const dIso = extrairDataIso(d);
                if (/^\d{4}-\d{2}-\d{2}$/.test(dIso)) datasSet.add(dIso);
            });
        });
        if (datasSet.size === 0 && p.dias_evento) {
            lerJson(p.dias_evento).forEach(d => {
                const dIso = extrairDataIso(d);
                if (/^\d{4}-\d{2}-\d{2}$/.test(dIso)) datasSet.add(dIso);
            });
        }
        const datasOrd = [...datasSet].sort();
        if (p.periodo_inicio && p.periodo_fim && datasOrd.length > 0) {
            const todasPer = gerarDatasIntervalo(p.periodo_inicio, p.periodo_fim);
            if (todasPer.length > 0 && todasPer.length === datasOrd.length && todasPer.every((d, idx) => datasOrd[idx] === d)) {
                flagManutDiaria = true;
            }
        }
        const resumoDiariasRodape = flagManutDiaria
            ? 'MANUTENÇÃO DIÁRIA'
            : (datasOrd.length > 0 ? datasOrd.map(dIso => fmtDataIso(dIso)).join(', ') : '');
        const numSeq = formatarSeq(p.codigo, p.contrato, p.id);
        const tipoPropNorm = normalizarModeloTipoPublico(p.tipo);
        const ehAditivo = tipoPropNorm === 'ADITIVO';
        const temParceirosQuadro = await propostaTemProdutoParceirosPublico(p, equip);
        const modeloEfetivo = temParceirosQuadro
            ? 'EQUIPAMENTOS'
            : (ehAditivo ? await resolverModeloOriginarioAditivoPublico(p) : tipoPropNorm);
        const eventoLikeEfetivo = tipoEhEventoLike(modeloEfetivo);

        const valPub = fmtDataIso(p.validade_proposta || ultimoDiaValido(p));
        const condPagPub = String(p.condicao_pagamento || '').trim();
        const truncarRazao30 = (nome) => {
            const max = 30;
            const limpo = String(nome || '').trim().replace(/\s+/g, ' ');
            if (!limpo || limpo === '—') return '—';
            const conectivoFinalRe = /^(?:E|&|DE|DA|DO|DAS|DOS|-|\/|,)$/i;
            const palavras = limpo.split(' ');
            if (limpo.length <= max) {
                while (palavras.length > 1 && conectivoFinalRe.test(palavras[palavras.length - 1])) palavras.pop();
                return palavras.join(' ');
            }
            const escolhidas = [];
            let atual = '';
            for (let i = 0; i < palavras.length; i++) {
                const pl = palavras[i];
                const cand = atual ? (atual + ' ' + pl) : pl;
                if (cand.length <= max) { escolhidas.push(pl); atual = cand; }
                else break;
            }
            if (!escolhidas.length) return limpo.slice(0, max).trim();
            while (escolhidas.length > 1 && conectivoFinalRe.test(escolhidas[escolhidas.length - 1])) escolhidas.pop();
            return escolhidas.join(' ');
        };

        const ehObraLike = modeloEfetivo === 'OBRA' || ['OBRA MENSAL', 'OBRA QUINZENAL', 'OBRA SEMANAL'].includes(modeloEfetivo);
        const ehFossaLike = modeloEfetivo === 'LIMPA FOSSA' || modeloEfetivo === 'LIMPA FOSSA MENSAL';
        const tituloTopoFinal = ehObraLike
            ? await resolverSubtituloObraPublico(p)
            : (ehFossaLike
                ? await resolverSubtituloLimpaFossaPublico(p)
                : (modeloEfetivo || tipoLimpo(p.tipo) || 'EVENTO'));

        const modelosProp = await dbAll('SELECT * FROM comercial_modelos_proposta ORDER BY ordem ASC, id ASC').catch(() => []);
        const acharModeloRow = (codAlvo) => {
            const cNorm = norm(codAlvo).replace(/^proposta\s+/i, '').trim();
            return modelosProp.find(m => {
                const mCod = norm(m.codigo_tipo).replace(/^proposta\s+/i, '').trim();
                const mNom = norm(m.nome).replace(/^proposta\s+/i, '').trim();
                if (mCod === cNorm || mNom === cNorm) return true;
                if (cNorm.startsWith('obra') && (mCod === 'obra' || mCod.startsWith('obra'))) return true;
                if (cNorm.includes('fossa') && (mCod === 'limpa fossa' || mCod.includes('fossa'))) return true;
                if (cNorm.includes('container') && (mCod.includes('container') || mNom.includes('container'))) return true;
                if (cNorm.includes('equipamento') && (mCod.includes('equipamento') || mNom.includes('equipamento'))) return true;
                return false;
            }) || null;
        };
        const modeloRow = acharModeloRow(modeloEfetivo) || acharModeloRow(p.tipo) || modelosProp[0] || null;
        const aceiteRow = (modeloRow && (modeloRow.aceite_r2_key || modeloRow.aceite_mobile_r2_key)) ? modeloRow : null;
        const aditivoRow = (modeloRow && (modeloRow.aditivo_r2_key || modeloRow.aditivo_mobile_r2_key))
            ? modeloRow
            : (() => {
                const mAdt = acharModeloRow('ADITIVO');
                return (mAdt && (mAdt.aditivo_r2_key || mAdt.aditivo_mobile_r2_key)) ? mAdt : null;
            })();
        const montarUrlAceite = (row, variante) => {
            if (!row) return null;
            const key = variante === 'mobile' ? (row.aceite_mobile_r2_key || row.aceite_r2_key) : row.aceite_r2_key;
            if (!key) return null;
            if (process.env.R2_PUBLIC_URL) return `${String(process.env.R2_PUBLIC_URL).replace(/\/+$/, '')}/${key}`;
            return `/api/public/modelos-proposta/${row.id}/aceite-arquivo?v=${variante === 'mobile' ? 'mobile' : 'desktop'}`;
        };
        const montarUrlAditivo = (row, variante) => {
            if (!row) return null;
            const key = variante === 'mobile' ? (row.aditivo_mobile_r2_key || row.aditivo_r2_key) : row.aditivo_r2_key;
            if (!key) return null;
            if (process.env.R2_PUBLIC_URL) return `${String(process.env.R2_PUBLIC_URL).replace(/\/+$/, '')}/${key}`;
            return `/api/public/modelos-proposta/${row.id}/aditivo-arquivo?v=${variante === 'mobile' ? 'mobile' : 'desktop'}`;
        };
        let aditivoFallbackUrl = null;
        let aditivoFallbackMobUrl = null;
        if (ehAditivo && !aditivoRow) {
            const boxAdtLegacy = await dbGet(
                "SELECT * FROM comercial_boxes WHERE ativo = 1 AND modelo_tipo = 'ADITIVO' AND tipo != 'quadro_evento' ORDER BY ordem ASC, id ASC LIMIT 1"
            ).catch(() => null);
            if (boxAdtLegacy) {
                aditivoFallbackUrl = urlBox(boxAdtLegacy, 'desktop');
                aditivoFallbackMobUrl = urlBox(boxAdtLegacy, 'mobile');
            }
        }
        let contratadaPadrao = {
            razao_social: 'AMERICA RENTAL EQUIPAMENTOS LTDA',
            cnpj: '03.434.448/0001-01',
            ie: '336.715.410.116',
            endereco: 'RUA SALTO DA DIVISA , 97, CIDADE PARQUE ALVORADA GUARULHOS /SP - CEP: 07242-300',
            telefone: '(11) 2499-3353',
            celular: '(11) 99104-2685',
            representante: String(p.representante || p.atendente || 'Comercial').trim(),
            email_representante: 'comercial2@americarental.com.br'
        };
        try {
            if (modeloRow && modeloRow.dados_contratada) {
                const parsedC = parseObjJson(modeloRow.dados_contratada);
                if (parsedC && Object.keys(parsedC).length) contratadaPadrao = Object.assign({}, contratadaPadrao, parsedC);
            }
        } catch (e) {}
        const tituloDocSimples = String((modeloRow && modeloRow.titulo_documento) || (`PROPOSTA ${tituloTopoFinal} Nº {{NUMERO_PROPOSTA}}`))
            .replace(/\{\{NUMERO_PROPOSTA\}\}/g, numSeq)
            .replace(/\{\{CONTRATO_BASE\}\}/g, String(p.contrato_vinculado || '—'));

        return {
            tipo_titulo: tituloTopoFinal,
            modelo_tipo: modeloEfetivo || 'EVENTO',
            eh_aditivo: ehAditivo,
            eh_demo: false,
            proposta_comparativa: Boolean(Number(p.proposta_comparativa) === 1),
            produtos_aprovados: lerJson(p.produtos_aprovados),
            fase_negociacao: p.fase_negociacao || '',
            aprovado_por: p.aprovado_por || null,
            aprovado_em: p.aprovado_em || null,
            aceite_publico_em: p.aceite_publico_em || null,
            assinatura_url: p.assinatura_r2_key ? (`/api/public/propostas/${p.id}/assinatura-arquivo?t=${encodeURIComponent(p.aceite_publico_em || '1')}`) : null,
            aceite: {
                url: montarUrlAceite(aceiteRow, 'desktop'),
                mobile_url: (aceiteRow && aceiteRow.aceite_mobile_r2_key) ? montarUrlAceite(aceiteRow, 'mobile') : null
            },
            aditivo: {
                url: aditivoRow ? montarUrlAditivo(aditivoRow, 'desktop') : aditivoFallbackUrl,
                mobile_url: (aditivoRow && aditivoRow.aditivo_mobile_r2_key) ? montarUrlAditivo(aditivoRow, 'mobile') : aditivoFallbackMobUrl
            },
            impressao_simples: {
                titulo_documento: tituloDocSimples,
                contratada: contratadaPadrao,
                cliente: {
                    razao_social: (cliente && cliente.nome_razao_social) || cliNomeLimpo || '—',
                    cnpj: (cliente && cliente.cpf_cnpj) ? String(cliente.cpf_cnpj).trim() : '—',
                    ie: (cliente && cliente.rg_ie) ? String(cliente.rg_ie).trim() : 'ISENTO',
                    endereco: (cliente && cliente.endereco) ? `${cliente.endereco}${cliente.numero ? ', ' + cliente.numero : ''}${cliente.bairro ? ' - ' + cliente.bairro : ''}` : (rawOriginal || '—'),
                    municipio: (cliente && cliente.municipio) || 'SAO PAULO',
                    uf: (cliente && cliente.uf) || 'SP',
                    cep: (cliente && cliente.cep) || '—',
                    contato_nome: contatoNome || '—',
                    contato_telefone: (cliente && cliente.telefone) || '—',
                    contato_celular: celular || '—',
                    contato_email: (cliente && cliente.email) || '—'
                },
                local_instalacao: inst.linha1 || cliNomeLimpo || '—',
                endereco_instalacao: inst.linha2 || rawOriginal || '—',
                cep_instalacao: (cliente && cliente.cep) || '—',
                titulo_tabela_produtos: (modeloRow && modeloRow.titulo_tabela_produtos) || (ehAditivo ? '1. Objetivo do Termo Aditivo' : 'Produtos para Locação'),
                titulo_informacoes: (modeloRow && modeloRow.titulo_informacoes !== undefined) ? modeloRow.titulo_informacoes : 'Informações:',
                linhas_informacoes: String((modeloRow && modeloRow.texto_informacoes) || '').split(/\r?\n/).map(l => l.trim()).filter(Boolean),
                observacao: String(p.observacoes || (modeloRow && modeloRow.observacao_padrao) || '').trim()
            },
            contrato_vinculado: String(p.contrato_vinculado || '').trim(),
            info_rotulo: ehFossaLike ? 'DA FOSSA:' : (ehObraLike ? 'DA OBRA:' : 'EVENTO:'),
            rotulo_instalacao: ehFossaLike ? 'ENDEREÇO:' : 'INSTALAÇÃO:',
            ocultar_nome_evento: (ehObraLike || ehFossaLike),
            contrato: numSeq,
            codigo_proposta: numSeq,
            razao_social: truncarRazao30(cliNomeLimpo),
            cnpj: (cliente && cliente.cpf_cnpj) ? String(cliente.cpf_cnpj).trim() : '—',
            contato_nome: contatoNome || '—',
            contato_celular: celular || '—',
            nome_evento: String(p.nome_evento || '').trim() || '—',
            data_inicio: ini || '—',
            data_fim: fim || ini || '—',
            validade_proposta: valPub || '—',
            condicao_pagamento: condPagPub || '—',
            diarias_contrato: diarias,
            instalacao_linha1: inst.linha1 || 'NOME DO LOCAL',
            instalacao_linha2: inst.linha2,
            instalacao_rua: inst.rua,
            instalacao_bairro_cidade: inst.bairro_cidade,
            resumo_diarias_rodape: resumoDiariasRodape,
            observacoes: String(p.observacoes || '').trim(),
            itens, servicos,
            valor_total_por_dia_geral: somaPorDia,
            valor_total_produtos: somaTotalGeral,
            valor_total_servicos: somaTotalServicos,
            valor_total_geral: somaTotalGeral
        };
    }

    // JSON público — sempre a versão atual da proposta
    app.get('/api/public/proposta/:codigo/:token', limiteGeral, limiteFalhas, async (req, res) => {
        cabecalhosPublicos(res);
        const naoEncontrada = () => res.status(404).json({ error: 'Link inválido ou expirado.' });
        try {
            const { codigo, token } = req.params;
            if (!CODIGO_RE.test(codigo) || !TOKEN_RE.test(token)) return naoEncontrada();
            let p = await dbGet('SELECT * FROM propostas WHERE codigo = ?', [codigo]);
            if (!p && /^\d+$/.test(codigo)) {
                p = await dbGet('SELECT * FROM propostas WHERE CAST(codigo AS INTEGER) = ?', [parseInt(codigo, 10)]);
            }
            if (!p) {
                p = await dbGet('SELECT * FROM propostas WHERE token_publico = ?', [token]);
            }
            if (!p || !tokenConfere(token, p.token_publico)) return naoEncontrada();
            const st = statusLink(p);
            if (!st.ativo) return res.status(410).json({ error: 'Este link expirou ou foi desativado. Solicite uma nova proposta.' });

            const [dados, boxes] = await Promise.all([montarDadosQuadro(p), listarBoxesPublicos(p)]);
            const agora = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString().replace('T', ' ').substring(0, 19);
            db.run('UPDATE propostas SET visualizacoes_publicas = COALESCE(visualizacoes_publicas,0) + 1, ultima_visualizacao_publica = ? WHERE id = ?', [agora, p.id], () => {});
            res.json({ dados, boxes });
        } catch (e) {
            console.error('[PROPOSTA-PUBLICA] Erro:', e.message);
            res.status(500).json({ error: 'Não foi possível carregar a proposta agora.' });
        }
    });

    app.get('/api/propostas/:id/dados-documento-assinado', authenticateToken, async (req, res) => {
        try {
            const p = await dbGet('SELECT * FROM propostas WHERE id = ?', [req.params.id]);
            if (!p) return res.status(404).json({ error: 'Proposta não encontrada.' });
            const dados = await montarDadosQuadro(p);
            if (String(p.fase_negociacao || '').trim().toUpperCase() === 'APROVADA' && !dados.aprovado_por) {
                const logAp = await dbGet(
                    "SELECT usuario, data_hora FROM auditoria WHERE programa = 'Proposta' AND registro_id = ? AND (UPPER(conteudo_atual) = 'APROVADA' OR campo = 'Criação') ORDER BY id DESC LIMIT 1",
                    [p.id]
                ).catch(() => null);
                const rawUser = (logAp && logAp.usuario) || p.atendente || p.criado_por || '';
                if (rawUser) {
                    const colabMatch = await dbGet(
                        "SELECT nome_completo FROM colaboradores WHERE LOWER(TRIM(nome_completo)) = LOWER(TRIM(?)) OR LOWER(REPLACE(TRIM(nome_completo), ' ', '.')) = LOWER(TRIM(?)) LIMIT 1",
                        [rawUser, rawUser]
                    ).catch(() => null);
                    dados.aprovado_por = (colabMatch && colabMatch.nome_completo) || rawUser;
                    dados.aprovado_em = (logAp && logAp.data_hora) || p.atualizado_em || null;
                }
            }
            res.json({ success: true, dados, proposta: p });
        } catch (e) {
            console.error('[PROPOSTA-PUBLICA] Erro ao montar documento assinado:', e.message);
            res.status(500).json({ error: e.message || 'Erro ao carregar documento assinado.' });
        }
    });

    app.get('/api/public/auditoria/:logId/assinatura-arquivo', limiteGeral, async (req, res) => {
        try {
            const log = await dbGet('SELECT id, registro_id, snapshot_json FROM auditoria WHERE id = ?', [req.params.logId]);
            if (!log) return res.status(404).end();
            let r2Key = null;
            let mimeType = 'image/png';
            if (log.snapshot_json) {
                try {
                    const snap = JSON.parse(log.snapshot_json);
                    if (snap && snap.assinatura_r2_key) r2Key = snap.assinatura_r2_key;
                    if (snap && snap.assinatura_mime_type) mimeType = snap.assinatura_mime_type;
                } catch (_) {}
            }
            if (!r2Key && log.registro_id) {
                const p = await dbGet('SELECT assinatura_r2_key, assinatura_mime_type FROM propostas WHERE id = ?', [log.registro_id]);
                if (p && p.assinatura_r2_key) {
                    r2Key = p.assinatura_r2_key;
                    if (p.assinatura_mime_type) mimeType = p.assinatura_mime_type;
                }
            }
            if (!r2Key) return res.status(404).end();
            const r2s = require('./utils/r2');
            if (!r2s.isReady()) return res.status(503).end();
            const { stream, contentType } = await r2s.downloadStreamFromR2(r2Key);
            res.setHeader('Content-Type', contentType || mimeType || 'image/png');
            res.setHeader('Cache-Control', 'public, max-age=3600');
            stream.pipe(res);
        } catch (e) {
            res.status(404).end();
        }
    });

    app.get('/api/propostas/:id/logs/:logId/documento', authenticateToken, async (req, res) => {
        try {
            const propId = Number(req.params.id);
            const logId = Number(req.params.logId);
            const [pAtual, log] = await Promise.all([
                dbGet('SELECT * FROM propostas WHERE id = ?', [propId]),
                dbGet("SELECT * FROM auditoria WHERE id = ? AND programa = 'Proposta'", [logId])
            ]);
            if (!pAtual) return res.status(404).json({ error: 'Proposta não encontrada.' });
            if (!log) return res.status(404).json({ error: 'Registro de histórico não encontrado.' });

            let pBase = Object.assign({}, pAtual);
            if (log.snapshot_json) {
                try {
                    const parsedSnap = JSON.parse(log.snapshot_json);
                    if (parsedSnap && typeof parsedSnap === 'object') {
                        pBase = Object.assign({}, pAtual, parsedSnap);
                    }
                } catch (_) {}
            } else {
                // Para registros antigos anteriores ao snapshot_json, tenta buscar assinatura de pré-aprovação anterior se aplicável
                const atuUpper = norm(log.conteudo_atual || '').toUpperCase();
                if (atuUpper.startsWith('PROPOSTA ENVIADA')) {
                    pBase.assinatura_r2_key = null;
                    pBase.aceite_publico_em = null;
                    pBase.aprovado_por = null;
                    pBase.aprovado_em = null;
                    pBase.fase_negociacao = 'Proposta Enviada';
                } else if (atuUpper.startsWith('PRE APROVADA') || atuUpper.includes('ACEITE ASSINADO')) {
                    pBase.fase_negociacao = 'Pré aprovada';
                    pBase.aprovado_por = null;
                    pBase.aprovado_em = null;
                } else if (atuUpper.startsWith('APROVADA')) {
                    pBase.fase_negociacao = 'Aprovada';
                }
            }

            const dados = await montarDadosQuadro(pBase);
            const atuNorm = norm(log.conteudo_atual || '').toUpperCase();
            if (atuNorm.startsWith('PROPOSTA ENVIADA')) {
                dados.assinatura_url = null;
                dados.aceite_publico_em = null;
                dados.aprovado_por = null;
                dados.aprovado_em = null;
                dados.fase_negociacao = 'Proposta Enviada';
            } else if (pBase.assinatura_r2_key) {
                dados.assinatura_url = `/api/public/auditoria/${log.id}/assinatura-arquivo?t=${log.id}`;
            }

            if (atuNorm.startsWith('APROVADA') && !dados.aprovado_por) {
                dados.aprovado_por = log.usuario || pBase.aprovado_por || pBase.atendente || '';
                dados.aprovado_em = log.data_hora || pBase.aprovado_em || null;
            }

            res.json({ success: true, dados, log });
        } catch (e) {
            console.error('[PROPOSTA-PUBLICA] Erro ao montar documento do histórico:', e.message);
            res.status(500).json({ error: e.message || 'Erro ao carregar documento do histórico.' });
        }
    });

    async function notificarPreAprovacaoProposta(p, agoraIso, agoraBrFmt) {
        try {
            const [usuarios, colabs, emailsCorp, departamentos] = await Promise.all([
                dbAll('SELECT id, username, nome, email, departamento FROM usuarios').catch(() => []),
                dbAll('SELECT id, nome_completo, email, email_corporativo, departamento FROM colaboradores').catch(() => []),
                dbAll("SELECT email, colaborador_id, colaborador_nome FROM emails_corporativos WHERE status = 'ativo'").catch(() => []),
                dbAll('SELECT id, nome, responsavel_id, responsavel_nome FROM departamentos').catch(() => [])
            ]);

            const matchNomeFlex = (a, b) => {
                const sa = norm(a).replace(/[._-]+/g, ' ').trim();
                const sb = norm(b).replace(/[._-]+/g, ' ').trim();
                if (!sa || !sb) return false;
                if (sa === sb || sa.includes(sb) || sb.includes(sa)) return true;
                const pa = sa.split(/\s+/).filter(x => x.length >= 2);
                const pb = sb.split(/\s+/).filter(x => x.length >= 2);
                if (pa.length >= 2 && pa.every(w => pb.includes(w))) return true;
                if (pb.length >= 2 && pb.every(w => pa.includes(w))) return true;
                if (pa.length >= 2 && pb.length >= 2 && pa[0] === pb[0] && pa[pa.length - 1] === pb[pb.length - 1]) return true;
                return false;
            };

            const resolverPessoa = (termoNome, colabIdHint) => {
                const tNorm = norm(termoNome);
                let colab = null;
                if (colabIdHint) {
                    colab = colabs.find(c => Number(c.id) === Number(colabIdHint)) || null;
                }
                if (!colab && tNorm) {
                    colab = colabs.find(c => norm(c.nome_completo) === tNorm)
                        || colabs.find(c => matchNomeFlex(tNorm, c.nome_completo))
                        || null;
                }
                let user = null;
                if (tNorm) {
                    user = usuarios.find(u => norm(u.username) === tNorm || norm(u.nome) === tNorm)
                        || usuarios.find(u => matchNomeFlex(tNorm, u.nome) || matchNomeFlex(tNorm, u.username))
                        || null;
                }
                if (!user && colab) {
                    user = usuarios.find(u =>
                        matchNomeFlex(colab.nome_completo, u.nome) ||
                        matchNomeFlex(colab.nome_completo, u.username) ||
                        (colab.email_corporativo && norm(u.email) === norm(colab.email_corporativo)) ||
                        (colab.email && norm(u.email) === norm(colab.email))
                    ) || null;
                }
                if (!colab && user) {
                    colab = colabs.find(c =>
                        matchNomeFlex(user.nome, c.nome_completo) ||
                        matchNomeFlex(user.username, c.nome_completo) ||
                        (user.email && (norm(c.email_corporativo) === norm(user.email) || norm(c.email) === norm(user.email)))
                    ) || null;
                }

                let email = null;
                if (colab) {
                    const ec = emailsCorp.find(e => Number(e.colaborador_id) === Number(colab.id))
                        || emailsCorp.find(e => matchNomeFlex(e.colaborador_nome, colab.nome_completo));
                    if (ec && ec.email && String(ec.email).includes('@')) email = String(ec.email).trim().toLowerCase();
                    else if (colab.email_corporativo && String(colab.email_corporativo).includes('@')) email = String(colab.email_corporativo).trim().toLowerCase();
                }
                if (!email && tNorm) {
                    const ec2 = emailsCorp.find(e => matchNomeFlex(e.colaborador_nome, termoNome));
                    if (ec2 && ec2.email && String(ec2.email).includes('@')) email = String(ec2.email).trim().toLowerCase();
                }
                if (!email && user && user.email && String(user.email).includes('@')) {
                    email = String(user.email).trim().toLowerCase();
                }
                if (!email && colab && colab.email && String(colab.email).includes('@')) {
                    email = String(colab.email).trim().toLowerCase();
                }

                const depto = (colab && colab.departamento) || (user && user.departamento) || 'Comercial';
                return {
                    usuario_id: user ? Number(user.id) : null,
                    colaborador_id: colab ? Number(colab.id) : null,
                    email,
                    departamento: depto
                };
            };

            const nomeAtendente = String(p.atendente || p.representante || p.criado_por || '').trim();
            const infoAtendente = resolverPessoa(nomeAtendente, null);

            const deptoAlvoNorm = norm(infoAtendente.departamento || 'Comercial');
            const deptoRow = departamentos.find(d => norm(d.nome) === deptoAlvoNorm)
                || departamentos.find(d => deptoAlvoNorm && (norm(d.nome).includes(deptoAlvoNorm) || deptoAlvoNorm.includes(norm(d.nome))))
                || departamentos.find(d => norm(d.nome).includes('comercial'))
                || null;

            const infoGestor = deptoRow
                ? resolverPessoa(deptoRow.responsavel_nome || '', deptoRow.responsavel_id || null)
                : { usuario_id: null, email: null };

            const userIdsNotificar = Array.from(new Set([infoAtendente.usuario_id, infoGestor.usuario_id].filter(Boolean)));
            const emailsNotificar = Array.from(new Set([infoAtendente.email, infoGestor.email].filter(Boolean)));

            const numProp = String(p.codigo || p.id || '').trim();
            const cliProp = String(p.cliente_nome || '—').trim();
            const contProp = String(p.contato_nome || '—').trim();
            const linkDiretoProposta = `${baseLink()}/?abrir_proposta=${encodeURIComponent(p.id)}`;

            const dadosJson = JSON.stringify({
                proposta_id: p.id,
                codigo: numProp,
                cliente_nome: cliProp,
                contato_nome: contProp,
                aceite_em: agoraBrFmt,
                url: `/?abrir_proposta=${encodeURIComponent(p.id)}`
            });
            const msgPopup = `Proposta Nº ${numProp} | Cliente: ${cliProp} | Contato: ${contProp}`;

            for (const uid of userIdsNotificar) {
                await dbRun(
                    `INSERT INTO notificacoes_usuarios (usuario_id, tipo, titulo, mensagem, dados, lida, criado_em)
                     VALUES (?, 'proposta_pre_aprovada', 'PROPOSTA PRÉ APROVADA', ?, ?, 0, ?)`,
                    [uid, msgPopup, dadosJson, agoraIso]
                ).catch(e => console.error('[PROPOSTA-PUBLICA] Erro ao criar notif popup:', e.message));
            }

            if (typeof sendMailHelper === 'function' && emailsNotificar.length > 0) {
                const logoPath = path.join(__dirname, '..', 'frontend', 'assets', 'logo-header.png');
                const htmlEmail = `
                    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;border:1px solid #ddd;border-radius:8px;overflow:hidden;background:#ffffff;">
                        <div style="text-align:center;background:#fff;border-bottom:1px solid #eee;">
                            <img src="cid:empresa-logo" alt="América Rental" style="width:100%;max-width:600px;height:auto;display:block;">
                        </div>
                        <div style="padding:24px;color:#1e293b;font-size:14px;line-height:1.6;">
                            <h2 style="color:#16a34a;text-align:center;margin-top:0;font-weight:800;">✅ PROPOSTA PRÉ APROVADA</h2>
                            <p style="margin:0 0 16px 0;">Uma proposta comercial acaba de ser <strong>pré-aprovada e assinada pelo cliente</strong> através do link da proposta:</p>
                            <div style="background:#f0fdf4;padding:16px;border-radius:8px;margin:16px 0;border-left:4px solid #16a34a;">
                                <p style="margin:4px 0;"><strong>Número da proposta:</strong> ${numProp}</p>
                                <p style="margin:4px 0;"><strong>Nome do Cliente:</strong> ${cliProp}</p>
                                <p style="margin:4px 0;"><strong>Nome do Contato:</strong> ${contProp}</p>
                                <p style="margin:4px 0;"><strong>Data/Hora do Aceite:</strong> ${agoraBrFmt}</p>
                            </div>
                            <div style="text-align:center;margin:22px 0 8px 0;">
                                <a href="${linkDiretoProposta}" style="display:inline-block;background:#16a34a;color:#ffffff;text-decoration:none;font-weight:800;font-size:14px;padding:12px 26px;border-radius:8px;">
                                    Abrir Proposta Nº ${numProp} no Sistema
                                </a>
                            </div>
                        </div>
                    </div>
                `;
                await sendMailHelper({
                    to: emailsNotificar.join(', '),
                    subject: `PROPOSTA PRÉ APROVADA - Nº ${numProp} - ${cliProp}`,
                    html: htmlEmail,
                    attachments: [{ filename: 'logo-header.png', path: logoPath, cid: 'empresa-logo' }]
                }).catch(e => console.error('[PROPOSTA-PUBLICA] Erro ao enviar email pré-aprovação:', e.message));
            }
        } catch (errNotif) {
            console.error('[PROPOSTA-PUBLICA] Erro geral em notificarPreAprovacaoProposta:', errNotif.message);
        }
    }

    const expressJsonAssinatura = require('express').json({ limit: '15mb' });
    app.post('/api/public/proposta/:codigo/:token/aprovar', limiteGeral, limiteFalhas, expressJsonAssinatura, async (req, res) => {
        cabecalhosPublicos(res);
        const naoEncontrada = () => res.status(404).json({ error: 'Link inválido ou expirado.' });
        try {
            const { codigo, token } = req.params;
            if (!CODIGO_RE.test(codigo) || !TOKEN_RE.test(token)) return naoEncontrada();
            let p = await dbGet('SELECT * FROM propostas WHERE codigo = ?', [codigo]);
            if (!p && /^\d+$/.test(codigo)) {
                p = await dbGet('SELECT * FROM propostas WHERE CAST(codigo AS INTEGER) = ?', [parseInt(codigo, 10)]);
            }
            if (!p) {
                p = await dbGet('SELECT * FROM propostas WHERE token_publico = ?', [token]);
            }
            if (!p || !tokenConfere(token, p.token_publico)) return naoEncontrada();
            const st = statusLink(p);
            if (!st.ativo) return res.status(410).json({ error: 'Este link expirou ou foi desativado.' });

            const assinaturaBase64 = String((req.body && req.body.assinatura_base64) || '').trim();
            if (!assinaturaBase64 || !assinaturaBase64.startsWith('data:image/')) {
                return res.status(400).json({ error: 'Por favor, assine no quadro de assinatura antes de confirmar.' });
            }

            const produtosAprovadosRaw = (req.body && Array.isArray(req.body.produtos_aprovados))
                ? req.body.produtos_aprovados.map(x => String(x || '').trim()).filter(Boolean)
                : [];
            if (Number(p.proposta_comparativa) === 1 && produtosAprovadosRaw.length === 0) {
                return res.status(400).json({ error: 'Selecione qual(is) produto(s) da proposta estão sendo aprovados antes de confirmar.' });
            }
            const produtosAprovadosJson = produtosAprovadosRaw.length > 0 ? JSON.stringify(produtosAprovadosRaw) : (p.produtos_aprovados || '[]');

            let assinaturaR2Key = p.assinatura_r2_key || null;
            const r2b = require('./utils/r2');
            if (r2b.isReady()) {
                const base64Clean = assinaturaBase64.replace(/^data:image\/\w+;base64,/, '');
                const bufAssinatura = Buffer.from(base64Clean, 'base64');
                const agoraBrObj = new Date(Date.now() - 3 * 60 * 60 * 1000);
                const yyyy = agoraBrObj.getUTCFullYear();
                const mm = String(agoraBrObj.getUTCMonth() + 1).padStart(2, '0');
                const dd = String(agoraBrObj.getUTCDate()).padStart(2, '0');
                const hash = crypto.randomBytes(4).toString('hex');
                assinaturaR2Key = `Comercial/AssinaturasAceite/${yyyy}/${mm}/${dd}_ASSINATURA_PROP_${p.id}_${hash}.png`;
                await r2b.uploadToR2(assinaturaR2Key, bufAssinatura, 'image/png');
            }

            const agoraDate = new Date(Date.now() - 3 * 60 * 60 * 1000);
            const agora = agoraDate.toISOString().replace('T', ' ').substring(0, 19);
            const [dPart, tPart] = agora.split(' ');
            const agoraBrFmt = `${dPart.split('-').reverse().join('/')} às ${tPart}`;
            const faseAnterior = p.fase_negociacao || 'Proposta Enviada';
            const novaFase = String(faseAnterior).trim().toUpperCase() === 'APROVADA' ? faseAnterior : 'Pré aprovada';

            await dbRun(
                "UPDATE propostas SET aceite_publico_em = ?, assinatura_r2_key = ?, assinatura_mime_type = 'image/png', fase_negociacao = ?, produtos_aprovados = ? WHERE id = ?",
                [agora, assinaturaR2Key, novaFase, produtosAprovadosJson, p.id]
            );

            const detalheProdsAudit = produtosAprovadosRaw.length > 0 ? ` | Produto(s): ${produtosAprovadosRaw.join(', ')}` : '';
            const snapPreAprov = JSON.stringify(Object.assign({}, p, {
                aceite_publico_em: agora,
                assinatura_r2_key: assinaturaR2Key,
                assinatura_mime_type: 'image/png',
                fase_negociacao: novaFase,
                produtos_aprovados: produtosAprovadosJson
            }));
            await dbRun(
                `INSERT INTO auditoria (usuario, programa, campo, conteudo_anterior, conteudo_atual, registro_id, snapshot_json)
                 VALUES (?, 'Proposta', 'Fase de Negociação', ?, ?, ?, ?)`,
                ['CLIENTE (Link da Proposta)', faseAnterior, `Pré aprovada (Aceite assinado em ${agoraBrFmt}${detalheProdsAudit})`, p.id, snapPreAprov]
            ).catch(() => {});

            notificarPreAprovacaoProposta(p, agora, agoraBrFmt);

            res.json({
                success: true,
                aceite_publico_em: agora,
                produtos_aprovados: produtosAprovadosRaw,
                assinatura_url: assinaturaR2Key ? `/api/public/propostas/${p.id}/assinatura-arquivo?t=${encodeURIComponent(agora)}` : null
            });
        } catch (e) {
            console.error('[PROPOSTA-PUBLICA] Erro ao aprovar:', e.message);
            res.status(500).json({ error: 'Não foi possível registrar o aceite agora.' });
        }
    });

    console.log('[PROPOSTA-PUBLICA] Rotas do link público registradas.');
};
