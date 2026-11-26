/**
 * ============================================================================
 * MÓDULO: COMERCIAL → APROVAÇÃO (Kanban)
 * Colunas do Kanban:
 *   1. Solicitação
 *   2. Aguardando setor
 *   3. Respondida
 *   4. Aprovado
 *   5. Reprovado
 * ============================================================================
 */
(function () {
    'use strict';

    const COLUNAS_KANBAN = [
        { key: 'Solicitação',      titulo: 'Solicitação',      cor: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe', icon: 'ph-paper-plane-tilt' },
        { key: 'Aguardando setor', titulo: 'Aguardando setor', cor: '#d97706', bg: '#fffbeb', border: '#fde68a', icon: 'ph-hourglass-high' },
        { key: 'Respondida',       titulo: 'Respondida',       cor: '#0284c7', bg: '#f0f9ff', border: '#bae6fd', icon: 'ph-chat-circle-text' },
        { key: 'Aprovado',         titulo: 'Aprovado',         cor: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0', icon: 'ph-check-circle' },
        { key: 'Reprovado',        titulo: 'Reprovado',        cor: '#dc2626', bg: '#fef2f2', border: '#fecaca', icon: 'ph-x-circle' }
    ];

    window.COMERCIAL_APROVACAO_COLUNAS = COLUNAS_KANBAN;

    const TIPOS_PROPOSTA_APROVACAO = [
        { value: 'OBRA MENSAL',    label: '💙 OBRA MENSAL' },
        { value: 'OBRA QUINZENAL', label: '💙 OBRA QUINZENAL' },
        { value: 'OBRA SEMANAL',   label: '💙 OBRA SEMANAL' },
        { value: 'EVENTO',         label: '💜 EVENTO' },
        { value: 'LIMPA FOSSA',    label: '💧 LIMPA FOSSA' }
    ];

    const EQUIPAMENTOS_OS_OBRA = [
        { codigo: 'STD OBRA',                icone: '💙', label: '💙 STD OBRA' },
        { codigo: 'LX OBRA',                 icone: '🟦', label: '🟦 LX OBRA' },
        { codigo: 'EXL OBRA',                icone: '🔵', label: '🔵 EXL OBRA' },
        { codigo: 'PCD OBRA',                icone: '♿', label: '♿ PCD OBRA' },
        { codigo: 'CHUVEIRO OBRA',           icone: '🚿', label: '🚿 CHUVEIRO OBRA' },
        { codigo: 'HIDRÁULICO OBRA',         icone: '🚽', label: '🚽 HIDRÁULICO OBRA' },
        { codigo: 'MICTÓRIO OBRA',           icone: '💦', label: '💦 MICTÓRIO OBRA' },
        { codigo: 'PBII OBRA',               icone: '🧼', label: '🧼 PBII OBRA' },
        { codigo: 'PBIII OBRA',              icone: '🧼', label: '🧼 PBIII OBRA' },
        { codigo: 'GUARITA INDIVIDUAL OBRA', icone: '⬜', label: '⬜ GUARITA INDIVIDUAL OBRA' },
        { codigo: 'GUARITA DUPLA OBRA',      icone: '⚪', label: '⚪ GUARITA DUPLA OBRA' },
        { codigo: 'LIMPA FOSSA OBRA',        icone: '💧', label: '💧 LIMPA FOSSA OBRA' },
        { codigo: 'CARRINHO',                icone: '🛤', label: '🛤 CARRINHO' },
        { codigo: 'CAIXA DAGUA',             icone: '🧊', label: '🧊 CAIXA DAGUA' }
    ];

    const EQUIPAMENTOS_OS_EVENTO = [
        { codigo: 'STD EVENTO',                icone: '💜', label: '💜 STD EVENTO' },
        { codigo: 'LX EVENTO',                 icone: '🟣', label: '🟣 LX EVENTO' },
        { codigo: 'EXL EVENTO',                icone: '🟣', label: '🟣 EXL EVENTO' },
        { codigo: 'PCD EVENTO',                icone: '♿', label: '♿ PCD EVENTO' },
        { codigo: 'CHUVEIRO EVENTO',           icone: '🚿', label: '🚿 CHUVEIRO EVENTO' },
        { codigo: 'HIDRÁULICO EVENTO',         icone: '🚽', label: '🚽 HIDRÁULICO EVENTO' },
        { codigo: 'MICTÓRIO EVENTO',           icone: '💦', label: '💦 MICTÓRIO EVENTO' },
        { codigo: 'PBII EVENTO',               icone: '🧼', label: '🧼 PBII EVENTO' },
        { codigo: 'PBIII EVENTO',              icone: '🧼', label: '🧼 PBIII EVENTO' },
        { codigo: 'GUARITA INDIVIDUAL EVENTO', icone: '⬜', label: '⬜ GUARITA INDIVIDUAL EVENTO' },
        { codigo: 'GUARITA DUPLA EVENTO',      icone: '⚪', label: '⚪ GUARITA DUPLA EVENTO' },
        { codigo: 'LIMPA FOSSA EVENTO',        icone: '💧', label: '💧 LIMPA FOSSA EVENTO' },
        { codigo: 'CARRINHO',                  icone: '🛤', label: '🛤 CARRINHO' },
        { codigo: 'CAIXA DAGUA',               icone: '🧊', label: '🧊 CAIXA DAGUA' }
    ];

    const state = {
        aprovacoes: [],
        buscaTexto: '',
        apenasUrgentes: false,
        draggingId: null
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

    function escJsSingle(s) {
        return String(s ?? '')
            .replace(/\\/g, '\\\\')
            .replace(/'/g, "\\'")
            .replace(/\r?\n/g, ' ');
    }

    /**
     * Remove prefixos de ícone de grupo (💎, 🥇, 🥈, 🥉) e eventual surrogate órfão (\uFFFD / [\uD800-\uDFFF])
     * utilizando flag Unicode (/u) para nunca quebrar pares substitutos UTF-16.
     */
    function limparIconeCliente(nome) {
        let str = String(nome || '')
            .replace(/[\uFFFD\uD800-\uDFFF]/g, '')
            .replace(/^(?:💎|🥇|🥈|🥉|\s)+/u, '')
            .trim();
        if (typeof window.limparPrefixoGrupoCliente === 'function') {
            str = window.limparPrefixoGrupoCliente(str);
        }
        return String(str || '').replace(/[\uFFFD\uD800-\uDFFF]/g, '').trim();
    }

    function obterIconeGrupoSeguro(grupoRaw) {
        const g = normStr(grupoRaw);
        if (!g) return '';
        if (g.includes('diamante') || g.startsWith('1')) return '💎';
        if (g.includes('ouro') || g.startsWith('2')) return '🥇';
        if (g.includes('prata') || g.startsWith('3')) return '🥈';
        if (g.includes('bronze') || g.startsWith('4')) return '🥉';
        return '';
    }

    function formatarClienteComIcone(nome, grupoOpcional = '') {
        const limpo = limparIconeCliente(nome);
        if (!limpo) return '—';
        let icone = obterIconeGrupoSeguro(grupoOpcional);
        if (!icone && Array.isArray(window._clientesCache) && window._clientesCache.length > 0) {
            const alvo = normStr(limpo);
            const cli = window._clientesCache.find(c =>
                normStr(limparIconeCliente(c.nome_razao_social)) === alvo ||
                normStr(limparIconeCliente(c.nome_fantasia)) === alvo
            );
            if (cli) {
                icone = obterIconeGrupoSeguro(cli.grupo_clientes || cli.grupo_cliente || cli.classificacao);
            }
        }
        if (!icone && typeof window.formatarNomeClienteComIcone === 'function') {
            const res = window.formatarNomeClienteComIcone(limpo, grupoOpcional);
            return String(res || limpo).replace(/[\uFFFD]/g, '').trim();
        }
        return icone ? `${icone} ${limpo}` : limpo;
    }

    function fmtDataHoraBr(isoStr) {
        if (!isoStr) return '—';
        const s = String(isoStr).trim();
        const m = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}:\d{2}))?/);
        if (m) {
            return `${m[3]}/${m[2]}/${m[1]}${m[4] ? ' ' + m[4] : ''}`;
        }
        return s;
    }

    function obterEquipamentosCatalogoPorTipo(tipoProposta) {
        const t = normStr(tipoProposta);
        if (t.includes('evento')) {
            return EQUIPAMENTOS_OS_EVENTO;
        }
        return EQUIPAMENTOS_OS_OBRA;
    }

    function formatarNomeEquipamentoComIcone(nomeRaw, tipoProposta = '') {
        const limpo = String(nomeRaw || '').trim();
        if (!limpo) return '';
        if (/^(?:💙|🟦|🔵|💜|🟣|♿|🚿|🚽|💦|🧼|⬜|⚪|💧|🛤|🧊)/u.test(limpo)) {
            return limpo;
        }
        const todos = [...EQUIPAMENTOS_OS_OBRA, ...EQUIPAMENTOS_OS_EVENTO];
        const n = normStr(limpo);
        const achado = todos.find(item => normStr(item.codigo) === n || normStr(item.label) === n);
        if (achado) return achado.label;
        const cat = obterEquipamentosCatalogoPorTipo(tipoProposta);
        const parcial = cat.find(item => n.includes(normStr(item.codigo)));
        if (parcial) return `${parcial.icone} ${limpo}`;
        return limpo;
    }

    function parseEquipamentosLista(rawJson) {
        let arr = [];
        try {
            arr = typeof rawJson === 'string' ? JSON.parse(rawJson || '[]') : (Array.isArray(rawJson) ? rawJson : []);
        } catch (_) { arr = []; }
        return (Array.isArray(arr) ? arr : []).filter(it => {
            if (!it || it._substituido_por_aditivo) return false;
            const grp = normStr(it.grupo || it.categoria || '');
            if (grp.includes('parceiro')) return false;
            return true;
        });
    }

    function formatarResumoEquipamentos(rawJson, tipoProposta = '') {
        const arr = parseEquipamentosLista(rawJson);
        if (!arr.length) return [];
        return arr.map(it => {
            const rawNome = String(it.produto || it.descricao || it.nome || 'Equipamento').trim();
            const nome = formatarNomeEquipamentoComIcone(rawNome, tipoProposta);
            const qtd = Math.max(1, parseInt(it.quantidade ?? it.qtde ?? 1, 10) || 1);
            return { nome, qtd, observacao: String(it.observacao || '').trim() };
        });
    }

    function normalizarColuna(colRaw) {
        const n = normStr(colRaw);
        for (const c of COLUNAS_KANBAN) {
            if (normStr(c.key) === n) return c.key;
        }
        if (n.includes('aguardando')) return 'Aguardando setor';
        if (n.includes('respond')) return 'Respondida';
        if (n.includes('reprov')) return 'Reprovado';
        if (n.includes('aprov') || n.includes('finaliz')) return 'Aprovado';
        return 'Solicitação';
    }

    function obterIniciaisNome(nome) {
        const limpo = String(nome || '').trim();
        if (!limpo) return 'AR';
        const partes = limpo.split(/\s+/).filter(Boolean);
        if (partes.length === 1) return partes[0].substring(0, 2).toUpperCase();
        return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
    }

    function renderAtendenteAvatarHtml(aprv, tamanhoPx = 22, fontSizeRem = 0.72) {
        const nome = String(aprv.criado_por || 'Comercial').trim() || 'Comercial';
        const fotoUrl = String(aprv.criado_por_foto_url || (aprv.criado_por_colaborador_id ? `/api/colaboradores/foto/${aprv.criado_por_colaborador_id}` : '')).trim();
        const iniciais = obterIniciaisNome(nome);
        return `
            <div style="display:inline-flex; align-items:center; gap:6px; min-width:0;" title="Atendente: ${esc(nome)}">
                <div style="width:${tamanhoPx}px; height:${tamanhoPx}px; border-radius:999px; background:#ede9fe; border:1px solid #c4b5fd; color:#5b21b6; font-size:${Math.max(0.58, fontSizeRem - 0.1)}rem; font-weight:800; display:inline-flex; align-items:center; justify-content:center; overflow:hidden; flex-shrink:0; position:relative;">
                    <span>${esc(iniciais)}</span>
                    ${fotoUrl ? `
                        <img src="${esc(fotoUrl)}" alt="${esc(nome)}"
                            onerror="this.style.display='none';"
                            style="position:absolute; inset:0; width:100%; height:100%; object-fit:cover;">
                    ` : ''}
                </div>
                <span style="font-size:${fontSizeRem}rem; font-weight:700; color:#334155; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${esc(nome)}</span>
            </div>
        `;
    }

    async function garantirCachesClientes() {
        let clientes = Array.isArray(window._clientesCache) ? window._clientesCache : [];
        if (!clientes.length && typeof window.obterClientesCache === 'function') {
            try {
                clientes = await window.obterClientesCache();
            } catch (_) {}
        }
        if ((!Array.isArray(clientes) || !clientes.length) && typeof window.apiGet === 'function') {
            try {
                clientes = await window.apiGet('/clientes');
                if (Array.isArray(clientes)) window._clientesCache = clientes;
            } catch (_) {}
        }
        return Array.isArray(clientes) ? clientes : [];
    }

    async function carregarAprovacoesServidor() {
        try {
            await garantirCachesClientes();
            let lista = [];
            if (typeof window.apiGet === 'function') {
                lista = await window.apiGet('/comercial/aprovacoes');
            } else {
                const tk = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token') || '';
                const r = await fetch('/api/comercial/aprovacoes', {
                    headers: tk ? { 'Authorization': 'Bearer ' + tk } : {}
                });
                if (r.ok) lista = await r.json();
            }
            state.aprovacoes = Array.isArray(lista) ? lista : [];
            window._comercialAprovacoesCache = state.aprovacoes;
            return state.aprovacoes;
        } catch (e) {
            console.error('[COMERCIAL_APROVACAO] Erro ao carregar aprovações:', e);
            return state.aprovacoes || [];
        }
    }

    function filtrarAprovacoesMemoria() {
        const q = normStr(state.buscaTexto);
        return (state.aprovacoes || []).filter(a => {
            if (state.apenasUrgentes && Number(a.urgente) !== 1) return false;
            if (!q) return true;
            const blob = normStr([
                a.numero_aprovacao,
                a.proposta_codigo || a.prop_codigo_real,
                a.cliente_nome,
                a.contato_nome,
                a.endereco_instalacao,
                a.tipo_proposta,
                a.observacoes,
                a.resposta_setor,
                a.criado_por
            ].join(' '));
            return blob.includes(q);
        });
    }

    function renderCardHtml(a) {
        const numAprv = String(a.numero_aprovacao || a.id || '').padStart(2, '0');
        const ehUrgente = Number(a.urgente) === 1;
        const propId = Number(a.proposta_id) || 0;
        const propCod = String(a.prop_codigo_real || a.proposta_codigo || '').trim().padStart(2, '0');
        const cliFmt = formatarClienteComIcone(a.cliente_nome, a.cliente_grupo || '');
        const equips = formatarResumoEquipamentos(a.equipamentos_json, a.tipo_proposta || '');

        return `
            <div class="caprv-card" draggable="true"
                ondragstart="window._comercialAprovacao.onDragStart(event, ${Number(a.id)})"
                onclick="window._comercialAprovacao.abrirModalDetalhesAprovacao(${Number(a.id)})"
                style="background:#ffffff; border:${ehUrgente ? '1.5px solid #ef4444' : '1px solid #e2e8f0'}; border-left:${ehUrgente ? '4px solid #dc2626' : '4px solid #7c3aed'}; border-radius:10px; padding:10px 11px; box-shadow:0 2px 6px rgba(15,23,42,0.05); cursor:pointer; display:flex; flex-direction:column; gap:6px; transition:transform 0.12s, box-shadow 0.12s;"
                onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 6px 14px rgba(15,23,42,0.09)';"
                onmouseout="this.style.transform=''; this.style.boxShadow='0 2px 6px rgba(15,23,42,0.05)';">

                <!-- Cabeçalho do Card: Nº da Aprovação + Urgente + Botão Proposta ou Vincular -->
                <div style="display:flex; align-items:center; justify-content:space-between; gap:6px; flex-wrap:wrap;">
                    <div style="display:flex; align-items:center; gap:5px; flex-wrap:wrap;">
                        <span style="background:#7c3aed; color:#ffffff; font-weight:800; font-size:0.72rem; padding:2px 8px; border-radius:6px; display:inline-flex; align-items:center; gap:4px;">
                            <i class="ph ph-seal-check"></i> Aprovação Nº ${esc(numAprv)}
                        </span>
                        ${ehUrgente ? `
                            <span style="background:#fef2f2; color:#dc2626; border:1px solid #fca5a5; font-weight:800; font-size:0.68rem; padding:1px 7px; border-radius:999px; display:inline-flex; align-items:center; gap:3px;">
                                <i class="ph ph-warning-circle"></i> URGENTE
                            </span>
                        ` : ''}
                    </div>

                    ${propId ? `
                        <button type="button"
                            onclick="event.stopPropagation(); if(typeof window.abrirPropostaDiretoId === 'function') window.abrirPropostaDiretoId(${propId});"
                            title="Abrir Proposta Nº ${esc(propCod)}"
                            style="background:#2563eb; color:#ffffff; border:1px solid #1d4ed8; padding:2px 8px; border-radius:5px; font-size:0.7rem; font-weight:800; cursor:pointer; display:inline-flex; align-items:center; gap:3px;">
                            <i class="ph ph-file-text"></i> Proposta Nº ${esc(propCod)}
                        </button>
                    ` : `
                        <button type="button"
                            onclick="event.stopPropagation(); window._comercialAprovacao.abrirModalVincularProposta(${Number(a.id)});"
                            title="Vincular esta aprovação a uma proposta"
                            style="background:#f5f3ff; color:#6d28d9; border:1px dashed #c4b5fd; padding:2px 8px; border-radius:5px; font-size:0.69rem; font-weight:700; cursor:pointer; display:inline-flex; align-items:center; gap:3px;">
                            <i class="ph ph-link"></i> Vincular Proposta
                        </button>
                    `}
                </div>

                <!-- Nome do Cliente (com ícone do grupo) -->
                <div style="font-size:0.82rem; font-weight:800; color:#0f172a; line-height:1.28;">
                    ${esc(cliFmt)}
                </div>

                <!-- Contato -->
                ${a.contato_nome ? `
                    <div style="font-size:0.72rem; color:#475569; display:flex; align-items:center; gap:4px;">
                        <i class="ph ph-user" style="color:#64748b;"></i>
                        <span><strong>Contato:</strong> ${esc(a.contato_nome)}</span>
                    </div>
                ` : ''}

                <!-- Endereço de Instalação -->
                ${a.endereco_instalacao ? `
                    <div style="font-size:0.72rem; color:#334155; background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; padding:4px 6px; display:flex; align-items:flex-start; gap:4px;">
                        <i class="ph ph-map-pin" style="color:#7c3aed; margin-top:2px; flex-shrink:0;"></i>
                        <span style="line-height:1.25; word-break:break-word;">${esc(a.endereco_instalacao)}</span>
                    </div>
                ` : ''}

                <!-- Equipamentos na Proposta -->
                ${equips.length > 0 ? `
                    <div style="display:flex; flex-wrap:wrap; gap:4px; margin-top:2px;">
                        ${equips.slice(0, 4).map(eq => `
                            <span style="background:#eef2ff; color:#3730a3; border:1px solid #c7d2fe; font-size:0.68rem; font-weight:700; padding:1px 6px; border-radius:5px;">
                                ${eq.qtd}x ${esc(eq.nome)}
                            </span>
                        `).join('')}
                        ${equips.length > 4 ? `<span style="font-size:0.68rem; color:#64748b; font-weight:700;">+${equips.length - 4} item(ns)</span>` : ''}
                    </div>
                ` : ''}

                ${a.observacoes ? `
                    <div style="font-size:0.71rem; color:#64748b; font-style:italic; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; white-space:pre-wrap; line-height:1.3;">"${esc(a.observacoes)}"</div>
                ` : ''}

                <!-- Rodapé do card: Foto + Nome do Atendente que abriu a solicitação e Data -->
                <div style="display:flex; align-items:center; justify-content:space-between; gap:8px; padding-top:6px; border-top:1px dashed #e2e8f0; margin-top:2px;">
                    ${renderAtendenteAvatarHtml(a, 22, 0.71)}
                    <span style="font-size:0.65rem; color:#94a3b8; white-space:nowrap;">${esc(fmtDataHoraBr(a.criado_em))}</span>
                </div>
            </div>
        `;
    }

    function renderKanbanBoard() {
        const container = document.getElementById('view-comercial-aprovacao');
        if (!container) return;

        const filtradas = filtrarAprovacoesMemoria();

        container.innerHTML = `
            <div style="font-family:'Inter',sans-serif; display:flex; flex-direction:column; gap:0.75rem;">
                <!-- Barra Superior -->
                <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:12px; padding:0.65rem 1.15rem; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:0.75rem; box-shadow:0 2px 8px rgba(15,23,42,0.04);">
                    <div style="display:flex; align-items:center; gap:10px;">
                        <div style="width:34px; height:34px; border-radius:9px; background:#f5f3ff; border:1px solid #ddd6fe; display:flex; align-items:center; justify-content:center; color:#7c3aed;">
                            <i class="ph ph-seal-check" style="font-size:1.25rem;"></i>
                        </div>
                        <h3 style="margin:0; font-size:1.05rem; font-weight:800; color:#0f172a;">Aprovação</h3>
                    </div>

                    <div style="display:flex; align-items:center; gap:0.55rem; flex-wrap:wrap; flex:1; justify-content:flex-end;">
                        <div style="position:relative; min-width:260px; max-width:360px; flex:1;">
                            <i class="ph ph-magnifying-glass" style="position:absolute; left:10px; top:50%; transform:translateY(-50%); color:#94a3b8; font-size:0.9rem;"></i>
                            <input type="text" id="caprv-search-input" value="${esc(state.buscaTexto)}"
                                placeholder="Pesquisar por nº, cliente, endereço, proposta..."
                                oninput="window._comercialAprovacao.onInputBusca(this.value)"
                                style="width:100%; height:32px; padding:4px 10px 4px 30px; border:1px solid #cbd5e1; border-radius:6px; font-size:0.78rem; box-sizing:border-box; text-transform:none;">
                        </div>

                        <label style="display:inline-flex; align-items:center; gap:6px; height:32px; padding:0 10px; border:1px solid ${state.apenasUrgentes ? '#fca5a5' : '#cbd5e1'}; background:${state.apenasUrgentes ? '#fef2f2' : '#ffffff'}; color:${state.apenasUrgentes ? '#dc2626' : '#475569'}; border-radius:6px; font-size:0.76rem; font-weight:700; cursor:pointer; user-select:none;">
                            <input type="checkbox" ${state.apenasUrgentes ? 'checked' : ''}
                                onchange="window._comercialAprovacao.onToggleFiltroUrgente(this.checked)"
                                style="margin:0; accent-color:#dc2626;">
                            <span>🚨 Apenas Urgentes</span>
                        </label>

                        <button type="button" onclick="window._comercialAprovacao.abrirModalNovaAprovacao()"
                            style="background:#7c3aed; color:#ffffff; border:1px solid #6d28d9; height:32px; padding:0 14px; border-radius:6px; font-size:0.78rem; font-weight:800; cursor:pointer; display:inline-flex; align-items:center; gap:6px;">
                            <i class="ph ph-plus-circle" style="font-size:0.95rem;"></i> Nova Aprovação
                        </button>

                        <button type="button" onclick="window._comercialAprovacao.recarregar()"
                            style="background:#f8fafc; color:#334155; border:1px solid #cbd5e1; height:32px; padding:0 10px; border-radius:6px; font-size:0.76rem; font-weight:700; cursor:pointer; display:inline-flex; align-items:center; gap:4px;">
                            <i class="ph ph-arrows-clockwise"></i> Atualizar
                        </button>
                    </div>
                </div>

                <!-- Grid das 5 Colunas do Kanban -->
                <div style="display:grid; grid-template-columns:repeat(5, minmax(230px, 1fr)); gap:0.7rem; overflow-x:auto; padding-bottom:0.5rem; align-items:start;">
                    ${COLUNAS_KANBAN.map(col => {
                        const cardsCol = filtradas.filter(a => normalizarColuna(a.coluna) === col.key);
                        return `
                            <div class="caprv-coluna"
                                ondragover="event.preventDefault(); this.style.outline='2px dashed ${col.cor}';"
                                ondragleave="this.style.outline='';"
                                ondrop="this.style.outline=''; window._comercialAprovacao.onDropColuna(event, '${esc(col.key)}')"
                                style="background:${col.bg}; border:1px solid ${col.border}; border-radius:12px; display:flex; flex-direction:column; min-height:70vh; max-height:calc(100vh - 180px);">

                                <!-- Header da Coluna -->
                                <div style="padding:10px 12px; border-bottom:2px solid ${col.border}; display:flex; align-items:center; justify-content:space-between; gap:6px; background:rgba(255,255,255,0.65); border-top-left-radius:12px; border-top-right-radius:12px;">
                                    <span style="font-size:0.78rem; font-weight:800; color:${col.cor}; display:flex; align-items:center; gap:6px; text-transform:uppercase; letter-spacing:0.02em;">
                                        <i class="ph ${col.icon}" style="font-size:1rem;"></i> ${esc(col.titulo)}
                                    </span>
                                    <span style="background:${col.cor}; color:#ffffff; font-size:0.7rem; font-weight:800; padding:1px 8px; border-radius:999px;">
                                        ${cardsCol.length}
                                    </span>
                                </div>

                                <!-- Lista de Cards -->
                                <div style="padding:8px; display:flex; flex-direction:column; gap:8px; overflow-y:auto; flex:1;">
                                    ${cardsCol.length > 0
                                        ? cardsCol.map(a => renderCardHtml(a)).join('')
                                        : `<div style="text-align:center; color:#94a3b8; font-size:0.74rem; padding:1.75rem 0.5rem; border:1px dashed ${col.border}; border-radius:8px; background:rgba(255,255,255,0.4);">Nenhuma aprovação nesta etapa</div>`
                                    }
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }

    /**
     * Cria ou retorna o container de modal customizado da tela de Aprovação.
     * Usamos um overlay próprio (z-index: 1000) para que sub-modais como
     * Cadastrar Novo Cliente, Cadastrar Novo Contato, Cadastrar Endereço ou
     * Pesquisa com Lupa (Swal z-index: 1060) abram POR CIMA sem fechar o modal de Aprovação!
     */
    function abrirOverlayModalAprovacao(htmlInterno, maxWidthPx = 980) {
        fecharOverlayModalAprovacao();
        const overlay = document.createElement('div');
        overlay.id = 'caprv-modal-overlay';
        overlay.style.cssText = 'position:fixed; inset:0; background:rgba(15,23,42,0.52); z-index:1000; display:flex; align-items:center; justify-content:center; padding:16px; overflow-y:auto; font-family:"Inter",sans-serif;';
        overlay.innerHTML = `
            <div id="caprv-modal-dialog" style="background:#ffffff; width:100%; max-width:${maxWidthPx}px; border-radius:14px; box-shadow:0 22px 50px rgba(15,23,42,0.28); border:1px solid #e2e8f0; overflow:visible; position:relative; margin:auto;">
                ${htmlInterno}
            </div>
        `;
        document.body.appendChild(overlay);
        return overlay;
    }

    function fecharOverlayModalAprovacao() {
        window._onAprovacaoClienteSalvo = null;
        window._onAprovacaoContatoSalvo = null;
        window._onAprovacaoEnderecoSalvo = null;
        const el = document.getElementById('caprv-modal-overlay');
        if (el) el.remove();
    }

    /**
     * Sub-modal (Swal) para pesquisar e selecionar Cliente ao clicar na Lupa ou dar Enter.
     */
    async function abrirModalPesquisaClienteAprovacao(termoInicial, onSelectCliente) {
        const clientes = await garantirCachesClientes();
        const qIni = limparIconeCliente(termoInicial || '');

        const filtrar = (termo) => {
            const q = normStr(limparIconeCliente(termo));
            const qDigits = String(termo || '').replace(/\D/g, '');
            if (!q && !qDigits) return clientes.slice(0, 150);
            return clientes.filter(c => {
                const rz = normStr(c.nome_razao_social || '');
                const ft = normStr(c.nome_fantasia || '');
                const cod = normStr(c.codigo || '');
                const doc = String(c.cpf_cnpj || '').replace(/\D/g, '');
                return rz.includes(q) || ft.includes(q) || cod.includes(q) || (qDigits && doc.includes(qDigits));
            }).slice(0, 150);
        };

        // Se digitou algo e há exatamente 1 resultado diferente do atual, ou quer abrir a lista:
        const renderLinhas = (termo) => {
            const lista = filtrar(termo);
            if (!lista.length) {
                return `
                    <tr>
                        <td colspan="3" style="padding:1.5rem; text-align:center; color:#64748b;">
                            <div style="margin-bottom:8px; font-weight:600;">Nenhum cliente encontrado para "${esc(termo)}".</div>
                            <button type="button" onclick="Swal.close(); if(typeof window.abrirModalCadastroCliente==='function') window.abrirModalCadastroCliente(null, '${escJsSingle(limparIconeCliente(termo))}');"
                                style="background:#eab308; color:#fff; border:none; padding:6px 14px; border-radius:6px; font-weight:700; cursor:pointer; font-size:0.78rem;">
                                <i class="ph ph-plus"></i> Cadastrar Novo Cliente
                            </button>
                        </td>
                    </tr>
                `;
            }
            return lista.map(c => {
                const nomeFmt = formatarClienteComIcone(c.nome_razao_social, c.grupo_clientes);
                return `
                    <tr onclick="window._selecionarClienteSubModalAprov('${escJsSingle(c.nome_razao_social)}', '${escJsSingle(c.grupo_clientes || '')}')"
                        style="cursor:pointer; border-bottom:1px solid #e2e8f0;"
                        onmouseover="this.style.background='#f5f3ff'" onmouseout="this.style.background='#ffffff'">
                        <td style="padding:7px 10px; font-weight:800; color:#7c3aed;">${esc(c.codigo || c.id || '')}</td>
                        <td style="padding:7px 10px; font-weight:700; color:#0f172a;">${esc(nomeFmt)}</td>
                        <td style="padding:7px 10px; color:#475569;">${esc(c.cpf_cnpj || '—')}</td>
                    </tr>
                `;
            }).join('');
        };

        window._selecionarClienteSubModalAprov = (razao, grupo) => {
            Swal.close();
            if (typeof onSelectCliente === 'function') onSelectCliente(razao, grupo);
        };

        await Swal.fire({
            title: 'Pesquisar Cliente',
            width: '780px',
            html: `
                <div style="text-align:left; font-family:'Inter',sans-serif; display:flex; flex-direction:column; gap:8px;">
                    <input type="text" id="swal-sub-pesq-cli-inp" value="${esc(qIni)}"
                        placeholder="Digite razão social, nome fantasia, código ou CPF/CNPJ..."
                        style="width:100%; height:34px; padding:4px 10px; border:1px solid #cbd5e1; border-radius:6px; font-size:0.82rem; box-sizing:border-box; text-transform:none;">
                    <div style="max-height:360px; overflow-y:auto; border:1px solid #e2e8f0; border-radius:8px; background:#fff;">
                        <table style="width:100%; border-collapse:collapse; font-size:0.8rem; text-align:left;">
                            <thead>
                                <tr style="background:#f8fafc; border-bottom:2px solid #cbd5e1; position:sticky; top:0;">
                                    <th style="padding:7px 10px; width:85px;">Código</th>
                                    <th style="padding:7px 10px;">Nome / Razão Social</th>
                                    <th style="padding:7px 10px; width:165px;">CPF / CNPJ</th>
                                </tr>
                            </thead>
                            <tbody id="swal-sub-pesq-cli-tbody">${renderLinhas(qIni)}</tbody>
                        </table>
                    </div>
                </div>
            `,
            showCancelButton: true,
            showConfirmButton: true,
            confirmButtonText: '<i class="ph ph-plus"></i> Cadastrar Novo Cliente',
            confirmButtonColor: '#eab308',
            cancelButtonText: 'Fechar',
            didOpen: () => {
                const inp = document.getElementById('swal-sub-pesq-cli-inp');
                const tb = document.getElementById('swal-sub-pesq-cli-tbody');
                if (inp && tb) {
                    inp.addEventListener('input', () => { tb.innerHTML = renderLinhas(inp.value); });
                    inp.addEventListener('keydown', (ev) => {
                        if (ev.key === 'Enter') {
                            ev.preventDefault();
                            const tr = tb.querySelector('tr[onclick]');
                            if (tr) tr.click();
                        }
                    });
                    inp.focus();
                    inp.select();
                }
            }
        }).then(res => {
            if (res.isConfirmed && typeof window.abrirModalCadastroCliente === 'function') {
                const t = document.getElementById('swal-sub-pesq-cli-inp')?.value || qIni;
                window.abrirModalCadastroCliente(null, limparIconeCliente(t));
            }
        });
    }

    /**
     * Sub-modal (Swal) para pesquisar e selecionar Contato do Cliente ao clicar na Lupa ou dar Enter.
     */
    async function abrirModalPesquisaContatoAprovacao(clienteNomeLimpo, termoInicial, onSelectContato) {
        let contatos = [];
        if (typeof window._obterDadosContatosClienteProposta === 'function') {
            try {
                const dados = await window._obterDadosContatosClienteProposta(clienteNomeLimpo);
                contatos = Array.isArray(dados?.contatosDoCliente) ? dados.contatosDoCliente : [];
            } catch (_) {}
        }

        const renderLinhas = (termo) => {
            const q = normStr(termo);
            const lista = contatos.filter(c => {
                if (!q) return true;
                return normStr(`${c.nome} ${c.cargo} ${c.email} ${c.celular}`).includes(q);
            });
            if (!lista.length) {
                return `
                    <tr>
                        <td colspan="4" style="padding:1.5rem; text-align:center; color:#64748b;">
                            <div style="margin-bottom:8px; font-weight:600;">Nenhum contato encontrado para este cliente.</div>
                            <button type="button" onclick="Swal.close(); if(typeof window.cadastrarNovoContatoProposta==='function') window.cadastrarNovoContatoProposta('${escJsSingle(termo)}', false, 'aprovacao');"
                                style="background:#eab308; color:#fff; border:none; padding:6px 14px; border-radius:6px; font-weight:700; cursor:pointer; font-size:0.78rem;">
                                <i class="ph ph-plus"></i> Cadastrar Novo Contato
                            </button>
                        </td>
                    </tr>
                `;
            }
            return lista.map(c => `
                <tr onclick="window._selecionarContatoSubModalAprov('${escJsSingle(c.nome)}')"
                    style="cursor:pointer; border-bottom:1px solid #e2e8f0;"
                    onmouseover="this.style.background='#f5f3ff'" onmouseout="this.style.background='#ffffff'">
                    <td style="padding:7px 10px; font-weight:700; color:#0f172a;">${esc(c.nome)}</td>
                    <td style="padding:7px 10px; color:#475569;">${esc(c.cargo || '—')}</td>
                    <td style="padding:7px 10px; color:#475569;">${esc(c.celular || '—')}</td>
                    <td style="padding:7px 10px; color:#475569;">${esc(c.email || '—')}</td>
                </tr>
            `).join('');
        };

        window._selecionarContatoSubModalAprov = (nomeContato) => {
            Swal.close();
            if (typeof onSelectContato === 'function') onSelectContato(nomeContato);
        };

        await Swal.fire({
            title: `Contatos do Cliente${clienteNomeLimpo ? ' — ' + formatarClienteComIcone(clienteNomeLimpo) : ''}`,
            width: '760px',
            html: `
                <div style="text-align:left; font-family:'Inter',sans-serif; display:flex; flex-direction:column; gap:8px;">
                    <input type="text" id="swal-sub-pesq-con-inp" value="${esc(termoInicial || '')}"
                        placeholder="Digite o nome, cargo, telefone ou e-mail do contato..."
                        style="width:100%; height:34px; padding:4px 10px; border:1px solid #cbd5e1; border-radius:6px; font-size:0.82rem; box-sizing:border-box; text-transform:none;">
                    <div style="max-height:340px; overflow-y:auto; border:1px solid #e2e8f0; border-radius:8px; background:#fff;">
                        <table style="width:100%; border-collapse:collapse; font-size:0.8rem; text-align:left;">
                            <thead>
                                <tr style="background:#f8fafc; border-bottom:2px solid #cbd5e1; position:sticky; top:0;">
                                    <th style="padding:7px 10px;">Nome</th>
                                    <th style="padding:7px 10px;">Cargo / Depto</th>
                                    <th style="padding:7px 10px;">Celular / Tel</th>
                                    <th style="padding:7px 10px;">E-mail</th>
                                </tr>
                            </thead>
                            <tbody id="swal-sub-pesq-con-tbody">${renderLinhas(termoInicial || '')}</tbody>
                        </table>
                    </div>
                </div>
            `,
            showCancelButton: true,
            showConfirmButton: true,
            confirmButtonText: '<i class="ph ph-plus"></i> Cadastrar Novo Contato',
            confirmButtonColor: '#eab308',
            cancelButtonText: 'Fechar',
            didOpen: () => {
                const inp = document.getElementById('swal-sub-pesq-con-inp');
                const tb = document.getElementById('swal-sub-pesq-con-tbody');
                if (inp && tb) {
                    inp.addEventListener('input', () => { tb.innerHTML = renderLinhas(inp.value); });
                    inp.addEventListener('keydown', (ev) => {
                        if (ev.key === 'Enter') {
                            ev.preventDefault();
                            const tr = tb.querySelector('tr[onclick]');
                            if (tr) tr.click();
                        }
                    });
                    inp.focus();
                }
            }
        }).then(res => {
            if (res.isConfirmed && typeof window.cadastrarNovoContatoProposta === 'function') {
                const t = document.getElementById('swal-sub-pesq-con-inp')?.value || termoInicial || '';
                window.cadastrarNovoContatoProposta(t, false, 'aprovacao');
            }
        });
    }

    /**
     * Sub-modal (Swal) para pesquisar e selecionar Endereço de Instalação do Cliente ao clicar na Lupa ou dar Enter.
     */
    async function abrirModalPesquisaEnderecoAprovacao(clienteNomeLimpo, termoInicial, onSelectEndereco) {
        let enderecos = [];
        let foundCli = null;
        if (typeof window._obterDadosEnderecosClienteProposta === 'function') {
            try {
                const dados = await window._obterDadosEnderecosClienteProposta(clienteNomeLimpo);
                enderecos = Array.isArray(dados?.enderecosDoCliente) ? dados.enderecosDoCliente : [];
                foundCli = dados?.foundCli || null;
            } catch (_) {}
        }

        const renderLinhas = (termo) => {
            const q = normStr(termo);
            const lista = enderecos.filter(e => {
                if (!q) return true;
                return normStr(`${e.nome_local} ${e.texto_completo} ${e.endereco} ${e.bairro} ${e.municipio} ${e.cep}`).includes(q);
            });
            if (!lista.length) {
                return `
                    <tr>
                        <td colspan="3" style="padding:1.5rem; text-align:center; color:#64748b;">
                            <div style="margin-bottom:8px; font-weight:600;">Nenhum endereço cadastrado encontrado para este cliente.</div>
                            <button type="button" onclick="Swal.close(); window._abrirCadastroEnderecoDoClienteAprov();"
                                style="background:#eab308; color:#fff; border:none; padding:6px 14px; border-radius:6px; font-weight:700; cursor:pointer; font-size:0.78rem;">
                                <i class="ph ph-plus"></i> Cadastrar Novo Endereço
                            </button>
                        </td>
                    </tr>
                `;
            }
            return lista.map(e => `
                <tr onclick="window._selecionarEnderecoSubModalAprov('${escJsSingle(e.texto_completo)}')"
                    style="cursor:pointer; border-bottom:1px solid #e2e8f0;"
                    onmouseover="this.style.background='#f5f3ff'" onmouseout="this.style.background='#ffffff'">
                    <td style="padding:7px 10px; font-weight:700; color:#0f172a;">${esc(e.nome_local || 'Local')}</td>
                    <td style="padding:7px 10px; color:#334155;">${esc(e.texto_completo || e.endereco || '')}</td>
                    <td style="padding:7px 10px; color:#475569; white-space:nowrap;">${esc(e.municipio || '')}${e.uf ? '/' + esc(e.uf) : ''}</td>
                </tr>
            `).join('');
        };

        window._selecionarEnderecoSubModalAprov = (textoEnd) => {
            Swal.close();
            if (typeof onSelectEndereco === 'function') onSelectEndereco(textoEnd);
        };

        window._abrirCadastroEnderecoDoClienteAprov = () => {
            if (typeof window.abrirModalEnderecosEntrega === 'function') {
                window.abrirModalEnderecosEntrega(foundCli);
            }
        };

        await Swal.fire({
            title: `Endereços de Instalação${clienteNomeLimpo ? ' — ' + formatarClienteComIcone(clienteNomeLimpo) : ''}`,
            width: '820px',
            html: `
                <div style="text-align:left; font-family:'Inter',sans-serif; display:flex; flex-direction:column; gap:8px;">
                    <input type="text" id="swal-sub-pesq-end-inp" value="${esc(termoInicial || '')}"
                        placeholder="Digite nome do local, rua, bairro, cidade ou CEP..."
                        style="width:100%; height:34px; padding:4px 10px; border:1px solid #cbd5e1; border-radius:6px; font-size:0.82rem; box-sizing:border-box; text-transform:none;">
                    <div style="max-height:340px; overflow-y:auto; border:1px solid #e2e8f0; border-radius:8px; background:#fff;">
                        <table style="width:100%; border-collapse:collapse; font-size:0.8rem; text-align:left;">
                            <thead>
                                <tr style="background:#f8fafc; border-bottom:2px solid #cbd5e1; position:sticky; top:0;">
                                    <th style="padding:7px 10px; width:170px;">Local</th>
                                    <th style="padding:7px 10px;">Endereço Completo</th>
                                    <th style="padding:7px 10px; width:140px;">Cidade / UF</th>
                                </tr>
                            </thead>
                            <tbody id="swal-sub-pesq-end-tbody">${renderLinhas(termoInicial || '')}</tbody>
                        </table>
                    </div>
                </div>
            `,
            showCancelButton: true,
            showConfirmButton: true,
            confirmButtonText: '<i class="ph ph-plus"></i> Cadastrar Novo Endereço',
            confirmButtonColor: '#eab308',
            cancelButtonText: 'Fechar',
            didOpen: () => {
                const inp = document.getElementById('swal-sub-pesq-end-inp');
                const tb = document.getElementById('swal-sub-pesq-end-tbody');
                if (inp && tb) {
                    inp.addEventListener('input', () => { tb.innerHTML = renderLinhas(inp.value); });
                    inp.addEventListener('keydown', (ev) => {
                        if (ev.key === 'Enter') {
                            ev.preventDefault();
                            const tr = tb.querySelector('tr[onclick]');
                            if (tr) tr.click();
                        }
                    });
                    inp.focus();
                }
            }
        }).then(res => {
            if (res.isConfirmed) {
                window._abrirCadastroEnderecoDoClienteAprov();
            }
        });
    }

    /**
     * Visualizador de PDF da Proposta (acionado pelo botão de Olho na tela de Vincular Proposta).
     */
    async function visualizarPdfPropostaNoModal(propostaId) {
        const idNum = Number(propostaId);
        if (!idNum) return;
        if (typeof window.gerarHtmlImpressaoLinkProposta !== 'function') {
            if (typeof window.baixarPdfProposta === 'function') {
                await window.baixarPdfProposta(idNum);
            }
            return;
        }
        try {
            Swal.fire({
                title: 'Carregando documento da proposta...',
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading()
            });
            const { htmlCorpo } = await window.gerarHtmlImpressaoLinkProposta(idNum);
            Swal.close();

            const docFull = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><style>html,body{margin:0;padding:12px;background:#fff;}</style></head><body>${htmlCorpo}</body></html>`;

            await Swal.fire({
                title: `Documento PDF da Proposta`,
                width: '1040px',
                html: `
                    <div style="display:flex; flex-direction:column; gap:8px; text-align:left; font-family:'Inter',sans-serif;">
                        <div style="display:flex; justify-content:flex-end; gap:8px;">
                            <button type="button" onclick="if(typeof window.baixarPdfProposta==='function') window.baixarPdfProposta(${idNum});"
                                style="background:#0f172a; color:#fff; border:none; padding:6px 14px; border-radius:6px; font-size:0.78rem; font-weight:700; cursor:pointer; display:inline-flex; align-items:center; gap:6px;">
                                <i class="ph ph-printer"></i> Imprimir / Salvar PDF
                            </button>
                        </div>
                        <iframe id="caprv-pdf-preview-iframe" style="width:100%; height:68vh; border:1px solid #cbd5e1; border-radius:8px; background:#ffffff;"></iframe>
                    </div>
                `,
                showConfirmButton: true,
                confirmButtonText: 'Fechar Visualização',
                confirmButtonColor: '#64748b',
                didOpen: () => {
                    const ifr = document.getElementById('caprv-pdf-preview-iframe');
                    if (ifr) {
                        ifr.srcdoc = docFull;
                    }
                }
            });
        } catch (e) {
            Swal.fire('Erro', 'Não foi possível visualizar o PDF da proposta: ' + (e.message || e), 'error');
        }
    }

    /**
     * Inicializa e gerencia o comportamento interativo dos campos de:
     * - Tipo de Proposta
     * - Checkbox "Ainda não é cliente"
     * - Pesquisa/Dropdown/Lupa/+ de Cliente, Contato e Endereço de Instalação
     * - Seleção de Equipamentos da OS da Logística com ícones
     * dentro do modal de Nova Aprovação ou Detalhes da Aprovação.
     */
    async function configurarFormularioAprovacaoInterativo(opcoes) {
        const clientes = await garantirCachesClientes();
        let contatosClienteAtual = [];
        let enderecosClienteAtual = [];
        let foundCliAtual = null;

        const inpCli = document.getElementById('caprv-inp-cliente');
        const dropCli = document.getElementById('caprv-drop-cliente');
        const inpCon = document.getElementById('caprv-inp-contato');
        const dropCon = document.getElementById('caprv-drop-contato');
        const inpEnd = document.getElementById('caprv-inp-endereco');
        const dropEnd = document.getElementById('caprv-drop-endereco');
        const chkNaoCliente = document.getElementById('caprv-chk-nao-cliente');
        const selTipo = document.getElementById('caprv-sel-tipo-proposta');
        const inpEq = document.getElementById('caprv-inp-equip-nome');
        const dropEq = document.getElementById('caprv-drop-equip');

        const atualizarVisibilidadeBotoesCadastro = () => {
            const naoEhCli = Boolean(chkNaoCliente && chkNaoCliente.checked);
            document.querySelectorAll('.caprv-btn-only-cliente').forEach(btn => {
                btn.style.display = naoEhCli ? 'none' : 'inline-flex';
            });
            if (inpCli) {
                inpCli.placeholder = naoEhCli
                    ? 'Digite o nome do prospect / empresa que ainda não é cliente...'
                    : 'Digite e tecle Enter ou clique na lupa para pesquisar cliente...';
            }
            if (inpCon) {
                inpCon.placeholder = naoEhCli
                    ? 'Digite o nome do contato...'
                    : 'Selecione ou pesquise o contato do cliente...';
            }
            if (inpEnd) {
                inpEnd.placeholder = naoEhCli
                    ? 'Digite o endereço completo de instalação...'
                    : 'Selecione ou pesquise o endereço de instalação do cliente...';
            }
        };

        const carregarVinculosDoCliente = async (nomeClienteRaw) => {
            const limpo = limparIconeCliente(nomeClienteRaw);
            if (!limpo) {
                contatosClienteAtual = [];
                enderecosClienteAtual = [];
                foundCliAtual = null;
                return;
            }
            if (typeof window._obterDadosContatosClienteProposta === 'function') {
                try {
                    const dc = await window._obterDadosContatosClienteProposta(limpo);
                    contatosClienteAtual = Array.isArray(dc?.contatosDoCliente) ? dc.contatosDoCliente : [];
                    foundCliAtual = dc?.foundCli || foundCliAtual;
                } catch (_) {}
            }
            if (typeof window._obterDadosEnderecosClienteProposta === 'function') {
                try {
                    const de = await window._obterDadosEnderecosClienteProposta(limpo);
                    enderecosClienteAtual = Array.isArray(de?.enderecosDoCliente) ? de.enderecosDoCliente : [];
                    foundCliAtual = de?.foundCli || foundCliAtual;
                } catch (_) {}
            }
        };

        const selecionarClienteNoForm = async (razaoSocial, grupoOpcional = '') => {
            const fmt = formatarClienteComIcone(razaoSocial, grupoOpcional);
            if (inpCli) inpCli.value = fmt === '—' ? '' : fmt;
            if (dropCli) dropCli.style.display = 'none';
            await carregarVinculosDoCliente(razaoSocial);
        };

        // Callbacks globais chamados quando o usuário cadastra um novo Cliente, Contato ou Endereço pelo botão '+' amarelo
        window._onAprovacaoClienteSalvo = async (razaoSocial, grupo) => {
            await garantirCachesClientes();
            await selecionarClienteNoForm(razaoSocial, grupo);
        };
        window._onAprovacaoContatoSalvo = async (nomeContato, empRazao) => {
            if (empRazao && inpCli && !limparIconeCliente(inpCli.value)) {
                await selecionarClienteNoForm(empRazao);
            } else if (inpCli) {
                await carregarVinculosDoCliente(inpCli.value);
            }
            if (inpCon) inpCon.value = nomeContato || '';
        };
        window._onAprovacaoEnderecoSalvo = async (enderecoCompleto) => {
            if (inpCli) await carregarVinculosDoCliente(inpCli.value);
            if (inpEnd) inpEnd.value = enderecoCompleto || '';
        };

        if (chkNaoCliente) {
            chkNaoCliente.addEventListener('change', () => {
                atualizarVisibilidadeBotoesCadastro();
                if (dropCli) dropCli.style.display = 'none';
                if (dropCon) dropCon.style.display = 'none';
                if (dropEnd) dropEnd.style.display = 'none';
            });
        }
        atualizarVisibilidadeBotoesCadastro();

        // Pré-carrega contatos e endereços caso já haja cliente preenchido
        if (inpCli && limparIconeCliente(inpCli.value)) {
            await carregarVinculosDoCliente(inpCli.value);
        }

        // 1. Campo Cliente: filtro em tempo real + Enter para abrir pesquisa na lupa
        if (inpCli && dropCli) {
            const renderDropCli = () => {
                if (chkNaoCliente && chkNaoCliente.checked) {
                    dropCli.style.display = 'none';
                    return;
                }
                const q = normStr(limparIconeCliente(inpCli.value));
                const matches = (clientes || []).filter(c => {
                    if (!q) return true;
                    return normStr(c.nome_razao_social || '').includes(q) ||
                           normStr(c.nome_fantasia || '').includes(q) ||
                           String(c.cpf_cnpj || '').includes(q);
                }).slice(0, 30);

                if (!matches.length) {
                    dropCli.innerHTML = `
                        <div onmousedown="event.preventDefault(); if(typeof window.abrirModalCadastroCliente==='function') window.abrirModalCadastroCliente(null, '${escJsSingle(limparIconeCliente(inpCli.value))}');"
                            style="padding:8px 10px; font-size:0.78rem; color:#ca8a04; font-weight:700; cursor:pointer; background:#fefce8;">
                            <i class="ph ph-plus-circle"></i> Cliente não encontrado. Clique para cadastrar "${esc(limparIconeCliente(inpCli.value))}"
                        </div>
                    `;
                    dropCli.style.display = 'block';
                    return;
                }
                dropCli.innerHTML = matches.map(c => {
                    const fmt = formatarClienteComIcone(c.nome_razao_social, c.grupo_clientes);
                    return `
                        <div onmousedown="event.preventDefault(); window._caprvSelectCliDrop('${escJsSingle(c.nome_razao_social)}', '${escJsSingle(c.grupo_clientes || '')}');"
                            style="padding:7px 10px; font-size:0.79rem; cursor:pointer; border-bottom:1px solid #f1f5f9; display:flex; align-items:center; justify-content:space-between; gap:8px;"
                            onmouseover="this.style.background='#f5f3ff'" onmouseout="this.style.background='#ffffff'">
                            <span style="font-weight:700; color:#0f172a;">${esc(fmt)}</span>
                            <span style="font-size:0.71rem; color:#64748b;">${esc(c.cpf_cnpj || '')}</span>
                        </div>
                    `;
                }).join('');
                dropCli.style.display = 'block';
            };

            window._caprvSelectCliDrop = async (rz, grp) => {
                await selecionarClienteNoForm(rz, grp);
            };

            inpCli.addEventListener('input', renderDropCli);
            inpCli.addEventListener('focus', renderDropCli);
            inpCli.addEventListener('blur', () => setTimeout(() => { dropCli.style.display = 'none'; }, 160));
            inpCli.addEventListener('keydown', (ev) => {
                if (ev.key === 'Enter') {
                    ev.preventDefault();
                    dropCli.style.display = 'none';
                    if (chkNaoCliente && chkNaoCliente.checked) return;
                    abrirModalPesquisaClienteAprovacao(inpCli.value, selecionarClienteNoForm);
                }
            });
        }

        // Botões Lupa e + de Cliente
        window._caprvClickLupaCliente = () => {
            if (chkNaoCliente && chkNaoCliente.checked) return;
            abrirModalPesquisaClienteAprovacao(inpCli ? inpCli.value : '', selecionarClienteNoForm);
        };
        window._caprvClickAddCliente = () => {
            if (typeof window.abrirModalCadastroCliente === 'function') {
                window.abrirModalCadastroCliente(null, limparIconeCliente(inpCli ? inpCli.value : ''));
            }
        };

        // 2. Campo Contato: dropdown dos contatos do cliente + Lupa + botão '+'
        if (inpCon && dropCon) {
            const renderDropCon = async () => {
                if (chkNaoCliente && chkNaoCliente.checked) {
                    dropCon.style.display = 'none';
                    return;
                }
                const cliLimpo = limparIconeCliente(inpCli ? inpCli.value : '');
                if (cliLimpo && !contatosClienteAtual.length) {
                    await carregarVinculosDoCliente(cliLimpo);
                }
                const q = normStr(inpCon.value);
                const matches = (contatosClienteAtual || []).filter(c => {
                    if (!q) return true;
                    return normStr(`${c.nome} ${c.cargo} ${c.email} ${c.celular}`).includes(q);
                }).slice(0, 30);

                if (!matches.length) {
                    dropCon.innerHTML = `
                        <div style="padding:7px 10px; font-size:0.76rem; color:#64748b;">
                            ${cliLimpo ? 'Nenhum contato vinculado encontrado.' : 'Selecione um cliente primeiro.'}
                        </div>
                    `;
                    dropCon.style.display = 'block';
                    return;
                }
                dropCon.innerHTML = matches.map(c => `
                    <div onmousedown="event.preventDefault(); document.getElementById('caprv-inp-contato').value='${escJsSingle(c.nome)}'; document.getElementById('caprv-drop-contato').style.display='none';"
                        style="padding:7px 10px; font-size:0.79rem; cursor:pointer; border-bottom:1px solid #f1f5f9; display:flex; align-items:center; justify-content:space-between; gap:8px;"
                        onmouseover="this.style.background='#f5f3ff'" onmouseout="this.style.background='#ffffff'">
                        <span style="font-weight:700; color:#0f172a;">${esc(c.nome)}</span>
                        <span style="font-size:0.71rem; color:#64748b;">${esc([c.cargo, c.celular || c.email].filter(Boolean).join(' • '))}</span>
                    </div>
                `).join('');
                dropCon.style.display = 'block';
            };

            inpCon.addEventListener('input', renderDropCon);
            inpCon.addEventListener('focus', renderDropCon);
            inpCon.addEventListener('blur', () => setTimeout(() => { dropCon.style.display = 'none'; }, 160));
            inpCon.addEventListener('keydown', (ev) => {
                if (ev.key === 'Enter') {
                    ev.preventDefault();
                    dropCon.style.display = 'none';
                    if (chkNaoCliente && chkNaoCliente.checked) return;
                    window._caprvClickLupaContato();
                }
            });
        }

        window._caprvClickLupaContato = () => {
            if (chkNaoCliente && chkNaoCliente.checked) return;
            const cliLimpo = limparIconeCliente(inpCli ? inpCli.value : '');
            abrirModalPesquisaContatoAprovacao(cliLimpo, inpCon ? inpCon.value : '', (nomeSel) => {
                if (inpCon) inpCon.value = nomeSel;
            });
        };
        window._caprvClickAddContato = () => {
            if (typeof window.cadastrarNovoContatoProposta === 'function') {
                window.cadastrarNovoContatoProposta(inpCon ? inpCon.value : '', false, 'aprovacao');
            }
        };

        // 3. Campo Endereço de Instalação: dropdown dos endereços do cliente + Lupa + botão '+'
        if (inpEnd && dropEnd) {
            const renderDropEnd = async () => {
                if (chkNaoCliente && chkNaoCliente.checked) {
                    dropEnd.style.display = 'none';
                    return;
                }
                const cliLimpo = limparIconeCliente(inpCli ? inpCli.value : '');
                if (cliLimpo && !enderecosClienteAtual.length) {
                    await carregarVinculosDoCliente(cliLimpo);
                }
                const q = normStr(inpEnd.value);
                const matches = (enderecosClienteAtual || []).filter(e => {
                    if (!q) return true;
                    return normStr(`${e.nome_local} ${e.texto_completo} ${e.endereco} ${e.bairro} ${e.municipio}`).includes(q);
                }).slice(0, 30);

                if (!matches.length) {
                    dropEnd.innerHTML = `
                        <div style="padding:7px 10px; font-size:0.76rem; color:#64748b;">
                            ${cliLimpo ? 'Nenhum endereço cadastrado para este cliente. Clique no botão + para adicionar.' : 'Selecione um cliente primeiro para listar os endereços.'}
                        </div>
                    `;
                    dropEnd.style.display = 'block';
                    return;
                }
                dropEnd.innerHTML = matches.map(e => `
                    <div onmousedown="event.preventDefault(); document.getElementById('caprv-inp-endereco').value='${escJsSingle(e.texto_completo)}'; document.getElementById('caprv-drop-endereco').style.display='none';"
                        style="padding:7px 10px; font-size:0.78rem; cursor:pointer; border-bottom:1px solid #f1f5f9;"
                        onmouseover="this.style.background='#f5f3ff'" onmouseout="this.style.background='#ffffff'">
                        <div style="font-weight:700; color:#0f172a;">${esc(e.nome_local || 'Endereço')}</div>
                        <div style="font-size:0.72rem; color:#475569;">${esc(e.texto_completo)}</div>
                    </div>
                `).join('');
                dropEnd.style.display = 'block';
            };

            inpEnd.addEventListener('input', renderDropEnd);
            inpEnd.addEventListener('focus', renderDropEnd);
            inpEnd.addEventListener('blur', () => setTimeout(() => { dropEnd.style.display = 'none'; }, 160));
            inpEnd.addEventListener('keydown', (ev) => {
                if (ev.key === 'Enter') {
                    ev.preventDefault();
                    dropEnd.style.display = 'none';
                    if (chkNaoCliente && chkNaoCliente.checked) return;
                    window._caprvClickLupaEndereco();
                }
            });
        }

        window._caprvClickLupaEndereco = () => {
            if (chkNaoCliente && chkNaoCliente.checked) return;
            const cliLimpo = limparIconeCliente(inpCli ? inpCli.value : '');
            abrirModalPesquisaEnderecoAprovacao(cliLimpo, inpEnd ? inpEnd.value : '', (endSel) => {
                if (inpEnd) inpEnd.value = endSel;
            });
        };
        window._caprvClickAddEndereco = async () => {
            const cliLimpo = limparIconeCliente(inpCli ? inpCli.value : '');
            if (cliLimpo && !foundCliAtual) {
                await carregarVinculosDoCliente(cliLimpo);
            }
            if (typeof window.abrirModalEnderecosEntrega === 'function') {
                window.abrirModalEnderecosEntrega(foundCliAtual);
            }
        };

        // 4. Campo Equipamentos da OS da Logística (com ícones e filtro em tempo real por Tipo de Proposta)
        if (inpEq && dropEq) {
            const renderDropEq = () => {
                const tipoAtual = selTipo ? selTipo.value : 'OBRA MENSAL';
                const catalogo = obterEquipamentosCatalogoPorTipo(tipoAtual);
                const q = normStr(inpEq.value);
                const matches = catalogo.filter(item => !q || normStr(item.label).includes(q) || normStr(item.codigo).includes(q));
                if (!matches.length) {
                    dropEq.style.display = 'none';
                    return;
                }
                dropEq.innerHTML = matches.map(item => `
                    <div onmousedown="event.preventDefault(); document.getElementById('caprv-inp-equip-nome').value='${escJsSingle(item.label)}'; document.getElementById('caprv-drop-equip').style.display='none';"
                        style="padding:7px 10px; font-size:0.8rem; font-weight:700; color:#0f172a; cursor:pointer; border-bottom:1px solid #f1f5f9;"
                        onmouseover="this.style.background='#f5f3ff'" onmouseout="this.style.background='#ffffff'">
                        ${esc(item.label)}
                    </div>
                `).join('');
                dropEq.style.display = 'block';
            };

            inpEq.addEventListener('input', renderDropEq);
            inpEq.addEventListener('focus', renderDropEq);
            inpEq.addEventListener('click', renderDropEq);
            inpEq.addEventListener('blur', () => setTimeout(() => { dropEq.style.display = 'none'; }, 160));
            if (selTipo) {
                selTipo.addEventListener('change', () => {
                    if (inpEq.value) inpEq.value = '';
                });
            }
        }
    }

    window._comercialAprovacao = {
        async init() {
            await carregarAprovacoesServidor();
            renderKanbanBoard();
        },

        async recarregar() {
            await carregarAprovacoesServidor();
            renderKanbanBoard();
        },

        onInputBusca(val) {
            state.buscaTexto = val || '';
            const pos = document.getElementById('caprv-search-input')?.selectionStart || state.buscaTexto.length;
            renderKanbanBoard();
            const inp = document.getElementById('caprv-search-input');
            if (inp) {
                inp.focus();
                try { inp.setSelectionRange(pos, pos); } catch (_) {}
            }
        },

        onToggleFiltroUrgente(checked) {
            state.apenasUrgentes = Boolean(checked);
            renderKanbanBoard();
        },

        onDragStart(event, id) {
            state.draggingId = Number(id);
            if (event.dataTransfer) {
                event.dataTransfer.setData('text/plain', String(id));
            }
        },

        async onDropColuna(event, novaColuna) {
            event.preventDefault();
            const id = Number(state.draggingId || (event.dataTransfer && event.dataTransfer.getData('text/plain')));
            state.draggingId = null;
            if (!id) return;
            await this.mudarColunaRapido(id, novaColuna);
        },

        async mudarColunaRapido(id, novaColuna) {
            const aprv = (state.aprovacoes || []).find(x => Number(x.id) === Number(id));
            if (!aprv || normalizarColuna(aprv.coluna) === novaColuna) return;
            try {
                const tk = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token') || '';
                const r = await fetch(`/api/comercial/aprovacoes/${id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(tk ? { 'Authorization': 'Bearer ' + tk } : {})
                    },
                    body: JSON.stringify({ coluna: novaColuna })
                });
                const res = await r.json();
                if (r.ok && res.success) {
                    aprv.coluna = novaColuna;
                    renderKanbanBoard();
                    if (typeof mostrarToastSucesso === 'function') {
                        mostrarToastSucesso(`Aprovação Nº ${aprv.numero_aprovacao} movida para "${novaColuna}"!`);
                    }
                }
            } catch (e) {
                console.error(e);
            }
        },

        /**
         * Abre modal para criar uma Nova Solicitação de Aprovação.
         * Sempre nasce na coluna "Solicitação".
         */
        async abrirModalNovaAprovacao(dadosIniciais = {}, onCreatedCallback = null) {
            await garantirCachesClientes();
            const propId = dadosIniciais.proposta_id ? Number(dadosIniciais.proposta_id) : null;
            const propCodigo = String(dadosIniciais.proposta_codigo || '').trim();
            const tipoIniRaw = String(dadosIniciais.tipo_proposta || 'OBRA MENSAL').trim().toUpperCase();
            const tipoIni = TIPOS_PROPOSTA_APROVACAO.some(t => t.value === tipoIniRaw) ? tipoIniRaw : 'OBRA MENSAL';
            const cliIni = limparIconeCliente(dadosIniciais.cliente_nome || '');
            const contIni = String(dadosIniciais.contato_nome || '').trim();
            const endIni = String(dadosIniciais.endereco_instalacao || '').trim();
            const equipsIni = Array.isArray(dadosIniciais.equipamentos)
                ? dadosIniciais.equipamentos
                : parseEquipamentosLista(dadosIniciais.equipamentos_json || '[]');
            const obsIni = String(dadosIniciais.observacoes || '').trim();

            let equipsDraft = equipsIni.map(it => {
                const rawNome = String(it.produto || it.descricao || it.nome || '').trim();
                return {
                    produto: formatarNomeEquipamentoComIcone(rawNome, tipoIni),
                    quantidade: Math.max(1, parseInt(it.quantidade ?? it.qtde ?? 1, 10) || 1),
                    observacao: String(it.observacao || '').trim()
                };
            }).filter(it => it.produto);

            const renderEquipsDraftHtml = () => {
                if (!equipsDraft.length) {
                    return `<div style="color:#94a3b8; font-size:0.78rem; font-style:italic; padding:8px;">Nenhum equipamento adicionado. Selecione acima e clique em "+ Incluir".</div>`;
                }
                return equipsDraft.map((eq, idx) => `
                    <div style="display:flex; align-items:center; justify-content:space-between; gap:8px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; padding:5px 10px; font-size:0.8rem;">
                        <span style="font-weight:700; color:#1e293b;"><strong>${eq.quantidade}x</strong> ${esc(eq.produto)} ${eq.observacao ? `<span style="color:#64748b; font-weight:500;">(${esc(eq.observacao)})</span>` : ''}</span>
                        <button type="button" onclick="window._removerEquipModalAprov(${idx})" style="background:#fef2f2; color:#dc2626; border:1px solid #fecaca; border-radius:4px; padding:1px 7px; font-size:0.75rem; font-weight:700; cursor:pointer;">&times;</button>
                    </div>
                `).join('');
            };

            window._removerEquipModalAprov = (idx) => {
                equipsDraft.splice(idx, 1);
                const w = document.getElementById('caprv-equips-list');
                if (w) w.innerHTML = renderEquipsDraftHtml();
            };

            window._adicionarEquipModalAprov = () => {
                const tipoSel = document.getElementById('caprv-sel-tipo-proposta')?.value || 'OBRA MENSAL';
                const nmRaw = String(document.getElementById('caprv-inp-equip-nome')?.value || '').trim();
                const qt = Math.max(1, parseInt(document.getElementById('caprv-inp-equip-qtd')?.value || '1', 10) || 1);
                if (!nmRaw) return;
                const nmFmt = formatarNomeEquipamentoComIcone(nmRaw, tipoSel);
                equipsDraft.push({ produto: nmFmt, quantidade: qt, observacao: '' });
                const inpN = document.getElementById('caprv-inp-equip-nome');
                if (inpN) inpN.value = '';
                const w = document.getElementById('caprv-equips-list');
                if (w) w.innerHTML = renderEquipsDraftHtml();
            };

            return new Promise(async (resolve) => {
                window._fecharModalNovaAprovCancel = () => {
                    fecharOverlayModalAprovacao();
                    resolve(null);
                };

                window._salvarModalNovaAprovConfirm = async () => {
                    const cliRaw = limparIconeCliente(document.getElementById('caprv-inp-cliente')?.value || '');
                    if (!cliRaw) {
                        Swal.fire('Campo Obrigatório', 'Informe o Nome do Cliente.', 'warning');
                        return;
                    }
                    const payload = {
                        proposta_id: propId,
                        proposta_codigo: propCodigo,
                        tipo_proposta: document.getElementById('caprv-sel-tipo-proposta')?.value || 'OBRA MENSAL',
                        ainda_nao_e_cliente: Boolean(document.getElementById('caprv-chk-nao-cliente')?.checked),
                        cliente_nome: cliRaw,
                        contato_nome: String(document.getElementById('caprv-inp-contato')?.value || '').trim(),
                        endereco_instalacao: String(document.getElementById('caprv-inp-endereco')?.value || '').trim(),
                        equipamentos: equipsDraft,
                        coluna: 'Solicitação',
                        urgente: Boolean(document.getElementById('caprv-chk-urgente')?.checked),
                        observacoes: String(document.getElementById('caprv-inp-obs')?.value || '').trim()
                    };

                    try {
                        const tk = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token') || '';
                        const r = await fetch('/api/comercial/aprovacoes', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                ...(tk ? { 'Authorization': 'Bearer ' + tk } : {})
                            },
                            body: JSON.stringify(payload)
                        });
                        const res = await r.json();
                        if (!r.ok || !res.success) {
                            Swal.fire('Erro', (res && res.error) || 'Não foi possível criar a aprovação.', 'error');
                            return;
                        }
                        fecharOverlayModalAprovacao();
                        await carregarAprovacoesServidor();
                        renderKanbanBoard();
                        if (typeof mostrarToastSucesso === 'function') {
                            mostrarToastSucesso(`Aprovação Nº ${res.numero_aprovacao} criada com sucesso!`);
                        }
                        if (typeof onCreatedCallback === 'function') {
                            onCreatedCallback(res.aprovacao);
                        }
                        resolve(res.aprovacao);
                    } catch (e) {
                        Swal.fire('Erro', e.message || 'Erro ao criar aprovação.', 'error');
                    }
                };

                const cliFmtIni = cliIni ? formatarClienteComIcone(cliIni) : '';

                abrirOverlayModalAprovacao(`
                    <div style="padding:1.25rem 1.5rem; display:flex; flex-direction:column; gap:14px;">
                        <!-- Cabeçalho do Modal -->
                        <div style="display:flex; align-items:center; justify-content:space-between; gap:12px; border-bottom:1px solid #e2e8f0; padding-bottom:10px; flex-wrap:wrap;">
                            <div style="display:flex; align-items:center; gap:10px;">
                                <div style="width:36px; height:36px; border-radius:9px; background:#f5f3ff; border:1px solid #ddd6fe; color:#7c3aed; display:flex; align-items:center; justify-content:center;">
                                    <i class="ph ph-seal-check" style="font-size:1.3rem;"></i>
                                </div>
                                <h3 style="margin:0; font-size:1.15rem; font-weight:800; color:#0f172a;">
                                    ${propId ? `Solicitar Aprovação — Proposta Nº ${esc(propCodigo)}` : 'Nova Solicitação de Aprovação'}
                                </h3>
                            </div>

                            <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
                                <label style="display:inline-flex; align-items:center; gap:6px; background:#f8fafc; border:1px solid #cbd5e1; color:#334155; padding:5px 11px; border-radius:6px; font-size:0.78rem; font-weight:700; cursor:pointer; user-select:none;">
                                    <input type="checkbox" id="caprv-chk-nao-cliente" style="margin:0; width:14px; height:14px; accent-color:#7c3aed;">
                                    <span>Ainda não é cliente</span>
                                </label>

                                <label style="display:inline-flex; align-items:center; gap:6px; background:#fef2f2; border:1.5px solid #ef4444; color:#dc2626; padding:5px 12px; border-radius:6px; font-size:0.78rem; font-weight:800; cursor:pointer; user-select:none;">
                                    <input type="checkbox" id="caprv-chk-urgente" style="margin:0; width:14px; height:14px; accent-color:#dc2626;">
                                    <span>🚨 APROVAÇÃO URGENTE</span>
                                </label>
                            </div>
                        </div>

                        <!-- Linha 1: Tipo de Proposta + Cliente + Contato -->
                        <div style="display:grid; grid-template-columns:1fr 1.8fr 1.2fr; gap:12px; align-items:end;">
                            <div>
                                <label style="display:block; font-size:0.75rem; font-weight:700; color:#475569; margin-bottom:4px;">Tipo de Proposta <span style="color:#dc2626;">*</span></label>
                                <select id="caprv-sel-tipo-proposta"
                                    style="width:100%; height:34px; padding:4px 8px; border:1px solid #cbd5e1; border-radius:6px; font-size:0.82rem; font-weight:700; color:#0f172a; background:#fff; box-sizing:border-box; text-transform:none;">
                                    ${TIPOS_PROPOSTA_APROVACAO.map(t => `<option value="${esc(t.value)}" ${tipoIni === t.value ? 'selected' : ''}>${esc(t.label)}</option>`).join('')}
                                </select>
                            </div>

                            <!-- Cliente com Lupa e Botão + Amarelo -->
                            <div style="position:relative;">
                                <label style="display:block; font-size:0.75rem; font-weight:700; color:#475569; margin-bottom:4px;">Cliente <span style="color:#dc2626;">*</span></label>
                                <div style="display:flex; align-items:center; gap:4px;">
                                    <input type="text" id="caprv-inp-cliente" value="${esc(cliFmtIni === '—' ? '' : cliFmtIni)}"
                                        autocomplete="off"
                                        style="flex:1; height:34px; padding:4px 10px; border:1px solid #cbd5e1; border-radius:6px; font-size:0.82rem; box-sizing:border-box; text-transform:none;">
                                    <button type="button" class="caprv-btn-only-cliente" onclick="window._caprvClickLupaCliente()"
                                        title="Pesquisar Cliente (ou pressione Enter)"
                                        style="background:#2563eb; color:#ffffff; border:none; width:34px; height:34px; border-radius:6px; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; flex-shrink:0;">
                                        <i class="ph ph-magnifying-glass" style="font-size:1rem;"></i>
                                    </button>
                                    <button type="button" class="caprv-btn-only-cliente" onclick="window._caprvClickAddCliente()"
                                        title="Adicionar Novo Cliente"
                                        style="background:#eab308; color:#ffffff; border:none; width:34px; height:34px; border-radius:6px; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; flex-shrink:0;">
                                        <i class="ph ph-plus" style="font-size:1rem; font-weight:bold;"></i>
                                    </button>
                                </div>
                                <div id="caprv-drop-cliente" style="display:none; position:absolute; top:100%; left:0; right:0; max-height:220px; overflow-y:auto; background:#ffffff; border:1px solid #cbd5e1; border-radius:8px; box-shadow:0 10px 25px rgba(15,23,42,0.15); z-index:2500; margin-top:2px;"></div>
                            </div>

                            <!-- Contato com Lupa e Botão + Amarelo -->
                            <div style="position:relative;">
                                <label style="display:block; font-size:0.75rem; font-weight:700; color:#475569; margin-bottom:4px;">Contato</label>
                                <div style="display:flex; align-items:center; gap:4px;">
                                    <input type="text" id="caprv-inp-contato" value="${esc(contIni)}"
                                        autocomplete="off"
                                        style="flex:1; height:34px; padding:4px 10px; border:1px solid #cbd5e1; border-radius:6px; font-size:0.82rem; box-sizing:border-box; text-transform:none;">
                                    <button type="button" class="caprv-btn-only-cliente" onclick="window._caprvClickLupaContato()"
                                        title="Pesquisar Contatos do Cliente"
                                        style="background:#2563eb; color:#ffffff; border:none; width:34px; height:34px; border-radius:6px; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; flex-shrink:0;">
                                        <i class="ph ph-magnifying-glass" style="font-size:1rem;"></i>
                                    </button>
                                    <button type="button" class="caprv-btn-only-cliente" onclick="window._caprvClickAddContato()"
                                        title="Cadastrar Novo Contato"
                                        style="background:#eab308; color:#ffffff; border:none; width:34px; height:34px; border-radius:6px; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; flex-shrink:0;">
                                        <i class="ph ph-plus" style="font-size:1rem; font-weight:bold;"></i>
                                    </button>
                                </div>
                                <div id="caprv-drop-contato" style="display:none; position:absolute; top:100%; left:0; right:0; max-height:210px; overflow-y:auto; background:#ffffff; border:1px solid #cbd5e1; border-radius:8px; box-shadow:0 10px 25px rgba(15,23,42,0.15); z-index:2500; margin-top:2px;"></div>
                            </div>
                        </div>

                        <!-- Linha 2: Endereço de Instalação com Lupa e Botão + Amarelo -->
                        <div style="position:relative;">
                            <label style="display:block; font-size:0.75rem; font-weight:700; color:#475569; margin-bottom:4px;">Endereço de Instalação</label>
                            <div style="display:flex; align-items:center; gap:4px;">
                                <input type="text" id="caprv-inp-endereco" value="${esc(endIni)}"
                                    autocomplete="off"
                                    style="flex:1; height:34px; padding:4px 10px; border:1px solid #cbd5e1; border-radius:6px; font-size:0.82rem; box-sizing:border-box; text-transform:none;">
                                <button type="button" class="caprv-btn-only-cliente" onclick="window._caprvClickLupaEndereco()"
                                    title="Pesquisar Endereços do Cliente"
                                    style="background:#2563eb; color:#ffffff; border:none; width:34px; height:34px; border-radius:6px; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; flex-shrink:0;">
                                    <i class="ph ph-magnifying-glass" style="font-size:1rem;"></i>
                                </button>
                                <button type="button" class="caprv-btn-only-cliente" onclick="window._caprvClickAddEndereco()"
                                    title="Cadastrar Novo Endereço no Cliente"
                                    style="background:#eab308; color:#ffffff; border:none; width:34px; height:34px; border-radius:6px; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; flex-shrink:0;">
                                    <i class="ph ph-plus" style="font-size:1rem; font-weight:bold;"></i>
                                </button>
                            </div>
                            <div id="caprv-drop-endereco" style="display:none; position:absolute; top:100%; left:0; right:0; max-height:220px; overflow-y:auto; background:#ffffff; border:1px solid #cbd5e1; border-radius:8px; box-shadow:0 10px 25px rgba(15,23,42,0.15); z-index:2500; margin-top:2px;"></div>
                        </div>

                        <!-- Linha 3: Equipamentos da OS da Logística com Ícones -->
                        <div>
                            <label style="display:block; font-size:0.75rem; font-weight:700; color:#475569; margin-bottom:4px;">Equipamentos na Proposta / Solicitação</label>
                            <div style="display:flex; gap:6px; margin-bottom:6px; position:relative;">
                                <div style="flex:1; position:relative;">
                                    <input type="text" id="caprv-inp-equip-nome"
                                        placeholder="Clique ou digite para selecionar equipamento da OS (com ícone)..."
                                        autocomplete="off"
                                        onkeydown="if(event.key==='Enter'){event.preventDefault(); window._adicionarEquipModalAprov();}"
                                        style="width:100%; height:34px; padding:4px 10px; border:1px solid #cbd5e1; border-radius:6px; font-size:0.82rem; box-sizing:border-box; text-transform:none;">
                                    <div id="caprv-drop-equip" style="display:none; position:absolute; top:100%; left:0; right:0; max-height:220px; overflow-y:auto; background:#ffffff; border:1px solid #cbd5e1; border-radius:8px; box-shadow:0 10px 25px rgba(15,23,42,0.15); z-index:2500; margin-top:2px;"></div>
                                </div>
                                <input type="number" id="caprv-inp-equip-qtd" value="1" min="1"
                                    style="width:80px; height:34px; padding:4px 8px; border:1px solid #cbd5e1; border-radius:6px; font-size:0.82rem; text-align:center; font-weight:700;">
                                <button type="button" onclick="window._adicionarEquipModalAprov()"
                                    style="background:#7c3aed; color:#fff; border:none; border-radius:6px; padding:0 16px; height:34px; font-size:0.8rem; font-weight:800; cursor:pointer;">+ Incluir</button>
                            </div>
                            <div id="caprv-equips-list" style="display:flex; flex-direction:column; gap:5px; max-height:150px; overflow-y:auto; border:1px solid #e2e8f0; border-radius:8px; padding:8px; background:#ffffff;">
                                ${renderEquipsDraftHtml()}
                            </div>
                        </div>

                        <!-- Linha 4: Observações da Solicitação (Textarea amplo com quebra de linha) -->
                        <div>
                            <label style="display:block; font-size:0.75rem; font-weight:700; color:#475569; margin-bottom:4px;">Observações da Solicitação</label>
                            <textarea id="caprv-inp-obs" rows="5"
                                placeholder="Digite todas as observações e detalhes necessários para a aprovação (pressione Enter para pular linha)..."
                                style="width:100%; min-height:115px; padding:8px 10px; border:1px solid #cbd5e1; border-radius:8px; font-size:0.83rem; line-height:1.45; box-sizing:border-box; resize:vertical; font-family:'Inter',sans-serif; text-transform:none;">${esc(obsIni)}</textarea>
                        </div>

                        <!-- Rodapé de Ações -->
                        <div style="display:flex; align-items:center; justify-content:flex-end; gap:10px; border-top:1px solid #e2e8f0; padding-top:12px;">
                            <button type="button" onclick="window._fecharModalNovaAprovCancel()"
                                style="background:#64748b; color:#ffffff; border:none; padding:8px 18px; border-radius:7px; font-size:0.82rem; font-weight:700; cursor:pointer;">
                                Cancelar
                            </button>
                            <button type="button" onclick="window._salvarModalNovaAprovConfirm()"
                                style="background:#7c3aed; color:#ffffff; border:none; padding:8px 20px; border-radius:7px; font-size:0.84rem; font-weight:800; cursor:pointer; display:inline-flex; align-items:center; gap:6px;">
                                <i class="ph ph-check"></i> Gerar Aprovação
                            </button>
                        </div>
                    </div>
                `, 980);

                await configurarFormularioAprovacaoInterativo();
            });
        },

        /**
         * Modal para editar / visualizar detalhes de um card do Kanban de Aprovação.
         */
        async abrirModalDetalhesAprovacao(id) {
            await garantirCachesClientes();
            const aprv = (state.aprovacoes || []).find(x => Number(x.id) === Number(id));
            if (!aprv) return;
            const numAprv = String(aprv.numero_aprovacao || aprv.id).padStart(2, '0');
            const propId = Number(aprv.proposta_id) || 0;
            const propCod = String(aprv.prop_codigo_real || aprv.proposta_codigo || '').trim().padStart(2, '0');
            const tipoIniRaw = String(aprv.tipo_proposta || 'OBRA MENSAL').trim().toUpperCase();
            const tipoIni = TIPOS_PROPOSTA_APROVACAO.some(t => t.value === tipoIniRaw) ? tipoIniRaw : 'OBRA MENSAL';
            const naoEhCliIni = Number(aprv.ainda_nao_e_cliente) === 1;

            let equipsDraft = parseEquipamentosLista(aprv.equipamentos_json).map(it => {
                const rawNome = String(it.produto || it.descricao || it.nome || '').trim();
                return {
                    produto: formatarNomeEquipamentoComIcone(rawNome, tipoIni),
                    quantidade: Math.max(1, parseInt(it.quantidade ?? it.qtde ?? 1, 10) || 1),
                    observacao: String(it.observacao || '').trim()
                };
            }).filter(it => it.produto);

            const renderEquipsDraftHtml = () => {
                if (!equipsDraft.length) {
                    return `<div style="color:#94a3b8; font-size:0.78rem; font-style:italic; padding:8px;">Nenhum equipamento adicionado.</div>`;
                }
                return equipsDraft.map((eq, idx) => `
                    <div style="display:flex; align-items:center; justify-content:space-between; gap:8px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; padding:5px 10px; font-size:0.8rem;">
                        <span style="font-weight:700; color:#1e293b;"><strong>${eq.quantidade}x</strong> ${esc(eq.produto)} ${eq.observacao ? `<span style="color:#64748b; font-weight:500;">(${esc(eq.observacao)})</span>` : ''}</span>
                        <button type="button" onclick="window._removerEquipModalAprov(${idx})" style="background:#fef2f2; color:#dc2626; border:1px solid #fecaca; border-radius:4px; padding:1px 7px; font-size:0.75rem; font-weight:700; cursor:pointer;">&times;</button>
                    </div>
                `).join('');
            };

            window._removerEquipModalAprov = (idx) => {
                equipsDraft.splice(idx, 1);
                const w = document.getElementById('caprv-equips-list');
                if (w) w.innerHTML = renderEquipsDraftHtml();
            };

            window._adicionarEquipModalAprov = () => {
                const tipoSel = document.getElementById('caprv-sel-tipo-proposta')?.value || 'OBRA MENSAL';
                const nmRaw = String(document.getElementById('caprv-inp-equip-nome')?.value || '').trim();
                const qt = Math.max(1, parseInt(document.getElementById('caprv-inp-equip-qtd')?.value || '1', 10) || 1);
                if (!nmRaw) return;
                const nmFmt = formatarNomeEquipamentoComIcone(nmRaw, tipoSel);
                equipsDraft.push({ produto: nmFmt, quantidade: qt, observacao: '' });
                const inpN = document.getElementById('caprv-inp-equip-nome');
                if (inpN) inpN.value = '';
                const w = document.getElementById('caprv-equips-list');
                if (w) w.innerHTML = renderEquipsDraftHtml();
            };

            window._fecharModalDetAprov = () => {
                fecharOverlayModalAprovacao();
            };

            window._salvarModalDetAprov = async () => {
                const cliRaw = limparIconeCliente(document.getElementById('caprv-inp-cliente')?.value || '');
                if (!cliRaw) {
                    Swal.fire('Campo Obrigatório', 'Informe o Nome do Cliente.', 'warning');
                    return;
                }
                const payload = {
                    tipo_proposta: document.getElementById('caprv-sel-tipo-proposta')?.value || tipoIni,
                    ainda_nao_e_cliente: Boolean(document.getElementById('caprv-chk-nao-cliente')?.checked),
                    cliente_nome: cliRaw,
                    contato_nome: String(document.getElementById('caprv-inp-contato')?.value || '').trim(),
                    endereco_instalacao: String(document.getElementById('caprv-inp-endereco')?.value || '').trim(),
                    equipamentos: equipsDraft,
                    coluna: document.getElementById('det-aprv-coluna')?.value || normalizarColuna(aprv.coluna),
                    urgente: Boolean(document.getElementById('caprv-chk-urgente')?.checked),
                    observacoes: String(document.getElementById('caprv-inp-obs')?.value || '').trim(),
                    resposta_setor: String(document.getElementById('det-aprv-resposta')?.value || '').trim()
                };

                try {
                    const tk = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token') || '';
                    const r = await fetch(`/api/comercial/aprovacoes/${aprv.id}`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                            ...(tk ? { 'Authorization': 'Bearer ' + tk } : {})
                        },
                        body: JSON.stringify(payload)
                    });
                    const res = await r.json();
                    if (r.ok && res.success) {
                        fecharOverlayModalAprovacao();
                        await carregarAprovacoesServidor();
                        renderKanbanBoard();
                        if (typeof mostrarToastSucesso === 'function') {
                            mostrarToastSucesso(`Aprovação Nº ${numAprv} atualizada!`);
                        }
                    } else {
                        Swal.fire('Erro', (res && res.error) || 'Erro ao atualizar aprovação.', 'error');
                    }
                } catch (e) {
                    Swal.fire('Erro', e.message || 'Erro ao atualizar aprovação.', 'error');
                }
            };

            const cliFmtAtual = formatarClienteComIcone(aprv.cliente_nome, aprv.cliente_grupo || '');

            abrirOverlayModalAprovacao(`
                <div style="padding:1.25rem 1.5rem; display:flex; flex-direction:column; gap:13px;">
                    <!-- Cabeçalho com Nº da Aprovação + Atendente com Foto + Urgente -->
                    <div style="display:flex; align-items:center; justify-content:space-between; gap:12px; border-bottom:1px solid #e2e8f0; padding-bottom:10px; flex-wrap:wrap;">
                        <div style="display:flex; align-items:center; gap:12px; flex-wrap:wrap;">
                            <div style="display:flex; align-items:center; gap:8px;">
                                <div style="width:36px; height:36px; border-radius:9px; background:#f5f3ff; border:1px solid #ddd6fe; color:#7c3aed; display:flex; align-items:center; justify-content:center;">
                                    <i class="ph ph-seal-check" style="font-size:1.3rem;"></i>
                                </div>
                                <h3 style="margin:0; font-size:1.15rem; font-weight:800; color:#0f172a;">Aprovação Nº ${esc(numAprv)}</h3>
                            </div>

                            <!-- Foto e Nome do Atendente que abriu a solicitação -->
                            <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:999px; padding:3px 11px 3px 5px; display:inline-flex; align-items:center; gap:6px;">
                                ${renderAtendenteAvatarHtml(aprv, 26, 0.76)}
                                <span style="font-size:0.68rem; color:#64748b;">• ${esc(fmtDataHoraBr(aprv.criado_em))}</span>
                            </div>
                        </div>

                        <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
                            ${propId ? `
                                <button type="button"
                                    onclick="window._fecharModalDetAprov(); if(typeof window.abrirPropostaDiretoId==='function') window.abrirPropostaDiretoId(${propId});"
                                    style="background:#2563eb; color:#fff; border:none; padding:5px 11px; border-radius:6px; font-size:0.76rem; font-weight:800; cursor:pointer; display:inline-flex; align-items:center; gap:5px;">
                                    <i class="ph ph-file-text"></i> Proposta Nº ${esc(propCod)}
                                </button>
                            ` : `
                                <button type="button"
                                    onclick="window._fecharModalDetAprov(); window._comercialAprovacao.abrirModalVincularProposta(${Number(aprv.id)});"
                                    style="background:#7c3aed; color:#fff; border:none; padding:5px 11px; border-radius:6px; font-size:0.76rem; font-weight:700; cursor:pointer; display:inline-flex; align-items:center; gap:5px;">
                                    <i class="ph ph-link"></i> Vincular a uma Proposta
                                </button>
                            `}

                            <label style="display:inline-flex; align-items:center; gap:6px; background:#f8fafc; border:1px solid #cbd5e1; color:#334155; padding:5px 10px; border-radius:6px; font-size:0.76rem; font-weight:700; cursor:pointer;">
                                <input type="checkbox" id="caprv-chk-nao-cliente" ${naoEhCliIni ? 'checked' : ''} style="margin:0; accent-color:#7c3aed;">
                                <span>Ainda não é cliente</span>
                            </label>

                            <label style="display:inline-flex; align-items:center; gap:6px; background:#fef2f2; border:1.5px solid #ef4444; color:#dc2626; padding:5px 11px; border-radius:6px; font-size:0.76rem; font-weight:800; cursor:pointer;">
                                <input type="checkbox" id="caprv-chk-urgente" ${Number(aprv.urgente) === 1 ? 'checked' : ''} style="margin:0; accent-color:#dc2626;">
                                <span>🚨 URGENTE</span>
                            </label>
                        </div>
                    </div>

                    <!-- Linha 1: Tipo de Proposta + Cliente + Contato -->
                    <div style="display:grid; grid-template-columns:1fr 1.8fr 1.2fr; gap:12px; align-items:end;">
                        <div>
                            <label style="display:block; font-size:0.75rem; font-weight:700; color:#475569; margin-bottom:4px;">Tipo de Proposta <span style="color:#dc2626;">*</span></label>
                            <select id="caprv-sel-tipo-proposta"
                                style="width:100%; height:34px; padding:4px 8px; border:1px solid #cbd5e1; border-radius:6px; font-size:0.82rem; font-weight:700; color:#0f172a; background:#fff; box-sizing:border-box; text-transform:none;">
                                ${TIPOS_PROPOSTA_APROVACAO.map(t => `<option value="${esc(t.value)}" ${tipoIni === t.value ? 'selected' : ''}>${esc(t.label)}</option>`).join('')}
                            </select>
                        </div>

                        <div style="position:relative;">
                            <label style="display:block; font-size:0.75rem; font-weight:700; color:#475569; margin-bottom:4px;">Cliente <span style="color:#dc2626;">*</span></label>
                            <div style="display:flex; align-items:center; gap:4px;">
                                <input type="text" id="caprv-inp-cliente" value="${esc(cliFmtAtual === '—' ? '' : cliFmtAtual)}"
                                    autocomplete="off"
                                    style="flex:1; height:34px; padding:4px 10px; border:1px solid #cbd5e1; border-radius:6px; font-size:0.82rem; box-sizing:border-box; text-transform:none;">
                                <button type="button" class="caprv-btn-only-cliente" onclick="window._caprvClickLupaCliente()"
                                    title="Pesquisar Cliente"
                                    style="background:#2563eb; color:#ffffff; border:none; width:34px; height:34px; border-radius:6px; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; flex-shrink:0;">
                                    <i class="ph ph-magnifying-glass" style="font-size:1rem;"></i>
                                </button>
                                <button type="button" class="caprv-btn-only-cliente" onclick="window._caprvClickAddCliente()"
                                    title="Adicionar Novo Cliente"
                                    style="background:#eab308; color:#ffffff; border:none; width:34px; height:34px; border-radius:6px; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; flex-shrink:0;">
                                    <i class="ph ph-plus" style="font-size:1rem; font-weight:bold;"></i>
                                </button>
                            </div>
                            <div id="caprv-drop-cliente" style="display:none; position:absolute; top:100%; left:0; right:0; max-height:220px; overflow-y:auto; background:#ffffff; border:1px solid #cbd5e1; border-radius:8px; box-shadow:0 10px 25px rgba(15,23,42,0.15); z-index:2500; margin-top:2px;"></div>
                        </div>

                        <div style="position:relative;">
                            <label style="display:block; font-size:0.75rem; font-weight:700; color:#475569; margin-bottom:4px;">Contato</label>
                            <div style="display:flex; align-items:center; gap:4px;">
                                <input type="text" id="caprv-inp-contato" value="${esc(aprv.contato_nome || '')}"
                                    autocomplete="off"
                                    style="flex:1; height:34px; padding:4px 10px; border:1px solid #cbd5e1; border-radius:6px; font-size:0.82rem; box-sizing:border-box; text-transform:none;">
                                <button type="button" class="caprv-btn-only-cliente" onclick="window._caprvClickLupaContato()"
                                    title="Pesquisar Contatos do Cliente"
                                    style="background:#2563eb; color:#ffffff; border:none; width:34px; height:34px; border-radius:6px; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; flex-shrink:0;">
                                    <i class="ph ph-magnifying-glass" style="font-size:1rem;"></i>
                                </button>
                                <button type="button" class="caprv-btn-only-cliente" onclick="window._caprvClickAddContato()"
                                    title="Cadastrar Novo Contato"
                                    style="background:#eab308; color:#ffffff; border:none; width:34px; height:34px; border-radius:6px; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; flex-shrink:0;">
                                    <i class="ph ph-plus" style="font-size:1rem; font-weight:bold;"></i>
                                </button>
                            </div>
                            <div id="caprv-drop-contato" style="display:none; position:absolute; top:100%; left:0; right:0; max-height:210px; overflow-y:auto; background:#ffffff; border:1px solid #cbd5e1; border-radius:8px; box-shadow:0 10px 25px rgba(15,23,42,0.15); z-index:2500; margin-top:2px;"></div>
                        </div>
                    </div>

                    <!-- Linha 2: Endereço de Instalação + Etapa do Kanban -->
                    <div style="display:grid; grid-template-columns:2.2fr 1fr; gap:12px; align-items:end;">
                        <div style="position:relative;">
                            <label style="display:block; font-size:0.75rem; font-weight:700; color:#475569; margin-bottom:4px;">Endereço de Instalação</label>
                            <div style="display:flex; align-items:center; gap:4px;">
                                <input type="text" id="caprv-inp-endereco" value="${esc(aprv.endereco_instalacao || '')}"
                                    autocomplete="off"
                                    style="flex:1; height:34px; padding:4px 10px; border:1px solid #cbd5e1; border-radius:6px; font-size:0.82rem; box-sizing:border-box; text-transform:none;">
                                <button type="button" class="caprv-btn-only-cliente" onclick="window._caprvClickLupaEndereco()"
                                    title="Pesquisar Endereços do Cliente"
                                    style="background:#2563eb; color:#ffffff; border:none; width:34px; height:34px; border-radius:6px; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; flex-shrink:0;">
                                    <i class="ph ph-magnifying-glass" style="font-size:1rem;"></i>
                                </button>
                                <button type="button" class="caprv-btn-only-cliente" onclick="window._caprvClickAddEndereco()"
                                    title="Cadastrar Novo Endereço no Cliente"
                                    style="background:#eab308; color:#ffffff; border:none; width:34px; height:34px; border-radius:6px; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; flex-shrink:0;">
                                    <i class="ph ph-plus" style="font-size:1rem; font-weight:bold;"></i>
                                </button>
                            </div>
                            <div id="caprv-drop-endereco" style="display:none; position:absolute; top:100%; left:0; right:0; max-height:220px; overflow-y:auto; background:#ffffff; border:1px solid #cbd5e1; border-radius:8px; box-shadow:0 10px 25px rgba(15,23,42,0.15); z-index:2500; margin-top:2px;"></div>
                        </div>

                        <div>
                            <label style="display:block; font-size:0.75rem; font-weight:700; color:#475569; margin-bottom:4px;">Etapa / Coluna do Kanban</label>
                            <select id="det-aprv-coluna" style="width:100%; height:34px; padding:4px 8px; border:1px solid #cbd5e1; border-radius:6px; font-size:0.82rem; font-weight:700; text-transform:none;">
                                ${COLUNAS_KANBAN.map(c => `<option value="${esc(c.key)}" ${normalizarColuna(aprv.coluna) === c.key ? 'selected' : ''}>${esc(c.titulo)}</option>`).join('')}
                            </select>
                        </div>
                    </div>

                    <!-- Linha 3: Equipamentos -->
                    <div>
                        <label style="display:block; font-size:0.75rem; font-weight:700; color:#475569; margin-bottom:4px;">Equipamentos na Proposta / Solicitação</label>
                        <div style="display:flex; gap:6px; margin-bottom:6px; position:relative;">
                            <div style="flex:1; position:relative;">
                                <input type="text" id="caprv-inp-equip-nome"
                                    placeholder="Clique ou digite para selecionar equipamento da OS (com ícone)..."
                                    autocomplete="off"
                                    onkeydown="if(event.key==='Enter'){event.preventDefault(); window._adicionarEquipModalAprov();}"
                                    style="width:100%; height:34px; padding:4px 10px; border:1px solid #cbd5e1; border-radius:6px; font-size:0.82rem; box-sizing:border-box; text-transform:none;">
                                <div id="caprv-drop-equip" style="display:none; position:absolute; top:100%; left:0; right:0; max-height:220px; overflow-y:auto; background:#ffffff; border:1px solid #cbd5e1; border-radius:8px; box-shadow:0 10px 25px rgba(15,23,42,0.15); z-index:2500; margin-top:2px;"></div>
                            </div>
                            <input type="number" id="caprv-inp-equip-qtd" value="1" min="1"
                                style="width:80px; height:34px; padding:4px 8px; border:1px solid #cbd5e1; border-radius:6px; font-size:0.82rem; text-align:center; font-weight:700;">
                            <button type="button" onclick="window._adicionarEquipModalAprov()"
                                style="background:#7c3aed; color:#fff; border:none; border-radius:6px; padding:0 16px; height:34px; font-size:0.8rem; font-weight:800; cursor:pointer;">+ Incluir</button>
                        </div>
                        <div id="caprv-equips-list" style="display:flex; flex-direction:column; gap:5px; max-height:130px; overflow-y:auto; border:1px solid #e2e8f0; border-radius:8px; padding:8px; background:#ffffff;">
                            ${renderEquipsDraftHtml()}
                        </div>
                    </div>

                    <!-- Linha 4: Observações + Resposta do Setor -->
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
                        <div>
                            <label style="display:block; font-size:0.75rem; font-weight:700; color:#475569; margin-bottom:4px;">Observações da Solicitação</label>
                            <textarea id="caprv-inp-obs" rows="5"
                                placeholder="Observações da solicitação..."
                                style="width:100%; min-height:110px; padding:8px 10px; border:1px solid #cbd5e1; border-radius:8px; font-size:0.82rem; line-height:1.45; box-sizing:border-box; resize:vertical; font-family:'Inter',sans-serif; text-transform:none;">${esc(aprv.observacoes || '')}</textarea>
                        </div>
                        <div>
                            <label style="display:block; font-size:0.75rem; font-weight:700; color:#475569; margin-bottom:4px;">Resposta do Setor / Parecer</label>
                            <textarea id="det-aprv-resposta" rows="5"
                                placeholder="Registre a resposta ou parecer do setor..."
                                style="width:100%; min-height:110px; padding:8px 10px; border:1px solid #cbd5e1; border-radius:8px; font-size:0.82rem; line-height:1.45; box-sizing:border-box; resize:vertical; font-family:'Inter',sans-serif; text-transform:none;">${esc(aprv.resposta_setor || '')}</textarea>
                        </div>
                    </div>

                    <!-- Rodapé -->
                    <div style="display:flex; align-items:center; justify-content:flex-end; gap:10px; border-top:1px solid #e2e8f0; padding-top:12px;">
                        <button type="button" onclick="window._fecharModalDetAprov()"
                            style="background:#64748b; color:#ffffff; border:none; padding:8px 18px; border-radius:7px; font-size:0.82rem; font-weight:700; cursor:pointer;">
                            Fechar
                        </button>
                        <button type="button" onclick="window._salvarModalDetAprov()"
                            style="background:#7c3aed; color:#ffffff; border:none; padding:8px 20px; border-radius:7px; font-size:0.84rem; font-weight:800; cursor:pointer; display:inline-flex; align-items:center; gap:6px;">
                            <i class="ph ph-check"></i> Salvar Alterações
                        </button>
                    </div>
                </div>
            `, 980);

            await configurarFormularioAprovacaoInterativo();
        },

        /**
         * Permite vincular uma Aprovação a uma Proposta existente.
         * - Popup ampliado (1120px)
         * - Mostra a coluna "Situação" da proposta
         * - Não mostra propostas com situação Aprovada, Reprovada ou Sem Resposta
         * - Coluna de Ação em uma única linha com botão de Olho (visualizar PDF da proposta) + botão Vincular
         */
        async abrirModalVincularProposta(aprovacaoId) {
            await garantirCachesClientes();
            const aprv = (state.aprovacoes || []).find(x => Number(x.id) === Number(aprovacaoId));
            if (!aprv) return;

            let propostas = [];
            try {
                propostas = await window.apiGet('/propostas');
                if (Array.isArray(propostas)) window._propostasData = propostas;
            } catch (_) {
                propostas = Array.isArray(window._propostasData) ? window._propostasData : [];
            }

            // Filtrar propostas excluindo Aprovada, Reprovada, Sem Resposta, Cancelada
            const isSituacaoExcluida = (faseRaw) => {
                const f = normStr(faseRaw || 'Em Elaboração');
                if (f.includes('aprovad')) return true;
                if (f.includes('reprovad')) return true;
                if (f.includes('sem resposta')) return true;
                if (f.includes('cancelad')) return true;
                return false;
            };

            const cliAprvNorm = normStr(limparIconeCliente(aprv.cliente_nome));
            const listaElegivel = (propostas || [])
                .filter(p => !isSituacaoExcluida(p.fase_negociacao))
                .sort((a, b) => {
                    const aMesmoCli = cliAprvNorm && normStr(limparIconeCliente(a.cliente_nome)) === cliAprvNorm ? 1 : 0;
                    const bMesmoCli = cliAprvNorm && normStr(limparIconeCliente(b.cliente_nome)) === cliAprvNorm ? 1 : 0;
                    if (bMesmoCli !== aMesmoCli) return bMesmoCli - aMesmoCli;
                    return Number(b.id || 0) - Number(a.id || 0);
                });

            const renderBadgeSituacao = (fase) => {
                const f = String(fase || 'Em Elaboração').trim();
                if (typeof window.renderBadgeFaseNegociacaoHtml === 'function') {
                    return window.renderBadgeFaseNegociacaoHtml(f);
                }
                return `<span style="background:#eff6ff; color:#1d4ed8; border:1px solid #bfdbfe; padding:2px 8px; border-radius:999px; font-size:0.71rem; font-weight:700; white-space:nowrap;">${esc(f)}</span>`;
            };

            const renderLinhasPropostas = (filtro = '') => {
                const q = normStr(filtro);
                const fil = listaElegivel.filter(p => {
                    if (!q) return true;
                    return normStr(`${p.codigo} ${p.cliente_nome} ${p.endereco_instalacao} ${p.tipo} ${p.fase_negociacao}`).includes(q);
                }).slice(0, 80);

                if (!fil.length) {
                    return `<tr><td colspan="6" style="text-align:center; padding:1.25rem; color:#94a3b8;">Nenhuma proposta elegível encontrada.</td></tr>`;
                }
                return fil.map(p => {
                    const cod = String(p.codigo || p.id).padStart(2, '0');
                    const mesmoCli = cliAprvNorm && normStr(limparIconeCliente(p.cliente_nome)) === cliAprvNorm;
                    return `
                        <tr style="border-bottom:1px solid #e2e8f0; background:${mesmoCli ? '#f5f3ff' : '#ffffff'};"
                            onmouseover="this.style.background='#ede9fe'" onmouseout="this.style.background='${mesmoCli ? '#f5f3ff' : '#ffffff'}'">
                            <td style="padding:8px 10px; font-weight:800; color:#2563eb; white-space:nowrap;">Nº ${esc(cod)}</td>
                            <td style="padding:8px 10px; font-weight:700; color:#0f172a;">${esc(formatarClienteComIcone(p.cliente_nome))}</td>
                            <td style="padding:8px 10px; color:#475569; font-size:0.75rem;">${esc(p.endereco_instalacao || '—')}</td>
                            <td style="padding:8px 10px; color:#475569; font-size:0.74rem; white-space:nowrap;">${esc(p.tipo || '—')}</td>
                            <td style="padding:8px 10px; text-align:center; white-space:nowrap;">${renderBadgeSituacao(p.fase_negociacao)}</td>
                            <td style="padding:8px 10px; text-align:center; white-space:nowrap;">
                                <div style="display:inline-flex; align-items:center; justify-content:center; gap:6px; white-space:nowrap;">
                                    <button type="button"
                                        onclick="event.stopPropagation(); window._visualizarPdfPropostaVinc(${Number(p.id)});"
                                        title="Visualizar Documento PDF da Proposta Nº ${esc(cod)}"
                                        style="background:#0f172a; color:#ffffff; border:none; width:30px; height:28px; border-radius:6px; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; flex-shrink:0;">
                                        <i class="ph ph-eye" style="font-size:0.95rem;"></i>
                                    </button>
                                    <button type="button"
                                        onclick="event.stopPropagation(); window._confirmarVinculoAprovacaoProposta(${Number(aprv.id)}, ${Number(p.id)});"
                                        style="background:#7c3aed; color:#ffffff; border:none; height:28px; padding:0 11px; border-radius:6px; font-size:0.73rem; font-weight:800; cursor:pointer; display:inline-flex; align-items:center; gap:4px; white-space:nowrap; flex-shrink:0;">
                                        <i class="ph ph-link"></i> Vincular
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `;
                }).join('');
            };

            window._visualizarPdfPropostaVinc = async (prId) => {
                await visualizarPdfPropostaNoModal(prId);
            };

            window._confirmarVinculoAprovacaoProposta = async (apId, prId) => {
                fecharOverlayModalAprovacao();
                await this.vincularAprovacaoComProposta(apId, prId);
            };

            window._fecharModalVincularProp = () => {
                fecharOverlayModalAprovacao();
            };

            const qIni = limparIconeCliente(aprv.cliente_nome);
            // Se não houver propostas do mesmo cliente, mostra todas inicialmente
            const temDoCliente = listaElegivel.some(p => normStr(limparIconeCliente(p.cliente_nome)).includes(normStr(qIni)));
            const filtroInicial = temDoCliente ? qIni : '';

            abrirOverlayModalAprovacao(`
                <div style="padding:1.25rem 1.5rem; display:flex; flex-direction:column; gap:12px;">
                    <div style="display:flex; align-items:center; justify-content:space-between; gap:10px; border-bottom:1px solid #e2e8f0; padding-bottom:10px;">
                        <div style="display:flex; align-items:center; gap:10px;">
                            <div style="width:36px; height:36px; border-radius:9px; background:#f5f3ff; border:1px solid #ddd6fe; color:#7c3aed; display:flex; align-items:center; justify-content:center;">
                                <i class="ph ph-link" style="font-size:1.25rem;"></i>
                            </div>
                            <h3 style="margin:0; font-size:1.1rem; font-weight:800; color:#0f172a;">
                                Vincular Aprovação Nº ${esc(String(aprv.numero_aprovacao).padStart(2, '0'))} a uma Proposta
                            </h3>
                        </div>
                        <button type="button" onclick="window._fecharModalVincularProp()"
                            style="background:#f1f5f9; color:#475569; border:1px solid #cbd5e1; padding:5px 12px; border-radius:6px; font-size:0.78rem; font-weight:700; cursor:pointer;">
                            Fechar
                        </button>
                    </div>

                    <input type="text" id="caprv-vinc-prop-search" value="${esc(filtroInicial)}"
                        placeholder="Digite o nº da proposta, nome do cliente, endereço, tipo ou situação..."
                        style="width:100%; height:36px; padding:4px 12px; border:1px solid #cbd5e1; border-radius:7px; font-size:0.83rem; box-sizing:border-box; text-transform:none;">

                    <div style="max-height:440px; overflow-y:auto; border:1px solid #e2e8f0; border-radius:8px;">
                        <table style="width:100%; border-collapse:collapse; font-size:0.79rem; text-align:left;">
                            <thead>
                                <tr style="background:#f8fafc; border-bottom:2px solid #cbd5e1; color:#475569; font-size:0.71rem; text-transform:uppercase; position:sticky; top:0; z-index:1;">
                                    <th style="padding:9px 10px; width:85px;">Proposta</th>
                                    <th style="padding:9px 10px;">Cliente</th>
                                    <th style="padding:9px 10px;">Endereço de Instalação</th>
                                    <th style="padding:9px 10px; width:130px;">Tipo</th>
                                    <th style="padding:9px 10px; text-align:center; width:145px;">Situação</th>
                                    <th style="padding:9px 10px; text-align:center; width:145px;">Ação</th>
                                </tr>
                            </thead>
                            <tbody id="caprv-vinc-prop-tbody">
                                ${renderLinhasPropostas(filtroInicial)}
                            </tbody>
                        </table>
                    </div>
                </div>
            `, 1120);

            const inp = document.getElementById('caprv-vinc-prop-search');
            const tb = document.getElementById('caprv-vinc-prop-tbody');
            if (inp && tb) {
                inp.addEventListener('input', () => {
                    tb.innerHTML = renderLinhasPropostas(inp.value);
                });
                inp.focus();
                inp.select();
            }
        },

        async vincularAprovacaoComProposta(aprovacaoId, propostaId) {
            try {
                const tk = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token') || '';
                const r = await fetch(`/api/comercial/aprovacoes/${aprovacaoId}/vincular-proposta`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(tk ? { 'Authorization': 'Bearer ' + tk } : {})
                    },
                    body: JSON.stringify({ proposta_id: Number(propostaId) })
                });
                const res = await r.json();
                if (!r.ok || !res.success) {
                    Swal.fire('Erro', (res && res.error) || 'Não foi possível vincular a aprovação.', 'error');
                    return null;
                }
                if (Array.isArray(window._propostasData)) {
                    const pMem = window._propostasData.find(p => Number(p.id) === Number(propostaId));
                    if (pMem) {
                        pMem.aprovacao_id = Number(aprovacaoId);
                        pMem.numero_aprovacao = res.numero_aprovacao;
                    }
                }
                if (typeof window.atualizarVisibilidadeBotoesPosSalvoProposta === 'function') {
                    window.atualizarVisibilidadeBotoesPosSalvoProposta();
                }
                await carregarAprovacoesServidor();
                renderKanbanBoard();
                if (typeof mostrarToastSucesso === 'function') {
                    mostrarToastSucesso(`Proposta vinculada à Aprovação Nº ${res.numero_aprovacao}!`);
                }
                return res.aprovacao;
            } catch (e) {
                Swal.fire('Erro', e.message || 'Erro ao vincular aprovação.', 'error');
                return null;
            }
        },

        async verificarAprovacaoCompativelPorClienteEndereco(propostaObj) {
            if (!propostaObj) return null;
            const lista = await carregarAprovacoesServidor();
            const cliProp = normStr(limparIconeCliente(propostaObj.cliente_nome || ''));
            const endProp = normStr(propostaObj.endereco_instalacao || '');
            if (!cliProp) return null;

            const candidata = lista.find(a => {
                if (a.proposta_id && Number(a.proposta_id) !== Number(propostaObj.id)) return false;
                const cliA = normStr(limparIconeCliente(a.cliente_nome || ''));
                const endA = normStr(a.endereco_instalacao || '');
                if (cliA !== cliProp) return false;
                if (endProp && endA && (endA === endProp || endA.includes(endProp) || endProp.includes(endA))) {
                    return true;
                }
                return false;
            });

            return candidata || null;
        },

        async acaoBotaoAprovacaoNaProposta(propIdOpcional) {
            const propId = Number(propIdOpcional || window._propostasEditandoId_proposta);
            const obterValDom = (id) => document.getElementById(id)?.value || '';
            const pMem = (Array.isArray(window._propostasData) && propId)
                ? window._propostasData.find(p => Number(p.id) === propId)
                : null;

            const clienteNome = limparIconeCliente(obterValDom('prop-cliente') || (pMem && pMem.cliente_nome) || '');
            const contatoNome = String(obterValDom('prop-contato') || (pMem && pMem.contato_nome) || '').trim();
            const enderecoInst = String(obterValDom('prop-endereco') || (pMem && pMem.endereco_instalacao) || '').trim();
            const codigoProp = String(obterValDom('prop-codigo') || (pMem && pMem.codigo) || '').trim();
            const tipoProp = String(obterValDom('prop-tipo') || (pMem && pMem.tipo) || 'OBRA MENSAL').trim();
            const equipsAtuais = Array.isArray(window._propProdutosAdicionados) && window._propProdutosAdicionados.length > 0
                ? window._propProdutosAdicionados
                : (pMem ? parseEquipamentosLista(pMem.itens) : []);

            await carregarAprovacoesServidor();

            const aprvVinculada = (pMem && pMem.aprovacao_id)
                ? state.aprovacoes.find(a => Number(a.id) === Number(pMem.aprovacao_id))
                : (propId ? state.aprovacoes.find(a => Number(a.proposta_id) === propId) : null);

            if (aprvVinculada) {
                if (pMem && !pMem.aprovacao_id) {
                    pMem.aprovacao_id = aprvVinculada.id;
                    pMem.numero_aprovacao = aprvVinculada.numero_aprovacao;
                }
                await this.abrirModalDetalhesAprovacao(aprvVinculada.id);
                return aprvVinculada;
            }

            if (!propId) {
                Swal.fire('Salve a proposta primeiro', 'Salve a proposta antes de gerar ou vincular uma Aprovação.', 'info');
                return null;
            }

            const compativel = await this.verificarAprovacaoCompativelPorClienteEndereco({
                id: propId,
                cliente_nome: clienteNome,
                endereco_instalacao: enderecoInst
            });

            if (compativel) {
                const numComp = String(compativel.numero_aprovacao || compativel.id).padStart(2, '0');
                const ask = await Swal.fire({
                    icon: 'question',
                    title: `Aprovação encontrada (Nº ${numComp})`,
                    html: `Existe a <strong>Aprovação Nº ${esc(numComp)}</strong> para o cliente <strong>${esc(formatarClienteComIcone(compativel.cliente_nome, compativel.cliente_grupo))}</strong> no mesmo endereço (<em>${esc(compativel.endereco_instalacao || '—')}</em>).<br><br>Gostaria de vincular esta proposta a essa aprovação?`,
                    showCancelButton: true,
                    showDenyButton: true,
                    confirmButtonText: `<i class="ph ph-link"></i> Sim, vincular à Aprovação Nº ${numComp}`,
                    confirmButtonColor: '#7c3aed',
                    denyButtonText: '<i class="ph ph-plus-circle"></i> Criar Nova Aprovação',
                    denyButtonColor: '#2563eb',
                    cancelButtonText: 'Cancelar'
                });

                if (ask.isConfirmed) {
                    return await this.vincularAprovacaoComProposta(compativel.id, propId);
                }
                if (!ask.isDenied) {
                    return null;
                }
            }

            return await this.abrirModalNovaAprovacao({
                proposta_id: propId,
                proposta_codigo: codigoProp,
                tipo_proposta: tipoProp,
                cliente_nome: clienteNome,
                contato_nome: contatoNome,
                endereco_instalacao: enderecoInst,
                equipamentos: equipsAtuais
            }, (novaAprv) => {
                if (novaAprv && pMem) {
                    pMem.aprovacao_id = novaAprv.id;
                    pMem.numero_aprovacao = novaAprv.numero_aprovacao;
                }
                if (typeof window.atualizarVisibilidadeBotoesPosSalvoProposta === 'function') {
                    window.atualizarVisibilidadeBotoesPosSalvoProposta();
                }
            });
        },

        /**
         * Regra obrigatória para aprovar uma proposta e gerar contrato:
         * A proposta DEVE ter uma aprovação vinculada na coluna "Aprovado".
         */
        async garantirAprovacaoVinculadaAntesDeAprovarProposta(propId) {
            const idNum = Number(propId);
            if (!idNum) return false;
            await carregarAprovacoesServidor();

            const pMem = (Array.isArray(window._propostasData))
                ? window._propostasData.find(p => Number(p.id) === idNum)
                : null;
            const clienteNome = limparIconeCliente(document.getElementById('prop-cliente')?.value || (pMem && pMem.cliente_nome) || '');
            const contatoNome = String(document.getElementById('prop-contato')?.value || (pMem && pMem.contato_nome) || '').trim();
            const enderecoInst = String(document.getElementById('prop-endereco')?.value || (pMem && pMem.endereco_instalacao) || '').trim();
            const codigoProp = String(document.getElementById('prop-codigo')?.value || (pMem && pMem.codigo) || '').trim();
            const tipoProp = String(document.getElementById('prop-tipo')?.value || (pMem && pMem.tipo) || 'OBRA MENSAL').trim();
            const equipsAtuais = Array.isArray(window._propProdutosAdicionados) && window._propProdutosAdicionados.length > 0
                ? window._propProdutosAdicionados
                : (pMem ? parseEquipamentosLista(pMem.itens) : []);

            const validarColunaAprovada = (aprvObj) => {
                if (!aprvObj) return false;
                const colAtual = normalizarColuna(aprvObj.coluna);
                if (colAtual !== 'Aprovado') {
                    const numAp = String(aprvObj.numero_aprovacao || aprvObj.id).padStart(2, '0');
                    Swal.fire({
                        icon: 'warning',
                        title: `Aprovação Nº ${numAp} — Status: ${colAtual}`,
                        html: `A <strong>Aprovação Nº ${esc(numAp)}</strong> vinculada a esta proposta está na coluna <strong>"${esc(colAtual)}"</strong>.<br><br>Uma proposta apenas pode ser aprovada para virar contrato quando a aprovação estiver na coluna <strong>"Aprovado"</strong>.`
                    });
                    return false;
                }
                return true;
            };

            const jaVinculada = (pMem && pMem.aprovacao_id)
                ? state.aprovacoes.find(a => Number(a.id) === Number(pMem.aprovacao_id))
                : state.aprovacoes.find(a => Number(a.proposta_id) === idNum);

            if (jaVinculada) {
                if (pMem) {
                    pMem.aprovacao_id = jaVinculada.id;
                    pMem.numero_aprovacao = jaVinculada.numero_aprovacao;
                }
                return validarColunaAprovada(jaVinculada);
            }

            const compativel = await this.verificarAprovacaoCompativelPorClienteEndereco({
                id: idNum,
                cliente_nome: clienteNome,
                endereco_instalacao: enderecoInst
            });

            if (compativel) {
                const numComp = String(compativel.numero_aprovacao || compativel.id).padStart(2, '0');
                const ask = await Swal.fire({
                    icon: 'question',
                    title: 'Vincular Aprovação Existente?',
                    html: `Para aprovar uma proposta é necessário que ela esteja vinculada a uma aprovação na coluna <strong>"Aprovado"</strong>.<br><br>Encontramos a <strong>Aprovação Nº ${esc(numComp)}</strong> do cliente <strong>${esc(formatarClienteComIcone(compativel.cliente_nome, compativel.cliente_grupo))}</strong> com o mesmo endereço (<em>${esc(compativel.endereco_instalacao || '—')}</em>).<br><br>Gostaria de vincular esta proposta a essa aprovação?`,
                    showCancelButton: true,
                    confirmButtonText: `<i class="ph ph-link"></i> Sim, vincular à Aprovação Nº ${numComp}`,
                    confirmButtonColor: '#7c3aed',
                    cancelButtonText: 'Não'
                });
                if (ask.isConfirmed) {
                    const vinc = await this.vincularAprovacaoComProposta(compativel.id, idNum);
                    if (!vinc) return false;
                    return validarColunaAprovada(vinc);
                }
                return false;
            }

            const askGerar = await Swal.fire({
                icon: 'warning',
                title: 'Aprovação Obrigatória',
                html: 'Uma proposta apenas pode ser aprovada para virar contrato se tiver uma <strong>Aprovação</strong> vinculada na coluna <strong>"Aprovado"</strong>.<br><br>Deseja solicitar uma aprovação agora?',
                showCancelButton: true,
                confirmButtonText: '<i class="ph ph-seal-check"></i> Solicitar Aprovação Agora',
                confirmButtonColor: '#7c3aed',
                cancelButtonText: 'Cancelar'
            });

            if (!askGerar.isConfirmed) return false;

            const criada = await this.abrirModalNovaAprovacao({
                proposta_id: idNum,
                proposta_codigo: codigoProp,
                tipo_proposta: tipoProp,
                cliente_nome: clienteNome,
                contato_nome: contatoNome,
                endereco_instalacao: enderecoInst,
                equipamentos: equipsAtuais
            }, (novaAprv) => {
                if (novaAprv && pMem) {
                    pMem.aprovacao_id = novaAprv.id;
                    pMem.numero_aprovacao = novaAprv.numero_aprovacao;
                }
                if (typeof window.atualizarVisibilidadeBotoesPosSalvoProposta === 'function') {
                    window.atualizarVisibilidadeBotoesPosSalvoProposta();
                }
            });

            return validarColunaAprovada(criada);
        }
    };
})();
