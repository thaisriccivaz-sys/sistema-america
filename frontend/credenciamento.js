
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
            <input type="checkbox" id="cred-colab-${c.id}" value="${c.id}"
                ${credenciamentoState.selecionadosColabs.includes(String(c.id)) ? 'checked' : ''}>
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
            <input type="checkbox" id="cred-veic-${v.id}" value="${v.id}"
                ${credenciamentoState.selecionadosVeic.includes(String(v.id)) ? 'checked' : ''}>
            <label for="cred-veic-${v.id}" style="cursor:pointer; margin:0; flex:1;">
                <b>${v.placa}</b> — ${v.marca_modelo_versao || 'Sem modelo'}
            </label>
        </div>`).join('');
}

// ── Selecionar Todos ──────────────────────────────────────────────────────────
window.selecionarTodosColabs = function() {
    const checkboxes = document.querySelectorAll('#lista-selecao-colab input[type="checkbox"]');
    const todosChecked = Array.from(checkboxes).every(cb => cb.checked);
    checkboxes.forEach(cb => cb.checked = !todosChecked);
    const btn = document.getElementById('btn-todos-colabs');
    if (btn) btn.textContent = todosChecked ? 'Selecionar Todos' : 'Desmarcar Todos';
}
window.selecionarTodosVeiculos = function() {
    const checkboxes = document.querySelectorAll('#lista-selecao-veic input[type="checkbox"]');
    const todosChecked = Array.from(checkboxes).every(cb => cb.checked);
    checkboxes.forEach(cb => cb.checked = !todosChecked);
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

    // 1. Validar licenças selecionadas
    for (const id of credenciamentoState.selecionadosLicencas) {
        const lic = credenciamentoState.licencas.find(l => String(l.id) === id);
        if (lic && lic.validade) {
            if (new Date(lic.validade + 'T12:00:00') < hoje)
                erros.push(`Licença "${lic.nome}" está VENCIDA (${lic.validade.split('-').reverse().join('/')})`);
        }
    }

    // 2. Validar documentos com vencimento dos colaboradores selecionados
    if (credenciamentoState.selecionadosColabs.length > 0) {
        try {
            const token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token');
            for (const idStr of credenciamentoState.selecionadosColabs) {
                const c = credenciamentoState.colaboradores.find(col => String(col.id) === idStr);
                const res = await fetch(`/api/colaboradores/${idStr}/documentos`, { headers: { 'Authorization': `Bearer ${token}` } });
                if (!res.ok) continue;
                const docs = await res.json();
                for (const doc of (docs || [])) {
                    if (doc.vencimento && new Date(doc.vencimento + 'T12:00:00') < hoje) {
                        const nome = c ? c.nome_completo : `ID ${idStr}`;
                        erros.push(`Documento "${doc.document_type}" de ${nome} está VENCIDO (${doc.vencimento.split('-').reverse().join('/')})`);
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

    const payload = {
        cliente_nome: clienteNome,
        cliente_email: clienteEmail,
        endereco_instalacao: enderecoInstalacao,
        colaboradores: credenciamentoState.selecionadosColabs.map(idStr => {
            const c = credenciamentoState.colaboradores.find(col => String(col.id) === idStr);
            return { id: parseInt(idStr), nome: c ? c.nome_completo : idStr };
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
window._credSolicitacaoId = null; // ID da solicitação sendo cumprida (ou null para novo)

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

        // Pré-marcar documentos exigidos
        let docsArr = [];
        try { docsArr = JSON.parse(dados.docs_exigidos || '[]'); } catch(e) {}
        document.querySelectorAll('#cred-docs-exigidos input').forEach(cb => {
            cb.checked = docsArr.includes(cb.value);
        });
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

        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; color:#94a3b8; padding:2rem;">Nenhum credenciamento gerado ainda.</td></tr>';
            return;
        }

        tbody.innerHTML = data.map(cred => {
            // Parses
            let colabs = []; try { colabs = JSON.parse(cred.colaboradores_ids || '[]'); } catch(e){}
            let veics = []; try { veics = JSON.parse(cred.veiculos_ids || '[]'); } catch(e){}
            let licencas = []; try { licencas = JSON.parse(cred.licencas_ids || '[]'); } catch(e){}
            let docs = []; try { docs = JSON.parse(cred.docs_exigidos || '[]'); } catch(e){}
            
            // Format Data/Hora do Envio
            const dt = new Date(cred.created_at);
            const dtFormatada = dt.toLocaleDateString('pt-BR') + ' às ' + dt.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'});
            
            // Textos resumos
            const docNames = {
                'cnh': 'CNH', 'cpf': 'CPF', 'aso': 'ASO', 'ficha_registro': 'Ficha de Registro',
                'treinamento': 'Carteira de Vacinação', 'epi': 'Ficha de EPI',
                'contrato_esocial': 'Contrato e-social', 'nr1': 'NR1 / Ordem de Serviço'
            };
            const docsStr = docs.length > 0 ? docs.map(d => docNames[d] || d).join(' - ') : 'Apenas cadastro';
            const colabsText = colabs.length > 0 
                ? colabs.map(c => `<span>• ${c.nome}</span>`).join('<br>') 
                : '<span style="color:#94a3b8;">Nenhum</span>';
                
            const veicsText = veics.length > 0 
                ? `<span style="font-weight:600; color:#0f172a;">Enviados (${veics.length})</span>` 
                : '<span style="color:#94a3b8;">Nenhum</span>';
                
            const licencasText = licencas.length > 0 
                ? `<span style="font-weight:600; color:#0f172a;">Enviadas (${licencas.length})</span>` 
                : '<span style="color:#94a3b8;">Nenhuma</span>';
            
            // Status do Link
            const validade = new Date(cred.valid_until);
            const expirado = new Date() > validade;
            
            
        let acoes = '';
        if (cred.status === 'solicitado') {
            acoes = `<button class="btn btn-primary" style="padding:4px 12px; font-size:12px;" onclick="window.abrirModalCumprirSolicitacao('${cred.id}')"><i class="ph ph-plus"></i> Adicionar</button>`;
        } else {
            acoes = `<a href="/credenciamento-publico.html?token=${cred.token}" target="_blank" class="btn btn-outline" style="padding:4px 8px; font-size:12px; margin-right:4px;" title="Testar / Visualizar Link">
                <i class="ph ph-link"></i> Link
            </a>`;
        }

        // Alterar badge se solicitado
        let statusBadge = '';
        
        
        if (cred.status === 'solicitado') {
            const dtLim = cred.data_limite_envio ? new Date(cred.data_limite_envio).toLocaleDateString('pt-BR') : '-';
            statusBadge = `<span style="color:#eab308; font-weight:600;"><i class="ph ph-clock"></i> Solicitado (Limite: ${dtLim})</span>`;
        } else if (expirado) {
            statusBadge = `<span style="color:#dc2626; font-weight:600;"><i class="ph ph-x-circle"></i> Expirado</span>`;
        } else if (cred.acessado_em) {
            const acessDt = new Date(cred.acessado_em);
            const acessStr = acessDt.toLocaleDateString('pt-BR') + ' às ' + acessDt.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'});
            statusBadge = `<span style="color:#16a34a; font-weight:600;"><i class="ph ph-check-circle"></i> Acessado em ${acessStr}</span>`;
        } else {
            statusBadge = `<span style="color:#4f46e5; font-weight:600;"><i class="ph ph-paper-plane-right"></i> Enviado em ${dtFormatada}</span>`;
        }

        // Adicionar o botao toggle
        acoes = `<button class="btn btn-outline btn-sm" style="padding:4px 8px; font-size:12px; margin-right:4px;" onclick="toggleCredDetails(this, 'log-cred-det-${cred.id}')" title="Ver Detalhes"><i class="ph ph-caret-down"></i></button>` + acoes;

        let docsFormatted = docs.length ? docs.map(d => docNames[d] || d).join(' - ') : '<span style="color:#94a3b8;font-style:italic;">Nenhum documento específico</span>';
        
        let licsFormatted = '';
        if (licencas.length) {
            const groupLics = {};
            licencas.forEach(l => {
                if (!groupLics[l.empresa]) groupLics[l.empresa] = [];
                groupLics[l.empresa].push(l.nome);
            });
            licsFormatted = Object.entries(groupLics).map(([emp, lst]) => `<b>${emp}</b>: ${lst.join(' - ')}`).join('<br>');
        } else {
            licsFormatted = '<span style="color:#94a3b8;font-style:italic;">Nenhuma licença específica</span>';
        }


        const solNome = cred.sol_nome_usuario || cred.sol_username || cred.solicitado_por_nome || 'Usuário Comercial';
        const envNome = cred.env_nome_usuario || cred.env_username || cred.enviado_por_nome || 'Usuário Logística';
        const solDataStr = cred.created_at ? new Date(cred.created_at).toLocaleString('pt-BR') : 'Data não registrada';
        const envDataStr = cred.enviado_em ? new Date(cred.enviado_em).toLocaleString('pt-BR') : 'Data não registrada';

        let alertaCepHtml = '';
        if (cred.endereco_instalacao) {
            const cepMatch = cred.endereco_instalacao.match(/\b\d{5}-?\d{3}\b/);
            if (cepMatch) {
                const cep = cepMatch[0].replace('-', '');
                const outroCred = data.find(c => {
                    if (c.id === cred.id) return false;
                    if (!c.endereco_instalacao) return false;
                    const match = c.endereco_instalacao.match(/\b\d{5}-?\d{3}\b/);
                    return match && match[0].replace('-', '') === cep;
                });
                if (outroCred) {
                    alertaCepHtml = `
                    <div style="background:#fffbeb; border:1px solid #fde68a; color:#b45309; padding:10px 15px; border-radius:8px; margin-bottom:15px; display:flex; align-items:flex-start; gap:10px;">
                        <i class="ph-fill ph-warning" style="color:#d97706; font-size:1.4rem; margin-top:2px;"></i>
                        <div>
                            <strong style="display:block; margin-bottom:4px;">Atenção: CEP em comum</strong>
                            A OS <b>${outroCred.os || '-'}</b> (Cliente: <b>${outroCred.cliente_nome}</b>) possui o mesmo número de CEP cadastrado: <b>${cepMatch[0]}</b>.
                            <div style="font-size:0.8rem; margin-top:4px; opacity:0.8;">Endereço vinculado: ${outroCred.endereco_instalacao}</div>
                        </div>
                    </div>`;
                }
            }
        }


        return `
        <tr>
            <td><b>${cred.os || '-'}</b></td>
            <td>
                <b>${cred.cliente_nome}</b><br>
                <span style="font-size:0.8rem; color:#64748b;">${cred.cliente_email}</span>
                ${cred.endereco_instalacao ? `<br><span style="font-size:0.75rem; color:#94a3b8;"><i class="ph ph-map-pin"></i> ${cred.endereco_instalacao}</span>` : ''}
            </td>
            <td style="font-size:0.8rem; line-height:1.6;">${colabsText}</td>
            <td style="font-size:0.8rem; line-height:1.6;">${veicsText}</td>
            <td style="font-size:0.8rem; line-height:1.6;">${licencasText}</td>
            <td style="font-size:0.85rem;">${statusBadge}</td>
            <td style="text-align:right; white-space:nowrap;">${acoes}</td>
        </tr>
        <tr id="log-cred-det-${cred.id}" style="display:none; background:#f8fafc;">
            <td colspan="8" style="padding:15px; font-size:0.85rem; border-left:3px solid #7048e8;">
                ${alertaCepHtml}
                <div style="display:flex; flex-wrap:wrap; gap:30px;">
                    <div style="flex:1; min-width:250px;">
                        <div style="color:#64748b; font-weight:600; margin-bottom:4px;">📄 Documentos Solicitados:</div>
                        <div style="color:#334155;">${docsFormatted}</div>
                    </div>
                    <div style="flex:1; min-width:250px;">
                        <div style="color:#64748b; font-weight:600; margin-bottom:4px;">🏷️ Licenças Solicitadas:</div>
                        <div style="color:#334155; line-height:1.6;">${licsFormatted}</div>
                    </div>
                </div>
                ${cred.observacoes ? `<div style="margin-top:15px; padding-top:10px; border-top:1px solid #e2e8f0;"><span style="color:#64748b; font-weight:600;">📝 Observações:</span> <span style="color:#475569;">${cred.observacoes}</span></div>` : ''}
                
                
                <div style="margin-top:15px; padding-top:15px; border-top:1px solid #e2e8f0; display:flex; flex-wrap:wrap; gap:30px;">
                    <div style="flex:1; min-width:250px;">
                        <div style="color:#64748b; font-weight:600; margin-bottom:8px;">Solicitação:</div>
                        <div style="display:flex; align-items:center; gap:10px;">
                            ${window.renderAvatar(solNome, cred.sol_foto, cred.sol_foto_b64)}
                            <div>
                                <div style="font-weight:600; color:#334155; font-size:0.9rem;">${solNome}</div>
                                <div style="font-size:0.75rem; color:#64748b;"><i class="ph ph-calendar-blank"></i> ${solDataStr}</div>
                            </div>
                        </div>
                    </div>

                    <div style="flex:1; min-width:250px;">
                        <div style="color:#64748b; font-weight:600; margin-bottom:8px;">Envio do Credenciamento:</div>
                        ${cred.status === 'enviado' || cred.enviado_em ? `
                            <div style="display:flex; align-items:center; gap:10px;">
                                ${window.renderAvatar(envNome, cred.env_foto, cred.env_foto_b64)}
                                <div>
                                    <div style="font-weight:600; color:#334155; font-size:0.9rem;">${envNome}</div>
                                    <div style="font-size:0.75rem; color:#64748b;"><i class="ph ph-calendar-blank"></i> ${envDataStr}</div>
                                </div>
                            </div>
                        ` : `
                            <div style="padding:10px; background:#fef2f2; color:#ef4444; border-radius:6px; font-size:0.8rem; display:inline-block;">
                                <i class="ph ph-x-circle"></i> Credenciamento não enviado
                            </div>
                        `}
                    </div>
                    
                    <div style="flex:1; min-width:250px;">
                        <div style="color:#64748b; font-weight:600; margin-bottom:8px;">Acesso do Cliente:</div>
                        ${cred.acessado_em ? `
                            <div style="padding:10px; background:#f0fdf4; color:#166534; border-radius:6px; font-size:0.8rem; display:inline-block; border:1px solid #bbf7d0;">
                                <i class="ph ph-check-circle"></i> Link acessado pelo cliente
                                <div style="margin-top:4px; font-weight:600;">
                                    <i class="ph ph-clock"></i> Acessado em: ${new Date(cred.acessado_em).toLocaleString('pt-BR')}
                                </div>
                            </div>
                        ` : `
                            <div style="font-size:0.8rem; color:#94a3b8; font-style:italic;">
                                Cliente ainda não abriu o link.
                            </div>
                        `}
                    </div>
                </div>
            </td>
        </tr>`;
        
    }).join('');
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
    const termo = (document.getElementById('filtro-pesquisa-cred').value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const rows = document.querySelectorAll('#tbody-historico-cred tr');
    rows.forEach(row => {
        // Ignora a linha de "Carregando"
        if (row.cells.length === 1) return;
        const texto = (row.cells[0].textContent + ' ' + row.cells[1].textContent).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        row.style.display = texto.includes(termo) ? '' : 'none';
    });
};

window.ordenarHistoricoCred = function(coluna) {
    // Alterna direção
    if (window._historicoCredSort.col === coluna) {
        window._historicoCredSort.dir = window._historicoCredSort.dir === 'asc' ? 'desc' : 'asc';
    } else {
        window._historicoCredSort.col = coluna;
        window._historicoCredSort.dir = 'asc';
    }

    if (!window._historicoCredDados || window._historicoCredDados.length === 0) return;

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

        const colabsText = colabs.length > 0 
            ? `<span title="${colabs.map(c => '• ' + c.nome).join('&#10;')}" style="cursor:help; border-bottom:1px dotted #94a3b8; font-weight:600; color:#0f172a;">Enviados (${colabs.length})</span>` 
            : '<span style="color:#94a3b8;">Nenhum</span>';
            
        const veicsText = veics.length > 0 
            ? `<span title="${veics.map(v => '• ' + v.placa + ' (CRLV)').join('&#10;')}" style="cursor:help; border-bottom:1px dotted #94a3b8; font-weight:600; color:#0f172a;">Enviados (${veics.length})</span>` 
            : '<span style="color:#94a3b8;">Nenhum</span>';
            
        const licencasText = licencas.length > 0 
            ? `<span title="${licencas.map(l => '• ' + l.nome).join('&#10;')}" style="cursor:help; border-bottom:1px dotted #94a3b8; font-weight:600; color:#0f172a;">Enviadas (${licencas.length})</span>` 
            : '<span style="color:#94a3b8;">Nenhuma</span>';
        
        // Status do Link
        const validade = new Date(cred.valid_until);
        const expirado = new Date() > validade;
        
        let statusBadge = '';
        if (expirado) {
            statusBadge = `<span style="color:#dc2626; font-weight:600;"><i class="ph ph-x-circle"></i> Expirado</span>`;
        } else if (cred.acessado_em) {
            const acessDt = new Date(cred.acessado_em);
            const acessStr = acessDt.toLocaleDateString('pt-BR') + ' às ' + acessDt.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'});
            statusBadge = `<span style="color:#16a34a; font-weight:600;"><i class="ph ph-check-circle"></i> Acessado em ${acessStr}</span>`;
        } else {
            statusBadge = `<span style="color:#4f46e5; font-weight:600;"><i class="ph ph-paper-plane-right"></i> Enviado em ${dtFormatada}</span>`;
        }

        return `
        <tr>
            <td><b>${cred.os || '-'}</b></td>
            <td>
                <b>${cred.cliente_nome}</b><br>
                <span style="font-size:0.8rem; color:#64748b;">${cred.cliente_email}</span>
                ${cred.endereco_instalacao ? `<br><span style="font-size:0.75rem; color:#94a3b8;"><i class="ph ph-map-pin"></i> ${cred.endereco_instalacao}</span>` : ''}
            </td>
            <td style="font-size:0.8rem; line-height:1.6;">${colabsText}</td>
            <td style="font-size:0.8rem; line-height:1.6;">${veicsText}</td>
            <td style="font-size:0.8rem; line-height:1.6;">${licencasText}</td>
            <td style="font-size:0.85rem;">${statusBadge}</td>
            <td style="text-align:right; white-space:nowrap;">
                <a href="/credenciamento-publico.html?token=${cred.token}" target="_blank" class="btn btn-outline" style="padding:4px 8px; font-size:12px; margin-right:4px;" title="Testar / Visualizar Link">
                    <i class="ph ph-link"></i> Link
                </a>
                <button class="btn btn-outline" style="padding:4px 8px; font-size:12px; color:#dc2626; border-color:#fca5a5; background:#fff;" onclick="window.excluirCredenciamento('${cred.id}')" title="Excluir">
                    <i class="ph ph-trash"></i>
                </button>
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
