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

module.exports = function registrarPropostaPublica(app, db, authenticateToken) {
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
        'ultima_visualizacao_publica TEXT'
    ].forEach(col => {
        db.run(`ALTER TABLE propostas ADD COLUMN ${col}`, (err) => {
            if (err && !String(err.message).includes('duplicate column name')) {
                console.log('[PROPOSTA-PUBLICA] Alerta migration:', err.message);
            }
        });
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

    // ── Rotas autenticadas (usuário do sistema) ──────────────────────────────────
    // POST /api/propostas/:id/link-publico  { renovar?: boolean }
    app.post('/api/propostas/:id/link-publico', authenticateToken, async (req, res) => {
        try {
            const p = await dbGet('SELECT * FROM propostas WHERE id = ?', [req.params.id]);
            if (!p) return res.status(404).json({ error: 'Proposta não encontrada. Salve a proposta antes de copiar o link.' });
            if (!p.codigo || !CODIGO_RE.test(p.codigo)) return res.status(400).json({ error: 'Proposta sem código válido.' });
            let token = p.token_publico;
            const renovar = !!(req.body && req.body.renovar);
            if (!token || Number(p.token_publico_revogado) === 1 || renovar) {
                token = novoToken();
                const agora = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString().replace('T', ' ').substring(0, 19);
                await dbRun('UPDATE propostas SET token_publico = ?, token_publico_criado_em = ?, token_publico_revogado = 0 WHERE id = ?', [token, agora, p.id]);
                p.token_publico = token;
                p.token_publico_revogado = 0;
            }
            const st = statusLink(p);
            res.set('Cache-Control', 'no-store');
            res.json({
                success: true,
                url: `${baseLink()}/proposta/${encodeURIComponent(p.codigo)}/${token}`,
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

    async function listarBoxesPublicos() {
        const rows = await dbAll('SELECT * FROM comercial_boxes WHERE ativo = 1 ORDER BY ordem ASC, id ASC');
        const lista = rows.map(r => ({
            id: r.id,
            nome: r.nome,
            tipo: r.tipo,
            url: urlBox(r, 'desktop'),
            mobile_url: urlBox(r, 'mobile'),
            mobile_tipo: r.mobile_tipo || null,
            mobile_modo: r.mobile_modo || 'mesma',
            mobile_proporcao: r.mobile_proporcao || '4:5',
            foco_x: r.foco_x, foco_y: r.foco_y,
            hotspots_desktop: parseJson(r.hotspots_desktop),
            hotspots_mobile: parseJson(r.hotspots_mobile)
        }));
        if (!lista.some(b => b.tipo === 'quadro_evento')) {
            lista.push({ id: 0, nome: 'Quadro de Valores', tipo: 'quadro_evento', mobile_modo: 'mesma', hotspots_desktop: [], hotspots_mobile: [] });
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

        // Endereço de instalação em 2 linhas
        let inst = { linha1: '', linha2: '' };
        const rawEnd = String(p.endereco_instalacao || '').trim();
        if (rawEnd) {
            let match = null;
            if (cliente) {
                const ends = await dbAll('SELECT * FROM enderecos_entrega WHERE cliente_id = ?', [cliente.id]).catch(() => []);
                const en = norm(rawEnd);
                match = ends.find(e => { const rua = norm(e.endereco); return rua && en.includes(rua); }) || null;
            }
            if (match) {
                const j = (a) => a.map(x => String(x || '').trim()).filter(Boolean);
                inst.linha1 = j([match.endereco, match.numero, match.complemento]).join(', ') || rawEnd;
                inst.linha2 = j([match.bairro, j([match.municipio, match.uf]).join('/')]).join(' - ');
            } else {
                const partes = rawEnd.split(/\s+-\s+/);
                inst = partes.length >= 2 ? { linha1: partes[0].trim(), linha2: partes.slice(1).join(' - ').trim() } : { linha1: rawEnd, linha2: '' };
            }
        }

        const equip = await dbAll('SELECT * FROM estoque_equipamentos').catch(() => []);
        const descricaoDe = (it, nomeProd) => {
            if (it.descricao_proposta && String(it.descricao_proposta).trim()) return String(it.descricao_proposta).trim();
            const cod = norm(it.codigo);
            const nm = norm(String(nomeProd || '').replace(/^\d+\s*-\s*/, ''));
            const a = equip.find(eq => (cod && cod !== '—' && norm(eq.codigo) === cod) || (nm && norm(eq.nome) === nm));
            return a ? String(a.descricao_proposta || a.especificacao_tecnica || '').trim() : '';
        };

        const itensRaw = lerJson(p.itens);
        const servRaw = lerJson(p.itens_servicos);
        let somaPorDia = 0, somaTotalGeral = 0;

        const itens = itensRaw.map(it => {
            const qtd = Math.max(1, Number(it.quantidade ?? it.qtde ?? 1) || 1);
            const nome = String(it.produto || it.descricao || it.nome || 'EQUIPAMENTO').replace(/^\d+\s*-\s*/, '').trim();
            const dias = Array.isArray(it.dias_evento) ? it.dias_evento.filter(Boolean) : [];
            const nDiarias = dias.length > 0 ? dias.length : Math.max(1, Number(it.diarias ?? p.dias_contrato ?? 1) || 1);
            const unitLiq = Number(it.valor_unitario ?? it.valor ?? 0) || 0;
            const base = Number(it.valor_base) > 0 ? Number(it.valor_base) : unitLiq;
            const netDia = (it.valor_total !== undefined && !isNaN(parseFloat(it.valor_total))) ? parseFloat(it.valor_total) : unitLiq * qtd;
            const grossDia = base * qtd;
            somaPorDia += netDia;
            somaTotalGeral += netDia * nDiarias;
            return {
                quantidade: qtd, nome, descricao_proposta: descricaoDe(it, nome),
                observacao: String(it.observacao || '').trim().toUpperCase(),
                quant_diarias: nDiarias, unit: base, por_dia: grossDia,
                desconto: Math.max(0, grossDia - netDia) * nDiarias, total: netDia * nDiarias, cortesia: netDia <= 0
            };
        });

        const servicos = servRaw.map(s => {
            const qtd = Math.max(1, Number(s.quantidade ?? 1) || 1);
            const nome = String(s.servico || s.descricao || s.nome || 'SERVIÇO').replace(/^\d+\s*-\s*/, '').trim();
            const unitLiq = Number(s.valor_unitario ?? s.valor ?? 0) || 0;
            const base = Number(s.valor_base) > 0 ? Number(s.valor_base) : unitLiq;
            const net = (s.valor_total !== undefined && !isNaN(parseFloat(s.valor_total))) ? parseFloat(s.valor_total) : unitLiq * qtd;
            const gross = base * qtd;
            somaTotalGeral += net;
            return {
                quantidade: qtd, nome, descricao_proposta: descricaoDe({ codigo: s.codigo }, nome),
                observacao: String(s.observacao || '').trim().toUpperCase(),
                quant_diarias: '—', unit: base, por_dia: gross, desconto: Math.max(0, gross - net), total: net,
                fob: !!s.frete_fob && net <= 0, cortesia: !s.frete_fob && net <= 0
            };
        });

        const ini = fmtDataIso(p.periodo_inicio), fim = fmtDataIso(p.periodo_fim);
        const diarias = (ini && fim) ? (ini === fim ? ini : `${ini} A ${fim}`) : (ini || fim || '—');
        const eventoLike = tipoEhEventoLike(p.tipo);

        return {
            tipo_titulo: tipoLimpo(p.tipo) || 'EVENTO',
            info_rotulo: eventoLike ? 'EVENTO:' : 'DO CONTRATO:',
            ocultar_nome_evento: !eventoLike,
            contrato: String(p.contrato || '').trim() || '—',
            razao_social: cliNomeLimpo || '—',
            cnpj: (cliente && cliente.cpf_cnpj) ? String(cliente.cpf_cnpj).trim() : '—',
            contato_nome: contatoNome || '—',
            contato_celular: celular || '—',
            nome_evento: String(p.nome_evento || '').trim() || '—',
            diarias_contrato: diarias,
            instalacao_linha1: inst.linha1 || 'RUA E NUMERO',
            instalacao_linha2: inst.linha2,
            itens, servicos,
            valor_total_por_dia_geral: somaPorDia,
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
            const p = await dbGet('SELECT * FROM propostas WHERE codigo = ?', [codigo]);
            if (!p || !tokenConfere(token, p.token_publico)) return naoEncontrada();
            const st = statusLink(p);
            if (!st.ativo) return res.status(410).json({ error: 'Este link expirou ou foi desativado. Solicite uma nova proposta.' });

            const [dados, boxes] = await Promise.all([montarDadosQuadro(p), listarBoxesPublicos()]);
            const agora = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString().replace('T', ' ').substring(0, 19);
            db.run('UPDATE propostas SET visualizacoes_publicas = COALESCE(visualizacoes_publicas,0) + 1, ultima_visualizacao_publica = ? WHERE id = ?', [agora, p.id], () => {});
            res.json({ dados, boxes });
        } catch (e) {
            console.error('[PROPOSTA-PUBLICA] Erro:', e.message);
            res.status(500).json({ error: 'Não foi possível carregar a proposta agora.' });
        }
    });

    console.log('[PROPOSTA-PUBLICA] Rotas do link público registradas.');
};
