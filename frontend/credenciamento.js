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
function selecionarTodosColabs() {
    const checkboxes = document.querySelectorAll('#lista-selecao-colab input[type="checkbox"]');
    const todosChecked = Array.from(checkboxes).every(cb => cb.checked);
    checkboxes.forEach(cb => cb.checked = !todosChecked);
    const btn = document.getElementById('btn-todos-colabs');
    if (btn) btn.textContent = todosChecked ? 'Selecionar Todos' : 'Desmarcar Todos';
}
function selecionarTodosVeiculos() {
    const checkboxes = document.querySelectorAll('#lista-selecao-veic input[type="checkbox"]');
    const todosChecked = Array.from(checkboxes).every(cb => cb.checked);
    checkboxes.forEach(cb => cb.checked = !todosChecked);
    const btn = document.getElementById('btn-todos-veics');
    if (btn) btn.textContent = todosChecked ? 'Selecionar Todos' : 'Desmarcar Todos';
}

// ── Filtro de busca nos modais ────────────────────────────────────────────────
function filtrarListaCred(containerId, termo) {
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
function abrirModalAddCredColab() {
    const modal = document.getElementById('modal-cred-colab');
    if (modal) modal.style.display = 'flex';
    loadColaboradoresCred();
    const busca = document.getElementById('busca-cred-colab');
    if (busca) busca.value = '';
}
function fecharModalAddCredColab() {
    const modal = document.getElementById('modal-cred-colab');
    if (modal) modal.style.display = 'none';
}
function abrirModalAddCredVeic() {
    const modal = document.getElementById('modal-cred-veic');
    if (modal) modal.style.display = 'flex';
    loadVeiculosCred();
    const busca = document.getElementById('busca-cred-veic');
    if (busca) busca.value = '';
}
function fecharModalAddCredVeic() {
    const modal = document.getElementById('modal-cred-veic');
    if (modal) modal.style.display = 'none';
}

// ── Confirmar seleção ─────────────────────────────────────────────────────────
function confirmarSelecaoCredColab() {
    const checkboxes = document.querySelectorAll('#lista-selecao-colab input[type="checkbox"]');
    credenciamentoState.selecionadosColabs = Array.from(checkboxes).filter(cb => cb.checked).map(cb => cb.value);
    atualizarResumoColabs();
    fecharModalAddCredColab();
}
function confirmarSelecaoCredVeic() {
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
async function gerarEnviarCredenciamento() {
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
        const res = await fetch('/api/logistica/credenciamento', {
            method: 'POST',
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
window.abrirModalNovoCredenciamento = function() {
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
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:#94a3b8; padding:2rem;"><i class="ph ph-spinner ph-spin"></i> Carregando histórico...</td></tr>';
    
    try {
        const token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token');
        const res = await fetch('/api/logistica/credenciamentos', { headers: { 'Authorization': `Bearer ${token}` } });
        if (!res.ok) throw new Error('Falha ao carregar histórico');
        const data = await res.json();
        
        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:#94a3b8; padding:2rem;">Nenhum credenciamento gerado ainda.</td></tr>';
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
            const docsStr = docs.length > 0 ? docs.map(d => docNames[d] || d).join(', ') : 'Apenas cadastro';
            
            const colabsText = colabs.length > 0 
                ? colabs.map(c => `<span title="Documentos enviados: ${docsStr}" style="cursor:help; border-bottom:1px dotted #94a3b8;">• ${c.nome}</span>`).join('<br>') 
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
                    <button class="btn btn-outline" style="padding:4px 8px; font-size:12px; color:#dc2626; border-color:#fca5a5; background:#fff;" onclick="excluirCredenciamento('${cred.id}')" title="Excluir">
                        <i class="ph ph-trash"></i>
                    </button>
                </td>
            </tr>`;
        }).join('');
    } catch(e) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:#ef4444; padding:1rem;">Erro ao carregar histórico: ${e.message}</td></tr>`;
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
