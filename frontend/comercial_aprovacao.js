/**
 * ============================================================================
 * MÓDULO: COMERCIAL → APROVAÇÃO (Kanban)
 * Colunas do Kanban:
 *   1. Solicitação
 *   2. Aguardando setor
 *   3. Respondida
 *   4. Aprovado
 *   5. Reprovado
 *   6. Finalizado
 *
 * Funcionalidades:
 *   - Cada aprovação possui um número sequencial automático (01, 02...).
 *   - Uma aprovação pode nascer antes de uma proposta (criada na tela de
 *     Aprovação) ou depois de uma proposta gerada (criada por dentro da
 *     Proposta).
 *   - Possui a opção de marcar se a aprovação é URGENTE (badge vermelho em
 *     destaque e ordenação prioritária).
 *   - Vincula automaticamente Nome do Cliente (com ícone do Grupo de Clientes
 *     💎🥇🥈🥉), Contato, Endereço de Instalação e Equipamentos da Proposta.
 *   - Permite vincular uma aprovação sem proposta a uma proposta existente.
 *   - Permite arrastar e soltar (Drag & Drop) ou mudar a coluna diretamente no
 *     card / modal.
 *   - Integração com a tela de Proposta:
 *       * Botão roxo "Aprovação" (ou "Aprovação Nº XX") do lado esquerdo do
 *         botão verde de OS.
 *       * Uma proposta para ser aprovada precisa estar vinculada a uma
 *         aprovação.
 *       * Se existir uma aprovação do mesmo cliente com o mesmo endereço de
 *         instalação, o sistema pergunta se gostaria de vincular a proposta a
 *         essa aprovação existente.
 * ============================================================================
 */
(function () {
    'use strict';

    const COLUNAS_KANBAN = [
        { key: 'Solicitação',      titulo: 'Solicitação',      cor: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe', icon: 'ph-paper-plane-tilt' },
        { key: 'Aguardando setor', titulo: 'Aguardando setor', cor: '#d97706', bg: '#fffbeb', border: '#fde68a', icon: 'ph-hourglass-high' },
        { key: 'Respondida',       titulo: 'Respondida',       cor: '#0284c7', bg: '#f0f9ff', border: '#bae6fd', icon: 'ph-chat-circle-text' },
        { key: 'Aprovado',         titulo: 'Aprovado',         cor: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0', icon: 'ph-check-circle' },
        { key: 'Reprovado',        titulo: 'Reprovado',        cor: '#dc2626', bg: '#fef2f2', border: '#fecaca', icon: 'ph-x-circle' },
        { key: 'Finalizado',       titulo: 'Finalizado',       cor: '#334155', bg: '#f8fafc', border: '#cbd5e1', icon: 'ph-seal-check' }
    ];

    window.COMERCIAL_APROVACAO_COLUNAS = COLUNAS_KANBAN;

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

    function limparIconeCliente(nome) {
        if (typeof window.limparPrefixoGrupoCliente === 'function') {
            return window.limparPrefixoGrupoCliente(nome || '');
        }
        return String(nome || '').replace(/^[💎🥇🥈🥉]\s*/, '').trim();
    }

    function formatarClienteComIcone(nome) {
        const limpo = limparIconeCliente(nome);
        if (!limpo) return '—';
        if (typeof window.formatarNomeClienteComIcone === 'function') {
            return window.formatarNomeClienteComIcone(limpo);
        }
        return limpo;
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

    function parseEquipamentosLista(rawJson) {
        let arr = [];
        try {
            arr = typeof rawJson === 'string' ? JSON.parse(rawJson || '[]') : (Array.isArray(rawJson) ? rawJson : []);
        } catch (_) { arr = []; }
        return (Array.isArray(arr) ? arr : []).filter(it => it && !it._substituido_por_aditivo);
    }

    function formatarResumoEquipamentos(rawJson) {
        const arr = parseEquipamentosLista(rawJson);
        if (!arr.length) return [];
        return arr.map(it => {
            const nome = String(it.produto || it.descricao || it.nome || 'Equipamento').trim();
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
        if (n.includes('aprov')) return 'Aprovado';
        if (n.includes('finaliz')) return 'Finalizado';
        return 'Solicitação';
    }

    async function carregarAprovacoesServidor() {
        try {
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
        const cliFmt = formatarClienteComIcone(a.cliente_nome);
        const equips = formatarResumoEquipamentos(a.equipamentos_json);

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
                            <i class="ph ph-Stamp"></i> Aprovação Nº ${esc(numAprv)}
                        </span>
                        ${ehUrgente ? `
                            <span style="background:#fef2f2; color:#dc2626; border:1px solid #fca5a5; font-weight:800; font-size:0.68rem; padding:1px 7px; border-radius:999px; display:inline-flex; align-items:center; gap:3px;">
                                <i class="ph-fill ph-SealWarning"></i> URGENTE
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
                <div style="font-size:0.8rem; font-weight:800; color:#0f172a; line-height:1.25;">
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
                    <div style="font-size:0.7rem; color:#64748b; font-style:italic; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                        "${esc(a.observacoes)}"
                    </div>
                ` : ''}

                <!-- Rodapé do card: Data + Seletor rápido de coluna -->
                <div style="display:flex; align-items:center; justify-content:space-between; gap:6px; padding-top:4px; border-top:1px dashed #e2e8f0; margin-top:2px;" onclick="event.stopPropagation();">
                    <span style="font-size:0.66rem; color:#94a3b8;">${esc(fmtDataHoraBr(a.criado_em))}</span>
                    <select onchange="window._comercialAprovacao.mudarColunaRapido(${Number(a.id)}, this.value)"
                        style="font-size:0.68rem; font-weight:700; padding:1px 4px; border:1px solid #cbd5e1; border-radius:4px; background:#f8fafc; color:#334155; cursor:pointer; height:22px; text-transform:none;">
                        ${COLUNAS_KANBAN.map(c => `<option value="${esc(c.key)}" ${normalizarColuna(a.coluna) === c.key ? 'selected' : ''}>${esc(c.titulo)}</option>`).join('')}
                    </select>
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
                <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:12px; padding:0.75rem 1.15rem; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:0.75rem; box-shadow:0 2px 8px rgba(15,23,42,0.04);">
                    <div style="display:flex; align-items:center; gap:10px;">
                        <div style="width:36px; height:36px; border-radius:9px; background:#f5f3ff; border:1px solid #ddd6fe; display:flex; align-items:center; justify-content:center; color:#7c3aed;">
                            <i class="ph ph-kanban" style="font-size:1.3rem;"></i>
                        </div>
                        <div>
                            <h3 style="margin:0; font-size:1rem; font-weight:800; color:#0f172a;">Kanban de Aprovações Comerciais</h3>
                            <p style="margin:0; font-size:0.74rem; color:#64748b;">Acompanhamento de solicitações, análise de setor e vínculo obrigatório para aprovação de propostas</p>
                        </div>
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

                <!-- Grid das 6 Colunas do Kanban -->
                <div style="display:grid; grid-template-columns:repeat(6, minmax(225px, 1fr)); gap:0.65rem; overflow-x:auto; padding-bottom:0.5rem; align-items:start;">
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

    async function garantirCachesClientesEnderecosEquipamentos() {
        let clientes = Array.isArray(window._clientesCache) ? window._clientesCache : [];
        if (!clientes.length && typeof window.apiGet === 'function') {
            try {
                clientes = await window.apiGet('/clientes');
                window._clientesCache = clientes;
            } catch (_) {}
        }
        return clientes;
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
         * Abre modal para criar uma Nova Aprovação (seja avulsa na tela de Aprovação,
         * seja pré-preenchida a partir da Proposta).
         */
        async abrirModalNovaAprovacao(dadosIniciais = {}, onCreatedCallback = null) {
            const clientes = await garantirCachesClientesEnderecosEquipamentos();
            const propId = dadosIniciais.proposta_id ? Number(dadosIniciais.proposta_id) : null;
            const propCodigo = String(dadosIniciais.proposta_codigo || '').trim();
            const cliIni = limparIconeCliente(dadosIniciais.cliente_nome || '');
            const contIni = String(dadosIniciais.contato_nome || '').trim();
            const endIni = String(dadosIniciais.endereco_instalacao || '').trim();
            const equipsIni = Array.isArray(dadosIniciais.equipamentos) ? dadosIniciais.equipamentos : parseEquipamentosLista(dadosIniciais.equipamentos_json || '[]');
            const obsIni = String(dadosIniciais.observacoes || '').trim();

            let equipsDraft = equipsIni.map(it => ({
                produto: String(it.produto || it.descricao || it.nome || '').trim(),
                quantidade: Math.max(1, parseInt(it.quantidade ?? it.qtde ?? 1, 10) || 1),
                observacao: String(it.observacao || '').trim()
            })).filter(it => it.produto);

            const renderEquipsDraftHtml = () => {
                if (!equipsDraft.length) {
                    return `<div style="color:#94a3b8; font-size:0.75rem; font-style:italic; padding:6px;">Nenhum equipamento adicionado.</div>`;
                }
                return equipsDraft.map((eq, idx) => `
                    <div style="display:flex; align-items:center; justify-content:space-between; gap:8px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; padding:4px 8px; font-size:0.76rem;">
                        <span><strong>${eq.quantidade}x</strong> ${esc(eq.produto)} ${eq.observacao ? `<span style="color:#64748b;">(${esc(eq.observacao)})</span>` : ''}</span>
                        <button type="button" onclick="window._removerEquipModalAprov(${idx})" style="background:#fef2f2; color:#dc2626; border:1px solid #fecaca; border-radius:4px; padding:1px 6px; font-size:0.7rem; cursor:pointer;">&times;</button>
                    </div>
                `).join('');
            };

            window._removerEquipModalAprov = (idx) => {
                equipsDraft.splice(idx, 1);
                const w = document.getElementById('swal-aprv-equips-list');
                if (w) w.innerHTML = renderEquipsDraftHtml();
            };

            window._adicionarEquipModalAprov = () => {
                const nm = String(document.getElementById('swal-aprv-add-eq-nome')?.value || '').trim();
                const qt = Math.max(1, parseInt(document.getElementById('swal-aprv-add-eq-qtd')?.value || '1', 10) || 1);
                if (!nm) return;
                equipsDraft.push({ produto: nm, quantidade: qt, observacao: '' });
                const inpN = document.getElementById('swal-aprv-add-eq-nome');
                if (inpN) inpN.value = '';
                const w = document.getElementById('swal-aprv-equips-list');
                if (w) w.innerHTML = renderEquipsDraftHtml();
            };

            const resSwal = await Swal.fire({
                title: propId ? `Solicitar Aprovação — Proposta Nº ${propCodigo}` : 'Nova Solicitação de Aprovação',
                width: '680px',
                html: `
                    <div style="text-align:left; font-family:'Inter',sans-serif; display:flex; flex-direction:column; gap:10px; font-size:0.82rem;">
                        <div style="display:flex; align-items:center; justify-content:space-between; gap:10px; background:#f5f3ff; border:1px solid #ddd6fe; border-radius:8px; padding:8px 12px;">
                            <span style="font-size:0.78rem; font-weight:700; color:#5b21b6;">
                                <i class="ph ph-Hash"></i> O número da aprovação será gerado automaticamente ao salvar.
                            </span>
                            <label style="display:inline-flex; align-items:center; gap:6px; background:#fef2f2; border:1.5px solid #ef4444; color:#dc2626; padding:4px 10px; border-radius:6px; font-size:0.76rem; font-weight:800; cursor:pointer; user-select:none;">
                                <input type="checkbox" id="swal-aprv-urgente" style="margin:0; width:14px; height:14px; accent-color:#dc2626;">
                                <span>🚨 APROVAÇÃO URGENTE</span>
                            </label>
                        </div>

                        <div style="display:grid; grid-template-columns:1.4fr 1fr; gap:10px;">
                            <div style="position:relative;">
                                <label style="display:block; font-size:0.73rem; font-weight:700; color:#475569; margin-bottom:3px;">Cliente <span style="color:#dc2626;">*</span></label>
                                <input type="text" id="swal-aprv-cliente" value="${esc(formatarClienteComIcone(cliIni) === '—' ? '' : formatarClienteComIcone(cliIni))}"
                                    placeholder="Digite para pesquisar o cliente..."
                                    style="width:100%; height:32px; padding:4px 8px; border:1px solid #cbd5e1; border-radius:6px; font-size:0.8rem; box-sizing:border-box; text-transform:none;">
                                <div id="swal-aprv-cliente-drop" style="display:none; position:absolute; top:100%; left:0; right:0; max-height:180px; overflow-y:auto; background:#fff; border:1px solid #cbd5e1; border-radius:6px; box-shadow:0 8px 20px rgba(0,0,0,0.12); z-index:2000;"></div>
                            </div>
                            <div>
                                <label style="display:block; font-size:0.73rem; font-weight:700; color:#475569; margin-bottom:3px;">Contato</label>
                                <input type="text" id="swal-aprv-contato" value="${esc(contIni)}"
                                    placeholder="Nome do contato..."
                                    style="width:100%; height:32px; padding:4px 8px; border:1px solid #cbd5e1; border-radius:6px; font-size:0.8rem; box-sizing:border-box; text-transform:none;">
                            </div>
                        </div>

                        <div>
                            <label style="display:block; font-size:0.73rem; font-weight:700; color:#475569; margin-bottom:3px;">Endereço de Instalação</label>
                            <input type="text" id="swal-aprv-endereco" value="${esc(endIni)}"
                                placeholder="Endereço completo de instalação..."
                                style="width:100%; height:32px; padding:4px 8px; border:1px solid #cbd5e1; border-radius:6px; font-size:0.8rem; box-sizing:border-box; text-transform:none;">
                        </div>

                        <div>
                            <label style="display:block; font-size:0.73rem; font-weight:700; color:#475569; margin-bottom:3px;">Equipamentos na Proposta / Solicitação</label>
                            <div style="display:flex; gap:6px; margin-bottom:6px;">
                                <input type="text" id="swal-aprv-add-eq-nome" placeholder="Nome do equipamento..."
                                    onkeydown="if(event.key==='Enter'){event.preventDefault(); window._adicionarEquipModalAprov();}"
                                    style="flex:1; height:30px; padding:4px 8px; border:1px solid #cbd5e1; border-radius:6px; font-size:0.78rem; text-transform:none;">
                                <input type="number" id="swal-aprv-add-eq-qtd" value="1" min="1"
                                    style="width:70px; height:30px; padding:4px 6px; border:1px solid #cbd5e1; border-radius:6px; font-size:0.78rem; text-align:center;">
                                <button type="button" onclick="window._adicionarEquipModalAprov()"
                                    style="background:#7c3aed; color:#fff; border:none; border-radius:6px; padding:0 12px; font-size:0.75rem; font-weight:700; cursor:pointer;">+ Incluir</button>
                            </div>
                            <div id="swal-aprv-equips-list" style="display:flex; flex-direction:column; gap:4px; max-height:130px; overflow-y:auto; border:1px solid #e2e8f0; border-radius:6px; padding:6px; background:#fff;">
                                ${renderEquipsDraftHtml()}
                            </div>
                        </div>

                        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
                            <div>
                                <label style="display:block; font-size:0.73rem; font-weight:700; color:#475569; margin-bottom:3px;">Coluna Inicial do Kanban</label>
                                <select id="swal-aprv-coluna" style="width:100%; height:32px; padding:4px 8px; border:1px solid #cbd5e1; border-radius:6px; font-size:0.8rem; text-transform:none;">
                                    ${COLUNAS_KANBAN.map(c => `<option value="${esc(c.key)}">${esc(c.titulo)}</option>`).join('')}
                                </select>
                            </div>
                            <div>
                                <label style="display:block; font-size:0.73rem; font-weight:700; color:#475569; margin-bottom:3px;">Observações da Solicitação</label>
                                <input type="text" id="swal-aprv-obs" value="${esc(obsIni)}" placeholder="Detalhes para aprovação..."
                                    style="width:100%; height:32px; padding:4px 8px; border:1px solid #cbd5e1; border-radius:6px; font-size:0.8rem; box-sizing:border-box; text-transform:none;">
                            </div>
                        </div>
                    </div>
                `,
                showCancelButton: true,
                confirmButtonText: '<i class="ph ph-check"></i> Gerar Aprovação',
                confirmButtonColor: '#7c3aed',
                cancelButtonText: 'Cancelar',
                didOpen: () => {
                    const inpCli = document.getElementById('swal-aprv-cliente');
                    const dropCli = document.getElementById('swal-aprv-cliente-drop');
                    if (inpCli && dropCli) {
                        const filtrarCli = () => {
                            const q = normStr(limparIconeCliente(inpCli.value));
                            const matches = (clientes || []).filter(c => normStr(c.nome_razao_social || '').includes(q)).slice(0, 25);
                            if (!matches.length) {
                                dropCli.style.display = 'none';
                                return;
                            }
                            dropCli.innerHTML = matches.map(c => {
                                const fmt = formatarClienteComIcone(c.nome_razao_social);
                                return `<div onmousedown="event.preventDefault(); document.getElementById('swal-aprv-cliente').value='${esc(fmt)}'; document.getElementById('swal-aprv-cliente-drop').style.display='none';"
                                    style="padding:6px 10px; font-size:0.78rem; cursor:pointer; border-bottom:1px solid #f1f5f9;"
                                    onmouseover="this.style.background='#f5f3ff'" onmouseout="this.style.background='#fff'">${esc(fmt)}</div>`;
                            }).join('');
                            dropCli.style.display = 'block';
                        };
                        inpCli.addEventListener('input', filtrarCli);
                        inpCli.addEventListener('focus', filtrarCli);
                        inpCli.addEventListener('blur', () => setTimeout(() => { dropCli.style.display = 'none'; }, 150));
                    }
                },
                preConfirm: () => {
                    const cliRaw = limparIconeCliente(document.getElementById('swal-aprv-cliente')?.value || '');
                    if (!cliRaw) {
                        Swal.showValidationMessage('Informe o Nome do Cliente.');
                        return false;
                    }
                    return {
                        proposta_id: propId,
                        proposta_codigo: propCodigo,
                        cliente_nome: cliRaw,
                        contato_nome: String(document.getElementById('swal-aprv-contato')?.value || '').trim(),
                        endereco_instalacao: String(document.getElementById('swal-aprv-endereco')?.value || '').trim(),
                        equipamentos: equipsDraft,
                        coluna: document.getElementById('swal-aprv-coluna')?.value || 'Solicitação',
                        urgente: Boolean(document.getElementById('swal-aprv-urgente')?.checked),
                        observacoes: String(document.getElementById('swal-aprv-obs')?.value || '').trim()
                    };
                }
            });

            if (!resSwal || !resSwal.isConfirmed || !resSwal.value) return null;

            try {
                const tk = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token') || '';
                const r = await fetch('/api/comercial/aprovacoes', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(tk ? { 'Authorization': 'Bearer ' + tk } : {})
                    },
                    body: JSON.stringify(resSwal.value)
                });
                const res = await r.json();
                if (!r.ok || !res.success) {
                    Swal.fire('Erro', (res && res.error) || 'Não foi possível criar a aprovação.', 'error');
                    return null;
                }
                await carregarAprovacoesServidor();
                renderKanbanBoard();
                if (typeof mostrarToastSucesso === 'function') {
                    mostrarToastSucesso(`Aprovação Nº ${res.numero_aprovacao} criada com sucesso!`);
                }
                if (typeof onCreatedCallback === 'function') {
                    onCreatedCallback(res.aprovacao);
                }
                return res.aprovacao;
            } catch (e) {
                Swal.fire('Erro', e.message || 'Erro ao criar aprovação.', 'error');
                return null;
            }
        },

        /**
         * Modal para editar / visualizar detalhes de um card do Kanban de Aprovação.
         */
        async abrirModalDetalhesAprovacao(id) {
            const aprv = (state.aprovacoes || []).find(x => Number(x.id) === Number(id));
            if (!aprv) return;
            const numAprv = String(aprv.numero_aprovacao || aprv.id).padStart(2, '0');
            const equips = formatarResumoEquipamentos(aprv.equipamentos_json);
            const propId = Number(aprv.proposta_id) || 0;
            const propCod = String(aprv.prop_codigo_real || aprv.proposta_codigo || '').trim().padStart(2, '0');

            const resSwal = await Swal.fire({
                title: `Aprovação Nº ${numAprv}`,
                width: '660px',
                html: `
                    <div style="text-align:left; font-family:'Inter',sans-serif; display:flex; flex-direction:column; gap:10px; font-size:0.82rem;">
                        <div style="display:flex; align-items:center; justify-content:space-between; gap:8px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:8px 12px;">
                            <div>
                                ${propId ? `
                                    <span style="font-size:0.78rem; font-weight:700; color:#1e40af;">
                                        Vinculada à Proposta Nº ${esc(propCod)}
                                    </span>
                                ` : `
                                    <span style="font-size:0.76rem; color:#64748b;">Sem proposta vinculada ainda</span>
                                    <button type="button" onclick="Swal.close(); window._comercialAprovacao.abrirModalVincularProposta(${Number(aprv.id)});"
                                        style="margin-left:8px; background:#7c3aed; color:#fff; border:none; padding:3px 9px; border-radius:5px; font-size:0.72rem; font-weight:700; cursor:pointer;">
                                        <i class="ph ph-link"></i> Vincular a uma Proposta
                                    </button>
                                `}
                            </div>
                            <label style="display:inline-flex; align-items:center; gap:6px; background:#fef2f2; border:1.5px solid #ef4444; color:#dc2626; padding:4px 10px; border-radius:6px; font-size:0.75rem; font-weight:800; cursor:pointer;">
                                <input type="checkbox" id="det-aprv-urgente" ${Number(aprv.urgente) === 1 ? 'checked' : ''} style="margin:0; accent-color:#dc2626;">
                                <span>🚨 URGENTE</span>
                            </label>
                        </div>

                        <div style="display:grid; grid-template-columns:1.4fr 1fr; gap:10px;">
                            <div>
                                <label style="display:block; font-size:0.73rem; font-weight:700; color:#475569; margin-bottom:3px;">Cliente</label>
                                <input type="text" id="det-aprv-cliente" value="${esc(formatarClienteComIcone(aprv.cliente_nome))}"
                                    style="width:100%; height:32px; padding:4px 8px; border:1px solid #cbd5e1; border-radius:6px; font-size:0.8rem; box-sizing:border-box; text-transform:none;">
                            </div>
                            <div>
                                <label style="display:block; font-size:0.73rem; font-weight:700; color:#475569; margin-bottom:3px;">Contato</label>
                                <input type="text" id="det-aprv-contato" value="${esc(aprv.contato_nome || '')}"
                                    style="width:100%; height:32px; padding:4px 8px; border:1px solid #cbd5e1; border-radius:6px; font-size:0.8rem; box-sizing:border-box; text-transform:none;">
                            </div>
                        </div>

                        <div>
                            <label style="display:block; font-size:0.73rem; font-weight:700; color:#475569; margin-bottom:3px;">Endereço de Instalação</label>
                            <input type="text" id="det-aprv-endereco" value="${esc(aprv.endereco_instalacao || '')}"
                                style="width:100%; height:32px; padding:4px 8px; border:1px solid #cbd5e1; border-radius:6px; font-size:0.8rem; box-sizing:border-box; text-transform:none;">
                        </div>

                        <div>
                            <label style="display:block; font-size:0.73rem; font-weight:700; color:#475569; margin-bottom:3px;">Equipamentos</label>
                            <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; padding:8px; display:flex; flex-wrap:wrap; gap:5px;">
                                ${equips.length > 0
                                    ? equips.map(eq => `<span style="background:#eef2ff; color:#3730a3; border:1px solid #c7d2fe; font-size:0.74rem; font-weight:700; padding:2px 8px; border-radius:5px;">${eq.qtd}x ${esc(eq.nome)}</span>`).join('')
                                    : '<span style="color:#94a3b8; font-size:0.75rem;">Nenhum equipamento listado.</span>'
                                }
                            </div>
                        </div>

                        <div>
                            <label style="display:block; font-size:0.73rem; font-weight:700; color:#475569; margin-bottom:3px;">Etapa / Coluna do Kanban</label>
                            <select id="det-aprv-coluna" style="width:100%; height:32px; padding:4px 8px; border:1px solid #cbd5e1; border-radius:6px; font-size:0.8rem; font-weight:700; text-transform:none;">
                                ${COLUNAS_KANBAN.map(c => `<option value="${esc(c.key)}" ${normalizarColuna(aprv.coluna) === c.key ? 'selected' : ''}>${esc(c.titulo)}</option>`).join('')}
                            </select>
                        </div>

                        <div>
                            <label style="display:block; font-size:0.73rem; font-weight:700; color:#475569; margin-bottom:3px;">Observações da Solicitação</label>
                            <textarea id="det-aprv-obs" rows="2" style="width:100%; padding:6px 8px; border:1px solid #cbd5e1; border-radius:6px; font-size:0.8rem; box-sizing:border-box; text-transform:none;">${esc(aprv.observacoes || '')}</textarea>
                        </div>

                        <div>
                            <label style="display:block; font-size:0.73rem; font-weight:700; color:#475569; margin-bottom:3px;">Resposta do Setor / Parecer</label>
                            <textarea id="det-aprv-resposta" rows="2" placeholder="Registre a resposta ou parecer do setor..." style="width:100%; padding:6px 8px; border:1px solid #cbd5e1; border-radius:6px; font-size:0.8rem; box-sizing:border-box; text-transform:none;">${esc(aprv.resposta_setor || '')}</textarea>
                        </div>
                    </div>
                `,
                showCancelButton: true,
                confirmButtonText: '<i class="ph ph-check"></i> Salvar Alterações',
                confirmButtonColor: '#7c3aed',
                cancelButtonText: 'Fechar',
                preConfirm: () => ({
                    cliente_nome: limparIconeCliente(document.getElementById('det-aprv-cliente')?.value || ''),
                    contato_nome: String(document.getElementById('det-aprv-contato')?.value || '').trim(),
                    endereco_instalacao: String(document.getElementById('det-aprv-endereco')?.value || '').trim(),
                    coluna: document.getElementById('det-aprv-coluna')?.value || aprv.coluna,
                    urgente: Boolean(document.getElementById('det-aprv-urgente')?.checked),
                    observacoes: String(document.getElementById('det-aprv-obs')?.value || '').trim(),
                    resposta_setor: String(document.getElementById('det-aprv-resposta')?.value || '').trim()
                })
            });

            if (!resSwal || !resSwal.isConfirmed || !resSwal.value) return;
            try {
                const tk = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token') || '';
                const r = await fetch(`/api/comercial/aprovacoes/${aprv.id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(tk ? { 'Authorization': 'Bearer ' + tk } : {})
                    },
                    body: JSON.stringify(resSwal.value)
                });
                const res = await r.json();
                if (r.ok && res.success) {
                    await carregarAprovacoesServidor();
                    renderKanbanBoard();
                    if (typeof mostrarToastSucesso === 'function') {
                        mostrarToastSucesso(`Aprovação Nº ${numAprv} atualizada!`);
                    }
                }
            } catch (e) {
                Swal.fire('Erro', e.message || 'Erro ao atualizar aprovação.', 'error');
            }
        },

        /**
         * Permite vincular uma Aprovação (que foi criada na tela de Aprovação e não
         * possui proposta vinculada) a uma proposta do sistema.
         */
        async abrirModalVincularProposta(aprovacaoId) {
            const aprv = (state.aprovacoes || []).find(x => Number(x.id) === Number(aprovacaoId));
            if (!aprv) return;

            let propostas = [];
            try {
                propostas = await window.apiGet('/propostas');
                if (Array.isArray(propostas)) window._propostasData = propostas;
            } catch (_) {
                propostas = Array.isArray(window._propostasData) ? window._propostasData : [];
            }

            const cliAprvNorm = normStr(limparIconeCliente(aprv.cliente_nome));
            // Ordena priorizando propostas do mesmo cliente
            const listaOrdenada = [...(propostas || [])].sort((a, b) => {
                const aMesmoCli = cliAprvNorm && normStr(limparIconeCliente(a.cliente_nome)) === cliAprvNorm ? 1 : 0;
                const bMesmoCli = cliAprvNorm && normStr(limparIconeCliente(b.cliente_nome)) === cliAprvNorm ? 1 : 0;
                if (bMesmoCli !== aMesmoCli) return bMesmoCli - aMesmoCli;
                return Number(b.id || 0) - Number(a.id || 0);
            });

            const renderLinhasPropostas = (filtro = '') => {
                const q = normStr(filtro);
                const fil = listaOrdenada.filter(p => {
                    if (!q) return true;
                    return normStr(`${p.codigo} ${p.cliente_nome} ${p.endereco_instalacao} ${p.tipo}`).includes(q);
                }).slice(0, 60);

                if (!fil.length) {
                    return `<tr><td colspan="5" style="text-align:center; padding:1rem; color:#94a3b8;">Nenhuma proposta encontrada.</td></tr>`;
                }
                return fil.map(p => {
                    const cod = String(p.codigo || p.id).padStart(2, '0');
                    const mesmoCli = cliAprvNorm && normStr(limparIconeCliente(p.cliente_nome)) === cliAprvNorm;
                    return `
                        <tr onclick="window._confirmarVinculoAprovacaoProposta(${Number(aprv.id)}, ${Number(p.id)})"
                            style="cursor:pointer; border-bottom:1px solid #e2e8f0; background:${mesmoCli ? '#f5f3ff' : '#fff'};"
                            onmouseover="this.style.background='#ede9fe'" onmouseout="this.style.background='${mesmoCli ? '#f5f3ff' : '#fff'}'">
                            <td style="padding:8px 10px; font-weight:800; color:#2563eb;">Nº ${esc(cod)}</td>
                            <td style="padding:8px 10px; font-weight:700; color:#0f172a;">${esc(formatarClienteComIcone(p.cliente_nome))}</td>
                            <td style="padding:8px 10px; color:#475569; font-size:0.75rem;">${esc(p.endereco_instalacao || '—')}</td>
                            <td style="padding:8px 10px; color:#475569; font-size:0.74rem;">${esc(p.tipo || '—')}</td>
                            <td style="padding:8px 10px; text-align:center;">
                                <span style="background:#7c3aed; color:#fff; padding:3px 9px; border-radius:5px; font-size:0.72rem; font-weight:700;">Vincular</span>
                            </td>
                        </tr>
                    `;
                }).join('');
            };

            window._confirmarVinculoAprovacaoProposta = async (apId, prId) => {
                Swal.close();
                await this.vincularAprovacaoComProposta(apId, prId);
            };

            Swal.fire({
                title: `Vincular Aprovação Nº ${String(aprv.numero_aprovacao).padStart(2, '0')} a uma Proposta`,
                width: '820px',
                showConfirmButton: false,
                html: `
                    <div style="text-align:left; font-family:'Inter',sans-serif; display:flex; flex-direction:column; gap:10px;">
                        <input type="text" id="swal-vinc-prop-search" value="${esc(limparIconeCliente(aprv.cliente_nome))}"
                            placeholder="Digite o nº da proposta, nome do cliente ou endereço..."
                            style="width:100%; height:34px; padding:4px 10px; border:1px solid #cbd5e1; border-radius:6px; font-size:0.82rem; box-sizing:border-box; text-transform:none;">
                        <div style="max-height:380px; overflow-y:auto; border:1px solid #e2e8f0; border-radius:8px;">
                            <table style="width:100%; border-collapse:collapse; font-size:0.78rem; text-align:left;">
                                <thead>
                                    <tr style="background:#f8fafc; border-bottom:2px solid #cbd5e1; color:#475569; font-size:0.7rem; text-transform:uppercase;">
                                        <th style="padding:8px 10px;">Proposta</th>
                                        <th style="padding:8px 10px;">Cliente</th>
                                        <th style="padding:8px 10px;">Endereço de Instalação</th>
                                        <th style="padding:8px 10px;">Tipo</th>
                                        <th style="padding:8px 10px; text-align:center;">Ação</th>
                                    </tr>
                                </thead>
                                <tbody id="swal-vinc-prop-tbody">
                                    ${renderLinhasPropostas(limparIconeCliente(aprv.cliente_nome))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                `,
                didOpen: () => {
                    const inp = document.getElementById('swal-vinc-prop-search');
                    const tb = document.getElementById('swal-vinc-prop-tbody');
                    if (inp && tb) {
                        inp.addEventListener('input', () => {
                            tb.innerHTML = renderLinhasPropostas(inp.value);
                        });
                        inp.focus();
                        inp.select();
                    }
                }
            });
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

        /**
         * Verifica se existe alguma aprovação com o mesmo nome do cliente e mesmo
         * endereço de instalação (sem outra proposta vinculada ou compatível) e
         * pergunta ao usuário se deseja vincular a proposta a essa aprovação.
         */
        async verificarAprovacaoCompativelPorClienteEndereco(propostaObj) {
            if (!propostaObj) return null;
            const lista = await carregarAprovacoesServidor();
            const cliProp = normStr(limparIconeCliente(propostaObj.cliente_nome || ''));
            const endProp = normStr(propostaObj.endereco_instalacao || '');
            if (!cliProp) return null;

            // 1. Prioridade máxima: mesmo cliente + mesmo endereço de instalação (sem proposta vinculada ou já vinculada a esta)
            let candidata = lista.find(a => {
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

        /**
         * Ação do botão roxo "Aprovação" dentro da tela de Proposta:
         * - Se a proposta já tiver uma aprovação vinculada, abre o modal de detalhes
         *   dessa aprovação (com botão para ir ao Kanban de Aprovação).
         * - Se não tiver aprovação vinculada:
         *     1. Verifica se existe uma aprovação com o mesmo cliente e mesmo endereço;
         *        se existir, pergunta se gostaria de vincular essa proposta a essa aprovação.
         *     2. Permite também escolher outra aprovação sem proposta do cliente ou gerar
         *        uma nova aprovação vinculada automaticamente à proposta.
         */
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
            const equipsAtuais = Array.isArray(window._propProdutosAdicionados) && window._propProdutosAdicionados.length > 0
                ? window._propProdutosAdicionados
                : (pMem ? parseEquipamentosLista(pMem.itens) : []);

            await carregarAprovacoesServidor();

            // Caso a proposta já tenha aprovação vinculada:
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

            // Verifica se existe aprovação com mesmo cliente e mesmo endereço
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
                    html: `Existe a <strong>Aprovação Nº ${esc(numComp)}</strong> para o cliente <strong>${esc(formatarClienteComIcone(compativel.cliente_nome))}</strong> no mesmo endereço (<em>${esc(compativel.endereco_instalacao || '—')}</em>).<br><br>Gostaria de vincular esta proposta a essa aprovação?`,
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

            // Abre o modal para gerar nova aprovação já com Cliente, Contato, Endereço e Equipamentos da Proposta
            return await this.abrirModalNovaAprovacao({
                proposta_id: propId,
                proposta_codigo: codigoProp,
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
         * Chamado antes de aprovar uma proposta (`aprovarPropostaEdicao`):
         * Garante que uma proposta só possa ser aprovada se estiver vinculada a uma
         * aprovação; se existir aprovação do mesmo cliente e mesmo endereço, pergunta
         * se gostaria de vincular na hora.
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
            const equipsAtuais = Array.isArray(window._propProdutosAdicionados) && window._propProdutosAdicionados.length > 0
                ? window._propProdutosAdicionados
                : (pMem ? parseEquipamentosLista(pMem.itens) : []);

            const jaVinculada = (pMem && pMem.aprovacao_id)
                ? state.aprovacoes.find(a => Number(a.id) === Number(pMem.aprovacao_id))
                : state.aprovacoes.find(a => Number(a.proposta_id) === idNum);

            if (jaVinculada) {
                if (pMem) {
                    pMem.aprovacao_id = jaVinculada.id;
                    pMem.numero_aprovacao = jaVinculada.numero_aprovacao;
                }
                return true;
            }

            // Verifica se existe aprovação com o mesmo cliente e mesmo endereço
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
                    html: `Para aprovar uma proposta é necessário que ela esteja vinculada a uma aprovação.<br><br>Encontramos a <strong>Aprovação Nº ${esc(numComp)}</strong> do cliente <strong>${esc(formatarClienteComIcone(compativel.cliente_nome))}</strong> com o mesmo endereço (<em>${esc(compativel.endereco_instalacao || '—')}</em>).<br><br>Gostaria de vincular esta proposta a essa aprovação?`,
                    showCancelButton: true,
                    confirmButtonText: `<i class="ph ph-link"></i> Sim, vincular à Aprovação Nº ${numComp}`,
                    confirmButtonColor: '#7c3aed',
                    cancelButtonText: 'Não'
                });
                if (ask.isConfirmed) {
                    const vinc = await this.vincularAprovacaoComProposta(compativel.id, idNum);
                    return Boolean(vinc);
                }
                return false;
            }

            // Se não existe aprovação compatível, avisa que é obrigatório vincular ou gerar uma aprovação
            const askGerar = await Swal.fire({
                icon: 'warning',
                title: 'Aprovação Obrigatória',
                html: 'Uma proposta precisa estar vinculada a uma <strong>Aprovação</strong> para poder ser aprovada.<br><br>Deseja gerar ou vincular uma aprovação agora?',
                showCancelButton: true,
                confirmButtonText: '<i class="ph ph-Stamp"></i> Gerar Aprovação Agora',
                confirmButtonColor: '#7c3aed',
                cancelButtonText: 'Cancelar'
            });

            if (!askGerar.isConfirmed) return false;

            const criada = await this.abrirModalNovaAprovacao({
                proposta_id: idNum,
                proposta_codigo: codigoProp,
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

            return Boolean(criada && criada.id);
        }
    };

    window.renderTelaAprovacaoComercial = function () {
        window._comercialAprovacao.init();
    };
})();
