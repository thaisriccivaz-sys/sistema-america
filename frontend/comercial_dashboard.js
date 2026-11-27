/**
 * ============================================================================
 * DASHBOARD COMERCIAL — AMÉRICA RENTAL
 * ============================================================================
 * Estrutura organizada em 3 Abas claras:
 *   1. Propostas (Informações importantes das propostas)
 *   2. Contratos (Informações importantes dos contratos)
 *   3. Comparativo Proposta x Contrato (Informações importantes comparativas)
 * ============================================================================
 */
(function () {
    'use strict';

    // Catálogo de Equipamentos da OS (separado por OBRA, EVENTO e EQUIPAMENTOS com 🛋️ exclusivo do Dashboard Comercial)
    const EQUIPAMENTOS_OS_CATALOGO = [
        // OBRA
        { key: 'STD OBRA', grupo: 'OBRA', icone: '💙', nome: 'STD OBRA', label: '💙 STD OBRA' },
        { key: 'LX OBRA', grupo: 'OBRA', icone: '🟦', nome: 'LX OBRA', label: '🟦 LX OBRA' },
        { key: 'EXL OBRA', grupo: 'OBRA', icone: '🔵', nome: 'EXL OBRA', label: '🔵 EXL OBRA' },
        { key: 'PCD OBRA', grupo: 'OBRA', icone: '♿', nome: 'PCD OBRA', label: '♿ PCD OBRA' },
        { key: 'CHUVEIRO OBRA', grupo: 'OBRA', icone: '🚿', nome: 'CHUVEIRO OBRA', label: '🚿 CHUVEIRO OBRA' },
        { key: 'HIDRÁULICO OBRA', grupo: 'OBRA', icone: '🚽', nome: 'HIDRÁULICO OBRA', label: '🚽 HIDRÁULICO OBRA' },
        { key: 'MICTÓRIO OBRA', grupo: 'OBRA', icone: '💦', nome: 'MICTÓRIO OBRA', label: '💦 MICTÓRIO OBRA' },
        { key: 'PBII OBRA', grupo: 'OBRA', icone: '🧼', nome: 'PBII OBRA', label: '🧼 PBII OBRA' },
        { key: 'PBIII OBRA', grupo: 'OBRA', icone: '🧼', nome: 'PBIII OBRA', label: '🧼 PBIII OBRA' },
        { key: 'GUARITA INDIVIDUAL OBRA', grupo: 'OBRA', icone: '⬜', nome: 'GUARITA INDIVIDUAL OBRA', label: '⬜ GUARITA INDIVIDUAL OBRA' },
        { key: 'GUARITA DUPLA OBRA', grupo: 'OBRA', icone: '⚪', nome: 'GUARITA DUPLA OBRA', label: '⚪ GUARITA DUPLA OBRA' },
        { key: 'LIMPA FOSSA OBRA', grupo: 'OBRA', icone: '💧', nome: 'LIMPA FOSSA OBRA', label: '💧 LIMPA FOSSA OBRA' },
        // EVENTO
        { key: 'STD EVENTO', grupo: 'EVENTO', icone: '💜', nome: 'STD EVENTO', label: '💜 STD EVENTO' },
        { key: 'LX EVENTO', grupo: 'EVENTO', icone: '🟣', nome: 'LX EVENTO', label: '🟣 LX EVENTO' },
        { key: 'EXL EVENTO', grupo: 'EVENTO', icone: '🟣', nome: 'EXL EVENTO', label: '🟣 EXL EVENTO' },
        { key: 'PCD EVENTO', grupo: 'EVENTO', icone: '♿', nome: 'PCD EVENTO', label: '♿ PCD EVENTO' },
        { key: 'CHUVEIRO EVENTO', grupo: 'EVENTO', icone: '🚿', nome: 'CHUVEIRO EVENTO', label: '🚿 CHUVEIRO EVENTO' },
        { key: 'HIDRÁULICO EVENTO', grupo: 'EVENTO', icone: '🚽', nome: 'HIDRÁULICO EVENTO', label: '🚽 HIDRÁULICO EVENTO' },
        { key: 'MICTÓRIO EVENTO', grupo: 'EVENTO', icone: '💦', nome: 'MICTÓRIO EVENTO', label: '💦 MICTÓRIO EVENTO' },
        { key: 'PBII EVENTO', grupo: 'EVENTO', icone: '🧼', nome: 'PBII EVENTO', label: '🧼 PBII EVENTO' },
        { key: 'PBIII EVENTO', grupo: 'EVENTO', icone: '🧼', nome: 'PBIII EVENTO', label: '🧼 PBIII EVENTO' },
        { key: 'GUARITA INDIVIDUAL EVENTO', grupo: 'EVENTO', icone: '⬜', nome: 'GUARITA INDIVIDUAL EVENTO', label: '⬜ GUARITA INDIVIDUAL EVENTO' },
        { key: 'GUARITA DUPLA EVENTO', grupo: 'EVENTO', icone: '⚪', nome: 'GUARITA DUPLA EVENTO', label: '⚪ GUARITA DUPLA EVENTO' },
        { key: 'LIMPA FOSSA EVENTO', grupo: 'EVENTO', icone: '💧', nome: 'LIMPA FOSSA EVENTO', label: '💧 LIMPA FOSSA EVENTO' },
        // EQUIPAMENTOS (incluindo 🛋️ EQUIPAMENTOS exclusivo desta tela de Dashboard Comercial)
        { key: 'EQUIPAMENTOS', grupo: 'EQUIPAMENTOS', icone: '🛋️', nome: 'EQUIPAMENTOS', label: '🛋️ EQUIPAMENTOS' },
        { key: 'CARRINHO', grupo: 'EQUIPAMENTOS', icone: '🛤', nome: 'CARRINHO', label: '🛤 CARRINHO' },
        { key: 'CAIXA DAGUA', grupo: 'EQUIPAMENTOS', icone: '🧊', nome: 'CAIXA DAGUA', label: '🧊 CAIXA DAGUA' }
    ];

    const MAP_EQUIP_CATALOGO = new Map(EQUIPAMENTOS_OS_CATALOGO.map(e => [e.key, e]));

    // Nossos Tipos de Contrato (separando Obra Mensal, Quinzenal e Semanal)
    const NOSSOS_TIPOS_CONTRATO = [
        'EVENTO',
        'OBRA MENSAL',
        'OBRA QUINZENAL',
        'OBRA SEMANAL',
        'LIMPA FOSSA',
        'EQUIPAMENTOS',
        'ADITIVO'
    ];

    // Nossos Status da Proposta
    const NOSSOS_STATUS_PROPOSTA = [
        'Em Elaboração',
        'Proposta Enviada',
        'Pré aprovada',
        'ENVIADO PARA ASSINATURA',
        'PROPOSTA ASSINADA',
        'Aprovada',
        'Reprovada',
        'Cancelada',
        'Sem Resposta'
    ];

    // Nossa Categorização de Clientes (com ícones)
    const PERFIS_CLIENTE = [
        { key: 'DIAMANTE', label: '💎 Diamante', icone: '💎' },
        { key: 'OURO', label: '🥇 Ouro', icone: '🥇' },
        { key: 'PRATA', label: '🥈 Prata', icone: '🥈' },
        { key: 'BRONZE', label: '🥉 Bronze', icone: '🥉' },
        { key: 'NENHUMA', label: 'Nenhuma categoria', icone: '' }
    ];

    const STATE = {
        initialized: false,
        loading: false,
        abaAtiva: 'propostas', // 'propostas' | 'contratos' | 'comparativo'
        periodoPreset: 'ano',  // 'dia' | 'semana' | 'mes' | 'trimestre' | 'ano' | 'todos' | 'custom'
        dataInicio: '',
        dataFim: '',
        vendedoresSelecionados: [],   // array de nomes normalizados
        equipamentosSelecionados: [], // array de keys de EQUIPAMENTOS_OS_CATALOGO
        tipoContratoFiltro: 'TODOS',
        statusPropostaFiltro: 'TODOS',
        perfilClienteFiltro: 'TODOS',
        regiaoCidadeFiltro: '',
        propostasRaw: [],
        clientesRaw: [],
        enderecosRaw: [],
        atendentesRaw: [],
        charts: {}
    };

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
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
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

    function normalizarTipoContratoProposta(p) {
        const raw = String(p.tipo || p.tabela_precos || 'EVENTO').trim().toUpperCase().replace(/^PROPOSTA\s+/i, '');
        if (raw.includes('MENSAL')) return 'OBRA MENSAL';
        if (raw.includes('QUINZENAL')) return 'OBRA QUINZENAL';
        if (raw.includes('SEMANAL')) return 'OBRA SEMANAL';
        if (raw.includes('FOSSA')) return 'LIMPA FOSSA';
        if (raw.includes('EQUIPAMENTO') || raw.includes('CONTAINER')) return 'EQUIPAMENTOS';
        if (raw.includes('ADITIVO')) return 'ADITIVO';
        if (raw.includes('OBRA')) return 'OBRA MENSAL';
        return 'EVENTO';
    }

    function normalizarStatusProposta(faseRaw) {
        const n = normText(faseRaw);
        if (!n || n === 'em elaboracao') return 'Em Elaboração';
        if (n === 'proposta enviada' || n === 'enviada') return 'Proposta Enviada';
        if (n === 'pre aprovada' || n === 'pre-aprovada') return 'Pré aprovada';
        if (n === 'enviado para assinatura') return 'ENVIADO PARA ASSINATURA';
        if (n === 'proposta assinada') return 'PROPOSTA ASSINADA';
        if (n === 'aprovada' || n === 'aprovado' || n === 'aprovado - aditivo assinado') return 'Aprovada';
        if (n === 'reprovada' || n === 'reprovado') return 'Reprovada';
        if (n === 'cancelada' || n === 'cancelado') return 'Cancelada';
        if (n === 'sem resposta') return 'Sem Resposta';
        return String(faseRaw || 'Em Elaboração').trim();
    }

    function resolverCategoriaCliente(nomeClienteLimpo, mapClientes) {
        const k = normText(nomeClienteLimpo);
        const cli = mapClientes.get(k);
        let grp = '';
        if (cli) {
            grp = normText(cli.grupo_clientes || cli.classificacao || '');
        }
        if (!grp && typeof window.obterGrupoClientePorNome === 'function') {
            grp = normText(window.obterGrupoClientePorNome(nomeClienteLimpo) || '');
        }
        if (grp.includes('diamante')) return 'DIAMANTE';
        if (grp.includes('ouro')) return 'OURO';
        if (grp.includes('prata')) return 'PRATA';
        if (grp.includes('bronze')) return 'BRONZE';
        return 'NENHUMA';
    }

    function classificarEquipamentoOS(nomeProdutoRaw, tipoContratoNorm) {
        if (tipoContratoNorm === 'EQUIPAMENTOS') {
            const nEq = normText(nomeProdutoRaw);
            if (nEq.includes('carrinho')) return MAP_EQUIP_CATALOGO.get('CARRINHO');
            if (nEq.includes('caixa') && nEq.includes('agua')) return MAP_EQUIP_CATALOGO.get('CAIXA DAGUA');
            // Se não for banheiro específico, classifica em 🛋️ EQUIPAMENTOS
            if (!nEq.includes('standard') && !nEq.includes('luxo') && !nEq.includes('pcd') && !nEq.includes('chuveiro') && !nEq.includes('mictorio') && !nEq.includes('guarita') && !nEq.includes('pia') && !nEq.includes('hidraulic')) {
                return MAP_EQUIP_CATALOGO.get('EQUIPAMENTOS');
            }
        }

        const n = normText(nomeProdutoRaw);
        const sufixo = (tipoContratoNorm && tipoContratoNorm.startsWith('OBRA')) ? 'OBRA'
            : (n.includes('obra') || /\bo0\d/i.test(nomeProdutoRaw)) ? 'OBRA'
            : 'EVENTO';

        if (n.includes('carrinho')) return MAP_EQUIP_CATALOGO.get('CARRINHO');
        if (n.includes('caixa') && n.includes('agua')) return MAP_EQUIP_CATALOGO.get('CAIXA DAGUA');
        if (n.includes('fossa') || n.includes('succao') || n.includes('caminhao')) {
            return MAP_EQUIP_CATALOGO.get(`LIMPA FOSSA ${sufixo}`);
        }
        if (n.includes('extra lux') || /\b(exl|elx)\b/.test(n)) {
            return MAP_EQUIP_CATALOGO.get(`EXL ${sufixo}`);
        }
        if (n.includes('luxo') || n.includes('luxury') || /\blx\b/.test(n)) {
            return MAP_EQUIP_CATALOGO.get(`LX ${sufixo}`);
        }
        if (n.includes('pcd') || n.includes('pne') || n.includes('deficiente') || n.includes('acessivel')) {
            return MAP_EQUIP_CATALOGO.get(`PCD ${sufixo}`);
        }
        if (n.includes('chuveiro')) {
            return MAP_EQUIP_CATALOGO.get(`CHUVEIRO ${sufixo}`);
        }
        if (n.includes('hidraulic')) {
            return MAP_EQUIP_CATALOGO.get(`HIDRÁULICO ${sufixo}`);
        }
        if (n.includes('mictorio') || n.includes('kros')) {
            return MAP_EQUIP_CATALOGO.get(`MICTÓRIO ${sufixo}`);
        }
        if (n.includes('pbiii') || n.includes('pia iii') || n.includes('pia 3')) {
            return MAP_EQUIP_CATALOGO.get(`PBIII ${sufixo}`);
        }
        if (n.includes('pia') || n.includes('pbii') || n.includes('lavatorio')) {
            return MAP_EQUIP_CATALOGO.get(`PBII ${sufixo}`);
        }
        if (n.includes('guarita') && n.includes('dupla')) {
            return MAP_EQUIP_CATALOGO.get(`GUARITA DUPLA ${sufixo}`);
        }
        if (n.includes('guarita')) {
            return MAP_EQUIP_CATALOGO.get(`GUARITA INDIVIDUAL ${sufixo}`);
        }
        if (n.includes('standard') || n.includes('standart') || /\bstd\b/.test(n) || n.includes('banheiro') || n.includes('cabine')) {
            return MAP_EQUIP_CATALOGO.get(`STD ${sufixo}`);
        }
        return MAP_EQUIP_CATALOGO.get('EQUIPAMENTOS');
    }

    function extrairRegiaoECidade(p, cliObj, mapEnderecosPorCliente) {
        // 1. Região (Zona Central, Zona Amarela, Zona Vermelha) vinda de p.regiao ou do sufixo ZC/ZA/ZV do produto
        let regiaoZona = String(p.regiao || '').replace(/Roxa/gi, 'Vermelha').trim();
        if (!regiaoZona && typeof window.extrairCodigoZonaProduto === 'function') {
            try {
                const arr = typeof p.itens === 'string' ? JSON.parse(p.itens || '[]') : (Array.isArray(p.itens) ? p.itens : []);
                for (const it of arr) {
                    const z = window.extrairCodigoZonaProduto(it?.produto || it?.descricao || '');
                    if (z && z.zona === 'C') { regiaoZona = 'Zona Central'; break; }
                    if (z && z.zona === 'A') { regiaoZona = 'Zona Amarela'; break; }
                    if (z && z.zona === 'V') { regiaoZona = 'Zona Vermelha'; break; }
                }
            } catch (_) {}
        }

        // 2. Cidade / Município vindo do Cadastro de Endereço de Instalação (clientes_enderecos_entrega) ou Endereço da Proposta ou Cadastro do Cliente
        let cidadeUf = '';
        const endTexto = String(p.endereco_instalacao || '').trim();

        if (cliObj && mapEnderecosPorCliente.has(Number(cliObj.id))) {
            const endsCli = mapEnderecosPorCliente.get(Number(cliObj.id)) || [];
            const endNorm = normText(endTexto);
            const matchEnd = endsCli.find(e => {
                const m = normText(e.municipio);
                const r = normText(e.endereco);
                const nl = normText(e.nome_local);
                return (r && endNorm.includes(r)) || (nl && endNorm.includes(nl)) || (m && endNorm.includes(m));
            }) || endsCli[0];
            if (matchEnd && matchEnd.municipio) {
                cidadeUf = matchEnd.uf ? `${matchEnd.municipio.trim()}/${matchEnd.uf.trim()}` : matchEnd.municipio.trim();
            }
        }

        if (!cidadeUf && endTexto) {
            // Formato padrão salvo pelo modal de endereço: "... - Bairro - Município/UF"
            const mMunUf = endTexto.match(/-\s*([^-\/]+)\/([A-Z]{2})\s*$/i);
            if (mMunUf) {
                cidadeUf = `${mMunUf[1].trim()}/${mMunUf[2].toUpperCase()}`;
            }
        }

        if (!cidadeUf && cliObj && cliObj.municipio) {
            cidadeUf = cliObj.uf ? `${String(cliObj.municipio).trim()}/${String(cliObj.uf).trim()}` : String(cliObj.municipio).trim();
        }

        return {
            regiaoZona: regiaoZona || '',
            cidadeUf: cidadeUf || '',
            combinadoSearch: normText(`${regiaoZona} ${cidadeUf} ${endTexto}`)
        };
    }

    async function carregarDadosBackend() {
        STATE.loading = true;
        try {
            const fetchApi = async (path) => {
                if (typeof window.apiGet === 'function') {
                    try {
                        const r = await window.apiGet(path);
                        return Array.isArray(r) ? r : [];
                    } catch (_) {}
                }
                const tk = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token') || sessionStorage.getItem('token') || '';
                const headers = tk ? { 'Authorization': 'Bearer ' + tk } : {};
                const resp = await fetch('/api' + path, { headers });
                if (!resp.ok) return [];
                const d = await resp.json();
                return Array.isArray(d) ? d : [];
            };

            const [propostas, clientes, enderecos, atendentes] = await Promise.all([
                fetchApi('/propostas'),
                fetchApi('/clientes'),
                fetchApi('/enderecos-entrega'),
                fetchApi('/comercial/atendentes?incluir_desligados=1')
            ]);

            STATE.propostasRaw = propostas;
            STATE.clientesRaw = clientes;
            STATE.enderecosRaw = enderecos;
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

    function processarDados() {
        const mapClientes = new Map();
        (STATE.clientesRaw || []).forEach(c => {
            const k1 = normText(c.nome_razao_social);
            const k2 = normText(c.nome_fantasia);
            if (k1) mapClientes.set(k1, c);
            if (k2) mapClientes.set(k2, c);
        });

        const mapEnderecosPorCliente = new Map();
        (STATE.enderecosRaw || []).forEach(e => {
            const cid = Number(e.cliente_id);
            if (!cid) return;
            if (!mapEnderecosPorCliente.has(cid)) mapEnderecosPorCliente.set(cid, []);
            mapEnderecosPorCliente.get(cid).push(e);
        });

        const mapAtendentes = new Map();
        (STATE.atendentesRaw || []).forEach(a => {
            const k = normText(a.nome);
            if (k) mapAtendentes.set(k, a);
            if (a.username) mapAtendentes.set(normText(a.username), a);
        });

        const hoje = new Date();

        return (STATE.propostasRaw || []).map(p => {
            const nomeClienteLimpo = typeof window.limparPrefixoGrupoCliente === 'function'
                ? window.limparPrefixoGrupoCliente(p.cliente_nome || '')
                : String(p.cliente_nome || '').replace(/^[💎🥇🥈🥉]\s*/, '').trim();
            const cliObj = mapClientes.get(normText(nomeClienteLimpo)) || null;
            const categoriaCliente = resolverCategoriaCliente(nomeClienteLimpo, mapClientes);

            const rawVend = String(p.atendente_nome || p.atendente || p.representante || p.criado_por || '').trim();
            const objAtend = mapAtendentes.get(normText(rawVend)) || null;
            const vendedor = (objAtend && objAtend.nome) ? objAtend.nome : (rawVend || 'Não informado');
            const vendedorNorm = normText(vendedor);

            const dtEnvio = parseDataIso(p.data_cadastro || p.criado_em) || parseDataIso(p.criado_em) || hoje;
            const dtFechamento = parseDataIso(p.aprovado_em || p.assinafy_signed_at || p.aceite_publico_em || p.atualizado_em || p.criado_em) || dtEnvio;

            const tipoContrato = normalizarTipoContratoProposta(p);
            const statusProposta = normalizarStatusProposta(p.fase_negociacao);

            const sitCtrNorm = normText(p.situacao_contrato || '');
            const estornado = sitCtrNorm.includes('estornado');
            const isContratoFechado = !estornado && (
                statusProposta === 'Aprovada' ||
                statusProposta === 'PROPOSTA ASSINADA' ||
                Boolean(p.contrato && String(p.contrato).trim())
            );
            const isPerdida = !isContratoFechado && (
                statusProposta === 'Reprovada' ||
                statusProposta === 'Cancelada' ||
                statusProposta === 'Sem Resposta' ||
                estornado
            );

            let diasParaFechar = null;
            if (isContratoFechado && dtEnvio && dtFechamento) {
                const diff = (dtFechamento.getTime() - dtEnvio.getTime()) / 86400000;
                diasParaFechar = Math.max(0, Math.min(180, Math.round(diff)));
            }

            const valorTotal = Math.max(0, parseFloat(p.valor_total) || 0);
            const { regiaoZona, cidadeUf, combinadoSearch } = extrairRegiaoECidade(p, cliObj, mapEnderecosPorCliente);

            // Processar equipamentos da proposta/contrato no padrão da OS
            let itensArr = [];
            try {
                itensArr = typeof p.itens === 'string' ? JSON.parse(p.itens || '[]') : (Array.isArray(p.itens) ? p.itens : []);
            } catch (_) { itensArr = []; }
            itensArr = (Array.isArray(itensArr) ? itensArr : []).filter(it => it && !it._substituido_por_aditivo);

            const ehEvLike = ['EVENTO', 'EQUIPAMENTOS'].includes(tipoContrato);
            const diasLocacao = Math.max(1, parseInt(p.dias_contrato, 10) || 1);

            const itensOS = [];
            let somaBruta = 0;
            itensArr.forEach(it => {
                const nomeProd = String(it.produto || it.descricao || it.nome || '').trim();
                if (!nomeProd) return;
                const catOS = classificarEquipamentoOS(nomeProd, tipoContrato);
                const qtd = Math.max(1, parseInt(it.quantidade ?? it.qtde ?? 1, 10) || 1);
                const vUnit = Math.max(0, parseFloat(it.valor ?? it.valor_unitario ?? 0) || 0);
                const sub = (it.valor_total !== undefined && !isNaN(parseFloat(it.valor_total)))
                    ? Math.max(0, parseFloat(it.valor_total))
                    : (qtd * vUnit);
                const diasArr = Array.isArray(it.dias_evento) ? it.dias_evento.filter(Boolean) : [];
                const nDiarias = ehEvLike ? (diasArr.length > 0 ? diasArr.length : diasLocacao) : 1;
                const valItem = ehEvLike ? (sub * nDiarias) : sub;
                somaBruta += valItem;
                itensOS.push({
                    key: catOS.key,
                    grupo: catOS.grupo,
                    icone: catOS.icone,
                    label: catOS.label,
                    quantidade: qtd,
                    valorBruto: valItem
                });
            });

            if (itensOS.length === 0 && tipoContrato === 'EQUIPAMENTOS') {
                const eqCat = MAP_EQUIP_CATALOGO.get('EQUIPAMENTOS');
                itensOS.push({
                    key: eqCat.key,
                    grupo: eqCat.grupo,
                    icone: eqCat.icone,
                    label: eqCat.label,
                    quantidade: 1,
                    valorBruto: valorTotal,
                    valorRateado: valorTotal
                });
            } else {
                itensOS.forEach(it => {
                    it.valorRateado = somaBruta > 0 ? (valorTotal * (it.valorBruto / somaBruta)) : (valorTotal / Math.max(1, itensOS.length));
                });
            }

            return {
                id: p.id,
                codigo: p.codigo || String(p.id),
                contrato: p.contrato || '',
                cliente_nome: nomeClienteLimpo || 'Cliente não informado',
                categoriaCliente, // DIAMANTE | OURO | PRATA | BRONZE | NENHUMA
                vendedor,
                vendedorNorm,
                tipoContrato,     // EVENTO | OBRA MENSAL | OBRA QUINZENAL | OBRA SEMANAL | LIMPA FOSSA | EQUIPAMENTOS | ADITIVO
                statusProposta,   // Em Elaboração | Proposta Enviada | Pré aprovada | ENVIADO PARA ASSINATURA | PROPOSTA ASSINADA | Aprovada | Reprovada | Cancelada | Sem Resposta
                situacao_contrato: p.situacao_contrato || 'EM ELABORAÇÃO',
                motivo_reprovacao: p.motivo_reprovacao || (statusProposta === 'Sem Resposta' ? 'Cliente não respondeu' : statusProposta === 'Cancelada' ? 'Projeto cancelado' : 'Não informado'),
                isContratoFechado,
                isPerdida,
                dtEnvio,
                dtFechamento,
                mesEnvio: getMesAnoKey(dtEnvio),
                anoEnvio: dtEnvio.getFullYear(),
                diasParaFechar,
                valorTotal,
                regiaoZona,
                cidadeUf,
                combinadoSearch,
                itensOS
            };
        });
    }

    function aplicarFiltros(lista, ignorarPeriodo = false) {
        const dtIni = (!ignorarPeriodo && STATE.dataInicio) ? parseDataIso(STATE.dataInicio) : null;
        if (dtIni) dtIni.setHours(0, 0, 0, 0);
        const dtFim = (!ignorarPeriodo && STATE.dataFim) ? parseDataIso(STATE.dataFim) : null;
        if (dtFim) dtFim.setHours(23, 59, 59, 999);

        const vendSet = new Set(STATE.vendedoresSelecionados);
        const equipSet = new Set(STATE.equipamentosSelecionados);
        const regFiltro = normText(STATE.regiaoCidadeFiltro);

        return lista.filter(p => {
            if (dtIni && p.dtEnvio < dtIni) return false;
            if (dtFim && p.dtEnvio > dtFim) return false;

            if (vendSet.size > 0 && !vendSet.has(p.vendedorNorm)) return false;

            if (equipSet.size > 0) {
                const temEq = p.itensOS.some(it => equipSet.has(it.key));
                if (!temEq) return false;
            }

            if (STATE.tipoContratoFiltro !== 'TODOS' && p.tipoContrato !== STATE.tipoContratoFiltro) {
                return false;
            }

            if (STATE.statusPropostaFiltro !== 'TODOS' && p.statusProposta !== STATE.statusPropostaFiltro) {
                return false;
            }

            if (STATE.perfilClienteFiltro !== 'TODOS' && p.categoriaCliente !== STATE.perfilClienteFiltro) {
                return false;
            }

            if (regFiltro && !p.combinadoSearch.includes(regFiltro)) {
                return false;
            }

            return true;
        });
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
        STATE.charts[canvasId] = new Chart(el.getContext('2d'), config);
        return STATE.charts[canvasId];
    }

    function obterListaVendedoresComBadge(todasProcessadas) {
        const map = new Map();
        // 1. Colaboradores do Departamento Comercial vindos da rota /api/comercial/atendentes?incluir_desligados=1
        (STATE.atendentesRaw || []).forEach(a => {
            const nome = String(a.nome || '').trim();
            if (!nome) return;
            const k = normText(nome);
            map.set(k, {
                nome,
                norm: k,
                desligado: Boolean(a.desligado || normText(a.status) === 'desligado'),
                is_gestor: Boolean(a.is_gestor)
            });
        });

        // 2. Garantir que qualquer atendente presente em propostas também apareça caso não estivesse na lista
        todasProcessadas.forEach(p => {
            if (!p.vendedor || p.vendedor === 'Não informado') return;
            if (!map.has(p.vendedorNorm)) {
                map.set(p.vendedorNorm, {
                    nome: p.vendedor,
                    norm: p.vendedorNorm,
                    desligado: false,
                    is_gestor: false
                });
            }
        });

        // Ordenar: Ativos no início (em ordem alfabética), Desligados no final (em ordem alfabética)
        return Array.from(map.values()).sort((a, b) => {
            if (a.desligado !== b.desligado) return a.desligado ? 1 : -1;
            return a.nome.localeCompare(b.nome, 'pt-BR');
        });
    }

    function obterSugestoesRegiaoECidade(todasProcessadas) {
        const regioes = ['Zona Central', 'Zona Amarela', 'Zona Vermelha'];
        const cidadesSet = new Set();

        (STATE.enderecosRaw || []).forEach(e => {
            const mun = String(e.municipio || '').trim();
            const uf = String(e.uf || '').trim();
            if (mun) cidadesSet.add(uf ? `${mun}/${uf}` : mun);
        });
        (STATE.clientesRaw || []).forEach(c => {
            const mun = String(c.municipio || '').trim();
            const uf = String(c.uf || '').trim();
            if (mun) cidadesSet.add(uf ? `${mun}/${uf}` : mun);
        });
        todasProcessadas.forEach(p => {
            if (p.cidadeUf) cidadesSet.add(p.cidadeUf);
        });

        const cidades = Array.from(cidadesSet).sort((a, b) => a.localeCompare(b, 'pt-BR'));
        return { regioes, cidades };
    }

    function renderPainel() {
        const container = document.getElementById('view-comercial-dashboard');
        if (!container) return;

        const todasProcessadas = processarDados();
        const filtradas = aplicarFiltros(todasProcessadas);
        const listaVendedores = obterListaVendedoresComBadge(todasProcessadas);
        const { regioes, cidades } = obterSugestoesRegiaoECidade(todasProcessadas);

        const labelVendedoresBtn = STATE.vendedoresSelecionados.length === 0
            ? 'Todos os vendedores'
            : `${STATE.vendedoresSelecionados.length} vendedor(es) selecionado(s)`;

        const labelEquipamentosBtn = STATE.equipamentosSelecionados.length === 0
            ? 'Todos os equipamentos'
            : `${STATE.equipamentosSelecionados.length} equipamento(s) selecionado(s)`;

        const equipsObra = EQUIPAMENTOS_OS_CATALOGO.filter(e => e.grupo === 'OBRA');
        const equipsEvento = EQUIPAMENTOS_OS_CATALOGO.filter(e => e.grupo === 'EVENTO');
        const equipsGerais = EQUIPAMENTOS_OS_CATALOGO.filter(e => e.grupo === 'EQUIPAMENTOS');

        const abas = [
            { id: 'propostas', label: 'Propostas', icon: 'ph-file-text', desc: 'Informações importantes das propostas' },
            { id: 'contratos', label: 'Contratos', icon: 'ph-files', desc: 'Informações importantes dos contratos' },
            { id: 'comparativo', label: 'Comparativo Proposta x Contrato', icon: 'ph-arrows-left-right', desc: 'Conversão, aproveitamento e evolução comparativa' }
        ];

        container.innerHTML = `
            <div style="padding:1rem 1.25rem 2.5rem; max-width:1600px; margin:0 auto; font-family:'Inter',system-ui,sans-serif; color:#0f172a;">
                <!-- TOPO LIMPO (SEM FUNDO ESCURO E SEM BOTÕES SAFRA / PERÍODO DE FECHAMENTO / ATUALIZAR) -->
                <div style="margin-bottom:0.85rem;">
                    <h2 style="margin:0; font-size:1.3rem; font-weight:800; color:#0f172a; display:flex; align-items:center; gap:8px;">
                        <i class="ph ph-chart-line-up" style="color:#7048e8; font-size:1.45rem;"></i>
                        Dashboard Comercial
                    </h2>
                </div>

                <!-- BARRA DE FILTROS GLOBAIS -->
                <div style="background:#fff; border:1px solid #e2e8f0; border-radius:12px; padding:0.9rem 1.1rem; margin-bottom:1rem; box-shadow:0 2px 8px rgba(15,23,42,0.03);">
                    <!-- Linha 1: Período Rápido + Datas -->
                    <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:0.65rem; margin-bottom:0.8rem; padding-bottom:0.65rem; border-bottom:1px solid #f1f5f9;">
                        <div style="display:flex; align-items:center; gap:0.45rem; flex-wrap:wrap;">
                            <span style="font-size:0.76rem; font-weight:800; color:#475569; display:inline-flex; align-items:center; gap:5px; margin-right:4px;">
                                <i class="ph ph-calendar-blank" style="color:#7048e8; font-size:1rem;"></i> Período:
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
                                    style="border:1px solid ${ativo ? '#7048e8' : '#cbd5e1'}; background:${ativo ? '#7048e8' : '#f8fafc'}; color:${ativo ? '#fff' : '#334155'}; border-radius:7px; padding:4px 11px; font-size:0.76rem; font-weight:700; cursor:pointer;">
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

                    <!-- Linha 2: 6 Filtros Globais -->
                    <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:0.7rem;">
                        <!-- 1. Vendedores (Ativos em verde no início, Desligados em vermelho no final) -->
                        <div style="position:relative;">
                            <label style="display:block; font-size:0.73rem; font-weight:700; color:#475569; margin-bottom:3px;">Vendedores</label>
                            <button type="button" onclick="window._comercialDashboard.toggleDropdown('dd-dash-vendedores')"
                                style="width:100%; text-align:left; padding:0.45rem 0.65rem; border:1px solid #cbd5e1; border-radius:7px; background:#fff; font-size:0.8rem; color:#0f172a; cursor:pointer; display:flex; align-items:center; justify-content:space-between;">
                                <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escHtml(labelVendedoresBtn)}</span>
                                <i class="ph ph-caret-down" style="color:#64748b;"></i>
                            </button>
                            <div id="dd-dash-vendedores" style="display:none; position:absolute; top:100%; left:0; right:0; min-width:260px; margin-top:4px; background:#fff; border:1px solid #cbd5e1; border-radius:9px; box-shadow:0 12px 28px rgba(15,23,42,0.16); z-index:95; padding:8px;">
                                <input type="text" placeholder="Digite para filtrar vendedor..."
                                    oninput="window._comercialDashboard.filtrarListaDropdown(this, 'lista-dd-vendedores')"
                                    style="width:100%; padding:6px 8px; border:1px solid #cbd5e1; border-radius:6px; font-size:0.78rem; margin-bottom:6px; box-sizing:border-box; text-transform:none;">
                                <div id="lista-dd-vendedores" style="max-height:240px; overflow-y:auto; display:flex; flex-direction:column; gap:3px;">
                                    ${listaVendedores.map(v => {
                                        const checked = STATE.vendedoresSelecionados.includes(v.norm);
                                        const badgeHtml = v.desligado
                                            ? `<span style="background:#fee2e2; color:#dc2626; border:1px solid #fca5a5; padding:1px 7px; border-radius:999px; font-size:0.66rem; font-weight:800; flex-shrink:0;">Desligado</span>`
                                            : `<span style="background:#dcfce7; color:#15803d; border:1px solid #86efac; padding:1px 7px; border-radius:999px; font-size:0.66rem; font-weight:800; flex-shrink:0;">Ativo</span>`;
                                        return `<label data-search="${escHtml(v.norm + ' ' + (v.desligado ? 'desligado' : 'ativo'))}"
                                            style="display:flex; align-items:center; justify-content:space-between; gap:6px; padding:5px 6px; border-radius:6px; font-size:0.78rem; color:#1e293b; cursor:pointer; background:${checked ? '#f5f3ff' : 'transparent'};">
                                            <span style="display:flex; align-items:center; gap:6px; min-width:0;">
                                                <input type="checkbox" ${checked ? 'checked' : ''} onchange="window._comercialDashboard.toggleVendedor('${escHtml(v.norm)}', this.checked)">
                                                <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-weight:600;">${escHtml(v.nome)}</span>
                                            </span>
                                            ${badgeHtml}
                                        </label>`;
                                    }).join('')}
                                </div>
                            </div>
                        </div>

                        <!-- 2. Equipamentos (Produtos da OS separados por OBRA, EVENTO e 🛋️ EQUIPAMENTOS) -->
                        <div style="position:relative;">
                            <label style="display:block; font-size:0.73rem; font-weight:700; color:#475569; margin-bottom:3px;">Equipamentos</label>
                            <button type="button" onclick="window._comercialDashboard.toggleDropdown('dd-dash-produtos')"
                                style="width:100%; text-align:left; padding:0.45rem 0.65rem; border:1px solid #cbd5e1; border-radius:7px; background:#fff; font-size:0.8rem; color:#0f172a; cursor:pointer; display:flex; align-items:center; justify-content:space-between;">
                                <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escHtml(labelEquipamentosBtn)}</span>
                                <i class="ph ph-caret-down" style="color:#64748b;"></i>
                            </button>
                            <div id="dd-dash-produtos" style="display:none; position:absolute; top:100%; left:0; right:0; min-width:270px; margin-top:4px; background:#fff; border:1px solid #cbd5e1; border-radius:9px; box-shadow:0 12px 28px rgba(15,23,42,0.16); z-index:95; padding:8px;">
                                <input type="text" placeholder="Digite para filtrar equipamento..."
                                    oninput="window._comercialDashboard.filtrarListaDropdown(this, 'lista-dd-produtos')"
                                    style="width:100%; padding:6px 8px; border:1px solid #cbd5e1; border-radius:6px; font-size:0.78rem; margin-bottom:6px; box-sizing:border-box; text-transform:none;">
                                <div id="lista-dd-produtos" style="max-height:260px; overflow-y:auto; display:flex; flex-direction:column; gap:2px;">
                                    <div style="font-size:0.68rem; font-weight:800; color:#156EB6; background:#eff6ff; padding:3px 7px; border-radius:5px; margin-top:2px;">OBRA</div>
                                    ${equipsObra.map(eq => {
                                        const checked = STATE.equipamentosSelecionados.includes(eq.key);
                                        return `<label data-search="${escHtml(normText(eq.label))}" style="display:flex; align-items:center; gap:6px; padding:4px 6px; border-radius:5px; font-size:0.78rem; color:#1e293b; cursor:pointer;">
                                            <input type="checkbox" ${checked ? 'checked' : ''} onchange="window._comercialDashboard.toggleEquipamento('${escHtml(eq.key)}', this.checked)">
                                            <span>${escHtml(eq.label)}</span>
                                        </label>`;
                                    }).join('')}

                                    <div style="font-size:0.68rem; font-weight:800; color:#8E24AA; background:#faf5ff; padding:3px 7px; border-radius:5px; margin-top:6px;">EVENTO</div>
                                    ${equipsEvento.map(eq => {
                                        const checked = STATE.equipamentosSelecionados.includes(eq.key);
                                        return `<label data-search="${escHtml(normText(eq.label))}" style="display:flex; align-items:center; gap:6px; padding:4px 6px; border-radius:5px; font-size:0.78rem; color:#1e293b; cursor:pointer;">
                                            <input type="checkbox" ${checked ? 'checked' : ''} onchange="window._comercialDashboard.toggleEquipamento('${escHtml(eq.key)}', this.checked)">
                                            <span>${escHtml(eq.label)}</span>
                                        </label>`;
                                    }).join('')}

                                    <div style="font-size:0.68rem; font-weight:800; color:#0f766e; background:#f0fdfa; padding:3px 7px; border-radius:5px; margin-top:6px;">EQUIPAMENTOS</div>
                                    ${equipsGerais.map(eq => {
                                        const checked = STATE.equipamentosSelecionados.includes(eq.key);
                                        return `<label data-search="${escHtml(normText(eq.label))}" style="display:flex; align-items:center; gap:6px; padding:4px 6px; border-radius:5px; font-size:0.78rem; color:#1e293b; cursor:pointer;">
                                            <input type="checkbox" ${checked ? 'checked' : ''} onchange="window._comercialDashboard.toggleEquipamento('${escHtml(eq.key)}', this.checked)">
                                            <span>${escHtml(eq.label)}</span>
                                        </label>`;
                                    }).join('')}
                                </div>
                            </div>
                        </div>

                        <!-- 3. Tipo de contrato (Apenas nossos tipos: EVENTO, OBRA MENSAL, OBRA QUINZENAL, OBRA SEMANAL, LIMPA FOSSA, EQUIPAMENTOS, ADITIVO) -->
                        <div>
                            <label style="display:block; font-size:0.73rem; font-weight:700; color:#475569; margin-bottom:3px;">Tipo de contrato</label>
                            <select onchange="window._comercialDashboard.setFiltro('tipoContratoFiltro', this.value)"
                                style="width:100%; padding:0.45rem 0.6rem; border:1px solid #cbd5e1; border-radius:7px; font-size:0.8rem; color:#0f172a; background:#fff; text-transform:none;">
                                <option value="TODOS" ${STATE.tipoContratoFiltro === 'TODOS' ? 'selected' : ''}>Todos os tipos</option>
                                ${NOSSOS_TIPOS_CONTRATO.map(t => `<option value="${escHtml(t)}" ${STATE.tipoContratoFiltro === t ? 'selected' : ''}>${escHtml(t)}</option>`).join('')}
                            </select>
                        </div>

                        <!-- 4. Status da Proposta (Apenas nossos status da proposta) -->
                        <div>
                            <label style="display:block; font-size:0.73rem; font-weight:700; color:#475569; margin-bottom:3px;">Status da Proposta</label>
                            <select onchange="window._comercialDashboard.setFiltro('statusPropostaFiltro', this.value)"
                                style="width:100%; padding:0.45rem 0.6rem; border:1px solid #cbd5e1; border-radius:7px; font-size:0.8rem; color:#0f172a; background:#fff; text-transform:none;">
                                <option value="TODOS" ${STATE.statusPropostaFiltro === 'TODOS' ? 'selected' : ''}>Todos os status</option>
                                ${NOSSOS_STATUS_PROPOSTA.map(st => `<option value="${escHtml(st)}" ${STATE.statusPropostaFiltro === st ? 'selected' : ''}>${escHtml(st)}</option>`).join('')}
                            </select>
                        </div>

                        <!-- 5. Perfil do Cliente (💎 Diamante, 🥇 Ouro, 🥈 Prata, 🥉 Bronze, Nenhuma categoria) -->
                        <div>
                            <label style="display:block; font-size:0.73rem; font-weight:700; color:#475569; margin-bottom:3px;">Perfil do Cliente</label>
                            <select onchange="window._comercialDashboard.setFiltro('perfilClienteFiltro', this.value)"
                                style="width:100%; padding:0.45rem 0.6rem; border:1px solid #cbd5e1; border-radius:7px; font-size:0.8rem; color:#0f172a; background:#fff; text-transform:none;">
                                <option value="TODOS" ${STATE.perfilClienteFiltro === 'TODOS' ? 'selected' : ''}>Todos os perfis</option>
                                ${PERFIS_CLIENTE.map(pf => `<option value="${pf.key}" ${STATE.perfilClienteFiltro === pf.key ? 'selected' : ''}>${escHtml(pf.label)}</option>`).join('')}
                            </select>
                        </div>

                        <!-- 6. Região ou Cidade (Buscando da Zona da Proposta e Município/UF do Cadastro de Endereços de Entrega e Clientes) -->
                        <div style="position:relative;">
                            <label style="display:block; font-size:0.73rem; font-weight:700; color:#475569; margin-bottom:3px;">Região ou Cidade</label>
                            <div style="position:relative;">
                                <input type="text" id="dash-com-filtro-regiao" value="${escHtml(STATE.regiaoCidadeFiltro)}"
                                    placeholder="Zona (Central/Amarela/Vermelha) ou Cidade..."
                                    onfocus="window._comercialDashboard.abrirDropdownRegiaoCidade(true)"
                                    oninput="window._comercialDashboard.onRegiaoInput(this.value)"
                                    style="width:100%; padding:0.45rem 0.65rem 0.45rem 1.85rem; border:1px solid #cbd5e1; border-radius:7px; font-size:0.8rem; color:#0f172a; box-sizing:border-box; text-transform:none;">
                                <i class="ph ph-map-pin" style="position:absolute; left:8px; top:50%; transform:translateY(-50%); color:#7048e8; font-size:0.95rem;"></i>
                            </div>
                            <div id="dd-dash-regiao-cidade" style="display:none; position:absolute; top:100%; left:0; right:0; margin-top:4px; background:#fff; border:1px solid #cbd5e1; border-radius:9px; box-shadow:0 12px 28px rgba(15,23,42,0.16); z-index:95; padding:6px; max-height:230px; overflow-y:auto;">
                                <div onclick="window._comercialDashboard.selecionarRegiaoCidade('')"
                                    style="padding:5px 8px; font-size:0.78rem; font-weight:700; color:#64748b; cursor:pointer; border-radius:5px;">
                                    Todas as regiões e cidades
                                </div>
                                <div style="font-size:0.68rem; font-weight:800; color:#7048e8; background:#f5f3ff; padding:3px 7px; border-radius:5px; margin-top:4px;">REGIÃO (ZONA DO ENDEREÇO DE INSTALAÇÃO)</div>
                                ${regioes.map(r => `
                                    <div data-reg-opt="${escHtml(normText(r))}" onclick="window._comercialDashboard.selecionarRegiaoCidade('${escHtml(r)}')"
                                        style="padding:5px 8px; font-size:0.78rem; color:#1e293b; cursor:pointer; border-radius:5px;">
                                        ${escHtml(r)}
                                    </div>
                                `).join('')}
                                <div style="font-size:0.68rem; font-weight:800; color:#0284c7; background:#eff6ff; padding:3px 7px; border-radius:5px; margin-top:6px;">CIDADE (CADASTRO DE ENDEREÇO / CLIENTE)</div>
                                ${cidades.map(c => `
                                    <div data-reg-opt="${escHtml(normText(c))}" onclick="window._comercialDashboard.selecionarRegiaoCidade('${escHtml(c)}')"
                                        style="padding:5px 8px; font-size:0.78rem; color:#1e293b; cursor:pointer; border-radius:5px;">
                                        ${escHtml(c)}
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                </div>

                <!-- AS 3 ABAS PRINCIPAIS DO DASHBOARD: PROPOSTAS | CONTRATOS | COMPARATIVO PROPOSTA X CONTRATO -->
                <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:0.75rem; margin-bottom:1.15rem;">
                    ${abas.map(a => {
                        const ativo = STATE.abaAtiva === a.id;
                        return `<button type="button" onclick="window._comercialDashboard.setAba('${a.id}')"
                            style="text-align:left; padding:0.85rem 1.1rem; border-radius:12px; border:2px solid ${ativo ? '#7048e8' : '#e2e8f0'}; background:${ativo ? '#f5f3ff' : '#fff'}; cursor:pointer; transition:all 0.15s; display:flex; align-items:center; gap:0.75rem; box-shadow:${ativo ? '0 4px 14px rgba(112,72,232,0.12)' : 'none'};">
                            <div style="width:40px; height:40px; border-radius:10px; background:${ativo ? '#7048e8' : '#f1f5f9'}; color:${ativo ? '#fff' : '#475569'}; display:flex; align-items:center; justify-content:center; font-size:1.25rem; flex-shrink:0;">
                                <i class="ph ${a.icon}"></i>
                            </div>
                            <div style="min-width:0;">
                                <div style="font-size:0.95rem; font-weight:800; color:${ativo ? '#4c1d95' : '#0f172a'};">${escHtml(a.label)}</div>
                                <div style="font-size:0.74rem; color:#64748b;">${escHtml(a.desc)}</div>
                            </div>
                        </button>`;
                    }).join('')}
                </div>

                <!-- CONTEÚDO DA ABA SELECIONADA -->
                <div id="dash-com-aba-conteudo"></div>
            </div>
        `;

        renderConteudoAba(todasProcessadas, filtradas);
    }

    function renderConteudoAba(todasProcessadas, filtradas) {
        destroyAllCharts();
        const box = document.getElementById('dash-com-aba-conteudo');
        if (!box) return;

        if (STATE.abaAtiva === 'propostas') {
            renderAbaPropostas(box, filtradas);
        } else if (STATE.abaAtiva === 'contratos') {
            renderAbaContratos(box, filtradas);
        } else {
            renderAbaComparativo(box, todasProcessadas, filtradas);
        }
    }

    // =========================================================================
    // ABA 1: PROPOSTAS (INFORMAÇÕES IMPORTANTES DA PROPOSTA)
    // =========================================================================
    function renderAbaPropostas(box, filtradas) {
        const totalPropostas = filtradas.length;
        const valorTotalProposto = filtradas.reduce((a, p) => a + p.valorTotal, 0);
        const ticketMedioProposta = totalPropostas > 0 ? (valorTotalProposto / totalPropostas) : 0;

        const emAndamento = filtradas.filter(p => !p.isContratoFechado && !p.isPerdida);
        const aprovadas = filtradas.filter(p => p.isContratoFechado);
        const perdidas = filtradas.filter(p => p.isPerdida);

        const valEmAndamento = emAndamento.reduce((a, p) => a + p.valorTotal, 0);
        const valPerdidas = perdidas.reduce((a, p) => a + p.valorTotal, 0);
        const taxaPerda = totalPropostas > 0 ? (perdidas.length / totalPropostas) * 100 : 0;

        // Evolução mensal de propostas
        const mesesMap = new Map();
        const hoje = new Date();
        for (let i = 5; i >= 0; i--) {
            const ym = getMesAnoKey(new Date(hoje.getFullYear(), hoje.getMonth() - i, 1));
            mesesMap.set(ym, { ym, label: formatMesAnoLabel(ym), qtd: 0, valor: 0 });
        }
        filtradas.forEach(p => {
            if (!p.mesEnvio) return;
            if (!mesesMap.has(p.mesEnvio)) mesesMap.set(p.mesEnvio, { ym: p.mesEnvio, label: formatMesAnoLabel(p.mesEnvio), qtd: 0, valor: 0 });
            const m = mesesMap.get(p.mesEnvio);
            m.qtd++;
            m.valor += p.valorTotal;
        });
        const seriesMes = Array.from(mesesMap.values()).sort((a, b) => a.ym.localeCompare(b.ym));

        // Propostas por Status
        const mapStatus = new Map();
        NOSSOS_STATUS_PROPOSTA.forEach(st => mapStatus.set(st, { status: st, qtd: 0, valor: 0 }));
        filtradas.forEach(p => {
            if (!mapStatus.has(p.statusProposta)) mapStatus.set(p.statusProposta, { status: p.statusProposta, qtd: 0, valor: 0 });
            const st = mapStatus.get(p.statusProposta);
            st.qtd++;
            st.valor += p.valorTotal;
        });
        const listaStatus = Array.from(mapStatus.values()).filter(s => s.qtd > 0 || ['Em Elaboração', 'Proposta Enviada', 'Aprovada', 'Reprovada', 'Sem Resposta'].includes(s.status));

        // Propostas por Vendedor
        const mapVend = new Map();
        filtradas.forEach(p => {
            if (!mapVend.has(p.vendedorNorm)) mapVend.set(p.vendedorNorm, { nome: p.vendedor, qtd: 0, valor: 0, emAberto: 0, perdidas: 0 });
            const v = mapVend.get(p.vendedorNorm);
            v.qtd++;
            v.valor += p.valorTotal;
            if (!p.isContratoFechado && !p.isPerdida) v.emAberto++;
            if (p.isPerdida) v.perdidas++;
        });
        const listaVend = Array.from(mapVend.values()).sort((a, b) => b.qtd - a.qtd);

        // Equipamentos mais orçados nas propostas (com ícones da OS)
        const mapEquip = new Map();
        EQUIPAMENTOS_OS_CATALOGO.forEach(e => mapEquip.set(e.key, { ...e, propostasIds: new Set(), unidades: 0, valor: 0 }));
        filtradas.forEach(p => {
            p.itensOS.forEach(it => {
                if (!mapEquip.has(it.key)) mapEquip.set(it.key, { key: it.key, label: it.label, grupo: it.grupo, propostasIds: new Set(), unidades: 0, valor: 0 });
                const eq = mapEquip.get(it.key);
                eq.propostasIds.add(p.id);
                eq.unidades += it.quantidade;
                eq.valor += it.valorRateado;
            });
        });
        const listaEquip = Array.from(mapEquip.values())
            .map(e => ({ ...e, qtdPropostas: e.propostasIds.size }))
            .filter(e => e.qtdPropostas > 0)
            .sort((a, b) => b.qtdPropostas - a.qtdPropostas);

        // Motivos de reprovação / perda nas propostas
        const mapMotivos = new Map();
        perdidas.forEach(p => {
            const m = p.motivo_reprovacao || 'Não informado';
            if (!mapMotivos.has(m)) mapMotivos.set(m, { motivo: m, qtd: 0, valor: 0 });
            const obj = mapMotivos.get(m);
            obj.qtd++;
            obj.valor += p.valorTotal;
        });
        const listaMotivos = Array.from(mapMotivos.values()).sort((a, b) => b.qtd - a.qtd);

        box.innerHTML = `
            <!-- KPIs de Propostas -->
            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:0.85rem; margin-bottom:1.15rem;">
                <div style="background:#fff; border:1px solid #e2e8f0; border-left:4px solid #7048e8; border-radius:12px; padding:1rem 1.15rem;">
                    <div style="font-size:0.75rem; font-weight:800; color:#64748b;">Total de Propostas</div>
                    <div style="font-size:1.75rem; font-weight:900; color:#0f172a; margin:3px 0;">${totalPropostas}</div>
                    <div style="font-size:0.78rem; color:#4c1d95; font-weight:700;">Valor Orçado: ${fmtMoeda(valorTotalProposto)}</div>
                </div>

                <div style="background:#fff; border:1px solid #e2e8f0; border-left:4px solid #0284c7; border-radius:12px; padding:1rem 1.15rem;">
                    <div style="font-size:0.75rem; font-weight:800; color:#64748b;">Em Elaboração / Enviadas</div>
                    <div style="font-size:1.75rem; font-weight:900; color:#0284c7; margin:3px 0;">${emAndamento.length}</div>
                    <div style="font-size:0.78rem; color:#0369a1; font-weight:700;">Em aberto: ${fmtMoeda(valEmAndamento)}</div>
                </div>

                <div style="background:#fff; border:1px solid #e2e8f0; border-left:4px solid #16a34a; border-radius:12px; padding:1rem 1.15rem;">
                    <div style="font-size:0.75rem; font-weight:800; color:#64748b;">Propostas Aprovadas</div>
                    <div style="font-size:1.75rem; font-weight:900; color:#15803d; margin:3px 0;">${aprovadas.length}</div>
                    <div style="font-size:0.78rem; color:#15803d; font-weight:700;">Ticket Médio Orçado: ${fmtMoeda(ticketMedioProposta)}</div>
                </div>

                <div style="background:#fff; border:1px solid #e2e8f0; border-left:4px solid #dc2626; border-radius:12px; padding:1rem 1.15rem;">
                    <div style="font-size:0.75rem; font-weight:800; color:#64748b;">Reprovadas / Canceladas / Sem Resposta</div>
                    <div style="font-size:1.75rem; font-weight:900; color:#dc2626; margin:3px 0;">${perdidas.length} <span style="font-size:0.85rem; font-weight:700;">(${fmtPct(taxaPerda)})</span></div>
                    <div style="font-size:0.78rem; color:#b91c1c; font-weight:700;">Valor Perdido: ${fmtMoeda(valPerdidas)}</div>
                </div>
            </div>

            <!-- Linha 1: Evolução Mensal de Propostas + Propostas por Status -->
            <div style="display:grid; grid-template-columns:1.35fr 1fr; gap:1rem; margin-bottom:1rem;">
                <div style="background:#fff; border:1px solid #e2e8f0; border-radius:12px; padding:1.1rem;">
                    <h3 style="margin:0 0 0.2rem; font-size:0.95rem; font-weight:800; color:#0f172a;">1. Evolução Mensal de Propostas (Volume e Valor Orçado)</h3>
                    <p style="margin:0 0 0.75rem; font-size:0.75rem; color:#64748b;">Quantidade de propostas geradas por mês</p>
                    <div style="height:265px; position:relative;"><canvas id="chart-prop-evolucao"></canvas></div>
                </div>

                <div style="background:#fff; border:1px solid #e2e8f0; border-radius:12px; padding:1.1rem;">
                    <h3 style="margin:0 0 0.2rem; font-size:0.95rem; font-weight:800; color:#0f172a;">2. Propostas por Status da Proposta</h3>
                    <p style="margin:0 0 0.75rem; font-size:0.75rem; color:#64748b;">Distribuição nos nossos status reais de proposta</p>
                    <div style="height:265px; position:relative;"><canvas id="chart-prop-status"></canvas></div>
                </div>
            </div>

            <!-- Linha 2: Propostas por Vendedor + Equipamentos Mais Solicitados nas Propostas -->
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem; margin-bottom:1rem;">
                <div style="background:#fff; border:1px solid #e2e8f0; border-radius:12px; padding:1.1rem;">
                    <h3 style="margin:0 0 0.2rem; font-size:0.95rem; font-weight:800; color:#0f172a;">3. Propostas por Vendedor (Produtividade)</h3>
                    <p style="margin:0 0 0.75rem; font-size:0.75rem; color:#64748b;">Volume de propostas emitidas por cada atendente</p>
                    <div style="height:270px; position:relative;"><canvas id="chart-prop-vendedores"></canvas></div>
                </div>

                <div style="background:#fff; border:1px solid #e2e8f0; border-radius:12px; padding:1.1rem;">
                    <h3 style="margin:0 0 0.2rem; font-size:0.95rem; font-weight:800; color:#0f172a;">4. Equipamentos mais Orçados nas Propostas (Padrão OS)</h3>
                    <p style="margin:0 0 0.75rem; font-size:0.75rem; color:#64748b;">Procura por equipamento separado em Obra, Evento e 🛋️ Equipamentos</p>
                    <div style="height:270px; position:relative;"><canvas id="chart-prop-equipamentos"></canvas></div>
                </div>
            </div>

            <!-- Linha 3: Motivos de Perda / Reprovação de Propostas -->
            <div style="background:#fff; border:1px solid #e2e8f0; border-radius:12px; padding:1.1rem;">
                <h3 style="margin:0 0 0.2rem; font-size:0.95rem; font-weight:800; color:#0f172a;">5. Motivos de Perda / Reprovação de Propostas</h3>
                <p style="margin:0 0 0.75rem; font-size:0.75rem; color:#64748b;">Quantidade e valor financeiro das propostas reprovadas, canceladas ou sem resposta</p>
                ${listaMotivos.length === 0 ? `
                    <div style="padding:18px; text-align:center; color:#94a3b8; font-size:0.84rem;">Nenhuma proposta reprovada ou perdida no período selecionado.</div>
                ` : `
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem; align-items:center;">
                        <div style="height:220px; position:relative;"><canvas id="chart-prop-motivos-perda"></canvas></div>
                        <table style="width:100%; border-collapse:collapse; font-size:0.8rem;">
                            <thead>
                                <tr style="background:#f8fafc; border-bottom:2px solid #e2e8f0; color:#475569; text-align:left;">
                                    <th style="padding:8px;">Motivo</th>
                                    <th style="padding:8px; text-align:center;">Qtd. Propostas</th>
                                    <th style="padding:8px; text-align:right;">Valor Perdido</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${listaMotivos.map(m => `
                                    <tr style="border-bottom:1px solid #f1f5f9;">
                                        <td style="padding:8px; font-weight:700; color:#0f172a;">${escHtml(m.motivo)}</td>
                                        <td style="padding:8px; text-align:center; font-weight:800; color:#dc2626;">${m.qtd}</td>
                                        <td style="padding:8px; text-align:right; font-weight:700; color:#475569;">${fmtMoeda(m.valor)}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                `}
            </div>
        `;

        createChart('chart-prop-evolucao', {
            type: 'bar',
            data: {
                labels: seriesMes.map(m => m.label),
                datasets: [{
                    label: 'Propostas Emitidas',
                    data: seriesMes.map(m => m.qtd),
                    backgroundColor: '#7048e8',
                    borderRadius: 6
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } }
        });

        createChart('chart-prop-status', {
            type: 'doughnut',
            data: {
                labels: listaStatus.map(s => s.status),
                datasets: [{
                    data: listaStatus.map(s => s.qtd),
                    backgroundColor: ['#eab308', '#7048e8', '#0284c7', '#0d9488', '#15803d', '#16a34a', '#dc2626', '#0f172a', '#ea580c']
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
        });

        createChart('chart-prop-vendedores', {
            type: 'bar',
            data: {
                labels: listaVend.map(v => v.nome),
                datasets: [{
                    label: 'Propostas',
                    data: listaVend.map(v => v.qtd),
                    backgroundColor: '#7048e8',
                    borderRadius: 6
                }]
            },
            options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, scales: { x: { beginAtZero: true, ticks: { precision: 0 } } } }
        });

        const topEqProp = listaEquip.slice(0, 12);
        createChart('chart-prop-equipamentos', {
            type: 'bar',
            data: {
                labels: topEqProp.map(e => e.label),
                datasets: [{
                    label: 'Propostas com o Equipamento',
                    data: topEqProp.map(e => e.qtdPropostas),
                    backgroundColor: topEqProp.map(e => e.grupo === 'OBRA' ? '#156EB6' : e.grupo === 'EVENTO' ? '#8E24AA' : '#0d9488'),
                    borderRadius: 6
                }]
            },
            options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, scales: { x: { beginAtZero: true, ticks: { precision: 0 } } } }
        });

        if (listaMotivos.length > 0) {
            createChart('chart-prop-motivos-perda', {
                type: 'bar',
                data: {
                    labels: listaMotivos.map(m => m.motivo),
                    datasets: [{
                        label: 'Propostas Perdidas',
                        data: listaMotivos.map(m => m.qtd),
                        backgroundColor: '#dc2626',
                        borderRadius: 6
                    }]
                },
                options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, scales: { x: { beginAtZero: true, ticks: { precision: 0 } } } }
            });
        }
    }

    // =========================================================================
    // ABA 2: CONTRATOS (INFORMAÇÕES IMPORTANTES DO CONTRATO)
    // =========================================================================
    function renderAbaContratos(box, filtradas) {
        const contratos = filtradas.filter(p => p.isContratoFechado);
        const qtdContratos = contratos.length;
        const valorContratado = contratos.reduce((a, p) => a + p.valorTotal, 0);
        const ticketMedioContrato = qtdContratos > 0 ? (valorContratado / qtdContratos) : 0;

        const assinados = contratos.filter(c => normText(c.situacao_contrato).includes('assinado') || normText(c.situacao_contrato).includes('liberada'));
        const tempos = contratos.map(c => c.diasParaFechar).filter(d => d !== null && !isNaN(d));
        const tempoMedio = tempos.length > 0 ? (tempos.reduce((a, b) => a + b, 0) / tempos.length) : 0;

        // Evolução mensal de contratos e faturamento
        const mesesMap = new Map();
        const hoje = new Date();
        for (let i = 5; i >= 0; i--) {
            const ym = getMesAnoKey(new Date(hoje.getFullYear(), hoje.getMonth() - i, 1));
            mesesMap.set(ym, { ym, label: formatMesAnoLabel(ym), qtd: 0, valor: 0 });
        }
        contratos.forEach(c => {
            if (!c.mesEnvio) return;
            if (!mesesMap.has(c.mesEnvio)) mesesMap.set(c.mesEnvio, { ym: c.mesEnvio, label: formatMesAnoLabel(c.mesEnvio), qtd: 0, valor: 0 });
            const m = mesesMap.get(c.mesEnvio);
            m.qtd++;
            m.valor += c.valorTotal;
        });
        const seriesMes = Array.from(mesesMap.values()).sort((a, b) => a.ym.localeCompare(b.ym));

        // Contratos por Tipo de Contrato (EVENTO, OBRA MENSAL, OBRA QUINZENAL, OBRA SEMANAL, LIMPA FOSSA, EQUIPAMENTOS)
        const mapTipos = new Map();
        NOSSOS_TIPOS_CONTRATO.filter(t => t !== 'ADITIVO').forEach(t => mapTipos.set(t, { tipo: t, qtd: 0, valor: 0 }));
        contratos.forEach(c => {
            if (!mapTipos.has(c.tipoContrato)) mapTipos.set(c.tipoContrato, { tipo: c.tipoContrato, qtd: 0, valor: 0 });
            const obj = mapTipos.get(c.tipoContrato);
            obj.qtd++;
            obj.valor += c.valorTotal;
        });
        const listaTipos = Array.from(mapTipos.values());

        // Contratos por Vendedor
        const mapVend = new Map();
        contratos.forEach(c => {
            if (!mapVend.has(c.vendedorNorm)) mapVend.set(c.vendedorNorm, { nome: c.vendedor, qtd: 0, valor: 0 });
            const v = mapVend.get(c.vendedorNorm);
            v.qtd++;
            v.valor += c.valorTotal;
        });
        const listaVend = Array.from(mapVend.values()).sort((a, b) => b.valor - a.valor || b.qtd - a.qtd);

        // Equipamentos locados nos contratos (com ícones da OS)
        const mapEquip = new Map();
        EQUIPAMENTOS_OS_CATALOGO.forEach(e => mapEquip.set(e.key, { ...e, contratosIds: new Set(), unidades: 0, valor: 0 }));
        contratos.forEach(c => {
            c.itensOS.forEach(it => {
                if (!mapEquip.has(it.key)) mapEquip.set(it.key, { key: it.key, label: it.label, grupo: it.grupo, contratosIds: new Set(), unidades: 0, valor: 0 });
                const eq = mapEquip.get(it.key);
                eq.contratosIds.add(c.id);
                eq.unidades += it.quantidade;
                eq.valor += it.valorRateado;
            });
        });
        const listaEquip = Array.from(mapEquip.values())
            .map(e => ({ ...e, qtdContratos: e.contratosIds.size }))
            .filter(e => e.qtdContratos > 0)
            .sort((a, b) => b.valor - a.valor || b.qtdContratos - a.qtdContratos);

        // Contratos por Perfil de Cliente (💎 Diamante, 🥇 Ouro, 🥈 Prata, 🥉 Bronze, Nenhuma categoria)
        const mapPerfil = new Map();
        PERFIS_CLIENTE.forEach(pf => mapPerfil.set(pf.key, { ...pf, qtd: 0, valor: 0 }));
        contratos.forEach(c => {
            const pf = mapPerfil.get(c.categoriaCliente) || mapPerfil.get('NENHUMA');
            pf.qtd++;
            pf.valor += c.valorTotal;
        });
        const listaPerfis = Array.from(mapPerfil.values());

        box.innerHTML = `
            <!-- KPIs de Contratos -->
            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:0.85rem; margin-bottom:1.15rem;">
                <div style="background:#fff; border:1px solid #e2e8f0; border-left:4px solid #16a34a; border-radius:12px; padding:1rem 1.15rem;">
                    <div style="font-size:0.75rem; font-weight:800; color:#64748b;">Contratos Fechados</div>
                    <div style="font-size:1.75rem; font-weight:900; color:#15803d; margin:3px 0;">${qtdContratos}</div>
                    <div style="font-size:0.78rem; color:#475569; font-weight:600;">Assinados / Liberados: <strong>${assinados.length}</strong></div>
                </div>

                <div style="background:#fff; border:1px solid #e2e8f0; border-left:4px solid #0d9488; border-radius:12px; padding:1rem 1.15rem;">
                    <div style="font-size:0.75rem; font-weight:800; color:#64748b;">Valor Total Contratado</div>
                    <div style="font-size:1.6rem; font-weight:900; color:#0f766e; margin:3px 0;">${fmtMoeda(valorContratado)}</div>
                    <div style="font-size:0.78rem; color:#475569; font-weight:600;">Receita efetiva de contratos</div>
                </div>

                <div style="background:#fff; border:1px solid #e2e8f0; border-left:4px solid #7048e8; border-radius:12px; padding:1rem 1.15rem;">
                    <div style="font-size:0.75rem; font-weight:800; color:#64748b;">Ticket Médio dos Contratos</div>
                    <div style="font-size:1.6rem; font-weight:900; color:#4c1d95; margin:3px 0;">${fmtMoeda(ticketMedioContrato)}</div>
                    <div style="font-size:0.78rem; color:#475569; font-weight:600;">Valor contratado ÷ Contratos</div>
                </div>

                <div style="background:#fff; border:1px solid #e2e8f0; border-left:4px solid #0284c7; border-radius:12px; padding:1rem 1.15rem;">
                    <div style="font-size:0.75rem; font-weight:800; color:#64748b;">Tempo Médio de Fechamento</div>
                    <div style="font-size:1.75rem; font-weight:900; color:#0284c7; margin:3px 0;">${tempoMedio.toFixed(1)} dias</div>
                    <div style="font-size:0.78rem; color:#475569; font-weight:600;">Velocidade média de conversão</div>
                </div>
            </div>

            <!-- Linha 1: Faturamento Contratado por Mês + Faturamento por Tipo de Contrato -->
            <div style="display:grid; grid-template-columns:1.25fr 1fr; gap:1rem; margin-bottom:1rem;">
                <div style="background:#fff; border:1px solid #e2e8f0; border-radius:12px; padding:1.1rem;">
                    <h3 style="margin:0 0 0.2rem; font-size:0.95rem; font-weight:800; color:#0f172a;">1. Evolução Mensal de Faturamento Contratado (R$)</h3>
                    <p style="margin:0 0 0.75rem; font-size:0.75rem; color:#64748b;">Receita fechada em contratos mês a mês</p>
                    <div style="height:265px; position:relative;"><canvas id="chart-ctr-faturamento-mes"></canvas></div>
                </div>

                <div style="background:#fff; border:1px solid #e2e8f0; border-radius:12px; padding:1.1rem;">
                    <h3 style="margin:0 0 0.2rem; font-size:0.95rem; font-weight:800; color:#0f172a;">2. Faturamento por Tipo de Contrato (R$)</h3>
                    <p style="margin:0 0 0.75rem; font-size:0.75rem; color:#64748b;">EVENTO, OBRA MENSAL, OBRA QUINZENAL, OBRA SEMANAL, LIMPA FOSSA e EQUIPAMENTOS</p>
                    <div style="height:265px; position:relative;"><canvas id="chart-ctr-tipos"></canvas></div>
                </div>
            </div>

            <!-- Linha 2: Ranking de Vendedores em Contratos + Equipamentos Locados nos Contratos -->
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem; margin-bottom:1rem;">
                <div style="background:#fff; border:1px solid #e2e8f0; border-radius:12px; padding:1.1rem;">
                    <h3 style="margin:0 0 0.2rem; font-size:0.95rem; font-weight:800; color:#0f172a;">3. Ranking de Vendedores por Contratos Fechados</h3>
                    <p style="margin:0 0 0.75rem; font-size:0.75rem; color:#64748b;">Quantidade de contratos fechados por vendedor</p>
                    <div style="height:270px; position:relative;"><canvas id="chart-ctr-vendedores"></canvas></div>
                </div>

                <div style="background:#fff; border:1px solid #e2e8f0; border-radius:12px; padding:1.1rem;">
                    <h3 style="margin:0 0 0.2rem; font-size:0.95rem; font-weight:800; color:#0f172a;">4. Faturamento por Equipamento nos Contratos (Padrão OS)</h3>
                    <p style="margin:0 0 0.75rem; font-size:0.75rem; color:#64748b;">Receita contratada por equipamento (Obra, Evento e 🛋️ Equipamentos)</p>
                    <div style="height:270px; position:relative;"><canvas id="chart-ctr-equipamentos"></canvas></div>
                </div>
            </div>

            <!-- Linha 3: Contratos por Perfil de Cliente (💎 Diamante, 🥇 Ouro, 🥈 Prata, 🥉 Bronze) -->
            <div style="background:#fff; border:1px solid #e2e8f0; border-radius:12px; padding:1.1rem;">
                <h3 style="margin:0 0 0.65rem; font-size:0.95rem; font-weight:800; color:#0f172a;">5. Contratos e Faturamento por Perfil do Cliente</h3>
                <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(190px, 1fr)); gap:0.75rem;">
                    ${listaPerfis.map(pf => `
                        <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:0.85rem 1rem;">
                            <div style="font-size:0.86rem; font-weight:800; color:#0f172a;">${escHtml(pf.label)}</div>
                            <div style="font-size:1.35rem; font-weight:900; color:#7048e8; margin:4px 0;">${pf.qtd} contrato(s)</div>
                            <div style="font-size:0.78rem; font-weight:700; color:#0f766e;">${fmtMoeda(pf.valor)}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        createChart('chart-ctr-faturamento-mes', {
            type: 'bar',
            data: {
                labels: seriesMes.map(m => m.label),
                datasets: [{
                    label: 'Valor Contratado (R$)',
                    data: seriesMes.map(m => Number(m.valor.toFixed(2))),
                    backgroundColor: '#0d9488',
                    borderRadius: 6
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, ticks: { callback: v => fmtMoedaCurta(v) } } } }
        });

        createChart('chart-ctr-tipos', {
            type: 'bar',
            data: {
                labels: listaTipos.map(t => t.tipo),
                datasets: [{
                    label: 'Faturamento (R$)',
                    data: listaTipos.map(t => Number(t.valor.toFixed(2))),
                    backgroundColor: ['#8E24AA', '#156EB6', '#0284c7', '#38bdf8', '#0d9488', '#eab308'],
                    borderRadius: 6
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, ticks: { callback: v => fmtMoedaCurta(v) } } } }
        });

        createChart('chart-ctr-vendedores', {
            type: 'bar',
            data: {
                labels: listaVend.map(v => v.nome),
                datasets: [{
                    label: 'Contratos Fechados',
                    data: listaVend.map(v => v.qtd),
                    backgroundColor: '#16a34a',
                    borderRadius: 6
                }]
            },
            options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, scales: { x: { beginAtZero: true, ticks: { precision: 0 } } } }
        });

        const topEqCtr = listaEquip.slice(0, 12);
        createChart('chart-ctr-equipamentos', {
            type: 'bar',
            data: {
                labels: topEqCtr.map(e => e.label),
                datasets: [{
                    label: 'Faturamento Contratado (R$)',
                    data: topEqCtr.map(e => Number(e.valor.toFixed(2))),
                    backgroundColor: topEqCtr.map(e => e.grupo === 'OBRA' ? '#156EB6' : e.grupo === 'EVENTO' ? '#8E24AA' : '#0d9488'),
                    borderRadius: 6
                }]
            },
            options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, scales: { x: { beginAtZero: true, ticks: { callback: v => fmtMoedaCurta(v) } } } }
        });
    }

    // =========================================================================
    // ABA 3: COMPARATIVO PROPOSTA X CONTRATO (INFORMAÇÕES COMPARATIVAS)
    // =========================================================================
    function renderAbaComparativo(box, todasProcessadas, filtradas) {
        const totalPropostas = filtradas.length;
        const contratos = filtradas.filter(p => p.isContratoFechado);
        const qtdContratos = contratos.length;
        const taxaConversao = totalPropostas > 0 ? (qtdContratos / totalPropostas) * 100 : 0;

        const valorProposto = filtradas.reduce((a, p) => a + p.valorTotal, 0);
        const valorContratado = contratos.reduce((a, p) => a + p.valorTotal, 0);
        const aproveitamentoFinanceiro = valorProposto > 0 ? (valorContratado / valorProposto) * 100 : 0;

        const ticketProposta = totalPropostas > 0 ? (valorProposto / totalPropostas) : 0;
        const ticketContrato = qtdContratos > 0 ? (valorContratado / qtdContratos) : 0;

        // Séries mensais Proposta x Contrato
        const mesesMap = new Map();
        const hoje = new Date();
        for (let i = 5; i >= 0; i--) {
            const ym = getMesAnoKey(new Date(hoje.getFullYear(), hoje.getMonth() - i, 1));
            mesesMap.set(ym, { ym, label: formatMesAnoLabel(ym), propostas: 0, contratos: 0, valorProposto: 0, valorContratado: 0 });
        }
        filtradas.forEach(p => {
            if (!p.mesEnvio) return;
            if (!mesesMap.has(p.mesEnvio)) mesesMap.set(p.mesEnvio, { ym: p.mesEnvio, label: formatMesAnoLabel(p.mesEnvio), propostas: 0, contratos: 0, valorProposto: 0, valorContratado: 0 });
            const m = mesesMap.get(p.mesEnvio);
            m.propostas++;
            m.valorProposto += p.valorTotal;
            if (p.isContratoFechado) {
                m.contratos++;
                m.valorContratado += p.valorTotal;
            }
        });
        const seriesMes = Array.from(mesesMap.values())
            .sort((a, b) => a.ym.localeCompare(b.ym))
            .map(m => ({
                ...m,
                conversao: m.propostas > 0 ? Number(((m.contratos / m.propostas) * 100).toFixed(1)) : 0
            }));

        // Comparativo por Vendedor
        const mapVend = new Map();
        filtradas.forEach(p => {
            if (!mapVend.has(p.vendedorNorm)) {
                mapVend.set(p.vendedorNorm, { nome: p.vendedor, propostas: 0, contratos: 0, perdidas: 0, valorProposto: 0, valorContratado: 0 });
            }
            const v = mapVend.get(p.vendedorNorm);
            v.propostas++;
            v.valorProposto += p.valorTotal;
            if (p.isContratoFechado) {
                v.contratos++;
                v.valorContratado += p.valorTotal;
            } else if (p.isPerdida) {
                v.perdidas++;
            }
        });
        const listaVend = Array.from(mapVend.values()).map(v => ({
            ...v,
            conversao: v.propostas > 0 ? (v.contratos / v.propostas) * 100 : 0,
            aproveitamento: v.valorProposto > 0 ? (v.valorContratado / v.valorProposto) * 100 : 0,
            ticketMedio: v.contratos > 0 ? (v.valorContratado / v.contratos) : 0
        })).sort((a, b) => b.valorContratado - a.valorContratado || b.contratos - a.contratos);

        // Comparativo por Tipo de Contrato
        const listaTipos = NOSSOS_TIPOS_CONTRATO.filter(t => t !== 'ADITIVO').map(t => {
            const props = filtradas.filter(p => p.tipoContrato === t);
            const ctrs = props.filter(p => p.isContratoFechado);
            const vProp = props.reduce((a, p) => a + p.valorTotal, 0);
            const vCtr = ctrs.reduce((a, p) => a + p.valorTotal, 0);
            return {
                tipo: t,
                propostas: props.length,
                contratos: ctrs.length,
                conversao: props.length > 0 ? (ctrs.length / props.length) * 100 : 0,
                valorProposto: vProp,
                valorContratado: vCtr
            };
        });

        // Comparativo por Equipamento (Propostas x Contratos com ícones da OS)
        const mapEquip = new Map();
        EQUIPAMENTOS_OS_CATALOGO.forEach(e => mapEquip.set(e.key, { ...e, propIds: new Set(), ctrIds: new Set(), valProp: 0, valCtr: 0 }));
        filtradas.forEach(p => {
            p.itensOS.forEach(it => {
                if (!mapEquip.has(it.key)) return;
                const eq = mapEquip.get(it.key);
                eq.propIds.add(p.id);
                eq.valProp += it.valorRateado;
                if (p.isContratoFechado) {
                    eq.ctrIds.add(p.id);
                    eq.valCtr += it.valorRateado;
                }
            });
        });
        const listaEquip = Array.from(mapEquip.values())
            .map(e => ({
                ...e,
                propostas: e.propIds.size,
                contratos: e.ctrIds.size,
                conversao: e.propIds.size > 0 ? (e.ctrIds.size / e.propIds.size) * 100 : 0
            }))
            .filter(e => e.propostas > 0)
            .sort((a, b) => b.propostas - a.propostas);

        box.innerHTML = `
            <!-- KPIs Comparativos Proposta x Contrato -->
            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(230px, 1fr)); gap:0.85rem; margin-bottom:1.15rem;">
                <div style="background:#fff; border:1px solid #e2e8f0; border-left:4px solid #7048e8; border-radius:12px; padding:1rem 1.15rem;">
                    <div style="font-size:0.75rem; font-weight:800; color:#64748b;">Propostas x Contratos (Volume)</div>
                    <div style="font-size:1.55rem; font-weight:900; color:#0f172a; margin:4px 0;">
                        ${totalPropostas} <span style="color:#94a3b8; font-size:1rem;">→</span> <span style="color:#15803d;">${qtdContratos}</span>
                    </div>
                    <div style="font-size:0.76rem; color:#475569;">Propostas emitidas vs Contratos fechados</div>
                </div>

                <div style="background:#fff; border:1px solid #e2e8f0; border-left:4px solid #0284c7; border-radius:12px; padding:1rem 1.15rem;">
                    <div style="font-size:0.75rem; font-weight:800; color:#64748b;">Taxa de Conversão (Quantidade)</div>
                    <div style="font-size:1.7rem; font-weight:900; color:#0284c7; margin:4px 0;">${fmtPct(taxaConversao)}</div>
                    <div style="font-size:0.76rem; color:#475569;">Contratos fechados ÷ Propostas</div>
                </div>

                <div style="background:#fff; border:1px solid #e2e8f0; border-left:4px solid #0d9488; border-radius:12px; padding:1rem 1.15rem;">
                    <div style="font-size:0.75rem; font-weight:800; color:#64748b;">Aproveitamento Financeiro</div>
                    <div style="font-size:1.7rem; font-weight:900; color:#0f766e; margin:4px 0;">${fmtPct(aproveitamentoFinanceiro)}</div>
                    <div style="font-size:0.76rem; color:#475569;">${fmtMoedaCurta(valorContratado)} de ${fmtMoedaCurta(valorProposto)}</div>
                </div>

                <div style="background:#fff; border:1px solid #e2e8f0; border-left:4px solid #eab308; border-radius:12px; padding:1rem 1.15rem;">
                    <div style="font-size:0.75rem; font-weight:800; color:#64748b;">Ticket Médio: Proposta x Contrato</div>
                    <div style="font-size:1.15rem; font-weight:900; color:#0f172a; margin:6px 0;">
                        ${fmtMoedaCurta(ticketProposta)} <span style="color:#94a3b8;">vs</span> <span style="color:#0f766e;">${fmtMoedaCurta(ticketContrato)}</span>
                    </div>
                    <div style="font-size:0.76rem; color:#475569;">Comparativo de valor médio</div>
                </div>
            </div>

            <!-- Linha 1: Propostas x Contratos por Mês + Valor Proposto x Valor Contratado por Mês -->
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem; margin-bottom:1rem;">
                <div style="background:#fff; border:1px solid #e2e8f0; border-radius:12px; padding:1.1rem;">
                    <h3 style="margin:0 0 0.2rem; font-size:0.95rem; font-weight:800; color:#0f172a;">1. Propostas Enviadas x Contratos Fechados por Mês</h3>
                    <p style="margin:0 0 0.75rem; font-size:0.75rem; color:#64748b;">Comparativo mensal de volume e conversão</p>
                    <div style="height:265px; position:relative;"><canvas id="chart-comp-mes-qtd"></canvas></div>
                </div>

                <div style="background:#fff; border:1px solid #e2e8f0; border-radius:12px; padding:1.1rem;">
                    <h3 style="margin:0 0 0.2rem; font-size:0.95rem; font-weight:800; color:#0f172a;">2. Valor Proposto x Valor Efetivamente Contratado (R$)</h3>
                    <p style="margin:0 0 0.75rem; font-size:0.75rem; color:#64748b;">Volume financeiro orçado vs receita contratada por mês</p>
                    <div style="height:265px; position:relative;"><canvas id="chart-comp-mes-valor"></canvas></div>
                </div>
            </div>

            <!-- Linha 2: Propostas x Contratos por Equipamento + Conversão por Tipo de Contrato -->
            <div style="display:grid; grid-template-columns:1.15fr 1fr; gap:1rem; margin-bottom:1rem;">
                <div style="background:#fff; border:1px solid #e2e8f0; border-radius:12px; padding:1.1rem;">
                    <h3 style="margin:0 0 0.2rem; font-size:0.95rem; font-weight:800; color:#0f172a;">3. Propostas x Contratos por Equipamento (Padrão OS)</h3>
                    <p style="margin:0 0 0.75rem; font-size:0.75rem; color:#64748b;">O que tem mais demanda nas propostas vs o que efetivamente vira contrato</p>
                    <div style="height:275px; position:relative;"><canvas id="chart-comp-equip"></canvas></div>
                </div>

                <div style="background:#fff; border:1px solid #e2e8f0; border-radius:12px; padding:1.1rem;">
                    <h3 style="margin:0 0 0.2rem; font-size:0.95rem; font-weight:800; color:#0f172a;">4. Propostas x Contratos por Tipo de Contrato</h3>
                    <p style="margin:0 0 0.75rem; font-size:0.75rem; color:#64748b;">Comparativo entre EVENTO, OBRA MENSAL, QUINZENAL, SEMANAL, LIMPA FOSSA e EQUIPAMENTOS</p>
                    <div style="height:275px; position:relative;"><canvas id="chart-comp-tipos"></canvas></div>
                </div>
            </div>

            <!-- Tabela Comparativa Completa Proposta x Contrato por Vendedor -->
            <div style="background:#fff; border:1px solid #e2e8f0; border-radius:12px; padding:1.1rem; overflow-x:auto;">
                <h3 style="margin:0 0 0.75rem; font-size:0.96rem; font-weight:800; color:#0f172a;">5. Comparativo Proposta x Contrato por Vendedor</h3>
                <table style="width:100%; border-collapse:collapse; font-size:0.81rem;">
                    <thead>
                        <tr style="background:#f8fafc; border-bottom:2px solid #e2e8f0; color:#475569; text-align:left;">
                            <th style="padding:10px;">Vendedor</th>
                            <th style="padding:10px; text-align:center;">Propostas</th>
                            <th style="padding:10px; text-align:center;">Contratos Fechados</th>
                            <th style="padding:10px; text-align:center;">Taxa de Conversão</th>
                            <th style="padding:10px; text-align:right;">Valor em Propostas</th>
                            <th style="padding:10px; text-align:right;">Valor em Contratos</th>
                            <th style="padding:10px; text-align:center;">Aproveitamento Financ.</th>
                            <th style="padding:10px; text-align:right;">Ticket Médio Contrato</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${listaVend.length === 0 ? `
                            <tr><td colspan="8" style="padding:18px; text-align:center; color:#94a3b8;">Nenhum registro encontrado para os filtros aplicados.</td></tr>
                        ` : listaVend.map(v => `
                            <tr style="border-bottom:1px solid #f1f5f9;">
                                <td style="padding:10px; font-weight:800; color:#0f172a;">${escHtml(v.nome)}</td>
                                <td style="padding:10px; text-align:center; font-weight:700;">${v.propostas}</td>
                                <td style="padding:10px; text-align:center; font-weight:800; color:#15803d;">${v.contratos}</td>
                                <td style="padding:10px; text-align:center;">
                                    <span style="background:#e0f2fe; color:#0369a1; padding:2px 9px; border-radius:999px; font-weight:800; font-size:0.75rem;">${fmtPct(v.conversao)}</span>
                                </td>
                                <td style="padding:10px; text-align:right; color:#64748b; font-weight:600;">${fmtMoeda(v.valorProposto)}</td>
                                <td style="padding:10px; text-align:right; color:#0f766e; font-weight:800;">${fmtMoeda(v.valorContratado)}</td>
                                <td style="padding:10px; text-align:center; font-weight:700; color:#334155;">${fmtPct(v.aproveitamento)}</td>
                                <td style="padding:10px; text-align:right; font-weight:700;">${fmtMoeda(v.ticketMedio)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;

        createChart('chart-comp-mes-qtd', {
            type: 'bar',
            data: {
                labels: seriesMes.map(m => m.label),
                datasets: [
                    { label: 'Propostas', data: seriesMes.map(m => m.propostas), backgroundColor: '#7048e8', borderRadius: 5 },
                    { label: 'Contratos Fechados', data: seriesMes.map(m => m.contratos), backgroundColor: '#16a34a', borderRadius: 5 }
                ]
            },
            options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } }
        });

        createChart('chart-comp-mes-valor', {
            type: 'bar',
            data: {
                labels: seriesMes.map(m => m.label),
                datasets: [
                    { label: 'Valor Proposto (R$)', data: seriesMes.map(m => Number(m.valorProposto.toFixed(2))), backgroundColor: '#94a3b8', borderRadius: 5 },
                    { label: 'Valor Contratado (R$)', data: seriesMes.map(m => Number(m.valorContratado.toFixed(2))), backgroundColor: '#0d9488', borderRadius: 5 }
                ]
            },
            options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, ticks: { callback: v => fmtMoedaCurta(v) } } } }
        });

        const topEqComp = listaEquip.slice(0, 10);
        createChart('chart-comp-equip', {
            type: 'bar',
            data: {
                labels: topEqComp.map(e => e.label),
                datasets: [
                    { label: 'Propostas', data: topEqComp.map(e => e.propostas), backgroundColor: '#7048e8', borderRadius: 5 },
                    { label: 'Contratos', data: topEqComp.map(e => e.contratos), backgroundColor: '#16a34a', borderRadius: 5 }
                ]
            },
            options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } }
        });

        createChart('chart-comp-tipos', {
            type: 'bar',
            data: {
                labels: listaTipos.map(t => t.tipo),
                datasets: [
                    { label: 'Propostas', data: listaTipos.map(t => t.propostas), backgroundColor: '#7048e8', borderRadius: 5 },
                    { label: 'Contratos', data: listaTipos.map(t => t.contratos), backgroundColor: '#16a34a', borderRadius: 5 }
                ]
            },
            options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } }
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
            if (!forcarReload && STATE.initialized && STATE.propostasRaw.length > 0) {
                const cont = document.getElementById('view-comercial-dashboard');
                if (cont && cont.innerHTML.trim()) return;
            }
            if (!STATE.initialized || forcarReload || STATE.propostasRaw.length === 0) {
                await carregarDadosBackend();
                STATE.initialized = true;
            }
            renderPainel();
        },

        resetarAbaFechada() {
            STATE.initialized = false;
            STATE.propostasRaw = [];
            const cont = document.getElementById('view-comercial-dashboard');
            if (cont) cont.innerHTML = '';
        },

        setAba(abaId) {
            STATE.abaAtiva = abaId;
            renderPainel();
        },

        setPresetPeriodo(preset) {
            STATE.periodoPreset = preset;
            const r = calcularRangePreset(preset);
            STATE.dataInicio = r.inicio;
            STATE.dataFim = r.fim;
            renderPainel();
        },

        onCustomDateChange() {
            STATE.periodoPreset = 'custom';
            STATE.dataInicio = document.getElementById('dash-com-dt-ini')?.value || '';
            STATE.dataFim = document.getElementById('dash-com-dt-fim')?.value || '';
            renderPainel();
        },

        setFiltro(chave, valor) {
            STATE[chave] = valor;
            renderPainel();
        },

        abrirDropdownRegiaoCidade(mostrar) {
            const dd = document.getElementById('dd-dash-regiao-cidade');
            if (dd) dd.style.display = mostrar ? 'block' : 'none';
        },

        selecionarRegiaoCidade(val) {
            STATE.regiaoCidadeFiltro = val;
            const inp = document.getElementById('dash-com-filtro-regiao');
            if (inp) inp.value = val;
            this.abrirDropdownRegiaoCidade(false);
            renderPainel();
        },

        onRegiaoInput(valor) {
            STATE.regiaoCidadeFiltro = valor;
            const termo = normText(valor);
            const dd = document.getElementById('dd-dash-regiao-cidade');
            if (dd) {
                dd.style.display = 'block';
                dd.querySelectorAll('[data-reg-opt]').forEach(el => {
                    const s = el.getAttribute('data-reg-opt') || '';
                    el.style.display = (!termo || s.includes(termo)) ? 'block' : 'none';
                });
            }
            clearTimeout(_regiaoDebounce);
            _regiaoDebounce = setTimeout(() => {
                const todasProcessadas = processarDados();
                const filtradas = aplicarFiltros(todasProcessadas);
                renderConteudoAba(todasProcessadas, filtradas);
            }, 180);
        },

        toggleDropdown(ddId) {
            ['dd-dash-vendedores', 'dd-dash-produtos', 'dd-dash-regiao-cidade'].forEach(id => {
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
            renderPainel();
            const dd = document.getElementById('dd-dash-vendedores');
            if (dd) dd.style.display = 'block';
        },

        toggleEquipamento(eqKey, checked) {
            const set = new Set(STATE.equipamentosSelecionados);
            if (checked) set.add(eqKey);
            else set.delete(eqKey);
            STATE.equipamentosSelecionados = Array.from(set);
            renderPainel();
            const dd = document.getElementById('dd-dash-produtos');
            if (dd) dd.style.display = 'block';
        },

        limparFiltros() {
            STATE.periodoPreset = 'ano';
            const r = calcularRangePreset('ano');
            STATE.dataInicio = r.inicio;
            STATE.dataFim = r.fim;
            STATE.vendedoresSelecionados = [];
            STATE.equipamentosSelecionados = [];
            STATE.tipoContratoFiltro = 'TODOS';
            STATE.statusPropostaFiltro = 'TODOS';
            STATE.perfilClienteFiltro = 'TODOS';
            STATE.regiaoCidadeFiltro = '';
            renderPainel();
        }
    };

    document.addEventListener('click', (ev) => {
        ['dd-dash-vendedores', 'dd-dash-produtos', 'dd-dash-regiao-cidade'].forEach(id => {
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
