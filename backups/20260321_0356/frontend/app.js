const API_URL = `${window.location.origin}/api`;

// Estado global
let currentUser = null;
let currentToken = null;
let currentDocs = [];
let viewedColaborador = null;

// --- INICIALIZAÇÃO E ROTAS BÁSICAS ---

const DOCS_DISPONIVEIS = [
    "Acordo Individual Benefícios", "Autorização Uso de Imagem", "Auxílio Combustível", 
    "Coca Cola Desconto", "Contrato Academia", "Contrato Faculdade", "Descrição de cargos", 
    "EPI", "Gerador Bloqueio Farmacia e mercado", "Gerador Desconto folha", 
    "Gerador Sorteio", "Intermitente", "NR01", "NR18", "Pedido Abertura de Conta", 
    "Terapia", "Termo de Acordo de Desligamento", "Termo de Confidencialidade", 
    "Termo de Responsabilidade Bilhete unico", "Termo de Responsabilidade Cracha", 
    "Termo de Responsabilidade de Celulares", "Termo de Responsabilidade de Chaves", 
    "Termo de Responsabilidade de Notebook", "Termo de Responsabilidade entrega de kit veicular", 
    "Termo de Responsabilidade Veículo"
];

document.addEventListener('DOMContentLoaded', () => {
    setupNavigation();
    
    // Auto-login bypass for dev
    currentUser = { username: 'admin', role: 'RH' };
    currentToken = 'mock_token';
    
    const nameEl = document.getElementById('logged-user-name');
    if (nameEl) nameEl.textContent = currentUser.username;
    
    const roleEl = document.getElementById('logged-user-role');
    if (roleEl) roleEl.textContent = currentUser.role;
    
    // Se o index.html novo estiver carregado, terá app-shell. Se estiver o antigo, não terá.
    const appShell = document.getElementById('app-shell');
    if (appShell) {
        showView('app-shell');
        navigateTo('dashboard');
    } else {
        // Fallback genérico caso o HTML seja o muito antigo ou não tenha app-shell
        console.warn('O elemento app-shell não foi encontrado. Interface antiga detectada ou HTML incompleto.');
        // Tentamos exibir o form-section se existir
        const formSection = document.querySelector('.form-section');
        if (formSection) formSection.style.display = 'block';
    }
});

const formLogin = document.getElementById('form-login');
if (formLogin) {
    formLogin.addEventListener('submit', async (e) => {
        e.preventDefault();
        currentUser = { username: 'admin', role: 'RH' };
        currentToken = 'mock_token';
        
        const nameEl = document.getElementById('logged-user-name');
        if (nameEl) nameEl.textContent = currentUser.username;
        
        const roleEl = document.getElementById('logged-user-role');
        if (roleEl) roleEl.textContent = currentUser.role;
        
        showView('app-shell');
        navigateTo('dashboard');
    });
}

const btnLogout = document.getElementById('btn-logout');
if (btnLogout) {
    btnLogout.addEventListener('click', (e) => {
        e.preventDefault();
        currentUser = null;
        currentToken = null;
        showView('view-login');
    });
}

function showView(viewId) {
    document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));
    const view = document.getElementById(viewId);
    if (view) {
        view.classList.add('active');
        view.style.display = 'block';
        if (viewId === 'app-shell') view.style.display = 'flex';
    }
}

function navigateTo(target) {
    document.querySelectorAll('.content-view').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    
    const targetView = document.getElementById(`view-${target}`);
    if (targetView) targetView.classList.add('active');
    
    const targetNav = document.querySelector(`[data-target="${target}"]`);
    if (targetNav) targetNav.classList.add('active');

    if (target === 'dashboard') {
        loadDashboard();
    } else if (target === 'colaboradores') {
        loadColaboradores();
    } else if (target === 'cargos') {
        toggleCargoView('list');
    } else if (target === 'departamentos') {
        loadDepartamentos();
    } else if (target === 'escalas') {
        loadEscalas();
    }
}

function setupNavigation() {
    document.querySelectorAll('.sidebar-nav .nav-item[data-target]').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            navigateTo(e.currentTarget.dataset.target);
        });
    });

    const btnNovoRapido = document.getElementById('btn-novo-rapido');
    if (btnNovoRapido) {
        btnNovoRapido.addEventListener('click', () => {
            resetFormColaborador();
            navigateTo('form-colaborador');
        });
    }
    
    const btnNovoColab = document.getElementById('btn-novo-colab');
    if (btnNovoColab) {
        btnNovoColab.addEventListener('click', () => {
            resetFormColaborador();
            navigateTo('form-colaborador');
        });
    }

    document.querySelectorAll('#tabs-list li').forEach(tab => {
        tab.addEventListener('click', (e) => {
            document.querySelectorAll('#tabs-list li').forEach(t => t.classList.remove('active'));
            e.target.classList.add('active');
            renderTabContent(e.target.dataset.tab, e.target.textContent);
        });
    });

    const colabAdmissao = document.getElementById('colab-admissao');
    if (colabAdmissao) {
        colabAdmissao.addEventListener('change', (e) => {
            updateProbationBadge(e.target.value);
        });
        colabAdmissao.addEventListener('input', (e) => {
            updateProbationBadge(e.target.value);
        });
    }

    const closeModal = document.querySelector('.close-modal');
    if (closeModal) {
        closeModal.addEventListener('click', () => {
            const modal = document.getElementById('doc-modal');
            if (modal) modal.style.display = 'none';
            const modalBody = document.getElementById('modal-doc-body');
            if (modalBody) modalBody.innerHTML = '';
        });
    }
}

// --- API METHODS ---
async function apiGet(endpoint) {
    try {
        const res = await fetch(`${API_URL}${endpoint}`, {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        if (!res.ok) throw new Error('Falha na requisição');
        return res.json();
    } catch(e) {
        console.error(e);
        return null;
    }
}

async function apiPost(endpoint, data) {
    const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 
            'Authorization': `Bearer ${currentToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    });
    return res.json();
}

async function apiPut(endpoint, data) {
    const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'PUT',
        headers: { 
            'Authorization': `Bearer ${currentToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    });
    return res.json();
}

async function apiDelete(endpoint) {
    const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${currentToken}` }
    });
    return res.json();
}

// --- CARGOS E DEPARTAMENTOS ---
async function loadCargos() {
    const cargos = await apiGet('/cargos');
    const tbody = document.getElementById('table-cargos-body');
    if (!tbody || !cargos) return;
    
    tbody.innerHTML = '';
    cargos.forEach(c => {
        tbody.innerHTML += `
            <tr>
                <td>${c.id}</td>
                <td style="font-weight: 600;">${c.nome}</td>
                <td style="text-align: right;">
                    <button type="button" class="btn btn-primary btn-sm" onclick="window.toggleCargoView('edit', ${c.id})">
                        <i class="ph ph-note-pencil"></i> Editar
                    </button>
                </td>
            </tr>
        `;
    });

    // Também popula o select do formulário de colaborador (para quando estiver cadastrando alguém)
    const selectColab = document.getElementById('colab-cargo');
    if (selectColab) {
        selectColab.innerHTML = '<option value="" selected disabled>Selecionar</option>';
        cargos.forEach(c => selectColab.innerHTML += `<option value="${c.nome}">${c.nome}</option>`);
    }
}

window.toggleCargoView = async function(mode, id = null) {
    const listContainer = document.getElementById('cargo-list-container');
    const formContainer = document.getElementById('cargo-form-container');
    const headerActions = document.getElementById('cargo-header-actions');
    const btnDelete = document.getElementById('btn-cargo-delete');
    
    // Esconder/Mostrar Containers
    if (mode === 'list') {
        if(listContainer) listContainer.style.display = 'block';
        if(formContainer) formContainer.style.display = 'none';
        if(headerActions) headerActions.style.display = 'none'; // Esconde botões no topo ao ver a lista
        loadCargos();
    } else {
        if(listContainer) listContainer.style.display = 'none';
        if(formContainer) formContainer.style.display = 'block';
        if(headerActions) headerActions.style.display = 'flex'; // Mostra botões no topo ao editar/criar
        
        if (mode === 'new') {
            document.getElementById('manage-cargo-id').value = '';
            document.getElementById('cargo-input-name').value = '';
            document.getElementById('cargo-form-label').textContent = 'Novo Cargo';
            if(btnDelete) btnDelete.style.display = 'none';
            renderCargoChecklist(null);  // null = sem cargo ainda, checkboxes desabilitados
            document.getElementById('cargo-input-name').focus();
        } else if (mode === 'edit' && id) {
            document.getElementById('manage-cargo-id').value = id;
            document.getElementById('cargo-form-label').textContent = 'Editar Cargo';
            if(btnDelete) btnDelete.style.display = 'block';
            
            const res = await fetch(`${API_URL}/cargos`, { headers: { 'Authorization': `Bearer ${currentToken}` } });
            const cargos = await res.json();
            const cargo = (cargos || []).find(c => c.id == id);
            
            if (cargo) {
                document.getElementById('cargo-input-name').value = cargo.nome;
                await renderCargoChecklist(id);  // carrega da nova tabela
                console.log(`Documentos carregados para cargo ${id}`);
            }
        }
    }
}

async function renderCargoChecklist(cargoId) {
    const checklist = document.getElementById('cargo-checklist-main');
    if (!checklist) return;
    checklist.innerHTML = '<p style="color:#94a3b8; font-size:0.85rem;">Carregando documentos...</p>';

    let documentosSalvos = [];
    if (cargoId) {
        try {
            const res = await fetch(`${API_URL}/cargos/${cargoId}/documentos`, {
                headers: { 'Authorization': `Bearer ${currentToken}` }
            });
            documentosSalvos = await res.json();
        } catch(e) { console.error('Erro ao carregar documentos:', e); }
    }

    checklist.innerHTML = '';
    DOCS_DISPONIVEIS.forEach(doc => {
        const checked = documentosSalvos.includes(doc) ? 'checked' : '';
        const disabled = cargoId ? '' : 'disabled';
        const cbId = `cb-doc-${doc.replace(/[^a-zA-Z0-9]/g, '_')}`;
        const label = document.createElement('label');
        label.style.cssText = 'display:flex; align-items:center; gap:8px; font-size:0.82rem; cursor:pointer; padding:0.35rem; border-radius:4px; border:1px solid transparent; transition:all 0.2s;';
        label.onmouseover = () => { label.style.background='#edf2f7'; label.style.borderColor='#cbd5e0'; };
        label.onmouseout = () => { label.style.background='transparent'; label.style.borderColor='transparent'; };
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.id = cbId;
        cb.className = 'cb-cargo-doc-main';
        cb.value = doc;
        if (checked) cb.checked = true;
        if (disabled) cb.disabled = true;
        cb.onchange = async function() {
            const currentCargoId = document.getElementById('manage-cargo-id').value;
            if (!currentCargoId) return;
            if (this.checked) {
                await fetch(`${API_URL}/cargos/${currentCargoId}/documentos`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${currentToken}` },
                    body: JSON.stringify({ documento: doc })
                });
            } else {
                await fetch(`${API_URL}/cargos/${currentCargoId}/documentos`, {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${currentToken}` },
                    body: JSON.stringify({ documento: doc })
                });
            }
        };
        label.appendChild(cb);
        label.appendChild(document.createTextNode(' ' + doc));
        checklist.appendChild(label);
    });
}

// Salvar apenas o nome do cargo (documentos são salvos por clique no checkbox)
async function handleCargoFormSubmit() {
    const id = document.getElementById('manage-cargo-id').value;
    const nomeInput = document.getElementById('cargo-input-name');
    const nome = (nomeInput ? nomeInput.value : '').trim();
    if (!nome) { alert('Informe o nome do cargo'); return; }

    try {
        if (id) {
            // Atualizar nome do cargo existente
            const r = await fetch(`${API_URL}/cargos/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${currentToken}` },
                body: JSON.stringify({ nome, documentos_obrigatorios: '' })
            });
            if (!r.ok) { const err = await r.json(); alert('Erro ao salvar: ' + (err.error || 'Erro')); return; }
        } else {
            // Criar novo cargo
            const res = await apiPost('/cargos', { nome, documentos_obrigatorios: '' });
            if (!res || res.error) { alert('Erro ao cadastrar: ' + (res?.error || 'Erro')); return; }
            // Agora temos o ID, atualizar o hidden field e habilitar os checkboxes
            document.getElementById('manage-cargo-id').value = res.id;
            await renderCargoChecklist(res.id);  // rerender com checkboxes habilitados
            alert('Cargo criado! Agora selecione os documentos exigidos.');
            return;
        }
        alert('Nome do cargo salvo!');
        toggleCargoView('list');
    } catch(err) {
        console.error('Erro ao salvar cargo:', err);
        alert('Erro de conexão ao salvar cargo.');
    }
}

window.saveCargoConfig = async function() {
    console.log('saveCargoConfig called');
    await handleCargoFormSubmit();
};

window.handleDeleteCargoUI = async function() {
    const id = document.getElementById('manage-cargo-id').value;
    const nome = document.getElementById('cargo-input-name').value;
    if(!id) return;

    if(nome.toUpperCase() === 'MOTORISTA') {
        alert('O cargo MOTORISTA é essencial para o sistema e não pode ser excluído.');
        return;
    }

    if(confirm('Tem certeza que deseja excluir este cargo?')) {
        const res = await apiDelete(`/cargos/${id}`);
        if(res && res.error) alert(res.error);
        else {
            toggleCargoView('list');
        }
    }
}





async function loadDepartamentos() {
    const deptos = await apiGet('/departamentos');
    const tbody = document.getElementById('table-departamentos');
    if (!tbody || !deptos) return;
    tbody.innerHTML = '';
    deptos.forEach(d => {
        tbody.innerHTML += `<tr>
            <td>${d.id}</td>
            <td>${d.nome}</td>
            <td>
                <button class="btn btn-secondary btn-sm" style="margin-right: 5px;" onclick="editDepartamento(${d.id}, '${d.nome}')" title="Editar"><i class="ph ph-pencil-simple"></i></button>
                <button class="btn btn-danger btn-sm" onclick="deleteDepartamento(${d.id})" title="Excluir"><i class="ph ph-trash"></i></button>
            </td>
        </tr>`;
    });
}

window.editDepartamento = async function(id, nomeAtual) {
    const novoNome = prompt('Editar nome do departamento:', nomeAtual);
    if (!novoNome || novoNome.trim() === '' || novoNome === nomeAtual) return;
    
    const res = await fetch(`${API_URL}/departamentos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${currentToken}` },
        body: JSON.stringify({ nome: novoNome.trim() })
    });
    const data = await res.json();
    if (data.error) alert(data.error);
    loadDepartamentos();
}

window.deleteDepartamento = async function(id) {
    if(confirm('Tem certeza que deseja excluir este departamento?')) {
        const res = await apiDelete(`/departamentos/${id}`);
        if(res && res.error) alert(res.error);
        loadDepartamentos();
    }
}

document.getElementById('form-departamento')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nome = document.getElementById('novo-departamento-nome').value;
    await apiPost('/departamentos', { nome });
    document.getElementById('novo-departamento-nome').value = '';
    loadDepartamentos();
});


// --- HELPER PARA ESCALAS NO FORMULÁRIO ---
window.toggleFormEscalaTipo = function() {
    const tipo = document.getElementById('colab-escala-padrao').value;
    const boxFolgas = document.getElementById('colab-box-folgas');
    const boxSabado = document.getElementById('colab-box-sabado');
    
    if (tipo === 'escala_duas_folgas') {
        if(boxFolgas) boxFolgas.style.display = 'block';
    } else {
        if(boxFolgas) boxFolgas.style.display = 'none';
        document.querySelectorAll('.cb-folga-colab').forEach(cb => cb.checked = false);
    }

    if(boxSabado) {
        if (tipo === 'padrao_sab_4h' || tipo === 'padrao_sab_alternado') {
            boxSabado.style.display = 'block';
        } else {
            boxSabado.style.display = 'none';
            document.getElementById('colab-sabado-entrada').value = '';
            document.getElementById('colab-sabado-saida').value = '';
        }
    }
    
    calcularHorarioSaida();
}

window.calcularHorarioSaida = function() {
    const tipo = document.getElementById('colab-escala-padrao').value;
    const entrada = document.getElementById('colab-entrada').value;
    const intEntrada = document.getElementById('colab-intervalo-entrada').value;
    const intSaida = document.getElementById('colab-intervalo-saida').value;
    const outSaida = document.getElementById('colab-saida');
    
    if (!tipo || !entrada) {
        if(outSaida) outSaida.value = '';
        return;
    }

    // Calcula duração do intervalo em minutos
    let intervaloMins = 0;
    if (intEntrada && intSaida) {
        const [h1, m1] = intEntrada.split(':').map(Number);
        const [h2, m2] = intSaida.split(':').map(Number);
        intervaloMins = (h2 * 60 + m2) - (h1 * 60 + m1);
        if (intervaloMins < 0) intervaloMins += 24 * 60;
    }

    // Define horas brutas de trabalho diário (sem intervalo)
    let workMins = 0;
    if (tipo === 'padrao_seis_dias') {
        workMins = 7 * 60 + 20; // 7h 20m
    } else if (tipo === 'padrao_sab_4h' || tipo === 'padrao_sab_alternado') {
        workMins = 8 * 60; // 8h
    } else if (tipo === 'escala_duas_folgas') {
        workMins = 8 * 60 + 48; // 8h 48m
    }

    if (workMins > 0) {
        const [he, me] = entrada.split(':').map(Number);
        let totalMins = (he * 60 + me) + workMins + intervaloMins;
        const hFinal = Math.floor(totalMins / 60) % 24;
        const mFinal = totalMins % 60;
        if(outSaida) outSaida.value = `${String(hFinal).padStart(2, '0')}:${String(mFinal).padStart(2, '0')}`;
    }

    // Sábado
    const sabEntrada = document.getElementById('colab-sabado-entrada').value;
    const outSabSaida = document.getElementById('colab-sabado-saida');
    if (sabEntrada && outSabSaida) {
        const [hse, mse] = sabEntrada.split(':').map(Number);
        let totalSabMins = (hse * 60 + mse) + (4 * 60);
        const hSabFinal = Math.floor(totalSabMins / 60) % 24;
        const mSabFinal = totalSabMins % 60;
    }
}

async function loadSelects() {
    loadCargos();
    const deptos = await apiGet('/departamentos');
    const selectDepto = document.getElementById('colab-departamento');
    if (selectDepto && deptos) {
        selectDepto.innerHTML = '<option value="" selected disabled>Selecionar</option>';
        deptos.forEach(d => selectDepto.innerHTML += `<option value="${d.nome}">${d.nome}</option>`);
    }
}

// --- DASHBOARD ---
async function loadDashboard() {
    const stats = await apiGet('/dashboard');
    if (!stats) return;
    
    const totalEl = document.getElementById('stat-total');
    if (totalEl) totalEl.textContent = stats.total || 0;
    
    const ativosEl = document.getElementById('stat-ativos');
    if (ativosEl) ativosEl.textContent = stats.ativos || 0;
    
    const feriasEl = document.getElementById('stat-ferias');
    if (feriasEl) feriasEl.textContent = stats.ferias || 0;
    
    const afastadosEl = document.getElementById('stat-afastados');
    if (afastadosEl) afastadosEl.textContent = stats.afastados || 0;
    
    const desligadosEl = document.getElementById('stat-desligados');
    if (desligadosEl) desligadosEl.textContent = stats.desligados || 0;
}

// --- COLABORADORES ---
async function loadColaboradores() {
    try {
        const wrapper = document.querySelector('#view-colaboradores .card');
        if (!wrapper) return;
        
        wrapper.innerHTML = '<div style="text-align:center; padding: 3rem;"><i class="ph ph-spinner ph-spin" style="font-size:2.5rem; color:var(--primary-color);"></i><p class="mt-3">Carregando lista...</p></div>';
        
        const response = await fetch(`${API_URL}/colaboradores`, { headers: { 'Authorization': `Bearer ${currentToken}` } });
        if (!response.ok) throw new Error('Falha na resposta do servidor');
        const lista = await response.json();
        
        renderColaboradores(lista);
    } catch(err) {
        console.error(err);
        const wrapper = document.querySelector('#view-colaboradores .card');
        if (wrapper) {
            wrapper.innerHTML = `<div style="text-align:center; padding: 3rem; color: var(--danger-color);"><i class="ph ph-warning" style="font-size:2.5rem;"></i><p class="mt-3">Erro ao carregar colaboradores. Verifique o servidor local e tente novamente.</p></div>`;
        }
    }
}

function renderColaboradores(lista) {
    const wrapper = document.querySelector('#view-colaboradores .card');
    if (!wrapper) return;

    if (!lista || lista.length === 0) {
        wrapper.innerHTML = `
            <div class="empty-state" style="text-align: center; padding: 4rem 1rem;">
                <i class="ph ph-users" style="font-size: 4rem; color: #ccc; margin-bottom: 1rem;"></i>
                <h3 style="color: var(--text-muted); margin-bottom: 1.5rem;">Nenhum colaborador cadastrado</h3>
                <button class="btn-action btn-parcial" onclick="resetFormColaborador(); navigateTo('colaboradores')">
                    <i class="ph ph-plus"></i> Adicionar Primeiro Colaborador
                </button>
            </div>
        `;
        return;
    }

    wrapper.innerHTML = `
        <div class="table-responsive">
            <table class="table">
                <thead>
                    <tr>
                        <th style="padding-left: 2rem;">Nome / Identificação</th>
                        <th>CPF</th>
                        <th>Cargo</th>
                        <th>Admissão</th>
                        <th>Status</th>
                        <th>Ações</th>
                    </tr>
                </thead>
                <tbody>
                    ${lista.map(c => {
                        const d = c.data_admissao ? new Date(c.data_admissao).toLocaleDateString('pt-BR') : '-';
                        let statusHtml = '';
                        if (c.status === 'Ativo') statusHtml = `<div style="background:#e8f5e9; color:#196b36; border: 2px solid #196b36; border-radius:20px; font-weight:600; padding:4px 12px; display:inline-flex; align-items:center; gap:4px; font-size:0.85rem;"><i class="ph ph-check-circle"></i> Ativo</div>`;
                        else if (c.status === 'Férias') statusHtml = `<div style="background:#fdf7e3; color:#c2aa72; border: 2px solid transparent; border-radius:20px; font-weight:600; padding:4px 12px; display:inline-flex; align-items:center; gap:4px; font-size:0.85rem;"><i class="ph ph-airplane-tilt"></i> Férias</div>`;
                        else if (c.status === 'Afastado') statusHtml = `<div style="background:#faeed9; color:#eaa15f; border: 2px solid transparent; border-radius:20px; font-weight:600; padding:4px 12px; display:inline-flex; align-items:center; gap:4px; font-size:0.85rem;"><i class="ph ph-warning"></i> Afastado</div>`;
                        else if (c.status === 'Desligado') statusHtml = `<div style="background:#fceeee; color:#ba7881; border: 2px solid transparent; border-radius:20px; font-weight:600; padding:4px 12px; display:inline-flex; align-items:center; gap:4px; font-size:0.85rem;"><i class="ph ph-x-circle"></i> Desligado</div>`;
                        else if (c.status === 'Incompleto') statusHtml = `<div style="background:#f8f9fa; color:#6c757d; border: 2px solid transparent; border-radius:20px; font-weight:600; padding:4px 12px; display:inline-flex; align-items:center; gap:4px; font-size:0.85rem;"><i class="ph ph-pencil-simple"></i> Incompleto</div>`;
                        else statusHtml = `<div style="background:#e8f5e9; color:#196b36; border: 2px solid #196b36; border-radius:20px; font-weight:600; padding:4px 12px; display:inline-flex; align-items:center; gap:4px; font-size:0.85rem;"><i class="ph ph-check-circle"></i> Ativo</div>`;

                        // Cálculo da Tag de Experiência Simplificado para a Tabela
                        let badgeHtml = '';
                        if (c.data_admissao) {
                            const adm = new Date(c.data_admissao + 'T12:00:00');
                            const today = new Date();
                            today.setHours(12,0,0,0);
                            const diffDays = Math.floor((today - adm) / (1000 * 60 * 60 * 24));
                            if (diffDays >= 0 && diffDays <= 45) badgeHtml = `<span class="probation-badge" style="font-size: 0.55rem; padding: 0.1rem 0.3rem; min-width: 45px; vertical-align: middle; margin-left: 5px;">1º 45</span>`;
                            else if (diffDays > 45 && diffDays <= 90) badgeHtml = `<span class="probation-badge second" style="font-size: 0.55rem; padding: 0.1rem 0.3rem; min-width: 45px; vertical-align: middle; margin-left: 5px;">2º 45</span>`;
                        }

                        // URL da foto com cache-busting
                        const photoUrl = `${API_URL}/colaboradores/foto/${c.id}?t=${Date.now()}`;
                        const fallbackIcon = `data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiNjYmQ1ZTEiIHN0cm9rZS13aWR0aD0iMS41IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxwYXRoIGQ9Ik0yMCAyMWE4IDggMCAwMC0xNiAwIi8+PGNpcmNsZSBjeD0iMTIiIGN5PSI3IiByPSI0Ii8+PC9zdmc+`;

                        return `
                            <tr>
                                <td style="padding-left: 1.5rem;">
                                    <div style="display: flex; align-items: center; gap: 0.75rem;">
                                        <div style="width: 36px; height: 36px; border-radius: 50%; overflow: hidden; border: 1px solid #e2e8f0; flex-shrink: 0; background: #f8fafc;">
                                            <img src="${photoUrl}" onerror="this.src='${fallbackIcon}'" style="width: 100%; height: 100%; object-fit: cover;">
                                        </div>
                                        <div style="display: flex; flex-direction: column;">
                                            <div style="display: flex; align-items: center;">
                                                <strong style="color: #334155; font-size: 0.95rem;">${c.nome_completo || 'Sem Nome'}</strong>
                                                ${badgeHtml}
                                            </div>
                                            <span style="font-size: 0.75rem; color: #94a3b8; margin-top: -2px;">ID: ${c.id}</span>
                                        </div>
                                    </div>
                                </td>
                                <td style="color: #64748b;">${c.cpf || '-'}</td>
                                <td style="color: #64748b;">${c.cargo || '-'}</td>
                                <td style="color: #64748b;">${d}</td>
                                <td>${statusHtml}</td>
                                <td>
                                    <div style="display: flex; gap: 0.4rem;">
                                        <button class="btn btn-warning btn-sm" onclick="editColaborador(${c.id})" title="Editar" style="padding: 0.4rem; width: 32px; height: 32px; justify-content: center;"><i class="ph ph-pencil-simple"></i></button>
                                        <button class="btn btn-primary btn-sm" onclick="openProntuario(${c.id}, '${(c.nome_completo || '').replace(/'/g, "\\'")}', '${(c.cargo || '').replace(/'/g, "\\'")}', '${c.cpf || ''}', '${c.sexo || ''}', '${c.data_admissao || ''}', '${c.status || ''}', '${c.rg_tipo || 'RG'}')" title="Prontuário Digital" style="padding: 0.4rem; width: 32px; height: 32px; justify-content: center; background: #2563eb;"><i class="ph ph-folder-open"></i></button>
                                        <button class="btn btn-danger btn-sm" onclick="deleteColaborador(${c.id}, ${c.status === 'Incompleto' ? 'true' : 'false'})" title="Excluir/Inativar" style="padding: 0.4rem; width: 32px; height: 32px; justify-content: center;"><i class="ph ph-x"></i></button>
                                    </div>
                                </td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>
    `;
}

window.deleteColaborador = async function(id, isStatusIncompleto = false) {
    let msg = '🚨 ATENÇÃO: Tem certeza que deseja inativar este colaborador?\n\nO status dele(a) será alterado para "Desligado" mantendo todos os arquivos intactos.';
    if (isStatusIncompleto) {
        msg = '🚨 ATENÇÃO: Este colaborador está INCOMPLETO. A exclusão irá DELETAR PERMANENTEMENTE todos os dados e eventuais arquivos já enviados. Deseja prosseguir?';
    }
    if(!confirm(msg)) return;
    try {
        const res = await fetch(`${API_URL}/colaboradores/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        if(res.ok) {
            loadColaboradores();
            loadDashboard();
        } else {
            alert('Falha ao inativar/excluir colaborador do sistema.');
        }
    } catch(e) { console.error(e); }
}

window.resetFormColaborador = function() {
    const form = document.getElementById('form-colaborador');
    if (form) form.reset();
    
    document.getElementById('colab-id').value = '';
    document.getElementById('form-colab-title').textContent = 'Cadastrar Colaborador';
    document.getElementById('conjuge-id').value = '';
    document.getElementById('section-conjuge').style.display = 'none';

    // CNH reset
    const sectionCnh = document.getElementById('section-cnh');
    if (sectionCnh) sectionCnh.style.display = 'none';
    if(document.getElementById('colab-cnh-numero')) document.getElementById('colab-cnh-numero').value = '';
    if(document.getElementById('colab-cnh-vencimento')) document.getElementById('colab-cnh-vencimento').value = '';
    if(document.getElementById('colab-cnh-categoria')) document.getElementById('colab-cnh-categoria').value = '';
    
    const novosCamposIds = [
        'colab-matricula-esocial', 'colab-local-nascimento', 'colab-rg-orgao', 'colab-rg-data',
        'colab-titulo', 'colab-titulo-zona', 'colab-titulo-secao',
        'colab-ctps', 'colab-ctps-serie', 'colab-ctps-uf', 'colab-ctps-data',
        'colab-pis', 'colab-cor-raca', 'colab-sexo', 'colab-grau-instrucao', 'colab-cbo',
        'colab-militar', 'colab-militar-categoria', 'colab-deficiencia',
        'colab-entrada', 'colab-saida', 'colab-intervalo-entrada', 'colab-intervalo-saida',
        'colab-sabado-entrada', 'colab-sabado-saida',
        'colab-fgts-opcao', 'colab-banco-nome', 'colab-banco-agencia', 'colab-banco-conta'
    ];
    novosCamposIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    
    if (document.getElementById('colab-rg-tipo')) {
        document.getElementById('colab-rg-tipo').value = 'RG';
        if (typeof toggleTipoDocumento === 'function') toggleTipoDocumento();
    }

    const titleEl = document.getElementById('form-colab-title');
    if (titleEl) titleEl.textContent = 'Cadastrar Colaborador';
    
    // Reset status badges (no longer used, but good to clean if they were there)
    const statusContainer = document.getElementById('status-chips-container');
    if (statusContainer) {
        statusContainer.querySelectorAll('.status-chip').forEach(c => c.classList.remove('active'));
        const activeChip = statusContainer.querySelector('[data-value="Ativo"]');
        if (activeChip) activeChip.classList.add('active');
    }

    if (document.getElementById('colab-escala-padrao')) {
        document.getElementById('colab-escala-padrao').value = '';
        if (typeof toggleFormEscalaTipo === 'function') toggleFormEscalaTipo();
    }
    
    document.querySelectorAll('.cb-folga-colab').forEach(cb => cb.checked = false);
    
    if (document.getElementById('colab-cnh-documento')) document.getElementById('colab-cnh-documento').value = '';
    if (document.getElementById('colab-cnh-doc-id')) document.getElementById('colab-cnh-doc-id').value = '';
    if (document.getElementById('cnh-status-text')) document.getElementById('cnh-status-text').style.display = 'none';
    if (document.getElementById('cnh-btn-label')) document.getElementById('cnh-btn-label').textContent = 'Escolher arquivo...';
    
    if (document.getElementById('conjuge-documento')) document.getElementById('conjuge-documento').value = '';
    if (document.getElementById('conjuge-status-text')) document.getElementById('conjuge-status-text').style.display = 'none';
    if (document.getElementById('conjuge-btn-label')) document.getElementById('conjuge-btn-label').textContent = 'Escolher arquivo...';

    // Refresh Dynamic Selects
    loadSelects();
    
    // Foto reset
    const stateNew = document.getElementById('photo-state-new');
    const stateUploadable = document.getElementById('photo-state-uploadable');
    const stateSaved = document.getElementById('photo-state-saved');
    const fotoPreview = document.getElementById('colab-foto-preview');
    const fotoInput = document.getElementById('colab-foto-input');
    
    if (stateNew) stateNew.style.display = 'flex';
    if (stateUploadable) stateUploadable.style.display = 'none';
    if (stateSaved) stateSaved.style.display = 'none';
    if (fotoPreview) { fotoPreview.style.display = 'none'; fotoPreview.src = ''; }
    if (fotoInput) fotoInput.disabled = true;
    document.getElementById('quick-docs-info').textContent = 'Salve o colaborador antes de adicionar arquivos.';
    
    checkQuickDocsState();
    const errorCpf = document.getElementById('cpf-error');
    if(errorCpf) errorCpf.style.display = 'none';
};

window.editColaborador = async function(id) {
    await loadSelects();
    const c = await apiGet(`/colaboradores/${id}`);
    if (!c) return;
    
    const docs = await apiGet(`/colaboradores/${id}/documentos`);
    currentDocs = docs || [];

    viewedColaborador = c;

    const titleEl = document.getElementById('form-colab-title');
    if (titleEl) titleEl.textContent = `Editar Colaborador #${c.id}`;
    
    document.getElementById('colab-id').value = c.id;
    document.getElementById('colab-nome').value = c.nome_completo || '';
    document.getElementById('colab-cpf').value = c.cpf || '';
    document.getElementById('colab-rg').value = c.rg || '';
    
    const rgTipoEl = document.getElementById('colab-rg-tipo');
    if (rgTipoEl) {
        rgTipoEl.value = c.rg_tipo || 'RG';
        if (typeof toggleTipoDocumento === 'function') toggleTipoDocumento();
    }
    
    if (c.data_nascimento) {
        document.getElementById('colab-nascimento').value = new Date(c.data_nascimento).toISOString().split('T')[0];
    } else {
        document.getElementById('colab-nascimento').value = '';
    }

    document.getElementById('colab-estadocivil').value = c.estado_civil || '';
    document.getElementById('colab-nacionalidade').value = c.nacionalidade || 'Brasileira';
    document.getElementById('colab-mae').value = c.nome_mae || '';
    document.getElementById('colab-pai').value = c.nome_pai || '';
    document.getElementById('colab-telefone').value = c.telefone || '';
    document.getElementById('colab-email').value = c.email || '';
    document.getElementById('colab-endereco').value = c.endereco || '';
    document.getElementById('colab-cargo').value = c.cargo || '';
    document.getElementById('colab-departamento').value = c.departamento || '';
    const admDate = c.data_admissao || c.admissao || '';
    document.getElementById('colab-admissao').value = admDate;
    updateProbationBadge(admDate);
    document.getElementById('colab-contrato').value = c.tipo_contrato || 'CLT';
    document.getElementById('colab-salario').value = c.salario || '';
    
    if (document.getElementById('colab-matricula-esocial')) document.getElementById('colab-matricula-esocial').value = c.matricula_esocial || '';
    if (document.getElementById('colab-local-nascimento')) document.getElementById('colab-local-nascimento').value = c.local_nascimento || '';
    if (document.getElementById('colab-rg-orgao')) document.getElementById('colab-rg-orgao').value = c.rg_orgao || '';
    if (document.getElementById('colab-rg-data')) document.getElementById('colab-rg-data').value = c.rg_data_emissao ? new Date(c.rg_data_emissao).toISOString().split('T')[0] : '';
    if (document.getElementById('colab-titulo')) document.getElementById('colab-titulo').value = c.titulo_eleitoral || '';
    if (document.getElementById('colab-titulo-zona')) document.getElementById('colab-titulo-zona').value = c.titulo_zona || '';
    if (document.getElementById('colab-titulo-secao')) document.getElementById('colab-titulo-secao').value = c.titulo_secao || '';
    if (document.getElementById('colab-ctps')) document.getElementById('colab-ctps').value = c.ctps_numero || '';
    if (document.getElementById('colab-ctps-serie')) document.getElementById('colab-ctps-serie').value = c.ctps_serie || '';
    if (document.getElementById('colab-ctps-uf')) document.getElementById('colab-ctps-uf').value = c.ctps_uf || '';
    if (document.getElementById('colab-ctps-data')) document.getElementById('colab-ctps-data').value = c.ctps_data_expedicao ? new Date(c.ctps_data_expedicao).toISOString().split('T')[0] : '';
    if (document.getElementById('colab-pis')) document.getElementById('colab-pis').value = c.pis || '';
    if (document.getElementById('colab-cor-raca')) document.getElementById('colab-cor-raca').value = c.cor_raca || '';
    if (document.getElementById('colab-sexo')) document.getElementById('colab-sexo').value = c.sexo || '';
    if (document.getElementById('colab-grau-instrucao')) document.getElementById('colab-grau-instrucao').value = c.grau_instrucao || '';
    // CBO: split stored value (e.g. '521105 - Vendedor') into code + description
    const cboFull = c.cbo || '';
    const cboParts = cboFull.match(/^(\S+)\s*-\s*(.+)$/);
    if (document.getElementById('colab-cbo-codigo')) document.getElementById('colab-cbo-codigo').value = cboParts ? cboParts[1] : cboFull;
    if (document.getElementById('colab-cbo')) document.getElementById('colab-cbo').value = cboParts ? cboParts[2] : '';
    if (!cboParts && cboFull) { if (document.getElementById('colab-cbo')) document.getElementById('colab-cbo').value = cboFull; }
    if (document.getElementById('colab-militar')) document.getElementById('colab-militar').value = c.certificado_militar || '';
    if (document.getElementById('colab-militar-categoria')) document.getElementById('colab-militar-categoria').value = c.militar_categoria || '';
    if (document.getElementById('colab-deficiencia')) document.getElementById('colab-deficiencia').value = c.deficiencia || '';
    if (document.getElementById('colab-horario-trabalho')) document.getElementById('colab-horario-trabalho').value = c.horario_trabalho || '';
    if (document.getElementById('colab-horario-intervalo')) document.getElementById('colab-horario-intervalo').value = c.horario_intervalo || '';
    if (document.getElementById('colab-fgts-opcao')) document.getElementById('colab-fgts-opcao').value = c.fgts_opcao ? new Date(c.fgts_opcao).toISOString().split('T')[0] : '';
    if (document.getElementById('colab-banco-nome')) document.getElementById('colab-banco-nome').value = c.banco_nome || '';
    if (document.getElementById('colab-banco-agencia')) document.getElementById('colab-banco-agencia').value = c.banco_agencia || '';
    document.getElementById('colab-banco-conta').value = c.banco_conta || '';
    
    if (document.getElementById('colab-meio-transporte')) document.getElementById('colab-meio-transporte').value = c.meio_transporte || '';
    if (document.getElementById('colab-valor-transporte')) {
        const valTransp = typeof c.valor_transporte === 'number' ? c.valor_transporte.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : (c.valor_transporte || '');
        document.getElementById('colab-valor-transporte').value = valTransp;
    }

    if (document.getElementById('colab-escala-padrao')) {
        document.getElementById('colab-escala-padrao').value = c.escala_tipo || '';
        
        // Povoar horários
        if(document.getElementById('colab-entrada')) document.getElementById('colab-entrada').value = c.horario_entrada || '';
        if(document.getElementById('colab-saida')) document.getElementById('colab-saida').value = c.horario_saida || '';
        if(document.getElementById('colab-intervalo-entrada')) document.getElementById('colab-intervalo-entrada').value = c.intervalo_entrada || '';
        if(document.getElementById('colab-intervalo-saida')) document.getElementById('colab-intervalo-saida').value = c.intervalo_saida || '';
        if(document.getElementById('colab-sabado-entrada')) document.getElementById('colab-sabado-entrada').value = c.sabado_entrada || '';
        if(document.getElementById('colab-sabado-saida')) document.getElementById('colab-sabado-saida').value = c.sabado_saida || '';

        toggleFormEscalaTipo();
        
        if (c.escala_folgas) {
            try {
                const folgasArr = JSON.parse(c.escala_folgas);
                document.querySelectorAll('.cb-folga-colab').forEach(cb => {
                    cb.checked = folgasArr.includes(cb.value);
                });
            } catch(e) { console.error('Erro ao ler folgas:', e); }
        }
    }
    
    
    if(document.getElementById('colab-cnh-numero')) document.getElementById('colab-cnh-numero').value = c.cnh_numero || '';

    if(document.getElementById('colab-cnh-categoria')) document.getElementById('colab-cnh-categoria').value = c.cnh_categoria || '';
    
    if(typeof toggleMotorista === 'function') toggleMotorista();
    
    if (c.cargo && c.cargo.toUpperCase().includes('MOTORISTA')) {
        // Apenas atualizar campos de texto, os documentos agora são via Prontuário
    }
    
    updateStatusChip(c.status || 'Ativo');
    
    if (c.estado_civil === 'Casado') {
        toggleConjuge(); // Display section
        const deps = await apiGet(`/colaboradores/${id}/dependentes`);
        const conjuge = deps ? deps.find(d => d.grau_parentesco === 'Cônjuge') : null;
        if (conjuge) {
            document.getElementById('conjuge-id').value = conjuge.id;
            document.getElementById('conjuge-nome').value = conjuge.nome || '';
            document.getElementById('conjuge-cpf').value = conjuge.cpf || '';
        }
    } else {
        toggleConjuge(); // Hide section
    }

    // Carregar Foto Preview e habilitar sem cache de disco
    const stateNew = document.getElementById('photo-state-new');
    const stateUploadable = document.getElementById('photo-state-uploadable');
    const stateSaved = document.getElementById('photo-state-saved');
    const fotoPreview = document.getElementById('colab-foto-preview');
    const fotoInput = document.getElementById('colab-foto-input');
    
    if (stateNew) stateNew.style.display = 'none';
    if (stateUploadable) stateUploadable.style.display = 'block';
    if (fotoInput) fotoInput.disabled = false;
    
    if (c.foto_path) {
        if (stateSaved) stateSaved.style.display = 'none';
        if (fotoPreview) {
            fotoPreview.style.display = 'block';
            fotoPreview.src = `${API_URL.replace('/api', '')}/${c.foto_path}?t=${Date.now()}`;
        }
    } else {
        if (stateSaved) stateSaved.style.display = 'flex';
        if (fotoPreview) {
            fotoPreview.style.display = 'none';
            fotoPreview.src = '';
        }
    }
    
    checkQuickDocsState();
    
    document.getElementById('form-colab-title').textContent = 'Editar Colaborador';
    navigateTo('form-colaborador');
};

const formColab = document.getElementById('form-colaborador');
if (formColab) {
    formColab.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const id = document.getElementById('colab-id').value;
        const nomeInput = document.getElementById('colab-nome');
        const cpfInput = document.getElementById('colab-cpf');
        const estadoCivilInput = document.getElementById('colab-estadocivil');
        const statusInput = document.getElementById('colab-status');
        const conjNome = document.getElementById('conjuge-nome').value;
        const conjCpf = document.getElementById('conjuge-cpf').value;
        const conjId = document.getElementById('conjuge-id').value;

        const isPartial = e.submitter && e.submitter.id === 'btn-salvar-parcial';

        // Validações obrigatórias
        if (!isPartial) {
            if (cpfInput && cpfInput.value.replace(/\D/g, '').length < 11) {
                alert("CPF do Colaborador inválido ou incompleto.");
                return;
            }
            
            if (estadoCivilInput.value === 'Casado' || estadoCivilInput.value === 'União Estável') {
                if (!conjNome || !conjCpf) {
                    alert('Por favor, preencha os dados obrigatórios do cônjuge (Nome e CPF).');
                    return;
                }
                if (conjCpf.replace(/\D/g, '').length < 11) {
                    alert('CPF do Cônjuge inválido ou incompleto.');
                    return;
                }
            }
        }

        const submitter = e.submitter;
        let originalText = '';
        if (submitter) {
            originalText = submitter.innerHTML;
            submitter.disabled = true;
            submitter.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Salvando...';
        }

        const data = {
            nome_completo: nomeInput ? nomeInput.value : '',
            cpf: cpfInput ? cpfInput.value : '',
            rg: document.getElementById('colab-rg').value,
            data_nascimento: document.getElementById('colab-nascimento').value,
            estado_civil: estadoCivilInput ? estadoCivilInput.value : '',
            nacionalidade: document.getElementById('colab-nacionalidade').value,
            nome_mae: document.getElementById('colab-mae').value,
            nome_pai: document.getElementById('colab-pai').value,
            telefone: document.getElementById('colab-telefone').value,
            email: document.getElementById('colab-email').value,
            endereco: document.getElementById('colab-endereco').value,
            cargo: document.getElementById('colab-cargo').value,
            departamento: document.getElementById('colab-departamento').value,
            data_admissao: document.getElementById('colab-admissao').value,
            tipo_contrato: document.getElementById('colab-contrato').value,
            salario: document.getElementById('colab-salario').value,
            status: statusInput ? statusInput.value : '',
            contato_emergencia_nome: document.getElementById('colab-emergencia-nome').value,
            contato_emergencia_telefone: document.getElementById('colab-emergencia-telefone').value,
            cnh_numero: document.getElementById('colab-cnh-numero') ? document.getElementById('colab-cnh-numero').value : null,
            cnh_categoria: document.getElementById('colab-cnh-categoria') ? document.getElementById('colab-cnh-categoria').value : null,
            matricula_esocial: document.getElementById('colab-matricula-esocial') ? document.getElementById('colab-matricula-esocial').value : null,
            local_nascimento: document.getElementById('colab-local-nascimento') ? document.getElementById('colab-local-nascimento').value : null,
            rg_orgao: document.getElementById('colab-rg-orgao') ? document.getElementById('colab-rg-orgao').value : null,
            rg_data_emissao: document.getElementById('colab-rg-data') ? document.getElementById('colab-rg-data').value : null,
            rg_tipo: document.getElementById('colab-rg-tipo') ? document.getElementById('colab-rg-tipo').value : 'RG',
            titulo_eleitoral: document.getElementById('colab-titulo') ? document.getElementById('colab-titulo').value : null,
            titulo_zona: document.getElementById('colab-titulo-zona') ? document.getElementById('colab-titulo-zona').value : null,
            titulo_secao: document.getElementById('colab-titulo-secao') ? document.getElementById('colab-titulo-secao').value : null,
            ctps_numero: document.getElementById('colab-ctps') ? document.getElementById('colab-ctps').value : null,
            ctps_serie: document.getElementById('colab-ctps-serie') ? document.getElementById('colab-ctps-serie').value : null,
            ctps_uf: document.getElementById('colab-ctps-uf') ? document.getElementById('colab-ctps-uf').value : null,
            ctps_data_expedicao: document.getElementById('colab-ctps-data') ? document.getElementById('colab-ctps-data').value : null,
            pis: document.getElementById('colab-pis') ? document.getElementById('colab-pis').value : null,
            cor_raca: document.getElementById('colab-cor-raca') ? document.getElementById('colab-cor-raca').value : null,
            sexo: document.getElementById('colab-sexo') ? document.getElementById('colab-sexo').value : null,
            grau_instrucao: document.getElementById('colab-grau-instrucao') ? document.getElementById('colab-grau-instrucao').value : null,
            cbo: (function() {
                const code = document.getElementById('colab-cbo-codigo') ? document.getElementById('colab-cbo-codigo').value : '';
                const desc = document.getElementById('colab-cbo') ? document.getElementById('colab-cbo').value : '';
                return (code && desc) ? `${code} - ${desc}` : (code || desc);
            })(),
            certificado_militar: document.getElementById('colab-militar') ? document.getElementById('colab-militar').value : null,
            militar_categoria: document.getElementById('colab-militar-categoria') ? document.getElementById('colab-militar-categoria').value : null,
            deficiencia: document.getElementById('colab-deficiencia') ? document.getElementById('colab-deficiencia').value : null,
            horario_entrada: document.getElementById('colab-entrada') ? document.getElementById('colab-entrada').value : null,
            horario_saida: document.getElementById('colab-saida') ? document.getElementById('colab-saida').value : null,
            intervalo_entrada: document.getElementById('colab-intervalo-entrada') ? document.getElementById('colab-intervalo-entrada').value : null,
            intervalo_saida: document.getElementById('colab-intervalo-saida') ? document.getElementById('colab-intervalo-saida').value : null,
            sabado_entrada: document.getElementById('colab-sabado-entrada') ? document.getElementById('colab-sabado-entrada').value : null,
            sabado_saida: document.getElementById('colab-sabado-saida') ? document.getElementById('colab-sabado-saida').value : null,
            fgts_opcao: document.getElementById('colab-fgts-opcao') ? document.getElementById('colab-fgts-opcao').value : null,
            banco_nome: document.getElementById('colab-banco-nome') ? document.getElementById('colab-banco-nome').value : null,
            banco_agencia: document.getElementById('colab-banco-agencia') ? document.getElementById('colab-banco-agencia').value : null,
            banco_conta: document.getElementById('colab-banco-conta') ? document.getElementById('colab-banco-conta').value : null,
            escala_tipo: document.getElementById('colab-escala-padrao') ? document.getElementById('colab-escala-padrao').value : null,
            escala_folgas: null,
            meio_transporte: document.getElementById('colab-meio-transporte') ? document.getElementById('colab-meio-transporte').value : null,
            valor_transporte: document.getElementById('colab-valor-transporte') ? document.getElementById('colab-valor-transporte').value : null
        };

        // Converter valores formatados (R$) para números antes de enviar
        const parseMoeda = (v) => {
            if (!v || typeof v !== 'string') return v;
            const clean = v.replace(/[^\d,]/g, "").replace(",", ".");
            return clean ? parseFloat(clean) : null;
        };
        data.salario = parseMoeda(data.salario);
        data.valor_transporte = parseMoeda(data.valor_transporte);

        if (data.escala_tipo === 'escala_duas_folgas' && !isPartial) {
            const folgas = Array.from(document.querySelectorAll('.cb-folga-colab:checked')).map(cb => cb.value);
            if (folgas.length !== 2) {
                alert('Atenção: Para o esquema 5x2 (Revezamento), você deve marcar *exatamente 2 dias* de folga na lista.');
                btnRestorer();
                return;
            }
            data.escala_folgas = JSON.stringify(folgas);
        } else if (data.escala_tipo && data.escala_tipo !== 'escala_duas_folgas') {
            data.escala_folgas = JSON.stringify(['Dom']); // Padrão para as outras escalas
        }

        const btnRestorer = () => {
            if (submitter) {
                submitter.disabled = false;
                submitter.innerHTML = originalText;
            }
        };

        let c_status = statusInput ? statusInput.value : '';
        if (isPartial) {
            c_status = 'Incompleto';
        } else if (c_status === 'Incompleto') {
            c_status = 'Ativo';
        }
        data.status = c_status;

        // VALIDAÇÃO FRONT-END (MÍNIMO)
        if (!data.nome_completo || data.nome_completo.trim() === '') {
            alert('Preenchimento Obrigatório: O campo "Nome Completo" não pode ficar vazio.');
            btnRestorer();
            return;
        }
        
        if (!data.cpf || data.cpf.trim() === '') {
            alert('Preenchimento Obrigatório: O campo "CPF" não pode ficar vazio.');
            btnRestorer();
            return;
        }

        // Validação de Motorista
        if (data.cargo && data.cargo.toUpperCase().includes('MOTORISTA')) {
            if (!isPartial) {
                if (!data.cnh_numero || !data.cnh_categoria) {
                    alert('Preenchimento Obrigatório: Dados da CNH (Número e Categoria) para Motorista não podem ficar vazios.');
                    btnRestorer();
                    return;
                }
                if (data.cnh_numero.length < 11) {
                    alert('Preenchimento Obrigatório: O número da CNH deve conter 11 dígitos exatos.');
                    btnRestorer();
                    return;
                }
            }
        }

        try {
            let colabId = id;
            if (id) {
                const res = await apiPut(`/colaboradores/${id}`, data);
                if (res.error) throw new Error(res.error);
                colabId = id; // Ensure colabId is set for photo upload
            } else {
                const res = await apiPost('/colaboradores', data);
                if (res.error) throw new Error(res.error);
                if (res && res.id) colabId = res.id;
            }

            // Handle Cônjuge
            if ((data.estado_civil === 'Casado' || data.estado_civil === 'União Estável') && colabId) {
                const conjBody = { colaborador_id: colabId, nome: conjNome, cpf: conjCpf, grau_parentesco: 'Cônjuge' };
                if (conjId) {
                    await fetch(`${API_URL}/dependentes/${conjId}`, {
                        method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${currentToken}` }, body: JSON.stringify(conjBody)
                    });
                } else {
                    await fetch(`${API_URL}/dependentes`, {
                        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${currentToken}` }, body: JSON.stringify(conjBody)
                    });
                }
            } else if (conjId) {
                // Remove conjuge link if changed status
                await fetch(`${API_URL}/dependentes/${conjId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${currentToken}` }});
                document.getElementById('conjuge-id').value = '';
            }

            alert('Colaborador salvo com sucesso!');
            navigateTo('dashboard');

        } catch(err) {
            console.error(err);
            alert('Erro: ' + (err.message || 'Falha desconhecida.'));

        } finally {
            if (submitter) {
                submitter.disabled = false;
                submitter.innerHTML = originalText;
            }
        }
    });
}

window.openProntuarioFromCurrentForm = function() {
    const id = document.getElementById('colab-id').value;
    const nome = document.getElementById('colab-nome').value;
    const cargo = document.getElementById('colab-cargo').value;
    const cpf = document.getElementById('colab-cpf').value;
    const sexo = document.getElementById('colab-sexo').value;
    const admissao = document.getElementById('colab-admissao') ? document.getElementById('colab-admissao').value : '';
    const statusEl = document.getElementById('colab-status');
    const status = statusEl ? statusEl.value : '';
    const rgTipoEl = document.getElementById('colab-rg-tipo');
    const rgTipo = rgTipoEl ? rgTipoEl.value : 'RG';
    if (!id) { alert('Salve o colaborador primeiro.'); return; }
    window.openProntuario(id, nome, cargo, cpf, sexo, admissao, status, rgTipo);
}

// --- PRONTUÁRIO DIGITAL ---
window.openProntuario = async function(id, nome, cargo, cpf, sexo = '', admissao = '', status = '', rgTipo = 'RG') {
    // Buscar dados atualizados para garantir que temos o foto_path correto
    const c = await apiGet(`/colaboradores/${id}`);
    viewedColaborador = c || { id, nome, cargo, cpf, sexo, admissao, status, rgTipo };
    
    const admission = viewedColaborador.data_admissao || viewedColaborador.admissao || admissao;
    updateProbationBadge(admission);
    
    const nomeEl = document.getElementById('prontuario-nome-title');
    if (nomeEl) nomeEl.textContent = viewedColaborador.nome_completo || nome || 'Colaborador';
    
    const cargoEl = document.getElementById('prontuario-cargo-info');
    if (cargoEl) cargoEl.textContent = `${viewedColaborador.cargo || cargo || 'Sem Cargo'} | CPF: ${viewedColaborador.cpf || cpf || ''}`;
    
    // Status Badge
    const statusDisplay = document.getElementById('prontuario-status-display');
    if (statusDisplay) {
        const s = viewedColaborador.status || status || 'Ativo';
        let statusHtml = '';
        if (s === 'Ativo') statusHtml = `<div style="background:#e8f5e9; color:#196b36; border: 1px solid #196b36; border-radius:20px; font-weight:600; padding:2px 10px; font-size:0.75rem; display:inline-flex; align-items:center; gap:4px;"><i class="ph ph-check-circle"></i> Ativo</div>`;
        else if (s === 'Férias') statusHtml = `<div style="background:#fdf7e3; color:#c2aa72; border: 1px solid #c2aa72; border-radius:20px; font-weight:600; padding:2px 10px; font-size:0.75rem; display:inline-flex; align-items:center; gap:4px;"><i class="ph ph-airplane-tilt"></i> Férias</div>`;
        else if (s === 'Afastado') statusHtml = `<div style="background:#faeed9; color:#eaa15f; border: 1px solid #eaa15f; border-radius:20px; font-weight:600; padding:2px 10px; font-size:0.75rem; display:inline-flex; align-items:center; gap:4px;"><i class="ph ph-warning"></i> Afastado</div>`;
        else if (s === 'Desligado') statusHtml = `<div style="background:#fceeee; color:#ba7881; border: 1px solid #ba7881; border-radius:20px; font-weight:600; padding:2px 10px; font-size:0.75rem; display:inline-flex; align-items:center; gap:4px;"><i class="ph ph-x-circle"></i> Desligado</div>`;
        statusDisplay.innerHTML = statusHtml;
    }

    // Foto no Prontuário
    const fotoImg = document.getElementById('prontuario-foto-img');
    const fotoPlaceholder = document.getElementById('prontuario-photo-placeholder');
    if (fotoImg && fotoPlaceholder) {
        if (viewedColaborador.foto_path) {
            fotoImg.src = `${API_URL.replace('/api', '')}/${viewedColaborador.foto_path}?t=${Date.now()}`;
            fotoImg.style.display = 'block';
            fotoPlaceholder.style.display = 'none';
        } else {
            fotoImg.style.display = 'none';
            fotoPlaceholder.style.display = 'flex';
        }
    }

    document.querySelectorAll('#tabs-list li').forEach(t => t.classList.remove('active'));
    const firstTab = document.querySelector('#tabs-list li[data-tab="00.CheckList"]');
    if (firstTab) firstTab.classList.add('active');
    
    navigateTo('prontuario');
    await loadDocumentosList();
    window.renderTabContent('00.CheckList', '00. CheckList');
};

window.uploadFotoProntuario = async function(input) {
    if (!input.files || !input.files[0] || !viewedColaborador) return;
    const file = input.files[0];
    const colabId = viewedColaborador.id;
    
    const formData = new FormData();
    formData.append('foto', file);
    formData.append('nome', viewedColaborador.nome_completo || ''); // Adicionado nome para o backend criar pasta
    
    try {
        const response = await fetch(`${API_URL}/upload-foto/${colabId}`, {
            method: 'POST',
            body: formData,
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        
        if (response.ok) {
            // Recarregar prontuário para atualizar foto
            const updated = await apiGet(`/colaboradores/${colabId}`);
            if (updated) {
                viewedColaborador = updated;
                const fotoImg = document.getElementById('prontuario-foto-img');
                const fotoPlaceholder = document.getElementById('prontuario-photo-placeholder');
                if (fotoImg && fotoPlaceholder) {
                    fotoImg.src = `${API_URL.replace('/api', '')}/${updated.foto_path}?t=${Date.now()}`;
                    fotoImg.style.display = 'block';
                    fotoPlaceholder.style.display = 'none';
                }
            }
        } else {
            alert('Erro ao atualizar foto.');
        }
    } catch (err) {
        console.error(err);
        alert('Erro na conexão ao enviar foto.');
    }
};

async function loadDocumentosList() {
    if (!viewedColaborador) return;
    const docs = await apiGet(`/colaboradores/${viewedColaborador.id}/documentos`);
    currentDocs = docs || [];
}

const FIXED_DOCS = {
    'Contratos': [
        'Acordo de auxílio combustível', 'Acordo de benefícios', 'Acordo de compensação de horas', 
        'Acordo de prorrogação de horas', 'Autorização para pagamento em conta', 'Autorização uso de imagem', 
        'Contrato de trabalho', 'Contrato e-Social', 'Contrato faculdade', 'Declaração de encargos IR', 
        'Desconto coca-cola', 'Ficha de registro', 'Ficha salário família', 'Regras sorteio 25', 
        'Solicitação de VT', 'Termo de confidencialidade e sigilo', 'Termo de consentimento de dados pessoais', 
        'Termo de responsabilidade', 'Termo recebimento de notebook'
    ],
    'ASO': ['ASO Padrão'],
    'Ficha de EPI': ['Ficha de EPI Assinada'],
    'Multas': ['Contrato de Responsabilidade com o Veículo']
};

function getFichaCadastralDocs() {
    const isMotorista = viewedColaborador && (viewedColaborador.cargo || '').toUpperCase().includes('MOTORISTA');
    const isMasc = viewedColaborador && viewedColaborador.sexo === 'Masculino';
    const rgTipoInput = document.getElementById('colab-rg-tipo');
    const rgTipo = (viewedColaborador && viewedColaborador.rg_tipo) ? viewedColaborador.rg_tipo : (rgTipoInput ? rgTipoInput.value : 'RG');
    
    const docs = [
        "Comprovante de endereço",
        "Título Eleitoral",
        "Carteira de vacinação",
        "Currículo",
        "CTPS digital"
    ];
    
    if (isMasc) docs.push("Reservista");
    
    if (isMotorista) {
        docs.push("CNH");
    } else {
        if (rgTipo === 'CIN') docs.push("CIN-CPF");
        else docs.push("RG-CPF");
    }
    
    return docs;
}

function getAnosAdmissaoOptions(selectedYear = null) {
    const anoAtual = new Date().getFullYear();
    let anoInicio = anoAtual;
    if (viewedColaborador) {
        const admDate = viewedColaborador.data_admissao || viewedColaborador.admissao;
        if (admDate) {
            const adm = new Date(admDate + 'T12:00:00');
            if (!isNaN(adm.getFullYear())) anoInicio = adm.getFullYear();
        }
    }
    let optionsHtml = '';
    const targetYear = selectedYear ? String(selectedYear).replace(/'/g, '').trim() : String(anoAtual);
    
    for (let a = anoAtual; a >= anoInicio; a--) {
        optionsHtml += `<option value="${a}"${String(a) === targetYear ? ' selected' : ''}>${a}</option>`;
    }
    return optionsHtml;
}

window.renderTemporalTab = function(listContainer, tabId, tabTitle) {
    const safeTabId = tabId.replace(/[^a-zA-Z0-9]/g, '_');
    const selId = `temporal_year_${safeTabId}`;
    const selected = (window.tabPersistence && window.tabPersistence[selId]) ? window.tabPersistence[selId] : null;
    const optionsHtml = getAnosAdmissaoOptions(selected);
    
    const selectorHtml = `
        <div class="card p-3 mb-4 bg-light" style="display:flex; gap:1.5rem; align-items:center;">
            <label style="margin:0; font-weight:600;">Ano referente:</label>
            <select id="temporal_year_${safeTabId}" class="form-control" style="padding:0.4rem; max-width:120px;" onchange="renderTemporalAno('${tabId}')">
                ${optionsHtml}
            </select>
        </div>
        <div id="temporal_ano_container_${safeTabId}"></div>
    `;
    listContainer.innerHTML = selectorHtml;
    renderTemporalAno(tabId);
}

window.renderTemporalAno = function(tabId) {
    const safeTabId = tabId.replace(/[^a-zA-Z0-9]/g, '_');
    const yEl = document.getElementById(`temporal_year_${safeTabId}`);
    const y = yEl ? yEl.value : new Date().getFullYear().toString();
    const container = document.getElementById(`temporal_ano_container_${safeTabId}`);
    if (!container) return;
    container.innerHTML = '';

    const docsToUse = currentDocs.filter(d => d.tab_name === tabId && d.year == y);
    
    // Se for uma aba com documentos fixos, carregar slots fixos primeiro
    if (FIXED_DOCS[tabId]) {
        FIXED_DOCS[tabId].forEach(docType => {
            const existing = docsToUse.find(d => d.document_type === docType);
            container.appendChild(createDocSlot(tabId, docType, existing, `'${y}'`));
        });
        // Docs extras do mesmo ano
        docsToUse.filter(d => !FIXED_DOCS[tabId].includes(d.document_type)).forEach(d => {
            container.appendChild(createDocSlot(tabId, d.document_type, d, `'${y}'`));
        });
    } else {
        docsToUse.forEach(d => {
            container.appendChild(createDocSlot(tabId, d.document_type, d, `'${y}'`));
        });
    }

    container.appendChild(document.createElement('hr'));
    const form = createDynamicUploadForm(tabId, `Adicionar em ${tabId}`, '');
    const fileInput = form.querySelector('input[type="file"]');
    fileInput.onchange = function() {
        const typeIn = form.querySelector('input[type="text"]').value || 'Documento';
        uploadDocument(this, tabId, typeIn, `'${y}'`, null, null);
    };
    container.appendChild(form);
}


window.renderTabContent = function(tabId, tabTitle) {
    const container = document.getElementById('tab-dynamic-content');
    if (!container) return;
    
    // Capturar filtros existentes ANTES de limpar o container
    if (!window.tabPersistence) window.tabPersistence = {};
    container.querySelectorAll('select').forEach(sel => {
        if (sel.id) window.tabPersistence[sel.id] = sel.value;
    });

    const filterHtml = `
        <div id="docs-top-bar" class="flex-between mb-4 pb-3 border-bottom" style="align-items: center; gap: 2rem; flex-wrap: wrap;">
            <h3 id="current-tab-title" style="margin:0; font-size: 1.25rem; font-weight: 700; color: var(--text-main); min-width: 200px;">${tabTitle}</h3>
            
            <div style="display: flex; align-items: center; gap: 1.5rem; flex: 1; justify-content: flex-end;">
                <!-- Busca -->
                <div style="flex: 1; max-width: 400px; display: flex; align-items: center; gap: 0.75rem; background: #f8fafc; padding: 0.5rem 1rem; border-radius: 8px; border: 1px solid #e2e8f0; transition: border-color 0.2s;" onfocusin="this.style.borderColor='var(--primary-color)'" onfocusout="this.style.borderColor='#e2e8f0'">
                    <i class="ph ph-magnifying-glass" style="color: #94a3b8;"></i>
                    <input type="text" id="doc-search-input" placeholder="Pesquisar documento..." oninput="renderTabContent('${tabId}', '${tabTitle}')" 
                           style="border:none; outline:none; width:100%; font-size:0.9rem; font-family:inherit; background: transparent;" value="${document.getElementById('doc-search-input')?.value || ''}">
                </div>
            </div>
        </div>
        <div id="docs-list-container"></div>
    `;
    container.innerHTML = filterHtml;

    // Focar no final do input se houver texto para não perder o cursor na re-renderização
    const searchInput = document.getElementById('doc-search-input');
    if (searchInput && searchInput.value) {
        searchInput.focus();
        searchInput.setSelectionRange(searchInput.value.length, searchInput.value.length);
    }
    const listContainer = document.getElementById('docs-list-container');
    
    // Capturar valores dos filtros
    const searchTerm = document.getElementById('doc-search-input')?.value.toLowerCase() || '';
    const sortOrder = document.getElementById('doc-sort-select')?.value || 'recent';

    // Filtragem e Ordenação dos dados
    let filteredDocs = currentDocs.filter(d => d.tab_name === tabId);
    
    // Filtro de Texto
    if (searchTerm) {
        filteredDocs = filteredDocs.filter(d => d.document_type.toLowerCase().includes(searchTerm) || (d.file_name && d.file_name.toLowerCase().includes(searchTerm)));
    }

    // Ordenação
    filteredDocs.sort((a, b) => {
        if (sortOrder === 'alpha') return a.document_type.localeCompare(b.document_type);
        const dateA = new Date(a.upload_date || 0);
        const dateB = new Date(b.upload_date || 0);
        return sortOrder === 'recent' ? dateB - dateA : dateA - dateB;
    });

    if (tabId === '00.CheckList') {
        renderCargoDocsChecklist(listContainer);
    } else if (tabId === 'ASO') {
        renderASOTab(listContainer, filteredDocs);
    } else if (['Advertências', 'Atestados', 'Avaliação', 'Ficha de EPI', 'Multas', 'Boletim de ocorrência', 'Certificados'].includes(tabId)) {
        const isMotorista = viewedColaborador && (viewedColaborador.cargo || '').toUpperCase().includes('MOTORISTA');
        if (['Multas', 'Boletim de ocorrência'].includes(tabId) && !isMotorista) {
            listContainer.innerHTML = '<div class="alert alert-info"><i class="ph ph-info"></i> Esta aba está disponível apenas para colaboradores com cargo de Motorista.</div>';
            return;
        }
        renderTemporalTab(listContainer, tabId, tabTitle);
    } else if (tabId === '01.Ficha Cadastral') {
        const fixed = getFichaCadastralDocs();
        fixed.forEach(docType => {  
            if (!searchTerm || docType.toLowerCase().includes(searchTerm)) {
                const existingDoc = filteredDocs.find(d => d.document_type === docType);
                listContainer.appendChild(createDocSlot(tabId, docType, existingDoc));
            }
        });
        filteredDocs.filter(d => !fixed.includes(d.document_type)).forEach(d => {
            listContainer.appendChild(createDocSlot(tabId, d.document_type, d));
        });
        listContainer.appendChild(document.createElement('hr'));
        listContainer.appendChild(createDynamicUploadForm(tabId, 'Adicionar Outro Documento'));
    } else if (tabId === 'Pagamentos') {
        renderPagamentosTab(listContainer, tabId, filteredDocs);
    } else if (tabId === 'Terapia') {
        renderTerapiaTab(listContainer, tabId, filteredDocs);
    } else if (tabId === 'Dependentes' || tabId === 'Treinamento' || tabId === 'Conjuge') {
        if (tabId === 'Conjuge') {
            const isCasado = viewedColaborador && (viewedColaborador.estado_civil === 'Casado');
            if (!isCasado) {
                listContainer.innerHTML = '<div class="alert alert-info"><i class="ph ph-info"></i> Esta aba está disponível apenas para colaboradores com estado civil <strong>"Casado(a)"</strong> registrado.</div>';
                return;
            }
        }
        const btnLabelMap = { 'Dependentes': 'Documento de Dependente', 'Treinamento': 'Certificado/Curso', 'Conjuge': 'Documento do Cônjuge' };
        const form = createDynamicUploadForm(tabId, `Adicionar ${btnLabelMap[tabId] || tabId}`);
        listContainer.appendChild(form);
        listContainer.appendChild(document.createElement('hr'));
        filteredDocs.forEach(d => {
            listContainer.appendChild(createDocSlot(tabId, d.document_type, d));
        });
    } else if (FIXED_DOCS[tabId]) {
        FIXED_DOCS[tabId].forEach(docType => {
            if (!searchTerm || docType.toLowerCase().includes(searchTerm)) {
                if (tabId === 'Contratos' && docType === 'Acordo de auxílio combustível') {
                    const meio = (viewedColaborador && viewedColaborador.meio_transporte) ? viewedColaborador.meio_transporte.toLowerCase() : '';
                    if (meio === 'vale transporte') {
                        const existingDoc = filteredDocs.find(d => d.document_type === docType);
                        const msg = 'Não aplicável para usuários de Vale Transporte.';
                        listContainer.appendChild(createDocSlot(tabId, docType, existingDoc, null, null, msg));
                        return;
                    }
                }
                const existingDoc = filteredDocs.find(d => d.document_type === docType);
                listContainer.appendChild(createDocSlot(tabId, docType, existingDoc));
            }
        });
        filteredDocs.filter(d => !FIXED_DOCS[tabId].includes(d.document_type)).forEach(d => {
            listContainer.appendChild(createDocSlot(tabId, d.document_type, d));
        });
    } else {
        const form = createDynamicUploadForm(tabId, `Adicionar doc. em ${tabTitle.replace(/^\d+\.\s*/, '')}`);
        listContainer.appendChild(form);
        listContainer.appendChild(document.createElement('hr'));
        filteredDocs.forEach(d => {
            listContainer.appendChild(createDocSlot(tabId, d.document_type, d));
        });
    }
}
async function renderCargoDocsChecklist(container) {
    container.innerHTML = '<p class="text-muted">Carregando lista de documentos exigidos para este cargo...</p>';
    
    try {
        const cargos = await apiGet('/cargos');
        const cargoAtual = (cargos || []).find(c => c.nome === viewedColaborador.cargo);
        
        if (!cargoAtual) {
            container.innerHTML = `
                <div class="alert alert-warning">
                    <i class="ph ph-warning"></i> Cargo "${viewedColaborador.cargo || 'Não Definido'}" não encontrado nas configurações de cargos.
                </div>
            `;
            return;
        }
        
        const docsExigidos = await apiGet(`/cargos/${cargoAtual.id}/documentos`);
        
        if (!docsExigidos || docsExigidos.length === 0) {
            container.innerHTML = `
                <div class="alert alert-info">
                    <i class="ph ph-info"></i> Nenhuma documentação específica configurada para o cargo <strong>${cargoAtual.nome}</strong>.
                </div>
            `;
            return;
        }
        
        container.innerHTML = `
            <div style="margin-bottom: 2rem; padding: 1rem; background: #fffcf0; border: 1px solid #ffeeba; border-radius: 8px;">
                <h4 style="color: #856404; margin-bottom: 0.5rem;"><i class="ph ph-briefcase"></i> Documentação Exigida: ${cargoAtual.nome}</h4>
                <p style="font-size: 0.85rem; color: #856404;">Anexe abaixo os documentos que foram selecionados como obrigatórios no gerenciamento de cargos.</p>
            </div>
        `;
        
        docsExigidos.forEach(docName => {
            const existingDoc = currentDocs.find(d => d.tab_name === '00.CheckList' && d.document_type === docName);
            container.appendChild(createDocSlot('00.CheckList', docName, existingDoc));
        });
        
    } catch (err) {
        console.error('Erro ao renderizar checklist do cargo:', err);
        container.innerHTML = '<div class="alert alert-danger">Erro ao carregar documentos do cargo.</div>';
    }
}
function createDocSlot(tabId, docType, existingDoc, year = null, month = null, blockReason = null) {
    const div = document.createElement('div');
    div.className = 'doc-item';
    const isSaved = !!existingDoc;
    
    const dateStr = isSaved && existingDoc.upload_date ? new Date(existingDoc.upload_date).toLocaleDateString() : '';
    const vencStr = isSaved && existingDoc.vencimento ? ` | <b>Venc: ${new Date(existingDoc.vencimento + 'T12:00:00').toLocaleDateString()}</b>` : '';
    
    let infoHtml = `
        <div class="doc-info ${isSaved ? 'has-file' : ''}">
            <i class="ph ${isSaved ? 'ph-check-circle' : 'ph-file-dashed'}"></i>
            <div>
                <h4>${docType}</h4>
                ${isSaved ? `<p>${existingDoc.file_name} (${dateStr})${vencStr}</p>` : '<p>Pendente</p>'}
            </div>
        </div>
    `;

    let vencimentoInputHtml = '';
    const needsVencimentoList = ['ASO', 'CNH', 'Audiometria', 'RG-CPF', 'CIN-CPF', 'Comprovante de endereço'];
    const needsVencimento = needsVencimentoList.includes(docType) || tabId === 'ASO';
    const safeDocType = docType.replace(/\s+/g, '-');

    if (needsVencimento) {
        let existingVencimento = existingDoc && existingDoc.vencimento ? existingDoc.vencimento : '';
        // Padrão de 1 ano para comprovante de endereço se estiver vazio
        if (!existingVencimento && docType === 'Comprovante de endereço') {
            const d = new Date();
            d.setFullYear(d.getFullYear() + 1);
            existingVencimento = d.toISOString().split('T')[0];
        }
        vencimentoInputHtml = `
            <div style="display: flex; flex-direction: column; gap: 0.2rem; margin-right: 0.5rem;">
                <label style="font-size: 0.75rem; font-weight: 600; color: #64748b;">Vencimento</label>
                <div style="display:flex; gap:0.25rem; align-items: center;">
                    <input type="date" id="venc-${tabId}-${safeDocType}" class="venc-input" value="${existingVencimento}" 
                           style="padding: 0.5rem; border: 1px solid var(--border-color); border-radius: 6px; font-size: 0.9rem; font-family: inherit; color: var(--text-main); width: 145px; height: 42px;">
                    <button type="button" class="btn btn-secondary btn-sm" onclick="${isSaved ? `saveVencimento(${existingDoc.id}, 'venc-${tabId}-${safeDocType}')` : `alert('Faça o upload do documento primeiro para salvar a validade permanente.')`}" title="Salvar alteração de validade" style="padding:0; width: 42px; height: 42px; justify-content: center;">
                        <i class="ph ph-floppy-disk" style="color:var(--success-color); font-size: 1.2rem;"></i>
                    </button>
                </div>
            </div>
        `;
    }

    let actionsHtml = `
        <div class="doc-actions" style="display: flex; align-items: flex-end; gap: 0.5rem;">
            ${blockReason ? `
                <div style="font-size: 0.85rem; color: #64748b; font-style: italic; background: #f1f5f9; padding: 0.6rem 1rem; border-radius: 6px; display: flex; align-items: center; gap: 0.5rem; min-width: 300px;">
                    <i class="ph ph-info" style="font-size: 1.1rem;"></i> ${blockReason}
                </div>
            ` : `
                ${vencimentoInputHtml}
                <div style="display: flex; gap: 0.5rem;">
                    ${isSaved ? `
                        <button type="button" class="btn btn-secondary" onclick="viewDoc(${existingDoc.id})" title="Visualizar" style="height: 42px;"><i class="ph ph-eye"></i></button>
                        <button type="button" class="btn btn-danger" onclick="deleteDoc(${existingDoc.id})" title="Excluir" style="height: 42px;"><i class="ph ph-trash"></i></button>
                    ` : ''}
                    <label class="btn ${isSaved ? 'btn-warning' : 'btn-primary'}" title="${isSaved ? 'Substituir' : 'Fazer Upload'}" style="height: 42px; display: flex; align-items: center;">
                        <i class="ph ph-upload-simple"></i> ${isSaved ? 'Substituir' : 'Upload'}
                        <input type="file" accept=".pdf" style="display:none;" onchange="const venc = this.closest('.doc-item').querySelector('.venc-input')?.value; if((${needsVencimento}) && !venc) { alert('Data de vencimento é obrigatória'); this.value=''; return; } uploadDocument(this, '${tabId}', '${docType}', ${year}, ${month}, venc)">
                    </label>
                </div>
            `}
        </div>
    `;

    div.innerHTML = infoHtml + actionsHtml;
    return div;
}

function createDynamicUploadForm(tabId, btnLabel, defaultDocType = '') {
    const div = document.createElement('div');
    div.className = 'mb-4 card p-3 bg-light form-dyn';
    div.innerHTML = `
        <div class="flex-between">
            <input type="text" id="dyn-doc-type-${tabId}" class="form-control" placeholder="Nome do Documento / Motivo" value="${defaultDocType}" style="flex:1; margin-right: 1rem; padding: 0.5rem; border-radius:4px; border:1px solid #ccc;">
            <label class="btn btn-primary">
                <i class="ph ph-plus"></i> ${btnLabel}
                <input type="file" accept=".pdf" style="display:none;" onchange="uploadDynamicDocument(this, '${tabId}')">
            </label>
        </div>
    `;
    return div;
}

function renderPagamentosTab(container, tabId, docs) {
    const selectedYear = window.tabPersistence ? window.tabPersistence['pag_year'] : null;
    const selectedMonth = window.tabPersistence ? window.tabPersistence['pag_month'] : null;
    const optionsYears = getAnosAdmissaoOptions(selectedYear);
    const selectorHtml = `
        <div class="card p-3 mb-4 flex-between bg-light">
            <div style="display:flex; gap:1rem; align-items:center;">
                <label>Ano:</label>
                <select id="pag_year" class="form-control" style="padding:0.4rem;" onchange="renderPagamentosCompetencia()">
                    ${optionsYears}
                </select>
                <label>Mês:</label>
                <select id="pag_month" class="form-control" style="padding:0.4rem;" onchange="renderPagamentosCompetencia()">
                    <option value="01">Jan</option><option value="02">Fev</option><option value="03">Mar</option>
                    <option value="04">Abr</option><option value="05">Mai</option><option value="06">Jun</option>
                    <option value="07">Jul</option><option value="08">Ago</option><option value="09">Set</option>
                    <option value="10">Out</option><option value="11">Nov</option><option value="12">Dez</option>
                </select>
                <button type="button" class="btn btn-primary" onclick="renderPagamentosCompetencia()">Carregar</button>
            </div>
        </div>
        <div id="pag_competencia_container"></div>
    `;
    container.innerHTML = selectorHtml;
    
    const date = new Date();
    const yEl = document.getElementById('pag_year');
    const mEl = document.getElementById('pag_month');
    if (yEl) yEl.value = selectedYear || date.getFullYear().toString();
    if (mEl) mEl.value = selectedMonth || (date.getMonth() + 1).toString().padStart(2, '0');
    
    renderPagamentosCompetencia();
}

function renderTerapiaTab(container, tabId, docs) {
    const selectedYear = window.tabPersistence ? window.tabPersistence['terapia_year'] : null;
    const selectedMonth = window.tabPersistence ? window.tabPersistence['terapia_month'] : null;
    const optionsYears = getAnosAdmissaoOptions(selectedYear);
    const selectorHtml = `
        <div class="card p-3 mb-4 flex-between bg-light">
            <div style="display:flex; gap:1rem; align-items:center;">
                <label>Ano:</label>
                <select id="terapia_year" class="form-control" style="padding:0.4rem;" onchange="renderTerapiaCompetencia()">
                    ${optionsYears}
                </select>
                <label>Mês:</label>
                <select id="terapia_month" class="form-control" style="padding:0.4rem;" onchange="renderTerapiaCompetencia()">
                    <option value="01">Jan</option><option value="02">Fev</option><option value="03">Mar</option>
                    <option value="04">Abr</option><option value="05">Mai</option><option value="06">Jun</option>
                    <option value="07">Jul</option><option value="08">Ago</option><option value="09">Set</option>
                    <option value="10">Out</option><option value="11">Nov</option><option value="12">Dez</option>
                </select>
            </div>
        </div>
        <div id="terapia_competencia_container"></div>
    `;
    container.innerHTML = selectorHtml;
    const date = new Date();
    document.getElementById('terapia_year').value = selectedYear || date.getFullYear().toString();
    document.getElementById('terapia_month').value = selectedMonth || (date.getMonth() + 1).toString().padStart(2, '0');
    renderTerapiaCompetencia();
}

window.renderTerapiaCompetencia = function() {
    const y = document.getElementById('terapia_year').value;
    const m = document.getElementById('terapia_month').value;
    const subContainer = document.getElementById('terapia_competencia_container');
    if (!subContainer) return;
    subContainer.innerHTML = '';

    const docsMatch = currentDocs.filter(d => d.tab_name === 'Terapia' && d.year == y && d.month == m);
    docsMatch.forEach(d => {
        subContainer.appendChild(createDocSlot('Terapia', d.document_type, d, `'${y}'`, `'${m}'`));
    });

    subContainer.appendChild(document.createElement('hr'));
    const form = createDynamicUploadForm('Terapia', 'Adicionar Sessão/Relatório', '');
    const fileInput = form.querySelector('input[type="file"]');
    fileInput.onchange = function() {
        const typeIn = form.querySelector('input[type="text"]').value || 'Sessão';
        uploadDocument(this, 'Terapia', typeIn, `'${y}'`, `'${m}'`, null);
    };
    subContainer.appendChild(form);
}

window.renderASOTab = function(container, filteredDocs) {
    const selected = window.tabPersistence ? window.tabPersistence['aso_year'] : null;
    window.lastASODocs = filteredDocs; 
    const optionsHtml = getAnosAdmissaoOptions(selected);

    const selectorHtml = `
        <div class="card p-3 mb-4 bg-light" style="display:flex; gap:1.5rem; align-items:center;">
            <label style="margin:0; font-weight:600;">Ano do ASO/Exames:</label>
            <select id="aso_year" class="form-control" style="padding:0.4rem; max-width:120px;" onchange="renderASOAno()">
                ${optionsHtml}
            </select>
        </div>
        <div id="aso_ano_container"></div>
    `;
    container.innerHTML = selectorHtml;
    renderASOAno();
}

window.renderASOAno = function() {
    const yEl = document.getElementById('aso_year');
    const y = yEl ? yEl.value : new Date().getFullYear().toString();
    const container = document.getElementById('aso_ano_container');
    if (!container) return;
    container.innerHTML = '';

    // Usar os documentos já filtrados pela barra global
    const docsToUse = window.lastASODocs || currentDocs.filter(d => d.tab_name === 'ASO');
    const filteredByYear = docsToUse.filter(d => d.year == y);
    const isMotorista = viewedColaborador && (viewedColaborador.cargo || '').toUpperCase().includes('MOTORISTA');
    const isDesligado = viewedColaborador && (viewedColaborador.status === 'Desligado');

    // Documentos obrigatórios
    const list = ['ASO Padrão'];
    if (isMotorista) list.push('Audiometria');
    if (isDesligado) list.push('ASO Demissional');

    list.forEach(docType => {
        const existingDoc = filteredByYear.find(d => d.document_type === docType);
        container.appendChild(createDocSlot('ASO', docType, existingDoc, `'${y}'`));
    });

    // Outros documentos dinâmicos já salvos para este ano (considerando o filtro de busca)
    filteredByYear.filter(d => !list.includes(d.document_type)).forEach(d => {
        container.appendChild(createDocSlot('ASO', d.document_type, d, `'${y}'`));
    });

    container.appendChild(document.createElement('hr'));

    // Botão para adicionar outro exame avülso
    const form = createDynamicUploadForm('ASO', 'Adicionar Outro Exame', '');
    const fileInput = form.querySelector('input[type="file"]');
    fileInput.onchange = function() {
        const typeIn = form.querySelector('input[type="text"]').value || 'Exame';
        // For dynamic ASO uploads, vencimento is not mandatory at this point, but can be added later
        uploadDocument(this, 'ASO', typeIn, `'${y}'`, null, null);
    };
    container.appendChild(form);
}

window.renderAtestadosTab = function(container, filteredDocs) {
    const selected = window.tabPersistence ? window.tabPersistence['atestados_year'] : null;
    window.lastAtestadoDocs = filteredDocs; 
    const optionsHtml = getAnosAdmissaoOptions(selected);

    // Injetar CSS do autocomplete se não existir
    if (!document.getElementById('cid-style')) {
        const s = document.createElement('style');
        s.id = 'cid-style';
        s.textContent = `
            .cid-wrap { position:relative; display:flex; gap:.75rem; align-items:flex-start; flex-wrap:wrap; }
            .cid-input-group { position:relative; flex:1; min-width:220px; }
            .cid-dropdown { position:absolute; top:100%; left:0; right:0; background:#fff; border:1px solid #ccc; border-radius:4px; z-index:999; max-height:220px; overflow-y:auto; box-shadow:0 4px 12px rgba(0,0,0,.12); }
            .cid-option { padding:.55rem .85rem; cursor:pointer; font-size:.85rem; line-height:1.4; }
            .cid-option:hover, .cid-option.selected { background:#e8f0fe; }
            .cid-option strong { color:#1a73e8; }
            .cid-badge { display:inline-block; background:#e8f0fe; color:#1a73e8; border:1px solid #aac4f5; border-radius:4px; padding:.2rem .6rem; font-size:.8rem; font-weight:600; white-space:nowrap; }
        `;
        document.head.appendChild(s);
    }

    container.innerHTML = `
        <div class="card p-3 mb-4 bg-light">
            <h1 style="font-size: 1.25rem; margin-bottom: 1rem; color: var(--primary-color);">Ano do Atestado</h1>
            <div style="display:flex; gap:1.5rem; align-items:center;">
                <select id="atestados_year" class="form-control" style="padding:0.4rem; max-width:120px;" onchange="renderAtestadosAno()">
                    ${optionsHtml}
                </select>
            </div>
        </div>

        <div class="card p-3 mb-4 bg-light">
            <h5 style="margin-bottom:.75rem; color:var(--primary-color);"><i class="ph ph-magnifying-glass"></i> Buscar CID-10 para nomear o atestado</h5>
            <div class="cid-wrap">
                <div class="cid-input-group">
                    <input type="text" id="cid-search" class="form-control" placeholder="Digite o código (J06) ou palavra-chave (gripe, lombar...)" autocomplete="off"
                           oninput="searchCID(this.value)" style="padding:.5rem;">
                    <div id="cid-dropdown" class="cid-dropdown" style="display:none;"></div>
                </div>
                <div id="cid-selected-badge" style="display:none; align-self:center;"></div>
                <label class="btn btn-primary" id="cid-upload-label" style="display:none;">
                    <i class="ph ph-upload-simple"></i> Enviar Atestado
                    <input type="file" id="cid-file-input" accept=".pdf,image/*" style="display:none;"
                           onchange="uploadAtestadoWithCID(this)">
                </label>
            </div>
            <p id="cid-hint" style="margin-top:.5rem; font-size:.8rem; color:#666;">Selecione um CID para liberar o botão de upload.</p>
        </div>
        <div id="atestados-list-container"></div>
    `;

    renderAtestadosAno();
}

let selectedCID = null;

window.searchCID = async function(val) {
    const dd = document.getElementById('cid-dropdown');
    if (!val || val.length < 2) { dd.style.display = 'none'; return; }
    try {
        const res = await fetch(`${API_URL}/cid10?q=${encodeURIComponent(val)}`, { headers: { 'Authorization': `Bearer ${currentToken}` } });
        const data = await res.json();
        if (!data.length) { dd.style.display = 'none'; return; }
        dd.innerHTML = data.map((c, i) =>
            `<div class="cid-option" data-code="${c.code}" data-desc="${c.desc.replace(/"/g,'&quot;')}" onclick="selectCID('${c.code}', this.dataset.desc)">
                <strong>${c.code}</strong> — ${c.desc}
             </div>`
        ).join('');
        dd.style.display = 'block';
    } catch(e) { dd.style.display = 'none'; }
}

window.selectCID = function(code, desc) {
    selectedCID = { code, desc };
    document.getElementById('cid-dropdown').style.display = 'none';
    document.getElementById('cid-search').value = `${code} — ${desc}`;
    const badge = document.getElementById('cid-selected-badge');
    badge.innerHTML = `<span class="cid-badge">${code}</span>`;
    badge.style.display = 'inline-block';
    document.getElementById('cid-upload-label').style.display = 'flex';
    document.getElementById('cid-hint').style.display = 'none';
}

window.uploadAtestadoWithCID = async function(inputEl) {
    const file = inputEl.files[0];
    if (!file || !selectedCID) return;
    if (!viewedColaborador) { alert('Colaborador não selecionado.'); return; }

    const nomeNorm = (viewedColaborador.nome || 'COLAB').toUpperCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Z0-9]+/g, '_');
    const descNorm = selectedCID.desc.toUpperCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Z0-9]+/g, '_').substring(0, 40);
    const customName = `${selectedCID.code}_${descNorm}_${nomeNorm}`;

    const formData = new FormData();
    const year = document.getElementById('atestados_year') ? document.getElementById('atestados_year').value : new Date().getFullYear().toString();
    formData.append('colaborador_id', viewedColaborador.id);
    formData.append('colaborador_nome', viewedColaborador.nome || 'Desconhecido');
    formData.append('tab_name', 'Atestados');
    formData.append('document_type', `${selectedCID.code} - ${selectedCID.desc.substring(0,60)}`);
    formData.append('custom_name', customName);
    formData.append('year', year);
    formData.append('file', file);

    try {
        const res = await fetch(`${API_URL}/documentos`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${currentToken}` },
            body: formData
        });
        if (res.ok) {
            selectedCID = null;
            document.getElementById('cid-search').value = '';
            document.getElementById('cid-selected-badge').style.display = 'none';
            document.getElementById('cid-upload-label').style.display = 'none';
            document.getElementById('cid-hint').style.display = '';
            await loadDocumentosList();
            renderAtestadosAno();
        } else {
            alert('Erro ao enviar atestado.');
        }
    } catch (e) { alert('Erro: ' + e.message); }
}

window.saveVencimento = async function(docId, inputId) {
    const val = document.getElementById(inputId).value;
    if (!val) { alert('Selecione uma data.'); return; }
    try {
        const res = await fetch(`${API_URL}/documentos/${docId}/vencimento`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${currentToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ vencimento: val })
        });
        if (res.ok) {
            alert('Validade atualizada com sucesso!');
            loadDocumentosList(); // Para atualizar a exibição do Venc: dd/mm/aaaa no texto
        } else {
            alert('Erro ao salvar nova validade.');
        }
    } catch(e) { alert('Erro: ' + e.message); }
};

window.renderAtestadosAno = function() {
    const yEl = document.getElementById('atestados_year');
    const y = yEl ? yEl.value : new Date().getFullYear().toString();
    const listContainer = document.getElementById('atestados-list-container'); // Corrected ID to match existing HTML
    if (!listContainer) return;
    listContainer.innerHTML = '';

    // Usar os documentos já filtrados pela barra global
    const docsToUse = window.lastAtestadoDocs || currentDocs.filter(d => d.tab_name === 'Atestados');
    const filteredByYear = docsToUse.filter(d => d.year == y);

    if (filteredByYear.length === 0) {
        listContainer.innerHTML = '<p class="text-muted" style="text-align:center; padding:1.5rem;">Nenhum atestado encontrado para o filtro/ano selecionado.</p>';
        return;
    }

    filteredByYear.forEach(d => {
        listContainer.appendChild(createDocSlot('Atestados', d.document_type, d, `'${y}'`));
    });
}

window.renderPagamentosCompetencia = function() {
    const yEl = document.getElementById('pag_year');
    const mEl = document.getElementById('pag_month');
    const y = yEl ? yEl.value : '2026';
    const m = mEl ? mEl.value : '01';

    const subContainer = document.getElementById('pag_competencia_container');
    if (!subContainer) return;
    subContainer.innerHTML = '';

    const docs = currentDocs.filter(d => d.tab_name === 'Pagamentos' && d.year == y && d.month == m);
    ['Ponto', 'Holerite', 'Recibo Combustível', 'Recibo Alimentação'].forEach(type => {
        const d = docs.find(x => x.document_type === type);
        subContainer.appendChild(createDocSlot('Pagamentos', type, d, `'${y}'`, `'${m}'`));
    });
};

window.uploadDocument = async function(inputEl, tabId, docType, year = null, month = null, vencimento = null) {
    const file = inputEl.files[0];
    if (!file) return;

    // Obrigatório que seja em PDF (Exigência do Usuário)
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
        alert('Atenção: Apenas arquivos PDF são permitidos para este documento.');
        inputEl.value = '';
        return;
    }

    if (!viewedColaborador) {
        alert('Erro: Colaborador não selecionado.');
        return;
    }

    const formData = new FormData();
    formData.append('colaborador_id', viewedColaborador.id);
    formData.append('colaborador_nome', viewedColaborador.nome_completo || 'Desconhecido');
    formData.append('tab_name', tabId);
    formData.append('document_type', docType);
    
    // Tratando o ano e o mês que podem vir do createDocSlot com aspas simples ex: "'2026'"
    const cleanYear = year ? String(year).replace(/'/g, '').trim() : '';
    const cleanMonth = month ? String(month).replace(/'/g, '').trim() : '';
    
    if(cleanYear && cleanYear !== 'null' && cleanYear !== 'undefined') formData.append('year', cleanYear);
    if(cleanMonth && cleanMonth !== 'null' && cleanMonth !== 'undefined') formData.append('month', cleanMonth);
    if(vencimento) formData.append('vencimento', vencimento);
    formData.append('file', file);

    try {
        const res = await fetch(`${API_URL}/documentos`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${currentToken}` },
            body: formData
        });
        if(res.ok) {
            await loadDocumentosList();
            const activeTab = document.querySelector('#tabs-list li.active');
            if(activeTab) {
                if (tabId === 'Pagamentos') renderPagamentosCompetencia();
                else if (tabId === 'ASO') renderASOAno();
                else renderTabContent(tabId, activeTab.textContent);
            }
        } else {
            alert('Erro no upload.');
        }
    } catch(e) { console.error(e); }
}

window.uploadDynamicDocument = function(inputEl, tabId) {
    const docTypeInput = document.getElementById(`dyn-doc-type-${tabId}`);
    const docType = docTypeInput ? docTypeInput.value.trim() : 'Documento Extra';
    if (!docType) return alert('Insira o nome ou motivo do documento.');
    uploadDocument(inputEl, tabId, docType);
}

window.deleteDoc = async function(docId) {
    if(!confirm('Tem certeza que deseja excluir permanentemente este arquivo?')) return;
    try {
        const res = await fetch(`${API_URL}/documentos/${docId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        if(res.ok) {
            await loadDocumentosList();
            const activeTab = document.querySelector('#tabs-list li.active');
            if (activeTab && activeTab.dataset.tab === '05_Pagamentos') renderPagamentosCompetencia();
            else if (activeTab) renderTabContent(activeTab.dataset.tab, activeTab.textContent);
        }
    } catch(e) { console.error(e); }
}

window.viewDoc = async function(docId) {
    const url = `${API_URL}/documentos/download/${docId}?token=${currentToken}`;
    const modalBody = document.getElementById('modal-doc-body');
    if (modalBody) {
        // Depending on file type, iframe might trigger download instead of view in some browsers, but it's okay for prototype
        modalBody.innerHTML = `<iframe src="${url}"></iframe>`;
    }
    
    const btnDownload = document.getElementById('btn-download-doc');
    if (btnDownload) {
        btnDownload.onclick = () => window.open(url, '_blank');
    }
    
    const modal = document.getElementById('doc-modal');
    if (modal) modal.style.display = 'block';
}

// Custom UI Interactions and Helpers
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('status-chip')) {
        updateStatusChip(e.target.dataset.value);
    }
});

function updateStatusChip(val) {
    document.querySelectorAll('.status-chip').forEach(c => c.classList.remove('active'));
    const target = document.querySelector(`.status-chip[data-value="${val}"]`);
    if (target) target.classList.add('active');
    
    const statusInput = document.getElementById('colab-status');
    if (statusInput) statusInput.value = val;
}

window.previewFoto = function(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const stateSaved = document.getElementById('photo-state-saved');
            const preview = document.getElementById('colab-foto-preview');
            if (stateSaved) stateSaved.style.display = 'none';
            if (preview) {
                preview.style.display = 'block';
                preview.src = e.target.result;
            }
        }
        reader.readAsDataURL(input.files[0]);
        
        // Auto Upload if ID is present
        const colabId = document.getElementById('colab-id').value;
        if (colabId) {
            const nomeColab = document.getElementById('colab-nome').value;
            const fd = new FormData();
            fd.append('nome', nomeColab); // Nome deve vir antes do arquivo para o Multer ler primeiro!
            fd.append('foto', input.files[0]);
            
            fetch(`${API_URL}/upload-foto/${colabId}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${currentToken}` },
                body: fd
            })
            .then(res => res.json())
            .then(data => {
                if (data.sucesso) {
                    // Atualiza src sem ser pego no Cache
                    const preview = document.getElementById('colab-foto-preview');
                    if(preview && data.caminho) {
                        preview.src = `${API_URL.replace('/api', '')}/${data.caminho}?t=${Date.now()}`;
                    }
                }
            })
            .catch(err => console.error("Erro no auto-upload de foto:", err));
        }
    }
}

function checkQuickDocsState() {
    const idEl = document.getElementById('colab-id');
    const id = idEl ? idEl.value : '';
    const container = document.getElementById('quick-docs-container');
    const info = document.getElementById('quick-docs-info');
    
    if (id) {
        if(container) container.style.display = 'block';
        if(info) info.style.display = 'none';
        loadQuickDocs(id);
    } else {
        if(container) container.style.display = 'none';
        if(info) info.style.display = 'block';
    }
}

async function loadQuickDocs(id) {
    const docs = await apiGet(`/colaboradores/${id}/documentos`);
    const list = document.getElementById('quick-docs-list');
    if (!list || !docs) return;
    list.innerHTML = '';
    
    docs.filter(d => ['Documentos Pessoais', 'Ficha de EPI', 'Treinamentos', 'ASO', 'Contrato', 'Outros'].includes(d.document_type))
        .forEach(d => {
            const li = document.createElement('li');
            li.innerHTML = `
                <span><strong>${d.document_type}:</strong> ${d.file_name}</span>
                <button type="button" class="btn btn-sm btn-danger" onclick="deleteDoc(${d.id})"><i class="ph ph-trash"></i></button>
            `;
            list.appendChild(li);
        });
}

// CPF Masking
window.mascaraCPF = function(el) {
    let v = el.value.replace(/\D/g, "");
    if (v.length > 11) v = v.substring(0, 11);
    v = v.replace(/(\d{3})(\d)/, "$1.$2");
    v = v.replace(/(\d{3})(\d)/, "$1.$2");
    v = v.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    el.value = v;

    // Sincronizar com RG se for CIN
    if (el.id === 'colab-cpf' && document.getElementById('colab-rg-tipo') && document.getElementById('colab-rg-tipo').value === 'CIN') {
        const rgEl = document.getElementById('colab-rg');
        if(rgEl) rgEl.value = v;
    }
};

window.toggleTipoDocumento = function() {
    const sel = document.getElementById('colab-rg-tipo');
    const rgInput = document.getElementById('colab-rg');
    const cpfInput = document.getElementById('colab-cpf');
    const lbl = document.getElementById('lbl-colab-rg');
    
    if (sel && rgInput && cpfInput && lbl) {
        if (sel.value === 'CIN') {
            lbl.textContent = 'Número (CIN)';
            rgInput.value = cpfInput.value;
            rgInput.setAttribute('readonly', 'true');
            rgInput.style.backgroundColor = '#e9ecef';
        } else {
            lbl.textContent = 'Número (RG)';
            rgInput.removeAttribute('readonly');
            rgInput.style.backgroundColor = '';
            // Limpa apenas se estiver igual ao CPF (ou seja, foi preenchido por CIN)
            if (rgInput.value === cpfInput.value) {
                rgInput.value = '';
            }
        }
    }
};

window.mascaraRG = function(el) {
    let v = el.value.replace(/\D/g, "");
    if (v.length > 9) v = v.substring(0, 9);
    v = v.replace(/(\d{2})(\d)/, "$1.$2");
    v = v.replace(/(\d{3})(\d)/, "$1.$2");
    v = v.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    el.value = v;
};

window.mascaraPIS = function(el) {
    let v = el.value.replace(/\D/g, "");
    if (v.length > 11) v = v.substring(0, 11);
    v = v.replace(/^(\d{3})(\d)/, "$1.$2");
    v = v.replace(/^(\d{3})\.(\d{5})(\d)/, "$1.$2.$3");
    v = v.replace(/^(\d{3})\.(\d{5})\.(\d{2})(\d)/, "$1.$2.$3-$4");
    el.value = v;
};

window.mascaraTitulo = function(el) {
    let v = el.value.replace(/\D/g, "");
    if (v.length > 12) v = v.substring(0, 12);
    v = v.replace(/(\d{4})(\d)/, "$1 $2");
    v = v.replace(/(\d{4}) (\d{4})(\d)/, "$1 $2 $3");
    el.value = v;
};

window.mascaraApenasNumeros = function(el) {
    el.value = el.value.replace(/\D/g, "");
};

window.mascaraMilitar = window.mascaraApenasNumeros;


// Validar campo genérico no frontend
window.validarCPFCampo = function(el) {
    const v = el.value.replace(/\D/g, "");
    const errorMsg = document.getElementById(el.id === 'colab-cpf' ? 'cpf-error' : '');
    if (v.length > 0 && v.length < 11) {
        el.classList.add('is-invalid');
        if(errorMsg) errorMsg.style.display = 'inline';
    } else {
        el.classList.remove('is-invalid');
        if(errorMsg) errorMsg.style.display = 'none';
    }
};

window.toggleConjuge = function() {
    const estado = document.getElementById('colab-estadocivil');
    const section = document.getElementById('section-conjuge');
    const nome = document.getElementById('conjuge-nome');
    const cpf = document.getElementById('conjuge-cpf');
    
    if (estado && estado.value === 'Casado') {
        section.style.display = 'block';
        // TEST_MODE: Desabilitando obrigatoriedade dinâmica
        // if (nome) nome.required = true;
        // if (cpf) cpf.required = true;
    } else if (section) {
        section.style.display = 'none';
        if (nome) nome.required = false;
        if (cpf) cpf.required = false;
    }
};

window.toggleMotorista = function() {
    const cargo = document.getElementById('colab-cargo');
    const section = document.getElementById('section-cnh');
    const num = document.getElementById('colab-cnh-numero');
    const venc = document.getElementById('colab-cnh-vencimento');
    const cat = document.getElementById('colab-cnh-categoria');
    
    if (cargo && cargo.value.toUpperCase().includes('MOTORISTA')) {
        if(section) section.style.display = 'block';
        // TEST_MODE: Desabilitando obrigatoriedade dinâmica
        // if(num) num.required = true;
        // if(venc) venc.required = true;
        // if(cat) cat.required = true;
    } else if(section) {
        section.style.display = 'none';
        if(num) num.required = false;
        if(venc) venc.required = false;
        if(cat) cat.required = false;
    }
    updateRequiredDocsList();
};

async function updateRequiredDocsList() {
    const cargoNome = document.getElementById('colab-cargo').value;
    const container = document.getElementById('quick-docs-info');
    if(!container) return;

    if(!cargoNome || cargoNome === 'Selecionar' || cargoNome === '') {
        container.innerHTML = 'Salve o colaborador antes de adicionar arquivos.';
        return;
    }

    const cargos = await apiGet('/cargos');
    const cargo = cargos.find(c => c.nome === cargoNome);
    if(!cargo || !cargo.documentos_obrigatorios) {
        container.innerHTML = 'Sem documentos específicos exigidos para este cargo.';
        return;
    }

    const docs = cargo.documentos_obrigatorios.split(',').filter(d => d.trim() !== '');
    if(docs.length === 0) {
        container.innerHTML = 'Sem documentos específicos exigidos para este cargo.';
        return;
    }

    let html = `<h4 style="font-size:0.85rem; color:var(--primary-color); margin-bottom: 0.5rem;">Documentos Exigidos para ${cargoNome}:</h4>`;
    html += `<div style="background: #fffcf0; padding: 0.75rem; border: 1px solid #ffecb5; border-radius: 4px; margin-bottom: 1rem;">`;
    html += `<ul style="font-size: 0.8rem; padding-left: 1.2rem; margin-bottom: 0;">`;
    docs.forEach(d => {
        html += `<li style="margin-bottom: 4px;"><strong>${d}</strong></li>`;
    });
    html += `</ul></div>`;
    container.innerHTML = html;
}

window.checkQuickDocsState = function() {
    const idEl = document.getElementById('colab-id');
    const id = idEl ? idEl.value : '';
    const container = document.getElementById('quick-docs-container');
    const info = document.getElementById('quick-docs-info');
    
    if (id) {
        if(container) container.style.display = 'block';
        if(info) info.style.display = 'block';
        updateRequiredDocsList();
        loadQuickDocs(id);
    } else {
        if(container) container.style.display = 'none';
        if(info) info.style.display = 'block';
        updateRequiredDocsList();
    }
}

window.uploadQuickDoc = async function(inputEl) {
    const id = document.getElementById('colab-id').value;
    const nome = document.getElementById('colab-nome').value;
    const type = document.getElementById('quick-doc-type').value;
    const file = inputEl.files[0];
    if (!id || !file) return;

    let targetTab = 'Fotos';
    if(type === 'Documentos Pessoais') targetTab = '01.Ficha Cadastral';
    else if(type === 'Ficha de EPI') targetTab = 'Ficha de EPI';
    else if(type === 'Treinamentos') targetTab = 'Treinamento';
    else if(type === 'ASO') targetTab = 'ASO';
    else if(type === 'Contrato') targetTab = 'Contratos';

    const formData = new FormData();
    formData.append('colaborador_nome', nome);
    formData.append('tab_name', targetTab);
    formData.append('document_type', type);
    formData.append('colaborador_id', id);
    formData.append('file', file);

    const res = await fetch(`${API_URL}/documentos`, { method: 'POST', body: formData, headers: { 'Authorization': `Bearer ${currentToken}` }});
    if (res.ok) {
        loadQuickDocs(id);
    }
}


// FORMATADORES E HELPERS
function formatStringGlobal(str) {
    if (!str) return "SEM_NOME";
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/[^A-Z0-9 ]/g, "").trim().replace(/\s+/g, "_");
}

window.mascaraCNH = function(el) {
    el.value = el.value.replace(/\D/g, "").substring(0, 11);
};

window.mascaraTelefone = function(i) {

    let v = i.value;
    v = v.replace(/\D/g, ""); // Remove não-dígitos
    if (v.length > 10) {
        v = v.replace(/^(\d\d)(\d{5})(\d{4}).*/, "($1) $2-$3"); // 11 dígitos
    } else if (v.length > 5) {
        v = v.replace(/^(\d\d)(\d{4})(\d{0,4}).*/, "($1) $2-$3"); // 10 dígitos (fixo)
    } else if (v.length > 2) {
        v = v.replace(/^(\d\d)(\d{0,5})/, "($1) $2");
    } else {
        v = v.replace(/^(\d*)/, "($1");
    }
    i.value = v;
};

window.mascaraMoeda = function(i) {
    let v = i.value.replace(/\D/g, "");
    if (v === "") {
        i.value = "";
        return;
    }
    v = (parseInt(v) / 100).toFixed(2) + "";
    v = v.replace(".", ",");
    v = v.replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1.");
    i.value = "R$ " + v;
};
function updateProbationBadge(admissaoDate) {
    const containers = [
        document.getElementById('probation-badge-container'),
        document.getElementById('prontuario-probation-badge-container')
    ];
    
    const venc1El = document.getElementById('colab-venc-1-45');
    const venc2El = document.getElementById('colab-venc-2-45');
    
    if (venc1El) venc1El.value = '';
    if (venc2El) venc2El.value = '';
    
    containers.forEach(container => {
        if (!container) return;
        container.innerHTML = '';
    });

    if (!admissaoDate || admissaoDate === '') return;
    
    try {
        const adm = new Date(admissaoDate + 'T12:00:00');
        
        // Calcular datas de vencimento
        const d1 = new Date(adm);
        d1.setDate(d1.getDate() + 45);
        if (venc1El) venc1El.value = d1.toLocaleDateString('pt-BR');
        
        const d2 = new Date(adm);
        d2.setDate(d2.getDate() + 90);
        if (venc2El) venc2El.value = d2.toLocaleDateString('pt-BR');

        const today = new Date();
        today.setHours(12,0,0,0);
        
        const diffTime = today - adm;
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays < 0) return;
        
        containers.forEach(container => {
            if (diffDays <= 45) {
                container.innerHTML = '<span class="probation-badge">1º 45</span>';
            } else if (diffDays <= 90) {
                container.innerHTML = '<span class="probation-badge second">2º 45</span>';
            }
        });
    } catch(e) { console.error('Erro ao calcular período de experiência:', e); }
}

// --- CBO LOOKUP ---
window.buscarCBO = async function(q) {
    const dropdown = document.getElementById('cbo-dropdown');
    if (!q || q.length < 2) {
        if (dropdown) dropdown.style.display = 'none';
        return;
    }
    try {
        const response = await fetch(`${API_URL}/cbo?q=${q}`);
        const results = await response.json();
        
        if (!dropdown) return;
        
        if (results.length === 0) {
            dropdown.style.display = 'none';
            return;
        }
        
        dropdown.innerHTML = results.map(r => `
            <div class="cbo-suggestion" onclick="selecionarCBO('${r.code}', '${r.desc}')" 
                 style="padding: 10px; cursor: pointer; border-bottom: 1px solid #eee; transition: background 0.2s;">
                <div style="font-weight: 700; color: #2563eb; font-size: 0.85rem;">${r.code}</div>
                <div style="font-size: 0.8rem; color: #475569;">${r.desc}</div>
            </div>
        `).join('');
        
        dropdown.style.display = 'block';
        
        // Adicionar efeito de hover nos itens injetados
        const items = dropdown.querySelectorAll('.cbo-suggestion');
        items.forEach(item => {
            item.onmouseover = () => item.style.background = '#f1f5f9';
            item.onmouseout = () => item.style.background = '#fff';
        });
    } catch(e) { console.error('Erro ao buscar CBO:', e); }
};

window.selecionarCBO = function(code, desc) {
    const codeEl = document.getElementById('colab-cbo-codigo');
    const descEl = document.getElementById('colab-cbo');
    const dropdown = document.getElementById('cbo-dropdown');
    
    if (codeEl) codeEl.value = code;
    if (descEl) descEl.value = desc;
    if (dropdown) dropdown.style.display = 'none';
};

// Fechar dropdown de CBO ao clicar fora
document.addEventListener('click', (e) => {
    const dropdown = document.getElementById('cbo-dropdown');
    const input = document.getElementById('colab-cbo-codigo');
    if (dropdown && input && !dropdown.contains(e.target) && e.target !== input) {
        dropdown.style.display = 'none';
    }
});
