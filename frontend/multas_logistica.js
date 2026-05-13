// multas_logistica.js

let multasLogistica = [];
let colaboradoresMultas = [];
let _multasSortCol = 'data_infracao';
let _multasSortDir = 'desc'; // mais novo primeiro por padrão

// Helper: badge de data limite (vermelho se < 10 dias)
function _dataLimiteBadge(dl) {
    if (!dl) return '—';
    const [y,m,d] = dl.split('-');
    const fmt = `${d}/${m}/${y}`;
    const diff = Math.ceil((new Date(dl + 'T12:00:00') - new Date()) / 86400000);
    if (diff <= 10) {
        const urgente = diff <= 0 ? 'VENCIDA' : `${diff}d`;
        return `<span style="color:#dc2626;font-weight:700;white-space:nowrap;" title="${urgente}">⚠️ ${fmt}</span>`;
    }
    return `<span style="white-space:nowrap;">${fmt}</span>`;
}

// Ordenação da tabela
function ordenarMultas(col) {
    if (_multasSortCol === col) {
        _multasSortDir = _multasSortDir === 'asc' ? 'desc' : 'asc';
    } else {
        _multasSortCol = col;
        _multasSortDir = col === 'data_infracao' ? 'desc' : 'asc';
    }
    filtrarMultasLogistica();
    // Atualizar icones no thead
    document.querySelectorAll('.multa-th-sort').forEach(th => {
        const c = th.dataset.col;
        const ico = th.querySelector('.sort-ico');
        if (!ico) return;
        if (c === _multasSortCol) {
            ico.className = 'sort-ico ph ' + (_multasSortDir === 'asc' ? 'ph-arrow-up' : 'ph-arrow-down');
            ico.style.color = '#2563eb';
        } else {
            ico.className = 'sort-ico ph ph-arrows-down-up';
            ico.style.color = '#cbd5e1';
        }
    });
}

// ── Helpers de Toast locais (não depende de outros scripts) ──────────────────
function _toastMulta(msg, bg, border, color) {
    const t = document.createElement('div');
    t.style.cssText = `position:fixed;bottom:1.5rem;right:1.5rem;z-index:99999;background:${bg};border:1px solid ${border};color:${color};padding:0.75rem 1.1rem;border-radius:8px;font-size:0.82rem;max-width:380px;box-shadow:0 4px 14px rgba(0,0,0,0.15);line-height:1.5;font-weight:500;`;
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 5000);
}
function mostrarToastSucesso(msg) { _toastMulta(msg, '#f0fdf4', '#86efac', '#166534'); }
function mostrarToastAviso(msg)   { _toastMulta(msg, '#fef3c7', '#f59e0b', '#92400e'); }
function mostrarToastErro(msg)    { _toastMulta(msg, '#fef2f2', '#fca5a5', '#991b1b'); }
// ─────────────────────────────────────────────────────────────────────────────

async function initMultasLogistica() {
    await carregarColaboradoresMultas();
    await carregarMultasLogistica();
}

async function carregarColaboradoresMultas() {
    try {
        const token = localStorage.getItem('erp_token') || localStorage.getItem('token') || '';
        const response = await fetch('/api/colaboradores', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
            colaboradoresMultas = await response.json();
            // Filtrar apenas ativos, se desejar. Por enquanto, pega todos ou ativos
            colaboradoresMultas = colaboradoresMultas.filter(c => c.status !== 'Inativo');
        }
    } catch (e) {
        console.error('Erro ao carregar colaboradores', e);
    }
}

async function carregarMultasLogistica() {
    const container = document.getElementById('multas-logistica-container');
    if (!container) return;

    try {
        const token = localStorage.getItem('erp_token') || localStorage.getItem('token') || '';
        const response = await fetch('/api/logistica/multas', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
            multasLogistica = await response.json();
            renderMultasLogistica(container);
        } else {
            container.innerHTML = '<p style="padding: 1rem; color: red;">Erro ao carregar multas.</p>';
        }
    } catch (e) {
        console.error('Erro', e);
        container.innerHTML = '<p style="padding: 1rem; color: red;">Erro de conexão.</p>';
    }
}

function renderMultasLogistica(container) {
    const STATUS_OPTS = ['Conferência','Conferido','Indicado','Multa NIC','Não Se Aplica'];
    const optsStatus = STATUS_OPTS.map(s => `<option value="${s}">${s}</option>`).join('');

    let html = `
        <div style="background:#fff; border-radius:8px; padding:1.5rem; box-shadow:0 1px 3px rgba(0,0,0,0.1);">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
                <h2 style="margin:0; color:#1e293b; font-size:1.25rem;"><i class="ph ph-receipt"></i> Controle de Multas</h2>
                <button onclick="abrirModalNovaMulta()" style="background:#2563eb; color:white; border:none; padding:0.6rem 1.2rem; border-radius:6px; cursor:pointer; font-weight:600; display:flex; align-items:center; gap:0.5rem;">
                    <i class="ph ph-plus-circle"></i> Cadastrar Multa
                </button>
            </div>

            <!-- Filtros em tempo real -->
            <div id="multas-filtros" style="display:flex; flex-wrap:wrap; gap:0.6rem; margin-bottom:1rem; padding:0.8rem; background:#f8fafc; border-radius:8px; border:1px solid #e2e8f0;">
                <input id="mf-motorista" type="text" placeholder="🔍 Motorista" oninput="filtrarMultasLogistica()"
                    style="flex:1; min-width:140px; padding:0.45rem 0.7rem; border:1px solid #cbd5e1; border-radius:6px; font-size:0.82rem; outline:none;">
                <input id="mf-ait" type="text" placeholder="🔍 Nº AIT" oninput="filtrarMultasLogistica()"
                    style="flex:1; min-width:130px; padding:0.45rem 0.7rem; border:1px solid #cbd5e1; border-radius:6px; font-size:0.82rem; outline:none;">
                <input id="mf-de" type="date" title="Período de" oninput="filtrarMultasLogistica()"
                    style="flex:1; min-width:140px; padding:0.45rem 0.7rem; border:1px solid #cbd5e1; border-radius:6px; font-size:0.82rem; outline:none;">
                <input id="mf-ate" type="date" title="Período até" oninput="filtrarMultasLogistica()"
                    style="flex:1; min-width:140px; padding:0.45rem 0.7rem; border:1px solid #cbd5e1; border-radius:6px; font-size:0.82rem; outline:none;">
                <select id="mf-status" onchange="filtrarMultasLogistica()"
                    style="flex:1; min-width:180px; padding:0.45rem 0.7rem; border:1px solid #cbd5e1; border-radius:6px; font-size:0.82rem; outline:none; background:#fff;">
                    <option value="">Todos os Status</option>
                    ${optsStatus}
                </select>
                <button onclick="limparFiltrosMultas()" title="Limpar filtros"
                    style="padding:0.45rem 0.8rem; background:#e2e8f0; border:none; border-radius:6px; cursor:pointer; font-size:0.82rem; color:#475569; white-space:nowrap;">&#x2715; Limpar</button>
            </div>

            <div style="overflow-y:auto; height:calc(100vh - 340px);">
                <table style="width:100%; border-collapse:collapse; min-width:1000px; font-size:0.9rem;">
                    <thead style="position:sticky; top:0; z-index:2; background:#f8fafc; outline:1px solid #e2e8f0;">
                        <tr style="text-align:left;">
                            <th class="multa-th-sort" data-col="numero_ait" onclick="ordenarMultas('numero_ait')" style="padding:1rem; font-weight:600; color:#475569; cursor:pointer; user-select:none; white-space:nowrap;">AIT <i class="sort-ico ph ph-arrows-down-up" style="color:#cbd5e1;font-size:0.8rem;"></i></th>
                            <th style="padding:1rem; font-weight:600; color:#475569;">Placa</th>
                            <th class="multa-th-sort" data-col="data_infracao" onclick="ordenarMultas('data_infracao')" style="padding:1rem; font-weight:600; color:#475569; cursor:pointer; user-select:none; white-space:nowrap;">Data/Hora <i class="sort-ico ph ph-arrow-down" style="color:#2563eb;font-size:0.8rem;"></i></th>
                            <th class="multa-th-sort" data-col="motivo" onclick="ordenarMultas('motivo')" style="padding:1rem; font-weight:600; color:#475569; cursor:pointer; user-select:none; white-space:nowrap;">Motivo <i class="sort-ico ph ph-arrows-down-up" style="color:#cbd5e1;font-size:0.8rem;"></i></th>
                            <th class="multa-th-sort" data-col="motorista_nome" onclick="ordenarMultas('motorista_nome')" style="padding:1rem; font-weight:600; color:#475569; cursor:pointer; user-select:none; white-space:nowrap;">Motorista <i class="sort-ico ph ph-arrows-down-up" style="color:#cbd5e1;font-size:0.8rem;"></i></th>
                            <th class="multa-th-sort" data-col="status" onclick="ordenarMultas('status')" style="padding:1rem; font-weight:600; color:#475569; cursor:pointer; user-select:none; white-space:nowrap;">Status RH <i class="sort-ico ph ph-arrows-down-up" style="color:#cbd5e1;font-size:0.8rem;"></i></th>
                            <th class="multa-th-sort" data-col="status_monaco" onclick="ordenarMultas('status_monaco')" style="padding:1rem; font-weight:600; color:#475569; cursor:pointer; user-select:none; white-space:nowrap;">Status Mônaco <i class="sort-ico ph ph-arrows-down-up" style="color:#cbd5e1;font-size:0.8rem;"></i></th>
                            <th class="multa-th-sort" data-col="data_limite" onclick="ordenarMultas('data_limite')" style="padding:1rem; font-weight:600; color:#475569; cursor:pointer; user-select:none; white-space:nowrap;">Data Limite <i class="sort-ico ph ph-arrows-down-up" style="color:#cbd5e1;font-size:0.8rem;"></i></th>
                            <th style="padding:1rem; font-weight:600; color:#475569; text-align:center;">Ações</th>
                        </tr>
                    </thead>
                    <tbody id="multas-tbody">
    `;

    const listaFiltrada = _aplicarFiltrosMultas(multasLogistica);

    if (listaFiltrada.length === 0) {
        html += `<tr><td colspan="9" style="padding:2rem; text-align:center; color:#64748b;">Nenhuma multa encontrada.</td></tr>`;
    } else {
        listaFiltrada.forEach(m => {
            const dataInfracao = m.data_infracao ? m.data_infracao.split('-').reverse().join('/') : '—';
            
            let motoristaHtml = '';
            if (m.motorista_id && m.motorista_nome) {
                if (String(m.motorista_id) === '-1') {
                    motoristaHtml = `<span style="font-weight:600; color:#ef4444;" title="Ex Colaborador">${m.motorista_nome}</span>`;
                } else {
                    motoristaHtml = `<span style="font-weight:600; color:#0f172a;">${m.motorista_nome}</span>`;
                }
            } else {
                if (m.status === 'Indicado' || m.status === 'Multa NIC') {
                    motoristaHtml = `<span style="color:#94a3b8; font-size:0.8rem;">—</span>`;
                } else {
                    motoristaHtml = `<button onclick="abrirModalGerenciarMulta(${m.id}, true)" style="background:#f1f5f9; color:#2563eb; border:1px solid #cbd5e1; padding:0.3rem 0.6rem; border-radius:4px; cursor:pointer; font-size:0.8rem; font-weight:600;">+ Adicionar Motorista</button>`;
                }
            }

            let statusColor = '#e2e8f0';
            if (m.status === 'Conferência') statusColor = '#fef08a';
            else if (m.status === 'Conferido') statusColor = '#bfdbfe';
            else if (m.status === 'Indicado') statusColor = '#bbf7d0';
            else if (m.status === 'Multa NIC') statusColor = '#fecaca';
            else if (m.status === 'Não Se Aplica') statusColor = '#cbd5e1';

            let statusMonacoHtml = '';
            if (m.status_monaco) {
                statusMonacoHtml = `<span style="background:#f1f5f9; color:#475569; padding:4px 8px; border-radius:12px; font-size:0.75rem; font-weight:700; white-space:nowrap; border:1px solid #cbd5e1;"><i class="ph ph-police-car"></i> ${m.status_monaco}</span>`;
            } else {
                statusMonacoHtml = `<span style="color:#94a3b8; font-size:0.8rem;">—</span>`;
            }

            let docsExtrasList = [];
            try { docsExtrasList = JSON.parse(m.documentos_extras || '[]'); } catch(e){}
            const olhoAzul = docsExtrasList[0] ? `<button onclick="visualizarDocExtra(${m.id}, 0)" style="background:transparent; border:none; cursor:pointer; color:#3b82f6; margin-right:8px;" title="Visualizar Documento 1"><i class="ph ph-eye" style="font-size:1.2rem;"></i></button>` : '';
            const olhoVerde = docsExtrasList[1] ? `<button onclick="visualizarDocExtra(${m.id}, 1)" style="background:transparent; border:none; cursor:pointer; color:#10b981; margin-right:8px;" title="Visualizar Documento 2"><i class="ph ph-eye" style="font-size:1.2rem;"></i></button>` : '';

            html += `
                <tr style="border-bottom:1px solid #e2e8f0; transition:background 0.2s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='transparent'">
                    <td style="padding:1rem;"><strong>${m.numero_ait || '—'}</strong></td>
                    <td style="padding:1rem; font-weight:600; color:#334155; white-space:nowrap;">${m.placa || '—'}</td>
                    <td style="padding:1rem;">${dataInfracao}<br><span style="color:#64748b; font-size:0.8rem;">${m.hora_infracao || '—'}</span></td>
                    <td style="padding:1rem; max-width:200px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${m.motivo || ''}">${m.motivo || '—'}</td>
                    <td style="padding:1rem;">${motoristaHtml}</td>
                    <td style="padding:1rem;">
                        <span style="background:${statusColor}; color:#0f172a; padding:4px 8px; border-radius:12px; font-size:0.8rem; font-weight:600; white-space:nowrap;">
                            ${m.status || '—'}
                        </span>
                    </td>
                    <td style="padding:1rem;">${statusMonacoHtml}</td>
                    <td style="padding:1rem; white-space:nowrap;">${_dataLimiteBadge(m.data_limite)}</td>
                    <td style="padding:1rem; text-align:center; min-width:140px; white-space:nowrap;">
                        ${(m.status === 'Indicado' || m.status === 'Multa NIC') ?
                            `<button onclick="abrirModalGerenciarMulta(${m.id})" style="background:transparent; border:none; cursor:pointer; color:#64748b; margin-right:8px;" title="Visualizar"><i class="ph ph-magnifying-glass" style="font-size:1.2rem;"></i></button>`
                            :
                            `<button onclick="abrirModalGerenciarMulta(${m.id})" style="background:transparent; border:none; cursor:pointer; color:#2563eb; margin-right:8px;" title="Gerenciar/Editar"><i class="ph ph-pencil-simple" style="font-size:1.2rem;"></i></button>`
                        }
                        ${olhoAzul}
                        ${olhoVerde}
                        ${m.link_formulario ? `<button onclick="window.open(String('${m.link_formulario}').startsWith('http') ? '${m.link_formulario}' : 'https://${m.link_formulario}', '_blank')" style="background:transparent; border:none; cursor:pointer; color:#8b5cf6; margin-right:8px;" title="Abrir Formulário Externo"><i class="ph ph-link" style="font-size:1.2rem;"></i></button>` : ''}
                        ${(m.status === 'Indicado' || m.status === 'Multa NIC') ? '' : `<button onclick="confirmarExcluirMulta(${m.id})" style="background:transparent; border:none; cursor:pointer; color:#ef4444;" title="Excluir"><i class="ph ph-trash" style="font-size:1.2rem;"></i></button>`}
                    </td>
                </tr>
            `;
        });
    }

    html += `
                    </tbody>
                </table>
            </div>
        </div>
    `;

    container.innerHTML = html;
}

function _aplicarFiltrosMultas(lista) {
    const motorista = (document.getElementById('mf-motorista')?.value || '').toLowerCase().trim();
    const ait       = (document.getElementById('mf-ait')?.value || '').toLowerCase().trim();
    const de        = document.getElementById('mf-de')?.value || '';
    const ate       = document.getElementById('mf-ate')?.value || '';
    const status    = document.getElementById('mf-status')?.value || '';

    return lista.filter(m => {
        if (motorista && !(m.motorista_nome || '').toLowerCase().includes(motorista)) return false;
        if (ait && !(m.numero_ait || '').toLowerCase().includes(ait)) return false;
        if (de && m.data_infracao && m.data_infracao < de) return false;
        if (ate && m.data_infracao && m.data_infracao > ate) return false;
        if (status && m.status !== status) return false;
        return true;
    });
}

function filtrarMultasLogistica() {
    // Atualiza só o tbody sem re-render completo (preserva os filtros preenchidos)
    const tbody = document.getElementById('multas-tbody');
    if (!tbody) return;

    const listaFiltrada = _aplicarFiltrosMultas(multasLogistica);

    // Aplicar ordenação
    listaFiltrada.sort((a, b) => {
        let va = (a[_multasSortCol] || '').toString().toLowerCase();
        let vb = (b[_multasSortCol] || '').toString().toLowerCase();
        if (va < vb) return _multasSortDir === 'asc' ? -1 : 1;
        if (va > vb) return _multasSortDir === 'asc' ? 1 : -1;
        return 0;
    });

    if (listaFiltrada.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="padding:2rem; text-align:center; color:#64748b;">Nenhuma multa encontrada com esses filtros.</td></tr>`;
        return;
    }

    tbody.innerHTML = listaFiltrada.map(m => {

        const dataInfracao = m.data_infracao ? m.data_infracao.split('-').reverse().join('/') : '—';
        let motoristaHtml = m.motorista_id && m.motorista_nome
            ? (String(m.motorista_id) === '-1' ? `<span style="font-weight:600; color:#ef4444;" title="Ex Colaborador">${m.motorista_nome}</span>` : `<span style="font-weight:600; color:#0f172a;">${m.motorista_nome}</span>`)
            : `<button onclick="abrirModalGerenciarMulta(${m.id}, true)" style="background:#f1f5f9; color:#2563eb; border:1px solid #cbd5e1; padding:0.3rem 0.6rem; border-radius:4px; cursor:pointer; font-size:0.8rem; font-weight:600;">+ Adicionar Motorista</button>`;
        let statusColor = '#e2e8f0';
        if (m.status === 'Conferência') statusColor = '#fef08a';
        else if (m.status === 'Conferido') statusColor = '#bfdbfe';
        else if (m.status === 'Indicado') statusColor = '#bbf7d0';
        else if (m.status === 'Multa NIC') statusColor = '#fecaca';
        else if (m.status === 'Não Se Aplica') statusColor = '#cbd5e1';
        return `
            <tr style="border-bottom:1px solid #e2e8f0; transition:background 0.2s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='transparent'">
                <td style="padding:1rem;"><strong>${m.numero_ait||'—'}</strong></td>
                <td style="padding:1rem; font-weight:600; color:#334155; white-space:nowrap;">${m.placa||'—'}</td>
                <td style="padding:1rem;">${dataInfracao}<br><span style="color:#64748b; font-size:0.8rem;">${m.hora_infracao||'—'}</span></td>
                <td style="padding:1rem; max-width:200px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${m.motivo||''}">${m.motivo||'—'}</td>
                <td style="padding:1rem;">${motoristaHtml}</td>
                <td style="padding:1rem;"><span style="background:${statusColor}; color:#0f172a; padding:4px 8px; border-radius:12px; font-size:0.8rem; font-weight:600; white-space:nowrap;">${m.status||'—'}</span></td>
                <td style="padding:1rem; white-space:nowrap;">${_dataLimiteBadge(m.data_limite)}</td>
                <td style="padding:1rem; text-align:center;">
                    <button onclick="abrirModalGerenciarMulta(${m.id})" style="background:transparent; border:none; cursor:pointer; color:#2563eb; margin-right:8px;" title="Gerenciar/Editar"><i class="ph ph-pencil-simple" style="font-size:1.2rem;"></i></button>
                    ${(m.documento_base64||m.documento_path) ? `<button onclick="visualizarDocumentoMulta(${m.id})" style="background:transparent; border:none; cursor:pointer; color:#10b981; margin-right:8px;" title="Visualizar Documento"><i class="ph ph-file-pdf" style="font-size:1.2rem;"></i></button>` : ''}
                    ${m.link_formulario ? `<button onclick="window.open(String('${m.link_formulario}').startsWith('http') ? '${m.link_formulario}' : 'https://${m.link_formulario}', '_blank')" style="background:transparent; border:none; cursor:pointer; color:#8b5cf6; margin-right:8px;" title="Abrir Formulário Externo"><i class="ph ph-link" style="font-size:1.2rem;"></i></button>` : ''}
                    <button onclick="confirmarExcluirMulta(${m.id})" style="background:transparent; border:none; cursor:pointer; color:#ef4444;" title="Excluir"><i class="ph ph-trash" style="font-size:1.2rem;"></i></button>
                </td>
            </tr>`;
    }).join('');
}

function limparFiltrosMultas() {
    ['mf-motorista','mf-ait','mf-de','mf-ate'].forEach(id => {
        const el = document.getElementById(id); if (el) el.value = '';
    });
    const sel = document.getElementById('mf-status'); if (sel) sel.value = '';
    filtrarMultasLogistica();
}

function abrirModalNovaMulta() {
    document.getElementById('modal-nova-multa')?.remove();
    const modal = document.createElement('div');
    modal.id = 'modal-nova-multa';
    modal.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); display:flex; justify-content:center; align-items:center; z-index:9999;';
    
    modal.innerHTML = `
        <div style="background:#fff; width:800px; max-width:95%; max-height:95vh; display:flex; flex-direction:column; border-radius:10px; overflow:hidden; box-shadow:0 10px 25px rgba(0,0,0,0.2);">
            <div style="background:#f8fafc; padding:1.2rem 1.5rem; border-bottom:1px solid #e2e8f0; display:flex; justify-content:space-between; align-items:center; flex-shrink:0;">
                <h3 style="margin:0; color:#0f172a; font-size:1.2rem;">&#128196; Nova Multa</h3>
                <button onclick="this.closest('#modal-nova-multa').remove()" style="background:none; border:none; font-size:1.5rem; cursor:pointer; color:#64748b;">&times;</button>
            </div>
            <div style="padding:1.5rem; overflow-y:auto; flex:1;">
                <form id="form-nova-multa" onsubmit="salvarNovaMultaLogistica(event)">

                    <!-- ABAS: PDF ou Colar Texto -->
                    <div style="margin-bottom:1.3rem;">
                        <div style="display:flex; border-bottom:2px solid #e2e8f0; margin-bottom:0;">
                            <button type="button" id="nm-tab-pdf" onclick="_nmAba('pdf')" style="padding:0.5rem 1.1rem; border:none; background:#dbeafe; color:#1d4ed8; font-weight:700; font-size:0.85rem; border-radius:6px 6px 0 0; cursor:pointer; border-bottom:2px solid #2563eb; margin-bottom:-2px;">&#129302; Anexar PDF</button>
                            <button type="button" id="nm-tab-texto" onclick="_nmAba('texto')" style="padding:0.5rem 1.1rem; border:none; background:transparent; color:#64748b; font-weight:600; font-size:0.85rem; border-radius:6px 6px 0 0; cursor:pointer; margin-left:4px;">&#128203; Colar Texto</button>
                        </div>

                        <!-- ABA PDF -->
                        <div id="nm-painel-pdf" style="background:linear-gradient(135deg,#eff6ff,#dbeafe); border:1.5px dashed #3b82f6; border-radius:0 6px 6px 6px; padding:1rem 1.2rem;">
                            <p style="margin:0 0 0.7rem; color:#475569; font-size:0.82rem;">Anexe o documento da multa e os campos serão preenchidos automaticamente: Data, Hora, Número AIT, Motivo, Valor, Pontuação e Data Limite.</p>
                            <input type="file" id="nm-doc" accept=".pdf" onchange="processarPDFMulta(this)" style="width:100%; padding:0.4rem 0.5rem; border:1px solid #bfdbfe; border-radius:5px; background:white; font-size:0.85rem; cursor:pointer;">
                        </div>

                        <!-- ABA TEXTO -->
                        <div id="nm-painel-texto" style="display:none; background:linear-gradient(135deg,#f0fdf4,#dcfce7); border:1.5px dashed #22c55e; border-radius:0 6px 6px 6px; padding:1rem 1.2rem;">
                            <p style="margin:0 0 0.7rem; color:#166534; font-size:0.82rem;">Cole abaixo o texto da notificação de multa. O sistema reconhece os campos automaticamente.</p>
                            <textarea id="nm-texto-bruto" rows="9" placeholder="Placa:\nSWF2H28\nAIT:\n1VA2535356\nDescrição:\nTRANSITAR EM VELOCIDADE...\nEndereço da Infração:\nSp 021 Km 095 M 700\nData e Hora da Infração:\n23/03/2026 19:11\nPontuação:\n4\nPrazo Indicação de Condutor:\n01/05/2026\nValor da Infração:\nR$ 130,16" style="width:100%; padding:0.6rem; border:1px solid #86efac; border-radius:5px; font-family:monospace; font-size:0.8rem; resize:vertical; box-sizing:border-box;"></textarea>
                            <button type="button" onclick="interpretarTextoMulta()" style="margin-top:0.6rem; padding:0.5rem 1.2rem; background:#16a34a; color:white; border:none; border-radius:5px; cursor:pointer; font-weight:700; font-size:0.85rem;">&#9889; Preencher Campos</button>
                            <span id="nm-texto-status" style="margin-left:0.8rem; font-size:0.82rem; color:#166534;"></span>
                        </div>
                    </div>

                    <div style="display:flex; gap:1rem; margin-bottom:1rem; flex-wrap:wrap;">
                        <div style="flex:1; min-width:180px;">
                            <label style="display:block; margin-bottom:0.3rem; font-size:0.85rem; font-weight:600; color:#475569;">Data Infração *</label>
                            <input type="date" id="nm-data" required style="width:100%; padding:0.6rem; border:1px solid #cbd5e1; border-radius:4px;">
                        </div>
                        <div style="flex:1; min-width:120px;">
                            <label style="display:block; margin-bottom:0.3rem; font-size:0.85rem; font-weight:600; color:#475569;">Hora</label>
                            <input type="time" id="nm-hora" style="width:100%; padding:0.6rem; border:1px solid #cbd5e1; border-radius:4px;">
                        </div>
                        <div style="flex:2; min-width:200px;">
                            <label style="display:block; margin-bottom:0.3rem; font-size:0.85rem; font-weight:600; color:#475569;">Número AIT *</label>
                            <input type="text" id="nm-ait" required placeholder="Ex: AA123456789" style="width:100%; padding:0.6rem; border:1px solid #cbd5e1; border-radius:4px;">
                        </div>
                    </div>

                    <div style="display:flex; gap:1rem; margin-bottom:1rem; flex-wrap:wrap;">
                        <div style="flex:1; min-width:150px;">
                            <label style="display:block; margin-bottom:0.3rem; font-size:0.85rem; font-weight:600; color:#475569;">Placa</label>
                            <input type="text" id="nm-placa" placeholder="ABC1D23" style="width:100%; padding:0.6rem; border:1px solid #cbd5e1; border-radius:4px;">
                        </div>
                        <div style="flex:3; min-width:300px;">
                            <label style="display:block; margin-bottom:0.3rem; font-size:0.85rem; font-weight:600; color:#475569;">Local da Infração</label>
                            <input type="text" id="nm-local" style="width:100%; padding:0.6rem; border:1px solid #cbd5e1; border-radius:4px;">
                        </div>
                    </div>

                    <div style="display:flex; gap:1rem; margin-bottom:1rem; flex-wrap:wrap;">
                        <div style="flex:2; min-width:250px;">
                            <label style="display:block; margin-bottom:0.3rem; font-size:0.85rem; font-weight:600; color:#475569;">Motivo da Multa</label>
                            <input type="text" id="nm-motivo" style="width:100%; padding:0.6rem; border:1px solid #cbd5e1; border-radius:4px;">
                        </div>
                        <div style="flex:1; min-width:120px;">
                            <label style="display:block; margin-bottom:0.3rem; font-size:0.85rem; font-weight:600; color:#475569;">Valor (R$)</label>
                            <input type="text" id="nm-valor" placeholder="0,00" style="width:100%; padding:0.6rem; border:1px solid #cbd5e1; border-radius:4px;">
                        </div>
                        <div style="flex:1; min-width:120px;">
                            <label style="display:block; margin-bottom:0.3rem; font-size:0.85rem; font-weight:600; color:#475569;">Pontuação <span id="nm-pontos-badge" style="display:none; background:#fef08a; color:#854d0e; padding:1px 6px; border-radius:8px; font-size:0.72rem; font-weight:700;">Auto</span></label>
                            <input type="number" id="nm-pontos" placeholder="0" style="width:100%; padding:0.6rem; border:1px solid #cbd5e1; border-radius:4px;">
                        </div>
                    </div>

                    <div style="margin-bottom:1rem; background:#fff7ed; border:1.5px solid #fed7aa; border-radius:8px; padding:0.85rem 1rem;">
                        <label style="display:block; margin-bottom:0.3rem; font-size:0.85rem; font-weight:700; color:#c2410c;">&#128197; Data Limite &mdash; Indicação de Condutor / Defesa de Autuação</label>
                        <input type="date" id="nm-data-limite" style="width:100%; padding:0.6rem; border:1px solid #fed7aa; border-radius:4px; font-size:0.9rem;">
                    </div>

                    <!-- NOVOS CAMPOS: Motorista e Resolução -->
                    <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:1rem 1.2rem; margin-bottom:1.3rem;">
                        <h4 style="margin:0 0 1rem; color:#334155; font-size:0.95rem;">&#128100; Vínculo e Resolução (Opcional)</h4>
                        
                        <div style="display:flex; gap:1rem; margin-bottom:1rem; flex-wrap:wrap;">
                            <div style="flex:2; min-width:200px;">
                                <label style="display:block; margin-bottom:0.3rem; font-size:0.85rem; font-weight:600; color:#475569;">Motorista</label>
                                <select id="nm-motorista" style="width:100%; padding:0.6rem; border:1px solid #cbd5e1; border-radius:4px;">
                                    <option value="">-- Selecione o Motorista (Deixe em branco se não souber) --</option>
                                    <option value="-1">Ex Colaborador</option>
                                    ${(window.colaboradoresMultas || []).map(c => `<option value="${c.id}">${c.nome_completo || c.nome}</option>`).join('')}
                                </select>
                            </div>
                        </div>

                        <div style="display:flex; gap:1rem; flex-wrap:wrap;">
                            <div style="flex:2; min-width:200px;">
                                <label style="display:block; margin-bottom:0.3rem; font-size:0.85rem; font-weight:600; color:#475569;">Forma de Resolução</label>
                                <select id="nm-status" style="width:100%; padding:0.6rem; border:1px solid #cbd5e1; border-radius:4px;">
                                    <option value="Conferência">Em Conferência (Padrão)</option>
                                    <option value="Indicado">📋 Seguiu com a Indicação</option>
                                    <option value="Multa NIC">💳 Optou por Pagar Multa NIC</option>
                                    <option value="Conferido">Conferido</option>
                                    <option value="Não Se Aplica">Não Se Aplica</option>
                                </select>
                            </div>
                            <div style="flex:1; min-width:120px;">
                                <label style="display:block; margin-bottom:0.3rem; font-size:0.85rem; font-weight:600; color:#475569;">Parcelas</label>
                                <select id="nm-parcelas" style="width:100%; padding:0.6rem; border:1px solid #cbd5e1; border-radius:4px;">
                                    <option value="1">1x</option>
                                    <option value="2">2x</option>
                                    <option value="3">3x</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div style="display:flex; justify-content:flex-end; gap:1rem;">
                        <button type="button" onclick="this.closest('#modal-nova-multa').remove()" style="padding:0.6rem 1.2rem; background:#f1f5f9; border:1px solid #cbd5e1; border-radius:4px; cursor:pointer; font-weight:600; color:#475569;">Cancelar</button>
                        <button type="submit" style="padding:0.6rem 1.2rem; background:#2563eb; color:white; border:none; border-radius:4px; cursor:pointer; font-weight:600;">Salvar Multa</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

// Controla a aba ativa no modal Nova Multa
function _nmAba(aba) {
    const painelPdf   = document.getElementById('nm-painel-pdf');
    const painelTexto = document.getElementById('nm-painel-texto');
    const tabPdf      = document.getElementById('nm-tab-pdf');
    const tabTexto    = document.getElementById('nm-tab-texto');
    if (!painelPdf) return;
    const ativo   = 'padding:0.5rem 1.1rem; border:none; background:#dbeafe; color:#1d4ed8; font-weight:700; font-size:0.85rem; border-radius:6px 6px 0 0; cursor:pointer; border-bottom:2px solid #2563eb; margin-bottom:-2px;';
    const inativo = 'padding:0.5rem 1.1rem; border:none; background:transparent; color:#64748b; font-weight:600; font-size:0.85rem; border-radius:6px 6px 0 0; cursor:pointer; margin-left:4px;';
    if (aba === 'pdf') {
        painelPdf.style.display   = 'block';
        painelTexto.style.display = 'none';
        tabPdf.style.cssText      = ativo;
        tabTexto.style.cssText    = inativo;
    } else {
        painelPdf.style.display   = 'none';
        painelTexto.style.display = 'block';
        tabPdf.style.cssText      = inativo.replace('margin-left:4px;', '');
        tabTexto.style.cssText    = ativo;
    }
}

// Parseia o texto colado e preenche os campos do formulário
function interpretarTextoMulta() {
    const texto = (document.getElementById('nm-texto-bruto')?.value || '').trim();
    if (!texto) { mostrarToastAviso('Cole o texto da notificação antes de clicar em Preencher.'); return; }

    // Normaliza quebras de linha e divide por linhas
    const linhas = texto.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').map(l => l.trim());

    // Mapa de campos: [aliases do label] → [id do input]
    const mapa = [
        { labels: ['placa'],                                   campo: 'nm-placa'      },
        { labels: ['ait', 'auto de infração', 'numero ait'],   campo: 'nm-ait'        },
        { labels: ['descrição', 'descricao', 'enquadramento',
                   'enquadramento/descrição', 'descrição da infração',
                   'motivo', 'infração'],                      campo: 'nm-motivo'     },
        { labels: ['endereço da infração', 'endereco da infracao',
                   'endereço', 'local', 'local da infração'],  campo: 'nm-local'      },
        { labels: ['pontuação', 'pontuacao', 'pontos'],        campo: 'nm-pontos'     },
        { labels: ['prazo indicação', 'prazo indicacao',
                   'prazo de indicação', 'data limite',
                   'prazo indicação de condutor',
                   'prazo defesa'],                            campo: 'nm-data-limite', tipo: 'data_br' },
        { labels: ['valor da infração', 'valor da infracao',
                   'valor', 'valor da multa'],                 campo: 'nm-valor',       tipo: 'valor'  },
        { labels: ['data e hora', 'data da infração',
                   'data/hora', 'data e hora da infração'],    campo: 'nm-data',        tipo: 'dataHora'},
    ];

    function normLabel(s) {
        return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s]/g, '').trim();
    }
    function dataBrToIso(s) {
        // 23/03/2026 → 2026-03-23
        const m = s.match(/(\d{1,2})[\\/\-](\d{1,2})[\\/\-](\d{4})/);
        if (!m) return '';
        return `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;
    }
    function extrairValor(s) {
        // "R$ 130,16" → "130,16"
        return s.replace(/R\$\s*/i, '').trim();
    }

    let preenchidos = [];
    let i = 0;
    while (i < linhas.length) {
        const linha = linhas[i];
        const linhaNorm = normLabel(linha.replace(/:$/, ''));

        // Verifica se a linha é um label conhecido
        const campo = mapa.find(m => m.labels.some(l => normLabel(l) === linhaNorm));
        if (campo) {
            // Valor está na próxima linha não vazia
            let valor = '';
            let j = i + 1;
            while (j < linhas.length && linhas[j].trim() === '') j++;
            if (j < linhas.length) valor = linhas[j].trim();

            const el = document.getElementById(campo.campo);
            if (el && valor) {
                if (campo.tipo === 'dataHora') {
                    // "23/03/2026 19:11" → data e hora separados
                    const partes = valor.split(' ');
                    const dataIso = dataBrToIso(partes[0] || '');
                    const hora    = (partes[1] || '').substring(0, 5);
                    if (dataIso) {
                        document.getElementById('nm-data').value = dataIso;
                        if (hora) document.getElementById('nm-hora').value = hora;
                        preenchidos.push('Data/Hora');
                    }
                } else if (campo.tipo === 'data_br') {
                    const dataIso = dataBrToIso(valor);
                    if (dataIso) { el.value = dataIso; preenchidos.push(campo.campo); }
                } else if (campo.tipo === 'valor') {
                    el.value = extrairValor(valor);
                    preenchidos.push(campo.campo);
                } else {
                    el.value = valor;
                    preenchidos.push(campo.campo);
                }
            }
            i = j + 1;
        } else {
            i++;
        }
    }

    const status = document.getElementById('nm-texto-status');
    if (preenchidos.length > 0) {
        if (status) status.textContent = `✅ ${preenchidos.length} campo(s) preenchido(s)!`;
        mostrarToastSucesso(`✅ ${preenchidos.length} campo(s) preenchido(s) com sucesso!`);
    } else {
        if (status) status.textContent = '⚠️ Nenhum campo reconhecido.';
        mostrarToastAviso('Nenhum campo foi reconhecido. Verifique o formato do texto.');
    }
}

async function salvarNovaMultaLogistica(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Conectando...';

    const token = localStorage.getItem('erp_token') || localStorage.getItem('token') || '';

    // Helper: aguardar N milissegundos
    const sleep = ms => new Promise(r => setTimeout(r, ms));

    // Helper: fetch com retry automático (acorda o servidor Render se estiver dormindo)
    async function fetchComRetry(url, options, tentativas = 3, delayMs = 2000) {
        for (let i = 0; i < tentativas; i++) {
            try {
                const resp = await fetch(url, options);
                return resp;
            } catch (err) {
                if (i === tentativas - 1) throw err; // última tentativa: propaga o erro
                console.warn(`[fetchComRetry] Tentativa ${i + 1} falhou (${err.message}). Aguardando ${delayMs}ms...`);
                btn.textContent = `Reconectando (${i + 2}/${tentativas})...`;
                await sleep(delayMs);
                delayMs = Math.min(delayMs * 2, 8000); // delay progressivo: 2s, 4s, 8s
            }
        }
    }

    // Dados textuais (sem PDF — enviado separadamente para evitar timeout)
    const formData = new FormData();
    formData.append('data_infracao', document.getElementById('nm-data').value);
    formData.append('hora_infracao', document.getElementById('nm-hora').value);
    formData.append('numero_ait', document.getElementById('nm-ait').value);
    formData.append('motivo', document.getElementById('nm-motivo').value);
    formData.append('valor_multa', document.getElementById('nm-valor').value);
    formData.append('placa', document.getElementById('nm-placa').value);
    formData.append('local_infracao', document.getElementById('nm-local').value);
    formData.append('pontuacao', document.getElementById('nm-pontos').value);
    formData.append('data_limite', document.getElementById('nm-data-limite')?.value || '');

    const motoristaId = document.getElementById('nm-motorista')?.value || '';
    if (motoristaId) {
        formData.append('motorista_id', motoristaId);
        if (motoristaId === '-1') {
            formData.append('motorista_nome', 'Ex Colaborador');
        } else {
            const mSel = document.getElementById('nm-motorista');
            formData.append('motorista_nome', mSel.options[mSel.selectedIndex].text);
        }
    }
    const statusVal = document.getElementById('nm-status')?.value || '';
    if (statusVal) formData.append('status', statusVal);
    const parcVal = document.getElementById('nm-parcelas')?.value || '';
    if (parcVal) formData.append('parcelas', parcVal);

    try {
        btn.textContent = 'Salvando...';
        const response = await fetchComRetry('/api/logistica/multas', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.error || `Erro HTTP ${response.status}`);
        }

        const result = await response.json();
        const novoId = result.id;

        // 2ª etapa: se há PDF, envia separadamente via /documento-extra
        const fileInput = document.getElementById('nm-doc');
        if (novoId && fileInput && fileInput.files.length > 0) {
            btn.textContent = 'Anexando PDF...';
            try {
                const fdDoc = new FormData();
                fdDoc.append('documento', fileInput.files[0]);
                const docResp = await fetchComRetry(`/api/logistica/multas/${novoId}/documento-extra`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` },
                    body: fdDoc
                });
                if (!docResp.ok) {
                    mostrarToastAviso('Multa criada, mas falha ao anexar PDF. Anexe pelo ✏️ Gerenciar.');
                }
            } catch (docErr) {
                console.warn('[salvarNovaMulta] Erro ao enviar PDF:', docErr.message);
                mostrarToastAviso('Multa criada, mas falha ao anexar PDF. Anexe pelo ✏️ Gerenciar.');
            }
        }

        document.getElementById('modal-nova-multa')?.remove();
        await carregarMultasLogistica();
        mostrarToastSucesso('✅ Multa cadastrada com sucesso!');

    } catch (err) {
        console.error('[salvarNovaMulta]', err);
        btn.disabled = false;
        btn.textContent = 'Iniciar Processo';
        mostrarToastErro('Erro ao salvar: ' + err.message + ' — Tente novamente.');
    }
}


function abrirModalGerenciarMulta(id, focoMotorista = false) {
    const multa = multasLogistica.find(m => m.id === id);
    if (!multa) return;
    const modoLeitura = (multa.status === 'Indicado' || multa.status === 'Multa NIC');

    document.getElementById('modal-gerenciar-multa')?.remove();
    const modal = document.createElement('div');
    modal.id = 'modal-gerenciar-multa';
    modal.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); display:flex; justify-content:center; align-items:center; z-index:9999; padding:1rem;';

    let optionsMotoristas = `<option value="">-- Selecione o Motorista --</option>`;
    const selEx = (multa.motorista_id == -1) ? 'selected' : '';
    optionsMotoristas += `<option value="-1" ${selEx}>Ex Colaborador</option>`;
    
    colaboradoresMultas.forEach(c => {
        const nome = c.nome_completo || c.nome || 'Sem nome';
        const sel = multa.motorista_id === c.id ? 'selected' : '';
        optionsMotoristas += `<option value="${c.id}" ${sel}>${nome}</option>`;
    });

    const statusOpts = ['Conferência', 'Conferido', 'Indicado', 'Multa NIC', 'Não Se Aplica'];
    let optionsStatus = '';
    statusOpts.forEach(s => {
        const sel = (multa.status === s) ? 'selected' : '';
        optionsStatus += `<option value="${s}" ${sel}>${s}</option>`;
    });

    // Dados do motorista selecionado (se houver)
    const motoristaColab = multa.motorista_id ? colaboradoresMultas.find(c => c.id === multa.motorista_id) : null;
    const cpf = multa.motorista_cpf || motoristaColab?.cpf || '';
    const habilitacao = multa.motorista_habilitacao || motoristaColab?.cnh_numero || '';
    const endereco = motoristaColab?.endereco || '';
    const endEsc = endereco.replace(/'/g, "'");
    const token = localStorage.getItem('erp_token') || localStorage.getItem('token') || '';

    // Bloco info motorista
    const motoristaInfoHtml = motoristaColab ? `
        <div id="gm-info-motorista" style="background:#f0fdf4; border:1px solid #86efac; border-radius:8px; padding:0.85rem 1rem; margin-bottom:1rem; display:flex; flex-direction:column; gap:0.35rem;">
            <div style="display:flex; align-items:center; gap:6px;">
                <i class="ph ph-user" style="color:#166534;"></i>
                <span style="font-size:0.88rem; color:#166534; font-weight:700;">${motoristaColab.nome_completo || motoristaColab.nome}</span>
                <button type="button" onclick="navigator.clipboard.writeText('${(motoristaColab.nome_completo || motoristaColab.nome)}'); mostrarToastSucesso('Nome copiado!'); event.stopPropagation();" title="Copiar Nome" style="background:none;border:none;cursor:pointer;color:#2563eb;font-size:0.9rem;padding:0;"><i class="ph ph-copy"></i></button>
            </div>
            ${cpf ? `<div style="display:flex; align-items:center; gap:6px; padding-left:1.2rem;">
                <span style="font-size:0.8rem; color:#374151;"><b>CPF:</b> <code id="gm-cpf-val">${cpf}</code></span>
                <button type="button" onclick="navigator.clipboard.writeText('${cpf}'); mostrarToastSucesso('CPF copiado!'); event.stopPropagation();" title="Copiar CPF" style="background:none;border:none;cursor:pointer;color:#2563eb;font-size:0.9rem;padding:0;"><i class="ph ph-copy"></i></button>
            </div>` : ''}
            ${habilitacao ? `<div style="display:flex; align-items:center; gap:6px; padding-left:1.2rem;">
                <span style="font-size:0.8rem; color:#374151;"><b>CNH:</b> <code id="gm-hab-val">${habilitacao}</code></span>
                <button type="button" onclick="navigator.clipboard.writeText('${habilitacao}'); mostrarToastSucesso('Nº CNH copiado!'); event.stopPropagation();" title="Copiar CNH" style="background:none;border:none;cursor:pointer;color:#2563eb;font-size:0.9rem;padding:0;"><i class="ph ph-copy"></i></button>
                ${multa.motorista_id ? `<button type="button" onclick="baixarCNHMotorista(${multa.motorista_id}); event.stopPropagation();" title="Baixar CNH" style="background:#dbeafe;color:#1d4ed8;border:1px solid #93c5fd;border-radius:6px;padding:2px 10px;font-size:0.78rem;cursor:pointer;font-weight:600;display:inline-flex;align-items:center;gap:4px;"><i class="ph ph-download-simple"></i> CNH</button>` : ''}
            </div>` : '${multa.motorista_id ? `<div style="padding-left:1.2rem;"><button type="button" onclick="baixarCNHMotorista(${multa.motorista_id}); event.stopPropagation();" title="Baixar CNH" style="background:#dbeafe;color:#1d4ed8;border:1px solid #93c5fd;border-radius:6px;padding:2px 10px;font-size:0.78rem;cursor:pointer;font-weight:600;display:inline-flex;align-items:center;gap:4px;"><i class="ph ph-download-simple"></i> CNH</button></div>` : ""}'}
            ${endEsc ? `<div style="display:flex; align-items:center; gap:6px; padding-left:1.2rem;">
                <span style="font-size:0.8rem; color:#374151;"><b>Endereço:</b> <code id="gm-end-val">${endEsc}</code></span>
                <button type="button" onclick="navigator.clipboard.writeText('${endEsc}'); mostrarToastSucesso('Endereço copiado!'); event.stopPropagation();" title="Copiar Endereço" style="background:none;border:none;cursor:pointer;color:#2563eb;font-size:0.9rem;padding:0;"><i class="ph ph-copy"></i></button>
            </div>` : ''}
        </div>` : '';

    // Documentos extras já salvos
    let docsExtras = [];
    try { docsExtras = JSON.parse(multa.documentos_extras || '[]'); } catch(_) {}
    const docsHtml = docsExtras.map((d, i) => {
        // Corrige mojibake em nomes ja armazenados com encoding errado
        let nomeExibir = d.nome || 'Documento ' + (i + 1);
        try { nomeExibir = decodeURIComponent(escape(nomeExibir)); } catch(_) {}
        return `
        <div style="display:flex; align-items:center; gap:8px; padding:6px 8px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; margin-bottom:6px;">
            <i class="ph ph-file" style="color:#64748b;"></i>
            <span style="flex:1; font-size:0.8rem; color:#334155; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${nomeExibir}</span>
            <button type="button" onclick="visualizarDocExtra(${id}, ${i}); event.stopPropagation();" title="Visualizar" style="background:#dbeafe;color:#1d4ed8;border:1px solid #93c5fd;border-radius:5px;padding:3px 8px;cursor:pointer;font-size:0.8rem;display:inline-flex;align-items:center;gap:3px;"><i class="ph ph-eye"></i></button>
            ${modoLeitura ? '' : `<button type="button" onclick="excluirDocExtra(${id}, ${i}); event.stopPropagation();" title="Excluir Anexo" style="background:#fee2e2;color:#b91c1c;border:1px solid #fca5a5;border-radius:5px;padding:3px 8px;cursor:pointer;font-size:0.8rem;display:inline-flex;align-items:center;gap:3px;"><i class="ph ph-trash"></i></button>`}
        </div>`;
    }).join('');

    modal.innerHTML = `
        <div style="background:#fff; width:95vw; height:95vh; max-width:1400px; display:flex; flex-direction:column; border-radius:10px; box-shadow:0 10px 25px rgba(0,0,0,0.2); overflow:hidden;">
            <div style="background:#f8fafc; padding:1.2rem 1.5rem; border-bottom:1px solid #e2e8f0; display:flex; justify-content:space-between; align-items:center; flex-shrink:0; z-index:1;">
                <h3 style="margin:0; color:#0f172a; font-size:1.1rem;">&#9998; Gerenciar Multa — ${multa.numero_ait || 'S/N'}</h3>
                <button type="button" onclick="document.getElementById('modal-gerenciar-multa').remove()" style="background:none; border:none; font-size:1.5rem; cursor:pointer; color:#64748b;">&times;</button>
            </div>
            <div style="padding:1.5rem; flex:1; overflow-y:auto; background:#fdfdfd;">
                <form id="form-gerenciar-multa" data-valor="${multa.valor_multa || '0'}" onsubmit="salvarGerenciamentoMulta(event, ${multa.id})" style="max-width:800px; margin:0 auto;">

                    <!-- INFO MOTORISTA -->
                    ${motoristaInfoHtml}

                    <!-- INFO MONACO -->
                    ${multa.status_monaco ? `
                    <div style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:8px; padding:0.85rem 1rem; margin-bottom:1rem; display:flex; align-items:center; gap:0.5rem;">
                        <i class="ph ph-police-car" style="color:#475569; font-size:1.2rem;"></i>
                        <span style="font-size:0.85rem; color:#334155;"><b>Status Atual na Mônaco:</b> <span style="font-weight:700; color:#0f172a; padding:2px 8px; background:#e2e8f0; border-radius:12px;">${multa.status_monaco}</span></span>
                        <span style="font-size:0.75rem; color:#94a3b8; margin-left:auto;">(Atualizado via Webhook)</span>
                    </div>
                    ` : ''}

                    <div style="display:flex; gap:1.5rem; margin-bottom:1rem; flex-wrap:wrap;">
                        <div style="flex:1; min-width:250px;">
                            <label style="display:block; margin-bottom:0.3rem; font-size:0.85rem; font-weight:600; color:#475569;">Motorista Responsável</label>
                            <select id="gm-motorista" style="width:100%; padding:0.6rem; border:1px solid #cbd5e1; border-radius:4px;" onchange="atualizarInfoMotoristaModal(this)">
                                ${optionsMotoristas}
                            </select>
                            <input type="text" id="gm-ex-colaborador-nome" placeholder="Digite o nome do Ex Colaborador" style="width:100%; padding:0.6rem; border:1px solid #cbd5e1; border-radius:4px; margin-top:0.5rem; display:${multa.motorista_id == -1 ? 'block' : 'none'};" value="${multa.motorista_id == -1 ? (multa.motorista_nome || '') : ''}">
                        </div>
                        <div style="flex:1; min-width:200px;">
                            <label style="display:block; margin-bottom:0.3rem; font-size:0.85rem; font-weight:600; color:#475569;">Status</label>
                            <select id="gm-status" style="width:100%; padding:0.6rem; border:1px solid #cbd5e1; border-radius:4px;" onchange="atualizarValoresMultaModal()">
                                ${optionsStatus}
                            </select>
                        </div>
                    </div>

                    <div style="display:flex; gap:1.5rem; margin-bottom:1rem; flex-wrap:wrap;">
                        <div style="flex:1; min-width:150px;">
                            <label style="display:block; margin-bottom:0.3rem; font-size:0.85rem; font-weight:600; color:#475569;">Valor (R$)</label>
                            <input type="text" id="gm-valor" value="${multa.valor_multa || ''}" style="width:100%; padding:0.6rem; border:1px solid #cbd5e1; border-radius:4px;" oninput="atualizarValoresMultaModal()">
                        </div>
                        <div style="flex:1; min-width:150px;">
                            <label style="display:block; margin-bottom:0.3rem; font-size:0.85rem; font-weight:600; color:#475569;">Pontuação</label>
                            <input type="number" id="gm-pontos" value="${multa.pontuacao || ''}" style="width:100%; padding:0.6rem; border:1px solid #cbd5e1; border-radius:4px;">
                        </div>
                    </div>

                    <div style="display:flex; gap:1.5rem; margin-bottom:1rem; flex-wrap:wrap; background:#f1f5f9; padding:1rem; border-radius:8px; border:1px solid #e2e8f0;">
                        <div style="flex:1; min-width:150px;">
                            <label style="display:block; margin-bottom:0.3rem; font-size:0.85rem; font-weight:600; color:#475569;">Parcelamento</label>
                            <select id="gm-parcelas" style="width:100%; padding:0.6rem; border:1px solid #cbd5e1; border-radius:4px; background:#fff;" onchange="atualizarValoresMultaModal()">
                                <option value="1" ${multa.parcelas == 1 ? 'selected' : ''}>1x</option>
                                <option value="2" ${multa.parcelas == 2 ? 'selected' : ''}>2x</option>
                                <option value="3" ${multa.parcelas == 3 ? 'selected' : ''}>3x</option>
                            </select>
                        </div>
                        <div style="flex:2; min-width:250px;">
                            <label style="display:block; margin-bottom:0.3rem; font-size:0.85rem; font-weight:600; color:#475569;">Valor a Descontar (Detalhes)</label>
                            <div id="gm-valor-info" style="padding:0.6rem; background:#fff; border:1px solid #cbd5e1; border-radius:4px; font-weight:600; color:#0f172a; min-height:38px; display:flex; align-items:center;">
                                R$ 0,00
                            </div>
                        </div>
                    </div>

                    <div style="display:flex; gap:1.5rem; margin-bottom:1rem; flex-wrap:wrap;">
                        <div style="flex:1; min-width:150px;">
                            <label style="display:block; margin-bottom:0.3rem; font-size:0.85rem; font-weight:600; color:#475569;">Data da Infração</label>
                            <input type="date" id="gm-data" value="${multa.data_infracao || ''}" style="width:100%; padding:0.6rem; border:1px solid #cbd5e1; border-radius:4px;">
                        </div>
                        <div style="flex:1; min-width:150px;">
                            <label style="display:block; margin-bottom:0.3rem; font-size:0.85rem; font-weight:600; color:#475569;">Hora</label>
                            <input type="time" id="gm-hora" value="${multa.hora_infracao || ''}" style="width:100%; padding:0.6rem; border:1px solid #cbd5e1; border-radius:4px;">
                        </div>
                        <div style="flex:2; min-width:200px;">
                            <label style="display:block; margin-bottom:0.3rem; font-size:0.85rem; font-weight:600; color:#475569;">Número AIT</label>
                            <input type="text" id="gm-ait" value="${multa.numero_ait || ''}" style="width:100%; padding:0.6rem; border:1px solid #cbd5e1; border-radius:4px;">
                        </div>
                    </div>

                    <div style="margin-bottom:1rem;">
                        <label style="display:block; margin-bottom:0.3rem; font-size:0.85rem; font-weight:600; color:#475569;">Motivo (Infração)</label>
                        <input type="text" id="gm-motivo" value="${multa.motivo || ''}" style="width:100%; padding:0.6rem; border:1px solid #cbd5e1; border-radius:4px;">
                    </div>

                    <div style="display:flex; gap:1.5rem; margin-bottom:1rem; flex-wrap:wrap;">
                        <div style="flex:1; min-width:150px;">
                            <label style="display:block; margin-bottom:0.3rem; font-size:0.85rem; font-weight:600; color:#475569;">Placa</label>
                            <input type="text" id="gm-placa" value="${multa.placa || ''}" style="width:100%; padding:0.6rem; border:1px solid #cbd5e1; border-radius:4px;">
                        </div>
                        <div style="flex:2; min-width:250px;">
                            <label style="display:block; margin-bottom:0.3rem; font-size:0.85rem; font-weight:600; color:#475569;">Local da Infração</label>
                            <input type="text" id="gm-local" value="${multa.local_infracao || ''}" style="width:100%; padding:0.6rem; border:1px solid #cbd5e1; border-radius:4px;">
                        </div>
                    </div>

                    <div style="margin-bottom:1rem; background:#fff7ed; border:1.5px solid #fed7aa; border-radius:8px; padding:0.85rem 1rem;">
                        <label style="display:block; margin-bottom:0.3rem; font-size:0.85rem; font-weight:700; color:#c2410c;">&#128197; Data Limite &mdash; Indicação de Condutor / Defesa de Autuação</label>
                        <input type="date" id="gm-data-limite" value="${multa.data_limite || ''}" style="width:100%; padding:0.6rem; border:1px solid #fed7aa; border-radius:4px; font-size:0.9rem;">
                    </div>

                    <div style="margin-bottom:1rem;">
                        <label style="display:block; margin-bottom:0.3rem; font-size:0.85rem; font-weight:600; color:#475569;">Observação <span id="gm-obs-req" style="color:red; display:none;">*</span></label>
                        <textarea id="gm-obs" rows="2" style="width:100%; padding:0.6rem; border:1px solid #cbd5e1; border-radius:4px; resize:vertical;">${multa.observacao || ''}</textarea>
                    </div>

                    <div style="margin-bottom:1.5rem;">
                        <label style="display:block; margin-bottom:0.3rem; font-size:0.85rem; font-weight:600; color:#475569;">Link Formulário Assinatura</label>
                        <div style="display:flex; gap:0.5rem;">
                            <input type="text" id="gm-link" value="${multa.link_formulario || ''}" placeholder="https://..." style="flex:1; padding:0.6rem; border:1px solid #cbd5e1; border-radius:4px;">
                            <button type="button" onclick="const l = document.getElementById('gm-link').value; if(l) window.open(l.startsWith('http') ? l : 'http://'+l, '_blank')" style="background:#f1f5f9; color:#2563eb; border:1px solid #cbd5e1; border-radius:4px; padding:0 1rem; cursor:pointer; font-weight:600; display:flex; align-items:center; gap:0.3rem;"><i class="ph ph-arrow-square-out"></i> Abrir</button>
                        </div>
                    </div>

                    <!-- DOCUMENTOS EXTRAS -->
                    <div style="border-top:1px solid #e2e8f0; padding-top:1.2rem; margin-top:0.5rem;">
                        <label style="display:block; margin-bottom:0.6rem; font-size:0.85rem; font-weight:600; color:#2563eb;">&#128206; Documentos Anexados</label>
                        <div id="gm-docs-lista">${docsHtml || '<p style="font-size:0.8rem;color:#94a3b8;margin:0 0 0.5rem;">Nenhum documento anexado.</p>'}</div>
                        <div style="border:1.5px dashed #cbd5e1; border-radius:8px; padding:0.75rem 1rem; background:#f8fafc; margin-top:4px;">
                            <div style="display:flex; align-items:center; gap:8px;">
                                <input type="file" id="gm-doc-extra" accept=".pdf,.jpg,.jpeg,.png" style="flex:1; font-size:0.82rem; border:none; background:transparent; cursor:pointer;">
                                <button type="button" onclick="uploadDocExtra(${multa.id})" style="background:#2563eb;color:white;border:none;border-radius:6px;padding:6px 14px;cursor:pointer;font-size:0.82rem;font-weight:600;white-space:nowrap;"><i class="ph ph-upload-simple"></i> Anexar</button>
                            </div>
                            <p style="margin:4px 0 0; font-size:0.75rem; color:#94a3b8;">PDF, JPG ou PNG até 10MB</p>
                        </div>
                    </div>

                    <div style="display:flex; justify-content:flex-end; gap:1rem; margin-top:1.5rem;">
                        <button type="button" onclick="document.getElementById('modal-gerenciar-multa').remove()" style="padding:0.6rem 1.2rem; background:#f1f5f9; border:1px solid #cbd5e1; border-radius:4px; cursor:pointer; font-weight:600; color:#475569;">Cancelar</button>
                        <button type="submit" style="padding:0.6rem 1.2rem; background:#2563eb; color:white; border:none; border-radius:4px; cursor:pointer; font-weight:600;">Salvar Alterações</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    const statusSel = document.getElementById('gm-status');
    const obsReq = document.getElementById('gm-obs-req');
    statusSel.addEventListener('change', () => {
        obsReq.style.display = (statusSel.value === 'Não Se Aplica') ? 'inline' : 'none';
    });
    if (statusSel.value === 'Não Se Aplica') obsReq.style.display = 'inline';

    atualizarValoresMultaModal();

    if (multa.status === 'Indicado' || multa.status === 'Multa NIC') {
        const form = document.getElementById('form-gerenciar-multa');
        const elements = form.querySelectorAll('input, select, textarea, button');
        elements.forEach(el => {
            if (el.textContent !== 'Cancelar' && !el.classList.contains('ph-eye') && !el.closest('button[title="Visualizar"]')) {
                el.disabled = true;
                el.style.opacity = '0.7';
                el.style.cursor = 'not-allowed';
            }
        });
        
        // Disable "Salvar Alterações" explicitly
        const btnSalvar = form.querySelector('button[type="submit"]');
        if (btnSalvar) {
            btnSalvar.disabled = true;
            btnSalvar.style.display = 'none';
        }
        
        // Hide file upload part
        const docExtra = document.getElementById('gm-doc-extra');
        if (docExtra) docExtra.parentElement.parentElement.style.display = 'none';

        // Show warning
        const avisoBlock = document.createElement('div');
        avisoBlock.style.cssText = 'background:#fef2f2; border:1px solid #fecaca; color:#dc2626; padding:0.8rem; border-radius:6px; margin-bottom:1rem; font-weight:600; text-align:center;';
        avisoBlock.innerHTML = '&#9888; Esta multa já foi enviada ao RH e não pode mais ser editada ou excluída.';
        form.insertBefore(avisoBlock, form.firstChild);
    }

    if (focoMotorista && (multa.status !== 'Indicado' && multa.status !== 'Multa NIC')) {
        document.getElementById('gm-motorista').focus();
    }
}

function atualizarValoresMultaModal() {
    const form = document.getElementById('form-gerenciar-multa');
    if (!form) return;
    
    const inputValor = document.getElementById('gm-valor');
    const valorOriginalStr = inputValor ? inputValor.value : form.getAttribute('data-valor');
    
    const status = document.getElementById('gm-status').value;
    const parcelas = parseInt(document.getElementById('gm-parcelas').value) || 1;
    
    // Parse value (e.g. "R$ 130,16" or "130.16")
    let valorOriginal = 0;
    if (valorOriginalStr) {
        const numeric = String(valorOriginalStr).replace(/[^\d,-]/g, '').replace(',', '.');
        valorOriginal = parseFloat(numeric) || 0;
    }

    let multiplicador = (status === 'Multa NIC') ? 3 : 1;
    let valorTotal = valorOriginal * multiplicador;
    let valorParcela = valorTotal / parcelas;

    const fmt = v => 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    
    const infoDiv = document.getElementById('gm-valor-info');
    if (parcelas === 1) {
        infoDiv.innerHTML = `${fmt(valorTotal)}${status === 'Multa NIC' ? ' <span style="color:#d97706; font-size:0.8rem; margin-left:8px;">(3x valor original)</span>' : ''}`;
    } else {
        infoDiv.innerHTML = `<span style="color:#2563eb;">${parcelas}x de ${fmt(valorParcela)}</span> <span style="color:#64748b; font-size:0.85rem; margin-left:8px;">(Total: ${fmt(valorTotal)})</span>${status === 'Multa NIC' ? ' <span style="color:#d97706; font-size:0.8rem; margin-left:8px;">(3x valor original)</span>' : ''}`;
    }
}

// Atualiza bloco de info do motorista quando dropdown muda
function atualizarInfoMotoristaModal(sel) {
    const inputEx = document.getElementById('gm-ex-colaborador-nome');
    if (inputEx) {
        inputEx.style.display = (sel.value === '-1') ? 'block' : 'none';
        if (sel.value !== '-1') inputEx.value = '';
    }

    const id = parseInt(sel.value);
    const c = id && id !== -1 ? colaboradoresMultas.find(x => x.id === id) : null;
    const bloco = document.getElementById('gm-info-motorista');
    if (!bloco) return;
    if (!c) { bloco.style.display = 'none'; return; }
    bloco.style.display = 'flex';
    bloco.style.flexDirection = 'column';
    bloco.style.gap = '0.35rem';
    const endColab = (c.endereco || '').replace(/'/g, "'");
    const nomeColab = (c.nome_completo || c.nome || '').replace(/'/g, "'");
    bloco.innerHTML = `
        <div style="display:flex; align-items:center; gap:6px;">
            <i class="ph ph-user" style="color:#166534;"></i>
            <span style="font-size:0.88rem; color:#166534; font-weight:700;">${c.nome_completo || c.nome}</span>
            <button type="button" onclick="navigator.clipboard.writeText('${nomeColab}'); mostrarToastSucesso('Nome copiado!'); event.stopPropagation();" title="Copiar Nome" style="background:none;border:none;cursor:pointer;color:#2563eb;font-size:0.9rem;padding:0;"><i class="ph ph-copy"></i></button>
        </div>
        ${c.cpf ? `<div style="display:flex; align-items:center; gap:6px; padding-left:1.2rem;">
            <span style="font-size:0.8rem; color:#374151;"><b>CPF:</b> <code>${c.cpf}</code></span>
            <button type="button" onclick="navigator.clipboard.writeText('${c.cpf}'); mostrarToastSucesso('CPF copiado!'); event.stopPropagation();" title="Copiar CPF" style="background:none;border:none;cursor:pointer;color:#2563eb;font-size:0.9rem;padding:0;"><i class="ph ph-copy"></i></button>
        </div>` : ''}
        ${c.cnh_numero ? `<div style="display:flex; align-items:center; gap:6px; padding-left:1.2rem;">
            <span style="font-size:0.8rem; color:#374151;"><b>CNH:</b> <code>${c.cnh_numero}</code></span>
            <button type="button" onclick="navigator.clipboard.writeText('${c.cnh_numero}'); mostrarToastSucesso('CNH copiada!'); event.stopPropagation();" title="Copiar CNH" style="background:none;border:none;cursor:pointer;color:#2563eb;font-size:0.9rem;padding:0;"><i class="ph ph-copy"></i></button>
            ${c.id ? `<button type="button" onclick="baixarCNHMotorista(${c.id}); event.stopPropagation();" title="Baixar CNH" style="background:#dbeafe;color:#1d4ed8;border:1px solid #93c5fd;border-radius:6px;padding:2px 10px;font-size:0.78rem;cursor:pointer;font-weight:600;display:inline-flex;align-items:center;gap:4px;"><i class="ph ph-download-simple"></i> CNH</button>` : ''}
        </div>` : ''}
        ${c.endereco ? `<div style="display:flex; align-items:center; gap:6px; padding-left:1.2rem;">
            <span style="font-size:0.8rem; color:#374151;"><b>Endereço:</b> <code>${c.endereco}</code></span>
            <button type="button" onclick="navigator.clipboard.writeText('${endColab}'); mostrarToastSucesso('Endereço copiado!'); event.stopPropagation();" title="Copiar Endereço" style="background:none;border:none;cursor:pointer;color:#2563eb;font-size:0.9rem;padding:0;"><i class="ph ph-copy"></i></button>
        </div>` : ''}
    `;
}

// Baixar arquivo da CNH do colaborador
async function baixarCNHMotorista(colabId) {
    const token = localStorage.getItem('erp_token') || localStorage.getItem('token') || '';
    const url = `/api/colaboradores/${colabId}/arquivo/cnh?token=${encodeURIComponent(token)}`;
    // Tenta abrir em nova aba (se a rota existir)
    window.open(url, '_blank');
}

// Upload de documento extra para a multa
async function uploadDocExtra(multaId) {
    const input = document.getElementById('gm-doc-extra');
    if (!input || !input.files.length) { mostrarToastAviso('Selecione um arquivo para anexar.'); return; }
    const file = input.files[0];
    if (file.size > 10 * 1024 * 1024) { mostrarToastAviso('Arquivo muito grande. Máximo 10MB.'); return; }

    const btn = input.nextElementSibling;
    const origHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i>';

    try {
        const token = localStorage.getItem('erp_token') || localStorage.getItem('token') || '';
        const fd = new FormData();
        fd.append('documento', file);
        const resp = await fetch(`/api/logistica/multas/${multaId}/documento-extra`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: fd
        });
        if (!resp.ok) throw new Error('Falha no upload');
        const data = await resp.json();
        mostrarToastSucesso('Documento anexado!');
        input.value = '';
        // Atualiza lista de documentos no modal sem fechar
        const lista = document.getElementById('gm-docs-lista');
        if (lista) {
            const docsExtras = data.documentos_extras || [];
            lista.innerHTML = docsExtras.map((d, i) => `
                <div style="display:flex; align-items:center; gap:8px; padding:6px 8px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; margin-bottom:6px;">
                    <i class="ph ph-file" style="color:#64748b;"></i>
                    <span style="flex:1; font-size:0.8rem; color:#334155; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${d.nome || 'Documento ' + (i+1)}</span>
                    <button type="button" onclick="visualizarDocExtra(${multaId}, ${i}); event.stopPropagation();" title="Visualizar" style="background:#dbeafe;color:#1d4ed8;border:1px solid #93c5fd;border-radius:5px;padding:3px 8px;cursor:pointer;font-size:0.8rem;display:inline-flex;align-items:center;gap:3px;"><i class="ph ph-eye"></i></button>
                    <button type="button" onclick="excluirDocExtra(${multaId}, ${i}); event.stopPropagation();" title="Excluir Anexo" style="background:#fee2e2;color:#b91c1c;border:1px solid #fca5a5;border-radius:5px;padding:3px 8px;cursor:pointer;font-size:0.8rem;display:inline-flex;align-items:center;gap:3px;"><i class="ph ph-trash"></i></button>
                </div>`).join('');
        }
        // Atualiza dados locais
        const m = multasLogistica.find(x => x.id === multaId);
        if (m && data.documentos_extras) m.documentos_extras = JSON.stringify(data.documentos_extras);
    } catch(e) {
        mostrarToastErro('Erro ao anexar documento: ' + e.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = origHtml;
    }
}

window.excluirDocExtra = async function(multaId, idx) {
    if (!confirm('Deseja realmente excluir este anexo?')) return;
    try {
        const token = localStorage.getItem('erp_token') || localStorage.getItem('token') || '';
        const resp = await fetch(`/api/logistica/multas/${multaId}/documento-extra/${idx}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!resp.ok) throw new Error('Falha ao excluir anexo');
        const data = await resp.json();
        if (typeof mostrarToastSucesso === 'function') mostrarToastSucesso('Anexo excluído com sucesso!');
        
        const lista = document.getElementById('gm-docs-lista');
        if (lista) {
            const docsExtras = data.documentos_extras || [];
            lista.innerHTML = docsExtras.map((d, i) => `
                <div style="display:flex; align-items:center; gap:8px; padding:6px 8px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; margin-bottom:6px;">
                    <i class="ph ph-file" style="color:#64748b;"></i>
                    <span style="flex:1; font-size:0.8rem; color:#334155; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${d.nome || 'Documento ' + (i+1)}</span>
                    <button type="button" onclick="visualizarDocExtra(${multaId}, ${i}); event.stopPropagation();" title="Visualizar" style="background:#dbeafe;color:#1d4ed8;border:1px solid #93c5fd;border-radius:5px;padding:3px 8px;cursor:pointer;font-size:0.8rem;display:inline-flex;align-items:center;gap:3px;"><i class="ph ph-eye"></i></button>
                    <button type="button" onclick="excluirDocExtra(${multaId}, ${i}); event.stopPropagation();" title="Excluir Anexo" style="background:#fee2e2;color:#b91c1c;border:1px solid #fca5a5;border-radius:5px;padding:3px 8px;cursor:pointer;font-size:0.8rem;display:inline-flex;align-items:center;gap:3px;"><i class="ph ph-trash"></i></button>
                </div>`).join('') || '<p style="font-size:0.8rem;color:#94a3b8;margin:0 0 0.5rem;">Nenhum documento anexado.</p>';
        }
        
        const m = multasLogistica.find(x => x.id === multaId);
        if (m && data.documentos_extras) m.documentos_extras = JSON.stringify(data.documentos_extras);
    } catch(e) {
        if (typeof mostrarToastErro === 'function') mostrarToastErro(e.message);
    }
};

// Visualizar documento extra em nova aba (inline)
async function visualizarDocExtra(multaId, idx) {
    const token = localStorage.getItem('erp_token') || localStorage.getItem('token') || '';
    const url = `/api/logistica/multas/${multaId}/documento-extra/${idx}?token=${encodeURIComponent(token)}`;
    window.open(url, '_blank');
}


async function salvarGerenciamentoMulta(e, id) {
    e.preventDefault();
    const status = document.getElementById('gm-status').value;
    const obs = document.getElementById('gm-obs').value.trim();
    
    if (status === 'Não Se Aplica' && !obs) {
        mostrarToastAviso('Preencha a observação quando o status for "Não Se Aplica".');
        return;
    }

    const m = multasLogistica.find(x => x.id === id);
    let docsEx = [];
    if (m) {
        try { docsEx = JSON.parse(m.documentos_extras || '[]'); } catch(err){}
    }
    // Documentos são opcionais — sem validação de quantidade mínima


    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Salvando...';

    const motoristaSel = document.getElementById('gm-motorista');
    let motoristaId = motoristaSel.value;
    let motoristaNome = motoristaId ? motoristaSel.options[motoristaSel.selectedIndex].text : null;
    
    if (motoristaId === '-1') {
        const inputEx = document.getElementById('gm-ex-colaborador-nome');
        if (inputEx && inputEx.value.trim()) {
            motoristaNome = inputEx.value.trim();
        } else {
            btn.disabled = false;
            btn.textContent = 'Salvar Alterações';
            mostrarToastAviso('Preencha o nome do Ex Colaborador.');
            return;
        }
    }
    const link = document.getElementById('gm-link').value.trim();
    const parcelas = document.getElementById('gm-parcelas').value;
    const placa = document.getElementById('gm-placa')?.value.trim() || '';
    const localInfracao = document.getElementById('gm-local')?.value.trim() || '';
    const dataInfracao = document.getElementById('gm-data')?.value || '';
    const horaInfracao = document.getElementById('gm-hora')?.value || '';
    const numeroAit = document.getElementById('gm-ait')?.value.trim() || '';
    const motivo = document.getElementById('gm-motivo')?.value.trim() || '';
    const valorMulta = document.getElementById('gm-valor')?.value.trim() || '';
    const pontuacao = document.getElementById('gm-pontos')?.value || '';
    const dataLimite = document.getElementById('gm-data-limite')?.value || '';

    let settled = false;
    const fecharEAtualizar = async (msg, tipo = 'sucesso') => {
        if (settled) return;
        settled = true;
        document.getElementById('modal-gerenciar-multa')?.remove();
        await carregarMultasLogistica();
        if (tipo === 'sucesso') mostrarToastSucesso(msg);
        else mostrarToastAviso(msg);
    };
    const timeoutId = setTimeout(() => {
        fecharEAtualizar('Alterações salvas! Lista atualizada.', 'sucesso');
    }, 9000);

    try {
        const token = localStorage.getItem('erp_token') || localStorage.getItem('token') || '';
        const response = await fetch('/api/logistica/multas/' + id, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                motorista_id: motoristaId,
                motorista_nome: motoristaNome,
                status: status,
                observacao: obs,
                link_formulario: link,
                parcelas: parcelas,
                placa: placa,
                local_infracao: localInfracao,
                data_infracao: dataInfracao,
                hora_infracao: horaInfracao,
                numero_ait: numeroAit,
                motivo: motivo,
                valor_multa: valorMulta,
                pontuacao: pontuacao,
                data_limite: dataLimite
            })
        });
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.error || 'Erro ao salvar multa.');
        }

        await fecharEAtualizar('Multa atualizada e e-mail enviado (se aplicável)!');
    } catch (err) {
        clearTimeout(timeoutId);
        console.error('[salvarGerenciamentoMulta]', err);
        await fecharEAtualizar(err.message, 'aviso');
    }
}

function confirmarExcluirMulta(id) {
    // Modal de confirmação inline (evita bloqueio do confirm() por alguns browsers)
    document.getElementById('modal-confirm-excluir-multa')?.remove();
    const modal = document.createElement('div');
    modal.id = 'modal-confirm-excluir-multa';
    modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);display:flex;justify-content:center;align-items:center;z-index:10000;';
    modal.innerHTML = `
        <div style="background:#fff;border-radius:10px;padding:2rem;max-width:380px;width:90%;box-shadow:0 10px 25px rgba(0,0,0,0.2);text-align:center;">
            <div style="font-size:2.5rem;margin-bottom:0.5rem;">🗑️</div>
            <h3 style="margin:0 0 0.5rem;color:#0f172a;">Excluir Multa</h3>
            <p style="color:#64748b;margin:0 0 1.5rem;font-size:0.9rem;">Tem certeza que deseja excluir esta multa? Essa ação não pode ser desfeita.</p>
            <div style="display:flex;gap:1rem;justify-content:center;">
                <button onclick="document.getElementById('modal-confirm-excluir-multa').remove()" style="padding:0.6rem 1.4rem;background:#f1f5f9;border:1px solid #cbd5e1;border-radius:6px;cursor:pointer;font-weight:600;color:#475569;">Cancelar</button>
                <button onclick="excluirMultaLogistica(${id})" style="padding:0.6rem 1.4rem;background:#ef4444;color:white;border:none;border-radius:6px;cursor:pointer;font-weight:600;">Excluir</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

async function excluirMultaLogistica(id) {
    document.getElementById('modal-confirm-excluir-multa')?.remove();
    const token = localStorage.getItem('erp_token') || localStorage.getItem('token') || '';

    // Fallback: mesmo se não houver resposta, recarrega após 6s
    const timeoutId = setTimeout(async () => {
        await carregarMultasLogistica();
        mostrarToastAviso('Lista atualizada (conexão instável).');
    }, 6000);

    try {
        const response = await fetch('/api/logistica/multas/' + id, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        clearTimeout(timeoutId);
        await carregarMultasLogistica();
        if (response.ok) {
            mostrarToastSucesso('Multa excluída com sucesso.');
        } else {
            mostrarToastAviso('Verifique se a multa foi excluída.');
        }
    } catch (e) {
        clearTimeout(timeoutId);
        await carregarMultasLogistica();
        mostrarToastAviso('Conexão instável. Verifique se a multa foi excluída.');
    }
}

function visualizarDocumentoMulta(id) {
    const token = localStorage.getItem('erp_token') || localStorage.getItem('token') || '';
    // Abre em nova aba usando a rota de download autenticada
    const url = `/api/logistica/multas/${id}/documento?token=${encodeURIComponent(token)}`;
    window.open(url, '_blank');
}

// Tabela de pontuação baseada no CTB (Código de Trânsito Brasileiro)
// IMPORTANTE: a ordem importa — frases mais específicas devem vir primeiro dentro de cada grupo,
// e grupos de pontuação maior vêm antes para evitar falsos positivos.
const PONTUACAO_POR_INFRACAO = [
    // ── Gravíssimas: 7 pontos ──────────────────────────────────────────────
    { pontos: 7, palavras: [
        'celular', 'aparelho de comunicacao', 'aparelho de comunicação',
        'cinto de seguranca', 'cinto de segurança',
        'capacete',
        'embriaguez', 'alcoolemia', 'bafometro', 'alcool',
        'contramaoo', 'contramao', 'contramão',
        'sinal vermelho', 'semaforo vermelho', 'semáforo vermelho',
        'velocidade superior a 50',
        'racha', 'competicao', 'competição',
        'fuga ao controle policial', 'evasao ao controle', 'evasão ao controle',
        'nao parar no posto', 'não parar no posto',
        'transporte de passageiros clandestino',
        'ultrapassagem em local proibido',
        'dirigir sem habilitacao', 'dirigir sem habilitação', 'sem cnh',
        'nao possuir cnh', 'não possuir cnh',
        'habilitacao cassada', 'habilitação cassada',
        'freiar bruscamente',
        'nao usar cadeirinha', 'nao usar dispositivo de retencao',
    ]},
    // ── Graves: 5 pontos ──────────────────────────────────────────────────
    { pontos: 5, palavras: [
        'velocidade superior a 20',
        'estacionamento proibido', 'estacionar em local proibido',
        'conversao proibida', 'conversão proibida',
        'retorno proibido',
        'habilitacao vencida', 'habilitação vencida',
        'avancar sinal', 'avançar sinal', 'avanço de sinal',
        'parar sobre faixa de pedestres', 'sobre faixa de pedestre',
        'ultrapassagem proibida',
        'acostamento',
        'faixa exclusiva', 'faixa de onibus',
        'nao dar preferencia ao pedestre', 'não dar preferência ao pedestre',
        'placa de identificacao adulterada', 'placa adulterada',
    ]},
    // ── Médias: 4 pontos ──────────────────────────────────────────────────
    { pontos: 4, palavras: [
        'transitar em local', 'transitar em horario', 'transitar em horário',
        'horario nao permitido', 'horário não permitido',
        'local nao permitido', 'local não permitido',
        'regulamentacao', 'regulamentação',         // Art. 185 - transitar em local/horário não permitido
        'velocidade superior a 15',
        'estacionar em local', 'estacionamento irregular',
        'licenciamento', 'crlv', 'documento do veiculo', 'documento do veículo',
        'verificacao anual', 'verificação anual',
        'pneu liso', 'pneu careca', 'pneu com defeito',
        'freio deficiente', 'freio com defeito',
        'extintor', 'triangulo', 'triângulo',
        'kit de primeiros socorros',
        'excesso de peso',
        'parar em local proibido', 'parar em fila dupla', 'segunda fila',
        'nao acionar indicador', 'não acionar indicador',
        'documentacao irregular', 'documentação irregular',
    ]},
    // ── Leves: 3 pontos ───────────────────────────────────────────────────
    { pontos: 3, palavras: [
        'velocidade ate 5', 'velocidade até 5',
        'velocidade ate 15', 'velocidade até 15',
        'nao sinalizar manobra', 'não sinalizar manobra',
        'luz baixa em rodovia', 'farol baixo em rodovia',
        'ausencia de documento', 'ausência de documento',
        'nao portar documento', 'não portar documento',
        'identificacao do local, data e hora',
        'identificação do local, data e hora',
    ]},
];

function inferirPontuacaoPorMotivo(motivo) {
    if (!motivo) return null;
    const m = motivo.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    for (const grupo of PONTUACAO_POR_INFRACAO) {
        for (const palavra of grupo.palavras) {
            const p = palavra.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            if (m.includes(p)) return grupo.pontos;
        }
    }
    return null;
}

window.processarPDFMulta = async function(input) {
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];
    if (file.type !== 'application/pdf') return;

    try {
        if (typeof pdfjsLib === 'undefined' && !window.pdfjsLib) {
            console.warn('pdf.js não carregado no escopo. A extração automática de dados foi cancelada.');
            return;
        }

        const pdfjs = window.pdfjsLib || pdfjsLib;
        if (!pdfjs.GlobalWorkerOptions.workerSrc) {
            pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
        }

        if (typeof mostrarToastSucesso === 'function') mostrarToastSucesso('🔍 Lendo documento PDF...');

        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
        let fullText = '';
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            // Join com espaço e também tenta sem espaço para capturar tokens colados
            const pageText = content.items.map(item => item.str).join(' ');
            fullText += pageText + '\n';
        }

        console.log('[PDF Multa] Texto extraído:', fullText.substring(0, 1000));

        // Normaliza espaços mas preserva quebras para buscas linha a linha
        const textToSearch = fullText.replace(/[ \t]+/g, ' ');

        // ── AIT (múltiplos padrões) ──────────────────────────────────────────────
        let aitVal = '';
        const aitPatterns = [
            /AIT\s*[:\-]?\s*([A-Z0-9]{5,20})/i,
            /N[°º]\s*do\s*Auto\s*de\s*Infra[çc][ãa]o\s*[:\-]?\s*([A-Z0-9]{5,20})/i,
            /\bAuto\s+de\s+Infra[çc][ãa]o\b[^A-Z0-9]{0,10}([A-Z0-9]{5,20})/i,
            /\bA\.?\s*I\.?\s*T\.?\b\s*[:\-\/\.#\s]*([A-Z0-9]{5,20})/i,
            /(?:c[óo]digo|n[úu]mero)\s+da\s+infra[çc][ãa]o[^\w]*([A-Z0-9]{5,20})/i,
            /\bn[°º]\s*\.?\s*([A-Z0-9]{6,20})/i,
            /\b([A-Z]{2,3}[0-9]{7,12})\b/
        ];
        for (const pat of aitPatterns) {
            const m = textToSearch.match(pat);
            // Garante que o valor capturado tem ao menos 1 dígito (evita palavras puras)
            if (m && m[1] && m[1].length >= 6 && /\d/.test(m[1])) {
                aitVal = m[1].trim();
                break;
            }
        }
        if (aitVal) {
            document.getElementById('nm-ait').value = aitVal;
        }

        // ── Placa ─────────────────────────────────────────────────────────
        const placaMatch = textToSearch.match(/placa\s*[:\-]?\s*([A-Z]{3}[-\s]?\d[A-Z0-9]\d{2}|[A-Z]{3}[-\s]?\d{4})/i);
        if (placaMatch && document.getElementById('nm-placa')) {
            document.getElementById('nm-placa').value = placaMatch[1].replace(/[-\s]/g, '').toUpperCase();
        }

        // ── Local da Infração ─────────────────────────────────────────────
        const localMatch = textToSearch.match(/ENDERE[ÇC]O DA INFRA[ÇC][ÃA]O\s*[:\-]?\s*([^\n]{5,120})/i) || textToSearch.match(/local(?:\s+da)?\s+infra[çc][ãa]o\s*[:\-]?\s*([^\n]{5,120})/i);
        if (localMatch && document.getElementById('nm-local')) {
            document.getElementById('nm-local').value = localMatch[1].trim().substring(0, 150);
        }

        // ── Data ──────────────────────────────────────────────────────────
        let dataMatch = textToSearch.match(/DATA E HORA DA INFRA[ÇC][ÃA]O[^\d]*(\d{2}[\/\-]\d{2}[\/\-]\d{4})/i);
        if (!dataMatch) {
            dataMatch = textToSearch.match(/data(?:\s+da)?\s+infra[çc][ãa]o[^\d]{0,40}(\d{2}[\/\-]\d{2}[\/\-]\d{4})/i);
        }
        if (!dataMatch) {
            dataMatch = textToSearch.match(/\bdata\b(?!\s+(?:de\s+)?emiss[ãa]o)(?!\s+limite)[^\d]{0,40}(\d{2}[\/\-]\d{2}[\/\-]\d{4})/i);
        }
        if (dataMatch) {
            const parts = dataMatch[1].split(/[\/\-]/);
            document.getElementById('nm-data').value = `${parts[2]}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}`;
        }

        // ── Hora ──────────────────────────────────────────────────────────
        let horaMatch = textToSearch.match(/DATA E HORA DA INFRA[ÇC][ÃA]O[^\d]*\d{2}[\/\-]\d{2}[\/\-]\d{4}\s+(\d{1,2}:\d{2})/i);
        if (!horaMatch) {
            horaMatch = textToSearch.match(/hora(?:\s+da)?\s+infra[çc][ãa]o[^\d]{0,40}(\d{1,2}:\d{2})(?::\d{2})?/i);
        }
        if (!horaMatch) {
            horaMatch = textToSearch.match(/\bhora\b[^\d]{0,40}(\d{1,2}:\d{2})(?::\d{2})?/i);
        }
        if (horaMatch) {
            document.getElementById('nm-hora').value = horaMatch[1].padStart(5, '0');
        }

        // ── Data Limite ───────────────────────────────────────────────────
        const limiteMatch = textToSearch.match(/PRAZO INDICA[ÇC][ÃA]O[^\d]*(\d{2}[\/\-]\d{2}[\/\-]\d{4})/i) || textToSearch.match(/(?:limite|at[ée])[^\d]*(\d{2}[\/\-]\d{2}[\/\-]\d{4})/i) || textToSearch.match(/(?:indica[çc][ãa]o|defesa)[^\d]*(\d{2}[\/\-]\d{2}[\/\-]\d{4})/i);
        if (limiteMatch && document.getElementById('nm-data-limite')) {
            const parts = limiteMatch[1].split(/[\/\-]/);
            document.getElementById('nm-data-limite').value = `${parts[2]}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}`;
        }

        // ── Valor ─────────────────────────────────────────────────────────
        const valorMatch =
            textToSearch.match(/valor(?:\s*da)?\s*infra[çc][ãa]o\s*[:\-]?\s*R?\$?\s*([\d]{1,}[.,][\d]{2})/i) ||
            textToSearch.match(/valor\s*(?:da\s*multa)?\s*[:\-]?\s*R?\$?\s*([\d]{1,}[.,][\d]{2})/i) ||
            textToSearch.match(/R\$\s*([\d]{1,}[.,][\d]{2})/i) ||
            textToSearch.match(/multa[^\n]*?([\d]{2,}[.,]\d{2})/i);
        if (valorMatch) document.getElementById('nm-valor').value = valorMatch[1].trim();

        // ── Motivo ────────────────────────────────────────────────────────
        const motivoPatterns = [
            /DESCRI[ÇC][ÃA]O\s*[:\-]?\s*([^\n]{5,120})/i,
            /descri[çc][ãa]o\s*(?:da\s*)?infra[çc][ãa]o\s*[:\-]?\s*([^\n]{10,120})/i,
            /infra[çc][ãa]o\s*[:\-]?\s*([^\n]{10,120})/i,
            /(?:enquadramento|artigo|art\.?)\s*[:\-]?\s*([^\n]{10,120})/i,
        ];
        const campoMotivo = document.getElementById('nm-motivo');
        if (!campoMotivo.value) {
            for (const pat of motivoPatterns) {
                const m = textToSearch.match(pat);
                if (m && m[1]) { campoMotivo.value = m[1].trim().substring(0, 150); break; }
            }
        }

        // ── Pontuação: primeiro tenta extrair do PDF, senão infere pelo motivo ──
        let pontosDefinidos = false;

        // Tenta ler pontuação diretamente do PDF
        const pontosMatch =
            textToSearch.match(/(\d+)\s*(?:pontos|pts)/i) ||
            textToSearch.match(/pontua[çc][ãa]o\s*[:\-]?\s*(\d+)/i) ||
            textToSearch.match(/gravidade\s*[:\-]?\s*(Graví?ssima|Grave|Méd[ia]+|Leve)/i);
        if (pontosMatch) {
            const g = (pontosMatch[1] || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
            let pontos = 0;
            if (g === 'gravissima' || g === 'gravissima') pontos = 7;
            else if (g === 'grave') pontos = 5;
            else if (g === 'media' || g === 'media') pontos = 4;
            else if (g === 'leve') pontos = 3;
            else if (/^\d+$/.test(g)) pontos = parseInt(g, 10);
            if (pontos > 0) {
                document.getElementById('nm-pontos').value = pontos;
                pontosDefinidos = true;
            }
        }

        // Se não encontrou pontuação no PDF, infere pelo motivo
        if (!pontosDefinidos) {
            const motivo = campoMotivo.value || textToSearch.substring(0, 500);
            const pontosByMotivo = inferirPontuacaoPorMotivo(motivo);
            if (pontosByMotivo !== null) {
                document.getElementById('nm-pontos').value = pontosByMotivo;
                // Mostra badge "Auto" no label
                const badge = document.getElementById('nm-pontos-badge');
                if (badge) badge.style.display = 'inline';
                pontosDefinidos = true;
            }
        }

        if (typeof mostrarToastSucesso === 'function') {
            mostrarToastSucesso('✅ Dados extraídos do PDF com sucesso!');
        }
    } catch(err) {
        console.error('Erro ao processar PDF:', err);
        if (typeof mostrarToastAviso === 'function') {
            mostrarToastAviso('Não foi possível ler os dados automaticamente do PDF. Preencha manualmente.');
        }
    }
};

