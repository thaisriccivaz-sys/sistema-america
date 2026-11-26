/**
 * ============================================================================
 * MÓDULO: COMERCIAL → OS
 * Tela de OS do Comercial (independente da tela de OS da Logística).
 *
 * Regras implementadas:
 *   - O campo Tipo * é preenchido com o Tipo de OS do Comercial:
 *       1. Envio
 *       2. Visita técnica
 *       3. Limpa fossa
 *       4. Compras
 *       5. Equipamentos
 *   - Regra automática de tipo ao gerar pelo contrato:
 *       * Quando for um contrato do tipo EQUIPAMENTOS que não tenha nenhum
 *         equipamento da tela de OS da Logística → OS do tipo "Equipamentos".
 *       * Quando tiver algum equipamento da tela de OS da Logística → OS do
 *         tipo "Envio" (entrega: obra, evento, equipamentos, interveniente).
 *   - É possível editar o Status da OS e o Tipo da OS.
 *   - Oculta o quadro "Informações do Contrato / OS".
 *   - Oculta o campo "Condição de Pagamento".
 *   - Oculta o campo e o quadro de "Interveniente" (tanto a checkbox ao lado
 *     do título quanto o quadro de dados do interveniente).
 *   - Na aba superior de OS do Comercial:
 *       * Mostra o número da OS carregada na tela como no contrato: "05 - OS".
 *       * Se tiver uma OS carregada na tela e abrir uma nova pelo menu, deixa
 *         a aba da OS que está aberta com o número e abre uma nova aba sem
 *         número nenhum ("OS").
 *       * Se clicar no botão "Novo", abre na mesma aba uma nova OS para
 *         preenchimento, e com a aba sem número ("OS").
 *   - Os anexos do contrato NÃO são anexados automaticamente no quadro de
 *     Anexos da OS do Comercial quando uma OS é criada pelo contrato (a OS
 *     possui sua própria tabela de anexos comercial_os_anexos no Cloudflare R2).
 * ============================================================================
 */
(function () {
    'use strict';

    const OS_COMERCIAL_TIPOS = [
        'Envio',
        'Visita técnica',
        'Limpa fossa',
        'Compras',
        'Equipamentos'
    ];

    const OS_COMERCIAL_STATUS_CONFIG = [
        { nome: 'LIBERADO',                      bg: '#dcfce7', text: '#15803d', border: '#86efac', icon: 'ph-check-circle' },
        { nome: 'ENTREGA AGENDADA',              bg: '#dbeafe', text: '#1d4ed8', border: '#93c5fd', icon: 'ph-calendar-check' },
        { nome: 'ENTREGUE - ACOMPANHAMENTO OS',  bg: '#e0f2fe', text: '#0369a1', border: '#7dd3fc', icon: 'ph-truck' },
        { nome: 'RETIRADA AGENDADA',             bg: '#fef9c3', text: '#a16207', border: '#fde047', icon: 'ph-calendar-plus' },
        { nome: 'RETIRADA PARCIAL REALIZADA',    bg: '#ffedd5', text: '#c2410c', border: '#fdba74', icon: 'ph-arrows-split' },
        { nome: 'RETIRADA TOTAL REALIZADA',      bg: '#f1f5f9', text: '#334155', border: '#cbd5e1', icon: 'ph-seal-check' }
    ];

    window.OS_COMERCIAL_TIPOS = OS_COMERCIAL_TIPOS;
    window.OS_COMERCIAL_STATUS_CONFIG = OS_COMERCIAL_STATUS_CONFIG;
    window._snapshotsOsComercial = window._snapshotsOsComercial || {};
    window._activeOsComercialTabId = window._activeOsComercialTabId || 'comercial-os';

    const state = {
        propostaIdAtiva: null,
        osAtual: null,
        editadoNaoSalvo: false,
        statusNovoDraft: 'LIBERADO',
        tipoNovoDraft: '',
        secoesAbertas: {
            periodo: false,
            produtos: false,
            servicos: false,
            anexos: false
        },
        anexosAtuais: []
    };

    function normStr(s) {
        return String(s || '')
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
            .replace(/"/g, '&quot;');
    }

    function fmtMoeda(v) {
        const n = Number(v) || 0;
        return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function hojeIso() {
        return new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString().substring(0, 10);
    }

    function obterConfigStatusOs(statusRaw) {
        const sNorm = normStr(statusRaw).toUpperCase();
        return OS_COMERCIAL_STATUS_CONFIG.find(c => normStr(c.nome).toUpperCase() === sNorm)
            || OS_COMERCIAL_STATUS_CONFIG[0];
    }

    window.renderBadgeStatusOsComercialHtml = function (statusRaw) {
        const cfg = obterConfigStatusOs(statusRaw);
        return `<span style="display:inline-flex; align-items:center; gap:5px;">
            <span style="background:${cfg.bg}; color:${cfg.text}; border:1px solid ${cfg.border}; padding:2px 10px; border-radius:999px; font-size:0.73rem; font-weight:800; white-space:nowrap; display:inline-flex; align-items:center; gap:4px;">
                <i class="ph ${cfg.icon}" style="font-size:0.85rem;"></i> ${esc(cfg.nome)}
            </span>
        </span>`;
    };

    /**
     * Verifica se um produto pertence à lista de equipamentos da tela de OS da Logística:
     * (STD, LX, EXL, PCD, CHUVEIRO, HIDRÁULICO, MICTÓRIO, PBII, PBIII, GUARITA, LIMPA FOSSA, CARRINHO, CAIXA D'ÁGUA)
     */
    function itemEhEquipamentoLogistica(nomeProd) {
        const n = normStr(nomeProd);
        if (!n) return false;
        return (
            n.includes('standard') || n.includes('standart') || /\bstd\b/.test(n) ||
            n.includes('luxo') || n.includes('luxury') || /\blx\b/.test(n) ||
            n.includes('extra lux') || /\b(exl|elx)\b/.test(n) ||
            n.includes('pcd') || n.includes('pne') || n.includes('deficiente') || n.includes('acessivel') ||
            n.includes('chuveiro') ||
            n.includes('hidraulic') ||
            n.includes('mictorio') || n.includes('kros') ||
            n.includes('pia') || n.includes('pbii') || n.includes('pbiii') || n.includes('lavatorio') ||
            n.includes('guarita') ||
            n.includes('fossa') || n.includes('succao') || n.includes('caminhao') ||
            n.includes('carrinho') ||
            (n.includes('caixa') && n.includes('agua')) ||
            n.includes('banheiro') || n.includes('cabine')
        );
    }

    /**
     * Resolve o Tipo de OS Comercial (Envio, Visita técnica, Limpa fossa, Compras, Equipamentos)
     * seguindo a regra:
     * - Quando for um contrato do tipo EQUIPAMENTOS que não tenha nenhum equipamento da OS da Logística → "Equipamentos"
     * - Quando tiver algum equipamento da tela de OS da Logística → "Envio" (entrega: obra, evento, equipamentos, interveniente)
     * - Quando for contrato de LIMPA FOSSA → "Limpa fossa"
     */
    function resolverTipoOsComercial(prop) {
        if (!prop) return '';
        const salvo = String(prop.os_tipo_operacao || '').trim();
        const matchSalvo = OS_COMERCIAL_TIPOS.find(t => normStr(t) === normStr(salvo));
        if (matchSalvo) {
            // Se era contrato de EQUIPAMENTOS sem equipamento da logística, garante 'Equipamentos'
            const tipoCtrUp = String(prop.tipo || '').trim().toUpperCase().replace(/^PROPOSTA\s+/i, '');
            if (tipoCtrUp === 'EQUIPAMENTOS') {
                let itens = [];
                try {
                    itens = typeof prop.itens === 'string' ? JSON.parse(prop.itens || '[]') : (Array.isArray(prop.itens) ? prop.itens : []);
                } catch (_) { itens = []; }
                const temEqLog = (Array.isArray(itens) ? itens : []).some(it => it && !it._substituido_por_aditivo && itemEhEquipamentoLogistica(it.produto || it.descricao || it.nome || ''));
                if (!temEqLog) return 'Equipamentos';
            }
            return matchSalvo;
        }

        const tipoCtr = String(prop.tipo || '').trim().toUpperCase().replace(/^PROPOSTA\s+/i, '');
        if (tipoCtr === 'LIMPA FOSSA') return 'Limpa fossa';

        let itensArr = [];
        try {
            itensArr = typeof prop.itens === 'string' ? JSON.parse(prop.itens || '[]') : (Array.isArray(prop.itens) ? prop.itens : []);
        } catch (_) { itensArr = []; }

        const temEquipLogistica = (Array.isArray(itensArr) ? itensArr : []).some(it => {
            if (!it || it._substituido_por_aditivo) return false;
            return itemEhEquipamentoLogistica(it.produto || it.descricao || it.nome || '');
        });

        if (tipoCtr === 'EQUIPAMENTOS' && !temEquipLogistica) {
            return 'Equipamentos';
        }
        if (temEquipLogistica) {
            return 'Envio';
        }
        return tipoCtr === 'EQUIPAMENTOS' ? 'Equipamentos' : 'Envio';
    }

    function contratoEstaAssinado(p) {
        if (!p) return false;
        const sitUp = String(p.situacao_contrato || '').trim().toUpperCase();
        const assSt = String(p.assinafy_status || '').trim().toLowerCase();
        return Boolean(
            sitUp === 'CONTRATO ASSINADO' ||
            sitUp === 'CONTRATO DIGITAL ASSINADO' ||
            sitUp === 'NÃO ASSINA CONTRATO - ENTREGA LIBERADA' ||
            sitUp === 'NAO ASSINA CONTRATO - ENTREGA LIBERADA' ||
            assSt === 'assinado' || assSt === 'signed' || assSt === 'certificated' ||
            p.assinafy_signed_at || p.assinafy_signed_r2_key ||
            (typeof window.propostaFoiAssinadaViaAssinafy === 'function' && window.propostaFoiAssinadaViaAssinafy(p))
        );
    }

    async function buscarTodasOsDoSistema() {
        let lista = [];
        try {
            if (typeof window.apiGet === 'function') {
                lista = await window.apiGet('/propostas');
            } else {
                const tk = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token') || '';
                const r = await fetch('/api/propostas', { headers: tk ? { 'Authorization': 'Bearer ' + tk } : {} });
                if (r.ok) lista = await r.json();
            }
        } catch (_) {}
        if (Array.isArray(lista) && lista.length > 0) {
            window._propostasData = lista;
        } else if (Array.isArray(window._propostasData)) {
            lista = window._propostasData;
        }
        return (Array.isArray(lista) ? lista : []).filter(p => {
            const temOs = Boolean(p.numero_os && String(p.numero_os).trim());
            const tipoUp = String(p.tipo || '').trim().toUpperCase().replace(/^PROPOSTA\s+/i, '');
            return temOs && tipoUp !== 'ADITIVO' && contratoEstaAssinado(p);
        });
    }

    function obterTabIdAtivaOsComercial() {
        const tabsArr = (typeof appOpenTabs !== 'undefined' && Array.isArray(appOpenTabs)) ? appOpenTabs : window.appOpenTabs;
        if (Array.isArray(tabsArr)) {
            const ativa = tabsArr.find(t => t && t.active && t.target === 'comercial-os');
            if (ativa && ativa.tabId) {
                window._activeOsComercialTabId = ativa.tabId;
                return ativa.tabId;
            }
        }
        return window._activeOsComercialTabId || 'comercial-os';
    }

    function atualizarTituloAbaSuperior(numOs, tabIdOverride) {
        const tabsArr = (typeof appOpenTabs !== 'undefined' && Array.isArray(appOpenTabs)) ? appOpenTabs : window.appOpenTabs;
        if (!Array.isArray(tabsArr)) return;
        const tabIdAlvo = tabIdOverride || obterTabIdAtivaOsComercial();
        const tabOs = tabsArr.find(t => t && t.tabId === tabIdAlvo)
            || tabsArr.find(t => t && t.target === 'comercial-os' && t.active);
        if (!tabOs) return;
        const numLimpo = String(numOs || '').trim();
        const novoTitulo = numLimpo ? `${numLimpo.padStart(2, '0')} - OS` : 'OS';
        if (tabOs.title !== novoTitulo) {
            tabOs.title = novoTitulo;
            if (typeof renderAppTabs === 'function') renderAppTabs();
        }
    }

    function renderProdutosGridHtml(prop) {
        let itens = [];
        try {
            itens = typeof prop?.itens === 'string' ? JSON.parse(prop.itens || '[]') : (Array.isArray(prop?.itens) ? prop.itens : []);
        } catch (_) { itens = []; }
        itens = (Array.isArray(itens) ? itens : []).filter(it => it && !it._substituido_por_aditivo);

        const badge = document.getElementById('cos-produtos-count-badge');
        const somaQtd = itens.reduce((acc, it) => acc + (Math.max(1, parseInt(it.quantidade ?? it.qtde ?? 1, 10) || 1)), 0);
        if (badge) {
            if (itens.length > 0) {
                badge.style.display = 'inline-flex';
                badge.textContent = `${itens.length} item(ns) · Qtd. total: ${somaQtd}`;
            } else {
                badge.style.display = 'none';
            }
        }

        if (itens.length === 0) {
            return `<tr><td colspan="7" style="text-align:center; color:#94a3b8; padding:1.25rem; font-size:0.84rem; font-style:italic;">Nenhum produto vinculado a esta OS.</td></tr>`;
        }

        const tipoUp = String(prop?.tipo || '').trim().toUpperCase().replace(/^PROPOSTA\s+/i, '');
        const ehEv = ['EVENTO', 'EQUIPAMENTOS', 'EQUIPAMENTO'].includes(tipoUp);

        return itens.map(it => {
            const nomeRaw = String(it.produto || it.descricao || it.nome || '—');
            const obs = String(it.observacao || '').trim();
            const qtd = Math.max(1, parseInt(it.quantidade ?? it.qtde ?? 1, 10) || 1);
            const vUnit = parseFloat(it.valor ?? it.valor_unitario ?? 0) || 0;
            const sub = (it.valor_total !== undefined && !isNaN(parseFloat(it.valor_total))) ? parseFloat(it.valor_total) : (qtd * vUnit);
            const diasArr = Array.isArray(it.dias_evento) ? it.dias_evento.filter(Boolean) : [];
            const nDiarias = ehEv ? (diasArr.length > 0 ? diasArr.length : Math.max(1, parseInt(prop?.dias_contrato || 1, 10) || 1)) : 1;
            const totFinal = ehEv ? (sub * nDiarias) : sub;
            const manutStr = ehEv ? `${nDiarias} diária(s)` : (it.manut_semana ? `${it.manut_semana}x/sem.` : '—');
            const descPct = parseFloat(it.desconto_pct) || 0;
            const descRs = parseFloat(it.desconto_rs) || 0;
            const descStr = descPct > 0 ? `${descPct.toFixed(2)}%` : (descRs > 0 ? `R$ ${fmtMoeda(descRs)}` : '—');

            return `
                <tr style="border-bottom:1px solid #e2e8f0;">
                    <td style="padding:9px 10px; font-weight:700; color:#1e293b;">${esc(nomeRaw)}</td>
                    <td style="padding:9px 10px; color:#475569;">${esc(obs || '—')}</td>
                    <td style="padding:9px 6px; text-align:center; font-weight:800; color:#0f172a;">${qtd}</td>
                    <td style="padding:9px 6px; text-align:center; color:#475569; font-weight:600;">${esc(manutStr)}</td>
                    <td style="padding:9px 6px; text-align:center; color:#b45309; font-weight:600;">${esc(descStr)}</td>
                    <td style="padding:9px 8px; text-align:right; font-weight:700; color:#0f172a;">R$ ${fmtMoeda(vUnit)}</td>
                    <td style="padding:9px 8px; text-align:right; font-weight:800; color:#15803d;">R$ ${fmtMoeda(totFinal)}</td>
                </tr>
            `;
        }).join('');
    }

    function renderServicosGridHtml(prop) {
        let servs = [];
        try {
            servs = typeof prop?.itens_servicos === 'string' ? JSON.parse(prop.itens_servicos || '[]') : (Array.isArray(prop?.itens_servicos) ? prop.itens_servicos : []);
        } catch (_) { servs = []; }
        servs = (Array.isArray(servs) ? servs : []).filter(s => s && !s._substituido_por_aditivo);

        if (servs.length === 0) {
            const temFob = Number(prop?.servico_frete_fob) === 1;
            return `<tr><td colspan="5" style="text-align:center; color:#94a3b8; padding:1rem; font-size:0.83rem; font-style:italic;">${temFob ? 'Frete FOB (Retirada pelo cliente)' : 'Nenhum serviço adicional registrado.'}</td></tr>`;
        }

        return servs.map(s => {
            const nome = String(s.servico || s.produto || s.descricao || '—');
            const obs = String(s.observacao || '').trim();
            const qtd = Math.max(1, parseInt(s.quantidade ?? s.qtde ?? 1, 10) || 1);
            const vUnit = parseFloat(s.valor ?? s.valor_unitario ?? 0) || 0;
            const vTot = (s.valor_total !== undefined && !isNaN(parseFloat(s.valor_total))) ? parseFloat(s.valor_total) : (qtd * vUnit);
            return `
                <tr style="border-bottom:1px solid #e2e8f0;">
                    <td style="padding:8px 10px; font-weight:700; color:#1e293b;">${esc(nome)}</td>
                    <td style="padding:8px 10px; color:#475569;">${esc(obs || '—')}</td>
                    <td style="padding:8px 6px; text-align:center; font-weight:700;">${qtd}</td>
                    <td style="padding:8px 8px; text-align:right; font-weight:700;">R$ ${fmtMoeda(vUnit)}</td>
                    <td style="padding:8px 8px; text-align:right; font-weight:800; color:#15803d;">R$ ${fmtMoeda(vTot)}</td>
                </tr>
            `;
        }).join('');
    }

    function renderFormOS() {
        const container = document.getElementById('view-comercial-os');
        if (!container) return;

        const prop = state.osAtual;
        const isNovo = !prop || !prop.id;
        const v = (campo) => prop ? (prop[campo] || '') : '';
        const vn = (campo, def = '0') => prop ? (prop[campo] ?? def) : def;

        // Data de cadastro deve ser a data de criação da OS (os_criada_em), e não do contrato nem da proposta
        const dataCadastroOs = isNovo
            ? hojeIso()
            : (String(v('os_criada_em') || '').trim().substring(0, 10) || hojeIso());

        const statusOsAtual = obterConfigStatusOs(isNovo ? (state.statusNovoDraft || 'LIBERADO') : (v('status_os') || 'LIBERADO')).nome;
        const tipoOsAtual = isNovo ? (state.tipoNovoDraft || '') : resolverTipoOsComercial(prop);

        const clienteNomeRaw = v('cliente_nome');
        const clienteNomeFormatado = (!isNovo && clienteNomeRaw && typeof window.formatarNomeClienteComIcone === 'function')
            ? window.formatarNomeClienteComIcone(clienteNomeRaw)
            : clienteNomeRaw;

        const tipoLimpoUp = String(v('tipo') || '').trim().toUpperCase().replace(/^PROPOSTA\s+/i, '');
        const ehObra = tipoLimpoUp.includes('OBRA');
        const ehEvento = tipoLimpoUp === 'EVENTO';

        atualizarTituloAbaSuperior(!isNovo ? v('numero_os') : null);

        container.innerHTML = `
            <div style="background:#fff; width:100%; border-radius:14px; box-shadow:0 5px 20px rgba(0,0,0,0.05); overflow:visible; margin:0 auto; border: 1px solid #e2e8f0; font-family:'Inter',sans-serif;">
                <!-- Toolbar Superior -->
                <div style="background:#f8fafc; border-bottom:1px solid #e2e8f0; padding:0.65rem 1.5rem; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.6rem; position:sticky; top:0; z-index:997; border-top-left-radius:14px; border-top-right-radius:14px;">
                    <div style="display:flex; gap:0.45rem; align-items:center; flex-wrap:wrap; flex:1; width:100%;">
                        <button type="button" id="btn-cos-novo" onclick="window._comercialOS.novaOSNaMesmaAba()"
                            style="background:#3b82f6; color:white; border:none; padding:0.45rem 1rem; border-radius:6px; cursor:pointer; font-weight:600; font-size:0.82rem; display:inline-flex; align-items:center; gap:5px; transition:background 0.15s;"
                            onmouseover="this.style.background='#2563eb'" onmouseout="this.style.background='#3b82f6'">
                            <i class="ph ph-file-text" style="font-size:1rem;"></i> Novo
                        </button>

                        <button type="button" id="btn-cos-salvar" onclick="window._comercialOS.salvarAlteracoesOS()" ${(!isNovo && state.editadoNaoSalvo) ? '' : 'disabled'}
                            style="background:${(!isNovo && state.editadoNaoSalvo) ? '#16a34a' : '#cbd5e1'}; color:${(!isNovo && state.editadoNaoSalvo) ? '#ffffff' : '#64748b'}; border:none; padding:0.45rem 1rem; border-radius:6px; cursor:${(!isNovo && state.editadoNaoSalvo) ? 'pointer' : 'not-allowed'}; font-weight:600; font-size:0.82rem; display:inline-flex; align-items:center; gap:5px; transition:background 0.15s;">
                            <i class="ph ph-check" style="font-size:1rem;"></i> Salvar
                        </button>

                        <div style="margin-left:auto; display:inline-flex; align-items:center; gap:0.45rem;">
                            ${!isNovo && v('contrato') ? `
                                <button type="button" onclick="window.abrirContratoDaProposta(${Number(prop.id)})" title="Abrir o Contrato Nº ${esc(v('contrato'))} vinculado a esta OS"
                                    style="background:#eab308; color:#0f172a; border:1px solid #ca8a04; padding:0.45rem 1rem; border-radius:6px; cursor:pointer; font-weight:800; font-size:0.82rem; display:inline-flex; align-items:center; gap:5px; transition:background 0.15s;"
                                    onmouseover="this.style.background='#ca8a04'" onmouseout="this.style.background='#eab308'">
                                    <i class="ph ph-file-text" style="font-size:1rem;"></i> Contrato Nº ${esc(v('contrato'))}
                                </button>
                            ` : ''}
                            ${!isNovo && v('codigo') ? `
                                <button type="button" onclick="window.abrirPropostaDiretoId(${Number(prop.id)})" title="Abrir a Proposta Nº ${esc(v('codigo'))} vinculada a esta OS"
                                    style="background:#2563eb; color:#ffffff; border:1px solid #1d4ed8; padding:0.45rem 1rem; border-radius:6px; cursor:pointer; font-weight:700; font-size:0.82rem; display:inline-flex; align-items:center; gap:5px; transition:background 0.15s;"
                                    onmouseover="this.style.background='#1d4ed8'" onmouseout="this.style.background='#2563eb'">
                                    <i class="ph ph-file-text" style="font-size:1rem;"></i> Proposta Nº ${esc(v('codigo'))}
                                </button>
                            ` : ''}
                            ${!isNovo ? `
                                <button type="button" onclick="if(typeof abrirLogsAlteracao === 'function') abrirLogsAlteracao(${Number(prop.id)})"
                                    style="background:#7048e8; color:white; border:none; padding:0.45rem 1rem; border-radius:6px; cursor:pointer; font-weight:600; font-size:0.82rem; display:inline-flex; align-items:center; gap:5px; transition:background 0.15s;"
                                    onmouseover="this.style.background='#5f3dc4'" onmouseout="this.style.background='#7048e8'">
                                    <i class="ph ph-clock-counter-clockwise" style="font-size:1rem;"></i> Histórico
                                </button>
                            ` : ''}
                        </div>
                    </div>
                </div>

                <!-- Corpo do Formulário -->
                <div style="padding:1.5rem;">
                    <form id="form-comercial-os" autocomplete="off" onsubmit="return false;">
                        <!-- Linha 1: Nº da OS, Tipo * (Envio, Visita técnica, Limpa fossa, Compras, Equipamentos), Atendente -->
                        <div style="display:grid; grid-template-columns:1fr 2fr 1.5fr; gap:1rem; margin-bottom:1rem;">
                            <div>
                                <label class="prop-lbl">Nº da OS</label>
                                <div style="display:flex; gap:0.25rem; align-items:center;">
                                    <input type="text" id="cos-codigo" value="${isNovo ? '' : esc(String(v('numero_os') || '').toUpperCase())}"
                                        placeholder="Nº da OS, cliente, contrato ou proposta..."
                                        title="Digite o número da OS (ou cliente / contrato / proposta) e pressione Enter ou clique na lupa"
                                        onkeydown="if(event.key==='Enter'){ event.preventDefault(); event.stopPropagation(); window._comercialOS.pesquisarPorCampoOsInput(); }"
                                        style="flex:1;padding:0.55rem;border:1px solid #cbd5e1;border-radius:6px;background:#fff;color:#1e293b;font-weight:700;font-size:0.85rem;box-sizing:border-box;height:36px;text-transform:none;">
                                    <button type="button" onclick="window._comercialOS.pesquisarPorCampoOsInput()"
                                        style="background:#2563eb; border:none; border-radius:6px; width:36px; height:36px; display:inline-flex; align-items:center; justify-content:center; cursor:pointer; color:#fff; transition:all 0.2s;"
                                        onmouseover="this.style.background='#1d4ed8'" onmouseout="this.style.background='#2563eb'" title="Pesquisar OS pelo número, cliente, contrato ou proposta">
                                        <i class="ph ph-magnifying-glass" style="font-size:1.1rem; font-weight:700;"></i>
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label class="prop-lbl">Tipo *</label>
                                <select id="cos-tipo" onchange="window._comercialOS.onChangeTipoOs(this.value)"
                                    style="width:100%;padding:0.55rem;border:1px solid #cbd5e1;border-radius:6px;font-size:0.85rem;box-sizing:border-box;height:36px;background:#fff;color:#1e293b;text-transform:none;">
                                    <option value="">-- Selecione --</option>
                                    ${OS_COMERCIAL_TIPOS.map(t => `<option value="${esc(t)}" ${normStr(tipoOsAtual) === normStr(t) ? 'selected' : ''}>${esc(t)}</option>`).join('')}
                                </select>
                            </div>

                            <div>
                                <label class="prop-lbl">Atendente</label>
                                <input type="text" id="cos-atendente" value="${esc(typeof window.resolverNomeExibicaoAtendenteComercial === 'function' ? window.resolverNomeExibicaoAtendenteComercial(v('atendente'), false) : (v('atendente_nome') || v('atendente') || ''))}"
                                    readonly style="width:100%;padding:0.55rem;border:1px solid #cbd5e1;border-radius:6px;background:#f8fafc;color:#1e293b;font-size:0.85rem;box-sizing:border-box;height:36px;text-transform:none;">
                            </div>
                        </div>

                        <!-- Linha 2: Título (sem Interveniente), Data Cadastro (Data de criação da OS), Status da OS (sempre editável) -->
                        <div style="display:grid; grid-template-columns:1.6fr 1fr 1.5fr; gap:1rem; margin-bottom:1rem;">
                            <div>
                                <label class="prop-lbl">Título *</label>
                                <input type="text" id="cos-titulo-contrato" value="${esc(v('titulo_contrato'))}" ${isNovo ? 'disabled' : ''}
                                    placeholder="Título da OS / Contrato..."
                                    oninput="window._comercialOS.marcarEditado()"
                                    style="width:100%;padding:0.55rem;border:1px solid #cbd5e1;border-radius:6px;font-size:0.85rem;box-sizing:border-box;height:36px;text-transform:none;">
                            </div>

                            <div>
                                <label class="prop-lbl">Data Cadastro *</label>
                                <input type="date" id="cos-data-cadastro" value="${esc(dataCadastroOs)}" ${isNovo ? 'disabled' : ''}
                                    onchange="window._comercialOS.marcarEditado()"
                                    style="width:100%;padding:0.55rem;border:1px solid #cbd5e1;border-radius:6px;font-size:0.85rem;box-sizing:border-box;height:36px;">
                            </div>

                            <div>
                                <label class="prop-lbl">Status da OS *</label>
                                <div id="cos-status-custom-wrap" style="position:relative; width:100%;">
                                    <button type="button" id="cos-status-custom-btn" onclick="window._comercialOS.toggleMenuStatusOs(event)"
                                        style="width:100%; height:36px; padding:0 8px; border:1px solid #cbd5e1; border-radius:6px; background:#fff; display:flex; align-items:center; justify-content:space-between; text-align:left; gap:8px; cursor:pointer; box-sizing:border-box;">
                                        <span id="cos-status-custom-badge">${window.renderBadgeStatusOsComercialHtml(statusOsAtual)}</span>
                                        <i class="ph ph-caret-down" style="font-size:0.9rem; color:#64748b;"></i>
                                    </button>
                                    <input type="hidden" id="cos-status-os" value="${esc(statusOsAtual)}">
                                    <div id="cos-status-custom-menu" style="display:none; position:absolute; top:calc(100% + 4px); left:0; right:0; max-height:280px; overflow-y:auto; background:#fff; border:1px solid #cbd5e1; border-radius:8px; box-shadow:0 10px 25px rgba(15,23,42,0.14); z-index:1100; padding:6px;">
                                        ${OS_COMERCIAL_STATUS_CONFIG.map(cfg => `
                                            <div onclick="window._comercialOS.selecionarStatusOs('${esc(cfg.nome)}', event)"
                                                style="padding:6px 8px; border-radius:6px; cursor:pointer; display:flex; align-items:center; transition:background 0.12s;"
                                                onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='transparent'">
                                                ${window.renderBadgeStatusOsComercialHtml(cfg.nome)}
                                            </div>
                                        `).join('')}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Seção: Dados do Cliente (Ocultando completamente o quadro de Interveniente conforme solicitado) -->
                        <div style="background:#fdf2f8; border:1px solid #fbcfe8; border-radius:9px; padding:0.6rem 0.9rem; margin-bottom:0.6rem;">
                            <h4 style="margin:0 0 0.4rem; font-size:0.8rem; color:#475569; font-weight:700; display:flex; align-items:center; gap:6px;">
                                <i class="ph ph-buildings" style="color:#7048e8;"></i> Dados do Cliente <span style="color:#dc2626;">*</span>
                            </h4>
                            <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.5rem 0.75rem;">
                                <div>
                                    <label class="prop-lbl">Cliente <span style="color:#ef4444;">*</span></label>
                                    <div style="display:flex; gap:0.4rem; align-items:center;">
                                        <input type="text" id="cos-cliente" value="${esc(clienteNomeFormatado)}"
                                            placeholder="Digite o nome do cliente ou pressione Enter / clique na lupa para pesquisar OS..."
                                            onkeydown="if(event.key==='Enter'){ event.preventDefault(); event.stopPropagation(); window._comercialOS.pesquisarPorCampoClienteInput(); }"
                                            style="width:100%;padding:0.55rem;border:1px solid #cbd5e1;border-radius:6px;font-size:0.85rem;box-sizing:border-box;background:#fff;text-transform:none;">
                                        <button type="button" onclick="window._comercialOS.pesquisarPorCampoClienteInput()"
                                            style="background:#2563eb; color:white; border:none; padding:0 0.7rem; height:36px; border-radius:6px; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; flex-shrink:0;"
                                            onmouseover="this.style.background='#1d4ed8'" onmouseout="this.style.background='#2563eb'" title="Pesquisar OS por Cliente">
                                            <i class="ph ph-magnifying-glass" style="font-size:0.95rem;"></i>
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label class="prop-lbl">Contato <span style="color:#ef4444;">*</span></label>
                                    <input type="text" id="cos-contato" value="${esc(v('contato_nome'))}" readonly
                                        style="width:100%;padding:0.55rem;border:1px solid #cbd5e1;border-radius:6px;font-size:0.85rem;box-sizing:border-box;background:#f8fafc;text-transform:none;">
                                </div>
                            </div>
                        </div>

                        <!-- Seção: Período e Locação (Ocultando o campo Condição de Pagamento) -->
                        <div style="background:#f0fdf4; border:1px solid #bbf7d0; border-radius:9px; padding:0.6rem 0.9rem; margin-bottom:0.6rem;">
                            <div onclick="window._comercialOS.toggleSecao('periodo', event)" style="display:flex; align-items:center; justify-content:space-between; cursor:pointer; user-select:none;">
                                <h4 style="margin:0; font-size:0.8rem; color:#475569; font-weight:700; display:flex; align-items:center; gap:6px;">
                                    <i class="ph ph-calendar" style="color:#16a34a;"></i> Período e Locação
                                </h4>
                                <button type="button" onclick="window._comercialOS.toggleSecao('periodo', event)"
                                    style="display:inline-flex; align-items:center; justify-content:center; width:26px; height:26px; border-radius:6px; border:1px solid #86efac; background:#dcfce7; color:#166534; cursor:pointer;">
                                    <i id="cos-caret-periodo" class="ph ph-caret-down" style="font-size:0.95rem; font-weight:700; transition:transform 0.2s; transform:${state.secoesAbertas.periodo ? 'rotate(180deg)' : 'rotate(0deg)'};"></i>
                                </button>
                            </div>
                            <div id="cos-secao-periodo-body" style="display:${state.secoesAbertas.periodo ? 'block' : 'none'}; margin-top:0.5rem;">
                                <div style="display:grid; grid-template-columns:1fr 0.7fr 1fr 0.7fr 0.6fr; gap:0.5rem 0.75rem; margin-bottom:0.5rem;">
                                    <div>
                                        <label class="prop-lbl">Período Início *</label>
                                        <input type="date" value="${esc(v('periodo_inicio'))}" readonly style="width:100%;padding:0.55rem;border:1px solid #cbd5e1;border-radius:6px;font-size:0.85rem;box-sizing:border-box;background:#f8fafc;">
                                    </div>
                                    <div>
                                        <label class="prop-lbl">Hora Início</label>
                                        <input type="time" value="${esc(v('hora_inicio') || '08:00')}" readonly style="width:100%;padding:0.55rem;border:1px solid #cbd5e1;border-radius:6px;font-size:0.85rem;box-sizing:border-box;background:#f8fafc;">
                                    </div>
                                    <div>
                                        <label class="prop-lbl">Até *</label>
                                        <input type="date" value="${esc(v('periodo_fim'))}" readonly style="width:100%;padding:0.55rem;border:1px solid #cbd5e1;border-radius:6px;font-size:0.85rem;box-sizing:border-box;background:#f8fafc;">
                                    </div>
                                    <div>
                                        <label class="prop-lbl">Hora Fim</label>
                                        <input type="time" value="${esc(v('hora_fim') || '18:00')}" readonly style="width:100%;padding:0.55rem;border:1px solid #cbd5e1;border-radius:6px;font-size:0.85rem;box-sizing:border-box;background:#f8fafc;">
                                    </div>
                                    <div>
                                        <label class="prop-lbl">Dias Contrato</label>
                                        <input type="number" value="${esc(vn('dias_contrato', '0'))}" readonly style="width:100%;padding:0.55rem;border:1px solid #cbd5e1;border-radius:6px;font-size:0.85rem;box-sizing:border-box;background:#f8fafc;">
                                    </div>
                                </div>

                                <div style="display:flex; gap:0.75rem; align-items:center; background:rgba(255,255,255,0.65); padding:0.45rem 0.65rem; border:1px solid #bbf7d0; border-radius:6px; flex-wrap:wrap;">
                                    ${ehEvento ? `
                                        <div style="display:flex; gap:0.4rem; align-items:center; flex:1 1 260px;">
                                            <span style="font-size:0.82rem; font-weight:700; color:#475569; white-space:nowrap;">Nome do Evento:</span>
                                            <input type="text" value="${esc(v('nome_evento'))}" readonly style="width:100%;padding:0.45rem 0.55rem;border:1px solid #cbd5e1;border-radius:6px;font-size:0.85rem;background:#f8fafc;">
                                        </div>
                                    ` : ''}
                                    <div style="display:flex; gap:0.4rem; align-items:center; flex:2 1 360px;">
                                        <span style="font-size:0.82rem; font-weight:700; color:#475569; white-space:nowrap;">Instalação:</span>
                                        <input type="text" id="cos-endereco-instalacao" value="${esc(v('endereco_instalacao'))}" ${isNovo ? 'disabled' : ''}
                                            oninput="window._comercialOS.marcarEditado()"
                                            style="width:100%;padding:0.45rem 0.55rem;border:1px solid #cbd5e1;border-radius:6px;font-size:0.85rem;background:#fff;text-transform:none;">
                                        ${v('regiao') ? `<span style="background:#e0f2fe; color:#0369a1; font-weight:800; font-size:0.72rem; padding:2px 8px; border-radius:999px; white-space:nowrap;">${esc(v('regiao'))}</span>` : ''}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Seção: Produtos -->
                        <div style="background:#fefce8; border:1px solid #fde68a; border-radius:9px; padding:0.6rem 0.9rem; margin-bottom:0.6rem;">
                            <div onclick="window._comercialOS.toggleSecao('produtos', event)" style="display:flex; align-items:center; justify-content:space-between; cursor:pointer; user-select:none;">
                                <h4 style="margin:0; font-size:0.8rem; color:#475569; font-weight:700; display:flex; align-items:center; gap:6px;">
                                    <i class="ph ph-package" style="color:#7048e8;"></i> Produtos <span style="color:#dc2626;">*</span>
                                    <span id="cos-produtos-count-badge" style="display:none; background:#fef9c3; color:#854d0e; border:1px solid #fde047; font-size:0.7rem; font-weight:800; padding:1px 8px; border-radius:999px;"></span>
                                </h4>
                                <button type="button" onclick="window._comercialOS.toggleSecao('produtos', event)"
                                    style="display:inline-flex; align-items:center; justify-content:center; width:26px; height:26px; border-radius:6px; border:1px solid #fcd34d; background:#fef08a; color:#854d0e; cursor:pointer;">
                                    <i id="cos-caret-produtos" class="ph ph-caret-down" style="font-size:0.95rem; font-weight:700; transition:transform 0.2s; transform:${state.secoesAbertas.produtos ? 'rotate(180deg)' : 'rotate(0deg)'};"></i>
                                </button>
                            </div>
                            <div id="cos-secao-produtos-body" style="display:${state.secoesAbertas.produtos ? 'block' : 'none'}; margin-top:0.5rem;">
                                <div style="border:1px solid #e2e8f0; border-radius:8px; background:#fff; overflow:hidden;">
                                    <table style="width:100%; border-collapse:collapse; font-size:0.82rem; text-align:left;">
                                        <thead>
                                            <tr style="background:#f8fafc; border-bottom:2px solid #cbd5e1; color:#475569; font-size:0.72rem; text-transform:uppercase;">
                                                <th style="padding:10px;">Produto</th>
                                                <th style="padding:10px;">Observação</th>
                                                <th style="padding:10px 6px; text-align:center;">Qtd.</th>
                                                <th style="padding:10px 6px; text-align:center;">Diárias / Manut.</th>
                                                <th style="padding:10px 6px; text-align:center;">Desconto</th>
                                                <th style="padding:10px 8px; text-align:right;">Valor Unit.</th>
                                                <th style="padding:10px 8px; text-align:right;">Valor Total</th>
                                            </tr>
                                        </thead>
                                        <tbody id="cos-produtos-tbody">
                                            ${renderProdutosGridHtml(prop)}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        <!-- Seção: Serviços (quando Obra Mensal / Quinzenal / Semanal) -->
                        ${ehObra ? `
                            <div style="background:#eff6ff; border:1px solid #bfdbfe; border-radius:9px; padding:0.6rem 0.9rem; margin-bottom:0.6rem;">
                                <div onclick="window._comercialOS.toggleSecao('servicos', event)" style="display:flex; align-items:center; justify-content:space-between; cursor:pointer; user-select:none;">
                                    <h4 style="margin:0; font-size:0.8rem; color:#1e3a8a; font-weight:700; display:flex; align-items:center; gap:6px;">
                                        <i class="ph ph-wrench" style="color:#2563eb;"></i> Serviços <span style="color:#dc2626;">*</span>
                                    </h4>
                                    <button type="button" onclick="window._comercialOS.toggleSecao('servicos', event)"
                                        style="display:inline-flex; align-items:center; justify-content:center; width:26px; height:26px; border-radius:6px; border:1px solid #93c5fd; background:#dbeafe; color:#1e40af; cursor:pointer;">
                                        <i id="cos-caret-servicos" class="ph ph-caret-down" style="font-size:0.95rem; font-weight:700; transition:transform 0.2s; transform:${state.secoesAbertas.servicos ? 'rotate(180deg)' : 'rotate(0deg)'};"></i>
                                    </button>
                                </div>
                                <div id="cos-secao-servicos-body" style="display:${state.secoesAbertas.servicos ? 'block' : 'none'}; margin-top:0.5rem;">
                                    <div style="border:1px solid #e2e8f0; border-radius:8px; background:#fff; overflow:hidden;">
                                        <table style="width:100%; border-collapse:collapse; font-size:0.82rem; text-align:left;">
                                            <thead>
                                                <tr style="background:#f8fafc; border-bottom:2px solid #cbd5e1; color:#475569; font-size:0.72rem; text-transform:uppercase;">
                                                    <th style="padding:9px 10px;">Serviço</th>
                                                    <th style="padding:9px 10px;">Observação</th>
                                                    <th style="padding:9px 6px; text-align:center;">Qtd.</th>
                                                    <th style="padding:9px 8px; text-align:right;">Valor Unit.</th>
                                                    <th style="padding:9px 8px; text-align:right;">Valor Total</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                ${renderServicosGridHtml(prop)}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        ` : ''}

                        <!-- Seção: Anexos (Exclusivos da OS do Comercial — anexos do contrato não são anexados automaticamente aqui) -->
                        <div style="background:#fefce8; border:1.5px solid #fde047; border-radius:9px; padding:0.65rem 0.9rem; margin-bottom:0.65rem;">
                            <div onclick="window._comercialOS.toggleSecao('anexos', event)" style="display:flex; align-items:center; justify-content:space-between; gap:8px; cursor:pointer; user-select:none;">
                                <h4 style="margin:0; font-size:0.82rem; color:#854d0e; font-weight:800; display:flex; align-items:center; gap:6px; text-transform:uppercase;">
                                    <i class="ph ph-paperclip" style="font-size:1.05rem; color:#ca8a04;"></i> Anexos
                                    <span id="cos-anexos-count-badge" style="background:#fef08a; color:#854d0e; border:1px solid #facc15; padding:1px 8px; border-radius:999px; font-size:0.7rem; font-weight:800;">${state.anexosAtuais.length} anexo(s)</span>
                                </h4>
                                <button type="button" onclick="window._comercialOS.toggleSecao('anexos', event)"
                                    style="display:inline-flex; align-items:center; justify-content:center; width:26px; height:26px; border-radius:6px; border:1px solid #facc15; background:#fef08a; color:#854d0e; cursor:pointer;">
                                    <i id="cos-caret-anexos" class="ph ph-caret-down" style="font-size:0.95rem; font-weight:700; transition:transform 0.2s; transform:${state.secoesAbertas.anexos ? 'rotate(180deg)' : 'rotate(0deg)'};"></i>
                                </button>
                            </div>
                            <div id="cos-secao-anexos-body" style="display:${state.secoesAbertas.anexos ? 'block' : 'none'}; margin-top:0.6rem;">
                                ${!isNovo ? `
                                    <div style="display:flex; gap:0.5rem; align-items:flex-end; margin-bottom:0.6rem; flex-wrap:wrap;">
                                        <div style="flex:1; min-width:200px;">
                                            <label class="prop-lbl" style="color:#713f12;">Título do Anexo</label>
                                            <input type="text" id="cos-anexo-titulo-input" placeholder="Esclareça o título do anexo da OS..."
                                                style="width:100%; padding:0.45rem 0.65rem; border:1px solid #fde047; border-radius:6px; font-size:0.82rem; background:#fff; text-transform:none; height:34px; box-sizing:border-box;">
                                        </div>
                                        <input type="file" id="cos-anexo-file-input" multiple style="display:none;" onchange="window._comercialOS.enviarAnexosOs(this.files)">
                                        <button type="button" onclick="document.getElementById('cos-anexo-file-input')?.click()"
                                            style="background:#ca8a04; color:#fff; border:none; padding:0 0.9rem; height:34px; border-radius:6px; font-size:0.78rem; font-weight:700; cursor:pointer; display:inline-flex; align-items:center; gap:5px;">
                                            <i class="ph ph-upload-simple"></i> Incluir Documento(s) Anexo(s)
                                        </button>
                                    </div>
                                ` : ''}
                                <div id="cos-anexos-lista-wrap">
                                    <div style="text-align:center; color:#94a3b8; font-size:0.82rem; padding:0.85rem; background:#ffffff; border:1px dashed #cbd5e1; border-radius:8px;">
                                        ${isNovo ? 'Selecione uma OS para visualizar ou incluir anexos.' : 'Nenhum documento anexado nesta OS.'}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Observações -->
                        <div style="margin-bottom:0.5rem;">
                            <label class="prop-lbl">Observações</label>
                            <textarea id="cos-obs" rows="3" ${isNovo ? 'disabled' : ''} oninput="window._comercialOS.marcarEditado()"
                                style="width:100%;padding:0.6rem;border:1px solid #cbd5e1;border-radius:6px;font-size:0.85rem;resize:vertical;box-sizing:border-box;text-transform:none;"
                                placeholder="${isNovo ? 'Pesquise uma OS existente pelo Nº da OS, Nome do Cliente, Nº do Contrato ou Nº da Proposta (toda OS nasce de um contrato assinado).' : 'Informações adicionais sobre a OS...'}">${esc(v('observacoes'))}</textarea>
                        </div>
                    </form>
                </div>
            </div>
        `;

        renderProdutosGridHtml(prop);
        if (!isNovo) {
            carregarAnexosOs(prop.id);
        }
    }

    async function carregarAnexosOs(propId) {
        if (!propId) return;
        try {
            const res = await window.apiGet(`/propostas/${propId}/anexos-os-comercial`);
            const lista = (res && Array.isArray(res.anexos)) ? res.anexos : (Array.isArray(res) ? res : []);
            state.anexosAtuais = lista;
            const badge = document.getElementById('cos-anexos-count-badge');
            if (badge) badge.textContent = `${lista.length} anexo(s)`;
            const wrap = document.getElementById('cos-anexos-lista-wrap');
            if (!wrap) return;
            if (!lista.length) {
                wrap.innerHTML = `<div style="text-align:center; color:#94a3b8; font-size:0.82rem; padding:0.85rem; background:#ffffff; border:1px dashed #cbd5e1; border-radius:8px;">Nenhum documento anexado nesta OS.</div>`;
                return;
            }
            const token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token') || '';
            wrap.innerHTML = `<div style="display:flex; flex-direction:column; gap:8px;">
                ${lista.map((a, idx) => {
                    const urlView = `/api/propostas/${propId}/anexos-os-comercial/${a.id}/arquivo?inline=1${token ? `&token=${encodeURIComponent(token)}` : ''}`;
                    const urlDown = `/api/propostas/${propId}/anexos-os-comercial/${a.id}/arquivo?download=1${token ? `&token=${encodeURIComponent(token)}` : ''}`;
                    return `<div style="background:#fff; border:1px solid #e2e8f0; border-radius:8px; padding:8px 12px; display:flex; align-items:center; justify-content:space-between; gap:10px;">
                        <div style="min-width:0;">
                            <div style="font-size:0.83rem; font-weight:700; color:#0f172a;">#${idx + 1} — ${esc(a.titulo || a.nome_arquivo || 'Anexo')}</div>
                            <div style="font-size:0.74rem; color:#64748b;">${esc(a.nome_arquivo || '')}</div>
                        </div>
                        <div style="display:flex; gap:6px; flex-shrink:0;">
                            <a href="${urlView}" target="_blank" style="background:#eff6ff; color:#1d4ed8; border:1px solid #bfdbfe; padding:4px 10px; border-radius:6px; font-size:0.76rem; font-weight:700; text-decoration:none;"><i class="ph ph-eye"></i> Visualizar</a>
                            <a href="${urlDown}" target="_blank" style="background:#f0fdf4; color:#15803d; border:1px solid #bbf7d0; padding:4px 10px; border-radius:6px; font-size:0.76rem; font-weight:700; text-decoration:none;"><i class="ph ph-download-simple"></i> Baixar</a>
                            <button type="button" onclick="window._comercialOS.excluirAnexoOs(${Number(a.id)})" title="Remover anexo da OS"
                                style="background:#fef2f2; color:#dc2626; border:1px solid #fecaca; padding:4px 8px; border-radius:6px; font-size:0.76rem; cursor:pointer;">
                                <i class="ph ph-trash"></i>
                            </button>
                        </div>
                    </div>`;
                }).join('')}
            </div>`;
        } catch (_) {}
    }

    async function abrirModalPesquisaOS(filtrosIniciais = {}) {
        const listaOs = await buscarTodasOsDoSistema();
        let clientes = Array.isArray(window._clientesCache) && window._clientesCache.length ? window._clientesCache : [];
        if (!clientes.length && typeof window.apiGet === 'function') {
            try {
                clientes = await window.apiGet('/clientes');
                window._clientesCache = clientes;
            } catch (_) {}
        }

        const clientCnpjMap = {};
        const clientIconMap = {};
        (clientes || []).forEach(c => {
            if (c.nome_razao_social) {
                const k = c.nome_razao_social.toLowerCase().trim();
                if (c.cpf_cnpj || !clientCnpjMap[k]) clientCnpjMap[k] = c.cpf_cnpj || '';
                const ico = typeof window.obterIconeApenasGrupoCliente === 'function' ? window.obterIconeApenasGrupoCliente(c.grupo_clientes) : '';
                if (ico || !clientIconMap[k]) clientIconMap[k] = ico;
            }
        });

        const extrairNum = (val) => {
            const d = String(val || '').replace(/\D/g, '');
            return d ? parseInt(d, 10) : 0;
        };

        const osEnriquecidas = listaOs.map(p => {
            const nomeLimpo = typeof window.limparPrefixoGrupoCliente === 'function'
                ? window.limparPrefixoGrupoCliente(p.cliente_nome || '')
                : String(p.cliente_nome || '').replace(/^[💎🥇🥈🥉]\s*/, '').trim();
            const key = nomeLimpo.toLowerCase().trim();
            return {
                ...p,
                cliente_nome_limpo: nomeLimpo,
                cliente_cnpj: clientCnpjMap[key] || '',
                cliente_icone: clientIconMap[key] || '',
                tipo_os_resolvido: resolverTipoOsComercial(p)
            };
        }).sort((a, b) => extrairNum(b.numero_os) - extrairNum(a.numero_os));

        const renderRows = (list) => {
            if (!list.length) {
                return `<tr><td colspan="10" style="text-align:center; color:#94a3b8; padding:1.5rem; font-size:0.85rem;">Nenhuma OS encontrada.</td></tr>`;
            }
            return list.map(p => {
                const numOs = String(p.numero_os || '').trim().padStart(2, '0');
                const codProp = String(p.codigo || '').trim().padStart(2, '0');
                const numCtr = String(p.contrato || '').trim().padStart(2, '0');
                const totalFmt = (Number(p.valor_total) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                const dataIso = String(p.os_criada_em || '').trim().substring(0, 10);
                const dataFmt = dataIso ? dataIso.split('-').reverse().join('/') : '—';

                const btnOsVerde = `<button type="button" onclick="event.stopPropagation(); Swal.close(); window._comercialOS.carregarOsPorPropostaId(${p.id});" title="Abrir OS Nº ${esc(numOs)}" style="background:#16a34a; color:#ffffff; border:1px solid #15803d; padding:3px 10px; border-radius:6px; font-weight:800; font-size:0.76rem; cursor:pointer; display:inline-flex; align-items:center; justify-content:center;">${esc(numOs)}</button>`;
                const btnPropAzul = codProp
                    ? `<button type="button" onclick="event.stopPropagation(); Swal.close(); window.abrirPropostaDiretoId(${p.id});" title="Clique para abrir a Proposta Nº ${esc(codProp)}" style="background:#2563eb; color:#ffffff; border:1px solid #1d4ed8; padding:3px 10px; border-radius:6px; font-weight:800; font-size:0.76rem; cursor:pointer; display:inline-flex; align-items:center; justify-content:center;">${esc(codProp)}</button>`
                    : '—';
                const btnCtrAmarelo = numCtr
                    ? `<button type="button" onclick="event.stopPropagation(); Swal.close(); window.abrirContratoDaProposta(${p.id});" title="Clique para abrir o Contrato Nº ${esc(numCtr)}" style="background:#eab308; color:#0f172a; border:1px solid #ca8a04; padding:3px 10px; border-radius:6px; font-weight:800; font-size:0.76rem; cursor:pointer; display:inline-flex; align-items:center; justify-content:center;">${esc(numCtr)}</button>`
                    : '—';

                return `
                    <tr ondblclick="Swal.close(); window._comercialOS.carregarOsPorPropostaId(${p.id});"
                        onclick="Swal.close(); window._comercialOS.carregarOsPorPropostaId(${p.id});"
                        style="cursor:pointer; border-bottom:1px solid #e2e8f0; transition:background 0.15s;"
                        onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background=''">
                        <td style="padding:10px 12px; text-align:center; white-space:nowrap;">${btnOsVerde}</td>
                        <td style="padding:10px 12px; text-align:center; white-space:nowrap;" onclick="event.stopPropagation();">${btnPropAzul}</td>
                        <td style="padding:10px 12px; text-align:center; white-space:nowrap;" onclick="event.stopPropagation();">${btnCtrAmarelo}</td>
                        <td style="padding:10px 12px; font-weight:600; color:#334155;">${esc(p.titulo_contrato || '—')}</td>
                        <td style="padding:10px 12px; font-weight:600; color:#1e293b;">${p.cliente_icone ? p.cliente_icone + ' ' : ''}${esc(p.cliente_nome_limpo || '—')}</td>
                        <td style="padding:10px 12px; color:#475569; white-space:nowrap;">${esc(p.cliente_cnpj || '—')}</td>
                        <td style="padding:10px 12px; font-weight:700; color:#15803d; text-align:center; white-space:nowrap;">${esc(p.tipo_os_resolvido || 'Envio')}</td>
                        <td style="padding:10px 12px; color:#475569; text-align:center; white-space:nowrap;">${esc(dataFmt)}</td>
                        <td style="padding:10px 12px; font-weight:700; color:#16a34a; text-align:right; white-space:nowrap;">${esc(totalFmt)}</td>
                        <td style="padding:10px 12px; text-align:center; white-space:nowrap;">${window.renderBadgeStatusOsComercialHtml(p.status_os || 'LIBERADO')}</td>
                    </tr>
                `;
            }).join('');
        };

        Swal.fire({
            title: '',
            width: '100%',
            showConfirmButton: false,
            customClass: { popup: 'custom-swal-padding-zero' },
            html: `
                <div style="text-align:left; font-family:'Inter', sans-serif; display:flex; flex-direction:column; padding:0; border-radius:12px; overflow:hidden;">
                    <div style="font-size:1.1rem; font-weight:800; color:#1e293b; border-bottom:1px solid #e2e8f0; padding:14px 18px; background:#f8fafc; display:flex; align-items:center; justify-content:space-between; gap:6px;">
                        <span style="display:flex; align-items:center; gap:6px;"><i class="ph ph-clipboard-text" style="color:#16a34a; font-size:1.3rem;"></i> Pesquisar Ordens de Serviço (OS)</span>
                        <button type="button" onclick="Swal.close()" style="background:none; border:none; color:#64748b; font-size:1.3rem; cursor:pointer; line-height:1;">&times;</button>
                    </div>

                    <div style="padding:16px; background:#f1f5f9; display:flex; flex-direction:column; gap:12px;">
                        <div style="display:grid; grid-template-columns: 1fr 1.8fr 1fr 1fr; gap:0.75rem;">
                            <div>
                                <label style="display:block; font-size:0.75rem; font-weight:700; color:#475569; margin-bottom:4px;">Nº da OS</label>
                                <input type="text" id="modal-cos-search-os" value="${esc(filtrosIniciais.os || '')}" placeholder="Ex: 01, 02..." style="width:100%; padding:8px 12px; border:1px solid #cbd5e1; border-radius:6px; font-size:0.8rem; box-sizing:border-box; height:36px; text-transform:none;">
                            </div>
                            <div>
                                <label style="display:block; font-size:0.75rem; font-weight:700; color:#475569; margin-bottom:4px;">Cliente / Razão Social</label>
                                <input type="text" id="modal-cos-search-cliente" value="${esc(filtrosIniciais.cliente || '')}" placeholder="Nome do cliente..." style="width:100%; padding:8px 12px; border:1px solid #cbd5e1; border-radius:6px; font-size:0.8rem; box-sizing:border-box; height:36px; text-transform:none;">
                            </div>
                            <div>
                                <label style="display:block; font-size:0.75rem; font-weight:700; color:#475569; margin-bottom:4px;">Nº do Contrato</label>
                                <input type="text" id="modal-cos-search-contrato" value="${esc(filtrosIniciais.contrato || '')}" placeholder="Nº do contrato..." style="width:100%; padding:8px 12px; border:1px solid #cbd5e1; border-radius:6px; font-size:0.8rem; box-sizing:border-box; height:36px; text-transform:none;">
                            </div>
                            <div>
                                <label style="display:block; font-size:0.75rem; font-weight:700; color:#475569; margin-bottom:4px;">Nº da Proposta</label>
                                <input type="text" id="modal-cos-search-proposta" value="${esc(filtrosIniciais.proposta || '')}" placeholder="Nº da proposta..." style="width:100%; padding:8px 12px; border:1px solid #cbd5e1; border-radius:6px; font-size:0.8rem; box-sizing:border-box; height:36px; text-transform:none;">
                            </div>
                        </div>

                        <div style="max-height:calc(88vh - 210px); min-height:52vh; overflow-y:auto; border:1px solid #e2e8f0; border-radius:8px; background:#fff;">
                            <table style="width:100%; border-collapse:collapse; font-size:0.8rem; text-align:left;">
                                <thead>
                                    <tr style="background:#f8fafc; border-bottom:2px solid #cbd5e1; color:#475569; font-size:0.72rem; text-transform:uppercase;">
                                        <th style="padding:10px 12px; position:sticky; top:0; background:#f8fafc; text-align:center; width:85px;">Nº OS</th>
                                        <th style="padding:10px 12px; position:sticky; top:0; background:#f8fafc; text-align:center; width:90px;">Proposta</th>
                                        <th style="padding:10px 12px; position:sticky; top:0; background:#f8fafc; text-align:center; width:95px;">Contrato</th>
                                        <th style="padding:10px 12px; position:sticky; top:0; background:#f8fafc; min-width:140px;">Título</th>
                                        <th style="padding:10px 12px; position:sticky; top:0; background:#f8fafc;">Razão Social / Cliente</th>
                                        <th style="padding:10px 12px; position:sticky; top:0; background:#f8fafc; width:130px;">CNPJ</th>
                                        <th style="padding:10px 12px; position:sticky; top:0; background:#f8fafc; text-align:center; width:155px;">Tipo OS</th>
                                        <th style="padding:10px 12px; position:sticky; top:0; background:#f8fafc; text-align:center; width:105px;">Data OS</th>
                                        <th style="padding:10px 12px; position:sticky; top:0; background:#f8fafc; text-align:right; width:120px;">Valor</th>
                                        <th style="padding:10px 12px; position:sticky; top:0; background:#f8fafc; text-align:center; width:175px;">Status da OS</th>
                                    </tr>
                                </thead>
                                <tbody id="modal-cos-tbody">
                                    ${renderRows(osEnriquecidas)}
                                </tbody>
                            </table>
                        </div>

                        <div style="font-size:0.75rem; color:#64748b; display:flex; justify-content:space-between; align-items:center;">
                            <span>Clique em uma linha para carregar a OS na tela (ou clique nos botões de Proposta / Contrato para ir diretamente a eles).</span>
                            <span id="modal-cos-count" style="font-weight:700; color:#475569;">Total: ${osEnriquecidas.length} OS</span>
                        </div>
                    </div>
                </div>
            `,
            didOpen: () => {
                const swalPopup = typeof Swal.getPopup === 'function' ? Swal.getPopup() : null;
                if (swalPopup) {
                    swalPopup.style.width = '98vw';
                    swalPopup.style.maxWidth = '98vw';
                    swalPopup.style.margin = '1vh auto';
                }
                const inpOs = document.getElementById('modal-cos-search-os');
                const inpCli = document.getElementById('modal-cos-search-cliente');
                const inpCtr = document.getElementById('modal-cos-search-contrato');
                const inpProp = document.getElementById('modal-cos-search-proposta');
                const tbody = document.getElementById('modal-cos-tbody');
                const countEl = document.getElementById('modal-cos-count');

                const filtrar = () => {
                    const qOs = normStr(inpOs?.value || '');
                    const qCli = normStr(inpCli?.value || '');
                    const qCtr = normStr(inpCtr?.value || '');
                    const qProp = normStr(inpProp?.value || '');

                    const filtradas = osEnriquecidas.filter(p => {
                        const nOs = normStr(p.numero_os);
                        const nCli = normStr(p.cliente_nome_limpo + ' ' + (p.titulo_contrato || ''));
                        const nCtr = normStr(p.contrato);
                        const nProp = normStr(p.codigo);

                        const okOs = !qOs || nOs.includes(qOs) || nOs.replace(/^0+/, '') === qOs.replace(/^0+/, '') || nCli.includes(qOs) || nCtr.includes(qOs) || nProp.includes(qOs);
                        const okCli = !qCli || nCli.includes(qCli);
                        const okCtr = !qCtr || nCtr.includes(qCtr) || nCtr.replace(/^0+/, '') === qCtr.replace(/^0+/, '');
                        const okProp = !qProp || nProp.includes(qProp) || nProp.replace(/^0+/, '') === qProp.replace(/^0+/, '');
                        return okOs && okCli && okCtr && okProp;
                    });

                    if (tbody) tbody.innerHTML = renderRows(filtradas);
                    if (countEl) countEl.textContent = `Total: ${filtradas.length} OS`;
                };

                [inpOs, inpCli, inpCtr, inpProp].forEach(el => el?.addEventListener('input', filtrar));
                filtrar();
                if (filtrosIniciais.foco === 'cliente') inpCli?.focus();
                else inpOs?.focus();
            }
        });
    }

    window._comercialOS = {
        async init() {
            if (window._comercialOsAbrirPropostaId) {
                const pid = window._comercialOsAbrirPropostaId;
                const tOp = window._comercialOsTipoOperacaoForcado || '';
                window._comercialOsAbrirPropostaId = null;
                window._comercialOsTipoOperacaoForcado = '';
                await this.carregarOsPorPropostaId(pid, tOp);
                return;
            }
            const tabKey = obterTabIdAtivaOsComercial();
            const snap = window._snapshotsOsComercial && window._snapshotsOsComercial[tabKey];
            if (snap) {
                state.propostaIdAtiva = snap.propostaIdAtiva || null;
                state.osAtual = snap.osAtual ? JSON.parse(JSON.stringify(snap.osAtual)) : null;
                state.editadoNaoSalvo = Boolean(snap.editadoNaoSalvo);
                state.statusNovoDraft = snap.statusNovoDraft || 'LIBERADO';
                state.tipoNovoDraft = snap.tipoNovoDraft || '';
                state.anexosAtuais = Array.isArray(snap.anexosAtuais) ? snap.anexosAtuais : [];
            } else {
                state.propostaIdAtiva = null;
                state.osAtual = null;
                state.editadoNaoSalvo = false;
                state.statusNovoDraft = 'LIBERADO';
                state.tipoNovoDraft = '';
                state.anexosAtuais = [];
            }
            renderFormOS();
        },

        salvarSnapshotAba(tabIdOverride) {
            const tabKey = tabIdOverride || obterTabIdAtivaOsComercial();
            if (!tabKey) return;
            window._snapshotsOsComercial[tabKey] = {
                propostaIdAtiva: state.propostaIdAtiva || null,
                osAtual: state.osAtual ? JSON.parse(JSON.stringify(state.osAtual)) : null,
                editadoNaoSalvo: Boolean(state.editadoNaoSalvo),
                statusNovoDraft: state.statusNovoDraft || 'LIBERADO',
                tipoNovoDraft: state.tipoNovoDraft || '',
                anexosAtuais: Array.isArray(state.anexosAtuais) ? JSON.parse(JSON.stringify(state.anexosAtuais)) : []
            };
        },

        limparSnapshotAba(tabIdOverride) {
            const tabKey = tabIdOverride || obterTabIdAtivaOsComercial();
            if (window._snapshotsOsComercial && tabKey) {
                delete window._snapshotsOsComercial[tabKey];
            }
        },

        resetarParaNovaAba() {
            state.propostaIdAtiva = null;
            state.osAtual = null;
            state.editadoNaoSalvo = false;
            state.statusNovoDraft = 'LIBERADO';
            state.tipoNovoDraft = '';
            state.anexosAtuais = [];
        },

        novaOSNaMesmaAba() {
            this.resetarParaNovaAba();
            const tabKey = obterTabIdAtivaOsComercial();
            if (window._snapshotsOsComercial && tabKey) {
                delete window._snapshotsOsComercial[tabKey];
            }
            atualizarTituloAbaSuperior(null, tabKey);
            renderFormOS();
        },

        async carregarOsPorPropostaId(propId, tipoOperacaoForcado = '') {
            const idNum = Number(propId);
            if (!idNum) return;
            try {
                let p = await window.apiGet(`/propostas/${idNum}`);
                if (!p || !p.id) return;
                if (!contratoEstaAssinado(p)) {
                    Swal.fire('Aviso', 'Uma OS só pode existir para contratos assinados.', 'warning');
                    return;
                }
                if (tipoOperacaoForcado && OS_COMERCIAL_TIPOS.some(t => normStr(t) === normStr(tipoOperacaoForcado))) {
                    p.os_tipo_operacao = tipoOperacaoForcado;
                } else {
                    p.os_tipo_operacao = resolverTipoOsComercial(p);
                }
                state.propostaIdAtiva = p.id;
                state.osAtual = p;
                state.editadoNaoSalvo = false;
                state.anexosAtuais = [];
                this.salvarSnapshotAba();
                renderFormOS();
            } catch (e) {
                console.error('[COMERCIAL_OS] Erro ao carregar OS:', e);
            }
        },

        async pesquisarPorCampoOsInput() {
            const raw = String(document.getElementById('cos-codigo')?.value || '').trim();
            if (!raw) {
                await abrirModalPesquisaOS({ foco: 'os' });
                return;
            }
            const listaOs = await buscarTodasOsDoSistema();
            const rawNorm = normStr(raw);
            const rawDigits = raw.replace(/\D/g, '').replace(/^0+/, '');

            if (/^\d+$/.test(raw)) {
                const matchOsExata = listaOs.find(p => {
                    const nOs = String(p.numero_os || '').trim();
                    return nOs === raw || (rawDigits && nOs.replace(/\D/g, '').replace(/^0+/, '') === rawDigits);
                });
                if (matchOsExata) {
                    await this.carregarOsPorPropostaId(matchOsExata.id);
                    if (typeof mostrarToastSucesso === 'function') {
                        mostrarToastSucesso(`OS Nº ${matchOsExata.numero_os} carregada!`);
                    }
                    return;
                }
            }

            const matchesFlex = listaOs.filter(p => {
                const nOs = normStr(p.numero_os);
                const nCtr = normStr(p.contrato);
                const nProp = normStr(p.codigo);
                const nCli = normStr(p.cliente_nome);
                return nOs.includes(rawNorm) ||
                    nCli.includes(rawNorm) ||
                    nCtr === rawNorm || (rawDigits && nCtr.replace(/^0+/, '') === rawDigits) ||
                    nProp === rawNorm || (rawDigits && nProp.replace(/^0+/, '') === rawDigits);
            });

            if (matchesFlex.length === 1) {
                await this.carregarOsPorPropostaId(matchesFlex[0].id);
                if (typeof mostrarToastSucesso === 'function') {
                    mostrarToastSucesso(`OS Nº ${matchesFlex[0].numero_os} carregada!`);
                }
                return;
            }

            await abrirModalPesquisaOS({ os: raw, foco: 'os' });
        },

        async pesquisarPorCampoClienteInput() {
            const raw = String(document.getElementById('cos-cliente')?.value || '').trim();
            const limpo = typeof window.limparPrefixoGrupoCliente === 'function'
                ? window.limparPrefixoGrupoCliente(raw)
                : raw.replace(/^[💎🥇🥈🥉]\s*/, '').trim();
            await abrirModalPesquisaOS({ cliente: limpo, foco: 'cliente' });
        },

        toggleSecao(chave, event) {
            if (event) event.stopPropagation();
            const body = document.getElementById(`cos-secao-${chave}-body`);
            const caret = document.getElementById(`cos-caret-${chave}`);
            if (!body) return;
            const novo = body.style.display === 'none';
            state.secoesAbertas[chave] = novo;
            body.style.display = novo ? 'block' : 'none';
            if (caret) caret.style.transform = novo ? 'rotate(180deg)' : 'rotate(0deg)';
        },

        onChangeTipoOs(novoTipo) {
            if (state.osAtual) {
                state.osAtual.os_tipo_operacao = novoTipo;
            } else {
                state.tipoNovoDraft = novoTipo;
            }
            this.marcarEditado();
            this.salvarSnapshotAba();
        },

        toggleMenuStatusOs(event) {
            if (event) {
                event.preventDefault();
                event.stopPropagation();
            }
            const menu = document.getElementById('cos-status-custom-menu');
            if (!menu) return;
            menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
        },

        async selecionarStatusOs(novoStatus, event) {
            if (event) {
                event.preventDefault();
                event.stopPropagation();
            }
            const inp = document.getElementById('cos-status-os');
            const badge = document.getElementById('cos-status-custom-badge');
            const menu = document.getElementById('cos-status-custom-menu');
            if (inp) inp.value = novoStatus;
            if (badge) badge.innerHTML = window.renderBadgeStatusOsComercialHtml(novoStatus);
            if (menu) menu.style.display = 'none';
            if (state.osAtual) {
                state.osAtual.status_os = novoStatus;
            } else {
                state.statusNovoDraft = novoStatus;
            }
            this.marcarEditado();
            this.salvarSnapshotAba();
        },

        marcarEditado() {
            state.editadoNaoSalvo = true;
            const btn = document.getElementById('btn-cos-salvar');
            if (btn && state.osAtual && state.osAtual.id) {
                btn.disabled = false;
                btn.style.background = '#16a34a';
                btn.style.color = '#ffffff';
                btn.style.cursor = 'pointer';
            }
        },

        async enviarAnexosOs(fileList) {
            if (!state.osAtual || !state.osAtual.id) return;
            const files = Array.from(fileList || []);
            if (!files.length) return;
            const titulo = String(document.getElementById('cos-anexo-titulo-input')?.value || '').trim();
            const fd = new FormData();
            files.forEach(f => fd.append('arquivos', f));
            if (titulo) fd.append('titulo', titulo);
            try {
                const tk = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token') || '';
                const r = await fetch(`/api/propostas/${state.osAtual.id}/anexos-os-comercial`, {
                    method: 'POST',
                    headers: tk ? { 'Authorization': 'Bearer ' + tk } : {},
                    body: fd
                });
                const res = await r.json();
                if (!r.ok || !res.success) {
                    Swal.fire('Erro', (res && res.error) || 'Não foi possível anexar documento(s) à OS.', 'error');
                    return;
                }
                const inpTit = document.getElementById('cos-anexo-titulo-input');
                if (inpTit) inpTit.value = '';
                const inpFile = document.getElementById('cos-anexo-file-input');
                if (inpFile) inpFile.value = '';
                await carregarAnexosOs(state.osAtual.id);
                if (typeof mostrarToastSucesso === 'function') {
                    mostrarToastSucesso('Anexo(s) incluído(s) na OS com sucesso!');
                }
            } catch (e) {
                Swal.fire('Erro', e.message || 'Erro ao enviar anexo.', 'error');
            }
        },

        async excluirAnexoOs(anexoId) {
            if (!state.osAtual || !state.osAtual.id || !anexoId) return;
            try {
                const tk = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token') || '';
                const r = await fetch(`/api/propostas/${state.osAtual.id}/anexos-os-comercial/${anexoId}`, {
                    method: 'DELETE',
                    headers: tk ? { 'Authorization': 'Bearer ' + tk } : {}
                });
                if (r.ok) {
                    await carregarAnexosOs(state.osAtual.id);
                }
            } catch (_) {}
        },

        async salvarAlteracoesOS() {
            if (!state.osAtual || !state.osAtual.id) return;
            const payload = {
                status_os: document.getElementById('cos-status-os')?.value || state.osAtual.status_os || 'LIBERADO',
                os_tipo_operacao: document.getElementById('cos-tipo')?.value || state.osAtual.os_tipo_operacao || resolverTipoOsComercial(state.osAtual),
                os_criada_em: document.getElementById('cos-data-cadastro')?.value || state.osAtual.os_criada_em || hojeIso(),
                titulo_contrato: document.getElementById('cos-titulo-contrato')?.value || state.osAtual.titulo_contrato || '',
                endereco_instalacao: document.getElementById('cos-endereco-instalacao')?.value || state.osAtual.endereco_instalacao || '',
                observacoes: document.getElementById('cos-obs')?.value || ''
            };
            try {
                const tk = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token') || '';
                const r = await fetch(`/api/propostas/${state.osAtual.id}/os-comercial`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(tk ? { 'Authorization': 'Bearer ' + tk } : {})
                    },
                    body: JSON.stringify(payload)
                });
                const res = await r.json();
                if (!r.ok || !res.success) {
                    Swal.fire('Erro', (res && res.error) || 'Não foi possível salvar a OS.', 'error');
                    return;
                }
                Object.assign(state.osAtual, payload);
                state.editadoNaoSalvo = false;
                this.salvarSnapshotAba();
                renderFormOS();
                if (typeof mostrarToastSucesso === 'function') {
                    mostrarToastSucesso('OS salva com sucesso!');
                }
            } catch (e) {
                Swal.fire('Erro', e.message || 'Erro ao salvar a OS.', 'error');
            }
        }
    };

    document.addEventListener('click', (e) => {
        const wrap = document.getElementById('cos-status-custom-wrap');
        const menu = document.getElementById('cos-status-custom-menu');
        if (menu && menu.style.display === 'block' && wrap && !wrap.contains(e.target)) {
            menu.style.display = 'none';
        }
    });

    window.renderTelaOSComercial = function () {
        window._comercialOS.init();
    };
})();
