const API_URL = '/api';

// --- INICIALIZAÇÃO ---

document.addEventListener('DOMContentLoaded', () => {
    loadColaboradores();
    setupNavigation();
});

function setupNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const target = item.getAttribute('data-target');
            
            // UI Update
            document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
            item.classList.add('active');
            
            document.querySelectorAll('.content-view').forEach(v => v.classList.remove('active'));
            document.getElementById(`view-${target}`).classList.add('active');
            
            if (target === 'colaboradores') loadColaboradores();
            if (target === 'dashboard') loadStats();
        });
    });
}

// --- COLABORADORES ---

async function loadColaboradores() {
    try {
        const res = await fetch(`${API_URL}/colaboradores`);
        const data = await res.json();
        renderColaboradores(data);
        updateDashboardStats(data);
    } catch (e) { console.error('Erro ao carregar colaboradores:', e); }
}

function renderColaboradores(colabs) {
    const tbody = document.querySelector('#table-colaboradores tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    colabs.forEach(c => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="font-weight: 600;">${c.nome}</td>
            <td style="color: var(--secondary);">${c.cpf}</td>
            <td>${c.cargo || '-'}</td>
            <td>${c.data_admissao ? new Date(c.data_admissao).toLocaleDateString() : '-'}</td>
            <td><span class="status-badge ${c.status === 'Ativo' ? 'status-active' : 'status-inactive'}">${c.status}</span></td>
            <td style="text-align: right;">
                <button onclick="openDocumentos(${c.id}, '${c.nome}')" class="btn btn-secondary btn-sm" style="padding: 0.4rem 0.8rem; font-size: 0.75rem;">
                    <i class="ph ph-file-text"></i> Docs
                </button>
                <button onclick="deleteColaborador(${c.id})" class="btn btn-danger btn-sm" style="padding: 0.4rem 0.8rem; font-size: 0.75rem;">
                    <i class="ph ph-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

document.getElementById('form-colaborador').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
        nome: document.getElementById('ipt-nome').value,
        cpf: document.getElementById('ipt-cpf').value,
        cargo: document.getElementById('ipt-cargo').value,
        data_admissao: document.getElementById('ipt-admissao').value,
        status: document.getElementById('ipt-status').value
    };

    try {
        const res = await fetch(`${API_URL}/colaboradores`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.sucesso) {
            alert('Cadastrado com sucesso!');
            e.target.reset();
            loadColaboradores();
        } else { alert(`Erro: ${data.error}`); }
    } catch (e) { alert('Erro na conexão'); }
});

async function deleteColaborador(id) {
    if (!confirm('Deseja realmente excluir este colaborador e todos os seus arquivos?')) return;
    try {
        await fetch(`${API_URL}/colaboradores/${id}`, { method: 'DELETE' });
        loadColaboradores();
    } catch (e) { console.error(e); }
}

// --- DOCUMENTOS ---

async function openDocumentos(id, nome) {
    document.getElementById('modal-title').textContent = `Documentos: ${nome}`;
    document.getElementById('modal-colab-id').value = id;
    document.getElementById('modal-documentos').classList.add('active');
    loadDocumentos(id);
}

function closeModal() {
    document.getElementById('modal-documentos').classList.remove('active');
}

async function loadDocumentos(colabId) {
    try {
        const res = await fetch(`${API_URL}/documentos/${colabId}`);
        const data = await res.json();
        const list = document.getElementById('list-documentos');
        list.innerHTML = '';
        data.forEach(d => {
            const item = document.createElement('div');
            item.className = 'card';
            item.style = "display: flex; justify-content: space-between; align-items: center; padding: 0.75rem 1rem; margin-bottom: 0.5rem; background: #f8fafc;";
            item.innerHTML = `
                <div>
                   <strong style="color: var(--primary);">${d.tipo}</strong><br>
                   <span style="font-size: 0.8rem; color: var(--secondary);">${d.nome_arquivo}</span>
                </div>
                <a href="${API_URL}/arquivos/${colabId}/${d.caminho}" target="_blank" class="btn btn-secondary btn-sm" style="font-size: 0.7rem;">
                   <i class="ph ph-eye"></i> Ver
                </a>
            `;
            list.appendChild(item);
        });
    } catch (e) { console.error(e); }
}

document.getElementById('form-upload').addEventListener('submit', async (e) => {
    e.preventDefault();
    const colabId = document.getElementById('modal-colab-id').value;
    const tipo = document.getElementById('ipt-doc-tipo').value;
    const file = document.getElementById('ipt-doc-file').files[0];
    
    if (!file) return alert('Selecione um arquivo!');
    
    const formData = new FormData();
    formData.append('colaborador_id', colabId);
    formData.append('tipo', tipo);
    formData.append('arquivo', file);

    try {
        const res = await fetch(`${API_URL}/documentos`, { method: 'POST', body: formData });
        const data = await res.json();
        if (data.sucesso) {
            alert('Documento enviado!');
            e.target.reset();
            loadDocumentos(colabId);
        } else { alert('Erro no upload'); }
    } catch (e) { alert('Erro de rede'); }
});

// --- DASHBOARD STATS ---

function updateDashboardStats(colabs) {
    const total = colabs.length;
    const ativos = colabs.filter(c => c.status === 'Ativo').length;
    
    const elTotal = document.getElementById('stat-total');
    const elAtivos = document.getElementById('stat-ativos');
    
    if (elTotal) elTotal.textContent = total;
    if (elAtivos) elAtivos.textContent = ativos;
}

function loadStats() {
    loadColaboradores();
}
