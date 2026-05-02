let senhasLogisticaList = [];
let currentSenhaTab = 'compartilhada';
let uniqueServicos = new Set();

function initLogisticaSenhas() {
    const container = document.getElementById('logistica-senhas-container');
    if (!container) return;

    container.innerHTML = `
        <div style="display:flex; flex-direction:column; height:calc(100vh - 64px); overflow:hidden;">

            <!-- CABEÇALHO FIXO -->
            <div class="page-header flex-between" style="flex-shrink:0; padding:1rem 0 0.75rem; margin-bottom:0; border-bottom:1px solid #e2e8f0;">
                <div style="display: flex; align-items: center; gap: 1rem;">
                    <div style="width: 50px; height: 50px; border-radius: 12px; background: #d6f5e5; color: #2d9e5f; display: flex; align-items: center; justify-content: center; font-size: 1.5rem;">
                        <i class="ph ph-lock-key"></i>
                    </div>
                    <div>
                        <h2 style="margin: 0; font-size: 1.5rem; color: #1e293b;">Cofre de Senhas</h2>
                        <p style="margin: 0; color: #64748b; font-size: 0.9rem;">Gerencie as senhas de acesso aos sistemas da logística.</p>
                    </div>
                </div>
                <div style="display: flex; gap: 0.75rem;">
                    <button class="btn btn-secondary" onclick="abrirHistoricoSenhas()" style="display:flex;align-items:center;gap:6px;border-color:#cbd5e1;color:#475569;"><i class="ph ph-clock-counter-clockwise"></i> Histórico</button>
                    <button class="btn btn-primary" onclick="openSenhasModal()"><i class="ph ph-plus"></i> Nova Senha</button>
                </div>
            </div>

            <!-- ABAS FIXAS -->
            <div class="tabs" style="flex-shrink:0; display:flex; gap:1rem; border-bottom:1px solid #e2e8f0; padding:0.5rem 0 0; margin-top:0.5rem;">
                <button id="tab-senha-comp" onclick="switchSenhaTab('compartilhada')" style="background:none; border:none; border-bottom:2px solid #2d9e5f; color:#2d9e5f; font-weight:600; padding:0.5rem 1rem; cursor:pointer; font-size:1rem;">Senhas Compartilhadas</button>
                <button id="tab-senha-pess" onclick="switchSenhaTab('pessoal')" style="background:none; border:none; border-bottom:2px solid transparent; color:#64748b; font-weight:600; padding:0.5rem 1rem; cursor:pointer; font-size:1rem;">Senhas Pessoais</button>
            </div>

            <!-- FILTROS FIXOS -->
            <div style="flex-shrink:0; background:#fff; padding:0.75rem 0; border-bottom:1px solid #e2e8f0;">
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 0.75rem;">
                    <div style="position:relative;">
                        <i class="ph ph-funnel" style="position:absolute;left:12px;top:50%;transform:translateY(-50%);color:#94a3b8;font-size:1rem;"></i>
                        <input type="text" id="filter-senha-servico" placeholder="Filtrar por Serviço..." oninput="filtrarSenhasMulti()" style="width:100%;padding:0.6rem 0.75rem 0.6rem 2.2rem;border:1px solid #e2e8f0;border-radius:8px;font-size:0.9rem;outline:none;box-sizing:border-box;">
                    </div>
                    <div style="position:relative;">
                        <i class="ph ph-funnel" style="position:absolute;left:12px;top:50%;transform:translateY(-50%);color:#94a3b8;font-size:1rem;"></i>
                        <input type="text" id="filter-senha-usuario" placeholder="Filtrar por Usuário..." oninput="filtrarSenhasMulti()" style="width:100%;padding:0.6rem 0.75rem 0.6rem 2.2rem;border:1px solid #e2e8f0;border-radius:8px;font-size:0.9rem;outline:none;box-sizing:border-box;">
                    </div>
                    <div style="position:relative;">
                        <select id="filter-senha-status" onchange="filtrarSenhasMulti()" style="width:100%;padding:0.6rem 0.75rem;border:1px solid #e2e8f0;border-radius:8px;font-size:0.9rem;outline:none;box-sizing:border-box;background:#fff;color:#64748b;appearance:none;cursor:pointer;">
                            <option value="ativo" selected>🟢 Ativo (Padrão)</option>
                            <option value="">Todos os Status</option>
                            <option value="inativo">🔴 Inativo</option>
                        </select>
                    </div>
                    <div style="position:relative;">
                        <i class="ph ph-funnel" style="position:absolute;left:12px;top:50%;transform:translateY(-50%);color:#94a3b8;font-size:1rem;"></i>
                        <input type="text" id="filter-senha-link" placeholder="Filtrar por Link..." oninput="filtrarSenhasMulti()" style="width:100%;padding:0.6rem 0.75rem 0.6rem 2.2rem;border:1px solid #e2e8f0;border-radius:8px;font-size:0.9rem;outline:none;box-sizing:border-box;">
                    </div>
                </div>
            </div>

            <!-- TABELA COM SCROLL -->
            <div style="flex:1; overflow-y:auto; overflow-x:auto; min-height:0;">
                <table class="table" style="width:100%; border-collapse:collapse;">
                    <thead>
                        <tr style="position:sticky; top:0; z-index:5; background:#f8fafc;">
                            <th style="padding:0.75rem 1rem; border-bottom:2px solid #e2e8f0; white-space:nowrap;">Status</th>
                            <th style="padding:0.75rem 1rem; border-bottom:2px solid #e2e8f0;">Nome</th>
                            <th style="padding:0.75rem 1rem; border-bottom:2px solid #e2e8f0;">Serviço / Acesso</th>
                            <th style="padding:0.75rem 1rem; border-bottom:2px solid #e2e8f0;">Link</th>
                            <th style="padding:0.75rem 1rem; border-bottom:2px solid #e2e8f0;">Usuário</th>
                            <th id="th-dono-senha" style="display:none; padding:0.75rem 1rem; border-bottom:2px solid #e2e8f0; color:#d9480f;">Dono do Sistema</th>
                            <th style="padding:0.75rem 1rem; border-bottom:2px solid #e2e8f0; width:200px;">Senha</th>
                            <th style="padding:0.75rem 1rem; border-bottom:2px solid #e2e8f0; text-align:right; width:120px;">Ações</th>
                        </tr>
                    </thead>
                    <tbody id="table-senhas-body">
                        <tr><td colspan="7" style="text-align:center; padding: 2rem; color: #94a3b8;">Carregando senhas...</td></tr>
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
                            <label>Nome</label>
                            <input type="text" id="senha-nome" list="colaboradores-senha-list" placeholder="Nome do Colaborador (ou Conta Principal)" autocomplete="off">
                            <datalist id="colaboradores-senha-list"></datalist>
                        </div>
                        <div class="input-group mb-3">
                            <label>Visibilidade</label>
                            <select id="senha-tipo" style="width:100%;padding:0.6rem;border:1px solid #e2e8f0;border-radius:6px;outline:none;background:#f8fafc;">
                                <option value="compartilhada">Senha Compartilhada (Uso Geral)</option>
                                <option value="pessoal">Senha Pessoal (Privado)</option>
                            </select>
                        </div>
                        <div class="input-group mb-3">
                            <label>Nome do Serviço / Tipo de Acesso</label>
                            <input type="text" id="senha-servico" list="servicos-list" placeholder="Ex: Cobli, SimpliRoute, etc" autocomplete="off">
                            <datalist id="servicos-list"></datalist>
                        </div>
                        <div class="input-group mb-3">
                            <label>Link de Acesso (URL)</label>
                            <input type="url" id="senha-link" placeholder="https://..." autocomplete="off">
                        </div>
                        <div class="input-group mb-3">
                            <label>Usuário</label>
                            <input type="text" id="senha-usuario" placeholder="Login ou e-mail" autocomplete="off">
                        </div>
                        <div class="input-group mb-4" style="position:relative;">
                            <label>Senha</label>
                            <input type="password" id="senha-valor" placeholder="Sua senha" autocomplete="new-password" style="padding-right:40px;">
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
    carregarColaboradoresParaSenhas();
    _injetarModalHistoricoSenhas();
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
        tbody.innerHTML = `<tr><td colspan="${showDono ? 8 : 7}" style="text-align:center; padding:2rem; color:#64748b;">Nenhuma senha cadastrada.</td></tr>`;
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

        
        const statusClass = (s.colab_status === 'Desligado') ? 'color:#ef4444;background:#fee2e2;' : 'color:#155724;background:#d4edda;';
        const statusIcon = (s.colab_status === 'Desligado') ? '🔴 Inativo' : '🟢 Ativo';
        
        tr.innerHTML = `
            <td><span style="${statusClass} padding:4px 8px; border-radius:12px; font-size:0.8rem; font-weight:600; white-space:nowrap;">${statusIcon}</span></td>
            <td style="font-weight:600; color:#1e293b;">${s.nome || '<span style="color:#94a3b8;">-</span>'}</td>
            <td>${s.servico || '-'}</td>
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
    const fStatus = document.getElementById('filter-senha-status')?.value || '';

    const filtradas = senhasLogisticaList.filter(s => {
        let matchServico = true;
        let matchUsuario = true;
        let matchLink = true;
        let matchStatus = true;

        if (fServico) matchServico = s.servico && s.servico.toLowerCase().includes(fServico);
        if (fUsuario) matchUsuario = s.usuario && s.usuario.toLowerCase().includes(fUsuario);
        if (fLink) matchLink = s.link && s.link.toLowerCase().includes(fLink);
        if (fStatus === 'ativo') matchStatus = s.colab_status !== 'Desligado';
        if (fStatus === 'inativo') matchStatus = s.colab_status === 'Desligado';

        let matchTab = (s.tipo === currentSenhaTab || (!s.tipo && currentSenhaTab === 'compartilhada'));
        return matchServico && matchUsuario && matchLink && matchStatus && matchTab;
    });

    renderSenhasTable(filtradas);
}

function openSenhasModal() {
    document.getElementById('senha-id').value = '';
    document.getElementById('senha-nome').value = '';
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
    document.getElementById('senha-nome').value = senhaObj.nome || '';
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
    const nome = document.getElementById('senha-nome').value.trim();
    const servico = document.getElementById('senha-servico').value.trim();
    const link = document.getElementById('senha-link').value.trim();
    const usuario = document.getElementById('senha-usuario').value.trim();
    const senha = document.getElementById('senha-valor').value.trim();
    const tipo = document.getElementById('senha-tipo').value;

    

    const payload = { nome, servico, link, usuario, senha, tipo };
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


function carregarColaboradoresParaSenhas() {
    fetch('/api/colaboradores', {
        headers: { 'Authorization': 'Bearer ' + localStorage.getItem('erp_token') }
    })
    .then(r => r.json())
    .then(data => {
        const datalist = document.getElementById('colaboradores-senha-list');
        if (!datalist) return;
        datalist.innerHTML = '';
        data.forEach(c => {
            const option = document.createElement('option');
            option.value = c.nome_completo;
            datalist.appendChild(option);
        });
    })
    .catch(console.error);
}

// ─── HISTÓRICO DE ALTERAÇÕES ────────────────────────────────────────────────

function _injetarModalHistoricoSenhas() {
    if (document.getElementById('modal-historico-senhas')) return; // já existe

    const modal = document.createElement('div');
    modal.id = 'modal-historico-senhas';
    modal.style.cssText = 'display:none; position:fixed; inset:0; background:rgba(15,23,42,0.75); z-index:99999; align-items:flex-start; justify-content:center; padding:2rem 1rem; overflow-y:auto;';
    modal.innerHTML = `
        <div style="background:#fff; border-radius:14px; width:100%; max-width:900px; box-shadow:0 25px 80px rgba(0,0,0,0.35); display:flex; flex-direction:column; max-height:90vh;">
            <!-- Header -->
            <div style="background:#0f172a; padding:1.1rem 1.5rem; border-radius:14px 14px 0 0; display:flex; align-items:center; justify-content:space-between; flex-shrink:0;">
                <div style="display:flex; align-items:center; gap:10px;">
                    <div style="width:36px;height:36px;background:rgba(45,158,95,0.25);border-radius:9px;display:flex;align-items:center;justify-content:center;">
                        <i class="ph ph-clock-counter-clockwise" style="color:#2d9e5f;font-size:1.2rem;"></i>
                    </div>
                    <div>
                        <h3 style="margin:0; color:#f1f5f9; font-size:1rem; font-weight:700;">HISTÓRICO DE ALTERAÇÕES — COFRE DE SENHAS</h3>
                        <p id="hist-senhas-subtitle" style="margin:0; color:#94a3b8; font-size:0.75rem;">Últimas 200 operações registradas</p>
                    </div>
                </div>
                <button onclick="document.getElementById('modal-historico-senhas').style.display='none'" style="background:rgba(255,255,255,0.1);border:none;color:#94a3b8;width:32px;height:32px;border-radius:8px;cursor:pointer;font-size:1.2rem;display:flex;align-items:center;justify-content:center;">&times;</button>
            </div>
            <!-- Filtro -->
            <div style="padding:0.75rem 1.5rem; border-bottom:1px solid #e2e8f0; background:#f8fafc; display:flex; gap:0.75rem; flex-shrink:0;">
                <input type="text" id="hist-senhas-filtro" placeholder="🔍 Filtrar por usuário, serviço ou ação..." oninput="_filtrarHistoricoSenhas()" style="flex:1; padding:0.5rem 0.75rem; border:1px solid #e2e8f0; border-radius:8px; font-size:0.87rem; outline:none;">
            </div>
            <!-- Tabela -->
            <div style="overflow-y:auto; flex:1;">
                <table style="width:100%; border-collapse:collapse; font-size:0.84rem;">
                    <thead>
                        <tr style="background:#f8fafc; position:sticky; top:0; z-index:1;">
                            <th style="padding:0.75rem 1rem; text-align:left; font-weight:700; color:#475569; border-bottom:2px solid #e2e8f0; white-space:nowrap;">Data/Hora</th>
                            <th style="padding:0.75rem 1rem; text-align:left; font-weight:700; color:#475569; border-bottom:2px solid #e2e8f0;">Usuário</th>
                            <th style="padding:0.75rem 1rem; text-align:left; font-weight:700; color:#475569; border-bottom:2px solid #e2e8f0;">Ação</th>
                            <th style="padding:0.75rem 1rem; text-align:left; font-weight:700; color:#475569; border-bottom:2px solid #e2e8f0;">Serviço / Nome</th>
                            <th style="padding:0.75rem 1rem; text-align:left; font-weight:700; color:#475569; border-bottom:2px solid #e2e8f0;">Campo</th>
                            <th style="padding:0.75rem 1rem; text-align:left; font-weight:700; color:#ef4444; border-bottom:2px solid #e2e8f0;">Antes</th>
                            <th style="padding:0.75rem 1rem; text-align:left; font-weight:700; color:#22c55e; border-bottom:2px solid #e2e8f0;">Depois</th>
                        </tr>
                    </thead>
                    <tbody id="hist-senhas-tbody">
                        <tr><td colspan="7" style="text-align:center; padding:2rem; color:#94a3b8;">Carregando...</td></tr>
                    </tbody>
                </table>
            </div>
            <!-- Footer -->
            <div style="padding:0.75rem 1.5rem; background:#f8fafc; border-top:1px solid #e2e8f0; border-radius:0 0 14px 14px; display:flex; justify-content:flex-end; flex-shrink:0;">
                <button onclick="document.getElementById('modal-historico-senhas').style.display='none'" style="background:#0f172a;color:#fff;border:none;border-radius:8px;padding:0.5rem 1.5rem;font-weight:600;cursor:pointer;">Fechar</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

let _histSenhasData = [];

window.abrirHistoricoSenhas = async function() {
    _injetarModalHistoricoSenhas();
    const modal = document.getElementById('modal-historico-senhas');
    modal.style.display = 'flex';

    const tbody = document.getElementById('hist-senhas-tbody');
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:2rem;color:#94a3b8;"><i class="ph ph-circle-notch" style="animation:spin 1s linear infinite;font-size:1.5rem;"></i><br>Carregando histórico...</td></tr>';

    try {
        const tok = localStorage.getItem('erp_token') || '';
        const res = await fetch('/api/logistica/senhas/historico', {
            headers: { 'Authorization': 'Bearer ' + tok }
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro ao carregar histórico');
        _histSenhasData = data;
        _renderHistoricoSenhas(data);
    } catch(e) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:2rem;color:#ef4444;">Erro ao carregar: ${e.message}</td></tr>`;
    }
};

function _filtrarHistoricoSenhas() {
    const q = (document.getElementById('hist-senhas-filtro')?.value || '').toLowerCase().trim();
    if (!q) { _renderHistoricoSenhas(_histSenhasData); return; }
    const filtrado = _histSenhasData.filter(r =>
        (r.usuario_nome||'').toLowerCase().includes(q) ||
        (r.acao||'').toLowerCase().includes(q) ||
        (r.senha_servico||r.campo_alterado||'').toLowerCase().includes(q) ||
        (r.senha_nome||'').toLowerCase().includes(q)
    );
    _renderHistoricoSenhas(filtrado);
}

function _renderHistoricoSenhas(rows) {
    const tbody = document.getElementById('hist-senhas-tbody');
    if (!tbody) return;

    if (!rows || rows.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:2rem;color:#94a3b8;">Nenhum registro encontrado.</td></tr>';
        return;
    }

    const acaoLabel = { criacao: { txt: '✅ Criação', bg:'#d1fae5', cor:'#065f46' }, edicao: { txt: '✏️ Edição', bg:'#dbeafe', cor:'#1e40af' }, exclusao: { txt: '🗑️ Exclusão', bg:'#fee2e2', cor:'#991b1b' } };
    const campoLabel = { servico: 'Serviço', usuario: 'Usuário/Login', nome: 'Nome', link: 'Link', senha: 'Senha', registro: 'Geral' };

    tbody.innerHTML = rows.map(r => {
        const dt = new Date(r.criado_em);
        const data = dt.toLocaleDateString('pt-BR');
        const hora = dt.toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' });
        const acao = acaoLabel[r.acao] || { txt: r.acao, bg:'#f1f5f9', cor:'#334155' };
        const campo = campoLabel[r.campo_alterado] || r.campo_alterado || '—';
        const servico = r.senha_servico || r.campo_alterado === 'servico' ? (r.valor_novo || r.valor_anterior || '—') : (r.senha_servico || '—');
        const nomeExibido = r.senha_nome || r.senha_servico || '—';
        const antes = r.campo_alterado === 'senha' ? '●●●●●●' : (r.valor_anterior || '—');
        const depois = r.campo_alterado === 'senha' ? '●●●●●●' : (r.valor_novo || '—');

        return `<tr style="border-bottom:1px solid #f1f5f9; transition:background 0.15s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background=''">
            <td style="padding:0.65rem 1rem; white-space:nowrap; color:#64748b; font-size:0.8rem;">${data}<br><span style="color:#94a3b8;">${hora}</span></td>
            <td style="padding:0.65rem 1rem; font-weight:600; color:#1e293b;">${r.usuario_nome || '—'}</td>
            <td style="padding:0.65rem 1rem;"><span style="background:${acao.bg};color:${acao.cor};padding:3px 10px;border-radius:20px;font-size:0.78rem;font-weight:700;white-space:nowrap;">${acao.txt}</span></td>
            <td style="padding:0.65rem 1rem; color:#334155;">${nomeExibido}</td>
            <td style="padding:0.65rem 1rem; color:#64748b; font-size:0.82rem;">${campo}</td>
            <td style="padding:0.65rem 1rem; color:#b91c1c; font-size:0.82rem; max-width:200px; word-break:break-all;">${antes}</td>
            <td style="padding:0.65rem 1rem; color:#15803d; font-size:0.82rem; max-width:200px; word-break:break-all;">${depois}</td>
        </tr>`;
    }).join('');
}
