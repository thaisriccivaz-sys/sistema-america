// ============================================================
// MÓDULO: USUÁRIOS E PERMISSÕES
// ============================================================

const TELAS_SISTEMA = [
    { modulo: 'RH', pagina_id: 'dashboard',             pagina_nome: 'Dashboard' },
    { modulo: 'RH', pagina_id: 'colaboradores',          pagina_nome: 'Colaboradores' },
    { modulo: 'RH', pagina_id: 'admissao',               pagina_nome: 'Admissão' },
    { modulo: 'RH', pagina_id: 'cargos',                 pagina_nome: 'Cargos' },
    { modulo: 'RH', pagina_id: 'departamentos',          pagina_nome: 'Departamentos' },
    { modulo: 'RH', pagina_id: 'faculdade',              pagina_nome: 'Faculdade' },
    { modulo: 'RH', pagina_id: 'chaves',                 pagina_nome: 'Chaves' },
    { modulo: 'RH', pagina_id: 'geradores',              pagina_nome: 'Geradores de Documentos' },
    { modulo: 'RH', pagina_id: 'ficha-epi',              pagina_nome: 'Ficha EPI' },
    { modulo: 'RH', pagina_id: 'gerenciar-avaliacoes',   pagina_nome: 'Avaliações' },
    { modulo: 'Sistema', pagina_id: 'usuarios-permissoes', pagina_nome: 'Usuários e Permissões' },
];

const DEPARTAMENTOS = ['RH', 'Financeiro', 'Comercial', 'Logística', 'Administrativo', 'Diretoria', 'Todas'];

// Estado do módulo
let _permGrupos = [];
let _permUsuarios = [];
let _grupoSelecionadoId = null;
let _permissoesAtivas = {}; // { pagina_id: { visualizar, alterar, incluir, excluir } }

// ── CARREGAMENTO INICIAL ──────────────────────────────────────

window.initUsuariosPermissoes = async function() {
    await Promise.all([carregarUsuariosLista(), carregarGruposLista()]);
};

async function carregarUsuariosLista() {
    const res = await fetch(`${API_URL}/usuarios`, { headers: { Authorization: `Bearer ${currentToken}` } });
    _permUsuarios = await res.json();
    renderTabelaUsuarios();
    popularSelectCopiarUsuario();
}

async function carregarGruposLista() {
    const res = await fetch(`${API_URL}/grupos-permissao`, { headers: { Authorization: `Bearer ${currentToken}` } });
    _permGrupos = await res.json();
    renderListaGrupos();
}

// ── ABAS ─────────────────────────────────────────────────────

window.switchPermTab = function(aba) {
    const tabs = ['usuarios', 'grupos'];
    tabs.forEach(t => {
        const panel = document.getElementById(`perm-tab-${t}`);
        const btn = document.getElementById(`tab-btn-${t}`);
        if (panel) panel.style.display = t === aba ? 'block' : 'none';
        if (btn) {
            if (t === aba) {
                btn.style.background = '#d9480f';
                btn.style.color = '#fff';
            } else {
                btn.style.background = '#f1f5f9';
                btn.style.color = '#64748b';
            }
        }
    });
};

// ── TABELA DE USUÁRIOS ────────────────────────────────────────

function renderTabelaUsuarios() {
    const tbody = document.getElementById('tbody-usuarios');
    if (!tbody) return;
    if (!_permUsuarios.length) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#94a3b8;padding:2rem;">Nenhum usuário cadastrado</td></tr>';
        return;
    }
    tbody.innerHTML = _permUsuarios.map(u => `
        <tr style="opacity:${u.ativo ? 1 : 0.45};">
            <td><strong>${u.nome || u.username}</strong></td>
            <td><code>${u.username}</code></td>
            <td>${u.departamento || '-'}</td>
            <td>
                ${u.grupo_nome
                    ? `<span style="background:#fff3ed;color:#d9480f;padding:2px 8px;border-radius:10px;font-size:0.8rem;font-weight:600;">${u.grupo_nome}</span>`
                    : '<span style="color:#94a3b8;font-size:0.8rem;">Sem grupo</span>'}
            </td>
            <td>
                <span style="background:${u.ativo ? '#d4edda' : '#f8d7da'};color:${u.ativo ? '#155724' : '#721c24'};padding:2px 8px;border-radius:10px;font-size:0.78rem;font-weight:600;">
                    ${u.ativo ? 'Ativo' : 'Inativo'}
                </span>
            </td>
            <td style="text-align:right;">
                <button class="btn btn-secondary btn-sm" onclick="editarUsuario(${u.id})" title="Editar">
                    <i class="ph ph-note-pencil"></i>
                </button>
                <button class="btn btn-sm" onclick="toggleAtivoUsuario(${u.id}, ${u.ativo})"
                    style="background:${u.ativo ? '#fff3cd' : '#d4edda'};color:${u.ativo ? '#856404' : '#155724'};" title="${u.ativo ? 'Inativar' : 'Reativar'}">
                    <i class="ph ph-${u.ativo ? 'pause-circle' : 'play-circle'}"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

// ── MODAL DE USUÁRIO ──────────────────────────────────────────

window.abrirModalUsuario = async function(userId = null) {
    const user = userId ? _permUsuarios.find(u => u.id === userId) : null;

    // Buscar colaboradores para o select
    let colaboradores = [];
    try {
        const res = await fetch(`${API_URL}/colaboradores`, { headers: { Authorization: `Bearer ${currentToken}` } });
        const all = await res.json();
        // Filtrar apenas colaboradores que ainda não têm usuário (exceto se for edição)
        const usernamesAtivos = _permUsuarios.filter(u => u.ativo).map(u => (u.username || '').toLowerCase());
        colaboradores = userId ? all : all.filter(c => c.status !== 'Desligado');
    } catch(e) { colaboradores = []; }

    const gruposOptions = _permGrupos.map(g =>
        `<option value="${g.id}" ${user && user.grupo_permissao_id == g.id ? 'selected' : ''}>${g.nome} (${g.departamento})</option>`
    ).join('');

    const colabOptions = colaboradores.map(c =>
        `<option value="${c.id}" data-nome="${c.nome_completo}" data-email="${c.email || ''}" data-depto="${c.departamento || ''}">${c.nome_completo} — ${c.cargo || ''} / ${c.departamento || ''}</option>`
    ).join('');

    const modalHtml = `
        <div id="modal-usuario" style="
            position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.55);
            display:flex;align-items:center;justify-content:center;padding:1rem;">
            <div style="background:#fff;border-radius:16px;padding:2rem;width:540px;max-width:95vw;
                        max-height:90vh;overflow-y:auto;box-shadow:0 24px 80px rgba(0,0,0,0.25);">

                <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:1.5rem;">
                    <div style="width:40px;height:40px;border-radius:10px;background:#fff3ed;display:flex;align-items:center;justify-content:center;">
                        <i class="ph ph-user-plus" style="font-size:1.3rem;color:#d9480f;"></i>
                    </div>
                    <div>
                        <h3 style="margin:0;font-size:1.1rem;color:#1e293b;">${user ? 'Editar Usuário' : 'Novo Usuário do Sistema'}</h3>
                        <p style="margin:2px 0 0;font-size:0.78rem;color:#94a3b8;">O colaborador deve estar previamente cadastrado no sistema</p>
                    </div>
                </div>

                ${!userId ? `
                <!-- STEP 1: Selecionar colaborador -->
                <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:1rem;margin-bottom:1.25rem;">
                    <label style="font-weight:700;font-size:0.85rem;color:#475569;display:block;margin-bottom:0.5rem;">
                        <i class="ph ph-magnifying-glass"></i> 1. Selecionar Colaborador Cadastrado *
                    </label>
                    <input id="mu-colab-search" type="text" placeholder="Digite o nome do colaborador..."
                        oninput="filtrarColabsModal(this.value)"
                        style="width:100%;padding:0.5rem 0.75rem;border:1px solid #e2e8f0;border-radius:8px;font-size:0.9rem;margin-bottom:0.5rem;">
                    <select id="mu-colab-select" size="4" onchange="preencherDadosColab(this)"
                        style="width:100%;border:1px solid #e2e8f0;border-radius:8px;font-size:0.85rem;padding:0.25rem;">
                        <option value="">-- Selecione um colaborador --</option>
                        ${colabOptions}
                    </select>
                </div>` : ''}

                <!-- Dados preenchidos (automático ou manual em edição) -->
                <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:1rem;margin-bottom:1.25rem;">
                    <label style="font-weight:700;font-size:0.85rem;color:#475569;display:block;margin-bottom:0.75rem;">
                        <i class="ph ph-identification-card"></i> ${userId ? 'Dados do Usuário' : '2. Dados (preenchidos automaticamente)'}
                    </label>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;">
                        <div class="input-group" style="grid-column:span 2;">
                            <label>Nome Completo</label>
                            <input id="mu-nome" type="text" value="${user ? (user.nome || '') : ''}"
                                readonly style="background:#f1f5f9;color:#64748b;" placeholder="Preenchido ao selecionar o colaborador">
                        </div>
                        <div class="input-group">
                            <label>Email</label>
                            <input id="mu-email" type="email" value="${user ? (user.email || '') : ''}"
                                readonly style="background:#f1f5f9;color:#64748b;" placeholder="Do cadastro">
                        </div>
                        <div class="input-group">
                            <label>Departamento</label>
                            <input id="mu-departamento" type="text" value="${user ? (user.departamento || '') : ''}"
                                readonly style="background:#f1f5f9;color:#64748b;" placeholder="Do cadastro">
                        </div>
                    </div>
                </div>

                <!-- Credenciais de acesso -->
                <div style="background:#fff3ed;border:1px solid #ffd8b4;border-radius:10px;padding:1rem;margin-bottom:1.25rem;">
                    <label style="font-weight:700;font-size:0.85rem;color:#d9480f;display:block;margin-bottom:0.75rem;">
                        <i class="ph ph-lock-key"></i> ${userId ? 'Credenciais de Acesso' : '3. Credenciais de Acesso'} (definidas pela Diretoria)
                    </label>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;">
                        <div class="input-group">
                            <label>Username / Login *</label>
                            <input id="mu-username" type="text" value="${user ? user.username : ''}"
                                ${user ? 'readonly style="background:#f8f9fa;"' : 'placeholder="ex: joao.silva"'}>
                        </div>
                        <div class="input-group">
                            <label>Senha ${user ? '(deixe em branco para manter)' : '*'}</label>
                            <input id="mu-password" type="password" placeholder="${user ? 'Nova senha (opcional)' : 'Senha de acesso'}">
                        </div>
                    </div>
                </div>

                <!-- Grupo de permissão -->
                <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:1rem;margin-bottom:1.5rem;">
                    <label style="font-weight:700;font-size:0.85rem;color:#15803d;display:block;margin-bottom:0.5rem;">
                        <i class="ph ph-shield-check"></i> ${userId ? 'Grupo de Permissão' : '4. Grupo de Permissão'}
                    </label>
                    <select id="mu-grupo" style="width:100%;padding:0.5rem 0.75rem;border:1px solid #bbf7d0;border-radius:8px;font-size:0.9rem;">
                        <option value="">-- Sem grupo (sem acesso) --</option>
                        ${gruposOptions}
                    </select>
                    <p style="margin:0.4rem 0 0;font-size:0.75rem;color:#64748b;">
                        Configure os grupos na aba "Grupos de Permissão"
                    </p>
                </div>

                <div style="display:flex;justify-content:flex-end;gap:0.75rem;">
                    <button class="btn btn-secondary" onclick="document.getElementById('modal-usuario').remove()">
                        <i class="ph ph-x"></i> Cancelar
                    </button>
                    <button class="btn btn-primary" onclick="salvarUsuario(${userId || 'null'})"
                        style="background:#d9480f;font-weight:700;">
                        <i class="ph ph-check-circle"></i> Confirmar e Salvar
                    </button>
                </div>
            </div>
        </div>`;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
};

// Filtrar colaboradores no modal
window.filtrarColabsModal = function(query) {
    const sel = document.getElementById('mu-colab-select');
    if (!sel) return;
    const q = query.toLowerCase();
    Array.from(sel.options).forEach(opt => {
        if (!opt.value) return;
        opt.style.display = opt.text.toLowerCase().includes(q) ? '' : 'none';
    });
};

// Preencher dados ao selecionar colaborador
window.preencherDadosColab = function(sel) {
    const opt = sel.options[sel.selectedIndex];
    if (!opt || !opt.value) return;
    const nome  = opt.dataset.nome  || '';
    const email = opt.dataset.email || '';
    const depto = opt.dataset.depto || '';
    const nomeField  = document.getElementById('mu-nome');
    const emailField = document.getElementById('mu-email');
    const deptoField = document.getElementById('mu-departamento');
    if (nomeField)  nomeField.value  = nome;
    if (emailField) emailField.value = email;
    if (deptoField) deptoField.value = depto;
    // Sugerir username automático
    const usernameField = document.getElementById('mu-username');
    if (usernameField && !usernameField.value) {
        usernameField.value = nome.toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .split(' ').filter(Boolean).slice(0, 2).join('.');
    }
};

window.editarUsuario = function(id) { abrirModalUsuario(id); };

window.salvarUsuario = async function(userId) {
    const nome       = document.getElementById('mu-nome').value.trim();
    const username   = document.getElementById('mu-username').value.trim();
    const password   = document.getElementById('mu-password').value;
    const email      = document.getElementById('mu-email').value.trim();
    const departamento = document.getElementById('mu-departamento').value.trim();
    const grupo_permissao_id = document.getElementById('mu-grupo').value || null;

    if (!userId) {
        const colabSel = document.getElementById('mu-colab-select');
        if (colabSel && !colabSel.value) return alert('Selecione um colaborador cadastrado');
    }
    if (!username) return alert('Username é obrigatório');
    if (!userId && !password) return alert('Senha é obrigatória para novo usuário');

    const payload = { nome, username, email, departamento, grupo_permissao_id: grupo_permissao_id ? parseInt(grupo_permissao_id) : null };
    if (password) payload.password = password;

    try {
        const url = userId ? `${API_URL}/usuarios/${userId}` : `${API_URL}/usuarios`;
        const method = userId ? 'PUT' : 'POST';
        const res = await fetch(url, {
            method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${currentToken}` },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.error) return alert(data.error);
        document.getElementById('modal-usuario').remove();
        await carregarUsuariosLista();
    } catch(e) { alert('Erro ao salvar usuário'); }
};

window.toggleAtivoUsuario = async function(id, ativoAtual) {
    const acao = ativoAtual ? 'inativar' : 'reativar';
    if (!confirm(`Deseja ${acao} este usuário?`)) return;
    await fetch(`${API_URL}/usuarios/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${currentToken}` },
        body: JSON.stringify({ ativo: ativoAtual ? 0 : 1 })
    });
    await carregarUsuariosLista();
};


// ── GRUPOS DE PERMISSÃO ───────────────────────────────────────

function renderListaGrupos() {
    const container = document.getElementById('lista-grupos-permissao');
    if (!container) return;
    if (!_permGrupos.length) {
        container.innerHTML = '<p style="color:#94a3b8;font-size:0.85rem;text-align:center;padding:1rem;">Nenhum grupo cadastrado</p>';
        return;
    }
    const tipoBadge = { departamento: '#dbeafe|#1d4ed8', personalizado: '#f3e8ff|#7c3aed', baseado_em: '#fef3c7|#92400e' };
    container.innerHTML = _permGrupos.map(g => {
        const [bg, clr] = (tipoBadge[g.tipo] || '#f1f5f9|#475569').split('|');
        const selected = g.id === _grupoSelecionadoId;
        return `
            <div onclick="selecionarGrupo(${g.id})" style="
                padding:0.75rem 1rem;border-radius:8px;cursor:pointer;border:2px solid ${selected ? '#d9480f' : 'transparent'};
                background:${selected ? '#fff3ed' : '#f8fafc'};transition:all 0.15s;">
                <div style="display:flex;justify-content:space-between;align-items:center;">
                    <strong style="font-size:0.9rem;color:#1e293b;">${g.nome}</strong>
                    <div style="display:flex;gap:4px;">
                        <button class="btn btn-sm" onclick="event.stopPropagation();abrirModalGrupo(${g.id})"
                            style="padding:2px 6px;background:transparent;color:#64748b;border:1px solid #e2e8f0;" title="Editar">
                            <i class="ph ph-pencil-simple"></i>
                        </button>
                        <button class="btn btn-sm" onclick="event.stopPropagation();excluirGrupo(${g.id})"
                            style="padding:2px 6px;background:transparent;color:#ef4444;border:1px solid #fee2e2;" title="Excluir">
                            <i class="ph ph-trash"></i>
                        </button>
                    </div>
                </div>
                <div style="margin-top:4px;display:flex;gap:6px;align-items:center;">
                    <span style="background:${bg};color:${clr};font-size:0.7rem;padding:1px 6px;border-radius:8px;font-weight:600;">${g.tipo}</span>
                    <span style="color:#94a3b8;font-size:0.75rem;">${g.departamento}</span>
                </div>
                ${g.descricao ? `<p style="margin:4px 0 0;font-size:0.75rem;color:#94a3b8;">${g.descricao}</p>` : ''}
            </div>`;
    }).join('');
}

window.selecionarGrupo = async function(id) {
    _grupoSelecionadoId = id;
    renderListaGrupos();

    const grupo = _permGrupos.find(g => g.id === id);
    document.getElementById('perm-editor-empty').style.display = 'none';
    document.getElementById('perm-editor-content').style.display = 'block';
    document.getElementById('perm-editor-title').textContent = grupo.nome;
    document.getElementById('perm-editor-subtitle').textContent = `${grupo.departamento} · ${grupo.tipo}`;

    // Buscar permissões do grupo
    const res = await fetch(`${API_URL}/grupos-permissao/${id}/permissoes`, {
        headers: { Authorization: `Bearer ${currentToken}` }
    });
    const permsExistentes = await res.json();

    // Montar estado interno mesclando TELAS_SISTEMA com o que está no banco
    _permissoesAtivas = {};
    TELAS_SISTEMA.forEach(t => {
        const found = permsExistentes.find(p => p.pagina_id === t.pagina_id);
        _permissoesAtivas[t.pagina_id] = {
            pagina_nome: t.pagina_nome,
            modulo: t.modulo,
            visualizar: found ? !!found.visualizar : false,
            alterar:    found ? !!found.alterar    : false,
            incluir:    found ? !!found.incluir    : false,
            excluir:    found ? !!found.excluir    : false,
        };
    });

    // Popular select de módulos
    const modulos = [...new Set(TELAS_SISTEMA.map(t => t.modulo))];
    const sel = document.getElementById('perm-filter-modulo');
    if (sel) {
        sel.innerHTML = '<option value="">Todos</option>' +
            modulos.map(m => `<option value="${m}">${m}</option>`).join('');
    }

    renderTabelaPermissoes();
    popularSelectCopiarUsuario();
};

window.renderTabelaPermissoes = function() {
    const tbody = document.getElementById('tbody-permissoes');
    const filtroModulo = document.getElementById('perm-filter-modulo')?.value || '';
    if (!tbody) return;

    const telas = TELAS_SISTEMA.filter(t => !filtroModulo || t.modulo === filtroModulo);
    const COLS = ['visualizar', 'alterar', 'incluir', 'excluir'];
    const CORES = { visualizar: '#1971c2', alterar: '#2d9e5f', incluir: '#e67700', excluir: '#dc3545' };

    tbody.innerHTML = telas.map(t => {
        const perm = _permissoesAtivas[t.pagina_id] || {};
        return `<tr>
            <td style="color:#64748b;font-size:0.8rem;">${t.modulo}</td>
            <td style="font-weight:500;">${t.pagina_nome}</td>
            ${COLS.map(c => `
                <td style="text-align:center;">
                    <label style="display:inline-flex;align-items:center;justify-content:center;cursor:pointer;">
                        <input type="checkbox" data-pagina="${t.pagina_id}" data-col="${c}"
                            ${perm[c] ? 'checked' : ''}
                            onchange="togglePermissao('${t.pagina_id}','${c}',this.checked)"
                            style="width:18px;height:18px;accent-color:${CORES[c]};cursor:pointer;">
                    </label>
                </td>`).join('')}
        </tr>`;
    }).join('');
};

window.togglePermissao = function(paginaId, col, val) {
    if (!_permissoesAtivas[paginaId]) _permissoesAtivas[paginaId] = {};
    _permissoesAtivas[paginaId][col] = val;
    // Se marcou Alterar/Incluir/Excluir, garante Visualizar
    if (val && col !== 'visualizar') {
        _permissoesAtivas[paginaId]['visualizar'] = true;
        const cbVis = document.querySelector(`[data-pagina="${paginaId}"][data-col="visualizar"]`);
        if (cbVis) cbVis.checked = true;
    }
};

window.selecionarTodasPermissoes = function(marcar) {
    TELAS_SISTEMA.forEach(t => {
        _permissoesAtivas[t.pagina_id] = {
            pagina_nome: t.pagina_nome,
            modulo: t.modulo,
            visualizar: marcar,
            alterar: marcar,
            incluir: marcar,
            excluir: marcar,
        };
    });
    renderTabelaPermissoes();
};

window.salvarPermissoes = async function() {
    if (!_grupoSelecionadoId) return;
    const permissoes = TELAS_SISTEMA.map(t => ({
        pagina_id: t.pagina_id,
        pagina_nome: t.pagina_nome,
        modulo: t.modulo,
        ..._permissoesAtivas[t.pagina_id] || { visualizar: 0, alterar: 0, incluir: 0, excluir: 0 }
    }));
    try {
        const res = await fetch(`${API_URL}/grupos-permissao/${_grupoSelecionadoId}/permissoes`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${currentToken}` },
            body: JSON.stringify({ permissoes })
        });
        const data = await res.json();
        if (data.error) return alert(data.error);
        // Feedback visual
        const btn = document.querySelector('[onclick="salvarPermissoes()"]');
        if (btn) { btn.textContent = '✓ Salvo!'; setTimeout(() => { btn.innerHTML = '<i class="ph ph-floppy-disk"></i> Salvar'; }, 1500); }
    } catch(e) { alert('Erro ao salvar permissões'); }
};

// ── COPIAR DE USUÁRIO ─────────────────────────────────────────

function popularSelectCopiarUsuario() {
    const sel = document.getElementById('perm-copy-user-select');
    if (!sel) return;
    sel.innerHTML = '<option value="">Copiar permissões de usuário...</option>' +
        _permUsuarios.filter(u => u.ativo && u.grupo_permissao_id).map(u =>
            `<option value="${u.id}">${u.nome || u.username} (${u.grupo_nome || 'sem grupo'})</option>`
        ).join('');
}

window.copiarPermissoesDeUsuario = async function() {
    if (!_grupoSelecionadoId) return alert('Selecione um grupo primeiro');
    const uid = document.getElementById('perm-copy-user-select').value;
    if (!uid) return alert('Selecione um usuário para copiar');
    if (!confirm('Isso vai sobrescrever as permissões atuais do grupo com as do usuário selecionado. Continuar?')) return;
    try {
        const res = await fetch(`${API_URL}/grupos-permissao/${_grupoSelecionadoId}/copiar-usuario/${uid}`, {
            method: 'POST', headers: { Authorization: `Bearer ${currentToken}` }
        });
        const data = await res.json();
        if (data.error) return alert(data.error);
        await selecionarGrupo(_grupoSelecionadoId);
    } catch(e) { alert('Erro ao copiar permissões'); }
};

// ── MODAL DE GRUPO ────────────────────────────────────────────

window.abrirModalGrupo = function(grupoId = null) {
    const grupo = grupoId ? _permGrupos.find(g => g.id === grupoId) : null;
    const deptoOptions = DEPARTAMENTOS.map(d =>
        `<option value="${d}" ${grupo && grupo.departamento === d ? 'selected' : ''}>${d}</option>`
    ).join('');
    const tipoOptions = [
        { v: 'personalizado', l: 'Personalizado' },
        { v: 'departamento', l: 'Por Departamento' },
        { v: 'baseado_em', l: 'Baseado em Usuário' },
    ].map(t => `<option value="${t.v}" ${grupo && grupo.tipo === t.v ? 'selected' : ''}>${t.l}</option>`).join('');

    const modalHtml = `
        <div id="modal-grupo" style="
            position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.45);
            display:flex;align-items:center;justify-content:center;">
            <div style="background:#fff;border-radius:12px;padding:2rem;width:420px;max-width:95vw;box-shadow:0 20px 60px rgba(0,0,0,0.2);">
                <h3 style="margin:0 0 1.5rem;font-size:1.1rem;color:#d9480f;">
                    <i class="ph ph-shield-check"></i> ${grupo ? 'Editar Grupo' : 'Novo Grupo de Permissão'}
                </h3>
                <div style="display:flex;flex-direction:column;gap:1rem;">
                    <div class="input-group">
                        <label>Nome do Grupo *</label>
                        <input id="mg-nome" type="text" value="${grupo ? grupo.nome : ''}" placeholder="Ex: Financeiro - Leitura">
                    </div>
                    <div class="input-group">
                        <label>Descrição</label>
                        <input id="mg-descricao" type="text" value="${grupo ? (grupo.descricao || '') : ''}" placeholder="Descrição opcional">
                    </div>
                    <div class="input-group">
                        <label>Departamento</label>
                        <select id="mg-departamento">${deptoOptions}</select>
                    </div>
                    <div class="input-group">
                        <label>Tipo</label>
                        <select id="mg-tipo">${tipoOptions}</select>
                    </div>
                </div>
                <div style="display:flex;justify-content:flex-end;gap:0.75rem;margin-top:1.5rem;">
                    <button class="btn btn-secondary" onclick="document.getElementById('modal-grupo').remove()">Cancelar</button>
                    <button class="btn btn-primary" onclick="salvarGrupo(${grupoId || 'null'})" style="background:#d9480f;">
                        <i class="ph ph-check"></i> Salvar Grupo
                    </button>
                </div>
            </div>
        </div>`;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
};

window.salvarGrupo = async function(grupoId) {
    const nome = document.getElementById('mg-nome').value.trim();
    const descricao = document.getElementById('mg-descricao').value.trim();
    const departamento = document.getElementById('mg-departamento').value;
    const tipo = document.getElementById('mg-tipo').value;
    if (!nome) return alert('Nome é obrigatório');
    try {
        const url = grupoId ? `${API_URL}/grupos-permissao/${grupoId}` : `${API_URL}/grupos-permissao`;
        const method = grupoId ? 'PUT' : 'POST';
        const res = await fetch(url, {
            method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${currentToken}` },
            body: JSON.stringify({ nome, descricao, departamento, tipo })
        });
        const data = await res.json();
        if (data.error) return alert(data.error);
        document.getElementById('modal-grupo').remove();
        await carregarGruposLista();
        // Se criou novo, selecionar automaticamente
        if (!grupoId && data.id) selecionarGrupo(data.id);
    } catch(e) { alert('Erro ao salvar grupo'); }
};

window.excluirGrupo = async function(id) {
    if (!confirm('Excluir este grupo? Os usuários vinculados serão desassociados.')) return;
    const res = await fetch(`${API_URL}/grupos-permissao/${id}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${currentToken}` }
    });
    const data = await res.json();
    if (data.error) return alert(data.error);
    if (_grupoSelecionadoId === id) {
        _grupoSelecionadoId = null;
        document.getElementById('perm-editor-empty').style.display = 'block';
        document.getElementById('perm-editor-content').style.display = 'none';
    }
    await carregarGruposLista();
};
