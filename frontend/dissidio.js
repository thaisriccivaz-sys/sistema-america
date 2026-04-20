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
                <div style="display:flex;align-items:center;gap:1.25rem;">
                    <div style="width:56px;height:56px;background:linear-gradient(135deg,#0f172a,#0d9488);border-radius:14px;display:flex;align-items:center;justify-content:center;">
                        <i class="ph ph-trend-up" style="font-size:1.8rem;color:#fff;"></i>
                    </div>
                    <div>
                        <h1 style="margin:0;font-size:1.6rem;font-weight:800;color:#0f172a;">Dissídio Coletivo</h1>
                        <p style="margin:0;color:#64748b;font-size:0.9rem;">Reajuste de salário em massa por cargo</p>
                    </div>
                </div>
            </div>

            <!-- Formulário de Reajuste -->
            <div class="card" style="margin-top:1.5rem;border-radius:14px;overflow:hidden;">
                <div style="background:linear-gradient(90deg,#0f172a,#134e4a);padding:1.25rem 1.5rem;display:flex;align-items:center;gap:0.75rem;">
                    <i class="ph ph-calculator" style="font-size:1.3rem;color:#5eead4;"></i>
                    <h2 style="margin:0;font-size:1.1rem;font-weight:700;color:#fff;">Aplicar Reajuste de Salário</h2>
                </div>
                <div style="padding:1.75rem;display:grid;grid-template-columns:1fr 1fr 1fr auto;gap:1.25rem;align-items:end;">

                    <div>
                        <label style="display:block;font-size:0.78rem;font-weight:700;color:#64748b;margin-bottom:6px;text-transform:uppercase;letter-spacing:0.05em;">Cargo</label>
                        <select id="dissidio-cargo-select" style="width:100%;padding:0.65rem 0.85rem;border:1.5px solid #e2e8f0;border-radius:9px;font-size:0.92rem;color:#0f172a;background:#fff;appearance:none;">
                            <option value="">Carregando cargos...</option>
                        </select>
                    </div>

                    <div>
                        <label style="display:block;font-size:0.78rem;font-weight:700;color:#64748b;margin-bottom:6px;text-transform:uppercase;letter-spacing:0.05em;">Percentual de Reajuste (%)</label>
                        <input type="number" id="dissidio-percentual" min="0" max="100" step="0.01" placeholder="Ex: 5.00"
                            style="width:100%;padding:0.65rem 0.85rem;border:1.5px solid #e2e8f0;border-radius:9px;font-size:0.92rem;color:#0f172a;background:#fff;box-sizing:border-box;"
                            oninput="window.dissidioPreview()">
                    </div>

                    <div id="dissidio-preview-box" style="background:#f0fdf4;border:1.5px solid #bbf7d0;border-radius:9px;padding:0.65rem 0.85rem;min-height:46px;display:flex;align-items:center;gap:0.5rem;color:#166534;font-size:0.9rem;">
                        <i class="ph ph-info" style="font-size:1.1rem;color:#15803d;"></i>
                        <span id="dissidio-preview-text">Selecione um cargo e percentual para ver a prévia</span>
                    </div>

                    <button onclick="window.dissidioAplicar()" id="btn-dissidio-aplicar"
                        style="padding:0.7rem 1.5rem;background:linear-gradient(135deg,#0d9488,#0f766e);color:#fff;border:none;border-radius:9px;font-weight:700;font-size:0.95rem;cursor:pointer;display:flex;align-items:center;gap:6px;white-space:nowrap;line-height:1.3;height:46px;">
                        <i class="ph ph-check-circle"></i> Aplicar Dissídio
                    </button>
                </div>

                <div id="dissidio-affected-Preview" style="display:none;padding:0 1.75rem 1.5rem;">
                    <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:9px;padding:1rem 1.25rem;">
                        <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.5rem;">
                            <i class="ph ph-warning" style="color:#b45309;font-size:1.2rem;"></i>
                            <strong style="color:#92400e;font-size:0.9rem;">Colaboradores que serão afetados:</strong>
                        </div>
                        <div id="dissidio-affected-list" style="font-size:0.85rem;color:#78350f;line-height:1.8;"></div>
                    </div>
                </div>
            </div>

            <!-- Histórico de Dissídios -->
            <div class="card" style="margin-top:1.5rem;border-radius:14px;overflow:hidden;">
                <div style="background:linear-gradient(90deg,#0f172a,#1e1b4b);padding:1.25rem 1.5rem;display:flex;align-items:center;justify-content:space-between;">
                    <div style="display:flex;align-items:center;gap:0.75rem;">
                        <i class="ph ph-clock-counter-clockwise" style="font-size:1.3rem;color:#a5b4fc;"></i>
                        <h2 style="margin:0;font-size:1.1rem;font-weight:700;color:#fff;">Histórico de Dissídios</h2>
                    </div>
                    <button onclick="window.dissidioLoadHistorico()" style="background:transparent;border:1px solid rgba(255,255,255,0.2);color:#fff;border-radius:7px;padding:0.4rem 0.9rem;font-size:0.8rem;cursor:pointer;display:flex;align-items:center;gap:4px;">
                        <i class="ph ph-arrow-clockwise"></i> Atualizar
                    </button>
                </div>
                <div id="dissidio-historico-wrapper" style="overflow-x:auto;">
                    <table style="width:100%;border-collapse:collapse;">
                        <thead>
                            <tr style="background:#f8fafc;border-bottom:2px solid #e2e8f0;">
                                <th style="padding:0.85rem 1.25rem;text-align:left;font-size:0.78rem;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;">Data</th>
                                <th style="padding:0.85rem 1.25rem;text-align:left;font-size:0.78rem;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;">Cargo</th>
                                <th style="padding:0.85rem 1.25rem;text-align:right;font-size:0.78rem;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;">Salário Antes</th>
                                <th style="padding:0.85rem 1.25rem;text-align:right;font-size:0.78rem;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;">Salário Depois</th>
                                <th style="padding:0.85rem 1.25rem;text-align:center;font-size:0.78rem;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;">Reajuste %</th>
                                <th style="padding:0.85rem 1.25rem;text-align:center;font-size:0.78rem;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;">Colaboradores</th>
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

    // ---- Load unique cargo list from backend ----
    window.dissidioLoadCargos = async function() {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/colaboradores`, {
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
        const pct = parseFloat(document.getElementById('dissidio-percentual')?.value || '0');
        const previewText = document.getElementById('dissidio-preview-text');
        const affectedBox = document.getElementById('dissidio-affected-Preview');
        const affectedList = document.getElementById('dissidio-affected-list');

        if (!cargo || !pct || pct <= 0) {
            if (previewText) previewText.textContent = 'Selecione um cargo e percentual para ver a prévia';
            if (affectedBox) affectedBox.style.display = 'none';
            return;
        }

        const colabs = (window._dissidioColabs || []).filter(c => (c.cargo || '').trim() === cargo);
        if (colabs.length === 0) {
            if (previewText) previewText.textContent = 'Nenhum colaborador encontrado para este cargo.';
            if (affectedBox) affectedBox.style.display = 'none';
            return;
        }

        const formatBRL = v => {
            const n = parseFloat(String(v || '0').replace(/[R$\s.]/g, '').replace(',', '.')) || 0;
            return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        };

        if (previewText) {
            previewText.innerHTML = `<strong>${colabs.length}</strong> ${colabs.length === 1 ? 'colaborador' : 'colaboradores'} serão reajustados em <strong>${pct.toFixed(2).replace('.',',')}%</strong>`;
        }

        if (affectedBox && affectedList) {
            affectedList.innerHTML = colabs.map(c => {
                const salOld = parseFloat(String(c.salario || '0').replace(/[R$\s.]/g, '').replace(',', '.')) || 0;
                const salNew = salOld * (1 + pct / 100);
                return `<div style="display:flex;gap:1rem;align-items:center;padding:4px 0;border-bottom:1px solid #fde68a;">
                    <span style="flex:2;font-weight:600;">${c.nome_completo}</span>
                    <span style="flex:1;text-align:right;text-decoration:line-through;color:#b45309;">${formatBRL(salOld)}</span>
                    <i class="ph ph-arrow-right" style="color:#b45309;"></i>
                    <span style="flex:1;text-align:right;font-weight:700;color:#166534;">${formatBRL(salNew)}</span>
                </div>`;
            }).join('');
            affectedBox.style.display = 'block';
        }
    };

    // ---- Apply Dissídio ----
    window.dissidioAplicar = async function() {
        const cargo = (document.getElementById('dissidio-cargo-select')?.value || '').trim();
        const pct = parseFloat(document.getElementById('dissidio-percentual')?.value || '0');

        if (!cargo) { Swal.fire('Atenção', 'Selecione um cargo.', 'warning'); return; }
        if (!pct || pct <= 0) { Swal.fire('Atenção', 'Informe um percentual de reajuste válido.', 'warning'); return; }

        const colabs = (window._dissidioColabs || []).filter(c => (c.cargo || '').trim() === cargo);
        if (colabs.length === 0) { Swal.fire('Atenção', 'Nenhum colaborador encontrado para este cargo.', 'warning'); return; }

        const confirm = await Swal.fire({
            title: 'Confirmar Dissídio',
            html: `Aplicar reajuste de <strong>${pct.toFixed(2).replace('.',',')}%</strong> para <strong>${colabs.length} colaborador${colabs.length > 1 ? 'es' : ''}</strong> do cargo <strong>${cargo}</strong>?<br><br><span style="font-size:0.85rem;color:#ef4444;">Esta ação não pode ser desfeita automaticamente.</span>`,
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
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/dissidio/aplicar`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ cargo, percentual: pct })
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
            document.getElementById('dissidio-percentual').value = '';
            document.getElementById('dissidio-affected-Preview').style.display = 'none';
            document.getElementById('dissidio-preview-text').textContent = 'Selecione um cargo e percentual para ver a prévia';

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
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/dissidio/historico`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();

            if (!data || data.length === 0) {
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
                <tr style="border-bottom:1px solid #f1f5f9;${i%2===0?'background:#fff;':'background:#f8fafc;'}transition:background 0.15s;" onmouseover="this.style.background='#eff6ff'" onmouseout="this.style.background='${i%2===0?'#fff':'#f8fafc'}'">
                    <td style="padding:0.85rem 1.25rem;font-size:0.85rem;color:#64748b;white-space:nowrap;">${formatDate(row.criado_em)}</td>
                    <td style="padding:0.85rem 1.25rem;font-size:0.9rem;font-weight:600;color:#0f172a;">${row.cargo}</td>
                    <td style="padding:0.85rem 1.25rem;text-align:right;font-size:0.9rem;color:#64748b;">${formatBRL(row.salario_antes_media)}</td>
                    <td style="padding:0.85rem 1.25rem;text-align:right;font-size:0.9rem;font-weight:700;color:#0d9488;">${formatBRL(row.salario_depois_media)}</td>
                    <td style="padding:0.85rem 1.25rem;text-align:center;">
                        <span style="background:#dcfce7;color:#166534;font-weight:800;font-size:0.85rem;padding:0.25rem 0.75rem;border-radius:20px;display:inline-flex;align-items:center;gap:4px;">
                            <i class="ph ph-trend-up"></i> +${parseFloat(row.percentual || 0).toFixed(2).replace('.',',')}%
                        </span>
                    </td>
                    <td style="padding:0.85rem 1.25rem;text-align:center;font-size:0.9rem;color:#475569;font-weight:600;">${row.total_colaboradores}</td>
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
