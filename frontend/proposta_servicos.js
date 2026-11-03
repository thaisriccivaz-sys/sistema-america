/* ══════════════════════════════════════════════════════════════════════
   SERVIÇOS DA PROPOSTA — obrigatório nas propostas OBRA MENSAL / QUINZENAL / SEMANAL
   - Apenas equipamentos do grupo SERVIÇOS aparecem aqui (e não na seleção de produtos)
   - Cada serviço: valor unitário, desconto em % ou R$, observação e opção Frete FOB
   - Itens ficam em window._propServicosAdicionados e são salvos em propostas.itens_servicos
   ══════════════════════════════════════════════════════════════════════ */
(function () {
    const esc = (s) => String(s === undefined || s === null ? '' : s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    const norm = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
    const fmtBRL = (n) => Number(n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const inputCss = 'width:100%;padding:0.55rem;border:1px solid #cbd5e1;border-radius:6px;font-size:0.85rem;box-sizing:border-box;background:#fff;';

    window.TIPOS_PROPOSTA_COM_SERVICOS = ['OBRA MENSAL', 'OBRA QUINZENAL', 'OBRA SEMANAL'];
    window.TIPOS_PROPOSTA_SERVICO_OPCIONAL = [];

    const tipoLimpo = (tipo) => {
        if (typeof window.obterTipoEfetivoProposta === 'function') {
            return window.obterTipoEfetivoProposta(tipo);
        }
        const raw = tipo !== undefined ? tipo : (document.getElementById('prop-tipo')?.value || '');
        return String(raw || '').trim().toUpperCase().replace(/^PROPOSTA\s+/i, '');
    };

    /* Serviço OBRIGATÓRIO somente em OBRA mensal/quinzenal/semanal (inclusive Aditivo de Obra) */
    window.tipoPropostaServicoObrigatorio = function (tipo) {
        return window.TIPOS_PROPOSTA_COM_SERVICOS.includes(tipoLimpo(tipo));
    };

    /* O quadro de Serviços aparece somente em OBRA (não aparece em EVENTO nem EQUIPAMENTOS) */
    window.tipoPropostaUsaServicos = function (tipo) {
        const t = tipoLimpo(tipo);
        return window.TIPOS_PROPOSTA_COM_SERVICOS.includes(t) || window.TIPOS_PROPOSTA_SERVICO_OPCIONAL.includes(t);
    };

    /* A opção de Frete FOB apenas deve aparecer nos serviços do tipo mobilização ou desmobilização
       com todos os códigos no final ZC, ZV ou ZA (ex: MOBILIZAÇÃO ZC, DESMOBILIZAÇÃO O02XZV, etc.) */
    window.servicoPermiteFreteFob = function (nomeServico, codigoServico) {
        const s = norm(String(nomeServico || '').trim());
        const c = norm(String(codigoServico || '').trim());
        const combinado = (s + ' ' + c).trim();
        if (!/(des)?mobilizac/.test(combinado)) return false;
        return /z[cva]\s*$/i.test(s) || /z[cva]\s*$/i.test(c);
    };

    window.atualizarVisibilidadeFobServicoInput = function () {
        const inp = document.getElementById('prop-serv-codigo');
        const nomeAtual = (inp?.getAttribute('data-nome') || inp?.value || '').trim();
        const codAtual = (inp?.getAttribute('data-codigo') || '').trim();
        const permite = window.servicoPermiteFreteFob(nomeAtual, codAtual);
        const wrapFob = document.getElementById('prop-serv-fob-wrap');
        const gridVal = document.getElementById('prop-serv-valores-grid');
        const chkFob = document.getElementById('prop-serv-fob');
        if (wrapFob) wrapFob.style.display = permite ? 'block' : 'none';
        if (gridVal) {
            gridVal.style.gridTemplateColumns = permite ? '1fr 1fr 1.2fr 1.1fr' : '1fr 1fr 1.2fr';
        }
        if (!permite && chkFob && chkFob.checked) {
            chkFob.checked = false;
            window.alternarFreteFobServicoProposta();
        }
    };

    /* Frete FOB da proposta (dispensa o serviço obrigatório na obra). Persistido em propostas.servico_frete_fob */
    window.obterFreteFobPropostaObra = function () {
        if (!window.tipoPropostaUsaServicos()) return 0;
        const emServico = (window._propServicosAdicionados || []).some(s => !!s.frete_fob && window.servicoPermiteFreteFob(s.servico || s.descricao, s.codigo));
        return emServico ? 1 : 0;
    };

    window._atualizarTituloServicosProposta = function (tipo) {
        const obrig = window.tipoPropostaServicoObrigatorio(tipo);
        const tit = document.getElementById('prop-servicos-titulo');
        const hint = document.getElementById('prop-servicos-hint');
        if (tit) tit.textContent = obrig ? 'Serviços da Proposta *' : 'Serviços da Proposta';
        if (hint) hint.textContent = obrig
            ? 'Obrigatório adicionar pelo menos 1 serviço (grupo SERVIÇOS) — ou marcar Frete FOB'
            : 'Opcional — não é obrigatório preencher (grupo SERVIÇOS)';
        window.alternarFreteFobServicoProposta();
    };

    window._parseServicosProposta = function (raw) {
        if (!raw) return [];
        if (Array.isArray(raw)) return raw;
        try {
            const arr = JSON.parse(raw);
            return Array.isArray(arr) ? arr : [];
        } catch (e) {
            return [];
        }
    };

    window._somaServicosProposta = function () {
        return (window._propServicosAdicionados || []).reduce((acc, s) => {
            if (s.frete_fob) return acc;
            if (s.valor_total !== undefined && !isNaN(parseFloat(s.valor_total))) return acc + parseFloat(s.valor_total);
            return acc + (parseFloat(s.valor ?? s.valor_unitario ?? 0) || 0);
        }, 0);
    };

    window.htmlBlocoServicosProposta = function (tipo) {
        const visivel = window.tipoPropostaUsaServicos(tipo);
        const obrigatorio = window.tipoPropostaServicoObrigatorio(tipo);
        const fobInicial = false;
        return `
        <div id="prop-wrapper-servicos" style="display:${visivel ? 'block' : 'none'}; background:#eff6ff; border:1px solid #bfdbfe; border-radius:9px; padding:0.6rem 0.9rem; margin-bottom:0.6rem;">
            <h4 style="margin:0 0 0.4rem; font-size:0.8rem; color:#475569; font-weight:700; display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
                <i class="ph ph-wrench" style="color:#7048e8;"></i> <span id="prop-servicos-titulo">${obrigatorio ? 'Serviços da Proposta *' : 'Serviços da Proposta'}</span>
                <span id="prop-servicos-hint" style="font-size:0.72rem; font-weight:500; color:#64748b;">${obrigatorio ? 'Obrigatório adicionar pelo menos 1 serviço (grupo SERVIÇOS) — ou marcar Frete FOB' : 'Opcional — não é obrigatório preencher (grupo SERVIÇOS)'}</span>
            </h4>

            <div style="display:grid; grid-template-columns:2fr 2.8fr auto; gap:0.5rem 0.75rem; align-items:flex-end; margin-bottom:0.55rem;">
                <div>
                    <label class="prop-lbl">Serviço</label>
                    <div style="display:flex; gap:0.25rem; align-items:center;">
                        <input type="text" id="prop-serv-codigo" placeholder="Digite o código ou nome do serviço..."
                            oninput="window.onInputServicoPropostaTexto()"
                            onkeydown="if(event.key==='Enter'){ event.preventDefault(); event.stopPropagation(); window.pesquisarOuAbrirBuscaServicoProposta(); }"
                            style="width:100%; padding:0.55rem; border:1px solid #cbd5e1; border-radius:6px; font-size:0.85rem; box-sizing:border-box; height:28px; background:#fff;">
                        <button type="button" id="btn-pesq-servico-prop" onclick="window.pesquisarOuAbrirBuscaServicoProposta()" title="Pesquisar Serviço"
                            style="background:#2563eb; border:none; border-radius:4px; width:28px; height:28px; display:inline-flex; align-items:center; justify-content:center; cursor:pointer; color:#fff; flex-shrink:0; transition:background 0.15s;" onmouseover="this.style.background='#1d4ed8'" onmouseout="this.style.background='#2563eb'">
                            <i class="ph ph-magnifying-glass" style="font-size:0.95rem; font-weight:700;"></i>
                        </button>
                    </div>
                </div>
                <div>
                    <label class="prop-lbl">Observação</label>
                    <input type="text" id="prop-serv-obs" placeholder="Observação do serviço..." style="${inputCss} height:28px;">
                </div>
                <div>
                    <button type="button" onclick="window.adicionarServicoProposta()"
                        style="background:#16a34a; color:#fff; border:none; border-radius:4px; padding:0 1.2rem; height:28px; font-size:0.76rem; font-weight:700; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; gap:4px; transition:background 0.15s;" onmouseover="this.style.background='#15803d'" onmouseout="this.style.background='#16a34a'">
                        <i class="ph ph-plus-circle" style="font-size:0.95rem;"></i> Adicionar
                    </button>
                </div>
            </div>

            <div id="prop-serv-valores-grid" style="display:grid; grid-template-columns:1fr 1fr 1.2fr; gap:0.5rem 0.75rem; align-items:flex-end; margin-bottom:0.65rem;">
                <div>
                    <label class="prop-lbl">Desconto (%)</label>
                    <input type="${fobInicial ? 'text' : 'number'}" id="prop-serv-desc-pct" value="${fobInicial ? 'FOB' : '0'}" ${fobInicial ? 'disabled' : 'min="0" max="100" step="0.01"'} oninput="window.recalcularPreviewServicoProposta('pct')" style="${inputCss}">
                </div>
                <div>
                    <label class="prop-lbl">Desconto (R$)</label>
                    <input type="text" inputmode="numeric" id="prop-serv-desc-rs" value="${fobInicial ? 'FOB' : '0,00'}" ${fobInicial ? 'disabled' : 'placeholder="0,00"'}
                        onfocus="if(typeof window.posicionarCursorFimMoeda==='function') window.posicionarCursorFimMoeda(this);"
                        onclick="if(typeof window.posicionarCursorFimMoeda==='function') window.posicionarCursorFimMoeda(this);"
                        oninput="if(typeof window.aplicarMascaraCentavosInput==='function') window.aplicarMascaraCentavosInput(this); window.recalcularPreviewServicoProposta('rs')"
                        style="${inputCss}">
                </div>
                <div>
                    <label class="prop-lbl" id="prop-serv-valor-lbl">${fobInicial ? 'Valor (R$) — FOB' : 'Valor (R$) *'}</label>
                    <input type="text" inputmode="numeric" id="prop-serv-valor" ${fobInicial ? 'disabled value="FOB"' : 'value="0,00" placeholder="0,00"'}
                        onfocus="if(typeof window.posicionarCursorFimMoeda==='function') window.posicionarCursorFimMoeda(this);"
                        onclick="if(typeof window.posicionarCursorFimMoeda==='function') window.posicionarCursorFimMoeda(this);"
                        oninput="if(typeof window.aplicarMascaraCentavosInput==='function') window.aplicarMascaraCentavosInput(this); window.recalcularPreviewServicoProposta('unit')"
                        style="${inputCss} font-weight:700; color:#0f172a; background:#fff;">
                </div>
                <div id="prop-serv-fob-wrap" style="display:none;">
                    <label class="prop-lbl" style="display:block;">Frete</label>
                    <label style="display:flex !important; align-items:center !important; justify-content:center; gap:8px; height:36px; box-sizing:border-box; margin:0; padding:0 0.6rem; border:1px solid #fde68a; background:#fffbeb; border-radius:6px; cursor:pointer; font-size:0.8rem; font-weight:700; color:#b45309; line-height:1;">
                        <input type="checkbox" id="prop-serv-fob" ${fobInicial ? 'checked' : ''} onchange="window.alternarFreteFobServicoProposta()" style="width:15px; height:15px; margin:0; padding:0; flex:none; align-self:center;">
                        <span style="display:inline-block; line-height:1; margin:0; padding:0;">Frete FOB</span>
                    </label>
                </div>
            </div>

            <div style="border:1px solid #e2e8f0; border-radius:8px; background:#fff; overflow:hidden;">
                <table style="width:100%; border-collapse:collapse; font-size:0.82rem; text-align:left;">
                    <thead>
                        <tr style="background:#f8fafc; border-bottom:2px solid #cbd5e1; color:#475569; font-size:0.72rem; text-transform:uppercase; letter-spacing:0.03em;">
                            <th style="padding:10px 12px; font-weight:700;">Serviço</th>
                            <th style="padding:10px 12px; font-weight:700;">Observação</th>
                            <th style="padding:10px 12px; font-weight:700; width:130px; text-align:center;">Desconto</th>
                            <th style="padding:10px 12px; font-weight:700; width:135px; text-align:right;">Valor</th>
                            <th style="padding:10px 12px; font-weight:700; width:70px; text-align:center;">Ações</th>
                        </tr>
                    </thead>
                    <tbody id="prop-servicos-tbody">
                        <tr><td colspan="5" style="text-align:center; color:#94a3b8; padding:1.5rem; font-size:0.85rem; font-style:italic;">Nenhum serviço adicionado à proposta.</td></tr>
                    </tbody>
                </table>
            </div>
        </div>`;
    };

    window.atualizarVisibilidadeServicosProposta = function (tipo) {
        const wrap = document.getElementById('prop-wrapper-servicos');
        const usa = window.tipoPropostaUsaServicos(tipo);
        if (!usa) {
            if (wrap) wrap.style.display = 'none';
            window._propServicosAdicionados = [];
        } else if (wrap) {
            wrap.style.display = 'block';
        }
        window._atualizarTituloServicosProposta(tipo);
        if (typeof window.atualizarVisibilidadeManutencoesProposta === 'function') {
            window.atualizarVisibilidadeManutencoesProposta(tipo);
        }
        window.renderizarServicosPropostaGrid();
    };

    window.alternarFreteFobServicoProposta = function () {
        const fob = !!document.getElementById('prop-serv-fob')?.checked;
        const lbl = document.getElementById('prop-serv-valor-lbl');
        const obrig = window.tipoPropostaServicoObrigatorio();
        if (lbl) lbl.textContent = fob ? 'Valor (R$) — FOB' : (obrig ? 'Valor (R$) *' : 'Valor (R$)');
        const pctEl = document.getElementById('prop-serv-desc-pct');
        const rsEl = document.getElementById('prop-serv-desc-rs');
        const unitEl = document.getElementById('prop-serv-valor');
        const fmtM = typeof window.formatarMoedaCentavosProposta === 'function'
            ? window.formatarMoedaCentavosProposta
            : (v => (Number(v) || 0).toFixed(2).replace('.', ','));
        if (fob) {
            [pctEl, rsEl, unitEl].forEach(el => {
                if (!el) return;
                el.type = 'text';
                el.value = 'FOB';
                el.disabled = true;
            });
        } else {
            if (pctEl) { pctEl.disabled = false; pctEl.type = 'number'; pctEl.value = '0'; }
            if (rsEl) { rsEl.disabled = false; rsEl.type = 'text'; rsEl.value = '0,00'; }
            if (unitEl) {
                const base = parseFloat(unitEl.getAttribute('data-preco-base')) || 0;
                unitEl.disabled = false;
                unitEl.type = 'text';
                unitEl.value = fmtM(base);
                unitEl.setAttribute('data-desc-mode', '');
            }
            window.recalcularPreviewServicoProposta('equip');
        }
    };

    window.onInputServicoPropostaTexto = async function () {
        const inp = document.getElementById('prop-serv-codigo');
        const valEl = document.getElementById('prop-serv-valor');
        if (!inp) return;
        const txt = inp.value.trim();
        if (!txt) {
            inp.removeAttribute('data-codigo');
            inp.removeAttribute('data-nome');
            if (valEl) { valEl.setAttribute('data-preco-base', '0'); valEl.value = '0,00'; }
            window.recalcularPreviewServicoProposta('equip');
        }
        window.atualizarVisibilidadeFobServicoInput();
    };

    window.recalcularPreviewServicoProposta = function (origem = '') {
        const pctEl = document.getElementById('prop-serv-desc-pct');
        const rsEl = document.getElementById('prop-serv-desc-rs');
        const unitEl = document.getElementById('prop-serv-valor');
        if (!unitEl) return;
        if (document.getElementById('prop-serv-fob')?.checked) {
            [pctEl, rsEl, unitEl].forEach(el => {
                if (!el) return;
                el.type = 'text';
                el.value = 'FOB';
                el.disabled = true;
            });
            return;
        }
        const parseM = typeof window.parseMoedaProposta === 'function'
            ? window.parseMoedaProposta
            : (v => parseFloat(String(v || '0').replace(/\./g, '').replace(',', '.')) || 0);
        const fmtM = typeof window.formatarMoedaCentavosProposta === 'function'
            ? window.formatarMoedaCentavosProposta
            : (v => (Number(v) || 0).toFixed(2).replace('.', ','));

        if (origem === 'unit' || origem === 'total') {
            const u = Math.max(0, parseM(unitEl.value));
            unitEl.setAttribute('data-preco-base', String(u));
            unitEl.setAttribute('data-desc-mode', '');
            if (pctEl) pctEl.value = '0';
            if (rsEl) rsEl.value = '0,00';
            return;
        }
        if (origem === 'pct') {
            unitEl.setAttribute('data-desc-mode', 'pct');
            if (rsEl && parseM(rsEl.value) > 0) rsEl.value = '0,00';
        } else if (origem === 'rs') {
            unitEl.setAttribute('data-desc-mode', 'rs');
            if (pctEl && parseFloat(pctEl.value) > 0) pctEl.value = '0';
        }

        const baseAttr = unitEl.getAttribute('data-preco-base');
        const baseParsed = (baseAttr !== null && baseAttr !== '') ? parseFloat(baseAttr) : NaN;
        const base = Math.max(0, !isNaN(baseParsed) && baseParsed > 0 ? baseParsed : parseM(unitEl.value));
        const rsVal = rsEl ? parseM(rsEl.value) : 0;
        const modo = unitEl.getAttribute('data-desc-mode') || (parseFloat(pctEl?.value) > 0 ? 'pct' : (rsVal > 0 ? 'rs' : ''));
        let unitLiq = base;
        if (modo === 'pct' && parseFloat(pctEl?.value) > 0) {
            const pct = Math.min(100, Math.max(0, parseFloat(pctEl.value) || 0));
            const descRs = base * (pct / 100);
            unitLiq = Math.max(0, base - descRs);
            if (rsEl) rsEl.value = fmtM(descRs);
        } else if (modo === 'rs' && rsVal > 0) {
            const descRs = Math.max(0, rsVal);
            unitLiq = Math.max(0, base - descRs);
        }
        unitEl.value = fmtM(unitLiq);
    };

    window._listarServicosEstoque = async function () {
        const [todos] = await Promise.all([
            apiGet('/estoque-equipamentos').catch(() => []),
            window._garantirTabelasPrecoCarregadas ? window._garantirTabelasPrecoCarregadas(false) : Promise.resolve()
        ]);
        const lista = Array.isArray(todos) ? todos : [];
        return lista.filter(p => {
            const g = norm(p.grupo_produto);
            return g === 'servicos' || g === 'servico';
        });
    };

    window._filtrarServicosPorTermo = function (lista, termo) {
        const q = norm(termo);
        if (!q) return lista;
        return lista.filter(p => {
            const cod = norm(p.codigo || p.id);
            const nome = norm(p.nome);
            return cod === q || cod.includes(q) || nome.includes(q) || norm(`${p.codigo || p.id} - ${p.nome || ''}`).includes(q);
        });
    };

    window.pesquisarOuAbrirBuscaServicoProposta = async function () {
        const inp = document.getElementById('prop-serv-codigo');
        const termo = (inp?.value || '').trim();
        const btn = document.getElementById('btn-pesq-servico-prop');
        const orig = btn ? btn.innerHTML : '';
        if (btn) { btn.innerHTML = '<i class="ph ph-spinner ph-spin" style="font-size:0.95rem;"></i>'; btn.disabled = true; }
        try {
            const [servicos] = await Promise.all([
                window._listarServicosEstoque(),
                typeof window.garantirRegiaoPropostaIdentificada === 'function' ? window.garantirRegiaoPropostaIdentificada() : Promise.resolve()
            ]);
            const tipoRef = document.getElementById('prop-tabela')?.value || document.getElementById('prop-tipo')?.value || '';
            if (termo) {
                const matches = window._filtrarServicosPorTermo(servicos, termo);
                if (matches.length === 1) {
                    const u = matches[0];
                    const v = window.obterValorTabelaPorTipoEProduto(tipoRef, u);
                    window.selecionarServicoBusca(String(u.codigo || u.id || ''), String(u.nome || ''), v);
                    return;
                }
            }
            window.abrirModalBuscaServicos(termo, servicos);
        } finally {
            if (btn) { btn.innerHTML = orig; btn.disabled = false; }
        }
    };

    window.abrirModalBuscaServicos = function (termoInicial, servicos) {
        const tipoRef = document.getElementById('prop-tabela')?.value || document.getElementById('prop-tipo')?.value || '';
        const rows = (lista) => {
            if (!lista.length) return '<tr><td colspan="4" style="text-align:center; color:#94a3b8; padding:1.5rem; font-size:0.85rem;">Nenhum serviço encontrado.</td></tr>';
            return lista.map(p => {
                const cod = String(p.codigo || p.id || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
                const nome = String(p.nome || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
                const v = window.obterValorTabelaPorTipoEProduto(tipoRef, p);
                const vStr = v !== null && v !== undefined ? `R$ ${fmtBRL(v)}` : '—';
                const vParam = v !== null && v !== undefined ? Number(v) : 'null';
                return `<tr class="${typeof window.classeDestaqueZona === 'function' ? window.classeDestaqueZona(p.nome, 0) : ''}" onclick="window.selecionarServicoBusca('${cod}', '${nome}', ${vParam})" style="cursor:pointer; border-bottom:1px solid #e2e8f0;" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background=''">
                    <td style="padding:10px 12px; font-weight:bold; color:#7048e8; text-align:center; white-space:nowrap;">${esc(p.codigo || p.id)}</td>
                    <td style="padding:10px 12px; font-weight:600; color:#1e293b;">${esc(p.nome || '—')}</td>
                    <td style="padding:10px 12px; font-weight:700; color:#16a34a; text-align:right; white-space:nowrap;">${vStr}</td>
                    <td style="padding:10px 12px; color:#475569; text-align:center;">${esc(p.unidade_medida || '—')}</td>
                </tr>`;
            }).join('');
        };
        Swal.fire({
            title: '',
            html: `
            <div style="text-align:left; font-family:'Inter', sans-serif;">
                <div style="font-size:1.05rem; font-weight:800; color:#1e293b; border-bottom:1px solid #e2e8f0; padding:14px 18px; background:#f8fafc;">
                    <i class="ph ph-wrench" style="color:#7048e8;"></i> Pesquisar Serviços
                    ${tipoRef ? `<span style="font-size:0.75rem; background:#ede9fe; color:#6d28d9; padding:2px 8px; border-radius:999px; margin-left:6px;">Tabela: ${esc(tipoRef)}</span>` : ''}
                </div>
                <div style="padding:14px 16px; background:#f1f5f9; display:flex; flex-direction:column; gap:10px;">
                    <input type="text" id="modal-serv-termo" value="${esc(termoInicial)}" placeholder="Digite o código ou nome do serviço..."
                        style="width:100%; padding:7px 10px; border:1px solid #cbd5e1; border-radius:6px; font-size:0.85rem; background:#fff; box-sizing:border-box; height:36px; outline:none;">
                    <div style="max-height:320px; overflow-y:auto; border:1px solid #e2e8f0; border-radius:8px; background:#fff;">
                        <table style="width:100%; border-collapse:collapse; font-size:0.82rem; text-align:left;">
                            <thead><tr style="background:#f8fafc; border-bottom:2px solid #cbd5e1; color:#475569; font-size:0.72rem; text-transform:uppercase;">
                                <th style="padding:10px 12px; width:85px; text-align:center; position:sticky; top:0; background:#f8fafc;">Código</th>
                                <th style="padding:10px 12px; position:sticky; top:0; background:#f8fafc;">Serviço</th>
                                <th style="padding:10px 12px; width:130px; text-align:right; position:sticky; top:0; background:#f8fafc;">Valor Tabela</th>
                                <th style="padding:10px 12px; width:90px; text-align:center; position:sticky; top:0; background:#f8fafc;">Unid.</th>
                            </tr></thead>
                            <tbody id="modal-serv-tbody"></tbody>
                        </table>
                    </div>
                    <div id="modal-serv-count" style="font-size:0.75rem; color:#475569; font-weight:700; text-align:right;"></div>
                </div>
            </div>`,
            showConfirmButton: false,
            showCloseButton: true,
            width: '820px',
            customClass: { popup: 'custom-swal-padding-zero' },
            didOpen: () => {
                const inp = document.getElementById('modal-serv-termo');
                const tbody = document.getElementById('modal-serv-tbody');
                const cnt = document.getElementById('modal-serv-count');
                const filtra = () => {
                    let f = window._filtrarServicosPorTermo(servicos, inp.value);
                    if (typeof window.ordenarPorDestaqueZona === 'function') f = window.ordenarPorDestaqueZona(f, 0);
                    tbody.innerHTML = rows(f);
                    cnt.textContent = `Total: ${f.length} serviço(s)`;
                };
                filtra();
                inp.addEventListener('input', filtra);
                inp.addEventListener('keydown', (ev) => {
                    if (ev.key === 'Enter') { ev.preventDefault(); const r = document.querySelector('#modal-serv-tbody tr[onclick]'); if (r) r.click(); }
                });
                setTimeout(() => inp.focus(), 40);
            }
        });
    };

    window.selecionarServicoBusca = function (cod, nome, valor) {
        const inp = document.getElementById('prop-serv-codigo');
        const valEl = document.getElementById('prop-serv-valor');
        const nomeLimpo = String(nome || '').replace(/^\d+\s*-\s*/, '').trim();
        if (inp) {
            inp.value = nomeLimpo || cod || '';
            inp.setAttribute('data-codigo', cod || '');
            inp.setAttribute('data-nome', nomeLimpo || nome || '');
        }
        window.atualizarVisibilidadeFobServicoInput();
        const base = (valor !== null && valor !== undefined && !isNaN(valor)) ? Number(valor) : 0;
        const fobAtivo = !!document.getElementById('prop-serv-fob')?.checked;
        const fmtM = typeof window.formatarMoedaCentavosProposta === 'function'
            ? window.formatarMoedaCentavosProposta
            : (v => (Number(v) || 0).toFixed(2).replace('.', ','));
        if (valEl) {
            valEl.setAttribute('data-preco-base', String(base));
            if (!fobAtivo) valEl.value = fmtM(base);
            valEl.setAttribute('data-desc-mode', '');
        }
        if (!fobAtivo) {
            const pctEl = document.getElementById('prop-serv-desc-pct'); if (pctEl) pctEl.value = '0';
            const rsEl = document.getElementById('prop-serv-desc-rs'); if (rsEl) rsEl.value = '0,00';
        }
        window.recalcularPreviewServicoProposta('equip');
        if (typeof Swal !== 'undefined') Swal.close();
    };

    window.adicionarServicoProposta = async function () {
        const inp = document.getElementById('prop-serv-codigo');
        const rawServ = (inp?.value || '').trim();
        if (!rawServ) { alert('Por favor, informe ou selecione o serviço.'); return; }

        let codigo = inp.getAttribute('data-codigo') || '';
        let nome = inp.getAttribute('data-nome') || '';
        if (!nome || !rawServ.includes(nome)) {
            if (rawServ.includes(' - ')) {
                const pts = rawServ.split(' - ');
                codigo = pts[0].trim();
                nome = pts.slice(1).join(' - ').trim();
            } else {
                nome = rawServ;
            }
        }
        nome = String(nome || '').replace(/^\d+\s*-\s*/, '').trim();

        const qtd = 1;

        const unitEl = document.getElementById('prop-serv-valor');
        const pctEl = document.getElementById('prop-serv-desc-pct');
        const rsEl = document.getElementById('prop-serv-desc-rs');
        const permiteFob = window.servicoPermiteFreteFob(nome, codigo);
        const fob = permiteFob && !!document.getElementById('prop-serv-fob')?.checked;
        const parseM = typeof window.parseMoedaProposta === 'function'
            ? window.parseMoedaProposta
            : (v => parseFloat(String(v || '0').replace(/\./g, '').replace(',', '.')) || 0);

        let unit = fob ? 0 : parseM(unitEl?.value); if (isNaN(unit)) unit = 0;
        let total = fob ? 0 : unit;

        if (!fob && total <= 0 && window.tipoPropostaServicoObrigatorio()) {
            alert(permiteFob
                ? 'Informe o valor do serviço ou marque a opção Frete FOB (valor do frete não obrigatório).'
                : 'Informe o valor do serviço.');
            unitEl?.focus();
            return;
        }

        const baseAttr = parseFloat(unitEl?.getAttribute('data-preco-base'));
        const valorBase = fob ? 0 : ((!isNaN(baseAttr) && baseAttr > 0) ? baseAttr : unit);
        const modo = fob ? '' : (unitEl?.getAttribute('data-desc-mode') || '');
        const pct = fob ? 0 : Math.max(0, parseFloat(pctEl?.value) || 0);
        const rs = fob ? 0 : Math.max(0, parseM(rsEl?.value));
        let descontoTipo = '';
        if (!fob) {
            if (modo === 'pct' && pct > 0) descontoTipo = 'pct';
            else if (rs > 0) descontoTipo = 'valor';
        }

        if (!fob && total <= 0) {
            let confirmarCortesia = false;
            if (typeof Swal !== 'undefined' && typeof Swal.fire === 'function') {
                const resCort = await Swal.fire({
                    icon: 'question',
                    title: 'Serviço Cortesia (R$ 0,00)',
                    text: 'Tem certeza que deseja adicionar o serviço cortesia?',
                    showCancelButton: true,
                    confirmButtonText: 'Sim, adicionar',
                    cancelButtonText: 'Cancelar',
                    confirmButtonColor: '#16a34a',
                    cancelButtonColor: '#64748b',
                    reverseButtons: true
                });
                confirmarCortesia = Boolean(resCort && resCort.isConfirmed);
            } else {
                confirmarCortesia = window.confirm('Tem certeza que deseja adicionar o serviço cortesia?');
            }
            if (!confirmarCortesia) return;
        }

        if (!window._propServicosAdicionados) window._propServicosAdicionados = [];
        window._propServicosAdicionados.push({
            codigo: codigo || '—',
            servico: nome,
            descricao: nome,
            observacao: (document.getElementById('prop-serv-obs')?.value || '').trim(),
            quantidade: 1,
            frete_fob: fob,
            valor_base: valorBase,
            desconto_tipo: descontoTipo,
            desconto_pct: descontoTipo === 'pct' ? pct : 0,
            desconto_rs: descontoTipo === 'valor' ? rs : (descontoTipo === 'pct' ? (valorBase * pct / 100) : 0),
            valor: fob ? 0 : unit,
            valor_unitario: fob ? 0 : unit,
            valor_total: fob ? 0 : total
        });

        inp.value = '';
        inp.removeAttribute('data-codigo');
        inp.removeAttribute('data-nome');
        const obsEl = document.getElementById('prop-serv-obs'); if (obsEl) obsEl.value = '';
        if (pctEl) pctEl.value = '0';
        if (rsEl) rsEl.value = '0,00';
        if (unitEl) { unitEl.value = '0,00'; unitEl.removeAttribute('data-preco-base'); unitEl.removeAttribute('data-desc-mode'); }
        const fobEl = document.getElementById('prop-serv-fob'); if (fobEl) fobEl.checked = false;
        window.alternarFreteFobServicoProposta();
        window.atualizarVisibilidadeFobServicoInput();

        if (typeof window.marcarPropostaComoEditada === 'function') window.marcarPropostaComoEditada();
        window.renderizarServicosPropostaGrid();
    };

    window.atualizarDescontoItemServicoProposta = function (idx, tipoNovo, valorNovo, reRender = true) {
        const item = (window._propServicosAdicionados || [])[idx];
        if (!item || item.frete_fob) return;
        const parseM = typeof window.parseMoedaProposta === 'function'
            ? window.parseMoedaProposta
            : (v => parseFloat(String(v || '0').replace(/\./g, '').replace(',', '.')) || 0);
        const fmtM = typeof window.formatarMoedaCentavosProposta === 'function'
            ? window.formatarMoedaCentavosProposta
            : (v => (Number(v) || 0).toFixed(2).replace('.', ','));
        const vUnitAtual = parseFloat(item.valor ?? item.valor_unitario ?? item.valor_total ?? 0) || 0;
        let vBase = parseFloat(item.valor_base);
        if (isNaN(vBase) || vBase <= 0) {
            if (item.desconto_tipo === 'pct' && parseFloat(item.desconto_pct) > 0 && parseFloat(item.desconto_pct) < 100) {
                vBase = vUnitAtual / (1 - (parseFloat(item.desconto_pct) / 100));
            } else if (parseFloat(item.desconto_rs) > 0) {
                vBase = vUnitAtual + parseFloat(item.desconto_rs);
            } else {
                vBase = vUnitAtual;
            }
            item.valor_base = vBase;
        }
        const tipo = (tipoNovo === 'pct' || tipoNovo === '%') ? 'pct' : 'valor';
        const val = tipo === 'pct'
            ? Math.max(0, parseFloat(String(valorNovo ?? '0').replace(',', '.')) || 0)
            : Math.max(0, parseM(valorNovo));
        if (val <= 0) {
            item.desconto_tipo = tipo;
            item.desconto_pct = 0;
            item.desconto_rs = 0;
            item.valor = vBase;
            item.valor_unitario = vBase;
            item.valor_total = vBase;
        } else if (tipo === 'pct') {
            const pct = Math.min(100, val);
            item.desconto_tipo = 'pct';
            item.desconto_pct = pct;
            item.valor = Math.max(0, vBase * (1 - pct / 100));
            item.valor_unitario = item.valor;
            item.valor_total = item.valor;
            item.desconto_rs = vBase * (pct / 100);
        } else {
            item.desconto_tipo = 'valor';
            item.desconto_rs = val;
            item.desconto_pct = 0;
            item.valor = Math.max(0, vBase - val);
            item.valor_unitario = item.valor;
            item.valor_total = item.valor;
        }
        if (typeof window.marcarPropostaComoEditada === 'function') window.marcarPropostaComoEditada();
        if (reRender) {
            window.renderizarServicosPropostaGrid();
        } else {
            const inpUnit = document.querySelector(`[data-serv-unit-input="${idx}"]`);
            if (inpUnit && document.activeElement !== inpUnit) {
                inpUnit.value = fmtM(item.valor);
            }
            if (typeof window.calcularValorTotalProposta === 'function') {
                try { window.calcularValorTotalProposta(); } catch (e) {}
            }
        }
    };

    window.atualizarItemServicoProposta = function (idx, campo, valorNovo, reRender = true) {
        const item = (window._propServicosAdicionados || [])[idx];
        if (!item) return;
        item.quantidade = 1;
        const parseM = typeof window.parseMoedaProposta === 'function'
            ? window.parseMoedaProposta
            : (v => parseFloat(String(v || '0').replace(/\./g, '').replace(',', '.')) || 0);
        if (campo === 'valor') {
            if (item.frete_fob) return;
            const vNovo = Math.max(0, parseM(valorNovo));
            item.valor = vNovo;
            item.valor_unitario = vNovo;
            item.valor_base = vNovo;
            item.desconto_tipo = '';
            item.desconto_pct = 0;
            item.desconto_rs = 0;
            item.valor_total = vNovo;
        } else if (campo === 'observacao') {
            item.observacao = String(valorNovo || '');
        } else if (campo === 'frete_fob') {
            item.frete_fob = !!valorNovo;
            if (item.frete_fob) {
                item.valor = 0;
                item.valor_unitario = 0;
                item.valor_base = 0;
                item.valor_total = 0;
                item.desconto_tipo = '';
                item.desconto_pct = 0;
                item.desconto_rs = 0;
            }
        }
        if (typeof window.marcarPropostaComoEditada === 'function') window.marcarPropostaComoEditada();
        if (reRender) {
            window.renderizarServicosPropostaGrid();
        } else if (typeof window.calcularValorTotalProposta === 'function') {
            try { window.calcularValorTotalProposta(); } catch (e) {}
        }
    };

    window.onInputDescontoRsItemServicoProposta = function (idx, inputEl) {
        if (typeof window.aplicarMascaraCentavosInput === 'function') window.aplicarMascaraCentavosInput(inputEl);
        window.atualizarDescontoItemServicoProposta(idx, 'valor', inputEl.value, false);
    };

    window.onInputValorItemServicoProposta = function (idx, inputEl) {
        if (typeof window.aplicarMascaraCentavosInput === 'function') window.aplicarMascaraCentavosInput(inputEl);
        window.atualizarItemServicoProposta(idx, 'valor', inputEl.value, false);
    };

    window.removerServicoProposta = function (idx) {
        if (window._propServicosAdicionados && window._propServicosAdicionados[idx]) {
            window._propServicosAdicionados.splice(idx, 1);
            if (typeof window.marcarPropostaComoEditada === 'function') window.marcarPropostaComoEditada();
            window.renderizarServicosPropostaGrid();
        }
    };

    window.renderizarServicosPropostaGrid = function () {
        const tbody = document.getElementById('prop-servicos-tbody');
        if (typeof window.calcularValorTotalProposta === 'function') {
            try { window.calcularValorTotalProposta(); } catch (e) {}
        }
        if (!tbody) return;
        const lista = window._propServicosAdicionados || [];
        if (lista.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#94a3b8; padding:1.5rem; font-size:0.85rem; font-style:italic;">Nenhum serviço adicionado à proposta.</td></tr>';
            return;
        }
        const fmtM = typeof window.formatarMoedaCentavosProposta === 'function'
            ? window.formatarMoedaCentavosProposta
            : (v => (Number(v) || 0).toFixed(2).replace('.', ','));
        const linhas = lista.map((s, idx) => {
            s.quantidade = 1;
            const nome = String(s.servico || s.descricao || '').replace(/^\d+\s*-\s*/, '').trim();
            const permiteFobItem = window.servicoPermiteFreteFob(nome, s.codigo);
            if (!permiteFobItem && s.frete_fob) s.frete_fob = false;
            const isFob = permiteFobItem && !!s.frete_fob;
            const vUnit = isFob ? 0 : (parseFloat(s.valor ?? s.valor_unitario ?? s.valor_total ?? 0) || 0);
            let descHtml = '<span style="color:#94a3b8;">—</span>';
            if (isFob) {
                descHtml = '<span style="background:#fffbeb; color:#b45309; border:1px solid #fde68a; padding:2px 8px; border-radius:999px; font-weight:800; font-size:0.75rem;">FOB</span>';
            } else {
                const descTipoAtual = s.desconto_tipo === 'pct' ? 'pct' : 'valor';
                const descValAtual = descTipoAtual === 'pct'
                    ? (parseFloat(s.desconto_pct) || 0)
                    : (parseFloat(s.desconto_rs) || 0);
                const temDescAtivo = descValAtual > 0;
                const descBg = !temDescAtivo ? '#f8fafc' : (descTipoAtual === 'pct' ? '#fef3c7' : '#dcfce7');
                const descBorder = !temDescAtivo ? '#cbd5e1' : (descTipoAtual === 'pct' ? '#fde68a' : '#bbf7d0');
                const descColor = !temDescAtivo ? '#334155' : (descTipoAtual === 'pct' ? '#b45309' : '#15803d');
                const inputDescServHtml = descTipoAtual === 'pct'
                    ? `<input type="number" step="0.01" min="0" max="100" value="${temDescAtivo ? Number(descValAtual.toFixed(2)) : ''}" placeholder="0"
                            onchange="window.atualizarDescontoItemServicoProposta(${idx}, 'pct', this.value)"
                            title="Editar desconto (%)"
                            style="width:72px; border:none; border-left:1px solid ${descBorder}; background:rgba(255,255,255,0.65); color:${descColor}; font-weight:700; font-size:0.78rem; padding:2px 6px; height:100%; text-align:right; outline:none; box-sizing:border-box;">`
                    : `<input type="text" inputmode="numeric" value="${fmtM(descValAtual)}" placeholder="0,00"
                            onfocus="if(typeof window.posicionarCursorFimMoeda==='function') window.posicionarCursorFimMoeda(this);"
                            onclick="if(typeof window.posicionarCursorFimMoeda==='function') window.posicionarCursorFimMoeda(this);"
                            oninput="window.onInputDescontoRsItemServicoProposta(${idx}, this)"
                            onchange="window.atualizarDescontoItemServicoProposta(${idx}, 'valor', this.value)"
                            title="Editar desconto (R$)"
                            style="width:76px; border:none; border-left:1px solid ${descBorder}; background:rgba(255,255,255,0.65); color:${descColor}; font-weight:700; font-size:0.78rem; padding:2px 6px; height:100%; text-align:right; outline:none; box-sizing:border-box;">`;
                descHtml = `
                    <div style="display:inline-flex; align-items:center; border:1px solid ${descBorder}; background:${descBg}; border-radius:6px; overflow:hidden; height:28px;">
                        <select onchange="window.atualizarDescontoItemServicoProposta(${idx}, this.value, this.value === 'pct' ? '0' : '0,00')"
                            title="Tipo de desconto (R$ ou %)"
                            style="border:none; background:transparent; color:${descColor}; font-weight:800; font-size:0.72rem; padding:0 4px 0 6px; height:100%; cursor:pointer; outline:none;">
                            <option value="valor" ${descTipoAtual === 'valor' ? 'selected' : ''}>R$</option>
                            <option value="pct" ${descTipoAtual === 'pct' ? 'selected' : ''}>%</option>
                        </select>
                        ${inputDescServHtml}
                    </div>
                `;
            }
            return `
            <tr style="border-bottom:1px solid #e2e8f0;">
                <td style="padding:8px 10px; font-weight:600; color:#1e293b;">
                    <div>${esc(nome)} ${isFob ? '<span style="background:#fffbeb; color:#b45309; border:1px solid #fde68a; padding:1px 7px; border-radius:999px; font-size:0.68rem; font-weight:800; margin-left:4px;">FOB</span>' : ''}</div>
                    ${permiteFobItem ? `<label style="display:inline-flex; align-items:center; gap:4px; font-size:0.7rem; color:#64748b; font-weight:600; margin-top:3px; cursor:pointer;">
                        <input type="checkbox" ${isFob ? 'checked' : ''} onchange="window.atualizarItemServicoProposta(${idx}, 'frete_fob', this.checked)" style="width:auto; margin:0;"> Frete FOB
                    </label>` : ''}
                </td>
                <td style="padding:8px 10px;">
                    <input type="text" value="${esc(s.observacao || '')}" onchange="window.atualizarItemServicoProposta(${idx}, 'observacao', this.value)" placeholder="Observação..."
                        style="width:100%; padding:4px 8px; border:1px solid #cbd5e1; border-radius:5px; font-size:0.8rem; box-sizing:border-box;">
                </td>
                <td style="padding:8px 10px; text-align:center;">${descHtml}</td>
                <td style="padding:8px 10px; text-align:right;">
                    ${isFob
                        ? '<input type="text" value="FOB" disabled style="width:115px; padding:4px 6px; border:1px solid #fde68a; background:#fffbeb; border-radius:5px; font-size:0.8rem; text-align:right; font-weight:800; color:#b45309; cursor:not-allowed;">'
                        : `<input type="text" inputmode="numeric" data-serv-unit-input="${idx}" value="${fmtM(vUnit)}"
                            onfocus="if(typeof window.posicionarCursorFimMoeda==='function') window.posicionarCursorFimMoeda(this);"
                            onclick="if(typeof window.posicionarCursorFimMoeda==='function') window.posicionarCursorFimMoeda(this);"
                            oninput="window.onInputValorItemServicoProposta(${idx}, this)"
                            onchange="window.atualizarItemServicoProposta(${idx}, 'valor', this.value)"
                            style="width:115px; padding:4px 6px; border:1px solid #cbd5e1; border-radius:5px; font-size:0.8rem; text-align:right; font-weight:700; color:#0f172a;">`
                    }
                </td>
                <td style="padding:8px 10px; text-align:center;">
                    <button type="button" onclick="window.removerServicoProposta(${idx})" title="Remover Serviço"
                        style="background:#fee2e2; color:#ef4444; border:none; width:28px; height:28px; border-radius:6px; cursor:pointer; display:inline-flex; align-items:center; justify-content:center;">
                        <i class="ph ph-trash" style="font-size:0.95rem;"></i>
                    </button>
                </td>
            </tr>`;
        }).join('');
        tbody.innerHTML = linhas;
    };

    /* Validação usada ao salvar/estornar. Retorna true se pode prosseguir. */
    window.validarServicosPropostaObra = function (tipo) {
        if (!window.tipoPropostaUsaServicos(tipo)) {
            window._propServicosAdicionados = [];
            return true;
        }
        // Serviço nunca é obrigatório em EVENTO (nem o valor: 0,00 vira CORTESIA)
        if (!window.tipoPropostaServicoObrigatorio(tipo)) return true;
        const lista = window._propServicosAdicionados || [];
        if (lista.length === 0) {
            // Com Frete FOB marcado, o serviço deixa de ser obrigatório na obra
            if (document.getElementById('prop-serv-fob')?.checked) return true;
            alert('Em propostas de obra (mensal, quinzenal ou semanal) é obrigatório adicionar pelo menos um Serviço (ou marcar Frete FOB).');
            document.getElementById('prop-serv-codigo')?.focus();
            return false;
        }
        const semValor = lista.find(s => !s.frete_fob && !(parseFloat(s.valor_total) > 0));
        if (semValor) {
            alert(`O serviço "${semValor.servico || semValor.descricao || ''}" está sem valor. Informe o valor ou marque Frete FOB.`);
            return false;
        }
        return true;
    };
})();
