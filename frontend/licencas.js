// ═══════════════════════════════════════════════════════════
//  MÓDULO DE LICENÇAS EMPRESARIAIS
//  Empresas: América Rental | Attend Ambiental | BRK
// ═══════════════════════════════════════════════════════════

const LICENCAS_CONFIG = {
    'america-rental': {
        label: 'América Rental',
        color: '#d9480f',
        bg: '#fff5f0',
        border: '#ffd0b8',
        icon: 'ph-building-office',
        docs: [
            'PCMSO', 'ALVARÁ', 'AVCB', 'CADRI', 'Cartão de CNPJ',
            'CLI', 'CND Estadual', 'CND Federal', 'CND Municipal',
            'CND Trabalhista', 'CTF IBAMA', 'Inscrição Estadual',
            'Inscrição Municipal', 'Licença de Operação', 'CETESB', 'LTCAT'
        ]
    },
    'attend-ambiental': {
        label: 'Attend Ambiental',
        color: '#1971c2',
        bg: '#f0f7ff',
        border: '#b8d9f5',
        icon: 'ph-leaf',
        docs: [
            'Alvará', 'AVCB', 'CADRI', 'Cartão CNPJ', 'CTF IBAMA',
            'Declaração de Contrato', 'Declaração de Vigência',
            'LI - Licença de Instalação', 'LO - Licença de Operação'
        ]
    },
    'brk': {
        label: 'BRK',
        color: '#2d9e5f',
        bg: '#f0fdf4',
        border: '#b8f0d0',
        icon: 'ph-factory',
        docs: [
            'Alvará', 'AVCB', 'CADRI', 'Cartão CNPJ', 'Contrato',
            'CTF IBAMA', 'LO'
        ]
    }
};

let licencasData = {}; // { 'america-rental': [...licencas], ... }
let licencasActiveTab = 'america-rental';

// ── Inicializar módulo ───────────────────────────────────────
window.initLicencas = async function() {
    renderLicencasTabs();
    await loadLicencas();
    renderLicencasContent();
};

// ── Renderizar abas de empresa ───────────────────────────────
function renderLicencasTabs() {
    const tabsEl = document.getElementById('licencas-tabs');
    if (!tabsEl) return;
    tabsEl.innerHTML = Object.entries(LICENCAS_CONFIG).map(([key, cfg]) => `
        <button class="licenca-tab-btn ${key === licencasActiveTab ? 'active' : ''}"
                onclick="switchLicencaTab('${key}')"
                style="--tab-color:${cfg.color}; ${key === licencasActiveTab ? `border-bottom:3px solid ${cfg.color}; color:${cfg.color};` : ''}">
            <i class="ph ${cfg.icon}"></i> ${cfg.label}
        </button>
    `).join('');
}

// ── Carregar licenças do backend ─────────────────────────────
async function loadLicencas() {
    try {
        const token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token');
        const res = await fetch('/api/licencas', { headers: { 'Authorization': `Bearer ${token}` } });
        if (!res.ok) throw new Error(`Erro ${res.status}`);
        const all = await res.json();
        // Agrupar por empresa
        licencasData = {};
        Object.keys(LICENCAS_CONFIG).forEach(k => licencasData[k] = []);
        (all || []).forEach(l => {
            if (licencasData[l.empresa]) licencasData[l.empresa].push(l);
        });
    } catch(e) {
        console.error('[Licenças] Erro ao carregar:', e);
        Object.keys(LICENCAS_CONFIG).forEach(k => licencasData[k] = []);
    }
}

// ── Trocar aba ───────────────────────────────────────────────
window.switchLicencaTab = function(key) {
    licencasActiveTab = key;
    renderLicencasTabs();
    renderLicencasContent();
};

// ── Renderizar conteúdo da aba ativa ────────────────────────
function renderLicencasContent() {
    const container = document.getElementById('licencas-content');
    if (!container) return;

    const cfg = LICENCAS_CONFIG[licencasActiveTab];
    const docs = licencasData[licencasActiveTab] || [];
    const hoje = new Date(); hoje.setHours(0,0,0,0);

    // Status helper
    const getStatus = (validade) => {
        if (!validade) return { label: 'Sem data', color: '#94a3b8', bg: '#f1f5f9', icon: 'ph-minus' };
        const d = new Date(validade + 'T12:00:00');
        const diff = Math.ceil((d - hoje) / 86400000);
        if (diff < 0)  return { label: 'Vencida',          color: '#dc2626', bg: '#fee2e2', icon: 'ph-x-circle',       diff };
        if (diff <= 30) return { label: `Vence em ${diff}d`, color: '#d97706', bg: '#fef3c7', icon: 'ph-warning-circle',  diff };
        if (diff <= 90) return { label: `Vence em ${diff}d`, color: '#0891b2', bg: '#e0f7fa', icon: 'ph-clock',          diff };
        return { label: 'Regular',            color: '#16a34a', bg: '#dcfce7', icon: 'ph-check-circle',   diff };
    };

    const formatDate = (iso) => {
        if (!iso) return '—';
        const [y, m, d] = iso.split('-');
        return `${d}/${m}/${y}`;
    };

    // Construir cards de documentos fixos
    const cards = cfg.docs.map(nome => {
        const licenca = docs.find(d => d.nome === nome);
        const status = getStatus(licenca ? licenca.validade : null);
        const vencFormatted = licenca ? formatDate(licenca.validade) : null;
        const idSafe = `lic-${licencasActiveTab}-${nome.replace(/[^a-zA-Z0-9]/g,'_')}`;

        return `
        <div class="licenca-card ${licenca ? '' : 'licenca-card-empty'}" id="card-${idSafe}"
             style="border:1.5px solid ${licenca ? status.color + '44' : '#e2e8f0'}; background:${licenca ? status.bg : '#fafafa'};">
            <!-- Status strip -->
            <div class="licenca-status-strip" style="background:${status.color};"></div>

            <div class="licenca-card-body">
                <!-- Ícone + Nome -->
                <div class="licenca-card-header">
                    <div class="licenca-doc-icon" style="background:${cfg.bg}; color:${cfg.color}; border:1.5px solid ${cfg.border};">
                        <i class="ph ph-file-pdf"></i>
                    </div>
                    <div style="flex:1; min-width:0;">
                        <div class="licenca-doc-nome">${nome}</div>
                        <div class="licenca-empresa-badge" style="background:${cfg.bg}; color:${cfg.color}; border:1px solid ${cfg.border};">
                            ${cfg.label}
                        </div>
                    </div>
                    <!-- Badge status -->
                    <div class="licenca-status-badge" style="background:${status.bg}; color:${status.color}; border:1px solid ${status.color}33;">
                        <i class="ph ${status.icon}"></i> ${status.label}
                    </div>
                </div>

                <!-- Validade -->
                ${licenca ? `
                <div class="licenca-validade-row">
                    <i class="ph ph-calendar-blank" style="color:${status.color};"></i>
                    <span>Validade: <strong>${vencFormatted}</strong></span>
                    ${licenca.updated_at ? `<span class="licenca-upload-date">• Atualizado: ${formatDate(licenca.updated_at.substring(0,10))}</span>` : ''}
                </div>` : `
                <div class="licenca-validade-row" style="color:#94a3b8;">
                    <i class="ph ph-upload-simple"></i>
                    <span>Nenhum documento cadastrado</span>
                </div>`}

                <!-- Ações -->
                <div class="licenca-card-actions">
                    ${licenca ? `
                        <button class="licenca-btn licenca-btn-view" onclick="viewLicenca(${licenca.id})" title="Visualizar PDF">
                            <i class="ph ph-eye"></i> Ver PDF
                        </button>
                        <button class="licenca-btn licenca-btn-edit" onclick="editLicencaModal('${licencasActiveTab}', '${nome.replace(/'/g,"\\'")}', ${licenca.id}, '${licenca.validade || ''}')">
                            <i class="ph ph-pencil"></i> Atualizar
                        </button>
                        <button class="licenca-btn licenca-btn-del" onclick="deleteLicenca(${licenca.id}, '${nome.replace(/'/g,"\\'")}', this)" title="Excluir">
                            <i class="ph ph-trash"></i>
                        </button>
                    ` : `
                        <label class="licenca-btn licenca-btn-upload" style="cursor:pointer;">
                            <i class="ph ph-upload-simple"></i> Anexar PDF
                            <input type="file" accept=".pdf" style="display:none;"
                                onchange="uploadLicenca(this, '${licencasActiveTab}', '${nome.replace(/'/g,"\\'")}')">
                        </label>
                    `}
                </div>
            </div>
        </div>`;
    }).join('');

    // Resumo de alertas
    const vencidas  = docs.filter(d => d.validade && new Date(d.validade + 'T12:00:00') < hoje).length;
    const proximas  = docs.filter(d => {
        if (!d.validade) return false;
        const diff = Math.ceil((new Date(d.validade + 'T12:00:00') - hoje) / 86400000);
        return diff >= 0 && diff <= 30;
    }).length;
    const semDoc    = cfg.docs.filter(n => !docs.find(d => d.nome === n)).length;

    container.innerHTML = `
        <!-- Alertas resumo -->
        ${(vencidas || proximas || semDoc) ? `
        <div class="licencas-alert-bar">
            ${vencidas  ? `<div class="licencas-alert-chip" style="background:#fee2e2; color:#dc2626; border:1px solid #fca5a5;"><i class="ph ph-x-circle"></i> ${vencidas} vencida${vencidas > 1 ? 's' : ''}</div>` : ''}
            ${proximas  ? `<div class="licencas-alert-chip" style="background:#fef3c7; color:#d97706; border:1px solid #fcd34d;"><i class="ph ph-warning-circle"></i> ${proximas} vence${proximas > 1 ? 'm' : ''} em 30 dias</div>` : ''}
            ${semDoc    ? `<div class="licencas-alert-chip" style="background:#f1f5f9; color:#64748b; border:1px solid #cbd5e1;"><i class="ph ph-file-dashed"></i> ${semDoc} sem documento</div>` : ''}
        </div>` : `
        <div class="licencas-alert-bar">
            <div class="licencas-alert-chip" style="background:#dcfce7; color:#16a34a; border:1px solid #86efac;"><i class="ph ph-check-circle"></i> Todas as licenças em dia</div>
        </div>`}

        <!-- Grid de cards -->
        <div class="licencas-grid">
            ${cards}
        </div>
    `;
}

// ── Upload de licença ────────────────────────────────────────
window.uploadLicenca = async function(input, empresa, nome) {
    const file = input.files[0];
    if (!file) return;
    input.value = '';

    // Prompt para validade
    const venc = await promptValidade(nome);
    if (venc === null) return; // cancelado

    const token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token');
    const formData = new FormData();
    formData.append('file', file);
    formData.append('empresa', empresa);
    formData.append('nome', nome);
    formData.append('validade', venc);

    try {
        const btn = input.closest('label');
        if (btn) { btn.style.opacity = '0.5'; btn.style.pointerEvents = 'none'; }

        const res = await fetch('/api/licencas', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro ao fazer upload');

        if (typeof showToast !== 'undefined') showToast(`${nome} anexado com sucesso!`, 'success');
        await loadLicencas();
        renderLicencasContent();
    } catch(e) {
        alert('Erro: ' + e.message);
    }
};

// ── Modal atualizar licença ──────────────────────────────────
window.editLicencaModal = async function(empresa, nome, id, valAtual) {
    const venc = await promptValidade(nome, valAtual);
    if (venc === null) return;

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf';

    // Atualiza só a validade se não selecionar arquivo
    const patchValidade = async () => {
        const token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token');
        const res = await fetch(`/api/licencas/${id}`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ validade: venc })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro ao atualizar');
        if (typeof showToast !== 'undefined') showToast('Validade atualizada!', 'success');
        await loadLicencas();
        renderLicencasContent();
    };

    input.onchange = async function() {
        if (!this.files[0]) { await patchValidade(); return; }
        const token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token');
        const formData = new FormData();
        formData.append('file', this.files[0]);
        formData.append('empresa', empresa);
        formData.append('nome', nome);
        formData.append('validade', venc);
        formData.append('_method', 'PUT');
        try {
            const res = await fetch(`/api/licencas/${id}`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Erro ao atualizar');
            if (typeof showToast !== 'undefined') showToast(`${nome} atualizado!`, 'success');
            await loadLicencas();
            renderLicencasContent();
        } catch(e) { alert('Erro: ' + e.message); }
    };

    // Perguntar se quer trocar o arquivo também
    if (confirm('Deseja também substituir o arquivo PDF?')) {
        input.click();
    } else {
        await patchValidade();
    }
};

// ── Visualizar PDF ───────────────────────────────────────────
window.viewLicenca = function(id) {
    const token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token');
    const url = `/api/licencas/${id}/view?token=${encodeURIComponent(token)}`;
    window.open(url, '_blank');
};

// ── Deletar licença ──────────────────────────────────────────
window.deleteLicenca = async function(id, nome, btn) {
    if (!confirm(`Excluir "${nome}"? Esta ação não pode ser desfeita.`)) return;
    const token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token');
    try {
        btn.disabled = true;
        const res = await fetch(`/api/licencas/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error((await res.json()).error || 'Erro');
        if (typeof showToast !== 'undefined') showToast(`${nome} excluído.`, 'info');
        await loadLicencas();
        renderLicencasContent();
    } catch(e) { alert('Erro: ' + e.message); btn.disabled = false; }
};

// ── Prompt de validade (modal nativo ou SweetAlert) ──────────
async function promptValidade(nome, valAtual) {
    if (window.Swal) {
        const result = await Swal.fire({
            title: `Validade — ${nome}`,
            html: `
                <p style="color:#475569; font-size:0.9rem; margin-bottom:1rem;">
                    Informe a data de validade indicada no documento.<br>
                    <small style="color:#94a3b8;">Deixe em branco se o documento não tiver validade.</small>
                </p>
                <input id="swal-validade" type="date" class="swal2-input"
                    value="${valAtual || ''}"
                    style="font-size:1rem; padding:0.5rem;">
            `,
            showCancelButton: true,
            confirmButtonText: 'Confirmar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#d9480f',
            preConfirm: () => document.getElementById('swal-validade').value || ''
        });
        if (result.isDismissed) return null;
        return result.value;
    }
    // Fallback simples
    const val = prompt(`Data de validade de "${nome}" (AAAA-MM-DD, ou vazio):`, valAtual || '');
    return val; // null se cancelado
}
