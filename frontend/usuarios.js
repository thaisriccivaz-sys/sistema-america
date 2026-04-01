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
    { modulo: 'Logística', pagina_id: 'logistica-em-breve', pagina_nome: 'Módulo Logística' },
    { modulo: 'Financeiro', pagina_id: 'financeiro-em-breve', pagina_nome: 'Módulo Financeiro' },
    { modulo: 'Comercial', pagina_id: 'comercial-em-breve', pagina_nome: 'Módulo Comercial' },
    { modulo: 'Administrativo', pagina_id: 'admin-em-breve', pagina_nome: 'Módulo Administrativo' },
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
    
    const filtro = document.getElementById('filtro-status-usuarios') ? document.getElementById('filtro-status-usuarios').value : 'todos';
    const filtroNome = document.getElementById('filtro-nome-usuarios') ? document.getElementById('filtro-nome-usuarios').value.toLowerCase().trim() : '';
    let docs = _permUsuarios;
    if (filtro === 'ativos') docs = docs.filter(u => u.ativo);
    if (filtro === 'inativos') docs = docs.filter(u => !u.ativo);
    if (filtroNome) docs = docs.filter(u => (u.nome && u.nome.toLowerCase().includes(filtroNome)) || (u.username && u.username.toLowerCase().includes(filtroNome)));

    if (!docs.length) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#94a3b8;padding:2rem;">Nenhum usuário encontrado</td></tr>';
        return;
    }
    tbody.innerHTML = docs.map(u => {
        let exibirGrupo = u.grupo_nome ? u.grupo_nome : null;
        if (exibirGrupo && exibirGrupo.startsWith('Personalizado')) exibirGrupo = 'Personalizado';

        return `<tr style="opacity:${u.ativo ? 1 : 0.45};">
            <td><strong>${u.nome || u.username}</strong></td>
            <td><code>${u.username}</code></td>
            <td>${u.departamento || '-'}</td>
            <td>
                ${exibirGrupo
                    ? `<span style="background:#fff3ed;color:#d9480f;padding:2px 8px;border-radius:10px;font-size:0.8rem;font-weight:600;">${exibirGrupo}</span>`
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
                    style="background:${u.ativo ? '#f8d7da' : '#d4edda'};color:${u.ativo ? '#721c24' : '#155724'};" title="${u.ativo ? 'Excluir / Inativar' : 'Reativar'}">
                    <i class="ph ph-${u.ativo ? 'trash' : 'play-circle'}"></i>
                </button>
            </td>
        </tr>`;
    }).join('');
}

// ── FORMULÁRIO DE USUÁRIO (TELA CHEIA) ─────────────────────────

window.abrirFormUsuario = async function(userId = null) {
    const user = userId ? _permUsuarios.find(u => u.id === userId) : null;
    
    // Configurar layout
    document.getElementById('fu-title').innerHTML = user ? `Editar Usuário: <span style="color:#1e293b;">${user.nome || user.username}</span>` : 'Novo Usuário do Sistema';
    document.getElementById('fu-id').value = userId || '';
    
    // Limpar / Preencher campos de credencial
    document.getElementById('fu-username').value = user ? user.username : '';
    document.getElementById('fu-password').value = '';
    document.getElementById('fu-senha-desc').style.display = user ? 'inline' : 'none';
    if(user) {
        document.getElementById('fu-senha-desc').textContent = '(Deixe em branco para não alterar)';
        document.getElementById('fu-username').readOnly = true;
        document.getElementById('fu-username').style.backgroundColor = '#f1f5f9';
    } else {
        document.getElementById('fu-senha-desc').textContent = '(Obrigatória para novos)';
        document.getElementById('fu-username').readOnly = false;
        document.getElementById('fu-username').style.backgroundColor = '#fff';
    }

    // Ocultar card de seleção de colaborador se for edição, pois o nome já foi definido
    document.getElementById('fu-card-colab').style.display = user ? 'none' : 'block';
    
    // Antigo input-search foi removido, então protegemos se não existir
    const searchInp = document.getElementById('fu-colab-search');
    if (searchInp) searchInp.value = '';
    
    document.getElementById('fu-nome').value = user ? (user.nome || '') : '';
    document.getElementById('fu-email').value = user ? (user.email || '') : '';
    document.getElementById('fu-departamento').value = user ? (user.departamento || '') : '';

    // Buscar Colaboradores apenas se for Novo
    if (!userId) {
        try {
            const res = await fetch(`${API_URL}/colaboradores`, { headers: { Authorization: `Bearer ${currentToken}` } });
            const all = await res.json();
            const ativos = all.filter(c => c.status !== 'Desligado');
            
            const colabOptions = ativos.map(c => {
                const isVinculado = _permUsuarios.some(u => u.nome === c.nome_completo);
                return `<option value="${isVinculado ? '' : c.id}" data-nome="${c.nome_completo}" data-email="${c.email || ''}" data-depto="${c.departamento || ''}" ${isVinculado ? 'disabled style="color:#94a3b8;"' : ''}>${c.nome_completo} — ${c.cargo || ''} / ${c.departamento || ''} ${isVinculado ? '(Já possui usuário)' : ''}</option>`;
            }).join('');
            document.getElementById('fu-colab-select').innerHTML = `<option value="">-- Selecione um colaborador --</option>${colabOptions}`;
        } catch(e) { document.getElementById('fu-colab-select').innerHTML = ''; }
    }

    // Configurar Modelo Único de Permissão
    const df = document.createDocumentFragment();
    df.appendChild(new Option('-- Selecione um Modelo Inicial --', ''));

    const gruposOrdem = ['RH', 'Logística', 'Financeiro', 'Comercial', 'Administrativo', 'Diretoria', 'Todas'];
    const gruposFiltrados = _permGrupos.filter(g => g.tipo !== 'personalizado');
    const outrosDepts = [...new Set(gruposFiltrados.map(g => g.departamento))].filter(d => !gruposOrdem.includes(d));
    const allDepts = [...gruposOrdem, ...outrosDepts];
    
    const grpFg = document.createElement('optgroup');
    grpFg.label = 'Grupos Padrão / Departamentos';
    allDepts.forEach(d => {
        gruposFiltrados.filter(g => g.departamento === d).forEach(g => {
            grpFg.appendChild(new Option(`[Grupo] ${g.nome}`, `grupo|${g.id}`));
        });
    });
    df.appendChild(grpFg);

    const usrFg = document.createElement('optgroup');
    usrFg.label = 'Copiar de Usuário Existente';
    _permUsuarios.filter(u => u.ativo && u.grupo_permissao_id && u.id !== userId).forEach(u => {
        usrFg.appendChild(new Option(`[Usuário] ${u.nome || u.username} (${u.grupo_nome || 'sem grupo'})`, `user|${u.id}`));
    });
    df.appendChild(usrFg);

    const blankFg = document.createElement('optgroup');
    blankFg.label = 'Outras Opções';
    blankFg.appendChild(new Option('Em Branco (Configurar manualmente do zero)', 'blank'));
    df.appendChild(blankFg);

    const selectMod = document.getElementById('fu-modelo-perm');
    if (selectMod) {
        selectMod.innerHTML = '';
        selectMod.appendChild(df);
    }

    // Pré-selecionar o grupo atual (se existir) e carregar a árvore correspondente
    window._treeIsModified = false;
    
    if (user && user.grupo_permissao_id) {
        const userGrp = _permGrupos.find(g => g.id == user.grupo_permissao_id);
        if (userGrp && userGrp.tipo === 'personalizado') {
            if (selectMod) selectMod.value = ''; // Personalizado não tem modelo correspondente no select
            await carregarArvorePermissoesUsuario(user.grupo_permissao_id);
            window._treeIsModified = true; // Força salvar como personalizado
        } else {
            if (selectMod) selectMod.value = `grupo|${user.grupo_permissao_id}`;
            await carregarArvorePermissoesUsuario(user.grupo_permissao_id);
            window._treeIsModified = false;
        }
    } else {
        if (selectMod) selectMod.value = 'blank';
        _permissoesFormAtivas = {};
        renderArvorePermissoesForm();
        window._treeIsModified = true;
    }
};

window.aplicarModeloPermissao = async function(val) {
    if (!val || val === 'blank') {
        _permissoesFormAtivas = {};
        renderArvorePermissoesForm();
        window._treeIsModified = true;
        return;
    }
    const [tipo, idStr] = val.split('|');
    const id = parseInt(idStr);
    
    if (tipo === 'grupo') {
        await carregarArvorePermissoesUsuario(id);
        window._treeIsModified = false; // Se ele não tocar em nada, enviamos só o grupo
    } else if (tipo === 'user') {
        await carregarPermissoesCopia(id);
        window._treeIsModified = true; // Geração de cópias sempre vira Personalizado por default se salvar direto
    }
};

window.carregarPermissoesCopia = async function(uid) {
    if (!uid) {
        _permissoesFormAtivas = {};
        renderArvorePermissoesForm();
        return;
    }
    const user = _permUsuarios.find(u => u.id == uid);
    if (!user || !user.grupo_permissao_id) {
        _permissoesFormAtivas = {};
        renderArvorePermissoesForm();
        return;
    }
    try {
        const res = await fetch(`${API_URL}/grupos-permissao/${user.grupo_permissao_id}/permissoes`, { headers: { Authorization: `Bearer ${currentToken}` }});
        const permsExistentes = await res.json();
        _permissoesFormAtivas = {};
        permsExistentes.forEach(p => {
            _permissoesFormAtivas[p.pagina_id] = { visualizar: !!p.visualizar, alterar: !!p.alterar, incluir: !!p.incluir, excluir: !!p.excluir };
        });
        renderArvorePermissoesForm();
    } catch(e) { console.error('Erro ao copiar permissões', e); }
};

window.filtrarColabsForm = function(query) {
    const sel = document.getElementById('fu-colab-select');
    if (!sel) return;
    const q = query.toLowerCase();
    Array.from(sel.options).forEach(opt => {
        if (!opt.value) return;
        opt.style.display = opt.text.toLowerCase().includes(q) ? '' : 'none';
    });
};

window.preencherDadosColabForm = function(sel) {
    const opt = sel.options[sel.selectedIndex];
    if (!opt || !opt.value) return;
    document.getElementById('fu-nome').value = opt.dataset.nome || '';
    document.getElementById('fu-email').value = opt.dataset.email || '';
    document.getElementById('fu-departamento').value = opt.dataset.depto || '';
    
    // Sugerir username
    const usernameField = document.getElementById('fu-username');
    if (usernameField && !usernameField.value && opt.dataset.nome) {
        usernameField.value = opt.dataset.nome.toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .split(' ').filter(Boolean).slice(0, 2).join('.');
    }
};

window.editarUsuario = function(id) {
    window._editarUserId = id;
    navigateTo('form-usuario');
};

window.salvarUsuarioView = async function() {
    const userId = document.getElementById('fu-id').value;
    const nome = document.getElementById('fu-nome').value.trim();
    const username = document.getElementById('fu-username').value.trim();
    const password = document.getElementById('fu-password').value;
    const email = document.getElementById('fu-email').value.trim();
    const departamento = document.getElementById('fu-departamento').value.trim();
    const modeloSelecionado = document.getElementById('fu-modelo-perm') ? document.getElementById('fu-modelo-perm').value : '';

    if (!userId) {
        const colabSel = document.getElementById('fu-colab-select');
        if (colabSel && !colabSel.value) return alert('Selecione um colaborador na lista');
    }
    if (!username) return alert('Username é obrigatório');
    if (!userId && !password) return alert('Senha é obrigatória para novo usuário');

    let grupo_permissao_id = null;
    let permissoesConfiguradas = null;

    if (!window._treeIsModified && modeloSelecionado && modeloSelecionado.startsWith('grupo|')) {
        grupo_permissao_id = parseInt(modeloSelecionado.split('|')[1]);
    } else {
        // Árvore foi modificada, ou foi gerada de cópia/em branco
        const perms = Object.keys(_permissoesFormAtivas).map(pagina_id => {
            const tela = TELAS_SISTEMA.find(t => t.pagina_id === pagina_id) || {};
            return {
                pagina_id,
                pagina_nome: tela.pagina_nome || pagina_id,
                modulo: tela.modulo || 'RH',
                ..._permissoesFormAtivas[pagina_id]
            };
        });
        permissoesConfiguradas = { personalizadas: perms };
    }

    const payload = { nome, username, email, departamento, grupo_permissao_id };
    if (password) payload.password = password;
    if (permissoesConfiguradas) payload.nova_config_permissoes = permissoesConfiguradas;

    try {
        // Salva o usuário primeiro (ou pega id se novo)
        const userUrl = userId ? `${API_URL}/usuarios/${userId}` : `${API_URL}/usuarios`;
        const resUser = await fetch(userUrl, {
            method: userId ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${currentToken}` },
            body: JSON.stringify(payload)
        });
        const dataUser = await resUser.json();
        if (dataUser.error) return alert(dataUser.error);

        const targetUserId = userId || dataUser.id;

        // Se precisava criar grupo personalizado, a API de usuarios pode não tratar isso diretamente.
        // Já que a lógica era o backend lidar ou chamamos a rota em sequencia:
        if (permissoesConfiguradas) {
            let gId = userId && _grupoSelecionadoId && _permGrupos.find(g => g.id == _grupoSelecionadoId && g.tipo === 'personalizado') 
                      ? _grupoSelecionadoId : null;
            
            // Se não tinha um grupo personalizado, cria um
            if (!gId) {
                const gRes = await fetch(`${API_URL}/grupos-permissao`, {
                    method:'POST', headers:{'Content-Type':'application/json', Authorization:`Bearer ${currentToken}`},
                    body: JSON.stringify({ nome: `Personalizado (${username})`, tipo: 'personalizado' })
                });
                const gData = await gRes.json();
                gId = gData.id;
                await fetch(`${API_URL}/usuarios/${targetUserId}`, {
                    method:'PUT', headers:{'Content-Type':'application/json', Authorization:`Bearer ${currentToken}`},
                    body: JSON.stringify({ grupo_permissao_id: gId })
                });
            }
            // Salva as perms no grupo
            await fetch(`${API_URL}/grupos-permissao/${gId}/permissoes`, {
                method:'PUT', headers:{'Content-Type':'application/json', Authorization:`Bearer ${currentToken}`},
                body: JSON.stringify({ permissoes: permissoesConfiguradas.personalizadas })
            });
        }

        navigateTo('usuarios-permissoes');
        await carregarUsuariosLista();
        await carregarGruposLista();
        // Feedback visual silencioso ou sem alert conforme solicitado

    } catch(e) { 
        console.error(e);
        alert('Erro ao salvar usuário e permissões'); 
    }
};

window.toggleAtivoUsuario = async function(id, ativoAtual) {
    const acao = ativoAtual ? 'excluir' : 'reativar';
    if (!confirm(`Deseja ${acao} este usuário?`)) return;
    await fetch(`${API_URL}/usuarios/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${currentToken}` },
        body: JSON.stringify({ ativo: ativoAtual ? 0 : 1 })
    });
    await carregarUsuariosLista();
};

// ── ÁRVORE DE PERMISSÕES NO FORMULÁRIO ───────────────────────
let _permissoesFormAtivas = {}; 

const MENU_HIERARQUIA = [
    {
        modulo: 'RH', icone: 'ph-users',
        grupos: [
            { titulo: 'Visão Geral e Administrativo', telas: ['dashboard', 'colaboradores', 'admissao', 'cargos', 'departamentos', 'faculdade', 'chaves'] },
            { titulo: 'Prontuário Digital', telas: ['prontuario-checklist', 'prontuario-ficha', 'prontuario-pagamentos', 'prontuario-aso'] },
            { titulo: 'Segurança (EPI)', telas: ['ficha-epi'] },
            { titulo: 'Avaliações de Desempenho', telas: ['gerenciar-avaliacoes', 'avaliacoes'] },
            { titulo: 'Gestão de Documentos', telas: ['geradores'] }
        ]
    },
    {
        modulo: 'Diretoria', icone: 'ph-crown',
        grupos: [
            { titulo: 'Cadastros Base', telas: ['usuarios-permissoes'] }
        ]
    },
    {
        modulo: 'Logística', icone: 'ph-truck',
        grupos: [
            { titulo: 'Visão Geral (Em breve)', telas: ['logistica-em-breve'] }
        ]
    },
    {
        modulo: 'Financeiro', icone: 'ph-currency-dollar',
        grupos: [
            { titulo: 'Visão Geral (Em breve)', telas: ['financeiro-em-breve'] }
        ]
    },
    {
        modulo: 'Comercial', icone: 'ph-handshake',
        grupos: [
            { titulo: 'Visão Geral (Em breve)', telas: ['comercial-em-breve'] }
        ]
    },
    {
        modulo: 'Administrativo', icone: 'ph-gear',
        grupos: [
            { titulo: 'Visão Geral (Em breve)', telas: ['admin-em-breve'] }
        ]
    }
];

// Oculta no objeto global TELAS_SISTEMA as telas extras para que fiquem ativaveis
if (!TELAS_SISTEMA.find(t => t.pagina_id === 'prontuario-checklist')) {
    TELAS_SISTEMA.push(
        { modulo: 'RH', pagina_id: 'prontuario-checklist', pagina_nome: 'Prontuário - CheckList' },
        { modulo: 'RH', pagina_id: 'prontuario-ficha', pagina_nome: 'Prontuário - Ficha Cadastral' },
        { modulo: 'RH', pagina_id: 'prontuario-pagamentos', pagina_nome: 'Prontuário - Pagamentos' },
        { modulo: 'RH', pagina_id: 'prontuario-aso', pagina_nome: 'Prontuário - ASO' },
        { modulo: 'RH', pagina_id: 'avaliacoes', pagina_nome: 'Responder Avaliação (Colab)' }
    );
}

async function carregarArvorePermissoesUsuario(grupoId) {
    _permissoesFormAtivas = {};
    if (grupoId) {
        const res = await fetch(`${API_URL}/grupos-permissao/${grupoId}/permissoes`, { headers: { Authorization: `Bearer ${currentToken}` }});
        const permsExistentes = await res.json();
        permsExistentes.forEach(p => {
            _permissoesFormAtivas[p.pagina_id] = { visualizar: !!p.visualizar, alterar: !!p.alterar, incluir: !!p.incluir, excluir: !!p.excluir };
        });
    }
    renderArvorePermissoesForm();
}

function renderArvorePermissoesForm() {
    const container = document.getElementById('fu-perm-tree');
    if (!container) return;
    
    let html = '';
    MENU_HIERARQUIA.forEach(mod => {
        html += `
        <div class="perm-mod" style="border-bottom:3px solid #e2e8f0;">
            <div style="background:#f8fafc;padding:0.6rem 1rem;cursor:pointer;display:flex;align-items:center;gap:0.5rem;" onclick="this.nextElementSibling.style.display = this.nextElementSibling.style.display === 'none' ? 'block' : 'none'">
                <i class="ph ${mod.icone}" style="font-size:1.1rem;color:#64748b;"></i>
                <h4 style="margin:0;font-size:1rem;color:#1e293b;">Módulo: ${mod.modulo}</h4>
                <i class="ph ph-caret-down" style="margin-left:auto;color:#94a3b8;"></i>
            </div>
            <div style="display:none;padding:1rem;background:#fff;">`;
            
        mod.grupos.forEach(grp => {
            html += `
                <div style="margin-bottom:1.5rem;">
                    <h5 style="margin:0 0 0.5rem 0;font-size:0.85rem;color:#d9480f;text-transform:uppercase;letter-spacing:0.05em;border-bottom:1px solid #f1f5f9;padding-bottom:0.25rem;">
                        ${grp.titulo}
                    </h5>
                    <div style="display:grid;grid-template-columns:1fr;gap:0.5rem;">`;
                    
            grp.telas.forEach(telaId => {
                const telaInfo = TELAS_SISTEMA.find(t => t.pagina_id === telaId);
                const nomeTela = telaInfo ? telaInfo.pagina_nome : telaId;
                const p = _permissoesFormAtivas[telaId] || { visualizar:false, alterar:false, incluir:false, excluir:false };
                
                html += `
                        <div style="display:flex;align-items:center;justify-content:space-between;padding:0.4rem 0.75rem;background:#f8fafc;border-radius:6px;border:1px solid #f1f5f9;">
                            <span style="font-size:0.85rem;font-weight:600;color:#334155;">&bull; ${nomeTela}</span>
                            <div style="display:flex;gap:1.5rem;">
                                <label style="display:flex;align-items:center;gap:4px;font-size:0.75rem;cursor:pointer;color:#1971c2;font-weight:600;">
                                    <input type="checkbox" onchange="togglePermForm('${telaId}', this.checked)" ${p.visualizar?'checked':''} style="accent-color:#1971c2;"> Acesso Liberado
                                </label>
                            </div>
                        </div>`;
            });
            html += `</div></div>`;
        });
        html += `</div></div>`;
    });
    container.innerHTML = html;
}

window.togglePermForm = function(paginaId, val) {
    if (!_permissoesFormAtivas[paginaId]) _permissoesFormAtivas[paginaId] = { visualizar:false, alterar:false, incluir:false, excluir:false };
    _permissoesFormAtivas[paginaId] = { visualizar: val, alterar: val, incluir: val, excluir: val };
};

window.setTodasTelasForm = function(marcar) {
    TELAS_SISTEMA.forEach(t => {
        _permissoesFormAtivas[t.pagina_id] = { visualizar: marcar, alterar: marcar, incluir: marcar, excluir: marcar };
    });
    document.querySelectorAll('#fu-perm-tree input[type="checkbox"]').forEach(cb => cb.checked = marcar);
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

    tbody.innerHTML = telas.map(t => {
        const perm = _permissoesAtivas[t.pagina_id] || {};
        const chk = (tipo, cor) => `
            <td style="text-align:center;">
                <input type="checkbox" data-pagina="${t.pagina_id}" data-tipo="${tipo}"
                    ${perm[tipo] ? 'checked' : ''}
                    onchange="togglePermissao('${t.pagina_id}', '${tipo}', this.checked)"
                    style="width:18px;height:18px;accent-color:${cor};cursor:pointer;">
            </td>`;
        return `<tr>
            <td style="color:#64748b;font-size:0.8rem;">${t.modulo}</td>
            <td style="font-weight:500;">${t.pagina_nome}</td>
            ${chk('visualizar', '#1971c2')}
            ${chk('alterar',    '#2d9e5f')}
            ${chk('incluir',    '#e67700')}
            ${chk('excluir',    '#dc3545')}
        </tr>`;
    }).join('');
};

window.togglePermissao = function(paginaId, tipo, val) {
    if (!_permissoesAtivas[paginaId]) _permissoesAtivas[paginaId] = {};
    _permissoesAtivas[paginaId][tipo] = val;
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
    if (!_grupoSelecionadoId) {
        alert('ERRO: Nenhum grupo selecionado (_grupoSelecionadoId é null). Selecione um grupo primeiro.');
        return;
    }
    const permissoes = TELAS_SISTEMA.map(t => ({
        pagina_id: t.pagina_id,
        pagina_nome: t.pagina_nome,
        modulo: t.modulo,
        ..._permissoesAtivas[t.pagina_id] || { visualizar: 0, alterar: 0, incluir: 0, excluir: 0 }
    }));
    const ativadas = permissoes.filter(p => p.visualizar).length;
    console.log(`[SALVAR PERMISSÕES] grupoId=${_grupoSelecionadoId}, total=${permissoes.length}, ativadas=${ativadas}`);
    try {
        const res = await fetch(`${API_URL}/grupos-permissao/${_grupoSelecionadoId}/permissoes`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${currentToken}` },
            body: JSON.stringify({ permissoes })
        });
        console.log(`[SALVAR PERMISSÕES] HTTP status: ${res.status}`);
        if (!res.ok) {
            const errText = await res.text();
            return alert(`ERRO HTTP ${res.status} ao salvar permissões:\n${errText}`);
        }
        const data = await res.json();
        console.log('[SALVAR PERMISSÕES] Resposta servidor:', data);
        if (data.error) return alert('Erro do servidor: ' + data.error);

        // Após salvar, recarregar do banco para confirmar visualmente
        const resVerify = await fetch(`${API_URL}/grupos-permissao/${_grupoSelecionadoId}/permissoes`, {
            headers: { Authorization: `Bearer ${currentToken}` }
        });
        const salvoNoBanco = await resVerify.json();
        const ativadasNoBanco = (salvoNoBanco || []).filter(p => p.visualizar).length;
        console.log(`[VERIFICAR] Registros no banco: ${salvoNoBanco.length}, com visualizar=1: ${ativadasNoBanco}`);

        // Recarregar o editor para mostrar o que realmente está salvo
        await selecionarGrupo(_grupoSelecionadoId);

        // Feedback visual
        const btn = document.querySelector('[onclick="salvarPermissoes()"]');
        if (btn) {
            btn.innerHTML = `<i class="ph ph-check-circle"></i> Salvo! (${ativadasNoBanco} ativos)`;
            btn.style.background = '#2d9e5f';
            setTimeout(() => {
                btn.innerHTML = '<i class="ph ph-floppy-disk"></i> Salvar';
                btn.style.background = '';
            }, 3000);
        }
    } catch(e) {
        console.error('[SALVAR PERMISSÕES] Erro:', e);
        alert('Erro de conexão ao salvar permissões: ' + e.message);
    }
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
