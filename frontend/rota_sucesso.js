// frontend/rota_sucesso.js
// Módulo "Rota de Sucesso" — Tabelas de Ajudantes e Motoristas
// ─────────────────────────────────────────────────────────────

(function () {
    'use strict';

    const API = window.API_URL || '';
    function headers() {
        const t = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token');
        return { 'Authorization': `Bearer ${t}`, 'Content-Type': 'application/json' };
    }

    // ── helpers ────────────────────────────────────────────────────────────
    function avatarHtml(url, nome) {
        const ini = (nome || '?').split(' ').filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase();
        return `<div style="width:44px;height:44px;border-radius:50%;overflow:hidden;flex-shrink:0;border:2px solid #15803d;background:#dcfce7;display:flex;align-items:center;justify-content:center;font-weight:700;color:#15803d;font-size:1rem;">
            <img src="${url}" style="width:100%;height:100%;object-fit:cover;" onerror="this.parentElement.innerHTML='${ini}'" alt="">
        </div>`;
    }

    function badgeMeses(meses, ok) {
        const cls = ok ? 'background:#dcfce7;color:#15803d;border:1px solid #bbf7d0;' : 'background:#fef2f2;color:#dc2626;border:1px solid #fecaca;';
        return `<span style="${cls}padding:2px 10px;border-radius:20px;font-size:0.78rem;font-weight:600;">${meses} ${meses === 1 ? 'mês' : 'meses'}</span>`;
    }

    function badgeBool(val, labelOk, labelFail) {
        if (val) return `<span style="background:#fef2f2;color:#dc2626;border:1px solid #fecaca;padding:2px 10px;border-radius:20px;font-size:0.78rem;font-weight:600;">⚠ ${labelFail}</span>`;
        return `<span style="background:#dcfce7;color:#15803d;border:1px solid #bbf7d0;padding:2px 10px;border-radius:20px;font-size:0.78rem;font-weight:600;">✓ OK</span>`;
    }

    function aptoBadge(apto) {
        if (apto) return `<span style="background:#dcfce7;color:#15803d;border:1px solid #15803d;padding:4px 14px;border-radius:20px;font-size:0.82rem;font-weight:700;">✅ Apto</span>`;
        return `<span style="background:#fef2f2;color:#dc2626;border:1px solid #fecaca;padding:4px 14px;border-radius:20px;font-size:0.82rem;font-weight:700;">❌ Inapto</span>`;
    }

    // ── copiar link ────────────────────────────────────────────────────────
    async function copiarLink(colaborador_id, tipo, btnEl) {
        try {
            btnEl.disabled = true;
            btnEl.textContent = '⏳';
            const resp = await fetch(`${API}/api/rota-sucesso/gerar-token`, {
                method: 'POST',
                headers: headers(),
                body: JSON.stringify({ colaborador_id, tipo })
            });
            const data = await resp.json();
            if (!resp.ok) throw new Error(data.error || 'Erro ao gerar link');
            await navigator.clipboard.writeText(data.url);
            btnEl.textContent = '✅ Copiado!';
            btnEl.style.background = '#15803d';
            btnEl.style.color = 'white';
            setTimeout(() => {
                btnEl.textContent = '📋 Copiar Link';
                btnEl.style.background = '';
                btnEl.style.color = '';
                btnEl.disabled = false;
            }, 2500);
            // Atualizar token no DOM
            const verBtn = document.getElementById(`ver-${colaborador_id}-${tipo}`);
            if (verBtn && data.status === 'respondido') verBtn.style.display = '';
        } catch (e) {
            btnEl.textContent = '📋 Copiar Link';
            btnEl.disabled = false;
            alert('Erro: ' + e.message);
        }
    }

    // ── ver respostas ──────────────────────────────────────────────────────
    async function verRespostas(id_resposta) {
        window.open(`${API}/api/rota-sucesso/respostas/ver/${id_resposta}/pdf`, '_blank');
    }

    // ── render tabela ──────────────────────────────────────────────────────
    function renderTabela(colabs, containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        if (!colabs || colabs.length === 0) {
            container.innerHTML = `<div style="text-align:center;padding:48px;color:#94a3b8;">
                <div style="font-size:2.5rem;margin-bottom:12px;">👤</div>
                <p>Nenhum colaborador encontrado.</p>
            </div>`;
            return;
        }

        const rows = colabs.map(c => {
            const formBtns = (c.formularios || []).map(f => {
                const verDisplay = (f.respondido && f.id_resposta) ? '' : 'display:none;';
                return `<div style="display:flex;flex-direction:column;gap:4px;min-width:160px;">
                    <div style="font-size:0.72rem;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">${f.label}</div>
                    <button onclick="window._rrsCopiarLink(${c.id},'${f.tipo}',this)"
                        style="padding:5px 10px;border-radius:7px;border:1.5px solid #15803d;background:#f0fdf4;color:#15803d;font-size:0.78rem;font-weight:600;cursor:pointer;white-space:nowrap;">
                        📋 Copiar Link
                    </button>
                    <button id="ver-${c.id}-${f.tipo}" onclick="window._rrsVerRespostas(${f.id_resposta})"
                        style="${verDisplay}padding:5px 10px;border-radius:7px;border:1.5px solid #7c3aed;background:#faf5ff;color:#7c3aed;font-size:0.78rem;font-weight:600;cursor:pointer;">
                        👁 Ver Respostas
                    </button>
                </div>`;
            }).join('');

            return `<tr style="border-bottom:1px solid #f1f5f9;transition:background 0.15s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background=''">
                <td style="padding:12px 16px;">
                    <div style="display:flex;align-items:center;gap:12px;">
                        ${avatarHtml(c.foto_url, c.nome_completo)}
                        <div>
                            <div style="font-weight:700;color:#1e293b;font-size:0.95rem;">${c.nome_completo}</div>
                            <div style="font-size:0.78rem;color:#64748b;">${c.cargo || c.departamento || '-'}</div>
                        </div>
                    </div>
                </td>
                <td style="padding:12px 16px;text-align:center;font-size:0.85rem;font-weight:600;color:#475569;">
                    ${c.cnh_categoria || '—'}
                </td>
                <td style="padding:12px 16px;text-align:center;">
                    ${badgeMeses(c.mesesEmpresa, c.tempoOk)}
                </td>
                <td style="padding:12px 16px;text-align:center;">
                    ${badgeBool(c.temAdvEscrita, 'OK', 'Sim')}
                </td>
                <td style="padding:12px 16px;text-align:center;">
                    ${badgeBool(c.temSuspensao, 'OK', 'Sim')}
                </td>
                <td style="padding:12px 16px;text-align:center;">
                    ${badgeBool(c.temFaltaSemAtestado, 'OK', 'Sim')}
                </td>
                <td style="padding:12px 16px;text-align:center;">
                    ${aptoBadge(c.apto)}
                </td>
                <td style="padding:12px 16px;">
                    <div style="display:flex;gap:10px;flex-wrap:wrap;">
                        ${formBtns || '<span style="color:#94a3b8;font-size:0.8rem;">Nenhum formulário disponível</span>'}
                    </div>
                </td>
            </tr>`;
        }).join('');

        container.innerHTML = `
        <table style="width:100%;border-collapse:collapse;font-family:inherit;">
            <thead>
                <tr style="background:#f8fafc;">
                    <th style="padding:10px 16px;text-align:left;font-size:0.75rem;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;border-bottom:2px solid #e2e8f0;">Colaborador</th>
                    <th style="padding:10px 16px;text-align:center;font-size:0.75rem;font-weight:700;color:#64748b;text-transform:uppercase;border-bottom:2px solid #e2e8f0;">CNH</th>
                    <th style="padding:10px 16px;text-align:center;font-size:0.75rem;font-weight:700;color:#64748b;text-transform:uppercase;border-bottom:2px solid #e2e8f0;">Tempo Empresa</th>
                    <th style="padding:10px 16px;text-align:center;font-size:0.75rem;font-weight:700;color:#64748b;text-transform:uppercase;border-bottom:2px solid #e2e8f0;">Adv. Escrita</th>
                    <th style="padding:10px 16px;text-align:center;font-size:0.75rem;font-weight:700;color:#64748b;text-transform:uppercase;border-bottom:2px solid #e2e8f0;">Suspensão</th>
                    <th style="padding:10px 16px;text-align:center;font-size:0.75rem;font-weight:700;color:#64748b;text-transform:uppercase;border-bottom:2px solid #e2e8f0;">Falta s/ Atestado</th>
                    <th style="padding:10px 16px;text-align:center;font-size:0.75rem;font-weight:700;color:#64748b;text-transform:uppercase;border-bottom:2px solid #e2e8f0;">Status</th>
                    <th style="padding:10px 16px;text-align:left;font-size:0.75rem;font-weight:700;color:#64748b;text-transform:uppercase;border-bottom:2px solid #e2e8f0;">Formulários</th>
                </tr>
            </thead>
            <tbody>${rows}</tbody>
        </table>`;
    }

    // ── init genérico ──────────────────────────────────────────────────────
    async function initView(tipo, sectionId, tableId, searchId) {
        const tableEl = document.getElementById(tableId);
        if (tableEl) tableEl.innerHTML = `<div style="text-align:center;padding:40px;color:#94a3b8;">
            <div style="font-size:2rem;animation:spin 1s linear infinite;">⏳</div>
            <p style="margin-top:12px;">Carregando colaboradores...</p>
        </div>`;

        let allData = [];
        try {
            const resp = await fetch(`${API}/api/rota-sucesso/elegibilidade?tipo=${tipo}`, { headers: headers() });
            if (!resp.ok) throw new Error('Erro ao carregar dados');
            allData = await resp.json();
        } catch (e) {
            if (tableEl) tableEl.innerHTML = `<div style="text-align:center;padding:40px;color:#dc2626;"><p>Erro ao carregar: ${e.message}</p></div>`;
            return;
        }

        function filtrar() {
            const q = (document.getElementById(searchId)?.value || '').toLowerCase();
            const somentAptos = document.getElementById(`${sectionId}-aptos`)?.checked || false;
            let filtrado = allData;
            if (q) filtrado = filtrado.filter(c => c.nome_completo.toLowerCase().includes(q) || (c.cargo || '').toLowerCase().includes(q));
            if (somentAptos) filtrado = filtrado.filter(c => c.apto);
            renderTabela(filtrado, tableId);
        }

        if (document.getElementById(searchId)) document.getElementById(searchId).addEventListener('input', filtrar);
        if (document.getElementById(`${sectionId}-aptos`)) document.getElementById(`${sectionId}-aptos`).addEventListener('change', filtrar);

        renderTabela(allData, tableId);
    }

    // ── APIs públicas para index.html ──────────────────────────────────────
    window._rrsCopiarLink = copiarLink;
    window._rrsVerRespostas = verRespostas;

    window.initRotaSucessoAjudantes = function () { initView('ajudantes', 'rota-sucesso-ajudantes', 'rrs-table-ajudantes', 'rrs-search-ajudantes'); };
    window.initRotaSucessoMotoristas = function () { initView('motoristas', 'rota-sucesso-motoristas', 'rrs-table-motoristas', 'rrs-search-motoristas'); };

})();
