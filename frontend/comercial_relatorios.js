/**
 * ============================================================================
 * MÓDULO: COMERCIAL → RELATÓRIOS
 * Telas de relatórios com filtros em tempo real e exportação para Excel (.xlsx):
 *   - Clientes Cadastrados (comercial-rel-clientes)
 *   - Endereços Cadastrados (comercial-rel-enderecos)
 *   - Propostas (comercial-rel-propostas)
 *   - Contratos (comercial-rel-contratos)
 *   - OS (comercial-rel-os)
 * ============================================================================
 */
(function () {
    'use strict';

    const REPORTS_META = {
        clientes: {
            target: 'comercial-rel-clientes',
            titulo: 'Relatório de Clientes Cadastrados',
            subtitulo: 'Consulte todos os clientes cadastrados, filtre em tempo real e exporte para Excel.',
            icone: 'ph-users',
            nomeArquivo: 'Relatorio_Clientes_Comercial'
        },
        enderecos: {
            target: 'comercial-rel-enderecos',
            titulo: 'Relatório de Endereços Cadastrados',
            subtitulo: 'Consulte todos os endereços de instalação e faturamento cadastrados com filtro e exportação Excel.',
            icone: 'ph-map-pin',
            nomeArquivo: 'Relatorio_Enderecos_Comercial'
        },
        propostas: {
            target: 'comercial-rel-propostas',
            titulo: 'Relatório de Propostas',
            subtitulo: 'Listagem completa de propostas comerciais com filtros dinâmicos e exportação em Excel.',
            icone: 'ph-file-text',
            nomeArquivo: 'Relatorio_Propostas_Comercial'
        },
        contratos: {
            target: 'comercial-rel-contratos',
            titulo: 'Relatório de Contratos',
            subtitulo: 'Acompanhe todos os contratos gerados, situações, valores e OS vinculadas.',
            icone: 'ph-files',
            nomeArquivo: 'Relatorio_Contratos_Comercial'
        },
        os: {
            target: 'comercial-rel-os',
            titulo: 'Relatório de Ordens de Serviço (OS)',
            subtitulo: 'Consulte todas as OS do Comercial por modalidade (Obra/Evento), tipo, status e datas.',
            icone: 'ph-clipboard-text',
            nomeArquivo: 'Relatorio_OS_Comercial'
        }
    };

    const stateByTipo = {
        clientes: { dados: [], carregando: false, erro: '', filtros: { q: '', grupo: '', cidade: '' } },
        enderecos: { dados: [], carregando: false, erro: '', filtros: { q: '', cliente: '', municipioUf: '' } },
        propostas: { dados: [], carregando: false, erro: '', filtros: { q: '', tipo: '', fase: '', atendente: '', de: '', ate: '' } },
        contratos: { dados: [], carregando: false, erro: '', filtros: { q: '', tipo: '', situacao: '', atendente: '', de: '', ate: '' } },
        os: { dados: [], carregando: false, erro: '', filtros: { q: '', modalidade: '', tipoOs: '', statusOs: '', atendente: '', de: '', ate: '' } }
    };

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

    function formatarNomeClienteInterno(nome, grupoOpcional) {
        const raw = String(nome || '').trim();
        if (!raw) return '—';
        if (typeof window.formatarNomeClienteComIcone === 'function') {
            return window.formatarNomeClienteComIcone(raw, grupoOpcional) || raw;
        }
        return raw;
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

    async function fetchDadosRelatorio(tipo) {
        const st = stateByTipo[tipo];
        if (!st) return;
        st.carregando = true;
        st.erro = '';
        const apiBase = getApiBase();

        try {
            if (tipo === 'clientes') {
                const resp = await fetch(`${apiBase}/clientes`, { headers: getAuthHeaders() });
                if (!resp.ok) throw new Error('Falha ao carregar clientes cadastrados.');
                const rows = await resp.json();
                st.dados = Array.isArray(rows) ? rows : [];
                if (typeof window.obterClientesCache === 'function' && st.dados.length) {
                    window._clientesCache = st.dados;
                }
            } else if (tipo === 'enderecos') {
                const [rEnd, rCli] = await Promise.all([
                    fetch(`${apiBase}/enderecos-entrega`, { headers: getAuthHeaders() }),
                    fetch(`${apiBase}/clientes`, { headers: getAuthHeaders() }).catch(() => null)
                ]);
                if (!rEnd.ok) throw new Error('Falha ao carregar endereços cadastrados.');
                const rows = await rEnd.json();
                if (rCli && rCli.ok) {
                    const clis = await rCli.json().catch(() => []);
                    if (Array.isArray(clis) && clis.length) window._clientesCache = clis;
                }
                st.dados = Array.isArray(rows) ? rows : [];
            } else {
                const [rProp, rCli] = await Promise.all([
                    fetch(`${apiBase}/propostas`, { headers: getAuthHeaders() }),
                    fetch(`${apiBase}/clientes`, { headers: getAuthHeaders() }).catch(() => null)
                ]);
                if (!rProp.ok) throw new Error('Falha ao carregar registros do Comercial.');
                const rows = await rProp.json();
                if (rCli && rCli.ok) {
                    const clis = await rCli.json().catch(() => []);
                    if (Array.isArray(clis) && clis.length) window._clientesCache = clis;
                }
                const arr = Array.isArray(rows) ? rows : [];
                window._propostasData = arr;

                if (tipo === 'propostas') {
                    st.dados = arr.filter(p => {
                        if (!p || String(p.status || '').toLowerCase() === 'excluída') return false;
                        const sitUp = String(p.situacao_contrato || '').trim().toUpperCase();
                        return sitUp !== 'OS AVULSA' && Boolean(String(p.codigo || '').trim());
                    });
                } else if (tipo === 'contratos') {
                    st.dados = arr.filter(p => {
                        if (!p || String(p.status || '').toLowerCase() === 'excluída') return false;
                        const tUp = String(p.tipo || '').trim().toUpperCase().replace(/^PROPOSTA\s+/i, '');
                        return tUp !== 'ADITIVO' && Boolean(String(p.contrato || '').trim());
                    });
                } else if (tipo === 'os') {
                    st.dados = arr.filter(p => {
                        if (!p || String(p.status || '').toLowerCase() === 'excluída') return false;
                        const tUp = String(p.tipo || '').trim().toUpperCase().replace(/^PROPOSTA\s+/i, '');
                        return tUp !== 'ADITIVO' && Boolean(String(p.numero_os || '').trim());
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
                const nome = `${c.codigo || ''} ${c.nome_razao_social || ''} ${c.nome_fantasia || ''} ${c.cpf_cnpj || ''} ${c.email || ''} ${c.celular || ''} ${c.telefone || ''} ${c.municipio || ''} ${c.uf || ''}`;
                if (q && !normStr(nome).includes(q)) return false;
                if (qCid && !normStr(`${c.municipio || ''} ${c.uf || ''}`).includes(qCid)) return false;
                if (gSel) {
                    const gRow = normStr(c.grupo_clientes || c.classificacao || '');
                    if (gSel === '__sem__') {
                        if (gRow) return false;
                    } else if (gRow !== gSel) {
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
                const cli = e.cliente_nome || e.nome_razao_social || '';
                const texto = `${cli} ${e.nome_local || ''} ${e.endereco || ''} ${e.numero || ''} ${e.bairro || ''} ${e.municipio || ''} ${e.uf || ''} ${e.cep || ''}`;
                if (q && !normStr(texto).includes(q)) return false;
                if (qCli && !normStr(cli).includes(qCli)) return false;
                if (qMun && !normStr(`${e.municipio || ''} ${e.uf || ''}`).includes(qMun)) return false;
                return true;
            });
        }

        if (tipo === 'propostas') {
            const qAt = normStr(f.atendente);
            return dados.filter(p => {
                const atd = resolverAtendenteNome(p.atendente);
                const texto = `${p.codigo || ''} ${p.contrato || ''} ${p.cliente_nome || ''} ${p.contato_nome || ''} ${p.nome_evento || ''} ${p.tipo || ''} ${atd} ${p.fase_negociacao || ''}`;
                if (q && !normStr(texto).includes(q)) return false;
                if (f.tipo && normStr(p.tipo) !== normStr(f.tipo)) return false;
                if (f.fase && normStr(p.fase_negociacao || 'Em Elaboração') !== normStr(f.fase)) return false;
                if (qAt && !normStr(atd).includes(qAt)) return false;
                const dt = String(p.data_cadastro || '').substring(0, 10);
                if (f.de && dt && dt < f.de) return false;
                if (f.ate && dt && dt > f.ate) return false;
                return true;
            });
        }

        if (tipo === 'contratos') {
            const qAt = normStr(f.atendente);
            return dados.filter(p => {
                const atd = resolverAtendenteNome(p.atendente);
                const sit = String(p.situacao_contrato || 'EM ELABORAÇÃO');
                const texto = `${p.contrato || ''} ${p.codigo || ''} ${p.titulo_contrato || ''} ${p.cliente_nome || ''} ${p.contato_nome || ''} ${p.nome_evento || ''} ${atd} ${sit}`;
                if (q && !normStr(texto).includes(q)) return false;
                if (f.tipo && normStr(p.tipo) !== normStr(f.tipo)) return false;
                if (f.situacao && normStr(sit) !== normStr(f.situacao)) return false;
                if (qAt && !normStr(atd).includes(qAt)) return false;
                const dt = String(p.aprovado_em || p.data_cadastro || '').substring(0, 10);
                if (f.de && dt && dt < f.de) return false;
                if (f.ate && dt && dt > f.ate) return false;
                return true;
            });
        }

        if (tipo === 'os') {
            const qAt = normStr(f.atendente);
            return dados.filter(p => {
                const mod = resolverModalidadeOs(p);
                const tipoOs = String(p.os_tipo_operacao || 'Envio');
                const statusOs = String(p.status_os || 'EM ELABORAÇÃO');
                const atd = resolverAtendenteNome(p.atendente);
                const texto = `${p.numero_os || ''} ${p.contrato || ''} ${p.codigo || ''} ${p.titulo_contrato || ''} ${p.cliente_nome || ''} ${p.contato_nome || ''} ${p.endereco_instalacao || ''} ${atd} ${tipoOs} ${mod} ${statusOs}`;
                if (q && !normStr(texto).includes(q)) return false;
                if (f.modalidade && normStr(mod) !== normStr(f.modalidade)) return false;
                if (f.tipoOs && normStr(tipoOs) !== normStr(f.tipoOs)) return false;
                if (f.statusOs && normStr(statusOs) !== normStr(f.statusOs)) return false;
                if (qAt && !normStr(atd).includes(qAt)) return false;
                const dt = String(p.os_criada_em || p.data_cadastro || '').substring(0, 10);
                if (f.de && dt && dt < f.de) return false;
                if (f.ate && dt && dt > f.ate) return false;
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
                cliente: limparNomeClienteParaExcel(e.cliente_nome || e.nome_razao_social || ''),
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
                { key: 'valor_total', label: 'Valor Total', width: 18, tipo: 'moeda' },
                { key: 'contrato', label: 'Contrato', width: 14 }
            ];
            const linhasExcel = filtrados.map(p => ({
                codigo: p.codigo || '',
                data_cadastro: fmtDataBr(p.data_cadastro),
                tipo: p.tipo || '',
                cliente: limparNomeClienteParaExcel(p.cliente_nome || ''),
                contato: p.contato_nome || '',
                atendente: resolverAtendenteNome(p.atendente),
                fase: p.fase_negociacao || 'Em Elaboração',
                periodo: p.periodo_inicio ? `${fmtDataBr(p.periodo_inicio)} até ${fmtDataBr(p.periodo_fim || p.periodo_inicio)}` : '—',
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
                atendente: resolverAtendenteNome(p.atendente),
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
            { key: 'data_entrega', label: 'Data Entrega', width: 14 },
            { key: 'data_retirada', label: 'Data Retirada', width: 14 },
            { key: 'endereco', label: 'Endereço(s) de Instalação', width: 45 }
        ];
        const linhasExcel = filtrados.map(p => {
            const dts = extrairDatasOs(p);
            return {
                numero_os: p.numero_os || '',
                modalidade: resolverModalidadeOs(p),
                tipo_os: p.os_tipo_operacao || 'Envio',
                data_cadastro: fmtDataBr(String(p.os_criada_em || '').substring(0, 10) || p.data_cadastro),
                contrato: p.contrato || '',
                cliente: limparNomeClienteParaExcel(p.cliente_nome || ''),
                contato: p.contato_nome || '',
                atendente: resolverAtendenteNome(p.atendente),
                status_os: p.status_os || 'EM ELABORAÇÃO',
                data_entrega: dts.data_entrega ? fmtDataBr(dts.data_entrega) : '—',
                data_retirada: dts.data_retirada ? fmtDataBr(dts.data_retirada) : '—',
                endereco: p.endereco_instalacao || ''
            };
        });
        return { colunas, linhasExcel };
    }

    function renderLinhasHtml(tipo, filtrados) {
        if (!filtrados.length) {
            return `<tr><td colspan="12" style="text-align:center; padding:2rem; color:#94a3b8; font-style:italic;">Nenhum registro encontrado para os filtros informados.</td></tr>`;
        }

        if (tipo === 'clientes') {
            return filtrados.map(c => {
                const grupo = c.grupo_clientes || c.classificacao || '';
                const nomeExib = formatarNomeClienteInterno(c.nome_razao_social || c.nome_fantasia || '—', grupo);
                return `<tr style="border-bottom:1px solid #e2e8f0;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background=''">
                    <td style="padding:8px 10px; font-weight:700; color:#7048e8; white-space:nowrap;">${esc(c.codigo || c.id || '—')}</td>
                    <td style="padding:8px 10px; font-weight:700; color:#0f172a;">${esc(nomeExib)}</td>
                    <td style="padding:8px 10px; color:#475569;">${esc(c.nome_fantasia || '—')}</td>
                    <td style="padding:8px 10px; white-space:nowrap;">${grupo ? `<span style="background:#f3f0ff; color:#5f3dc4; border:1px solid #d0bfff; padding:2px 8px; border-radius:999px; font-size:0.72rem; font-weight:700;">${esc(grupo)}</span>` : '<span style="color:#94a3b8;">—</span>'}</td>
                    <td style="padding:8px 10px; white-space:nowrap; color:#334155;">${esc(c.cpf_cnpj || '—')}</td>
                    <td style="padding:8px 10px; white-space:nowrap; color:#334155;">${esc(c.celular || c.telefone || '—')}</td>
                    <td style="padding:8px 10px; color:#475569;">${esc(c.email || '—')}</td>
                    <td style="padding:8px 10px; white-space:nowrap; color:#475569;">${esc([c.municipio, c.uf].filter(Boolean).join('/') || '—')}</td>
                    <td style="padding:8px 10px; white-space:nowrap; color:#64748b;">${esc(fmtDataBr(c.criado_em))}</td>
                </tr>`;
            }).join('');
        }

        if (tipo === 'enderecos') {
            return filtrados.map((e, idx) => {
                const cliExib = formatarNomeClienteInterno(e.cliente_nome || e.nome_razao_social || '—');
                return `<tr style="border-bottom:1px solid #e2e8f0;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background=''">
                    <td style="padding:8px 10px; font-weight:700; color:#64748b; text-align:center;">${esc(e.sequencia || (idx + 1))}</td>
                    <td style="padding:8px 10px; font-weight:700; color:#0f172a;">${esc(cliExib)}</td>
                    <td style="padding:8px 10px; font-weight:600; color:#5f3dc4;">${esc(e.nome_local || '—')}</td>
                    <td style="padding:8px 10px; color:#334155;">${esc(e.endereco || '—')}</td>
                    <td style="padding:8px 10px; color:#334155; white-space:nowrap;">${esc(e.numero || 'S/N')}</td>
                    <td style="padding:8px 10px; color:#475569;">${esc(e.bairro || '—')}</td>
                    <td style="padding:8px 10px; color:#475569;">${esc(e.municipio || '—')}</td>
                    <td style="padding:8px 10px; font-weight:700; color:#334155; white-space:nowrap;">${esc(e.uf || '—')}</td>
                    <td style="padding:8px 10px; white-space:nowrap; color:#64748b;">${esc(e.cep || '—')}</td>
                </tr>`;
            }).join('');
        }

        if (tipo === 'propostas') {
            return filtrados.map(p => {
                const cliExib = formatarNomeClienteInterno(p.cliente_nome || '—');
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
                    <td style="padding:8px 10px; color:#334155; white-space:nowrap;">${esc(resolverAtendenteNome(p.atendente))}</td>
                    <td style="padding:8px 10px; white-space:nowrap;">${faseHtml}</td>
                    <td style="padding:8px 10px; white-space:nowrap; color:#475569;">${esc(perStr)}</td>
                    <td style="padding:8px 10px; text-align:right; font-weight:700; color:#15803d; white-space:nowrap;">${esc(fmtMoeda(p.valor_total))}</td>
                    <td style="padding:8px 10px; text-align:center; white-space:nowrap;">${p.contrato ? `<span style="background:#fef08a; color:#854d0e; border:1px solid #eab308; padding:2px 8px; border-radius:6px; font-weight:800; font-size:0.74rem;">${esc(p.contrato)}</span>` : '—'}</td>
                </tr>`;
            }).join('');
        }

        if (tipo === 'contratos') {
            return filtrados.map(p => {
                const cliExib = formatarNomeClienteInterno(p.cliente_nome || '—');
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
                    <td style="padding:8px 10px; text-align:center; white-space:nowrap; font-weight:700; color:#2563eb;">${esc(p.codigo || '—')}</td>
                    <td style="padding:8px 10px; white-space:nowrap; color:#475569;">${esc(dtEm)}</td>
                    <td style="padding:8px 10px; font-weight:700; color:#334155; white-space:nowrap;">${esc(p.tipo || '—')}</td>
                    <td style="padding:8px 10px; color:#334155;">${esc(p.titulo_contrato || '—')}</td>
                    <td style="padding:8px 10px; font-weight:600; color:#0f172a;">${esc(cliExib)}</td>
                    <td style="padding:8px 10px; color:#475569;">${esc(p.contato_nome || '—')}</td>
                    <td style="padding:8px 10px; color:#334155; white-space:nowrap;">${esc(resolverAtendenteNome(p.atendente))}</td>
                    <td style="padding:8px 10px; white-space:nowrap;">${sitHtml}</td>
                    <td style="padding:8px 10px; white-space:nowrap; color:#475569;">${esc(perStr)}</td>
                    <td style="padding:8px 10px; text-align:right; font-weight:700; color:#15803d; white-space:nowrap;">${esc(fmtMoeda(p.valor_total))}</td>
                    <td style="padding:8px 10px; text-align:center; white-space:nowrap;">${p.numero_os ? `<span style="background:#dcfce7; color:#15803d; border:1px solid #86efac; padding:2px 8px; border-radius:6px; font-weight:800; font-size:0.74rem;">${esc(p.numero_os)}</span>` : '—'}</td>
                </tr>`;
            }).join('');
        }

        return filtrados.map(p => {
            const cliExib = formatarNomeClienteInterno(p.cliente_nome || '—');
            const mod = resolverModalidadeOs(p);
            const modHtml = typeof window.renderBadgeModalidadeObraEventoOsHtml === 'function'
                ? window.renderBadgeModalidadeObraEventoOsHtml(mod)
                : esc(mod);
            const stHtml = typeof window.renderBadgeStatusOsComercialHtml === 'function'
                ? window.renderBadgeStatusOsComercialHtml(p.status_os || 'EM ELABORAÇÃO')
                : esc(p.status_os || 'EM ELABORAÇÃO');
            const dts = extrairDatasOs(p);
            const dtCad = fmtDataBr(String(p.os_criada_em || '').substring(0, 10) || p.data_cadastro);
            return `<tr style="border-bottom:1px solid #e2e8f0;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background=''">
                <td style="padding:8px 10px; text-align:center; white-space:nowrap;">
                    <button type="button" onclick="if(window.abrirOsComercialDaProposta) window.abrirOsComercialDaProposta(${Number(p.id)})"
                        style="background:#16a34a; color:#fff; border:none; padding:3px 10px; border-radius:6px; font-weight:800; font-size:0.75rem; cursor:pointer;">${esc(p.numero_os || '—')}</button>
                </td>
                <td style="padding:8px 10px; white-space:nowrap;">${modHtml}</td>
                <td style="padding:8px 10px; font-weight:700; color:#334155; white-space:nowrap;">${esc(p.os_tipo_operacao || 'Envio')}</td>
                <td style="padding:8px 10px; white-space:nowrap; color:#475569;">${esc(dtCad)}</td>
                <td style="padding:8px 10px; text-align:center; white-space:nowrap; font-weight:700; color:#854d0e;">${esc(p.contrato || '—')}</td>
                <td style="padding:8px 10px; font-weight:600; color:#0f172a;">${esc(cliExib)}</td>
                <td style="padding:8px 10px; color:#475569;">${esc(p.contato_nome || '—')}</td>
                <td style="padding:8px 10px; color:#334155; white-space:nowrap;">${esc(resolverAtendenteNome(p.atendente))}</td>
                <td style="padding:8px 10px; white-space:nowrap;">${stHtml}</td>
                <td style="padding:8px 10px; white-space:nowrap; color:#475569;">${dts.data_entrega ? esc(fmtDataBr(dts.data_entrega)) : '—'}</td>
                <td style="padding:8px 10px; white-space:nowrap; color:#475569;">${dts.data_retirada ? esc(fmtDataBr(dts.data_retirada)) : '—'}</td>
                <td style="padding:8px 10px; color:#475569; max-width:340px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${esc(p.endereco_instalacao || '')}">${esc(p.endereco_instalacao || '—')}</td>
            </tr>`;
        }).join('');
    }

    function renderFiltrosHtml(tipo) {
        const st = stateByTipo[tipo];
        const f = st.filtros;
        const inpSt = 'height:34px; padding:0 10px; border:1px solid #cbd5e1; border-radius:7px; font-size:0.82rem; background:#fff; color:#1e293b; box-sizing:border-box; outline:none; text-transform:none;';
        const lblSt = 'display:block; font-size:0.72rem; font-weight:700; color:#475569; margin-bottom:3px;';

        if (tipo === 'clientes') {
            return `
                <div style="flex:2 1 260px;">
                    <label style="${lblSt}">Pesquisar</label>
                    <input type="text" data-filtro="q" value="${esc(f.q)}" oninput="window._comercialRelatorios.onInputFiltro('${tipo}', 'q', this.value)"
                        placeholder="Digite código, razão social, fantasia, CNPJ/CPF, e-mail..." style="width:100%; ${inpSt}">
                </div>
                <div style="flex:1 1 160px;">
                    <label style="${lblSt}">Grupo de Clientes</label>
                    <select onchange="window._comercialRelatorios.onInputFiltro('${tipo}', 'grupo', this.value)" style="width:100%; ${inpSt}">
                        <option value="">Todos</option>
                        ${['Diamante', 'Ouro', 'Prata', 'Bronze'].map(g => `<option value="${g}" ${f.grupo === g ? 'selected' : ''}>${g}</option>`).join('')}
                        <option value="__sem__" ${f.grupo === '__sem__' ? 'selected' : ''}>Sem Grupo</option>
                    </select>
                </div>
                <div style="flex:1 1 180px;">
                    <label style="${lblSt}">Município / UF</label>
                    <input type="text" data-filtro="cidade" value="${esc(f.cidade)}" oninput="window._comercialRelatorios.onInputFiltro('${tipo}', 'cidade', this.value)"
                        placeholder="Filtrar cidade ou UF..." style="width:100%; ${inpSt}">
                </div>
            `;
        }

        if (tipo === 'enderecos') {
            return `
                <div style="flex:2 1 280px;">
                    <label style="${lblSt}">Pesquisar</label>
                    <input type="text" data-filtro="q" value="${esc(f.q)}" oninput="window._comercialRelatorios.onInputFiltro('${tipo}', 'q', this.value)"
                        placeholder="Digite endereço, local, bairro, CEP..." style="width:100%; ${inpSt}">
                </div>
                <div style="flex:1.4 1 200px;">
                    <label style="${lblSt}">Cliente</label>
                    <input type="text" data-filtro="cliente" value="${esc(f.cliente)}" oninput="window._comercialRelatorios.onInputFiltro('${tipo}', 'cliente', this.value)"
                        placeholder="Filtrar por cliente..." style="width:100%; ${inpSt}">
                </div>
                <div style="flex:1 1 180px;">
                    <label style="${lblSt}">Município / UF</label>
                    <input type="text" data-filtro="municipioUf" value="${esc(f.municipioUf)}" oninput="window._comercialRelatorios.onInputFiltro('${tipo}', 'municipioUf', this.value)"
                        placeholder="Filtrar cidade ou UF..." style="width:100%; ${inpSt}">
                </div>
            `;
        }

        if (tipo === 'propostas') {
            const tiposOpts = Array.from(new Set(st.dados.map(d => String(d.tipo || '').trim()).filter(Boolean))).sort();
            const fasesOpts = Array.from(new Set(st.dados.map(d => String(d.fase_negociacao || 'Em Elaboração').trim()).filter(Boolean))).sort();
            return `
                <div style="flex:2 1 230px;">
                    <label style="${lblSt}">Pesquisar</label>
                    <input type="text" data-filtro="q" value="${esc(f.q)}" oninput="window._comercialRelatorios.onInputFiltro('${tipo}', 'q', this.value)"
                        placeholder="Nº proposta, cliente, contato, evento..." style="width:100%; ${inpSt}">
                </div>
                <div style="flex:1 1 140px;">
                    <label style="${lblSt}">Tipo</label>
                    <select onchange="window._comercialRelatorios.onInputFiltro('${tipo}', 'tipo', this.value)" style="width:100%; ${inpSt}">
                        <option value="">Todos</option>
                        ${tiposOpts.map(t => `<option value="${esc(t)}" ${f.tipo === t ? 'selected' : ''}>${esc(t)}</option>`).join('')}
                    </select>
                </div>
                <div style="flex:1 1 160px;">
                    <label style="${lblSt}">Fase de Negociação</label>
                    <select onchange="window._comercialRelatorios.onInputFiltro('${tipo}', 'fase', this.value)" style="width:100%; ${inpSt}">
                        <option value="">Todas</option>
                        ${fasesOpts.map(fs => `<option value="${esc(fs)}" ${f.fase === fs ? 'selected' : ''}>${esc(fs)}</option>`).join('')}
                    </select>
                </div>
                <div style="flex:1 1 150px;">
                    <label style="${lblSt}">Atendente</label>
                    <input type="text" data-filtro="atendente" value="${esc(f.atendente)}" oninput="window._comercialRelatorios.onInputFiltro('${tipo}', 'atendente', this.value)"
                        placeholder="Filtrar atendente..." style="width:100%; ${inpSt}">
                </div>
                <div style="flex:0.7 1 125px;">
                    <label style="${lblSt}">Cadastro De</label>
                    <input type="date" value="${esc(f.de)}" onchange="window._comercialRelatorios.onInputFiltro('${tipo}', 'de', this.value)" style="width:100%; ${inpSt}">
                </div>
                <div style="flex:0.7 1 125px;">
                    <label style="${lblSt}">Até</label>
                    <input type="date" value="${esc(f.ate)}" onchange="window._comercialRelatorios.onInputFiltro('${tipo}', 'ate', this.value)" style="width:100%; ${inpSt}">
                </div>
            `;
        }

        if (tipo === 'contratos') {
            const tiposOpts = Array.from(new Set(st.dados.map(d => String(d.tipo || '').trim()).filter(Boolean))).sort();
            const sitsOpts = Array.from(new Set(st.dados.map(d => String(d.situacao_contrato || 'EM ELABORAÇÃO').trim()).filter(Boolean))).sort();
            return `
                <div style="flex:2 1 230px;">
                    <label style="${lblSt}">Pesquisar</label>
                    <input type="text" data-filtro="q" value="${esc(f.q)}" oninput="window._comercialRelatorios.onInputFiltro('${tipo}', 'q', this.value)"
                        placeholder="Nº contrato, título, cliente, evento..." style="width:100%; ${inpSt}">
                </div>
                <div style="flex:1 1 140px;">
                    <label style="${lblSt}">Tipo</label>
                    <select onchange="window._comercialRelatorios.onInputFiltro('${tipo}', 'tipo', this.value)" style="width:100%; ${inpSt}">
                        <option value="">Todos</option>
                        ${tiposOpts.map(t => `<option value="${esc(t)}" ${f.tipo === t ? 'selected' : ''}>${esc(t)}</option>`).join('')}
                    </select>
                </div>
                <div style="flex:1 1 180px;">
                    <label style="${lblSt}">Situação do Contrato</label>
                    <select onchange="window._comercialRelatorios.onInputFiltro('${tipo}', 'situacao', this.value)" style="width:100%; ${inpSt}">
                        <option value="">Todas</option>
                        ${sitsOpts.map(s => `<option value="${esc(s)}" ${f.situacao === s ? 'selected' : ''}>${esc(s)}</option>`).join('')}
                    </select>
                </div>
                <div style="flex:1 1 140px;">
                    <label style="${lblSt}">Atendente</label>
                    <input type="text" data-filtro="atendente" value="${esc(f.atendente)}" oninput="window._comercialRelatorios.onInputFiltro('${tipo}', 'atendente', this.value)"
                        placeholder="Filtrar atendente..." style="width:100%; ${inpSt}">
                </div>
                <div style="flex:0.7 1 125px;">
                    <label style="${lblSt}">Emissão De</label>
                    <input type="date" value="${esc(f.de)}" onchange="window._comercialRelatorios.onInputFiltro('${tipo}', 'de', this.value)" style="width:100%; ${inpSt}">
                </div>
                <div style="flex:0.7 1 125px;">
                    <label style="${lblSt}">Até</label>
                    <input type="date" value="${esc(f.ate)}" onchange="window._comercialRelatorios.onInputFiltro('${tipo}', 'ate', this.value)" style="width:100%; ${inpSt}">
                </div>
            `;
        }

        const statusOpts = Array.from(new Set(st.dados.map(d => String(d.status_os || 'EM ELABORAÇÃO').trim()).filter(Boolean))).sort();
        const tiposOsOpts = ['Envio', 'Visita técnica', 'Limpa fossa', 'Compras', 'Equipamentos'];
        return `
            <div style="flex:2 1 220px;">
                <label style="${lblSt}">Pesquisar</label>
                <input type="text" data-filtro="q" value="${esc(f.q)}" oninput="window._comercialRelatorios.onInputFiltro('${tipo}', 'q', this.value)"
                    placeholder="Nº OS, contrato, cliente, endereço..." style="width:100%; ${inpSt}">
            </div>
            <div style="flex:0.8 1 115px;">
                <label style="${lblSt}">Modalidade</label>
                <select onchange="window._comercialRelatorios.onInputFiltro('${tipo}', 'modalidade', this.value)" style="width:100%; ${inpSt}">
                    <option value="">Todas</option>
                    <option value="Obra" ${f.modalidade === 'Obra' ? 'selected' : ''}>Obra</option>
                    <option value="Evento" ${f.modalidade === 'Evento' ? 'selected' : ''}>Evento</option>
                </select>
            </div>
            <div style="flex:1 1 140px;">
                <label style="${lblSt}">Tipo de OS</label>
                <select onchange="window._comercialRelatorios.onInputFiltro('${tipo}', 'tipoOs', this.value)" style="width:100%; ${inpSt}">
                    <option value="">Todos</option>
                    ${tiposOsOpts.map(t => `<option value="${esc(t)}" ${f.tipoOs === t ? 'selected' : ''}>${esc(t)}</option>`).join('')}
                </select>
            </div>
            <div style="flex:1 1 170px;">
                <label style="${lblSt}">Status da OS</label>
                <select onchange="window._comercialRelatorios.onInputFiltro('${tipo}', 'statusOs', this.value)" style="width:100%; ${inpSt}">
                    <option value="">Todos</option>
                    ${statusOpts.map(s => `<option value="${esc(s)}" ${f.statusOs === s ? 'selected' : ''}>${esc(s)}</option>`).join('')}
                </select>
            </div>
            <div style="flex:1 1 130px;">
                <label style="${lblSt}">Atendente</label>
                <input type="text" data-filtro="atendente" value="${esc(f.atendente)}" oninput="window._comercialRelatorios.onInputFiltro('${tipo}', 'atendente', this.value)"
                    placeholder="Atendente..." style="width:100%; ${inpSt}">
            </div>
            <div style="flex:0.7 1 120px;">
                <label style="${lblSt}">Cadastro De</label>
                <input type="date" value="${esc(f.de)}" onchange="window._comercialRelatorios.onInputFiltro('${tipo}', 'de', this.value)" style="width:100%; ${inpSt}">
            </div>
            <div style="flex:0.7 1 120px;">
                <label style="${lblSt}">Até</label>
                <input type="date" value="${esc(f.ate)}" onchange="window._comercialRelatorios.onInputFiltro('${tipo}', 'ate', this.value)" style="width:100%; ${inpSt}">
            </div>
        `;
    }

    function renderCorpoTabela(tipo) {
        const meta = REPORTS_META[tipo];
        const st = stateByTipo[tipo];
        const filtrados = obterFiltrados(tipo);
        const cfg = montarConfiguracaoTabelaEExcel(tipo, filtrados);

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

        const tbodyEl = document.getElementById(`comrel-${tipo}-tbody`);
        if (tbodyEl) {
            if (st.carregando) {
                tbodyEl.innerHTML = `<tr><td colspan="${cfg.colunas.length}" style="text-align:center; padding:2.5rem; color:#64748b;"><i class="ph ph-spinner ph-spin" style="font-size:1.3rem;"></i> Carregando ${esc(meta.titulo)}...</td></tr>`;
            } else if (st.erro) {
                tbodyEl.innerHTML = `<tr><td colspan="${cfg.colunas.length}" style="text-align:center; padding:2rem; color:#dc2626; font-weight:700;">${esc(st.erro)}</td></tr>`;
            } else {
                tbodyEl.innerHTML = renderLinhasHtml(tipo, filtrados);
            }
        }
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

                <!-- Tabela -->
                <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:12px; overflow:hidden; box-shadow:0 2px 8px rgba(15,23,42,0.03);">
                    <div style="max-height:66vh; overflow:auto;">
                        <table style="width:100%; border-collapse:collapse; font-size:0.81rem; text-align:left;">
                            <thead id="comrel-${tipo}-thead"></thead>
                            <tbody id="comrel-${tipo}-tbody"></tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
        renderCorpoTabela(tipo);
    }

    window._comercialRelatorios = {
        onInputFiltro(tipo, campo, valor) {
            const st = stateByTipo[tipo];
            if (!st) return;
            st.filtros[campo] = valor;
            renderCorpoTabela(tipo);
        },

        limparFiltros(tipo) {
            const st = stateByTipo[tipo];
            if (!st) return;
            Object.keys(st.filtros).forEach(k => { st.filtros[k] = ''; });
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

    window.renderRelatorioComercial = async function (tipo) {
        const st = stateByTipo[tipo];
        if (!st) return;
        st.carregando = true;
        renderShellRelatorio(tipo);
        await fetchDadosRelatorio(tipo);
        renderShellRelatorio(tipo);
    };
})();
