/**
 * ============================================================================
 * MÓDULO: COMERCIAL → RELATÓRIOS
 * Telas de relatórios otimizadas com filtros em tempo real e exportação Excel:
 *   - Relação de Clientes   (comercial-rel-clientes)
 *   - Relação de Endereços  (comercial-rel-enderecos)
 *   - Relação de Propostas  (comercial-rel-propostas)
 *   - Relação de Contratos  (comercial-rel-contratos)
 *   - Relação de OS         (comercial-rel-os)
 * ============================================================================
 */
(function () {
    'use strict';

    const FASES_NEGOCIACAO_TODAS = [
        'Em Elaboração',
        'Proposta Enviada',
        'Pré aprovada',
        'ENVIADO PARA ASSINATURA',
        'PROPOSTA ASSINADA',
        'Aprovada',
        'Reprovada',
        'Sem Resposta',
        'Em Negociação',
        'Cancelada'
    ];

    const SITUACOES_CONTRATO_TODAS = [
        'EM ELABORAÇÃO',
        'ENVIADO PARA ASSINATURA',
        'CONTRATO ASSINADO',
        'SOLICITAÇÃO DE RETIRADA EM ANDAMENTO',
        'ENTREGUE - LIBERADO PARA FATURAMENTO',
        'REPROVADO | CANCELADO',
        'ENCERRADO | CONCLUÍDO',
        'NÃO ASSINA CONTRATO - ENTREGA LIBERADA',
        'CONTRATO ESTORNADO'
    ];

    const STATUS_OS_TODOS = [
        'EM ELABORAÇÃO',
        'LIBERADO',
        'ENTREGA AGENDADA',
        'ENTREGUE - ACOMPANHAMENTO OS',
        'RETIRADA AGENDADA',
        'RETIRADA PARCIAL REALIZADA',
        'RETIRADA TOTAL REALIZADA'
    ];

    const REPORTS_META = {
        clientes: {
            target: 'comercial-rel-clientes',
            titulo: 'Relação de Clientes',
            icone: 'ph-users',
            nomeArquivo: 'Relacao_Clientes_Comercial'
        },
        enderecos: {
            target: 'comercial-rel-enderecos',
            titulo: 'Relação de Endereços',
            icone: 'ph-map-pin',
            nomeArquivo: 'Relacao_Enderecos_Comercial'
        },
        propostas: {
            target: 'comercial-rel-propostas',
            titulo: 'Relação de Propostas',
            icone: 'ph-file-text',
            nomeArquivo: 'Relacao_Propostas_Comercial'
        },
        contratos: {
            target: 'comercial-rel-contratos',
            titulo: 'Relação de Contratos',
            icone: 'ph-files',
            nomeArquivo: 'Relacao_Contratos_Comercial'
        },
        os: {
            target: 'comercial-rel-os',
            titulo: 'Relação de OS',
            icone: 'ph-clipboard-text',
            nomeArquivo: 'Relacao_OS_Comercial'
        }
    };

    const stateByTipo = {
        clientes:  { dados: [], carregado: false, carregando: false, erro: '', page: 1, pageSize: 100, filtros: { q: '', grupo: '', atendentes: [], atendBusca: '', contratosAtivos: '', cidade: '' } },
        enderecos: { dados: [], carregado: false, carregando: false, erro: '', page: 1, pageSize: 100, filtros: { q: '', cliente: '', zona: '', municipioUf: '' } },
        propostas: { dados: [], carregado: false, carregando: false, erro: '', page: 1, pageSize: 100, filtros: { q: '', tipo: '', fases: [], faseBusca: '', atendentes: [], atendBusca: '', produto: '', de: '', ate: '', perDe: '', perAte: '' } },
        contratos: { dados: [], carregado: false, carregando: false, erro: '', page: 1, pageSize: 100, filtros: { q: '', tipo: '', situacao: '', atendentes: [], atendBusca: '', de: '', ate: '' } },
        os:        { dados: [], carregado: false, carregando: false, erro: '', page: 1, pageSize: 100, filtros: { q: '', modalidade: '', tipoOs: '', statusOs: '', atendentes: [], atendBusca: '', equipamento: '', servico: '', de: '', ate: '' } }
    };

    let atendentesComercialLista = [];
    let debounceTimer = null;
    const produtosExpandidosSet = new Set();

    function normStr(s) {
        return String(s || '')
            .replace(/^[💎🥇🥈🥉]\s*/, '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .trim();
    }

    function esc(s) {
        return String(s ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function fmtDataBr(iso) {
        const s = String(iso || '').trim().substring(0, 10);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return s || '—';
        const [y, m, d] = s.split('-');
        return `${d}/${m}/${y}`;
    }

    function fmtMoeda(v) {
        const n = Number(v) || 0;
        return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }

    function limparNomeClienteParaExcel(nome) {
        if (typeof window.limparPrefixoGrupoCliente === 'function') {
            return window.limparPrefixoGrupoCliente(String(nome || ''));
        }
        return String(nome || '').replace(/^[💎🥇🥈🥉]\s*/g, '').trim();
    }

    function iconePorGrupo(grupoRaw) {
        const g = normStr(grupoRaw);
        if (!g) return '';
        if (g.includes('diamante')) return '💎';
        if (g.includes('ouro')) return '🥇';
        if (g.includes('prata')) return '🥈';
        if (g.includes('bronze')) return '🥉';
        return '';
    }

    function formatarNomeComGrupoRapido(nome, grupoRaw) {
        const limpo = limparNomeClienteParaExcel(nome);
        if (!limpo) return '—';
        const ic = iconePorGrupo(grupoRaw);
        if (ic) return `${ic} ${limpo}`;
        if (typeof window.formatarNomeClienteComIcone === 'function') {
            return window.formatarNomeClienteComIcone(limpo, grupoRaw) || limpo;
        }
        return limpo;
    }

    function getAuthHeaders() {
        const tk = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token') || '';
        return tk ? { 'Authorization': 'Bearer ' + tk } : {};
    }

    function getApiBase() {
        return (typeof API_URL !== 'undefined' && API_URL) ? API_URL : '/api';
    }

    function resolverAtendenteNome(raw) {
        if (!raw) return '—';
        if (typeof window.resolverNomeExibicaoAtendenteComercial === 'function') {
            return window.resolverNomeExibicaoAtendenteComercial(raw, false) || raw;
        }
        return raw;
    }

    function resolverModalidadeOs(row) {
        const tipoUp = String(row?.tipo || '').trim().toUpperCase().replace(/^PROPOSTA\s+/i, '');
        if (tipoUp.includes('EVENTO')) return 'Evento';
        if (tipoUp.includes('OBRA')) return 'Obra';
        try {
            const d = typeof row?.os_comercial_dados_json === 'string'
                ? JSON.parse(row.os_comercial_dados_json || '{}')
                : (row?.os_comercial_dados_json || {});
            const m = String(d?.modalidade_os || d?.modalidade_obra_evento || '').toLowerCase();
            if (m === 'evento') return 'Evento';
        } catch (_) {}
        return 'Obra';
    }

    function extrairDatasOs(row) {
        try {
            const d = typeof row?.os_comercial_dados_json === 'string'
                ? JSON.parse(row.os_comercial_dados_json || '{}')
                : (row?.os_comercial_dados_json || {});
            return {
                data_entrega: String(d?.data_entrega || '').trim().substring(0, 10),
                data_retirada: String(d?.data_retirada || '').trim().substring(0, 10)
            };
        } catch (_) {
            return { data_entrega: '', data_retirada: '' };
        }
    }

    function parseJsonListaSegura(raw) {
        if (!raw) return [];
        if (Array.isArray(raw)) return raw;
        try {
            const p = JSON.parse(raw);
            return Array.isArray(p) ? p : [];
        } catch (_) {
            return [];
        }
    }

    function extrairProdutosEServicos(row, incluirAditivosContrato = false) {
        let prods = parseJsonListaSegura(row?.itens);
        let servs = parseJsonListaSegura(row?.itens_servicos);

        if (incluirAditivosContrato && typeof window.aplicarMesclagemAditivosNoContratoAtivo === 'function') {
            const tipoUp = String(row?.tipo || '').trim().toUpperCase().replace(/^PROPOSTA\s+/i, '');
            if (tipoUp !== 'ADITIVO' && String(row?.situacao_contrato || '').trim().toUpperCase() !== 'OS AVULSA') {
                try {
                    const mescl = window.aplicarMesclagemAditivosNoContratoAtivo(row, prods, servs);
                    if (mescl && Array.isArray(mescl.produtos)) prods = mescl.produtos;
                    if (mescl && Array.isArray(mescl.servicos)) servs = mescl.servicos;
                } catch (_) {}
            }
        }

        const prodsAtivos = prods
            .filter(p => p && !p._substituido_por_aditivo)
            .map(p => {
                const qtd = Math.max(1, parseInt(p.quantidade ?? p.qtde ?? 1, 10) || 1);
                const nome = String(p.produto || p.descricao || p.nome || '').replace(/^\d+\s*-\s*/, '').trim();
                return nome ? `${qtd}x ${nome}` : '';
            })
            .filter(Boolean);

        const servsAtivos = servs
            .filter(s => s && !s._substituido_por_aditivo)
            .map(s => {
                const nome = String(s.servico || s.produto || s.descricao || s.nome || '').trim();
                return nome;
            })
            .filter(Boolean);

        return { prodsAtivos, servsAtivos };
    }

    async function carregarAtendentesComercialRelatorios() {
        try {
            const r = await fetch(`${getApiBase()}/comercial/atendentes?incluir_desligados=1`, { headers: getAuthHeaders() });
            if (r.ok) {
                const lista = await r.json();
                if (Array.isArray(lista)) {
                    atendentesComercialLista = lista;
                    return lista;
                }
            }
        } catch (_) {}
        return atendentesComercialLista;
    }

    function atendentePassaFiltro(row, selecionados) {
        if (!Array.isArray(selecionados) || selecionados.length === 0) return true;
        const nomeResolv = normStr(resolverAtendenteNome(row.atendente));
        const nomeRaw = normStr(row.atendente);
        return selecionados.some(sel => {
            const sNorm = normStr(sel);
            return Boolean(sNorm && (nomeResolv === sNorm || nomeRaw === sNorm || nomeResolv.includes(sNorm) || sNorm.includes(nomeResolv)));
        });
    }

    async function fetchDadosRelatorio(tipo) {
        const st = stateByTipo[tipo];
        if (!st) return;
        st.carregando = true;
        st.erro = '';
        st.page = 1;
        const apiBase = getApiBase();

        try {
            if (tipo === 'clientes') {
                const [resp] = await Promise.all([
                    fetch(`${apiBase}/comercial/relatorios/clientes`, { headers: getAuthHeaders() }),
                    carregarAtendentesComercialRelatorios()
                ]);
                if (!resp.ok) throw new Error('Falha ao carregar clientes cadastrados.');
                const rows = await resp.json();
                const arr = Array.isArray(rows) ? rows : [];
                arr.forEach(c => {
                    const grupo = c.grupo_clientes || c.classificacao || '';
                    c._grupoNorm = normStr(grupo);
                    c._cidadeNorm = normStr(`${c.municipio || ''} ${c.uf || ''}`);
                    c._nomeExib = formatarNomeComGrupoRapido(c.nome_razao_social || c.nome_fantasia || '—', grupo);
                    c._atendExib = c.atendente ? resolverAtendenteNome(c.atendente) : '';
                    c._contratosAtivos = Number(c.contratos_ativos) || 0;
                    c._contratosInativos = Number(c.contratos_inativos) || 0;
                    c._search = normStr(`${c.codigo || ''} ${c.nome_razao_social || ''} ${c.nome_fantasia || ''} ${c.cpf_cnpj || ''} ${c._atendExib || ''} ${c.municipio || ''} ${c.uf || ''}`);
                });
                st.dados = arr;
            } else if (tipo === 'enderecos') {
                const resp = await fetch(`${apiBase}/comercial/relatorios/enderecos`, { headers: getAuthHeaders() });
                if (!resp.ok) throw new Error('Falha ao carregar endereços cadastrados.');
                const rows = await resp.json();
                const arr = Array.isArray(rows) ? rows : [];
                arr.forEach(e => {
                    const cliRaw = e.cliente_nome || e.cliente_razao || e.cliente_razao_social || e.razao_social || '';
                    e._cliRaw = cliRaw;
                    e._cliNorm = normStr(cliRaw);
                    e._cliExib = cliRaw ? formatarNomeComGrupoRapido(cliRaw, e.grupo_clientes || '') : '—';
                    e._munNorm = normStr(`${e.municipio || ''} ${e.uf || ''}`);
                    e._zona = String(e.zona || 'Outra').trim();
                    e._zonaNorm = normStr(e._zona);
                    e._search = normStr(`${cliRaw} ${e.nome_local || ''} ${e.endereco || ''} ${e.numero || ''} ${e.bairro || ''} ${e.municipio || ''} ${e.uf || ''} ${e.cep || ''} ${e._zona}`);
                });
                st.dados = arr;
            } else {
                const [rProp, rCli] = await Promise.all([
                    fetch(`${apiBase}/propostas`, { headers: getAuthHeaders() }),
                    carregarAtendentesComercialRelatorios(),
                    (!Array.isArray(window._clientesCache) || !window._clientesCache.length)
                        ? fetch(`${apiBase}/comercial/relatorios/clientes`, { headers: getAuthHeaders() }).then(r => r.ok ? r.json() : []).then(cl => { if (Array.isArray(cl) && cl.length) window._clientesCache = cl; }).catch(() => {})
                        : Promise.resolve()
                ]);
                if (!rProp.ok) throw new Error('Falha ao carregar registros do Comercial.');
                const rows = await rProp.json();
                const arr = Array.isArray(rows) ? rows : [];
                window._propostasData = arr;

                if (tipo === 'propostas') {
                    st.dados = arr.filter(p => {
                        if (!p || String(p.status || '').toLowerCase() === 'excluída') return false;
                        const sitUp = String(p.situacao_contrato || '').trim().toUpperCase();
                        return sitUp !== 'OS AVULSA' && Boolean(String(p.codigo || '').trim());
                    }).map(p => {
                        const { prodsAtivos } = extrairProdutosEServicos(p, false);
                        p._produtosList = prodsAtivos;
                        p._produtosNorm = normStr(prodsAtivos.join(' '));
                        p._atendExib = resolverAtendenteNome(p.atendente);
                        p._search = normStr(`${p.codigo || ''} ${p.contrato || ''} ${p.cliente_nome || ''} ${p.contato_nome || ''} ${p.nome_evento || ''} ${p.tipo || ''} ${p._atendExib} ${p.fase_negociacao || ''} ${prodsAtivos.join(' ')}`);
                        return p;
                    });
                } else if (tipo === 'contratos') {
                    st.dados = arr.filter(p => {
                        if (!p || String(p.status || '').toLowerCase() === 'excluída') return false;
                        const tUp = String(p.tipo || '').trim().toUpperCase().replace(/^PROPOSTA\s+/i, '');
                        return tUp !== 'ADITIVO' && Boolean(String(p.contrato || '').trim());
                    }).map(p => {
                        const { prodsAtivos } = extrairProdutosEServicos(p, true);
                        p._produtosList = prodsAtivos;
                        p._produtosNorm = normStr(prodsAtivos.join(' '));
                        p._atendExib = resolverAtendenteNome(p.atendente);
                        p._search = normStr(`${p.contrato || ''} ${p.codigo || ''} ${p.titulo_contrato || ''} ${p.cliente_nome || ''} ${p.contato_nome || ''} ${p.nome_evento || ''} ${p._atendExib} ${p.situacao_contrato || ''} ${prodsAtivos.join(' ')}`);
                        return p;
                    });
                } else if (tipo === 'os') {
                    st.dados = arr.filter(p => {
                        if (!p || String(p.status || '').toLowerCase() === 'excluída') return false;
                        const tUp = String(p.tipo || '').trim().toUpperCase().replace(/^PROPOSTA\s+/i, '');
                        return tUp !== 'ADITIVO' && Boolean(String(p.numero_os || '').trim());
                    }).map(p => {
                        const { prodsAtivos, servsAtivos } = extrairProdutosEServicos(p, true);
                        p._equipamentosList = prodsAtivos;
                        p._equipamentosNorm = normStr(prodsAtivos.join(' '));
                        p._servicosList = servsAtivos;
                        p._servicosNorm = normStr(servsAtivos.join(' '));
                        p._atendExib = resolverAtendenteNome(p.atendente);
                        p._modalidade = resolverModalidadeOs(p);
                        p._dtsOs = extrairDatasOs(p);
                        p._search = normStr(`${p.numero_os || ''} ${p.contrato || ''} ${p.codigo || ''} ${p.titulo_contrato || ''} ${p.cliente_nome || ''} ${p.contato_nome || ''} ${p.endereco_instalacao || ''} ${p._atendExib} ${p.os_tipo_operacao || ''} ${p._modalidade} ${p.status_os || ''} ${prodsAtivos.join(' ')} ${servsAtivos.join(' ')}`);
                        return p;
                    });
                }
            }
            st.carregado = true;
        } catch (e) {
            st.erro = e.message || 'Erro ao carregar dados do relatório.';
        } finally {
            st.carregando = false;
        }
    }

    function obterFiltrados(tipo) {
        const st = stateByTipo[tipo];
        const dados = Array.isArray(st?.dados) ? st.dados : [];
        const f = st?.filtros || {};
        const q = normStr(f.q);

        if (tipo === 'clientes') {
            const qCid = normStr(f.cidade);
            const gSel = normStr(f.grupo);
            const ctrAtSel = String(f.contratosAtivos || '').trim();
            return dados.filter(c => {
                if (q && !c._search.includes(q)) return false;
                if (qCid && !c._cidadeNorm.includes(qCid)) return false;
                if (gSel) {
                    if (gSel === '__sem__') {
                        if (c._grupoNorm) return false;
                    } else if (!c._grupoNorm.includes(gSel)) {
                        return false;
                    }
                }
                if (!atendentePassaFiltro(c, f.atendentes)) return false;
                if (ctrAtSel === 'sim' && !(c._contratosAtivos > 0)) return false;
                if (ctrAtSel === 'nao' && !(c._contratosAtivos === 0 && c._contratosInativos > 0)) return false;
                if (ctrAtSel === 'sem' && !(c._contratosAtivos === 0 && c._contratosInativos === 0)) return false;
                return true;
            });
        }

        if (tipo === 'enderecos') {
            const qCli = normStr(f.cliente);
            const qMun = normStr(f.municipioUf);
            const qZona = normStr(f.zona);
            return dados.filter(e => {
                if (q && !e._search.includes(q)) return false;
                if (qCli && !e._cliNorm.includes(qCli)) return false;
                if (qZona && e._zonaNorm !== qZona) return false;
                if (qMun && !e._munNorm.includes(qMun)) return false;
                return true;
            });
        }

        if (tipo === 'propostas') {
            const qProd = normStr(f.produto);
            const fasesSelNorm = Array.isArray(f.fases) ? f.fases.map(x => normStr(x)).filter(Boolean) : [];
            return dados.filter(p => {
                if (q && !p._search.includes(q)) return false;
                if (f.tipo && normStr(p.tipo) !== normStr(f.tipo)) return false;
                if (fasesSelNorm.length > 0) {
                    let rowFase = normStr(p.fase_negociacao || 'Em Elaboração');
                    if (rowFase === 'enviada') rowFase = 'proposta enviada';
                    if (rowFase === 'aprovado - aditivo assinado') rowFase = 'proposta assinada';
                    if (rowFase === 'aprovado') rowFase = 'aprovada';
                    if (rowFase === 'reprovado') rowFase = 'reprovada';
                    if (rowFase === 'cancelado') rowFase = 'cancelada';
                    if (rowFase === 'pre-aprovada') rowFase = 'pre aprovada';
                    if (!fasesSelNorm.includes(rowFase)) return false;
                }
                if (!atendentePassaFiltro(p, f.atendentes)) return false;
                if (qProd && !p._produtosNorm.includes(qProd)) return false;
                const dt = String(p.data_cadastro || '').substring(0, 10);
                if (f.de && (!dt || dt < f.de)) return false;
                if (f.ate && (!dt || dt > f.ate)) return false;
                const pIni = String(p.periodo_inicio || '').substring(0, 10);
                const pFim = String(p.periodo_fim || p.periodo_inicio || '').substring(0, 10);
                if (f.perDe && (!pFim || pFim < f.perDe)) return false;
                if (f.perAte && (!pIni || pIni > f.perAte)) return false;
                return true;
            });
        }

        if (tipo === 'contratos') {
            const fSitNorm = normStr(f.situacao);
            return dados.filter(p => {
                if (q && !p._search.includes(q)) return false;
                if (f.tipo && normStr(p.tipo) !== normStr(f.tipo)) return false;
                if (fSitNorm) {
                    const rowSit = normStr(p.situacao_contrato || 'EM ELABORAÇÃO');
                    if (rowSit !== fSitNorm) return false;
                }
                if (!atendentePassaFiltro(p, f.atendentes)) return false;
                const dt = String(p.aprovado_em || p.data_cadastro || '').substring(0, 10);
                if (f.de && (!dt || dt < f.de)) return false;
                if (f.ate && (!dt || dt > f.ate)) return false;
                return true;
            });
        }

        if (tipo === 'os') {
            const qEquip = normStr(f.equipamento);
            const qServ = normStr(f.servico);
            return dados.filter(p => {
                if (q && !p._search.includes(q)) return false;
                if (f.modalidade && normStr(p._modalidade) !== normStr(f.modalidade)) return false;
                if (f.tipoOs && normStr(p.os_tipo_operacao || 'Envio') !== normStr(f.tipoOs)) return false;
                if (f.statusOs && normStr(p.status_os || 'EM ELABORAÇÃO') !== normStr(f.statusOs)) return false;
                if (!atendentePassaFiltro(p, f.atendentes)) return false;
                if (qEquip && !p._equipamentosNorm.includes(qEquip)) return false;
                if (qServ && !p._servicosNorm.includes(qServ)) return false;
                const dt = String(p.os_criada_em || p.data_cadastro || '').substring(0, 10);
                if (f.de && (!dt || dt < f.de)) return false;
                if (f.ate && (!dt || dt > f.ate)) return false;
                return true;
            });
        }

        return dados;
    }

    function montarConfiguracaoTabelaEExcel(tipo, filtrados) {
        if (tipo === 'clientes') {
            const colunas = [
                { key: 'codigo', label: 'Código', width: 12, widthPx: 80, ocultarTela: true },
                { key: 'razao_social', label: 'Razão Social / Nome Fantasia', width: 42, widthPx: 320, tipo: 'multilinha' },
                { key: 'grupo', label: 'Grupo', width: 15, widthPx: 120 },
                { key: 'cpf_cnpj', label: 'CPF / CNPJ', width: 20, widthPx: 155 },
                { key: 'atendente', label: 'Atendente', width: 22, widthPx: 170 },
                { key: 'contratos_ativos', label: 'Ctr. Ativos', width: 14, widthPx: 115 },
                { key: 'contratos_inativos', label: 'Ctr. Inativos', width: 14, widthPx: 120 },
                { key: 'cidade_uf', label: 'Município / UF', width: 24, widthPx: 165 },
                { key: 'criado_em', label: 'Cadastro', width: 14, widthPx: 105 }
            ];
            const linhasExcel = filtrados.map(c => {
                const razao = limparNomeClienteParaExcel(c.nome_razao_social || c.nome_fantasia || '');
                const fant = String(c.nome_fantasia || '').trim();
                const razaoFant = (fant && normStr(fant) !== normStr(razao)) ? `${razao}\nFantasia: ${fant}` : razao;
                return {
                    codigo: c.codigo || c.id || '',
                    razao_social: razaoFant,
                    grupo: c.grupo_clientes || c.classificacao || 'Sem Grupo',
                    cpf_cnpj: c.cpf_cnpj || '',
                    atendente: c._atendExib || '—',
                    contratos_ativos: c._contratosAtivos || 0,
                    contratos_inativos: c._contratosInativos || 0,
                    cidade_uf: [c.municipio, c.uf].filter(Boolean).join('/') || '',
                    criado_em: fmtDataBr(c.criado_em)
                };
            });
            return { colunas, linhasExcel };
        }

        if (tipo === 'enderecos') {
            const colunas = [
                { key: 'cliente', label: 'Cliente', width: 38, widthPx: 270 },
                { key: 'nome_local', label: 'Nome do Local', width: 26, widthPx: 185 },
                { key: 'endereco', label: 'Logradouro', width: 36, widthPx: 260 },
                { key: 'numero', label: 'Nº', width: 10, widthPx: 75 },
                { key: 'bairro', label: 'Bairro', width: 22, widthPx: 150 },
                { key: 'municipio', label: 'Município', width: 22, widthPx: 145 },
                { key: 'uf', label: 'UF', width: 8, widthPx: 60 },
                { key: 'cep', label: 'CEP', width: 14, widthPx: 105 },
                { key: 'zona', label: 'Zona', width: 18, widthPx: 135 }
            ];
            const linhasExcel = filtrados.map(e => ({
                cliente: limparNomeClienteParaExcel(e._cliRaw || ''),
                nome_local: e.nome_local || '',
                endereco: e.endereco || '',
                numero: e.numero || '',
                bairro: e.bairro || '',
                municipio: e.municipio || '',
                uf: e.uf || '',
                cep: e.cep || '',
                zona: e._zona || 'Outra'
            }));
            return { colunas, linhasExcel };
        }

        if (tipo === 'propostas') {
            const colunas = [
                { key: 'codigo', label: 'Nº Proposta', width: 14, widthPx: 95 },
                { key: 'data_cadastro', label: 'Data Cadastro', width: 14, widthPx: 110 },
                { key: 'tipo', label: 'Tipo', width: 18, widthPx: 125 },
                { key: 'cliente', label: 'Cliente', width: 38, widthPx: 260 },
                { key: 'contato', label: 'Contato', width: 24, widthPx: 155, ocultarTela: true },
                { key: 'atendente', label: 'Atendente', width: 22, widthPx: 150, ocultarTela: true },
                { key: 'fase', label: 'Fase de Negociação', width: 24, widthPx: 185 },
                { key: 'periodo', label: 'Período (Início / Fim)', width: 25, widthPx: 180 },
                { key: 'produtos', label: 'Produtos', width: 42, widthPx: 220, tipo: 'multilinha' },
                { key: 'valor_total', label: 'Valor Total', width: 18, widthPx: 125, tipo: 'moeda' },
                { key: 'contrato', label: 'Contrato', width: 14, widthPx: 95 }
            ];
            const linhasExcel = filtrados.map(p => ({
                codigo: p.codigo || '',
                data_cadastro: fmtDataBr(p.data_cadastro),
                tipo: p.tipo || '',
                cliente: limparNomeClienteParaExcel(p.cliente_nome || ''),
                contato: p.contato_nome || '',
                atendente: p._atendExib || resolverAtendenteNome(p.atendente),
                fase: p.fase_negociacao || 'Em Elaboração',
                periodo: p.periodo_inicio ? `${fmtDataBr(p.periodo_inicio)} até ${fmtDataBr(p.periodo_fim || p.periodo_inicio)}` : '—',
                produtos: (p._produtosList && p._produtosList.length) ? p._produtosList.join('\n') : '—',
                valor_total: Number(p.valor_total || 0),
                contrato: p.contrato || ''
            }));
            return { colunas, linhasExcel };
        }

        if (tipo === 'contratos') {
            const colunas = [
                { key: 'contrato', label: 'Nº Contrato', width: 14, widthPx: 95 },
                { key: 'codigo', label: 'Nº Proposta', width: 14, widthPx: 95 },
                { key: 'data_emissao', label: 'Data Emissão', width: 14, widthPx: 105 },
                { key: 'tipo', label: 'Tipo', width: 18, widthPx: 120 },
                { key: 'titulo', label: 'Título', width: 30, widthPx: 185 },
                { key: 'cliente', label: 'Cliente', width: 38, widthPx: 240 },
                { key: 'contato', label: 'Contato', width: 24, widthPx: 145 },
                { key: 'atendente', label: 'Atendente', width: 22, widthPx: 145 },
                { key: 'situacao', label: 'Situação do Contrato', width: 26, widthPx: 205 },
                { key: 'periodo', label: 'Período (Início / Fim)', width: 25, widthPx: 175 },
                { key: 'produtos', label: 'Produtos', width: 42, widthPx: 220, tipo: 'multilinha' },
                { key: 'valor_total', label: 'Valor Total', width: 18, widthPx: 125, tipo: 'moeda' },
                { key: 'numero_os', label: 'Nº OS', width: 12, widthPx: 85 }
            ];
            const linhasExcel = filtrados.map(p => ({
                contrato: p.contrato || '',
                codigo: p.codigo || '',
                data_emissao: fmtDataBr(String(p.aprovado_em || '').substring(0, 10) || p.data_cadastro),
                tipo: p.tipo || '',
                titulo: p.titulo_contrato || '',
                cliente: limparNomeClienteParaExcel(p.cliente_nome || ''),
                contato: p.contato_nome || '',
                atendente: p._atendExib || resolverAtendenteNome(p.atendente),
                situacao: p.situacao_contrato || 'EM ELABORAÇÃO',
                periodo: p.periodo_inicio ? `${fmtDataBr(p.periodo_inicio)} até ${fmtDataBr(p.periodo_fim || p.periodo_inicio)}` : '—',
                produtos: (p._produtosList && p._produtosList.length) ? p._produtosList.join('\n') : '—',
                valor_total: Number(p.valor_total || 0),
                numero_os: p.numero_os || ''
            }));
            return { colunas, linhasExcel };
        }

        const colunas = [
            { key: 'numero_os', label: 'Nº OS', width: 12, widthPx: 85 },
            { key: 'modalidade', label: 'Obra / Evento', width: 14, widthPx: 105 },
            { key: 'tipo_os', label: 'Tipo de OS', width: 18, widthPx: 125 },
            { key: 'data_cadastro', label: 'Data Cadastro', width: 14, widthPx: 105 },
            { key: 'contrato', label: 'Contrato', width: 14, widthPx: 95 },
            { key: 'cliente', label: 'Cliente', width: 38, widthPx: 240 },
            { key: 'contato', label: 'Contato', width: 24, widthPx: 150 },
            { key: 'atendente', label: 'Atendente', width: 22, widthPx: 145 },
            { key: 'status_os', label: 'Status da OS', width: 26, widthPx: 195 },
            { key: 'equipamentos', label: 'Equipamentos', width: 40, widthPx: 240, tipo: 'multilinha' },
            { key: 'servicos', label: 'Serviços', width: 34, widthPx: 210, tipo: 'multilinha' },
            { key: 'data_entrega', label: 'Data Entrega', width: 14, widthPx: 105 },
            { key: 'data_retirada', label: 'Data Retirada', width: 14, widthPx: 105 },
            { key: 'endereco', label: 'Endereço(s) de Instalação', width: 45, widthPx: 280 }
        ];
        const linhasExcel = filtrados.map(p => {
            const dts = p._dtsOs || extrairDatasOs(p);
            return {
                numero_os: p.numero_os || '',
                modalidade: p._modalidade || resolverModalidadeOs(p),
                tipo_os: p.os_tipo_operacao || 'Envio',
                data_cadastro: fmtDataBr(String(p.os_criada_em || '').substring(0, 10) || p.data_cadastro),
                contrato: p.contrato || '',
                cliente: limparNomeClienteParaExcel(p.cliente_nome || ''),
                contato: p.contato_nome || '',
                atendente: p._atendExib || resolverAtendenteNome(p.atendente),
                status_os: p.status_os || 'EM ELABORAÇÃO',
                equipamentos: (p._equipamentosList && p._equipamentosList.length) ? p._equipamentosList.join('\n') : '—',
                servicos: (p._servicosList && p._servicosList.length) ? p._servicosList.join('\n') : '—',
                data_entrega: dts.data_entrega ? fmtDataBr(dts.data_entrega) : '—',
                data_retirada: dts.data_retirada ? fmtDataBr(dts.data_retirada) : '—',
                endereco: p.endereco_instalacao || ''
            };
        });
        return { colunas, linhasExcel };
    }

    function renderListaCompactaHtml(itens, corBg = '#f1f5f9', corTxt = '#334155', corBorda = '#cbd5e1') {
        if (!Array.isArray(itens) || !itens.length) return '<span style="color:#94a3b8;">—</span>';
        return `<div style="display:flex; flex-direction:column; gap:3px; min-width:0; max-width:100%;">
            ${itens.map(item => `<div style="background:${corBg}; color:${corTxt}; border:1px solid ${corBorda}; border-radius:6px; padding:2px 7px; font-size:0.72rem; font-weight:700; line-height:1.25; white-space:normal; overflow-wrap:break-word;">${esc(item)}</div>`).join('')}
        </div>`;
    }

    function renderBadgeZonaHtml(zonaRaw) {
        const z = String(zonaRaw || 'Outra').trim() || 'Outra';
        const zn = normStr(z);
        let bg = '#f1f5f9', txt = '#475569', bd = '#cbd5e1';
        if (zn.includes('central')) {
            bg = '#dbeafe'; txt = '#1d4ed8'; bd = '#bfdbfe';
        } else if (zn.includes('amarela')) {
            bg = '#fef9c3'; txt = '#a16207'; bd = '#fde047';
        } else if (zn.includes('vermelha')) {
            bg = '#fee2e2'; txt = '#b91c1c'; bd = '#fecaca';
        }
        return `<span style="background:${bg}; color:${txt}; border:1px solid ${bd}; padding:2px 8px; border-radius:999px; font-size:0.72rem; font-weight:800; white-space:nowrap; display:inline-block;">${esc(z)}</span>`;
    }

    function renderNomeClienteClicavelHtml(nomeExib, { clienteId = '', clienteNomeLimpo = '', grupo = '' } = {}) {
        const txt = String(nomeExib || '').trim();
        if (!txt || txt === '—') return '—';
        const nomeLimpoFinal = String(clienteNomeLimpo || limparNomeClienteParaExcel(txt)).trim();
        return `<button type="button" data-cli-id="${esc(clienteId || '')}" data-cli-nome="${esc(nomeLimpoFinal)}" data-cli-grupo="${esc(grupo || '')}"
            onclick="window._comercialRelatorios.abrirHistoricoPorElemento(this)"
            title="Clique para ver o histórico de movimentações deste cliente (Propostas, Contratos, OS e Faturamento)"
            style="background:none; border:none; padding:0; margin:0; text-align:left; font:inherit; font-weight:700; color:#1e293b; cursor:pointer; text-decoration:underline; text-decoration-color:#cbd5e1; text-underline-offset:3px; max-width:100%; white-space:normal; overflow-wrap:break-word;"
            onmouseover="this.style.color='#5f3dc4'; this.style.textDecorationColor='#7048e8';"
            onmouseout="this.style.color='#1e293b'; this.style.textDecorationColor='#cbd5e1';">${esc(txt)}</button>`;
    }

    function renderProdutosExpansivelHtml(itens, uidKey) {
        if (!Array.isArray(itens) || !itens.length) {
            return '<span style="color:#94a3b8;">—</span>';
        }
        const safeKey = String(uidKey || '').replace(/[^\w\-]/g, '_');
        const aberto = produtosExpandidosSet.has(safeKey);
        const qtdLabel = itens.length === 1 ? '1 produto' : `${itens.length} produtos`;
        return `<div style="min-width:0; max-width:100%;">
            <button type="button" onclick="window._comercialRelatorios.toggleDetalhesProdutos('${safeKey}', this)"
                style="width:100%; background:${aberto ? '#eef2ff' : '#f8fafc'}; color:${aberto ? '#4338ca' : '#334155'}; border:1px solid ${aberto ? '#c7d2fe' : '#cbd5e1'}; border-radius:7px; padding:4px 9px; font-size:0.74rem; font-weight:700; display:flex; align-items:center; justify-content:space-between; gap:6px; cursor:pointer; box-sizing:border-box;">
                <span style="display:inline-flex; align-items:center; gap:5px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                    <i class="ph ph-package" style="font-size:0.86rem; color:#6366f1; flex-shrink:0;"></i>
                    <span>${esc(qtdLabel)}</span>
                </span>
                <i class="ph ph-caret-down comrel-prod-seta" style="font-size:0.82rem; flex-shrink:0; transition:transform 0.18s ease; transform:${aberto ? 'rotate(180deg)' : 'rotate(0deg)'};"></i>
            </button>
            <div id="comrel-prod-det-${safeKey}" style="display:${aberto ? 'flex' : 'none'}; flex-direction:column; gap:3px; margin-top:5px; min-width:0; max-width:100%;">
                ${itens.map(item => `<div style="background:#f8fafc; color:#1e293b; border:1px solid #e2e8f0; border-radius:6px; padding:3px 7px; font-size:0.72rem; font-weight:700; line-height:1.25; white-space:normal; overflow-wrap:break-word;">${esc(item)}</div>`).join('')}
            </div>
        </div>`;
    }

    function obterConfigFaseBadgeLocal(faseRaw) {
        if (typeof window.obterConfigFaseNegociacao === 'function') {
            const cfg = window.obterConfigFaseNegociacao(faseRaw);
            if (cfg && cfg.icon && cfg.icon !== 'ph-circle') return cfg;
        }
        const fn = normStr(faseRaw);
        if (!fn || fn === 'em elaboracao') return { nome: 'EM ELABORAÇÃO', bg: '#fef9c3', text: '#a16207', border: '#fde047', icon: 'ph-pencil' };
        if (fn === 'proposta enviada' || fn === 'enviada') return { nome: 'PROPOSTA ENVIADA', bg: '#f3e8ff', text: '#7e22ce', border: '#d8b4fe', icon: 'ph-paper-plane-right' };
        if (fn === 'pre aprovada' || fn === 'pre-aprovada') return { nome: 'PRÉ APROVADA', bg: '#dbeafe', text: '#1d4ed8', border: '#bfdbfe', icon: 'ph-seal-check' };
        if (fn === 'enviado para assinatura') return { nome: 'ENVIADO PARA ASSINATURA', bg: '#ccfbf1', text: '#0f766e', border: '#5eead4', icon: 'ph-paper-plane-tilt' };
        if (fn === 'proposta assinada' || fn === 'aprovado - aditivo assinado') return { nome: 'PROPOSTA ASSINADA', bg: '#dcfce7', text: '#15803d', border: '#bbf7d0', icon: 'ph-seal-check' };
        if (fn === 'aprovada' || fn === 'aprovado') return { nome: 'APROVADA', bg: '#dcfce7', text: '#15803d', border: '#bbf7d0', icon: 'ph-check-circle' };
        if (fn === 'reprovada' || fn === 'reprovado') return { nome: 'REPROVADA', bg: '#fee2e2', text: '#b91c1c', border: '#fecaca', icon: 'ph-x-circle' };
        if (fn === 'sem resposta') return { nome: 'SEM RESPOSTA', bg: '#ffedd5', text: '#c2410c', border: '#fed7aa', icon: 'ph-clock-countdown' };
        if (fn === 'em negociacao') return { nome: 'EM NEGOCIAÇÃO', bg: '#ffedd5', text: '#c2410c', border: '#fed7aa', icon: 'ph-arrows-left-right' };
        if (fn === 'cancelada' || fn === 'cancelado') return { nome: 'CANCELADA', bg: '#0f172a', text: '#ffffff', border: '#0f172a', icon: 'ph-prohibit' };
        return { nome: String(faseRaw || 'EM ELABORAÇÃO').toUpperCase(), bg: '#e2e8f0', text: '#475569', border: '#cbd5e1', icon: 'ph-circle' };
    }

    function renderBadgeFaseMaiusculaHtml(faseRaw, compacto = false) {
        const cfg = obterConfigFaseBadgeLocal(faseRaw);
        const pad = compacto ? '1px 8px' : '2px 10px';
        const fz = compacto ? '0.68rem' : '0.72rem';
        return `<span style="background:${cfg.bg}; color:${cfg.text}; border:1px solid ${cfg.border || cfg.bg}; padding:${pad}; border-radius:999px; font-size:${fz}; font-weight:800; white-space:nowrap; display:inline-flex; align-items:center; gap:4px; text-transform:uppercase;">
            <i class="ph ${cfg.icon || 'ph-circle'}" style="font-size:0.82rem;"></i> ${esc(String(cfg.nome || faseRaw || '').toUpperCase())}
        </span>`;
    }

    function renderLinhasHtml(tipo, paginaLinhas, totalCols = 10) {
        if (!paginaLinhas.length) {
            return `<tr><td colspan="${totalCols}" style="text-align:center; padding:2rem; color:#94a3b8; font-style:italic;">Nenhum registro encontrado para os filtros informados.</td></tr>`;
        }

        if (tipo === 'clientes') {
            return paginaLinhas.map(c => {
                const grupo = c.grupo_clientes || c.classificacao || '';
                const razaoLimpa = limparNomeClienteParaExcel(c.nome_razao_social || c.nome_fantasia || '');
                const nomeExibCli = c._nomeExib || c.nome_razao_social || '—';
                const fantTxt = String(c.nome_fantasia || '').trim();
                const mostrarFantasiaAbaixo = Boolean(fantTxt && normStr(fantTxt) !== normStr(razaoLimpa));
                const nomeHtml = renderNomeClienteClicavelHtml(nomeExibCli, {
                    clienteId: c.id || '',
                    clienteNomeLimpo: razaoLimpa,
                    grupo
                });
                const cAtivos = Number(c._contratosAtivos) || 0;
                const cInativos = Number(c._contratosInativos) || 0;
                return `<tr style="border-bottom:1px solid #e2e8f0;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background=''">
                    <td style="padding:7px 10px; font-weight:700; color:#0f172a; overflow-wrap:break-word;">
                        <div>${nomeHtml}</div>
                        ${mostrarFantasiaAbaixo ? `<div style="margin-top:2px; font-size:0.73rem; font-weight:500; color:#64748b; overflow-wrap:break-word;">${esc(fantTxt)}</div>` : ''}
                    </td>
                    <td style="padding:7px 10px; white-space:nowrap;">${grupo ? `<span style="background:#f3f0ff; color:#5f3dc4; border:1px solid #d0bfff; padding:2px 8px; border-radius:999px; font-size:0.72rem; font-weight:700;">${esc(grupo)}</span>` : '<span style="color:#94a3b8;">—</span>'}</td>
                    <td style="padding:7px 10px; white-space:nowrap; color:#334155; overflow:hidden; text-overflow:ellipsis;" title="${esc(c.cpf_cnpj || '')}">${esc(c.cpf_cnpj || '—')}</td>
                    <td style="padding:7px 10px; color:#334155; overflow-wrap:break-word;">${esc(c._atendExib || '—')}</td>
                    <td style="padding:7px 10px; text-align:center; white-space:nowrap;">
                        <span style="background:${cAtivos > 0 ? '#dcfce7' : '#f1f5f9'}; color:${cAtivos > 0 ? '#15803d' : '#64748b'}; border:1px solid ${cAtivos > 0 ? '#86efac' : '#cbd5e1'}; padding:2px 9px; border-radius:999px; font-size:0.72rem; font-weight:800;">${cAtivos}</span>
                    </td>
                    <td style="padding:7px 10px; text-align:center; white-space:nowrap;">
                        <span style="background:${cInativos > 0 ? '#ffedd5' : '#f1f5f9'}; color:${cInativos > 0 ? '#c2410c' : '#64748b'}; border:1px solid ${cInativos > 0 ? '#fed7aa' : '#cbd5e1'}; padding:2px 9px; border-radius:999px; font-size:0.72rem; font-weight:800;">${cInativos}</span>
                    </td>
                    <td style="padding:7px 10px; white-space:nowrap; color:#475569; overflow:hidden; text-overflow:ellipsis;" title="${esc([c.municipio, c.uf].filter(Boolean).join('/'))}">${esc([c.municipio, c.uf].filter(Boolean).join('/') || '—')}</td>
                    <td style="padding:7px 10px; white-space:nowrap; color:#64748b;">${esc(fmtDataBr(c.criado_em))}</td>
                </tr>`;
            }).join('');
        }

        if (tipo === 'enderecos') {
            return paginaLinhas.map(e => {
                return `<tr style="border-bottom:1px solid #e2e8f0;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background=''">
                <td style="padding:7px 10px; font-weight:700; color:#0f172a; overflow-wrap:break-word;">${esc(e._cliExib || '—')}</td>
                <td style="padding:7px 10px; font-weight:600; color:#5f3dc4; overflow-wrap:break-word;">${esc(e.nome_local || '—')}</td>
                <td style="padding:7px 10px; color:#334155; overflow-wrap:break-word;">${esc(e.endereco || '—')}</td>
                <td style="padding:7px 10px; color:#334155; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${esc(e.numero || 'S/N')}</td>
                <td style="padding:7px 10px; color:#475569; overflow-wrap:break-word;">${esc(e.bairro || '—')}</td>
                <td style="padding:7px 10px; color:#475569; overflow-wrap:break-word;">${esc(e.municipio || '—')}</td>
                <td style="padding:7px 10px; font-weight:700; color:#334155; white-space:nowrap;">${esc(e.uf || '—')}</td>
                <td style="padding:7px 10px; white-space:nowrap; color:#64748b;">${esc(e.cep || '—')}</td>
                <td style="padding:7px 10px; white-space:nowrap;">${renderBadgeZonaHtml(e._zona || e.zona)}</td>
            </tr>`;
            }).join('');
        }

        if (tipo === 'propostas') {
            return paginaLinhas.map(p => {
                const cliExib = formatarNomeComGrupoRapido(p.cliente_nome || '—', '');
                const faseHtml = renderBadgeFaseMaiusculaHtml(p.fase_negociacao || 'Em Elaboração');
                const perStr = p.periodo_inicio ? `${fmtDataBr(p.periodo_inicio)} até ${fmtDataBr(p.periodo_fim || p.periodo_inicio)}` : '—';
                return `<tr style="border-bottom:1px solid #e2e8f0;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background=''">
                    <td style="padding:8px 10px; text-align:center; white-space:nowrap;">
                        <button type="button" onclick="if(window.abrirPropostaDiretoId) window.abrirPropostaDiretoId(${Number(p.id)})"
                            style="background:#2563eb; color:#fff; border:none; padding:3px 10px; border-radius:6px; font-weight:800; font-size:0.75rem; cursor:pointer;">${esc(p.codigo || '—')}</button>
                    </td>
                    <td style="padding:8px 10px; white-space:nowrap; color:#475569;">${esc(fmtDataBr(p.data_cadastro))}</td>
                    <td style="padding:8px 10px; font-weight:700; color:#334155; white-space:nowrap;">${esc(p.tipo || '—')}</td>
                    <td style="padding:8px 10px; font-weight:700; color:#0f172a; overflow-wrap:break-word;">${esc(cliExib)}</td>
                    <td style="padding:8px 10px; white-space:nowrap;">${faseHtml}</td>
                    <td style="padding:8px 10px; white-space:nowrap; color:#475569;">${esc(perStr)}</td>
                    <td style="padding:8px 10px;">${renderProdutosExpansivelHtml(p._produtosList, 'prop_' + p.id)}</td>
                    <td style="padding:8px 10px; text-align:right; font-weight:700; color:#15803d; white-space:nowrap;">${esc(fmtMoeda(p.valor_total))}</td>
                    <td style="padding:8px 10px; text-align:center; white-space:nowrap;">${p.contrato ? `<button type="button" onclick="if(window.abrirContratoDaProposta) window.abrirContratoDaProposta(${Number(p.id)})" style="background:#eab308; color:#0f172a; border:1px solid #ca8a04; padding:2px 9px; border-radius:6px; font-weight:800; font-size:0.74rem; cursor:pointer;">${esc(p.contrato)}</button>` : '—'}</td>
                </tr>`;
            }).join('');
        }

        if (tipo === 'contratos') {
            return paginaLinhas.map(p => {
                const cliExib = formatarNomeComGrupoRapido(p.cliente_nome || '—', '');
                const sitHtml = typeof window.renderBadgeSituacaoContratoHtml === 'function'
                    ? window.renderBadgeSituacaoContratoHtml(p.situacao_contrato || 'EM ELABORAÇÃO', false)
                    : esc(p.situacao_contrato || 'EM ELABORAÇÃO');
                const dtEm = fmtDataBr(String(p.aprovado_em || '').substring(0, 10) || p.data_cadastro);
                const perStr = p.periodo_inicio ? `${fmtDataBr(p.periodo_inicio)} até ${fmtDataBr(p.periodo_fim || p.periodo_inicio)}` : '—';
                return `<tr style="border-bottom:1px solid #e2e8f0;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background=''">
                    <td style="padding:8px 10px; text-align:center; white-space:nowrap;">
                        <button type="button" onclick="if(window.abrirContratoDaProposta) window.abrirContratoDaProposta(${Number(p.id)})"
                            style="background:#eab308; color:#0f172a; border:1px solid #ca8a04; padding:3px 10px; border-radius:6px; font-weight:800; font-size:0.75rem; cursor:pointer;">${esc(p.contrato || '—')}</button>
                    </td>
                    <td style="padding:8px 10px; text-align:center; white-space:nowrap;">
                        ${p.codigo ? `<button type="button" onclick="if(window.abrirPropostaDiretoId) window.abrirPropostaDiretoId(${Number(p.id)})"
                            style="background:#2563eb; color:#ffffff; border:none; padding:3px 10px; border-radius:6px; font-weight:800; font-size:0.75rem; cursor:pointer;">${esc(p.codigo)}</button>` : '—'}
                    </td>
                    <td style="padding:8px 10px; white-space:nowrap; color:#475569;">${esc(dtEm)}</td>
                    <td style="padding:8px 10px; font-weight:700; color:#334155; white-space:nowrap;">${esc(p.tipo || '—')}</td>
                    <td style="padding:8px 10px; color:#334155; overflow-wrap:break-word;">${esc(p.titulo_contrato || '—')}</td>
                    <td style="padding:8px 10px; font-weight:700; color:#0f172a; overflow-wrap:break-word;">${esc(cliExib)}</td>
                    <td style="padding:8px 10px; color:#475569; overflow-wrap:break-word;">${esc(p.contato_nome || '—')}</td>
                    <td style="padding:8px 10px; color:#334155; white-space:nowrap;">${esc(p._atendExib || '—')}</td>
                    <td style="padding:8px 10px; white-space:nowrap;">${sitHtml}</td>
                    <td style="padding:8px 10px; white-space:nowrap; color:#475569;">${esc(perStr)}</td>
                    <td style="padding:8px 10px;">${renderProdutosExpansivelHtml(p._produtosList, 'ctr_' + p.id)}</td>
                    <td style="padding:8px 10px; text-align:right; font-weight:700; color:#15803d; white-space:nowrap;">${esc(fmtMoeda(p.valor_total))}</td>
                    <td style="padding:8px 10px; text-align:center; white-space:nowrap;">${p.numero_os ? `<button type="button" onclick="if(window.abrirOsComercialDaProposta) window.abrirOsComercialDaProposta(${Number(p.id)})" style="background:#16a34a; color:#ffffff; border:none; padding:3px 9px; border-radius:6px; font-weight:800; font-size:0.74rem; cursor:pointer;">${esc(p.numero_os)}</button>` : '—'}</td>
                </tr>`;
            }).join('');
        }

        return paginaLinhas.map(p => {
            const cliExib = formatarNomeComGrupoRapido(p.cliente_nome || '—', '');
            const nomeHtml = renderNomeClienteClicavelHtml(cliExib, {
                clienteId: '',
                clienteNomeLimpo: limparNomeClienteParaExcel(p.cliente_nome || ''),
                grupo: ''
            });
            const mod = p._modalidade || resolverModalidadeOs(p);
            const modHtml = typeof window.renderBadgeModalidadeObraEventoOsHtml === 'function'
                ? window.renderBadgeModalidadeObraEventoOsHtml(mod)
                : esc(mod);
            const stHtml = typeof window.renderBadgeStatusOsComercialHtml === 'function'
                ? window.renderBadgeStatusOsComercialHtml(p.status_os || 'EM ELABORAÇÃO')
                : esc(p.status_os || 'EM ELABORAÇÃO');
            const dts = p._dtsOs || extrairDatasOs(p);
            const dtCad = fmtDataBr(String(p.os_criada_em || '').substring(0, 10) || p.data_cadastro);
            return `<tr style="border-bottom:1px solid #e2e8f0;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background=''">
                <td style="padding:8px 10px; text-align:center; white-space:nowrap;">
                    <button type="button" onclick="if(window.abrirOsComercialDaProposta) window.abrirOsComercialDaProposta(${Number(p.id)})"
                        style="background:#16a34a; color:#fff; border:none; padding:3px 10px; border-radius:6px; font-weight:800; font-size:0.75rem; cursor:pointer;">${esc(p.numero_os || '—')}</button>
                </td>
                <td style="padding:8px 10px; white-space:nowrap;">${modHtml}</td>
                <td style="padding:8px 10px; font-weight:700; color:#334155; white-space:nowrap;">${esc(p.os_tipo_operacao || 'Envio')}</td>
                <td style="padding:8px 10px; white-space:nowrap; color:#475569;">${esc(dtCad)}</td>
                <td style="padding:8px 10px; text-align:center; white-space:nowrap;">
                    ${p.contrato ? `<button type="button" onclick="if(window.abrirContratoDaProposta) window.abrirContratoDaProposta(${Number(p.id)})"
                        style="background:#eab308; color:#0f172a; border:1px solid #ca8a04; padding:3px 10px; border-radius:6px; font-weight:800; font-size:0.75rem; cursor:pointer;">${esc(p.contrato)}</button>` : '—'}
                </td>
                <td style="padding:8px 10px; font-weight:600; color:#0f172a;">${nomeHtml}</td>
                <td style="padding:8px 10px; color:#475569;">${esc(p.contato_nome || '—')}</td>
                <td style="padding:8px 10px; color:#334155; white-space:nowrap;">${esc(p._atendExib || '—')}</td>
                <td style="padding:8px 10px; white-space:nowrap;">${stHtml}</td>
                <td style="padding:8px 10px;">${renderListaCompactaHtml(p._equipamentosList, '#fefce8', '#854d0e', '#fde68a')}</td>
                <td style="padding:8px 10px;">${renderListaCompactaHtml(p._servicosList, '#eff6ff', '#1e40af', '#bfdbfe')}</td>
                <td style="padding:8px 10px; white-space:nowrap; color:#475569;">${dts.data_entrega ? esc(fmtDataBr(dts.data_entrega)) : '—'}</td>
                <td style="padding:8px 10px; white-space:nowrap; color:#475569;">${dts.data_retirada ? esc(fmtDataBr(dts.data_retirada)) : '—'}</td>
                <td style="padding:8px 10px; color:#475569; max-width:340px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${esc(p.endereco_instalacao || '')}">${esc(p.endereco_instalacao || '—')}</td>
            </tr>`;
        }).join('');
    }

    function renderAtendenteMultiHtml(tipo, flexCss = 'flex:1.2 1 200px;') {
        const st = stateByTipo[tipo];
        const sel = Array.isArray(st?.filtros?.atendentes) ? st.filtros.atendentes : [];
        const resumo = sel.length === 0
            ? 'Todos os atendentes'
            : (sel.length === 1 ? sel[0] : `${sel.length} selecionado(s)`);
        const lblSt = 'display:block; font-size:0.72rem; font-weight:700; color:#475569; margin-bottom:3px;';
        return `
            <div style="${flexCss}">
                <label style="${lblSt}">Atendente(s)</label>
                <div id="comrel-${tipo}-atend-wrap" class="comrel-atend-wrap" style="position:relative; width:100%;">
                    <button type="button" id="comrel-${tipo}-atend-btn" onclick="window._comercialRelatorios.toggleDropdownAtendentes('${tipo}', event)"
                        style="width:100%; height:34px; padding:0 10px; border:1px solid #cbd5e1; border-radius:7px; background:#fff; color:#1e293b; font-size:0.81rem; font-weight:${sel.length ? '700' : '500'}; display:flex; align-items:center; justify-content:space-between; gap:6px; cursor:pointer; box-sizing:border-box;">
                        <span id="comrel-${tipo}-atend-lbl" style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${esc(resumo)}</span>
                        <i class="ph ph-caret-down" style="font-size:0.85rem; color:#64748b; flex-shrink:0;"></i>
                    </button>
                    <div id="comrel-${tipo}-atend-dropdown" style="display:none; position:absolute; top:calc(100% + 4px); left:0; min-width:290px; width:100%; max-height:290px; background:#fff; border:1px solid #cbd5e1; border-radius:8px; box-shadow:0 10px 25px rgba(15,23,42,0.16); z-index:1150; overflow:hidden;">
                        <div style="padding:7px 8px; border-bottom:1px solid #e2e8f0; background:#f8fafc; display:flex; gap:6px; align-items:center;">
                            <input type="text" id="comrel-${tipo}-atend-busca" value="${esc(st.filtros.atendBusca || '')}"
                                oninput="window._comercialRelatorios.filtrarListaAtendentes('${tipo}', this.value)"
                                placeholder="Digite para filtrar colaborador..."
                                style="flex:1; height:28px; padding:0 8px; border:1px solid #cbd5e1; border-radius:6px; font-size:0.78rem; text-transform:none; outline:none;">
                            <button type="button" onclick="window._comercialRelatorios.limparAtendentes('${tipo}', event)" title="Limpar seleção"
                                style="height:28px; padding:0 8px; border:1px solid #fecaca; background:#fef2f2; color:#dc2626; border-radius:6px; font-size:0.72rem; font-weight:700; cursor:pointer;">Limpar</button>
                        </div>
                        <div id="comrel-${tipo}-atend-lista" style="max-height:230px; overflow-y:auto;"></div>
                    </div>
                </div>
            </div>
        `;
    }

    function renderListaOpcoesAtendentes(tipo) {
        const listEl = document.getElementById(`comrel-${tipo}-atend-lista`);
        const st = stateByTipo[tipo];
        if (!listEl || !st) return;
        const busca = normStr(st.filtros.atendBusca || '');
        const selecionados = Array.isArray(st.filtros.atendentes) ? st.filtros.atendentes : [];

        // Garante ordem: Ativos primeiro, Desligados depois
        const baseOrdenada = [...atendentesComercialLista].sort((a, b) => {
            if (Boolean(a.desligado) !== Boolean(b.desligado)) return a.desligado ? 1 : -1;
            return String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR');
        });
        const filtrados = busca
            ? baseOrdenada.filter(a => normStr(a.nome).includes(busca) || normStr(a.username).includes(busca))
            : baseOrdenada;

        if (!filtrados.length) {
            listEl.innerHTML = '<div style="padding:10px; text-align:center; color:#94a3b8; font-size:0.78rem;">Nenhum colaborador encontrado.</div>';
            return;
        }

        listEl.innerHTML = filtrados.map(a => {
            const nome = String(a.nome || '').trim();
            const marcado = selecionados.some(x => normStr(x) === normStr(nome));
            const desligado = Boolean(a.desligado || String(a.status || '').toLowerCase() === 'desligado');
            const badgeHtml = desligado
                ? '<span style="background:#fee2e2; color:#b91c1c; border:1px solid #fecaca; padding:1px 7px; border-radius:999px; font-size:0.66rem; font-weight:800;">Desligado</span>'
                : '<span style="background:#dcfce7; color:#15803d; border:1px solid #bbf7d0; padding:1px 7px; border-radius:999px; font-size:0.66rem; font-weight:800;">Ativo</span>';
            const nomeEsc = nome.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
            return `<label style="display:flex; align-items:center; justify-content:space-between; gap:8px; padding:7px 10px; border-bottom:1px solid #f1f5f9; cursor:pointer; font-size:0.79rem; background:${marcado ? '#f5f3ff' : '#fff'};"
                onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='${marcado ? '#f5f3ff' : '#fff'}'">
                <span style="display:flex; align-items:center; gap:7px; color:#1e293b; font-weight:${marcado ? '700' : '600'};">
                    <input type="checkbox" ${marcado ? 'checked' : ''} onchange="window._comercialRelatorios.toggleItemAtendente('${tipo}', '${nomeEsc}', this.checked)"
                        style="width:14px; height:14px; accent-color:#7048e8; cursor:pointer; margin:0;">
                    <span>${esc(nome)}</span>
                </span>
                ${badgeHtml}
            </label>`;
        }).join('');
    }

    function obterOpcoesFasesPropostas() {
        const st = stateByTipo.propostas;
        const fasesSet = new Set(FASES_NEGOCIACAO_TODAS);
        (st?.dados || []).forEach(d => {
            const fn = String(d.fase_negociacao || '').trim();
            if (fn && normStr(fn) !== 'enviada' && normStr(fn) !== 'aprovado - aditivo assinado') {
                const jaExiste = Array.from(fasesSet).some(x => normStr(x) === normStr(fn));
                if (!jaExiste) fasesSet.add(fn);
            }
        });
        return Array.from(fasesSet);
    }

    function renderResumoBotaoFasePropostas() {
        const st = stateByTipo.propostas;
        const sel = Array.isArray(st?.filtros?.fases) ? st.filtros.fases : [];
        if (sel.length === 0) {
            return '<span style="color:#475569; font-weight:500;">Todas</span>';
        }
        if (sel.length === 1) {
            return renderBadgeFaseMaiusculaHtml(sel[0], true);
        }
        return `<span style="background:#ede9fe; color:#5f3dc4; border:1px solid #d0bfff; padding:1px 8px; border-radius:999px; font-size:0.7rem; font-weight:800; text-transform:uppercase;">${sel.length} FASES SELECIONADAS</span>`;
    }

    function renderFaseMultiHtml(flexCss = 'flex:1.25 1 205px;') {
        const st = stateByTipo.propostas;
        const lblSt = 'display:block; font-size:0.72rem; font-weight:700; color:#475569; margin-bottom:3px;';
        return `
            <div style="${flexCss}">
                <label style="${lblSt}">Fase de Negociação</label>
                <div id="comrel-propostas-fase-wrap" style="position:relative; width:100%;">
                    <button type="button" id="comrel-propostas-fase-btn" onclick="window._comercialRelatorios.toggleDropdownFases(event)"
                        style="width:100%; height:34px; padding:0 10px; border:1px solid #cbd5e1; border-radius:7px; background:#fff; color:#1e293b; font-size:0.81rem; display:flex; align-items:center; justify-content:space-between; gap:6px; cursor:pointer; box-sizing:border-box;">
                        <span id="comrel-propostas-fase-lbl" style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; display:inline-flex; align-items:center;">${renderResumoBotaoFasePropostas()}</span>
                        <i class="ph ph-caret-down" style="font-size:0.85rem; color:#64748b; flex-shrink:0;"></i>
                    </button>
                    <div id="comrel-propostas-fase-dropdown" style="display:none; position:absolute; top:calc(100% + 4px); left:0; min-width:285px; width:100%; max-height:330px; background:#fff; border:1px solid #cbd5e1; border-radius:8px; box-shadow:0 10px 25px rgba(15,23,42,0.16); z-index:1155; overflow:hidden;">
                        <div style="padding:7px 8px; border-bottom:1px solid #e2e8f0; background:#f8fafc; display:flex; gap:6px; align-items:center;">
                            <input type="text" id="comrel-propostas-fase-busca" value="${esc(st.filtros.faseBusca || '')}"
                                oninput="window._comercialRelatorios.filtrarListaFases(this.value)"
                                placeholder="Digite para filtrar fase..."
                                style="flex:1; height:28px; padding:0 8px; border:1px solid #cbd5e1; border-radius:6px; font-size:0.78rem; text-transform:none; outline:none;">
                            <button type="button" onclick="window._comercialRelatorios.limparFases(event)" title="Limpar seleção"
                                style="height:28px; padding:0 8px; border:1px solid #fecaca; background:#fef2f2; color:#dc2626; border-radius:6px; font-size:0.72rem; font-weight:700; cursor:pointer;">Limpar</button>
                        </div>
                        <div id="comrel-propostas-fase-lista" style="max-height:270px; overflow-y:auto;"></div>
                    </div>
                </div>
            </div>
        `;
    }

    function renderListaOpcoesFases() {
        const listEl = document.getElementById('comrel-propostas-fase-lista');
        const st = stateByTipo.propostas;
        if (!listEl || !st) return;
        const busca = normStr(st.filtros.faseBusca || '');
        const selecionadas = Array.isArray(st.filtros.fases) ? st.filtros.fases : [];
        const todas = obterOpcoesFasesPropostas();
        const filtradas = busca
            ? todas.filter(fs => normStr(fs).includes(busca) || normStr(obterConfigFaseBadgeLocal(fs).nome).includes(busca))
            : todas;

        if (!filtradas.length) {
            listEl.innerHTML = '<div style="padding:10px; text-align:center; color:#94a3b8; font-size:0.78rem;">Nenhuma fase encontrada.</div>';
            return;
        }

        listEl.innerHTML = filtradas.map(fs => {
            const marcado = selecionadas.some(x => normStr(x) === normStr(fs));
            const fsEsc = String(fs).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
            return `<label style="display:flex; align-items:center; gap:8px; padding:7px 10px; border-bottom:1px solid #f1f5f9; cursor:pointer; background:${marcado ? '#f5f3ff' : '#fff'};"
                onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='${marcado ? '#f5f3ff' : '#fff'}'">
                <input type="checkbox" ${marcado ? 'checked' : ''} onchange="window._comercialRelatorios.toggleItemFase('${fsEsc}', this.checked)"
                    style="width:14px; height:14px; accent-color:#7048e8; cursor:pointer; margin:0; flex-shrink:0;">
                ${renderBadgeFaseMaiusculaHtml(fs, false)}
            </label>`;
        }).join('');
    }

    function renderFiltrosHtml(tipo) {
        const st = stateByTipo[tipo];
        const f = st.filtros;
        const inpSt = 'height:34px; padding:0 10px; border:1px solid #cbd5e1; border-radius:7px; font-size:0.81rem; background:#fff; color:#1e293b; box-sizing:border-box; outline:none; text-transform:none;';
        const lblSt = 'display:block; font-size:0.72rem; font-weight:700; color:#475569; margin-bottom:3px;';

        if (tipo === 'clientes') {
            return `
                <div style="flex:2 1 240px;">
                    <label style="${lblSt}">Pesquisar</label>
                    <input type="text" data-filtro="q" value="${esc(f.q)}" oninput="window._comercialRelatorios.onInputFiltro('${tipo}', 'q', this.value, true)"
                        placeholder="Digite código, razão social, fantasia, CNPJ/CPF, atendente..." style="width:100%; ${inpSt}">
                </div>
                <div style="flex:0.9 1 140px;">
                    <label style="${lblSt}">Grupo de Clientes</label>
                    <select onchange="window._comercialRelatorios.onInputFiltro('${tipo}', 'grupo', this.value, false)" style="width:100%; ${inpSt}">
                        <option value="">Todos</option>
                        ${['Diamante', 'Ouro', 'Prata', 'Bronze'].map(g => `<option value="${g}" ${f.grupo === g ? 'selected' : ''}>${g}</option>`).join('')}
                        <option value="__sem__" ${f.grupo === '__sem__' ? 'selected' : ''}>Sem Grupo</option>
                    </select>
                </div>
                ${renderAtendenteMultiHtml('clientes', 'flex:1.1 1 190px;')}
                <div style="flex:1 1 170px;">
                    <label style="${lblSt}">Contratos Ativos</label>
                    <select onchange="window._comercialRelatorios.onInputFiltro('${tipo}', 'contratosAtivos', this.value, false)" style="width:100%; ${inpSt}">
                        <option value="">Todos</option>
                        <option value="sim" ${f.contratosAtivos === 'sim' ? 'selected' : ''}>Sim (Com contrato ativo)</option>
                        <option value="nao" ${f.contratosAtivos === 'nao' ? 'selected' : ''}>Não (Apenas inativos)</option>
                        <option value="sem" ${f.contratosAtivos === 'sem' ? 'selected' : ''}>Sem contratos</option>
                    </select>
                </div>
                <div style="flex:1 1 165px;">
                    <label style="${lblSt}">Município / UF</label>
                    <input type="text" data-filtro="cidade" value="${esc(f.cidade)}" oninput="window._comercialRelatorios.onInputFiltro('${tipo}', 'cidade', this.value, true)"
                        placeholder="Filtrar cidade ou UF..." style="width:100%; ${inpSt}">
                </div>
            `;
        }

        if (tipo === 'enderecos') {
            return `
                <div style="flex:2 1 260px;">
                    <label style="${lblSt}">Pesquisar</label>
                    <input type="text" data-filtro="q" value="${esc(f.q)}" oninput="window._comercialRelatorios.onInputFiltro('${tipo}', 'q', this.value, true)"
                        placeholder="Digite endereço, local, bairro, CEP, zona..." style="width:100%; ${inpSt}">
                </div>
                <div style="flex:1.3 1 190px;">
                    <label style="${lblSt}">Cliente</label>
                    <input type="text" data-filtro="cliente" value="${esc(f.cliente)}" oninput="window._comercialRelatorios.onInputFiltro('${tipo}', 'cliente', this.value, true)"
                        placeholder="Filtrar por cliente..." style="width:100%; ${inpSt}">
                </div>
                <div style="flex:0.9 1 145px;">
                    <label style="${lblSt}">Zona</label>
                    <select onchange="window._comercialRelatorios.onInputFiltro('${tipo}', 'zona', this.value, false)" style="width:100%; ${inpSt}">
                        <option value="">Todas</option>
                        ${['Zona Central', 'Zona Amarela', 'Zona Vermelha', 'Outra'].map(z => `<option value="${esc(z)}" ${f.zona === z ? 'selected' : ''}>${esc(z)}</option>`).join('')}
                    </select>
                </div>
                <div style="flex:1 1 170px;">
                    <label style="${lblSt}">Município / UF</label>
                    <input type="text" data-filtro="municipioUf" value="${esc(f.municipioUf)}" oninput="window._comercialRelatorios.onInputFiltro('${tipo}', 'municipioUf', this.value, true)"
                        placeholder="Filtrar cidade ou UF..." style="width:100%; ${inpSt}">
                </div>
            `;
        }

        if (tipo === 'propostas') {
            const tiposOpts = Array.from(new Set(st.dados.map(d => String(d.tipo || '').trim()).filter(Boolean))).sort();
            return `
                <div style="flex:1.6 1 210px;">
                    <label style="${lblSt}">Pesquisar</label>
                    <input type="text" data-filtro="q" value="${esc(f.q)}" oninput="window._comercialRelatorios.onInputFiltro('${tipo}', 'q', this.value, true)"
                        placeholder="Nº proposta, cliente, contato, evento..." style="width:100%; ${inpSt}">
                </div>
                <div style="flex:0.9 1 135px;">
                    <label style="${lblSt}">Tipo</label>
                    <select onchange="window._comercialRelatorios.onInputFiltro('${tipo}', 'tipo', this.value, false)" style="width:100%; ${inpSt}">
                        <option value="">Todos</option>
                        ${tiposOpts.map(t => `<option value="${esc(t)}" ${f.tipo === t ? 'selected' : ''}>${esc(t)}</option>`).join('')}
                    </select>
                </div>
                ${renderFaseMultiHtml('flex:1.25 1 205px;')}
                ${renderAtendenteMultiHtml('propostas', 'flex:1.2 1 195px;')}
                <div style="flex:1.2 1 175px;">
                    <label style="${lblSt}">Produto</label>
                    <input type="text" data-filtro="produto" value="${esc(f.produto)}" oninput="window._comercialRelatorios.onInputFiltro('${tipo}', 'produto', this.value, true)"
                        placeholder="Filtrar por produto..." style="width:100%; ${inpSt}">
                </div>
                <div style="flex:0.75 1 135px; max-width:210px;">
                    <label style="${lblSt}">Cadastro De</label>
                    <input type="date" value="${esc(f.de)}" onchange="window._comercialRelatorios.onInputFiltro('${tipo}', 'de', this.value, false)" style="width:100%; ${inpSt}">
                </div>
                <div style="flex:0.75 1 135px; max-width:210px;">
                    <label style="${lblSt}">Cadastro Até</label>
                    <input type="date" value="${esc(f.ate)}" onchange="window._comercialRelatorios.onInputFiltro('${tipo}', 'ate', this.value, false)" style="width:100%; ${inpSt}">
                </div>
                <div style="flex:0.75 1 135px; max-width:210px;">
                    <label style="${lblSt}">Período Início (Prop.)</label>
                    <input type="date" value="${esc(f.perDe)}" onchange="window._comercialRelatorios.onInputFiltro('${tipo}', 'perDe', this.value, false)" style="width:100%; ${inpSt}">
                </div>
                <div style="flex:0.75 1 135px; max-width:210px;">
                    <label style="${lblSt}">Período Até (Prop.)</label>
                    <input type="date" value="${esc(f.perAte)}" onchange="window._comercialRelatorios.onInputFiltro('${tipo}', 'perAte', this.value, false)" style="width:100%; ${inpSt}">
                </div>
            `;
        }

        if (tipo === 'contratos') {
            const tiposOpts = Array.from(new Set(st.dados.map(d => String(d.tipo || '').trim()).filter(Boolean))).sort();
            const sitsSet = new Set(SITUACOES_CONTRATO_TODAS);
            st.dados.forEach(d => {
                const s = String(d.situacao_contrato || '').trim();
                if (s) {
                    const jaExiste = Array.from(sitsSet).some(x => normStr(x) === normStr(s));
                    if (!jaExiste) sitsSet.add(s);
                }
            });
            const sitsOpts = Array.from(sitsSet);
            return `
                <div style="flex:1.8 1 220px;">
                    <label style="${lblSt}">Pesquisar</label>
                    <input type="text" data-filtro="q" value="${esc(f.q)}" oninput="window._comercialRelatorios.onInputFiltro('${tipo}', 'q', this.value, true)"
                        placeholder="Nº contrato, título, cliente, evento..." style="width:100%; ${inpSt}">
                </div>
                <div style="flex:0.9 1 135px;">
                    <label style="${lblSt}">Tipo</label>
                    <select onchange="window._comercialRelatorios.onInputFiltro('${tipo}', 'tipo', this.value, false)" style="width:100%; ${inpSt}">
                        <option value="">Todos</option>
                        ${tiposOpts.map(t => `<option value="${esc(t)}" ${f.tipo === t ? 'selected' : ''}>${esc(t)}</option>`).join('')}
                    </select>
                </div>
                <div style="flex:1.2 1 190px;">
                    <label style="${lblSt}">Situação do Contrato</label>
                    <select onchange="window._comercialRelatorios.onInputFiltro('${tipo}', 'situacao', this.value, false)" style="width:100%; ${inpSt}">
                        <option value="">Todas</option>
                        ${sitsOpts.map(s => `<option value="${esc(s)}" ${f.situacao === s ? 'selected' : ''}>${esc(s)}</option>`).join('')}
                    </select>
                </div>
                ${renderAtendenteMultiHtml('contratos', 'flex:1.2 1 200px;')}
                <div style="flex:0.65 1 120px;">
                    <label style="${lblSt}">Emissão De</label>
                    <input type="date" value="${esc(f.de)}" onchange="window._comercialRelatorios.onInputFiltro('${tipo}', 'de', this.value, false)" style="width:100%; ${inpSt}">
                </div>
                <div style="flex:0.65 1 120px;">
                    <label style="${lblSt}">Até</label>
                    <input type="date" value="${esc(f.ate)}" onchange="window._comercialRelatorios.onInputFiltro('${tipo}', 'ate', this.value, false)" style="width:100%; ${inpSt}">
                </div>
            `;
        }

        const statusSet = new Set(STATUS_OS_TODOS);
        st.dados.forEach(d => {
            const s = String(d.status_os || '').trim();
            if (s && !Array.from(statusSet).some(x => normStr(x) === normStr(s))) statusSet.add(s);
        });
        const statusOpts = Array.from(statusSet);
        const tiposOsOpts = ['Envio', 'Visita técnica', 'Limpa fossa', 'Compras', 'Equipamentos'];
        return `
            <div style="flex:1.6 1 200px;">
                <label style="${lblSt}">Pesquisar</label>
                <input type="text" data-filtro="q" value="${esc(f.q)}" oninput="window._comercialRelatorios.onInputFiltro('${tipo}', 'q', this.value, true)"
                    placeholder="Nº OS, contrato, cliente, endereço..." style="width:100%; ${inpSt}">
            </div>
            <div style="flex:0.7 1 105px;">
                <label style="${lblSt}">Modalidade</label>
                <select onchange="window._comercialRelatorios.onInputFiltro('${tipo}', 'modalidade', this.value, false)" style="width:100%; ${inpSt}">
                    <option value="">Todas</option>
                    <option value="Obra" ${f.modalidade === 'Obra' ? 'selected' : ''}>Obra</option>
                    <option value="Evento" ${f.modalidade === 'Evento' ? 'selected' : ''}>Evento</option>
                </select>
            </div>
            <div style="flex:0.9 1 130px;">
                <label style="${lblSt}">Tipo de OS</label>
                <select onchange="window._comercialRelatorios.onInputFiltro('${tipo}', 'tipoOs', this.value, false)" style="width:100%; ${inpSt}">
                    <option value="">Todos</option>
                    ${tiposOsOpts.map(t => `<option value="${esc(t)}" ${f.tipoOs === t ? 'selected' : ''}>${esc(t)}</option>`).join('')}
                </select>
            </div>
            <div style="flex:1.1 1 165px;">
                <label style="${lblSt}">Status da OS</label>
                <select onchange="window._comercialRelatorios.onInputFiltro('${tipo}', 'statusOs', this.value, false)" style="width:100%; ${inpSt}">
                    <option value="">Todos</option>
                    ${statusOpts.map(s => `<option value="${esc(s)}" ${f.statusOs === s ? 'selected' : ''}>${esc(s)}</option>`).join('')}
                </select>
            </div>
            ${renderAtendenteMultiHtml('os', 'flex:1.1 1 185px;')}
            <div style="flex:1 1 155px;">
                <label style="${lblSt}">Equipamento</label>
                <input type="text" data-filtro="equipamento" value="${esc(f.equipamento)}" oninput="window._comercialRelatorios.onInputFiltro('${tipo}', 'equipamento', this.value, true)"
                    placeholder="Filtrar equipamento..." style="width:100%; ${inpSt}">
            </div>
            <div style="flex:1 1 155px;">
                <label style="${lblSt}">Serviço</label>
                <input type="text" data-filtro="servico" value="${esc(f.servico)}" oninput="window._comercialRelatorios.onInputFiltro('${tipo}', 'servico', this.value, true)"
                    placeholder="Filtrar serviço..." style="width:100%; ${inpSt}">
            </div>
            <div style="flex:0.6 1 115px;">
                <label style="${lblSt}">Cadastro De</label>
                <input type="date" value="${esc(f.de)}" onchange="window._comercialRelatorios.onInputFiltro('${tipo}', 'de', this.value, false)" style="width:100%; ${inpSt}">
            </div>
            <div style="flex:0.6 1 115px;">
                <label style="${lblSt}">Até</label>
                <input type="date" value="${esc(f.ate)}" onchange="window._comercialRelatorios.onInputFiltro('${tipo}', 'ate', this.value, false)" style="width:100%; ${inpSt}">
            </div>
        `;
    }

    function renderPaginacaoBarra(tipo, total) {
        const barEl = document.getElementById(`comrel-${tipo}-paginacao`);
        if (!barEl) return;
        const st = stateByTipo[tipo];
        const size = st.pageSize || 100;
        const totalPages = size >= 999999 ? 1 : Math.max(1, Math.ceil(total / size));
        if (st.page > totalPages) st.page = totalPages;
        if (st.page < 1) st.page = 1;
        const iniIdx = total === 0 ? 0 : (size >= 999999 ? 1 : ((st.page - 1) * size + 1));
        const fimIdx = total === 0 ? 0 : (size >= 999999 ? total : Math.min(total, st.page * size));

        barEl.innerHTML = `
            <div style="font-size:0.78rem; color:#475569; font-weight:600;">
                Exibindo <b>${iniIdx}–${fimIdx}</b> de <b>${total}</b> registro(s)
            </div>
            <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                <label style="font-size:0.76rem; color:#475569; font-weight:600; display:inline-flex; align-items:center; gap:5px;">
                    Por página:
                    <select onchange="window._comercialRelatorios.alterarPageSize('${tipo}', Number(this.value))"
                        style="height:28px; padding:0 6px; border:1px solid #cbd5e1; border-radius:6px; font-size:0.78rem; background:#fff;">
                        ${[50, 100, 250, 999999].map(v => `<option value="${v}" ${size === v ? 'selected' : ''}>${v >= 999999 ? 'Todos' : v}</option>`).join('')}
                    </select>
                </label>
                ${totalPages > 1 ? `
                    <div style="display:inline-flex; align-items:center; gap:4px;">
                        <button type="button" ${st.page <= 1 ? 'disabled' : ''} onclick="window._comercialRelatorios.irParaPagina('${tipo}', ${st.page - 1})"
                            style="height:28px; padding:0 10px; border:1px solid #cbd5e1; border-radius:6px; background:${st.page <= 1 ? '#f1f5f9' : '#fff'}; color:#334155; font-size:0.76rem; font-weight:700; cursor:${st.page <= 1 ? 'not-allowed' : 'pointer'};">Anterior</button>
                        <span style="font-size:0.76rem; font-weight:700; color:#1e293b; padding:0 4px;">Pág. ${st.page} / ${totalPages}</span>
                        <button type="button" ${st.page >= totalPages ? 'disabled' : ''} onclick="window._comercialRelatorios.irParaPagina('${tipo}', ${st.page + 1})"
                            style="height:28px; padding:0 10px; border:1px solid #cbd5e1; border-radius:6px; background:${st.page >= totalPages ? '#f1f5f9' : '#fff'}; color:#334155; font-size:0.76rem; font-weight:700; cursor:${st.page >= totalPages ? 'not-allowed' : 'pointer'};">Próxima</button>
                    </div>
                ` : ''}
            </div>
        `;
    }

    function renderCorpoTabela(tipo) {
        const meta = REPORTS_META[tipo];
        const st = stateByTipo[tipo];
        const filtrados = obterFiltrados(tipo);
        const cfg = montarConfiguracaoTabelaEExcel(tipo, []);

        const countEl = document.getElementById(`comrel-${tipo}-count`);
        if (countEl) countEl.textContent = `${filtrados.length} registro(s)`;

        const valorTotalEl = document.getElementById(`comrel-${tipo}-total-valor`);
        if (valorTotalEl && (tipo === 'propostas' || tipo === 'contratos')) {
            const soma = filtrados.reduce((acc, r) => acc + (Number(r.valor_total) || 0), 0);
            valorTotalEl.textContent = fmtMoeda(soma);
        }

        const tableEl = document.getElementById(`comrel-${tipo}-table`);
        const colgroupEl = document.getElementById(`comrel-${tipo}-colgroup`);
        const colunasTela = cfg.colunas.filter(col => !col.ocultarTela);
        const totalWidthPx = colunasTela.reduce((acc, col) => acc + (Number(col.widthPx) || 140), 0);
        if (colgroupEl) {
            colgroupEl.innerHTML = colunasTela.map(col => `<col style="width:${Number(col.widthPx) || 140}px;">`).join('');
        }
        if (tableEl) {
            tableEl.style.width = `${totalWidthPx}px`;
            tableEl.style.minWidth = '100%';
            tableEl.style.tableLayout = 'fixed';
        }

        const theadEl = document.getElementById(`comrel-${tipo}-thead`);
        if (theadEl) {
            theadEl.innerHTML = `<tr style="background:#f8fafc; border-bottom:2px solid #cbd5e1; color:#475569; font-size:0.72rem; text-transform:uppercase; letter-spacing:0.03em;">
                ${colunasTela.map(col => `<th style="position:sticky; top:0; z-index:2; background:#f8fafc; padding:10px; text-align:${col.tipo === 'moeda' ? 'right' : (col.key === 'contratos_ativos' || col.key === 'contratos_inativos' ? 'center' : 'left')}; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${esc(col.label)}</th>`).join('')}
            </tr>`;
        }

        const size = st.pageSize || 100;
        const totalPages = size >= 999999 ? 1 : Math.max(1, Math.ceil(filtrados.length / size));
        if (st.page > totalPages) st.page = totalPages;
        if (st.page < 1) st.page = 1;
        const paginaLinhas = size >= 999999 ? filtrados : filtrados.slice((st.page - 1) * size, st.page * size);

        const tbodyEl = document.getElementById(`comrel-${tipo}-tbody`);
        if (tbodyEl) {
            if (st.carregando) {
                tbodyEl.innerHTML = `<tr><td colspan="${colunasTela.length}" style="text-align:center; padding:2.5rem; color:#64748b;"><i class="ph ph-spinner ph-spin" style="font-size:1.3rem;"></i> Carregando ${esc(meta.titulo)}...</td></tr>`;
            } else if (st.erro) {
                tbodyEl.innerHTML = `<tr><td colspan="${colunasTela.length}" style="text-align:center; padding:2rem; color:#dc2626; font-weight:700;">${esc(st.erro)}</td></tr>`;
            } else {
                tbodyEl.innerHTML = renderLinhasHtml(tipo, paginaLinhas, colunasTela.length);
            }
        }
        renderPaginacaoBarra(tipo, filtrados.length);
    }

    function renderShellRelatorio(tipo) {
        const meta = REPORTS_META[tipo];
        const st = stateByTipo[tipo];
        if (!meta || !st) return;

        const root = document.getElementById(`${meta.target}-root`) || document.getElementById(`view-${meta.target}`);
        if (!root) return;

        const filtrados = obterFiltrados(tipo);
        const mostrarTotalMoeda = (tipo === 'propostas' || tipo === 'contratos');

        root.innerHTML = `
            <div style="font-family:'Inter', sans-serif; background:#f8fafc; padding:0.75rem; border-radius:14px; min-height:600px; box-sizing:border-box;">
                <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:12px; padding:1rem 1.25rem; margin-bottom:0.85rem; display:flex; align-items:center; justify-content:space-between; gap:1rem; flex-wrap:wrap; box-shadow:0 2px 8px rgba(15,23,42,0.03);">
                    <div style="display:flex; align-items:center; gap:0.75rem;">
                        <div style="width:42px; height:42px; border-radius:10px; background:#f3f0ff; color:#7048e8; display:flex; align-items:center; justify-content:center; font-size:1.4rem;">
                            <i class="ph ${meta.icone}"></i>
                        </div>
                        <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                            <h2 style="margin:0; font-size:1.15rem; font-weight:800; color:#1e293b;">${esc(meta.titulo)}</h2>
                            <span id="comrel-${tipo}-count" style="background:#ede9fe; color:#5f3dc4; border:1px solid #d0bfff; padding:2px 10px; border-radius:999px; font-size:0.74rem; font-weight:800;">${filtrados.length} registro(s)</span>
                            ${mostrarTotalMoeda ? `<span id="comrel-${tipo}-total-valor" style="background:#dcfce7; color:#15803d; border:1px solid #86efac; padding:2px 10px; border-radius:999px; font-size:0.74rem; font-weight:800;">${esc(fmtMoeda(0))}</span>` : ''}
                        </div>
                    </div>

                    <div style="display:flex; align-items:center; gap:0.5rem; flex-wrap:wrap;">
                        <button type="button" onclick="window._comercialRelatorios.limparFiltros('${tipo}')"
                            style="height:36px; padding:0 12px; border-radius:8px; border:1px solid #cbd5e1; background:#ffffff; color:#475569; font-weight:700; font-size:0.8rem; cursor:pointer; display:inline-flex; align-items:center; gap:5px;">
                            <i class="ph ph-eraser"></i> Limpar Filtros
                        </button>
                        <button type="button" onclick="window._comercialRelatorios.recarregar('${tipo}')"
                            style="height:36px; padding:0 12px; border-radius:8px; border:1px solid #cbd5e1; background:#f8fafc; color:#334155; font-weight:700; font-size:0.8rem; cursor:pointer; display:inline-flex; align-items:center; gap:5px;">
                            <i class="ph ph-arrows-clockwise"></i> Atualizar
                        </button>
                        <button type="button" id="btn-comrel-excel-${tipo}" onclick="window._comercialRelatorios.exportarExcel('${tipo}')"
                            style="height:36px; padding:0 16px; border-radius:8px; border:none; background:#16a34a; color:#ffffff; font-weight:800; font-size:0.82rem; cursor:pointer; display:inline-flex; align-items:center; gap:6px; box-shadow:0 2px 6px rgba(22,163,74,0.22);">
                            <i class="ph ph-file-xls" style="font-size:1.05rem;"></i> Baixar Excel
                        </button>
                    </div>
                </div>

                <!-- Filtros em tempo real -->
                <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:12px; padding:0.85rem 1.15rem; margin-bottom:0.85rem; display:flex; gap:0.65rem; flex-wrap:wrap; align-items:flex-end;">
                    ${renderFiltrosHtml(tipo)}
                </div>

                <!-- Tabela (largura fixa independente do filtro) + Paginação -->
                <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:12px; overflow:hidden; box-shadow:0 2px 8px rgba(15,23,42,0.03);">
                    <div style="max-height:62vh; overflow:auto;">
                        <table id="comrel-${tipo}-table" style="table-layout:fixed; width:100%; border-collapse:collapse; font-size:0.81rem; text-align:left;">
                            <colgroup id="comrel-${tipo}-colgroup"></colgroup>
                            <thead id="comrel-${tipo}-thead"></thead>
                            <tbody id="comrel-${tipo}-tbody"></tbody>
                        </table>
                    </div>
                    <div id="comrel-${tipo}-paginacao" style="padding:0.65rem 1rem; border-top:1px solid #e2e8f0; background:#f8fafc; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:0.5rem;"></div>
                </div>
            </div>
        `;
        renderCorpoTabela(tipo);
    }

    window._comercialRelatorios = {
        onInputFiltro(tipo, campo, valor, comDebounce = true) {
            const st = stateByTipo[tipo];
            if (!st) return;
            st.filtros[campo] = valor;
            st.page = 1;
            if (debounceTimer) clearTimeout(debounceTimer);
            if (comDebounce) {
                debounceTimer = setTimeout(() => renderCorpoTabela(tipo), 130);
            } else {
                renderCorpoTabela(tipo);
            }
        },

        alterarPageSize(tipo, novoSize) {
            const st = stateByTipo[tipo];
            if (!st) return;
            st.pageSize = novoSize || 100;
            st.page = 1;
            renderCorpoTabela(tipo);
        },

        irParaPagina(tipo, novaPag) {
            const st = stateByTipo[tipo];
            if (!st) return;
            st.page = Math.max(1, novaPag);
            renderCorpoTabela(tipo);
        },

        async toggleDropdownAtendentes(tipo, event) {
            if (event) { event.preventDefault(); event.stopPropagation(); }
            const drop = document.getElementById(`comrel-${tipo}-atend-dropdown`);
            if (!drop) return;
            if (drop.style.display === 'block') {
                drop.style.display = 'none';
                return;
            }
            if (!atendentesComercialLista.length) {
                await carregarAtendentesComercialRelatorios();
            }
            renderListaOpcoesAtendentes(tipo);
            drop.style.display = 'block';
            document.getElementById(`comrel-${tipo}-atend-busca`)?.focus();
        },

        filtrarListaAtendentes(tipo, termo) {
            const st = stateByTipo[tipo];
            if (!st) return;
            st.filtros.atendBusca = termo;
            renderListaOpcoesAtendentes(tipo);
        },

        toggleItemAtendente(tipo, nome, checked) {
            const st = stateByTipo[tipo];
            if (!st) return;
            const list = Array.isArray(st.filtros.atendentes) ? [...st.filtros.atendentes] : [];
            const idx = list.findIndex(x => normStr(x) === normStr(nome));
            if (checked && idx === -1) list.push(nome);
            if (!checked && idx >= 0) list.splice(idx, 1);
            st.filtros.atendentes = list;
            st.page = 1;
            const lbl = document.getElementById(`comrel-${tipo}-atend-lbl`);
            const btn = document.getElementById(`comrel-${tipo}-atend-btn`);
            if (lbl) lbl.textContent = list.length === 0 ? 'Todos os atendentes' : (list.length === 1 ? list[0] : `${list.length} selecionado(s)`);
            if (btn) btn.style.fontWeight = list.length ? '700' : '500';
            renderListaOpcoesAtendentes(tipo);
            renderCorpoTabela(tipo);
        },

        limparAtendentes(tipo, event) {
            if (event) { event.preventDefault(); event.stopPropagation(); }
            const st = stateByTipo[tipo];
            if (!st) return;
            st.filtros.atendentes = [];
            st.filtros.atendBusca = '';
            st.page = 1;
            const lbl = document.getElementById(`comrel-${tipo}-atend-lbl`);
            const btn = document.getElementById(`comrel-${tipo}-atend-btn`);
            const busca = document.getElementById(`comrel-${tipo}-atend-busca`);
            if (lbl) lbl.textContent = 'Todos os atendentes';
            if (btn) btn.style.fontWeight = '500';
            if (busca) busca.value = '';
            renderListaOpcoesAtendentes(tipo);
            renderCorpoTabela(tipo);
        },

        toggleDetalhesProdutos(safeKey, btnEl) {
            const detEl = document.getElementById(`comrel-prod-det-${safeKey}`);
            if (!detEl) return;
            const abrir = detEl.style.display === 'none' || !detEl.style.display;
            if (abrir) {
                produtosExpandidosSet.add(safeKey);
                detEl.style.display = 'flex';
            } else {
                produtosExpandidosSet.delete(safeKey);
                detEl.style.display = 'none';
            }
            if (btnEl) {
                btnEl.style.background = abrir ? '#eef2ff' : '#f8fafc';
                btnEl.style.color = abrir ? '#4338ca' : '#334155';
                btnEl.style.borderColor = abrir ? '#c7d2fe' : '#cbd5e1';
                const seta = btnEl.querySelector('.comrel-prod-seta');
                if (seta) seta.style.transform = abrir ? 'rotate(180deg)' : 'rotate(0deg)';
            }
        },

        toggleDropdownFases(event) {
            if (event) { event.preventDefault(); event.stopPropagation(); }
            const drop = document.getElementById('comrel-propostas-fase-dropdown');
            if (!drop) return;
            if (drop.style.display === 'block') {
                drop.style.display = 'none';
                return;
            }
            renderListaOpcoesFases();
            drop.style.display = 'block';
            document.getElementById('comrel-propostas-fase-busca')?.focus();
        },

        filtrarListaFases(termo) {
            const st = stateByTipo.propostas;
            if (!st) return;
            st.filtros.faseBusca = termo;
            renderListaOpcoesFases();
        },

        toggleItemFase(faseNome, checked) {
            const st = stateByTipo.propostas;
            if (!st) return;
            const list = Array.isArray(st.filtros.fases) ? [...st.filtros.fases] : [];
            const idx = list.findIndex(x => normStr(x) === normStr(faseNome));
            if (checked && idx === -1) list.push(faseNome);
            if (!checked && idx >= 0) list.splice(idx, 1);
            st.filtros.fases = list;
            st.page = 1;
            const lbl = document.getElementById('comrel-propostas-fase-lbl');
            if (lbl) lbl.innerHTML = renderResumoBotaoFasePropostas();
            renderListaOpcoesFases();
            renderCorpoTabela('propostas');
        },

        limparFases(event) {
            if (event) { event.preventDefault(); event.stopPropagation(); }
            const st = stateByTipo.propostas;
            if (!st) return;
            st.filtros.fases = [];
            st.filtros.faseBusca = '';
            st.page = 1;
            const lbl = document.getElementById('comrel-propostas-fase-lbl');
            const busca = document.getElementById('comrel-propostas-fase-busca');
            if (lbl) lbl.innerHTML = renderResumoBotaoFasePropostas();
            if (busca) busca.value = '';
            renderListaOpcoesFases();
            renderCorpoTabela('propostas');
        },

        limparFiltros(tipo) {
            const st = stateByTipo[tipo];
            if (!st) return;
            Object.keys(st.filtros).forEach(k => {
                st.filtros[k] = Array.isArray(st.filtros[k]) ? [] : '';
            });
            st.page = 1;
            renderShellRelatorio(tipo);
        },

        async recarregar(tipo) {
            const st = stateByTipo[tipo];
            if (!st) return;
            st.carregando = true;
            renderShellRelatorio(tipo);
            await fetchDadosRelatorio(tipo);
            renderShellRelatorio(tipo);
        },

        resetarAbaFechada(tipo) {
            const meta = REPORTS_META[tipo];
            const st = stateByTipo[tipo];
            if (!st) return;
            st.carregado = false;
            st.dados = [];
            st.erro = '';
            st.page = 1;
            if (meta) {
                const root = document.getElementById(`${meta.target}-root`) || document.getElementById(`view-${meta.target}`);
                if (root) root.innerHTML = '';
            }
        },

        abrirHistoricoPorElemento(el) {
            if (!el) return;
            const clienteId = el.getAttribute('data-cli-id') || '';
            const clienteNome = el.getAttribute('data-cli-nome') || '';
            const grupoCliente = el.getAttribute('data-cli-grupo') || '';
            if (typeof window.abrirHistoricoMovimentacoesCliente === 'function') {
                window.abrirHistoricoMovimentacoesCliente({ clienteId, clienteNome, grupoCliente });
            }
        },

        async exportarExcel(tipo) {
            const meta = REPORTS_META[tipo];
            if (!meta) return;
            const filtrados = obterFiltrados(tipo);
            if (!filtrados.length) {
                if (typeof Swal !== 'undefined') {
                    Swal.fire('Aviso', 'Não há registros filtrados para exportar.', 'warning');
                }
                return;
            }
            const cfg = montarConfiguracaoTabelaEExcel(tipo, filtrados);
            const btn = document.getElementById(`btn-comrel-excel-${tipo}`);
            const htmlOrig = btn ? btn.innerHTML : '';
            if (btn) {
                btn.disabled = true;
                btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Gerando Excel...';
            }
            try {
                const resp = await fetch(`${getApiBase()}/comercial/relatorios/exportar-excel`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...getAuthHeaders()
                    },
                    body: JSON.stringify({
                        titulo: meta.titulo,
                        nomeArquivo: meta.nomeArquivo,
                        colunas: cfg.colunas,
                        linhas: cfg.linhasExcel
                    })
                });
                if (!resp.ok) {
                    const errTxt = await resp.text().catch(() => '');
                    throw new Error(errTxt || 'Não foi possível gerar o arquivo Excel.');
                }
                const blob = await resp.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${meta.nomeArquivo}.xlsx`;
                document.body.appendChild(a);
                a.click();
                a.remove();
                setTimeout(() => URL.revokeObjectURL(url), 4000);
                if (typeof mostrarToastSucesso === 'function') {
                    mostrarToastSucesso('Planilha Excel gerada com sucesso!');
                }
            } catch (e) {
                if (typeof Swal !== 'undefined') {
                    Swal.fire('Erro', e.message || 'Falha ao exportar Excel.', 'error');
                }
            } finally {
                if (btn) {
                    btn.disabled = false;
                    btn.innerHTML = htmlOrig;
                }
            }
        }
    };

    document.addEventListener('click', (e) => {
        ['clientes', 'propostas', 'contratos', 'os'].forEach(tipo => {
            const wrap = document.getElementById(`comrel-${tipo}-atend-wrap`);
            const drop = document.getElementById(`comrel-${tipo}-atend-dropdown`);
            if (drop && drop.style.display === 'block' && wrap && !wrap.contains(e.target)) {
                drop.style.display = 'none';
            }
        });
        const faseWrap = document.getElementById('comrel-propostas-fase-wrap');
        const faseDrop = document.getElementById('comrel-propostas-fase-dropdown');
        if (faseDrop && faseDrop.style.display === 'block' && faseWrap && !faseWrap.contains(e.target)) {
            faseDrop.style.display = 'none';
        }
    });

    function renderBadgeStatusFaturamentoHist(st) {
        const raw = String(st || 'Aberto').trim();
        const s = normStr(raw);
        let bg = '#eff6ff', txt = '#1d4ed8', bd = '#bfdbfe';
        if (s.includes('pago') || s.includes('liquidad') || s.includes('recebid')) {
            bg = '#dcfce7'; txt = '#15803d'; bd = '#86efac';
        } else if (s.includes('vencid') || s.includes('atras') || s.includes('cancelad') || s.includes('estornad')) {
            bg = '#fee2e2'; txt = '#b91c1c'; bd = '#fecaca';
        } else if (s.includes('parcial')) {
            bg = '#fef3c7'; txt = '#b45309'; bd = '#fde68a';
        } else if (s.includes('faturad')) {
            bg = '#ede9fe'; txt = '#5f3dc4'; bd = '#ddd6fe';
        }
        return `<span style="background:${bg}; color:${txt}; border:1px solid ${bd}; padding:2px 8px; border-radius:999px; font-size:0.71rem; font-weight:800; white-space:nowrap;">${esc(raw)}</span>`;
    }

    window.abrirHistoricoMovimentacoesCliente = async function ({ clienteId = '', clienteNome = '', grupoCliente = '' } = {}) {
        const nomeLimpo = limparNomeClienteParaExcel(clienteNome || '');
        if (!clienteId && !nomeLimpo) return;

        if (typeof Swal === 'undefined') return;

        Swal.fire({
            title: '',
            width: '1140px',
            showConfirmButton: false,
            customClass: { popup: 'custom-swal-padding-zero' },
            html: `<div style="padding:3rem 1.5rem; text-align:center; font-family:'Inter', sans-serif; color:#475569;">
                <i class="ph ph-spinner ph-spin" style="font-size:2rem; color:#7048e8;"></i>
                <div style="margin-top:10px; font-weight:700; font-size:0.95rem;">Carregando histórico de movimentações de ${esc(nomeLimpo || 'cliente')}...</div>
            </div>`,
            didOpen: () => {
                const p = typeof Swal.getPopup === 'function' ? Swal.getPopup() : null;
                if (p) p.style.maxWidth = '96vw';
            }
        });

        try {
            const qs = new URLSearchParams();
            if (clienteId) qs.set('cliente_id', String(clienteId));
            if (nomeLimpo) qs.set('cliente_nome', nomeLimpo);

            const resp = await fetch(`${getApiBase()}/comercial/clientes/historico-movimentacoes?${qs.toString()}`, {
                headers: getAuthHeaders()
            });
            const data = await resp.json().catch(() => ({}));
            if (!resp.ok) {
                throw new Error((data && data.error) || 'Não foi possível carregar o histórico do cliente.');
            }

            const cli = data.cliente || {};
            const resu = data.resumo || {};
            const propsList = Array.isArray(data.propostas) ? data.propostas : [];
            const ctrsList = Array.isArray(data.contratos) ? data.contratos : [];
            const osList = Array.isArray(data.ordens_servico) ? data.ordens_servico : [];
            const fatList = Array.isArray(data.faturamentos) ? data.faturamentos : [];

            const grupoFinal = cli.grupo_clientes || grupoCliente || '';
            const nomeClienteReal = cli.nome_razao_social || nomeLimpo || 'Cliente';
            const nomeHeader = formatarNomeComGrupoRapido(nomeClienteReal, grupoFinal);
            const cidadeUf = [cli.municipio, cli.uf].filter(Boolean).join('/') || '';

            const timeline = [];
            propsList.forEach(p => {
                const dtIso = String(p.data_cadastro || p.criado_em || '').substring(0, 10);
                timeline.push({
                    tipoKey: 'proposta',
                    tipoLabel: 'Proposta',
                    tipoStyle: 'background:#dbeafe; color:#1d4ed8; border:1px solid #bfdbfe;',
                    numero: p.codigo || '—',
                    btnStyle: 'background:#2563eb; color:#fff; border:none;',
                    onClickCode: `Swal.close(); if(window.abrirPropostaDiretoId) window.abrirPropostaDiretoId(${Number(p.id)});`,
                    dataIso: dtIso,
                    detalhe: [p.tipo, p.titulo_contrato || p.nome_evento, p.fase_negociacao, resolverAtendenteNome(p.atendente)].filter(Boolean).join(' · '),
                    valor: Number(p.valor_total) || 0,
                    search: normStr(`proposta ${p.codigo} ${p.tipo} ${p.titulo_contrato} ${p.nome_evento} ${p.fase_negociacao} ${p.atendente}`)
                });
            });
            ctrsList.forEach(c => {
                const dtIso = String(c.aprovado_em || c.data_cadastro || c.criado_em || '').substring(0, 10);
                timeline.push({
                    tipoKey: 'contrato',
                    tipoLabel: 'Contrato',
                    tipoStyle: 'background:#fef9c3; color:#854d0e; border:1px solid #fde047;',
                    numero: c.contrato || '—',
                    btnStyle: 'background:#eab308; color:#0f172a; border:1px solid #ca8a04;',
                    onClickCode: `Swal.close(); if(window.abrirContratoDaProposta) window.abrirContratoDaProposta(${Number(c.id)});`,
                    dataIso: dtIso,
                    detalhe: [c.titulo_contrato || c.tipo, c.situacao_contrato, c.periodo_inicio ? `${fmtDataBr(c.periodo_inicio)} a ${fmtDataBr(c.periodo_fim || c.periodo_inicio)}` : ''].filter(Boolean).join(' · '),
                    valor: Number(c.valor_total) || 0,
                    search: normStr(`contrato ${c.contrato} ${c.codigo} ${c.titulo_contrato} ${c.tipo} ${c.situacao_contrato}`)
                });
            });
            osList.forEach(o => {
                const dtIso = String(o.os_criada_em || o.data_cadastro || o.criado_em || '').substring(0, 10);
                timeline.push({
                    tipoKey: 'os',
                    tipoLabel: 'OS',
                    tipoStyle: 'background:#dcfce7; color:#15803d; border:1px solid #86efac;',
                    numero: o.numero_os || '—',
                    btnStyle: 'background:#16a34a; color:#fff; border:none;',
                    onClickCode: `Swal.close(); if(window.abrirOsComercialDaProposta) window.abrirOsComercialDaProposta(${Number(o.id)});`,
                    dataIso: dtIso,
                    detalhe: [o.modalidade, o.os_tipo_operacao || 'Envio', o.contrato ? `Ctr ${o.contrato}` : 'OS Avulsa', o.status_os || 'EM ELABORAÇÃO'].filter(Boolean).join(' · '),
                    valor: Number(o.valor_total) || 0,
                    search: normStr(`os ${o.numero_os} ${o.contrato} ${o.modalidade} ${o.os_tipo_operacao} ${o.status_os} ${o.endereco_instalacao}`)
                });
            });
            fatList.forEach(f => {
                const dtIso = String(f.data_emissao || f.data_vencimento || f.criado_em || '').substring(0, 10);
                const vLiq = Number(f.valor_liquido) || Number(f.valor_bruto) || 0;
                timeline.push({
                    tipoKey: 'faturamento',
                    tipoLabel: 'Faturamento',
                    tipoStyle: 'background:#ede9fe; color:#5f3dc4; border:1px solid #d0bfff;',
                    numero: f.numero_nf || f.competencia || `#${f.id}`,
                    btnStyle: 'background:#7048e8; color:#fff; border:none;',
                    onClickCode: '',
                    dataIso: dtIso,
                    detalhe: [f.tipo_lancamento, f.competencia ? `Comp. ${f.competencia}` : '', f.numero_contrato ? `Ctr ${f.numero_contrato}` : '', f.status, f.data_vencimento ? `Venc. ${fmtDataBr(f.data_vencimento)}` : ''].filter(Boolean).join(' · '),
                    valor: vLiq,
                    search: normStr(`faturamento ${f.numero_nf} ${f.tipo_lancamento} ${f.competencia} ${f.numero_contrato} ${f.numero_os} ${f.status} ${f.observacoes}`)
                });
            });
            timeline.sort((a, b) => String(b.dataIso || '').localeCompare(String(a.dataIso || '')));

            let abaAtiva = 'visao';
            let termoBusca = '';

            const htmlAbas = () => {
                const defs = [
                    { id: 'visao', label: 'Visão Geral', count: timeline.length, icon: 'ph-clock-counter-clockwise' },
                    { id: 'propostas', label: 'Propostas', count: propsList.length, icon: 'ph-file-text' },
                    { id: 'contratos', label: 'Contratos', count: ctrsList.length, icon: 'ph-files' },
                    { id: 'os', label: 'OS', count: osList.length, icon: 'ph-clipboard-text' },
                    { id: 'faturamento', label: 'Faturamento', count: fatList.length, icon: 'ph-currency-circle-dollar' }
                ];
                return defs.map(t => {
                    const ativo = abaAtiva === t.id;
                    return `<button type="button" data-hist-tab="${t.id}"
                        style="height:34px; padding:0 12px; border-radius:8px; border:1px solid ${ativo ? '#7048e8' : '#cbd5e1'}; background:${ativo ? '#7048e8' : '#ffffff'}; color:${ativo ? '#ffffff' : '#334155'}; font-weight:700; font-size:0.79rem; cursor:pointer; display:inline-flex; align-items:center; gap:6px; white-space:nowrap;">
                        <i class="ph ${t.icon}"></i>
                        <span>${esc(t.label)}</span>
                        <span style="background:${ativo ? 'rgba(255,255,255,0.22)' : '#f1f5f9'}; color:${ativo ? '#ffffff' : '#475569'}; padding:1px 7px; border-radius:999px; font-size:0.7rem; font-weight:800;">${t.count}</span>
                    </button>`;
                }).join('');
            };

            const renderConteudoAba = () => {
                const q = normStr(termoBusca);
                const thSt = 'position:sticky; top:0; z-index:2; background:#f8fafc; padding:9px 10px; text-align:left; white-space:nowrap; font-size:0.71rem; font-weight:800; color:#475569; text-transform:uppercase; border-bottom:2px solid #cbd5e1;';
                const thRight = thSt.replace('text-align:left;', 'text-align:right;');

                if (abaAtiva === 'visao') {
                    const lista = q ? timeline.filter(it => it.search.includes(q)) : timeline;
                    if (!lista.length) {
                        return `<div style="padding:2rem; text-align:center; color:#94a3b8;">Nenhuma movimentação encontrada para este filtro.</div>`;
                    }
                    const totalGeral = lista.reduce((acc, it) => acc + (Number(it.valor) || 0), 0);
                    return `<table style="width:100%; border-collapse:collapse; font-size:0.8rem;">
                        <thead><tr>
                            <th style="${thSt}">Movimentação</th>
                            <th style="${thSt}">Nº / Ref.</th>
                            <th style="${thSt}">Data</th>
                            <th style="${thSt}">Detalhes / Situação</th>
                            <th style="${thRight}">Valor</th>
                        </tr></thead>
                        <tbody>
                            ${lista.map(it => `<tr style="border-bottom:1px solid #e2e8f0;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background=''">
                                <td style="padding:8px 10px; white-space:nowrap;"><span style="${it.tipoStyle} padding:2px 8px; border-radius:999px; font-size:0.71rem; font-weight:800;">${esc(it.tipoLabel)}</span></td>
                                <td style="padding:8px 10px; white-space:nowrap;">${it.onClickCode
                                    ? `<button type="button" onclick="${it.onClickCode}" style="${it.btnStyle} padding:2px 9px; border-radius:6px; font-weight:800; font-size:0.74rem; cursor:pointer;">${esc(it.numero)}</button>`
                                    : `<span style="${it.btnStyle} padding:2px 9px; border-radius:6px; font-weight:800; font-size:0.74rem; display:inline-block;">${esc(it.numero)}</span>`}</td>
                                <td style="padding:8px 10px; white-space:nowrap; color:#475569;">${esc(fmtDataBr(it.dataIso))}</td>
                                <td style="padding:8px 10px; color:#334155;">${esc(it.detalhe || '—')}</td>
                                <td style="padding:8px 10px; text-align:right; font-weight:800; color:#15803d; white-space:nowrap;">${esc(fmtMoeda(it.valor))}</td>
                            </tr>`).join('')}
                        </tbody>
                        <tfoot><tr style="background:#f8fafc; border-top:2px solid #cbd5e1;">
                            <td colspan="4" style="padding:9px 10px; font-weight:800; color:#1e293b;">Total dos registros exibidos (${lista.length})</td>
                            <td style="padding:9px 10px; text-align:right; font-weight:800; color:#15803d; white-space:nowrap;">${esc(fmtMoeda(totalGeral))}</td>
                        </tr></tfoot>
                    </table>`;
                }

                if (abaAtiva === 'propostas') {
                    const lista = q ? propsList.filter(p => normStr(`${p.codigo} ${p.tipo} ${p.fase_negociacao} ${p.atendente} ${p.titulo_contrato} ${p.nome_evento}`).includes(q)) : propsList;
                    if (!lista.length) return `<div style="padding:2rem; text-align:center; color:#94a3b8;">Nenhuma proposta encontrada para este cliente.</div>`;
                    const total = lista.reduce((a, p) => a + (Number(p.valor_total) || 0), 0);
                    return `<table style="width:100%; border-collapse:collapse; font-size:0.8rem;">
                        <thead><tr>
                            <th style="${thSt}">Nº Prop.</th>
                            <th style="${thSt}">Cadastro</th>
                            <th style="${thSt}">Tipo</th>
                            <th style="${thSt}">Período</th>
                            <th style="${thSt}">Atendente</th>
                            <th style="${thSt}">Fase de Negociação</th>
                            <th style="${thRight}">Valor Total</th>
                        </tr></thead>
                        <tbody>
                            ${lista.map(p => {
                                const perStr = p.periodo_inicio ? `${fmtDataBr(p.periodo_inicio)} até ${fmtDataBr(p.periodo_fim || p.periodo_inicio)}` : '—';
                                const faseHtml = typeof window.renderBadgeFaseNegociacaoHtml === 'function' ? window.renderBadgeFaseNegociacaoHtml(p.fase_negociacao || 'Em Elaboração') : esc(p.fase_negociacao || '—');
                                return `<tr style="border-bottom:1px solid #e2e8f0;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background=''">
                                    <td style="padding:8px 10px; white-space:nowrap;"><button type="button" onclick="Swal.close(); if(window.abrirPropostaDiretoId) window.abrirPropostaDiretoId(${Number(p.id)});" style="background:#2563eb; color:#fff; border:none; padding:2px 9px; border-radius:6px; font-weight:800; font-size:0.74rem; cursor:pointer;">${esc(p.codigo || '—')}</button></td>
                                    <td style="padding:8px 10px; white-space:nowrap; color:#475569;">${esc(fmtDataBr(p.data_cadastro))}</td>
                                    <td style="padding:8px 10px; font-weight:700; color:#334155; white-space:nowrap;">${esc(p.tipo || '—')}</td>
                                    <td style="padding:8px 10px; white-space:nowrap; color:#475569;">${esc(perStr)}</td>
                                    <td style="padding:8px 10px; white-space:nowrap; color:#334155;">${esc(resolverAtendenteNome(p.atendente))}</td>
                                    <td style="padding:8px 10px; white-space:nowrap;">${faseHtml}</td>
                                    <td style="padding:8px 10px; text-align:right; font-weight:800; color:#15803d; white-space:nowrap;">${esc(fmtMoeda(p.valor_total))}</td>
                                </tr>`;
                            }).join('')}
                        </tbody>
                        <tfoot><tr style="background:#f8fafc; border-top:2px solid #cbd5e1;">
                            <td colspan="6" style="padding:9px 10px; font-weight:800; color:#1e293b;">Total em Propostas (${lista.length})</td>
                            <td style="padding:9px 10px; text-align:right; font-weight:800; color:#15803d; white-space:nowrap;">${esc(fmtMoeda(total))}</td>
                        </tr></tfoot>
                    </table>`;
                }

                if (abaAtiva === 'contratos') {
                    const lista = q ? ctrsList.filter(c => normStr(`${c.contrato} ${c.codigo} ${c.titulo_contrato} ${c.tipo} ${c.situacao_contrato} ${c.atendente}`).includes(q)) : ctrsList;
                    if (!lista.length) return `<div style="padding:2rem; text-align:center; color:#94a3b8;">Nenhum contrato encontrado para este cliente.</div>`;
                    const total = lista.reduce((a, c) => a + (Number(c.valor_total) || 0), 0);
                    return `<table style="width:100%; border-collapse:collapse; font-size:0.8rem;">
                        <thead><tr>
                            <th style="${thSt}">Contrato</th>
                            <th style="${thSt}">Proposta</th>
                            <th style="${thSt}">Emissão</th>
                            <th style="${thSt}">Título / Tipo</th>
                            <th style="${thSt}">Período</th>
                            <th style="${thSt}">Situação</th>
                            <th style="${thSt}">OS</th>
                            <th style="${thRight}">Valor</th>
                        </tr></thead>
                        <tbody>
                            ${lista.map(c => {
                                const dtEm = fmtDataBr(String(c.aprovado_em || '').substring(0, 10) || c.data_cadastro);
                                const perStr = c.periodo_inicio ? `${fmtDataBr(c.periodo_inicio)} até ${fmtDataBr(c.periodo_fim || c.periodo_inicio)}` : '—';
                                const sitHtml = typeof window.renderBadgeSituacaoContratoHtml === 'function' ? window.renderBadgeSituacaoContratoHtml(c.situacao_contrato || 'EM ELABORAÇÃO', false) : esc(c.situacao_contrato || '—');
                                return `<tr style="border-bottom:1px solid #e2e8f0;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background=''">
                                    <td style="padding:8px 10px; white-space:nowrap;"><button type="button" onclick="Swal.close(); if(window.abrirContratoDaProposta) window.abrirContratoDaProposta(${Number(c.id)});" style="background:#eab308; color:#0f172a; border:1px solid #ca8a04; padding:2px 9px; border-radius:6px; font-weight:800; font-size:0.74rem; cursor:pointer;">${esc(c.contrato || '—')}</button></td>
                                    <td style="padding:8px 10px; white-space:nowrap;">${c.codigo ? `<button type="button" onclick="Swal.close(); if(window.abrirPropostaDiretoId) window.abrirPropostaDiretoId(${Number(c.id)});" style="background:#2563eb; color:#fff; border:none; padding:2px 9px; border-radius:6px; font-weight:800; font-size:0.74rem; cursor:pointer;">${esc(c.codigo)}</button>` : '—'}</td>
                                    <td style="padding:8px 10px; white-space:nowrap; color:#475569;">${esc(dtEm)}</td>
                                    <td style="padding:8px 10px; color:#334155;"><b>${esc(c.titulo_contrato || '—')}</b> <span style="color:#64748b;">(${esc(c.tipo || '—')})</span></td>
                                    <td style="padding:8px 10px; white-space:nowrap; color:#475569;">${esc(perStr)}</td>
                                    <td style="padding:8px 10px; white-space:nowrap;">${sitHtml}</td>
                                    <td style="padding:8px 10px; white-space:nowrap;">${c.numero_os ? `<button type="button" onclick="Swal.close(); if(window.abrirOsComercialDaProposta) window.abrirOsComercialDaProposta(${Number(c.id)});" style="background:#16a34a; color:#fff; border:none; padding:2px 9px; border-radius:6px; font-weight:800; font-size:0.74rem; cursor:pointer;">${esc(c.numero_os)}</button>` : '—'}</td>
                                    <td style="padding:8px 10px; text-align:right; font-weight:800; color:#15803d; white-space:nowrap;">${esc(fmtMoeda(c.valor_total))}</td>
                                </tr>`;
                            }).join('')}
                        </tbody>
                        <tfoot><tr style="background:#f8fafc; border-top:2px solid #cbd5e1;">
                            <td colspan="7" style="padding:9px 10px; font-weight:800; color:#1e293b;">Total em Contratos (${lista.length})</td>
                            <td style="padding:9px 10px; text-align:right; font-weight:800; color:#15803d; white-space:nowrap;">${esc(fmtMoeda(total))}</td>
                        </tr></tfoot>
                    </table>`;
                }

                if (abaAtiva === 'os') {
                    const lista = q ? osList.filter(o => normStr(`${o.numero_os} ${o.contrato} ${o.modalidade} ${o.os_tipo_operacao} ${o.status_os} ${o.endereco_instalacao}`).includes(q)) : osList;
                    if (!lista.length) return `<div style="padding:2rem; text-align:center; color:#94a3b8;">Nenhuma OS encontrada para este cliente.</div>`;
                    const total = lista.reduce((a, o) => a + (Number(o.valor_total) || 0), 0);
                    return `<table style="width:100%; border-collapse:collapse; font-size:0.8rem;">
                        <thead><tr>
                            <th style="${thSt}">Nº OS</th>
                            <th style="${thSt}">Modalidade</th>
                            <th style="${thSt}">Tipo OS</th>
                            <th style="${thSt}">Contrato</th>
                            <th style="${thSt}">Data OS</th>
                            <th style="${thSt}">Entrega / Retirada</th>
                            <th style="${thSt}">Status da OS</th>
                            <th style="${thRight}">Valor</th>
                        </tr></thead>
                        <tbody>
                            ${lista.map(o => {
                                const modHtml = typeof window.renderBadgeModalidadeObraEventoOsHtml === 'function' ? window.renderBadgeModalidadeObraEventoOsHtml(o.modalidade || 'Obra') : esc(o.modalidade || 'Obra');
                                const stHtml = typeof window.renderBadgeStatusOsComercialHtml === 'function' ? window.renderBadgeStatusOsComercialHtml(o.status_os || 'EM ELABORAÇÃO') : esc(o.status_os || 'EM ELABORAÇÃO');
                                const dtCad = fmtDataBr(String(o.os_criada_em || '').substring(0, 10) || o.data_cadastro);
                                const entRet = [o.data_entrega ? `Ent: ${fmtDataBr(o.data_entrega)}` : '', o.data_retirada ? `Ret: ${fmtDataBr(o.data_retirada)}` : ''].filter(Boolean).join(' · ') || '—';
                                return `<tr style="border-bottom:1px solid #e2e8f0;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background=''">
                                    <td style="padding:8px 10px; white-space:nowrap;"><button type="button" onclick="Swal.close(); if(window.abrirOsComercialDaProposta) window.abrirOsComercialDaProposta(${Number(o.id)});" style="background:#16a34a; color:#fff; border:none; padding:2px 9px; border-radius:6px; font-weight:800; font-size:0.74rem; cursor:pointer;">${esc(o.numero_os || '—')}</button></td>
                                    <td style="padding:8px 10px; white-space:nowrap;">${modHtml}</td>
                                    <td style="padding:8px 10px; font-weight:700; color:#334155; white-space:nowrap;">${esc(o.os_tipo_operacao || 'Envio')}</td>
                                    <td style="padding:8px 10px; white-space:nowrap;">${o.contrato ? `<button type="button" onclick="Swal.close(); if(window.abrirContratoDaProposta) window.abrirContratoDaProposta(${Number(o.id)});" style="background:#eab308; color:#0f172a; border:1px solid #ca8a04; padding:2px 9px; border-radius:6px; font-weight:800; font-size:0.74rem; cursor:pointer;">${esc(o.contrato)}</button>` : 'Avulsa'}</td>
                                    <td style="padding:8px 10px; white-space:nowrap; color:#475569;">${esc(dtCad)}</td>
                                    <td style="padding:8px 10px; white-space:nowrap; color:#475569;">${esc(entRet)}</td>
                                    <td style="padding:8px 10px; white-space:nowrap;">${stHtml}</td>
                                    <td style="padding:8px 10px; text-align:right; font-weight:800; color:#15803d; white-space:nowrap;">${esc(fmtMoeda(o.valor_total))}</td>
                                </tr>`;
                            }).join('')}
                        </tbody>
                        <tfoot><tr style="background:#f8fafc; border-top:2px solid #cbd5e1;">
                            <td colspan="7" style="padding:9px 10px; font-weight:800; color:#1e293b;">Total vinculado às OS (${lista.length})</td>
                            <td style="padding:9px 10px; text-align:right; font-weight:800; color:#15803d; white-space:nowrap;">${esc(fmtMoeda(total))}</td>
                        </tr></tfoot>
                    </table>`;
                }

                const listaFat = q ? fatList.filter(f => normStr(`${f.numero_nf} ${f.tipo_lancamento} ${f.competencia} ${f.numero_contrato} ${f.numero_os} ${f.status} ${f.forma_pagamento} ${f.observacoes}`).includes(q)) : fatList;
                if (!listaFat.length) {
                    return `<div style="padding:2rem; text-align:center; color:#64748b;">
                        <i class="ph ph-currency-circle-dollar" style="font-size:2rem; color:#7048e8;"></i>
                        <div style="margin-top:8px; font-weight:700; color:#334155;">Nenhum lançamento de Faturamento Financeiro registrado para este cliente até o momento.</div>
                        <div style="margin-top:4px; font-size:0.78rem; color:#64748b;">Quando os faturamentos forem gerados na tela de Faturamento do Financeiro, todas as faturas, NFs, boletos e pagamentos aparecerão aqui com valores e status.</div>
                    </div>`;
                }
                const totLiq = listaFat.reduce((a, f) => a + (Number(f.valor_liquido) || Number(f.valor_bruto) || 0), 0);
                const totPago = listaFat.reduce((a, f) => a + (Number(f.valor_pago) || 0), 0);
                return `<table style="width:100%; border-collapse:collapse; font-size:0.8rem;">
                    <thead><tr>
                        <th style="${thSt}">NF / Lançamento</th>
                        <th style="${thSt}">Competência</th>
                        <th style="${thSt}">Emissão</th>
                        <th style="${thSt}">Vencimento</th>
                        <th style="${thSt}">Pagamento</th>
                        <th style="${thSt}">Contrato / OS</th>
                        <th style="${thSt}">Status</th>
                        <th style="${thRight}">Valor Líq.</th>
                        <th style="${thRight}">Valor Pago</th>
                    </tr></thead>
                    <tbody>
                        ${listaFat.map(f => `<tr style="border-bottom:1px solid #e2e8f0;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background=''">
                            <td style="padding:8px 10px; font-weight:700; color:#1e293b;">${esc(f.numero_nf || f.tipo_lancamento || `#${f.id}`)}${f.tipo_lancamento && f.numero_nf ? ` <span style="color:#64748b; font-weight:500;">(${esc(f.tipo_lancamento)})</span>` : ''}</td>
                            <td style="padding:8px 10px; white-space:nowrap; color:#475569;">${esc(f.competencia || '—')}</td>
                            <td style="padding:8px 10px; white-space:nowrap; color:#475569;">${esc(fmtDataBr(f.data_emissao))}</td>
                            <td style="padding:8px 10px; white-space:nowrap; color:#475569;">${esc(fmtDataBr(f.data_vencimento))}</td>
                            <td style="padding:8px 10px; white-space:nowrap; color:#475569;">${esc(fmtDataBr(f.data_pagamento))}</td>
                            <td style="padding:8px 10px; white-space:nowrap; color:#334155;">${esc([f.numero_contrato ? `Ctr ${f.numero_contrato}` : '', f.numero_os ? `OS ${f.numero_os}` : ''].filter(Boolean).join(' · ') || '—')}</td>
                            <td style="padding:8px 10px; white-space:nowrap;">${renderBadgeStatusFaturamentoHist(f.status)}</td>
                            <td style="padding:8px 10px; text-align:right; font-weight:800; color:#1e293b; white-space:nowrap;">${esc(fmtMoeda(Number(f.valor_liquido) || Number(f.valor_bruto) || 0))}</td>
                            <td style="padding:8px 10px; text-align:right; font-weight:800; color:#15803d; white-space:nowrap;">${esc(fmtMoeda(f.valor_pago))}</td>
                        </tr>`).join('')}
                    </tbody>
                    <tfoot><tr style="background:#f8fafc; border-top:2px solid #cbd5e1;">
                        <td colspan="7" style="padding:9px 10px; font-weight:800; color:#1e293b;">Total em Faturamento (${listaFat.length})</td>
                        <td style="padding:9px 10px; text-align:right; font-weight:800; color:#1e293b; white-space:nowrap;">${esc(fmtMoeda(totLiq))}</td>
                        <td style="padding:9px 10px; text-align:right; font-weight:800; color:#15803d; white-space:nowrap;">${esc(fmtMoeda(totPago))}</td>
                    </tr></tfoot>
                </table>`;
            };

            Swal.fire({
                title: '',
                width: '1140px',
                showConfirmButton: false,
                customClass: { popup: 'custom-swal-padding-zero' },
                html: `
                    <div style="text-align:left; font-family:'Inter', sans-serif; display:flex; flex-direction:column; border-radius:12px; overflow:hidden; background:#f8fafc;">
                        <!-- Cabeçalho -->
                        <div style="padding:14px 18px; background:#ffffff; border-bottom:1px solid #e2e8f0; display:flex; align-items:flex-start; justify-content:space-between; gap:12px;">
                            <div>
                                <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                                    <span style="font-size:1.08rem; font-weight:800; color:#0f172a;">${esc(nomeHeader)}</span>
                                    ${grupoFinal ? `<span style="background:#f3f0ff; color:#5f3dc4; border:1px solid #d0bfff; padding:2px 8px; border-radius:999px; font-size:0.72rem; font-weight:700;">${esc(grupoFinal)}</span>` : ''}
                                </div>
                                <div style="margin-top:4px; font-size:0.78rem; color:#64748b; display:flex; gap:14px; flex-wrap:wrap;">
                                    <span><b>CNPJ/CPF:</b> ${esc(cli.cpf_cnpj || '—')}</span>
                                    ${cidadeUf ? `<span><b>Cidade/UF:</b> ${esc(cidadeUf)}</span>` : ''}
                                    <span>Histórico de movimentações comerciais e financeiras do cliente</span>
                                </div>
                            </div>
                            <button type="button" onclick="Swal.close()" style="background:none; border:none; color:#64748b; font-size:1.4rem; cursor:pointer; line-height:1;">&times;</button>
                        </div>

                        <!-- 4 Cards de Resumo com Valores -->
                        <div style="padding:12px 16px 0; display:grid; grid-template-columns:repeat(4, minmax(170px, 1fr)); gap:10px;">
                            <div style="background:#ffffff; border:1px solid #bfdbfe; border-radius:10px; padding:10px 12px;">
                                <div style="font-size:0.72rem; font-weight:800; color:#1d4ed8; text-transform:uppercase;">Propostas</div>
                                <div style="font-size:1.05rem; font-weight:800; color:#0f172a; margin-top:2px;">${esc(fmtMoeda(resu.valor_total_propostas))}</div>
                                <div style="font-size:0.72rem; color:#64748b; margin-top:2px;">${Number(resu.qtd_propostas) || 0} registro(s) · ${Number(resu.qtd_propostas_aprovadas) || 0} aprov./assin.</div>
                            </div>
                            <div style="background:#ffffff; border:1px solid #fde047; border-radius:10px; padding:10px 12px;">
                                <div style="font-size:0.72rem; font-weight:800; color:#854d0e; text-transform:uppercase;">Contratos</div>
                                <div style="font-size:1.05rem; font-weight:800; color:#0f172a; margin-top:2px;">${esc(fmtMoeda(resu.valor_total_contratos))}</div>
                                <div style="font-size:0.72rem; color:#64748b; margin-top:2px;">${Number(resu.qtd_contratos) || 0} contrato(s) gerado(s)</div>
                            </div>
                            <div style="background:#ffffff; border:1px solid #86efac; border-radius:10px; padding:10px 12px;">
                                <div style="font-size:0.72rem; font-weight:800; color:#15803d; text-transform:uppercase;">Ordens de Serviço (OS)</div>
                                <div style="font-size:1.05rem; font-weight:800; color:#0f172a; margin-top:2px;">${esc(fmtMoeda(resu.valor_total_os))}</div>
                                <div style="font-size:0.72rem; color:#64748b; margin-top:2px;">${Number(resu.qtd_os) || 0} OS(s) vinculada(s)</div>
                            </div>
                            <div style="background:#ffffff; border:1px solid #d0bfff; border-radius:10px; padding:10px 12px;">
                                <div style="font-size:0.72rem; font-weight:800; color:#5f3dc4; text-transform:uppercase;">Faturamento Financeiro</div>
                                <div style="font-size:1.05rem; font-weight:800; color:#0f172a; margin-top:2px;">${esc(fmtMoeda(resu.valor_total_faturado))}</div>
                                <div style="font-size:0.71rem; color:#64748b; margin-top:2px;">${Number(resu.qtd_faturamentos) || 0} lanç. · Pago: <b style="color:#15803d;">${esc(fmtMoeda(resu.valor_total_pago))}</b> · Aberto: <b style="color:#b45309;">${esc(fmtMoeda(resu.valor_total_em_aberto))}</b></div>
                            </div>
                        </div>

                        <!-- Abas + Busca -->
                        <div style="padding:12px 16px; display:flex; align-items:center; justify-content:space-between; gap:10px; flex-wrap:wrap;">
                            <div id="modal-cli-hist-tabs" style="display:flex; gap:6px; flex-wrap:wrap;">
                                ${htmlAbas()}
                            </div>
                            <div style="flex:1 1 220px; max-width:300px;">
                                <input type="text" id="modal-cli-hist-busca" placeholder="Pesquisar movimentação..."
                                    style="width:100%; height:34px; padding:0 10px; border:1px solid #cbd5e1; border-radius:8px; font-size:0.8rem; background:#fff; box-sizing:border-box; outline:none; text-transform:none;">
                            </div>
                        </div>

                        <!-- Tabela -->
                        <div style="padding:0 16px 16px;">
                            <div id="modal-cli-hist-body" style="max-height:50vh; min-height:220px; overflow:auto; border:1px solid #e2e8f0; border-radius:10px; background:#ffffff;">
                                ${renderConteudoAba()}
                            </div>
                        </div>
                    </div>
                `,
                didOpen: () => {
                    const p = typeof Swal.getPopup === 'function' ? Swal.getPopup() : null;
                    if (p) p.style.maxWidth = '96vw';
                    const tabsEl = document.getElementById('modal-cli-hist-tabs');
                    const bodyEl = document.getElementById('modal-cli-hist-body');
                    const inpBusca = document.getElementById('modal-cli-hist-busca');

                    const atualizarVisao = () => {
                        if (tabsEl) tabsEl.innerHTML = htmlAbas();
                        if (bodyEl) bodyEl.innerHTML = renderConteudoAba();
                        tabsEl?.querySelectorAll('button[data-hist-tab]').forEach(btn => {
                            btn.addEventListener('click', () => {
                                abaAtiva = btn.getAttribute('data-hist-tab') || 'visao';
                                atualizarVisao();
                            });
                        });
                    };

                    tabsEl?.querySelectorAll('button[data-hist-tab]').forEach(btn => {
                        btn.addEventListener('click', () => {
                            abaAtiva = btn.getAttribute('data-hist-tab') || 'visao';
                            atualizarVisao();
                        });
                    });

                    let timerHist = null;
                    inpBusca?.addEventListener('input', () => {
                        termoBusca = inpBusca.value || '';
                        clearTimeout(timerHist);
                        timerHist = setTimeout(() => {
                            if (bodyEl) bodyEl.innerHTML = renderConteudoAba();
                        }, 80);
                    });
                }
            });
        } catch (err) {
            Swal.fire('Erro', err.message || 'Erro ao buscar histórico de movimentações do cliente.', 'error');
        }
    };

    window.renderRelatorioComercial = async function (tipo, forcar = false) {
        const meta = REPORTS_META[tipo];
        const st = stateByTipo[tipo];
        if (!meta || !st) return;

        const root = document.getElementById(`${meta.target}-root`) || document.getElementById(`view-${meta.target}`);
        if (!forcar && st.carregado) {
            if (root && root.innerHTML.trim()) return;
            renderShellRelatorio(tipo);
            return;
        }

        st.carregando = true;
        renderShellRelatorio(tipo);
        await fetchDadosRelatorio(tipo);
        renderShellRelatorio(tipo);
    };
})();
