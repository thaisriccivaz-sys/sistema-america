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
    setupGeradores();
    
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
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
    } else if (target === 'geradores') {
        loadGeradores();
    } else if (target === 'escalas') {
        loadEscalas();
    } else if (target === 'faculdade') {
        loadFaculdadeCursos();
    } else if (target === 'chaves') {
        loadChaves();
    } else if (target === 'admissao') {
        loadAdmissaoSelect();
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
            updateVacationInfo(e.target.value);
        });
        colabAdmissao.addEventListener('input', (e) => {
            updateProbationBadge(e.target.value);
            updateVacationInfo(e.target.value);
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
    
    // Check if response is JSON
    const contentType = res.headers.get("content-type");
    if (contentType && contentType.indexOf("application/json") !== -1) {
        return res.json();
    } else {
        const text = await res.text();
        console.error("Erro na API (Não é JSON):", text);
        return { error: "Servidor retornou resposta inesperada. Verifique o console." };
    }
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
        cargos.forEach(c => {
            const option = document.createElement('option');
            option.value = c.nome;
            option.textContent = c.nome;
            selectColab.appendChild(option);
        });
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

document.getElementById('form-chaves')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('chave-id').value;
    const nome = document.getElementById('chave-nome').value;
    try {
        if (id) await apiPut(`/chaves/${id}`, { nome_chave: nome });
        else await apiPost('/chaves', { nome_chave: nome });
        resetChavesForm();
        loadChaves();
    } catch (e) { alert(e.message); }
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

window.toggleTipoDocumento = function() {
    const tipo = document.getElementById('colab-rg-tipo').value;
    const lbl = document.getElementById('lbl-colab-rg');
    if (lbl) {
        lbl.textContent = tipo === 'CIN' ? 'Número (CIN)' : 'Número (RG)';
    }
};

window.toggleFormacaoFields = function(val) {
    const section = document.getElementById('section-formacao');
    if (section) {
        section.style.display = (val === 'Sim') ? 'block' : 'none';
        if (val === 'Não') {
            const cInput = document.getElementById('colab-faculdade-curso');
            const d1Input = document.getElementById('colab-faculdade-data-inicio');
            const d2Input = document.getElementById('colab-faculdade-data-termino');
            if (cInput) cInput.value = '';
            if (d1Input) d1Input.value = '';
            if (d2Input) d2Input.value = '';
        }
    }
};

window.toggleAcademiaFields = function(val) {
    const section = document.getElementById('section-academia');
    if (section) {
        section.style.display = (val === 'Sim') ? 'block' : 'none';
        if (val === 'Não') {
            const diInput = document.getElementById('colab-academia-data-inicio');
            if (diInput) diInput.value = '';
        }
    }
};

window.toggleTerapiaFields = function(val) {
    const section = document.getElementById('section-terapia');
    if (section) {
        section.style.display = (val === 'Sim') ? 'block' : 'none';
        if (val === 'Não') {
            const diInput = document.getElementById('colab-terapia-data-inicio');
            if (diInput) diInput.value = '';
        }
    }
};

window.toggleCelularFields = function(val) {
    const section = document.getElementById('section-celular');
    if (section) {
        section.style.display = (val === 'Sim') ? 'block' : 'none';
        if (val === 'Não') {
            const dInput = document.getElementById('colab-celular-data');
            if (dInput) dInput.value = '';
        }
    }
};

window.toggleChavesColabFields = function(val) {
    const section = document.getElementById('section-chaves-colab');
    if (section) {
        section.style.display = (val === 'Sim') ? 'block' : 'none';
        if (val === 'Não') {
            const container = document.getElementById('colab-chaves-rows-container');
            if (container) container.innerHTML = '';
        } else if (val === 'Sim') {
            const container = document.getElementById('colab-chaves-rows-container');
            if (container && container.children.length === 0) {
                addNewChaveRow();
            }
        }
    }
};

window.addNewChaveRow = async function(selectedChaveId = null, selectedDate = null) {
    try {
        const rows = await apiGet('/chaves');
        const container = document.getElementById('colab-chaves-rows-container');
        if (!container) return;

        // Remover Botão de + das linhas anteriores se houver
        document.querySelectorAll('.btn-add-chave-row').forEach(b => b.style.display = 'none');

        const rowDiv = document.createElement('div');
        rowDiv.className = 'chave-entry-row';
        rowDiv.style = "display: grid; grid-template-columns: 1fr 1fr auto; gap: 0.75rem; align-items: flex-end; background: #fff; padding: 0.4rem 0.75rem; border-radius: 8px; border: 1px solid #f1f5f9; animation: fadeIn 0.3s ease; margin-bottom: 0.5rem;";
        
        rowDiv.innerHTML = `
            <div class="input-group" style="margin: 0;">
                <label style="color: #64748b; font-size: 0.75rem; margin-bottom: 2px; font-weight:700;">Data de Entrega</label>
                <input type="date" class="colab-chave-date" value="${selectedDate || ''}" style="width: 100%; border-radius: 6px; border: 1px solid #e2e8f0; padding: 0.4rem; font-size: 0.85rem;">
            </div>
            <div class="input-group" style="margin: 0;">
                <label style="color: #64748b; font-size: 0.75rem; margin-bottom: 2px; font-weight:700;">Selecionar Chave</label>
                <select class="colab-chave-select" style="width: 100%; border-radius: 6px; border: 1px solid #e2e8f0; padding: 0.4rem; font-size: 0.85rem; background: #fff;">
                    <option value="">Selecionar...</option>
                    ${rows.map(r => `<option value="${r.id}" ${parseInt(selectedChaveId) === r.id ? 'selected' : ''}>${r.nome_chave}</option>`).join('')}
                </select>
            </div>
            <div style="display: flex; gap: 0.25rem;">
                <button type="button" class="btn btn-danger" onclick="removeChaveRow(this)" style="width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 6px; padding: 0; background: #fee2e2; color: #ef4444; border:none;">
                    <i class="ph ph-trash" style="font-size: 1.1rem;"></i>
                </button>
                <button type="button" class="btn btn-primary btn-add-chave-row" onclick="addNewChaveRow()" style="width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 6px; padding: 0; background: var(--primary-color); color: #fff; border:none;">
                    <i class="ph ph-plus" style="font-size: 1.1rem;"></i>
                </button>
            </div>
        `;
        container.appendChild(rowDiv);
    } catch (e) { console.error(e); }
};

window.removeChaveRow = function(btn) {
    const row = btn.closest('.chave-entry-row');
    row.remove();
    // Reexibir o botão + na nova "última linha"
    const rows = document.querySelectorAll('.chave-entry-row');
    if (rows.length > 0) {
        const lastBtn = rows[rows.length - 1].querySelector('.btn-add-chave-row');
        if (lastBtn) lastBtn.style.display = 'flex';
    } else {
        // Se todas as linhas foram removidas, talvez queira adicionar uma vazia de volta?
        // Ou deixar o toggle Sim/Não resolver.
    }
};

async function loadFaculdadeCursosDropdown() {
    try {
        const response = await fetch(`${API_URL}/cursos-faculdade`, {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        const cursos = await response.json();
        const select = document.getElementById('colab-faculdade-curso');
        if (select && cursos) {
            select.innerHTML = '<option value="">Selecionar curso cadastrado...</option>';
            cursos.forEach(c => {
                const tempo = c.tempo_curso ? ` - ${c.tempo_curso}` : '';
                select.innerHTML += `<option value="${c.id}">${c.nome_curso} - ${c.instituicao}${tempo}</option>`;
            });
        }
    } catch(e) { console.error('Erro ao carregar cursos para dropdown:', e); }
}

window.toggleTransporteValor = function(val) {
    const group = document.getElementById('group-valor-transporte');
    const input = document.getElementById('colab-valor-transporte');
    if (group) {
        // Mostrar se for VT ou VC
        if (val === 'Vale Transporte (VT)' || val === 'Vale Combustível (VC)') {
            group.style.display = 'block';
        } else {
            group.style.display = 'none';
            if (input) input.value = '';
        }
    }
};

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
    loadFaculdadeCursosDropdown();
}

window.updateVacationInfo = function(admissaoStr) {
    const aqField = document.getElementById('ferias-periodo-aquisitivo');
    const concField = document.getElementById('ferias-periodo-concessivo');
    const indicator = document.getElementById('ferias-concessivo-indicator');
    
    if (!admissaoStr || !aqField || !concField) {
        if(aqField) aqField.value = '-';
        if(concField) { concField.value = '-'; concField.style.color = '#495057'; }
        if(indicator) indicator.style.display = 'none';
        return;
    }

    try {
        const adm = new Date(admissaoStr + 'T12:00:00');
        if (isNaN(adm.getTime())) return;

        // Fim do Período Aquisitivo: +1 ano
        const aqEnd = new Date(adm);
        aqEnd.setFullYear(adm.getFullYear() + 1);
        
        // Período Concessivo: +2 anos (menos 1 dia)
        const concEnd = new Date(aqEnd);
        concEnd.setFullYear(aqEnd.getFullYear() + 1);
        concEnd.setDate(concEnd.getDate() - 1);

        aqField.value = aqEnd.toLocaleDateString('pt-BR');
        concField.value = concEnd.toLocaleDateString('pt-BR');

        const today = new Date();
        today.setHours(0,0,0,0);
        
        // --- Lógica condicional da cor vermelha ---
        const inConcessivo = today >= aqEnd && today <= concEnd;
        const diasRestantes = Math.floor((concEnd - today) / (1000 * 60 * 60 * 24));
        
        // Verificar se há férias programadas dentro do período concessivo
        const fInicioEl = document.getElementById('colab-ferias-programadas-inicio');
        const fFimEl = document.getElementById('colab-ferias-programadas-fim');
        let feriasNoPeriodo = false;
        if (fInicioEl && fInicioEl.value && fFimEl && fFimEl.value) {
            const fInicio = new Date(fInicioEl.value + 'T12:00:00');
            const fFim = new Date(fFimEl.value + 'T12:00:00');
            // Férias estão dentro do período concessivo se houver sobreposição
            feriasNoPeriodo = fInicio <= concEnd && fFim >= aqEnd;
        }

        // Pintar vermelho apenas se: em período concessivo, sem férias programadas, e ≤ 90 dias
        if (inConcessivo && !feriasNoPeriodo && diasRestantes <= 90) {
            concField.style.color = '#e03131';
            concField.style.fontWeight = '700';
        } else {
            concField.style.color = '#495057';
            concField.style.fontWeight = '600';
        }

        // Mostrar indicador de alerta se já passou do período aquisitivo
        if (today >= aqEnd) {
            indicator.style.display = 'flex';
        } else {
            indicator.style.display = 'none';
        }
    } catch (e) {
        console.error('Erro ao calcular datas de férias:', e);
    }
}

window.calculateVacationDays = function() {
    const inicioStr = document.getElementById('colab-ferias-programadas-inicio').value;
    const fimStr = document.getElementById('colab-ferias-programadas-fim').value;
    const totalField = document.getElementById('colab-ferias-total-dias');

    if (!inicioStr || !fimStr) {
        totalField.value = '-';
        return;
    }

    const start = new Date(inicioStr);
    const end = new Date(fimStr);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        totalField.value = '-';
        return;
    }

    const diffTime = end.getTime() - start.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    if (diffDays < 0) {
        totalField.value = 'Data Inválida';
    } else {
        totalField.value = `${diffDays} ${diffDays === 1 ? 'dia' : 'dias'}`;
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
                        <th style="padding-left: 1rem; width: 50px;">Foto</th>
                        <th>Nome</th>
                        <th>Experiência</th>
                        <th>CPF</th>
                        <th>Departamento</th>
                        <th>Cargo</th>
                        <th>Admissão</th>
                        <th>Status</th>
                        <th style="text-align: right; padding-right: 1.5rem;">Ações</th>
                    </tr>
                </thead>
                <tbody>
                    ${lista.map(c => {
                        const d = c.data_admissao ? new Date(c.data_admissao).toLocaleDateString('pt-BR') : '-';
                        expInfoHtml = `<div style="font-size: 0.95rem;">${d}</div>`;
                        let probationDatesHtml = '';
                        if (c.data_admissao) {
                            const adm = new Date(c.data_admissao + 'T12:00:00');
                            const d45 = new Date(adm); d45.setDate(adm.getDate() + 45);
                            const d90 = new Date(adm); d90.setDate(adm.getDate() + 90);
                            probationDatesHtml = `
                                <div style="font-size: 7pt; color: #94a3b8; line-height: 1.1; margin-top: 2px;">
                                    1º: ${d45.toLocaleDateString('pt-BR')}<br>
                                    2º: ${d90.toLocaleDateString('pt-BR')}
                                </div>
                            `;
                        }

                        let statusHtml = '';
                        const effectiveStatus = getEffectiveStatus(c);
                        if (effectiveStatus === 'Aguardando início') statusHtml = `<div style="background:#f1f3f5; color:#495057; border: 2px solid #adb5bd; border-radius:20px; font-weight:600; padding:2px 10px; display:inline-flex; align-items:center; gap:4px; font-size:0.75rem;"><i class="ph ph-clock"></i> Aguardando</div>`;
                        else if (effectiveStatus === 'Processo iniciado') statusHtml = `<div style="background:#e7f5ff; color:#1864ab; border: 2px solid #1864ab; border-radius:20px; font-weight:600; padding:2px 10px; display:inline-flex; align-items:center; gap:4px; font-size:0.75rem;"><i class="ph ph-hourglass"></i> Iniciado</div>`;
                        else if (effectiveStatus === 'Ativo') statusHtml = `<div style="background:#e8f5e9; color:#196b36; border: 2px solid #196b36; border-radius:20px; font-weight:600; padding:2px 10px; display:inline-flex; align-items:center; gap:4px; font-size:0.75rem;"><i class="ph ph-check-circle"></i> Ativo</div>`;
                        else if (effectiveStatus === 'Férias') statusHtml = `<div style="background:#fdf7e3; color:#c2aa72; border: 2px solid #c2aa72; border-radius:20px; font-weight:600; padding:2px 10px; display:inline-flex; align-items:center; gap:4px; font-size:0.75rem;"><i class="ph ph-airplane-tilt"></i> Férias</div>`;
                        else if (effectiveStatus === 'Afastado') statusHtml = `<div style="background:#faeed9; color:#eaa15f; border: 2px solid transparent; border-radius:20px; font-weight:600; padding:2px 10px; display:inline-flex; align-items:center; gap:4px; font-size:0.75rem;"><i class="ph ph-warning"></i> Afastado</div>`;
                        else if (effectiveStatus === 'Desligado') statusHtml = `<div style="background:#fceeee; color:#ba7881; border: 2px solid transparent; border-radius:20px; font-weight:600; padding:2px 10px; display:inline-flex; align-items:center; gap:4px; font-size:0.75rem;"><i class="ph ph-x-circle"></i> Desligado</div>`;
                        else if (effectiveStatus === 'Incompleto') statusHtml = `<div style="background:#f8f9fa; color:#6c757d; border: 2px solid transparent; border-radius:20px; font-weight:600; padding:2px 10px; display:inline-flex; align-items:center; gap:4px; font-size:0.75rem;"><i class="ph ph-pencil-simple"></i> Incompleto</div>`;
                        else statusHtml = `<div style="background:#f1f3f5; color:#495057; border: 2px solid #adb5bd; border-radius:20px; font-weight:600; padding:2px 10px; display:inline-flex; align-items:center; gap:4px; font-size:0.75rem;"><i class="ph ph-clock"></i> Aguardando</div>`;

                        // Cálculo da Tag de Experiência
                        let experienceColHtml = '-';
                        if (c.data_admissao) {
                            const adm = new Date(c.data_admissao + 'T12:00:00');
                            const today = new Date(); today.setHours(12,0,0,0);
                            const diffDays = Math.floor((today - adm) / (1000 * 60 * 60 * 24));
                            
                            if (diffDays >= 0 && diffDays <= 90) {
                                let tagHtml = diffDays <= 45 
                                    ? `<span class="probation-badge" style="font-size: 0.65rem; padding: 0.2rem 0.5rem; min-width: 50px;">1º 45</span>`
                                    : `<span class="probation-badge second" style="font-size: 0.65rem; padding: 0.2rem 0.5rem; min-width: 50px;">2º 45</span>`;
                                
                                experienceColHtml = `
                                    <div style="display: flex; flex-direction: column; align-items: flex-start;">
                                        ${tagHtml}
                                        ${probationDatesHtml}
                                    </div>
                                `;
                            }
                        }

                        const photoUrl = `${API_URL}/colaboradores/foto/${c.id}?t=${Date.now()}`;
                        const fallbackIcon = `data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiNjYmQ1ZTEiIHN0cm9rZS13aWR0aD0iMS41IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxwYXRoIGQ9Ik0yMCAyMWE4IDggMCAwMC0xNiAwIi8+PGNpcmNsZSBjeD0iMTIiIGN5PSI3IiByPSI0Ii8+PC9zdmc+`;

                        return `
                            <tr>
                                <td style="padding-left: 1rem;">
                                    <div style="width: 36px; height: 36px; border-radius: 50%; overflow: hidden; border: 1px solid #e2e8f0; background: #f8fafc;">
                                        <img src="${photoUrl}" onerror="this.src='${fallbackIcon}'" style="width: 100%; height: 100%; object-fit: cover;">
                                    </div>
                                </td>
                                <td>
                                    <div style="display: flex; flex-direction: column;">
                                        <strong style="color: #334155; font-size: 0.95rem;">${c.nome_completo || 'Sem Nome'}</strong>
                                    </div>
                                </td>
                                <td>${experienceColHtml}</td>
                                <td style="color: #64748b; font-size: 0.85rem;">${c.cpf || '-'}</td>
                                <td style="color: #64748b; font-size: 0.85rem;">${c.departamento || '-'}</td>
                                <td style="color: #64748b; font-size: 0.85rem;">${c.cargo || '-'}</td>
                                <td>${expInfoHtml}</td>
                                <td>${statusHtml}</td>
                                <td style="text-align: right; padding-right: 1rem;">
                                    <div style="display: flex; gap: 0.4rem; justify-content: flex-end;">
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
        'colab-fgts-opcao', 'colab-banco-nome', 'colab-banco-agencia', 'colab-banco-conta',
        'colab-faculdade-data-inicio', 'colab-faculdade-data-termino', 'colab-academia-data-inicio', 'colab-terapia-data-inicio', 'colab-celular-data', 'colab-chaves-data'
    ];
    novosCamposIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    
    // Reset Férias Info
    if (document.getElementById('ferias-periodo-aquisitivo')) document.getElementById('ferias-periodo-aquisitivo').value = '-';
    if (document.getElementById('ferias-periodo-concessivo')) document.getElementById('ferias-periodo-concessivo').value = '-';
    if (document.getElementById('ferias-concessivo-indicator')) document.getElementById('ferias-concessivo-indicator').style.display = 'none';
    if (document.getElementById('colab-ferias-programadas-inicio')) document.getElementById('colab-ferias-programadas-inicio').value = '';
    if (document.getElementById('colab-ferias-programadas-fim')) document.getElementById('colab-ferias-programadas-fim').value = '';
    if (document.getElementById('colab-ferias-total-dias')) document.getElementById('colab-ferias-total-dias').value = '-';
    if (document.getElementById('colab-alergias')) document.getElementById('colab-alergias').value = '';
    
    if (document.getElementById('colab-rg-tipo')) {
        document.getElementById('colab-rg-tipo').value = 'RG';
        if (typeof toggleTipoDocumento === 'function') toggleTipoDocumento();
    }

    const titleEl = document.getElementById('form-colab-title');
    if (titleEl) titleEl.textContent = 'Cadastrar Colaborador';
    
    // Reset status badges (no longer used, but good to clean if they were there)
    const statusContainer = document.getElementById('status-chips-container');
    if (statusContainer) {
        updateStatusChip('Aguardando início');
    }

    const admissionBar = document.getElementById('admission-status-bar');
    if (admissionBar) admissionBar.style.display = 'none';

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
    
    // Dependentes reset
    const depContainer = document.getElementById('dependentes-container');
    if (depContainer) depContainer.innerHTML = '';
    const noDepMsg = document.getElementById('no-dependentes-msg');
    if (noDepMsg) noDepMsg.style.display = 'block';

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
    
    checkQuickDocsState();
    const errorCpf = document.getElementById('cpf-error');
    if(errorCpf) errorCpf.style.display = 'none';

    const radioFacNao = document.querySelector('input[name="faculdade_participa"][value="Não"]');
    if (radioFacNao) { radioFacNao.checked = true; toggleFormacaoFields('Não'); }
    
    const radioAcadNao = document.querySelector('input[name="academia_participa"][value="Não"]');
    if (radioAcadNao) { radioAcadNao.checked = true; toggleAcademiaFields('Não'); }
    
    const radioTeraNao = document.querySelector('input[name="terapia_participa"][value="Não"]');
    if (radioTeraNao) { radioTeraNao.checked = true; toggleTerapiaFields('Não'); }
    
    const radioCeluNao = document.querySelector('input[name="celular_participa"][value="Não"]');
    if (radioCeluNao) { radioCeluNao.checked = true; toggleCelularFields('Não'); }
    
    const radioChavesNao = document.querySelector('input[name="chaves_participa"][value="Não"]');
    if (radioChavesNao) { radioChavesNao.checked = true; toggleChavesColabFields('Não'); }
};

window.editColaborador = async function(id) {
    // Botão de sincronização manual ocultado (a automação já faz isso ao salvar)
    const formSyncBtn = document.getElementById('btn-form-sync-onedrive');
    if (formSyncBtn) {
        formSyncBtn.style.display = 'none';
        formSyncBtn.onclick = function() { window.syncOneDriveManual(id, this); };
    }

    try {
        await loadSelects();
        const c = await apiGet(`/colaboradores/${id}`);
        if (!c) return;
        
        const docs = await apiGet(`/colaboradores/${id}/documentos`);
        currentDocs = docs || [];

        viewedColaborador = c;

        const titleEl = document.getElementById('form-colab-title');
        if (titleEl) titleEl.textContent = c.nome_completo || `Colaborador #${c.id}`;

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
        
        const bConta = document.getElementById('colab-banco-conta');
        if (bConta) bConta.value = c.banco_conta || '';
        
        if (document.getElementById('colab-meio-transporte')) {
            document.getElementById('colab-meio-transporte').value = c.meio_transporte || '';
            toggleTransporteValor(c.meio_transporte);
        }
        if (document.getElementById('colab-valor-transporte')) {
            const val = c.valor_transporte ? parseFloat(c.valor_transporte).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '';
            document.getElementById('colab-valor-transporte').value = val;
        }

        if (document.getElementById('colab-escala-padrao')) {
            document.getElementById('colab-escala-padrao').value = c.escala_tipo || '';
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
        
        // Férias fields
        if(document.getElementById('colab-ferias-programadas-inicio')) document.getElementById('colab-ferias-programadas-inicio').value = c.ferias_programadas_inicio || '';
        if(document.getElementById('colab-ferias-programadas-fim')) document.getElementById('colab-ferias-programadas-fim').value = c.ferias_programadas_fim || '';
        updateVacationInfo(admDate);
        calculateVacationDays();
        
        if (document.getElementById('colab-alergias')) document.getElementById('colab-alergias').value = c.alergias || '';
        
        if(typeof toggleMotorista === 'function') toggleMotorista();
        
        // Faculdade fields
        const participa = c.faculdade_participa || 'Não';
        const radioP = document.querySelector(`input[name="faculdade_participa"][value="${participa}"]`);
        if (radioP) radioP.checked = true;
        toggleFormacaoFields(participa);
        
        if (document.getElementById('colab-faculdade-data-termino')) document.getElementById('colab-faculdade-data-termino').value = c.faculdade_data_termino || '';

        // Academia
        const participaAcad = c.academia_participa || 'Não';
        const radioAcad = document.querySelector(`input[name="academia_participa"][value="${participaAcad}"]`);
        if (radioAcad) radioAcad.checked = true;
        toggleAcademiaFields(participaAcad);
        if (document.getElementById('colab-academia-data-inicio')) document.getElementById('colab-academia-data-inicio').value = c.academia_data_inicio || '';

        // Terapia
        const participaTera = c.terapia_participa || 'Não';
        const radioTera = document.querySelector(`input[name="terapia_participa"][value="${participaTera}"]`);
        if (radioTera) radioTera.checked = true;
        toggleTerapiaFields(participaTera);
        if (document.getElementById('colab-terapia-data-inicio')) document.getElementById('colab-terapia-data-inicio').value = c.terapia_data_inicio || '';

        // Celular
        const participaCelu = c.celular_participa || 'Não';
        const radioCelu = document.querySelector(`input[name="celular_participa"][value="${participaCelu}"]`);
        if (radioCelu) radioCelu.checked = true;
        toggleCelularFields(participaCelu);
        if (document.getElementById('colab-celular-data')) document.getElementById('colab-celular-data').value = c.celular_data || '';

        // Chaves
        const participaChaves = c.chaves_participa || 'Não';
        const radioChaves = document.querySelector(`input[name="chaves_participa"][value="${participaChaves}"]`);
        if (radioChaves) radioChaves.checked = true;
        toggleChavesColabFields(participaChaves);
        
        // Add selected keys row by row
        if (c.chaves_lista && Array.isArray(c.chaves_lista)) {
            const container = document.getElementById('colab-chaves-rows-container');
            if (container) container.innerHTML = '';
            for (const item of c.chaves_lista) {
                await addNewChaveRow(item.chave_id, item.data_entrega);
            }
        }

        document.getElementById('colab-ferias-programadas-inicio').value = c.ferias_programadas_inicio || '';
        document.getElementById('colab-ferias-programadas-fim').value = c.ferias_programadas_fim || '';
        document.getElementById('colab-alergias').value = c.alergias || '';
        calculateVacationDays();

        updateStatusChip(getEffectiveStatus(c));
        
        if (c.estado_civil === 'Casado' || c.estado_civil === 'União Estável') {
            toggleConjuge();
            const deps = await apiGet(`/colaboradores/${id}/dependentes`);
            const conjuge = deps ? deps.find(d => d.grau_parentesco === 'Cônjuge') : null;
            if (conjuge) {
                document.getElementById('conjuge-id').value = conjuge.id;
                document.getElementById('conjuge-nome').value = conjuge.nome || '';
                document.getElementById('conjuge-cpf').value = conjuge.cpf || '';
            }
        } else {
            toggleConjuge();
            document.getElementById('conjuge-id').value = '';
            document.getElementById('conjuge-nome').value = '';
            document.getElementById('conjuge-cpf').value = '';
        }

        const stateNew = document.getElementById('photo-state-new');
        const stateUploadable = document.getElementById('photo-state-uploadable');
        const stateSaved = document.getElementById('photo-state-saved');
        const fotoPreview = document.getElementById('colab-foto-preview');
        const fotoInput = document.getElementById('colab-foto-input');
        
        if (stateNew) stateNew.style.display = 'none';
        if (stateUploadable) stateUploadable.style.display = 'block';
        if (fotoInput) fotoInput.disabled = false;
        
        if (c.foto_base64) {
            if (stateSaved) stateSaved.style.display = 'none';
            if (fotoPreview) {
                fotoPreview.style.display = 'block';
                fotoPreview.src = c.foto_base64;
            }
        } else if (c.foto_path) {
            // Fallback para URL do servidor (caso haja foto antiga sem base64)
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
        
        // --- Admission Bar Logic ---
        const admissionBar = document.getElementById('admission-status-bar');
        const admissionText = document.getElementById('admission-status-text');
        const admissionBtn = document.getElementById('btn-iniciar-admissao');
        
        if (admissionBar && admissionText && admissionBtn) {
            if (c.status === 'Aguardando início' || c.status === 'Processo iniciado') {
                admissionBar.style.display = 'flex';
                admissionText.textContent = c.status;
                admissionBtn.innerHTML = '<i class="ph ph-arrow-right"></i> Página Admissão';
                admissionBtn.onclick = () => navigateTo('admissao');
                admissionBtn.style.opacity = '1';
                admissionBtn.style.cursor = 'pointer';
            } else if (c.status === 'Ativo') {
                admissionBar.style.display = 'flex';
                admissionText.textContent = 'Admissão Concluída';
                admissionBtn.innerHTML = '<i class="ph ph-check-square"></i> Concluída';
                admissionBtn.onclick = null;
                admissionBtn.style.opacity = '0.7';
                admissionBtn.style.cursor = 'default';
            } else {
                admissionBar.style.display = 'none';
            }
        }
        
        // Dependentes
        const container = document.getElementById('dependentes-container');
        if (container) {
            container.innerHTML = '';
            // Filtra cônjuge para não aparecer na lista de dependentes
            const children = (c.dependentes || []).filter(d => d.grau_parentesco !== 'Cônjuge');
            if (children.length > 0) {
                document.getElementById('no-dependentes-msg').style.display = 'none';
                children.forEach(dep => {
                    window.addDependenteRow(dep.nome, dep.cpf, dep.data_nascimento, dep.grau_parentesco);
                });
            } else {
                document.getElementById('no-dependentes-msg').style.display = 'block';
            }
        }

        navigateTo('form-colaborador');
        
        // Preencher aviso de ASO enviado se houver
        const asoNotice = document.getElementById('aso-email-notice');
        const asoNoticeDate = document.getElementById('aso-notice-date');
        const asoNoticeAgendada = document.getElementById('aso-notice-agendada');
        if (asoNotice && asoNoticeDate && asoNoticeAgendada) {
            if (viewedColaborador.aso_email_enviado) {
                asoNotice.style.display = 'block';
                asoNoticeDate.innerText = viewedColaborador.aso_email_enviado;
                asoNoticeAgendada.innerText = viewedColaborador.aso_exame_data || '--/--/--';
            } else {
                asoNotice.style.display = 'none';
            }
        }

        // Carregar links Assinafy
        const link1 = document.getElementById('aso-assinafy-link-1');
        const linkExames = document.getElementById('aso-assinafy-link-exames');
        if (link1) link1.value = viewedColaborador.aso_assinafy_link || '';
        if (linkExames) linkExames.value = viewedColaborador.aso_exames_assinafy_link || '';

        setTimeout(() => {
            if(typeof toggleMotorista === 'function') toggleMotorista();
        }, 100);
    } catch (err) {
        console.error('Erro ao editar colaborador:', err);
        alert('Ocorreu um erro ao carregar os dados para edição: ' + err.message);
    }
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
            if (!nomeInput || !nomeInput.value.trim()) {
                alert("Por favor, preencha o Nome Completo do colaborador.");
                nomeInput && nomeInput.focus();
                return;
            }
            if (cpfInput && cpfInput.value.replace(/\D/g, '').length < 11) {
                alert("CPF do Colaborador inválido ou incompleto.");
                return;
            }
            // Cônjuge e CNH: preenchimento opcional
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
            
            dependentes: (() => {
                const results = [];
                // Incluir Cônjuge se Casado ou União Estável
                const estCivil = document.getElementById('colab-estadocivil').value;
                if (estCivil === 'Casado' || estCivil === 'União Estável') {
                    const cNome = document.getElementById('conjuge-nome').value;
                    const cCpf = document.getElementById('conjuge-cpf').value;
                    if (cNome) {
                        results.push({
                            nome: cNome,
                            cpf: cCpf,
                            data_nascimento: null,
                            grau_parentesco: 'Cônjuge'
                        });
                    }
                }
                // Incluir Filhos
                const rows = document.querySelectorAll('.dependente-row');
                rows.forEach(row => {
                    const nome = row.querySelector('.dep-nome').value;
                    if (nome) {
                        results.push({
                            nome: nome,
                            cpf: row.querySelector('.dep-cpf').value,
                            data_nascimento: row.querySelector('.dep-nascimento').value,
                            grau_parentesco: 'Filho'
                        });
                    }
                });
                return results;
            })(),
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
            valor_transporte: document.getElementById('colab-valor-transporte') ? document.getElementById('colab-valor-transporte').value : null,
            alergias: document.getElementById('colab-alergias') ? document.getElementById('colab-alergias').value : null,
            faculdade_participa: document.querySelector('input[name="faculdade_participa"]:checked')?.value || 'Não',
            faculdade_curso_id: document.getElementById('colab-faculdade-curso') ? document.getElementById('colab-faculdade-curso').value : null,
            faculdade_data_inicio: document.getElementById('colab-faculdade-data-inicio') ? document.getElementById('colab-faculdade-data-inicio').value : null,
            faculdade_data_termino: document.getElementById('colab-faculdade-data-termino') ? document.getElementById('colab-faculdade-data-termino').value : null,
            academia_participa: document.querySelector('input[name="academia_participa"]:checked')?.value || 'Não',
            academia_data_inicio: document.getElementById('colab-academia-data-inicio') ? document.getElementById('colab-academia-data-inicio').value : null,
            terapia_participa: document.querySelector('input[name="terapia_participa"]:checked')?.value || 'Não',
            terapia_data_inicio: document.getElementById('colab-terapia-data-inicio') ? document.getElementById('colab-terapia-data-inicio').value : null,
            celular_participa: document.querySelector('input[name="celular_participa"]:checked')?.value || 'Não',
            celular_data: document.getElementById('colab-celular-data') ? document.getElementById('colab-celular-data').value : null,
            chaves_participa: document.querySelector('input[name="chaves_participa"]:checked')?.value || 'Não',
            chaves_lista: Array.from(document.querySelectorAll('.chave-entry-row')).map(row => ({
                chave_id: row.querySelector('.colab-chave-select').value,
                data_entrega: row.querySelector('.colab-chave-date').value
            })).filter(x => x.chave_id),
            ferias_programadas_inicio: document.getElementById('colab-ferias-programadas-inicio') ? document.getElementById('colab-ferias-programadas-inicio').value : null,
            ferias_programadas_fim: document.getElementById('colab-ferias-programadas-fim') ? document.getElementById('colab-ferias-programadas-fim').value : null
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

        let c_status = statusInput ? statusInput.value : 'Aguardando início';
        if (!id) {
            // Todos novos registros iniciam como Aguardando início
            c_status = 'Aguardando início';
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
                colabId = id; 
            } else {
                const res = await apiPost('/colaboradores', data);
                if (res.error) throw new Error(res.error);
                if (res && res.id) colabId = res.id;
            }

            if (colabId) {
                if (submitter) {
                    submitter.disabled = true;
                    submitter.innerHTML = '<i class="ph ph-spinner-gap ph-spin"></i> Salvar';
                }
                const syncRes = await fetch(`${API_URL}/colaboradores/${colabId}/sync-onedrive`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${currentToken}` }
                });
                const dataSync = await syncRes.json();
                // Navegação silenciosa — sem alertas de confirmação
            } else {
                // Colaborador salvo sem sync (novo colaborador)
            }

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
    viewedColaborador = { id, nome_completo: nome, cargo, cpf, sexo, data_admissao: admissao, status, rg_tipo: rgTipo };
    
    // Vincular botão IMEDIATAMENTE (antes de qualquer await)
    const syncBtn = document.getElementById('btn-sync-onedrive');
    if (syncBtn) {
        syncBtn.onclick = function() { window.syncOneDriveManual(id, this); };
    }

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
        const s = getEffectiveStatus(viewedColaborador || { status });
        let statusHtml = '';
        if (s === 'Aguardando início') statusHtml = `<div style="background:#f1f3f5; color:#495057; border: 1px solid #adb5bd; border-radius:20px; font-weight:600; padding:2px 10px; font-size:0.75rem; display:inline-flex; align-items:center; gap:4px;"><i class="ph ph-clock"></i> Aguardando</div>`;
        else if (s === 'Processo iniciado') statusHtml = `<div style="background:#e7f5ff; color:#1864ab; border: 1px solid #1864ab; border-radius:20px; font-weight:600; padding:2px 10px; font-size:0.75rem; display:inline-flex; align-items:center; gap:4px;"><i class="ph ph-hourglass"></i> Iniciado</div>`;
        else if (s === 'Ativo') statusHtml = `<div style="background:#e8f5e9; color:#196b36; border: 1px solid #196b36; border-radius:20px; font-weight:600; padding:2px 10px; font-size:0.75rem; display:inline-flex; align-items:center; gap:4px;"><i class="ph ph-check-circle"></i> Ativo</div>`;
        else if (s === 'Férias') statusHtml = `<div style="background:#fdf7e3; color:#c2aa72; border: 1px solid #c2aa72; border-radius:20px; font-weight:600; padding:2px 10px; font-size:0.75rem; display:inline-flex; align-items:center; gap:4px;"><i class="ph ph-airplane-tilt"></i> Férias</div>`;
        else if (s === 'Afastado') statusHtml = `<div style="background:#faeed9; color:#eaa15f; border: 1px solid #eaa15f; border-radius:20px; font-weight:600; padding:2px 10px; font-size:0.75rem; display:inline-flex; align-items:center; gap:4px;"><i class="ph ph-warning"></i> Afastado</div>`;
        else if (s === 'Desligado') statusHtml = `<div style="background:#fceeee; color:#ba7881; border: 1px solid #ba7881; border-radius:20px; font-weight:600; padding:2px 10px; font-size:0.75rem; display:inline-flex; align-items:center; gap:4px;"><i class="ph ph-x-circle"></i> Desligado</div>`;
        statusDisplay.innerHTML = statusHtml;
    }

    // Foto no Prontuário
    const fotoImg = document.getElementById('prontuario-foto-img');
    const fotoPlaceholder = document.getElementById('prontuario-photo-placeholder');
    if (fotoImg && fotoPlaceholder) {
        const fotoSrc = viewedColaborador.foto_base64 || 
            (viewedColaborador.foto_path ? `${API_URL.replace('/api', '')}/${viewedColaborador.foto_path}?t=${Date.now()}` : null);
        if (fotoSrc) {
            fotoImg.src = fotoSrc;
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


window.renderTabContent = function(tabId, tabTitle, preventScroll = false) {
    const container = document.getElementById('tab-dynamic-content');
    if (!container) return;
    if (!preventScroll) window.scrollTo({ top: 0, behavior: 'smooth' });
    
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
        const participa = viewedColaborador && (viewedColaborador.terapia_participa === 'Sim');
        if (!participa) {
            listContainer.innerHTML = '<div class="alert alert-info"><i class="ph ph-info"></i> Esta aba está disponível apenas para colaboradores que participam da Terapia em Grupo.</div>';
            return;
        }
        renderTerapiaTab(listContainer, tabId, filteredDocs);
    } else if (tabId === 'Dependentes' || tabId === 'Treinamento' || tabId === 'Conjuge' || tabId === 'Faculdade' || tabId === 'NRs') {
        if (tabId === 'Conjuge') {
            const isCasado = viewedColaborador && (viewedColaborador.estado_civil === 'Casado');
            if (!isCasado) {
                listContainer.innerHTML = '<div class="alert alert-info"><i class="ph ph-info"></i> Esta aba está disponível apenas para colaboradores com estado civil <strong>"Casado(a)"</strong> registrado.</div>';
                return;
            }
        }
        if (tabId === 'Faculdade') {
            const participa = viewedColaborador && (viewedColaborador.faculdade_participa === 'Sim');
            if (!participa) {
                listContainer.innerHTML = '<div class="alert alert-info"><i class="ph ph-info"></i> Esta aba está disponível apenas para colaboradores que participam do programa FormaAção.</div>';
                return;
            }
            renderFaculdadeTab(listContainer, tabId);
            return;
        }
        const btnLabelMap = { 'Dependentes': 'Documento de Dependente', 'Treinamento': 'Certificado/Curso', 'Conjuge': 'Documento do Cônjuge', 'NRs': 'Certificado NR' };
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
                if (tabId === 'Contratos' && docType === 'Contrato faculdade') {
                    const participa = (viewedColaborador && viewedColaborador.faculdade_participa) ? viewedColaborador.faculdade_participa : 'Não';
                    if (participa === 'Não') {
                        const existingDoc = filteredDocs.find(d => d.document_type === docType);
                        const msg = 'Não aplicável para colaboradores que não participam do programa FormaAção.';
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

async function renderFaculdadeSummary(container) {
    if (!viewedColaborador) return;
    const cursos = await apiGet('/cursos-faculdade');
    const cursoObj = (cursos || []).find(c => c.id == viewedColaborador.faculdade_curso_id);
    const summaryDiv = document.createElement('div');
    summaryDiv.className = 'card mb-4';
    summaryDiv.style.background = '#f0f9ff';
    summaryDiv.style.border = '1px solid #bae6fd';
    summaryDiv.style.padding = '1rem';
    const cursoNome = cursoObj ? cursoObj.nome_curso : 'Não selecionado';
    const instituicao = cursoObj ? cursoObj.instituicao : 'N/A';
    const tempo = cursoObj ? (cursoObj.tempo_curso || 'N/A') : 'N/A';
    const inicio = viewedColaborador.faculdade_data_inicio ? new Date(viewedColaborador.faculdade_data_inicio + 'T12:00:00').toLocaleDateString() : 'N/A';
    const termino = viewedColaborador.faculdade_data_termino ? new Date(viewedColaborador.faculdade_data_termino + 'T12:00:00').toLocaleDateString() : 'N/A';
    summaryDiv.innerHTML = `
        <h4 style="color: #0369a1; margin-bottom: 0.5rem;"><i class="ph ph-graduation-cap"></i> Detalhes da Graduação</h4>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; font-size: 0.9rem; color: #0c4a6e;">
            <div><strong>Curso:</strong> ${cursoNome}</div>
            <div><strong>Instituição:</strong> ${instituicao}</div>
            <div><strong>Início:</strong> ${inicio}</div>
            <div><strong>Previsão Término:</strong> ${termino}</div>
            <div class="span-2"><strong>Tempo de Curso:</strong> ${tempo}</div>
        </div>
    `;
    container.appendChild(summaryDiv);
}

async function renderFaculdadeTab(container, tabId) {
    const selectedYear = window.tabPersistence ? window.tabPersistence['fac_year'] : null;
    const selectedMonth = window.tabPersistence ? window.tabPersistence['fac_month'] : null;
    const optionsYears = getAnosAdmissaoOptions(selectedYear);
    
    // Header com Resumo
    await renderFaculdadeSummary(container);

    const selectorHtml = `
        <div class="card p-3 mb-4 flex-between bg-light">
            <div style="display:flex; gap:1rem; align-items:center;">
                <label>Ano:</label>
                <select id="fac_year" class="form-control" style="padding:0.4rem;" onchange="renderFaculdadeCompetencia()">
                    ${optionsYears}
                </select>
                <label>Mês:</label>
                <select id="fac_month" class="form-control" style="padding:0.4rem;" onchange="renderFaculdadeCompetencia()">
                    <option value="01">Jan</option><option value="02">Fev</option><option value="03">Mar</option>
                    <option value="04">Abr</option><option value="05">Mai</option><option value="06">Jun</option>
                    <option value="07">Jul</option><option value="08">Ago</option><option value="09">Set</option>
                    <option value="10">Out</option><option value="11">Nov</option><option value="12">Dez</option>
                </select>
                <button type="button" class="btn btn-primary" onclick="renderFaculdadeCompetencia()">Carregar</button>
            </div>
        </div>
        <div id="fac_competencia_container"></div>
    `;
    container.innerHTML += selectorHtml;
    
    const date = new Date();
    const yEl = document.getElementById('fac_year');
    const mEl = document.getElementById('fac_month');
    if (yEl) yEl.value = selectedYear || date.getFullYear().toString();
    if (mEl) mEl.value = selectedMonth || (date.getMonth() + 1).toString().padStart(2, '0');
    
    renderFaculdadeCompetencia();
}

window.renderFaculdadeCompetencia = function() {
    const y = document.getElementById('fac_year').value;
    const m = document.getElementById('fac_month').value;
    const subContainer = document.getElementById('fac_competencia_container');
    if (!subContainer) return;

    if (!window.tabPersistence) window.tabPersistence = {};
    window.tabPersistence['fac_year'] = y;
    window.tabPersistence['fac_month'] = m;

    subContainer.innerHTML = '';

    const docsMatch = currentDocs.filter(d => d.tab_name === 'Faculdade' && d.year == y && d.month == m);
    
    // Lista de documentos por competência
    const required = ['Boleto'];
    if (m === '01' || m === '07') {
        required.push('Boletim');
    }

    required.forEach(type => {
        const doc = docsMatch.find(d => d.document_type === type);
        subContainer.appendChild(createDocSlot('Faculdade', type, doc, `'${y}'`, `'${m}'`));
    });

    // Outros documentos dinâmicos para este mês
    docsMatch.filter(d => !required.includes(d.document_type)).forEach(d => {
        subContainer.appendChild(createDocSlot('Faculdade', d.document_type, d, `'${y}'`, `'${m}'`));
    });

    // Removido o formulário dinâmico conforme solicitação
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
            <div style="display: flex; flex-direction: column; gap: 0.2rem;">
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
                <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                    <div style="display: flex; gap: 0.5rem; align-items: flex-end;">
                        ${vencimentoInputHtml}
                        ${isSaved ? `
                            <button type="button" class="btn btn-secondary" onclick="viewDoc(${existingDoc.id})" title="Visualizar" style="height: 42px;"><i class="ph ph-eye"></i></button>
                            <button type="button" class="btn btn-danger" onclick="deleteDoc(${existingDoc.id})" title="Excluir" style="height: 42px;"><i class="ph ph-trash"></i></button>
                        ` : ''}
                        <label class="btn ${isSaved ? 'btn-warning' : 'btn-primary'}" title="${isSaved ? 'Substituir' : 'Fazer Upload'}" style="height: 42px; display: flex; align-items: center;">
                            <i class="ph ph-upload-simple"></i> ${isSaved ? 'Substituir' : 'Upload'}
                            <input type="file" accept=".pdf" style="display:none;" onchange="const venc = this.closest('.doc-item').querySelector('.venc-input')?.value; if((${needsVencimento}) && !venc) { alert('Data de vencimento é obrigatória'); this.value=''; return; } uploadDocument(this, '${tabId}', '${docType}', ${year}, ${month}, venc)">
                        </label>
                    </div>
                    
                    ${isSaved ? `
                        <div class="assinafy-integrated-container" style="display: flex; align-items: center; gap: 0.5rem;">
                            <button class="btn btn-sm btn-assinafy" style="flex:1;" onclick="window.iniciarAssinafy('${docType}', '${tabId}', this)" ${existingDoc.assinafy_status === 'Assinado' ? 'disabled' : ''}>
                                <i class="ph ph-pen-nib"></i> ${existingDoc.assinafy_status === 'Assinado' ? 'Assinado' : 'Assinar p/ Assinafy'}
                            </button>
                            <span class="assinafy-status-badge ${existingDoc.assinafy_status?.toLowerCase().replace(/\s+/g, '-') || ''}" style="font-size:0.7rem; font-weight:700;">
                                ${existingDoc.assinafy_status !== 'Nenhum' ? (existingDoc.assinafy_status || '').toUpperCase() : ''}
                            </span>
                            ${existingDoc.assinafy_url ? `
                                <div style="display: flex; flex-direction: column; gap: 0.2rem; min-width: 200px;">
                                    <div style="display: flex; gap: 0.5rem;">
                                        <button class="btn btn-sm" onclick="navigator.clipboard.writeText('${existingDoc.assinafy_url}'); alert('Link copiado para a área de transferência!');" title="Copiar Link" style="background:#007bff; color:white; padding: 0.3rem 0.6rem;">
                                            <i class="ph ph-copy"></i> Copiar
                                        </button>
                                        <a href="https://wa.me/55${(viewedColaborador?.telefone || '').replace(/\D/g,'')}?text=${encodeURIComponent('Olá, ' + (viewedColaborador?.nome_completo || 'Colaborador') + '.\n\nSeu ' + (docType === 'ASO Admissional' ? 'Exame Admissional' : 'documento (' + docType + ')') + ' está disponível para assinatura digital.\n\nClique no link abaixo para assinar:\n' + existingDoc.assinafy_url + '\n\nAmérica Rental Equipamentos Ltda.')}" target="_blank" class="btn btn-sm" title="Enviar p/ WhatsApp" style="background:#25D366; color:white; padding: 0.3rem 0.6rem; text-decoration:none; display:inline-flex; align-items:center; gap:4px;">
                                            <i class="ph ph-whatsapp-logo"></i> WhatsApp
                                        </a>
                                    </div>
                                    <div style="background: #f8f9fa; border: 1px dashed #ccc; padding: 4px; border-radius: 4px; margin-top: 4px;">
                                        <code style="word-break: break-all; font-size: 0.7rem; color: #333;">${existingDoc.assinafy_url}</code>
                                    </div>
                                </div>
                            ` : ''}
                        </div>
                    ` : ''}
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
            await loadDocumentosList(); // Para atualizar a exibição do Venc: dd/mm/aaaa no texto
            
            const viewAdm = document.getElementById('view-admissao');
            const isAdmActive = viewAdm && viewAdm.style.display !== 'none';
            
            if (isAdmActive && viewedColaborador) {
                updateAdmissaoStepPercentages();
                initAdmissaoWorkflow(viewedColaborador.id, window.currentActiveAdmissaoStep, true);
            } else {
                const activeTab = document.querySelector('#tabs-list li.active');
                if (activeTab) {
                    if (activeTab.dataset.tab === '05_Pagamentos') renderPagamentosCompetencia();
                    else renderTabContent(activeTab.dataset.tab, activeTab.textContent);
                }
            }
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
            
            const viewAdm = document.getElementById('view-admissao');
            const isAdmActive = viewAdm && viewAdm.style.display !== 'none';
            
            if (isAdmActive && viewedColaborador) {
                updateAdmissaoStepPercentages();
                initAdmissaoWorkflow(viewedColaborador.id, window.currentActiveAdmissaoStep, true);
            } else {
                const activeTab = document.querySelector('#tabs-list li.active');
                if(activeTab) {
                    if (tabId === 'Pagamentos') renderPagamentosCompetencia();
                    else if (tabId === 'ASO') renderASOAno();
                    else renderTabContent(tabId, activeTab.textContent);
                }
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
            
            const viewAdm = document.getElementById('view-admissao');
            const isAdmActive = viewAdm && viewAdm.style.display !== 'none';
            
            if (isAdmActive && viewedColaborador) {
                updateAdmissaoStepPercentages();
                initAdmissaoWorkflow(viewedColaborador.id, window.currentActiveAdmissaoStep, true);
            } else {
                const activeTab = document.querySelector('#tabs-list li.active');
                if (activeTab && activeTab.dataset.tab === '05_Pagamentos') renderPagamentosCompetencia();
                else if (activeTab) renderTabContent(activeTab.dataset.tab, activeTab.textContent);
            }
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
function getEffectiveStatus(c) {
    if (!c) return 'Ativo';
    let status = c.status || 'Ativo';
    
    // Se está "Ativo" ou "Férias", verificamos as datas para saber se deve mostrar Férias
    if (status === 'Ativo' || status === 'Férias') {
        if (c.ferias_programadas_inicio && c.ferias_programadas_fim) {
            const today = new Date().toISOString().split('T')[0];
            if (today >= c.ferias_programadas_inicio && today <= c.ferias_programadas_fim) {
                return 'Férias';
            }
        }
    }
    // Se o status era Férias mas saiu do período e não mudou manualmente para outra coisa, volta a ser Ativo
    if (status === 'Férias' && c.ferias_programadas_fim) {
        const today = new Date().toISOString().split('T')[0];
        if (today > c.ferias_programadas_fim) return 'Ativo';
    }

    return status;
}

function updateStatusChip(val) {
    document.querySelectorAll('.status-chip').forEach(c => {
        c.classList.remove('active');
        c.style.display = 'none'; 
    });
    const target = document.querySelector(`.status-chip[data-value="${val}"]`);
    if (target) {
        target.classList.add('active');
        target.style.display = 'flex';
    }
    
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
                    // A pré-visualização base64 já está correta no círculo.
                    // Não substituímos src por URL do servidor (efêmero no Render).
                    // Apenas garantimos que a foto seja visível após o upload.
                    const preview = document.getElementById('colab-foto-preview');
                    const stateSaved = document.getElementById('photo-state-saved');
                    if (preview) preview.style.display = 'block';
                    if (stateSaved) stateSaved.style.display = 'none';
                }
            })
            .catch(err => console.error("Erro no auto-upload de foto:", err));
        }
    }
}

window.checkQuickDocsState = function() {
    const idEl = document.getElementById('colab-id');
    const id = idEl ? idEl.value : '';
    const btnHeader = document.getElementById('btn-header-prontuario');
    
    if (id) {
        if(btnHeader) btnHeader.style.display = 'inline-flex';
    } else {
        if(btnHeader) btnHeader.style.display = 'none';
    }
};

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
    
    if (estado && (estado.value === 'Casado' || estado.value === 'União Estável')) {
        section.style.display = 'block';
    } else if (section) {
        section.style.display = 'none';
        if (nome) nome.required = false;
        if (cpf) cpf.required = false;
    }
};

window.toggleMotorista = function() {
    const cargoSelect = document.getElementById('colab-cargo');
    const section = document.getElementById('section-cnh');
    const num = document.getElementById('colab-cnh-numero');
    const cat = document.getElementById('colab-cnh-categoria');
    
    if (cargoSelect && cargoSelect.value.toUpperCase().includes('MOTORISTA')) {
        if(section) section.style.display = 'block';
    } else if(section) {
        section.style.display = 'none';
        if(num) num.value = '';
        if(cat) cat.value = '';
    }
};




// FORMATADORES E HELPERS
function formatStringGlobal(str) {
    if (!str) return "SEM_NOME";
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/[^A-Z0-9 ]/g, "").trim().replace(/\s+/g, "_");
}

window.mascaraCNH = function(el) {
    let v = el.value.replace(/\D/g, "");
    if (v.length > 11) v = v.substring(0, 11);
    el.value = v;
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

// --- GESTÃO DE FACULDADE ---
window.loadFaculdadeCursos = async function() {
    try {
        const response = await fetch(`${API_URL}/cursos-faculdade`, {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        const cursos = await response.json();
        renderFaculdadeCursos(cursos);
    } catch (err) { console.error('Erro ao carregar cursos:', err); }
};

function renderFaculdadeCursos(cursos) {
    const body = document.getElementById('table-faculdade-body');
    if (!body) return;
    body.innerHTML = cursos.map(c => `
        <tr>
            <td>
                <div style="font-weight: 600; color: var(--primary-color);">${c.nome_curso}</div>
                <div style="font-size: 0.8rem; color: #64748b;">${c.instituicao}</div>
            </td>
            <td>${c.tempo_curso || '-'}</td>
            <td>${c.valor_mensalidade ? 'R$ ' + c.valor_mensalidade.toLocaleString('pt-BR', {minimumFractionDigits: 2}) : '-'}</td>
            <td style="text-align: right;">
                <div style="display: flex; gap: 0.5rem; justify-content: flex-end;">
                    <button class="btn btn-warning btn-sm" onclick="editFaculdadeCurso(${JSON.stringify(c).replace(/"/g, '&quot;')})" title="Editar"><i class="ph ph-pencil-simple"></i></button>
                    <button class="btn btn-danger btn-sm" onclick="deleteFaculdadeCurso(${c.id})" title="Excluir"><i class="ph ph-trash"></i></button>
                </div>
            </td>
        </tr>
    `).join('');
}

const formFaculdade = document.getElementById('form-faculdade');
if (formFaculdade) {
    formFaculdade.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('faculdade-id').value;
        const data = {
            nome_curso: document.getElementById('faculdade-nome-curso').value,
            instituicao: document.getElementById('faculdade-instituicao').value,
            tempo_curso: document.getElementById('faculdade-tempo').value,
            valor_mensalidade: (function() {
                const val = document.getElementById('faculdade-mensalidade').value;
                if (!val) return 0;
                return parseFloat(val.replace(/[^\d,]/g, '').replace(',', '.'));
            })()
        };

        const method = id ? 'PUT' : 'POST';
        const url = id ? `${API_URL}/cursos-faculdade/${id}` : `${API_URL}/cursos-faculdade`;

        try {
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${currentToken}` },
                body: JSON.stringify(data)
            });
            if (res.ok) {
                alert('Curso salvo com sucesso!');
                resetFaculdadeForm();
                loadFaculdadeCursos();
            } else { alert('Erro ao salvar curso.'); }
        } catch (err) { console.error(err); }
    });
}

window.resetFaculdadeForm = function() {
    document.getElementById('form-faculdade').reset();
    document.getElementById('faculdade-id').value = '';
    document.getElementById('faculdade-form-title').textContent = 'Cadastrar Novo Curso';
};

window.editFaculdadeCurso = function(c) {
    document.getElementById('faculdade-id').value = c.id;
    document.getElementById('faculdade-nome-curso').value = c.nome_curso;
    document.getElementById('faculdade-instituicao').value = c.instituicao;
    document.getElementById('faculdade-tempo').value = c.tempo_curso || '';
    document.getElementById('faculdade-mensalidade').value = c.valor_mensalidade ? 'R$ ' + c.valor_mensalidade.toLocaleString('pt-BR', {minimumFractionDigits: 2}) : '';
    document.getElementById('faculdade-form-title').textContent = 'Editar Curso';
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.deleteFaculdadeCurso = async function(id) {
    if (!confirm('Deseja realmente excluir este curso?')) return;
    try {
        const res = await fetch(`${API_URL}/cursos-faculdade/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        if (res.ok) { loadFaculdadeCursos(); } else { alert('Erro ao excluir curso.'); }
    } catch (err) { console.error(err); }
};

// Fechar dropdown de CBO ao clicar fora
document.addEventListener('click', (e) => {
    const dropdown = document.getElementById('cbo-dropdown');
    const input = document.getElementById('colab-cbo-codigo');
    if (dropdown && input && !dropdown.contains(e.target) && e.target !== input) {
        dropdown.style.display = 'none';
    }
});

// --- GESTÃO DE GERADORES DE DOCUMENTOS ---

window.loadGeradores = async function() {
    try {
        let items = await apiGet('/geradores');
        
        // Se estiver vazio, criar os dois iniciais solicitados
        if (items.length === 0) {
            await seedInitialGeradores();
            items = await apiGet('/geradores');
        }
        
        // Guardar para busca
        window.allGeradores = items;
        window.renderGeradoresList(items);
    } catch (e) { console.error(e); }
};

window.renderGeradoresList = function(items) {
    const tbody = document.getElementById('table-geradores-body');
    if (!tbody) return;
    
    tbody.innerHTML = items.map(g => `
        <tr>
            <td>
                <div style="font-weight: 600; color: var(--primary-color);">${g.nome}</div>
            </td>
            <td>${g.created_at ? new Date(g.created_at).toLocaleDateString() : '-'}</td>
            <td style="text-align: right;">
                <div style="display: flex; gap: 0.5rem; justify-content: flex-end;">
                    <button class="btn btn-primary btn-sm" onclick="window.abrirModalSelecaoColab(${g.id})" title="Visualizar Documento"><i class="ph ph-eye"></i></button>
                    <button class="btn btn-warning btn-sm" onclick="window.editGerador(${g.id})" title="Editar"><i class="ph ph-pencil-simple"></i></button>
                    <button class="btn btn-danger btn-sm" onclick="window.deleteGerador(${g.id})" title="Excluir"><i class="ph ph-trash"></i></button>
                </div>
            </td>
        </tr>
    `).join('');
};

window.filterGeradores = function() {
    const q = document.getElementById('search-geradores').value.toLowerCase();
    const filtered = (window.allGeradores || []).filter(g => g.nome.toLowerCase().includes(q));
    window.renderGeradoresList(filtered);
};

async function seedInitialGeradores() {
    const templates = [
        {
            nome: "Acordo Individual Benefícios",
            conteudo: `
<p style="margin-top: 1.5rem;">CARO COLABORADOR,</p>
<p>Á EMPRESA:</p>

<p style="margin-top: 1.5rem;">
    <b>AMERICA RENTAL EQUIPAMENTOS LTDA</b>, Situada na Rua Salto da Divisa, nº 97, CEP 07252-300, Pq Alvorada - Guarulhos SP, inscrita no CNPJ sob o nº 03.434.448/0001-01, neste ato representado pela sócia proprietária Sra. Nicole Mezuraro Maio, brasileira, solteira, empresária, portadora da cédula de identidade R.G. nº 43.690.066 SSP/SP e CPF/MF nº 355.026.968-47, doravante denominada EMPRESA.
</p>

<p style="margin-top: 1.5rem;">
    Decidem as partes, na melhor forma de direito, celebrar o presente <b>ACORDO INDIVIDUAL</b>, para fins de alterar algumas condições do atual contrato de trabalho vigente, que reger-se-á mediante as cláusulas e condições adiante estipuladas.
</p>

<p style="margin-top: 1.5rem;"><b>CLÁUSULA PRIMEIRA - DOS MOTIVOS</b></p>
<p>Com o foco de acrescentar melhorias e qualidade de vida aos colaboradores a empresa <b>AMERICA RENTAL EQUIPAMENTOS LTDA</b>, por mera liberalidade, disponibiliza convênios com os estabelecimentos:</p>

<ol style="margin-top: 1rem; line-height: 2;">
    <li>REDE DROGA LESTE FARMÁCIA</li>
    <li>SUPERMERCADO PARAISO - MERCADINHO BERLIM LTDA - ME</li>
    <li>ACADEMIA - ATITUDE FITNESS</li>
</ol>

<p style="margin-top: 1.5rem;"><b>CLÁUSULA SEGUNDA – DOS DESCONTOS E DOS ESTABELICIMENTOS</b></p>
<p>O colaborador autoriza os descontos de seu salário caso venha utilizar os convênios colocados a sua disposição, conforme numerados na cláusula anterior. Ademais, o colaborador fica ciente que não é obrigado a utilizar o convênio, logo, sem a utilização não haverá qualquer desconto de sua folha de pagamento.</p>

<p style="margin-top: 1.5rem;"><b>CLÁUSULA TERCEIRA - DA VIGÊNCIA</b></p>
<p>O presente acordo vigorará a partir da presente data pelo período da vigência do contrato de trabalho do Colaborador.</p>
            `,
            variaveis: ""
        },
        {
            nome: "Autorização de Uso de Imagem",
            conteudo: `
<p style="margin-top: 2rem;">
    <b>AUTORIZO</b> o uso de minha imagem e voz, em todo e qualquer material entre fotos, documentos e outros meios de comunicação, para campanhas promocionais e institucionais e etc. desta empresa, <b>AMERICA RENTAL EQUIPAMENTOS LTDA</b>, Situada na Rua Salto da Divisa, nº 97, CEP 07252-300, Pq Alvorada - Guarulhos SP, inscrita no CNPJ sob o nº 03.434.448/0001-01, sejam essas destinadas à divulgação ao público em geral e/ou apenas para uso interno, e desde que não haja desvirtuamento da sua finalidade.
</p>

<p style="margin-top: 1.5rem;">
    A presente autorização é concedida a título gratuito, abrangendo o uso da imagem acima mencionada em todo território nacional e no exterior, sob qualquer forma e meios, ou sejam, em destaque: (I) out-door; (II) bus-door; folhetos em geral (encartes, mala direta, catálogo, etc.); (III) folder de apresentação; (IV) anúncios em revistas e jornais em geral; (V) home page; (VI) cartazes; (VII) back-light; (VIII) mídia eletrônica (painéis, vídeo-tapes, televisão, cinema, programa para rádio, rede social entre outros).
</p>

<p style="margin-top: 1.5rem;">
    Por esta ser a expressão da minha vontade declaro que autorizo o uso acima descrito sem que nada haja a ser reclamado a título de direitos conexos à minha imagem ou a qualquer outro.
</p>
            `,
            variaveis: ""
        },
        {
            nome: "Acordo de Auxílio-Combustível",
            conteudo: `
<p style="margin-top: 1.5rem;">
    <b>AMERICA RENTAL EQUIPAMENTOS LTDA</b>, Situada na Rua Salto da Divisa, nº 97, CEP 07252-300, Parque Alvorada - Guarulhos SP, Inscrita no CNPJ sob o nº 03.434.448/0001-01, denominada empregador, e Colaborador, de comum acordo e na melhor forma do direito, as partes celebram o presente Acordo Individual Escrito, com apoio nos art. 444, 457, 458 e art. 468 da CLT para tratar exclusivamente das condições para fornecimento de auxílio-combustível, mantendo-se inalteradas as demais cláusulas contratuais firmadas.
</p>

<p style="margin-top: 1.5rem;">
    <b>Cláusula Primeira:</b> O empregador fornecerá mensalmente o valor fixo de R$220,00 (duzentos e vinte reais) a título de auxílio-combustível ao trabalhador que comprovar a necessidade de utilização de veículo próprio para o deslocamento casa – trabalho, de forma escrita.
</p>

<p style="margin-top: 1rem;">
    <b>Parágrafo primeiro:</b> A comprovação de que trata essa cláusula, deverá ser feita mediante apresentação de comprovante de residência em nome próprio e identificação de veículo utilizado no ato da contratação.
</p>

<p style="margin-top: 1rem;">
    <b>Parágrafo Segundo:</b> O valor a título de auxílio-combustível será reajustado anualmente a critério do empregador.
</p>

<p style="margin-top: 1.5rem;">
    <b>Cláusula Segunda:</b> As partes esclarecem que referido auxílio-combustível possui natureza indenizatória, não se integrando à remuneração para quaisquer fins.
</p>

<p style="margin-top: 1.5rem;">
    <b>Cláusula Terceira:</b> São condições para o fornecimento do auxílio-combustível mensalmente ao trabalhador, de forma cumulativa, a utilização de veículo próprio para deslocamento e a inexistência de qualquer falta ao trabalho no mês correspondente.
</p>

<p style="margin-top: 1.5rem;">
    <b>Cláusula Quarta:</b> Em caso de ausência injustificada por parte do empregado ao trabalho o auxílio-combustível não será fornecido.
</p>

<p style="margin-top: 1rem;">
    <b>Parágrafo único:</b> Considera-se como ausência injustificada, qualquer hipótese distinta da prevista no art. 473 da CLT.
</p>

<p style="margin-top: 1.5rem;">
    <b>Cláusula Quinta:</b> Ao trabalhador que não utilizar veículo próprio para deslocamento casa trabalho, não será pago o auxílio-combustível.
</p>

<p style="margin-top: 1.5rem;">
    <b>Cláusula Sexta:</b> Fica desde já autorizada a revisão das condições para o fornecimento e/ou supressão do referido auxílio-combustível pelo empregador a qualquer tempo, e sem aviso prévio, não importando em direito adquirido do trabalhador, não se aderindo ao contrato de trabalho.
</p>

<p style="margin-top: 1.5rem;">
    <b>Cláusula Sétima:</b> As partes firmam o presente de comum acordo, assinando em duas vias de igual teor.
</p>
            `,
            variaveis: ""
        }
    ];
    
    for (const t of templates) {
        await apiPost('/geradores', t);
    }
}

window.openModalGerador = function() {
    document.getElementById('gerador-modal-title').textContent = 'Novo Gerador';
    document.getElementById('form-gerador').reset();
    document.getElementById('gerador-id').value = '';
    document.getElementById('gerador-conteudo-editor').innerHTML = ''; // Limpar editor
    document.getElementById('modal-gerador').style.display = 'block';
};

window.closeModalGerador = function() {
    document.getElementById('modal-gerador').style.display = 'none';
};

window.editGerador = async function(id) {
    try {
        const g = await apiGet(`/geradores/${id}`);
        document.getElementById('gerador-modal-title').textContent = 'Editar Gerador';
        document.getElementById('gerador-id').value = g.id;
        document.getElementById('gerador-nome').value = g.nome;
        
        // Detectar se é texto puro legível (legado) ou HTML
        let finalContent = g.conteudo;
        if (!finalContent.includes('<') && !finalContent.includes('>')) {
            finalContent = finalContent.replace(/\n/g, '<br>');
        }
        
        document.getElementById('gerador-conteudo-editor').innerHTML = finalContent;
        document.getElementById('modal-gerador').style.display = 'block';
    } catch (e) { console.error(e); }
};

window.deleteGerador = async function(id) {
    if (!confirm('Deseja excluir este gerador?')) return;
    try {
        await apiDelete(`/geradores/${id}`);
        loadGeradores();
    } catch (e) { console.error(e); }
};

// --- INICIALIZAR GERADORES (Chamado no DOMContentLoaded) ---
function setupGeradores() {
    console.log('Setup Geradores initialized...');
    const form = document.getElementById('form-gerador');
    if (!form) {
        console.warn('Formulário de gerador não encontrado na inicialização. Tentando novamente em breve.');
        setTimeout(setupGeradores, 500); // Tentar novamente se o HTML não carregou
        return;
    }
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        console.log('Form Gerador submitted!');
        const id = document.getElementById('gerador-id').value;
        const data = {
            nome: document.getElementById('gerador-nome').value,
            conteudo: document.getElementById('gerador-conteudo-editor').innerHTML, // Pegar do editor
            variaveis: '' 
        };
        
        try {
            let result;
            if (id) result = await apiPut(`/geradores/${id}`, data);
            else result = await apiPost('/geradores', data);
            
            if (result && !result.error) {
                alert('Salvo com sucesso!');
                window.closeModalGerador();
                loadGeradores();
            } else {
                alert('Erro ao salvar: ' + (result?.error || 'Erro desconhecido'));
            }
        } catch (e) { 
            console.error(e);
            alert('Falha crítica ao salvar gerador. Verifique o console.');
        }
    });
}

// Funções do Editor de Texto
window.formatDoc = function(cmd, value = null) {
    document.execCommand(cmd, false, value);
};

window.abrirModalSelecaoColab = async function(geradorId) {
    try {
        const colabs = await apiGet('/colaboradores');
        const select = document.getElementById('select-colab-gerar');
        if (!select) return;
        
        select.innerHTML = colabs.map(c => `<option value="${c.id}">${c.nome_completo} - ${c.cpf}</option>`).join('');
        document.getElementById('gerador-id-temp').innerText = geradorId;
        document.getElementById('modal-selecionar-colab').style.display = 'block';
    } catch (e) { console.error(e); }
};

window.processarGeracao = async function() {
    const geradorId = document.getElementById('gerador-id-temp').innerText;
    const colabId = document.getElementById('select-colab-gerar').value;
    
    if (!geradorId || !colabId) return;
    
    try {
        const response = await fetch(`${API_URL}/geradores/${geradorId}/gerar/${colabId}`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        const data = await response.json();
        
        if (data.html) {
            document.getElementById('modal-selecionar-colab').style.display = 'none';
            window.abrirPreviewDocumento(data);
        }
    } catch (e) { console.error(e); }
};

window.abrirPreviewDocumento = function(data) {
    const container = document.getElementById('preview-doc-body');
    if (!container) return;
    
    // 1. Cabeçalho com Logotipo (Banner Colorido)
    const logoBanner = `<div style="margin-bottom: 1rem;"><img src="${API_URL.replace('/api', '')}/assets/logo-header.png" style="width: 100%; display: block;"></div>`;
    
    // 2. Título e Dados do Colaborador (PADRÃO)
    const colabInfoBase = `
        <h1 style="text-align: center; color: #1e293b; margin-top: 0.2rem; font-size: 1.25rem; text-transform: uppercase;">${data.gerador_nome}</h1>
        <p style="margin-top: 0.75rem; font-size: 1rem;"><b>COLABORADOR:</b> ${data.colaborador.NOME_COMPLETO}</p>
        
        <div style="border: 1px solid #000; padding: 0.75rem; margin-top: 0.5rem; line-height: 1.4; font-size: 0.85rem;">
            <p style="margin-bottom: 0.2rem; font-size: 0.8rem;"><b>DADOS COLABORADOR:</b></p>
            <div style="display: flex; gap: 2rem;">
                <span>CPF: <b>${data.colaborador.CPF}</b></span>
                <span>ADMISSÃO: <b>${data.colaborador.DATA_ADMISSAO}</b></span>
            </div>
            <p>ENDEREÇO: ${data.colaborador.ENDERECO || '---'}</p>
            <div style="display: flex; gap: 2rem;">
                <span>CARGO: ${data.colaborador.CARGO || '---'}</span>
                <span>SALÁRIO: ${data.colaborador.SALARIO || '---'}</span>
            </div>
            <div style="display: flex; gap: 2rem;">
                <span>CELULAR: ${data.colaborador.TELEFONE || '---'}</span>
                <span>E-MAIL: ${data.colaborador.EMAIL || '---'}</span>
            </div>
        </div>
    `;
    
    // 3. Conteúdo Específico (O que vem do Banco)
    // Forçar Negrito no nome da empresa e respeitar quebras de linha/espaços em qualquer modo
    const htmlComDestaque = (data.html || '').replace(/AMERICA RENTAL EQUIPAMENTOS LTDA/g, '<b>AMERICA RENTAL EQUIPAMENTOS LTDA</b>');
    
    // Ajuste específico para Santander caber em 1 página
    const isSantander = (data.gerador_nome || '').toLowerCase().includes('santander');
    const customFontSize = isSantander ? '0.7rem' : '0.9rem';
    const customLineHeight = isSantander ? '1.2' : '1.4';

    const conteudoPrincipal = `<div style="margin-top: 1rem; text-align: justify; line-height: ${customLineHeight}; font-size: ${customFontSize}; white-space: pre-wrap;">${htmlComDestaque}</div>`;
    
    // 4. Rodapé de Assinaturas (PADRÃO CONFORME IMAGEM)
    const colabNome = data.colaborador.NOME_COMPLETO;
    const footerHtml = `
        <div style="margin-top: 1rem;">
            <p style="font-weight: 700; font-size: 0.9rem;">Guarulhos, ________ de ____________________ de 202____.</p>
            
            <div style="margin-top: 2rem; display: flex; justify-content: space-between; align-items: flex-end;">
                <!-- Colaborador -->
                <div style="text-align: center; width: 45%;">
                    <div style="border-top: 1.5px solid #000; padding-top: 0.25rem;">
                        <span style="font-weight: 700; font-size: 0.85rem;">${colabNome}</span>
                    </div>
                </div>
                
                <!-- Empresa com Logo Pequeno -->
                <div style="text-align: center; width: 45%;">
                    <div style="margin-bottom: 0.25rem;">
                        <img src="${API_URL.replace('/api', '')}/assets/logo-header.png" style="height: 25px; margin: 0 auto; display: block;">
                        <p style="font-size: 0.5rem; margin-top: 1px; font-weight: 700; line-height: 1.1;">AMERICA RENTAL EQUIPAMENTOS LTDA<br>CNPJ: 03.434.448/0001-01</p>
                    </div>
                    <div style="border-top: 1.5px solid #000; padding-top: 0.25rem;">
                        <span style="font-weight: 700; font-size: 0.85rem;">América Rental Equipamentos Ltda</span>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    container.innerHTML = logoBanner + colabInfoBase + conteudoPrincipal + footerHtml;
    document.getElementById('preview-doc-title').textContent = data.gerador_nome;
    document.getElementById('modal-preview-doc').style.display = 'block';
};

window.imprimirDocumento = function() {
    const content = document.getElementById('preview-doc-body').innerHTML;
    const win = window.open('', '_blank');
    win.document.write(`
        <html>
            <head>
                <title>Imprimir Documento</title>
                <style>
                    body { font-family: 'Inter', sans-serif; padding: 0; margin: 0; }
                    @page { size: A4; margin: 0; }
                    .print-container { width: 21cm; min-height: 29.7cm; padding: 2cm; box-sizing: border-box; margin: 0 auto; }
                    img { max-width: 100%; }
                </style>
            </head>
            <body onload="window.print(); window.close();">
                <div class="print-container">${content}</div>
            </body>
        </html>
    `);
    win.document.close();
};
// --- GESTÃO DE CHAVES ---
window.loadChaves = async function() {
    try {
        const rows = await apiGet('/chaves');
        const tbody = document.getElementById('table-chaves-body');
        if (!tbody) return;
        tbody.innerHTML = '';
        rows.forEach(r => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${r.nome_chave}</td>
                <td style="text-align: right;">
                    <button class="btn btn-warning btn-sm" onclick="editChave(${r.id}, '${r.nome_chave}')"><i class="ph ph-pencil"></i></button>
                    <button class="btn btn-danger btn-sm" onclick="deleteChave(${r.id})"><i class="ph ph-trash"></i></button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (e) { console.error(e); }
};

window.resetChavesForm = function() {
    document.getElementById('form-chaves').reset();
    document.getElementById('chave-id').value = '';
    document.getElementById('chaves-form-title').textContent = 'Cadastrar Nova Chave';
};

window.editChave = function(id, nome) {
    document.getElementById('chave-id').value = id;
    document.getElementById('chave-nome').value = nome;
    document.getElementById('chaves-form-title').textContent = 'Editar Chave';
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.deleteChave = async function(id) {
    if (!confirm('Deseja excluir esta chave?')) return;
    try {
        await apiDelete(`/chaves/${id}`);
        loadChaves();
    } catch (e) { alert(e.message); }
};

// --- GESTÃO DE ADMISSÃO ---
window.loadAdmissaoSelect = async function() {
    try {
        const rows = await apiGet('/colaboradores');
        const select = document.getElementById('admissao-select-colab');
        if (!select) return;
        
        // Apenas colaboradores com status 'Aguardando início' ou 'Processo iniciado'
        const pendentes = rows.filter(r => r.status === 'Aguardando início' || r.status === 'Processo iniciado');
        
        select.innerHTML = '<option value="">Selecione um colaborador...</option>';
        pendentes.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.id;
            const displayStatus = p.status === 'Aguardando início' ? 'Aguardando' : (p.status === 'Processo iniciado' ? 'Iniciado' : p.status);
            opt.textContent = `${p.nome_completo} - ${p.cargo_nome || 'Sem Cargo'} (${displayStatus})`;
            select.appendChild(opt);
        });
        
        window.resetAdmissao();
    } catch (e) { console.error(e); }
};

window.sendAssinafyWhatsApp = async function(tipo, suffix) {
    if (!viewedColaborador || !viewedColaborador.telefone) {
        alert('Telefone do colaborador não encontrado para enviar WhatsApp.');
        return;
    }
    const inputLink = document.getElementById(`aso-assinafy-link-${suffix}`);
    const linkAssinafy = inputLink ? inputLink.value : '';

    if (!linkAssinafy) {
        alert('Por favor, cole o link do Assinafy primeiro.');
        return;
    }

    // Salvar link no banco
    const dbField = suffix === 1 ? 'aso_assinafy_link' : 'aso_exames_assinafy_link';
    try {
        await apiPut(`/colaboradores/${viewedColaborador.id}`, {
            [dbField]: linkAssinafy
        });
        viewedColaborador[dbField] = linkAssinafy;
    } catch (e) { console.error('Erro ao salvar link:', e); }

    const msg = `Olá, ${viewedColaborador.nome_completo}.\n\nSeu Exame Admissional está disponível para assinatura digital.\n\nClique no link abaixo para assinar:\n${linkAssinafy}\n\nAmérica Rental Equipamentos Ltda.`;
    
    const fone = viewedColaborador.telefone.replace(/\D/g, '');
    const url = `https://wa.me/55${fone}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
};

window.currentActiveAdmissaoStep = 1;
window.initAdmissaoWorkflow = async function(id, targetStep = 1, preventScroll = false) {
    console.log(`[Admissao] Iniciando workflow para ID: ${id}, targetStep: ${targetStep}`);
    if (!id) {
        window.resetAdmissao();
        return;
    }
    
    try {
        const colab = await apiGet(`/colaboradores/${id}`);
        viewedColaborador = colab;
        console.log(`[Admissao] Dados do colaborador carregados:`, colab.nome_completo, "Status:", colab.status);
        
        if (!preventScroll) {
            // Esconder tudo primeiro
            const startAction = document.getElementById('admissao-start-action');
            const workflow = document.getElementById('admissao-workflow');
            if (startAction) startAction.style.display = 'none';
            if (workflow) workflow.style.display = 'none';
        }

        if (colab.status === 'Aguardando início') {
            document.getElementById('admissao-start-name').textContent = colab.nome_completo;
            document.getElementById('admissao-start-action').style.display = 'block';
        } else if (colab.status === 'Processo iniciado') {
            document.getElementById('admissao-workflow').style.display = 'block';
            
            // Buscar nomes para Cargo e Depto
            const cargos = await apiGet('/cargos');
            const deptos = await apiGet('/departamentos');
            
            const cargoObj = cargos.find(cg => cg.id == colab.cargo);
            const deptoObj = deptos.find(d => d.id == colab.departamento);
            
            colab.cargo_nome_exibindo = cargoObj ? cargoObj.nome : (colab.cargo || 'Não definido');
            colab.depto_nome_exibindo = deptoObj ? deptoObj.nome : (colab.departamento || 'Não definido');

            // 1. Calcular Percentual do Passo 1 (Dados)
            const step1 = calculateAdmissaoStep1Completion(colab);
            // Os valores reais serão preenchidos pela função updateAdmissaoStepPercentages(colab) ao final
            
            // Mostrar Alerta se faltar algo
            const alertEl = document.getElementById('admissao-missing-fields-alert');
            const listEl = document.getElementById('admissao-missing-fields-list');
            if (step1.missing.length > 0) {
                alertEl.style.display = 'block';
                listEl.innerHTML = step1.missing.map(f => `<div>• ${f}</div>`).join('');
                document.getElementById('btn-admissao-step1-next').disabled = false; // Permite prosseguir mas avisa
            } else {
                alertEl.style.display = 'none';
            }

            // Preencher resumo de dados e aviso de ASO
            const asoNotice = document.getElementById('aso-email-notice');
            const asoNoticeDate = document.getElementById('aso-notice-date');
            const asoNoticeAgendada = document.getElementById('aso-notice-agendada');
            if (asoNotice && asoNoticeDate && asoNoticeAgendada) {
                if (colab.aso_email_enviado) {
                    asoNotice.style.display = 'block';
                    asoNoticeDate.innerText = colab.aso_email_enviado;
                    asoNoticeAgendada.innerText = colab.aso_exame_data || '--/--/--';
                } else {
                    asoNotice.style.display = 'none';
                }
            }

            // Carregar links Assinafy
            const link1 = document.getElementById('aso-assinafy-link-1');
            const linkExames = document.getElementById('aso-assinafy-link-exames');
            if (link1) link1.value = colab.aso_assinafy_link || '';
            if (linkExames) linkExames.value = colab.aso_exames_assinafy_link || '';

            const summary = document.getElementById('admissao-data-summary');
            summary.innerHTML = `
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 1rem; position:relative;">
                    ${step1.fields.map(f => `
                        <div style="background: ${f.filled ? '#fff' : '#fff5f5'}; padding: 0.75rem; border-radius: 6px; border: 1px solid ${f.filled ? '#e2e8f0' : '#feb2b2'};">
                            <label style="font-weight:700; color:${f.filled ? '#64748b' : '#c53030'}; font-size:0.7rem; text-transform:uppercase; margin-bottom:4px; display:block;">
                                ${f.label} ${f.filled ? '<i class="ph-bold ph-check-circle" style="color:#22c55e"></i>' : '<span style="color:#ef4444!important;">(PENDENTE)</span>'}
                            </label>
                            <div style="font-size:1rem; font-weight:600; color:${f.filled ? '#1e293b' : '#ef4444'};">
                                ${f.value || 'NÃO PREENCHIDO'}
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
            
            document.getElementById('admissao-nome-final').textContent = colab.nome_completo;

            // 2. Restaurar Status dos Passos
            const docs = await apiGet(`/colaboradores/${colab.id}/documentos`);
            
            // Popula lista de assinaturas (Step 2)
            const sigList = document.getElementById('admissao-signature-list');
            if (sigList) {
                sigList.innerHTML = DOCS_DISPONIVEIS.map(doc => `
                    <label class="doc-check-item" style="display:flex; align-items:center; gap:0.5rem; padding:0.5rem; border:1px solid #f1f5f9; border-radius:6px; cursor:pointer; background:#fff;">
                        <input type="checkbox" value="${doc}">
                        <span style="font-size:0.8rem; font-weight:500;">${doc}</span>
                    </label>
                `).join('');
            }
            // 3. Renderizar Checklists Dinâmicos
            renderAdmissaoStep3(colab, docs);

            // Mapeamento de Status por Step (Fixo para os outros)

            const remainingSteps = {
                'panel-step-4': { folder: 'ASO', ids: ['admissao-checklist-step4'], labels: ['ASO Admissional'] },
                'panel-step-5': { folder: 'OUTROS', ids: ['admissao-checklist-step5'], labels: ['Protocolo eSocial'] },
                'panel-step-6': { folder: 'TREINAMENTO', ids: ['admissao-checklist-step6'], labels: ['Integração'] },
                'panel-step-7': { folder: 'CERTIFICADOS', ids: ['admissao-checklist-step7'], labels: ['Diploma'] },
                'panel-step-8': { folder: 'CONTRATOS', ids: ['admissao-checklist-step8'], labels: ['Contrato Detalhado'] },
                'panel-step-9': { folder: 'FICHA_DE_EPI', ids: ['admissao-checklist-step9'], labels: ['Entrega EPI'] }
            };

            for (let pid in remainingSteps) {
                const config = remainingSteps[pid];
                const targetContainer = document.getElementById(config.ids[0]);
                if (!targetContainer) continue;
                targetContainer.innerHTML = '';
                
                // Tratar ASO especial (pode ter exames opcionais)
                let labels = config.labels;
                if (pid === 'panel-step-4' && (colab.cargo || '').toLowerCase().includes('motorista')) {
                    labels = ['ASO Admissional', 'ASO Exames'];
                }

                labels.forEach(label => {
                    const docRecord = docs.find(d => d.tab_name === config.folder && d.document_type.includes(label));
                    const slot = createDocSlot(config.folder, label, docRecord);
                    targetContainer.appendChild(slot);
                });
            }




                            
                            // Adicionar botão WhatsApp se não existir

                            







            updateAdmissaoStepPercentages(colab);
            window.nextAdmissaoStep(targetStep, preventScroll);
        }
    } catch (e) { alert('Erro ao carregar dados: ' + e.message); }
};

function renderAdmissaoStep3(colab, docs) {
    const container = document.getElementById('admissao-checklist-step3');
    if (!container) return;
    
    const items = [
        { label: 'Carteira de Trabalho', folder: '01_FICHA_CADASTRAL' },
        { label: 'Título Eleitoral', folder: '01_FICHA_CADASTRAL' },
        { label: 'Certificado de Reservista', folder: '01_FICHA_CADASTRAL' },
        { label: 'CPF', folder: '01_FICHA_CADASTRAL' },
        { label: colab.rg_tipo === 'CIN' ? 'CIN (Nova Identidade)' : 'RG Tradicional', folder: '01_FICHA_CADASTRAL' },
        { label: 'Comprovante de Endereço', folder: '01_FICHA_CADASTRAL', hasVencimento: true },
        { label: 'Histórico Escolar', folder: '01_FICHA_CADASTRAL' },
        { label: 'Certidão de Nascimento', folder: '01_FICHA_CADASTRAL' }
    ];

    if (colab.estado_civil === 'Casado') {
        items.push({ label: 'Documento do Cônjuge', folder: '01_FICHA_CADASTRAL' });
        items.push({ label: 'Certidão de Casamento', folder: '01_FICHA_CADASTRAL' });
    }

    if (colab.dependentes && colab.dependentes.length > 0) {
        colab.dependentes.forEach(dep => {
            items.push({ label: `CPF Dependente - ${dep.nome}`, folder: '01_FICHA_CADASTRAL' });
            items.push({ label: `Certidão Nasc. Dependente - ${dep.nome}`, folder: '01_FICHA_CADASTRAL' });
            
            // Lógica de idade para documentos adicionais
            if (dep.data_nascimento) {
                const birth = new Date(dep.data_nascimento);
                const today = new Date();
                let age = today.getFullYear() - birth.getFullYear();
                const m = today.getMonth() - birth.getMonth();
                if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
                    age--;
                }

                if (age < 7) {
                    items.push({ label: `Caderneta de Vacinação - ${dep.nome}`, folder: '01_FICHA_CADASTRAL' });
                } else {
                    items.push({ label: `Atestado de Frequência Escolar - ${dep.nome}`, folder: '01_FICHA_CADASTRAL' });
                }
            }
        });
    }

    container.innerHTML = '';
    items.forEach(item => {
        const docRecord = docs.find(d => d.tab_name === item.folder && d.document_type.includes(item.label));
        const slot = createDocSlot(item.folder, item.label, docRecord);
        container.appendChild(slot);
    });
}


window.startFinalAdmission = async function() {
    console.log("[Admissao] Botão 'Iniciar' clicado. viewedColaborador:", viewedColaborador);
    if (!viewedColaborador) {
        alert("Erro: Nenhum colaborador selecionado.");
        return;
    }
    
    try {
        const res = await apiPut(`/colaboradores/${viewedColaborador.id}`, {
            status: 'Processo iniciado'
        });
        console.log("[Admissao] Status atualizado no servidor:", res);
        
        // Atualiza estado local imediatamente
        viewedColaborador.status = 'Processo iniciado';
        
        // Recarrega workflow para mostrar panes
        window.initAdmissaoWorkflow(viewedColaborador.id);
    } catch (e) { 
        console.error("[Admissao] Erro ao iniciar:", e);
        alert('Erro ao iniciar processo: ' + e.message); 
    }
};

window.nextAdmissaoStep = function(step, preventScroll = false) {
    window.currentActiveAdmissaoStep = step;
    // Atualizar Panels
    document.querySelectorAll('.admissao-panel').forEach(p => p.classList.remove('active'));
    const panel = document.getElementById(`panel-step-${step}`);
    if (panel) panel.classList.add('active');
    
    // Se for Passo 4, verificar se mostra linha de Exames Motorista
    if (step === 4 && viewedColaborador) {
        const rowExames = document.getElementById('row-aso-exames');
        if (rowExames) {
            rowExames.style.display = (viewedColaborador.cargo || '').toLowerCase().includes('motorista') ? 'flex' : 'none';
        }
    }

    // Atualizar Stepper UI Focus
    document.querySelectorAll('.step-item').forEach((item, idx) => {
        const itemStep = idx + 1;
        item.classList.toggle('active', itemStep === step);
    });

    if (!preventScroll) window.scrollTo({ top: 0, behavior: 'smooth' });
};

function calculateAdmissaoStep1Completion(c) {
    const checklist = [
        // Dados Pessoais
        { key: 'nome_completo', label: 'Nome Completo' },
        { key: 'cpf', label: 'CPF' },
        { key: 'rg_tipo', label: 'Tipo Documento' },
        { key: 'rg', label: 'RG/Número' },
        { key: 'rg_orgao', label: 'Órgão Emissor' },
        { key: 'rg_data_emissao', label: 'Data Emissão' },
        { key: 'data_nascimento', label: 'Nascimento' },
        { key: 'sexo', label: 'Sexo' },
        { key: 'cor_raca', label: 'Cor/Raça' },
        { key: 'estado_civil', label: 'Estado Civil' },
        { key: 'nacionalidade', label: 'Nacionalidade' },
        { key: 'local_nascimento', label: 'Naturalidade' },
        { key: 'nome_mae', label: 'Nome da Mãe' },
        { key: 'nome_pai', label: 'Nome do Pai' },
        { key: 'telefone', label: 'Telefone' },
        { key: 'email', label: 'E-mail' },
        { key: 'endereco', label: 'Endereço' },
        
        // Dados Profissionais
        { key: 'cargo_nome_exibindo', label: 'Cargo' },
        { key: 'depto_nome_exibindo', label: 'Departamento' },
        { key: 'data_admissao', label: 'Admissão' },
        { key: 'tipo_contrato', label: 'Tipo Contrato' },
        { key: 'salario', label: 'Salário' },
        { key: 'cbo', label: 'CBO' },
        { key: 'matricula_esocial', label: 'Matrícula eSocial' },
        { key: 'pis', label: 'PIS/PASEP' },
        { key: 'ctps_numero', label: 'CTPS Número' },
        { key: 'ctps_serie', label: 'CTPS Série' },
        { key: 'ctps_uf', label: 'CTPS UF' },
        { key: 'ctps_data_expedicao', label: 'CTPS Emissão' },
        
        // Outros Documentos
        { key: 'titulo_eleitoral', label: 'Título Eleitoral' },
        { key: 'titulo_zona', label: 'Zona/Seção' },
        { key: 'certificado_militar', label: 'Cert. Militar' },
        { key: 'cnh_numero', label: 'CNH Número' },
        { key: 'cnh_categoria', label: 'CNH Cat.' },
        
        // Saúde e Extras
        { key: 'deficiencia', label: 'Deficiência' },
        { key: 'alergias', label: 'Alergias' },
        { key: 'contato_emergencia_nome', label: 'Emergência (Nome)' },
        { key: 'contato_emergencia_telefone', label: 'Emergência (Tel)' },
        
        // Financeiro
        { key: 'banco_nome', label: 'Banco' },
        { key: 'banco_agencia', label: 'Agência' },
        { key: 'banco_conta', label: 'Conta' },
        { key: 'fgts_opcao', label: 'Opção FGTS' },
        
        // Escala
        { key: 'escala_tipo', label: 'Escala' },
        { key: 'horario_entrada', label: 'Entrada' },
        { key: 'horario_saida', label: 'Saída' }
    ];
    
    let filledCount = 0;
    const resultFields = [];
    const missing = [];

    checklist.forEach(item => {
        const val = c[item.key];
        const isFilled = val && val !== '' && val !== 'null';
        if (isFilled) filledCount++;
        else missing.push(item.label);

        resultFields.push({
            label: item.label,
            value: val,
            filled: isFilled
        });
    });

    return {
        percent: Math.round((filledCount / checklist.length) * 100),
        fields: resultFields,
        missing: missing
    };
}

function updateAdmissaoStepPercentages(colab) {
    const targetColab = colab || viewedColaborador;
    if (!targetColab) return;

    const step1 = calculateAdmissaoStep1Completion(targetColab);
    const pc1 = step1.percent;

    const calculateChecklist = (panelId) => {
        const panel = document.getElementById(panelId);
        if (!panel) return 0;
        const total = panel.querySelectorAll('.checklist-item').length;
        if (total === 0) return 0;
        const uploaded = Array.from(panel.querySelectorAll('.upload-status'))
                              .filter(span => span.style.display !== 'none').length;
        return Math.min(100, Math.round((uploaded / total) * 100));
    };

    const pc2 = (() => {
        const checks = document.querySelectorAll('#admissao-signature-list input[type="checkbox"]');
        if (checks.length === 0) return 0;
        const checked = Array.from(checks).filter(c => c.checked).length;
        return Math.round((checked / checks.length) * 100);
    })();
    
    // Adicionar Listener se não houver
    const sigList = document.getElementById('admissao-signature-list');
    if (sigList && !sigList.dataset.listener) {
        sigList.addEventListener('change', () => updateAdmissaoStepPercentages());
        sigList.dataset.listener = 'true';
    }

    const pc3 = calculateChecklist('panel-step-3');
    const pc4 = calculateChecklist('panel-step-4');
    const pc5 = calculateChecklist('panel-step-5');
    const pc6 = calculateChecklist('panel-step-6');
    const pc7 = calculateChecklist('panel-step-7');
    const pc8 = calculateChecklist('panel-step-8');
    const pc9 = calculateChecklist('panel-step-9');
    const pc10 = 0;

    const percentages = { 1:pc1, 2:pc2, 3:pc3, 4:pc4, 5:pc5, 6:pc6, 7:pc7, 8:pc8, 9:pc9, 10:pc10 };
    
    let totalPc = 0;
    for(let s in percentages) {
        const pc = percentages[s];
        totalPc += pc;
        const el = document.getElementById(`step-${s}-pc`);
        if (el) el.textContent = `${pc}%`;

        const item = document.getElementById(`step-${s}`);
        if (item) {
            let isWarning = pc > 0 && pc < 100;
            // Regra especial Step 4: Se enviou email p/ clínica, fica amarelo (até completar 100%)
            if (s == 4 && viewedColaborador && viewedColaborador.aso_email_enviado) {
                isWarning = pc < 100;
            }
            item.classList.toggle('pc-warning', isWarning);
            item.classList.toggle('pc-success', pc === 100);
        }
    }

    const avg = Math.round(totalPc / 10);
    
    // O usuário deseja que a etiqueta do Passo 1 reflita a Qualidade Global do Cadastro
    const step1PcEl = document.getElementById('step-1-pc');
    if (step1PcEl) step1PcEl.textContent = `${avg}%`;

    const totalEl = document.getElementById('admissao-pc-total');
    if (totalEl) totalEl.textContent = `${avg}%`;
    const bar = document.getElementById('admissao-progress-bar');
    if (bar) bar.style.width = `${avg}%`;
}

window.addDependenteRow = function(nome = '', cpf = '', nascimento = '', parentesco = '') {
    const container = document.getElementById('dependentes-container');
    const noMsg = document.getElementById('no-dependentes-msg');
    if (noMsg) noMsg.style.display = 'none';

    // Container style
    container.style.gap = '1rem';

    const rowId = 'dep-' + Date.now() + Math.floor(Math.random() * 100);
    const row = document.createElement('div');
    row.className = 'dependente-row p-3 mb-3';
    row.id = rowId;
    row.style = 'background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 10px; display: grid; grid-template-columns: 1fr 1fr 1fr 40px; gap: 0.75rem; box-shadow: 0 1px 3px rgba(0,0,0,0.02);';
    
    row.innerHTML = `
        <div class="input-group mb-1" style="grid-column: span 4;">
            <label style="font-size:0.75rem; font-weight:700; color: #475569;">Nome Completo do Dependente</label>
            <input type="text" class="dep-nome" value="${nome}" placeholder="Digite o nome completo" style="padding: 0.5rem; border: 1.2px solid #cbd5e1;">
        </div>
        <div class="input-group">
            <label style="font-size:0.75rem; font-weight:700; color: #475569;">CPF</label>
            <input type="text" class="dep-cpf" value="${cpf}" onkeyup="mascaraCPF(this)" maxlength="14" placeholder="000.000.000-00" style="padding: 0.5rem; border: 1.2px solid #cbd5e1;">
        </div>
        <div class="input-group" style="grid-column: span 2;">
            <label style="font-size:0.75rem; font-weight:700; color: #475569;">Data Nascto.</label>
            <input type="date" class="dep-nascimento" value="${nascimento}" style="padding: 0.5rem; border: 1.2px solid #cbd5e1;">
        </div>
        <div style="display: flex; align-items: flex-end; justify-content: center;">
            <button type="button" onclick="removeDependenteRow('${rowId}')" title="Remover Dependente" style="background: #fff5f5; color: #ef4444; border: 1.5px solid #fee2e2; border-radius: 8px; height: 38px; width: 38px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s;">
                <i class="ph ph-trash" style="font-size: 1.1rem;"></i>
            </button>
        </div>
    `;

    container.appendChild(row);
};

window.removeDependenteRow = function(id) {
    const row = document.getElementById(id);
    if (row) row.remove();
    
    const container = document.getElementById('dependentes-container');
    if (container.children.length === 0) {
        const noMsg = document.getElementById('no-dependentes-msg');
        if (noMsg) noMsg.style.display = 'block';
    }
};

window.filterAdmissaoDocs = function() {
    const q = document.getElementById('search-admissao-docs').value.toLowerCase();
    const items = document.querySelectorAll('#admissao-signature-list .doc-check-item');
    items.forEach(item => {
        const text = item.querySelector('span').textContent.toLowerCase();
        item.style.display = text.includes(q) ? 'flex' : 'none';
    });
};

// Hook into toggleCheck to update counts
const originalToggleCheck = window.toggleCheck;
window.toggleCheck = function(el) {
    // Desativado: seleção agora é apenas via upload
    console.log('Toggle desativado. Use o botão de Upload.');
};

window.editColabFromAdmission = function() {
    if (!viewedColaborador) return;
    const id = viewedColaborador.id;
    navigateTo('colaboradores');
    window.editColaborador(id);
};

window.sendASOEmail = async function() {
    if (!viewedColaborador) {
        alert('Carregue um colaborador primeiro abrindo a edição ou admissão.');
        return;
    }
    const dataExame = document.getElementById('aso-exame-data').value;
    const destinatario = document.getElementById('aso-email-destinatario').value;
    
    if (!dataExame) {
        alert('Por favor, selecione a data do exame.');
        return;
    }
    
    const [y, m, d] = dataExame.split('-');
    const dt = `${d}/${m}/${y}`;
    const cargo = (viewedColaborador.cargo || '').toLowerCase();
    const exames = cargo.includes('motorista') 
        ? 'Audiometria, acuidade visual, E.E.G, E.C.G e Glicemia.' 
        : 'Exame Padrão';

    const mailBody = `Título: Exame Admissional\n\nSegue abaixo as informações para a realização do exame Admissional do colaborador que deve comparecer.\n\nData: ${dt}\n\nNome: ${viewedColaborador.nome_completo}\nCPF: ${viewedColaborador.cpf}\nFunção: ${viewedColaborador.cargo || '-'}\nDepartamento: ${viewedColaborador.departamento || '-'}\n\nExames:\n${exames}\n\n⚠️ IMPORTANTE:\nApós o exame ficar pronto, favor enviar o documento por e-mail diretamente para: rh@americarental.com.br`;

    const btn = document.getElementById('btn-enviar-aso-email');
    const originalContent = btn.innerHTML;
    try {
        btn.disabled = true;
        btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Enviando...';
        
        const res = await apiPost('/send-aso-email', {
            colaborador_id: viewedColaborador.id,
            email_to: destinatario,
            data_exame: dataExame,
            cc: ['rh@americarental.com.br', 'rh2@americarental.com.br']
        });
        
        if (res.sucesso) {
            alert('E-mail enviado com sucesso pelo servidor!');
            // Mostrar aviso em verde
            const asoNotice = document.getElementById('aso-email-notice');
            const asoNoticeDate = document.getElementById('aso-notice-date');
            const asoNoticeAgendada = document.getElementById('aso-notice-agendada');
            if (asoNotice && asoNoticeDate && asoNoticeAgendada) {
                asoNotice.style.display = 'block';
                asoNoticeDate.innerText = res.data_envio;
                asoNoticeAgendada.innerText = res.data_agendada;
                viewedColaborador.aso_email_enviado = res.data_envio; 
                viewedColaborador.aso_exame_data = res.data_agendada;
                updateAdmissaoStepPercentages();
            }
        } else {
            throw new Error(res.error || 'Erro no servidor');
        }
    } catch (e) {
        console.error('Erro ao enviar e-mail ASO:', e);
        if (confirm('Não foi possível enviar automaticamente pelo servidor. Deseja abrir o seu programa de e-mail (Outlook/Gmail) com o texto já preenchido?')) {
            const mailtoUrl = `mailto:${destinatario}?cc=rh@americarental.com.br,rh2@americarental.com.br&subject=Exame Admissional - ${viewedColaborador.nome_completo}&body=${encodeURIComponent(mailBody)}`;
            window.location.href = mailtoUrl;
        }
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalContent;
    }
};

async function uploadAdmissaoDoc(input, docType, tabName) {
    if (!input.files || input.files.length === 0 || !viewedColaborador) return;
    
    const file = input.files[0];
    const item = input.closest('.checklist-item');
    const vencInput = item ? item.querySelector('.vencimento-input') : null;
    const vencimento = vencInput ? vencInput.value : null;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('colaborador_id', viewedColaborador.id);
    formData.append('colaborador_nome', viewedColaborador.nome_completo);
    formData.append('tab_name', tabName);
    formData.append('document_type', docType);
    if (vencimento) formData.append('vencimento', vencimento);
    
    try {
        const btn = input.nextElementSibling;
        const statusIcon = btn.nextElementSibling;
        
        btn.disabled = true;
        const oldHtml = btn.innerHTML;
        btn.innerHTML = '<i class="ph ph-spinner-gap ph-spin"></i> Enviando...';
        
        const response = await fetch(`${API_URL}/documentos`, {
            method: 'POST',
            body: formData,
            headers: {
                'Authorization': `Bearer ${currentToken || localStorage.getItem('token') || 'mock_token'}`
            }
        });
        
        if (response.ok) {
            const resJson = await response.json();
            btn.innerHTML = oldHtml;
            btn.disabled = false;
            if (statusIcon) statusIcon.style.display = 'inline-block';
            
            // Mostrar containers Assinafy
            if (statusIcon) {
                const containerAssinafy = statusIcon.nextElementSibling;
                if (containerAssinafy && containerAssinafy.classList.contains('assinafy-integrated-container')) {
                    containerAssinafy.style.display = 'flex';
                }
            }
            
            if (item) item.classList.add('checked');
            
            updateAdmissaoStepPercentages();
            alert('Documento enviado com sucesso!');
        } else {
            const err = await response.json();
            throw new Error(err.error || 'Erro no upload');
        }
    } catch (e) {
        alert('Erro ao enviar documento: ' + e.message);
        const btn = input.nextElementSibling;
        btn.disabled = false;
        btn.innerHTML = '<i class="ph ph-upload-simple"></i> Upload';
    }
};

window.resetAdmissao = function() {
    document.getElementById('admissao-workflow').style.display = 'none';
    document.getElementById('admissao-start-action').style.display = 'none';
    document.getElementById('admissao-search-container').style.display = 'block';
    document.getElementById('admissao-select-colab').value = '';
    
    // Reset Checklist
    document.querySelectorAll('.upload-status').forEach(span => span.style.display = 'none');
    document.querySelectorAll('.checklist-item').forEach(item => item.classList.remove('checked'));
    updateAdmissaoStepPercentages();
};

window.finalizarAdmissao = async function() {
    if (!viewedColaborador) return;
    
    if (!confirm(`Confirmar a admissão definitiva de ${viewedColaborador.nome_completo}?`)) return;
    
    try {
        // Atualizar status para Ativo
        await apiPut(`/colaboradores/${viewedColaborador.id}`, {
            status: 'Ativo'
        });
        
        alert('Admissão realizada com sucesso! O colaborador agora está ATIVO.');
        navigateTo('dashboard');
    } catch (e) {
        alert('Erro ao finalizar admissão: ' + e.message);
    }
};

/**
 * Inicia o processo de assinatura eletrônica via Assinafy para um documento específico
 */
window.iniciarAssinafy = async function(docType, tabName, btn) {
    if (!viewedColaborador) return;

    const colabId = viewedColaborador.id;
    
    try {
        // RECARREGAR DADOS DO COLABORADOR (Garante que pegamos o e-mail mais recente)
        const freshColab = await apiGet(`/colaboradores/${colabId}`);
        viewedColaborador = freshColab;
    } catch(e) { console.warn('Falha ao atualizar dados em tempo real:', e); }

    const container = btn.closest('.assinafy-integrated-container');
    const statusBadge = container.querySelector('.assinafy-status-badge');
    
    // O e-mail não é mais mandatório aqui pois o backend usa o e-mail centralizador de fallback
    console.log('[ASSINAFY] Iniciando com e-mail do colaborador ou fallback central.');

    try {
        btn.disabled = true;
        btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Iniciando...';

        // 1. Buscar o ID do documento local no banco (já que acabamos de fazer upload ou carregamos a página)
        const docs = await apiGet(`/colaboradores/${colabId}/documentos`);
        if (!docs) throw new Error('Falha ao carregar lista de documentos. Tente novamente.');

        const docRecord = docs.find(d => d.tab_name === tabName && d.document_type === docType);

        if (!docRecord) throw new Error('Documento não encontrado no sistema. Faça o upload primeiro.');

        // 2. Chamar o backend para fazer o processo no Assinafy
        const res = await apiPost('/assinafy/upload', {
            document_id: docRecord.id,
            colaborador_id: colabId
        });

        if (res.sucesso) {
            alert('Solicitação de assinatura enviada pelo Assinafy!');
            btn.innerHTML = '<i class="ph ph-pen-nib"></i> Enviado';
            if (statusBadge) {
                statusBadge.innerText = 'PENDENTE';
                statusBadge.className = 'assinafy-status-badge pendente';
            }
            
            // Recarregar para mostrar botão WhatsApp
            if (tabName === '00.CheckList' || (tabName === 'ASO' && document.getElementById('admissao-workflow')?.style.display !== 'none')) {
                await initAdmissaoWorkflow(viewedColaborador.id, window.currentActiveAdmissaoStep, true);
            } else {
                await loadDocumentosList();
            }
        } else {
            throw new Error(res.error || 'Erro na integração');
        }

    } catch (e) {
        console.error('Erro Assinafy:', e);
        alert('Falha ao iniciar Assinafy: ' + e.message);
        btn.disabled = false;
        btn.innerHTML = '<i class="ph ph-pen-nib"></i> Assinar p/ Assinafy';
    }
};

window.testOneDriveConnection = async function() {
    const btn = document.getElementById('btn-test-onedrive');
    const originalHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="ph ph-spinner-gap spinning"></i> Testando...';

    try {
        const res = await fetch(`${API_URL}/maintenance/onedrive-test`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        const data = await res.json();
        
        if (data.sucesso) {
            let gpsRH = "";
            if (data.rhLocation) {
                let dId = data.rhLocation.parentReference?.driveId;
                gpsRH = `\n\n⚠️ PASTA 'RH' ENCONTRADA EM OUTRO LUGAR:\nEndereço: ${data.rhLocation.webUrl}\nID Drive: ${dId}`;
            }
            
            let msg = `✅ O OneDrive está CONECTADO corretamente!\n\n` +
                      `Biblioteca: ${data.driveName}\n` +
                      `Link Direto: ${data.config.webUrlBase || data.config.webUrlRaiz}` +
                      gpsRH + 
                      `\n\nTudo pronto para sincronizar colaboradores.`;
            alert(msg);
        } else {
            let errorMsg = `❌ ${data.error}\n`;
            if (data.code) errorMsg += `Código: ${data.code}\n`;
            if (data.details) errorMsg += `Detalhes: ${JSON.stringify(data.details)}`;
            alert(errorMsg);
        }
    } catch (e) {
        alert("Erro na requisição: " + e.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalHtml;
    }
};

window.syncOneDriveManual = async function(id, btnElement = null) {
    // Se não passou o elemento, tenta achar pelos IDs conhecidos
    const btn = btnElement || document.getElementById('btn-sync-onedrive') || document.getElementById('btn-form-sync-onedrive');
    const originalHtml = btn ? btn.innerHTML : '';
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="ph ph-spinner-gap ph-spin"></i> Sincronizando...';
    }

    try {
        // Timeout de 25 segundos para não travar o spinner se o Render demorar
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 25000);

        const res = await fetch(`${API_URL}/colaboradores/${id}/sync-onedrive`, {
            method: 'POST',
            signal: controller.signal,
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        clearTimeout(timeoutId);
        const data = await res.json();
        
        if (data.sucesso) {
            alert(`✅ SUCESSO TOTAL! [Versão: ${data.versao || 'N/A'}]\n${data.message || ""}\nCaminho: ${data.path}`);
        } else {
            let msg = `❌ Erro na Sincronização:\n${data.message || data.error}\n`;
            if (data.details) msg += `\nDetalhes Microsoft: ${JSON.stringify(data.details)}`;
            alert(msg);
        }
    } catch (e) {
        alert("Erro na requisição: " + e.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalHtml;
    }
};

window.resetSystem = async function() {
    const confirmation1 = confirm("🚨 ATENÇÃO: Você tem certeza que deseja LIMPAR TODOS os colaboradores do sistema?\n\nIsso apagará todos os dados do banco de dados (dependentes, fotos, documentos registrados). Os arquivos físicos no OneDrive não serão apagados por segurança.");
    if (!confirmation1) return;

    const confirmation2 = confirm("CONFIRMAÇÃO FINAL: Deseja realmente excluir permanentemente todos os registros de colaboradores?");
    if (!confirmation2) return;

    const btn = document.getElementById('btn-reset-sistema');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="ph ph-spinner-gap spinning"></i> Limpando...';

    try {
        const res = await fetch(`${API_URL}/maintenance/reset`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        const data = await res.json();
        
        if (data.sucesso) {
            alert("Sistema limpo com sucesso! A página será recarregada.");
            location.reload();
        } else {
            alert("Erro ao resetar sistema: " + (data.error || "Erro desconhecido"));
        }
    } catch (e) {
        alert("Erro de rede: " + e.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
};
