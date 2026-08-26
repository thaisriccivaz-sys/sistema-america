// frontend/rota_sucesso.js - v3
(function () {
    'use strict';

    const API = (window.API_URL || '').replace(/\/api\/?$/, '');
    function headers() {
        const t = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token');
        return { 'Authorization': `Bearer ${t}`, 'Content-Type': 'application/json' };
    }

    function avatarHtml(url, nome) {
        const ini = (nome || '?').split(' ').filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase();
        return `<div style="width:40px;height:40px;border-radius:50%;overflow:hidden;flex-shrink:0;border:2px solid #15803d;background:#dcfce7;display:flex;align-items:center;justify-content:center;font-weight:700;color:#15803d;font-size:0.9rem;">
            <img src="${url}" style="width:100%;height:100%;object-fit:cover;" onerror="this.parentElement.innerHTML='${ini}'" alt="">
        </div>`;
    }

    function badgeMeses(meses, ok) {
        const s = ok ? 'background:#dcfce7;color:#15803d;border:1px solid #bbf7d0;' : 'background:#fef2f2;color:#dc2626;border:1px solid #fecaca;';
        return `<span style="${s}padding:2px 8px;border-radius:12px;font-size:0.75rem;font-weight:600;white-space:nowrap;">${meses}m</span>`;
    }

    function badgeBool(val) {
        if (val) return `<span style="background:#fef2f2;color:#dc2626;border:1px solid #fecaca;padding:2px 8px;border-radius:12px;font-size:0.75rem;font-weight:600;">⚠ Sim</span>`;
        return `<span style="background:#dcfce7;color:#15803d;border:1px solid #bbf7d0;padding:2px 8px;border-radius:12px;font-size:0.75rem;font-weight:600;">✓ OK</span>`;
    }

    function aptoBadge(apto) {
        if (apto) return `<span style="display:inline-flex;align-items:center;gap:4px;background:#dcfce7;color:#15803d;border:1px solid #15803d;padding:3px 10px;border-radius:12px;font-size:0.8rem;font-weight:700;white-space:nowrap;">✅ Apto</span>`;
        return `<span style="display:inline-flex;align-items:center;gap:4px;background:#fef2f2;color:#dc2626;border:1px solid #fecaca;padding:3px 10px;border-radius:12px;font-size:0.8rem;font-weight:700;white-space:nowrap;">❌ Inapto</span>`;
    }

    // Ícones para cada tipo de formulário
    const TIPO_ICONS = {
        'hab_b':     { icon: '🚗', label: 'Hab. B',      short: 'B' },
        'motorista1':{ icon: '🚚', label: 'Mot. I',      short: 'M1' },
        'hab_d':     { icon: '🚛', label: 'Hab. D',      short: 'D' },
        'motorista2':{ icon: '🚛', label: 'Mot. II',     short: 'M2' }
    };

    // Todos os tipos possíveis (para criar colunas fixas)
    const TIPOS_AJUDANTES  = ['hab_b', 'motorista1'];
    const TIPOS_MOTORISTAS = ['hab_d', 'motorista2'];

    async function copiarLink(colaborador_id, tipo, btnEl) {
        try {
            btnEl.disabled = true;
            btnEl.title = 'Gerando link...';
            const resp = await fetch(`${API}/rota-sucesso/gerar-token`, {
                method: 'POST', headers: headers(),
                body: JSON.stringify({ colaborador_id, tipo })
            });
            const data = await resp.json();
            if (!resp.ok) throw new Error(data.error || 'Erro');
            await navigator.clipboard.writeText(data.url);
            btnEl.style.background = '#15803d';
            btnEl.style.color = 'white';
            btnEl.style.borderColor = '#15803d';
            btnEl.title = '✅ Link copiado!';
            setTimeout(() => {
                btnEl.style.background = '';
                btnEl.style.color = '';
                btnEl.style.borderColor = '';
                btnEl.title = TIPO_ICONS[tipo]?.label || tipo;
                btnEl.disabled = false;
            }, 2500);
            // Atualizar botão Ver se agora foi respondido
            if (data.status === 'respondido') {
                const verBtn = document.getElementById(`ver-${colaborador_id}-${tipo}`);
                if (verBtn) verBtn.style.display = '';
            }
        } catch (e) {
            btnEl.title = TIPO_ICONS[tipo]?.label || tipo;
            btnEl.disabled = false;
            alert('Erro: ' + e.message);
        }
    }

    function verRespostas(id_resposta) {
        if (!id_resposta || id_resposta === 'undefined') { alert('ID da resposta inválido.'); return; }
        window.open(`${API}/api/rota-sucesso/respostas/ver/${id_resposta}/pdf`, '_blank');
    }


    function renderTabela(colabs, containerId, tiposColuna) {
        const container = document.getElementById(containerId);
        if (!container) return;

        if (!colabs || colabs.length === 0) {
            container.innerHTML = `<div style="text-align:center;padding:48px;color:#94a3b8;"><div style="font-size:2.5rem;margin-bottom:12px;">👤</div><p>Nenhum colaborador encontrado.</p></div>`;
            return;
        }

        // Cabeçalho com colunas fixas por tipo
        const tipoHeaders = tiposColuna.map(t => {
            const ti = TIPO_ICONS[t] || {};
            return `<th style="padding:8px 12px;text-align:center;font-size:0.72rem;font-weight:700;color:#64748b;text-transform:uppercase;border-bottom:2px solid #e2e8f0;min-width:72px;">${ti.icon || ''} ${ti.short || t}</th>`;
        }).join('');

        const rows = colabs.map(c => {
            // Mapear formulários do colaborador por tipo
            const formsByTipo = {};
            (c.formularios || []).forEach(f => { formsByTipo[f.tipo] = f; });

            // Criar célula para cada tipo de coluna
            const tipoCells = tiposColuna.map(tipo => {
                const f = formsByTipo[tipo];
                if (!f) {
                    // Tipo não disponível para este colaborador
                    return `<td style="padding:8px 12px;text-align:center;"><span style="color:#d1d5db;font-size:1.1rem;">—</span></td>`;
                }
                const idResp = f.id_resposta;
                const verDisplay = (f.respondido && idResp) ? '' : 'display:none;';
                return `<td style="padding:8px 12px;text-align:center;">
                    <div style="display:flex;flex-direction:column;align-items:center;gap:4px;">
                        <button onclick="window._rrsCopiarLink(${c.id},'${tipo}',this)"
                            title="${TIPO_ICONS[tipo]?.label || tipo}"
                            style="width:36px;height:36px;border-radius:8px;border:1.5px solid #15803d;background:#f0fdf4;color:#15803d;font-size:1rem;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 0.2s;">
                            📋
                        </button>
                        <button id="ver-${c.id}-${tipo}" onclick="window._rrsVerRespostas(${idResp})"
                            style="${verDisplay}width:36px;height:36px;border-radius:8px;border:1.5px solid #7c3aed;background:#faf5ff;color:#7c3aed;font-size:1rem;cursor:pointer;display:flex;align-items:center;justify-content:center;"
                            title="Ver respostas">
                            👁
                        </button>
                    </div>
                </td>`;
            }).join('');

            return `<tr style="border-bottom:1px solid #f1f5f9;transition:background 0.15s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background=''">
                <td style="padding:10px 16px;">
                    <div style="display:flex;align-items:center;gap:10px;">
                        ${avatarHtml(c.foto_url, c.nome_completo)}
                        <div>
                            <div style="font-weight:700;color:#1e293b;font-size:0.9rem;">${c.nome_completo}</div>
                            <div style="font-size:0.75rem;color:#64748b;">${c.cargo || c.departamento || '-'}</div>
                        </div>
                    </div>
                </td>
                <td style="padding:10px 12px;text-align:center;font-size:0.85rem;font-weight:600;color:#475569;">${c.cnh_categoria || '—'}</td>
                <td style="padding:10px 12px;text-align:center;">${badgeMeses(c.mesesEmpresa, c.tempoOk)}</td>
                <td style="padding:10px 12px;text-align:center;">${badgeBool(c.temAdvEscrita)}</td>
                <td style="padding:10px 12px;text-align:center;">${badgeBool(c.temSuspensao)}</td>
                <td style="padding:10px 12px;text-align:center;">${badgeBool(c.temFaltaSemAtestado)}</td>
                <td style="padding:10px 12px;text-align:center;">${aptoBadge(c.apto)}</td>
                ${tipoCells}
            </tr>`;
        }).join('');

        container.innerHTML = `<table style="width:100%;border-collapse:collapse;font-family:inherit;">
            <thead><tr style="background:#f8fafc;">
                <th style="padding:10px 16px;text-align:left;font-size:0.72rem;font-weight:700;color:#64748b;text-transform:uppercase;border-bottom:2px solid #e2e8f0;">Colaborador</th>
                <th style="padding:10px 12px;text-align:center;font-size:0.72rem;font-weight:700;color:#64748b;text-transform:uppercase;border-bottom:2px solid #e2e8f0;">CNH</th>
                <th style="padding:10px 12px;text-align:center;font-size:0.72rem;font-weight:700;color:#64748b;text-transform:uppercase;border-bottom:2px solid #e2e8f0;">Tempo</th>
                <th style="padding:10px 12px;text-align:center;font-size:0.72rem;font-weight:700;color:#64748b;text-transform:uppercase;border-bottom:2px solid #e2e8f0;">Adv.</th>
                <th style="padding:10px 12px;text-align:center;font-size:0.72rem;font-weight:700;color:#64748b;text-transform:uppercase;border-bottom:2px solid #e2e8f0;">Susp.</th>
                <th style="padding:10px 12px;text-align:center;font-size:0.72rem;font-weight:700;color:#64748b;text-transform:uppercase;border-bottom:2px solid #e2e8f0;">Falta</th>
                <th style="padding:10px 12px;text-align:center;font-size:0.72rem;font-weight:700;color:#64748b;text-transform:uppercase;border-bottom:2px solid #e2e8f0;">Status</th>
                ${tipoHeaders}
            </tr></thead>
            <tbody>${rows}</tbody>
        </table>`;
    }

    async function initView(tipo, tableId, searchId, tiposColuna) {
        const tableEl = document.getElementById(tableId);
        if (tableEl) tableEl.innerHTML = `<div style="text-align:center;padding:40px;color:#94a3b8;"><p>⏳ Carregando...</p></div>`;

        let allData = [];
        try {
            const resp = await fetch(`${API}/rota-sucesso/elegibilidade?tipo=${tipo}`, { headers: headers() });
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            allData = await resp.json();
        } catch (e) {
            if (tableEl) tableEl.innerHTML = `<div style="text-align:center;padding:40px;color:#dc2626;"><p>Erro ao carregar: ${e.message}</p></div>`;
            return;
        }

        function filtrar() {
            const q = (document.getElementById(searchId)?.value || '').toLowerCase();
            const somenteAptos = document.getElementById(`${tipo === 'ajudantes' ? 'rota-sucesso-ajudantes' : 'rota-sucesso-motoristas'}-aptos`)?.checked || false;
            let filtrado = allData;
            if (q) filtrado = filtrado.filter(c => c.nome_completo.toLowerCase().includes(q) || (c.cargo || '').toLowerCase().includes(q));
            if (somenteAptos) filtrado = filtrado.filter(c => c.apto);
            renderTabela(filtrado, tableId, tiposColuna);
        }

        document.getElementById(searchId)?.addEventListener('input', filtrar);
        const aptosId = `${tipo === 'ajudantes' ? 'rota-sucesso-ajudantes' : 'rota-sucesso-motoristas'}-aptos`;
        document.getElementById(aptosId)?.addEventListener('change', filtrar);

        renderTabela(allData, tableId, tiposColuna);
    }

    window._rrsCopiarLink  = copiarLink;
    window._rrsVerRespostas = verRespostas;
    window.initRotaSucessoAjudantes  = function () { initView('ajudantes',  'rrs-table-ajudantes',  'rrs-search-ajudantes',  TIPOS_AJUDANTES);  };
    window.initRotaSucessoMotoristas = function () { initView('motoristas', 'rrs-table-motoristas', 'rrs-search-motoristas', TIPOS_MOTORISTAS); };

})();
