// multas_logistica.js

let multasLogistica = [];
let colaboradoresMultas = [];
let _multasSortCol = 'data_limite';
let _multasSortDir = 'desc'; // mais novo primeiro por padrão

// Helper: badge de data limite
// - VENCIDA (diff <= 0): texto vermelho, SEM ícone ⚠️
// - PRÓXIMA (1-10 dias): texto amarelo, COM ícone ⚠️
// - Normal: texto padrão sem destaque
function _dataLimiteBadge(dl, motivo = '') {
    if (!dl) return '—';
    let fmt = '';
    let isoDateForDiff = '';
    if (dl.includes('/')) {
        fmt = dl;
        const parts = dl.split('/');
        if (parts.length === 3) {
            isoDateForDiff = `${parts[2]}-${parts[1]}-${parts[0]}T12:00:00`;
        } else {
            isoDateForDiff = new Date().toISOString();
        }
    } else {
        const [y,m,d] = dl.split('-');
        fmt = `${d}/${m}/${y}`;
        isoDateForDiff = dl + 'T12:00:00';
    }

    const mot = (motivo || '').toLowerCase();
    const isNaoIdentificacao = mot.includes('nao id') || mot.includes('não id') || /\bnic\b/.test(mot);
    if (isNaoIdentificacao) {
        return `<span style="color:#2563eb; font-weight:700; white-space:nowrap;" title="Multa por Não Identificação">↔️ ${fmt}</span>`;
    }

    const diff = Math.ceil((new Date(isoDateForDiff) - new Date()) / 86400000);
    if (!isNaN(diff)) {
        if (diff <= 0) {
            // VENCIDA: vermelho, sem ícone ⚠️
            return `<span style="color:#dc2626; font-weight:700; white-space:nowrap;" title="VENCIDA">${fmt}</span>`;
        }
        if (diff <= 10) {
            // PRÓXIMA DO VENCIMENTO: amarelo, COM ícone ⚠️
            return `<span style="color:#d97706; font-weight:700; white-space:nowrap;" title="${diff}d para vencer">⚠️ ${fmt}</span>`;
        }
    }
    return `<span style="white-space:nowrap;">${fmt}</span>`;
}

// Helper: badge do status Monaco + data de atualização
function _statusMonacoBadge(m) {
    if (m.status_monaco) {
        // Formata updated_at para exibir como "13/05/2026" ou hora
        let dataAtuFmt = '';
        const upd = m.updated_at || m.atualizado_em || '';
        if (upd) {
            try {
                const d = new Date(upd);
                if (!isNaN(d)) {
                    const dd = String(d.getDate()).padStart(2,'0');
                    const mm = String(d.getMonth()+1).padStart(2,'0');
                    const yy = d.getFullYear();
                    dataAtuFmt = `${dd}/${mm}/${yy}`;
                }
            } catch(_) {}
        }
        return `<span style="background:#f1f5f9; color:#475569; padding:4px 8px; border-radius:12px; font-size:0.75rem; font-weight:700; white-space:nowrap; border:1px solid #cbd5e1;"><i class="ph ph-police-car"></i> ${m.status_monaco}</span>${dataAtuFmt ? `<br><span style="color:#94a3b8; font-size:0.72rem;">${dataAtuFmt}</span>` : ''}`;
    }
    return `<span style="color:#94a3b8; font-size:0.8rem;">—</span>`;
}

// Helper: cor do badge Status RH
function _statusRHColor(status) {
    if (status === 'Conferência') return '#ffa500';
    if (status === 'Em Andamento')   return '#fef08a';
    if (status === 'Conferido')      return '#fef08a'; // legado -> mesma cor de Em Andamento
    if (status === 'Indicado')    return '#66f1c2';
    if (status === 'Multa NIC')   return '#fecaca';
    if (status === 'Id. Deferida') return '#009933';
    if (status === 'Id. Indeferida') return '#ff746c';
    if (status === 'Recorrida') return '#65c8d0';
    if (status === 'Rec. Deferida') return '#0000ff';
    if (status === 'Rec. Indeferida') return '#ff13f0';
    if (status === 'Não Se Aplica') return '#cbd5e1';
    if (status === 'Antiga')      return '#e7e5e4';
    if (status === 'Ex Colaborador') return '#94a3b8'; // Cinza um pouco mais escuro
    if (status === 'Cobrada - Pz. Perdido') return '#bb9469'; // Bege Dourado
    return '#e2e8f0';
}

function _statusRhBadge(statusRh) {
    if (!statusRh) return '<span style="color:#cbd5e1;font-size:0.85rem;">\u2014</span>';
    const cor = statusRh === 'Cobrado' ? '#16a34a' : '#d97706'; // verde = Cobrado, amarelo = Recebido
    const bg  = statusRh === 'Cobrado' ? '#dcfce7' : '#fef9c3';
    return `<span style="background:${bg}; color:${cor}; padding:4px 10px; border-radius:12px; font-size:0.8rem; font-weight:700; white-space:nowrap;">${statusRh}</span>`;
}

// Determina se o texto do badge precisa de cor escura ou clara
function _statusTextColor(bg) {
    // cores escuras precisam de texto branco
    const dark = ['#0000ff', '#009933', '#ff13f0'];
    return dark.includes(bg.toLowerCase()) ? '#fff' : '#0f172a';
}

// Injeta CSS do dropdown customizado uma vez
(function _injectStatusDropdownCSS() {
    if (document.getElementById('status-dropdown-css')) return;
    const style = document.createElement('style');
    style.id = 'status-dropdown-css';
    style.textContent = `
        .custom-status-dropdown { position:relative; width:100%; }
        .custom-status-dropdown .csd-trigger {
            display:flex; align-items:center; gap:8px;
            width:100%; padding:0.5rem 0.6rem; border:1px solid #cbd5e1; border-radius:4px;
            background:#fff; cursor:pointer; user-select:none; box-sizing:border-box;
        }
        .custom-status-dropdown .csd-trigger:hover { border-color:#94a3b8; }
        .custom-status-dropdown .csd-arrow { margin-left:auto; color:#64748b; font-size:0.8rem; }
        .custom-status-dropdown .csd-list {
            position:absolute; top:calc(100% + 4px); left:0; right:0; z-index:99999;
            background:#fff; border:1px solid #cbd5e1; border-radius:6px;
            box-shadow:0 4px 16px rgba(0,0,0,0.12); padding:4px 0; display:none;
            max-height:260px; overflow-y:auto;
        }
        .custom-status-dropdown.open .csd-list { display:block; }
        .custom-status-dropdown .csd-item {
            display:flex; align-items:center; gap:8px; padding:6px 10px;
            cursor:pointer; font-size:0.88rem;
        }
        .custom-status-dropdown .csd-item:hover { background:#f1f5f9; }
        .custom-status-dropdown .csd-badge {
            display:inline-block; padding:3px 10px; border-radius:12px;
            font-size:0.8rem; font-weight:700; white-space:nowrap;
        }
    `;
    document.head.appendChild(style);
})();

// Cria um dropdown customizado de status com badges coloridos
// selectId: id do <select> oculto que mantém o valor real
// containerId: id do wrapper div
function _buildStatusDropdown(containerId, selectId, currentValue, opts, onchange) {
    const ALL_STATUS = [
        'Conferência','Em Andamento','Indicado','Multa NIC',
        'Id. Deferida','Id. Indeferida','Recorrida','Rec. Deferida','Rec. Indeferida',
        'Cobrada - Pz. Perdido', 'Ex Colaborador',
        'Não Se Aplica','Antiga'
    ];
    const list = opts || ALL_STATUS;

    const items = list.map(s => {
        const bg = _statusRHColor(s);
        const fg = _statusTextColor(bg);
        return `<div class="csd-item" data-val="${s}" onclick="_csdSelect('${containerId}','${selectId}','${s}')">
            <span class="csd-badge" style="background:${bg}; color:${fg};">${s}</span>
        </div>`;
    }).join('');

    const initBg = _statusRHColor(currentValue);
    const initFg = _statusTextColor(initBg);

    return `
        <div class="custom-status-dropdown" id="${containerId}">
            <div class="csd-trigger" onclick="_csdToggle('${containerId}')">
                <span class="csd-badge" id="${containerId}-badge" style="background:${initBg}; color:${initFg};">${currentValue || 'Conferência'}</span>
                <span class="csd-arrow">▼</span>
            </div>
            <div class="csd-list">${items}</div>
        </div>
        <select id="${selectId}" style="display:none;" onchange="${onchange || ''}">${list.map(s=>`<option value="${s}" ${s===currentValue?'selected':''}>${s}</option>`).join('')}</select>
    `;
}

function _csdToggle(containerId) {
    // Fecha outros abertos
    document.querySelectorAll('.custom-status-dropdown.open').forEach(el => {
        if (el.id !== containerId) el.classList.remove('open');
    });
    document.getElementById(containerId)?.classList.toggle('open');
}

function _csdSelect(containerId, selectId, value) {
    const bg = _statusRHColor(value);
    const fg = _statusTextColor(bg);
    const badge = document.getElementById(containerId + '-badge');
    if (badge) { badge.textContent = value; badge.style.background = bg; badge.style.color = fg; }
    const sel = document.getElementById(selectId);
    if (sel) { sel.value = value; sel.dispatchEvent(new Event('change')); }
    document.getElementById(containerId)?.classList.remove('open');
}

function _csdRhSelect(value) {
    const bg  = value === 'Cobrado' ? '#dcfce7' : value === 'Recebido' ? '#fef9c3' : '#f1f5f9';
    const fg  = value === 'Cobrado' ? '#16a34a' : value === 'Recebido' ? '#d97706' : '#64748b';
    const badge = document.getElementById('csd-gm-status-rh-badge');
    if (badge) { badge.textContent = value || '-- Sem Status --'; badge.style.background = bg; badge.style.color = fg; }
    const hidden = document.getElementById('gm-status-rh');
    if (hidden) hidden.value = value;
    document.getElementById('csd-gm-status-rh')?.classList.remove('open');
}

// Fecha dropdown ao clicar fora
document.addEventListener('click', function(e) {
    if (!e.target.closest('.custom-status-dropdown')) {
        document.querySelectorAll('.custom-status-dropdown.open').forEach(el => el.classList.remove('open'));
    }
});

// Helper: gera o HTML completo de uma linha da tabela de multas
function _buildMultaRow(m) {
    const dataInfracao = m.data_infracao ? m.data_infracao.split('-').reverse().join('/') : '—';
    const statusColor = _statusRHColor(m.status);

    let motoristaHtml = '';
    if (m.motorista_id && m.motorista_nome) {
        if (String(m.motorista_id) === '-1') {
            motoristaHtml = `<span style="font-weight:600; color:#ef4444; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; white-space:normal; max-width:120px; font-size:0.82rem;" title="Ex Colaborador: ${m.motorista_nome}">${m.motorista_nome}</span>`;
        } else {
            motoristaHtml = `<span style="font-weight:600; color:#0f172a; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; white-space:normal; max-width:120px; font-size:0.82rem;" title="${m.motorista_nome}">${m.motorista_nome}</span>`;
        }
    } else {
        if (m.status === 'Indicado' || m.status === 'Multa NIC') {
            motoristaHtml = `<span style="color:#94a3b8; font-size:0.8rem;">—</span>`;
        } else {
            motoristaHtml = `<button onclick="abrirModalGerenciarMulta(${m.id}, true)" style="background:#f1f5f9; color:#2563eb; border:1px solid #cbd5e1; padding:0.3rem 0.6rem; border-radius:4px; cursor:pointer; font-size:0.78rem; font-weight:600;">+ Adicionar Motorista</button>`;
        }
    }

    let docsExtrasList = [];
    try { docsExtrasList = JSON.parse(m.documentos_extras || '[]'); } catch(e){}

    const isFinalizado = m.status === 'Indicado' || m.status === 'Multa NIC' || m.status === 'Antiga' || m.status === 'Ex Colaborador';

    const btnEditar = `<button onclick="abrirModalGerenciarMulta(${m.id})" style="background:transparent; border:none; cursor:pointer; color:#2563eb; margin-right:6px;" title="Editar Multa"><i class="ph ph-pencil-simple" style="font-size:1.2rem;"></i></button>`;

    // Assinar: sempre visível. Cinza sem cursor se finalizado/assinado (status ou termo já no slot 1)
    const jaAssinado = isFinalizado || !!docsExtrasList[1];
    const btnAssinar = jaAssinado
        ? `<button disabled style="background:transparent; border:none; cursor:default; color:#cbd5e1; margin-right:6px; opacity:0.5;" title="Já assinada"><i class="ph ph-pen-nib" style="font-size:1.2rem;"></i></button>`
        : `<button onclick="abrirFluxoAssinatura(${m.id})" style="background:transparent; border:none; cursor:pointer; color:#7c3aed; margin-right:6px;" title="Assinar Declaração de Responsabilidade"><i class="ph ph-pen-nib" style="font-size:1.2rem;"></i></button>`;

    // Comprovante de rota (extra[0]) — olho azul
    const olhoAzul = docsExtrasList[0]
        ? `<button onclick="visualizarDocExtra(${m.id}, 0)" style="background:transparent; border:none; cursor:pointer; color:#3b82f6; margin-right:6px;" title="Comprovante de Rota"><i class="ph ph-identification-card" style="font-size:1.2rem;"></i></button>`
        : `<button disabled style="background:transparent; border:none; cursor:default; color:#cbd5e1; margin-right:6px; opacity:0.5;" title="Comprovante de Rota (não anexado)"><i class="ph ph-identification-card" style="font-size:1.2rem;"></i></button>`;

    // Termo Assinado (extra[1]) — olho roxo
    const olhoVerde = docsExtrasList[1]
        ? `<button onclick="visualizarDocExtra(${m.id}, 1)" style="background:transparent; border:none; cursor:pointer; color:#8b5cf6; margin-right:6px;" title="Termo Assinado"><i class="ph ph-signature" style="font-size:1.2rem;"></i></button>`
        : `<button disabled style="background:transparent; border:none; cursor:default; color:#cbd5e1; margin-right:6px; opacity:0.5;" title="Termo Assinado (não anexado)"><i class="ph ph-signature" style="font-size:1.2rem;"></i></button>`;

    // Documento de Notificação (documento principal da mônaco)
    const btnDoc = (m.documento_base64 || m.documento_path)
        ? `<button onclick="visualizarDocumentoMulta(${m.id})" style="background:transparent; border:none; cursor:pointer; color:#10b981; margin-right:6px;" title="Documento de Notificação"><i class="ph ph-file-pdf" style="font-size:1.2rem;"></i></button>`
        : `<button disabled style="background:transparent; border:none; cursor:default; color:#cbd5e1; margin-right:6px; opacity:0.5;" title="Documento de Notificação (não anexado)"><i class="ph ph-file-pdf" style="font-size:1.2rem;"></i></button>`;

    // Link formulário: cinza sem cursor se finalizado
    const btnLink = m.link_formulario
        ? (isFinalizado
            ? `<button disabled style="background:transparent; border:none; cursor:default; color:#cbd5e1; margin-right:6px; opacity:0.5;" title="Formulário já processado"><i class="ph ph-link" style="font-size:1.2rem;"></i></button>`
            : `<button onclick="window.open(String('${m.link_formulario}').startsWith('http') ? '${m.link_formulario}' : 'https://${m.link_formulario}', '_blank')" style="background:transparent; border:none; cursor:pointer; color:#8b5cf6; margin-right:6px;" title="Abrir Formulário Externo"><i class="ph ph-link" style="font-size:1.2rem;"></i></button>`)
        : `<button disabled style="background:transparent; border:none; cursor:default; color:#cbd5e1; margin-right:6px; opacity:0.5;" title="Sem formulário externo"><i class="ph ph-link" style="font-size:1.2rem;"></i></button>`;

    return `
        <tr style="border-bottom:1px solid #e2e8f0; transition:background 0.2s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='transparent'">
            <td style="padding:0.6rem 0.75rem;">
                ${window._ultimoIdMultaEditada === m.id 
                    ? `<strong style="font-weight:900; font-size:0.82rem;">${m.numero_ait || '\u2014'}</strong>` 
                    : `<span style="font-size:0.82rem;">${m.numero_ait || '\u2014'}</span>`}
            </td>
            <td style="padding:0.6rem 0.75rem; font-weight:600; color:#334155; white-space:nowrap; font-size:0.82rem;">${m.placa || '\u2014'}</td>
            <td style="padding:0.6rem 0.75rem; font-size:0.82rem;">${dataInfracao}<br><span style="color:#64748b; font-size:0.75rem;">${m.hora_infracao || '\u2014'}</span></td>
            <td style="padding:0.6rem 0.75rem; max-width:160px; font-size:0.82rem;" title="${m.motivo || ''}">
                <div style="display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; white-space:normal; word-break:break-word;">${m.motivo || '\u2014'}</div>
            </td>
            <td style="padding:0.6rem 0.75rem; max-width:130px; font-size:0.82rem;">${motoristaHtml}</td>
            <td style="padding:0.6rem 0.75rem;">
                <div style="display:inline-block; margin-bottom:${m.status_updated_at ? '4px' : '0'};">
                    <span style="background:${statusColor}; color:#0f172a; padding:3px 7px; border-radius:12px; font-size:0.78rem; font-weight:600; white-space:nowrap;">${m.status || '\u2014'}</span>
                </div>
                ${m.status_updated_at ? `<div style="color:#64748b; font-size:0.75rem; font-weight:400; white-space:nowrap;">${m.status_updated_at}</div>` : ''}
            </td>
            <td style="padding:0.6rem 0.75rem; white-space:nowrap;">${_statusRhBadge(m.status_rh)}</td>
            <td style="padding:0.6rem 0.75rem; white-space:nowrap;">${_dataLimiteBadge(m.data_limite, m.motivo)}</td>
            <td style="padding:0.6rem 0.75rem; text-align:center; white-space:nowrap;">
                ${btnEditar}${btnAssinar}${olhoVerde}${olhoAzul}${btnDoc}${btnLink}
            </td>
        </tr>`;
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
            headers: { 'Authorization': `Bearer ${token}` },
            cache: 'no-store'
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

    const RH_STATUS_PERMITIDOS = ['Indicado', 'Multa NIC', 'Id. Indeferida', 'Id. Deferida', 'Rec. Indeferida', 'Cobrada - Pz. Perdido'];

    try {
        const token = localStorage.getItem('erp_token') || localStorage.getItem('token') || '';
        const response = await fetch('/api/logistica/multas', {
            headers: { 'Authorization': `Bearer ${token}` },
            cache: 'no-store'
        });
        if (response.ok) {
            const todas = await response.json();
            // No contexto do RH, exibe apenas os status permitidos
            multasLogistica = window._isRhContext
                ? todas.filter(m => RH_STATUS_PERMITIDOS.includes(m.status))
                : todas;
            const tbody = document.getElementById('multas-tbody');
            if (tbody) {
                filtrarMultasLogistica();
            } else {
                renderMultasLogistica(container);
            }
        } else {
            container.innerHTML = '<p style="padding: 1rem; color: red;">Erro ao carregar multas.</p>';
        }
    } catch (e) {
        console.error('Erro', e);
        container.innerHTML = '<p style="padding: 1rem; color: red;">Erro de conexão.</p>';
    }
}

function renderMultasLogistica(container) {
    const ALL_STATUS_OPTS = ['Conferência', 'Em Andamento', 'Indicado', 'Multa NIC', 'Id. Deferida', 'Id. Indeferida', 'Recorrida', 'Rec. Deferida', 'Rec. Indeferida', 'Cobrada - Pz. Perdido', 'Não Se Aplica', 'Antiga'];
    const RH_STATUS_OPTS  = ['Indicado', 'Multa NIC', 'Id. Indeferida', 'Id. Deferida', 'Rec. Indeferida', 'Cobrada - Pz. Perdido'];
    const STATUS_OPTS = window._isRhContext ? RH_STATUS_OPTS : ALL_STATUS_OPTS;
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
                <input id="mf-motorista" type="text" placeholder="🔍 Motorista" autocomplete="new-password" readonly onfocus="this.removeAttribute('readonly');" oninput="filtrarMultasLogistica()"
                    style="flex:1; min-width:140px; padding:0.45rem 0.7rem; border:1px solid #cbd5e1; border-radius:6px; font-size:0.82rem; outline:none;">
                <input id="mf-ait" type="text" placeholder="🔍 Nº AIT" autocomplete="new-password" readonly onfocus="this.removeAttribute('readonly');" oninput="filtrarMultasLogistica()"
                    style="flex:1; min-width:130px; padding:0.45rem 0.7rem; border:1px solid #cbd5e1; border-radius:6px; font-size:0.82rem; outline:none;">
                <input id="mf-placa" type="text" placeholder="🔍 Placa" autocomplete="new-password" readonly onfocus="this.removeAttribute('readonly');" oninput="filtrarMultasLogistica()"
                    style="flex:1; min-width:100px; padding:0.45rem 0.7rem; border:1px solid #cbd5e1; border-radius:6px; font-size:0.82rem; outline:none;">
                <input id="mf-de" type="date" title="Período de" oninput="filtrarMultasLogistica()"
                    style="flex:1; min-width:140px; padding:0.45rem 0.7rem; border:1px solid #cbd5e1; border-radius:6px; font-size:0.82rem; outline:none;">
                <input id="mf-ate" type="date" title="Período até" oninput="filtrarMultasLogistica()"
                    style="flex:1; min-width:140px; padding:0.45rem 0.7rem; border:1px solid #cbd5e1; border-radius:6px; font-size:0.82rem; outline:none;">
                <div class="custom-multi-select" style="position:relative; flex:1; min-width:180px;">
                    <div class="select-box" onclick="this.nextElementSibling.style.display = this.nextElementSibling.style.display==='block' ? 'none' : 'block'" style="padding:0.45rem 0.7rem; border:1px solid #cbd5e1; border-radius:6px; font-size:0.82rem; background:#fff; cursor:pointer; display:flex; justify-content:space-between; align-items:center;">
                        <span id="lbl-status-rh" style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">Todos Status Logística</span>
                        <i class="ph ph-caret-down"></i>
                    </div>
                    <div class="options-container" style="display:none; position:absolute; top:100%; left:0; right:0; background:#fff; border:1px solid #cbd5e1; border-radius:6px; margin-top:4px; z-index:10; box-shadow:0 4px 6px rgba(0,0,0,0.1); max-height:200px; overflow-y:auto; padding:0.5rem;">
                        ${STATUS_OPTS.map(s => `<label style="display:flex; align-items:center; gap:6px; font-size:0.82rem; padding:4px 0; cursor:pointer;"><input type="checkbox" value="${s}" class="chk-status-rh" onchange="window.atualizarLabelStatusRH(); filtrarMultasLogistica();"> ${s}</label>`).join('')}
                    </div>
                </div>

                </div>

            </div>

            <div style="overflow-y:auto; height:calc(100vh - 340px);">
                <table style="width:100%; border-collapse:collapse; min-width:820px; font-size:0.82rem;">
                    <thead style="position:sticky; top:0; z-index:2; background:#f8fafc; outline:1px solid #e2e8f0;">
                        <tr style="text-align:left;">
                            <th class="multa-th-sort" data-col="numero_ait" onclick="ordenarMultas('numero_ait')" style="padding:0.75rem; font-weight:600; color:#475569; cursor:pointer; user-select:none; white-space:nowrap;">AIT <i class="sort-ico ph ph-arrows-down-up" style="color:#cbd5e1;font-size:0.8rem;"></i></th>
                            <th style="padding:0.75rem; font-weight:600; color:#475569;">Placa</th>
                            <th class="multa-th-sort" data-col="data_infracao" onclick="ordenarMultas('data_infracao')" style="padding:0.75rem; font-weight:600; color:#475569; cursor:pointer; user-select:none; white-space:nowrap;">Data/Hora <i class="sort-ico ph ph-arrow-down" style="color:#2563eb;font-size:0.8rem;"></i></th>
                            <th class="multa-th-sort" data-col="motivo" onclick="ordenarMultas('motivo')" style="padding:0.75rem; font-weight:600; color:#475569; cursor:pointer; user-select:none; white-space:nowrap;">Motivo <i class="sort-ico ph ph-arrows-down-up" style="color:#cbd5e1;font-size:0.8rem;"></i></th>
                            <th class="multa-th-sort" data-col="motorista_nome" onclick="ordenarMultas('motorista_nome')" style="padding:0.75rem; font-weight:600; color:#475569; cursor:pointer; user-select:none; white-space:nowrap;">Motorista <i class="sort-ico ph ph-arrows-down-up" style="color:#cbd5e1;font-size:0.8rem;"></i></th>
                            <th class="multa-th-sort" data-col="status" onclick="ordenarMultas('status')" style="padding:0.75rem; font-weight:600; color:#475569; cursor:pointer; user-select:none; white-space:nowrap;">Status Logística <i class="sort-ico ph ph-arrows-down-up" style="color:#cbd5e1;font-size:0.8rem;"></i></th>
                            <th style="padding:0.75rem; font-weight:600; color:#475569; white-space:nowrap;">Status RH</th>
                            <th class="multa-th-sort" data-col="data_limite" onclick="ordenarMultas('data_limite')" style="padding:0.75rem; font-weight:600; color:#475569; cursor:pointer; user-select:none; white-space:nowrap;">Data Limite <i class="sort-ico ph ph-arrows-down-up" style="color:#cbd5e1;font-size:0.8rem;"></i></th>
                            <th style="padding:0.75rem; font-weight:600; color:#475569; text-align:center;">Ações</th>
                        </tr>
                    </thead>
                    <tbody id="multas-tbody">
    `;

    // ── tbody vazio; o sort padrão será aplicado por filtrarMultasLogistica logo abaixo
    html += `
                    </tbody>
                </table>
            </div>
        </div>
    `;

    container.innerHTML = html;

    // Aplica o sort padrão (data_limite asc) imediatamente após montar o HTML
    filtrarMultasLogistica();

    // Atualiza ícone do cabeçalho para refletir a coluna ativa
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

function _aplicarFiltrosMultas(lista) {
    const motorista = (document.getElementById('mf-motorista')?.value || '').toLowerCase().trim();
    const ait       = (document.getElementById('mf-ait')?.value || '').toLowerCase().trim();
    const placa     = (document.getElementById('mf-placa')?.value || '').toLowerCase().trim();
    const de        = document.getElementById('mf-de')?.value || '';
    const ate       = document.getElementById('mf-ate')?.value || '';
    
    const chksStatusRH = Array.from(document.querySelectorAll('.chk-status-rh:checked')).map(c => c.value);

    return lista.filter(m => {
        if (motorista && !(m.motorista_nome || '').toLowerCase().includes(motorista)) return false;
        if (ait && !(m.numero_ait || '').toLowerCase().includes(ait)) return false;
        if (placa && !(m.placa || '').toLowerCase().includes(placa)) return false;
        if (de && m.data_infracao && m.data_infracao < de) return false;
        if (ate && m.data_infracao && m.data_infracao > ate) return false;
        if (chksStatusRH.length > 0 && !chksStatusRH.includes(m.status)) return false;
        return true;
    });
}

function filtrarMultasLogistica() {
    // Atualiza só o tbody sem re-render completo (preserva os filtros preenchidos)
    const tbody = document.getElementById('multas-tbody');
    if (!tbody) return;

    const listaFiltrada = _aplicarFiltrosMultas(multasLogistica);

    // Colunas de data pura: comparar como timestamp
    const DATE_COLS = ['data_infracao', 'data_limite', 'criado_em', 'atualizado_em', 'updated_at'];

    // Helper de parse de data (ISO ou DD/MM/YYYY)
    const parseDate = v => {
        if (!v) return 0;
        const m = String(v).match(/^(\d{2})\/(\d{2})\/(\d{4})/);
        if (m) return new Date(`${m[3]}-${m[2]}-${m[1]}T12:00:00`).getTime();
        return new Date(v).getTime() || 0;
    };

    listaFiltrada.sort((a, b) => {
        const isDate = DATE_COLS.includes(_multasSortCol);
        let va, vb;

        // Status Mônaco: ordenar pela DATA de atualização (a data exibida abaixo do badge),
        // usando o texto do status só como desempate secundário
        if (_multasSortCol === 'status_monaco') {
            const da = parseDate(a.updated_at || a.atualizado_em || '');
            const db = parseDate(b.updated_at || b.atualizado_em || '');
            // Registros sem data ficam por último
            if (!da && db) return 1;
            if (da && !db) return -1;
            if (da < db) return _multasSortDir === 'asc' ? -1 : 1;
            if (da > db) return _multasSortDir === 'asc' ? 1 : -1;
            // Mesmo data: desempata pelo texto do status
            const sa = (a.status_monaco || '').toLowerCase();
            const sb = (b.status_monaco || '').toLowerCase();
            if (sa < sb) return -1;
            if (sa > sb) return 1;
            return 0;
        }

        if (isDate) {
            va = parseDate(a[_multasSortCol]);
            vb = parseDate(b[_multasSortCol]);
            if (va < vb) return _multasSortDir === 'asc' ? -1 : 1;
            if (va > vb) return _multasSortDir === 'asc' ? 1 : -1;
        } else {
            va = (a[_multasSortCol] || '').toString().toLowerCase();
            vb = (b[_multasSortCol] || '').toString().toLowerCase();
            // Vazios sempre ficam por último, independente da direção
            if (!va && vb) return 1;
            if (va && !vb) return -1;
            if (va < vb) return _multasSortDir === 'asc' ? -1 : 1;
            if (va > vb) return _multasSortDir === 'asc' ? 1 : -1;
        }
        return 0;
    });

    if (listaFiltrada.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" style="padding:2rem; text-align:center; color:#64748b;">Nenhuma multa encontrada com esses filtros.</td></tr>`;
        return;
    }

    tbody.innerHTML = listaFiltrada.map(m => _buildMultaRow(m)).join('');
}

function limparFiltrosMultas() {
    ['mf-motorista','mf-ait','mf-placa','mf-de','mf-ate'].forEach(id => {
        const el = document.getElementById(id); if (el) el.value = '';
    });
    document.querySelectorAll('.chk-status-rh').forEach(cb => cb.checked = false);
    if(window.atualizarLabelStatusRH) window.atualizarLabelStatusRH();
    filtrarMultasLogistica();
}

window.atualizarLabelStatusRH = function() {
    const chks = Array.from(document.querySelectorAll('.chk-status-rh:checked')).map(c => c.value);
    const lbl = document.getElementById('lbl-status-rh');
    if (chks.length === 0) lbl.textContent = 'Todos Status Logística';
    else if (chks.length === 1) lbl.textContent = chks[0];
    else lbl.textContent = `${chks.length} selecionados`;
};

function _buildOptionsMotoristas(motorista_id_atual) {
    let opts = `<option value="">-- Selecione o Motorista (Deixe em branco se não souber) --</option>`;
    let lista = (colaboradoresMultas || []).filter(c => c.status !== 'Desligado' || c.id == motorista_id_atual);
    lista.sort((a, b) => {
        const na = (a.nome_completo || a.nome || '').toLowerCase();
        const nb = (b.nome_completo || b.nome || '').toLowerCase();
        return na.localeCompare(nb);
    });
    lista.forEach(c => {
        const nome = c.nome_completo || c.nome || 'Sem nome';
        const sel = motorista_id_atual == c.id ? 'selected' : '';
        opts += `<option value="${c.id}" ${sel}>${nome}</option>`;
    });
    return opts;
}

function abrirModalNovaMulta() {
    document.getElementById('modal-nova-multa')?.remove();
    const modal = document.createElement('div');
    modal.id = 'modal-nova-multa';
    modal.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); display:flex; justify-content:center; align-items:center; z-index:9999;';
    
    modal.innerHTML = `
        <div style="background:#fff; width:800px; max-width:95%; max-height:95vh; display:flex; flex-direction:column; border-radius:10px; overflow:hidden; box-shadow:0 10px 30px rgba(21,128,61,0.18);">
            <div style="background:linear-gradient(135deg,#16a34a,#15803d); padding:1.2rem 1.5rem; border-bottom:2px solid #14532d; display:flex; justify-content:space-between; align-items:center; flex-shrink:0;">
                <div style="display:flex; align-items:center; gap:0.75rem;">
                    <div style="background:rgba(255,255,255,0.15); border-radius:8px; padding:0.4rem 0.6rem; display:flex; align-items:center;">
                        <i class="ph ph-traffic-cone" style="color:#fff; font-size:1.3rem;"></i>
                    </div>
                    <div>
                        <h3 style="margin:0; color:#fff; font-size:1.15rem; font-weight:700;">Nova Multa</h3>
                        <span style="font-size:0.75rem; color:#bbf7d0; font-weight:500;">Logística — Registro de Autuação</span>
                    </div>
                </div>
                <button onclick="this.closest('#modal-nova-multa').remove()" style="background:rgba(255,255,255,0.15); border:none; font-size:1.5rem; cursor:pointer; color:#fff; width:32px; height:32px; border-radius:50%; display:flex; align-items:center; justify-content:center; line-height:1;">&times;</button>
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

                    <div style="margin-bottom:1rem; background:linear-gradient(135deg,#fefce8,#fef9c3); border:1.5px solid #fbbf24; border-radius:8px; padding:0.85rem 1rem; box-shadow:0 2px 6px rgba(251,191,36,0.15);">
                        <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.5rem;">
                            <i class="ph ph-calendar-check" style="color:#d97706; font-size:1.1rem;"></i>
                            <label style="font-size:0.85rem; font-weight:700; color:#92400e; margin:0;">Prazo de Indicação do Condutor / Defesa de Autuação</label>
                        </div>
                        <p style="margin:0 0 0.5rem; font-size:0.78rem; color:#78350f;">Preencha o prazo limite para indicar o condutor ou apresentar defesa à autoridade de trânsito.</p>
                        <input type="date" id="nm-data-limite" style="width:100%; padding:0.6rem; border:1.5px solid #fbbf24; border-radius:6px; font-size:0.9rem; background:#fff; font-weight:600; color:#92400e;">
                    </div>

                    <!-- NOVOS CAMPOS: Motorista e Resolução -->
                    <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:1rem 1.2rem; margin-bottom:1.3rem;">
                        <h4 style="margin:0 0 1rem; color:#334155; font-size:0.95rem;">&#128100; Vínculo e Resolução (Opcional)</h4>
                        
                        <div style="display:flex; gap:1rem; margin-bottom:1rem; flex-wrap:wrap;">
                            <div style="flex:2; min-width:200px;">
                                <label style="display:block; margin-bottom:0.3rem; font-size:0.85rem; font-weight:600; color:#475569;">Motorista</label>
                                <select id="nm-motorista" style="width:100%; padding:0.6rem; border:1px solid #cbd5e1; border-radius:4px;">
                                    ${_buildOptionsMotoristas(null)}
                                </select>
                            </div>
                        </div>

                        <div style="display:flex; gap:1rem; flex-wrap:wrap;">
                            <div style="flex:2; min-width:200px;">
                                <label style="display:block; margin-bottom:0.3rem; font-size:0.85rem; font-weight:600; color:#475569;">Forma de Resolução</label>
                                ${_buildStatusDropdown('csd-nm-status','nm-status','Conferência')}
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

    document.getElementById('modal-gerenciar-multa')?.remove();
    const modal = document.createElement('div');
    modal.id = 'modal-gerenciar-multa';
    modal.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(15,23,42,0.6); display:flex; justify-content:center; align-items:center; z-index:9999;';

    let optionsMotoristas = _buildOptionsMotoristas(multa.motorista_id);

    // Dados do motorista selecionado (se houver)
    const motoristaColab = multa.motorista_id ? colaboradoresMultas.find(c => c.id === multa.motorista_id) : null;
    const cpf = multa.motorista_cpf || motoristaColab?.cpf || '';
    const habilitacao = multa.motorista_habilitacao || motoristaColab?.cnh_numero || '';
    const endereco = motoristaColab?.endereco || '';
    const endEsc = endereco.replace(/'/g, "\\'");

    const emailHtml = `<div style="display:flex; align-items:center; gap:6px; padding-left:1.2rem;">
        <span style="font-size:0.8rem; color:#374151;"><b>E-mail:</b> <code>operacao@americarental.com.br</code></span>
        <button type="button" onclick="navigator.clipboard.writeText('operacao@americarental.com.br'); mostrarToastSucesso('E-mail copiado!'); event.stopPropagation();" title="Copiar E-mail" style="background:none;border:none;cursor:pointer;color:#2563eb;font-size:0.9rem;padding:0;"><i class="ph ph-copy"></i></button>
    </div>`;

    let motoristaInfoInner = '';
    if (motoristaColab) {
        const nomeColab = (motoristaColab.nome_completo || motoristaColab.nome || '').replace(/'/g, "\\'");
        motoristaInfoInner = `
            <div style="display:flex; align-items:center; gap:6px;">
                <i class="ph ph-user" style="color:#166534;"></i>
                <span style="font-size:0.88rem; color:#166534; font-weight:700;">${motoristaColab.nome_completo || motoristaColab.nome}</span>
                <button type="button" onclick="navigator.clipboard.writeText('${nomeColab}'); mostrarToastSucesso('Nome copiado!'); event.stopPropagation();" title="Copiar Nome" style="background:none;border:none;cursor:pointer;color:#2563eb;font-size:0.9rem;padding:0;"><i class="ph ph-copy"></i></button>
            </div>
            ${cpf ? `<div style="display:flex; align-items:center; gap:6px; padding-left:1.2rem;">
                <span style="font-size:0.8rem; color:#374151;"><b>CPF:</b> <code>${cpf}</code></span>
                <button type="button" onclick="navigator.clipboard.writeText('${cpf}'); mostrarToastSucesso('CPF copiado!'); event.stopPropagation();" title="Copiar CPF" style="background:none;border:none;cursor:pointer;color:#2563eb;font-size:0.9rem;padding:0;"><i class="ph ph-copy"></i></button>
            </div>` : ''}
            ${motoristaColab?.rg ? `<div style="display:flex; align-items:center; gap:6px; padding-left:1.2rem;">
                <span style="font-size:0.8rem; color:#374151;"><b>RG:</b> <code>${motoristaColab.rg}</code></span>
                <button type="button" onclick="navigator.clipboard.writeText('${motoristaColab.rg}'); mostrarToastSucesso('RG copiado!'); event.stopPropagation();" title="Copiar RG" style="background:none;border:none;cursor:pointer;color:#2563eb;font-size:0.9rem;padding:0;"><i class="ph ph-copy"></i></button>
            </div>` : ''}
            ${habilitacao ? `<div style="display:flex; align-items:center; gap:6px; padding-left:1.2rem;">
                <span style="font-size:0.8rem; color:#374151;"><b>CNH:</b> <code>${habilitacao}</code></span>
                <button type="button" onclick="navigator.clipboard.writeText('${habilitacao}'); mostrarToastSucesso('Nº CNH copiado!'); event.stopPropagation();" title="Copiar CNH" style="background:none;border:none;cursor:pointer;color:#2563eb;font-size:0.9rem;padding:0;"><i class="ph ph-copy"></i></button>
                ${multa.motorista_id ? `<button type="button" onclick="baixarCNHMotorista(${multa.motorista_id}); event.stopPropagation();" title="Baixar CNH" style="background:#dbeafe;color:#1d4ed8;border:1px solid #93c5fd;border-radius:6px;padding:2px 10px;font-size:0.78rem;cursor:pointer;font-weight:600;display:inline-flex;align-items:center;gap:4px;"><i class="ph ph-download-simple"></i> CNH</button>` : ''}
            </div>` : ''}
            ${endEsc ? `<div style="display:flex; align-items:center; gap:6px; padding-left:1.2rem;">
                <span style="font-size:0.8rem; color:#374151;"><b>Endereço:</b> <code>${endereco}</code></span>
                <button type="button" onclick="navigator.clipboard.writeText('${endEsc}'); mostrarToastSucesso('Endereço copiado!'); event.stopPropagation();" title="Copiar Endereço" style="background:none;border:none;cursor:pointer;color:#2563eb;font-size:0.9rem;padding:0;"><i class="ph ph-copy"></i></button>
            </div>` : ''}
            ${emailHtml}`;
    }

    // Documentos extras já salvos
    let docsExtras = [];
    try { docsExtras = JSON.parse(multa.documentos_extras || '[]'); } catch(_) {}

    // Histórico de comentários
    let obsHist = [];
    try { if (multa.obs_historico) obsHist = JSON.parse(multa.obs_historico); } catch(_) {}

    function renderHistorico(hist) {
        if (!hist.length) {
            return '<p style="font-size:0.82rem;color:#94a3b8;text-align:center;padding:2rem 1rem;margin:0;"><i class="ph ph-chat-circle-dots" style="font-size:2rem;display:block;margin-bottom:8px;"></i>Nenhum comentário ainda.</p>';
        }
        return hist.slice().reverse().map(h => `
            <div style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:10px 12px;box-shadow:0 1px 3px rgba(0,0,0,0.04);">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px;">
                    <span style="font-size:0.75rem;font-weight:700;color:#6366f1;display:flex;align-items:center;gap:4px;"><i class="ph ph-user-circle"></i>${h.autor || 'Sistema'}</span>
                    <span style="font-size:0.7rem;color:#94a3b8;white-space:nowrap;margin-left:8px;">${h.data || ''}</span>
                </div>
                <p style="margin:0;font-size:0.83rem;color:#334155;line-height:1.55;white-space:pre-wrap;">${(h.texto || '').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</p>
            </div>`).join('');
    }

    // Data limite formatada
    const dataLimiteVal = (function(){
        let dl = multa.data_limite || '';
        if (dl.includes('/')) { const p = dl.split('/'); if(p.length===3) return p[2]+'-'+p[1]+'-'+p[0]; }
        return dl;
    })();
    const dataInfracaoVal = (function(){
        let d = multa.data_infracao || '';
        if (d.includes('/')) { const p = d.split('/'); if(p.length===3) return p[2]+'-'+p[1]+'-'+p[0]; }
        return d;
    })();

    const isAssinada = (multa.status === 'Indicado' || multa.status === 'Multa NIC' || multa.status === 'Assinado' || multa.status === 'Concluído');

    modal.innerHTML = `
        <div style="background:#fff; width:100vw; height:100vh; display:flex; flex-direction:column; overflow:hidden;">

            <!-- HEADER -->
            <div style="background:linear-gradient(135deg,#1e40af,#2563eb); padding:0.9rem 1.5rem; display:flex; justify-content:space-between; align-items:center; flex-shrink:0; box-shadow:0 2px 8px rgba(37,99,235,0.3);">
                <div style="display:flex; align-items:center; gap:12px;">
                    <i class="ph ph-ticket" style="color:#fff; font-size:1.4rem;"></i>
                    <div>
                        <h3 style="margin:0; color:#fff; font-size:1rem; font-weight:700;">Gerenciar Multa</h3>
                        <span style="color:#bfdbfe; font-size:0.8rem; font-weight:500;">${multa.numero_ait || 'S/N'} · ${multa.placa || ''}</span>
                    </div>
                </div>
                <button type="button" onclick="document.getElementById('modal-gerenciar-multa').remove()" style="background:rgba(255,255,255,0.15); border:none; color:#fff; width:36px; height:36px; border-radius:50%; cursor:pointer; font-size:1.3rem; display:flex; align-items:center; justify-content:center; transition:background 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.25)'" onmouseout="this.style.background='rgba(255,255,255,0.15)'">&times;</button>
            </div>

            <!-- BODY: 2 colunas -->
            <div style="flex:1; display:flex; overflow:hidden;">

                <!-- COLUNA ESQUERDA: Informações da Multa -->
                <div style="flex:1.4; overflow-y:auto; padding:1.5rem; background:#f8fafc; border-right:1px solid #e2e8f0;">
                    <form id="form-gerenciar-multa" data-valor="${multa.valor_multa || '0'}" onsubmit="salvarGerenciamentoMulta(event, ${multa.id})">

                        <!-- INFO MOTORISTA -->
                        <div id="gm-info-motorista" style="background:#f0fdf4; border:1px solid #86efac; border-radius:10px; padding:0.85rem 1rem; margin-bottom:1rem; display:${motoristaColab ? 'flex' : 'none'}; flex-direction:column; gap:0.35rem;">
                            ${motoristaInfoInner}
                        </div>

                        <!-- INFO MONACO -->
                        ${multa.status_monaco ? `
                        <div style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:10px; padding:0.75rem 1rem; margin-bottom:1rem; display:flex; align-items:center; gap:0.5rem;">
                            <i class="ph ph-police-car" style="color:#475569; font-size:1.1rem;"></i>
                            <span style="font-size:0.83rem; color:#334155;"><b>Status Mônaco:</b> <span style="font-weight:700; color:#0f172a; padding:2px 8px; background:#e2e8f0; border-radius:10px;">${multa.status_monaco}</span></span>
                            <span style="font-size:0.73rem; color:#94a3b8; margin-left:auto;">(via Webhook)</span>
                        </div>` : ''}

                        <!-- MOTORISTA + STATUS -->
                        <div style="display:flex; gap:1rem; margin-bottom:1rem; flex-wrap:wrap;">
                            <div style="flex:1.5; min-width:220px;">
                                <label style="display:block; margin-bottom:0.3rem; font-size:0.82rem; font-weight:600; color:#475569;">Motorista Responsável</label>
                                <select id="gm-motorista" style="width:100%; padding:0.55rem; border:1px solid #cbd5e1; border-radius:6px; font-size:0.85rem;" onchange="atualizarInfoMotoristaModal(this)">
                                    ${optionsMotoristas}
                                </select>
                                <input type="text" id="gm-ex-colaborador-nome" placeholder="Digite o nome do Ex Colaborador" style="width:100%; padding:0.55rem; border:1px solid #cbd5e1; border-radius:6px; margin-top:0.4rem; font-size:0.85rem; display:${multa.motorista_id == -1 ? 'block' : 'none'};" value="${multa.motorista_id == -1 ? (multa.motorista_nome || '') : ''}">
                            </div>
                            <div style="flex:1; min-width:160px;">
                                <label style="display:block; margin-bottom:0.3rem; font-size:0.82rem; font-weight:600; color:#475569;">Status Logística</label>
                                ${_buildStatusDropdown('csd-gm-status','gm-status', multa.status || 'Conferência', null, 'atualizarValoresMultaModal()')}
                            </div>
                            <div style="flex:1; min-width:130px;" id="gm-status-rh-container">
                                <label style="display:block; margin-bottom:0.3rem; font-size:0.82rem; font-weight:600; color:#475569;">Status RH</label>
                                ${window._isRhContext
                                    ? `<div class="custom-status-dropdown" id="csd-gm-status-rh">
                                        <div class="csd-trigger" onclick="_csdToggle('csd-gm-status-rh')">
                                            <span class="csd-badge" id="csd-gm-status-rh-badge" style="background:${multa.status_rh === 'Cobrado' ? '#dcfce7' : multa.status_rh === 'Recebido' ? '#fef9c3' : '#f1f5f9'}; color:${multa.status_rh === 'Cobrado' ? '#16a34a' : multa.status_rh === 'Recebido' ? '#d97706' : '#64748b'};">${multa.status_rh || '-- Sem Status --'}</span>
                                            <span class="csd-arrow">▼</span>
                                        </div>
                                        <div class="csd-list">
                                            <div class="csd-item" data-val="" onclick="_csdRhSelect('')"><span class="csd-badge" style="background:#f1f5f9;color:#64748b;">-- Sem Status --</span></div>
                                            <div class="csd-item" data-val="Recebido" onclick="_csdRhSelect('Recebido')"><span class="csd-badge" style="background:#fef9c3;color:#d97706;font-weight:700;">Recebido</span></div>
                                            <div class="csd-item" data-val="Cobrado" onclick="_csdRhSelect('Cobrado')"><span class="csd-badge" style="background:#dcfce7;color:#16a34a;font-weight:700;">Cobrado</span></div>
                                        </div>
                                    </div>
                                    <input type="hidden" id="gm-status-rh" value="${multa.status_rh || ''}">`
                                    : `<div style="padding:0.55rem; background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; min-height:36px; display:flex; align-items:center;">${_statusRhBadge(multa.status_rh)}</div><input type="hidden" id="gm-status-rh" value="${multa.status_rh || ''}">`
                                }
                            </div>
                        </div>

                        <!-- VALOR + PONTUAÇÃO -->
                        <div style="display:flex; gap:1rem; margin-bottom:1rem; flex-wrap:wrap;">
                            <div style="flex:1; min-width:130px;">
                                <label style="display:block; margin-bottom:0.3rem; font-size:0.82rem; font-weight:600; color:#475569;">Valor (R$)</label>
                                <input type="text" id="gm-valor" value="${multa.valor_multa || ''}" style="width:100%; padding:0.55rem; border:1px solid #cbd5e1; border-radius:6px; font-size:0.85rem;" oninput="atualizarValoresMultaModal()">
                            </div>
                            <div style="flex:1; min-width:110px;">
                                <label style="display:block; margin-bottom:0.3rem; font-size:0.82rem; font-weight:600; color:#475569;">Pontuação</label>
                                <input type="number" id="gm-pontos" value="${multa.pontuacao || ''}" style="width:100%; padding:0.55rem; border:1px solid #cbd5e1; border-radius:6px; font-size:0.85rem;">
                            </div>
                            ${isAssinada ? `
                            <div style="flex:2; min-width:200px;">
                                <label style="display:block; margin-bottom:0.3rem; font-size:0.82rem; font-weight:600; color:#475569;">Valor a Descontar</label>
                                <div id="gm-valor-info" style="padding:0.55rem; background:#fff; border:1px solid #cbd5e1; border-radius:6px; font-weight:600; color:#0f172a; min-height:36px; display:flex; align-items:center; font-size:0.85rem;">R$ 0,00</div>
                            </div>
                            <input type="hidden" id="gm-parcelas" value="${multa.parcelas || 1}">` : '<input type="hidden" id="gm-parcelas" value="1">'}
                        </div>

                        <!-- DATA + HORA + AIT -->
                        <div style="display:flex; gap:1rem; margin-bottom:1rem; flex-wrap:wrap;">
                            <div style="flex:1; min-width:130px;">
                                <label style="display:block; margin-bottom:0.3rem; font-size:0.82rem; font-weight:600; color:#475569;">Data da Infração</label>
                                <input type="date" id="gm-data" value="${dataInfracaoVal}" style="width:100%; padding:0.55rem; border:1px solid #cbd5e1; border-radius:6px; font-size:0.85rem;">
                            </div>
                            <div style="flex:1; min-width:100px;">
                                <label style="display:block; margin-bottom:0.3rem; font-size:0.82rem; font-weight:600; color:#475569;">Hora</label>
                                <input type="time" id="gm-hora" value="${multa.hora_infracao || ''}" style="width:100%; padding:0.55rem; border:1px solid #cbd5e1; border-radius:6px; font-size:0.85rem;">
                            </div>
                            <div style="flex:2; min-width:170px;">
                                <label style="display:block; margin-bottom:0.3rem; font-size:0.82rem; font-weight:600; color:#475569;">Número AIT</label>
                                <input type="text" id="gm-ait" value="${multa.numero_ait || ''}" style="width:100%; padding:0.55rem; border:1px solid #cbd5e1; border-radius:6px; font-size:0.85rem;">
                            </div>
                        </div>

                        <!-- MOTIVO -->
                        <div style="margin-bottom:1rem;">
                            <label style="display:block; margin-bottom:0.3rem; font-size:0.82rem; font-weight:600; color:#475569;">Motivo (Infração)</label>
                            <input type="text" id="gm-motivo" value="${multa.motivo || ''}" style="width:100%; padding:0.55rem; border:1px solid #cbd5e1; border-radius:6px; font-size:0.85rem;">
                        </div>

                        <!-- PLACA + LOCAL -->
                        <div style="display:flex; gap:1rem; margin-bottom:1rem; flex-wrap:wrap;">
                            <div style="flex:1; min-width:120px;">
                                <label style="display:block; margin-bottom:0.3rem; font-size:0.82rem; font-weight:600; color:#475569;">Placa</label>
                                <input type="text" id="gm-placa" value="${multa.placa || ''}" style="width:100%; padding:0.55rem; border:1px solid #cbd5e1; border-radius:6px; font-size:0.85rem;">
                            </div>
                            <div style="flex:2; min-width:200px;">
                                <label style="display:block; margin-bottom:0.3rem; font-size:0.82rem; font-weight:600; color:#475569;">Local da Infração</label>
                                <input type="text" id="gm-local" value="${multa.local_infracao || ''}" style="width:100%; padding:0.55rem; border:1px solid #cbd5e1; border-radius:6px; font-size:0.85rem;">
                            </div>
                        </div>

                        <!-- DATA LIMITE -->
                        <div style="margin-bottom:1rem; background:#fff7ed; border:1.5px solid #fed7aa; border-radius:10px; padding:0.85rem 1rem;">
                            <label style="display:block; margin-bottom:0.4rem; font-size:0.82rem; font-weight:700; color:#c2410c;">&#128197; Data Limite — Indicação / Defesa</label>
                            <input type="date" id="gm-data-limite" value="${dataLimiteVal}" style="width:100%; padding:0.55rem; border:1px solid #fed7aa; border-radius:6px; font-size:0.85rem;">
                        </div>

                        <!-- LINK FORMULÁRIO -->
                        <div style="margin-bottom:1.2rem;">
                            <label style="display:block; margin-bottom:0.3rem; font-size:0.82rem; font-weight:600; color:#475569;">Link Formulário Assinatura</label>
                            <div style="display:flex; gap:0.5rem;">
                                <input type="text" id="gm-link" value="${multa.link_formulario || ''}" placeholder="https://..." style="flex:1; padding:0.55rem; border:1px solid #cbd5e1; border-radius:6px; font-size:0.85rem;">
                                <button type="button" onclick="const l=document.getElementById('gm-link').value; if(l) window.open(l.startsWith('http')?l:'http://'+l,'_blank')" style="background:#f1f5f9; color:#2563eb; border:1px solid #cbd5e1; border-radius:6px; padding:0 1rem; cursor:pointer; font-weight:600; display:flex; align-items:center; gap:4px; font-size:0.82rem;"><i class="ph ph-arrow-square-out"></i> Abrir</button>
                            </div>
                        </div>

                        <!-- DOCUMENTOS EXTRAS -->
                        <div style="border-top:2px solid #e2e8f0; padding-top:1rem; margin-top:0.5rem;">
                            <label style="display:block; margin-bottom:0.8rem; font-size:0.83rem; font-weight:700; color:#2563eb;"><i class="ph ph-paperclip"></i> Documentos Anexados</label>
                            <div style="display:flex; gap:0.75rem; flex-wrap:wrap;">

                                <!-- Card 0: Comprovante de Rota -->
                                <div style="flex:1; min-width:160px; border:1.5px solid #bfdbfe; border-radius:10px; padding:0.75rem; background:#eff6ff;">
                                    <div style="display:flex; align-items:center; gap:6px; margin-bottom:0.5rem;">
                                        <i class="ph ph-identification-card" style="color:#2563eb; font-size:1.3rem;"></i>
                                        <span style="font-size:0.8rem; font-weight:700; color:#1d4ed8;">Comprovante de Rota</span>
                                    </div>
                                    <div style="margin-bottom:6px; display:flex; gap:5px; flex-wrap:wrap;">
                                        ${docsExtras[0]
                                            ? `<button type="button" onclick="visualizarDocExtra(${multa.id}, 0)" style="background:#dbeafe;color:#1d4ed8;border:1px solid #93c5fd;border-radius:5px;padding:3px 10px;cursor:pointer;font-size:0.76rem;font-weight:600;display:inline-flex;align-items:center;gap:3px;"><i class="ph ph-eye"></i> Ver</button>
                                               <button type="button" onclick="excluirDocExtraEspecifico(${multa.id}, 0)" style="background:#fee2e2;color:#b91c1c;border:1px solid #fca5a5;border-radius:5px;padding:3px 8px;cursor:pointer;font-size:0.76rem;"><i class="ph ph-trash"></i></button>`
                                            : '<span style="font-size:0.73rem;color:#94a3b8;">Não anexado</span>'}
                                    </div>
                                    <input type="file" id="gm-doc-slot-0" accept=".pdf,.jpg,.jpeg,.png" style="width:100%; font-size:0.73rem; margin-bottom:5px;">
                                    <button type="button" onclick="uploadDocExtraSlot(${multa.id}, 0, 'Comprovante de Rota')" style="width:100%; background:#2563eb;color:white;border:none;border-radius:6px;padding:5px 0;cursor:pointer;font-size:0.75rem;font-weight:600;display:flex;align-items:center;justify-content:center;gap:3px;"><i class="ph ph-upload-simple"></i> Anexar</button>
                                </div>

                                <!-- Card 1: Termo Assinado -->
                                <div style="flex:1; min-width:160px; border:1.5px solid #c4b5fd; border-radius:10px; padding:0.75rem; background:#f5f3ff;">
                                    <div style="display:flex; align-items:center; gap:6px; margin-bottom:0.5rem;">
                                        <i class="ph ph-signature" style="color:#7c3aed; font-size:1.3rem;"></i>
                                        <span style="font-size:0.8rem; font-weight:700; color:#6d28d9;">Termo Assinado</span>
                                    </div>
                                    <div style="margin-bottom:6px; display:flex; gap:5px; flex-wrap:wrap;">
                                        ${docsExtras[1]
                                            ? `<button type="button" onclick="visualizarDocExtra(${multa.id}, 1)" style="background:#ede9fe;color:#7c3aed;border:1px solid #c4b5fd;border-radius:5px;padding:3px 10px;cursor:pointer;font-size:0.76rem;font-weight:600;display:inline-flex;align-items:center;gap:3px;"><i class="ph ph-eye"></i> Ver</button>
                                               <button type="button" onclick="excluirDocExtraEspecifico(${multa.id}, 1)" style="background:#fee2e2;color:#b91c1c;border:1px solid #fca5a5;border-radius:5px;padding:3px 8px;cursor:pointer;font-size:0.76rem;"><i class="ph ph-trash"></i></button>`
                                            : '<span style="font-size:0.73rem;color:#94a3b8;">Não anexado</span>'}
                                    </div>
                                    <input type="file" id="gm-doc-slot-1" accept=".pdf,.jpg,.jpeg,.png" style="width:100%; font-size:0.73rem; margin-bottom:5px;">
                                    <button type="button" onclick="uploadDocExtraSlot(${multa.id}, 1, 'Termo Assinado')" style="width:100%; background:#7c3aed;color:white;border:none;border-radius:6px;padding:5px 0;cursor:pointer;font-size:0.75rem;font-weight:600;display:flex;align-items:center;justify-content:center;gap:3px;"><i class="ph ph-upload-simple"></i> Anexar</button>
                                </div>

                                <!-- Card 2: Documento de Notificação -->
                                <div style="flex:1; min-width:160px; border:1.5px solid #6ee7b7; border-radius:10px; padding:0.75rem; background:#ecfdf5;">
                                    <div style="display:flex; align-items:center; gap:6px; margin-bottom:0.5rem;">
                                        <i class="ph ph-file-pdf" style="color:#10b981; font-size:1.3rem;"></i>
                                        <span style="font-size:0.8rem; font-weight:700; color:#065f46;">Doc. Notificação</span>
                                    </div>
                                    <div style="margin-bottom:6px; display:flex; gap:5px; flex-wrap:wrap;">
                                        ${(multa.documento_base64 || multa.documento_path)
                                            ? `<button type="button" onclick="visualizarDocumentoMulta(${multa.id})" style="background:#d1fae5;color:#065f46;border:1px solid #6ee7b7;border-radius:5px;padding:3px 10px;cursor:pointer;font-size:0.76rem;font-weight:600;display:inline-flex;align-items:center;gap:3px;"><i class="ph ph-eye"></i> Ver</button>`
                                            : '<span style="font-size:0.73rem;color:#94a3b8;">Não anexado</span>'}
                                    </div>
                                    <input type="file" id="gm-doc-slot-2" accept=".pdf,.jpg,.jpeg,.png" style="width:100%; font-size:0.73rem; margin-bottom:5px;">
                                    <button type="button" onclick="uploadDocExtraSlot(${multa.id}, 2, 'Documento de Notificação')" style="width:100%; background:#10b981;color:white;border:none;border-radius:6px;padding:5px 0;cursor:pointer;font-size:0.75rem;font-weight:600;display:flex;align-items:center;justify-content:center;gap:3px;"><i class="ph ph-upload-simple"></i> Anexar</button>
                                </div>

                            </div>
                        </div>

                        <!-- BOTÕES -->
                        <div style="display:flex; gap:1rem; margin-top:1.5rem; padding-top:1rem; border-top:1px solid #e2e8f0;">
                            <button type="button" onclick="document.getElementById('modal-gerenciar-multa').remove()" style="flex:1; padding:0.65rem; background:#f1f5f9; border:1px solid #cbd5e1; border-radius:8px; cursor:pointer; font-weight:600; color:#475569; font-size:0.85rem;">Cancelar</button>
                            <button type="submit" style="flex:2; padding:0.65rem; background:linear-gradient(135deg,#1e40af,#2563eb); color:white; border:none; border-radius:8px; cursor:pointer; font-weight:700; font-size:0.85rem; display:flex; align-items:center; justify-content:center; gap:6px;"><i class="ph ph-floppy-disk"></i> Salvar Alterações</button>
                        </div>
                    </form>
                </div>

                <!-- COLUNA DIREITA: Comentários -->
                <div style="width:360px; flex-shrink:0; display:flex; flex-direction:column; background:#fff; border-left:1px solid #e2e8f0;">
                    <!-- Header comentários -->
                    <div style="padding:1rem 1.2rem; border-bottom:1px solid #e2e8f0; background:#f8fafc; flex-shrink:0;">
                        <h4 style="margin:0; color:#1e293b; font-size:0.9rem; font-weight:700; display:flex; align-items:center; gap:6px;">
                            <i class="ph ph-chat-dots" style="color:#6366f1;"></i> Observações / Histórico
                        </h4>
                    </div>

                    <!-- Lista de comentários (scrollável) -->
                    <div id="gm-historico-obs" style="flex:1; overflow-y:auto; padding:1rem; display:flex; flex-direction:column; gap:10px; background:#f8fafc;">
                        ${renderHistorico(obsHist)}
                    </div>

                    <!-- Input novo comentário -->
                    <div style="padding:1rem; border-top:1px solid #e2e8f0; flex-shrink:0; background:#fff;">
                        <p style="margin:0 0 6px; font-size:0.78rem; font-weight:600; color:#475569; display:flex; align-items:center; gap:4px;"><i class="ph ph-plus-circle" style="color:#6366f1;"></i> Novo Comentário</p>
                        <textarea id="gm-novo-comentario" rows="3" placeholder="Escreva um comentário..." style="width:100%; padding:0.6rem; border:1.5px solid #e2e8f0; border-radius:8px; font-size:0.83rem; resize:none; box-sizing:border-box; font-family:inherit; outline:none; transition:border 0.2s;" onfocus="this.style.border='1.5px solid #6366f1'" onblur="this.style.border='1.5px solid #e2e8f0'"></textarea>
                        <button type="button" onclick="enviarComentarioMulta(${multa.id})" style="width:100%; margin-top:6px; background:#6366f1; color:white; border:none; border-radius:8px; padding:0.6rem; cursor:pointer; font-weight:700; font-size:0.82rem; display:flex; align-items:center; justify-content:center; gap:6px; transition:background 0.2s;" onmouseover="this.style.background='#4f46e5'" onmouseout="this.style.background='#6366f1'"><i class="ph ph-paper-plane-tilt"></i> Enviar Comentário</button>
                    </div>
                </div>

            </div>
        </div>
    `;

    document.body.appendChild(modal);

    const statusSel = document.getElementById('gm-status');
    statusSel.addEventListener('change', () => {
        const obsReq = document.getElementById('gm-obs-req');
        if (obsReq) obsReq.style.display = (statusSel.value === 'Não Se Aplica') ? 'inline' : 'none';
    });

    atualizarValoresMultaModal();

    if (focoMotorista && (multa.status !== 'Indicado' && multa.status !== 'Multa NIC')) {
        document.getElementById('gm-motorista')?.focus();
    }
}

// Enviar comentário isolado sem salvar o restante do form
async function enviarComentarioMulta(multaId) {
    const textarea = document.getElementById('gm-novo-comentario');
    const texto = textarea?.value.trim();
    if (!texto) { mostrarToastAviso('Digite um comentário antes de enviar.'); return; }

    const btn = textarea.nextElementSibling;
    const origHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Enviando...';

    try {
        const token = localStorage.getItem('erp_token') || localStorage.getItem('token') || '';
        const resp = await fetch(`/api/logistica/multas/${multaId}`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ novo_comentario: texto })
        });
        if (!resp.ok) throw new Error('Falha ao salvar comentário');

        // Atualiza dados locais e re-renderiza o histórico
        const data = await resp.json().catch(() => ({}));
        textarea.value = '';

        // Busca multa atualizada do servidor para pegar obs_historico novo
        const updResp = await fetch(`/api/logistica/multas`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (updResp.ok) {
            const allData = await updResp.json();
            const updated = allData.find ? allData.find(m => m.id === multaId) : null;
            if (updated) {
                const idx = multasLogistica.findIndex(m => m.id === multaId);
                if (idx >= 0) multasLogistica[idx] = updated;

                let hist = [];
                try { if (updated.obs_historico) hist = JSON.parse(updated.obs_historico); } catch(_) {}
                const container = document.getElementById('gm-historico-obs');
                if (container) {
                    if (!hist.length) {
                        container.innerHTML = '<p style="font-size:0.82rem;color:#94a3b8;text-align:center;padding:2rem 1rem;margin:0;"><i class="ph ph-chat-circle-dots" style="font-size:2rem;display:block;margin-bottom:8px;"></i>Nenhum comentário ainda.</p>';
                    } else {
                        container.innerHTML = hist.slice().reverse().map(h => `
                            <div style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:10px 12px;box-shadow:0 1px 3px rgba(0,0,0,0.04);">
                                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px;">
                                    <span style="font-size:0.75rem;font-weight:700;color:#6366f1;display:flex;align-items:center;gap:4px;"><i class="ph ph-user-circle"></i>${h.autor || 'Sistema'}</span>
                                    <span style="font-size:0.7rem;color:#94a3b8;white-space:nowrap;margin-left:8px;">${h.data || ''}</span>
                                </div>
                                <p style="margin:0;font-size:0.83rem;color:#334155;line-height:1.55;white-space:pre-wrap;">${(h.texto || '').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</p>
                            </div>`).join('');
                        container.scrollTop = 0; // Mostra o mais novo primeiro
                    }
                }
            }
        }
        mostrarToastSucesso('Comentário adicionado!');
    } catch(e) {
        mostrarToastErro('Erro ao enviar comentário: ' + e.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = origHtml;
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
        let str = String(valorOriginalStr).trim();
        if (str.includes(',')) {
            str = str.replace(/\./g, '').replace(',', '.');
        }
        const numeric = str.replace(/[^\d.-]/g, '');
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
    const endColab = (c.endereco || '').replace(/'/g, "\\'");
    const nomeColab = (c.nome_completo || c.nome || '').replace(/'/g, "\\'");
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
        ${c.rg ? `<div style="display:flex; align-items:center; gap:6px; padding-left:1.2rem;">
            <span style="font-size:0.8rem; color:#374151;"><b>RG:</b> <code>${c.rg}</code></span>
            <button type="button" onclick="navigator.clipboard.writeText('${c.rg}'); mostrarToastSucesso('RG copiado!'); event.stopPropagation();" title="Copiar RG" style="background:none;border:none;cursor:pointer;color:#2563eb;font-size:0.9rem;padding:0;"><i class="ph ph-copy"></i></button>
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
        <div style="display:flex; align-items:center; gap:6px; padding-left:1.2rem;">
            <span style="font-size:0.8rem; color:#374151;"><b>E-mail:</b> <code>operacao@americarental.com.br</code></span>
            <button type="button" onclick="navigator.clipboard.writeText('operacao@americarental.com.br'); mostrarToastSucesso('E-mail copiado!'); event.stopPropagation();" title="Copiar E-mail" style="background:none;border:none;cursor:pointer;color:#2563eb;font-size:0.9rem;padding:0;"><i class="ph ph-copy"></i></button>
        </div>
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

// Upload para um slot específico (0=Comprovante de Rota, 1=Termo Assinado, 2=Doc Notificação)
async function uploadDocExtraSlot(multaId, slotIndex, nomeSlot) {
    const input = document.getElementById(`gm-doc-slot-${slotIndex}`);
    if (!input || !input.files.length) { mostrarToastAviso('Selecione um arquivo para anexar.'); return; }
    const file = input.files[0];
    if (file.size > 10 * 1024 * 1024) { mostrarToastAviso('Arquivo muito grande. Máximo 10MB.'); return; }

    try {
        const token = localStorage.getItem('erp_token') || localStorage.getItem('token') || '';
        const fd = new FormData();
        fd.append('documento', file);
        fd.append('slot', slotIndex);
        fd.append('nome', nomeSlot);
        const resp = await fetch(`/api/logistica/multas/${multaId}/documento-extra`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: fd
        });
        if (!resp.ok) throw new Error('Falha no upload');
        const data = await resp.json();
        mostrarToastSucesso(`${nomeSlot} anexado!`);
        input.value = '';
        // Atualiza dados locais e fecha/reabre o modal para refletir o novo estado
        const m = multasLogistica.find(x => x.id === multaId);
        if (m && data.documentos_extras) m.documentos_extras = JSON.stringify(data.documentos_extras);
        abrirModalGerenciarMulta(multaId);
    } catch(e) {
        mostrarToastErro('Erro ao anexar documento: ' + e.message);
    }
}

// Exclui um doc extra por slot (índice)
async function excluirDocExtraEspecifico(multaId, idx) {
    if (!confirm('Deseja realmente excluir este documento?')) return;
    try {
        const token = localStorage.getItem('erp_token') || localStorage.getItem('token') || '';
        const resp = await fetch(`/api/logistica/multas/${multaId}/documento-extra/${idx}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!resp.ok) throw new Error('Falha ao excluir');
        const data = await resp.json();
        mostrarToastSucesso('Documento removido!');
        const m = multasLogistica.find(x => x.id === multaId);
        if (m && data.documentos_extras !== undefined) m.documentos_extras = JSON.stringify(data.documentos_extras);
        abrirModalGerenciarMulta(multaId);
    } catch(e) {
        mostrarToastErro('Erro ao excluir documento: ' + e.message);
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
function visualizarDocExtra(multaId, idx) {
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
    const statusRh = document.getElementById('gm-status-rh')?.value ?? null;

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
                data_limite: dataLimite,
                status_rh: statusRh
            })
        });
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.error || 'Erro ao salvar multa.');
        }

        window._ultimoIdMultaEditada = id;
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

function visualizarTermoDescontoMulta(id) {
    const token = localStorage.getItem('erp_token') || localStorage.getItem('token') || '';
    const url = `/api/logistica/multas/${id}/termo-desconto?token=${encodeURIComponent(token)}`;
    window.open(url, '_blank');
}

// ── Modal de Assinatura de Multa (Logística) ─────────────────────────────────
// Abre o fluxo de assinatura do documento de multa pelo condutor + testemunhas.
// Usa as funções window.abrirModalTestemunhas / window.abrirModalAssinaturaCondutor
// do app.js, adaptando o objeto 'm' da logística para o formato esperado.
async function abrirModalAssinaturaMulta(id) {
    const multa = multasLogistica.find(m => m.id === id);
    if (!multa) { mostrarToastErro('Multa não encontrada.'); return; }

    // Se as funções de assinatura do app.js estão disponíveis, delega a elas
    if (typeof window.abrirModalTestemunhas === 'function' && multa.motorista_id && multa.motorista_id !== -1) {
        // Monta objeto no formato esperado pelo fluxo de assinatura do app.js
        const mObj = {
            id: multa.id,
            tipo_resolucao: multa.status === 'Multa NIC' ? 'nic' : 'indicacao',
            processo_iniciado: true,
            documento_html: null,
            codigo_infracao: multa.numero_ait || multa.motivo || '',
            placa: multa.placa || '',
            data_infracao: multa.data_infracao || '',
            hora_infracao: multa.hora_infracao || '',
            valor_multa: multa.valor_multa || '',
            pontuacao: multa.pontuacao || '',
            assinatura_testemunha1_base64: multa.assinatura_testemunha1_base64 || null,
            assinatura_condutor_base64: multa.assinatura_condutor_base64 || null,
        };
        const colabId = multa.motorista_id;
        window.abrirModalTestemunhas(mObj, colabId);
        return;
    }

    // Fallback: abre modal próprio de assinatura simples com canvas
    document.getElementById('modal-assinatura-multa-log')?.remove();
    const modal = document.createElement('div');
    modal.id = 'modal-assinatura-multa-log';
    modal.style.cssText = 'position:fixed;inset:0;z-index:10002;background:rgba(0,0,0,0.65);display:flex;align-items:center;justify-content:center;padding:1rem;';
    modal.innerHTML = `
        <div style="background:#fff;border-radius:14px;width:100%;max-width:520px;box-shadow:0 16px 40px rgba(0,0,0,0.3);overflow:hidden;">
            <div style="background:linear-gradient(135deg,#7c3aed,#6d28d9);padding:1.1rem 1.5rem;display:flex;align-items:center;justify-content:space-between;">
                <div style="display:flex;align-items:center;gap:0.6rem;">
                    <i class="ph ph-pen-nib" style="color:#fff;font-size:1.3rem;"></i>
                    <div>
                        <div style="color:#fff;font-weight:700;font-size:1rem;">Assinar Documento</div>
                        <div style="color:#ddd6fe;font-size:0.75rem;">Multa ${multa.numero_ait || multa.id} — ${multa.placa || ''}</div>
                    </div>
                </div>
                <button onclick="document.getElementById('modal-assinatura-multa-log').remove()" style="background:rgba(255,255,255,0.15);border:none;color:#fff;width:30px;height:30px;border-radius:50%;cursor:pointer;font-size:1.2rem;display:flex;align-items:center;justify-content:center;">&times;</button>
            </div>
            <div style="padding:1.5rem;">
                <p style="margin:0 0 0.5rem;font-size:0.85rem;color:#475569;">Assine abaixo para confirmar o recebimento / ciência desta multa:</p>
                <canvas id="canvas-multa-log-sign" width="460" height="160" style="border:1.5px solid #c4b5fd;border-radius:8px;touch-action:none;background:#fafafa;cursor:crosshair;width:100%;"></canvas>
                <button onclick="_limparCanvasMulLog()" style="margin-top:4px;background:none;border:none;color:#64748b;cursor:pointer;font-size:0.8rem;"><i class="ph ph-eraser"></i> Limpar</button>
                <div style="display:flex;justify-content:flex-end;gap:0.75rem;margin-top:1rem;">
                    <button onclick="document.getElementById('modal-assinatura-multa-log').remove()" style="padding:0.6rem 1.2rem;background:#f1f5f9;border:1px solid #cbd5e1;border-radius:6px;cursor:pointer;font-weight:600;color:#475569;">Cancelar</button>
                    <button onclick="_confirmarAssinaturaMulLog(${multa.id})" style="padding:0.6rem 1.5rem;background:linear-gradient(135deg,#7c3aed,#6d28d9);color:#fff;border:none;border-radius:6px;cursor:pointer;font-weight:700;"><i class="ph ph-check"></i> Confirmar Assinatura</button>
                </div>
            </div>
        </div>`;
    document.body.appendChild(modal);

    // Inicializar canvas
    const canvas = document.getElementById('canvas-multa-log-sign');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        let drawing = false, lx = 0, ly = 0;
        const pos = e => {
            const r = canvas.getBoundingClientRect();
            const sx = canvas.width / r.width, sy = canvas.height / r.height;
            if (e.touches) return { x: (e.touches[0].clientX - r.left) * sx, y: (e.touches[0].clientY - r.top) * sy };
            return { x: (e.clientX - r.left) * sx, y: (e.clientY - r.top) * sy };
        };
        canvas.onmousedown = canvas.ontouchstart = e => { e.preventDefault(); drawing = true; const p = pos(e); lx = p.x; ly = p.y; };
        canvas.onmousemove = canvas.ontouchmove = e => { e.preventDefault(); if (!drawing) return; const p = pos(e); ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(p.x, p.y); ctx.stroke(); lx = p.x; ly = p.y; };
        canvas.onmouseup = canvas.ontouchend = canvas.onmouseleave = () => { drawing = false; };
    }
}

function _limparCanvasMulLog() {
    const c = document.getElementById('canvas-multa-log-sign');
    if (c) c.getContext('2d').clearRect(0, 0, c.width, c.height);
}

async function _confirmarAssinaturaMulLog(multaId) {
    const canvas = document.getElementById('canvas-multa-log-sign');
    if (!canvas) return;
    const data = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
    const temConteudo = Array.from(data).some((v, i) => i % 4 === 3 && v > 0);
    if (!temConteudo) { mostrarToastAviso('Por favor, realize a assinatura antes de confirmar.'); return; }
    const assinatura = canvas.toDataURL('image/png');
    const token = localStorage.getItem('erp_token') || localStorage.getItem('token') || '';
    try {
        const resp = await fetch(`/api/logistica/multas/${multaId}/assinar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ assinatura_base64: assinatura })
        });
        if (resp.ok) {
            mostrarToastSucesso('Documento assinado com sucesso!');
            document.getElementById('modal-assinatura-multa-log')?.remove();
            await carregarMultasLogistica();
        } else {
            const err = await resp.json().catch(() => ({}));
            mostrarToastErro(err.error || 'Erro ao salvar assinatura.');
        }
    } catch (e) {
        mostrarToastErro('Erro de conexão ao salvar assinatura.');
    }
}
// ─────────────────────────────────────────────────────────────────────────────

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

// Fecha os menus dropdown "custom-multi-select" da tela de multas ao clicar fora
document.addEventListener('click', function(e) {
    const clickedSelect = e.target.closest('.custom-multi-select');
    document.querySelectorAll('.custom-multi-select').forEach(selectDiv => {
        if (selectDiv !== clickedSelect) {
            const container = selectDiv.querySelector('.options-container');
            if (container) container.style.display = 'none';
        }
    });
});

// =============================================================================
// FLUXO DE ASSINATURA — DECLARAÇÃO DE RESPONSABILIDADE POR INFRAÇÃO
// =============================================================================
window.abrirFluxoAssinatura = function(multaId) {
    const multa = multasLogistica.find(x => x.id === multaId);
    if (!multa) { alert('Multa não encontrada.'); return; }

    const fmtMoney = v => {
        const n = parseFloat((v||'0').toString().replace(/[^\d,.]/g,'').replace(',','.')) || 0;
        return 'R$ ' + n.toLocaleString('pt-BR', { minimumFractionDigits:2, maximumFractionDigits:2 });
    };
    const valorOrig = parseFloat((multa.valor_multa||'0').toString().replace(/[^\d,.]/g,'').replace(',','.')) || 0;
    const valorNIC = valorOrig * 2;
    const valorTotal = valorOrig + valorNIC;

    // ---- Estado interno do fluxo ----
    let _opcaoEscolhida = null;
    let _parcelas = 1;
    let _assinaturaBase64 = null;
    let _selfieBase64 = null;
    let _canvas = null;
    let _ctx = null;
    let _desenhando = false;

    // ---- Overlay fullscreen ----
    const overlay = document.createElement('div');
    overlay.id = 'fluxo-assinatura-overlay';
    overlay.style.cssText = `position:fixed;inset:0;z-index:9999;background:rgba(15,23,42,0.85);display:flex;align-items:center;justify-content:center;font-family:'Inter',sans-serif;overflow-y:auto;padding:16px;box-sizing:border-box;`;
    document.body.appendChild(overlay);

    const fechar = () => { overlay.remove(); };

    // ---- Renderiza Etapa 1: Escolha da Opção ----
    function renderEtapa1() {
        overlay.innerHTML = `
        <div style="background:#fff;border-radius:16px;width:100%;max-width:700px;box-shadow:0 25px 50px rgba(0,0,0,0.4);overflow:hidden;">
          <div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:24px 28px;position:relative;">
            <button onclick="document.getElementById('fluxo-assinatura-overlay').remove()" style="position:absolute;top:16px;right:16px;background:rgba(255,255,255,0.15);border:none;color:#fff;border-radius:8px;padding:6px 12px;cursor:pointer;font-size:0.85rem;">✕ Fechar</button>
            <h2 style="margin:0;color:#fff;font-size:1.3rem;font-weight:700;">✍️ Declaração de Responsabilidade</h2>
            <p style="margin:6px 0 0;color:#93c5fd;font-size:0.85rem;">AIT: <strong>${multa.numero_ait||'—'}</strong> &nbsp;|&nbsp; Placa: <strong>${multa.placa||'—'}</strong> &nbsp;|&nbsp; Valor: <strong>${fmtMoney(valorOrig)}</strong></p>
          </div>
          <div style="padding:28px;">
            <p style="color:#475569;margin:0 0 20px;font-size:0.95rem;font-weight:600;">Selecione como o colaborador deseja responder à infração:</p>
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;">
              
              <div onclick="_fluxoEscolher('indicacao')" style="border:2px solid #e2e8f0;border-radius:12px;padding:24px 20px;cursor:pointer;transition:all 0.2s;text-align:center;" 
                   onmouseover="this.style.borderColor='#2563eb';this.style.background='#eff6ff'" 
                   onmouseout="this.style.borderColor='#e2e8f0';this.style.background='#fff'">
                <div style="font-size:2.5rem;margin-bottom:12px;">🪪</div>
                <div style="font-weight:700;color:#1e293b;font-size:1rem;margin-bottom:8px;">Indicação do Condutor</div>
                <div style="font-size:0.8rem;color:#64748b;">Assume a infração na CNH. O valor original será descontado.</div>
                <div style="margin-top:12px;background:#eff6ff;color:#2563eb;padding:6px 12px;border-radius:20px;font-size:0.85rem;font-weight:700;">${fmtMoney(valorOrig)}</div>
                ${multa.pontuacao ? `<div style="margin-top:6px;background:#fef3c7;color:#b45309;padding:4px 12px;border-radius:20px;font-size:0.8rem;font-weight:600;">${multa.pontuacao} pontos na CNH</div>` : ''}
              </div>

              <div onclick="_fluxoEscolher('nic')" style="border:2px solid #e2e8f0;border-radius:12px;padding:24px 20px;cursor:pointer;transition:all 0.2s;text-align:center;"
                   onmouseover="this.style.borderColor='#dc2626';this.style.background='#fff1f2'"
                   onmouseout="this.style.borderColor='#e2e8f0';this.style.background='#fff'">
                <div style="font-size:2.5rem;margin-bottom:12px;">🚫</div>
                <div style="font-weight:700;color:#1e293b;font-size:1rem;margin-bottom:8px;">Multa NIC</div>
                <div style="font-size:0.8rem;color:#64748b;">Não se identifica. Valor dobrado será descontado.</div>
                <div style="margin-top:12px;background:#fff1f2;color:#dc2626;padding:6px 12px;border-radius:20px;font-size:0.85rem;font-weight:700;">${fmtMoney(valorTotal)}</div>
              </div>

              <div onclick="_fluxoEscolher('prazo_perdido')" style="border:2px solid #e2e8f0;border-radius:12px;padding:24px 20px;cursor:pointer;transition:all 0.2s;text-align:center;"
                   onmouseover="this.style.borderColor='#d97706';this.style.background='#fffbeb'"
                   onmouseout="this.style.borderColor='#e2e8f0';this.style.background='#fff'">
                <div style="font-size:2.5rem;margin-bottom:12px;">⏰</div>
                <div style="font-weight:700;color:#1e293b;font-size:1rem;margin-bottom:8px;">Prazo de Identificação Perdido</div>
                <div style="font-size:0.8rem;color:#64748b;">Prazo expirado. Multa original descontada. Sem pontuação na CNH.</div>
                <div style="margin-top:12px;background:#fffbeb;color:#d97706;padding:6px 12px;border-radius:20px;font-size:0.85rem;font-weight:700;">${fmtMoney(valorOrig)}</div>
              </div>

            </div>
          </div>
        </div>`;
    }

    // ---- Renderiza Etapa 2: Confirmação ----
    function renderEtapa2(opcao) {
        const isInd  = opcao === 'indicacao';
        const isPraz = opcao === 'prazo_perdido';
        const corFundo = isInd ? '#eff6ff' : isPraz ? '#fffbeb' : '#fff1f2';
        const corBorda = isInd ? '#2563eb' : isPraz ? '#d97706' : '#dc2626';
        const corTexto = isInd ? '#1e3a5f' : isPraz ? '#78350f' : '#7f1d1d';
        const titulo = isInd ? '⚠️ Confirmação — Indicação do Condutor'
                     : isPraz ? '⚠️ Confirmação — Prazo de Identificação Perdido'
                     : '⚠️ Confirmação — Multa NIC';
        const icone = isInd ? '🪪' : isPraz ? '⏰' : '🚫';

        const mensagem = isInd
            ? `<p><strong>Você optou por indicar o real condutor nesta infração. Deseja prosseguir?</strong></p>
               <p>Ao realizar a identificação do real condutor, a pontuação referente à infração será registrada em sua CNH, e o valor da multa será descontado em sua folha de pagamento, conforme as normas internas da empresa.</p>
               <p>Antes de confirmar essa opção, é importante que o colaborador esteja ciente da quantidade de pontos já registrados em sua Carteira Nacional de Habilitação, evitando ultrapassar o limite previsto na legislação de trânsito.</p>
               <p>Para acompanhar sua pontuação e demais informações da CNH, utilize o aplicativo <strong>Carteira Digital de Trânsito (CDT)</strong>.</p>
               <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:14px;">
                 <div style="background:#eff6ff;border:2px solid #2563eb;border-radius:10px;padding:10px 18px;text-align:center;">
                   <div style="font-size:0.75rem;color:#64748b;margin-bottom:4px;">VALOR A DESCONTAR</div>
                   <div style="font-size:1.5rem;font-weight:800;color:#dc2626;">${fmtMoney(valorOrig)}</div>
                 </div>
                 ${multa.pontuacao ? `<div style="background:#fef3c7;border:2px solid #f59e0b;border-radius:10px;padding:10px 18px;text-align:center;">
                   <div style="font-size:0.75rem;color:#64748b;margin-bottom:4px;">PONTUAÇÃO NA CNH</div>
                   <div style="font-size:1.5rem;font-weight:800;color:#b45309;">${multa.pontuacao} pts</div>
                 </div>` : ''}
               </div>`
            : isPraz
            ? `<p><strong>Você selecionou: Prazo de Identificação Perdido. Deseja prosseguir?</strong></p>
               <p>O prazo para identificação do condutor expirou. Nenhuma indicação de pontuação será feita na CNH, mas o colaborador assume as responsabilidades legais e autoriza o desconto do valor original em folha.</p>
               <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:14px;">
                 <div style="background:#fffbeb;border:2px solid #d97706;border-radius:10px;padding:10px 18px;text-align:center;">
                   <div style="font-size:0.75rem;color:#64748b;margin-bottom:4px;">VALOR A DESCONTAR</div>
                   <div style="font-size:1.5rem;font-weight:800;color:#d97706;">${fmtMoney(valorOrig)}</div>
                 </div>
                 <div style="background:#f0fdf4;border:2px solid #16a34a;border-radius:10px;padding:10px 18px;text-align:center;">
                   <div style="font-size:0.75rem;color:#64748b;margin-bottom:4px;">PONTUAÇÃO NA CNH</div>
                   <div style="font-size:1.1rem;font-weight:800;color:#16a34a;">Nenhuma</div>
                 </div>
               </div>`
            : `<p><strong>Você optou por não se indicar nessa infração. Deseja prosseguir?</strong></p>
               <p>Se não houver identificação do infrator real, uma nova multa (NIC/Remulta) será emitida, com o valor equivalente ao dobro da multa original. É importante ressaltar que, mesmo optando por não se identificar, será necessário assinar o termo de desconto, seguindo o procedimento de reembolso da empresa.</p>
               <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:14px;">
                 <div style="background:#fff1f2;border:2px solid #dc2626;border-radius:10px;padding:10px 18px;text-align:center;">
                   <div style="font-size:0.75rem;color:#64748b;margin-bottom:4px;">MULTA ORIGINAL</div>
                   <div style="font-size:1.3rem;font-weight:700;color:#475569;">${fmtMoney(valorOrig)}</div>
                 </div>
                 <div style="background:#fff1f2;border:2px solid #dc2626;border-radius:10px;padding:10px 18px;text-align:center;">
                   <div style="font-size:0.75rem;color:#64748b;margin-bottom:4px;">MULTA NIC</div>
                   <div style="font-size:1.3rem;font-weight:700;color:#dc2626;">${fmtMoney(valorNIC)}</div>
                 </div>
                 <div style="background:#7f1d1d;border:2px solid #dc2626;border-radius:10px;padding:10px 18px;text-align:center;">
                   <div style="font-size:0.75rem;color:#fca5a5;margin-bottom:4px;">VALOR TOTAL A PAGAR</div>
                   <div style="font-size:1.5rem;font-weight:800;color:#fff;">${fmtMoney(valorTotal)}</div>
                 </div>
               </div>`;

        const valorCalc = (isInd || isPraz) ? valorOrig : valorTotal;
        const parcelasHtml = `
               <div style="margin-top:20px;border-top:1px solid rgba(0,0,0,0.1);padding-top:16px;">
                 <label style="font-size:0.85rem;font-weight:600;color:${corTexto};display:block;margin-bottom:8px;">Forma de pagamento (parcelas):</label>
                 <div style="display:flex;gap:8px;flex-wrap:wrap;" id="parcelas-container">
                   ${[1,2,3].map(n=>`<button id="parc-btn-${n}" onclick="_fluxoSetParcelas(${n})" style="border:2px solid #cbd5e1;background:#fff;border-radius:8px;padding:8px 16px;cursor:pointer;font-weight:600;color:#475569;transition:all 0.2s;">${n}x ${fmtMoney((valorCalc/n))}</button>`).join('')}
                 </div>
               </div>`;

        overlay.innerHTML = `
        <div style="background:#fff;border-radius:16px;width:100%;max-width:700px;box-shadow:0 25px 50px rgba(0,0,0,0.4);overflow:hidden;">
          <div style="background:${corBorda};padding:20px 28px;position:relative;">
            <h2 style="margin:0;color:#fff;font-size:1.1rem;font-weight:700;">${titulo}</h2>
            <p style="margin:4px 0 0;color:rgba(255,255,255,0.8);font-size:0.82rem;">AIT: ${multa.numero_ait||'—'} &nbsp;|&nbsp; ${multa.motorista_nome||'—'}</p>
          </div>
          <div style="padding:24px;background:${corFundo};">
            <div style="font-size:2rem;margin-bottom:12px;text-align:center;">${icone}</div>
            <div style="font-size:0.92rem;color:${corTexto};line-height:1.6;">${mensagem}</div>
            ${parcelasHtml}
          </div>
          <div style="padding:16px 24px 24px;display:flex;justify-content:space-between;gap:12px;border-top:1px solid #e2e8f0;flex-wrap:wrap;">
            <button onclick="_fluxoVoltar()" style="background:#f1f5f9;color:#475569;border:none;border-radius:8px;padding:10px 22px;cursor:pointer;font-weight:600;font-size:0.9rem;">← Voltar</button>
            <button onclick="_fluxoConfirmar()" style="background:${corBorda};color:#fff;border:none;border-radius:8px;padding:10px 26px;cursor:pointer;font-weight:700;font-size:0.9rem;">Confirmar e Gerar Termo →</button>
          </div>
        </div>`;

        // Destaca parcela 1 por padrão
        setTimeout(() => {
            const btn1 = document.getElementById('parc-btn-1');
            if (btn1) { 
                btn1.style.borderColor = corBorda; 
                btn1.style.color = corBorda; 
                btn1.style.background = isInd ? '#fff' : '#fff1f2'; 
            }
        }, 50);
    }

    // ---- Renderiza Etapa 3: Termo + Assinatura ----
    function renderEtapa3(opcao) {
        const isInd  = opcao === 'indicacao';
        const isPraz = opcao === 'prazo_perdido';
        const fmtData = (d) => {
            if (!d) return '—';
            if (d.includes('/')) return d;
            const [y, mo, dy] = d.split('-');
            return dy ? `${dy}/${mo}/${y}` : d;
        };
        const checkInd  = isInd  ? '✓' : '&nbsp;&nbsp;&nbsp;';
        const checkNic  = (!isInd && !isPraz) ? '✓' : '&nbsp;&nbsp;&nbsp;';
        const checkPraz = isPraz ? '✓' : '&nbsp;&nbsp;&nbsp;';
        const valorDesc   = (isInd || isPraz) ? fmtMoney(valorOrig) : fmtMoney(valorTotal);
        const parcelaValor = (isInd || isPraz) ? valorOrig / _parcelas : valorTotal / _parcelas;

        overlay.innerHTML = `
        <div style="background:#fff;border-radius:16px;width:100%;max-width:800px;box-shadow:0 25px 50px rgba(0,0,0,0.4);overflow:hidden;max-height:95vh;display:flex;flex-direction:column;">
          <div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:18px 24px;position:relative;flex-shrink:0;">
            <h2 style="margin:0;color:#fff;font-size:1.1rem;font-weight:700;">📄 Leitura e Assinatura do Termo</h2>
            <p style="margin:4px 0 0;color:#93c5fd;font-size:0.8rem;">Leia o termo abaixo e, após leitura, assine e tire uma selfie para confirmar.</p>
          </div>
          
          <div style="flex:1;overflow-y:auto;padding:20px 24px;">
            
            <!-- Termo resumido -->
            <div style="border:1px solid #e2e8f0;border-radius:10px;padding:18px;margin-bottom:20px;background:#f8fafc;font-size:0.82rem;line-height:1.6;color:#1e293b;">
              <h3 style="text-align:center;font-size:0.95rem;text-transform:uppercase;margin:0 0 4px;">DECLARAÇÃO DE RESPONSABILIDADE POR INFRAÇÃO DE TRÂNSITO</h3>
              <p style="text-align:center;font-size:0.75rem;color:#64748b;margin:0 0 14px;">CNPJ nº 03.434.448/0001-01 — Rua Salto da Divisa, nº 97 — Guarulhos/SP</p>
              
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px;background:#fff;border-radius:6px;padding:10px;border:1px solid #e2e8f0;">
                <div><strong>PLACA:</strong> ${multa.placa||'—'}</div>
                <div><strong>AIT:</strong> ${multa.numero_ait||'—'}</div>
                <div><strong>DATA/HORA:</strong> ${fmtData(multa.data_infracao)} ${multa.hora_infracao||''}</div>
                <div><strong>ENDEREÇO:</strong> ${(multa.local_infracao||'—').substring(0,40)}</div>
                <div style="grid-column:1/-1"><strong>DESCRIÇÃO:</strong> ${multa.motivo||'—'}</div>
              </div>

              <p>Pelo presente instrumento, DECLARO ser o condutor do veículo e único responsável pela infração acima. Neste ato me responsabilizo pelo cometimento da infração, nos termos do art. 257, § 7° do CTB e da Resolução CONTRAN n° 918/2022. Declaro ciência que em caso de não identificação do condutor, será lavrada nova multa com valor dobrado (art. 257, § 8° do CTB).</p>
              
              ${isInd ? `
              <div style="border:2px solid #2563eb;border-radius:8px;padding:12px;margin:8px 0;background:#eff6ff;">
                <strong>(✓) OPÇÃO 1 — INDICAÇÃO DO CONDUTOR</strong>
                <p style="margin:6px 0 0;">Declaro que opto pela indicação como condutor infrator, autorizando a empresa a realizar a devida identificação junto ao órgão competente. Estou ciente de que assumo integralmente as responsabilidades legais, inclusive pontuação na CNH.</p>
                <p><strong>Valor:</strong> <span style="color:#dc2626;font-weight:700;">${fmtMoney(valorOrig)}</span> &nbsp;&nbsp; ${multa.pontuacao ? `<strong>Pontuação:</strong> <span style="color:#b45309;font-weight:700;">${multa.pontuacao} pts</span>` : ''}</p>
                <p><strong>Parcelas:</strong> ${_parcelas}x de <span style="color:#dc2626;font-weight:700;">${fmtMoney(parcelaValor)}</span></p>
              </div>` : isPraz ? `
              <div style="border:2px solid #d97706;border-radius:8px;padding:12px;margin:8px 0;background:#fffbeb;">
                <strong>(✓) OPÇÃO 3 — COBRANÇA DE MULTA, PRAZO DE INDICAÇÃO PERDIDO</strong>
                <p style="margin:6px 0 0;">Declaro que estou ciente e autorizo o desconto em folha referente ao pagamento da multa, conforme acordado. Além disso, estou ciente de que não será feita nenhuma indicação de pontuação na minha carteira de habilitação, porém assumo integralmente as responsabilidades legais.</p>
                <p><strong>Valor:</strong> <span style="color:#d97706;font-weight:700;">${fmtMoney(valorOrig)}</span></p>
                <p><strong>Parcelas:</strong> ${_parcelas}x de <span style="color:#d97706;font-weight:700;">${fmtMoney(parcelaValor)}</span></p>
              </div>` : `
              <div style="border:2px solid #dc2626;border-radius:8px;padding:12px;margin:8px 0;background:#fff1f2;">
                <strong>(✓) OPÇÃO 2 — NÃO INDICAÇÃO (NIC)</strong>
                <p style="margin:6px 0 0;">Declaro que opto por não realizar a indicação do condutor. Autorizo a empresa AMÉRICA RENTAL EQUIPAMENTOS LTDA (CNPJ 03.434.448/0001-01) a efetuar o desconto em folha conforme abaixo:</p>
                <p><strong>Multa Originária:</strong> ${fmtMoney(valorOrig)} &nbsp;|&nbsp; <strong>Multa NIC:</strong> ${fmtMoney(valorNIC)} &nbsp;|&nbsp; <strong>Total:</strong> <span style="color:#dc2626;font-weight:700;">${fmtMoney(valorTotal)}</span></p>
                <p><strong>Parcelas:</strong> ${_parcelas}x de <span style="color:#dc2626;font-weight:700;">${fmtMoney(parcelaValor)}</span></p>
              </div>`}
            </div>

            <!-- Assinatura Canvas -->
            <div style="margin-bottom:20px;">
              <div style="font-weight:700;color:#1e293b;margin-bottom:8px;font-size:0.9rem;">✍️ Assinatura do Colaborador</div>
              <div style="border:2px solid #cbd5e1;border-radius:8px;background:#f8fafc;overflow:hidden;position:relative;">
                <canvas id="canvas-declaracao" width="740" height="140" style="display:block;width:100%;cursor:crosshair;touch-action:none;"></canvas>
                <div id="canvas-placeholder" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#94a3b8;font-size:0.85rem;pointer-events:none;">Assine aqui com o dedo ou mouse</div>
              </div>
              <div style="display:flex;justify-content:space-between;margin-top:6px;">
                <button onclick="_fluxoLimparCanvas()" style="background:none;border:1px solid #cbd5e1;color:#64748b;border-radius:6px;padding:6px 16px;cursor:pointer;font-size:0.85rem;">🗑 Limpar</button>
                <button onclick="document.getElementById('selfie-section').style.display='block'; this.style.display='none'; setTimeout(()=>{ _fluxoIniciarCamera(); }, 200);" id="btn-seguinte-selfie" style="background:#2563eb;color:#fff;border:none;border-radius:6px;padding:6px 20px;cursor:pointer;font-size:0.9rem;font-weight:600;">Seguinte →</button>
              </div>
            </div>

            <!-- Selfie -->
            <div id="selfie-section" style="margin-bottom:20px;display:none;">
              <div style="font-weight:700;color:#1e293b;margin-bottom:8px;font-size:0.9rem;">📷 Selfie para Comprovação <span style="color:#dc2626;font-size:0.8rem;">(obrigatório)</span></div>
              <div style="background:#fef3c7;border:1px solid #fbbf24;border-radius:8px;padding:10px 14px;margin-bottom:10px;font-size:0.82rem;color:#92400e;">⚠️ Tire uma selfie para confirmar sua identidade e concluir o processo de assinatura.</div>
              
              <div id="selfie-camera-container" style="display:none; flex-direction:column; align-items:center; background:#0f172a; border-radius:8px; overflow:hidden; position:relative; margin-bottom:12px; width:100%; max-width:400px; margin-left:auto; margin-right:auto;">
                <video id="selfie-video" autoplay playsinline style="width:100%; max-height:300px; object-fit:cover;"></video>
                <button onclick="_fluxoTirarFotoWebRTC()" style="position:absolute; bottom:16px; background:#16a34a; color:#fff; border:2px solid #fff; border-radius:50px; padding:10px 24px; cursor:pointer; font-weight:700; font-size:0.95rem; box-shadow:0 4px 6px rgba(0,0,0,0.3);">📸 Capturar</button>
              </div>

              <div id="selfie-controls" style="display:flex; align-items:center; gap:12px; flex-wrap:wrap;">
                <button onclick="_fluxoIniciarCamera()" id="btn-iniciar-camera" style="background:#7c3aed;color:#fff;border:none;border-radius:8px;padding:10px 20px;cursor:pointer;font-weight:600;font-size:0.9rem;">📷 Abrir Câmera</button>
                <span style="font-size:0.8rem;color:#94a3b8;" id="selfie-status">Nenhuma foto tirada</span>
              </div>
              <div id="selfie-preview" style="margin-top:10px;"></div>
            </div>

          </div>

          <!-- Rodapé -->
          <div style="padding:16px 24px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;flex-shrink:0;gap:12px;flex-wrap:wrap;background:#f8fafc;">
            <button onclick="_fluxoVoltar()" style="background:#f1f5f9;color:#475569;border:none;border-radius:8px;padding:10px 20px;cursor:pointer;font-weight:600;">← Voltar</button>
            <button onclick="_fluxoFinalizar()" style="background:linear-gradient(135deg,#1e3a5f,#2563eb);color:#fff;border:none;border-radius:8px;padding:12px 28px;cursor:pointer;font-weight:700;font-size:1rem;" id="btn-finalizar-declaracao">✅ Finalizar e Salvar</button>
          </div>
        </div>`;

        // Init canvas
        setTimeout(() => {
            _canvas = document.getElementById('canvas-declaracao');
            if (!_canvas) return;
            _ctx = _canvas.getContext('2d');
            _ctx.lineWidth = 2.5;
            _ctx.strokeStyle = '#1e293b';
            _ctx.lineCap = 'round';

            const getPos = (e) => {
                const rect = _canvas.getBoundingClientRect();
                const scaleX = _canvas.width / rect.width;
                const scaleY = _canvas.height / rect.height;
                const src = e.touches ? e.touches[0] : e;
                return { x: (src.clientX - rect.left) * scaleX, y: (src.clientY - rect.top) * scaleY };
            };
            _canvas.addEventListener('mousedown', e => { _desenhando = true; const p = getPos(e); _ctx.beginPath(); _ctx.moveTo(p.x, p.y); document.getElementById('canvas-placeholder').style.display='none'; });
            _canvas.addEventListener('mousemove', e => { if (!_desenhando) return; const p = getPos(e); _ctx.lineTo(p.x, p.y); _ctx.stroke(); });
            _canvas.addEventListener('mouseup', () => { _desenhando = false; _assinaturaBase64 = _canvas.toDataURL('image/png'); });
            _canvas.addEventListener('mouseleave', () => { _desenhando = false; });
            _canvas.addEventListener('touchstart', e => { e.preventDefault(); _desenhando = true; const p = getPos(e); _ctx.beginPath(); _ctx.moveTo(p.x, p.y); document.getElementById('canvas-placeholder').style.display='none'; }, {passive:false});
            _canvas.addEventListener('touchmove', e => { e.preventDefault(); if (!_desenhando) return; const p = getPos(e); _ctx.lineTo(p.x, p.y); _ctx.stroke(); }, {passive:false});
            _canvas.addEventListener('touchend', () => { _desenhando = false; _assinaturaBase64 = _canvas.toDataURL('image/png'); });
        }, 80);
    }

    // ---- Funções de controle (globais temporárias) ----
    window._fluxoEscolher = function(opcao) {
        _opcaoEscolhida = opcao;
        renderEtapa2(opcao);
    };
    window._fluxoSetParcelas = function(n) {
        _parcelas = n;
        document.querySelectorAll('[id^="parc-btn-"]').forEach(b => {
            b.style.borderColor = '#cbd5e1'; b.style.color = '#475569'; b.style.background = '#fff';
        });
        const btn = document.getElementById(`parc-btn-${n}`);
        if (btn) {
            const isInd  = _opcaoEscolhida === 'indicacao';
            const isPraz = _opcaoEscolhida === 'prazo_perdido';
            btn.style.borderColor = isInd ? '#2563eb' : isPraz ? '#d97706' : '#dc2626';
            btn.style.color       = isInd ? '#2563eb' : isPraz ? '#d97706' : '#dc2626';
            btn.style.background  = isInd ? '#eff6ff' : isPraz ? '#fffbeb' : '#fff1f2';
        }
    };
    window._fluxoVoltar = function() {
        if (document.getElementById('canvas-declaracao')) renderEtapa2(_opcaoEscolhida);
        else renderEtapa1();
    };
    window._fluxoConfirmar = function() {
        renderEtapa3(_opcaoEscolhida);
    };
    window._fluxoLimparCanvas = function() {
        if (_ctx && _canvas) { 
            _ctx.clearRect(0, 0, _canvas.width, _canvas.height); 
            _assinaturaBase64 = null; 
            document.getElementById('canvas-placeholder').style.display='flex'; 
            
            const btnSeg = document.getElementById('btn-seguinte-selfie');
            if (btnSeg) btnSeg.style.display = 'inline-block';
            const sectSelfie = document.getElementById('selfie-section');
            if (sectSelfie) sectSelfie.style.display = 'none';
        }
    };
    window._fluxoCapturarSelfie = function(input) {
        const file = input.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = e => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const maxDim = 1000;
                let w = img.width, h = img.height;
                if (w > maxDim || h > maxDim) {
                    if (w > h) { h = h * (maxDim / w); w = maxDim; }
                    else { w = w * (maxDim / h); h = maxDim; }
                }
                canvas.width = w; canvas.height = h;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, w, h);
                
                const overlayH = 75;
                ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
                ctx.fillRect(0, canvas.height - overlayH, canvas.width, overlayH);
                
                const dtStr = new Date().toLocaleString('pt-BR');
                ctx.fillStyle = '#fbbf24'; ctx.font = 'bold 14px Arial'; ctx.fillText('Infração: AIT ' + (multa.numero_ait || '—'), 8, canvas.height - overlayH + 20);
                ctx.fillStyle = '#e2e8f0'; ctx.font = '13px Arial'; ctx.fillText('Colaborador: ' + (multa.motorista_nome || ''), 8, canvas.height - overlayH + 38);
                ctx.fillStyle = '#94a3b8'; ctx.font = '12px Arial'; ctx.fillText(dtStr, 8, canvas.height - overlayH + 54);
                ctx.fillText('Opção: ' + (_opcaoEscolhida === 'indicacao' ? 'Indicação' : 'NIC'), 8, canvas.height - overlayH + 68);
                
                _selfieBase64 = canvas.toDataURL('image/jpeg', 0.8);
                document.getElementById('selfie-status').textContent = '✅ Foto capturada (Arquivo)!';
                document.getElementById('selfie-status').style.color = '#16a34a';
                document.getElementById('selfie-preview').innerHTML = `<img src="${_selfieBase64}" style="max-width:120px;max-height:120px;border-radius:8px;border:2px solid #86efac;margin-top:4px;">`;
                document.getElementById('btn-iniciar-camera').textContent = '📷 Tirar Outra Foto';
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    };
    
    window._fluxoIniciarCamera = async function() {
        const container = document.getElementById('selfie-camera-container');
        const video = document.getElementById('selfie-video');
        const controls = document.getElementById('selfie-controls');
        
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
            video.srcObject = stream;
            container.style.display = 'flex';
            controls.style.display = 'none';
            document.getElementById('selfie-preview').innerHTML = '';
            _selfieBase64 = null;
            window._streamSelfie = stream;
        } catch (err) {
            console.warn('Câmera nativa não disponível:', err);
            // Fallback para input file nativo (abre o file picker / câmera nativa do mobile)
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.capture = 'user';
            input.onchange = (e) => _fluxoCapturarSelfie(e.target);
            input.click();
        }
    };

    window._fluxoTirarFotoWebRTC = function() {
        const video = document.getElementById('selfie-video');
        if (!video.srcObject) return;
        
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        const overlayH = 75;
        ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
        ctx.fillRect(0, canvas.height - overlayH, canvas.width, overlayH);
        
        const dtStr = new Date().toLocaleString('pt-BR');
        ctx.fillStyle = '#fbbf24'; ctx.font = 'bold 14px Arial'; ctx.fillText('Infração: AIT ' + (multa.numero_ait || '—'), 8, canvas.height - overlayH + 20);
        ctx.fillStyle = '#e2e8f0'; ctx.font = '13px Arial'; ctx.fillText('Colaborador: ' + (multa.motorista_nome || ''), 8, canvas.height - overlayH + 38);
        ctx.fillStyle = '#94a3b8'; ctx.font = '12px Arial'; ctx.fillText(dtStr, 8, canvas.height - overlayH + 54);
        ctx.fillText('Opção: ' + (_opcaoEscolhida === 'indicacao' ? 'Indicação' : 'NIC'), 8, canvas.height - overlayH + 68);
        
        _selfieBase64 = canvas.toDataURL('image/jpeg', 0.8);
        
        if (window._streamSelfie) {
            window._streamSelfie.getTracks().forEach(t => t.stop());
        }
        video.srcObject = null;
        
        document.getElementById('selfie-camera-container').style.display = 'none';
        document.getElementById('selfie-controls').style.display = 'flex';
        
        document.getElementById('selfie-status').textContent = '✅ Foto capturada!';
        document.getElementById('selfie-status').style.color = '#16a34a';
        document.getElementById('selfie-preview').innerHTML = `<img src="${_selfieBase64}" style="max-width:120px;max-height:120px;border-radius:8px;border:2px solid #86efac;margin-top:4px;">`;
        document.getElementById('btn-iniciar-camera').textContent = '📷 Tirar Outra Foto';
    };

    window._fluxoFinalizar = async function() {
        // Captura assinatura atual do canvas
        if (_canvas) _assinaturaBase64 = _canvas.toDataURL('image/png');

        if (!_assinaturaBase64 || _assinaturaBase64 === 'data:,') {
            alert('Por favor, assine no campo de assinatura antes de finalizar.');
            return;
        }
        if (!_selfieBase64) {
            alert('A selfie é obrigatória. Por favor, tire a selfie antes de finalizar.');
            _fluxoIniciarCamera();
            return;
        }

        const btn = document.getElementById('btn-finalizar-declaracao');
        btn.disabled = true; btn.textContent = '⏳ Salvando...';

        const token = localStorage.getItem('erp_token') || localStorage.getItem('token') || '';
        try {
            const secData = (typeof window.getDeviceSecurityData === 'function') ? await window.getDeviceSecurityData() : { gps_lat: '', gps_lon: '', dispositivo: navigator.userAgent };
            
            const res = await fetch(`/api/logistica/multas/${multaId}/salvar-declaracao`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    opcao: _opcaoEscolhida,
                    parcelas: _parcelas,
                    assinatura_base64: _assinaturaBase64,
                    selfie_base64: _selfieBase64 || null,
                    gps_lat: secData.gps_lat,
                    gps_lon: secData.gps_lon,
                    dispositivo: secData.dispositivo
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Erro ao salvar.');
            overlay.remove();
            window._ultimoIdMultaEditada = multaId;
            await carregarMultasLogistica();
            if (typeof mostrarToastSucesso === 'function') mostrarToastSucesso(`Declaração assinada e salva! Status: ${data.novoStatus}`);
        } catch(e) {
            btn.disabled = false; btn.textContent = '✅ Finalizar e Salvar';
            alert('Erro ao salvar declaração: ' + e.message);
        }
    };

    // Inicia na etapa 1
    renderEtapa1();
};
