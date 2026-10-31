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

        // Endereço de instalação em 2 linhas: Linha 1 = Nome do Local, Linha 2 = Rua e Número - Bairro - Cidade
        let inst = { linha1: '', linha2: '' };
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
                if (nomeLocal) {
                    inst.linha1 = nomeLocal;
                    inst.linha2 = endCompleto || rawEnd;
                } else {
                    inst.linha1 = ruaNum || rawEnd;
                    inst.linha2 = bairroCid;
                }
            } else if (prefixoExplicito) {
                inst.linha1 = prefixoExplicito;
                inst.linha2 = rawEnd;
            } else {
                const partes = rawOriginal.split(/\s+-\s+/);
                inst = partes.length >= 2 ? { linha1: partes[0].trim(), linha2: partes.slice(1).join(' - ').trim() } : { linha1: rawOriginal, linha2: '' };
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
        let somaPorDia = 0, somaTotalGeral = 0;

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
            const unitLiq = Number(s.valor_unitario ?? s.valor ?? 0) || 0;
            const base = Number(s.valor_base) > 0 ? Number(s.valor_base) : unitLiq;
            const net = (s.valor_total !== undefined && !isNaN(parseFloat(s.valor_total))) ? parseFloat(s.valor_total) : unitLiq * qtd;
            const gross = base * qtd;
            somaTotalGeral += net;
            return {
                quantidade: qtd, nome, descricao_proposta: descricaoDe({ codigo: s.codigo }, nome),
                link_url: linkDe({ codigo: s.codigo, link_url: s.link_url }, nome),
                observacao: String(s.observacao || '').trim().toUpperCase(),
                quant_diarias: '—', unit: base, por_dia: gross, desconto: Math.max(0, gross - net), total: net,
                fob: !!s.frete_fob && net <= 0, cortesia: !s.frete_fob && net <= 0
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

        return {
            tipo_titulo: tipoLimpo(p.tipo) || 'EVENTO',
            info_rotulo: eventoLike ? 'EVENTO:' : 'DO CONTRATO:',
            ocultar_nome_evento: !eventoLike,
            contrato: numSeq,
            codigo_proposta: numSeq,
            razao_social: cliNomeLimpo || '—',
            cnpj: (cliente && cliente.cpf_cnpj) ? String(cliente.cpf_cnpj).trim() : '—',
            contato_nome: contatoNome || '—',
            contato_celular: celular || '—',
            nome_evento: String(p.nome_evento || '').trim() || '—',
            data_inicio: ini || '—',
            data_fim: fim || ini || '—',
            diarias_contrato: diarias,
            instalacao_linha1: inst.linha1 || 'NOME DO LOCAL',
            instalacao_linha2: inst.linha2,
            resumo_diarias_rodape: resumoDiariasRodape,
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
