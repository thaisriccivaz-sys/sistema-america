// =============================================
// DISSÍDIO - Reajuste de Salário em Massa por Cargo
// =============================================

(function() {
    'use strict';

    // ---- Render the main Dissídio view ----
    function renderDissidio() {
        const container = document.getElementById('dissidio-container');
        if (!container) return;

        container.innerHTML = `
            <div class="page-header flex-between" style="margin-bottom:0;">
                <h1 style="margin:0;font-size:1.6rem;font-weight:800;color:#0f172a;">Dissídio Coletivo</h1>
                <button onclick="window.showHistoryPopup()" style="background:#f1f5f9;color:#475569;border:1px solid #cbd5e1;padding:0.6rem 1.2rem;border-radius:8px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:0.5rem;font-size:0.9rem;" title="Histórico de Alterações">
                    <i class="ph ph-clock-counter-clockwise"></i> Histórico
                </button>
            </div>

            <!-- Formulário de Reajuste -->
            <div class="card" style="margin-top:1.5rem;border-radius:14px;padding:1.5rem;">
                <h2 class="section-title" style="margin:0 0 1.5rem 0;">Aplicar Reajuste de Salário</h2>
                
                <div style="display:flex;gap:1.25rem;align-items:end;flex-wrap:wrap;">

                    <div style="flex:1;min-width:200px;">
                        <label style="display:block;font-size:0.85rem;font-weight:600;color:#334155;margin-bottom:0.5rem;">Cargo</label>
                        <select id="dissidio-cargo-select" style="width:100%;padding:0.65rem 0.85rem;border:1.5px solid #e2e8f0;border-radius:8px;font-size:0.95rem;color:#0f172a;background:#fff;appearance:none;outline:none;" onchange="window.dissidioPreview()">
                            <option value="">Carregando cargos...</option>
                        </select>
                    </div>

                    <div style="flex:1;min-width:150px;">
                        <label style="display:block;font-size:0.85rem;font-weight:600;color:#334155;margin-bottom:0.5rem;">Novo Salário Bruto Final (R$)</label>
                        <input type="text" id="dissidio-novo-salario" placeholder="R$ 0,00" inputmode="numeric"
                            style="width:100%;padding:0.65rem 0.85rem;border:1.5px solid #e2e8f0;border-radius:8px;font-size:0.95rem;color:#0f172a;background:#fff;box-sizing:border-box;outline:none;"
                            oninput="window.dissidioFormatSalario(this); window.dissidioPreview()">
                    </div>

                    <div id="dissidio-preview-box" style="background:#f8fafc;border:1.5px dashed #cbd5e1;border-radius:8px;padding:0.65rem 0.85rem;min-height:43px;display:flex;align-items:center;gap:0.5rem;color:#64748b;font-size:0.9rem;flex:2;min-width:250px;">
                        <i class="ph ph-info" style="font-size:1.1rem;"></i>
                        <span id="dissidio-preview-text">Selecione um cargo e percentual para ver a prévia</span>
                    </div>

                    <button onclick="window.dissidioAplicar()" id="btn-dissidio-aplicar" class="btn btn-primary"
                        style="height:44px;display:flex;align-items:center;gap:6px;white-space:nowrap;padding:0 1.5rem;">
                        <i class="ph ph-check-circle"></i> Aplicar Dissídio
                    </button>
                </div>

                <div id="dissidio-affected-Preview" style="display:none;margin-top:1.5rem;">
                    <div style="background:#fdf9c4;border:1px solid #fde047;border-radius:8px;padding:1rem 1.25rem;">
                        <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.5rem;">
                            <i class="ph ph-warning" style="color:#ca8a04;font-size:1.2rem;"></i>
                            <strong style="color:#a16207;font-size:0.9rem;">Colaboradores que serão afetados:</strong>
                        </div>
                        <div id="dissidio-affected-list" style="font-size:0.85rem;color:#854d0e;line-height:1.8;"></div>
                    </div>
                </div>
            </div>

            <!-- Histórico de Dissídios -->
            <div class="card" style="margin-top:1.5rem;border-radius:14px;padding:1.5rem;">
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.5rem;">
                    <h2 class="section-title" style="margin:0;">Histórico de Dissídios</h2>
                    <button class="btn btn-outline" onclick="window.dissidioLoadHistorico()" style="display:flex;align-items:center;gap:4px;padding:0.4rem 0.9rem;font-size:0.85rem;">
                        <i class="ph ph-arrow-clockwise"></i> Atualizar
                    </button>
                </div>
                <div id="dissidio-historico-wrapper" style="overflow-x:auto;">
                    <table class="table" style="width:100%;">
                        <thead>
                            <tr>
                                <th>Data</th>
                                <th>Cargo</th>
                                <th>Salário Antes</th>
                                <th>Salário Depois</th>
                                <th>Reajuste %</th>
                                <th>Colaboradores</th>
                            </tr>
                        </thead>
                        <tbody id="dissidio-historico-body">
                            <tr><td colspan="6" style="text-align:center;padding:2rem;color:#94a3b8;"><i class="ph ph-spinner ph-spin" style="font-size:1.5rem;"></i></td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        window.dissidioLoadCargos();
        window.dissidioLoadHistorico();
    }

    // ---- BRL formatter (ATM-style, formats while typing) ----
    window.dissidioFormatSalario = function(input) {
        let v = input.value.replace(/\D/g, "");
        if (v === "") {
            input.value = "";
            return;
        }
        v = (parseInt(v) / 100).toFixed(2) + "";
        v = v.replace(".", ",");
        v = v.replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1.");
        input.value = "R$ " + v;
    };

    // Parse BRL text formatted string to plain float
    window.parseBRLInput = function(val) {
        if (!val || typeof val !== 'string') return typeof val === 'number' ? val : 0;
        const clean = val.replace(/[^\d,]/g, "").replace(",", ".");
        return clean ? parseFloat(clean) : 0;
    };

    // ---- Load unique cargo list from backend ----
    window.dissidioLoadCargos = async function() {
        try {
            const token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token');
            const url = (typeof API_URL !== 'undefined') ? API_URL : (window.location.origin + '/api');
            const res = await fetch(`${url}/colaboradores`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const colabs = await res.json();
            const cargosSet = new Set();
            colabs.forEach(c => { if (c.cargo) cargosSet.add(c.cargo.trim()); });
            const cargos = [...cargosSet].sort();

            const sel = document.getElementById('dissidio-cargo-select');
            if (!sel) return;
            sel.innerHTML = `<option value="">Selecione um cargo...</option>` +
                cargos.map(c => `<option value="${c}">${c}</option>`).join('');

            // Store colabs globally for preview
            window._dissidioColabs = colabs;
            sel.addEventListener('change', window.dissidioPreview);
        } catch(e) {
            console.error('[Dissídio] Erro ao carregar cargos:', e);
        }
    };

    // ---- Preview affected employees and new salary ----
    window.dissidioPreview = function() {
        const cargo = (document.getElementById('dissidio-cargo-select')?.value || '').trim();
        const novoSalario = window.parseBRLInput(document.getElementById('dissidio-novo-salario')?.value || '');
        const previewText = document.getElementById('dissidio-preview-text');
        const affectedBox = document.getElementById('dissidio-affected-Preview');
        const affectedList = document.getElementById('dissidio-affected-list');

        if (!cargo || !novoSalario || novoSalario <= 0) {
            if (previewText) previewText.textContent = 'Selecione um cargo e informe o novo salário para ver a prévia';
            if (affectedBox) affectedBox.style.display = 'none';
            return;
        }

        const colabs = (window._dissidioColabs || []).filter(c => (c.cargo || '').trim() === cargo);
        if (colabs.length === 0) {
            if (previewText) previewText.textContent = 'Nenhum colaborador encontrado para este cargo.';
            if (affectedBox) affectedBox.style.display = 'none';
            return;
        }

        // Safe locale-independent BRL formatter
        const formatBRL = v => {
            const num = Math.round(parseFloat(v || 0) * 100);
            const cents = (num % 100).toString().padStart(2, '0');
            const reais = Math.floor(num / 100).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
            return `R$ ${reais},${cents}`;
        };

        let totalAntigo = 0;
        colabs.forEach(c => {
            // parseSalary: handles both R$ 2.800,00 (PT-BR) and plain 2800
            let s = String(c.salario || '0').replace(/R\$\s*/g, '').trim();
            let salNum = 0;
            if (s.includes(',') && s.includes('.')) {
                const lastComma = s.lastIndexOf(','), lastDot = s.lastIndexOf('.');
                salNum = lastComma > lastDot ? parseFloat(s.replace(/\./g, '').replace(',', '.')) : parseFloat(s.replace(/,/g, ''));
            } else if (s.includes(',')) {
                salNum = parseFloat(s.replace(',', '.'));
            } else {
                salNum = parseFloat(s);
            }
            totalAntigo += salNum || 0;
        });
        const mediaAntiga = totalAntigo / colabs.length;
        let pct = 0;
        if (mediaAntiga > 0) {
            pct = ((novoSalario - mediaAntiga) / mediaAntiga) * 100;
        }

        if (previewText) {
            let infoPct = pct > 0 ? `+${pct.toFixed(2).replace('.',',')}%` : `${pct.toFixed(2).replace('.',',')}%`;
            previewText.innerHTML = `<strong>${colabs.length}</strong> colaborador(es) será(ão) igualados a <strong>${formatBRL(novoSalario)}</strong> (Média: ${infoPct})`;
        }

        if (affectedBox && affectedList) {
            affectedList.innerHTML = colabs.map(c => {
                const salOld = parseFloat(String(c.salario || '0').replace(/[R$\s.]/g, '').replace(',', '.')) || 0;
                let indPct = 0;
                if(salOld > 0) indPct = ((novoSalario - salOld) / salOld) * 100;
                let pctStr = indPct > 0 ? `+${indPct.toFixed(1).replace('.',',')}%` : `${indPct.toFixed(1).replace('.',',')}%`;

                return `<div style="display:flex;gap:1rem;align-items:center;padding:4px 0;border-bottom:1px solid rgba(202, 138, 4, 0.2);">
                    <span style="flex:2;font-weight:600;">${c.nome_completo}</span>
                    <span style="flex:1;text-decoration:line-through;color:#ca8a04;">${formatBRL(salOld)}</span>
                    <i class="ph ph-arrow-right" style="color:#ca8a04;"></i>
                    <span style="flex:1;font-weight:700;color:#16a34a;">${formatBRL(novoSalario)} <small style="color:#64748b;font-weight:normal;opacity:0.8;">(${pctStr})</small></span>
                </div>`;
            }).join('');
            affectedBox.style.display = 'block';
        }
    };

    // ---- Apply Dissídio ----
    window.dissidioAplicar = async function() {
        const cargo = (document.getElementById('dissidio-cargo-select')?.value || '').trim();
        const novoSalario = window.parseBRLInput(document.getElementById('dissidio-novo-salario')?.value || '');

        if (!cargo) { Swal.fire('Atenção', 'Selecione um cargo.', 'warning'); return; }
        if (!novoSalario || novoSalario <= 0) { Swal.fire('Atenção', 'Informe um novo salário válido maior que zero.', 'warning'); return; }

        const colabs = (window._dissidioColabs || []).filter(c => (c.cargo || '').trim() === cargo);
        if (colabs.length === 0) { Swal.fire('Atenção', 'Nenhum colaborador encontrado para este cargo.', 'warning'); return; }

        const formatBRL = v => {
            const num = Math.round(parseFloat(v || 0) * 100);
            const cents = (num % 100).toString().padStart(2, '0');
            const reais = Math.floor(num / 100).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
            return `R$ ${reais},${cents}`;
        };

        const confirm = await Swal.fire({
            title: 'Confirmar Reajuste',
            html: `Alterar o salário de <strong>${colabs.length} colaborador(es)</strong> do cargo <strong>${cargo}</strong> para <strong>${formatBRL(novoSalario)}</strong>?<br><br><span style="font-size:0.85rem;color:#ef4444;">Esta ação não pode ser desfeita automaticamente.</span>`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Sim, aplicar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#0d9488',
        });
        if (!confirm.isConfirmed) return;

        const btn = document.getElementById('btn-dissidio-aplicar');
        if (btn) { btn.disabled = true; btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Aplicando...'; }

        try {
            const token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token');
            const url = (typeof API_URL !== 'undefined') ? API_URL : (window.location.origin + '/api');
            const res = await fetch(`${url}/dissidio/aplicar`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ cargo, novo_salario: novoSalario })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Erro desconhecido');

            Swal.fire({
                title: 'Dissídio Aplicado!',
                html: `<strong>${data.atualizados}</strong> colaboradores tiveram o salário reajustado com sucesso.`,
                icon: 'success',
                confirmButtonColor: '#0d9488'
            });

            // Reset form
            document.getElementById('dissidio-cargo-select').value = '';
            document.getElementById('dissidio-novo-salario').value = '';
            document.getElementById('dissidio-affected-Preview').style.display = 'none';
            document.getElementById('dissidio-preview-text').textContent = 'Selecione um cargo e informe o novo salário para ver a prévia';

            // Refresh historico and cargos
            window.dissidioLoadCargos();
            window.dissidioLoadHistorico();

        } catch(e) {
            Swal.fire('Erro', e.message, 'error');
        } finally {
            if (btn) { btn.disabled = false; btn.innerHTML = '<i class="ph ph-check-circle"></i> Aplicar Dissídio'; }
        }
    };

    // ---- Load Dissídio history ----
    window.dissidioLoadHistorico = async function() {
        const tbody = document.getElementById('dissidio-historico-body');
        if (!tbody) return;
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:2rem;color:#94a3b8;"><i class="ph ph-spinner ph-spin" style="font-size:1.5rem;"></i></td></tr>`;

        try {
            const token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token');
            const url = (typeof API_URL !== 'undefined') ? API_URL : (window.location.origin + '/api');
            const res = await fetch(`${url}/dissidio/historico`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();

            if (!res.ok) {
                const errMsg = data.error || `Erro HTTP ${res.status}`;
                tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:2rem;color:#ef4444;">${errMsg}</td></tr>`;
                return;
            }

            if (!data || !Array.isArray(data) || data.length === 0) {
                tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:3rem;color:#94a3b8;">
                    <i class="ph ph-clock-counter-clockwise" style="font-size:2.5rem;display:block;margin-bottom:0.5rem;"></i>
                    Nenhum dissídio registrado ainda.
                </td></tr>`;
                return;
            }

            const formatBRL = v => {
                const n = parseFloat(String(v || '0').replace(/[R$\s.]/g, '').replace(',', '.')) || 0;
                return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            };
            const formatDate = s => s ? new Date(s).toLocaleString('pt-BR') : '-';

            tbody.innerHTML = data.map((row, i) => `
                <tr>
                    <td>${formatDate(row.criado_em)}</td>
                    <td style="font-weight:600;color:#0f172a;">${row.cargo}</td>
                    <td>${formatBRL(row.salario_antes_media)}</td>
                    <td style="font-weight:700;color:#0d9488;">${formatBRL(row.salario_depois_media)}</td>
                    <td>
                        <span class="status-badge status-ativo" style="gap:4px;">
                            <i class="ph ph-trend-up"></i> +${parseFloat(row.percentual || 0).toFixed(2).replace('.',',')}%
                        </span>
                    </td>
                    <td style="font-weight:600;">${row.total_colaboradores}</td>
                </tr>
            `).join('');
        } catch(e) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:2rem;color:#ef4444;">Erro ao carregar histórico: ${e.message}</td></tr>`;
        }
    };

    // ---- Hook into navigation system ----
    document.addEventListener('DOMContentLoaded', () => {
        // Listen for nav clicks to render dissidio
        document.body.addEventListener('click', (e) => {
            const navItem = e.target.closest('[data-target="dissidio"]');
            if (navItem) {
                setTimeout(() => renderDissidio(), 50);
            }
        });
    });

    // Also expose render for direct calls
    window.renderDissidio = renderDissidio;

})();
