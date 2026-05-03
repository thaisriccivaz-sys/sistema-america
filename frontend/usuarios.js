// ============================================================
// MÓDULO: USUÁRIOS E PERMISSÕES
// ============================================================

const TELAS_SISTEMA = [
    // Módulo RH (Ordem exata do menu lateral)
    { modulo: 'RH', pagina_id: 'dashboard',             pagina_nome: 'Dashboard', icone: 'ph-squares-four' },
    { modulo: 'RH', pagina_id: 'colaboradores',          pagina_nome: 'Colaboradores', icone: 'ph-address-book' },
    { modulo: 'RH', pagina_id: 'assinaturas-digitais',   pagina_nome: 'Assinaturas Digitais', icone: 'ph-signature' },
    { modulo: 'RH', pagina_id: 'ferias',                 pagina_nome: 'Férias', icone: 'ph-airplane-tilt' },
    { modulo: 'RH', pagina_id: 'experiencia',            pagina_nome: 'Experiência do Colaborador', icone: 'ph-user-check' },
    { modulo: 'RH', pagina_id: 'admissao',               pagina_nome: 'Admissão', icone: 'ph-list-checks' },
    { modulo: 'RH', pagina_id: 'integracao',             pagina_nome: 'Integração', icone: 'ph-users-three' },
    { modulo: 'RH', pagina_id: 'cargos',                 pagina_nome: 'Cargos', icone: 'ph-briefcase' },
    { modulo: 'RH', pagina_id: 'faculdade',              pagina_nome: 'Faculdade', icone: 'ph-graduation-cap' },
    { modulo: 'RH', pagina_id: 'geradores',              pagina_nome: 'Geradores de Documentos', icone: 'ph-file-text' },
    { modulo: 'RH', pagina_id: 'ficha-epi',              pagina_nome: 'Ficha EPI', icone: 'ph-shield-check' },
    { modulo: 'RH', pagina_id: 'gerenciar-avaliacoes',   pagina_nome: 'Avaliações', icone: 'ph-clipboard-text' },
    { modulo: 'RH', pagina_id: 'dissidio',               pagina_nome: 'Dissídio', icone: 'ph-trend-up' },
    // Módulo Logística
    { modulo: 'Logística', pagina_id: 'logistica-pipeline',     pagina_nome: 'Pipeline OS',   icone: 'ph-kanban' },
    { modulo: 'Logística', pagina_id: 'logistica-rota-redonda', pagina_nome: 'Rota Redonda', icone: 'ph-map-trifold' },
    { modulo: 'Logística', pagina_id: 'logistica-resumo-rota',  pagina_nome: 'Resumo de Rota', icone: 'ph-list-numbers' },
    { modulo: 'Logística', pagina_id: 'logistica-frota',        pagina_nome: 'Frota',         icone: 'ph-truck' },
    { modulo: 'Logística', pagina_id: 'logistica-multas',       pagina_nome: 'Multas',         icone: 'ph-receipt' },
    { modulo: 'Logística', pagina_id: 'logistica-credenciamento', pagina_nome: 'Credenciamento', icone: 'ph-identification-card' },
    { modulo: 'Logística', pagina_id: 'logistica-senhas',         pagina_nome: 'Cofre de Senhas', icone: 'ph-lock-key' },
    { modulo: 'Logística', pagina_id: 'logistica-itinerantes',    pagina_nome: 'Clientes Itinerantes', icone: 'ph-map-pin-line' },
    // Módulo Financeiro
    { modulo: 'Financeiro', pagina_id: 'financeiro-em-breve', pagina_nome: 'Financeiro (Em breve)', icone: 'ph-currency-dollar' },
    // Módulo Comercial
    { modulo: 'Comercial', pagina_id: 'comercial-credenciamento', pagina_nome: 'Solicitar Credencial', icone: 'ph-identification-card' },
    // Módulo Administrativo
    { modulo: 'Administrativo', pagina_id: 'admin-em-breve', pagina_nome: 'Administrativo (Em breve)', icone: 'ph-gear' },
    // Módulo Diretoria / Sistema
    { modulo: 'Diretoria', pagina_id: 'usuarios-permissoes', pagina_nome: 'Usuários e Permissões', icone: 'ph-users-three' },
    { modulo: 'Diretoria', pagina_id: 'chaves',              pagina_nome: 'Chaves', icone: 'ph-key' },
    { modulo: 'Diretoria', pagina_id: 'certificado-digital', pagina_nome: 'Certificado Digital', icone: 'ph-certificate' },
    { modulo: 'Diretoria', pagina_id: 'homologacao',         pagina_nome: 'Homologação', icone: 'ph-database' },
    { modulo: 'Diretoria', pagina_id: 'departamentos',       pagina_nome: 'Departamentos', icone: 'ph-buildings' },
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

        let fotoHtml = u.foto_colaborador 
            ? `<img src="${u.foto_colaborador}" style="width:36px;height:36px;border-radius:50%;object-fit:cover;border:2px solid #e2e8f0;flex-shrink:0;">`
            : `<div style="width:36px;height:36px;border-radius:50%;background:#f1f5f9;display:flex;align-items:center;justify-content:center;color:#94a3b8;font-weight:bold;font-size:1rem;flex-shrink:0;border:2px solid #e2e8f0;"><i class="ph ph-user"></i></div>`;

        return `<tr style="opacity:${u.ativo ? 1 : 0.45};">
            <td><div style="display:flex;align-items:center;gap:12px;">${fotoHtml} <strong>${u.nome || u.username}</strong></div></td>
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
                const isVinculado = _permUsuarios.some(u => u.nome === c.nome_completo && u.ativo === 1);
                return `<option value="${isVinculado ? '' : c.id}" data-nome="${c.nome_completo}" data-email="${c.email || ''}" data-depto="${c.departamento || ''}" ${isVinculado ? 'disabled style="color:#94a3b8;"' : ''}>${c.nome_completo} — ${c.cargo || ''} / ${c.departamento || ''} ${isVinculado ? '(Já possui usuário)' : ''}</option>`;
            }).join('');
            document.getElementById('fu-colab-select').innerHTML = `<option value="">-- Selecione um colaborador --</option>${colabOptions}`;
        } catch(e) { document.getElementById('fu-colab-select').innerHTML = ''; }
    }

    // ── Configurar sub-selects do Modelo de Permissão ──
    const gruposOrdem = ['RH', 'Logística', 'Financeiro', 'Comercial', 'Administrativo', 'Diretoria', 'Todas'];
    const gruposFiltrados = _permGrupos.filter(g =>
        g.tipo !== 'personalizado' &&
        !g.nome.toLowerCase().includes('somente leitura')
    );
    const outrosDepts = [...new Set(gruposFiltrados.map(g => g.departamento))].filter(d => !gruposOrdem.includes(d));
    const allDepts = [...gruposOrdem, ...outrosDepts];

    // Popula sub-select de grupos
    const subGrupoSel = document.getElementById('fu-sub-grupo');
    if (subGrupoSel) {
        subGrupoSel.innerHTML = '<option value="">— Selecione o grupo —</option>';
        allDepts.forEach(d => {
            const firstGroup = gruposFiltrados.find(g => g.departamento === d);
            if (firstGroup) {
                subGrupoSel.appendChild(new Option(d, firstGroup.id));
            }
        });
    }

    // Popula sub-select de usuários
    const subUserSel = document.getElementById('fu-sub-usuario');
    if (subUserSel) {
        subUserSel.innerHTML = '<option value="">— Selecione o usuário base —</option>';
        _permUsuarios.filter(u => u.ativo && u.grupo_permissao_id && u.id !== userId).forEach(u => {
            subUserSel.appendChild(new Option(`${u.nome || u.username}`, u.id));
        });
    }

    // Resetar seletores de nível 1 e 2
    const tipoSel = document.getElementById('fu-tipo-modelo');
    if (tipoSel) tipoSel.value = '';
    if (subGrupoSel) { subGrupoSel.value = ''; subGrupoSel.style.display = 'none'; }
    if (subUserSel)  { subUserSel.value = '';  subUserSel.style.display = 'none'; }

    // Pré-selecionar o grupo atual (se existir) e carregar a árvore correspondente
    window._treeIsModified = false;

    if (user && user.grupo_permissao_id) {
        const userGrp = _permGrupos.find(g => g.id == user.grupo_permissao_id);
        if (userGrp && userGrp.tipo === 'personalizado') {
            // Grupo personalizado → mostra como personalizado
            if (tipoSel) tipoSel.value = 'personalizado';
            await carregarArvorePermissoesUsuario(user.grupo_permissao_id);
        } else {
            // Grupo padrão → mostra selecionado, mas carrega permissoes reais do DB
            if (tipoSel) tipoSel.value = 'grupo';
            if (subGrupoSel) { subGrupoSel.value = user.grupo_permissao_id; subGrupoSel.style.display = 'block'; }
            await carregarArvorePermissoesUsuario(user.grupo_permissao_id);
        }
        // Sempre salva como personalizado - _treeIsModified sempre true
        window._treeIsModified = true;
    } else {
        if (tipoSel) tipoSel.value = 'personalizado';
        _permissoesFormAtivas = {};
        renderArvorePermissoesForm();
        window._treeIsModified = true;
    }
};

// Handler para o select de nível 1
window.onTipoModeloChange = function(tipo) {
    const subGrupoSel = document.getElementById('fu-sub-grupo');
    const subUserSel  = document.getElementById('fu-sub-usuario');
    if (subGrupoSel) { subGrupoSel.style.display = 'none'; subGrupoSel.value = ''; }
    if (subUserSel)  { subUserSel.style.display  = 'none'; subUserSel.value  = ''; }

    if (tipo === 'grupo') {
        if (subGrupoSel) subGrupoSel.style.display = 'block';
        // Aguarda seleção do sub-grupo para aplicar
    } else if (tipo === 'usuario') {
        if (subUserSel) subUserSel.style.display = 'block';
        // Aguarda seleção do usuário para aplicar
    } else if (tipo === 'personalizado') {
        _permissoesFormAtivas = {};
        renderArvorePermissoesForm();
        window._treeIsModified = true;
    }
};

window.aplicarModeloPermissao = function(val) {
    if (!val) return;

    const [tipo, idStr] = val.split('|');
    const id = parseInt(idStr);

    if (tipo === 'grupo') {
        // Encontrar o grupo e seu departamento
        const grupo = _permGrupos.find(g => g.id == id);
        if (!grupo) return;

        // Resetar todas as permissões
        _permissoesFormAtivas = {};

        // Ativar SOMENTE as telas do departamento deste grupo
        const deptMod = MENU_HIERARQUIA.find(m => m.modulo === grupo.departamento);
        if (deptMod) {
            deptMod.grupos.forEach(grp => {
                grp.telas.forEach(telaId => {
                    _permissoesFormAtivas[telaId] = { visualizar: true, alterar: true, incluir: true, excluir: true };
                });
            });
        }

        renderArvorePermissoesForm();
        window._treeIsModified = true; // Grupo e apenas atalho, salva como personalizado
    } else if (tipo === 'user') {
        window.carregarPermissoesCopia(id);
        window._treeIsModified = true;
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
    const modeloTipo    = document.getElementById('fu-tipo-modelo')?.value || '';
    const subGrupoId    = document.getElementById('fu-sub-grupo')?.value || '';
    let modeloSelecionado = '';
    if (modeloTipo === 'grupo' && subGrupoId) modeloSelecionado = `grupo|${subGrupoId}`;

    if (!userId) {
        const colabSel = document.getElementById('fu-colab-select');
        if (colabSel && !colabSel.value) return alert('Selecione um colaborador na lista');
    }
    if (!username) return alert('Username é obrigatório');
    if (!userId && !password) return alert('Senha é obrigatória para novo usuário');

    // Sempre salva as permissoes individualmente (o grupo é apenas atalho para pre-marcar)
    // Isso garante que o que esta visivel na tela eh exatamente o que sera salvo
    permissoesPersonalizadas = TELAS_SISTEMA.map(t => ({
        pagina_id: t.pagina_id,
        pagina_nome: t.pagina_nome,
        modulo: t.modulo,
        ...(_permissoesFormAtivas[t.pagina_id] || { visualizar: false, alterar: false, incluir: false, excluir: false })
    }));
    const ativadas = permissoesPersonalizadas.filter(p => p.visualizar).length;
    console.log(`[SALVAR] Permissoes: ${permissoesPersonalizadas.length} telas, ${ativadas} ativas`);

    // Payload do usuario (grupo_permissao_id sera definido apos criar grupo personalizado)
    const payload = { nome, username, email, departamento };
    if (password) payload.password = password;

    try {
        const userUrl = userId ? `${API_URL}/usuarios/${userId}` : `${API_URL}/usuarios`;
        const resUser = await fetch(userUrl, {
            method: userId ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${currentToken}` },
            body: JSON.stringify(payload)
        });
        if (!resUser.ok) {
            const errText = await resUser.text();
            return alert(`Erro HTTP ${resUser.status} ao salvar usuário: ${errText}`);
        }
        const dataUser = await resUser.json();
        if (dataUser.error) return alert(dataUser.error);
        const targetUserId = userId || dataUser.id;
        console.log(`[SALVAR] Usuário salvo. targetUserId=${targetUserId}`);

        if (permissoesPersonalizadas) {
            // ── Encontrar ou criar o grupo personalizado para este usuário ──
            let gId = null;

            // 1. Verificar se o usuário já tem um grupo personalizado pelo grupo atual
            const usuarioAtual = _permUsuarios.find(u => u.id == targetUserId);
            if (usuarioAtual?.grupo_permissao_id) {
                const grpAtual = _permGrupos.find(g => g.id == usuarioAtual.grupo_permissao_id && g.tipo === 'personalizado');
                if (grpAtual) { gId = grpAtual.id; console.log(`[SALVAR] Reusando grupo personalizado id=${gId}`); }
            }

            // 2. Buscar por nome (caso criado em tentativa anterior)
            if (!gId) {
                const existente = _permGrupos.find(g => g.nome === `Personalizado (${username})` && g.tipo === 'personalizado');
                if (existente) { gId = existente.id; console.log(`[SALVAR] Grupo personalizado encontrado por nome id=${gId}`); }
            }

            // 3. Criar novo grupo personalizado
            if (!gId) {
                console.log(`[SALVAR] Criando grupo personalizado para ${username}...`);
                const gRes = await fetch(`${API_URL}/grupos-permissao`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${currentToken}` },
                    body: JSON.stringify({ nome: `Personalizado (${username})`, tipo: 'personalizado', departamento: departamento || 'Todas' })
                });
                const gData = await gRes.json();
                if (gData.id) {
                    gId = gData.id;
                    console.log(`[SALVAR] Grupo criado com id=${gId}`);
                } else {
                    // Provavelmente já existe (UNIQUE constraint) — recarregar e buscar
                    console.warn('[SALVAR] Falha ao criar grupo, buscando pelo nome...');
                    await carregarGruposLista();
                    const recheck = _permGrupos.find(g => g.nome === `Personalizado (${username})`);
                    if (recheck) { gId = recheck.id; console.log(`[SALVAR] Grupo encontrado após reload id=${gId}`); }
                }
            }

            if (!gId) {
                return alert('Erro: não foi possível criar ou encontrar o grupo personalizado. Tente novamente.');
            }

            // 4. Vincular usuário ao grupo personalizado
            await fetch(`${API_URL}/usuarios/${targetUserId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${currentToken}` },
                body: JSON.stringify({ grupo_permissao_id: gId })
            });
            console.log(`[SALVAR] Usuário ${targetUserId} vinculado ao grupo ${gId}`);

            // 5. Salvar as permissões no grupo
            const permsRes = await fetch(`${API_URL}/grupos-permissao/${gId}/permissoes`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${currentToken}` },
                body: JSON.stringify({ permissoes: permissoesPersonalizadas })
            });
            if (!permsRes.ok) {
                const errText = await permsRes.text();
                return alert(`Erro HTTP ${permsRes.status} ao salvar permissões: ${errText}`);
            }
            const permsData = await permsRes.json();
            console.log(`[SALVAR] Permissões salvas:`, permsData);
            if (permsData.error) return alert('Erro ao salvar permissões: ' + permsData.error);
        }

        // Sucesso!
        navigateTo('usuarios-permissoes');
        await carregarUsuariosLista();
        await carregarGruposLista();

    } catch(e) {
        console.error('[SALVAR] Exceção:', e);
        alert('Erro ao salvar usuário: ' + e.message);
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
        modulo: 'RH', icone: 'ph-users', cor: '#d63384',
        grupos: [
            {
                titulo: 'Telas',
                telas: [
                    'dashboard', 'colaboradores', 'assinaturas-digitais', 'ferias', 'experiencia',
                    'admissao', 'integracao', 'cargos', 'faculdade', 'geradores',
                    'ficha-epi', 'gerenciar-avaliacoes', 'dissidio'
                ]
            }
        ]
    },
    {
        modulo: 'Logística', icone: 'ph-truck', cor: '#2b8a3e',
        grupos: [{ titulo: 'Telas', telas: ['logistica-pipeline', 'logistica-rota-redonda', 'logistica-resumo-rota', 'logistica-frota', 'logistica-multas', 'logistica-credenciamento', 'logistica-senhas', 'logistica-itinerantes'] }]
    },
    {
        modulo: 'Financeiro', icone: 'ph-currency-dollar', cor: '#1864ab',
        grupos: [{ titulo: 'Telas', telas: ['financeiro-em-breve'] }]
    },
    {
        modulo: 'Comercial', icone: 'ph-handshake', cor: '#5f3dc4',
        grupos: [{ titulo: 'Telas', telas: ['comercial-credenciamento'] }]
    },
    {
        modulo: 'Administrativo', icone: 'ph-gear', cor: '#e8590c',
        grupos: [{ titulo: 'Telas', telas: ['admin-em-breve'] }]
    },
    {
        modulo: 'Diretoria', icone: 'ph-crown', cor: '#c92a2a',
        grupos: [
            {
                titulo: 'Telas',
                telas: ['usuarios-permissoes', 'chaves', 'certificado-digital', 'homologacao', 'departamentos']
            }
        ]
    }
];

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
                <i class="ph ${mod.icone}" style="font-size:1.1rem;color:${mod.cor || '#64748b'};"></i>
                <h4 style="margin:0;font-size:1rem;color:${mod.cor || '#1e293b'};">Módulo: ${mod.modulo}</h4>
                <i class="ph ph-caret-down" style="margin-left:auto;color:#94a3b8;"></i>
            </div>
            <div style="display:none;padding:1rem;background:#fff;">`;
            
        mod.grupos.forEach(grp => {
            const tituloHTML = grp.titulo && grp.titulo !== 'Telas'
                ? '<h5 style="margin:0 0 0.75rem 0;font-size:0.8rem;color:#d9480f;text-transform:uppercase;letter-spacing:0.05em;border-bottom:1px solid #f1f5f9;padding-bottom:0.25rem;">' + grp.titulo + '</h5>'
                : '';
            html += '<div style="margin-bottom:1rem;">' + tituloHTML + '<div style="display:grid;grid-template-columns:1fr;gap:0.5rem;">';
                    
            grp.telas.forEach(telaId => {
                const telaInfo = TELAS_SISTEMA.find(t => t.pagina_id === telaId);
                const nomeTela = telaInfo ? telaInfo.pagina_nome : telaId;
                const p = _permissoesFormAtivas[telaId] || { visualizar:false, alterar:false, incluir:false, excluir:false };
                
                html += `
                        <div style="display:flex;align-items:center;justify-content:space-between;padding:0.4rem 0.75rem;background:#f8fafc;border-radius:6px;border:1px solid #f1f5f9;">
                            <span style="font-size:0.85rem;font-weight:600;color:#334155;display:flex;align-items:center;gap:6px;">
                                <i class="ph ${telaInfo && telaInfo.icone ? telaInfo.icone : 'ph-app-window'}" style="font-size:1.1rem;color:#f37021;"></i> ${nomeTela}
                            </span>
                            <div style="display:flex;gap:1.5rem;">
                                <label style="display:flex;align-items:center;gap:4px;font-size:0.75rem;cursor:pointer;color:#1971c2;font-weight:600;">
                                    <input type="checkbox" onchange="togglePermForm('${telaId}', this.checked)" ${p.visualizar?'checked':''} style="accent-color:#1971c2;"> Acesso Liberado
                                </label>
                            </div>
                        </div>`;
            });
            html += '</div></div>';
        });
        html += `</div></div>`;
    });
    container.innerHTML = html;
}

window.togglePermForm = function(paginaId, val) {
    if (!_permissoesFormAtivas[paginaId]) _permissoesFormAtivas[paginaId] = { visualizar:false, alterar:false, incluir:false, excluir:false };
    _permissoesFormAtivas[paginaId] = { visualizar: val, alterar: val, incluir: val, excluir: val };
    window._treeIsModified = true; // ← CRÍTICO: marcar que a árvore foi editada manualmente
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
