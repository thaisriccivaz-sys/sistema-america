
function formatUTCDate(dateStr) {
    if (!dateStr) return 'Data não registrada';
    const isoStr = dateStr.includes('T') ? dateStr : dateStr.replace(' ', 'T');
    const finalStr = isoStr.endsWith('Z') ? isoStr : isoStr + 'Z';
    return new Date(finalStr).toLocaleString('pt-BR');
}

window._switchLicencaTabCred = function(empresa) {
    document.querySelectorAll('.cred-lic-tab-btn').forEach(btn => {
        if (btn.getAttribute('data-emp') === empresa) {
            btn.style.border = '1.5px solid #7048e8';
            btn.style.background = '#7048e8';
            btn.style.color = '#fff';
            btn.style.fontWeight = '700';
        } else {
            btn.style.border = '1.5px solid #e2e8f0';
            btn.style.background = '#f1f5f9';
            btn.style.color = '#475569';
            btn.style.fontWeight = '400';
        }
    });

    document.querySelectorAll('.cred-lic-panel').forEach(panel => {
        if (panel.getAttribute('data-emp') === empresa) {
            panel.style.display = 'grid';
        } else {
            panel.style.display = 'none';
        }
    });
};

window._updateLicencasTabCountsCred = function() {
    document.querySelectorAll('.cred-lic-tab-btn').forEach(btn => {
        const emp = btn.getAttribute('data-emp');
        const panel = document.querySelector(`.cred-lic-panel[data-emp="${emp}"]`);
        if (panel) {
            const count = panel.querySelectorAll('input[type="checkbox"]:checked').length;
            const span = btn.querySelector('.tab-count');
            if (span) span.textContent = `(${count})`;
        }
    });
};

async function _carregarLicencasAgrupadasLogistica(licsSelecionadas = []) {
    const container = document.getElementById('cred-licencas-empresas');
    if (!container) return;
    container.innerHTML = '<p style="color:#94a3b8; font-size:13px;">Carregando licenças...</p>';
    try {
        const token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token');
        const res = await fetch('/api/licencas', { headers: { 'Authorization': `Bearer ${token}` } });
        const data = await res.json();
        const todas = Array.isArray(data) ? data : [];
        
        credenciamentoState.licencas = todas; // For validation fallback
        const EMPRESAS_LICENCAS = ['América Rental', 'Attend Ambiental', 'BRK'];

        const grupos = {};
        EMPRESAS_LICENCAS.forEach(e => grupos[e] = []);
        todas.forEach(l => {
            let emp = (l.empresa || 'Outras').trim();
            const empStr = emp.toLowerCase().replace(/[^a-z0-9]/g, '');
            if (empStr === 'americarental') emp = 'América Rental';
            else if (empStr === 'attendambiental') emp = 'Attend Ambiental';
            else if (empStr === 'brk') emp = 'BRK';

            if (!grupos[emp]) grupos[emp] = [];
            grupos[emp].push(l);
        });

        const extras = Object.keys(grupos).filter(e => !EMPRESAS_LICENCAS.includes(e));
        const todasEmpresas = [...EMPRESAS_LICENCAS, ...extras];
        const primeiraEmp = todasEmpresas[0];

        const tabsHtml = todasEmpresas.map(emp => {
            const ativo = emp === primeiraEmp;
            return `<button type="button" class="cred-lic-tab-btn" data-emp="${emp}" onclick="window._switchLicencaTabCred('${emp}')"
                style="padding:6px 14px; border-radius:6px; border:1.5px solid ${ativo ? '#7048e8' : '#e2e8f0'};
                background:${ativo ? '#7048e8' : '#f1f5f9'}; color:${ativo ? '#fff' : '#475569'};
                font-weight:${ativo ? '700' : '400'}; font-size:13px; cursor:pointer; white-space:nowrap;">
                <i class="ph ph-buildings"></i> ${emp}
                <span class="tab-count" style="font-size:11px; opacity:0.75;">(0)</span>
            </button>`;
        }).join('');

        const panelsHtml = todasEmpresas.map(emp => {
            const lics = grupos[emp];
            const isAtivo = emp === primeiraEmp;
            const items = lics.length === 0
                ? `<p style="color:#94a3b8; font-size:12px; font-style:italic; grid-column:1/-1; margin:4px 0;">Nenhuma licença cadastrada para esta empresa.</p>`
                : lics.map(l => {
                    const isChecked = licsSelecionadas.some(s => {
                        const sid = typeof s === 'object' ? s.id : s;
                        return String(sid) === String(l.id);
                    });
                    const checked = isChecked ? 'checked' : '';
                    
                    const hj = new Date(); hj.setHours(0,0,0,0);
                    const isVencida = l.validade && new Date(l.validade + 'T12:00:00') < hj;
                    const vencStyle = isVencida ? 'color:#dc2626;font-weight:bold;' : 'color:#94a3b8;';
                    const vencIcon = isVencida ? '⚠ Vencida' : (l.validade ? l.validade.split('-').reverse().join('/') : 'Sem vencimento');

                    return `<label style="display:flex; align-items:center; gap:6px; font-size:13px; cursor:pointer; padding:4px 0;">
                        <input type="checkbox" name="cred_licencas" value="${l.id}" data-nome="${l.nome}" data-empresa="${emp}" data-validade="${l.validade || ''}" ${checked} onchange="window._updateLicencasTabCountsCred()">
                        ${l.nome} <span style="font-size:11px; ${vencStyle}">(${vencIcon})</span>
                    </label>`;
                }).join('');

            return `<div class="cred-lic-panel" data-emp="${emp}"
                style="display:${isAtivo ? 'grid' : 'none'}; grid-template-columns:repeat(auto-fill,minmax(200px,1fr)); gap:4px 16px;
                background:#f8fafc; border:1px solid #e2e8f0; border-radius:0 6px 6px 6px; padding:12px; margin-top:0;">
                ${items}
            </div>`;
        }).join('');

        container.innerHTML = `
            <div style="display:flex; gap:4px; flex-wrap:wrap; margin-bottom:-1px; position:relative; z-index:2;">
                ${tabsHtml}
            </div>
            ${panelsHtml}
        `;
        window._updateLicencasTabCountsCred();
    } catch(e) {
        container.innerHTML = `<p style="color:#ef4444; font-size:13px;">Erro ao carregar licenças.</p>`;
    }
}


window.renderAvatar = function(nome, foto, b64) {
    const initial = (nome || 'U')[0].toUpperCase();
    if (b64) return `<img src="${b64}" style="width:36px; height:36px; border-radius:50%; object-fit:cover;">`;
    if (foto) return `<img src="/${foto}" style="width:36px; height:36px; border-radius:50%; object-fit:cover;" onerror="this.outerHTML='<div style=\'width:36px; height:36px; border-radius:50%; background:#e2e8f0; display:flex; align-items:center; justify-content:center; font-weight:bold; color:#64748b; font-size:16px;\'>${initial}</div>'">`;
    return `<div style="width:36px; height:36px; border-radius:50%; background:#e2e8f0; display:flex; align-items:center; justify-content:center; font-weight:bold; color:#64748b; font-size:16px;">${initial}</div>`;
};

// Módulo de Credenciamento - Logística

let credenciamentoState = {
    colaboradores: [],
    veiculos: [],
    licencas: [],
    selecionadosColabs: [],
    selecionadosVeic: [],
    selecionadosLicencas: []
};

// ── Carregar colaboradores via API ───────────────────────────────────────────
async function loadColaboradoresCred() {
    const list = document.getElementById('lista-selecao-colab');
    if (list) list.innerHTML = '<p style="text-align:center; color:#64748b; padding:20px;">Carregando...</p>';
    try {
        const token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token');
        if (!token) throw new Error('Sem token de autenticação.');
        const res = await fetch('/api/colaboradores', { headers: { 'Authorization': `Bearer ${token}` } });
        if (!res.ok) throw new Error(`Erro ${res.status}`);
        const data = await res.json();
        credenciamentoState.colaboradores = (data || []).filter(c => {
            const s = (c.status || '').toLowerCase();
            return s === 'ativo' || s === 'férias' || s === 'ferias' || s === 'afastado';
        });
        renderListaColabsCred();
    } catch (e) {
        console.error('[Credenciamento] Erro ao carregar colaboradores:', e);
        if (list) list.innerHTML = `<p style="color:#ef4444; padding:10px;">Erro ao carregar: ${e.message}</p>`;
    }
}

// ── Carregar veículos via API ────────────────────────────────────────────────
async function loadVeiculosCred() {
    const list = document.getElementById('lista-selecao-veic');
    if (list) list.innerHTML = '<p style="text-align:center; color:#64748b; padding:20px;">Carregando...</p>';
    try {
        const token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token');
        if (!token) throw new Error('Sem token de autenticação.');
        const res = await fetch('/api/frota/veiculos', { headers: { 'Authorization': `Bearer ${token}` } });
        if (!res.ok) throw new Error(`Erro ${res.status}`);
        credenciamentoState.veiculos = await res.json() || [];
        renderListaVeicCred();
    } catch (e) {
        console.error('[Credenciamento] Erro ao carregar veículos:', e);
        if (list) list.innerHTML = `<p style="color:#ef4444; padding:10px;">Erro ao carregar: ${e.message}</p>`;
    }
}

// ── Carregar licenças via API ─────────────────────────────────────────────────
async function loadLicencasCred() {
    try {
        const token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token');
        const res = await fetch('/api/licencas', { headers: { 'Authorization': `Bearer ${token}` } });
        if (!res.ok) throw new Error(`Erro ${res.status}`);
        credenciamentoState.licencas = await res.json() || [];
    } catch (e) {
        console.error('[Credenciamento] Erro ao carregar licenças:', e);
        credenciamentoState.licencas = [];
    }
    renderLicencasCred();
}

// ── Renderizar quadro de licenças ────────────────────────────────────────────
function renderLicencasCred() {
    const container = document.getElementById('cred-licencas-quadro');
    if (!container) return;
    const hoje = new Date(); hoje.setHours(0,0,0,0);
    const licencas = credenciamentoState.licencas;

    if (licencas.length === 0) {
        container.innerHTML = '<p style="color:#94a3b8; font-size:13px; font-style:italic; padding:10px;">Nenhuma licença cadastrada no sistema.</p>';
        return;
    }

    container.innerHTML = licencas.map(lic => {
        const vencida = lic.validade && new Date(lic.validade + 'T12:00:00') < hoje;
        const checked = credenciamentoState.selecionadosLicencas.includes(String(lic.id));
        const dataFormatada = lic.validade ? lic.validade.split('-').reverse().join('/') : '—';
        const statusColor = vencida ? '#dc2626' : lic.validade ? '#16a34a' : '#94a3b8';
        const statusBg = vencida ? '#fee2e2' : lic.validade ? '#dcfce7' : '#f1f5f9';
        const statusLabel = vencida ? '⚠ Vencida' : lic.validade ? `Válida até ${dataFormatada}` : 'Sem vencimento';
        return `
        <div class="cred-item-select" style="display:flex; align-items:center; gap:10px; padding:8px; border-bottom:1px solid #eee;">
            <input type="checkbox" id="cred-lic-${lic.id}" value="${lic.id}"
                ${checked ? 'checked' : ''}
                onchange="toggleLicencaCred('${lic.id}', this.checked)">
            <label for="cred-lic-${lic.id}" style="cursor:pointer; margin:0; flex:1; display:flex; align-items:center; gap:8px;">
                <span style="font-weight:500; color:#334155;">${lic.nome}</span>
                <span style="font-size:0.7rem; color:#64748b;">${lic.empresa}</span>
                ${vencida ? '<i class="ph ph-warning-circle" style="color:#dc2626;" title="Licença vencida!"></i>' : ''}
            </label>
            <span style="font-size:0.72rem; font-weight:700; padding:2px 8px; border-radius:10px; background:${statusBg}; color:${statusColor}; white-space:nowrap;">${statusLabel}</span>
        </div>`;
    }).join('');
}

// ── Toggle licença selecionada ────────────────────────────────────────────────
window.toggleLicencaCred = function(id, checked) {
    const idStr = String(id);
    if (checked) {
        if (!credenciamentoState.selecionadosLicencas.includes(idStr))
            credenciamentoState.selecionadosLicencas.push(idStr);
    } else {
        credenciamentoState.selecionadosLicencas = credenciamentoState.selecionadosLicencas.filter(x => x !== idStr);
    }
    atualizarResumoLicencas();
};

// ── Resumo de licenças selecionadas ──────────────────────────────────────────
function atualizarResumoLicencas() {
    const list = document.getElementById('cred-licencas-list');
    if (!list) return;
    const selecionadas = credenciamentoState.selecionadosLicencas
        .map(id => credenciamentoState.licencas.find(l => String(l.id) === id))
        .filter(Boolean);

    if (selecionadas.length === 0) {
        list.innerHTML = '<p style="color:#94a3b8; font-size:13px; font-style:italic;">Nenhuma licença selecionada.</p>';
        return;
    }

    const hoje = new Date(); hoje.setHours(0,0,0,0);
    list.innerHTML = selecionadas.map(lic => {
        const vencida = lic.validade && new Date(lic.validade + 'T12:00:00') < hoje;
        return `
        <div style="display:flex; justify-content:space-between; align-items:center; background:${vencida ? '#fee2e2' : '#f1f5f9'}; padding:6px 10px; border-radius:4px; border:1px solid ${vencida ? '#fca5a5' : '#e2e8f0'};">
            <span style="font-size:14px; font-weight:500; color:#334155;">
                ${vencida ? '<i class="ph ph-warning-circle" style="color:#dc2626;"></i> ' : ''}${lic.nome}
                <small style="color:#64748b; font-weight:400;"> — ${lic.empresa}</small>
            </span>
            <i class="ph ph-trash" style="color:#ef4444; cursor:pointer;" onclick="removerCredLicenca('${lic.id}')" title="Remover"></i>
        </div>`;
    }).join('');
}

window.removerCredLicenca = function(id) {
    credenciamentoState.selecionadosLicencas = credenciamentoState.selecionadosLicencas.filter(x => x !== String(id));
    const cb = document.getElementById(`cred-lic-${id}`);
    if (cb) cb.checked = false;
    atualizarResumoLicencas();
};

// ── Abrir modal de licenças ───────────────────────────────────────────────────
window.abrirModalAddCredLicenca = function() {
    const modal = document.getElementById('modal-cred-licenca');
    if (modal) modal.style.display = 'flex';
    loadLicencasCred();
};
window.fecharModalAddCredLicenca = function() {
    const modal = document.getElementById('modal-cred-licenca');
    if (modal) modal.style.display = 'none';
};
window.confirmarSelecaoCredLicenca = function() {
    atualizarResumoLicencas();
    fecharModalAddCredLicenca();
};

// ── Renderizar lista de colaboradores no modal ────────────────────────────────
function renderListaColabsCred() {
    const list = document.getElementById('lista-selecao-colab');
    if (!list) return;
    if (credenciamentoState.colaboradores.length === 0) {
        list.innerHTML = '<p style="color:#94a3b8; font-size:13px; font-style:italic; padding:10px;">Nenhum colaborador ativo encontrado.</p>';
        return;
    }
    list.innerHTML = credenciamentoState.colaboradores.map(c => {
        const s = (c.status || 'Ativo');
        const statusColor = s.toLowerCase() === 'ativo' ? '#16a34a' : s.toLowerCase() === 'afastado' ? '#dc2626' : '#d97706';
        const statusBg = s.toLowerCase() === 'ativo' ? '#dcfce7' : s.toLowerCase() === 'afastado' ? '#fee2e2' : '#fef3c7';
        return `
        <div class="cred-item-select" style="display:flex; align-items:center; gap:10px; padding:8px; border-bottom:1px solid #eee;">
            <input type="checkbox" id="cred-colab-${c.id}" value="${c.id}" ${credenciamentoState.selecionadosColabs.includes(String(c.id)) ? 'checked' : ''} onchange="window.verificarLimiteColabCred()">
            <label for="cred-colab-${c.id}" style="cursor:pointer; margin:0; flex:1; display:flex; align-items:center; gap:8px;">
                ${c.nome_completo}
                <span style="font-size:0.7rem; font-weight:700; padding:1px 7px; border-radius:10px; background:${statusBg}; color:${statusColor}; white-space:nowrap;">${s}</span>
            </label>
        </div>`;
    }).join('');
}

// ── Renderizar lista de veículos no modal ────────────────────────────────────
function renderListaVeicCred() {
    const list = document.getElementById('lista-selecao-veic');
    if (!list) return;
    if (credenciamentoState.veiculos.length === 0) {
        list.innerHTML = '<p style="color:#94a3b8; font-size:13px; font-style:italic; padding:10px;">Nenhum veículo cadastrado na frota.</p>';
        return;
    }
    list.innerHTML = credenciamentoState.veiculos.map(v => `
        <div class="cred-item-select" style="display:flex; align-items:center; gap:10px; padding:8px; border-bottom:1px solid #eee;">
            <input type="checkbox" id="cred-veic-${v.id}" value="${v.id}" ${credenciamentoState.selecionadosVeic.includes(String(v.id)) ? 'checked' : ''} onchange="window.verificarLimiteVeicCred()">
            <label for="cred-veic-${v.id}" style="cursor:pointer; margin:0; flex:1;">
                <b>${v.placa}</b> — ${v.marca_modelo_versao || 'Sem modelo'}
            </label>
        </div>`).join('');
}


window.verificarLimiteColabCred = function() {
    const limitNum = window._credLimites ? parseInt(window._credLimites.colabs) || 0 : 0;
    const checkboxes = document.querySelectorAll('#lista-selecao-colab input[type="checkbox"]:checked');
    let count = checkboxes.length;
    
    const spanModal = document.getElementById('cred-modal-limit-colabs-span');
    if (spanModal) {
        spanModal.textContent = `(${count}/${limitNum > 0 ? limitNum : 'Todos'})`;
        if (limitNum > 0 && count > limitNum) {
            spanModal.style.color = '#ef4444';
            spanModal.style.fontWeight = 'bold';
        } else {
            spanModal.style.color = '#64748b';
            spanModal.style.fontWeight = 'normal';
        }
    }
};

window.verificarLimiteVeicCred = function() {
    const limitNum = window._credLimites ? parseInt(window._credLimites.veics) || 0 : 0;
    const checkboxes = document.querySelectorAll('#lista-selecao-veic input[type="checkbox"]:checked');
    let count = checkboxes.length;
    
    const spanModal = document.getElementById('cred-modal-limit-veics-span');
    if (spanModal) {
        spanModal.textContent = `(${count}/${limitNum > 0 ? limitNum : 'Todos'})`;
        if (limitNum > 0 && count > limitNum) {
            spanModal.style.color = '#ef4444';
            spanModal.style.fontWeight = 'bold';
        } else {
            spanModal.style.color = '#64748b';
            spanModal.style.fontWeight = 'normal';
        }
    }
};

// ── Selecionar Todos ──────────────────────────────────────────────────────────
window.selecionarTodosColabs = function() {
    const checkboxes = document.querySelectorAll('#lista-selecao-colab input[type="checkbox"]');
    const todosChecked = Array.from(checkboxes).every(cb => cb.checked);
    checkboxes.forEach(cb => cb.checked = !todosChecked);
    
    if (typeof window.verificarLimiteColabCred === 'function') window.verificarLimiteColabCred();
    
    const btn = document.getElementById('btn-todos-colabs');
    if (btn) btn.textContent = todosChecked ? 'Selecionar Todos' : 'Desmarcar Todos';
}
window.selecionarTodosVeiculos = function() {
    const checkboxes = document.querySelectorAll('#lista-selecao-veic input[type="checkbox"]');
    const todosChecked = Array.from(checkboxes).every(cb => cb.checked);
    checkboxes.forEach(cb => cb.checked = !todosChecked);
    
    if (typeof window.verificarLimiteVeicCred === 'function') window.verificarLimiteVeicCred();
    
    const btn = document.getElementById('btn-todos-veics');
    if (btn) btn.textContent = todosChecked ? 'Selecionar Todos' : 'Desmarcar Todos';
}


window.selecionarTodasLicencas = function() {
    const checkboxes = document.querySelectorAll('#cred-licencas-quadro input[type="checkbox"]');
    const todosChecked = Array.from(checkboxes).every(cb => cb.checked);
    checkboxes.forEach(cb => { 
        cb.checked = !todosChecked; 
        window.toggleLicencaCred(cb.value, cb.checked); 
    });
    const btn = document.getElementById('btn-todas-licencas');
    if (btn) btn.textContent = todosChecked ? 'Selecionar Todas' : 'Desmarcar Todas';
}
// ── Filtro de busca nos modais ────────────────────────────────────────────────
window.filtrarListaCred = function(containerId, termo) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const divs = container.querySelectorAll('.cred-item-select');
    const t = termo.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    divs.forEach(div => {
        const label = div.querySelector('label');
        if (!label) return;
        const text = label.textContent.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        div.style.display = text.includes(t) ? 'flex' : 'none';
    });
}

// ── Abrir / Fechar modais ─────────────────────────────────────────────────────
window.abrirModalAddCredColab = function() {
    setTimeout(() => {
        if (typeof window.verificarLimiteColabCred === 'function') window.verificarLimiteColabCred();
    }, 100);
    const modal = document.getElementById('modal-cred-colab');
    if (modal) modal.style.display = 'flex';
    loadColaboradoresCred();
    const busca = document.getElementById('busca-cred-colab');
    if (busca) busca.value = '';
}
window.fecharModalAddCredColab = function() {
    const modal = document.getElementById('modal-cred-colab');
    if (modal) modal.style.display = 'none';
}
window.abrirModalAddCredVeic = function() {
    setTimeout(() => {
        if (typeof window.verificarLimiteVeicCred === 'function') window.verificarLimiteVeicCred();
    }, 100);
    const modal = document.getElementById('modal-cred-veic');
    if (modal) modal.style.display = 'flex';
    loadVeiculosCred();
    const busca = document.getElementById('busca-cred-veic');
    if (busca) busca.value = '';
}
window.fecharModalAddCredVeic = function() {
    const modal = document.getElementById('modal-cred-veic');
    if (modal) modal.style.display = 'none';
}

// ── Confirmar seleção ─────────────────────────────────────────────────────────
window.confirmarSelecaoCredColab = function() {
    const checkboxes = document.querySelectorAll('#lista-selecao-colab input[type="checkbox"]');
    credenciamentoState.selecionadosColabs = Array.from(checkboxes).filter(cb => cb.checked).map(cb => cb.value);
    atualizarResumoColabs();
    fecharModalAddCredColab();
}
window.confirmarSelecaoCredVeic = function() {
    const checkboxes = document.querySelectorAll('#lista-selecao-veic input[type="checkbox"]');
    credenciamentoState.selecionadosVeic = Array.from(checkboxes).filter(cb => cb.checked).map(cb => cb.value);
    atualizarResumoVeiculos();
    fecharModalAddCredVeic();
}

// ── Remover item da seleção ───────────────────────────────────────────────────
function removerCredColab(idStr) {
    credenciamentoState.selecionadosColabs = credenciamentoState.selecionadosColabs.filter(id => id !== idStr);
    atualizarResumoColabs();
}
function removerCredVeic(idStr) {
    credenciamentoState.selecionadosVeic = credenciamentoState.selecionadosVeic.filter(id => id !== idStr);
    atualizarResumoVeiculos();
}

// ── Resumo de colaboradores selecionados ──────────────────────────────────────
function atualizarResumoColabs() {
    const list = document.getElementById('cred-colabs-list');
    if (!list) return;
    if (credenciamentoState.selecionadosColabs.length === 0) {
        list.innerHTML = '<p style="color:#94a3b8; font-size:13px; font-style:italic;">Nenhum colaborador selecionado.</p>';
        return;
    }
    list.innerHTML = credenciamentoState.selecionadosColabs.map(idStr => {
        const c = credenciamentoState.colaboradores.find(col => String(col.id) === idStr);
        if (!c) return '';
        return `<div style="display:flex; justify-content:space-between; align-items:center; background:#f1f5f9; padding:6px 10px; border-radius:4px; border:1px solid #e2e8f0;">
            <span style="font-size:14px; font-weight:500; color:#334155;">${c.nome_completo}</span>
            <i class="ph ph-trash" style="color:#ef4444; cursor:pointer;" onclick="removerCredColab('${idStr}')" title="Remover"></i>
        </div>`;
    }).join('');
}

// ── Resumo de veículos selecionados ───────────────────────────────────────────
function atualizarResumoVeiculos() {
    const list = document.getElementById('cred-veiculos-list');
    if (!list) return;
    if (credenciamentoState.selecionadosVeic.length === 0) {
        list.innerHTML = '<p style="color:#94a3b8; font-size:13px; font-style:italic;">Nenhum veículo selecionado.</p>';
        return;
    }
    list.innerHTML = credenciamentoState.selecionadosVeic.map(idStr => {
        const v = credenciamentoState.veiculos.find(ve => String(ve.id) === idStr);
        if (!v) return '';
        return `<div style="display:flex; justify-content:space-between; align-items:center; background:#f1f5f9; padding:6px 10px; border-radius:4px; border:1px solid #e2e8f0;">
            <span style="font-size:14px; font-weight:500; color:#334155;"><b>${v.placa}</b> — ${v.marca_modelo_versao || ''}</span>
            <i class="ph ph-trash" style="color:#ef4444; cursor:pointer;" onclick="removerCredVeic('${idStr}')" title="Remover"></i>
        </div>`;
    }).join('');
}

// ── Validação de vencimentos antes de enviar ──────────────────────────────────
async function validarVencimentosCredenciamento() {
    const hoje = new Date(); hoje.setHours(0,0,0,0);
    const erros = [];
    
    let requiredValues = [];
    const containerDocs = document.getElementById('cred-docs-exigidos') || document.getElementById('comerc-docs-exigidos');
    if (containerDocs) {
        requiredValues = Array.from(containerDocs.querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.value);
    } else {
        if (window._credSolicitacaoId && window._historicoCredDados) {
            const dados = window._historicoCredDados.find(c => String(c.id) === String(window._credSolicitacaoId));
            if (dados && dados.docs_exigidos) {
                try { requiredValues = JSON.parse(dados.docs_exigidos); } catch(e){}
            }
        }
    }

    const mapDocTypeToValue = (docType) => {
        const d = (docType || '').toLowerCase();
        if (d.includes('cnh') || d.includes('habilita')) return 'cnh';
        if (d.includes('cpf')) return 'cpf';
        if (d.includes('aso')) return 'aso';
        if (d.includes('ficha de registro') || d.includes('registro')) return 'ficha_registro';
        if (d.includes('vacina') || d.includes('treinamento')) return 'treinamento';
        if (d.includes('epi')) return 'epi';
        if (d.includes('contrato') || d.includes('social')) return 'contrato_esocial';
        if (d.includes('nr1') || d.includes('ordem de serv')) return 'nr1';
        return null;
    };

    const docNamesReadable = {
        'cnh': 'CNH', 'cpf': 'CPF', 'aso': 'ASO', 'ficha_registro': 'Ficha de Registro',
        'treinamento': 'Carteira de Vacinação', 'epi': 'Ficha de EPI',
        'contrato_esocial': 'Contrato e-social', 'nr1': 'NR1 / Ordem de Serviço'
    };

    // 1. Validar licenças selecionadas
    for (const id of credenciamentoState.selecionadosLicencas) {
        const lic = credenciamentoState.licencas.find(l => String(l.id) === id);
        if (lic && lic.validade) {
            if (new Date(lic.validade + 'T12:00:00') < hoje)
                erros.push(`A licença "${lic.nome}" da empresa ${lic.empresa || 'América Rental'} está VENCIDA (${lic.validade.split('-').reverse().join('/')}).`);
        }
    }

    // 2. Validar documentos dos colaboradores selecionados
    if (credenciamentoState.selecionadosColabs.length > 0) {
        try {
            const token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token');
            for (const idStr of credenciamentoState.selecionadosColabs) {
                const c = credenciamentoState.colaboradores.find(col => String(col.id) === idStr);
                const res = await fetch(`/api/colaboradores/${idStr}/documentos`, { headers: { 'Authorization': `Bearer ${token}` } });
                if (!res.ok) continue;
                const docs = await res.json();
                
                const isMotorista = c && c.cargo && c.cargo.toUpperCase().includes('MOTORISTA');
                const nomeColab = c ? c.nome_completo : `ID ${idStr}`;

                for (const reqDoc of requiredValues) {
                    if (reqDoc === 'cnh' && !isMotorista) continue;
                    if (reqDoc === 'cpf' && isMotorista) continue;

                    const docFound = (docs || []).find(d => {
                        const val = mapDocTypeToValue(d.document_type);
                        return val === reqDoc;
                    });

                    const docName = docNamesReadable[reqDoc] || reqDoc;

                    if (!docFound) {
                        erros.push(`O documento "${docName}" do colaborador(a) ${nomeColab} é INEXISTENTE. Contacte o setor de RH para atualização.`);
                    } else if (docFound.vencimento && new Date(docFound.vencimento + 'T12:00:00') < hoje) {
                        erros.push(`O documento "${docName}" do colaborador(a) ${nomeColab} está VENCIDO (${docFound.vencimento.split('-').reverse().join('/')}). Contacte o setor de RH.`);
                    }
                }
            }
        } catch(e) { console.warn('[Credenciamento] Erro ao validar docs colaboradores:', e); }
    }

    return erros;
}

// ── Gerar e Enviar credenciamento ─────────────────────────────────────────────
window.gerarEnviarCredenciamento = async function() {
    const clienteNome = (document.getElementById('cred-cliente-nome') || {}).value?.trim();
    const clienteEmail = (document.getElementById('cred-cliente-email') || {}).value?.trim();
    const enderecoInstalacao = (document.getElementById('cred-endereco-instalacao') || {}).value?.trim() || '';

    if (!clienteNome || !clienteEmail) {
        alert('Por favor, preencha o nome e e-mail do cliente.');
        return;
    }
    if (credenciamentoState.selecionadosColabs.length === 0 && credenciamentoState.selecionadosVeic.length === 0) {
        alert('Por favor, selecione ao menos um colaborador ou veículo para credenciar.');
        return;
    }

    const btn = document.getElementById('btn-enviar-cred');
    const originalHTML = btn ? btn.innerHTML : '';
    if (btn) { btn.innerHTML = '<i class="ph ph-spinner"></i> Validando...'; btn.disabled = true; }

    // ── Validar vencimentos ───────────────────────────────────────────────────
    const erros = await validarVencimentosCredenciamento();
    if (erros.length > 0) {
        if (btn) { btn.innerHTML = originalHTML; btn.disabled = false; }
        alert('⛔ Não é possível enviar o credenciamento pois os seguintes documentos estão vencidos:\n\n' + erros.map(e => `• ${e}`).join('\n'));
        return;
    }

    if (btn) btn.innerHTML = '<i class="ph ph-spinner"></i> Enviando...';

    const osValue = (document.getElementById('cred-os') || {}).value?.trim() || '';

    const payload = {
        cliente_nome: clienteNome,
        cliente_email: clienteEmail,
        endereco_instalacao: enderecoInstalacao,
        os: osValue,
        colaboradores: credenciamentoState.selecionadosColabs.map(idStr => {
            const c = credenciamentoState.colaboradores.find(col => String(col.id) === idStr);
            return { id: parseInt(idStr), nome: c ? c.nome_completo : idStr, cpf: c ? c.cpf : '' };
        }),
        veiculos: credenciamentoState.selecionadosVeic.map(idStr => {
            const v = credenciamentoState.veiculos.find(ve => String(ve.id) === idStr);
            return { id: parseInt(idStr), placa: v ? v.placa : idStr, modelo: v ? v.marca_modelo_versao : '' };
        }),
        licencas: credenciamentoState.selecionadosLicencas.map(id => {
            const l = credenciamentoState.licencas.find(x => String(x.id) === id);
            return l ? { id: l.id, nome: l.nome, empresa: l.empresa, validade: l.validade } : null;
        }).filter(Boolean),
        docs_exigidos: Array.from(document.querySelectorAll('#cred-docs-exigidos input:checked')).map(cb => cb.value)
    };

    try {
        // Se for cumprir uma solicitação existente, usa o endpoint /enviar
        const solId = window._credSolicitacaoId;
        const url = solId ? `/api/logistica/credenciamento/${solId}/enviar` : '/api/logistica/credenciamento';
        const method = 'POST';

        const res = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token')}`
            },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro ao enviar credenciamento.');

        alert('✅ Credenciamento gerado e e-mail enviado com sucesso!');

        if (document.getElementById('cred-cliente-nome')) document.getElementById('cred-cliente-nome').value = '';
        if (document.getElementById('cred-cliente-email')) document.getElementById('cred-cliente-email').value = '';
        if (document.getElementById('cred-endereco-instalacao')) document.getElementById('cred-endereco-instalacao').value = '';
        document.querySelectorAll('#cred-docs-exigidos input').forEach(cb => cb.checked = false);
        credenciamentoState.selecionadosColabs = [];
        credenciamentoState.selecionadosVeic = [];
        credenciamentoState.selecionadosLicencas = [];
        atualizarResumoColabs();
        atualizarResumoVeiculos();
        atualizarResumoLicencas();
        
        // Atualizar histórico de credenciamentos
        carregarHistoricoCredenciamento();
        
        // Fechar o modal após o envio
        if (typeof window.fecharModalNovoCredenciamento === 'function') {
            window.fecharModalNovoCredenciamento();
        }
    } catch (e) {
        alert('Erro: ' + e.message);
    } finally {
        if (btn) { btn.innerHTML = originalHTML; btn.disabled = false; }
    }
}

// ── Modal de Novo Credenciamento ─────────────────────────────────────────────
window._credSolicitacaoId = null;
    window._credLimites = { colabs: 0, veics: 0 };
    const spanColabs = document.getElementById('cred-limit-colabs-span'); if (spanColabs) spanColabs.textContent = '(Ilimitado)';
    const spanVeics = document.getElementById('cred-limit-veics-span'); if (spanVeics) spanVeics.textContent = '(Ilimitado)';
    const spanModalColabs = document.getElementById('cred-modal-limit-colabs-span'); if (spanModalColabs) spanModalColabs.textContent = '(Ilimitado)';
    const spanModalVeics = document.getElementById('cred-modal-limit-veics-span'); if (spanModalVeics) spanModalVeics.textContent = '(Ilimitado)'; // ID da solicitação sendo cumprida (ou null para novo)

window.abrirModalNovoCredenciamento = function() {
    window._credSolicitacaoId = null;
    // Limpar campos e seleções
    const nome = document.getElementById('cred-cliente-nome'); if (nome) nome.value = '';
    const email = document.getElementById('cred-cliente-email'); if (email) email.value = '';
    const end = document.getElementById('cred-endereco-instalacao'); if (end) end.value = '';
    document.querySelectorAll('#cred-docs-exigidos input').forEach(cb => cb.checked = false);
    credenciamentoState.selecionadosColabs = [];
    credenciamentoState.selecionadosVeic = [];
    credenciamentoState.selecionadosLicencas = [];
    atualizarResumoColabs();
    atualizarResumoVeiculos();
    atualizarResumoLicencas();
    
    if (typeof _carregarLicencasAgrupadasLogistica === 'function') {
        _carregarLicencasAgrupadasLogistica([]);
    }

    // Reset título
    const titulo = document.querySelector('#modal-novo-credenciamento h3');
    if (titulo) titulo.textContent = 'Novo Credenciamento';
    const modal = document.getElementById('modal-novo-credenciamento');
    if (modal) modal.style.display = 'flex';
};

// ── Cumprir uma Solicitação existente (botão Adicionar na tabela da Logística) ─
window.abrirModalCumprirSolicitacao = function(id) {
    // Pega os dados da solicitação do histórico já carregado
    const dados = (window._historicoCredDados || []).find(c => String(c.id) === String(id));
    
    window._credSolicitacaoId = id;

    window._credLimites = {
        colabs: dados ? parseInt(dados.qtd_max_colaboradores || 0) : 0,
        veics: dados ? parseInt(dados.qtd_max_veiculos || 0) : 0
    };
    
    const maxColabsText = window._credLimites.colabs > 0 ? `(Máx: ${window._credLimites.colabs})` : '(Ilimitado)';
    const maxVeicsText = window._credLimites.veics > 0 ? `(Máx: ${window._credLimites.veics})` : '(Ilimitado)';
    
    const spanColabs = document.getElementById('cred-limit-colabs-span');
    if (spanColabs) spanColabs.textContent = maxColabsText;
    
    const spanVeics = document.getElementById('cred-limit-veics-span');
    if (spanVeics) spanVeics.textContent = maxVeicsText;
    
    const spanModalColabs = document.getElementById('cred-modal-limit-colabs-span');
    if (spanModalColabs) spanModalColabs.textContent = maxColabsText;
    
    const spanModalVeics = document.getElementById('cred-modal-limit-veics-span');
    if (spanModalVeics) spanModalVeics.textContent = maxVeicsText;

    // Limpar seleções anteriores
    credenciamentoState.selecionadosColabs = [];
    credenciamentoState.selecionadosVeic = [];
    credenciamentoState.selecionadosLicencas = [];
    atualizarResumoColabs();
    atualizarResumoVeiculos();
    atualizarResumoLicencas();

    // Pré-preencher campos com os dados da solicitação
    if (dados) {
        const nome = document.getElementById('cred-cliente-nome'); if (nome) nome.value = dados.cliente_nome || '';
        const email = document.getElementById('cred-cliente-email'); if (email) email.value = dados.cliente_email || '';
        const end = document.getElementById('cred-endereco-instalacao'); if (end) end.value = dados.endereco_instalacao || '';
        const osInput = document.getElementById('cred-os'); if (osInput) osInput.value = dados.os || '';

        // Pré-marcar documentos exigidos
        let docsArr = [];
        try { docsArr = JSON.parse(dados.docs_exigidos || '[]'); } catch(e) {}
        document.querySelectorAll('#cred-docs-exigidos input').forEach(cb => {
            cb.checked = docsArr.includes(cb.value);
        });

        let licsSelecionadas = [];
        try { licsSelecionadas = typeof dados.licencas_ids === 'string' ? JSON.parse(dados.licencas_ids || '[]') : (dados.licencas_ids || []); } catch(e) {}
        if (typeof _carregarLicencasAgrupadasLogistica === 'function') {
            _carregarLicencasAgrupadasLogistica(licsSelecionadas);
        }
    }

    // Atualizar título
    const titulo = document.querySelector('#modal-novo-credenciamento h3');
    if (titulo) titulo.textContent = dados ? `Credenciar: ${dados.cliente_nome}` : 'Cumprir Solicitação';

    const modal = document.getElementById('modal-novo-credenciamento');
    if (modal) modal.style.display = 'flex';
};


window.fecharModalNovoCredenciamento = function() {
    const modal = document.getElementById('modal-novo-credenciamento');
    if (modal) modal.style.display = 'none';
};

// ── Histórico de Credenciamentos ─────────────────────────────────────────────
window.carregarHistoricoCredenciamento = async function() {
    const tbody = document.getElementById('tbody-historico-cred');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; color:#94a3b8; padding:2rem;"><i class="ph ph-spinner ph-spin"></i> Carregando histórico...</td></tr>';
    
    try {
        const token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token');
        const res = await fetch('/api/logistica/credenciamentos', { headers: { 'Authorization': `Bearer ${token}` } });
        if (!res.ok) throw new Error('Falha ao carregar histórico');
        const data = await res.json();
        
        // Salva os dados para uso em abrirModalCumprirSolicitacao
        window._historicoCredDados = Array.isArray(data) ? data : [];

        window.ordenarHistoricoCred('data', 'desc');
    } catch(e) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:#ef4444; padding:1rem;">Erro ao carregar histórico: ${e.message}</td></tr>`;
    }
};

window.excluirCredenciamento = async function(id) {
    if (!confirm('Deseja realmente excluir este credenciamento? O link enviado não funcionará mais.')) return;
    try {
        const token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token');
        const res = await fetch('/api/logistica/credenciamentos/' + id, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Falha ao excluir credenciamento');
        carregarHistoricoCredenciamento();
    } catch(e) {
        alert('Erro ao excluir: ' + e.message);
    }
};

// Hook inicial para carregar histórico ao abrir a tela
const __originalRenderLogisticaCredenciamento = window.renderLogisticaCredenciamentoPage;
window.renderLogisticaCredenciamentoPage = function() {
    if (typeof __originalRenderLogisticaCredenciamento === 'function') {
        __originalRenderLogisticaCredenciamento();
    }
    carregarHistoricoCredenciamento();
};

// ── Filtro e Ordenação do Histórico ──────────────────────────────────────────
window._historicoCredSort = { col: 'data', dir: 'asc' }; // Estado da ordenação

window.filtrarHistoricoCred = function() {
    const elOs = document.getElementById('filtro-pesquisa-os-cred');
    const elCliente = document.getElementById('filtro-pesquisa-cliente-cred');
    const elEndereco = document.getElementById('filtro-pesquisa-endereco-cred');
    const elEmail = document.getElementById('filtro-pesquisa-email-cred');
    
    const termoOs = elOs ? (elOs.value || '').toLowerCase().trim() : '';
    const termoCliente = elCliente ? (elCliente.value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') : '';
    const termoEndereco = elEndereco ? (elEndereco.value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') : '';
    const termoEmail = elEmail ? (elEmail.value || '').toLowerCase().trim() : '';
    
    const rows = document.querySelectorAll('#tbody-historico-cred tr');
    let lastRowMatch = true;
    
    rows.forEach(row => {
        if (row.cells.length === 1) {
            if (!lastRowMatch) row.style.display = 'none';
            return;
        }
        
        const osText = row.cells[0].textContent.toLowerCase().trim();
        let cName = '', cEmail = '', cEnd = '';
        
        if (row.cells[1]) {
            const b = row.cells[1].querySelector('b');
            const spans = row.cells[1].querySelectorAll('span');
            cName = b ? b.textContent.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') : '';
            cEmail = spans.length > 0 ? spans[0].textContent.toLowerCase().trim() : '';
            cEnd = spans.length > 1 ? spans[1].textContent.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') : '';
        }
        
        let match = true;
        if (termoOs && !osText.includes(termoOs)) match = false;
        if (termoCliente && !cName.includes(termoCliente)) match = false;
        if (termoEmail && !cEmail.includes(termoEmail)) match = false;
        if (termoEndereco && !cEnd.includes(termoEndereco)) match = false;
        
        row.style.display = match ? '' : 'none';
        lastRowMatch = match;
    });
};

window.ordenarHistoricoCred = function(coluna, forceDir = null) {
    if (forceDir) {
        window._historicoCredSort.col = coluna;
        window._historicoCredSort.dir = forceDir;
    } else if (window._historicoCredSort.col === coluna) {
        window._historicoCredSort.dir = window._historicoCredSort.dir === 'asc' ? 'desc' : 'asc';
    } else {
        window._historicoCredSort.col = coluna;
        window._historicoCredSort.dir = 'asc';
    }

    const tbody = document.getElementById('tbody-historico-cred');
    if (!tbody) return;

    if (!window._historicoCredDados || window._historicoCredDados.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; color:#94a3b8; padding:2rem;">Nenhum credenciamento gerado ainda.</td></tr>';
        return;
    }

    let dados = [...window._historicoCredDados];

    if (coluna === 'cliente') {
        dados.sort((a, b) => {
            const nomeA = (a.cliente_nome || '').toLowerCase();
            const nomeB = (b.cliente_nome || '').toLowerCase();
            if (nomeA < nomeB) return window._historicoCredSort.dir === 'asc' ? -1 : 1;
            if (nomeA > nomeB) return window._historicoCredSort.dir === 'asc' ? 1 : -1;
            return 0;
        });
    } else if (coluna === 'os') {
        dados.sort((a, b) => {
            const osA = (a.os || '').toLowerCase();
            const osB = (b.os || '').toLowerCase();
            if (osA < osB) return window._historicoCredSort.dir === 'asc' ? -1 : 1;
            if (osA > osB) return window._historicoCredSort.dir === 'asc' ? 1 : -1;
            return 0;
        });
    } else if (coluna === 'data') {
        dados.sort((a, b) => {
            const dataA = new Date(a.created_at || 0).getTime();
            const dataB = new Date(b.created_at || 0).getTime();
            return window._historicoCredSort.dir === 'asc' ? dataA - dataB : dataB - dataA;
        });
    }

    window._renderizarTabelaHistorico(dados);
    window.filtrarHistoricoCred(); // reaplica filtro se tiver
};

window._renderizarTabelaHistorico = function(dados) {
    const tbody = document.getElementById('tbody-historico-cred');
    if (!tbody) return;

    if (!dados || dados.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:#94a3b8; padding:2rem;">Nenhum credenciamento encontrado.</td></tr>';
        return;
    }

    tbody.innerHTML = dados.map(cred => {
        let dtFormatada = '';
        if (cred.created_at) {
            const d = new Date(cred.created_at);
            dtFormatada = d.toLocaleDateString('pt-BR') + ' às ' + d.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'});
        }

        const colabs = cred.colaboradores_ids ? JSON.parse(cred.colaboradores_ids) : [];
        const veics = cred.veiculos_ids ? JSON.parse(cred.veiculos_ids) : [];
        const licencas = cred.licencas_ids ? JSON.parse(cred.licencas_ids) : [];
        const docs = cred.docs_exigidos ? JSON.parse(cred.docs_exigidos) : [];

        const colabsText = colabs.length > 0 
            ? `<span title="${colabs.map(c => '• ' + c.nome).join('&#10;')}" style="cursor:help; border-bottom:1px dotted #94a3b8; font-weight:600; color:#0f172a;">Enviados (${colabs.length})</span>` 
            : '<span style="color:#94a3b8;">Nenhum</span>';
            
        const veicsText = veics.length > 0 
            ? `<span title="${veics.map(v => '• ' + v.placa + ' (CRLV)').join('&#10;')}" style="cursor:help; border-bottom:1px dotted #94a3b8; font-weight:600; color:#0f172a;">Enviados (${veics.length})</span>` 
            : '<span style="color:#94a3b8;">Nenhum</span>';
            
        const licencasText = licencas.length > 0 ? 'Sim' : 'Não';
        
        const licGroups = {};
        licencas.forEach(l => {
            const comp = l.empresa || 'América Rental';
            if (!licGroups[comp]) licGroups[comp] = [];
            licGroups[comp].push(l.nome);
        });
        
        let licsFormatted = '';
        if (Object.keys(licGroups).length > 0) {
            licsFormatted = Object.entries(licGroups).map(([comp, nomes]) => `<b>${comp}:</b> ${nomes.join(' - ')}`).join('<br>');
        } else {
            licsFormatted = '<span style="color:#94a3b8;font-style:italic;">Nenhuma licença</span>';
        }

        // Status do Link
        const validade = new Date(cred.valid_until);
        const expirado = new Date() > validade;
        
        let statusBadge = '';
        if (cred.status === 'solicitado') {
            statusBadge = `<span style="color:#eab308; font-weight:600;"><i class="ph ph-clock"></i> Solicitado</span>`;
        } else if (expirado) {
            statusBadge = `<span style="color:#dc2626; font-weight:600;"><i class="ph ph-x-circle"></i> Expirado</span>`;
        } else if (cred.acessado_em) {
            const acessStr = window.formatUTCDate ? window.formatUTCDate(cred.acessado_em).replace(',', ' às') : cred.acessado_em;
            statusBadge = `<span style="color:#16a34a; font-weight:600;"><i class="ph ph-check-circle"></i> Acessado</span>`;
        } else {
            statusBadge = `<span style="color:#4f46e5; font-weight:600;"><i class="ph ph-paper-plane-right"></i> Enviado</span>`;
        }

        return `
        <tr>
            <td><b>${cred.os || '-'}</b></td>
            <td>
                <b>${cred.cliente_nome}</b><br>
                <span style="font-size:0.8rem; color:#64748b;">${cred.cliente_email}</span>
                ${cred.endereco_instalacao ? `<br><span style="font-size:0.75rem; color:#94a3b8;"><i class="ph ph-map-pin"></i> ${cred.endereco_instalacao}</span>` : ''}
            </td>
            <td style="font-size:0.8rem; line-height:1.6;">
                <div style="font-weight:600; margin-bottom:4px; color:#475569; background:#f1f5f9; padding:2px 6px; border-radius:4px; display:inline-block;">${colabs.length}/${cred.qtd_max_colaboradores === 0 ? 'Todos' : cred.qtd_max_colaboradores}</div><br>
                ${colabsText}
            </td>
            <td style="font-size:0.8rem; line-height:1.6;">
                <div style="font-weight:600; margin-bottom:4px; color:#475569; background:#f1f5f9; padding:2px 6px; border-radius:4px; display:inline-block;">${veics.length}/${cred.qtd_max_veiculos === 0 ? 'Todos' : cred.qtd_max_veiculos}</div><br>
                ${veicsText}
            </td>
            <td style="font-size:0.8rem; line-height:1.6;">${licencasText}</td>
            <td style="font-size:0.8rem; font-weight:600; color:${cred.data_limite_envio ? '#475569' : '#94a3b8'};">${cred.data_limite_envio ? cred.data_limite_envio.split('-').reverse().join('/') : '-'}</td>
            <td style="font-size:0.85rem;">${statusBadge}</td>
            <td style="text-align:right; white-space:nowrap;">
                <button class="btn btn-outline btn-sm" style="padding:4px 8px; font-size:12px; margin-right:4px;" onclick="toggleCredDetails(this, 'log-cred-det-${cred.id}')" title="Ver Detalhes"><i class="ph ph-caret-down"></i></button>
                ${cred.status === 'solicitado' ? `<button class="btn btn-primary btn-sm" style="padding:4px 8px; font-size:12px; margin-right:4px;" onclick="window.abrirModalCumprirSolicitacao('${cred.id}')"><i class="ph ph-plus"></i> Atender</button>` : (cred.token ? `<button class="btn btn-outline btn-sm" style="padding:4px 8px; font-size:12px; margin-right:4px;" onclick="window.reenviarEmailCredenciamento('${cred.id}', '${cred.cliente_email}')"><i class="ph ph-envelope-simple"></i> Reenviar</button>` : '')}
            </td>
        </tr>
        <tr id="log-cred-det-${cred.id}" style="display:none; background:#f8fafc;">
            <td colspan="8" style="padding:15px; font-size:0.85rem; border-left:3px solid #16a34a;">
                <div style="display:flex; flex-wrap:wrap; gap:30px;">
                    <div style="flex:1; min-width:250px;">
                        <div style="color:#64748b; font-weight:600; margin-bottom:4px;">📄 Documentos Solicitados:</div>
                        <div style="color:#334155;">${docs.length ? docs.map(d => window.docNames ? window.docNames[d] || d : d).join(' - ') : '<span style="color:#94a3b8;font-style:italic;">Nenhum documento específico</span>'}</div>
                    </div>
                    <div style="flex:1; min-width:250px;">
                        <div style="color:#64748b; font-weight:600; margin-bottom:4px;">🏷️ Licenças Solicitadas:</div>
                        <div style="color:#334155; line-height:1.6;">${licsFormatted}</div>
                    </div>
                </div>
                ${cred.observacoes ? `<div style="margin-top:15px; padding-top:10px; border-top:1px solid #e2e8f0;"><span style="color:#64748b; font-weight:600;">📝 Observações:</span> <span style="color:#475569;">${cred.observacoes}</span></div>` : ''}
                
                <div style="margin-top:15px; padding-top:15px; border-top:1px solid #e2e8f0; display:flex; flex-wrap:wrap; gap:30px;">
                    <div style="flex:1; min-width:250px;">
                        <div style="color:#eab308; font-weight:600; margin-bottom:8px;">Solicitação:</div>
                        <div style="display:flex; align-items:center; gap:10px;">
                            <div style="width:32px; height:32px; border-radius:50%; background:#fef08a; display:flex; align-items:center; justify-content:center; color:#854d0e; font-weight:700;">
                                ${(cred.sol_nome_usuario || cred.sol_username || cred.solicitado_por_nome || 'UC').substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                                <div style="font-weight:600; color:#334155;">${cred.sol_nome_usuario || cred.sol_username || cred.solicitado_por_nome || 'Usuário Comercial'}</div>
                                <div style="font-size:0.75rem; color:#94a3b8;"><i class="ph ph-calendar-blank"></i> ${cred.created_at ? (window.formatUTCDate ? window.formatUTCDate(cred.created_at) : cred.created_at) : 'Data não registrada'}</div>
                            </div>
                        </div>
                    </div>
                    
                    <div style="flex:1; min-width:250px;">
                        <div style="color:#3b82f6; font-weight:600; margin-bottom:8px;">Envio do Credenciamento:</div>
                        <div style="display:flex; align-items:center; gap:10px;">
                            <div style="width:32px; height:32px; border-radius:50%; background:#bfdbfe; display:flex; align-items:center; justify-content:center; color:#1e40af; font-weight:700;">
                                ${(cred.env_nome_usuario || cred.env_username || cred.enviado_por_nome || 'UL').substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                                <div style="font-weight:600; color:#334155;">${cred.env_nome_usuario || cred.env_username || cred.enviado_por_nome || 'Usuário Logística'}</div>
                                <div style="font-size:0.75rem; color:#94a3b8;"><i class="ph ph-calendar-blank"></i> ${cred.enviado_em ? (window.formatUTCDate ? window.formatUTCDate(cred.enviado_em) : cred.enviado_em) : 'Data não registrada'}</div>
                            </div>
                        </div>
                    </div>
                    
                    <div style="flex:1; min-width:250px;">
                        <div style="color:#16a34a; font-weight:600; margin-bottom:8px;">Acesso do Cliente:</div>
                        ${cred.acessado_em ? `<div style="color:#16a34a; font-size:0.85rem;"><i class="ph ph-check-circle"></i> Acessado em ${window.formatUTCDate ? window.formatUTCDate(cred.acessado_em) : cred.acessado_em}</div>` : '<div style="color:#94a3b8; font-size:0.85rem; font-style:italic;">Cliente ainda não abriu o link.</div>'}
                    </div>
                </div>
            </td>
        </tr>`;
    }).join('');
};


// ==========================================
// FUNÇÃO PARA LIMPAR TODA A LISTA
// ==========================================
window.limparListaCredenciamentos = async function() {
    if (!confirm('ATENÇÃO: Tem certeza que deseja excluir TODOS os credenciamentos do sistema? Essa ação não pode ser desfeita.')) return;
    
    try {
        const token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token');
        const res = await fetch('/api/logistica/credenciamentos/limpar-lista', {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!res.ok) throw new Error('Erro ao limpar a lista.');
        
        showToast('Todos os credenciamentos foram limpos.', 'success');
        
        // Atualiza as duas listas caso estejam carregadas
        if (typeof window.carregarHistoricoCredenciamento === 'function') {
            window.carregarHistoricoCredenciamento();
        }
        if (typeof window.carregarHistoricoComCred === 'function') {
            window.carregarHistoricoComCred();
        }
    } catch (err) {
        showToast(err.message, 'error');
    }
};

window.reenviarEmailCredenciamento = async function(id, emailAtual) {
    const novoEmail = prompt('Deseja reenviar o e-mail do credenciamento? Se quiser alterar o e-mail do cliente, edite abaixo:', emailAtual || '');
    if (novoEmail === null) return;
    try {
        const token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token');
        const res = await fetch(`/api/credenciamentos/${id}/reenviar`, { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ novoEmail: novoEmail })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        alert('E-mail reenviado com sucesso!');
            if (window.carregarHistoricoCredenciamento) window.carregarHistoricoCredenciamento();
            if (window.carregarHistoricoComCred) window.carregarHistoricoComCred();
    } catch(err) {
        alert('Erro ao reenviar e-mail: ' + err.message);
    }
};

// ══════════════════════════════════════════════════════════════════════════════
// FUNCIONALIDADE: SOLICITAR DOCUMENTOS
// ══════════════════════════════════════════════════════════════════════════════

let _solDocState = {
    colaboradores: [],
    veiculos: [],
    colabsSelecionados: new Set(),
    veiculosSelecionados: new Set(),
    step: 1 // 1=form, 2=selecao, 3=resultado
};

window.abrirModalSolicitarDocumentos = async function() {
    // Injeta o modal se não existir
    if (!document.getElementById('modal-solicitar-docs')) {
        const div = document.createElement('div');
        div.id = 'modal-solicitar-docs';
        div.style.cssText = 'display:none; position:fixed; inset:0; background:rgba(15,23,42,0.65); z-index:9999; align-items:center; justify-content:center; padding:16px; backdrop-filter:blur(3px);';
        div.innerHTML = `
        <div style="background:#fff; border-radius:16px; width:100%; max-width:680px; max-height:92vh; display:flex; flex-direction:column; box-shadow:0 25px 50px -12px rgba(0,0,0,0.25); overflow:hidden;">
            <!-- Header -->
            <div style="display:flex; align-items:center; justify-content:space-between; padding:20px 24px; border-bottom:1px solid #e2e8f0; background:#f8fafc; flex-shrink:0;">
                <div style="display:flex; align-items:center; gap:10px;">
                    <div style="background:#ede9fe; color:#7c3aed; width:40px; height:40px; border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:1.2rem;">
                        <i class="ph-bold ph-file-text"></i>
                    </div>
                    <div>
                        <h3 style="margin:0; color:#1e293b; font-size:1.1rem;" id="sol-docs-titulo">Solicitar Documentos</h3>
                        <p style="margin:0; color:#64748b; font-size:0.8rem;" id="sol-docs-subtitulo">Informe os dados do cliente e da OS</p>
                    </div>
                </div>
                <button onclick="fecharModalSolicitarDocumentos()" style="background:transparent; border:none; color:#94a3b8; cursor:pointer; font-size:1.4rem; line-height:1;" onmouseover="this.style.color='#ef4444'" onmouseout="this.style.color='#94a3b8'">
                    <i class="ph-bold ph-x"></i>
                </button>
            </div>

            <!-- Body -->
            <div id="sol-docs-body" style="flex:1; overflow-y:auto; padding:24px;">
                <!-- Step 1: Dados da OS -->
                <div id="sol-step-1">
                    <div style="margin-bottom:18px;">
                        <label style="display:block; margin-bottom:6px; color:#475569; font-weight:600; font-size:0.88rem;">Nome do Cliente</label>
                        <input type="text" id="sol-docs-cliente" placeholder="Ex: Construtora ABC Ltda" style="width:100%; padding:10px 14px; border:1.5px solid #cbd5e1; border-radius:8px; font-size:0.95rem; outline:none; box-sizing:border-box;" onfocus="this.style.borderColor='#7c3aed'" onblur="this.style.borderColor='#cbd5e1'">
                    </div>
                    <div style="margin-bottom:24px;">
                        <label style="display:block; margin-bottom:6px; color:#475569; font-weight:600; font-size:0.88rem;">Número da OS</label>
                        <input type="text" id="sol-docs-os" placeholder="Ex: OS-2024-001" style="width:100%; padding:10px 14px; border:1.5px solid #cbd5e1; border-radius:8px; font-size:0.95rem; outline:none; box-sizing:border-box;" onfocus="this.style.borderColor='#7c3aed'" onblur="this.style.borderColor='#cbd5e1'">
                    </div>
                    <button onclick="solDocsProximo()" style="width:100%; background:#7c3aed; color:#fff; border:none; padding:13px; border-radius:8px; font-weight:700; font-size:1rem; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px;" onmouseover="this.style.background='#6d28d9'" onmouseout="this.style.background='#7c3aed'">
                        Próximo <i class="ph-bold ph-arrow-right"></i>
                    </button>
                </div>

                <!-- Step 2: Seleção -->
                <div id="sol-step-2" style="display:none;">
                    <!-- Abas -->
                    <div style="display:flex; gap:8px; margin-bottom:16px; border-bottom:2px solid #e2e8f0; padding-bottom:-2px;">
                        <button id="sol-tab-colabs" onclick="solDocsSwitchTab('colabs')" style="padding:8px 18px; border:none; border-bottom:3px solid #7c3aed; background:transparent; color:#7c3aed; font-weight:700; cursor:pointer; font-size:0.9rem; margin-bottom:-2px;">
                            <i class="ph ph-users"></i> Colaboradores <span id="sol-badge-colabs" style="background:#ede9fe; color:#7c3aed; border-radius:10px; padding:1px 7px; font-size:0.75rem; margin-left:4px;">0</span>
                        </button>
                        <button id="sol-tab-veics" onclick="solDocsSwitchTab('veics')" style="padding:8px 18px; border:none; border-bottom:3px solid transparent; background:transparent; color:#64748b; font-weight:600; cursor:pointer; font-size:0.9rem; margin-bottom:-2px;">
                            <i class="ph ph-truck"></i> Veículos <span id="sol-badge-veics" style="background:#f1f5f9; color:#64748b; border-radius:10px; padding:1px 7px; font-size:0.75rem; margin-left:4px;">0</span>
                        </button>
                    </div>

                    <!-- Painel Colaboradores -->
                    <div id="sol-panel-colabs">
                        <input type="text" placeholder="🔍 Buscar colaborador..." oninput="solDocsFiltrar('sol-lista-colabs', this.value)" style="width:100%; padding:9px 12px; border:1.5px solid #e2e8f0; border-radius:8px; margin-bottom:10px; font-size:0.9rem; box-sizing:border-box; outline:none;" onfocus="this.style.borderColor='#7c3aed'" onblur="this.style.borderColor='#e2e8f0'">
                        <div id="sol-lista-colabs" style="max-height:300px; overflow-y:auto; border:1px solid #e2e8f0; border-radius:8px;">
                            <p style="text-align:center; padding:20px; color:#94a3b8;">Carregando...</p>
                        </div>
                    </div>

                    <!-- Painel Veículos -->
                    <div id="sol-panel-veics" style="display:none;">
                        <input type="text" placeholder="🔍 Buscar placa ou modelo..." oninput="solDocsFiltrar('sol-lista-veics', this.value)" style="width:100%; padding:9px 12px; border:1.5px solid #e2e8f0; border-radius:8px; margin-bottom:10px; font-size:0.9rem; box-sizing:border-box; outline:none;" onfocus="this.style.borderColor='#7c3aed'" onblur="this.style.borderColor='#e2e8f0'">
                        <div id="sol-lista-veics" style="max-height:300px; overflow-y:auto; border:1px solid #e2e8f0; border-radius:8px;">
                            <p style="text-align:center; padding:20px; color:#94a3b8;">Carregando...</p>
                        </div>
                    </div>

                    <div style="display:flex; gap:10px; margin-top:16px;">
                        <button onclick="solDocsVoltar()" style="flex:1; background:#f1f5f9; color:#475569; border:1px solid #e2e8f0; padding:12px; border-radius:8px; font-weight:600; cursor:pointer;" onmouseover="this.style.background='#e2e8f0'" onmouseout="this.style.background='#f1f5f9'">
                            <i class="ph ph-arrow-left"></i> Voltar
                        </button>
                        <button onclick="solDocsGerarResultado()" style="flex:2; background:#7c3aed; color:#fff; border:none; padding:12px; border-radius:8px; font-weight:700; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px;" onmouseover="this.style.background='#6d28d9'" onmouseout="this.style.background='#7c3aed'">
                            <i class="ph-bold ph-file-text"></i> Solicitar Documentos
                        </button>
                    </div>
                </div>

                <!-- Step 3: Resultado -->
                <div id="sol-step-3" style="display:none;">
                    <div id="sol-resultado-card" style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:20px; font-family:monospace; font-size:0.88rem; white-space:pre-wrap; color:#1e293b; line-height:1.7;"></div>
                    <div style="display:flex; gap:10px; margin-top:16px;">
                        <button onclick="solDocsVoltar2()" style="flex:1; background:#f1f5f9; color:#475569; border:1px solid #e2e8f0; padding:12px; border-radius:8px; font-weight:600; cursor:pointer;">
                            <i class="ph ph-arrow-left"></i> Voltar
                        </button>
                        <button onclick="solDocsCopiar()" id="btn-sol-copiar" style="flex:2; background:#16a34a; color:#fff; border:none; padding:12px; border-radius:8px; font-weight:700; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px;">
                            <i class="ph-bold ph-copy"></i> Copiar Conteúdo
                        </button>
                    </div>
                </div>
            </div>
        </div>`;
        document.body.appendChild(div);
    }

    // Reset state
    _solDocState.colabsSelecionados = new Set();
    _solDocState.veiculosSelecionados = new Set();
    _solDocState.step = 1;

    document.getElementById('sol-docs-cliente').value = '';
    document.getElementById('sol-docs-os').value = '';
    solDocsMostrarStep(1);
    document.getElementById('modal-solicitar-docs').style.display = 'flex';
    setTimeout(() => document.getElementById('sol-docs-cliente').focus(), 150);
};

window.fecharModalSolicitarDocumentos = function() {
    const m = document.getElementById('modal-solicitar-docs');
    if (m) m.style.display = 'none';
};

window.solDocsProximo = async function() {
    const cliente = document.getElementById('sol-docs-cliente').value.trim();
    const os = document.getElementById('sol-docs-os').value.trim();
    if (!cliente) { document.getElementById('sol-docs-cliente').focus(); return; }
    if (!os) { document.getElementById('sol-docs-os').focus(); return; }

    solDocsMostrarStep(2);
    document.getElementById('sol-docs-subtitulo').textContent = `${cliente} — OS ${os}`;

    // Carregar dados
    const token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token');
    try {
        const [rC, rV] = await Promise.all([
            fetch('/api/colaboradores', { headers: { 'Authorization': `Bearer ${token}` } }),
            fetch('/api/frota/veiculos', { headers: { 'Authorization': `Bearer ${token}` } })
        ]);
        _solDocState.colaboradores = ((await rC.json()) || []).filter(c => {
            const s = (c.status || '').toLowerCase();
            return s === 'ativo' || s === 'férias' || s === 'ferias' || s === 'afastado';
        });
        _solDocState.veiculos = (await rV.json()) || [];
    } catch(e) {
        _solDocState.colaboradores = [];
        _solDocState.veiculos = [];
    }

    solDocsRenderColabs();
    solDocsRenderVeics();
    solDocsSwitchTab('colabs');
};

window.solDocsVoltar = function() { solDocsMostrarStep(1); };
window.solDocsVoltar2 = function() { solDocsMostrarStep(2); };

function solDocsMostrarStep(n) {
    _solDocState.step = n;
    document.getElementById('sol-step-1').style.display = n === 1 ? 'block' : 'none';
    document.getElementById('sol-step-2').style.display = n === 2 ? 'block' : 'none';
    document.getElementById('sol-step-3').style.display = n === 3 ? 'block' : 'none';
    const subtitulos = ['Informe os dados do cliente e da OS', '', ''];
    if (n === 1) document.getElementById('sol-docs-subtitulo').textContent = subtitulos[0];
}

window.solDocsSwitchTab = function(tab) {
    const isColabs = tab === 'colabs';
    document.getElementById('sol-panel-colabs').style.display = isColabs ? 'block' : 'none';
    document.getElementById('sol-panel-veics').style.display = isColabs ? 'none' : 'block';

    const tColabs = document.getElementById('sol-tab-colabs');
    const tVeics = document.getElementById('sol-tab-veics');
    tColabs.style.borderBottomColor = isColabs ? '#7c3aed' : 'transparent';
    tColabs.style.color = isColabs ? '#7c3aed' : '#64748b';
    tColabs.style.fontWeight = isColabs ? '700' : '600';
    tVeics.style.borderBottomColor = isColabs ? 'transparent' : '#7c3aed';
    tVeics.style.color = isColabs ? '#64748b' : '#7c3aed';
    tVeics.style.fontWeight = isColabs ? '600' : '700';
};

function solDocsRenderColabs() {
    const list = document.getElementById('sol-lista-colabs');
    if (!list) return;
    if (!_solDocState.colaboradores.length) {
        list.innerHTML = '<p style="text-align:center;padding:20px;color:#94a3b8;">Nenhum colaborador ativo.</p>';
        return;
    }
    list.innerHTML = _solDocState.colaboradores.map(c => {
        const isMotorista = c.cargo && c.cargo.toUpperCase().includes('MOTORISTA');
        const tag = isMotorista ? `<span style="background:#dbeafe;color:#1d4ed8;font-size:0.7rem;padding:1px 6px;border-radius:8px;font-weight:600;">Motorista</span>` : '';
        return `<label class="sol-item" style="display:flex;align-items:center;gap:10px;padding:9px 12px;border-bottom:1px solid #f1f5f9;cursor:pointer;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='transparent'">
            <input type="checkbox" value="${c.id}" onchange="solDocsToggleColab(this)" ${_solDocState.colabsSelecionados.has(String(c.id)) ? 'checked' : ''} style="accent-color:#7c3aed;width:16px;height:16px;cursor:pointer;">
            <span style="flex:1;font-size:0.9rem;color:#1e293b;">${c.nome_completo} ${tag}</span>
            <span style="font-size:0.75rem;color:#94a3b8;">${c.cargo || ''}</span>
        </label>`;
    }).join('');
    solDocsAtualizarBadge();
}

function solDocsRenderVeics() {
    const list = document.getElementById('sol-lista-veics');
    if (!list) return;
    if (!_solDocState.veiculos.length) {
        list.innerHTML = '<p style="text-align:center;padding:20px;color:#94a3b8;">Nenhum veículo cadastrado.</p>';
        return;
    }
    list.innerHTML = _solDocState.veiculos.map(v => `
        <label class="sol-item" style="display:flex;align-items:center;gap:10px;padding:9px 12px;border-bottom:1px solid #f1f5f9;cursor:pointer;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='transparent'">
            <input type="checkbox" value="${v.id}" onchange="solDocsToggleVeic(this)" ${_solDocState.veiculosSelecionados.has(String(v.id)) ? 'checked' : ''} style="accent-color:#7c3aed;width:16px;height:16px;cursor:pointer;">
            <span style="font-weight:700;font-size:0.9rem;color:#1e293b;">${v.placa}</span>
            <span style="flex:1;font-size:0.85rem;color:#64748b;">— ${v.marca_modelo_versao || 'Sem modelo'}</span>
        </label>`).join('');
    solDocsAtualizarBadge();
}

window.solDocsToggleColab = function(cb) {
    if (cb.checked) _solDocState.colabsSelecionados.add(String(cb.value));
    else _solDocState.colabsSelecionados.delete(String(cb.value));
    solDocsAtualizarBadge();
};

window.solDocsToggleVeic = function(cb) {
    if (cb.checked) _solDocState.veiculosSelecionados.add(String(cb.value));
    else _solDocState.veiculosSelecionados.delete(String(cb.value));
    solDocsAtualizarBadge();
};

function solDocsAtualizarBadge() {
    const bc = document.getElementById('sol-badge-colabs');
    const bv = document.getElementById('sol-badge-veics');
    const nc = _solDocState.colabsSelecionados.size;
    const nv = _solDocState.veiculosSelecionados.size;
    if (bc) {
        bc.textContent = nc;
        bc.style.background = nc > 0 ? '#ede9fe' : '#f1f5f9';
        bc.style.color = nc > 0 ? '#7c3aed' : '#64748b';
    }
    if (bv) {
        bv.textContent = nv;
        bv.style.background = nv > 0 ? '#ede9fe' : '#f1f5f9';
        bv.style.color = nv > 0 ? '#7c3aed' : '#64748b';
    }
}

window.solDocsFiltrar = function(containerId, termo) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const t = termo.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    container.querySelectorAll('.sol-item').forEach(el => {
        const txt = el.textContent.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        el.style.display = txt.includes(t) ? 'flex' : 'none';
    });
};

window.solDocsGerarResultado = function() {
    const cliente = document.getElementById('sol-docs-cliente').value.trim();
    const os = document.getElementById('sol-docs-os').value.trim();

    const colabs = [..._solDocState.colabsSelecionados].map(id => _solDocState.colaboradores.find(c => String(c.id) === id)).filter(Boolean);
    const veics = [..._solDocState.veiculosSelecionados].map(id => _solDocState.veiculos.find(v => String(v.id) === id)).filter(Boolean);

    if (!colabs.length && !veics.length) {
        alert('Selecione ao menos um colaborador ou veículo.');
        return;
    }

    const linhas = [];
    linhas.push(`📋 SOLICITAÇÃO DE DOCUMENTOS`);
    linhas.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    linhas.push(`Cliente: ${cliente}`);
    linhas.push(`OS: ${os}`);
    linhas.push(``);

    if (colabs.length) {
        linhas.push(`👷 COLABORADORES (${colabs.length})`);
        linhas.push(`─────────────────────────────`);
        colabs.forEach((c, i) => {
            const isMotorista = c.cargo && c.cargo.toUpperCase().includes('MOTORISTA');
            linhas.push(`${i + 1}. ${c.nome_completo}`);
            linhas.push(`   CPF: ${c.cpf || 'Não cadastrado'}`);
            if (isMotorista) {
                linhas.push(`   CNH: ${c.cnh || 'Não cadastrada'}`);
            }
            if (i < colabs.length - 1) linhas.push('');
        });
        linhas.push('');
    }

    if (veics.length) {
        linhas.push(`🚛 VEÍCULOS (${veics.length})`);
        linhas.push(`─────────────────────────────`);
        veics.forEach((v, i) => {
            linhas.push(`${i + 1}. Placa: ${v.placa} — ${v.marca_modelo_versao || 'Sem modelo'}`);
        });
    }

    const texto = linhas.join('\n');
    document.getElementById('sol-resultado-card').textContent = texto;
    solDocsMostrarStep(3);
    document.getElementById('sol-docs-titulo').textContent = 'Documentos Necessários';
    document.getElementById('sol-docs-subtitulo').textContent = `${colabs.length} colaborador(es) · ${veics.length} veículo(s)`;
};

window.solDocsCopiar = async function() {
    const texto = document.getElementById('sol-resultado-card').textContent;
    try {
        await navigator.clipboard.writeText(texto);
        const btn = document.getElementById('btn-sol-copiar');
        btn.innerHTML = '<i class="ph-bold ph-check-circle"></i> Copiado!';
        btn.style.background = '#15803d';
        setTimeout(() => {
            btn.innerHTML = '<i class="ph-bold ph-copy"></i> Copiar Conteúdo';
            btn.style.background = '#16a34a';
        }, 2500);
    } catch(e) {
        // Fallback para navegadores sem clipboard API
        const ta = document.createElement('textarea');
        ta.value = texto;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        alert('Conteúdo copiado!');
    }
};