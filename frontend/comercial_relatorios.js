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
            subtitulo: 'Consulte todos os clientes cadastrados, filtre em tempo real e exporte para Excel.',
            icone: 'ph-users',
            nomeArquivo: 'Relacao_Clientes_Comercial'
        },
        enderecos: {
            target: 'comercial-rel-enderecos',
            titulo: 'Relação de Endereços',
            subtitulo: 'Consulte todos os endereços de instalação e faturamento cadastrados com filtro e exportação Excel.',
            icone: 'ph-map-pin',
            nomeArquivo: 'Relacao_Enderecos_Comercial'
        },
        propostas: {
            target: 'comercial-rel-propostas',
            titulo: 'Relação de Propostas',
            subtitulo: 'Listagem completa de propostas comerciais com filtros dinâmicos, produtos e exportação em Excel.',
            icone: 'ph-file-text',
            nomeArquivo: 'Relacao_Propostas_Comercial'
        },
        contratos: {
            target: 'comercial-rel-contratos',
            titulo: 'Relação de Contratos',
            subtitulo: 'Acompanhe todos os contratos gerados, situações, valores, propostas e OS vinculadas.',
            icone: 'ph-files',
            nomeArquivo: 'Relacao_Contratos_Comercial'
        },
        os: {
            target: 'comercial-rel-os',
            titulo: 'Relação de OS',
            subtitulo: 'Consulte todas as OS do Comercial por modalidade, equipamentos, serviços, contratos e datas.',
            icone: 'ph-clipboard-text',
            nomeArquivo: 'Relacao_OS_Comercial'
        }
    };

    const stateByTipo = {
        clientes:  { dados: [], carregando: false, erro: '', page: 1, pageSize: 100, filtros: { q: '', grupo: '', cidade: '' } },
        enderecos: { dados: [], carregando: false, erro: '', page: 1, pageSize: 100, filtros: { q: '', cliente: '', municipioUf: '' } },
        propostas: { dados: [], carregando: false, erro: '', page: 1, pageSize: 100, filtros: { q: '', tipo: '', fase: '', atendentes: [], atendBusca: '', produto: '', de: '', ate: '', perDe: '', perAte: '' } },
        contratos: { dados: [], carregando: false, erro: '', page: 1, pageSize: 100, filtros: { q: '', tipo: '', situacao: '', atendentes: [], atendBusca: '', de: '', ate: '' } },
        os:        { dados: [], carregando: false, erro: '', page: 1, pageSize: 100, filtros: { q: '', modalidade: '', tipoOs: '', statusOs: '', atendentes: [], atendBusca: '', equipamento: '', servico: '', de: '', ate: '' } }
    };

    let atendentesComercialLista = [];
    let debounceTimer = null;

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
                const resp = await fetch(`${apiBase}/comercial/relatorios/clientes`, { headers: getAuthHeaders() });
                if (!resp.ok) throw new Error('Falha ao carregar clientes cadastrados.');
                const rows = await resp.json();
                const arr = Array.isArray(rows) ? rows : [];
                arr.forEach(c => {
                    const grupo = c.grupo_clientes || c.classificacao || '';
                    c._grupoNorm = normStr(grupo);
                    c._cidadeNorm = normStr(`${c.municipio || ''} ${c.uf || ''}`);
                    c._nomeExib = formatarNomeComGrupoRapido(c.nome_razao_social || c.nome_fantasia || '—', grupo);
                    c._search = normStr(`${c.codigo || ''} ${c.nome_razao_social || ''} ${c.nome_fantasia || ''} ${c.cpf_cnpj || ''} ${c.email || ''} ${c.celular || ''} ${c.telefone || ''} ${c.municipio || ''} ${c.uf || ''}`);
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
                    e._search = normStr(`${cliRaw} ${e.nome_local || ''} ${e.endereco || ''} ${e.numero || ''} ${e.bairro || ''} ${e.municipio || ''} ${e.uf || ''} ${e.cep || ''}`);
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
                        p._atendExib = resolverAtendenteNome(p.atendente);
                        p._search = normStr(`${p.contrato || ''} ${p.codigo || ''} ${p.titulo_contrato || ''} ${p.cliente_nome || ''} ${p.contato_nome || ''} ${p.nome_evento || ''} ${p._atendExib} ${p.situacao_contrato || ''}`);
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
                return true;
            });
        }

        if (tipo === 'enderecos') {
            const qCli = normStr(f.cliente);
            const qMun = normStr(f.municipioUf);
            return dados.filter(e => {
                if (q && !e._search.includes(q)) return false;
                if (qCli && !e._cliNorm.includes(qCli)) return false;
                if (qMun && !e._munNorm.includes(qMun)) return false;
                return true;
            });
        }

        if (tipo === 'propostas') {
            const qProd = normStr(f.produto);
            const fFaseNorm = normStr(f.fase);
            return dados.filter(p => {
                if (q && !p._search.includes(q)) return false;
                if (f.tipo && normStr(p.tipo) !== normStr(f.tipo)) return false;
                if (fFaseNorm) {
                    let rowFase = normStr(p.fase_negociacao || 'Em Elaboração');
                    if (rowFase === 'enviada') rowFase = 'proposta enviada';
                    if (rowFase === 'aprovado - aditivo assinado') rowFase = 'proposta assinada';
                    if (rowFase !== fFaseNorm) return false;
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
                { key: 'codigo', label: 'Código', width: 12 },
                { key: 'razao_social', label: 'Razão Social / Nome', width: 38 },
                { key: 'fantasia', label: 'Nome Fantasia', width: 30 },
                { key: 'grupo', label: 'Grupo', width: 14 },
                { key: 'cpf_cnpj', label: 'CPF / CNPJ', width: 20 },
                { key: 'telefone', label: 'Telefone / Celular', width: 20 },
                { key: 'email', label: 'E-mail', width: 30 },
                { key: 'cidade_uf', label: 'Município / UF', width: 24 },
                { key: 'criado_em', label: 'Cadastro', width: 14 }
            ];
            const linhasExcel = filtrados.map(c => ({
                codigo: c.codigo || c.id || '',
                razao_social: limparNomeClienteParaExcel(c.nome_razao_social || c.nome_fantasia || ''),
                fantasia: c.nome_fantasia || '',
                grupo: c.grupo_clientes || c.classificacao || 'Sem Grupo',
                cpf_cnpj: c.cpf_cnpj || '',
                telefone: c.celular || c.telefone || '',
                email: c.email || '',
                cidade_uf: [c.municipio, c.uf].filter(Boolean).join('/') || '',
                criado_em: fmtDataBr(c.criado_em)
            }));
            return { colunas, linhasExcel };
        }

        if (tipo === 'enderecos') {
            const colunas = [
                { key: 'sequencia', label: 'Seq.', width: 10 },
                { key: 'cliente', label: 'Cliente', width: 38 },
                { key: 'nome_local', label: 'Nome do Local', width: 26 },
                { key: 'endereco', label: 'Logradouro', width: 36 },
                { key: 'numero', label: 'Nº', width: 10 },
                { key: 'bairro', label: 'Bairro', width: 22 },
                { key: 'municipio', label: 'Município', width: 22 },
                { key: 'uf', label: 'UF', width: 8 },
                { key: 'cep', label: 'CEP', width: 14 }
            ];
            const linhasExcel = filtrados.map((e, idx) => ({
                sequencia: e.sequencia || (idx + 1),
                cliente: limparNomeClienteParaExcel(e._cliRaw || ''),
                nome_local: e.nome_local || '',
                endereco: e.endereco || '',
                numero: e.numero || '',
                bairro: e.bairro || '',
                municipio: e.municipio || '',
                uf: e.uf || '',
                cep: e.cep || ''
            }));
            return { colunas, linhasExcel };
        }

        if (tipo === 'propostas') {
            const colunas = [
                { key: 'codigo', label: 'Nº Proposta', width: 14 },
                { key: 'data_cadastro', label: 'Data Cadastro', width: 14 },
                { key: 'tipo', label: 'Tipo', width: 18 },
                { key: 'cliente', label: 'Cliente', width: 38 },
                { key: 'contato', label: 'Contato', width: 24 },
                { key: 'atendente', label: 'Atendente', width: 22 },
                { key: 'fase', label: 'Fase de Negociação', width: 24 },
                { key: 'periodo', label: 'Período (Início / Fim)', width: 25 },
                { key: 'produtos', label: 'Produtos', width: 42, tipo: 'multilinha' },
                { key: 'valor_total', label: 'Valor Total', width: 18, tipo: 'moeda' },
                { key: 'contrato', label: 'Contrato', width: 14 }
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
                { key: 'contrato', label: 'Nº Contrato', width: 14 },
                { key: 'codigo', label: 'Nº Proposta', width: 14 },
                { key: 'data_emissao', label: 'Data Emissão', width: 14 },
                { key: 'tipo', label: 'Tipo', width: 18 },
                { key: 'titulo', label: 'Título', width: 30 },
                { key: 'cliente', label: 'Cliente', width: 38 },
                { key: 'contato', label: 'Contato', width: 24 },
                { key: 'atendente', label: 'Atendente', width: 22 },
                { key: 'situacao', label: 'Situação do Contrato', width: 26 },
                { key: 'periodo', label: 'Período (Início / Fim)', width: 25 },
                { key: 'valor_total', label: 'Valor Total', width: 18, tipo: 'moeda' },
                { key: 'numero_os', label: 'Nº OS', width: 12 }
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
                valor_total: Number(p.valor_total || 0),
                numero_os: p.numero_os || ''
            }));
            return { colunas, linhasExcel };
        }

        const colunas = [
            { key: 'numero_os', label: 'Nº OS', width: 12 },
            { key: 'modalidade', label: 'Obra / Evento', width: 14 },
            { key: 'tipo_os', label: 'Tipo de OS', width: 18 },
            { key: 'data_cadastro', label: 'Data Cadastro', width: 14 },
            { key: 'contrato', label: 'Contrato', width: 14 },
            { key: 'cliente', label: 'Cliente', width: 38 },
            { key: 'contato', label: 'Contato', width: 24 },
            { key: 'atendente', label: 'Atendente', width: 22 },
            { key: 'status_os', label: 'Status da OS', width: 26 },
            { key: 'equipamentos', label: 'Equipamentos', width: 40, tipo: 'multilinha' },
            { key: 'servicos', label: 'Serviços', width: 34, tipo: 'multilinha' },
            { key: 'data_entrega', label: 'Data Entrega', width: 14 },
            { key: 'data_retirada', label: 'Data Retirada', width: 14 },
            { key: 'endereco', label: 'Endereço(s) de Instalação', width: 45 }
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
        return `<div style="display:flex; flex-direction:column; gap:3px; min-width:190px; max-width:340px;">
            ${itens.map(item => `<div style="background:${corBg}; color:${corTxt}; border:1px solid ${corBorda}; border-radius:6px; padding:2px 7px; font-size:0.72rem; font-weight:700; line-height:1.25; white-space:normal;">${esc(item)}</div>`).join('')}
        </div>`;
    }

    function renderLinhasHtml(tipo, paginaLinhas) {
        if (!paginaLinhas.length) {
            return `<tr><td colspan="14" style="text-align:center; padding:2rem; color:#94a3b8; font-style:italic;">Nenhum registro encontrado para os filtros informados.</td></tr>`;
        }

        if (tipo === 'clientes') {
            return paginaLinhas.map(c => {
                const grupo = c.grupo_clientes || c.classificacao || '';
                return `<tr style="border-bottom:1px solid #e2e8f0;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background=''">
                    <td style="padding:7px 10px; font-weight:700; color:#7048e8; white-space:nowrap;">${esc(c.codigo || c.id || '—')}</td>
                    <td style="padding:7px 10px; font-weight:700; color:#0f172a;">${esc(c._nomeExib || c.nome_razao_social || '—')}</td>
                    <td style="padding:7px 10px; color:#475569;">${esc(c.nome_fantasia || '—')}</td>
                    <td style="padding:7px 10px; white-space:nowrap;">${grupo ? `<span style="background:#f3f0ff; color:#5f3dc4; border:1px solid #d0bfff; padding:2px 8px; border-radius:999px; font-size:0.72rem; font-weight:700;">${esc(grupo)}</span>` : '<span style="color:#94a3b8;">—</span>'}</td>
                    <td style="padding:7px 10px; white-space:nowrap; color:#334155;">${esc(c.cpf_cnpj || '—')}</td>
                    <td style="padding:7px 10px; white-space:nowrap; color:#334155;">${esc(c.celular || c.telefone || '—')}</td>
                    <td style="padding:7px 10px; color:#475569;">${esc(c.email || '—')}</td>
                    <td style="padding:7px 10px; white-space:nowrap; color:#475569;">${esc([c.municipio, c.uf].filter(Boolean).join('/') || '—')}</td>
                    <td style="padding:7px 10px; white-space:nowrap; color:#64748b;">${esc(fmtDataBr(c.criado_em))}</td>
                </tr>`;
            }).join('');
        }

        if (tipo === 'enderecos') {
            return paginaLinhas.map((e, idx) => `<tr style="border-bottom:1px solid #e2e8f0;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background=''">
                <td style="padding:7px 10px; font-weight:700; color:#64748b; text-align:center;">${esc(e.sequencia || (idx + 1))}</td>
                <td style="padding:7px 10px; font-weight:700; color:#0f172a;">${esc(e._cliExib || '—')}</td>
                <td style="padding:7px 10px; font-weight:600; color:#5f3dc4;">${esc(e.nome_local || '—')}</td>
                <td style="padding:7px 10px; color:#334155;">${esc(e.endereco || '—')}</td>
                <td style="padding:7px 10px; color:#334155; white-space:nowrap;">${esc(e.numero || 'S/N')}</td>
                <td style="padding:7px 10px; color:#475569;">${esc(e.bairro || '—')}</td>
                <td style="padding:7px 10px; color:#475569;">${esc(e.municipio || '—')}</td>
                <td style="padding:7px 10px; font-weight:700; color:#334155; white-space:nowrap;">${esc(e.uf || '—')}</td>
                <td style="padding:7px 10px; white-space:nowrap; color:#64748b;">${esc(e.cep || '—')}</td>
            </tr>`).join('');
        }

        if (tipo === 'propostas') {
            return paginaLinhas.map(p => {
                const cliExib = formatarNomeComGrupoRapido(p.cliente_nome || '—', '');
                const faseHtml = typeof window.renderBadgeFaseNegociacaoHtml === 'function'
                    ? window.renderBadgeFaseNegociacaoHtml(p.fase_negociacao || 'Em Elaboração')
                    : esc(p.fase_negociacao || 'Em Elaboração');
                const perStr = p.periodo_inicio ? `${fmtDataBr(p.periodo_inicio)} até ${fmtDataBr(p.periodo_fim || p.periodo_inicio)}` : '—';
                return `<tr style="border-bottom:1px solid #e2e8f0;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background=''">
                    <td style="padding:8px 10px; text-align:center; white-space:nowrap;">
                        <button type="button" onclick="if(window.abrirPropostaDiretoId) window.abrirPropostaDiretoId(${Number(p.id)})"
                            style="background:#2563eb; color:#fff; border:none; padding:3px 10px; border-radius:6px; font-weight:800; font-size:0.75rem; cursor:pointer;">${esc(p.codigo || '—')}</button>
                    </td>
                    <td style="padding:8px 10px; white-space:nowrap; color:#475569;">${esc(fmtDataBr(p.data_cadastro))}</td>
                    <td style="padding:8px 10px; font-weight:700; color:#334155; white-space:nowrap;">${esc(p.tipo || '—')}</td>
                    <td style="padding:8px 10px; font-weight:600; color:#0f172a;">${esc(cliExib)}</td>
                    <td style="padding:8px 10px; color:#475569;">${esc(p.contato_nome || '—')}</td>
                    <td style="padding:8px 10px; color:#334155; white-space:nowrap;">${esc(p._atendExib || '—')}</td>
                    <td style="padding:8px 10px; white-space:nowrap;">${faseHtml}</td>
                    <td style="padding:8px 10px; white-space:nowrap; color:#475569;">${esc(perStr)}</td>
                    <td style="padding:8px 10px;">${renderListaCompactaHtml(p._produtosList, '#f8fafc', '#1e293b', '#e2e8f0')}</td>
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
                    <td style="padding:8px 10px; color:#334155;">${esc(p.titulo_contrato || '—')}</td>
                    <td style="padding:8px 10px; font-weight:600; color:#0f172a;">${esc(cliExib)}</td>
                    <td style="padding:8px 10px; color:#475569;">${esc(p.contato_nome || '—')}</td>
                    <td style="padding:8px 10px; color:#334155; white-space:nowrap;">${esc(p._atendExib || '—')}</td>
                    <td style="padding:8px 10px; white-space:nowrap;">${sitHtml}</td>
                    <td style="padding:8px 10px; white-space:nowrap; color:#475569;">${esc(perStr)}</td>
                    <td style="padding:8px 10px; text-align:right; font-weight:700; color:#15803d; white-space:nowrap;">${esc(fmtMoeda(p.valor_total))}</td>
                    <td style="padding:8px 10px; text-align:center; white-space:nowrap;">${p.numero_os ? `<button type="button" onclick="if(window.abrirOsComercialDaProposta) window.abrirOsComercialDaProposta(${Number(p.id)})" style="background:#16a34a; color:#ffffff; border:none; padding:3px 9px; border-radius:6px; font-weight:800; font-size:0.74rem; cursor:pointer;">${esc(p.numero_os)}</button>` : '—'}</td>
                </tr>`;
            }).join('');
        }

        return paginaLinhas.map(p => {
            const cliExib = formatarNomeComGrupoRapido(p.cliente_nome || '—', '');
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
                <td style="padding:8px 10px; font-weight:600; color:#0f172a;">${esc(cliExib)}</td>
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

    function renderFiltrosHtml(tipo) {
        const st = stateByTipo[tipo];
        const f = st.filtros;
        const inpSt = 'height:34px; padding:0 10px; border:1px solid #cbd5e1; border-radius:7px; font-size:0.81rem; background:#fff; color:#1e293b; box-sizing:border-box; outline:none; text-transform:none;';
        const lblSt = 'display:block; font-size:0.72rem; font-weight:700; color:#475569; margin-bottom:3px;';

        if (tipo === 'clientes') {
            return `
                <div style="flex:2 1 260px;">
                    <label style="${lblSt}">Pesquisar</label>
                    <input type="text" data-filtro="q" value="${esc(f.q)}" oninput="window._comercialRelatorios.onInputFiltro('${tipo}', 'q', this.value, true)"
                        placeholder="Digite código, razão social, fantasia, CNPJ/CPF, e-mail..." style="width:100%; ${inpSt}">
                </div>
                <div style="flex:1 1 160px;">
                    <label style="${lblSt}">Grupo de Clientes</label>
                    <select onchange="window._comercialRelatorios.onInputFiltro('${tipo}', 'grupo', this.value, false)" style="width:100%; ${inpSt}">
                        <option value="">Todos</option>
                        ${['Diamante', 'Ouro', 'Prata', 'Bronze'].map(g => `<option value="${g}" ${f.grupo === g ? 'selected' : ''}>${g}</option>`).join('')}
                        <option value="__sem__" ${f.grupo === '__sem__' ? 'selected' : ''}>Sem Grupo</option>
                    </select>
                </div>
                <div style="flex:1 1 180px;">
                    <label style="${lblSt}">Município / UF</label>
                    <input type="text" data-filtro="cidade" value="${esc(f.cidade)}" oninput="window._comercialRelatorios.onInputFiltro('${tipo}', 'cidade', this.value, true)"
                        placeholder="Filtrar cidade ou UF..." style="width:100%; ${inpSt}">
                </div>
            `;
        }

        if (tipo === 'enderecos') {
            return `
                <div style="flex:2 1 280px;">
                    <label style="${lblSt}">Pesquisar</label>
                    <input type="text" data-filtro="q" value="${esc(f.q)}" oninput="window._comercialRelatorios.onInputFiltro('${tipo}', 'q', this.value, true)"
                        placeholder="Digite endereço, local, bairro, CEP..." style="width:100%; ${inpSt}">
                </div>
                <div style="flex:1.4 1 200px;">
                    <label style="${lblSt}">Cliente</label>
                    <input type="text" data-filtro="cliente" value="${esc(f.cliente)}" oninput="window._comercialRelatorios.onInputFiltro('${tipo}', 'cliente', this.value, true)"
                        placeholder="Filtrar por cliente..." style="width:100%; ${inpSt}">
                </div>
                <div style="flex:1 1 180px;">
                    <label style="${lblSt}">Município / UF</label>
                    <input type="text" data-filtro="municipioUf" value="${esc(f.municipioUf)}" oninput="window._comercialRelatorios.onInputFiltro('${tipo}', 'municipioUf', this.value, true)"
                        placeholder="Filtrar cidade ou UF..." style="width:100%; ${inpSt}">
                </div>
            `;
        }

        if (tipo === 'propostas') {
            const tiposOpts = Array.from(new Set(st.dados.map(d => String(d.tipo || '').trim()).filter(Boolean))).sort();
            const fasesSet = new Set(FASES_NEGOCIACAO_TODAS);
            st.dados.forEach(d => {
                const fn = String(d.fase_negociacao || '').trim();
                if (fn && normStr(fn) !== 'enviada' && normStr(fn) !== 'aprovado - aditivo assinado') {
                    const jaExiste = Array.from(fasesSet).some(x => normStr(x) === normStr(fn));
                    if (!jaExiste) fasesSet.add(fn);
                }
            });
            const fasesOpts = Array.from(fasesSet);
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
                <div style="flex:1.1 1 170px;">
                    <label style="${lblSt}">Fase de Negociação</label>
                    <select onchange="window._comercialRelatorios.onInputFiltro('${tipo}', 'fase', this.value, false)" style="width:100%; ${inpSt}">
                        <option value="">Todas</option>
                        ${fasesOpts.map(fs => `<option value="${esc(fs)}" ${f.fase === fs ? 'selected' : ''}>${esc(fs)}</option>`).join('')}
                    </select>
                </div>
                ${renderAtendenteMultiHtml('propostas', 'flex:1.2 1 195px;')}
                <div style="flex:1.2 1 175px;">
                    <label style="${lblSt}">Produto</label>
                    <input type="text" data-filtro="produto" value="${esc(f.produto)}" oninput="window._comercialRelatorios.onInputFiltro('${tipo}', 'produto', this.value, true)"
                        placeholder="Filtrar por produto..." style="width:100%; ${inpSt}">
                </div>
                <div style="flex:0.65 1 120px;">
                    <label style="${lblSt}">Período Início (Prop.)</label>
                    <input type="date" value="${esc(f.perDe)}" onchange="window._comercialRelatorios.onInputFiltro('${tipo}', 'perDe', this.value, false)" style="width:100%; ${inpSt}">
                </div>
                <div style="flex:0.65 1 120px;">
                    <label style="${lblSt}">Período Até (Prop.)</label>
                    <input type="date" value="${esc(f.perAte)}" onchange="window._comercialRelatorios.onInputFiltro('${tipo}', 'perAte', this.value, false)" style="width:100%; ${inpSt}">
                </div>
                <div style="flex:0.65 1 120px;">
                    <label style="${lblSt}">Cadastro De</label>
                    <input type="date" value="${esc(f.de)}" onchange="window._comercialRelatorios.onInputFiltro('${tipo}', 'de', this.value, false)" style="width:100%; ${inpSt}">
                </div>
                <div style="flex:0.65 1 120px;">
                    <label style="${lblSt}">Cadastro Até</label>
                    <input type="date" value="${esc(f.ate)}" onchange="window._comercialRelatorios.onInputFiltro('${tipo}', 'ate', this.value, false)" style="width:100%; ${inpSt}">
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

        const theadEl = document.getElementById(`comrel-${tipo}-thead`);
        if (theadEl) {
            theadEl.innerHTML = `<tr style="background:#f8fafc; border-bottom:2px solid #cbd5e1; color:#475569; font-size:0.72rem; text-transform:uppercase; letter-spacing:0.03em;">
                ${cfg.colunas.map(col => `<th style="position:sticky; top:0; z-index:2; background:#f8fafc; padding:10px; text-align:${col.tipo === 'moeda' ? 'right' : 'left'}; white-space:nowrap;">${esc(col.label)}</th>`).join('')}
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
                tbodyEl.innerHTML = `<tr><td colspan="${cfg.colunas.length}" style="text-align:center; padding:2.5rem; color:#64748b;"><i class="ph ph-spinner ph-spin" style="font-size:1.3rem;"></i> Carregando ${esc(meta.titulo)}...</td></tr>`;
            } else if (st.erro) {
                tbodyEl.innerHTML = `<tr><td colspan="${cfg.colunas.length}" style="text-align:center; padding:2rem; color:#dc2626; font-weight:700;">${esc(st.erro)}</td></tr>`;
            } else {
                tbodyEl.innerHTML = renderLinhasHtml(tipo, paginaLinhas);
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
                        <div>
                            <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                                <h2 style="margin:0; font-size:1.15rem; font-weight:800; color:#1e293b;">${esc(meta.titulo)}</h2>
                                <span id="comrel-${tipo}-count" style="background:#ede9fe; color:#5f3dc4; border:1px solid #d0bfff; padding:2px 10px; border-radius:999px; font-size:0.74rem; font-weight:800;">${filtrados.length} registro(s)</span>
                                ${mostrarTotalMoeda ? `<span id="comrel-${tipo}-total-valor" style="background:#dcfce7; color:#15803d; border:1px solid #86efac; padding:2px 10px; border-radius:999px; font-size:0.74rem; font-weight:800;">${esc(fmtMoeda(0))}</span>` : ''}
                            </div>
                            <p style="margin:2px 0 0; font-size:0.8rem; color:#64748b;">${esc(meta.subtitulo)}</p>
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

                <!-- Tabela + Paginação -->
                <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:12px; overflow:hidden; box-shadow:0 2px 8px rgba(15,23,42,0.03);">
                    <div style="max-height:62vh; overflow:auto;">
                        <table style="width:100%; border-collapse:collapse; font-size:0.81rem; text-align:left;">
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
        ['propostas', 'contratos', 'os'].forEach(tipo => {
            const wrap = document.getElementById(`comrel-${tipo}-atend-wrap`);
            const drop = document.getElementById(`comrel-${tipo}-atend-dropdown`);
            if (drop && drop.style.display === 'block' && wrap && !wrap.contains(e.target)) {
                drop.style.display = 'none';
            }
        });
    });

    window.renderRelatorioComercial = async function (tipo) {
        const st = stateByTipo[tipo];
        if (!st) return;
        st.carregando = true;
        renderShellRelatorio(tipo);
        await fetchDadosRelatorio(tipo);
        renderShellRelatorio(tipo);
    };
})();
