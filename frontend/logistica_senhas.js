let senhasLogisticaList = [];
let currentSenhaTab = 'compartilhada';
let uniqueServicos = new Set();

function initLogisticaSenhas() {
    const container = document.getElementById('logistica-senhas-container');
    if (!container) return;

    container.innerHTML = `
        <div class="page-header flex-between mb-4">
            <div style="display: flex; align-items: center; gap: 1rem;">
                <div style="width: 50px; height: 50px; border-radius: 12px; background: #d6f5e5; color: #2d9e5f; display: flex; align-items: center; justify-content: center; font-size: 1.5rem;">
                    <i class="ph ph-lock-key"></i>
                </div>
                <div>
                    <h2 style="margin: 0; font-size: 1.5rem; color: #1e293b;">Cofre de Senhas</h2>
                    <p style="margin: 0; color: #64748b; font-size: 0.9rem;">Gerencie as senhas de acesso aos sistemas da logística.</p>
                </div>
            </div>
            <button class="btn btn-primary" onclick="openSenhasModal()"><i class="ph ph-plus"></i> Nova Senha</button>
        </div>

        <div class="tabs" style="display:flex; gap:1rem; margin-bottom:1rem; border-bottom:1px solid #e2e8f0; padding-bottom:0.5rem; margin-top: -0.5rem;">
            <button id="tab-senha-comp" onclick="switchSenhaTab('compartilhada')" style="background:none; border:none; border-bottom:2px solid #2d9e5f; color:#2d9e5f; font-weight:600; padding:0.5rem 1rem; cursor:pointer; font-size:1rem;">Senhas Compartilhadas</button>
            <button id="tab-senha-pess" onclick="switchSenhaTab('pessoal')" style="background:none; border:none; border-bottom:2px solid transparent; color:#64748b; font-weight:600; padding:0.5rem 1rem; cursor:pointer; font-size:1rem;">Senhas Pessoais</button>
        </div>
        <div class="card p-4">
            <div class="form-grid mb-3" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
                <div style="position:relative;">
                    <i class="ph ph-funnel" style="position:absolute;left:12px;top:50%;transform:translateY(-50%);color:#94a3b8;font-size:1rem;"></i>
                    <input type="text" id="filter-senha-servico" placeholder="Filtrar por Serviço..." oninput="filtrarSenhasMulti()" style="width:100%;padding:0.6rem 0.75rem 0.6rem 2.2rem;border:1px solid #e2e8f0;border-radius:8px;font-size:0.9rem;outline:none;box-sizing:border-box;">
                </div>
                <div style="position:relative;">
                    <i class="ph ph-funnel" style="position:absolute;left:12px;top:50%;transform:translateY(-50%);color:#94a3b8;font-size:1rem;"></i>
                    <input type="text" id="filter-senha-usuario" placeholder="Filtrar por Usuário..." oninput="filtrarSenhasMulti()" style="width:100%;padding:0.6rem 0.75rem 0.6rem 2.2rem;border:1px solid #e2e8f0;border-radius:8px;font-size:0.9rem;outline:none;box-sizing:border-box;">
                </div>
                <div style="position:relative;">
                    <i class="ph ph-funnel" style="position:absolute;left:12px;top:50%;transform:translateY(-50%);color:#94a3b8;font-size:1rem;"></i>
                    <input type="text" id="filter-senha-link" placeholder="Filtrar por Link..." oninput="filtrarSenhasMulti()" style="width:100%;padding:0.6rem 0.75rem 0.6rem 2.2rem;border:1px solid #e2e8f0;border-radius:8px;font-size:0.9rem;outline:none;box-sizing:border-box;">
                </div>
            </div>
            <div class="table-responsive">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Serviço / Acesso</th>
                            <th>Link</th>
                            <th>Usuário</th>
                            <th id="th-dono-senha" style="display:none; color:#d9480f;">Dono do Sistema</th>
                            <th style="width: 200px;">Senha</th>
                            <th style="text-align: right; width: 120px;">Ações</th>
                        </tr>
                    </thead>
                    <tbody id="table-senhas-body">
                        <tr><td colspan="6" style="text-align:center; padding: 2rem; color: #94a3b8;">Carregando senhas...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Modal Nova/Editar Senha -->
        <div id="modal-senhas" style="display:none; position:fixed; inset:0; background:rgba(15,23,42,0.75); z-index:99999; align-items:center; justify-content:center; padding:1rem;">
            <div style="background:#fff; border-radius:14px; width:100%; max-width:500px; box-shadow:0 25px 80px rgba(0,0,0,0.35);">
                <div style="background:#f8fafc; padding:1.25rem 1.5rem; border-radius:14px 14px 0 0; display:flex; align-items:center; justify-content:space-between; border-bottom:1px solid #e2e8f0;">
                    <h3 id="modal-senhas-title" style="margin:0; font-size:1.1rem; color:#1e293b; font-weight:600;"><i class="ph ph-lock-key" style="margin-right:8px; color:#2d9e5f;"></i>Cadastrar Nova Senha</h3>
                    <button onclick="document.getElementById('modal-senhas').style.display='none'" style="background:none;border:none;color:#94a3b8;cursor:pointer;font-size:1.2rem;">&times;</button>
                </div>
                <div style="padding:1.5rem;">
                    <form id="form-senhas" onsubmit="salvarSenha(event)">
                        <input type="hidden" id="senha-id">
                        <div class="input-group mb-3">
                            <label>Visibilidade *</label>
                            <select id="senha-tipo" required style="width:100%;padding:0.6rem;border:1px solid #e2e8f0;border-radius:6px;outline:none;background:#f8fafc;">
                                <option value="compartilhada">Senha Compartilhada (Uso Geral)</option>
                                <option value="pessoal">Senha Pessoal (Privado)</option>
                            </select>
                        </div>
                        <div class="input-group mb-3">
                            <label>Nome do Serviço / Tipo de Acesso *</label>
                            <input type="text" id="senha-servico" list="servicos-list" placeholder="Ex: Cobli, SimpliRoute, etc" autocomplete="off" required>
                            <datalist id="servicos-list"></datalist>
                        </div>
                        <div class="input-group mb-3">
                            <label>Link de Acesso (URL)</label>
                            <input type="url" id="senha-link" placeholder="https://..." autocomplete="off">
                        </div>
                        <div class="input-group mb-3">
                            <label>Usuário *</label>
                            <input type="text" id="senha-usuario" placeholder="Login ou e-mail" autocomplete="off" required>
                        </div>
                        <div class="input-group mb-4" style="position:relative;">
                            <label>Senha *</label>
                            <input type="password" id="senha-valor" placeholder="Sua senha" autocomplete="new-password" required style="padding-right:40px;">
                            <i class="ph ph-eye" id="toggle-senha-visibility" style="position:absolute; right:12px; top:36px; cursor:pointer; color:#94a3b8; font-size:1.2rem;" onclick="togglePasswordVisibility('senha-valor', 'toggle-senha-visibility')"></i>
                        </div>
                        <div class="flex-between" style="justify-content:flex-end; gap:1rem;">
                            <button type="button" class="btn btn-secondary" onclick="document.getElementById('modal-senhas').style.display='none'">Cancelar</button>
                            <button type="submit" class="btn btn-primary" style="background:#2d9e5f; border-color:#2d9e5f;"><i class="ph ph-floppy-disk"></i> Salvar</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;

    carregarSenhas();
}

function carregarSenhas() {
    fetch('/api/logistica/senhas', {
        headers: { 'Authorization': 'Bearer ' + localStorage.getItem('erp_token') }
    })
    .then(r => r.json())
    .then(data => {
        if (data.error) throw new Error(data.error);
        senhasLogisticaList = data;
        
        // Atualiza datalist de serviços
        uniqueServicos.clear();
        data.forEach(s => uniqueServicos.add(s.servico));
        atualizarDatalist();

        filtrarSenhasMulti();
    })
    .catch(err => {
        console.error('Erro ao carregar senhas:', err);
        document.getElementById('table-senhas-body').innerHTML = `<tr><td colspan="6" class="text-danger text-center">Erro ao carregar senhas.</td></tr>`;
    });
}

function atualizarDatalist() {
    const datalist = document.getElementById('servicos-list');
    if (!datalist) return;
    datalist.innerHTML = '';
    Array.from(uniqueServicos).sort().forEach(servico => {
        const option = document.createElement('option');
        option.value = servico;
        datalist.appendChild(option);
    });
}

function renderSenhasTable(senhas) {
    const tbody = document.getElementById('table-senhas-body');
    const thDono = document.getElementById('th-dono-senha');
    if (!tbody) return;

    const isDiretoria = window.isTopAdmin || (window.currentUser && String(window.currentUser.departamento).toLowerCase().includes('diretoria') || String(window.currentUser?.role).toLowerCase() === 'diretoria');
    const showDono = isDiretoria && currentSenhaTab === 'pessoal';

    if (thDono) {
        thDono.style.display = showDono ? 'table-cell' : 'none';
    }

    if (!senhas || senhas.length === 0) {
        tbody.innerHTML = `<tr><td colspan="${showDono ? 6 : 5}" style="text-align:center; padding:2rem; color:#64748b;">Nenhuma senha cadastrada.</td></tr>`;
        return;
    }

    tbody.innerHTML = '';
    senhas.forEach((s, index) => {
        const tr = document.createElement('tr');
        
        let linkHtml = s.link ? `<a href="${s.link}" target="_blank" style="color:#228be6; text-decoration:none; display:flex; align-items:center; gap:4px; max-width:250px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${s.link}"><i class="ph ph-link" style="flex-shrink:0;"></i> <span style="overflow:hidden; text-overflow:ellipsis;">${s.link}</span></a>` : '<span style="color:#94a3b8;">-</span>';
        
        // Input readonly password field para facilitar copiar/mostrar
        const pwdId = `table-pwd-${s.id}`;
        const pwdHtml = `
            <div style="display:flex; align-items:center; gap:8px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; padding:4px 8px;">
                <input type="password" id="${pwdId}" value="${s.senha.replace(/"/g, '&quot;')}" readonly style="border:none; background:transparent; width:100%; outline:none; font-family:monospace; color:#334155; pointer-events:none;">
                <button type="button" onclick="togglePasswordVisibility('${pwdId}', 'icon-${pwdId}')" style="background:none; border:none; cursor:pointer; color:#64748b; display:flex; align-items:center;" title="Mostrar/Ocultar">
                    <i class="ph ph-eye" id="icon-${pwdId}"></i>
                </button>
                <button type="button" onclick="copiarSenha('${pwdId}')" style="background:none; border:none; cursor:pointer; color:#64748b; display:flex; align-items:center;" title="Copiar Senha">
                    <i class="ph ph-copy"></i>
                </button>
            </div>
        `;

        let donoHtml = showDono ? `<td style="color:#d9480f; font-weight:600; font-size:0.9rem;">${s.owner_nome || s.owner_username || 'Desconhecido'}</td>` : '';

        tr.innerHTML = `
            <td style="font-weight:600; color:#1e293b;">${s.servico}</td>
            <td>${linkHtml}</td>
            <td style="font-family:monospace; font-size:0.95rem;">${s.usuario}</td>
            ${donoHtml}
            <td>${pwdHtml}</td>
            <td style="text-align: right;">
                <div style="display:flex; gap:0.5rem; justify-content:flex-end;">
                    <button class="btn-action btn-sm" style="color:#228be6; background:#e7f5ff; border:none;" onclick='editarSenha(${JSON.stringify(s)})' title="Editar"><i class="ph ph-pencil"></i></button>
                    <button class="btn-action btn-sm" style="color:#ef4444; background:#fee2e2; border:none;" onclick="excluirSenha(${s.id})" title="Excluir"><i class="ph ph-trash"></i></button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function filtrarSenhasMulti() {
    const fServico = document.getElementById('filter-senha-servico')?.value.toLowerCase().trim() || '';
    const fUsuario = document.getElementById('filter-senha-usuario')?.value.toLowerCase().trim() || '';
    const fLink = document.getElementById('filter-senha-link')?.value.toLowerCase().trim() || '';

    const filtradas = senhasLogisticaList.filter(s => {
        let matchServico = true;
        let matchUsuario = true;
        let matchLink = true;

        if (fServico) matchServico = s.servico && s.servico.toLowerCase().includes(fServico);
        if (fUsuario) matchUsuario = s.usuario && s.usuario.toLowerCase().includes(fUsuario);
        if (fLink) matchLink = s.link && s.link.toLowerCase().includes(fLink);

        let matchTab = (s.tipo === currentSenhaTab || (!s.tipo && currentSenhaTab === 'compartilhada'));
        return matchServico && matchUsuario && matchLink && matchTab;
    });

    renderSenhasTable(filtradas);
}

function openSenhasModal() {
    document.getElementById('senha-id').value = '';
    document.getElementById('senha-tipo').value = currentSenhaTab;
    document.getElementById('senha-servico').value = '';
    document.getElementById('senha-link').value = '';
    document.getElementById('senha-usuario').value = '';
    document.getElementById('senha-valor').value = '';
    document.getElementById('modal-senhas-title').innerHTML = '<i class="ph ph-lock-key" style="margin-right:8px; color:#2d9e5f;"></i>Cadastrar Nova Senha';
    
    // Reset password visibility
    const pwdInput = document.getElementById('senha-valor');
    pwdInput.type = 'password';
    document.getElementById('toggle-senha-visibility').classList.replace('ph-eye-slash', 'ph-eye');

    document.getElementById('modal-senhas').style.display = 'flex';
    setTimeout(() => document.getElementById('senha-servico').focus(), 100);
}

function editarSenha(senhaObj) {
    document.getElementById('senha-id').value = senhaObj.id;
    document.getElementById('senha-tipo').value = senhaObj.tipo || 'compartilhada';
    document.getElementById('senha-servico').value = senhaObj.servico;
    document.getElementById('senha-link').value = senhaObj.link || '';
    document.getElementById('senha-usuario').value = senhaObj.usuario;
    document.getElementById('senha-valor').value = senhaObj.senha;
    document.getElementById('modal-senhas-title').innerHTML = '<i class="ph ph-pencil" style="margin-right:8px; color:#2d9e5f;"></i>Editar Senha';
    
    // Reset password visibility
    const pwdInput = document.getElementById('senha-valor');
    pwdInput.type = 'password';
    document.getElementById('toggle-senha-visibility').classList.replace('ph-eye-slash', 'ph-eye');

    document.getElementById('modal-senhas').style.display = 'flex';
}

function salvarSenha(e) {
    e.preventDefault();
    const id = document.getElementById('senha-id').value;
    const servico = document.getElementById('senha-servico').value.trim();
    const link = document.getElementById('senha-link').value.trim();
    const usuario = document.getElementById('senha-usuario').value.trim();
    const senha = document.getElementById('senha-valor').value.trim();
    const tipo = document.getElementById('senha-tipo').value;

    if (!servico || !usuario || !senha) {
        Swal.fire('Erro', 'Preencha os campos obrigatórios.', 'error');
        return;
    }

    const payload = { servico, link, usuario, senha, tipo };
    const method = id ? 'PUT' : 'POST';
    const url = id ? '/api/logistica/senhas/' + id : '/api/logistica/senhas';

    fetch(url, {
        method: method,
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + localStorage.getItem('erp_token')
        },
        body: JSON.stringify(payload)
    })
    .then(r => r.json())
    .then(data => {
        if (data.error) throw new Error(data.error);
        Swal.fire({
            icon: 'success',
            title: 'Sucesso',
            text: data.message,
            timer: 1500,
            showConfirmButton: false
        });
        document.getElementById('modal-senhas').style.display = 'none';
        carregarSenhas();
    })
    .catch(err => {
        Swal.fire('Erro', err.message, 'error');
    });
}

function excluirSenha(id) {
    Swal.fire({
        title: 'Excluir Senha?',
        text: "Essa ação não pode ser desfeita.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#94a3b8',
        confirmButtonText: 'Sim, excluir'
    }).then((result) => {
        if (result.isConfirmed) {
            fetch('/api/logistica/senhas/' + id, {
                method: 'DELETE',
                headers: { 'Authorization': 'Bearer ' + localStorage.getItem('erp_token') }
            })
            .then(r => r.json())
            .then(data => {
                if (data.error) throw new Error(data.error);
                carregarSenhas();
            })
            .catch(err => {
                Swal.fire('Erro', err.message, 'error');
            });
        }
    });
}

function togglePasswordVisibility(inputId, iconId) {
    const input = document.getElementById(inputId);
    const icon = document.getElementById(iconId);
    if (!input || !icon) return;

    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.replace('ph-eye', 'ph-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.replace('ph-eye-slash', 'ph-eye');
    }
}

function copiarSenha(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;
    
    // Create a temporary textarea to copy from (since input is pointer-events: none / readonly)
    const tempInput = document.createElement('textarea');
    tempInput.value = input.value;
    document.body.appendChild(tempInput);
    tempInput.select();
    document.execCommand('copy');
    document.body.removeChild(tempInput);

    Swal.fire({
        icon: 'success',
        title: 'Copiado!',
        text: 'Senha copiada para a área de transferência',
        timer: 1500,
        showConfirmButton: false,
        toast: true,
        position: 'top-end'
    });
}

// Hook into app navigation
document.addEventListener('DOMContentLoaded', () => {
    // If there's an event system or we just rely on navigateTo
    const originalNavigateTo = window.navigateTo;
    if (originalNavigateTo && !window.senhasNavHooked) {
        window.senhasNavHooked = true;
        window.navigateTo = function(target) {
            originalNavigateTo(target);
            if (target === 'logistica-senhas') {
                initLogisticaSenhas();
            }
        };
    }
});


function switchSenhaTab(tipo) {
    currentSenhaTab = tipo;
    const btnComp = document.getElementById('tab-senha-comp');
    const btnPess = document.getElementById('tab-senha-pess');
    if (tipo === 'compartilhada') {
        btnComp.style.borderBottomColor = '#2d9e5f'; btnComp.style.color = '#2d9e5f';
        btnPess.style.borderBottomColor = 'transparent'; btnPess.style.color = '#64748b';
    } else {
        btnPess.style.borderBottomColor = '#2d9e5f'; btnPess.style.color = '#2d9e5f';
        btnComp.style.borderBottomColor = 'transparent'; btnComp.style.color = '#64748b';
    }
    filtrarSenhasMulti();
}
