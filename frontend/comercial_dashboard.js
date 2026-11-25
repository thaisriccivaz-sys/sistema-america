/**
 * ============================================================================
 * PAINEL COMERCIAL DE DESEMPENHO (DASHBOARD COMERCIAL — AMÉRICA RENTAL)
 * ============================================================================
 * Módulos / Abas:
 *   1. Visão Geral (Indicadores principais, 5 gráficos essenciais + prioridades diretoria)
 *   2. Vendedores (Ranking por volume, ranking por conversão, tabela completa de eficiência)
 *   3. Produtos (STD, LX, ELX, PCD, Hidráulica, Pia, Mictório, Chuveiro e demais equipamentos)
 *   4. Tipos de Contrato (Obras, Eventos, Recorrentes, Pontuais, Longo e Curto Prazo)
 *   5. Perdas Comerciais (Motivos padronizados, valor perdido por motivo, sem retorno, lista)
 *   6. Comparativos (Mês atual x anterior, Ano atual x anterior, Obras x Eventos, evolução)
 *
 * Regras de Cálculo:
 *   - Taxa de conversão = Contratos fechados ÷ Propostas enviadas
 *   - Taxa de perda = Propostas perdidas ÷ Propostas enviadas
 *   - Ticket médio = Valor contratado ÷ Contratos fechados
 *   - Aproveitamento financeiro = Valor contratado ÷ Valor proposto
 *   - Tempo de fechamento = Data de fechamento − Data de envio
 *   - Dois modos de coorte:
 *       1) Conversão por Safra de Propostas (acompanha propostas enviadas no período)
 *       2) Conversão por Período de Fechamento (contratos fechados no mês ÷ propostas do mês)
 * ============================================================================
 */
(function () {
    'use strict';

    const STATE = {
        initialized: false,
        loading: false,
        abaAtiva: 'visao_geral', // visao_geral | vendedores | produtos | tipos_contrato | perdas | comparativos
        modoConversao: 'safra', // 'safra' (Safra de Propostas) | 'fechamento' (Período de Fechamento)
        periodoPreset: 'ano', // dia | semana | mes | trimestre | ano | todos | custom
        dataInicio: '',
        dataFim: '',
        vendedoresSelecionados: [], // array de nomes normalizados (vazio = todos)
        produtosSelecionados: [],   // array de categorias/nomes (vazio = todos)
        tipoContratoFiltro: 'TODOS', // TODOS | OBRAS | EVENTOS | RECORRENTES | PONTUAIS | LONGO_PRAZO | CURTO_PRAZO | LIMPA_FOSSA | EQUIPAMENTOS
        statusFiltro: 'TODOS',       // TODOS | ENVIADAS | FECHADOS | EM_NEGOCIACAO | PERDIDAS
        perfilClienteFiltro: 'TODOS', // TODOS | NOVO | RECORRENTE
        regiaoCidadeFiltro: '',
        propostasRaw: [],
        clientesRaw: [],
        equipamentosRaw: [],
        atendentesRaw: [],
        charts: {}
    };

    const CATEGORIAS_PRODUTOS_PADRAO = [
        { key: 'STD', label: 'Cabine Standard (STD)', short: 'STD' },
        { key: 'LX', label: 'Cabine Luxury (LX)', short: 'LX' },
        { key: 'ELX', label: 'Cabine Extra Luxury (ELX)', short: 'ELX' },
        { key: 'PCD', label: 'Cabine PCD', short: 'PCD' },
        { key: 'HIDRAULICA', label: 'Cabine Hidráulica', short: 'Hidráulica' },
        { key: 'PIA', label: 'Pia portátil', short: 'Pia portátil' },
        { key: 'MICTORIO', label: 'Torre de mictório', short: 'Torre mictório' },
        { key: 'CHUVEIRO', label: 'Chuveiro portátil', short: 'Chuveiro' }
    ];

    const MOTIVOS_PERDA_PADRONIZADOS = [
        'Preço elevado',
        'Cliente fechou com concorrente',
        'Projeto cancelado',
        'Cliente não respondeu',
        'Prazo de entrega incompatível',
        'Falta de disponibilidade de equipamento',
        'Proposta em negociação',
        'Outros'
    ];

    function normText(s) {
        return String(s || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .trim();
    }

    function escHtml(s) {
        return String(s ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function fmtMoeda(v) {
        const n = Number(v) || 0;
        return 'R$ ' + n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function fmtMoedaCurta(v) {
        const n = Number(v) || 0;
        if (Math.abs(n) >= 1000000) {
            return 'R$ ' + (n / 1000000).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 }) + ' mi';
        }
        if (Math.abs(n) >= 1000) {
            return 'R$ ' + (n / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' mil';
        }
        return fmtMoeda(n);
    }

    function fmtPct(v, casas = 1) {
        const n = Number(v) || 0;
        return n.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas }) + '%';
    }

    function parseDataIso(raw) {
        if (!raw) return null;
        const s = String(raw).trim();
        if (!s) return null;
        const mIso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (mIso) {
            const d = new Date(Number(mIso[1]), Number(mIso[2]) - 1, Number(mIso[3]), 12, 0, 0);
            return isNaN(d.getTime()) ? null : d;
        }
        const mBr = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
        if (mBr) {
            const d = new Date(Number(mBr[3]), Number(mBr[2]) - 1, Number(mBr[1]), 12, 0, 0);
            return isNaN(d.getTime()) ? null : d;
        }
        const d = new Date(s);
        return isNaN(d.getTime()) ? null : d;
    }

    function toIsoDateStr(d) {
        if (!d || isNaN(d.getTime())) return '';
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    }

    function getMesAnoKey(d) {
        if (!d || isNaN(d.getTime())) return '';
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    }

    function formatMesAnoLabel(ym) {
        if (!ym || !ym.includes('-')) return ym || '—';
        const [y, m] = ym.split('-');
        const nomes = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        const idx = (parseInt(m, 10) || 1) - 1;
        return `${nomes[idx] || m}/${String(y).slice(-2)}`;
    }

    function calcularRangePreset(preset) {
        const hoje = new Date();
        const fim = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 23, 59, 59);
        let inicio = new Date(hoje.getFullYear(), 0, 1, 0, 0, 0);

        if (preset === 'dia') {
            inicio = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 0, 0, 0);
        } else if (preset === 'semana') {
            inicio = new Date(fim.getTime() - 6 * 86400000);
            inicio.setHours(0, 0, 0, 0);
        } else if (preset === 'mes') {
            inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1, 0, 0, 0);
        } else if (preset === 'trimestre') {
            inicio = new Date(hoje.getFullYear(), hoje.getMonth() - 2, 1, 0, 0, 0);
        } else if (preset === 'ano') {
            inicio = new Date(hoje.getFullYear(), 0, 1, 0, 0, 0);
        } else if (preset === 'todos') {
            return { inicio: '', fim: '' };
        }
        return { inicio: toIsoDateStr(inicio), fim: toIsoDateStr(fim) };
    }

    function classificarCategoriaProduto(nomeProdutoRaw) {
        const n = normText(nomeProdutoRaw);
        if (!n) return { key: 'OUTROS', label: 'Outros Equipamentos', short: 'Outros' };

        if (n.includes('extra lux') || /\belx\b/.test(n)) {
            return { key: 'ELX', label: 'Cabine Extra Luxury (ELX)', short: 'ELX' };
        }
        if (n.includes('luxo') || n.includes('luxury') || /\blx\b/.test(n)) {
            return { key: 'LX', label: 'Cabine Luxury (LX)', short: 'LX' };
        }
        if (n.includes('pcd') || n.includes('pne') || n.includes('deficiente') || n.includes('acessivel')) {
            return { key: 'PCD', label: 'Cabine PCD', short: 'PCD' };
        }
        if (n.includes('hidraulic')) {
            return { key: 'HIDRAULICA', label: 'Cabine Hidráulica', short: 'Hidráulica' };
        }
        if (n.includes('standard') || n.includes('standart') || /\bstd\b/.test(n) || (n.includes('banheiro') && !n.includes('chuveiro'))) {
            return { key: 'STD', label: 'Cabine Standard (STD)', short: 'STD' };
        }
        if (n.includes('pia') || n.includes('lavatorio')) {
            return { key: 'PIA', label: 'Pia portátil', short: 'Pia portátil' };
        }
        if (n.includes('mictorio') || n.includes('kros')) {
            return { key: 'MICTORIO', label: 'Torre de mictório', short: 'Torre mictório' };
        }
        if (n.includes('chuveiro')) {
            return { key: 'CHUVEIRO', label: 'Chuveiro portátil', short: 'Chuveiro' };
        }
        if (n.includes('guarita')) {
            return { key: 'GUARITA', label: 'Guarita portátil', short: 'Guarita' };
        }
        if (n.includes('container') || n.includes('conteiner')) {
            return { key: 'CONTAINER', label: 'Container', short: 'Container' };
        }
        if (n.includes('fossa') || n.includes('succao') || n.includes('caminhao')) {
            return { key: 'LIMPA_FOSSA', label: 'Limpa Fossa / Sucção', short: 'Limpa Fossa' };
        }
        const limpo = String(nomeProdutoRaw || '').replace(/^\d+\s*-\s*/, '').trim();
        return { key: 'OUT_' + normText(limpo).slice(0, 20).toUpperCase(), label: limpo || 'Outros Equipamentos', short: limpo.slice(0, 18) || 'Outros' };
    }

    function padronizarMotivoPerda(prop) {
        const raw = normText(prop.motivo_reprovacao || '');
        const obs = normText(prop.observacoes || '');
        const fase = normText(prop.fase_negociacao || '');

        if (prop._classificacaoStatus === 'EM_NEGOCIACAO') {
            if (prop._semRetornoExpirada) return 'Cliente não respondeu';
            return 'Proposta em negociação';
        }
        if (raw.includes('preco') || raw.includes('orcamento') || raw.includes('valor') || obs.includes('preco caro')) {
            return 'Preço elevado';
        }
        if (raw.includes('concorr')) {
            return 'Cliente fechou com concorrente';
        }
        if (raw.includes('prazo')) {
            return 'Prazo de entrega incompatível';
        }
        if (raw.includes('disponibil') || raw.includes('estoque') || raw.includes('especificac') || raw.includes('equipamento')) {
            return 'Falta de disponibilidade de equipamento';
        }
        if (raw.includes('nao respond') || raw.includes('sem retorno') || raw.includes('contato')) {
            return 'Cliente não respondeu';
        }
        if (raw.includes('cancel') || fase === 'cancelada' || raw.includes('projeto')) {
            return 'Projeto cancelado';
        }
        if (prop._semRetornoExpirada) {
            return 'Cliente não respondeu';
        }
        return 'Outros';
    }

    function extrairCidadeRegiao(enderecoRaw, clienteObj) {
        if (clienteObj && (clienteObj.municipio || clienteObj.uf)) {
            const mun = String(clienteObj.municipio || '').trim();
            const uf = String(clienteObj.uf || '').trim();
            if (mun) return uf ? `${mun}/${uf}` : mun;
        }
        const end = String(enderecoRaw || '').trim();
        if (!end) return 'Não informada';
        const mBarra = end.match(/([A-Za-zÀ-ÿ\s]{3,30})\s*[\/\-]\s*([A-Z]{2})\b/);
        if (mBarra) return `${mBarra[1].trim()}/${mBarra[2].trim()}`;
        const partes = end.split(',').map(p => p.trim()).filter(Boolean);
        if (partes.length >= 2) return partes[partes.length - 1].slice(0, 35);
        return end.slice(0, 30);
    }

    function processarPropostasBase() {
        const mapClientes = new Map();
        (STATE.clientesRaw || []).forEach(c => {
            const k1 = normText(c.nome_razao_social);
            const k2 = normText(c.nome_fantasia);
            if (k1) mapClientes.set(k1, c);
            if (k2) mapClientes.set(k2, c);
        });

        // Contagem de propostas/contratos anteriores por cliente para definir Cliente Novo vs Recorrente
        const primeiraDataPorCliente = new Map();
        const totalContratosPorCliente = new Map();

        const listaValida = (STATE.propostasRaw || []).filter(p => {
            const tipoUp = String(p.tipo || '').trim().toUpperCase().replace(/^PROPOSTA\s+/i, '');
            // Ignora aditivos isolados na contagem de novas propostas comerciais se não tiver valor próprio ou mantém identificado
            return tipoUp !== 'ADITIVO';
        });

        listaValida.forEach(p => {
            const nomeLimpo = typeof window.limparPrefixoGrupoCliente === 'function'
                ? window.limparPrefixoGrupoCliente(p.cliente_nome || '')
                : String(p.cliente_nome || '').replace(/^[💎🥇🥈🥉]\s*/, '').trim();
            const kCli = normText(nomeLimpo);
            const dtEnvio = parseDataIso(p.data_cadastro || p.criado_em);
            if (kCli && dtEnvio) {
                const ant = primeiraDataPorCliente.get(kCli);
                if (!ant || dtEnvio < ant) primeiraDataPorCliente.set(kCli, dtEnvio);
            }
            const faseNorm = normText(p.fase_negociacao || '');
            const sitCtrNorm = normText(p.situacao_contrato || '');
            const estornado = sitCtrNorm.includes('estornado') || sitCtrNorm.includes('reprovad') || sitCtrNorm.includes('cancelad');
            const fechado = !estornado && (faseNorm === 'aprovada' || Boolean(p.contrato && String(p.contrato).trim()));
            if (kCli && fechado) {
                totalContratosPorCliente.set(kCli, (totalContratosPorCliente.get(kCli) || 0) + 1);
            }
        });

        const hoje = new Date();

        return listaValida.map(p => {
            const nomeLimpo = typeof window.limparPrefixoGrupoCliente === 'function'
                ? window.limparPrefixoGrupoCliente(p.cliente_nome || '')
                : String(p.cliente_nome || '').replace(/^[💎🥇🥈🥉]\s*/, '').trim();
            const kCli = normText(nomeLimpo);
            const cliObj = mapClientes.get(kCli) || null;

            const vendedor = String(p.atendente_nome || p.atendente || p.representante || p.criado_por || 'Não informado').trim() || 'Não informado';
            const dtEnvio = parseDataIso(p.data_cadastro || p.criado_em) || parseDataIso(p.criado_em) || hoje;
            const dtFechamento = parseDataIso(p.aprovado_em || p.assinafy_signed_at || p.aceite_publico_em || p.atualizado_em || p.criado_em) || dtEnvio;

            const faseNorm = normText(p.fase_negociacao || '');
            const sitCtrNorm = normText(p.situacao_contrato || '');
            const estornado = sitCtrNorm.includes('estornado');
            const isFechado = !estornado && (faseNorm === 'aprovada' || Boolean(p.contrato && String(p.contrato).trim()));
            const isPerdidaExplicita = !isFechado && (
                faseNorm === 'reprovada' ||
                faseNorm === 'cancelada' ||
                estornado ||
                normText(p.status) === 'cancelada' ||
                normText(p.status) === 'inativa'
            );

            const dtValidade = parseDataIso(p.validade_proposta);
            const diasDesdeEnvio = Math.max(0, Math.round((hoje.getTime() - dtEnvio.getTime()) / 86400000));
            const semRetornoExpirada = !isFechado && !isPerdidaExplicita && (
                (dtValidade && dtValidade.getTime() < hoje.getTime() - 7 * 86400000) ||
                diasDesdeEnvio > 30
            );

            let classificacaoStatus = 'EM_NEGOCIACAO';
            if (isFechado) classificacaoStatus = 'FECHADO';
            else if (isPerdidaExplicita || semRetornoExpirada) classificacaoStatus = 'PERDIDA';

            // Tempo de fechamento em dias (Data de fechamento - Data de envio)
            let diasParaFechar = null;
            if (isFechado && dtEnvio && dtFechamento) {
                const diff = (dtFechamento.getTime() - dtEnvio.getTime()) / 86400000;
                diasParaFechar = Math.max(0, Math.min(180, Math.round(diff)));
            }

            // Tipo e finalidade comercial
            const tipoBruto = String(p.tipo || p.tabela_precos || 'EVENTO').trim().toUpperCase().replace(/^PROPOSTA\s+/i, '');
            const isObra = tipoBruto.includes('OBRA');
            const isEvento = tipoBruto.includes('EVENTO');
            const isLimpaFossa = tipoBruto.includes('FOSSA');
            const isEquipamento = tipoBruto.includes('EQUIPAMENTO') || tipoBruto.includes('CONTAINER');

            // Cálculo de dias de locação para Curto vs Longo Prazo e Recorrente vs Pontual
            let diasLocacao = parseInt(p.dias_contrato, 10) || 0;
            if (!diasLocacao) {
                const dIni = parseDataIso(p.periodo_inicio);
                const dFim = parseDataIso(p.periodo_fim);
                if (dIni && dFim && dFim >= dIni) {
                    diasLocacao = Math.max(1, Math.round((dFim.getTime() - dIni.getTime()) / 86400000) + 1);
                } else {
                    diasLocacao = isObra ? 30 : 3;
                }
            }
            const isRecorrenteContrato = isObra || tipoBruto.includes('MENSAL') || tipoBruto.includes('QUINZENAL') || tipoBruto.includes('SEMANAL') || diasLocacao >= 28;
            const isLongoPrazo = diasLocacao >= 28 || isObra;

            let finalidadePrincipal = 'Eventos';
            if (isObra) finalidadePrincipal = 'Obras';
            else if (isLimpaFossa) finalidadePrincipal = 'Limpa Fossa';
            else if (isEquipamento) finalidadePrincipal = 'Equipamentos';

            //Cliente Novo vs Cliente Recorrente
            const dtPrim = primeiraDataPorCliente.get(kCli);
            const qtdCtrCli = totalContratosPorCliente.get(kCli) || 0;
            const isClienteRecorrente = qtdCtrCli > 1 || (dtPrim && dtEnvio && (dtEnvio.getTime() - dtPrim.getTime()) > 15 * 86400000);
            const perfilCliente = isClienteRecorrente ? 'RECORRENTE' : 'NOVO';

            // Produtos / Itens da proposta
            let itensArr = [];
            try {
                itensArr = typeof p.itens === 'string' ? JSON.parse(p.itens || '[]') : (Array.isArray(p.itens) ? p.itens : []);
            } catch (_) { itensArr = []; }
            itensArr = (Array.isArray(itensArr) ? itensArr : []).filter(it => it && !it._substituido_por_aditivo);

            const ehEvLike = ['EVENTO', 'EQUIPAMENTOS', 'EQUIPAMENTO', 'LOCACAO CONTAINER'].includes(tipoBruto);
            const valorTotalProposta = Math.max(0, parseFloat(p.valor_total) || 0);

            const itensProcessados = [];
            let somaBrutaItens = 0;
            itensArr.forEach(it => {
                const nomeProd = String(it.produto || it.descricao || it.nome || '').trim();
                if (!nomeProd) return;
                const cat = classificarCategoriaProduto(nomeProd);
                const qtd = Math.max(1, parseInt(it.quantidade ?? it.qtde ?? 1, 10) || 1);
                const vUnit = Math.max(0, parseFloat(it.valor ?? it.valor_unitario ?? 0) || 0);
                const sub = (it.valor_total !== undefined && !isNaN(parseFloat(it.valor_total)))
                    ? Math.max(0, parseFloat(it.valor_total))
                    : (qtd * vUnit);
                const diasArr = Array.isArray(it.dias_evento) ? it.dias_evento.filter(Boolean) : [];
                const nDiarias = ehEvLike ? (diasArr.length > 0 ? diasArr.length : Math.max(1, diasLocacao || 1)) : 1;
                const valItem = ehEvLike ? (sub * nDiarias) : sub;
                somaBrutaItens += valItem;
                itensProcessados.push({
                    codigo: it.codigo || '',
                    nomeOriginal: nomeProd,
                    categoriaKey: cat.key,
                    categoriaLabel: cat.label,
                    categoriaShort: cat.short,
                    quantidade: qtd,
                    valorBruto: valItem
                });
            });

            // Ratear proporcionalmente o valor_total da proposta entre os produtos (ou atribuir se houver 1 item)
            if (itensProcessados.length > 0) {
                itensProcessados.forEach(it => {
                    it.valorRateado = somaBrutaItens > 0
                        ? (valorTotalProposta * (it.valorBruto / somaBrutaItens))
                        : (valorTotalProposta / itensProcessados.length);
                });
            }

            const cidadeRegiao = extrairCidadeRegiao(p.endereco_instalacao || p.regiao || p.local, cliObj);

            const enriched = {
                id: p.id,
                codigo: p.codigo || String(p.id),
                contrato: p.contrato || '',
                cliente_nome: nomeLimpo || 'Cliente não informado',
                vendedor,
                vendedorNorm: normText(vendedor),
                tipoBruto,
                finalidadePrincipal, // Obras | Eventos | Limpa Fossa | Equipamentos
                isObra,
                isEvento,
                isLimpaFossa,
                isEquipamento,
                isRecorrenteContrato,
                isPontualContrato: !isRecorrenteContrato,
                isLongoPrazo,
                isCurtoPrazo: !isLongoPrazo,
                diasLocacao,
                dtEnvio,
                dtFechamento,
                mesEnvio: getMesAnoKey(dtEnvio),
                mesFechamento: getMesAnoKey(dtFechamento),
                anoEnvio: dtEnvio.getFullYear(),
                anoFechamento: dtFechamento.getFullYear(),
                valorTotal: valorTotalProposta,
                fase_negociacao: p.fase_negociacao || 'Em Elaboração',
                situacao_contrato: p.situacao_contrato || '',
                motivo_reprovacao: p.motivo_reprovacao || '',
                observacoes: p.observacoes || '',
                _classificacaoStatus: classificacaoStatus, // FECHADO | PERDIDA | EM_NEGOCIACAO
                _isFechado: isFechado,
                _isPerdida: classificacaoStatus === 'PERDIDA',
                _isEmNegociacao: classificacaoStatus === 'EM_NEGOCIACAO',
                _semRetornoExpirada: semRetornoExpirada,
                diasParaFechar,
                perfilCliente, // NOVO | RECORRENTE
                cidadeRegiao,
                cidadeRegiaoNorm: normText(cidadeRegiao),
                itensProcessados
            };
            enriched.motivoPerdaPadronizado = padronizarMotivoPerda(enriched);
            return enriched;
        });
    }

    function filtrarPropostas(todas, opcoesExtra = {}) {
        const ignorarPeriodo = Boolean(opcoesExtra.ignorarPeriodo);
        const usarDataFechamento = Boolean(opcoesExtra.usarDataFechamento);

        const dtIni = (!ignorarPeriodo && STATE.dataInicio) ? parseDataIso(STATE.dataInicio) : null;
        if (dtIni) dtIni.setHours(0, 0, 0, 0);
        const dtFim = (!ignorarPeriodo && STATE.dataFim) ? parseDataIso(STATE.dataFim) : null;
        if (dtFim) dtFim.setHours(23, 59, 59, 999);

        const vendSet = new Set(STATE.vendedoresSelecionados);
        const prodSet = new Set(STATE.produtosSelecionados);
        const regFiltro = normText(STATE.regiaoCidadeFiltro);

        return todas.filter(p => {
            const dtRef = usarDataFechamento ? p.dtFechamento : p.dtEnvio;
            if (dtIni && dtRef < dtIni) return false;
            if (dtFim && dtRef > dtFim) return false;

            if (vendSet.size > 0 && !vendSet.has(p.vendedorNorm)) return false;

            if (prodSet.size > 0) {
                const temProd = p.itensProcessados.some(it => prodSet.has(it.categoriaKey) || prodSet.has(it.categoriaLabel));
                if (!temProd) return false;
            }

            if (STATE.tipoContratoFiltro !== 'TODOS') {
                const tf = STATE.tipoContratoFiltro;
                if (tf === 'OBRAS' && !p.isObra) return false;
                if (tf === 'EVENTOS' && !p.isEvento) return false;
                if (tf === 'RECORRENTES' && !p.isRecorrenteContrato) return false;
                if (tf === 'PONTUAIS' && !p.isPontualContrato) return false;
                if (tf === 'LONGO_PRAZO' && !p.isLongoPrazo) return false;
                if (tf === 'CURTO_PRAZO' && !p.isCurtoPrazo) return false;
                if (tf === 'LIMPA_FOSSA' && !p.isLimpaFossa) return false;
                if (tf === 'EQUIPAMENTOS' && !p.isEquipamento) return false;
            }

            if (STATE.statusFiltro !== 'TODOS') {
                if (STATE.statusFiltro === 'FECHADOS' && !p._isFechado) return false;
                if (STATE.statusFiltro === 'PERDIDAS' && !p._isPerdida) return false;
                if (STATE.statusFiltro === 'EM_NEGOCIACAO' && !p._isEmNegociacao) return false;
            }

            if (STATE.perfilClienteFiltro !== 'TODOS' && p.perfilCliente !== STATE.perfilClienteFiltro) {
                return false;
            }

            if (regFiltro && !p.cidadeRegiaoNorm.includes(regFiltro)) {
                return false;
            }

            return true;
        });
    }

    function calcularMetricasGerais(propostasPeriodoEnvio, propostasTodasSemPeriodo) {
        const totalPropostas = propostasPeriodoEnvio.length;
        const valorProposto = propostasPeriodoEnvio.reduce((acc, p) => acc + p.valorTotal, 0);

        let contratosFechadosList = [];
        if (STATE.modoConversao === 'fechamento') {
            // Conversão por período de fechamento: contratos fechados naquele período vs propostas enviadas naquele período
            const filtradasPorFechamento = filtrarPropostas(propostasTodasSemPeriodo, { usarDataFechamento: true });
            contratosFechadosList = filtradasPorFechamento.filter(p => p._isFechado);
        } else {
            // Conversão por safra de propostas: propostas enviadas no período que viraram contrato
            contratosFechadosList = propostasPeriodoEnvio.filter(p => p._isFechado);
        }

        const perdidasList = propostasPeriodoEnvio.filter(p => p._isPerdida);
        const emNegociacaoList = propostasPeriodoEnvio.filter(p => p._isEmNegociacao);

        const qtdFechados = contratosFechadosList.length;
        const qtdPerdidas = perdidasList.length;
        const qtdEmNegociacao = emNegociacaoList.length;

        const valorContratado = contratosFechadosList.reduce((acc, p) => acc + p.valorTotal, 0);
        const valorPerdido = perdidasList.reduce((acc, p) => acc + p.valorTotal, 0);
        const valorEmNegociacao = emNegociacaoList.reduce((acc, p) => acc + p.valorTotal, 0);

        const taxaConversao = totalPropostas > 0 ? (qtdFechados / totalPropostas) * 100 : 0;
        const taxaPerda = totalPropostas > 0 ? (qtdPerdidas / totalPropostas) * 100 : 0;
        const ticketMedio = qtdFechados > 0 ? (valorContratado / qtdFechados) : 0;
        const aproveitamentoFinanceiro = valorProposto > 0 ? (valorContratado / valorProposto) * 100 : 0;

        const tempos = contratosFechadosList
            .map(p => p.diasParaFechar)
            .filter(d => d !== null && !isNaN(d));
        const tempoMedioFechamento = tempos.length > 0
            ? (tempos.reduce((a, b) => a + b, 0) / tempos.length)
            : 0;

        return {
            totalPropostas,
            valorProposto,
            qtdFechados,
            qtdPerdidas,
            qtdEmNegociacao,
            valorContratado,
            valorPerdido,
            valorEmNegociacao,
            taxaConversao,
            taxaPerda,
            ticketMedio,
            aproveitamentoFinanceiro,
            tempoMedioFechamento,
            contratosFechadosList,
            perdidasList,
            emNegociacaoList
        };
    }

    function destroyAllCharts() {
        Object.keys(STATE.charts).forEach(k => {
            try {
                if (STATE.charts[k] && typeof STATE.charts[k].destroy === 'function') {
                    STATE.charts[k].destroy();
                }
            } catch (_) {}
        });
        STATE.charts = {};
    }

    function createChart(canvasId, config) {
        const el = document.getElementById(canvasId);
        if (!el || typeof Chart === 'undefined') return null;
        if (STATE.charts[canvasId]) {
            try { STATE.charts[canvasId].destroy(); } catch (_) {}
        }
        const ctx = el.getContext('2d');
        STATE.charts[canvasId] = new Chart(ctx, config);
        return STATE.charts[canvasId];
    }

    async function carregarDadosBackend() {
        STATE.loading = true;
        try {
            const token = localStorage.getItem('token') || sessionStorage.getItem('token') || '';
            const headers = token ? { 'Authorization': 'Bearer ' + token } : {};
            const fetchJson = async (url) => {
                const r = await fetch(url, { headers });
                if (!r.ok) return [];
                const d = await r.json();
                return Array.isArray(d) ? d : [];
            };

            const [propostas, clientes, equipamentos, atendentes] = await Promise.all([
                fetchJson('/api/propostas'),
                fetchJson('/api/clientes'),
                fetchJson('/api/estoque-equipamentos').catch(() => []),
                fetchJson('/api/comercial/atendentes').catch(() => [])
            ]);

            STATE.propostasRaw = propostas;
            STATE.clientesRaw = clientes;
            STATE.equipamentosRaw = equipamentos;
            STATE.atendentesRaw = atendentes;

            if (Array.isArray(clientes) && clientes.length > 0 && (!window._clientesCache || !window._clientesCache.length)) {
                window._clientesCache = clientes;
            }
        } catch (err) {
            console.error('[DASHBOARD COMERCIAL] Erro ao carregar dados:', err);
        } finally {
            STATE.loading = false;
        }
    }

    function obterSériesMensais(propostasFiltradas, todasSemFiltroPeriodo) {
        const mesesMap = new Map();
        const addMes = (ym) => {
            if (!ym) return;
            if (!mesesMap.has(ym)) {
                mesesMap.set(ym, {
                    ym,
                    label: formatMesAnoLabel(ym),
                    propostas: 0,
                    fechados: 0,
                    perdidas: 0,
                    emNegociacao: 0,
                    valorProposto: 0,
                    valorContratado: 0
                });
            }
        };

        // Garante pelo menos os últimos 6 meses visíveis se houver poucos meses no filtro
        const hoje = new Date();
        for (let i = 5; i >= 0; i--) {
            const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
            addMes(getMesAnoKey(d));
        }

        propostasFiltradas.forEach(p => {
            addMes(p.mesEnvio);
            const m = mesesMap.get(p.mesEnvio);
            if (!m) return;
            m.propostas++;
            m.valorProposto += p.valorTotal;
            if (p._isPerdida) m.perdidas++;
            if (p._isEmNegociacao) m.emNegociacao++;
            if (STATE.modoConversao === 'safra' && p._isFechado) {
                m.fechados++;
                m.valorContratado += p.valorTotal;
            }
        });

        if (STATE.modoConversao === 'fechamento') {
            const fechadasNoPeriodo = filtrarPropostas(todasSemFiltroPeriodo, { usarDataFechamento: true }).filter(p => p._isFechado);
            fechadasNoPeriodo.forEach(p => {
                addMes(p.mesFechamento);
                const m = mesesMap.get(p.mesFechamento);
                if (!m) return;
                m.fechados++;
                m.valorContratado += p.valorTotal;
            });
        }

        return Array.from(mesesMap.values())
            .sort((a, b) => a.ym.localeCompare(b.ym))
            .map(m => ({
                ...m,
                taxaConversao: m.propostas > 0 ? Number(((m.fechados / m.propostas) * 100).toFixed(1)) : 0,
                ticketMedio: m.fechados > 0 ? Number((m.valorContratado / m.fechados).toFixed(2)) : 0
            }));
    }

    function calcularDesempenhoVendedores(propostasFiltradas) {
        const mapV = new Map();
        propostasFiltradas.forEach(p => {
            const k = p.vendedorNorm || 'nao informado';
            if (!mapV.has(k)) {
                mapV.set(k, {
                    nome: p.vendedor,
                    norm: k,
                    propostas: 0,
                    fechados: 0,
                    perdidas: 0,
                    emNegociacao: 0,
                    valorProposto: 0,
                    valorFechado: 0,
                    somaDiasFechamento: 0,
                    qtdComTempo: 0,
                    porTipo: { Obras: 0, Eventos: 0, 'Limpa Fossa': 0, Equipamentos: 0 }
                });
            }
            const v = mapV.get(k);
            v.propostas++;
            v.valorProposto += p.valorTotal;
            if (p._isFechado) {
                v.fechados++;
                v.valorFechado += p.valorTotal;
                v.porTipo[p.finalidadePrincipal] = (v.porTipo[p.finalidadePrincipal] || 0) + p.valorTotal;
                if (p.diasParaFechar !== null) {
                    v.somaDiasFechamento += p.diasParaFechar;
                    v.qtdComTempo++;
                }
            } else if (p._isPerdida) {
                v.perdidas++;
            } else {
                v.emNegociacao++;
            }
        });

        return Array.from(mapV.values()).map(v => ({
            ...v,
            taxaConversao: v.propostas > 0 ? (v.fechados / v.propostas) * 100 : 0,
            aproveitamentoFinanceiro: v.valorProposto > 0 ? (v.valorFechado / v.valorProposto) * 100 : 0,
            ticketMedio: v.fechados > 0 ? (v.valorFechado / v.fechados) : 0,
            tempoMedioFechamento: v.qtdComTempo > 0 ? (v.somaDiasFechamento / v.qtdComTempo) : 0
        })).sort((a, b) => b.valorFechado - a.valorFechado || b.fechados - a.fechados);
    }

    function calcularDesempenhoProdutos(propostasFiltradas) {
        const mapP = new Map();
        // Inicializar com as 8 categorias padrão recomendadas para a América Rental
        CATEGORIAS_PRODUTOS_PADRAO.forEach(cat => {
            mapP.set(cat.key, {
                key: cat.key,
                label: cat.label,
                short: cat.short,
                propostasIds: new Set(),
                fechadosIds: new Set(),
                unidadesPropostas: 0,
                unidadesFechadas: 0,
                valorProposto: 0,
                faturamentoContratado: 0
            });
        });

        propostasFiltradas.forEach(p => {
            p.itensProcessados.forEach(it => {
                if (!mapP.has(it.categoriaKey)) {
                    mapP.set(it.categoriaKey, {
                        key: it.categoriaKey,
                        label: it.categoriaLabel,
                        short: it.categoriaShort,
                        propostasIds: new Set(),
                        fechadosIds: new Set(),
                        unidadesPropostas: 0,
                        unidadesFechadas: 0,
                        valorProposto: 0,
                        faturamentoContratado: 0
                    });
                }
                const entry = mapP.get(it.categoriaKey);
                entry.propostasIds.add(p.id);
                entry.unidadesPropostas += it.quantidade;
                entry.valorProposto += it.valorRateado;
                if (p._isFechado) {
                    entry.fechadosIds.add(p.id);
                    entry.unidadesFechadas += it.quantidade;
                    entry.faturamentoContratado += it.valorRateado;
                }
            });
        });

        const listaBruta = Array.from(mapP.values()).map(item => {
            const propostas = item.propostasIds.size;
            const fechados = item.fechadosIds.size;
            return {
                key: item.key,
                label: item.label,
                short: item.short,
                propostas,
                fechados,
                unidadesPropostas: item.unidadesPropostas,
                unidadesFechadas: item.unidadesFechadas,
                valorProposto: item.valorProposto,
                faturamentoContratado: item.faturamentoContratado,
                taxaConversao: propostas > 0 ? (fechados / propostas) * 100 : 0,
                ticketMedio: fechados > 0 ? (item.faturamentoContratado / fechados) : 0
            };
        });

        const faturamentoTotalProdutos = listaBruta.reduce((acc, x) => acc + x.faturamentoContratado, 0);
        return listaBruta.map(x => ({
            ...x,
            participacaoPct: faturamentoTotalProdutos > 0 ? (x.faturamentoContratado / faturamentoTotalProdutos) * 100 : 0
        })).sort((a, b) => b.faturamentoContratado - a.faturamentoContratado || b.propostas - a.propostas);
    }

    function calcularDesempenhoTiposContrato(propostasFiltradas) {
        const grupos = [
            { key: 'OBRAS', label: 'Obras', match: p => p.isObra },
            { key: 'EVENTOS', label: 'Eventos', match: p => p.isEvento },
            { key: 'RECORRENTES', label: 'Contratos Recorrentes', match: p => p.isRecorrenteContrato },
            { key: 'PONTUAIS', label: 'Contratos Pontuais', match: p => p.isPontualContrato },
            { key: 'LONGO_PRAZO', label: 'Locações de Longo Prazo (≥ 30d)', match: p => p.isLongoPrazo },
            { key: 'CURTO_PRAZO', label: 'Locações de Curto Prazo (< 30d)', match: p => p.isCurtoPrazo },
            { key: 'LIMPA_FOSSA', label: 'Limpa Fossa', match: p => p.isLimpaFossa },
            { key: 'EQUIPAMENTOS', label: 'Equipamentos / Containers', match: p => p.isEquipamento }
        ];

        return grupos.map(g => {
            const props = propostasFiltradas.filter(g.match);
            const fech = props.filter(p => p._isFechado);
            const valProp = props.reduce((a, p) => a + p.valorTotal, 0);
            const valFech = fech.reduce((a, p) => a + p.valorTotal, 0);
            return {
                key: g.key,
                label: g.label,
                propostas: props.length,
                fechados: fech.length,
                taxaConversao: props.length > 0 ? (fech.length / props.length) * 100 : 0,
                valorProposto: valProp,
                faturamento: valFech,
                ticketMedio: fech.length > 0 ? (valFech / fech.length) : 0
            };
        });
    }

    function calcularAnalisePerdas(propostasFiltradas) {
        const mapMotivos = new Map();
        MOTIVOS_PERDA_PADRONIZADOS.forEach(m => {
            mapMotivos.set(m, { motivo: m, quantidade: 0, valor: 0, propostas: [] });
        });

        // Consideramos perdas explícitas + sem retorno + propostas paradas em negociação
        const relevantes = propostasFiltradas.filter(p => !p._isFechado);
        relevantes.forEach(p => {
            const mot = p.motivoPerdaPadronizado || 'Outros';
            if (!mapMotivos.has(mot)) {
                mapMotivos.set(mot, { motivo: mot, quantidade: 0, valor: 0, propostas: [] });
            }
            const item = mapMotivos.get(mot);
            item.quantidade++;
            item.valor += p.valorTotal;
            item.propostas.push(p);
        });

        const porMotivo = Array.from(mapMotivos.values());
        const apenasPerdidas = porMotivo.filter(x => x.motivo !== 'Proposta em negociação');
        const totalPerdidasQtd = apenasPerdidas.reduce((a, x) => a + x.quantidade, 0);
        const totalPerdidasVal = apenasPerdidas.reduce((a, x) => a + x.valor, 0);

        return {
            porMotivo,
            apenasPerdidas,
            totalPerdidasQtd,
            totalPerdidasVal,
            semRetorno: mapMotivos.get('Cliente não respondeu') || { quantidade: 0, valor: 0, propostas: [] },
            porPreco: mapMotivos.get('Preço elevado') || { quantidade: 0, valor: 0, propostas: [] },
            paraConcorrente: mapMotivos.get('Cliente fechou com concorrente') || { quantidade: 0, valor: 0, propostas: [] },
            canceladasCliente: mapMotivos.get('Projeto cancelado') || { quantidade: 0, valor: 0, propostas: [] },
            listaDetalhada: relevantes.sort((a, b) => b.dtEnvio - a.dtEnvio)
        };
    }

    function renderEstruturaCompleta() {
        const container = document.getElementById('view-comercial-dashboard');
        if (!container) return;

        const todasProcessadas = processarPropostasBase();
        const filtradas = filtrarPropostas(todasProcessadas);
        const metricas = calcularMetricasGerais(filtradas, todasProcessadas);

        // Listas únicas para filtros multi-seleção digitáveis
        const vendedoresUnicos = Array.from(new Set([
            ...todasProcessadas.map(p => p.vendedor),
            ...(STATE.atendentesRaw || []).map(a => a.nome || a.username).filter(Boolean)
        ])).filter(Boolean).sort((a, b) => a.localeCompare(b, 'pt-BR'));

        const produtosDisponiveis = [
            ...CATEGORIAS_PRODUTOS_PADRAO.map(c => ({ key: c.key, label: c.label })),
            { key: 'GUARITA', label: 'Guarita portátil' },
            { key: 'CONTAINER', label: 'Container' },
            { key: 'LIMPA_FOSSA', label: 'Limpa Fossa / Sucção' }
        ];

        const labelVendedoresBtn = STATE.vendedoresSelecionados.length === 0
            ? 'Todos os vendedores'
            : `${STATE.vendedoresSelecionados.length} vendedor(es) selecionado(s)`;

        const labelProdutosBtn = STATE.produtosSelecionados.length === 0
            ? 'Todos os produtos'
            : `${STATE.produtosSelecionados.length} produto(s) selecionado(s)`;

        const abas = [
            { id: 'visao_geral', label: '1. Visão Geral', icon: 'ph-chart-bar', desc: 'Indicadores gerais, conversão e evolução' },
            { id: 'vendedores', label: '2. Vendedores', icon: 'ph-users-three', desc: 'Ranking, produtividade e conversão' },
            { id: 'produtos', label: '3. Produtos', icon: 'ph-cube', desc: 'Demanda, fechamentos e receita por equipamento' },
            { id: 'tipos_contrato', label: '4. Tipos de Contrato', icon: 'ph-files', desc: 'Obras, eventos, recorrentes e pontuais' },
            { id: 'perdas', label: '5. Perdas Comerciais', icon: 'ph-trend-down', desc: 'Motivos de perda e valores desperdiçados' },
            { id: 'comparativos', label: '6. Comparativos', icon: 'ph-arrows-left-right', desc: 'Mês a mês, ano a ano e evolução estratégica' }
        ];

        container.innerHTML = `
            <div style="padding:1rem 1.25rem 2.5rem; max-width:1600px; margin:0 auto; font-family:'Inter',system-ui,sans-serif; color:#0f172a;">
                <!-- CABEÇALHO DO PAINEL COMERCIAL DE DESEMPENHO -->
                <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:1rem; margin-bottom:1rem; background:linear-gradient(135deg, #1e1b4b 0%, #4c1d95 55%, #7048e8 100%); padding:1.15rem 1.4rem; border-radius:14px; color:#fff; box-shadow:0 10px 25px rgba(112,72,232,0.18);">
                    <div style="display:flex; align-items:center; gap:0.9rem;">
                        <div style="width:46px; height:46px; border-radius:12px; background:rgba(255,255,255,0.16); display:flex; align-items:center; justify-content:center; font-size:1.55rem;">
                            <i class="ph ph-chart-line-up"></i>
                        </div>
                        <div>
                            <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                                <h2 style="margin:0; font-size:1.3rem; font-weight:800; letter-spacing:-0.01em; color:#fff;">Painel Comercial de Desempenho — América Rental</h2>
                                <span style="background:rgba(255,255,255,0.18); color:#ede9fe; font-size:0.72rem; font-weight:700; padding:3px 10px; border-radius:999px;">Diretoria & Gestão Comercial</span>
                            </div>
                            <p style="margin:3px 0 0; font-size:0.82rem; color:#ddd6fe;">Acompanhamento em tempo real de propostas, conversão, qualidade das vendas, vendedores, equipamentos, tipos de contrato e perdas comerciais.</p>
                        </div>
                    </div>

                    <div style="display:flex; align-items:center; gap:0.6rem; flex-wrap:wrap;">
                        <!-- Alternador de Coorte de Conversão (Seção 9) -->
                        <div style="background:rgba(15,23,42,0.35); border:1px solid rgba(255,255,255,0.2); border-radius:10px; padding:4px; display:flex; align-items:center; gap:4px;" title="Define como a conversão cruza propostas enviadas e contratos fechados">
                            <button type="button" onclick="window._comercialDashboard.setModoConversao('safra')"
                                style="border:none; border-radius:7px; padding:5px 10px; font-size:0.75rem; font-weight:700; cursor:pointer; transition:all 0.15s; background:${STATE.modoConversao === 'safra' ? '#fff' : 'transparent'}; color:${STATE.modoConversao === 'safra' ? '#4c1d95' : '#e2e8f0'};">
                                <i class="ph ph-funnel"></i> Safra de Propostas
                            </button>
                            <button type="button" onclick="window._comercialDashboard.setModoConversao('fechamento')"
                                style="border:none; border-radius:7px; padding:5px 10px; font-size:0.75rem; font-weight:700; cursor:pointer; transition:all 0.15s; background:${STATE.modoConversao === 'fechamento' ? '#fff' : 'transparent'}; color:${STATE.modoConversao === 'fechamento' ? '#4c1d95' : '#e2e8f0'};">
                                <i class="ph ph-calendar-check"></i> Período de Fechamento
                            </button>
                        </div>

                        <button type="button" onclick="window._comercialDashboard.recarregar()"
                            style="background:#fff; color:#4c1d95; border:none; border-radius:9px; padding:0.5rem 0.9rem; font-size:0.8rem; font-weight:800; cursor:pointer; display:inline-flex; align-items:center; gap:6px; box-shadow:0 2px 8px rgba(0,0,0,0.12);">
                            <i class="ph ph-arrows-clockwise"></i> Atualizar
                        </button>
                    </div>
                </div>

                <!-- BARRA DE FILTROS GLOBAIS (SEÇÃO 8) -->
                <div style="background:#fff; border:1px solid #e2e8f0; border-radius:12px; padding:0.9rem 1.1rem; margin-bottom:1rem; box-shadow:0 2px 8px rgba(15,23,42,0.04);">
                    <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:0.65rem; margin-bottom:0.75rem; padding-bottom:0.65rem; border-bottom:1px solid #f1f5f9;">
                        <div style="display:flex; align-items:center; gap:0.45rem; flex-wrap:wrap;">
                            <span style="font-size:0.76rem; font-weight:800; color:#475569; display:inline-flex; align-items:center; gap:5px; margin-right:4px;">
                                <i class="ph ph-sliders-horizontal" style="color:#7048e8; font-size:1rem;"></i> Período Rápido:
                            </span>
                            ${[
                                { id: 'dia', label: 'Hoje (Dia)' },
                                { id: 'semana', label: 'Semana' },
                                { id: 'mes', label: 'Mês Atual' },
                                { id: 'trimestre', label: 'Trimestre' },
                                { id: 'ano', label: 'Ano Atual' },
                                { id: 'todos', label: 'Todo o Histórico' }
                            ].map(pr => {
                                const ativo = STATE.periodoPreset === pr.id;
                                return `<button type="button" onclick="window._comercialDashboard.setPresetPeriodo('${pr.id}')"
                                    style="border:1px solid ${ativo ? '#7048e8' : '#cbd5e1'}; background:${ativo ? '#7048e8' : '#f8fafc'}; color:${ativo ? '#fff' : '#334155'}; border-radius:7px; padding:4px 11px; font-size:0.76rem; font-weight:700; cursor:pointer; transition:all 0.15s;">
                                    ${pr.label}
                                </button>`;
                            }).join('')}
                        </div>

                        <div style="display:flex; align-items:center; gap:0.5rem; flex-wrap:wrap;">
                            <div style="display:flex; align-items:center; gap:5px; font-size:0.76rem; color:#475569; font-weight:600;">
                                <span>De:</span>
                                <input type="date" id="dash-com-dt-ini" value="${escHtml(STATE.dataInicio)}"
                                    onchange="window._comercialDashboard.onCustomDateChange()"
                                    style="padding:4px 8px; border:1px solid #cbd5e1; border-radius:6px; font-size:0.78rem; color:#0f172a; text-transform:none;">
                                <span>Até:</span>
                                <input type="date" id="dash-com-dt-fim" value="${escHtml(STATE.dataFim)}"
                                    onchange="window._comercialDashboard.onCustomDateChange()"
                                    style="padding:4px 8px; border:1px solid #cbd5e1; border-radius:6px; font-size:0.78rem; color:#0f172a; text-transform:none;">
                            </div>
                            <button type="button" onclick="window._comercialDashboard.limparFiltros()"
                                style="background:#f1f5f9; color:#475569; border:1px solid #cbd5e1; border-radius:7px; padding:4px 10px; font-size:0.75rem; font-weight:700; cursor:pointer; display:inline-flex; align-items:center; gap:4px;">
                                <i class="ph ph-broom"></i> Limpar Filtros
                            </button>
                        </div>
                    </div>

                    <!-- Segunda linha de filtros globais: Vendedor (multi), Produto (multi), Tipo Contrato, Status, Perfil Cliente, Cidade/Região -->
                    <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(195px, 1fr)); gap:0.65rem;">
                        <!-- Vendedor (Multi-seleção com busca em tempo real) -->
                        <div style="position:relative;">
                            <label style="display:block; font-size:0.72rem; font-weight:700; color:#475569; margin-bottom:3px;">Vendedor(es) (Comparação)</label>
                            <button type="button" onclick="window._comercialDashboard.toggleDropdown('dd-dash-vendedores')"
                                style="width:100%; text-align:left; padding:0.45rem 0.65rem; border:1px solid #cbd5e1; border-radius:7px; background:#fff; font-size:0.8rem; color:#0f172a; cursor:pointer; display:flex; align-items:center; justify-content:space-between;">
                                <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escHtml(labelVendedoresBtn)}</span>
                                <i class="ph ph-caret-down" style="color:#64748b;"></i>
                            </button>
                            <div id="dd-dash-vendedores" style="display:none; position:absolute; top:100%; left:0; right:0; margin-top:4px; background:#fff; border:1px solid #cbd5e1; border-radius:9px; box-shadow:0 12px 28px rgba(15,23,42,0.15); z-index:90; padding:8px;">
                                <input type="text" placeholder="Digite para filtrar vendedor..."
                                    oninput="window._comercialDashboard.filtrarListaDropdown(this, 'lista-dd-vendedores')"
                                    style="width:100%; padding:6px 8px; border:1px solid #cbd5e1; border-radius:6px; font-size:0.78rem; margin-bottom:6px; box-sizing:border-box; text-transform:none;">
                                <div id="lista-dd-vendedores" style="max-height:190px; overflow-y:auto; display:flex; flex-direction:column; gap:3px;">
                                    ${vendedoresUnicos.map(v => {
                                        const vNorm = normText(v);
                                        const checked = STATE.vendedoresSelecionados.includes(vNorm);
                                        return `<label data-search="${escHtml(vNorm)}" style="display:flex; align-items:center; gap:6px; padding:4px 6px; border-radius:5px; font-size:0.78rem; color:#1e293b; cursor:pointer;">
                                            <input type="checkbox" ${checked ? 'checked' : ''} onchange="window._comercialDashboard.toggleVendedor('${escHtml(vNorm)}', this.checked)">
                                            <span>${escHtml(v)}</span>
                                        </label>`;
                                    }).join('')}
                                </div>
                            </div>
                        </div>

                        <!-- Produto / Equipamento (Multi-seleção com busca em tempo real) -->
                        <div style="position:relative;">
                            <label style="display:block; font-size:0.72rem; font-weight:700; color:#475569; margin-bottom:3px;">Produto(s) / Equipamento(s)</label>
                            <button type="button" onclick="window._comercialDashboard.toggleDropdown('dd-dash-produtos')"
                                style="width:100%; text-align:left; padding:0.45rem 0.65rem; border:1px solid #cbd5e1; border-radius:7px; background:#fff; font-size:0.8rem; color:#0f172a; cursor:pointer; display:flex; align-items:center; justify-content:space-between;">
                                <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escHtml(labelProdutosBtn)}</span>
                                <i class="ph ph-caret-down" style="color:#64748b;"></i>
                            </button>
                            <div id="dd-dash-produtos" style="display:none; position:absolute; top:100%; left:0; right:0; margin-top:4px; background:#fff; border:1px solid #cbd5e1; border-radius:9px; box-shadow:0 12px 28px rgba(15,23,42,0.15); z-index:90; padding:8px;">
                                <input type="text" placeholder="Digite para filtrar produto..."
                                    oninput="window._comercialDashboard.filtrarListaDropdown(this, 'lista-dd-produtos')"
                                    style="width:100%; padding:6px 8px; border:1px solid #cbd5e1; border-radius:6px; font-size:0.78rem; margin-bottom:6px; box-sizing:border-box; text-transform:none;">
                                <div id="lista-dd-produtos" style="max-height:190px; overflow-y:auto; display:flex; flex-direction:column; gap:3px;">
                                    ${produtosDisponiveis.map(pr => {
                                        const checked = STATE.produtosSelecionados.includes(pr.key);
                                        return `<label data-search="${escHtml(normText(pr.label + ' ' + pr.key))}" style="display:flex; align-items:center; gap:6px; padding:4px 6px; border-radius:5px; font-size:0.78rem; color:#1e293b; cursor:pointer;">
                                            <input type="checkbox" ${checked ? 'checked' : ''} onchange="window._comercialDashboard.toggleProduto('${escHtml(pr.key)}', this.checked)">
                                            <span>${escHtml(pr.label)}</span>
                                        </label>`;
                                    }).join('')}
                                </div>
                            </div>
                        </div>

                        <!-- Tipo de Contrato -->
                        <div>
                            <label style="display:block; font-size:0.72rem; font-weight:700; color:#475569; margin-bottom:3px;">Tipo / Finalidade de Contrato</label>
                            <select onchange="window._comercialDashboard.setFiltro('tipoContratoFiltro', this.value)"
                                style="width:100%; padding:0.45rem 0.6rem; border:1px solid #cbd5e1; border-radius:7px; font-size:0.8rem; color:#0f172a; background:#fff; text-transform:none;">
                                <option value="TODOS" ${STATE.tipoContratoFiltro === 'TODOS' ? 'selected' : ''}>Todos os tipos</option>
                                <option value="OBRAS" ${STATE.tipoContratoFiltro === 'OBRAS' ? 'selected' : ''}>Obras (Mensal / Quinzenal / Semanal)</option>
                                <option value="EVENTOS" ${STATE.tipoContratoFiltro === 'EVENTOS' ? 'selected' : ''}>Eventos</option>
                                <option value="RECORRENTES" ${STATE.tipoContratoFiltro === 'RECORRENTES' ? 'selected' : ''}>Contratos Recorrentes</option>
                                <option value="PONTUAIS" ${STATE.tipoContratoFiltro === 'PONTUAIS' ? 'selected' : ''}>Contratos Pontuais</option>
                                <option value="LONGO_PRAZO" ${STATE.tipoContratoFiltro === 'LONGO_PRAZO' ? 'selected' : ''}>Locações de Longo Prazo (≥ 30 dias)</option>
                                <option value="CURTO_PRAZO" ${STATE.tipoContratoFiltro === 'CURTO_PRAZO' ? 'selected' : ''}>Locações de Curto Prazo (< 30 dias)</option>
                                <option value="LIMPA_FOSSA" ${STATE.tipoContratoFiltro === 'LIMPA_FOSSA' ? 'selected' : ''}>Limpa Fossa</option>
                                <option value="EQUIPAMENTOS" ${STATE.tipoContratoFiltro === 'EQUIPAMENTOS' ? 'selected' : ''}>Equipamentos / Containers</option>
                            </select>
                        </div>

                        <!-- Status da Proposta -->
                        <div>
                            <label style="display:block; font-size:0.72rem; font-weight:700; color:#475569; margin-bottom:3px;">Status da Proposta</label>
                            <select onchange="window._comercialDashboard.setFiltro('statusFiltro', this.value)"
                                style="width:100%; padding:0.45rem 0.6rem; border:1px solid #cbd5e1; border-radius:7px; font-size:0.8rem; color:#0f172a; background:#fff; text-transform:none;">
                                <option value="TODOS" ${STATE.statusFiltro === 'TODOS' ? 'selected' : ''}>Todos os status</option>
                                <option value="FECHADOS" ${STATE.statusFiltro === 'FECHADOS' ? 'selected' : ''}>Contratos Fechados (Ganhas)</option>
                                <option value="EM_NEGOCIACAO" ${STATE.statusFiltro === 'EM_NEGOCIACAO' ? 'selected' : ''}>Em Negociação / Abertas</option>
                                <option value="PERDIDAS" ${STATE.statusFiltro === 'PERDIDAS' ? 'selected' : ''}>Perdidas / Reprovadas / Sem Retorno</option>
                            </select>
                        </div>

                        <!-- Cliente Novo ou Recorrente -->
                        <div>
                            <label style="display:block; font-size:0.72rem; font-weight:700; color:#475569; margin-bottom:3px;">Perfil do Cliente</label>
                            <select onchange="window._comercialDashboard.setFiltro('perfilClienteFiltro', this.value)"
                                style="width:100%; padding:0.45rem 0.6rem; border:1px solid #cbd5e1; border-radius:7px; font-size:0.8rem; color:#0f172a; background:#fff; text-transform:none;">
                                <option value="TODOS" ${STATE.perfilClienteFiltro === 'TODOS' ? 'selected' : ''}>Todos (Novos e Recorrentes)</option>
                                <option value="NOVO" ${STATE.perfilClienteFiltro === 'NOVO' ? 'selected' : ''}>Cliente Novo (1ª compra/cotação)</option>
                                <option value="RECORRENTE" ${STATE.perfilClienteFiltro === 'RECORRENTE' ? 'selected' : ''}>Cliente Recorrente (Carteira)</option>
                            </select>
                        </div>

                        <!-- Região ou Cidade (Digitável com filtro em tempo real) -->
                        <div>
                            <label style="display:block; font-size:0.72rem; font-weight:700; color:#475569; margin-bottom:3px;">Região ou Cidade</label>
                            <div style="position:relative;">
                                <input type="text" id="dash-com-filtro-regiao" value="${escHtml(STATE.regiaoCidadeFiltro)}"
                                    placeholder="Digite cidade, bairro ou UF..."
                                    oninput="window._comercialDashboard.onRegiaoInput(this.value)"
                                    style="width:100%; padding:0.45rem 0.65rem 0.45rem 1.85rem; border:1px solid #cbd5e1; border-radius:7px; font-size:0.8rem; color:#0f172a; box-sizing:border-box; text-transform:none;">
                                <i class="ph ph-map-pin" style="position:absolute; left:8px; top:50%; transform:translateY(-50%); color:#7048e8; font-size:0.95rem;"></i>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- NAVEGAÇÃO DAS 6 ABAS DO PAINEL (SEÇÃO 7) -->
                <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(210px, 1fr)); gap:0.55rem; margin-bottom:1.15rem;">
                    ${abas.map(a => {
                        const ativo = STATE.abaAtiva === a.id;
                        return `<button type="button" onclick="window._comercialDashboard.setAba('${a.id}')"
                            style="text-align:left; padding:0.7rem 0.9rem; border-radius:11px; border:1.5px solid ${ativo ? '#7048e8' : '#e2e8f0'}; background:${ativo ? '#f5f3ff' : '#fff'}; cursor:pointer; transition:all 0.15s; display:flex; align-items:center; gap:0.65rem; box-shadow:${ativo ? '0 4px 12px rgba(112,72,232,0.12)' : 'none'};">
                            <div style="width:36px; height:36px; border-radius:9px; background:${ativo ? '#7048e8' : '#f1f5f9'}; color:${ativo ? '#fff' : '#475569'}; display:flex; align-items:center; justify-content:center; font-size:1.15rem; flex-shrink:0;">
                                <i class="ph ${a.icon}"></i>
                            </div>
                            <div style="min-width:0;">
                                <div style="font-size:0.84rem; font-weight:800; color:${ativo ? '#4c1d95' : '#0f172a'}; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escHtml(a.label)}</div>
                                <div style="font-size:0.7rem; color:#64748b; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escHtml(a.desc)}</div>
                            </div>
                        </button>`;
                    }).join('')}
                </div>

                <!-- CONTEÚDO DINÂMICO DA ABA ATIVA -->
                <div id="dash-com-aba-conteudo"></div>
            </div>
        `;

        renderConteudoAbaAtiva(todasProcessadas, filtradas, metricas);
    }

    function renderCardsKpisPrincipais(metricas) {
        const modoLabel = STATE.modoConversao === 'safra'
            ? 'Safra de propostas do período'
            : 'Contratos fechados no período';

        return `
            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(225px, 1fr)); gap:0.85rem; margin-bottom:1.15rem;">
                <!-- Card 1: Propostas Enviadas -->
                <div style="background:#fff; border:1px solid #e2e8f0; border-left:4px solid #7048e8; border-radius:12px; padding:1rem 1.15rem; box-shadow:0 2px 8px rgba(15,23,42,0.04);">
                    <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:0.35rem;">
                        <span style="font-size:0.75rem; font-weight:800; color:#64748b;">Propostas enviadas</span>
                        <span style="background:#ede9fe; color:#5b21b6; font-size:0.7rem; font-weight:800; padding:2px 8px; border-radius:999px;">100%</span>
                    </div>
                    <div style="font-size:1.75rem; font-weight:900; color:#0f172a; line-height:1.15;">${metricas.totalPropostas}</div>
                    <div style="margin-top:4px; font-size:0.76rem; color:#475569; display:flex; align-items:center; justify-content:space-between;">
                        <span>Volume no período</span>
                        <strong style="color:#4c1d95;">${fmtMoedaCurta(metricas.valorProposto)}</strong>
                    </div>
                </div>

                <!-- Card 2: Contratos Fechados -->
                <div style="background:#fff; border:1px solid #e2e8f0; border-left:4px solid #16a34a; border-radius:12px; padding:1rem 1.15rem; box-shadow:0 2px 8px rgba(15,23,42,0.04);">
                    <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:0.35rem;">
                        <span style="font-size:0.75rem; font-weight:800; color:#64748b;">Contratos fechados</span>
                        <span style="background:#dcfce7; color:#15803d; font-size:0.7rem; font-weight:800; padding:2px 8px; border-radius:999px;">Ganhas</span>
                    </div>
                    <div style="font-size:1.75rem; font-weight:900; color:#15803d; line-height:1.15;">${metricas.qtdFechados}</div>
                    <div style="margin-top:4px; font-size:0.76rem; color:#475569; display:flex; align-items:center; justify-content:space-between;">
                        <span>Quantidade convertida</span>
                        <span style="font-size:0.72rem; color:#64748b;">${escHtml(modoLabel)}</span>
                    </div>
                </div>

                <!-- Card 3: Taxa de Conversão -->
                <div style="background:#fff; border:1px solid #e2e8f0; border-left:4px solid #0284c7; border-radius:12px; padding:1rem 1.15rem; box-shadow:0 2px 8px rgba(15,23,42,0.04);">
                    <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:0.35rem;">
                        <span style="font-size:0.75rem; font-weight:800; color:#64748b;">Taxa de conversão</span>
                        <span style="background:#e0f2fe; color:#0369a1; font-size:0.7rem; font-weight:800; padding:2px 8px; border-radius:999px;">Fechados ÷ Propostas</span>
                    </div>
                    <div style="font-size:1.75rem; font-weight:900; color:#0284c7; line-height:1.15;">${fmtPct(metricas.taxaConversao)}</div>
                    <div style="margin-top:4px; font-size:0.76rem; color:#475569; display:flex; align-items:center; justify-content:space-between;">
                        <span>Aproveitamento financ.:</span>
                        <strong style="color:#0369a1;">${fmtPct(metricas.aproveitamentoFinanceiro)}</strong>
                    </div>
                </div>

                <!-- Card 4: Valor Contratado -->
                <div style="background:#fff; border:1px solid #e2e8f0; border-left:4px solid #0d9488; border-radius:12px; padding:1rem 1.15rem; box-shadow:0 2px 8px rgba(15,23,42,0.04);">
                    <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:0.35rem;">
                        <span style="font-size:0.75rem; font-weight:800; color:#64748b;">Valor contratado</span>
                        <span style="background:#ccfbf1; color:#0f766e; font-size:0.7rem; font-weight:800; padding:2px 8px; border-radius:999px;">Receita Fechada</span>
                    </div>
                    <div style="font-size:1.55rem; font-weight:900; color:#0f766e; line-height:1.2;">${fmtMoeda(metricas.valorContratado)}</div>
                    <div style="margin-top:4px; font-size:0.76rem; color:#475569; display:flex; align-items:center; justify-content:space-between;">
                        <span>Ticket médio:</span>
                        <strong style="color:#0f172a;">${fmtMoeda(metricas.ticketMedio)}</strong>
                    </div>
                </div>

                <!-- Card 5: Taxa de Perda & Velocidade de Fechamento -->
                <div style="background:#fff; border:1px solid #e2e8f0; border-left:4px solid #ea580c; border-radius:12px; padding:1rem 1.15rem; box-shadow:0 2px 8px rgba(15,23,42,0.04);">
                    <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:0.35rem;">
                        <span style="font-size:0.75rem; font-weight:800; color:#64748b;">Perda & Velocidade</span>
                        <span style="background:#ffedd5; color:#c2410c; font-size:0.7rem; font-weight:800; padding:2px 8px; border-radius:999px;">${metricas.qtdPerdidas} perdidas</span>
                    </div>
                    <div style="display:flex; align-items:baseline; justify-content:space-between;">
                        <div>
                            <div style="font-size:1.45rem; font-weight:900; color:#dc2626;">${fmtPct(metricas.taxaPerda)}</div>
                            <div style="font-size:0.7rem; color:#64748b;">Taxa de perda</div>
                        </div>
                        <div style="text-align:right;">
                            <div style="font-size:1.35rem; font-weight:900; color:#0f172a;">${metricas.tempoMedioFechamento.toFixed(1)}d</div>
                            <div style="font-size:0.7rem; color:#64748b;">Tempo médio fech.</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    function renderConteudoAbaAtiva(todasProcessadas, filtradas, metricas) {
        destroyAllCharts();
        const box = document.getElementById('dash-com-aba-conteudo');
        if (!box) return;

        if (STATE.abaAtiva === 'visao_geral') {
            renderAbaVisaoGeral(box, todasProcessadas, filtradas, metricas);
        } else if (STATE.abaAtiva === 'vendedores') {
            renderAbaVendedores(box, filtradas, metricas);
        } else if (STATE.abaAtiva === 'produtos') {
            renderAbaProdutos(box, filtradas, metricas);
        } else if (STATE.abaAtiva === 'tipos_contrato') {
            renderAbaTiposContrato(box, filtradas, metricas);
        } else if (STATE.abaAtiva === 'perdas') {
            renderAbaPerdas(box, filtradas, metricas);
        } else if (STATE.abaAtiva === 'comparativos') {
            renderAbaComparativos(box, todasProcessadas, filtradas, metricas);
        }
    }

    // =========================================================================
    // ABA 1: VISÃO GERAL (INDICADORES GERAIS + 5 GRÁFICOS + FATURAMENTO VENDEDOR/TIPO)
    // =========================================================================
    function renderAbaVisaoGeral(box, todasProcessadas, filtradas, metricas) {
        const seriesMensais = obterSériesMensais(filtradas, todasProcessadas);
        const vendedoresPerf = calcularDesempenhoVendedores(filtradas);

        box.innerHTML = `
            ${renderCardsKpisPrincipais(metricas)}

            <!-- Linha 1 de Gráficos: (1) Propostas x Contratos por Mês + (2) Taxa de Conversão Mensal -->
            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(460px, 1fr)); gap:1rem; margin-bottom:1rem;">
                <div style="background:#fff; border:1px solid #e2e8f0; border-radius:12px; padding:1.1rem;">
                    <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:0.75rem;">
                        <div>
                            <h3 style="margin:0; font-size:0.95rem; font-weight:800; color:#0f172a;">1. Propostas Enviadas x Contratos Fechados por Mês</h3>
                            <p style="margin:2px 0 0; font-size:0.75rem; color:#64748b;">Evolução mensal de volume comercial e fechamentos (colunas agrupadas)</p>
                        </div>
                        <span style="background:#f5f3ff; color:#6d28d9; font-size:0.7rem; font-weight:800; padding:3px 9px; border-radius:999px;">Prioridade Diretoria #1</span>
                    </div>
                    <div style="height:270px; position:relative;"><canvas id="chart-vg-prop-x-ctr"></canvas></div>
                </div>

                <div style="background:#fff; border:1px solid #e2e8f0; border-radius:12px; padding:1.1rem;">
                    <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:0.75rem;">
                        <div>
                            <h3 style="margin:0; font-size:0.95rem; font-weight:800; color:#0f172a;">2. Taxa de Conversão Mensal (%)</h3>
                            <p style="margin:2px 0 0; font-size:0.75rem; color:#64748b;">Evolução ou queda na eficiência de fechamento mês a mês</p>
                        </div>
                    </div>
                    <div style="height:270px; position:relative;"><canvas id="chart-vg-conversao-mensal"></canvas></div>
                </div>
            </div>

            <!-- Linha 2 de Gráficos: (3) Valor Proposto x Valor Contratado + (4) Ticket Médio dos Contratos Fechados -->
            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(460px, 1fr)); gap:1rem; margin-bottom:1rem;">
                <div style="background:#fff; border:1px solid #e2e8f0; border-radius:12px; padding:1.1rem;">
                    <div style="margin-bottom:0.75rem;">
                        <h3 style="margin:0; font-size:0.95rem; font-weight:800; color:#0f172a;">3. Valor Total das Propostas x Valor Efetivamente Contratado</h3>
                        <p style="margin:2px 0 0; font-size:0.75rem; color:#64748b;">Comparativo mensal entre volume financeiro orçado e receita efetivamente contratada</p>
                    </div>
                    <div style="height:270px; position:relative;"><canvas id="chart-vg-valor-prop-x-ctr"></canvas></div>
                </div>

                <div style="background:#fff; border:1px solid #e2e8f0; border-radius:12px; padding:1.1rem;">
                    <div style="margin-bottom:0.75rem;">
                        <h3 style="margin:0; font-size:0.95rem; font-weight:800; color:#0f172a;">4. Ticket Médio dos Contratos Fechados (R$)</h3>
                        <p style="margin:2px 0 0; font-size:0.75rem; color:#64748b;">Valor médio contratado por fechamento ao longo dos meses</p>
                    </div>
                    <div style="height:270px; position:relative;"><canvas id="chart-vg-ticket-medio"></canvas></div>
                </div>
            </div>

            <!-- Linha 3 de Gráficos: (5) Perdidas x Ganhas x Em Negociação + (Destaque #5 Diretoria) Faturamento por Vendedor e Tipo de Contrato -->
            <div style="display:grid; grid-template-columns:1fr 1.45fr; gap:1rem;">
                <div style="background:#fff; border:1px solid #e2e8f0; border-radius:12px; padding:1.1rem;">
                    <div style="margin-bottom:0.75rem;">
                        <h3 style="margin:0; font-size:0.95rem; font-weight:800; color:#0f172a;">5. Ganhas x Em Negociação x Perdidas</h3>
                        <p style="margin:2px 0 0; font-size:0.75rem; color:#64748b;">Distribuição do funil de propostas no período selecionado</p>
                    </div>
                    <div style="height:245px; position:relative;"><canvas id="chart-vg-status-rosca"></canvas></div>
                </div>

                <div style="background:#fff; border:1px solid #e2e8f0; border-radius:12px; padding:1.1rem;">
                    <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:0.75rem;">
                        <div>
                            <h3 style="margin:0; font-size:0.95rem; font-weight:800; color:#0f172a;">6. Faturamento Contratado por Vendedor e Tipo de Contrato</h3>
                            <p style="margin:2px 0 0; font-size:0.75rem; color:#64748b;">Onde está o resultado financeiro: receita de Obras, Eventos, Limpa Fossa e Equipamentos por vendedor</p>
                        </div>
                        <span style="background:#dcfce7; color:#15803d; font-size:0.7rem; font-weight:800; padding:3px 9px; border-radius:999px;">Prioridade Diretoria #5</span>
                    </div>
                    <div style="height:245px; position:relative;"><canvas id="chart-vg-fat-vendedor-tipo"></canvas></div>
                </div>
            </div>
        `;

        const labelsMes = seriesMensais.map(m => m.label);

        createChart('chart-vg-prop-x-ctr', {
            type: 'bar',
            data: {
                labels: labelsMes,
                datasets: [
                    { label: 'Propostas Enviadas', data: seriesMensais.map(m => m.propostas), backgroundColor: '#7048e8', borderRadius: 6 },
                    { label: 'Contratos Fechados', data: seriesMensais.map(m => m.fechados), backgroundColor: '#16a34a', borderRadius: 6 }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'top' } },
                scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }
            }
        });

        createChart('chart-vg-conversao-mensal', {
            type: 'line',
            data: {
                labels: labelsMes,
                datasets: [{
                    label: 'Taxa de Conversão (%)',
                    data: seriesMensais.map(m => m.taxaConversao),
                    borderColor: '#0284c7',
                    backgroundColor: 'rgba(2,132,199,0.12)',
                    fill: true,
                    tension: 0.3,
                    pointRadius: 4,
                    pointBackgroundColor: '#0284c7'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'top' } },
                scales: { y: { beginAtZero: true, max: 100, ticks: { callback: v => v + '%' } } }
            }
        });

        createChart('chart-vg-valor-prop-x-ctr', {
            type: 'bar',
            data: {
                labels: labelsMes,
                datasets: [
                    { label: 'Valor Proposto (R$)', data: seriesMensais.map(m => Number(m.valorProposto.toFixed(2))), backgroundColor: '#94a3b8', borderRadius: 6 },
                    { label: 'Valor Contratado (R$)', data: seriesMensais.map(m => Number(m.valorContratado.toFixed(2))), backgroundColor: '#0d9488', borderRadius: 6 }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'top' } },
                scales: { y: { beginAtZero: true, ticks: { callback: v => fmtMoedaCurta(v) } } }
            }
        });

        createChart('chart-vg-ticket-medio', {
            type: 'line',
            data: {
                labels: labelsMes,
                datasets: [{
                    label: 'Ticket Médio Contratado (R$)',
                    data: seriesMensais.map(m => m.ticketMedio),
                    borderColor: '#7c3aed',
                    backgroundColor: 'rgba(124,58,237,0.12)',
                    fill: true,
                    tension: 0.3,
                    pointRadius: 4,
                    pointBackgroundColor: '#7c3aed'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'top' } },
                scales: { y: { beginAtZero: true, ticks: { callback: v => fmtMoedaCurta(v) } } }
            }
        });

        createChart('chart-vg-status-rosca', {
            type: 'doughnut',
            data: {
                labels: ['Contratos Fechados (Ganhas)', 'Em Negociação', 'Propostas Perdidas'],
                datasets: [{
                    data: [metricas.qtdFechados, metricas.qtdEmNegociacao, metricas.qtdPerdidas],
                    backgroundColor: ['#16a34a', '#0284c7', '#dc2626'],
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom' } }
            }
        });

        const topVend = vendedoresPerf.slice(0, 8);
        createChart('chart-vg-fat-vendedor-tipo', {
            type: 'bar',
            data: {
                labels: topVend.map(v => v.nome),
                datasets: [
                    { label: 'Obras', data: topVend.map(v => Number((v.porTipo['Obras'] || 0).toFixed(2))), backgroundColor: '#7048e8', borderRadius: 4 },
                    { label: 'Eventos', data: topVend.map(v => Number((v.porTipo['Eventos'] || 0).toFixed(2))), backgroundColor: '#0284c7', borderRadius: 4 },
                    { label: 'Limpa Fossa', data: topVend.map(v => Number((v.porTipo['Limpa Fossa'] || 0).toFixed(2))), backgroundColor: '#0d9488', borderRadius: 4 },
                    { label: 'Equipamentos', data: topVend.map(v => Number((v.porTipo['Equipamentos'] || 0).toFixed(2))), backgroundColor: '#eab308', borderRadius: 4 }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'top' } },
                scales: {
                    x: { stacked: true },
                    y: { stacked: true, beginAtZero: true, ticks: { callback: v => fmtMoedaCurta(v) } }
                }
            }
        });
    }

    // =========================================================================
    // ABA 2: DESEMPENHO POR VENDEDOR (SEÇÃO 2)
    // =========================================================================
    function renderAbaVendedores(box, filtradas, metricas) {
        const vendedores = calcularDesempenhoVendedores(filtradas);
        const rankPorContratos = [...vendedores].sort((a, b) => b.fechados - a.fechados || b.valorFechado - a.valorFechado);
        const rankPorConversao = [...vendedores].sort((a, b) => b.taxaConversao - a.taxaConversao || b.fechados - a.fechados);

        box.innerHTML = `
            ${renderCardsKpisPrincipais(metricas)}

            <!-- Observação Estratégica da Diretoria -->
            <div style="background:#eff6ff; border:1px solid #bfdbfe; border-left:4px solid #0284c7; border-radius:10px; padding:0.75rem 1rem; margin-bottom:1rem; font-size:0.81rem; color:#1e3a8a; display:flex; align-items:center; gap:0.65rem;">
                <i class="ph ph-info" style="font-size:1.3rem; color:#0284c7; flex-shrink:0;"></i>
                <div>
                    <strong>Análise Separada de Volume x Eficiência:</strong> Um vendedor pode fechar mais contratos simplesmente porque envia muito mais propostas, enquanto outro pode enviar menos propostas mas ter uma conversão muito superior. Compare os dois rankings lado a lado abaixo.
                </div>
            </div>

            <!-- Gráficos A e B: Ranking por Contratos Fechados vs Taxa de Conversão por Vendedor -->
            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(450px, 1fr)); gap:1rem; margin-bottom:1rem;">
                <div style="background:#fff; border:1px solid #e2e8f0; border-radius:12px; padding:1.1rem;">
                    <div style="margin-bottom:0.75rem;">
                        <h3 style="margin:0; font-size:0.95rem; font-weight:800; color:#0f172a;">A. Ranking de Vendedores por Contratos Fechados</h3>
                        <p style="margin:2px 0 0; font-size:0.75rem; color:#64748b;">Quantidade de vendas efetivadas x Propostas enviadas por vendedor</p>
                    </div>
                    <div style="height:280px; position:relative;"><canvas id="chart-vend-ranking-contratos"></canvas></div>
                </div>

                <div style="background:#fff; border:1px solid #e2e8f0; border-radius:12px; padding:1.1rem;">
                    <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:0.75rem;">
                        <div>
                            <h3 style="margin:0; font-size:0.95rem; font-weight:800; color:#0f172a;">B. Taxa de Conversão por Vendedor (%)</h3>
                            <p style="margin:2px 0 0; font-size:0.75rem; color:#64748b;">Eficiência comercial individual (Contratos fechados ÷ Propostas enviadas)</p>
                        </div>
                        <span style="background:#e0f2fe; color:#0369a1; font-size:0.7rem; font-weight:800; padding:3px 9px; border-radius:999px;">Prioridade Diretoria #2</span>
                    </div>
                    <div style="height:280px; position:relative;"><canvas id="chart-vend-ranking-conversao"></canvas></div>
                </div>
            </div>

            <!-- Tabela Consolidada e Individual dos 8 Indicadores por Vendedor -->
            <div style="background:#fff; border:1px solid #e2e8f0; border-radius:12px; padding:1.1rem; overflow-x:auto;">
                <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:0.5rem; margin-bottom:0.85rem;">
                    <div>
                        <h3 style="margin:0; font-size:0.98rem; font-weight:800; color:#0f172a;">Matriz Completa de Desempenho por Vendedor (Individual e Consolidado)</h3>
                        <p style="margin:2px 0 0; font-size:0.76rem; color:#64748b;">Produtividade, quantidade de vendas, eficiência, volume de oportunidades, resultado financeiro, ticket médio, perda comercial e velocidade de venda</p>
                    </div>
                </div>

                <table style="width:100%; border-collapse:collapse; font-size:0.81rem;">
                    <thead>
                        <tr style="background:#f8fafc; border-bottom:2px solid #e2e8f0; color:#475569; text-align:left;">
                            <th style="padding:10px;">Vendedor</th>
                            <th style="padding:10px; text-align:center;" title="Produtividade comercial">Propostas Enviadas</th>
                            <th style="padding:10px; text-align:center;" title="Quantidade de vendas">Contratos Fechados</th>
                            <th style="padding:10px; text-align:center;" title="Eficiência do vendedor">Taxa de Conversão</th>
                            <th style="padding:10px; text-align:right;" title="Volume de oportunidades">Valor Proposto</th>
                            <th style="padding:10px; text-align:right;" title="Resultado financeiro">Valor Fechado</th>
                            <th style="padding:10px; text-align:right;" title="Valor médio vendido">Ticket Médio</th>
                            <th style="padding:10px; text-align:center;" title="Perda comercial">Propostas Perdidas</th>
                            <th style="padding:10px; text-align:center;" title="Velocidade de venda">Tempo Médio Fech.</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${vendedores.length === 0 ? `
                            <tr><td colspan="9" style="padding:20px; text-align:center; color:#94a3b8;">Nenhum dado encontrado para os filtros selecionados.</td></tr>
                        ` : vendedores.map((v, idx) => `
                            <tr style="border-bottom:1px solid #f1f5f9;">
                                <td style="padding:10px; font-weight:800; color:#0f172a;">
                                    <span style="display:inline-flex; align-items:center; justify-content:center; width:22px; height:22px; border-radius:50%; background:#ede9fe; color:#5b21b6; font-size:0.72rem; margin-right:6px;">${idx + 1}º</span>
                                    ${escHtml(v.nome)}
                                </td>
                                <td style="padding:10px; text-align:center; font-weight:700; color:#334155;">${v.propostas}</td>
                                <td style="padding:10px; text-align:center; font-weight:800; color:#15803d;">${v.fechados}</td>
                                <td style="padding:10px; text-align:center;">
                                    <span style="background:${v.taxaConversao >= 40 ? '#dcfce7' : v.taxaConversao >= 20 ? '#fef9c3' : '#fee2e2'}; color:${v.taxaConversao >= 40 ? '#15803d' : v.taxaConversao >= 20 ? '#a16207' : '#b91c1c'}; padding:3px 9px; border-radius:999px; font-weight:800; font-size:0.76rem;">
                                        ${fmtPct(v.taxaConversao)}
                                    </span>
                                </td>
                                <td style="padding:10px; text-align:right; color:#475569; font-weight:600;">${fmtMoeda(v.valorProposto)}</td>
                                <td style="padding:10px; text-align:right; color:#0f766e; font-weight:800;">${fmtMoeda(v.valorFechado)}</td>
                                <td style="padding:10px; text-align:right; color:#0f172a; font-weight:700;">${fmtMoeda(v.ticketMedio)}</td>
                                <td style="padding:10px; text-align:center; color:#dc2626; font-weight:700;">${v.perdidas}</td>
                                <td style="padding:10px; text-align:center; color:#475569; font-weight:600;">${v.tempoMedioFechamento > 0 ? v.tempoMedioFechamento.toFixed(1) + ' dias' : '—'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                    <tfoot>
                        <tr style="background:#f8fafc; border-top:2px solid #cbd5e1; font-weight:900; color:#0f172a;">
                            <td style="padding:10px;">CONSOLIDADO DA EMPRESA</td>
                            <td style="padding:10px; text-align:center;">${metricas.totalPropostas}</td>
                            <td style="padding:10px; text-align:center; color:#15803d;">${metricas.qtdFechados}</td>
                            <td style="padding:10px; text-align:center; color:#0284c7;">${fmtPct(metricas.taxaConversao)}</td>
                            <td style="padding:10px; text-align:right;">${fmtMoeda(metricas.valorProposto)}</td>
                            <td style="padding:10px; text-align:right; color:#0f766e;">${fmtMoeda(metricas.valorContratado)}</td>
                            <td style="padding:10px; text-align:right;">${fmtMoeda(metricas.ticketMedio)}</td>
                            <td style="padding:10px; text-align:center; color:#dc2626;">${metricas.qtdPerdidas}</td>
                            <td style="padding:10px; text-align:center;">${metricas.tempoMedioFechamento > 0 ? metricas.tempoMedioFechamento.toFixed(1) + ' dias' : '—'}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        `;

        createChart('chart-vend-ranking-contratos', {
            type: 'bar',
            data: {
                labels: rankPorContratos.map(v => v.nome),
                datasets: [
                    { label: 'Contratos Fechados', data: rankPorContratos.map(v => v.fechados), backgroundColor: '#16a34a', borderRadius: 6 },
                    { label: 'Propostas Enviadas', data: rankPorContratos.map(v => v.propostas), backgroundColor: '#cbd5e1', borderRadius: 6 }
                ]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'top' } },
                scales: { x: { beginAtZero: true, ticks: { precision: 0 } } }
            }
        });

        createChart('chart-vend-ranking-conversao', {
            type: 'bar',
            data: {
                labels: rankPorConversao.map(v => v.nome),
                datasets: [{
                    label: 'Taxa de Conversão (%)',
                    data: rankPorConversao.map(v => Number(v.taxaConversao.toFixed(1))),
                    backgroundColor: '#0284c7',
                    borderRadius: 6
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'top' } },
                scales: { x: { beginAtZero: true, max: 100, ticks: { callback: v => v + '%' } } }
            }
        });
    }

    // =========================================================================
    // ABA 3: DESEMPENHO POR PRODUTO (SEÇÃO 3)
    // =========================================================================
    function renderAbaProdutos(box, filtradas, metricas) {
        const produtos = calcularDesempenhoProdutos(filtradas);
        const produtosComMovimento = produtos.filter(p => p.propostas > 0 || CATEGORIAS_PRODUTOS_PADRAO.some(c => c.key === p.key));

        box.innerHTML = `
            ${renderCardsKpisPrincipais(metricas)}

            <!-- Linha 1: (1 e 2) Propostas x Contratos por Produto + (3) Taxa de Conversão por Produto -->
            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(460px, 1fr)); gap:1rem; margin-bottom:1rem;">
                <div style="background:#fff; border:1px solid #e2e8f0; border-radius:12px; padding:1.1rem;">
                    <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:0.75rem;">
                        <div>
                            <h3 style="margin:0; font-size:0.95rem; font-weight:800; color:#0f172a;">1 & 2. Propostas Enviadas x Contratos Fechados por Produto</h3>
                            <p style="margin:2px 0 0; font-size:0.75rem; color:#64748b;">Identifica quais equipamentos têm maior procura e quais efetivamente geram contratos</p>
                        </div>
                        <span style="background:#f5f3ff; color:#6d28d9; font-size:0.7rem; font-weight:800; padding:3px 9px; border-radius:999px;">Prioridade Diretoria #3</span>
                    </div>
                    <div style="height:280px; position:relative;"><canvas id="chart-prod-prop-x-fech"></canvas></div>
                </div>

                <div style="background:#fff; border:1px solid #e2e8f0; border-radius:12px; padding:1.1rem;">
                    <div style="margin-bottom:0.75rem;">
                        <h3 style="margin:0; font-size:0.95rem; font-weight:800; color:#0f172a;">3. Taxa de Conversão por Produto (%)</h3>
                        <p style="margin:2px 0 0; font-size:0.75rem; color:#64748b;">Descubra se algum equipamento recebe muitas solicitações mas apresenta baixa conversão</p>
                    </div>
                    <div style="height:280px; position:relative;"><canvas id="chart-prod-conversao"></canvas></div>
                </div>
            </div>

            <!-- Linha 2: (4) Faturamento Contratado por Produto + (5) Ticket Médio + (6) Participação % nas Vendas -->
            <div style="display:grid; grid-template-columns:1.2fr 1.2fr 0.9fr; gap:1rem; margin-bottom:1rem;">
                <div style="background:#fff; border:1px solid #e2e8f0; border-radius:12px; padding:1.1rem;">
                    <div style="margin-bottom:0.75rem;">
                        <h3 style="margin:0; font-size:0.95rem; font-weight:800; color:#0f172a;">4. Faturamento Contratado por Produto (R$)</h3>
                        <p style="margin:2px 0 0; font-size:0.75rem; color:#64748b;">Receita gerada por linha de equipamento</p>
                    </div>
                    <div style="height:255px; position:relative;"><canvas id="chart-prod-faturamento"></canvas></div>
                </div>

                <div style="background:#fff; border:1px solid #e2e8f0; border-radius:12px; padding:1.1rem;">
                    <div style="margin-bottom:0.75rem;">
                        <h3 style="margin:0; font-size:0.95rem; font-weight:800; color:#0f172a;">5. Ticket Médio por Produto (R$)</h3>
                        <p style="margin:2px 0 0; font-size:0.75rem; color:#64748b;">Valor médio contratado quando o equipamento é fechado</p>
                    </div>
                    <div style="height:255px; position:relative;"><canvas id="chart-prod-ticket"></canvas></div>
                </div>

                <div style="background:#fff; border:1px solid #e2e8f0; border-radius:12px; padding:1.1rem;">
                    <div style="margin-bottom:0.75rem;">
                        <h3 style="margin:0; font-size:0.95rem; font-weight:800; color:#0f172a;">6. Participação % nas Vendas</h3>
                        <p style="margin:2px 0 0; font-size:0.75rem; color:#64748b;">Share de faturamento por produto</p>
                    </div>
                    <div style="height:255px; position:relative;"><canvas id="chart-prod-share"></canvas></div>
                </div>
            </div>

            <!-- Tabela Detalhada por Produto -->
            <div style="background:#fff; border:1px solid #e2e8f0; border-radius:12px; padding:1.1rem; overflow-x:auto;">
                <h3 style="margin:0 0 0.75rem; font-size:0.96rem; font-weight:800; color:#0f172a;">Detalhamento Comercial por Equipamento / Categoria</h3>
                <table style="width:100%; border-collapse:collapse; font-size:0.81rem;">
                    <thead>
                        <tr style="background:#f8fafc; border-bottom:2px solid #e2e8f0; color:#475569; text-align:left;">
                            <th style="padding:10px;">Equipamento / Categoria</th>
                            <th style="padding:10px; text-align:center;">Propostas Enviadas</th>
                            <th style="padding:10px; text-align:center;">Contratos Fechados</th>
                            <th style="padding:10px; text-align:center;">Unid. Locadas</th>
                            <th style="padding:10px; text-align:center;">Taxa de Conversão</th>
                            <th style="padding:10px; text-align:right;">Valor Proposto</th>
                            <th style="padding:10px; text-align:right;">Faturamento Contratado</th>
                            <th style="padding:10px; text-align:right;">Ticket Médio</th>
                            <th style="padding:10px; text-align:center;">Participação (%)</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${produtosComMovimento.map(pr => `
                            <tr style="border-bottom:1px solid #f1f5f9;">
                                <td style="padding:10px; font-weight:800; color:#0f172a;">${escHtml(pr.label)}</td>
                                <td style="padding:10px; text-align:center; font-weight:700;">${pr.propostas}</td>
                                <td style="padding:10px; text-align:center; font-weight:800; color:#15803d;">${pr.fechados}</td>
                                <td style="padding:10px; text-align:center; color:#475569;">${pr.unidadesFechadas} un.</td>
                                <td style="padding:10px; text-align:center; font-weight:800; color:#0284c7;">${fmtPct(pr.taxaConversao)}</td>
                                <td style="padding:10px; text-align:right; color:#64748b;">${fmtMoeda(pr.valorProposto)}</td>
                                <td style="padding:10px; text-align:right; font-weight:800; color:#0f766e;">${fmtMoeda(pr.faturamentoContratado)}</td>
                                <td style="padding:10px; text-align:right; font-weight:700;">${fmtMoeda(pr.ticketMedio)}</td>
                                <td style="padding:10px; text-align:center;">
                                    <span style="background:#f1f5f9; color:#334155; padding:2px 8px; border-radius:999px; font-weight:700; font-size:0.75rem;">${fmtPct(pr.participacaoPct)}</span>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;

        const labelsProd = produtosComMovimento.map(p => p.short);
        const palette = ['#7048e8', '#0284c7', '#16a34a', '#0d9488', '#eab308', '#ea580c', '#db2777', '#6366f1', '#64748b'];

        createChart('chart-prod-prop-x-fech', {
            type: 'bar',
            data: {
                labels: labelsProd,
                datasets: [
                    { label: 'Propostas', data: produtosComMovimento.map(p => p.propostas), backgroundColor: '#7048e8', borderRadius: 5 },
                    { label: 'Fechados', data: produtosComMovimento.map(p => p.fechados), backgroundColor: '#16a34a', borderRadius: 5 }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'top' } },
                scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }
            }
        });

        createChart('chart-prod-conversao', {
            type: 'bar',
            data: {
                labels: labelsProd,
                datasets: [{
                    label: 'Conversão (%)',
                    data: produtosComMovimento.map(p => Number(p.taxaConversao.toFixed(1))),
                    backgroundColor: '#0284c7',
                    borderRadius: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'top' } },
                scales: { y: { beginAtZero: true, max: 100, ticks: { callback: v => v + '%' } } }
            }
        });

        createChart('chart-prod-faturamento', {
            type: 'bar',
            data: {
                labels: labelsProd,
                datasets: [{
                    label: 'Faturamento Contratado (R$)',
                    data: produtosComMovimento.map(p => Number(p.faturamentoContratado.toFixed(2))),
                    backgroundColor: '#0d9488',
                    borderRadius: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true, ticks: { callback: v => fmtMoedaCurta(v) } } }
            }
        });

        createChart('chart-prod-ticket', {
            type: 'bar',
            data: {
                labels: labelsProd,
                datasets: [{
                    label: 'Ticket Médio (R$)',
                    data: produtosComMovimento.map(p => Number(p.ticketMedio.toFixed(2))),
                    backgroundColor: '#7c3aed',
                    borderRadius: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true, ticks: { callback: v => fmtMoedaCurta(v) } } }
            }
        });

        const comReceita = produtosComMovimento.filter(p => p.faturamentoContratado > 0);
        createChart('chart-prod-share', {
            type: 'doughnut',
            data: {
                labels: (comReceita.length ? comReceita : produtosComMovimento).map(p => p.short),
                datasets: [{
                    data: (comReceita.length ? comReceita : produtosComMovimento).map(p => Number(p.faturamentoContratado.toFixed(2)) || p.propostas),
                    backgroundColor: palette
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } } }
            }
        });
    }

    // =========================================================================
    // ABA 4: DESEMPENHO POR TIPO DE CONTRATO (SEÇÃO 4)
    // =========================================================================
    function renderAbaTiposContrato(box, filtradas, metricas) {
        const tipos = calcularDesempenhoTiposContrato(filtradas);

        // Série mensal por tipo (Obras x Eventos x Limpa Fossa x Equipamentos) para sazonalidade
        const mesesSet = new Set();
        const hoje = new Date();
        for (let i = 5; i >= 0; i--) {
            mesesSet.add(getMesAnoKey(new Date(hoje.getFullYear(), hoje.getMonth() - i, 1)));
        }
        filtradas.forEach(p => { if (p.mesEnvio) mesesSet.add(p.mesEnvio); });
        const mesesOrdenados = Array.from(mesesSet).sort();

        const serieSazonalidade = (fnMatch) => mesesOrdenados.map(ym => {
            return filtradas
                .filter(p => p.mesEnvio === ym && p._isFechado && fnMatch(p))
                .reduce((a, p) => a + p.valorTotal, 0);
        });

        box.innerHTML = `
            ${renderCardsKpisPrincipais(metricas)}

            <!-- Linha 1: (1) Propostas x Fechamentos por Tipo + (4) Conversão por Tipo (Destaque #4 Diretoria) -->
            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(460px, 1fr)); gap:1rem; margin-bottom:1rem;">
                <div style="background:#fff; border:1px solid #e2e8f0; border-radius:12px; padding:1.1rem;">
                    <div style="margin-bottom:0.75rem;">
                        <h3 style="margin:0; font-size:0.95rem; font-weight:800; color:#0f172a;">1. Propostas x Fechamentos por Tipo de Contrato</h3>
                        <p style="margin:2px 0 0; font-size:0.75rem; color:#64748b;">Comparativo entre Obras, Eventos, Recorrentes, Pontuais, Longo e Curto Prazo</p>
                    </div>
                    <div style="height:275px; position:relative;"><canvas id="chart-tipo-prop-x-fech"></canvas></div>
                </div>

                <div style="background:#fff; border:1px solid #e2e8f0; border-radius:12px; padding:1.1rem;">
                    <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:0.75rem;">
                        <div>
                            <h3 style="margin:0; font-size:0.95rem; font-weight:800; color:#0f172a;">4. Taxa de Conversão por Tipo de Contrato (%)</h3>
                            <p style="margin:2px 0 0; font-size:0.75rem; color:#64748b;">Descubra onde a América Rental converte melhor (Obras x Eventos x Recorrentes)</p>
                        </div>
                        <span style="background:#e0f2fe; color:#0369a1; font-size:0.7rem; font-weight:800; padding:3px 9px; border-radius:999px;">Prioridade Diretoria #4</span>
                    </div>
                    <div style="height:275px; position:relative;"><canvas id="chart-tipo-conversao"></canvas></div>
                </div>
            </div>

            <!-- Linha 2: (2) Faturamento por Tipo + (3) Ticket Médio por Tipo + (5) Evolução Mensal / Sazonalidade -->
            <div style="display:grid; grid-template-columns:1fr 1fr 1.3fr; gap:1rem; margin-bottom:1rem;">
                <div style="background:#fff; border:1px solid #e2e8f0; border-radius:12px; padding:1.1rem;">
                    <div style="margin-bottom:0.75rem;">
                        <h3 style="margin:0; font-size:0.95rem; font-weight:800; color:#0f172a;">2. Faturamento por Tipo (R$)</h3>
                        <p style="margin:2px 0 0; font-size:0.75rem; color:#64748b;">Maior fonte de receita contratada</p>
                    </div>
                    <div style="height:255px; position:relative;"><canvas id="chart-tipo-faturamento"></canvas></div>
                </div>

                <div style="background:#fff; border:1px solid #e2e8f0; border-radius:12px; padding:1.1rem;">
                    <div style="margin-bottom:0.75rem;">
                        <h3 style="margin:0; font-size:0.95rem; font-weight:800; color:#0f172a;">3. Ticket Médio por Tipo (R$)</h3>
                        <p style="margin:2px 0 0; font-size:0.75rem; color:#64748b;">Valor médio de cada contrato fechado</p>
                    </div>
                    <div style="height:255px; position:relative;"><canvas id="chart-tipo-ticket"></canvas></div>
                </div>

                <div style="background:#fff; border:1px solid #e2e8f0; border-radius:12px; padding:1.1rem;">
                    <div style="margin-bottom:0.75rem;">
                        <h3 style="margin:0; font-size:0.95rem; font-weight:800; color:#0f172a;">5. Evolução Mensal por Tipo (Sazonalidade)</h3>
                        <p style="margin:2px 0 0; font-size:0.75rem; color:#64748b;">Faturamento mensal de Obras x Eventos x Limpa Fossa</p>
                    </div>
                    <div style="height:255px; position:relative;"><canvas id="chart-tipo-sazonalidade"></canvas></div>
                </div>
            </div>

            <!-- Tabela Resumo por Finalidade Comercial -->
            <div style="background:#fff; border:1px solid #e2e8f0; border-radius:12px; padding:1.1rem; overflow-x:auto;">
                <h3 style="margin:0 0 0.75rem; font-size:0.96rem; font-weight:800; color:#0f172a;">Quadro Comparativo por Finalidade Comercial e Duração</h3>
                <table style="width:100%; border-collapse:collapse; font-size:0.81rem;">
                    <thead>
                        <tr style="background:#f8fafc; border-bottom:2px solid #e2e8f0; color:#475569; text-align:left;">
                            <th style="padding:10px;">Finalidade / Classificação do Contrato</th>
                            <th style="padding:10px; text-align:center;">Propostas</th>
                            <th style="padding:10px; text-align:center;">Contratos Fechados</th>
                            <th style="padding:10px; text-align:center;">Taxa de Conversão</th>
                            <th style="padding:10px; text-align:right;">Valor Proposto</th>
                            <th style="padding:10px; text-align:right;">Faturamento Contratado</th>
                            <th style="padding:10px; text-align:right;">Ticket Médio</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tipos.map(t => `
                            <tr style="border-bottom:1px solid #f1f5f9;">
                                <td style="padding:10px; font-weight:800; color:#0f172a;">${escHtml(t.label)}</td>
                                <td style="padding:10px; text-align:center; font-weight:700;">${t.propostas}</td>
                                <td style="padding:10px; text-align:center; font-weight:800; color:#15803d;">${t.fechados}</td>
                                <td style="padding:10px; text-align:center; font-weight:800; color:#0284c7;">${fmtPct(t.taxaConversao)}</td>
                                <td style="padding:10px; text-align:right; color:#64748b;">${fmtMoeda(t.valorProposto)}</td>
                                <td style="padding:10px; text-align:right; font-weight:800; color:#0f766e;">${fmtMoeda(t.faturamento)}</td>
                                <td style="padding:10px; text-align:right; font-weight:700;">${fmtMoeda(t.ticketMedio)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;

        const labelsTipo = tipos.map(t => t.label.replace(' (≥ 30d)', '').replace(' (< 30d)', ''));

        createChart('chart-tipo-prop-x-fech', {
            type: 'bar',
            data: {
                labels: labelsTipo,
                datasets: [
                    { label: 'Propostas', data: tipos.map(t => t.propostas), backgroundColor: '#7048e8', borderRadius: 5 },
                    { label: 'Fechados', data: tipos.map(t => t.fechados), backgroundColor: '#16a34a', borderRadius: 5 }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'top' } },
                scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }
            }
        });

        createChart('chart-tipo-conversao', {
            type: 'bar',
            data: {
                labels: labelsTipo,
                datasets: [{
                    label: 'Conversão (%)',
                    data: tipos.map(t => Number(t.taxaConversao.toFixed(1))),
                    backgroundColor: '#0284c7',
                    borderRadius: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true, max: 100, ticks: { callback: v => v + '%' } } }
            }
        });

        createChart('chart-tipo-faturamento', {
            type: 'bar',
            data: {
                labels: labelsTipo,
                datasets: [{
                    label: 'Faturamento (R$)',
                    data: tipos.map(t => Number(t.faturamento.toFixed(2))),
                    backgroundColor: '#0d9488',
                    borderRadius: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true, ticks: { callback: v => fmtMoedaCurta(v) } } }
            }
        });

        createChart('chart-tipo-ticket', {
            type: 'bar',
            data: {
                labels: labelsTipo,
                datasets: [{
                    label: 'Ticket Médio (R$)',
                    data: tipos.map(t => Number(t.ticketMedio.toFixed(2))),
                    backgroundColor: '#7c3aed',
                    borderRadius: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true, ticks: { callback: v => fmtMoedaCurta(v) } } }
            }
        });

        createChart('chart-tipo-sazonalidade', {
            type: 'line',
            data: {
                labels: mesesOrdenados.map(formatMesAnoLabel),
                datasets: [
                    { label: 'Obras', data: serieSazonalidade(p => p.isObra), borderColor: '#7048e8', backgroundColor: '#7048e8', tension: 0.3 },
                    { label: 'Eventos', data: serieSazonalidade(p => p.isEvento), borderColor: '#0284c7', backgroundColor: '#0284c7', tension: 0.3 },
                    { label: 'Limpa Fossa', data: serieSazonalidade(p => p.isLimpaFossa), borderColor: '#0d9488', backgroundColor: '#0d9488', tension: 0.3 }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'top' } },
                scales: { y: { beginAtZero: true, ticks: { callback: v => fmtMoedaCurta(v) } } }
            }
        });
    }

    // =========================================================================
    // ABA 5: ANÁLISE DE PERDAS COMERCIAIS (SEÇÃO 5)
    // =========================================================================
    function renderAbaPerdas(box, filtradas, metricas) {
        const perdas = calcularAnalisePerdas(filtradas);
        const fmtCliente = (nome) => typeof window.formatarNomeClienteComIcone === 'function'
            ? window.formatarNomeClienteComIcone(nome)
            : nome;

        box.innerHTML = `
            <!-- Cards específicos do Módulo 5: Perdas Comerciais -->
            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(215px, 1fr)); gap:0.85rem; margin-bottom:1.15rem;">
                <div style="background:#fff; border:1px solid #fecaca; border-left:4px solid #dc2626; border-radius:12px; padding:0.95rem 1.1rem;">
                    <div style="font-size:0.74rem; font-weight:800; color:#991b1b;">Total Perdido (Período)</div>
                    <div style="font-size:1.55rem; font-weight:900; color:#dc2626; margin:4px 0;">${perdas.totalPerdidasQtd} propostas</div>
                    <div style="font-size:0.78rem; color:#7f1d1d; font-weight:700;">${fmtMoeda(perdas.totalPerdidasVal)}</div>
                </div>

                <div style="background:#fff; border:1px solid #e2e8f0; border-left:4px solid #f59e0b; border-radius:12px; padding:0.95rem 1.1rem;">
                    <div style="font-size:0.74rem; font-weight:800; color:#64748b;">Propostas Recusadas por Preço</div>
                    <div style="font-size:1.55rem; font-weight:900; color:#b45309; margin:4px 0;">${perdas.porPreco.quantidade}</div>
                    <div style="font-size:0.78rem; color:#475569; font-weight:700;">${fmtMoeda(perdas.porPreco.valor)}</div>
                </div>

                <div style="background:#fff; border:1px solid #e2e8f0; border-left:4px solid #7c3aed; border-radius:12px; padding:0.95rem 1.1rem;">
                    <div style="font-size:0.74rem; font-weight:800; color:#64748b;">Perdidas para Concorrentes</div>
                    <div style="font-size:1.55rem; font-weight:900; color:#6d28d9; margin:4px 0;">${perdas.paraConcorrente.quantidade}</div>
                    <div style="font-size:0.78rem; color:#475569; font-weight:700;">${fmtMoeda(perdas.paraConcorrente.valor)}</div>
                </div>

                <div style="background:#fff; border:1px solid #e2e8f0; border-left:4px solid #0284c7; border-radius:12px; padding:0.95rem 1.1rem;">
                    <div style="font-size:0.74rem; font-weight:800; color:#64748b;">Sem Retorno do Cliente</div>
                    <div style="font-size:1.55rem; font-weight:900; color:#0369a1; margin:4px 0;">${perdas.semRetorno.quantidade}</div>
                    <div style="font-size:0.78rem; color:#475569; font-weight:700;">${fmtMoeda(perdas.semRetorno.valor)}</div>
                </div>

                <div style="background:#fff; border:1px solid #e2e8f0; border-left:4px solid #64748b; border-radius:12px; padding:0.95rem 1.1rem;">
                    <div style="font-size:0.74rem; font-weight:800; color:#64748b;">Canceladas pelo Cliente</div>
                    <div style="font-size:1.55rem; font-weight:900; color:#334155; margin:4px 0;">${perdas.canceladasCliente.quantidade}</div>
                    <div style="font-size:0.78rem; color:#475569; font-weight:700;">${fmtMoeda(perdas.canceladasCliente.valor)}</div>
                </div>
            </div>

            <!-- Gráficos: Motivos de Perda (Quantidade) x Valor Financeiro Perdido por Motivo -->
            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(460px, 1fr)); gap:1rem; margin-bottom:1rem;">
                <div style="background:#fff; border:1px solid #e2e8f0; border-radius:12px; padding:1.1rem;">
                    <div style="margin-bottom:0.75rem;">
                        <h3 style="margin:0; font-size:0.95rem; font-weight:800; color:#0f172a;">1. Motivos de Perda e Não Fechamento (Quantidade)</h3>
                        <p style="margin:2px 0 0; font-size:0.75rem; color:#64748b;">Distribuição por motivos padronizados da América Rental</p>
                    </div>
                    <div style="height:285px; position:relative;"><canvas id="chart-perdas-qtd"></canvas></div>
                </div>

                <div style="background:#fff; border:1px solid #e2e8f0; border-radius:12px; padding:1.1rem;">
                    <div style="margin-bottom:0.75rem;">
                        <h3 style="margin:0; font-size:0.95rem; font-weight:800; color:#0f172a;">2. Valor Financeiro por Motivo de Não Fechamento (R$)</h3>
                        <p style="margin:2px 0 0; font-size:0.75rem; color:#64748b;">Impacto financeiro das oportunidades perdidas ou em aberto</p>
                    </div>
                    <div style="height:285px; position:relative;"><canvas id="chart-perdas-valor"></canvas></div>
                </div>
            </div>

            <!-- Tabela Detalhada das Propostas Não Convertidas -->
            <div style="background:#fff; border:1px solid #e2e8f0; border-radius:12px; padding:1.1rem; overflow-x:auto;">
                <h3 style="margin:0 0 0.75rem; font-size:0.96rem; font-weight:800; color:#0f172a;">Relação de Propostas Perdidas, Canceladas, Sem Retorno ou em Negociação</h3>
                <table style="width:100%; border-collapse:collapse; font-size:0.8rem;">
                    <thead>
                        <tr style="background:#f8fafc; border-bottom:2px solid #e2e8f0; color:#475569; text-align:left;">
                            <th style="padding:9px;">Proposta</th>
                            <th style="padding:9px;">Cliente</th>
                            <th style="padding:9px;">Vendedor</th>
                            <th style="padding:9px;">Tipo</th>
                            <th style="padding:9px;">Data Envio</th>
                            <th style="padding:9px;">Motivo Padronizado</th>
                            <th style="padding:9px; text-align:right;">Valor</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${perdas.listaDetalhada.length === 0 ? `
                            <tr><td colspan="7" style="padding:18px; text-align:center; color:#94a3b8;">Nenhuma proposta perdida ou pendente no filtro atual.</td></tr>
                        ` : perdas.listaDetalhada.slice(0, 60).map(p => `
                            <tr style="border-bottom:1px solid #f1f5f9;">
                                <td style="padding:9px; font-weight:800; color:#7048e8;">#${escHtml(p.codigo)}</td>
                                <td style="padding:9px; font-weight:700; color:#0f172a;">${escHtml(fmtCliente(p.cliente_nome))}</td>
                                <td style="padding:9px; color:#334155;">${escHtml(p.vendedor)}</td>
                                <td style="padding:9px; color:#475569;">${escHtml(p.tipoBruto)}</td>
                                <td style="padding:9px; color:#64748b;">${p.dtEnvio ? p.dtEnvio.toLocaleDateString('pt-BR') : '—'}</td>
                                <td style="padding:9px;">
                                    <span style="background:${p.motivoPerdaPadronizado === 'Proposta em negociação' ? '#e0f2fe' : '#fee2e2'}; color:${p.motivoPerdaPadronizado === 'Proposta em negociação' ? '#0369a1' : '#b91c1c'}; padding:2px 9px; border-radius:999px; font-weight:700; font-size:0.74rem;">
                                        ${escHtml(p.motivoPerdaPadronizado)}
                                    </span>
                                </td>
                                <td style="padding:9px; text-align:right; font-weight:800; color:#0f172a;">${fmtMoeda(p.valorTotal)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;

        const labelsMot = perdas.porMotivo.map(m => m.motivo);
        createChart('chart-perdas-qtd', {
            type: 'bar',
            data: {
                labels: labelsMot,
                datasets: [{
                    label: 'Quantidade de Propostas',
                    data: perdas.porMotivo.map(m => m.quantidade),
                    backgroundColor: ['#dc2626', '#7c3aed', '#475569', '#0284c7', '#ea580c', '#d97706', '#0d9488', '#94a3b8'],
                    borderRadius: 6
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { x: { beginAtZero: true, ticks: { precision: 0 } } }
            }
        });

        createChart('chart-perdas-valor', {
            type: 'bar',
            data: {
                labels: labelsMot,
                datasets: [{
                    label: 'Valor Financeiro (R$)',
                    data: perdas.porMotivo.map(m => Number(m.valor.toFixed(2))),
                    backgroundColor: '#dc2626',
                    borderRadius: 6
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { x: { beginAtZero: true, ticks: { callback: v => fmtMoedaCurta(v) } } }
            }
        });
    }

    // =========================================================================
    // ABA 6: EVOLUÇÃO COMERCIAL E COMPARATIVOS (SEÇÃO 6)
    // =========================================================================
    function renderAbaComparativos(box, todasProcessadas, filtradas, metricas) {
        const baseSemPeriodo = filtrarPropostas(todasProcessadas, { ignorarPeriodo: true });
        const hoje = new Date();
        const ymAtual = getMesAnoKey(hoje);
        const dtMesAnt = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
        const ymAnterior = getMesAnoKey(dtMesAnt);
        const anoAtual = hoje.getFullYear();
        const anoAnterior = anoAtual - 1;

        const calcResumoSubset = (lista) => {
            const prop = lista.length;
            const fech = lista.filter(p => p._isFechado);
            const valProp = lista.reduce((a, p) => a + p.valorTotal, 0);
            const valFech = fech.reduce((a, p) => a + p.valorTotal, 0);
            const conv = prop > 0 ? (fech.length / prop) * 100 : 0;
            const ticket = fech.length > 0 ? (valFech / fech.length) : 0;
            return { prop, fech: fech.length, valProp, valFech, conv, ticket };
        };

        const mesAt = calcResumoSubset(baseSemPeriodo.filter(p => p.mesEnvio === ymAtual));
        const mesAn = calcResumoSubset(baseSemPeriodo.filter(p => p.mesEnvio === ymAnterior));
        const anoAt = calcResumoSubset(baseSemPeriodo.filter(p => p.anoEnvio === anoAtual));
        const anoAn = calcResumoSubset(baseSemPeriodo.filter(p => p.anoEnvio === anoAnterior));
        const obrasRes = calcResumoSubset(filtradas.filter(p => p.isObra));
        const eventosRes = calcResumoSubset(filtradas.filter(p => p.isEvento));

        const badgeVar = (atual, ant) => {
            if (!ant && !atual) return '<span style="color:#64748b;font-size:0.74rem;">0%</span>';
            if (!ant) return '<span style="color:#15803d;font-weight:800;font-size:0.74rem;">+100%</span>';
            const diff = ((atual - ant) / ant) * 100;
            const cor = diff >= 0 ? '#15803d' : '#dc2626';
            const sinal = diff >= 0 ? '+' : '';
            return `<span style="color:${cor};font-weight:800;font-size:0.75rem;">${sinal}${diff.toFixed(1)}%</span>`;
        };

        const seriesMensais = obterSériesMensais(filtradas, todasProcessadas);
        // Cálculo de crescimento % do faturamento mês a mês e conversão acumulada no ano
        let acumProp = 0;
        let acumFech = 0;
        const seriesEstrategicas = seriesMensais.map((m, idx) => {
            const antVal = idx > 0 ? seriesMensais[idx - 1].valorContratado : 0;
            const crescFatPct = antVal > 0 ? (((m.valorContratado - antVal) / antVal) * 100) : (m.valorContratado > 0 ? 100 : 0);
            acumProp += m.propostas;
            acumFech += m.fechados;
            const convAcum = acumProp > 0 ? ((acumFech / acumProp) * 100) : 0;
            return {
                ...m,
                crescFatPct: Number(crescFatPct.toFixed(1)),
                convAcum: Number(convAcum.toFixed(1))
            };
        });

        box.innerHTML = `
            <!-- 3 Grandes Quadros Comparativos da Diretoria -->
            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(340px, 1fr)); gap:1rem; margin-bottom:1.15rem;">
                <!-- Mês Atual x Mês Anterior -->
                <div style="background:#fff; border:1px solid #e2e8f0; border-top:4px solid #7048e8; border-radius:12px; padding:1rem 1.15rem;">
                    <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:0.65rem;">
                        <span style="font-size:0.84rem; font-weight:800; color:#0f172a;">Mês Atual (${formatMesAnoLabel(ymAtual)}) x Mês Anterior (${formatMesAnoLabel(ymAnterior)})</span>
                        <span style="background:#f5f3ff; color:#6d28d9; font-size:0.7rem; font-weight:800; padding:2px 8px; border-radius:999px;">Evolução Mensal</span>
                    </div>
                    <div style="display:flex; flex-direction:column; gap:6px; font-size:0.8rem;">
                        <div style="display:flex; justify-content:space-between;"><span>Propostas:</span> <span><strong>${mesAt.prop}</strong> vs ${mesAn.prop} (${badgeVar(mesAt.prop, mesAn.prop)})</span></div>
                        <div style="display:flex; justify-content:space-between;"><span>Contratos Fechados:</span> <span><strong>${mesAt.fech}</strong> vs ${mesAn.fech} (${badgeVar(mesAt.fech, mesAn.fech)})</span></div>
                        <div style="display:flex; justify-content:space-between;"><span>Taxa de Conversão:</span> <span><strong>${fmtPct(mesAt.conv)}</strong> vs ${fmtPct(mesAn.conv)}</span></div>
                        <div style="display:flex; justify-content:space-between;"><span>Valor Contratado:</span> <span><strong>${fmtMoedaCurta(mesAt.valFech)}</strong> vs ${fmtMoedaCurta(mesAn.valFech)} (${badgeVar(mesAt.valFech, mesAn.valFech)})</span></div>
                    </div>
                </div>

                <!-- Ano Atual x Ano Anterior -->
                <div style="background:#fff; border:1px solid #e2e8f0; border-top:4px solid #0284c7; border-radius:12px; padding:1rem 1.15rem;">
                    <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:0.65rem;">
                        <span style="font-size:0.84rem; font-weight:800; color:#0f172a;">Ano Atual (${anoAtual}) x Ano Anterior (${anoAnterior})</span>
                        <span style="background:#e0f2fe; color:#0369a1; font-size:0.7rem; font-weight:800; padding:2px 8px; border-radius:999px;">Crescimento Anual</span>
                    </div>
                    <div style="display:flex; flex-direction:column; gap:6px; font-size:0.8rem;">
                        <div style="display:flex; justify-content:space-between;"><span>Propostas no Ano:</span> <span><strong>${anoAt.prop}</strong> vs ${anoAn.prop} (${badgeVar(anoAt.prop, anoAn.prop)})</span></div>
                        <div style="display:flex; justify-content:space-between;"><span>Contratos Fechados:</span> <span><strong>${anoAt.fech}</strong> vs ${anoAn.fech} (${badgeVar(anoAt.fech, anoAn.fech)})</span></div>
                        <div style="display:flex; justify-content:space-between;"><span>Taxa de Conversão:</span> <span><strong>${fmtPct(anoAt.conv)}</strong> vs ${fmtPct(anoAn.conv)}</span></div>
                        <div style="display:flex; justify-content:space-between;"><span>Faturamento Anual:</span> <span><strong>${fmtMoedaCurta(anoAt.valFech)}</strong> vs ${fmtMoedaCurta(anoAn.valFech)} (${badgeVar(anoAt.valFech, anoAn.valFech)})</span></div>
                    </div>
                </div>

                <!-- Obras x Eventos (Mudança no perfil de vendas) -->
                <div style="background:#fff; border:1px solid #e2e8f0; border-top:4px solid #0d9488; border-radius:12px; padding:1rem 1.15rem;">
                    <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:0.65rem;">
                        <span style="font-size:0.84rem; font-weight:800; color:#0f172a;">Obras x Eventos (Perfil de Vendas)</span>
                        <span style="background:#ccfbf1; color:#0f766e; font-size:0.7rem; font-weight:800; padding:2px 8px; border-radius:999px;">Recorrência x Volume</span>
                    </div>
                    <div style="display:flex; flex-direction:column; gap:6px; font-size:0.8rem;">
                        <div style="display:flex; justify-content:space-between;"><span>Contratos Fechados:</span> <span>Obras: <strong>${obrasRes.fech}</strong> · Eventos: <strong>${eventosRes.fech}</strong></span></div>
                        <div style="display:flex; justify-content:space-between;"><span>Taxa de Conversão:</span> <span>Obras: <strong>${fmtPct(obrasRes.conv)}</strong> · Eventos: <strong>${fmtPct(eventosRes.conv)}</strong></span></div>
                        <div style="display:flex; justify-content:space-between;"><span>Faturamento:</span> <span>Obras: <strong>${fmtMoedaCurta(obrasRes.valFech)}</strong> · Eventos: <strong>${fmtMoedaCurta(eventosRes.valFech)}</strong></span></div>
                        <div style="display:flex; justify-content:space-between;"><span>Ticket Médio:</span> <span>Obras: <strong>${fmtMoedaCurta(obrasRes.ticket)}</strong> · Eventos: <strong>${fmtMoedaCurta(eventosRes.ticket)}</strong></span></div>
                    </div>
                </div>
            </div>

            <!-- 4 Gráficos Recomendados na Seção 6 -->
            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(460px, 1fr)); gap:1rem; margin-bottom:1rem;">
                <div style="background:#fff; border:1px solid #e2e8f0; border-radius:12px; padding:1.1rem;">
                    <h3 style="margin:0 0 0.2rem; font-size:0.95rem; font-weight:800; color:#0f172a;">1. Evolução Mensal de Propostas Enviadas</h3>
                    <p style="margin:0 0 0.75rem; font-size:0.75rem; color:#64748b;">Curva de geração de demanda comercial ao longo dos meses</p>
                    <div style="height:255px; position:relative;"><canvas id="chart-comp-evol-prop"></canvas></div>
                </div>

                <div style="background:#fff; border:1px solid #e2e8f0; border-radius:12px; padding:1.1rem;">
                    <h3 style="margin:0 0 0.2rem; font-size:0.95rem; font-weight:800; color:#0f172a;">2. Evolução Mensal de Contratos Fechados</h3>
                    <p style="margin:0 0 0.75rem; font-size:0.75rem; color:#64748b;">Curva de efetivação de contratos ao longo dos meses</p>
                    <div style="height:255px; position:relative;"><canvas id="chart-comp-evol-fech"></canvas></div>
                </div>
            </div>

            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(460px, 1fr)); gap:1rem;">
                <div style="background:#fff; border:1px solid #e2e8f0; border-radius:12px; padding:1.1rem;">
                    <h3 style="margin:0 0 0.2rem; font-size:0.95rem; font-weight:800; color:#0f172a;">3. Crescimento Percentual do Faturamento Mês a Mês (%)</h3>
                    <p style="margin:0 0 0.75rem; font-size:0.75rem; color:#64748b;">Variação percentual da receita contratada em relação ao mês anterior</p>
                    <div style="height:255px; position:relative;"><canvas id="chart-comp-cresc-fat"></canvas></div>
                </div>

                <div style="background:#fff; border:1px solid #e2e8f0; border-radius:12px; padding:1.1rem;">
                    <h3 style="margin:0 0 0.2rem; font-size:0.95rem; font-weight:800; color:#0f172a;">4. Conversão Acumulada no Período / Ano (%)</h3>
                    <p style="margin:0 0 0.75rem; font-size:0.75rem; color:#64748b;">Eficiência comercial acumulada (Total fechado acumulado ÷ Total enviado acumulado)</p>
                    <div style="height:255px; position:relative;"><canvas id="chart-comp-conv-acum"></canvas></div>
                </div>
            </div>
        `;

        const labels = seriesEstrategicas.map(s => s.label);

        createChart('chart-comp-evol-prop', {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    label: 'Propostas Enviadas',
                    data: seriesEstrategicas.map(s => s.propostas),
                    borderColor: '#7048e8',
                    backgroundColor: 'rgba(112,72,232,0.12)',
                    fill: true,
                    tension: 0.3
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } }
        });

        createChart('chart-comp-evol-fech', {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    label: 'Contratos Fechados',
                    data: seriesEstrategicas.map(s => s.fechados),
                    borderColor: '#16a34a',
                    backgroundColor: 'rgba(22,163,74,0.12)',
                    fill: true,
                    tension: 0.3
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } }
        });

        createChart('chart-comp-cresc-fat', {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: 'Crescimento Faturamento (%)',
                    data: seriesEstrategicas.map(s => s.crescFatPct),
                    backgroundColor: seriesEstrategicas.map(s => s.crescFatPct >= 0 ? '#0d9488' : '#dc2626'),
                    borderRadius: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: { y: { ticks: { callback: v => v + '%' } } }
            }
        });

        createChart('chart-comp-conv-acum', {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    label: 'Conversão Acumulada (%)',
                    data: seriesEstrategicas.map(s => s.convAcum),
                    borderColor: '#0284c7',
                    backgroundColor: 'rgba(2,132,199,0.12)',
                    fill: true,
                    tension: 0.3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: { y: { beginAtZero: true, max: 100, ticks: { callback: v => v + '%' } } }
            }
        });
    }

    // =========================================================================
    // CONTROLES PÚBLICOS E INTERAÇÃO
    // =========================================================================
    let _regiaoDebounce = null;

    window._comercialDashboard = {
        async init(forcarReload = false) {
            if (!STATE.dataInicio && !STATE.dataFim && STATE.periodoPreset !== 'todos') {
                const r = calcularRangePreset(STATE.periodoPreset);
                STATE.dataInicio = r.inicio;
                STATE.dataFim = r.fim;
            }
            if (!STATE.initialized || forcarReload || STATE.propostasRaw.length === 0) {
                await carregarDadosBackend();
                STATE.initialized = true;
            }
            renderEstruturaCompleta();
        },

        async recarregar() {
            await this.init(true);
        },

        setAba(abaId) {
            STATE.abaAtiva = abaId;
            renderEstruturaCompleta();
        },

        setModoConversao(modo) {
            STATE.modoConversao = modo;
            renderEstruturaCompleta();
        },

        setPresetPeriodo(preset) {
            STATE.periodoPreset = preset;
            const r = calcularRangePreset(preset);
            STATE.dataInicio = r.inicio;
            STATE.dataFim = r.fim;
            renderEstruturaCompleta();
        },

        onCustomDateChange() {
            STATE.periodoPreset = 'custom';
            STATE.dataInicio = document.getElementById('dash-com-dt-ini')?.value || '';
            STATE.dataFim = document.getElementById('dash-com-dt-fim')?.value || '';
            renderEstruturaCompleta();
        },

        setFiltro(chave, valor) {
            STATE[chave] = valor;
            renderEstruturaCompleta();
        },

        onRegiaoInput(valor) {
            STATE.regiaoCidadeFiltro = valor;
            clearTimeout(_regiaoDebounce);
            _regiaoDebounce = setTimeout(() => {
                const todasProcessadas = processarPropostasBase();
                const filtradas = filtrarPropostas(todasProcessadas);
                const metricas = calcularMetricasGerais(filtradas, todasProcessadas);
                renderConteudoAbaAtiva(todasProcessadas, filtradas, metricas);
            }, 180);
        },

        toggleDropdown(ddId) {
            ['dd-dash-vendedores', 'dd-dash-produtos'].forEach(id => {
                const el = document.getElementById(id);
                if (!el) return;
                if (id === ddId) {
                    el.style.display = el.style.display === 'none' ? 'block' : 'none';
                } else {
                    el.style.display = 'none';
                }
            });
        },

        filtrarListaDropdown(inputEl, listaId) {
            const termo = normText(inputEl?.value || '');
            const container = document.getElementById(listaId);
            if (!container) return;
            container.querySelectorAll('label[data-search]').forEach(lbl => {
                const s = lbl.getAttribute('data-search') || '';
                lbl.style.display = (!termo || s.includes(termo)) ? 'flex' : 'none';
            });
        },

        toggleVendedor(vNorm, checked) {
            const set = new Set(STATE.vendedoresSelecionados);
            if (checked) set.add(vNorm);
            else set.delete(vNorm);
            STATE.vendedoresSelecionados = Array.from(set);
            renderEstruturaCompleta();
            const dd = document.getElementById('dd-dash-vendedores');
            if (dd) dd.style.display = 'block';
        },

        toggleProduto(prodKey, checked) {
            const set = new Set(STATE.produtosSelecionados);
            if (checked) set.add(prodKey);
            else set.delete(prodKey);
            STATE.produtosSelecionados = Array.from(set);
            renderEstruturaCompleta();
            const dd = document.getElementById('dd-dash-produtos');
            if (dd) dd.style.display = 'block';
        },

        limparFiltros() {
            STATE.periodoPreset = 'ano';
            const r = calcularRangePreset('ano');
            STATE.dataInicio = r.inicio;
            STATE.dataFim = r.fim;
            STATE.vendedoresSelecionados = [];
            STATE.produtosSelecionados = [];
            STATE.tipoContratoFiltro = 'TODOS';
            STATE.statusFiltro = 'TODOS';
            STATE.perfilClienteFiltro = 'TODOS';
            STATE.regiaoCidadeFiltro = '';
            renderEstruturaCompleta();
        }
    };

    // Fecha dropdowns de multi-seleção ao clicar fora
    document.addEventListener('click', (ev) => {
        ['dd-dash-vendedores', 'dd-dash-produtos'].forEach(id => {
            const el = document.getElementById(id);
            if (!el || el.style.display === 'none') return;
            const parent = el.parentElement;
            if (parent && !parent.contains(ev.target)) {
                el.style.display = 'none';
            }
        });
    });

    window.renderDashboardComercial = function (forcar = false) {
        window._comercialDashboard.init(forcar);
    };
})();
