// ═══════════════════════════════════════════════════════════════════════════════
// FRONTEND: APP › LIDERANÇA › INSUMOS (Contagem e Atualização do Endereço de Reposição)
// Arquivo: frontend/app_lideranca_insumos.js
//
// - Mobile-first (360–430 px, sem rolagem horizontal, barra de ação fixa no rodapé)
// - Ícones Phosphor em tudo, alvos de toque >= 48 px, inputs com fonte >= 16 px
// - Pesquisa digitável em tempo real (ignorando acentos e maiúsculas/minúsculas, caixa normal)
// - Cores consistentes: verde (ok/contado), vermelho (estoque mínimo/zerado), azul (filtro ativo), laranja (em edição)
// ═══════════════════════════════════════════════════════════════════════════════
(function () {
    'use strict';

    const esc = (s) => String(s == null ? '' : s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    const normBusca = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

    const S = {
        itens: [],
        contagem: {},   // row_key -> number
        conferidos: {}, // row_key -> boolean
        busca: '',
        filtro: 'todos', // 'todos' | 'minimo' | 'alterados'
        enderecoFiltro: '',
        salvando: false
    };

    function getToken() {
        return window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token') || '';
    }

    function mostrarToastApp(msg, tipo = 'ok') {
        let el = document.getElementById('ains-toast');
        if (!el) {
            el = document.createElement('div');
            el.id = 'ains-toast';
            document.body.appendChild(el);
        }
        const bg = tipo === 'erro' ? '#dc2626' : '#16a34a';
        el.style.cssText = `position:fixed;bottom:88px;left:50%;transform:translateX(-50%);background:${bg};color:#fff;padding:12px 18px;border-radius:12px;font-size:0.92rem;font-weight:700;z-index:100005;box-shadow:0 10px 25px rgba(0,0,0,0.25);display:inline-flex;align-items:center;gap:8px;max-width:92vw;font-family:'Inter',sans-serif;`;
        el.innerHTML = `<i class="ph-fill ${tipo === 'erro' ? 'ph-warning-circle' : 'ph-check-circle'}" style="font-size:1.2rem;"></i><span>${esc(msg)}</span>`;
        clearTimeout(el._t);
        el._t = setTimeout(() => { if (el.parentNode) el.remove(); }, 2600);
    }

    function injectStyles() {
        if (document.getElementById('ains-styles')) return;
        const st = document.createElement('style');
        st.id = 'ains-styles';
        st.textContent = `
            #app-lideranca-insumos-view {
                max-width: 780px;
                margin: 0 auto;
                padding: 12px 12px 96px 12px;
                font-family: 'Inter', sans-serif;
                box-sizing: border-box;
                overflow-x: hidden;
            }
            .ains-header {
                background: #ffffff;
                border: 1px solid #e2e8f0;
                border-radius: 14px;
                padding: 14px 16px;
                margin-bottom: 12px;
                box-shadow: 0 2px 6px rgba(15,23,42,0.04);
            }
            .ains-kpis {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 8px;
                margin-top: 12px;
            }
            .ains-kpi {
                border-radius: 12px;
                padding: 10px;
                text-align: center;
                border: 1px solid transparent;
            }
            .ains-progress-wrap {
                margin-top: 12px;
                background: #f1f5f9;
                height: 10px;
                border-radius: 999px;
                overflow: hidden;
            }
            .ains-progress-bar {
                height: 100%;
                background: linear-gradient(90deg, #2563eb, #16a34a);
                transition: width 0.25s ease;
            }
            .ains-toolbar {
                background: #ffffff;
                border: 1px solid #e2e8f0;
                border-radius: 14px;
                padding: 12px;
                margin-bottom: 12px;
                display: flex;
                flex-direction: column;
                gap: 10px;
            }
            .ains-search-input {
                width: 100%;
                min-height: 48px;
                padding: 10px 38px 10px 40px;
                border: 1.5px solid #cbd5e1;
                border-radius: 12px;
                font-size: 16px !important;
                color: #0f172a;
                background: #f8fafc;
                box-sizing: border-box;
                text-transform: none !important;
                outline: none;
            }
            .ains-search-input:focus {
                border-color: #2563eb;
                background: #ffffff;
            }
            .ains-pills {
                display: flex;
                gap: 8px;
                overflow-x: auto;
                padding-bottom: 2px;
            }
            .ains-pill {
                min-height: 42px;
                padding: 8px 14px;
                border-radius: 999px;
                border: 1.5px solid #cbd5e1;
                background: #f8fafc;
                color: #334155;
                font-size: 0.84rem;
                font-weight: 700;
                cursor: pointer;
                display: inline-flex;
                align-items: center;
                gap: 6px;
                white-space: nowrap;
                flex-shrink: 0;
            }
            .ains-pill.active {
                background: #2563eb;
                border-color: #2563eb;
                color: #ffffff;
            }
            .ains-card {
                background: #ffffff;
                border: 1.5px solid #e2e8f0;
                border-left: 5px solid #16a34a;
                border-radius: 14px;
                padding: 14px;
                margin-bottom: 10px;
                display: flex;
                flex-direction: column;
                gap: 12px;
                transition: all 0.15s ease;
                box-shadow: 0 2px 5px rgba(15,23,42,0.03);
            }
            .ains-card.minimo {
                background: #fff1f2;
                border-color: #fecdd3;
                border-left-color: #dc2626;
            }
            .ains-card.alterado {
                background: #fff7ed;
                border-color: #fed7aa;
                border-left-color: #ea580c;
            }
            .ains-card.conferido {
                background: #f0fdf4;
                border-color: #bbf7d0;
                border-left-color: #16a34a;
            }
            .ains-stepper-btn {
                width: 48px;
                height: 48px;
                border-radius: 12px;
                border: 1.5px solid #cbd5e1;
                background: #ffffff;
                color: #0f172a;
                font-size: 1.25rem;
                font-weight: 800;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                flex-shrink: 0;
                user-select: none;
            }
            .ains-stepper-btn:active {
                transform: scale(0.96);
                background: #f1f5f9;
            }
            .ains-qtd-input {
                width: 84px;
                height: 48px;
                border-radius: 12px;
                border: 1.5px solid #94a3b8;
                background: #ffffff;
                color: #0f172a;
                font-size: 18px !important;
                font-weight: 800;
                text-align: center;
                box-sizing: border-box;
                text-transform: none !important;
            }
            .ains-bottom-bar {
                position: fixed;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(255,255,255,0.96);
                backdrop-filter: blur(8px);
                border-top: 1px solid #cbd5e1;
                padding: 10px 14px;
                z-index: 9990;
                display: flex;
                justify-content: center;
                box-shadow: 0 -6px 20px rgba(15,23,42,0.08);
            }
            .ains-bottom-inner {
                width: 100%;
                max-width: 760px;
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 10px;
            }
            .ains-btn-primary {
                flex: 1;
                min-height: 50px;
                border-radius: 12px;
                border: none;
                background: #16a34a;
                color: #ffffff;
                font-size: 1rem;
                font-weight: 800;
                cursor: pointer;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                box-shadow: 0 4px 12px rgba(22,163,74,0.3);
            }
            .ains-btn-primary:disabled {
                background: #94a3b8;
                box-shadow: none;
                cursor: not-allowed;
            }
        `;
        document.head.appendChild(st);
    }

    async function carregarDadosInsumos() {
        const root = document.getElementById('app-lideranca-insumos-view');
        if (root && !S.itens.length) {
            root.innerHTML = `<div style="padding:36px 16px;text-align:center;color:#64748b;font-weight:600;"><i class="ph ph-spinner" style="font-size:1.6rem;"></i><div style="margin-top:8px;">Carregando insumos de reposição...</div></div>`;
        }
        try {
            const r = await fetch((typeof API_URL !== 'undefined' ? API_URL : '/api') + '/app/lideranca/insumos', {
                headers: { 'Authorization': 'Bearer ' + getToken() }
            });
            const j = await r.json();
            if (!r.ok) throw new Error(j.error || 'Falha ao carregar insumos');
            S.itens = Array.isArray(j.itens) ? j.itens : [];
            S.contagem = {};
            S.conferidos = {};
            S.itens.forEach(it => {
                S.contagem[it.row_key] = parseInt(it.quantidade_atual, 10) || 0;
                S.conferidos[it.row_key] = false;
            });
            renderView();
        } catch (e) {
            if (root) {
                root.innerHTML = `<div style="padding:24px;text-align:center;color:#dc2626;font-weight:700;"><i class="ph ph-warning-circle" style="font-size:1.5rem;"></i><div>${esc(e.message || 'Erro ao carregar insumos')}</div></div>`;
            }
        }
    }

    function isItemMinimo(it, qtdRef) {
        const q = qtdRef !== undefined ? qtdRef : (parseInt(it.quantidade_atual, 10) || 0);
        const min = parseInt(it.quantidade_minima, 10) || 0;
        return q === 0 || (min > 0 && q <= min);
    }

    function isItemAlterado(it) {
        const atual = parseInt(it.quantidade_atual, 10) || 0;
        const novo = parseInt(S.contagem[it.row_key], 10);
        return !isNaN(novo) && novo !== atual;
    }

    function renderView() {
        injectStyles();
        const root = document.getElementById('app-lideranca-insumos-view');
        if (!root) return;

        const enderecosUnicos = Array.from(new Set(S.itens.map(i => i.endereco_nome).filter(Boolean)));
        const total = S.itens.length;
        const totalMin = S.itens.filter(i => isItemMinimo(i, S.contagem[i.row_key])).length;
        const totalConferidosOuAlt = S.itens.filter(i => S.conferidos[i.row_key] || isItemAlterado(i)).length;
        const pctProgresso = total > 0 ? Math.round((totalConferidosOuAlt / total) * 100) : 0;

        root.innerHTML = `
            <div class="ains-header">
                <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;">
                    <div style="display:flex;align-items:center;gap:10px;">
                        <div style="width:44px;height:44px;border-radius:12px;background:#dbeafe;color:#2563eb;display:flex;align-items:center;justify-content:center;font-size:1.45rem;flex-shrink:0;">
                            <i class="ph-fill ph-flask"></i>
                        </div>
                        <div>
                            <h3 style="margin:0;font-size:1.1rem;font-weight:800;color:#0f172a;">Insumos — Reposição</h3>
                            <p style="margin:2px 0 0;font-size:0.8rem;color:#64748b;">Contagem e atualização de estoque pelos líderes</p>
                        </div>
                    </div>
                    <button type="button" id="ains-btn-reload" title="Atualizar lista"
                        style="width:48px;height:48px;border-radius:12px;border:1.5px solid #cbd5e1;background:#f8fafc;color:#334155;font-size:1.2rem;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;">
                        <i class="ph ph-arrows-clockwise"></i>
                    </button>
                </div>

                <div class="ains-kpis">
                    <div class="ains-kpi" style="background:#eff6ff;border-color:#bfdbfe;color:#1d4ed8;">
                        <div style="font-size:0.72rem;font-weight:700;text-transform:uppercase;">Total Insumos</div>
                        <div style="font-size:1.25rem;font-weight:900;margin-top:2px;" id="ains-kpi-total">${total}</div>
                    </div>
                    <div class="ains-kpi" style="background:#fef2f2;border-color:#fecaca;color:#dc2626;">
                        <div style="font-size:0.72rem;font-weight:700;text-transform:uppercase;">Estoque Mínimo</div>
                        <div style="font-size:1.25rem;font-weight:900;margin-top:2px;" id="ains-kpi-min">${totalMin}</div>
                    </div>
                    <div class="ains-kpi" style="background:#f0fdf4;border-color:#bbf7d0;color:#16a34a;">
                        <div style="font-size:0.72rem;font-weight:700;text-transform:uppercase;">Conferidos</div>
                        <div style="font-size:1.25rem;font-weight:900;margin-top:2px;" id="ains-kpi-conf">${totalConferidosOuAlt}/${total}</div>
                    </div>
                </div>

                <div class="ains-progress-wrap">
                    <div class="ains-progress-bar" id="ains-prog-bar" style="width:${pctProgresso}%;"></div>
                </div>
            </div>

            <div class="ains-toolbar">
                <div style="position:relative;">
                    <i class="ph ph-magnifying-glass" style="position:absolute;left:14px;top:50%;transform:translateY(-50%);color:#64748b;font-size:1.15rem;pointer-events:none;"></i>
                    <input type="text" id="ains-search" class="ains-search-input" placeholder="Digite o nome do insumo ou endereço..."
                        value="${esc(S.busca)}" autocomplete="off">
                </div>
                <div class="ains-pills">
                    <button type="button" class="ains-pill ${S.filtro === 'todos' ? 'active' : ''}" data-filtro="todos">
                        <i class="ph ph-squares-four"></i> Todos (${total})
                    </button>
                    <button type="button" class="ains-pill ${S.filtro === 'minimo' ? 'active' : ''}" data-filtro="minimo">
                        <i class="ph ph-warning-circle"></i> Estoque Mínimo (${totalMin})
                    </button>
                    <button type="button" class="ains-pill ${S.filtro === 'alterados' ? 'active' : ''}" data-filtro="alterados">
                        <i class="ph ph-pencil-simple"></i> Alterados / Conferidos (${totalConferidosOuAlt})
                    </button>
                    ${enderecosUnicos.map(endNome => `
                        <button type="button" class="ains-pill ${S.enderecoFiltro === endNome ? 'active' : ''}" data-end="${esc(endNome)}">
                            <i class="ph ph-map-pin"></i> ${esc(endNome)}
                        </button>
                    `).join('')}
                </div>
            </div>

            <div id="ains-list-container"></div>

            <div class="ains-bottom-bar">
                <div class="ains-bottom-inner">
                    <button type="button" id="ains-btn-salvar-tudo" class="ains-btn-primary">
                        <i class="ph-fill ph-check-circle" style="font-size:1.25rem;"></i>
                        <span>Salvar Contagem e Atualizar Sistema</span>
                    </button>
                </div>
            </div>
        `;

        document.getElementById('ains-btn-reload')?.addEventListener('click', () => carregarDadosInsumos());
        const inpBusca = document.getElementById('ains-search');
        inpBusca?.addEventListener('input', () => {
            S.busca = inpBusca.value;
            renderListaCards();
        });

        root.querySelectorAll('.ains-pill[data-filtro]').forEach(btn => {
            btn.addEventListener('click', () => {
                S.filtro = btn.getAttribute('data-filtro') || 'todos';
                S.enderecoFiltro = '';
                renderView();
            });
        });

        root.querySelectorAll('.ains-pill[data-end]').forEach(btn => {
            btn.addEventListener('click', () => {
                const end = btn.getAttribute('data-end') || '';
                S.enderecoFiltro = (S.enderecoFiltro === end) ? '' : end;
                renderView();
            });
        });

        document.getElementById('ains-btn-salvar-tudo')?.addEventListener('click', () => salvarContagemInsumos());

        renderListaCards();
    }

    function atualizarResumoCabecalho() {
        const total = S.itens.length;
        const totalMin = S.itens.filter(i => isItemMinimo(i, S.contagem[i.row_key])).length;
        const totalConferidosOuAlt = S.itens.filter(i => S.conferidos[i.row_key] || isItemAlterado(i)).length;
        const pctProgresso = total > 0 ? Math.round((totalConferidosOuAlt / total) * 100) : 0;

        const elMin = document.getElementById('ains-kpi-min');
        const elConf = document.getElementById('ains-kpi-conf');
        const elBar = document.getElementById('ains-prog-bar');
        if (elMin) elMin.textContent = String(totalMin);
        if (elConf) elConf.textContent = `${totalConferidosOuAlt}/${total}`;
        if (elBar) elBar.style.width = `${pctProgresso}%`;
    }

    function renderListaCards() {
        const cont = document.getElementById('ains-list-container');
        if (!cont) return;

        const q = normBusca(S.busca);
        const filtrados = S.itens.filter(it => {
            if (S.enderecoFiltro && it.endereco_nome !== S.enderecoFiltro) return false;
            const qtdNova = S.contagem[it.row_key];
            if (S.filtro === 'minimo' && !isItemMinimo(it, qtdNova)) return false;
            if (S.filtro === 'alterados' && !(S.conferidos[it.row_key] || isItemAlterado(it))) return false;
            if (!q) return true;
            const texto = normBusca(`${it.nome} ${it.endereco_nome} ${it.tamanho}`);
            return texto.includes(q);
        });

        if (filtrados.length === 0) {
            cont.innerHTML = `
                <div style="background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:32px 16px;text-align:center;color:#64748b;">
                    <i class="ph ph-package" style="font-size:2.2rem;color:#94a3b8;"></i>
                    <div style="font-weight:700;font-size:0.95rem;margin-top:8px;color:#334155;">Nenhum insumo encontrado</div>
                    <div style="font-size:0.82rem;margin-top:4px;">Verifique os filtros ou cadastre itens na categoria <b>Insumos</b> no Controle de Estoque.</div>
                </div>
            `;
            return;
        }

        cont.innerHTML = filtrados.map(it => {
            const rk = it.row_key;
            const qtdSistema = parseInt(it.quantidade_atual, 10) || 0;
            const qtdContada = S.contagem[rk] !== undefined ? S.contagem[rk] : qtdSistema;
            const minRef = parseInt(it.quantidade_minima, 10) || 0;
            const maxRef = parseInt(it.quantidade_maxima, 10) || 0;
            const emMin = isItemMinimo(it, qtdContada);
            const alterado = isItemAlterado(it);
            const conferido = Boolean(S.conferidos[rk]);

            let cardClass = 'ains-card';
            if (alterado) cardClass += ' alterado';
            else if (emMin) cardClass += ' minimo';
            else if (conferido) cardClass += ' conferido';

            const fotoHtml = it.foto
                ? `<img src="${esc(it.foto)}" style="width:52px;height:52px;border-radius:12px;object-fit:cover;border:1px solid #e2e8f0;flex-shrink:0;">`
                : `<div style="width:52px;height:52px;border-radius:12px;background:#eff6ff;color:#2563eb;display:flex;align-items:center;justify-content:center;font-size:1.5rem;flex-shrink:0;"><i class="ph ph-flask"></i></div>`;

            return `
                <div class="${cardClass}" data-rk="${esc(rk)}">
                    <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px;">
                        <div style="display:flex;align-items:center;gap:12px;min-width:0;flex:1;">
                            ${fotoHtml}
                            <div style="min-width:0;flex:1;">
                                <div style="font-weight:800;font-size:0.98rem;color:#0f172a;line-height:1.25;word-break:break-word;">
                                    ${esc(it.nome)}
                                </div>
                                <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px;align-items:center;">
                                    <span style="display:inline-flex;align-items:center;gap:4px;background:#f5f3ff;color:#7c3aed;border:1px solid #ddd6fe;border-radius:8px;padding:3px 8px;font-size:0.74rem;font-weight:700;">
                                        <i class="ph-fill ph-map-pin"></i> ${esc(it.endereco_nome || 'Reposição')}
                                    </span>
                                    ${it.tamanho ? `<span style="background:#dbeafe;color:#1e40af;border-radius:8px;padding:3px 8px;font-size:0.74rem;font-weight:800;">Tam. ${esc(it.tamanho)}</span>` : ''}
                                    ${emMin ? `<span style="background:#dc2626;color:#fff;border-radius:8px;padding:3px 8px;font-size:0.7rem;font-weight:800;"><i class="ph-fill ph-warning"></i> ESTOQUE MÍNIMO</span>` : ''}
                                    ${alterado ? `<span style="background:#ea580c;color:#fff;border-radius:8px;padding:3px 8px;font-size:0.7rem;font-weight:800;">Era ${qtdSistema} → ${qtdContada}</span>` : ''}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding-top:8px;border-top:1px dashed #cbd5e1;flex-wrap:wrap;">
                        <div>
                            <div style="font-size:0.75rem;color:#64748b;font-weight:600;">
                                No sistema: <b style="color:#0f172a;">${qtdSistema}</b>
                                ${minRef > 0 ? ` · Mín: <b>${minRef}</b>` : ''}
                                ${maxRef > 0 ? ` · Máx: <b>${maxRef}</b>` : ''}
                            </div>
                            <button type="button" class="ains-btn-ok-card" data-rk="${esc(rk)}"
                                style="margin-top:6px;min-height:38px;padding:6px 12px;border-radius:10px;border:1.5px solid ${conferido ? '#16a34a' : '#cbd5e1'};background:${conferido ? '#dcfce7' : '#f8fafc'};color:${conferido ? '#166534' : '#475569'};font-size:0.78rem;font-weight:800;cursor:pointer;display:inline-flex;align-items:center;gap:5px;">
                                <i class="ph-fill ${conferido ? 'ph-check-circle' : 'ph-circle'}"></i>
                                ${conferido ? 'Contagem Conferida' : 'Marcar Conferido'}
                            </button>
                        </div>

                        <div style="display:inline-flex;align-items:center;gap:8px;">
                            <button type="button" class="ains-stepper-btn ains-btn-menos" data-rk="${esc(rk)}" title="Diminuir 1">
                                <i class="ph-bold ph-minus"></i>
                            </button>
                            <input type="number" class="ains-qtd-input" data-rk="${esc(rk)}" min="0" step="1" inputmode="numeric" value="${qtdContada}">
                            <button type="button" class="ains-stepper-btn ains-btn-mais" data-rk="${esc(rk)}" title="Aumentar 1">
                                <i class="ph-bold ph-plus"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        cont.querySelectorAll('.ains-btn-menos').forEach(btn => {
            btn.addEventListener('click', () => {
                const rk = btn.getAttribute('data-rk');
                const atual = parseInt(S.contagem[rk], 10) || 0;
                S.contagem[rk] = Math.max(0, atual - 1);
                S.conferidos[rk] = true;
                renderListaCards();
                atualizarResumoCabecalho();
            });
        });

        cont.querySelectorAll('.ains-btn-mais').forEach(btn => {
            btn.addEventListener('click', () => {
                const rk = btn.getAttribute('data-rk');
                const atual = parseInt(S.contagem[rk], 10) || 0;
                S.contagem[rk] = atual + 1;
                S.conferidos[rk] = true;
                renderListaCards();
                atualizarResumoCabecalho();
            });
        });

        cont.querySelectorAll('.ains-qtd-input').forEach(inp => {
            inp.addEventListener('input', () => {
                const rk = inp.getAttribute('data-rk');
                const val = parseInt(inp.value, 10);
                S.contagem[rk] = isNaN(val) || val < 0 ? 0 : val;
                S.conferidos[rk] = true;
                atualizarResumoCabecalho();
            });
            inp.addEventListener('change', () => {
                renderListaCards();
                atualizarResumoCabecalho();
            });
        });

        cont.querySelectorAll('.ains-btn-ok-card').forEach(btn => {
            btn.addEventListener('click', () => {
                const rk = btn.getAttribute('data-rk');
                S.conferidos[rk] = !S.conferidos[rk];
                renderListaCards();
                atualizarResumoCabecalho();
            });
        });
    }

    async function salvarContagemInsumos() {
        if (S.salvando || S.itens.length === 0) return;
        const payloadItens = S.itens.map(it => ({
            estoque_id: it.estoque_id,
            saldo_id: it.saldo_id,
            endereco_id: it.endereco_id,
            tamanho: it.tamanho || '',
            nome: it.nome,
            quantidade: Math.max(0, parseInt(S.contagem[it.row_key], 10) || 0)
        }));

        const btn = document.getElementById('ains-btn-salvar-tudo');
        S.salvando = true;
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = `<i class="ph ph-spinner"></i><span>Salvando contagem...</span>`;
        }

        try {
            const r = await fetch((typeof API_URL !== 'undefined' ? API_URL : '/api') + '/app/lideranca/insumos/atualizar', {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + getToken(),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ itens: payloadItens })
            });
            const j = await r.json();
            if (!r.ok) throw new Error(j.error || 'Falha ao atualizar contagem de insumos');

            mostrarToastApp('Contagem de insumos atualizada com sucesso!', 'ok');
            await carregarDadosInsumos();
            if (typeof window.renderEstoqueTable === 'function') window.renderEstoqueTable();
        } catch (e) {
            mostrarToastApp(e.message || 'Erro ao salvar contagem', 'erro');
        } finally {
            S.salvando = false;
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = `<i class="ph-fill ph-check-circle" style="font-size:1.25rem;"></i><span>Salvar Contagem e Atualizar Sistema</span>`;
            }
        }
    }

    window.renderAppLiderancaInsumos = function () {
        carregarDadosInsumos();
    };
})();
