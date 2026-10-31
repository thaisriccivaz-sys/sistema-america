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
    window.TIPOS_PROPOSTA_SERVICO_OPCIONAL = ['EVENTO'];

    const tipoLimpo = (tipo) => {
        const raw = tipo !== undefined ? tipo : (document.getElementById('prop-tipo')?.value || '');
        return String(raw || '').trim().toUpperCase().replace(/^PROPOSTA\s+/i, '');
    };

    /* Serviço OBRIGATÓRIO somente em OBRA mensal/quinzenal/semanal */
    window.tipoPropostaServicoObrigatorio = function (tipo) {
        return window.TIPOS_PROPOSTA_COM_SERVICOS.includes(tipoLimpo(tipo));
    };

    /* O quadro de Serviços aparece em OBRA (obrigatório) e EVENTO (opcional) */
    window.tipoPropostaUsaServicos = function (tipo) {
        const t = tipoLimpo(tipo);
        return window.TIPOS_PROPOSTA_COM_SERVICOS.includes(t) || window.TIPOS_PROPOSTA_SERVICO_OPCIONAL.includes(t);
    };

    /* Frete FOB da proposta (dispensa o serviço obrigatório na obra). Persistido em propostas.servico_frete_fob */
    window.obterFreteFobPropostaObra = function () {
        if (!window.tipoPropostaUsaServicos()) return 0;
        const chk = !!document.getElementById('prop-serv-fob')?.checked;
        const emServico = (window._propServicosAdicionados || []).some(s => !!s.frete_fob);
        return (chk || emServico) ? 1 : 0;
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
            return acc + ((parseFloat(s.quantidade) || 0) * (parseFloat(s.valor ?? s.valor_unitario ?? 0) || 0));
        }, 0);
    };

    window.htmlBlocoServicosProposta = function (tipo) {
        const visivel = window.tipoPropostaUsaServicos(tipo);
        const obrigatorio = window.tipoPropostaServicoObrigatorio(tipo);
        const fobInicial = !!window._propFreteFobInicial && !(window._propServicosAdicionados || []).length;
        return `
        <div id="prop-wrapper-servicos" style="display:${visivel ? 'block' : 'none'}; background:#eff6ff; border:1px solid #bfdbfe; border-radius:9px; padding:0.6rem 0.9rem; margin-bottom:0.6rem;">
            <h4 style="margin:0 0 0.4rem; font-size:0.8rem; color:#475569; font-weight:700; display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
                <i class="ph ph-wrench" style="color:#7048e8;"></i> <span id="prop-servicos-titulo">${obrigatorio ? 'Serviços da Proposta *' : 'Serviços da Proposta'}</span>
                <span id="prop-servicos-hint" style="font-size:0.72rem; font-weight:500; color:#64748b;">${obrigatorio ? 'Obrigatório adicionar pelo menos 1 serviço (grupo SERVIÇOS) — ou marcar Frete FOB' : 'Opcional — não é obrigatório preencher (grupo SERVIÇOS)'}</span>
            </h4>

            <div style="display:grid; grid-template-columns:2fr 2.5fr 0.8fr auto; gap:0.5rem 0.75rem; align-items:flex-end; margin-bottom:0.55rem;">
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
                    <label class="prop-lbl">Quantidade</label>
                    <input type="number" id="prop-serv-qtd" value="1" min="1" oninput="window.recalcularPreviewServicoProposta('qtd')" style="${inputCss} height:28px;">
                </div>
                <div>
                    <button type="button" onclick="window.adicionarServicoProposta()"
                        style="background:#16a34a; color:#fff; border:none; border-radius:4px; padding:0 1.2rem; height:28px; font-size:0.76rem; font-weight:700; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; gap:4px; transition:background 0.15s;" onmouseover="this.style.background='#15803d'" onmouseout="this.style.background='#16a34a'">
                        <i class="ph ph-plus-circle" style="font-size:0.95rem;"></i> Adicionar
                    </button>
                </div>
            </div>

            <div style="display:grid; grid-template-columns:1fr 1fr 1.1fr 1.2fr 1.1fr; gap:0.5rem 0.75rem; align-items:flex-end; margin-bottom:0.65rem;">
                <div>
                    <label class="prop-lbl">Desconto (%)</label>
                    <input type="${fobInicial ? 'text' : 'number'}" id="prop-serv-desc-pct" value="${fobInicial ? 'FOB' : '0'}" ${fobInicial ? 'disabled' : 'min="0" max="100" step="0.01"'} oninput="window.recalcularPreviewServicoProposta('pct')" style="${inputCss}">
                </div>
                <div>
                    <label class="prop-lbl">Desconto (R$)</label>
                    <input type="${fobInicial ? 'text' : 'number'}" id="prop-serv-desc-rs" value="${fobInicial ? 'FOB' : '0'}" ${fobInicial ? 'disabled' : 'min="0" step="0.01"'} oninput="window.recalcularPreviewServicoProposta('rs')" style="${inputCss}">
                </div>
                <div>
                    <label class="prop-lbl" id="prop-serv-valor-lbl">${fobInicial ? 'Valor Unitário (R$) — FOB' : 'Valor Unitário (R$) *'}</label>
                    <input type="${fobInicial ? 'text' : 'number'}" id="prop-serv-valor" ${fobInicial ? 'disabled value="FOB"' : 'step="0.01" min="0" value="0" placeholder="0,00"'} oninput="window.recalcularPreviewServicoProposta('unit')"
                        style="${inputCss} font-weight:700; color:#0f172a; background:#fff;">
                </div>
                <div>
                    <label class="prop-lbl">Valor Total (R$)</label>
                    <input type="${fobInicial ? 'text' : 'number'}" id="prop-serv-total" ${fobInicial ? 'disabled value="FOB"' : 'value="0" min="0" step="0.01"'} oninput="window.recalcularPreviewServicoProposta('total')"
                        style="width:100%;padding:0.55rem;border:2px solid #7048e8;border-radius:6px;font-size:0.9rem;font-weight:800;color:#4c1d95;background:#fff;box-sizing:border-box;">
                </div>
                <div>
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
                            <th style="padding:10px 12px; font-weight:700; width:95px; text-align:center;">Quantidade</th>
                            <th style="padding:10px 12px; font-weight:700; width:130px; text-align:center;">Desconto</th>
                            <th style="padding:10px 12px; font-weight:700; width:125px; text-align:right;">Valor Unit.</th>
                            <th style="padding:10px 12px; font-weight:700; width:125px; text-align:right;">Valor Total</th>
                            <th style="padding:10px 12px; font-weight:700; width:70px; text-align:center;">Ações</th>
                        </tr>
                    </thead>
                    <tbody id="prop-servicos-tbody">
                        <tr><td colspan="7" style="text-align:center; color:#94a3b8; padding:1.5rem; font-size:0.85rem; font-style:italic;">Nenhum serviço adicionado à proposta.</td></tr>
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
        if (lbl) lbl.textContent = fob ? 'Valor Unitário (R$) — FOB' : (obrig ? 'Valor Unitário (R$) *' : 'Valor Unitário (R$)');
        const pctEl = document.getElementById('prop-serv-desc-pct');
        const rsEl = document.getElementById('prop-serv-desc-rs');
        const unitEl = document.getElementById('prop-serv-valor');
        const totalEl = document.getElementById('prop-serv-total');
        if (fob) {
            [pctEl, rsEl, unitEl, totalEl].forEach(el => {
                if (!el) return;
                el.type = 'text';
                el.value = 'FOB';
                el.disabled = true;
            });
        } else {
            if (pctEl) { pctEl.disabled = false; pctEl.type = 'number'; pctEl.value = '0'; }
            if (rsEl) { rsEl.disabled = false; rsEl.type = 'number'; rsEl.value = '0'; }
            if (unitEl) {
                const base = parseFloat(unitEl.getAttribute('data-preco-base')) || 0;
                unitEl.disabled = false;
                unitEl.type = 'number';
                unitEl.value = base > 0 ? base.toFixed(2) : '0';
                unitEl.setAttribute('data-desc-mode', '');
            }
            if (totalEl) {
                totalEl.disabled = false;
                totalEl.type = 'number';
                totalEl.value = '0';
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
            if (valEl) { valEl.setAttribute('data-preco-base', '0'); valEl.value = '0'; }
            window.recalcularPreviewServicoProposta('equip');
        }
    };

    window.recalcularPreviewServicoProposta = function (origem = '') {
        const qtdEl = document.getElementById('prop-serv-qtd');
        const pctEl = document.getElementById('prop-serv-desc-pct');
        const rsEl = document.getElementById('prop-serv-desc-rs');
        const unitEl = document.getElementById('prop-serv-valor');
        const totalEl = document.getElementById('prop-serv-total');
        if (!unitEl || !totalEl) return;
        if (document.getElementById('prop-serv-fob')?.checked) {
            [pctEl, rsEl, unitEl, totalEl].forEach(el => {
                if (!el) return;
                el.type = 'text';
                el.value = 'FOB';
                el.disabled = true;
            });
            return;
        }
        const qtd = Math.max(1, parseFloat(qtdEl?.value) || 1);

        if (origem === 'total') {
            const t = Math.max(0, parseFloat(totalEl.value) || 0);
            const u = t / qtd;
            unitEl.value = u.toFixed(2);
            unitEl.setAttribute('data-preco-base', String(u));
            unitEl.setAttribute('data-desc-mode', '');
            if (pctEl) pctEl.value = '0';
            if (rsEl) rsEl.value = '0';
            return;
        }
        if (origem === 'unit') {
            const u = Math.max(0, parseFloat(unitEl.value) || 0);
            unitEl.setAttribute('data-preco-base', String(u));
            unitEl.setAttribute('data-desc-mode', '');
            if (pctEl) pctEl.value = '0';
            if (rsEl) rsEl.value = '0';
            totalEl.value = (u * qtd).toFixed(2);
            return;
        }
        if (origem === 'pct') {
            unitEl.setAttribute('data-desc-mode', 'pct');
            if (rsEl && parseFloat(rsEl.value) > 0) rsEl.value = '0';
        } else if (origem === 'rs') {
            unitEl.setAttribute('data-desc-mode', 'rs');
            if (pctEl && parseFloat(pctEl.value) > 0) pctEl.value = '0';
        }

        const baseAttr = unitEl.getAttribute('data-preco-base');
        const baseParsed = (baseAttr !== null && baseAttr !== '') ? parseFloat(baseAttr) : NaN;
        const base = Math.max(0, !isNaN(baseParsed) && baseParsed > 0 ? baseParsed : (parseFloat(unitEl.value) || 0));
        const bruto = base * qtd;
        const modo = unitEl.getAttribute('data-desc-mode') || (parseFloat(pctEl?.value) > 0 ? 'pct' : (parseFloat(rsEl?.value) > 0 ? 'rs' : ''));
        let unitLiq = base;
        let totalLiq = bruto;
        if (modo === 'pct' && parseFloat(pctEl?.value) > 0) {
            const pct = Math.min(100, Math.max(0, parseFloat(pctEl.value) || 0));
            const descRs = bruto * (pct / 100);
            totalLiq = Math.max(0, bruto - descRs);
            unitLiq = Math.max(0, base * (1 - pct / 100));
            if (rsEl) rsEl.value = descRs.toFixed(2);
        } else if (modo === 'rs' && parseFloat(rsEl?.value) > 0) {
            const descRs = Math.max(0, parseFloat(rsEl.value) || 0);
            totalLiq = Math.max(0, bruto - descRs);
            unitLiq = qtd > 0 ? totalLiq / qtd : 0;
        }
        unitEl.value = unitLiq.toFixed(2);
        totalEl.value = totalLiq.toFixed(2);
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
        const base = (valor !== null && valor !== undefined && !isNaN(valor)) ? Number(valor) : 0;
        const fobAtivo = !!document.getElementById('prop-serv-fob')?.checked;
        if (valEl) {
            valEl.setAttribute('data-preco-base', String(base));
            if (!fobAtivo) valEl.value = base.toFixed(2);
            valEl.setAttribute('data-desc-mode', '');
        }
        if (!fobAtivo) {
            const pctEl = document.getElementById('prop-serv-desc-pct'); if (pctEl) pctEl.value = '0';
            const rsEl = document.getElementById('prop-serv-desc-rs'); if (rsEl) rsEl.value = '0';
        }
        window.recalcularPreviewServicoProposta('equip');
        if (typeof Swal !== 'undefined') Swal.close();
    };

    window.adicionarServicoProposta = function () {
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

        const qtd = parseInt(document.getElementById('prop-serv-qtd')?.value, 10) || 0;
        if (qtd <= 0) { alert('A quantidade deve ser maior que zero.'); return; }

        const unitEl = document.getElementById('prop-serv-valor');
        const totalEl = document.getElementById('prop-serv-total');
        const pctEl = document.getElementById('prop-serv-desc-pct');
        const rsEl = document.getElementById('prop-serv-desc-rs');
        const fob = !!document.getElementById('prop-serv-fob')?.checked;

        let unit = fob ? 0 : parseFloat(unitEl?.value); if (isNaN(unit)) unit = 0;
        let total = fob ? 0 : parseFloat(totalEl?.value); if (isNaN(total)) total = 0;
        if (!fob) {
            if (unit <= 0 && total > 0) unit = total / qtd;
            if (total <= 0 && unit > 0) total = unit * qtd;
        }

        if (!fob && total <= 0 && window.tipoPropostaServicoObrigatorio()) {
            alert('Informe o valor do serviço ou marque a opção Frete FOB (valor do frete não obrigatório).');
            unitEl?.focus();
            return;
        }

        const baseAttr = parseFloat(unitEl?.getAttribute('data-preco-base'));
        const valorBase = fob ? 0 : ((!isNaN(baseAttr) && baseAttr > 0) ? baseAttr : unit);
        const modo = fob ? '' : (unitEl?.getAttribute('data-desc-mode') || '');
        const pct = fob ? 0 : Math.max(0, parseFloat(pctEl?.value) || 0);
        const rs = fob ? 0 : Math.max(0, parseFloat(rsEl?.value) || 0);
        let descontoTipo = '';
        if (!fob) {
            if (modo === 'pct' && pct > 0) descontoTipo = 'pct';
            else if (rs > 0) descontoTipo = 'valor';
        }

        if (!window._propServicosAdicionados) window._propServicosAdicionados = [];
        window._propServicosAdicionados.push({
            codigo: codigo || '—',
            servico: nome,
            descricao: nome,
            observacao: (document.getElementById('prop-serv-obs')?.value || '').trim(),
            quantidade: qtd,
            frete_fob: fob,
            valor_base: valorBase,
            desconto_tipo: descontoTipo,
            desconto_pct: descontoTipo === 'pct' ? pct : 0,
            desconto_rs: descontoTipo === 'valor' ? rs : (descontoTipo === 'pct' ? (valorBase * qtd * pct / 100) : 0),
            valor: fob ? 0 : unit,
            valor_unitario: fob ? 0 : unit,
            valor_total: fob ? 0 : total
        });

        inp.value = '';
        inp.removeAttribute('data-codigo');
        inp.removeAttribute('data-nome');
        const obsEl = document.getElementById('prop-serv-obs'); if (obsEl) obsEl.value = '';
        const qEl = document.getElementById('prop-serv-qtd'); if (qEl) qEl.value = '1';
        if (pctEl) pctEl.value = '0';
        if (rsEl) rsEl.value = '0';
        if (unitEl) { unitEl.value = '0'; unitEl.removeAttribute('data-preco-base'); unitEl.removeAttribute('data-desc-mode'); }
        if (totalEl) totalEl.value = '0';
        const fobEl = document.getElementById('prop-serv-fob'); if (fobEl) fobEl.checked = false;
        window.alternarFreteFobServicoProposta();

        if (typeof window.marcarPropostaComoEditada === 'function') window.marcarPropostaComoEditada();
        window.renderizarServicosPropostaGrid();
    };

    window.atualizarItemServicoProposta = function (idx, campo, valorNovo) {
        const item = (window._propServicosAdicionados || [])[idx];
        if (!item) return;
        if (campo === 'quantidade') {
            const qtd = Math.max(1, parseInt(valorNovo, 10) || 1);
            item.quantidade = qtd;
            if (item.frete_fob) {
                item.valor = 0;
                item.valor_unitario = 0;
                item.valor_total = 0;
            } else {
                const vBase = parseFloat(item.valor_base ?? item.valor ?? item.valor_unitario ?? 0) || 0;
                if (item.desconto_tipo === 'pct' && parseFloat(item.desconto_pct) > 0) {
                    const pct = parseFloat(item.desconto_pct) || 0;
                    item.valor = Math.max(0, vBase * (1 - pct / 100));
                    item.valor_unitario = item.valor;
                    item.valor_total = item.valor * qtd;
                    item.desconto_rs = (vBase * qtd) * (pct / 100);
                } else if (item.desconto_tipo === 'valor' && parseFloat(item.desconto_rs) > 0) {
                    const rs = parseFloat(item.desconto_rs) || 0;
                    item.valor_total = Math.max(0, (vBase * qtd) - rs);
                    item.valor = item.valor_total / qtd;
                    item.valor_unitario = item.valor;
                } else {
                    item.valor_total = (parseFloat(item.valor ?? item.valor_unitario ?? 0) || 0) * qtd;
                }
            }
        } else if (campo === 'valor') {
            if (item.frete_fob) return;
            const vNovo = Math.max(0, parseFloat(valorNovo) || 0);
            const qtd = Math.max(1, parseInt(item.quantidade, 10) || 1);
            item.valor = vNovo;
            item.valor_unitario = vNovo;
            item.valor_base = vNovo;
            item.desconto_tipo = '';
            item.desconto_pct = 0;
            item.desconto_rs = 0;
            item.valor_total = vNovo * qtd;
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
        window.renderizarServicosPropostaGrid();
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
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:#94a3b8; padding:1.5rem; font-size:0.85rem; font-style:italic;">Nenhum serviço adicionado à proposta.</td></tr>';
            return;
        }
        const linhas = lista.map((s, idx) => {
            const nome = String(s.servico || s.descricao || '').replace(/^\d+\s*-\s*/, '').trim();
            const qtd = parseInt(s.quantidade, 10) || 1;
            const isFob = !!s.frete_fob;
            const vUnit = isFob ? 0 : (parseFloat(s.valor ?? s.valor_unitario ?? 0) || 0);
            const subtotal = isFob ? 0 : ((s.valor_total !== undefined && !isNaN(parseFloat(s.valor_total))) ? parseFloat(s.valor_total) : qtd * vUnit);
            let descHtml = '<span style="color:#94a3b8;">—</span>';
            if (isFob) {
                descHtml = '<span style="background:#fffbeb; color:#b45309; border:1px solid #fde68a; padding:2px 8px; border-radius:999px; font-weight:800; font-size:0.75rem;">FOB</span>';
            } else if (s.desconto_tipo === 'pct' && parseFloat(s.desconto_pct) > 0) {
                descHtml = `<span style="background:#fef3c7; color:#b45309; border:1px solid #fde68a; padding:2px 8px; border-radius:999px; font-weight:700; font-size:0.75rem;">${Number(s.desconto_pct).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%</span>`;
            } else if (parseFloat(s.desconto_rs) > 0) {
                descHtml = `<span style="background:#dcfce7; color:#15803d; border:1px solid #bbf7d0; padding:2px 8px; border-radius:999px; font-weight:700; font-size:0.75rem;">R$ ${fmtBRL(s.desconto_rs)}</span>`;
            }
            return `
            <tr style="border-bottom:1px solid #e2e8f0;">
                <td style="padding:8px 10px; font-weight:600; color:#1e293b;">
                    <div>${esc(nome)} ${isFob ? '<span style="background:#fffbeb; color:#b45309; border:1px solid #fde68a; padding:1px 7px; border-radius:999px; font-size:0.68rem; font-weight:800; margin-left:4px;">FOB</span>' : ''}</div>
                    <label style="display:inline-flex; align-items:center; gap:4px; font-size:0.7rem; color:#64748b; font-weight:600; margin-top:3px; cursor:pointer;">
                        <input type="checkbox" ${isFob ? 'checked' : ''} onchange="window.atualizarItemServicoProposta(${idx}, 'frete_fob', this.checked)" style="width:auto; margin:0;"> Frete FOB
                    </label>
                </td>
                <td style="padding:8px 10px;">
                    <input type="text" value="${esc(s.observacao || '')}" onchange="window.atualizarItemServicoProposta(${idx}, 'observacao', this.value)" placeholder="Observação..."
                        style="width:100%; padding:4px 8px; border:1px solid #cbd5e1; border-radius:5px; font-size:0.8rem; box-sizing:border-box;">
                </td>
                <td style="padding:8px 10px; text-align:center;">
                    <input type="number" min="1" value="${qtd}" onchange="window.atualizarItemServicoProposta(${idx}, 'quantidade', this.value)"
                        style="width:72px; padding:4px 6px; border:1px solid #cbd5e1; border-radius:5px; font-size:0.8rem; text-align:center; font-weight:700;">
                </td>
                <td style="padding:8px 10px; text-align:center;">${descHtml}</td>
                <td style="padding:8px 10px; text-align:right;">
                    ${isFob
                        ? '<input type="text" value="FOB" disabled style="width:105px; padding:4px 6px; border:1px solid #fde68a; background:#fffbeb; border-radius:5px; font-size:0.8rem; text-align:right; font-weight:800; color:#b45309; cursor:not-allowed;">'
                        : `<input type="number" step="0.01" min="0" value="${vUnit.toFixed(2)}" onchange="window.atualizarItemServicoProposta(${idx}, 'valor', this.value)" style="width:105px; padding:4px 6px; border:1px solid #cbd5e1; border-radius:5px; font-size:0.8rem; text-align:right; font-weight:700; color:#0f172a;">`
                    }
                </td>
                <td style="padding:8px 10px; font-weight:800; color:${isFob ? '#b45309' : '#16a34a'}; text-align:right; white-space:nowrap;">${isFob ? 'FOB' : 'R$ ' + fmtBRL(subtotal)}</td>
                <td style="padding:8px 10px; text-align:center;">
                    <button type="button" onclick="window.removerServicoProposta(${idx})" title="Remover Serviço"
                        style="background:#fee2e2; color:#ef4444; border:none; width:28px; height:28px; border-radius:6px; cursor:pointer; display:inline-flex; align-items:center; justify-content:center;">
                        <i class="ph ph-trash" style="font-size:0.95rem;"></i>
                    </button>
                </td>
            </tr>`;
        }).join('');
        tbody.innerHTML = linhas + `
            <tr style="background:#f8fafc; border-top:2px solid #cbd5e1;">
                <td colspan="5" style="padding:8px 12px; text-align:right; font-weight:800; color:#334155; font-size:0.82rem; text-transform:uppercase;">Valor Total dos Serviços:</td>
                <td style="padding:8px 10px; font-weight:800; color:#4c1d95; text-align:right; white-space:nowrap; font-size:0.88rem;">R$ ${fmtBRL(window._somaServicosProposta())}</td>
                <td></td>
            </tr>`;
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
