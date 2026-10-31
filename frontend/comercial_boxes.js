/* ══════════════════════════════════════════════════════════════════════
   BOXES DE MÍDIA + QUADRO FIXO DA PROPOSTA EVENTO
   - Biblioteca: anexar, renomear, subir/descer, excluir (arquivos no Cloudflare R2)
   - Box Fixo da Proposta Evento (tipo = 'quadro_evento'):
       • Puxa automaticamente os dados da Proposta, Cliente, Contato, Endereço e Cadastro de Equipamentos
       • Pode subir/descer na ordem dos boxes, mas é fixo (não pode ser excluído)
   - Responsivo: cada box define como aparece no CELULAR
   - Áreas clicáveis (hiperlink) em desktop e celular
   ══════════════════════════════════════════════════════════════════════ */
(function () {
    const esc = (s) => String(s === undefined || s === null ? '' : s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    const tok = () => window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token') || '';
    const MAX_MB = 120;
    const MODOS_MOBILE = [
        { v: 'mesma', t: 'Usar a mesma mídia (largura total, altura proporcional)' },
        { v: 'arquivo', t: 'Usar outra imagem/vídeo só para o celular' },
        { v: 'recorte', t: 'Recortar / enquadrar a mídia (proporção + ponto de foco)' },
        { v: 'ocultar', t: 'Não mostrar este box no celular' }
    ];
    const PROPORCOES = ['1:1', '4:5', '3:4', '9:16', '16:9', '3:2'];
    const ROTULO_MODO = { mesma: 'Celular: mesma mídia', arquivo: 'Celular: mídia própria', recorte: 'Celular: recortada', ocultar: 'Celular: oculto' };

    const fmtNum = (n) => Number(n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const fmtDataIso = (d) => {
        const s = String(d || '').trim();
        if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s.split('-').reverse().join('/');
        return s;
    };
    const norm = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

    /* Cache leve de clientes, contatos, endereços e equipamentos para enriquecer o Quadro Fixo */
    window._boxCacheDadosAux = { carregado: false, clientes: [], contatos: [], enderecos: [], equipamentos: [], propostasEvento: [] };
    window._boxPropostaPreviewId = 'auto';

    window.carregarCacheDadosQuadroEvento = async function (forcar) {
        const c = window._boxCacheDadosAux;
        if (c.carregado && !forcar) return c;
        try {
            const [clientes, contatos, enderecos, equipamentos, propostas] = await Promise.all([
                typeof apiGet === 'function' ? apiGet('/clientes').catch(() => []) : [],
                typeof apiGet === 'function' ? apiGet('/contatos').catch(() => []) : [],
                typeof apiGet === 'function' ? apiGet('/enderecos-entrega').catch(() => []) : [],
                typeof apiGet === 'function' ? apiGet('/estoque-equipamentos').catch(() => []) : [],
                typeof apiGet === 'function' ? apiGet('/propostas').catch(() => []) : []
            ]);
            c.clientes = Array.isArray(clientes) ? clientes : [];
            c.contatos = Array.isArray(contatos) ? contatos : [];
            c.enderecos = Array.isArray(enderecos) ? enderecos : [];
            c.equipamentos = Array.isArray(equipamentos) ? equipamentos : [];
            c.propostasEvento = (Array.isArray(propostas) ? propostas : []).filter(p =>
                norm(String(p.tipo || '').replace(/^proposta\s+/i, '')) === 'evento'
            );
            c.carregado = true;
        } catch (e) {
            console.warn('[BOXES] Aviso ao carregar cache auxiliar:', e);
        }
        return c;
    };

    /* Busca a "Descrição para Proposta" no cadastro do equipamento pelo código ou nome */
    window.obterDescricaoPropostaEquipamento = function (itemOuProd) {
        if (!itemOuProd) return '';
        if (itemOuProd.descricao_proposta && String(itemOuProd.descricao_proposta).trim()) {
            return String(itemOuProd.descricao_proposta).trim();
        }
        const lista = (window._boxCacheDadosAux && window._boxCacheDadosAux.equipamentos.length)
            ? window._boxCacheDadosAux.equipamentos
            : (window._equipamentosEstoqueData || []);
        const cod = norm(itemOuProd.codigo);
        const nome = norm(String(itemOuProd.produto || itemOuProd.descricao || itemOuProd.nome || '').replace(/^\d+\s*-\s*/, ''));
        const achado = lista.find(eq =>
            (cod && cod !== '—' && norm(eq.codigo) === cod) ||
            (nome && norm(eq.nome) === nome)
        );
        if (!achado) return '';
        return String(achado.descricao_proposta || achado.especificacao_tecnica || '').trim();
    };

    /* Busca a Foto do Equipamento no cadastro pelo código ou nome */
    window.obterFotoPropostaEquipamento = function (itemOuProd) {
        if (!itemOuProd) return '';
        if (itemOuProd.foto_url && String(itemOuProd.foto_url).trim()) {
            return String(itemOuProd.foto_url).trim();
        }
        const lista = (window._boxCacheDadosAux && window._boxCacheDadosAux.equipamentos.length)
            ? window._boxCacheDadosAux.equipamentos
            : (window._equipamentosEstoqueData || []);
        const cod = norm(itemOuProd.codigo);
        const nome = norm(String(itemOuProd.produto || itemOuProd.descricao || itemOuProd.nome || '').replace(/^\d+\s*-\s*/, ''));
        const achado = lista.find(eq =>
            (cod && cod !== '—' && norm(eq.codigo) === cod) ||
            (nome && norm(eq.nome) === nome)
        );
        if (!achado) return '';
        if (achado.foto_url && String(achado.foto_url).trim()) return String(achado.foto_url).trim();
        if (achado.r2_key && achado.id) return '/api/public/equipamento-foto/' + achado.id;
        return '';
    };

    /* Busca o Link do Equipamento no cadastro pelo código ou nome */
    window.obterLinkPropostaEquipamento = function (itemOuProd) {
        const normalizarUrl = (u) => {
            const raw = String(u || '').trim();
            if (!raw) return '';
            if (/^https?:\/\//i.test(raw) || raw.startsWith('/')) return raw;
            return 'https://' + raw;
        };
        if (!itemOuProd) return '';
        if (itemOuProd.link_url && String(itemOuProd.link_url).trim()) {
            return normalizarUrl(itemOuProd.link_url);
        }
        const lista = (window._boxCacheDadosAux && window._boxCacheDadosAux.equipamentos.length)
            ? window._boxCacheDadosAux.equipamentos
            : (window._equipamentosEstoqueData || []);
        const cod = norm(itemOuProd.codigo);
        const nome = norm(String(itemOuProd.produto || itemOuProd.descricao || itemOuProd.nome || '').replace(/^\d+\s*-\s*/, ''));
        const achado = lista.find(eq =>
            (cod && cod !== '—' && norm(eq.codigo) === cod) ||
            (nome && norm(eq.nome) === nome)
        );
        if (!achado || !achado.link_url) return '';
        return normalizarUrl(achado.link_url);
    };

    function formatarNumeroPropostaSequencial(codigoRaw, contratoRaw, idRaw) {
        const cand = String(codigoRaw || '').trim();
        if (/^\d+$/.test(cand)) return String(parseInt(cand, 10)).padStart(2, '0');
        const mPr = cand.match(/^(?:PR|CT)\d{4}\/?0*(\d+)$/i);
        if (mPr) return String(parseInt(mPr[1], 10)).padStart(2, '0');
        const cont = String(contratoRaw || '').trim();
        const mCt = cont.match(/^(?:PR|CT)\d{4}\/?0*(\d+)$/i);
        if (mCt) return String(parseInt(mCt[1], 10)).padStart(2, '0');
        if (idRaw && /^\d+$/.test(String(idRaw))) return String(parseInt(idRaw, 10)).padStart(2, '0');
        return (cand && cand.toUpperCase() !== 'AUTO') ? cand : '01';
    }

    function gerarDatasIntervaloIsoBox(iniIso, fimIso) {
        const ini = String(iniIso || '').trim().slice(0, 10);
        const fim = String(fimIso || '').trim().slice(0, 10);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(ini) || !/^\d{4}-\d{2}-\d{2}$/.test(fim) || ini > fim) return [];
        const out = [];
        const cur = new Date(ini + 'T12:00:00Z');
        const end = new Date(fim + 'T12:00:00Z');
        let guard = 0;
        while (cur <= end && guard < 730) {
            out.push(cur.toISOString().slice(0, 10));
            cur.setUTCDate(cur.getUTCDate() + 1);
            guard++;
        }
        return out;
    }

    function calcularResumoDiariasRodape(proposta, itensRaw) {
        const datasSet = new Set();
        let flagManutDiaria = Boolean(proposta && proposta.manutencao_diaria);
        const extrairDataIso = (entry) => {
            if (!entry) return '';
            if (typeof entry === 'object') return String(entry.data || entry.dia || '').trim().slice(0, 10);
            return String(entry).trim().split(/[\sT]+/)[0].slice(0, 10);
        };
        (Array.isArray(itensRaw) ? itensRaw : []).forEach(it => {
            if (it && it.manutencao_diaria) flagManutDiaria = true;
            const arr = Array.isArray(it && it.dias_evento) ? it.dias_evento : [];
            arr.forEach(d => {
                const iso = extrairDataIso(d);
                if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) datasSet.add(iso);
            });
        });
        if (datasSet.size === 0 && proposta && proposta.dias_evento) {
            let arrProp = [];
            if (Array.isArray(proposta.dias_evento)) arrProp = proposta.dias_evento;
            else {
                try {
                    const p = JSON.parse(proposta.dias_evento);
                    arrProp = Array.isArray(p) ? p : String(proposta.dias_evento).split(',');
                } catch (e) {
                    arrProp = String(proposta.dias_evento).split(',');
                }
            }
            arrProp.forEach(d => {
                const iso = extrairDataIso(d);
                if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) datasSet.add(iso);
            });
        }
        const datasOrdenadas = [...datasSet].sort();
        if (proposta && proposta.periodo_inicio && proposta.periodo_fim && datasOrdenadas.length > 0) {
            const todasPeriodo = gerarDatasIntervaloIsoBox(proposta.periodo_inicio, proposta.periodo_fim);
            if (todasPeriodo.length > 0 && todasPeriodo.length === datasOrdenadas.length && todasPeriodo.every((d, i) => datasOrdenadas[i] === d)) {
                flagManutDiaria = true;
            }
        }
        if (flagManutDiaria) return 'MANUTENÇÃO DIÁRIA';
        if (datasOrdenadas.length === 0) return '';
        return datasOrdenadas.map(iso => fmtDataIso(iso)).join(', ');
    }

    function formatarDiasEventoProdutoCurto(it, proposta) {
        let diasArr = Array.isArray(it && it.dias_evento) ? it.dias_evento.filter(Boolean) : [];
        if (diasArr.length === 0 && proposta && proposta.dias_evento) {
            if (Array.isArray(proposta.dias_evento)) diasArr = proposta.dias_evento.filter(Boolean);
            else {
                try {
                    const p = JSON.parse(proposta.dias_evento);
                    diasArr = Array.isArray(p) ? p.filter(Boolean) : String(proposta.dias_evento).split(',');
                } catch (e) {
                    diasArr = String(proposta.dias_evento).split(',');
                }
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
    }

    /* Separa endereço de instalação em Linha 1 (Nome do Local) e Linha 2 (Rua e Número - Bairro - Cidade) */
    function formatarInstalacaoDuasLinhas(proposta, clienteObj) {
        const rawOriginal = String(proposta.endereco_instalacao || '').trim();
        const mPrefixo = rawOriginal.match(/^\s*(ENDERE[ÇC]O\s+(?:DE\s+)?(?:FATURAMENTO|ENTREGA|INSTALA[ÇC][ÃA]O|COBRAN[ÇC]A|COMERCIAL)|MATRIZ|FILIAL)\s*[-:–]\s*(.*)$/i);
        const prefixoExplicito = mPrefixo ? String(mPrefixo[1] || '').trim().toUpperCase() : '';
        const rawEnd = (mPrefixo ? String(mPrefixo[2] || '') : rawOriginal).trim();

        const c = window._boxCacheDadosAux;
        if ((rawEnd || rawOriginal) && c && Array.isArray(c.enderecos) && c.enderecos.length) {
            const cliId = clienteObj ? Number(clienteObj.id) : 0;
            const candidatos = cliId ? c.enderecos.filter(e => Number(e.cliente_id) === cliId) : c.enderecos;
            const endNorm = norm(rawEnd || rawOriginal);
            const match = candidatos.find(e => {
                const rua = norm(e.endereco);
                return rua && endNorm.includes(rua);
            });
            if (match) {
                const nomeLocal = String(match.nome_local || prefixoExplicito || '').trim();
                const ruaNum = [match.endereco, match.numero, match.complemento].map(x => String(x || '').trim()).filter(Boolean).join(', ');
                const bairroCid = [match.bairro, [match.municipio, match.uf].filter(Boolean).join('/')].map(x => String(x || '').trim()).filter(Boolean).join(' - ');
                const endCompleto = [ruaNum, bairroCid].filter(Boolean).join(' - ');
                if (nomeLocal) {
                    return { linha1: nomeLocal, linha2: endCompleto || rawEnd };
                }
                return { linha1: ruaNum || rawEnd, linha2: bairroCid };
            }
        }
        if (!rawOriginal) {
            return { linha1: 'NOME DO LOCAL', linha2: 'RUA E NUMERO - BAIRRO - CIDADE' };
        }
        if (prefixoExplicito) {
            return { linha1: prefixoExplicito, linha2: rawEnd };
        }
        const partesTraco = rawOriginal.split(/\s+-\s+/);
        if (partesTraco.length >= 2) {
            return {
                linha1: partesTraco[0].trim(),
                linha2: partesTraco.slice(1).join(' - ').trim()
            };
        }
        return { linha1: rawOriginal, linha2: '' };
    }

    /* Monta todos os dados estruturados para o Quadro Fixo da Proposta Evento */
    function lerServicosProposta(raw) {
        if (typeof window._parseServicosProposta === 'function') return window._parseServicosProposta(raw);
        if (Array.isArray(raw)) return raw;
        try { const v = JSON.parse(raw || '[]'); return Array.isArray(v) ? v : []; } catch (e) { return []; }
    }

    window.montarDadosQuadroEventoProposta = function (propostaExplicita) {
        const c = window._boxCacheDadosAux || { clientes: [], contatos: [], enderecos: [], equipamentos: [], propostasEvento: [] };

        let prop = propostaExplicita || null;
        if (!prop && window._boxPropostaPreviewId && window._boxPropostaPreviewId !== 'auto' && window._boxPropostaPreviewId !== 'exemplo') {
            prop = (c.propostasEvento || []).find(p => String(p.id) === String(window._boxPropostaPreviewId)) || null;
        }
        if (!prop && window._boxPropostaPreviewId !== 'exemplo') {
            const tipoForm = document.getElementById('prop-tipo')?.value || '';
            const cliForm = document.getElementById('prop-cliente')?.value || '';
            if (norm(String(tipoForm).replace(/^proposta\s+/i, '')) === 'evento' && (cliForm || (window._propProdutosAdicionados && window._propProdutosAdicionados.length))) {
                let contratoLive = '';
                try {
                    if (typeof _propostasEditandoId !== 'undefined' && _propostasEditandoId && typeof _propostasData !== 'undefined') {
                        const pp = _propostasData.find(x => x.id === _propostasEditandoId);
                        contratoLive = (pp && pp.contrato) || '';
                    }
                } catch (e) {}
                prop = {
                    id: (typeof _propostasEditandoId !== 'undefined' && _propostasEditandoId) ? _propostasEditandoId : null,
                    codigo: document.getElementById('prop-codigo')?.value || 'AUTO',
                    contrato: contratoLive,
                    cliente_nome: cliForm,
                    contato_nome: document.getElementById('prop-contato')?.value || '',
                    nome_evento: document.getElementById('prop-nome-evento')?.value || '',
                    periodo_inicio: document.getElementById('prop-periodo-ini')?.value || '',
                    periodo_fim: document.getElementById('prop-periodo-fim')?.value || '',
                    dias_contrato: document.getElementById('prop-dias')?.value || 0,
                    endereco_instalacao: document.getElementById('prop-endereco')?.value || '',
                    manutencao_diaria: Boolean(document.getElementById('prop-dias-manut-diarias')?.checked),
                    itens: window._propProdutosAdicionados || [],
                    itens_servicos: window._propServicosAdicionados || []
                };
            }
        }

        if (!prop) {
            const descDemo = 'Descrição de Produtos aqui, o texto pode ser grande. Descrição de Produtos aqui, o texto pode ser grande e deve quebrar a linha ao final da linha pontilhada';
            const obsDemo = 'OBSERVAÇÃO TAMBÉM PODE SER GRANDE E DEVE ESTAR EM CAIXA ALTA';
            return {
                contrato: '01',
                codigo_proposta: '01',
                razao_social: 'RAZÃO SOCIAL',
                cnpj: 'CNPJ AQUI',
                contato_nome: 'NOME DO CONTATO',
                contato_celular: 'NUMERO DO CONTATO',
                nome_evento: 'NOME DO EVENTO',
                data_inicio: 'DD/MM/AA',
                data_fim: 'DD/MM/AA',
                diarias_contrato: 'DIÁRIAS DE CONTRATO',
                instalacao_linha1: 'NOME DO LOCAL',
                instalacao_linha2: 'RUA E NUMERO - BAIRRO - CIDADE',
                resumo_diarias_rodape: 'MANUTENÇÃO DIÁRIA',
                itens: [
                    { quantidade: 5, nome: 'BANHEIRO QUÍMICO STANDARD 002XZV', descricao_proposta: descDemo, link_url: 'https://www.americarental.com.br', observacao: obsDemo, dias_evento_texto: '02/11, 03/11, 04/11, 05/11, 06/11', quant_diarias: 5, unit: 100, por_dia: 500, desconto: 0, total: 2500 },
                    { quantidade: 5, nome: 'BANHEIRO QUÍMICO STANDARD 002XZV', descricao_proposta: descDemo, link_url: 'https://www.americarental.com.br', observacao: obsDemo, dias_evento_texto: '02/11, 03/11, 04/11, 05/11, 06/11, 07/11', quant_diarias: 6, unit: 100, por_dia: 500, desconto: 300, total: 2700 },
                    { quantidade: 2, nome: 'LAVATÓRIO PORTÁTIL', descricao_proposta: descDemo, link_url: '', observacao: '', dias_evento_texto: '02/11, 03/11, 04/11, 05/11, 06/11', quant_diarias: 5, unit: 0, por_dia: 0, desconto: 0, total: 0, cortesia: true }
                ],
                servicos: [
                    { quantidade: 1, nome: 'LIMPEZA DURANTE O EVENTO', descricao_proposta: '', observacao: '', quant_diarias: '—', unit: 350, por_dia: 350, desconto: 50, total: 300 }
                ],
                valor_total_por_dia_geral: 1000,
                valor_total_geral: 5500
            };
        }

        const cliNomeLimpo = String(prop.cliente_nome || '').replace(/^[\u2600-\u27BF\uD83C-\uDBFF\uDC00-\uDFFF]+\s*/, '').trim();
        const cliNorm = norm(cliNomeLimpo);
        const clienteObj = (c.clientes || []).find(cl =>
            norm(cl.nome_razao_social) === cliNorm || norm(cl.nome_fantasia) === cliNorm
        ) || null;

        const cnpj = (clienteObj && clienteObj.cpf_cnpj) ? String(clienteObj.cpf_cnpj).trim() : (prop.cliente_cnpj || '—');
        const contatoNome = String(prop.contato_nome || '').trim();
        let celularContato = prop.contato_celular || prop.contato_telefone || '';
        if (!celularContato && contatoNome && Array.isArray(c.contatos)) {
            const contNorm = norm(contatoNome);
            const contObj = c.contatos.find(ct =>
                norm(ct.nome || ct.nome_contato) === contNorm &&
                (!clienteObj || Number(ct.cliente_id) === Number(clienteObj.id) || norm(ct.cliente_nome) === cliNorm)
            ) || c.contatos.find(ct => norm(ct.nome || ct.nome_contato) === contNorm);
            if (contObj) celularContato = String(contObj.celular || contObj.telefone || contObj.whatsapp || '').trim();
        }
        if (!celularContato && clienteObj) celularContato = String(clienteObj.celular || clienteObj.telefone || '').trim();

        const iniFmt = fmtDataIso(prop.periodo_inicio);
        const fimFmt = fmtDataIso(prop.periodo_fim);
        let diariasContrato = '';
        if (iniFmt && fimFmt) diariasContrato = iniFmt === fimFmt ? iniFmt : iniFmt + ' A ' + fimFmt;
        else diariasContrato = iniFmt || fimFmt || '—';

        const inst = formatarInstalacaoDuasLinhas(prop, clienteObj);

        let itensRaw = [];
        if (Array.isArray(prop.itens)) itensRaw = prop.itens;
        else if (prop.itens) { try { itensRaw = JSON.parse(prop.itens); } catch (e) { itensRaw = []; } }
        const servicosRaw = lerServicosProposta(prop.itens_servicos);

        let somaPorDia = 0;
        let somaTotalGeral = 0;

        const itensFormatados = (itensRaw || []).map(it => {
            const qtd = Math.max(1, Number(it.quantidade ?? it.qtde ?? 1) || 1);
            const nomeProd = String(it.produto || it.descricao || it.nome || 'EQUIPAMENTO').replace(/^\d+\s*-\s*/, '').trim();
            const diasArr = Array.isArray(it.dias_evento) ? it.dias_evento.filter(Boolean) : [];
            const nDiarias = diasArr.length > 0 ? diasArr.length : Math.max(1, Number(it.diarias ?? prop.dias_contrato ?? 1) || 1);
            const unitLiq = Number(it.valor_unitario ?? it.valor ?? 0) || 0;
            const base = Number(it.valor_base) > 0 ? Number(it.valor_base) : unitLiq;
            const netDia = (it.valor_total !== undefined && !isNaN(parseFloat(it.valor_total))) ? parseFloat(it.valor_total) : unitLiq * qtd;
            const grossDia = base * qtd;
            const descDia = Math.max(0, grossDia - netDia);
            somaPorDia += netDia;
            somaTotalGeral += netDia * nDiarias;
            return {
                quantidade: qtd,
                nome: nomeProd,
                descricao_proposta: window.obterDescricaoPropostaEquipamento(it),
                foto_url: window.obterFotoPropostaEquipamento(it),
                link_url: window.obterLinkPropostaEquipamento(it),
                observacao: String(it.observacao || '').trim().toUpperCase(),
                dias_evento_texto: formatarDiasEventoProdutoCurto(it, prop),
                quant_diarias: nDiarias,
                unit: base,
                por_dia: grossDia,
                desconto: descDia * nDiarias,
                total: netDia * nDiarias,
                cortesia: netDia <= 0
            };
        });

        const servicosFormatados = (servicosRaw || []).map(s => {
            const qtd = Math.max(1, Number(s.quantidade ?? 1) || 1);
            const nomeServ = String(s.servico || s.descricao || s.nome || 'SERVIÇO').replace(/^\d+\s*-\s*/, '').trim();
            const isFob = !!s.frete_fob;
            const unitLiq = isFob ? 0 : (Number(s.valor_unitario ?? s.valor ?? 0) || 0);
            const base = isFob ? 0 : (Number(s.valor_base) > 0 ? Number(s.valor_base) : unitLiq);
            const net = isFob ? 0 : ((s.valor_total !== undefined && !isNaN(parseFloat(s.valor_total))) ? parseFloat(s.valor_total) : unitLiq * qtd);
            const gross = isFob ? 0 : (base * qtd);
            if (!isFob) somaTotalGeral += net;
            return {
                quantidade: qtd,
                nome: nomeServ,
                descricao_proposta: window.obterDescricaoPropostaEquipamento({ codigo: s.codigo, produto: nomeServ }),
                link_url: window.obterLinkPropostaEquipamento({ codigo: s.codigo, produto: nomeServ, link_url: s.link_url }),
                observacao: String(s.observacao || '').trim().toUpperCase(),
                quant_diarias: '—',
                unit: base,
                por_dia: gross,
                desconto: isFob ? 0 : Math.max(0, gross - net),
                total: net,
                fob: isFob,
                cortesia: !isFob && net <= 0
            };
        });

        const numSeq = formatarNumeroPropostaSequencial(prop.codigo, prop.contrato, prop.id);
        const resumoDiariasRodape = calcularResumoDiariasRodape(prop, itensRaw);

        return {
            contrato: numSeq,
            codigo_proposta: numSeq,
            razao_social: cliNomeLimpo || prop.cliente_razao || '—',
            cnpj: cnpj || '—',
            contato_nome: contatoNome || '—',
            contato_celular: celularContato || '—',
            nome_evento: String(prop.nome_evento || '').trim() || '—',
            data_inicio: iniFmt || '—',
            data_fim: fimFmt || iniFmt || '—',
            diarias_contrato: diariasContrato,
            instalacao_linha1: inst.linha1,
            instalacao_linha2: inst.linha2,
            resumo_diarias_rodape: resumoDiariasRodape,
            itens: itensFormatados,
            servicos: servicosFormatados,
            valor_total_por_dia_geral: somaPorDia,
            valor_total_geral: somaTotalGeral
        };
    };

    /* Renderiza o quadro em WIDESCREEN (16:9 no mínimo). O desenho é feito numa tela de 1920 px e escalado
       por unidades cqw, então Desktop e Celular ficam IDÊNTICOS. Conforme entram produtos/serviços a altura
       cresce (a proposta continua rolando para baixo até o final do conteúdo, sem cortes).
       Fontes: Franklin Gothic Book (texto) e Franklin Gothic Demi (destaques). */
    window.renderBoxQuadroEventoHtml = function (dadosCustom, view) {
        const d = (dadosCustom && dadosCustom.itens) ? dadosCustom : window.montarDadosQuadroEventoProposta(dadosCustom);
        const u = (px) => (px / 19.2).toFixed(4) + 'cqw';
        const ROXO = '#5c4599';
        const COLS = u(135) + ' 1fr ' + u(110) + ' ' + u(190) + ' ' + u(165) + ' ' + u(140) + ' ' + u(220);
        const GAP = u(10);

        const celula = (it, valor, cor) => it.fob
            ? '<span class="bq-d" style="font-size:' + u(22) + '; color:' + ROXO + '; letter-spacing:0.04em;">FOB</span>'
            : (it.cortesia
                ? '<span class="bq-d" style="font-size:' + u(22) + '; color:' + ROXO + '; letter-spacing:0.04em;">CORTESIA</span>'
                : '<span style="color:' + cor + ';">' + fmtNum(valor) + '</span>');

        const cabecalhoColunas = (titulo) => `
            <div style="display:grid; grid-template-columns:${COLS}; column-gap:${GAP}; align-items:end; margin-bottom:${u(16)};">
                <div></div>
                <div style="font-size:${u(40)}; color:#3b3b3b; display:flex; align-items:center; gap:${u(10)};">
                    <span style="color:${ROXO}; font-size:${u(24)};">&#9656;</span> ${titulo}
                </div>
                <div class="bq-d" style="text-align:center; font-size:${u(18)}; color:#3b3b3b; line-height:1.2;">QUANT.<br>DIÁRIAS</div>
                <div class="bq-d" style="text-align:center; font-size:${u(18)}; color:#3b3b3b; line-height:1.2;">VALOR UNITÁRIO<br>POR DIÁRIA R$</div>
                <div class="bq-d" style="text-align:center; font-size:${u(18)}; color:#3b3b3b; line-height:1.2;">VALOR TOTAL<br>POR DIA R$</div>
                <div class="bq-d" style="text-align:center; font-size:${u(18)}; color:#3b3b3b; line-height:1.2;">DESCONTO<br>R$</div>
                <div class="bq-d" style="text-align:center; font-size:${u(18)}; color:${ROXO}; line-height:1.2;">VALOR<br>TOTAL R$</div>
            </div>`;

        const svgChainLink = `<svg viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" style="width:${u(20)}; height:${u(20)}; display:block;"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`;
        const iconeLinkItem = (it) => {
            const rawUrl = String(it.link_url || '').trim();
            const urlHref = rawUrl ? (/^https?:\/\//i.test(rawUrl) || rawUrl.startsWith('/') ? rawUrl : 'https://' + rawUrl) : '';
            const baseStyle = `width:${u(36)}; height:${u(36)}; border-radius:50%; display:inline-flex; align-items:center; justify-content:center; flex-shrink:0; text-decoration:none; box-sizing:border-box;`;
            if (urlHref) {
                return `<a href="${esc(urlHref)}" target="_blank" rel="noopener noreferrer" title="Abrir link do equipamento" onclick="event.stopPropagation();" style="${baseStyle} background:${ROXO}; cursor:pointer;">${svgChainLink}</a>`;
            }
            return `<span style="${baseStyle} background:#9ca3af; cursor:default; pointer-events:none;">${svgChainLink}</span>`;
        };

        const linhaItem = (it) => `
            <div style="display:grid; grid-template-columns:${COLS}; column-gap:${GAP}; align-items:center; margin-bottom:${u(26)};">
                <div style="display:flex; align-items:center; justify-content:center; width:${u(125)}; min-height:${u(84)};">
                    ${it.foto_url ? `<img src="${esc(it.foto_url)}" alt="${esc(it.nome)}" style="max-width:${u(120)}; max-height:${u(120)}; width:auto; height:auto; object-fit:contain; display:block;" onerror="this.style.display='none'">` : ''}
                </div>
                <div style="min-width:0; padding-right:${u(20)}; align-self:start;">
                    <div style="display:flex; align-items:center; gap:${u(12)}; width:100%;">
                        <span class="bq-d" style="font-size:${u(26)}; color:#3b3b3b; text-transform:uppercase; display:inline-flex; align-items:center; gap:${u(10)};"><span>${esc(it.quantidade)}</span>${iconeLinkItem(it)}<span>${esc(it.nome)}</span></span>
                        <span style="flex:1; align-self:baseline; border-bottom:${u(3)} dotted #4b5563; min-width:${u(30)}; transform:translateY(-${u(6)});"></span>
                    </div>
                    ${it.descricao_proposta ? `<div style="font-size:${u(24)}; color:#4b5563; line-height:1.3; margin-top:${u(8)}; word-break:break-word;">${esc(it.descricao_proposta)}</div>` : ''}
                    ${it.observacao ? `<div style="font-size:${u(24)}; color:#3b3b3b; line-height:1.3; margin-top:${u(2)}; word-break:break-word;">Obs. se houver: ${esc(String(it.observacao).toUpperCase())}</div>` : ''}
                    ${it.dias_evento_texto ? `<div style="font-size:${u(24)}; color:#3b3b3b; line-height:1.3; margin-top:${u(2)}; word-break:break-word;">Dia de Evento / Sucção: ${esc(it.dias_evento_texto)}</div>` : ''}
                </div>
                <div class="bq-d" style="text-align:center; font-size:${u(26)}; color:#3b3b3b; align-self:start;">${esc(it.quant_diarias)}</div>
                <div class="bq-d" style="text-align:center; font-size:${u(26)}; align-self:start;">${celula(it, it.unit, '#3b3b3b')}</div>
                <div class="bq-d" style="text-align:center; font-size:${u(26)}; align-self:start;">${celula(it, it.por_dia, '#3b3b3b')}</div>
                <div class="bq-d" style="text-align:center; font-size:${u(26)}; color:#3b3b3b; align-self:start;">${(it.cortesia || it.fob || !(Number(it.desconto) > 0)) ? '—' : fmtNum(it.desconto)}</div>
                <div class="bq-d" style="text-align:center; font-size:${u(26)}; align-self:start;">${celula(it, it.total, ROXO)}</div>
            </div>`;

        const itensHtml = (d.itens && d.itens.length > 0)
            ? d.itens.map(linhaItem).join('')
            : `<div style="padding:${u(24)}; text-align:center; color:#94a3b8; font-size:${u(24)}; border:${u(2)} dashed #cbd5e1; border-radius:${u(10)}; margin-bottom:${u(20)};">Nenhum equipamento adicionado nesta proposta ainda.</div>`;

        const secaoServicos = (d.servicos && d.servicos.length > 0) ? `
            <div style="padding:${u(10)} ${u(60)} ${u(10)} ${u(50)};">
                ${cabecalhoColunas('SERVIÇOS:')}
                ${d.servicos.map(linhaItem).join('')}
            </div>` : '';

        return `
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Libre+Franklin:wght@400;600&display=swap');
            @font-face { font-family:'FGBook'; src:local('Franklin Gothic Book'), local('FranklinGothic-Book'), local('FRABK'); font-weight:400; font-style:normal; }
            @font-face { font-family:'FGDemi'; src:local('Franklin Gothic Demi'), local('FranklinGothic-Demi'), local('FRADM'); font-weight:600; font-style:normal; }
            .box-quadro-evento-proposta { font-family:'FGBook','Libre Franklin','Franklin Gothic Book',Arial,Helvetica,sans-serif; font-weight:400; }
            .box-quadro-evento-proposta .bq-d { font-family:'FGDemi','Libre Franklin','Franklin Gothic Demi',Arial,Helvetica,sans-serif; font-weight:600; }
        </style>
        <div class="box-quadro-evento-proposta" style="container-type:inline-size; width:100%; background:#fff; color:#1e293b; box-sizing:border-box; line-height:1.35;">
            <div style="width:100%; min-height:56.25cqw; display:flex; flex-direction:column; box-sizing:border-box;">
                <!-- Faixa superior: PROPOSTA EVENTO + número sequencial da proposta -->
                <div style="margin-left:${u(122)}; border-left:${u(3)} solid ${ROXO}; border-bottom:${u(3)} solid ${ROXO}; height:${u(88)}; padding:0 ${u(60)} 0 ${u(48)}; display:flex; justify-content:space-between; align-items:center; box-sizing:border-box; flex-shrink:0;">
                    <div style="font-size:${u(33)}; letter-spacing:0.02em; color:#333;">PROPOSTA <span class="bq-d">${esc(d.tipo_titulo || 'EVENTO')}</span></div>
                    <div class="bq-d" style="font-size:${u(42)}; color:${ROXO};">${esc(d.codigo_proposta || d.contrato)}</div>
                </div>

                <!-- Bloco logo + dados do cliente + informações do evento -->
                <div style="margin-left:${u(122)}; display:flex; align-items:stretch; box-shadow:0 ${u(10)} ${u(14)} -${u(10)} rgba(15,23,42,0.18); flex-shrink:0;">
                    <div style="background:${ROXO}; width:${u(426)}; height:${u(256)}; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                        <img src="/assets/logo-quadro-evento.png" alt="América Rental desde 1999" style="height:${u(224)}; width:auto; display:block;">
                    </div>
                    <div style="flex:1; display:grid; grid-template-columns:0.78fr 1.22fr; column-gap:${u(32)}; padding:${u(24)} ${u(44)} ${u(18)} ${u(64)}; align-items:start; min-width:0;">
                        <div style="min-width:0;">
                            <div style="font-size:${u(31)}; color:#333; display:flex; align-items:center; gap:${u(8)}; white-space:nowrap;">
                                <span style="color:${ROXO}; font-size:${u(22)};">&#9656;</span>
                                <span>DADOS DO <span class="bq-d">CLIENTE:</span></span>
                            </div>
                            <div style="font-size:${u(20.5)}; color:#333; line-height:1.58; margin-top:${u(14)}; word-break:break-word;">
                                <div class="bq-d" style="text-transform:uppercase; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-bottom:${u(4)};">${esc(d.razao_social)}</div>
                                <div>CNPJ: <span class="bq-d">${esc(d.cnpj)}</span></div>
                                <div style="text-transform:uppercase; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">CONTATO: <span class="bq-d">${esc(d.contato_nome)}</span></div>
                                <div>CEL.: <span class="bq-d">${esc(d.contato_celular)}</span></div>
                            </div>
                        </div>
                        <div style="min-width:0; overflow:hidden;">
                            <div style="font-size:${u(31)}; color:#333; display:flex; align-items:center; gap:${u(8)}; white-space:nowrap;">
                                <span style="color:${ROXO}; font-size:${u(22)};">&#9656;</span>
                                <span>INFORMAÇÕES <span class="bq-d">${esc(d.info_rotulo || 'EVENTO:')}</span></span>
                            </div>
                            <div style="font-size:${u(20.5)}; color:#333; line-height:1.45; margin-top:${u(14)};">
                                ${d.ocultar_nome_evento ? '' : `<div class="bq-d" style="text-transform:uppercase; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-bottom:${u(4)};">${esc(d.nome_evento)}</div>`}
                                <div style="text-transform:uppercase;">INÍCIO: <span class="bq-d">${esc(d.data_inicio || '—')}</span></div>
                                <div style="text-transform:uppercase; margin-bottom:${u(6)};">FIM: <span class="bq-d">${esc(d.data_fim || '—')}</span></div>
                                <div style="text-transform:uppercase; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${esc(d.instalacao_linha1)}">INSTALAÇÃO: <span class="bq-d">${esc(d.instalacao_linha1)}</span></div>
                                ${d.instalacao_linha2 ? `<div style="font-size:${u(16.5)}; color:#444; text-transform:uppercase; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; line-height:1.35;" title="${esc(d.instalacao_linha2)}">${esc(d.instalacao_linha2)}</div>` : ''}
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Equipamentos e Serviços (a altura cresce até o final do conteúdo) -->
                <div style="flex:1 0 auto;">
                    <div style="padding:${u(34)} ${u(60)} ${u(10)} ${u(50)};">
                        ${cabecalhoColunas('EQUIPAMENTOS:')}
                        ${itensHtml}
                    </div>
                    ${secaoServicos}
                </div>

                <!-- Totais (sem faixa preta): apenas valor total em roxo abaixo da coluna VALOR TOTAL -->
                <div style="padding:${u(6)} ${u(60)} ${u(46)} ${u(50)}; flex-shrink:0;">
                    <div style="display:grid; grid-template-columns:${COLS}; column-gap:${GAP}; align-items:baseline; margin-top:${u(14)}; padding-top:${u(16)}; border-top:${u(2)} solid #d1d5db;">
                        <div class="bq-d" style="grid-column:1 / 7; text-align:right; font-size:${u(36)}; color:#3b3b3b;">VALOR TOTAL: R$</div>
                        <div class="bq-d" style="text-align:center; font-size:${u(38)}; color:${ROXO};">${fmtNum(d.valor_total_geral)}</div>
                    </div>
                </div>
            </div>
        </div>`;
    };

    async function chamar(metodo, url, body) {
        const headers = { 'Authorization': 'Bearer ' + tok() };
        const opts = { method: metodo, headers };
        if (body instanceof FormData) opts.body = body;
        else if (body) { headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body); }
        const res = await fetch('/api' + url, opts);
        const txt = await res.text();
        try { return JSON.parse(txt); } catch (e) {
            return { error: res.status === 413 ? `Arquivo muito grande (limite ${MAX_MB} MB).` : 'O servidor devolveu uma resposta inesperada. Tente novamente.' };
        }
    }

    /* ── Renderização compartilhada (preview, editor e página pública) ───────────── */
    function midiaHtml(src, tipo, estilo) {
        if (!src) return '';
        if (tipo === 'video') {
            return `<video src="${esc(src)}" controls playsinline preload="metadata" style="${estilo}"></video>`;
        }
        return `<img src="${esc(src)}" alt="" style="${estilo}" draggable="false">`;
    }

    function hotspotsHtml(lista) {
        return (lista || []).map(h =>
            `<a href="${esc(h.url)}" target="_blank" rel="noopener noreferrer" title="${esc(h.titulo || h.url)}" ` +
            `style="position:absolute; left:${h.x}%; top:${h.y}%; width:${h.w}%; height:${h.h}%; display:block; cursor:pointer;"></a>`
        ).join('');
    }

    /* Resolve como o box aparece em cada tela. Retorna null quando está oculto. */
    function resolverVisao(box, view) {
        if (view !== 'mobile') {
            return { src: box.url, tipo: box.tipo, hotspots: box.hotspots_desktop || [], recorte: false };
        }
        const modo = box.mobile_modo || 'mesma';
        if (modo === 'ocultar') return null;
        if (modo === 'arquivo' && box.mobile_url) {
            return { src: box.mobile_url, tipo: box.mobile_tipo || 'imagem', hotspots: box.hotspots_mobile || [], recorte: false };
        }
        if (modo === 'recorte') {
            return { src: box.url, tipo: box.tipo, hotspots: box.hotspots_mobile || [], recorte: true };
        }
        const hotMob = box.hotspots_mobile || [];
        return { src: box.url, tipo: box.tipo, hotspots: hotMob.length ? hotMob : (box.hotspots_desktop || []), recorte: false };
    }

    window.boxRenderHtml = function (box, view, opts) {
        opts = opts || {};
        if (box && box.tipo === 'quadro_evento') {
            return window.renderBoxQuadroEventoHtml(opts.proposta || null, view);
        }
        const v = resolverVisao(box, view);
        if (!v) {
            return opts.mostrarOculto
                ? `<div style="background:#f1f5f9; color:#64748b; font-size:0.72rem; text-align:center; padding:10px; border-bottom:1px dashed #cbd5e1; line-height:1.3;">“${esc(box.nome)}” fica oculto no celular</div>`
                : '';
        }
        if (v.recorte) {
            const [a, b] = String(box.mobile_proporcao || '4:5').split(':').map(Number);
            const fx = Number(box.foco_x ?? 50), fy = Number(box.foco_y ?? 50);
            return `<div style="position:relative; width:100%; aspect-ratio:${a || 4} / ${b || 5}; overflow:hidden; line-height:0;">` +
                midiaHtml(v.src, v.tipo, `width:100%; height:100%; object-fit:cover; object-position:${fx}% ${fy}%; display:block;`) +
                (v.tipo === 'video' ? '' : hotspotsHtml(v.hotspots)) +
                `</div>`;
        }
        return `<div style="position:relative; width:100%; line-height:0;">` +
            midiaHtml(v.src, v.tipo, 'width:100%; height:auto; display:block;') +
            (v.tipo === 'video' ? '' : hotspotsHtml(v.hotspots)) +
            `</div>`;
    };

    /* ── Gerenciador (biblioteca) ──────────────────────────────────────────────────── */
    window._boxesLista = [];
    window._boxesViewPreview = 'desktop';

    window.abrirGerenciadorBoxes = async function () {
        const ant = document.getElementById('boxes-manager-overlay');
        if (ant) ant.remove();
        const ov = document.createElement('div');
        ov.id = 'boxes-manager-overlay';
        ov.style.cssText = 'position:fixed; inset:0; background:rgba(15,23,42,0.6); z-index:99990; display:flex; align-items:center; justify-content:center; font-family:Inter, sans-serif;';
        ov.innerHTML = `
        <div style="background:#f8fafc; width:min(1340px, 97vw); height:92vh; border-radius:14px; box-shadow:0 25px 50px rgba(0,0,0,0.35); display:flex; flex-direction:column; overflow:hidden;">
            <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; padding:0.8rem 1.2rem; background:#fff; border-bottom:1px solid #e2e8f0; flex-wrap:wrap;">
                <div>
                    <div style="font-size:1.05rem; font-weight:800; color:#1e293b; display:flex; align-items:center; gap:8px;"><i class="ph ph-image-square" style="color:#7048e8;"></i> Boxes da Proposta Evento (Banners + Quadro Fixo de Valores)</div>
                    <div style="font-size:0.74rem; color:#64748b;">O <b>Quadro de Valores — Proposta Evento</b> é fixo e puxa os dados automaticamente da proposta. Use ▲ ▼ para definir a posição dele entre os banners.</div>
                </div>
                <div style="display:flex; gap:8px; align-items:center;">
                    <button onclick="window.abrirEditorBox(null)" style="background:#16a34a; color:#fff; border:none; padding:0.5rem 1rem; border-radius:7px; font-weight:700; font-size:0.8rem; cursor:pointer; display:inline-flex; align-items:center; gap:5px;"><i class="ph ph-plus-circle"></i> Anexar Box (Imagem / Vídeo)</button>
                    <button onclick="document.getElementById('boxes-manager-overlay')?.remove()" style="background:#fee2e2; color:#dc2626; border:1px solid #fecaca; padding:0.5rem 1rem; border-radius:7px; font-weight:700; font-size:0.8rem; cursor:pointer;">Fechar</button>
                </div>
            </div>
            <div style="flex:1; min-height:0; display:grid; grid-template-columns:minmax(360px, 0.78fr) 1.22fr; gap:0.9rem; padding:0.9rem;">
                <div style="display:flex; flex-direction:column; min-height:0;">
                    <div style="font-size:0.74rem; font-weight:800; color:#475569; text-transform:uppercase; letter-spacing:0.04em; margin-bottom:6px;">Ordem dos Boxes <span id="boxes-count" style="background:#ede9fe; color:#6d28d9; padding:1px 8px; border-radius:999px; margin-left:4px;">0</span></div>
                    <div id="boxes-lista" style="flex:1; min-height:0; overflow-y:auto; display:flex; flex-direction:column; gap:8px; padding-right:4px;"></div>
                </div>
                <div style="display:flex; flex-direction:column; min-height:0;">
                    <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; margin-bottom:6px; flex-wrap:wrap;">
                        <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                            <div style="font-size:0.74rem; font-weight:800; color:#475569; text-transform:uppercase; letter-spacing:0.04em;">Pré-visualização</div>
                            <select id="boxes-prop-preview-sel" onchange="window._setBoxPropostaPreview(this.value)" style="padding:4px 8px; border:1px solid #cbd5e1; border-radius:6px; font-size:0.74rem; background:#fff; color:#334155; font-weight:600; cursor:pointer;">
                                <option value="auto">Dados: Proposta aberta / Modelo Exemplo</option>
                            </select>
                        </div>
                        <div id="boxes-toggle-view" style="display:inline-flex; background:#e2e8f0; border-radius:8px; padding:3px; gap:2px;"></div>
                    </div>
                    <div id="boxes-preview" style="flex:1; min-height:0; overflow-y:auto; background:#e2e8f0; border-radius:10px; border:1px solid #cbd5e1; padding:14px;"></div>
                </div>
            </div>
        </div>`;
        document.body.appendChild(ov);
        await window.carregarCacheDadosQuadroEvento(true);
        window._popularSelectPropostasPreviewBoxes();
        await window.carregarBoxes();
    };

    window._popularSelectPropostasPreviewBoxes = function () {
        const sel = document.getElementById('boxes-prop-preview-sel');
        if (!sel) return;
        const c = window._boxCacheDadosAux || { propostasEvento: [] };
        const opcoes = [
            `<option value="auto" ${window._boxPropostaPreviewId === 'auto' ? 'selected' : ''}>Dados: Proposta aberta / Modelo Exemplo</option>`,
            `<option value="exemplo" ${window._boxPropostaPreviewId === 'exemplo' ? 'selected' : ''}>Dados: Exemplo do Layout (modelo)</option>`
        ];
        (c.propostasEvento || []).slice(0, 40).forEach(p => {
            const label = `${p.codigo || ('#' + p.id)}${p.nome_evento ? ' — ' + p.nome_evento : ''} (${p.cliente_nome || 'Sem cliente'})`;
            opcoes.push(`<option value="${esc(p.id)}" ${String(window._boxPropostaPreviewId) === String(p.id) ? 'selected' : ''}>Proposta: ${esc(label)}</option>`);
        });
        sel.innerHTML = opcoes.join('');
    };

    window._setBoxPropostaPreview = function (val) {
        window._boxPropostaPreviewId = val || 'auto';
        window._renderBoxesPreview();
    };

    window.carregarBoxes = async function () {
        const lista = document.getElementById('boxes-lista');
        if (lista && !window._boxesLista.length) lista.innerHTML = '<div style="text-align:center; color:#94a3b8; padding:2rem; font-size:0.85rem;">Carregando...</div>';
        const r = await apiGet('/comercial/boxes');
        window._boxesLista = Array.isArray(r) ? r : [];
        window._renderBoxesLista();
        window._renderBoxesPreview();
    };

    window._renderBoxesLista = function () {
        const el = document.getElementById('boxes-lista');
        const cnt = document.getElementById('boxes-count');
        if (cnt) cnt.textContent = String(window._boxesLista.length);
        if (!el) return;
        const lista = window._boxesLista;
        if (!lista.length) {
            el.innerHTML = '<div style="text-align:center; color:#94a3b8; padding:2.5rem 1rem; font-size:0.85rem; border:2px dashed #cbd5e1; border-radius:10px; background:#fff;">Nenhum box cadastrado.<br>Clique em <b>Anexar Box</b> para adicionar uma imagem ou vídeo.</div>';
            return;
        }
        el.innerHTML = lista.map((b, i) => {
            const isQuadroFixo = b.tipo === 'quadro_evento';
            const thumb = isQuadroFixo
                ? `<div style="width:100%; height:100%; background:#fff; border:1px solid #ddd6fe; display:flex; flex-direction:column; overflow:hidden; font-size:0.48rem;">
                       <div style="padding:2px 5px; border-bottom:1px solid #5c4599; display:flex; justify-content:space-between; font-weight:800; color:#1e293b;"><span>PROPOSTA EVENTO</span><span style="color:#5c4599;">CT0001</span></div>
                       <div style="flex:1; display:flex; align-items:stretch;">
                           <div style="width:34px; background:#5c4599; color:#fff; display:flex; align-items:center; justify-content:center; font-weight:800;">A</div>
                           <div style="flex:1; padding:3px 4px; color:#475569; line-height:1.25;"><b>▸ CLIENTE / EVENTO</b><br>▸ EQUIPAMENTOS...</div>
                       </div>
                       <div style="background:#0f0f12; color:#a78bfa; padding:1px 5px; text-align:right; font-weight:800;">VALOR TOTAL</div>
                   </div>`
                : (b.tipo === 'video'
                    ? `<video src="${esc(b.url)}#t=0.5" muted preload="metadata" style="width:100%; height:100%; object-fit:cover;"></video>`
                    : `<img src="${esc(b.url)}" alt="" style="width:100%; height:100%; object-fit:cover;">`);
            const nHot = (b.hotspots_desktop || []).length + (b.hotspots_mobile || []).length;
            return `
            <div style="background:${isQuadroFixo ? '#faf5ff' : '#fff'}; border:${isQuadroFixo ? '2px solid #8b5cf6' : '1px solid #e2e8f0'}; border-radius:10px; padding:8px; display:flex; gap:10px; align-items:center;">
                <div style="display:flex; flex-direction:column; gap:3px;">
                    <button title="Subir posição" ${i === 0 ? 'disabled' : ''} onclick="window.moverBox(${b.id}, 'up')" style="width:26px; height:26px; border:1px solid #cbd5e1; background:${i === 0 ? '#f1f5f9' : '#fff'}; border-radius:6px; cursor:${i === 0 ? 'not-allowed' : 'pointer'}; display:inline-flex; align-items:center; justify-content:center; padding:0;"><i class="ph ph-arrow-up"></i></button>
                    <button title="Descer posição" ${i === lista.length - 1 ? 'disabled' : ''} onclick="window.moverBox(${b.id}, 'down')" style="width:26px; height:26px; border:1px solid #cbd5e1; background:${i === lista.length - 1 ? '#f1f5f9' : '#fff'}; border-radius:6px; cursor:${i === lista.length - 1 ? 'not-allowed' : 'pointer'}; display:inline-flex; align-items:center; justify-content:center; padding:0;"><i class="ph ph-arrow-down"></i></button>
                </div>
                <div style="width:120px; height:72px; border-radius:7px; overflow:hidden; background:#0f172a; flex-shrink:0; position:relative;">
                    ${thumb}
                    ${b.tipo === 'video' ? '<span style="position:absolute; right:4px; bottom:4px; background:rgba(0,0,0,0.7); color:#fff; font-size:0.62rem; padding:1px 5px; border-radius:4px;">VÍDEO</span>' : ''}
                </div>
                <div style="flex:1; min-width:0;">
                    <div style="font-weight:800; font-size:0.85rem; color:#1e293b; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;"><span style="color:#7048e8;">#${i + 1}</span> ${esc(b.nome)}</div>
                    <div style="display:flex; flex-wrap:wrap; gap:4px; margin-top:4px;">
                        ${isQuadroFixo ? `
                            <span style="background:#5c4599; color:#fff; font-size:0.66rem; font-weight:800; padding:1px 8px; border-radius:999px;"><i class="ph ph-lock-key"></i> FIXO · PROPOSTA EVENTO</span>
                            <span style="background:#ede9fe; color:#5b21b6; font-size:0.66rem; font-weight:700; padding:1px 7px; border-radius:999px;">Puxa dados da Proposta</span>
                        ` : `
                            <span style="background:#f1f5f9; color:#475569; font-size:0.66rem; font-weight:700; padding:1px 7px; border-radius:999px;">${b.tipo === 'video' ? 'Vídeo' : 'Imagem'}</span>
                            <span style="background:#ede9fe; color:#6d28d9; font-size:0.66rem; font-weight:700; padding:1px 7px; border-radius:999px;">${esc(ROTULO_MODO[b.mobile_modo] || ROTULO_MODO.mesma)}</span>
                            ${nHot ? `<span style="background:#fef3c7; color:#b45309; font-size:0.66rem; font-weight:700; padding:1px 7px; border-radius:999px;">${nHot} link(s)</span>` : ''}
                        `}
                    </div>
                </div>
                <div style="display:flex; gap:5px;">
                    ${isQuadroFixo ? '' : `
                        <button title="Editar" onclick="window.abrirEditorBox(${b.id})" style="width:32px; height:32px; border:1px solid #c4b5fd; background:#f5f3ff; color:#6d28d9; border-radius:7px; cursor:pointer; display:inline-flex; align-items:center; justify-content:center;"><i class="ph ph-pencil-simple"></i></button>
                        <button title="Excluir" onclick="window.excluirBox(${b.id})" style="width:32px; height:32px; border:1px solid #fecaca; background:#fee2e2; color:#dc2626; border-radius:7px; cursor:pointer; display:inline-flex; align-items:center; justify-content:center;"><i class="ph ph-trash"></i></button>
                    `}
                </div>
            </div>`;
        }).join('');
    };

    function togglePreviewHtml(atual, fnName) {
        const btn = (v, ico, txt) =>
            `<button onclick="${fnName}('${v}')" style="border:none; padding:5px 12px; border-radius:6px; font-size:0.76rem; font-weight:700; cursor:pointer; display:inline-flex; align-items:center; gap:5px; background:${atual === v ? '#7048e8' : 'transparent'}; color:${atual === v ? '#fff' : '#475569'};"><i class="ph ${ico}"></i> ${txt}</button>`;
        return btn('desktop', 'ph-desktop', 'Desktop') + btn('mobile', 'ph-device-mobile', 'Celular');
    }

    function moldura(view, conteudo, vazio) {
        const inner = conteudo || `<div style="padding:2rem 1rem; text-align:center; color:#94a3b8; font-size:0.8rem; line-height:1.4;">${vazio}</div>`;
        if (view === 'mobile') {
            return `<div style="width:375px; max-width:100%; margin:0 auto; background:#fff; border:10px solid #1e293b; border-radius:30px; overflow:hidden; box-shadow:0 10px 30px rgba(0,0,0,0.25);">
                <div style="background:#1e293b; height:6px;"></div>${inner}</div>`;
        }
        return `<div style="width:100%; background:#fff; border:1px solid #cbd5e1; border-radius:8px; overflow:hidden; box-shadow:0 4px 14px rgba(0,0,0,0.08);">
            <div style="background:#e2e8f0; height:22px; display:flex; align-items:center; gap:5px; padding:0 8px;"><span style="width:8px; height:8px; border-radius:50%; background:#f87171;"></span><span style="width:8px; height:8px; border-radius:50%; background:#fbbf24;"></span><span style="width:8px; height:8px; border-radius:50%; background:#4ade80;"></span></div>${inner}</div>`;
    }

    window._setBoxesViewPreview = function (v) {
        window._boxesViewPreview = v === 'mobile' ? 'mobile' : 'desktop';
        window._renderBoxesPreview();
    };

    window._renderBoxesPreview = function () {
        const prev = document.getElementById('boxes-preview');
        const tog = document.getElementById('boxes-toggle-view');
        if (tog) tog.innerHTML = togglePreviewHtml(window._boxesViewPreview, 'window._setBoxesViewPreview');
        if (!prev) return;
        const view = window._boxesViewPreview;
        const html = window._boxesLista.map(b => window.boxRenderHtml(b, view, { mostrarOculto: true })).join('');
        prev.innerHTML = moldura(view, html, 'Os boxes aparecem aqui, empilhados na ordem da biblioteca.');
    };

    window.moverBox = async function (id, direcao) {
        const r = await chamar('POST', `/comercial/boxes/${id}/mover`, { direcao });
        if (r && r.error) { alert(r.error); return; }
        await window.carregarBoxes();
    };

    window.excluirBox = async function (id) {
        const b = window._boxesLista.find(x => x.id === id);
        if (b && b.tipo === 'quadro_evento') {
            alert('Este box é fixo da Proposta Evento e não pode ser excluído.');
            return;
        }
        if (!confirm(`Excluir o box "${b ? b.nome : ''}"? O arquivo será removido definitivamente.`)) return;
        const r = await chamar('DELETE', `/comercial/boxes/${id}`);
        if (r && r.error) { alert(r.error); return; }
        await window.carregarBoxes();
    };

    /* ── Editor do box (criador responsivo) ────────────────────────────────────────── */
    let ed = null;

    const tipoDe = (file) => (file && String(file.type).startsWith('video/')) ? 'video' : 'imagem';
    const edSrcDesktop = () => ed.localUrl || ed.url || '';
    const edTipoDesktop = () => ed.localUrl ? ed.localTipo : (ed.tipo || 'imagem');
    const edSrcMobile = () => ed.localMobileUrl || (ed.removerMobile ? '' : (ed.mobile_url || ''));
    const edTipoMobile = () => ed.localMobileUrl ? ed.localMobileTipo : (ed.mobile_tipo || 'imagem');

    function edHotAtiva() {
        if (ed.view === 'desktop') return edTipoDesktop() === 'video' ? null : ed.hotspots_desktop;
        if (ed.mobile_modo === 'ocultar') return null;
        if (ed.mobile_modo === 'arquivo') return (edSrcMobile() && edTipoMobile() !== 'video') ? ed.hotspots_mobile : null;
        return edTipoDesktop() === 'video' ? null : ed.hotspots_mobile;
    }

    window.abrirEditorBox = function (id) {
        const b = id ? window._boxesLista.find(x => x.id === id) : null;
        if (b && b.tipo === 'quadro_evento') return;
        ed = {
            id: b ? b.id : null,
            nome: b ? b.nome : '',
            url: b ? b.url : '', tipo: b ? b.tipo : 'imagem',
            mobile_url: b ? b.mobile_url : '', mobile_tipo: b ? b.mobile_tipo : '',
            mobile_modo: b ? (b.mobile_modo || 'mesma') : 'mesma',
            mobile_proporcao: b ? (b.mobile_proporcao || '4:5') : '4:5',
            foco_x: b ? Number(b.foco_x ?? 50) : 50, foco_y: b ? Number(b.foco_y ?? 50) : 50,
            hotspots_desktop: b ? JSON.parse(JSON.stringify(b.hotspots_desktop || [])) : [],
            hotspots_mobile: b ? JSON.parse(JSON.stringify(b.hotspots_mobile || [])) : [],
            file: null, fileMobile: null, localUrl: null, localMobileUrl: null, localTipo: 'imagem', localMobileTipo: 'imagem',
            removerMobile: false, view: 'desktop'
        };
        const ant = document.getElementById('box-editor-overlay');
        if (ant) ant.remove();
        const ov = document.createElement('div');
        ov.id = 'box-editor-overlay';
        ov.style.cssText = 'position:fixed; inset:0; background:rgba(15,23,42,0.65); z-index:99995; display:flex; align-items:center; justify-content:center; font-family:Inter, sans-serif;';
        const lbl = 'display:block; font-size:0.74rem; font-weight:700; color:#475569; margin-bottom:4px;';
        const inp = 'width:100%; padding:0.5rem 0.6rem; border:1px solid #cbd5e1; border-radius:7px; font-size:0.84rem; box-sizing:border-box; background:#fff;';
        ov.innerHTML = `
        <div style="background:#fff; width:min(1240px, 96vw); height:92vh; border-radius:14px; box-shadow:0 25px 50px rgba(0,0,0,0.4); display:flex; flex-direction:column; overflow:hidden;">
            <div style="display:flex; justify-content:space-between; align-items:center; padding:0.75rem 1.2rem; border-bottom:1px solid #e2e8f0; background:#f8fafc;">
                <div style="font-size:1rem; font-weight:800; color:#1e293b;"><i class="ph ph-image-square" style="color:#7048e8;"></i> ${b ? 'Editar Box' : 'Novo Box'}</div>
                <div style="display:flex; gap:8px;">
                    <button id="box-ed-btn-salvar" onclick="window._boxEdSalvar()" style="background:#16a34a; color:#fff; border:none; padding:0.5rem 1.1rem; border-radius:7px; font-weight:700; font-size:0.8rem; cursor:pointer;"><i class="ph ph-floppy-disk"></i> Salvar Box</button>
                    <button onclick="document.getElementById('box-editor-overlay')?.remove()" style="background:#e2e8f0; color:#334155; border:none; padding:0.5rem 1rem; border-radius:7px; font-weight:700; font-size:0.8rem; cursor:pointer;">Cancelar</button>
                </div>
            </div>
            <div style="flex:1; min-height:0; display:grid; grid-template-columns:minmax(360px, 0.85fr) 1.15fr;">
                <div style="overflow-y:auto; padding:1rem 1.1rem; border-right:1px solid #e2e8f0; display:flex; flex-direction:column; gap:0.9rem;">
                    <div>
                        <label style="${lbl}">Nome do box *</label>
                        <input type="text" id="box-ed-nome" value="${esc(ed.nome)}" oninput="window._boxEdNome(this.value)" placeholder="Ex.: Banner de abertura" style="${inp}">
                    </div>
                    <div>
                        <label style="${lbl}">Imagem ou vídeo (desktop) ${b ? '' : '*'}</label>
                        <input type="file" id="box-ed-file" accept="image/*,video/*" onchange="window._boxEdArquivo(this, 'desktop')" style="${inp}">
                        <div id="box-ed-file-info" style="font-size:0.7rem; color:#64748b; margin-top:3px;">${b ? 'Arquivo atual mantido. Selecione outro para substituir.' : `Formatos de imagem ou vídeo. Máximo ${MAX_MB} MB.`}</div>
                    </div>

                    <div style="border:1px solid #ddd6fe; background:#faf5ff; border-radius:10px; padding:0.75rem;">
                        <div style="font-size:0.8rem; font-weight:800; color:#5b21b6; margin-bottom:6px;"><i class="ph ph-device-mobile"></i> Como aparece no celular</div>
                        <select id="box-ed-modo" onchange="window._boxEdModo(this.value)" style="${inp}">
                            ${MODOS_MOBILE.map(m => `<option value="${m.v}" ${ed.mobile_modo === m.v ? 'selected' : ''}>${m.t}</option>`).join('')}
                        </select>
                        <div id="box-ed-sec-arquivo" style="display:none; margin-top:8px;">
                            <label style="${lbl}">Imagem ou vídeo exclusivo do celular</label>
                            <input type="file" id="box-ed-file-mobile" accept="image/*,video/*" onchange="window._boxEdArquivo(this, 'mobile')" style="${inp}">
                            <div style="display:flex; gap:8px; align-items:center; margin-top:4px;">
                                <span id="box-ed-mobile-info" style="font-size:0.7rem; color:#64748b;"></span>
                                <button id="box-ed-rem-mobile" onclick="window._boxEdRemoverMobile()" style="display:none; background:#fee2e2; color:#dc2626; border:1px solid #fecaca; border-radius:6px; font-size:0.68rem; font-weight:700; padding:2px 8px; cursor:pointer;">Remover arquivo do celular</button>
                            </div>
                        </div>
                        <div id="box-ed-sec-recorte" style="display:none; margin-top:8px;">
                            <label style="${lbl}">Proporção do quadro no celular</label>
                            <select id="box-ed-prop" onchange="window._boxEdProporcao(this.value)" style="${inp}">
                                ${PROPORCOES.map(p => `<option value="${p}" ${ed.mobile_proporcao === p ? 'selected' : ''}>${p}</option>`).join('')}
                            </select>
                            <label style="${lbl} margin-top:8px;">Ponto de foco — clique na parte mais importante da mídia</label>
                            <div id="box-ed-foco" style="position:relative; width:100%; max-height:240px; overflow:hidden; border-radius:8px; border:1px solid #c4b5fd; cursor:crosshair; line-height:0; background:#0f172a;"></div>
                        </div>
                    </div>

                    <div style="border:1px solid #fde68a; background:#fffbeb; border-radius:10px; padding:0.75rem;">
                        <div style="font-size:0.8rem; font-weight:800; color:#b45309; margin-bottom:4px;"><i class="ph ph-link"></i> Áreas clicáveis (hiperlink)</div>
                        <div id="box-ed-hot-ajuda" style="font-size:0.72rem; color:#92400e; margin-bottom:6px; line-height:1.35;"></div>
                        <div id="box-ed-hot-lista" style="display:flex; flex-direction:column; gap:6px;"></div>
                    </div>
                </div>

                <div style="display:flex; flex-direction:column; min-height:0; background:#e2e8f0;">
                    <div style="display:flex; justify-content:space-between; align-items:center; padding:0.6rem 0.9rem;">
                        <div style="font-size:0.74rem; font-weight:800; color:#475569; text-transform:uppercase; letter-spacing:0.04em;">Pré-visualização</div>
                        <div id="box-ed-toggle" style="display:inline-flex; background:#cbd5e1; border-radius:8px; padding:3px; gap:2px;"></div>
                    </div>
                    <div id="box-ed-preview" style="flex:1; min-height:0; overflow-y:auto; padding:0 0.9rem 0.9rem;"></div>
                </div>
            </div>
        </div>`;
        document.body.appendChild(ov);
        window._boxEdRenderTudo();
    };

    window._boxEdRenderTudo = function () {
        const secA = document.getElementById('box-ed-sec-arquivo');
        const secR = document.getElementById('box-ed-sec-recorte');
        if (secA) secA.style.display = ed.mobile_modo === 'arquivo' ? 'block' : 'none';
        if (secR) secR.style.display = ed.mobile_modo === 'recorte' ? 'block' : 'none';
        const info = document.getElementById('box-ed-mobile-info');
        const rem = document.getElementById('box-ed-rem-mobile');
        if (info) info.textContent = ed.localMobileUrl ? `Novo arquivo: ${ed.fileMobile.name}` : (edSrcMobile() ? 'Arquivo do celular atual mantido.' : 'Nenhum arquivo do celular anexado.');
        if (rem) rem.style.display = (!ed.localMobileUrl && ed.mobile_url && !ed.removerMobile) ? 'inline-block' : 'none';
        window._boxEdRenderFoco();
        window._boxEdRenderPreview();
        window._boxEdRenderHotLista();
    };

    window._boxEdNome = function (v) { ed.nome = v; };

    window._boxEdArquivo = function (inputEl, alvo) {
        const f = inputEl.files && inputEl.files[0];
        if (!f) return;
        if (!(String(f.type).startsWith('image/') || String(f.type).startsWith('video/'))) {
            alert('Apenas imagem ou vídeo são permitidos.'); inputEl.value = ''; return;
        }
        if (f.size > MAX_MB * 1024 * 1024) {
            alert(`Arquivo muito grande. O limite é ${MAX_MB} MB.`); inputEl.value = ''; return;
        }
        const u = URL.createObjectURL(f);
        if (alvo === 'mobile') {
            if (ed.localMobileUrl) URL.revokeObjectURL(ed.localMobileUrl);
            ed.fileMobile = f; ed.localMobileUrl = u; ed.localMobileTipo = tipoDe(f); ed.removerMobile = false;
            ed.hotspots_mobile = [];
        } else {
            if (ed.localUrl) URL.revokeObjectURL(ed.localUrl);
            ed.file = f; ed.localUrl = u; ed.localTipo = tipoDe(f);
            ed.hotspots_desktop = [];
            if (ed.mobile_modo !== 'arquivo') ed.hotspots_mobile = [];
            const info = document.getElementById('box-ed-file-info');
            if (info) info.textContent = `Novo arquivo: ${f.name} (${(f.size / 1048576).toFixed(1)} MB)` + (ed.id ? ' — as áreas clicáveis anteriores foram limpas.' : '');
            if (!ed.nome) { ed.nome = f.name.replace(/\.[^.]+$/, ''); const n = document.getElementById('box-ed-nome'); if (n) n.value = ed.nome; }
        }
        window._boxEdRenderTudo();
    };

    window._boxEdRemoverMobile = function () {
        ed.removerMobile = true; ed.fileMobile = null; ed.hotspots_mobile = [];
        if (ed.mobile_modo === 'arquivo') ed.mobile_modo = 'mesma';
        const sel = document.getElementById('box-ed-modo'); if (sel) sel.value = ed.mobile_modo;
        window._boxEdRenderTudo();
    };

    window._boxEdModo = function (v) {
        ed.mobile_modo = v;
        window._boxEdRenderTudo();
    };

    window._boxEdProporcao = function (v) { ed.mobile_proporcao = v; window._boxEdRenderPreview(); };

    window._boxEdView = function (v) { ed.view = v === 'mobile' ? 'mobile' : 'desktop'; window._boxEdRenderPreview(); window._boxEdRenderHotLista(); };

    window._boxEdRenderFoco = function () {
        const el = document.getElementById('box-ed-foco');
        if (!el) return;
        const src = edSrcDesktop();
        if (!src) { el.innerHTML = '<div style="padding:1rem; color:#94a3b8; font-size:0.75rem; text-align:center; line-height:1.3;">Anexe a mídia do desktop para definir o foco.</div>'; return; }
        const media = edTipoDesktop() === 'video'
            ? `<video src="${esc(src)}#t=0.5" muted preload="metadata" style="width:100%; display:block; max-height:240px; object-fit:contain;"></video>`
            : `<img src="${esc(src)}" alt="" draggable="false" style="width:100%; display:block; max-height:240px; object-fit:contain;">`;
        el.innerHTML = media + `<div style="position:absolute; left:${ed.foco_x}%; top:${ed.foco_y}%; width:22px; height:22px; margin:-11px 0 0 -11px; border:3px solid #fff; border-radius:50%; box-shadow:0 0 0 2px #7048e8, 0 2px 6px rgba(0,0,0,0.5); pointer-events:none;"></div>`;
        el.onclick = (e) => {
            const m = el.querySelector('img, video');
            const r = (m || el).getBoundingClientRect();
            ed.foco_x = Math.max(0, Math.min(100, Math.round((e.clientX - r.left) / r.width * 100)));
            ed.foco_y = Math.max(0, Math.min(100, Math.round((e.clientY - r.top) / r.height * 100)));
            window._boxEdRenderFoco();
            window._boxEdRenderPreview();
        };
    };

    function edBoxParaRender() {
        return {
            nome: ed.nome || 'Novo box',
            url: edSrcDesktop(), tipo: edTipoDesktop(),
            mobile_url: edSrcMobile(), mobile_tipo: edTipoMobile(),
            mobile_modo: ed.mobile_modo, mobile_proporcao: ed.mobile_proporcao, foco_x: ed.foco_x, foco_y: ed.foco_y,
            hotspots_desktop: ed.hotspots_desktop, hotspots_mobile: ed.hotspots_mobile
        };
    }

    window._boxEdRenderPreview = function () {
        const tog = document.getElementById('box-ed-toggle');
        if (tog) tog.innerHTML = togglePreviewHtml(ed.view, 'window._boxEdView');
        const prev = document.getElementById('box-ed-preview');
        if (!prev) return;
        const box = edBoxParaRender();
        let conteudo = '';
        let nota = '';
        if (!box.url) {
            conteudo = '';
        } else if (ed.view === 'mobile' && ed.mobile_modo === 'ocultar') {
            conteudo = '<div style="padding:2.2rem 1rem; text-align:center; color:#64748b; font-size:0.8rem;">Este box fica <b>oculto</b> no celular.</div>';
        } else if (ed.view === 'mobile' && ed.mobile_modo === 'arquivo' && !box.mobile_url) {
            conteudo = '<div style="padding:2.2rem 1rem; text-align:center; color:#b45309; font-size:0.8rem;">Anexe a imagem ou vídeo do celular.</div>';
        } else {
            const semHot = Object.assign({}, box, { hotspots_desktop: [], hotspots_mobile: [] });
            conteudo = window.boxRenderHtml(semHot, ed.view, { mostrarOculto: true });
        }
        if (ed.view === 'mobile' && ed.mobile_modo === 'mesma') nota = 'Arraste sobre a imagem para criar as áreas clicáveis do celular. Se não desenhar nenhuma, valem as do desktop (em azul).';
        if (ed.view === 'mobile' && ed.mobile_modo === 'recorte') nota = 'Quadro recortado: ajuste a proporção e o ponto de foco (painel à esquerda) antes de desenhar as áreas clicáveis do celular.';
        prev.innerHTML = moldura(ed.view, conteudo, 'Anexe uma imagem ou vídeo para ver a pré-visualização.') +
            (nota ? `<div style="font-size:0.72rem; color:#475569; margin-top:8px; text-align:center;">${nota}</div>` : '');

        const wrapper = prev.querySelector('div[style*="position:relative"][style*="line-height:0"]');
        if (!wrapper) return;
        const ativa = edHotAtiva();
        const listaMostrar = ativa;
        if (!listaMostrar) return;
        const fantasma = (ed.view === 'mobile' && ed.mobile_modo === 'mesma' && listaMostrar.length === 0) ? (ed.hotspots_desktop || []) : [];
        const fantasmaHtml = fantasma.map((h) =>
            `<div title="Área do desktop (vale no celular enquanto você não desenhar as suas)" style="position:absolute; left:${h.x}%; top:${h.y}%; width:${h.w}%; height:${h.h}%; border:2px dashed #3b82f6; background:rgba(59,130,246,0.16); pointer-events:none; box-sizing:border-box;">
                <span style="position:absolute; left:0; top:0; background:#3b82f6; color:#fff; font-size:0.6rem; font-weight:800; padding:0 5px; line-height:1.5;">D</span></div>`
        ).join('');
        const layer = document.createElement('div');
        layer.style.cssText = `position:absolute; inset:0; cursor:crosshair; touch-action:none;`;
        layer.innerHTML = fantasmaHtml + listaMostrar.map((h, i) =>
            `<div style="position:absolute; left:${h.x}%; top:${h.y}%; width:${h.w}%; height:${h.h}%; border:2px dashed #f59e0b; background:rgba(245,158,11,0.22); pointer-events:none; box-sizing:border-box;">
                <span style="position:absolute; left:0; top:0; background:#f59e0b; color:#fff; font-size:0.62rem; font-weight:800; padding:0 5px; line-height:1.5;">${i + 1}</span></div>`
        ).join('');
        wrapper.appendChild(layer);
        attachDraw(layer, ativa);
    };

    function attachDraw(layer, lista) {
        let ini = null, temp = null;
        const pct = (e) => {
            const r = layer.getBoundingClientRect();
            return {
                x: Math.max(0, Math.min(100, (e.clientX - r.left) / r.width * 100)),
                y: Math.max(0, Math.min(100, (e.clientY - r.top) / r.height * 100))
            };
        };
        layer.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            layer.setPointerCapture(e.pointerId);
            ini = pct(e);
            temp = document.createElement('div');
            temp.style.cssText = 'position:absolute; border:2px solid #7048e8; background:rgba(112,72,232,0.2); pointer-events:none; box-sizing:border-box;';
            layer.appendChild(temp);
        });
        layer.addEventListener('pointermove', (e) => {
            if (!ini || !temp) return;
            const p = pct(e);
            temp.style.left = Math.min(ini.x, p.x) + '%'; temp.style.top = Math.min(ini.y, p.y) + '%';
            temp.style.width = Math.abs(p.x - ini.x) + '%'; temp.style.height = Math.abs(p.y - ini.y) + '%';
        });
        const fim = (e) => {
            if (!ini) return;
            const p = pct(e);
            const h = { x: Math.min(ini.x, p.x), y: Math.min(ini.y, p.y), w: Math.abs(p.x - ini.x), h: Math.abs(p.y - ini.y), url: '', titulo: '' };
            ini = null;
            if (temp) { temp.remove(); temp = null; }
            if (h.w < 1.5 || h.h < 1.5) return;
            ['x', 'y', 'w', 'h'].forEach(k => { h[k] = Math.round(h[k] * 100) / 100; });
            lista.push(h);
            window._boxEdRenderPreview();
            window._boxEdRenderHotLista(lista.length - 1);
        };
        layer.addEventListener('pointerup', fim);
        layer.addEventListener('pointercancel', () => { ini = null; if (temp) { temp.remove(); temp = null; } });
    }

    window._boxEdRenderHotLista = function (focarIdx) {
        const el = document.getElementById('box-ed-hot-lista');
        const ajuda = document.getElementById('box-ed-hot-ajuda');
        if (!el) return;
        const ativa = edHotAtiva();
        if (!ativa) {
            let msg = 'Áreas clicáveis estão disponíveis para imagens.';
            if (ed.view === 'mobile' && ed.mobile_modo === 'ocultar') msg = 'Box oculto no celular.';
            else if (ed.view === 'mobile' && ed.mobile_modo === 'arquivo') msg = 'Anexe uma imagem para o celular para desenhar áreas clicáveis nela.';
            else if (edTipoDesktop() === 'video') msg = 'Áreas clicáveis não estão disponíveis para vídeo.';
            if (ajuda) ajuda.textContent = msg;
            el.innerHTML = '';
            return;
        }
        if (ajuda) ajuda.textContent = (ed.view === 'mobile' ? 'Visão CELULAR: ' : 'Visão DESKTOP: ') + 'arraste sobre a imagem na pré-visualização para desenhar uma área e informe o link. Ele abrirá em uma nova página.';
        const podeCopiar = ed.view === 'mobile' && ed.mobile_modo === 'mesma' && (ed.hotspots_desktop || []).length > 0;
        const btnCopiar = podeCopiar
            ? '<button onclick="window._boxEdCopiarDesktop()" style="align-self:flex-start; background:#eff6ff; color:#1d4ed8; border:1px solid #bfdbfe; border-radius:6px; font-size:0.72rem; font-weight:700; padding:4px 10px; cursor:pointer;"><i class="ph ph-copy"></i> Copiar áreas do desktop para o celular</button>'
            : '';
        if (ajuda && ed.view === 'mobile' && ed.mobile_modo === 'mesma') ajuda.textContent += ' Se nenhuma área for criada no celular, valem as do desktop (em azul).';
        if (!ativa.length) { el.innerHTML = btnCopiar + '<div style="font-size:0.74rem; color:#a16207; font-style:italic;">Nenhuma área desenhada ainda.</div>'; return; }
        el.innerHTML = btnCopiar + ativa.map((h, i) => `
            <div style="display:grid; grid-template-columns:24px 1.6fr 1fr 28px; gap:5px; align-items:center;">
                <span style="background:#f59e0b; color:#fff; font-weight:800; font-size:0.68rem; text-align:center; border-radius:5px; padding:4px 0;">${i + 1}</span>
                <input type="text" data-hot-url="${i}" value="${esc(h.url)}" placeholder="https://..." oninput="window._boxEdHot(${i}, 'url', this.value)" style="padding:5px 7px; border:1px solid #fcd34d; border-radius:6px; font-size:0.76rem; box-sizing:border-box; width:100%;">
                <input type="text" value="${esc(h.titulo)}" placeholder="Título (opcional)" oninput="window._boxEdHot(${i}, 'titulo', this.value)" style="padding:5px 7px; border:1px solid #fcd34d; border-radius:6px; font-size:0.76rem; box-sizing:border-box; width:100%;">
                <button onclick="window._boxEdHotExcluir(${i})" title="Excluir área" style="width:28px; height:28px; border:1px solid #fecaca; background:#fee2e2; color:#dc2626; border-radius:6px; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; padding:0;"><i class="ph ph-trash"></i></button>
            </div>`).join('');
        if (focarIdx !== undefined) {
            const f = el.querySelector(`input[data-hot-url="${focarIdx}"]`);
            if (f) f.focus();
        }
    };

    window._boxEdCopiarDesktop = function () {
        ed.hotspots_mobile = JSON.parse(JSON.stringify(ed.hotspots_desktop || []));
        window._boxEdRenderPreview();
        window._boxEdRenderHotLista();
    };

    window._boxEdHot = function (i, campo, valor) {
        const l = edHotAtiva();
        if (l && l[i]) l[i][campo] = valor;
    };

    window._boxEdHotExcluir = function (i) {
        const l = edHotAtiva();
        if (!l) return;
        l.splice(i, 1);
        window._boxEdRenderPreview();
        window._boxEdRenderHotLista();
    };

    window._boxEdSalvar = async function () {
        const nome = (ed.nome || '').trim();
        if (!nome) { alert('Informe o nome do box.'); document.getElementById('box-ed-nome')?.focus(); return; }
        if (!ed.id && !ed.file) { alert('Anexe a imagem ou o vídeo do box.'); return; }
        if (ed.mobile_modo === 'arquivo' && !ed.fileMobile && (!ed.mobile_url || ed.removerMobile)) {
            alert('Você escolheu "mídia própria para o celular". Anexe o arquivo do celular ou escolha outra opção.'); return;
        }
        const semUrl = (l) => (l || []).some(h => !String(h.url || '').trim());
        if (semUrl(ed.hotspots_desktop) || semUrl(ed.hotspots_mobile)) {
            alert('Informe o link de todas as áreas clicáveis ou exclua as áreas sem link.'); return;
        }
        const fd = new FormData();
        fd.append('nome', nome);
        fd.append('mobile_modo', ed.mobile_modo);
        fd.append('mobile_proporcao', ed.mobile_proporcao);
        fd.append('foco_x', String(ed.foco_x));
        fd.append('foco_y', String(ed.foco_y));
        fd.append('hotspots_desktop', JSON.stringify(ed.hotspots_desktop));
        fd.append('hotspots_mobile', JSON.stringify(ed.hotspots_mobile));
        if (ed.removerMobile) fd.append('remover_mobile', '1');
        if (ed.file) fd.append('arquivo', ed.file);
        if (ed.fileMobile) fd.append('arquivo_mobile', ed.fileMobile);

        const btn = document.getElementById('box-ed-btn-salvar');
        const orig = btn ? btn.innerHTML : '';
        if (btn) { btn.disabled = true; btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Enviando...'; }
        try {
            const r = ed.id ? await chamar('PUT', `/comercial/boxes/${ed.id}`, fd) : await chamar('POST', '/comercial/boxes', fd);
            if (!r || !r.success) { alert('Erro ao salvar o box: ' + ((r && r.error) || 'erro desconhecido')); return; }
            if (ed.localUrl) URL.revokeObjectURL(ed.localUrl);
            if (ed.localMobileUrl) URL.revokeObjectURL(ed.localMobileUrl);
            document.getElementById('box-editor-overlay')?.remove();
            if (typeof mostrarToastSucesso === 'function') mostrarToastSucesso('Box salvo com sucesso!');
            await window.carregarBoxes();
        } catch (e) {
            console.error(e);
            alert('Falha de comunicação com o servidor ao salvar o box.');
        } finally {
            if (btn) { btn.disabled = false; btn.innerHTML = orig; }
        }
    };
})();
