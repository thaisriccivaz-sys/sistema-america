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
    
    const savedToken = localStorage.getItem('erp_token');
    const savedUser = localStorage.getItem('erp_user');
    
    if (savedToken && savedUser) {
        currentToken = savedToken;
        currentUser = JSON.parse(savedUser);
        
        const nameEl = document.getElementById('logged-user-name');
        if (nameEl) nameEl.textContent = currentUser.username;

        carregarFotoUsuarioTopbar();

        const appShell = document.getElementById('app-shell');
        if (appShell) {
            if (typeof window.carregarPermissoesOnline === 'function') {
                window.carregarPermissoesOnline().then(() => {
                    showView('app-shell');
                    navigateTo('dashboard');
                });
            } else {
                showView('app-shell');
                navigateTo('dashboard');
            }
        } else {
            console.warn('O elemento app-shell não foi encontrado. Interface antiga detectada ou HTML incompleto.');
            const formSection = document.querySelector('.form-section');
            if (formSection) formSection.style.display = 'block';
        }
    } else {
        showView('view-login');
    }
});

// ── LEMBRAR USUÁRIO: preencher campos se houver dados salvos ──
(function() {
    const saved = localStorage.getItem('erp_remember');
    if (saved) {
        try {
            const { username, password } = JSON.parse(saved);
            const u = document.getElementById('login-user');
            const p = document.getElementById('login-pass');
            const c = document.getElementById('login-remember');
            if (u) u.value = username || '';
            if (p) p.value = password || '';
            if (c) c.checked = true;
        } catch(e) {}
    }
})();

const formLogin = document.getElementById('form-login');
if (formLogin) {
    formLogin.addEventListener('submit', async (e) => {
        e.preventDefault();
        const usernameInp = document.getElementById('login-user').value.trim();
        const passwordInp = document.getElementById('login-pass').value;
        const rememberMe  = document.getElementById('login-remember')?.checked;
        const errorMsg = document.getElementById('login-error');
        if (errorMsg) errorMsg.textContent = '';

        // Salvar ou remover credenciais
        if (rememberMe) {
            localStorage.setItem('erp_remember', JSON.stringify({ username: usernameInp, password: passwordInp }));
        } else {
            localStorage.removeItem('erp_remember');
        }
        
        const btnSubmit = formLogin.querySelector('button[type="submit"]');
        const oldText = btnSubmit.innerHTML;
        btnSubmit.innerHTML = 'Entrando...';
        btnSubmit.disabled = true;

        try {
            const res = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: usernameInp, password: passwordInp })
            });
            const data = await res.json();

            if (!res.ok) throw new Error(data.error || 'Erro no login');

            currentToken = data.token;
            currentUser = data.user;
            
            localStorage.setItem('erp_token', currentToken);
            localStorage.setItem('erp_user', JSON.stringify(currentUser));
            
            const nameEl = document.getElementById('logged-user-name');
            if (nameEl) nameEl.textContent = currentUser.username;

            carregarFotoUsuarioTopbar();

            // Carrega permissões se existir função global
            if (typeof window.carregarPermissoesOnline === 'function') {
                await window.carregarPermissoesOnline();
            }

            showView('app-shell');
            navigateTo('dashboard');
        } catch (err) {
            if (errorMsg) errorMsg.textContent = err.message;
            else alert(err.message);
        } finally {
            btnSubmit.innerHTML = oldText;
            btnSubmit.disabled = false;
        }
    });
}

const btnLogout = document.getElementById('btn-logout');
if (btnLogout) {
    btnLogout.addEventListener('click', (e) => {
        e.preventDefault();
        currentUser = null;
        currentToken = null;
        localStorage.removeItem('erp_token');
        localStorage.removeItem('erp_user');
        window.location.reload();
    });
}

// --- CARREGAMENTO DE FOTO DO USUARIO NO TOPBAR ---
async function carregarFotoUsuarioTopbar() {
    if (!currentUser) return;
    const imgEl = document.getElementById('user-avatar-img');
    const iconEl = document.getElementById('user-avatar-icon');
    if (!imgEl || !iconEl) return;

    try {
        // Busca lista de usuarios para encontrar colaborador vinculado pelo nome
        const resUsuarios = await fetch(`${API_URL}/usuarios`, {
            headers: { Authorization: `Bearer ${currentToken}` }
        });
        if (!resUsuarios.ok) return;
        const usuarios = await resUsuarios.json();
        const usuarioAtual = usuarios.find(u => u.username === currentUser.username);
        
        if (!usuarioAtual || !usuarioAtual.nome) return;
        
        // Busca colaboradores para encontrar o que tem o mesmo nome
        const resColabs = await fetch(`${API_URL}/colaboradores`, {
            headers: { Authorization: `Bearer ${currentToken}` }
        });
        if (!resColabs.ok) return;
        const colaboradores = await resColabs.json();
        const colaborador = colaboradores.find(c => 
            c.nome_completo && usuarioAtual.nome && 
            c.nome_completo.toLowerCase().trim() === usuarioAtual.nome.toLowerCase().trim()
        );
        
        if (!colaborador || !colaborador.id) return;
        
        // Tenta carregar foto via base64 ou via URL
        if (colaborador.foto_base64) {
            imgEl.src = colaborador.foto_base64;
            imgEl.style.display = 'block';
            iconEl.style.display = 'none';
        } else if (colaborador.foto_path) {
            // Tenta carregar via API
            const fotoUrl = `${API_URL}/colaboradores/foto/${colaborador.id}`;
            imgEl.src = fotoUrl;
            imgEl.onload = () => { imgEl.style.display = 'block'; iconEl.style.display = 'none'; };
            imgEl.onerror = () => { imgEl.style.display = 'none'; iconEl.style.display = ''; };
        }
    } catch(e) {
        console.log('[Avatar] Foto de usuario nao carregada:', e.message);
    }
}

window.carregarFotoUsuarioTopbar = carregarFotoUsuarioTopbar;

function showView(viewId) {
    document.querySelectorAll('.view-section').forEach(el => {
        el.classList.remove('active');
        el.style.display = 'none';
    });
    const view = document.getElementById(viewId);
    if (view) {
        view.classList.add('active');
        view.style.display = 'block';
        if (viewId === 'app-shell') view.style.display = 'flex';
    }
    const bb = document.getElementById('breadcrumb-bar');
    if (bb) {
        bb.style.display = viewId === 'view-login' ? 'none' : 'flex';
    }
}

// ── BREADCRUMB SYSTEM ───────────────────────────────────────────────────────
const BREADCRUMB_MAP = {
    // Telas principais
    'dashboard':          { path: 'Dashboard',                                                    code: 'RH001' },
    'colaboradores':      { path: 'Colaboradores',                                                code: 'RHCL00' },
    'form-colaborador':   { path: 'Colaboradores → Cadastro / Edição'                             },
    'cargos':             { path: 'Cargos',                                                       code: 'RHAD01' },
    'departamentos':      { path: 'Departamentos',                                                code: 'RHAD02' },
    'faculdade':          { path: 'Faculdade',                                                    code: 'RHAD03' },
    'chaves':             { path: 'Chaves',                                                       code: 'RHAD04' },
    'geradores':          { path: 'Geradores',                                                    code: 'RHDOC01' },
    'admissao':           { path: 'Admissão',                                                     code: 'RHAD05' },
    'ficha-epi':          { path: 'Ficha EPI',                                                    code: 'RHEPI01' },
    'avaliacoes':         { path: 'Avaliações',                                                   code: 'RHAV01' },
    'gerenciar-avaliacoes': { path: 'Gerenciar Avaliações',                                       code: 'RHAV02' },
    'usuarios-permissoes':  { path: 'Diretoria → Usuários e Permissões',                          code: 'DIR001' },
    'form-usuario':         { path: 'Diretoria → Usuários e Permissões → Cadastro',               code: 'DIR002' },
    'certificado-digital':  { path: 'Diretoria → Certificado Digital',                            code: 'DIR003' },
    // Sub-telas (Prontuário Digital - abas)
    'tab:00. CheckList':          { path: 'Colaboradores → Prontuário Digital → 00. CheckList',          },
    'tab:01. Ficha Cadastral':    { path: 'Colaboradores → Prontuário Digital → Ficha Cadastral',        },
    'tab:Ficha Cadastral':        { path: 'Colaboradores → Prontuário Digital → Ficha Cadastral',        },
    'tab:Pagamentos':             { path: 'Colaboradores → Prontuário Digital → Pagamentos',             },
    'tab:ASO':                    { path: 'Colaboradores → Prontuário Digital → ASO',                    },
    'tab:Ficha de EPI':           { path: 'Colaboradores → Prontuário Digital → Ficha de EPI',           },
    'tab:Atestados':              { path: 'Colaboradores → Prontuário Digital → Atestados',              },
    'tab:Faltas':                 { path: 'Colaboradores → Prontuário Digital → Faltas',                 },
    'tab:Contratos':              { path: 'Colaboradores → Prontuário Digital → Contratos',              },
    'tab:Avaliação':              { path: 'Colaboradores → Prontuário Digital → Avaliação',              },
    'tab:Avaliações':             { path: 'Colaboradores → Prontuário Digital → Avaliações',             },
    'tab:Advertências':           { path: 'Colaboradores → Prontuário Digital → Advertências',           },
    'tab:Faculdade':              { path: 'Colaboradores → Prontuário Digital → Faculdade',              },
    'tab:Boletim de ocorrência':  { path: 'Colaboradores → Prontuário Digital → Boletim de Ocorrência',  },
    'tab:Certificados':           { path: 'Colaboradores → Prontuário Digital → Certificados',           },
    'tab:Conjuge':                { path: 'Colaboradores → Prontuário Digital → Conjuge',                },
    'tab:Dependentes':            { path: 'Colaboradores → Prontuário Digital → Dependentes',            },
    'tab:Fotos':                  { path: 'Colaboradores → Prontuário Digital → Fotos',                  },
    'tab:Multas':                 { path: 'Colaboradores → Prontuário Digital → Multas',                 },
    'tab:NRs':                    { path: 'Colaboradores → Prontuário Digital → NRs',                    },
    'tab:Terapia':                { path: 'Colaboradores → Prontuário Digital → Terapia',                },
    'tab:Treinamento':            { path: 'Colaboradores → Prontuário Digital → Treinamento',            },
    'tab:Documentos':             { path: 'Colaboradores → Prontuário Digital → Documentos',             },
    'tab:Afastamentos':           { path: 'Colaboradores → Prontuário Digital → Afastamentos',           },
    'tab:Chaves':                 { path: 'Colaboradores → Prontuário Digital → Chaves',                 },
    'tab:Prontuário Digital':     { path: 'Colaboradores → Prontuário Digital',                          },
};

window.carregarPermissoesOnline = async function() {
    if (!currentUser || !currentToken) return;

    // Define quem é super admin e pode ver tudo por padrão (Apenas Diretoria!)
    const isTopAdmin = currentUser.role === 'Diretoria' || currentUser.departamento === 'Diretoria';

    // Remove qualquer display-none forçado das categorias primeiro
    document.querySelectorAll('.dept-item').forEach(el => el.style.display = '');

    if (isTopAdmin) {
        // Regra fixa solicitada: Ocultar módulos nunca se aplica a liderança da Diretoria.
        // Eles têm acesso automático e irrestrito a todas as telas visualmente.
        document.querySelectorAll('.nav-item').forEach(el => el.style.display = '');
        return; // Retorna cedo ignorando qualquer grupo
    }

    if (!currentUser.grupo_permissao_id) {
        // Usuário comum sem permissões. Ocultar tudo que tem data-target.
        document.querySelectorAll('.nav-item').forEach(el => el.style.display = 'none');
        return;
    }

    // Avança para ler as regras reais do grupo (se for usuário comum com grupo)

    try {
        const res = await fetch(`${API_URL}/grupos-permissao/${currentUser.grupo_permissao_id}/permissoes`, {
            headers: { Authorization: `Bearer ${currentToken}` }
        });
        if (!res.ok) throw new Error('Falha ao obter permissões do grupo.');
        const permissoes = await res.json();

        // Cria um mapa rápido das permissoes ativas
        const mapPerms = {};
        permissoes.forEach(p => mapPerms[p.pagina_id] = !!p.visualizar);

        // Auto-liberar certificado-digital para quem já tem acesso a usuarios-permissoes
        if (mapPerms['usuarios-permissoes']) {
            mapPerms['certificado-digital'] = true;
        }

        // Percorre todos os botões de navegação (.nav-item)
        document.querySelectorAll('.nav-item[data-target]').forEach(link => {
            const pathId = link.getAttribute('data-target');
            // Se existir no mapa de permissoes e for TRUE, mostra. Senão, esconde robustamente.
            if (mapPerms[pathId]) {
                link.style.display = '';
            } else {
                link.style.cssText = 'display: none !important;';
            }
        });

        // Agora vamos ocultar os "blocos grandes" (Departamentos) inteiros se não sobrar nenhum nav-item útil
        const deptSubmenus = document.querySelectorAll('.dept-submenu');
        deptSubmenus.forEach(submenu => {
            const navItems = Array.from(submenu.querySelectorAll('.nav-item[data-target]'));
            const headerObj = submenu.parentElement; // o `.dept-item` é o pai
            
            if (navItems.length > 0) {
                // Checa diretamente no mapa de permissões se o cara tem algo liberado aqui!
                const isAnyVisible = navItems.some(i => mapPerms[i.getAttribute('data-target')] === true);
                if (!isAnyVisible) {
                    headerObj.style.cssText = 'display: none !important;'; 
                } else {
                    headerObj.style.display = '';
                }
            } else {
                // Tem departamentos sem links ainda em desenvolvimento
                headerObj.style.cssText = 'display: none !important;';
            }
        });
        
        // Sempre garantimos que o ícone de SAIR apareça então não há risco.

    } catch (err) {
        console.error("Erro no carregamento de permissões: ", err);
    }
};

function updateBreadcrumb(key) {
    const bar = document.getElementById('breadcrumb-bar');
    window.currentBreadcrumbKey = key; // IMPORTANTE: Atualizar key atual
    const entryObj = BREADCRUMB_MAP[key] || null;
    let pageColor = '#f503c5';
    if (entryObj && entryObj.path && entryObj.path.includes('Diretoria')) {
        pageColor = '#d9480f';
    }

    const activeNav = document.querySelector('.nav-item.active');
    if (activeNav) {
        const deptItem = activeNav.closest('.dept-item');
        if (deptItem) {
            const cssColor = deptItem.style.getPropertyValue('--dept-color').trim();
            if (cssColor) pageColor = cssColor;
        }
    }

    if (bar) bar.style.backgroundColor = pageColor;

    // Atualiza botão de scroll flutuante
    const scrollerBtn = document.getElementById('global-scroll-top');
    if (scrollerBtn) {
        scrollerBtn.style.backgroundColor = pageColor;
    }

    // Mostra a estrela APENAS se for tela de menu principal ou telas base (sem setas '→', exceto Diretoria)
    const starBtn = document.getElementById('btn-star-page');
    if (starBtn && entryObj) {
        starBtn.style.color = pageColor;
        if ((!entryObj.path.includes('→') && !key.startsWith('tab:')) || key === 'usuarios-permissoes' || key === 'form-usuario') {
            starBtn.style.display = 'flex';
        } else {
            starBtn.style.display = 'none';
        }
    }
    
    if (typeof renderBookmarks === 'function') setTimeout(renderBookmarks, 50); // Força render com o novo key
    if (!bar) return;
    const entry = BREADCRUMB_MAP[key] || { path: key, code: '' };
    const parts = entry.path.split('→').map(p => p.trim());
    const code = entry.code ? ` (${entry.code})` : '';
    bar.innerHTML = '<span style="opacity:0.7;margin-right:4px;">Caminho:</span>' +
        parts.map((p, i) =>
            i < parts.length - 1
                ? `<span style="opacity:0.75;">${p}</span><span style="margin:0 5px;opacity:0.5;">→</span>`
                : `<strong>${p}</strong><span style="margin-left:6px;background:rgba(0,0,0,0.18);padding:1px 7px;border-radius:10px;font-size:0.78rem;font-weight:700;letter-spacing:0.4px;">${code.replace(/[()]/g,'')}</span>`
        ).join('');
}
let appOpenTabs = [];

// ── METADADOS DE ABAS: cor, ícone e módulo por tela ─────────────────────────
const TAB_META = {
    // RH - Rosa
    'dashboard':              { color: '#f503c5', icon: 'ph-squares-four',    title: 'Dashboard' },
    'colaboradores':          { color: '#f503c5', icon: 'ph-address-book',    title: 'Colaboradores' },
    'form-colaborador':       { color: '#f503c5', icon: 'ph-user-plus',       title: 'Cadastro Colaborador' },
    'prontuario':             { color: '#f503c5', icon: 'ph-folder-open',     title: 'Prontuário Digital' },
    'admissao':               { color: '#f503c5', icon: 'ph-list-checks',     title: 'Admissão' },
    'cargos':                 { color: '#f503c5', icon: 'ph-briefcase',       title: 'Cargos' },
    'departamentos':          { color: '#f503c5', icon: 'ph-buildings',       title: 'Departamentos' },
    'faculdade':              { color: '#f503c5', icon: 'ph-graduation-cap',  title: 'Faculdade' },
    'chaves':                 { color: '#f503c5', icon: 'ph-key',             title: 'Chaves' },
    'geradores':              { color: '#f503c5', icon: 'ph-file-text',       title: 'Geradores' },
    'ficha-epi':              { color: '#f503c5', icon: 'ph-shield-check',    title: 'Ficha EPI' },
    'gerenciar-avaliacoes':   { color: '#f503c5', icon: 'ph-clipboard-text',  title: 'Avaliações' },
    // Diretoria - Laranja
    'usuarios-permissoes':    { color: '#d9480f', icon: 'ph-users-three',    title: 'Usuários e Permissões' },
    'form-usuario':           { color: '#d9480f', icon: 'ph-user-gear',      title: 'Cadastro de Usuário' },
    // Logística - Verde
    'logistica-em-breve':     { color: '#2d9e5f', icon: 'ph-truck',          title: 'Logística' },
    // Financeiro - Azul
    'financeiro-em-breve':    { color: '#1971c2', icon: 'ph-currency-dollar', title: 'Financeiro' },
    // Comercial - Roxo
    'comercial-em-breve':     { color: '#7048e8', icon: 'ph-handshake',      title: 'Comercial' },
    // Administrativo - Amarelo
    'admin-em-breve':         { color: '#e67700', icon: 'ph-gear',           title: 'Administrativo' },
};

function getTabMeta(target) {
    return TAB_META[target] || { color: '#64748b', icon: 'ph-browsers', title: target };
}

function renderAppTabs() {
    const container = document.getElementById('app-tabs-container');
    if (!container) return;
    if (appOpenTabs.length === 0) {
        container.style.display = 'none';
        return;
    }
    container.style.display = 'flex';
    container.innerHTML = appOpenTabs.map(t => {
        const activeColor = t.color || '#0f172a';
        // Cor inativa: mesma cor do departamento mas com opacidade reduzida
        const inactiveColor = activeColor;
        return `
        <div class="app-top-tab ${t.active ? 'active' : ''}" 
             onclick="navigateToTab('${t.tabId}')"
             style="display:inline-flex; align-items:center; gap:6px; padding:6px 14px;
                    background:${t.active ? '#fff' : 'transparent'};
                    border:1px solid ${t.active ? '#cbd5e1' : 'transparent'};
                    border-bottom:none; border-radius:6px 6px 0 0; cursor:pointer;
                    font-size:0.82rem; font-weight:${t.active ? '700' : '500'};
                    color:${t.active ? activeColor : inactiveColor};
                    opacity:${t.active ? '1' : '0.55'};
                    position:relative; z-index:${t.active ? '2' : '1'};
                    white-space:nowrap; user-select:none; margin-bottom:-1px; transition:all 0.2s;"
             onmouseover="this.style.opacity='1'; if(!${t.active}) this.style.background='#f1f5f9';"
             onmouseout="this.style.opacity='${t.active ? '1' : '0.55'}'; if(!${t.active}) this.style.background='transparent';">
            ${t.icon ? `<i class="ph ${t.icon}" style="font-size:0.88rem;"></i>` : ''}
            <span>${t.title}</span>
            <i class="ph-bold ph-x"
               onclick="event.stopPropagation(); closeAppTab('${t.tabId}')"
               style="color:#ef4444; margin-left:4px; border-radius:50%; padding:2px; font-size:0.75rem;"
               onmouseover="this.style.background='#fee2e2'"
               onmouseout="this.style.background='transparent'"></i>
        </div>`;
    }).join('');
}

// Navegar para uma aba existente pelo seu tabId único
window.navigateToTab = function(tabId) {
    const tab = appOpenTabs.find(t => t.tabId === tabId);
    if (!tab) return;
    appOpenTabs.forEach(t => t.active = (t.tabId === tabId));
    renderAppTabs();
    // Restaurar o estado da view correspondente
    document.querySelectorAll('.content-view').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const targetView = document.getElementById(`view-${tab.target}`);
    if (targetView) targetView.classList.add('active');
    const targetNavObj = document.querySelector(`[data-target="${tab.target}"]`);
    if (targetNavObj) targetNavObj.classList.add('active');
    updateBreadcrumb(tab.target);
    // Se a aba tem dados de colaborador (prontuário ou form), restaura o viewedColaborador
    if (tab._colaboradorData) {
        viewedColaborador = tab._colaboradorData;
    }
};

window.closeAppTab = function(tabId) {
    const idx = appOpenTabs.findIndex(t => t.tabId === tabId);
    if (idx === -1) return;
    const wasActive = appOpenTabs[idx].active;
    appOpenTabs.splice(idx, 1);
    
    if (wasActive) {
        if (appOpenTabs.length > 0) {
            navigateToTab(appOpenTabs[appOpenTabs.length - 1].tabId);
        } else {
            navigateTo('dashboard');
        }
    } else {
        renderAppTabs();
    }
};

// navigateTo: abre uma aba ÚNICA por target (telas de lista/config).
// Para colaborador/prontuário, use openColaboradorTab / openProntuarioTab.
function navigateTo(target) {
    if (target !== 'login') {
        const meta = getTabMeta(target);
        // Telas simples: apenas uma aba por target
        const existingTab = appOpenTabs.find(t => t.tabId === target);
        if (!existingTab) {
            appOpenTabs.push({ tabId: target, target, title: meta.title, color: meta.color, icon: meta.icon, active: true });
        }
        appOpenTabs.forEach(t => t.active = (t.tabId === target));
        renderAppTabs();
    }
    const isTopAdmin = currentUser && (currentUser.role === 'Diretoria' || currentUser.role === 'Administrador' || currentUser.departamento === 'Diretoria');

    if (currentUser && !isTopAdmin) {
        const targetNav = document.querySelector(`.nav-item[data-target="${target}"]`);
        if (targetNav && targetNav.style.display === 'none') {
            alert('Você não tem permissão para acessar esta tela.');
            return;
        }
    }

    document.querySelectorAll('.content-view').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    const targetView = document.getElementById(`view-${target}`);
    if (targetView) targetView.classList.add('active');
    
    const targetNavObj = document.querySelector(`[data-target="${target}"]`);
    if (targetNavObj) targetNavObj.classList.add('active');

    updateBreadcrumb(target);

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
    } else if (target === 'gerenciar-avaliacoes') {
        if (typeof window.renderGerenciarAvaliacoes === 'function') window.renderGerenciarAvaliacoes();
    } else if (target === 'escalas') {
        loadEscalas();
    } else if (target === 'faculdade') {
        loadFaculdadeCursos();
    } else if (target === 'chaves') {
        loadChaves();
    } else if (target === 'admissao') {
        loadAdmissaoSelect();
    } else if (target === 'ficha-epi') {
        if (typeof window.initEpiModule === 'function') window.initEpiModule();
    } else if (target === 'usuarios-permissoes') {
        if (typeof window.initUsuariosPermissoes === 'function') window.initUsuariosPermissoes();
    } else if (target === 'form-usuario') {
        if (typeof window.abrirFormUsuario === 'function') {
            window.abrirFormUsuario(window._editarUserId || null);
            window._editarUserId = null;
        }
    }
}

// Abre uma aba de CADASTRO de colaborador, nomeada com o colaborador.
// Se já existir aba para esse colaborador, apenas ativa. Novo colaborador usa tabId 'form-colaborador-novo'.
window._openColaboradorTab = function(colabId, nomeColab) {
    const tabId = colabId ? `form-colaborador-${colabId}` : 'form-colaborador-novo';
    const label = nomeColab ? `Cadastro: ${nomeColab.split(' ')[0]}` : 'Novo Colaborador';
    const meta = getTabMeta('form-colaborador');
    
    const existingTab = appOpenTabs.find(t => t.tabId === tabId);
    if (!existingTab) {
        appOpenTabs.push({ tabId, target: 'form-colaborador', title: label, color: meta.color, icon: meta.icon, active: true });
    } else {
        existingTab.title = label; // Atualiza nome se necessário
    }
    appOpenTabs.forEach(t => t.active = (t.tabId === tabId));
    renderAppTabs();

    // Mostra a view de form-colaborador
    document.querySelectorAll('.content-view').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    const targetView = document.getElementById('view-form-colaborador');
    if (targetView) targetView.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    updateBreadcrumb('form-colaborador');
};

// Abre uma aba de PRONTUÁRIO, nomeada com o colaborador.
window._openProntuarioTab = function(colabId, nomeColab, colaboradorData) {
    const tabId = `prontuario-${colabId}`;
    const firstName = (nomeColab || '').split(' ')[0];
    const label = `Prontuário: ${firstName}`;
    const meta = getTabMeta('prontuario');

    const existingTab = appOpenTabs.find(t => t.tabId === tabId);
    if (!existingTab) {
        appOpenTabs.push({ tabId, target: 'prontuario', title: label, color: meta.color, icon: meta.icon, active: true, _colaboradorData: colaboradorData });
    } else {
        existingTab._colaboradorData = colaboradorData;
        existingTab.title = label;
    }
    appOpenTabs.forEach(t => t.active = (t.tabId === tabId));
    renderAppTabs();

    // Mostra a view de prontuário
    document.querySelectorAll('.content-view').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    const targetView = document.getElementById('view-prontuario');
    if (targetView) targetView.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    updateBreadcrumb('prontuario');
};


function setupNavigation() {
    document.querySelectorAll('.sidebar-nav .nav-item[data-target], .dept-submenu .nav-item[data-target]').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            navigateTo(e.currentTarget.dataset.target);
            // Recolhe o submenu automaticamente após o clique
            const deptItem = e.currentTarget.closest('.dept-item');
            if (deptItem) {
                deptItem.classList.add('submenu-force-close');
                setTimeout(() => deptItem.classList.remove('submenu-force-close'), 400);
            }
        });
    });

    const btnNovoRapido = document.getElementById('btn-novo-rapido');
    if (btnNovoRapido) {
        btnNovoRapido.addEventListener('click', () => {
            resetFormColaborador();
            window._openColaboradorTab(null, null);
        });
    }
    
    const btnNovoColab = document.getElementById('btn-novo-colab');
    if (btnNovoColab) {
        btnNovoColab.addEventListener('click', () => {
            resetFormColaborador();
            window._openColaboradorTab(null, null);
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
            headers: { 'Authorization': `Bearer ${currentToken}` },
            cache: 'no-store'
        });
        if (!res.ok) throw new Error('Falha na requisição');
        return res.json();
    } catch(e) {
        console.error(e);
        return null;
    }
}

async function apiPost(endpoint, data, options = {}) {
    const { headers: customHeaders, ...restOptions } = options;
    const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 
            'Authorization': `Bearer ${currentToken}`,
            'Content-Type': 'application/json',
            ...(customHeaders || {})
        },
        body: JSON.stringify(data),
        ...restOptions
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
                let tempoFormatado = c.tempo_curso ? ` - ${c.tempo_curso} meses` : '';
                if (c.tempo_curso && !isNaN(c.tempo_curso)) {
                    const m = parseInt(c.tempo_curso, 10);
                    const s = (m / 6).toFixed(1).replace('.0', '');
                    tempoFormatado = ` - ${m} meses (${s} semestre${s !== '1' ? 's' : ''})`;
                } else if (c.tempo_curso) {
                    tempoFormatado = ` - ${c.tempo_curso}`;
                }
                select.innerHTML += `<option value="${c.id}">${c.nome_curso} - ${c.instituicao}${tempoFormatado}</option>`;
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
// Armazena a lista completa para filtragem local
let _todosColaboradores = [];

async function loadColaboradores() {
    try {
        const wrapper = document.querySelector('#view-colaboradores .card');
        if (!wrapper) return;
        wrapper.innerHTML = '<div style="text-align:center; padding: 3rem;"><i class="ph ph-spinner ph-spin" style="font-size:2.5rem; color:var(--primary-color);"></i><p class="mt-3">Carregando lista...</p></div>';

        const response = await fetch(`${API_URL}/colaboradores`, { headers: { 'Authorization': `Bearer ${currentToken}` } });
        if (!response.ok) throw new Error('Falha na resposta do servidor');
        _todosColaboradores = await response.json();

        renderColaboradores(_todosColaboradores);
    } catch(err) {
        console.error(err);
        const wrapper = document.querySelector('#view-colaboradores .card');
        if (wrapper) wrapper.innerHTML = `<div style="text-align:center; padding: 3rem; color: var(--danger-color);"><i class="ph ph-warning" style="font-size:2.5rem;"></i><p class="mt-3">Erro ao carregar colaboradores.</p></div>`;
    }
}

function aplicarFiltrosColaboradores() {
    const parseCurrency = (val) => {
        if (!val) return 0;
        if (typeof val === 'number') return val;
        val = String(val).replace('R$', '').trim();
        if (val.includes(',') && val.includes('.')) val = val.replace(/\./g, '').replace(',', '.');
        else if (val.includes(',')) val = val.replace(',', '.');
        return parseFloat(val) || 0;
    };

    const f = {
        nome:        (document.getElementById('f-nome')?.value || '').toLowerCase().trim(),
        cpf:         (document.getElementById('f-cpf')?.value || '').replace(/\D/g, ''),
        nascIni:     document.getElementById('f-nasc-ini')?.value || '',
        nascFim:     document.getElementById('f-nasc-fim')?.value || '',
        estadoCivil: (document.getElementById('f-estado-civil')?.value || '').toLowerCase().trim(),
        sexo:        (document.getElementById('f-sexo')?.value || '').toLowerCase().trim(),
        departamento:(document.getElementById('f-departamento')?.value || '').toLowerCase().trim(),
        cargo:       (document.getElementById('f-cargo')?.value || '').toLowerCase().trim(),
        experiencia: document.getElementById('f-experiencia')?.value || '',
        tipoCadastro:document.getElementById('f-tipo-cadastro-hidden')?.value || '',
        salMin:      parseCurrency(document.getElementById('f-sal-min')?.value) || null,
        salMax:      parseCurrency(document.getElementById('f-sal-max')?.value) || null,
        escala:      document.getElementById('f-escala')?.value || '',
        dependentes: document.getElementById('f-dependentes')?.value || '',
        beneficios:  [...(document.querySelectorAll('.f-beneficios-chk:checked') || [])].map(cb => cb.value)
    };

    const lista = _todosColaboradores.filter(c => {
        if (f.nome && !(c.nome_completo || '').toLowerCase().includes(f.nome)) return false;
        if (f.cpf  && !(c.cpf || '').replace(/\D/g,'').includes(f.cpf)) return false;
        if (f.nascIni && c.data_nascimento && c.data_nascimento < f.nascIni) return false;
        if (f.nascFim && c.data_nascimento && c.data_nascimento > f.nascFim) return false;
        
        if (f.estadoCivil && (!c.estado_civil || c.estado_civil.toLowerCase().trim() !== f.estadoCivil)) return false;
        if (f.sexo && (!c.sexo || c.sexo.toLowerCase().trim() !== f.sexo)) return false;
        
        if (f.departamento && !(c.departamento || '').toLowerCase().includes(f.departamento)) return false;
        if (f.cargo && !(c.cargo || '').toLowerCase().includes(f.cargo)) return false;
        
        if (f.experiencia === 'sim') {
            if (!c.data_admissao) return false;
            const dias = Math.floor((new Date() - new Date(c.data_admissao + 'T12:00:00')) / 86400000);
            if (dias > 90 || dias < 0) return false;
        }
        
        if (f.tipoCadastro && getEffectiveStatus(c) !== f.tipoCadastro) return false;
        
        const salColab = parseCurrency(c.salario);
        if (f.salMin !== null && salColab < f.salMin) return false;
        if (f.salMax !== null && salColab > f.salMax) return false;
        
        if (f.escala && c.escala_tipo !== f.escala) return false;
        
        // Verifica dependentes (pode estar como "Sim", "Não", true, false, etc.)
        const temDep = c.tem_dependentes === 'Sim' || c.tem_dependentes === 'true' || c.tem_dependentes === true;
        if (f.dependentes === 'sim' && !temDep) return false;
        if (f.dependentes === 'nao' && temDep) return false;
        
        if (f.beneficios.length > 0) {
            if (f.beneficios.includes('Faculdade') && c.faculdade_participa !== 'Sim') return false;
            if (f.beneficios.includes('Academia') && c.academia_participa !== 'Sim') return false;
            if (f.beneficios.includes('Terapia') && c.terapia_participa !== 'Sim') return false;
            if (f.beneficios.includes('Celulares') && c.celular_participa !== 'Sim') return false;
            if (f.beneficios.includes('Chaves') && c.chaves_participa !== 'Sim') return false;
        }
        return true;
    });

    window._listaColaboradoresFiltrada = lista;

    renderTabelaColaboradores(lista);
    const countEl = document.getElementById('colab-count');
    if (countEl) countEl.textContent = `${lista.length} de ${_todosColaboradores.length} colaboradores`;
}

function limparFiltrosColaboradores() {
    ['f-nome','f-cpf','f-nasc-ini','f-nasc-fim','f-estado-civil','f-sexo','f-departamento',
     'f-cargo','f-experiencia','f-sal-min','f-sal-max',
     'f-escala','f-dependentes','f-tipo-cadastro-hidden'
    ].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    
    // Atualizar botões visuais de tipo cadastro
    document.querySelectorAll('.btn-tipo-cadastro').forEach(btn => {
        btn.style.opacity = '0.5';
        if(btn.dataset.status === ''){
            btn.style.opacity = '1';
        }
    });

    const checkboxes = document.querySelectorAll('.f-beneficios-chk');
    checkboxes.forEach(c => c.checked = false);

    aplicarFiltrosColaboradores();
}

window.selecionarTipoCadastro = function(btnElement, status) {
    document.getElementById('f-tipo-cadastro-hidden').value = status;
    document.querySelectorAll('.btn-tipo-cadastro').forEach(btn => {
        btn.style.opacity = '0.5';
        btn.style.boxShadow = 'none';
    });
    btnElement.style.opacity = '1';
    btnElement.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
    aplicarFiltrosColaboradores();
};

window.exportarColaboradoresXLSX = async function() {
    if (!window._listaColaboradoresFiltrada || window._listaColaboradoresFiltrada.length === 0) {
        alert('Nenhum colaborador para exportar.');
        return;
    }
    
    // Preparar os dados
    const colaboradores = window._listaColaboradoresFiltrada;

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Colaboradores');

    // 1. Tentar carregar a logo (base64)
    let logoBase64 = null;
    try {
        let response = await fetch('/assets/logo-header.png');
        if (!response.ok) {
            response = await fetch('/logo.png');
        }
        if (response.ok) {
            const blob = await response.blob();
            logoBase64 = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.readAsDataURL(blob);
            });
        }
    } catch(e) {
        console.warn("Erro ao carregar logo:", e);
    }

    worksheet.addRow([]);
    worksheet.addRow([]);
    worksheet.addRow([]);
    worksheet.mergeCells('A1', 'C3');

    if (logoBase64) {
        const imageId = workbook.addImage({
            base64: logoBase64,
            extension: logoBase64.split(';')[0].split('/')[1]
        });
        worksheet.addImage(imageId, {
            tl: { col: 0, row: 0 },
            ext: { width: 400, height: 60 }
        });
    }

    worksheet.mergeCells('D1', 'H3');
    worksheet.getCell('D1').value = "RELATÓRIO DE COLABORADORES";
    worksheet.getCell('D1').font = { size: 16, bold: true, color: { argb: 'FF334155' } };
    worksheet.getCell('D1').alignment = { vertical: 'middle', horizontal: 'left' };

    worksheet.addRow([]);

    const headerRow = worksheet.addRow([
        "Status", "Nome Completo", "CPF", "RG", "Data Nascimento", "Nome da Mãe", "Nome do Pai",
        "Estado Civil", "Sexo", "E-mail", "Telefone", "Contato Emergência",
        "CEP", "Rua", "Nº", "Complemento", "Bairro", "Cidade", "Estado",
        "Banco", "Agência", "Conta", "Tipo Conta", "PIX",
        "Departamento", "Cargo", "Data Admissão", "Salário", "Escala Trabalho",
        "PIS", "CTPS", "Título Eleitor", "Certificado Militar",
        "CNH", "Cat CNH", "Emissão CNH", "Validade CNH", "CID",
        "Férias Início", "Férias Fim", "Férias Retorno", "Possui Dependentes",
        "Faculdade", "Academia", "Terapia", "Celular", "Chaves"
    ]);

    headerRow.eachCell(cell => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0e7490' } };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    const safeDate = (dt) => dt ? new Date(dt).toLocaleDateString('pt-BR') : '';

    colaboradores.forEach(c => {
        const row = worksheet.addRow([
            getEffectiveStatus(c),
            c.nome_completo || '',
            c.cpf || '',
            c.rg || '',
            safeDate(c.data_nascimento),
            c.nome_mae || '',
            c.nome_pai || '',
            c.estado_civil || '',
            c.sexo || '',
            c.email || '',
            c.telefone || '',
            c.telefone_emergencia || '',
            c.endereco_cep || '',
            c.endereco_rua || '',
            c.endereco_numero || '',
            c.endereco_complemento || '',
            c.endereco_bairro || '',
            c.endereco_cidade || '',
            c.endereco_estado || '',
            c.dados_bancarios_banco || '',
            c.dados_bancarios_agencia || '',
            c.dados_bancarios_conta || '',
            c.dados_bancarios_tipo_conta || '',
            c.dados_bancarios_pix || '',
            c.departamento || '',
            c.cargo || '',
            safeDate(c.data_admissao),
            c.salario ? 'R$ ' + c.salario : '',
            c.escala_tipo || '',
            c.pis || '',
            c.ctps_numero || '',
            c.titulo_eleitor_numero || '',
            c.certificado_militar || '',
            c.cnh_numero || '',
            c.cnh_categoria || '',
            safeDate(c.cnh_emissao),
            safeDate(c.cnh_validade),
            c.cid || '',
            safeDate(c.ferias_inicio),
            safeDate(c.ferias_fim),
            safeDate(c.ferias_retorno),
            c.tem_dependentes ? 'Sim' : 'Não',
            c.faculdade_participa === 'Sim' ? 'Sim' : 'Não',
            c.academia_participa === 'Sim' ? 'Sim' : 'Não',
            c.terapia_participa === 'Sim' ? 'Sim' : 'Não',
            c.celular_participa === 'Sim' ? 'Sim' : 'Não',
            c.chaves_participa === 'Sim' ? 'Sim' : 'Não'
        ]);
        
        row.eachCell({ includeEmpty: true }, (cell) => {
            cell.alignment = { vertical: 'middle', horizontal: 'left' };
        });
    });

    worksheet.columns.forEach((col, i) => {
        col.width = i === 1 ? 30 : 18;
    });

    // Congela as 5 primeiras linhas (cabeçalho) e as 2 primeiras colunas (Status e Nome)
    worksheet.views = [
        { state: 'frozen', xSplit: 2, ySplit: 5 }
    ];

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    
    const d = new Date();
    const dia = String(d.getDate()).padStart(2, '0');
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const ano = String(d.getFullYear()).slice(-2);
    const ms = d.getMilliseconds();
    
    saveAs(blob, `${dia}${mes}${ano}_Colaboradores${ms}.xlsx`);
};

function renderColaboradores(lista) {
    const wrapper = document.querySelector('#view-colaboradores .card');
    if (!wrapper) return;

    // Função auxiliar para escalar tipo "padrao_seis_dias" -> "Padrao Seis Dias"
    const formatEscala = (e) => (e||'').replace(/_/g, ' ').replace(/\b\w/g, c=>c.toUpperCase());

    // Coletar opções únicas para os selects dos filtros
    const deptos  = [...new Set(_todosColaboradores.map(c => c.departamento).filter(Boolean))].sort();
    const cargos  = [...new Set(_todosColaboradores.map(c => c.cargo).filter(Boolean))].sort();
    const escalas = [...new Set(_todosColaboradores.map(c => c.escala_tipo).filter(Boolean))].sort();
    const beneficiosList = ['Faculdade', 'Academia', 'Terapia', 'Celulares', 'Chaves'];

    window._listaColaboradoresFiltrada = lista;

    wrapper.innerHTML = `
        <input type="hidden" id="f-tipo-cadastro-hidden" value="">
        <!-- HEADER DA TABELA -->
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem; flex-wrap:wrap; gap:1rem;">
            <div style="display:flex; align-items:center; gap:1rem;">
                <h3 style="margin:0; font-size:1.1rem; color:#334155;">Lista de Colaboradores</h3>
                <span id="colab-count" style="background:#f1f5f9; padding:0.25rem 0.75rem; border-radius:999px; font-size:0.85rem; color:#64748b; font-weight:600;">${lista.length} registros</span>
            </div>
            
            <div style="display:flex; gap:0.5rem; align-items:center; flex-wrap:wrap;">
                <!-- Status Pills -->
                <div style="display:flex; gap:0.5rem; align-items:center; margin-right:0.5rem;">
                    <button class="btn-tipo-cadastro" data-status="" onclick="selecionarTipoCadastro(this, '')" style="padding:0.35rem 0.75rem; border:none; border-radius:999px; font-size:0.8rem; font-weight:600; cursor:pointer; background:#e2e8f0; color:#475569; display:flex; gap:4px; align-items:center; transition:0.2s;">Todos</button>
                    <button class="btn-tipo-cadastro" data-status="Processo iniciado" onclick="selecionarTipoCadastro(this, 'Processo iniciado')" style="padding:0.35rem 0.75rem; border:none; border-radius:999px; font-size:0.8rem; font-weight:600; cursor:pointer; background:#f3e8ff; color:#7e22ce; display:flex; gap:4px; align-items:center; transition:0.2s; opacity:0.5;"><i class="ph ph-play-circle"></i> Iniciado</button>
                    <button class="btn-tipo-cadastro" data-status="Aguardando início" onclick="selecionarTipoCadastro(this, 'Aguardando início')" style="padding:0.35rem 0.75rem; border:none; border-radius:999px; font-size:0.8rem; font-weight:600; cursor:pointer; background:#cbd5e1; color:#334155; display:flex; gap:4px; align-items:center; transition:0.2s; opacity:0.5;"><i class="ph ph-hourglass-high"></i> Aguardando</button>
                    <button class="btn-tipo-cadastro" data-status="Ativo" onclick="selecionarTipoCadastro(this, 'Ativo')" style="padding:0.35rem 0.75rem; border:none; border-radius:999px; font-size:0.8rem; font-weight:600; cursor:pointer; background:#dcfce7; color:#166534; display:flex; gap:4px; align-items:center; transition:0.2s; opacity:0.5;"><i class="ph ph-check-circle"></i> Ativo</button>
                    <button class="btn-tipo-cadastro" data-status="Afastado" onclick="selecionarTipoCadastro(this, 'Afastado')" style="padding:0.35rem 0.75rem; border:none; border-radius:999px; font-size:0.8rem; font-weight:600; cursor:pointer; background:#ffedd5; color:#c2410c; display:flex; gap:4px; align-items:center; transition:0.2s; opacity:0.5;"><i class="ph ph-first-aid"></i> Afastado</button>
                    <button class="btn-tipo-cadastro" data-status="Férias" onclick="selecionarTipoCadastro(this, 'Férias')" style="padding:0.35rem 0.75rem; border:none; border-radius:999px; font-size:0.8rem; font-weight:600; cursor:pointer; background:#dbeafe; color:#1e40af; display:flex; gap:4px; align-items:center; transition:0.2s; opacity:0.5;"><i class="ph ph-airplane-tilt"></i> Férias</button>
                    <button class="btn-tipo-cadastro" data-status="Desligado" onclick="selecionarTipoCadastro(this, 'Desligado')" style="padding:0.35rem 0.75rem; border:none; border-radius:999px; font-size:0.8rem; font-weight:600; cursor:pointer; background:#fee2e2; color:#b91c1c; display:flex; gap:4px; align-items:center; transition:0.2s; opacity:0.5;"><i class="ph ph-x-circle"></i> Desligado</button>
                </div>
                <div style="width:1px; height:24px; background:#e2e8f0; margin:0 4px;"></div>

                <button onclick="document.getElementById('filtro-sidebar').style.right='0'" style="padding:0.45rem 1rem; border:1px solid #e2e8f0; border-radius:6px; background:#fff; font-size:0.85rem; cursor:pointer; color:#334155; font-weight:600; display:flex; align-items:center; gap:6px;">
                    <i class="ph ph-funnel"></i> Filtros
                </button>
                <button onclick="exportarColaboradoresXLSX()" style="padding:0.45rem 1rem; border:none; border-radius:6px; background:#10b981; font-size:0.85rem; font-weight:600; cursor:pointer; color:#fff; display:flex; align-items:center; gap:6px;">
                    <i class="ph ph-file-xls" style="font-size:1.1rem;"></i> Exportar XLSX
                </button>
            </div>
        </div>

        <!-- TABELA -->
        <div id="colab-table-wrapper"></div>


        <!-- SIDEBAR DE FILTROS -->
        <div id="filtro-sidebar" style="position:fixed; top:0; right:-400px; width:400px; max-width:100vw; height:100vh; background:#fff; z-index:9999; box-shadow:-4px 0 15px rgba(0,0,0,0.1); transition:right 0.3s cubic-bezier(0.4, 0, 0.2, 1); overflow-y:auto; display:flex; flex-direction:column;">
            
            <div style="padding:1.5rem; border-bottom:1px solid #e2e8f0; display:flex; justify-content:space-between; align-items:center; position:sticky; top:0; background:#fff; z-index:10;">
                <span style="font-weight:700; color:#334155; font-size:1.1rem; display:flex; align-items:center; gap:8px;">
                    <i class="ph ph-funnel"></i> Filtros Avançados
                </span>
                <button onclick="document.getElementById('filtro-sidebar').style.right='-400px'" style="background:none; border:none; cursor:pointer; color:#94a3b8; font-size:1.25rem;">
                    <i class="ph ph-x"></i>
                </button>
            </div>

            <div style="padding:1.5rem; display:flex; flex-direction:column; gap:1.25rem;">
                
                <div>
                    <label style="font-size:0.75rem;font-weight:600;color:#64748b;display:block;margin-bottom:3px;">Nome</label>
                    <input id="f-nome" type="text" placeholder="Pesquisar nome..." oninput="aplicarFiltrosColaboradores()" style="width:100%;padding:0.5rem;border:1px solid #e2e8f0;border-radius:6px;font-size:0.85rem;">
                </div>
                <div>
                    <label style="font-size:0.75rem;font-weight:600;color:#64748b;display:block;margin-bottom:3px;">CPF</label>
                    <input id="f-cpf" type="text" placeholder="Pesquisar CPF..." oninput="aplicarFiltrosColaboradores()" style="width:100%;padding:0.5rem;border:1px solid #e2e8f0;border-radius:6px;font-size:0.85rem;">
                </div>
                <div style="display:flex; gap:1rem;">
                    <div style="flex:1;">
                        <label style="font-size:0.75rem;font-weight:600;color:#64748b;display:block;margin-bottom:3px;">Nascimento De</label>
                        <input id="f-nasc-ini" type="date" onchange="aplicarFiltrosColaboradores()" style="width:100%;padding:0.5rem;border:1px solid #e2e8f0;border-radius:6px;font-size:0.85rem;">
                    </div>
                    <div style="flex:1;">
                        <label style="font-size:0.75rem;font-weight:600;color:#64748b;display:block;margin-bottom:3px;">Até</label>
                        <input id="f-nasc-fim" type="date" onchange="aplicarFiltrosColaboradores()" style="width:100%;padding:0.5rem;border:1px solid #e2e8f0;border-radius:6px;font-size:0.85rem;">
                    </div>
                </div>
                <div>
                    <label style="font-size:0.75rem;font-weight:600;color:#64748b;display:block;margin-bottom:3px;">Estado Civil</label>
                    <select id="f-estado-civil" onchange="aplicarFiltrosColaboradores()" style="width:100%;padding:0.5rem;border:1px solid #e2e8f0;border-radius:6px;font-size:0.85rem;">
                        <option value="">Todos</option><option>Solteiro(a)</option><option>Casado(a)</option><option>Divorciado(a)</option><option>Viúvo(a)</option><option>União Estável</option>
                    </select>
                </div>
                <div>
                    <label style="font-size:0.75rem;font-weight:600;color:#64748b;display:block;margin-bottom:3px;">Sexo</label>
                    <select id="f-sexo" onchange="aplicarFiltrosColaboradores()" style="width:100%;padding:0.5rem;border:1px solid #e2e8f0;border-radius:6px;font-size:0.85rem;">
                        <option value="">Todos</option><option>Masculino</option><option>Feminino</option>
                    </select>
                </div>
                <div>
                    <label style="font-size:0.75rem;font-weight:600;color:#64748b;display:block;margin-bottom:3px;">Departamento</label>
                    <select id="f-departamento" onchange="aplicarFiltrosColaboradores()" style="width:100%;padding:0.5rem;border:1px solid #e2e8f0;border-radius:6px;font-size:0.85rem;">
                        <option value="">Todos</option>${deptos.map(d=>`<option>${d}</option>`).join('')}
                    </select>
                </div>
                <div>
                    <label style="font-size:0.75rem;font-weight:600;color:#64748b;display:block;margin-bottom:3px;">Cargo</label>
                    <select id="f-cargo" onchange="aplicarFiltrosColaboradores()" style="width:100%;padding:0.5rem;border:1px solid #e2e8f0;border-radius:6px;font-size:0.85rem;">
                        <option value="">Todos</option>${cargos.map(c=>`<option>${c}</option>`).join('')}
                    </select>
                </div>
                <div>
                    <label style="font-size:0.75rem;font-weight:600;color:#64748b;display:block;margin-bottom:3px;">Em Experiência</label>
                    <select id="f-experiencia" onchange="aplicarFiltrosColaboradores()" style="width:100%;padding:0.5rem;border:1px solid #e2e8f0;border-radius:6px;font-size:0.85rem;">
                        <option value="">Todos</option><option value="sim">Sim (até 90 dias)</option>
                    </select>
                </div>
                <div style="display:flex; gap:1rem;">
                    <div style="flex:1;">
                        <label style="font-size:0.75rem;font-weight:600;color:#64748b;display:block;margin-bottom:3px;">Salário De</label>
                        <input id="f-sal-min" type="number" min="0" placeholder="R$" oninput="aplicarFiltrosColaboradores()" style="width:100%;padding:0.5rem;border:1px solid #e2e8f0;border-radius:6px;font-size:0.85rem;">
                    </div>
                    <div style="flex:1;">
                        <label style="font-size:0.75rem;font-weight:600;color:#64748b;display:block;margin-bottom:3px;">Salário Até</label>
                        <input id="f-sal-max" type="number" min="0" placeholder="R$" oninput="aplicarFiltrosColaboradores()" style="width:100%;padding:0.5rem;border:1px solid #e2e8f0;border-radius:6px;font-size:0.85rem;">
                    </div>
                </div>
                <div>
                    <label style="font-size:0.75rem;font-weight:600;color:#64748b;display:block;margin-bottom:3px;">Escala de Trabalho</label>
                    <select id="f-escala" onchange="aplicarFiltrosColaboradores()" style="width:100%;padding:0.5rem;border:1px solid #e2e8f0;border-radius:6px;font-size:0.85rem;">
                        <option value="">Todas</option>${escalas.map(e=>`<option value="${e}">${formatEscala(e)}</option>`).join('')}
                    </select>
                </div>
                <div>
                    <label style="font-size:0.75rem;font-weight:600;color:#64748b;display:block;margin-bottom:3px;">Possui Dependentes</label>
                    <select id="f-dependentes" onchange="aplicarFiltrosColaboradores()" style="width:100%;padding:0.5rem;border:1px solid #e2e8f0;border-radius:6px;font-size:0.85rem;">
                        <option value="">Todos</option><option value="sim">Sim</option><option value="nao">Não</option>
                    </select>
                </div>
                <div>
                    <label style="font-size:0.75rem;font-weight:600;color:#64748b;display:block;margin-bottom:3px;">Benefícios</label>
                    <div style="display:flex; flex-direction:column; gap:0.5rem; padding:0.5rem; border:1px solid #e2e8f0; border-radius:6px; max-height:150px; overflow-y:auto; background:#f8fafc;">
                        ${beneficiosList.map(b=>`
                            <label style="font-size:0.85rem; color:#334155; display:flex; align-items:center; gap:6px; cursor:pointer;">
                                <input type="checkbox" class="f-beneficios-chk" value="${b}" onchange="aplicarFiltrosColaboradores()" style="width:16px;height:16px;cursor:pointer;"> ${b}
                            </label>
                        `).join('')}
                    </div>
                </div>
                
            </div>
            
            <div style="padding:1.5rem; border-top:1px solid #e2e8f0; margin-top:auto; position:sticky; bottom:0; background:#fff; z-index:10;">
                <button onclick="limparFiltrosColaboradores()" style="width:100%; padding:0.75rem; border:1px solid #e2e8f0; border-radius:6px; background:#f8fafc; font-size:0.9rem; font-weight:600; cursor:pointer; color:#475569; display:flex; justify-content:center; align-items:center; gap:6px;">
                    <i class="ph ph-eraser"></i> Limpar Filtros
                </button>
            </div>
        </div>
    `;

    renderTabelaColaboradores(lista);
}

function renderTabelaColaboradores(lista) {
    const wrapper = document.getElementById('colab-table-wrapper');
    if (!wrapper) return;

    const countEl = document.getElementById('colab-count');
    if (countEl) countEl.textContent = `${lista.length} de ${_todosColaboradores.length} colaboradores`;

    if (!lista || lista.length === 0) {
        wrapper.innerHTML = `<div class="empty-state" style="text-align:center;padding:3rem 1rem;">
            <i class="ph ph-magnifying-glass" style="font-size:3rem;color:#ccc;margin-bottom:1rem;"></i>
            <h3 style="color:var(--text-muted);">Nenhum colaborador encontrado com os filtros selecionados</h3>
        </div>`;
        return;
    }

    wrapper.innerHTML = `
        <div class="table-responsive">
            <table class="table">
                <thead><tr>
                    <th style="padding-left:1rem;width:50px;">Foto</th>
                    <th>Nome</th>
                    <th>Experiência</th>
                    <th>CPF</th>
                    <th>Departamento</th>
                    <th>Cargo</th>
                    <th>Admissão</th>
                    <th>Status</th>
                    <th style="text-align:right;padding-right:1.5rem;">Ações</th>
                </tr></thead>
                <tbody>
                    ${lista.map(c => {
                        const d = c.data_admissao ? new Date(c.data_admissao).toLocaleDateString('pt-BR') : '-';
                        expInfoHtml = `<div style="font-size:0.95rem;">${d}</div>`;
                        let probationDatesHtml = '';
                        if (c.data_admissao) {
                            const adm = new Date(c.data_admissao + 'T12:00:00');
                            const d45 = new Date(adm); d45.setDate(adm.getDate() + 45);
                            const d90 = new Date(adm); d90.setDate(adm.getDate() + 90);
                            probationDatesHtml = `<div style="font-size:7pt;color:#94a3b8;line-height:1.1;margin-top:2px;">1º: ${d45.toLocaleDateString('pt-BR')}<br>2º: ${d90.toLocaleDateString('pt-BR')}</div>`;
                        }
                        let statusHtml = '';
                        const effectiveStatus = getEffectiveStatus(c);
                        if (effectiveStatus === 'Aguardando início') statusHtml = `<div style="background:#f1f3f5;color:#495057;border:2px solid #adb5bd;border-radius:20px;font-weight:600;padding:2px 10px;display:inline-flex;align-items:center;gap:4px;font-size:0.75rem;"><i class="ph ph-clock"></i> Aguardando</div>`;
                        else if (effectiveStatus === 'Processo iniciado') statusHtml = `<div style="background:#e7f5ff;color:#1864ab;border:2px solid #1864ab;border-radius:20px;font-weight:600;padding:2px 10px;display:inline-flex;align-items:center;gap:4px;font-size:0.75rem;"><i class="ph ph-hourglass"></i> Iniciado</div>`;
                        else if (effectiveStatus === 'Ativo') statusHtml = `<div style="background:#e8f5e9;color:#196b36;border:2px solid #196b36;border-radius:20px;font-weight:600;padding:2px 10px;display:inline-flex;align-items:center;gap:4px;font-size:0.75rem;"><i class="ph ph-check-circle"></i> Ativo</div>`;
                        else if (effectiveStatus === 'Férias') statusHtml = `<div style="background:#fdf7e3;color:#c2aa72;border:2px solid #c2aa72;border-radius:20px;font-weight:600;padding:2px 10px;display:inline-flex;align-items:center;gap:4px;font-size:0.75rem;"><i class="ph ph-airplane-tilt"></i> Férias</div>`;
                        else if (effectiveStatus === 'Afastado') statusHtml = `<div style="background:#faeed9;color:#eaa15f;border:2px solid transparent;border-radius:20px;font-weight:600;padding:2px 10px;display:inline-flex;align-items:center;gap:4px;font-size:0.75rem;"><i class="ph ph-warning"></i> Afastado</div>`;
                        else if (effectiveStatus === 'Desligado') statusHtml = `<div style="background:#fceeee;color:#ba7881;border:2px solid transparent;border-radius:20px;font-weight:600;padding:2px 10px;display:inline-flex;align-items:center;gap:4px;font-size:0.75rem;"><i class="ph ph-x-circle"></i> Desligado</div>`;
                        else if (effectiveStatus === 'Incompleto') statusHtml = `<div style="background:#f8f9fa;color:#6c757d;border:2px solid transparent;border-radius:20px;font-weight:600;padding:2px 10px;display:inline-flex;align-items:center;gap:4px;font-size:0.75rem;"><i class="ph ph-pencil-simple"></i> Incompleto</div>`;
                        else statusHtml = `<div style="background:#f1f3f5;color:#495057;border:2px solid #adb5bd;border-radius:20px;font-weight:600;padding:2px 10px;display:inline-flex;align-items:center;gap:4px;font-size:0.75rem;"><i class="ph ph-clock"></i> Aguardando</div>`;

                        let experienceColHtml = '-';
                        if (c.data_admissao) {
                            const adm = new Date(c.data_admissao + 'T12:00:00');
                            const today = new Date(); today.setHours(12,0,0,0);
                            const diffDays = Math.floor((today - adm) / (1000 * 60 * 60 * 24));
                            if (diffDays >= 0 && diffDays <= 90) {
                                let tagHtml = diffDays <= 45
                                    ? `<span class="probation-badge" style="font-size:0.65rem;padding:0.2rem 0.5rem;min-width:50px;">1º 45</span>`
                                    : `<span class="probation-badge second" style="font-size:0.65rem;padding:0.2rem 0.5rem;min-width:50px;">2º 45</span>`;
                                experienceColHtml = `<div style="display:flex;flex-direction:column;align-items:flex-start;">${tagHtml}${probationDatesHtml}</div>`;
                            }
                        }

                        const photoUrl = `${API_URL}/colaboradores/foto/${c.id}?t=${Date.now()}`;
                        const fallbackIcon = `data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiNjYmQ1ZTEiIHN0cm9rZS13aWR0aD0iMS41IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxwYXRoIGQ9Ik0yMCAyMWE4IDggMCAwMC0xNiAwIi8+PGNpcmNsZSBjeD0iMTIiIGN5PSI3IiByPSI0Ii8+PC9zdmc+`;

                        return `<tr>
                            <td style="padding-left:1rem;"><div style="width:36px;height:36px;border-radius:50%;overflow:hidden;border:1px solid #e2e8f0;background:#f8fafc;"><img src="${photoUrl}" onerror="this.src='${fallbackIcon}'" style="width:100%;height:100%;object-fit:cover;"></div></td>
                            <td><div style="display:flex;flex-direction:column;"><strong style="color:#334155;font-size:0.95rem;">${c.nome_completo || 'Sem Nome'}</strong></div></td>
                            <td>${experienceColHtml}</td>
                            <td style="color:#64748b;font-size:0.85rem;">${c.cpf || '-'}</td>
                            <td style="color:#64748b;font-size:0.85rem;">${c.departamento || '-'}</td>
                            <td style="color:#64748b;font-size:0.85rem;">${c.cargo || '-'}</td>
                            <td>${expInfoHtml}</td>
                            <td>${statusHtml}</td>
                            <td style="text-align:right;padding-right:1rem;">
                                <div style="display:flex;gap:0.4rem;justify-content:flex-end;">
                                    <button class="btn btn-warning btn-sm" onclick="editColaborador(${c.id})" title="Editar" style="padding:0.4rem;width:32px;height:32px;justify-content:center;"><i class="ph ph-pencil-simple"></i></button>
                                    <button class="btn btn-primary btn-sm" onclick="openProntuario(${c.id},'${(c.nome_completo||'').replace(/'/g,"\\'")}','${(c.cargo||'').replace(/'/g,"\\'")}','${c.cpf||''}','${c.sexo||''}','${c.data_admissao||''}','${c.status||''}','${c.rg_tipo||'RG'}')" title="Prontuário" style="padding:0.4rem;width:32px;height:32px;justify-content:center;background:#2563eb;"><i class="ph ph-folder-open"></i></button>
                                    <button class="btn btn-danger btn-sm" onclick="deleteColaborador(${c.id},${c.status==='Incompleto'?'true':'false'})" title="Excluir" style="padding:0.4rem;width:32px;height:32px;justify-content:center;"><i class="ph ph-x"></i></button>
                                </div>
                            </td>
                        </tr>`;
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
        if (document.getElementById('colab-sexo')) {
            document.getElementById('colab-sexo').value = c.sexo || '';
            if (typeof toggleCertificadoMilitar === 'function') toggleCertificadoMilitar(c.sexo || '');
        }
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

        window._openColaboradorTab(c.id, c.nome_completo);
        
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

    // Exibir aba Cônjuge apenas para Casado ou União Estável
    const tabConjuge = document.getElementById('tab-conjuge');
    if (tabConjuge) {
        const ec = (viewedColaborador.estado_civil || '').trim();
        tabConjuge.style.display = (ec === 'Casado' || ec === 'União Estável') ? '' : 'none';
    }

    const _nomePront = viewedColaborador ? (viewedColaborador.nome_completo || viewedColaborador.nome || nome) : nome;
    const _idPront = viewedColaborador ? (viewedColaborador.id || id) : id;
    window._openProntuarioTab(_idPront, _nomePront, viewedColaborador);
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
    window.lastASODocs = null;
    window.lastAtestadoDocs = null;
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

// ============================================================
// GERADOR DE ADVERTÊNCIA - Renderiza painel na aba Advertências
// ============================================================
window.renderAdvertenciasTab = function(listContainer, filteredDocs) {
    const safeTabId = 'Advert_ncias';
    const selected = window.tabPersistence ? window.tabPersistence[`temporal_year_${safeTabId}`] : null;
    const optionsHtml = getAnosAdmissaoOptions(selected);

    // Painel gerador no topo
    const geradorPanel = document.createElement('div');
    geradorPanel.innerHTML = `
        <div class="card p-4 mb-4" style="background: linear-gradient(135deg, #fff9f0 0%, #fff3e0 100%); border: 1.5px solid #fd7e14; border-radius: 12px;">
            <div style="display:flex; align-items:center; gap:0.75rem; margin-bottom:1.25rem;">
                <div style="background:#fd7e14; border-radius:8px; width:36px; height:36px; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                    <i class="ph ph-warning" style="color:#fff; font-size:1.3rem;"></i>
                </div>
                <div>
                    <h4 style="margin:0; font-size:1rem; font-weight:700; color:#92400e;">Gerar Documento de Advertência</h4>
                    <p style="margin:0; font-size:0.8rem; color:#b45309;">Preencha os campos e gere o documento já com os dados do colaborador</p>
                </div>
            </div>

            <div style="display:grid; grid-template-columns:1.5fr 2fr 1fr; gap:1rem; margin-bottom:1rem;">
                <div>
                    <label style="font-size:0.75rem; font-weight:700; color:#92400e; display:block; margin-bottom:4px;">Tipo de Advertência</label>
                    <select id="adv-tipo" class="form-control" style="padding:0.5rem; border:1px solid #fdba74; border-radius:6px; font-size:0.9rem;">
                        <option value="verbal">Advertência Verbal</option>
                        <option value="escrita">Advertência Escrita</option>
                        <option value="suspensao_1">Suspensão — 1 dia</option>
                        <option value="suspensao_2">Suspensão — 2 dias</option>
                        <option value="suspensao_3">Suspensão — 3 dias</option>
                    </select>
                </div>
                <div>
                    <label style="font-size:0.75rem; font-weight:700; color:#92400e; display:block; margin-bottom:4px;">Título da Advertência <span style="color:#9ca3af; font-weight:400;">(opcional)</span></label>
                    <input type="text" id="adv-titulo" class="form-control" placeholder="Ex: Desrespeito às normas internas..." style="padding:0.5rem; border:1px solid #fdba74; border-radius:6px; font-size:0.9rem;">
                </div>
                <div>
                    <label style="font-size:0.75rem; font-weight:700; color:#92400e; display:block; margin-bottom:4px;">Data Ocorrência</label>
                    <input type="date" id="adv-data" class="form-control" value="${new Date().toISOString().split('T')[0]}" style="padding:0.5rem; border:1px solid #fdba74; border-radius:6px; font-size:0.9rem;">
                </div>
            </div>

            <div style="margin-bottom:1rem;">
                <label style="font-size:0.75rem; font-weight:700; color:#92400e; display:block; margin-bottom:4px;">Motivo / Descrição da Infração <span style="color:#ef4444;">*</span></label>
                <textarea id="adv-motivo" rows="3" class="form-control" placeholder="Descreva o motivo da advertência..." style="padding:0.5rem; border:1px solid #fdba74; border-radius:6px; font-size:0.9rem; resize:vertical; width:100%; box-sizing:border-box;"></textarea>
            </div>

            <div style="display:flex; gap:0.75rem; align-items:center; flex-wrap:wrap;">
                <button onclick="window.gerarAdvertencia()" class="btn btn-primary" style="background:#fd7e14; border-color:#fd7e14; display:flex; align-items:center; gap:6px; font-weight:700;">
                    <i class="ph ph-file-text"></i> Gerar Documento
                </button>
                <span id="adv-feedback" style="font-size:0.82rem; color:#059669; display:none; align-items:center; gap:4px;">
                    <i class="ph ph-check-circle"></i> Documento gerado!
                </span>
            </div>

            <!-- O painel de preview inline foi removido, pois agora abrirá no modal -->
        </div>

        <!-- Seletor de ano + lista de documentos -->
        <div class="card p-3 mb-4 bg-light" style="display:flex; gap:1.5rem; align-items:center;">
            <label style="margin:0; font-weight:600;">Ano referente:</label>
            <select id="temporal_year_Advert_ncias" class="form-control" style="padding:0.4rem; max-width:120px;" onchange="renderTemporalAno('Advertências')">
                ${optionsHtml}
            </select>
        </div>
        <div id="temporal_ano_container_Advert_ncias"></div>
    `;
    listContainer.appendChild(geradorPanel);
    renderTemporalAno('Advertências');
};

window.gerarAdvertencia = function() {
    if (!viewedColaborador) { alert('Nenhum colaborador selecionado.'); return; }

    const tipo = document.getElementById('adv-tipo').value;
    const dataOcorrencia = document.getElementById('adv-data').value;
    const titulo = document.getElementById('adv-titulo').value.trim();
    const motivo = document.getElementById('adv-motivo').value.trim();

    if (!motivo) { alert('Por favor, descreva o motivo da advertência.'); document.getElementById('adv-motivo').focus(); return; }

    const tipoMap = {
        verbal: 'ADVERTÊNCIA VERBAL',
        escrita: 'ADVERTÊNCIA ESCRITA',
        suspensao_1: 'SUSPENSÃO DISCIPLINAR — 1 DIA',
        suspensao_2: 'SUSPENSÃO DISCIPLINAR — 2 DIAS',
        suspensao_3: 'SUSPENSÃO DISCIPLINAR — 3 DIAS'
    };
    const tipoTexto = tipoMap[tipo] || 'ADVERTÊNCIA';
    const isSuspensao = tipo.startsWith('suspensao');
    const diasSuspensao = tipo === 'suspensao_1' ? 1 : tipo === 'suspensao_2' ? 2 : tipo === 'suspensao_3' ? 3 : 0;

    const [ay, am, ad] = (dataOcorrencia || new Date().toISOString().split('T')[0]).split('-');
    const dataFormatada = `${ad}/${am}/${ay}`;
    const meses = ["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];
    const dataExtenso = `${parseInt(ad)} de ${meses[parseInt(am)-1]} de ${ay}`;
    const dataHoje = new Date();
    const dataHojeFormatada = `${String(dataHoje.getDate()).padStart(2,'0')}/${String(dataHoje.getMonth()+1).padStart(2,'0')}/${dataHoje.getFullYear()}`;
    const dataHojeExtenso = `${dataHoje.getDate()} de ${meses[dataHoje.getMonth()]} de ${dataHoje.getFullYear()}`;

    const c = viewedColaborador;
    const nomeColab = c.nome_completo || c.nome || '';
    const cpfColab = c.cpf || '---';
    const cargoCOlab = c.cargo || '---';
    const deptColab = c.departamento || '---';
    const admissaoColab = c.data_admissao ? new Date(c.data_admissao + 'T12:00:00').toLocaleDateString('pt-BR') : '---';

    const suspensaoParag = isSuspensao ? `
        <p style="margin-top:1rem; text-align:justify;">
            Em decorrência da gravidade da infração cometida, o(a) colaborador(a) cumprirá
            <strong>suspensão disciplinar de ${diasSuspensao} (${diasSuspensao === 1 ? 'um' : diasSuspensao === 2 ? 'dois' : 'três'}) dia(s)</strong>,
            sem remuneração, a contar da data da ciência deste documento.
        </p>` : '';


    const htmlDoc = `
        <p style="margin-top:1.5rem; text-align:justify;">
            A empresa <strong>AMERICA RENTAL EQUIPAMENTOS LTDA</strong>, inscrita no CNPJ sob o nº 03.434.448/0001-01,
            situada na Rua Salto da Divisa, nº 97, CEP 07252-300, Parque Alvorada – Guarulhos/SP,
            vem por meio deste documento aplicar ao(à) colaborador(a) <strong>${nomeColab}</strong> a presente
            <strong>${tipoTexto}</strong>.
        </p>
        ${titulo ? `<p style="margin-top:0.75rem; text-align:center; font-size:1rem; font-weight:700; color:#92400e; text-transform:uppercase; letter-spacing:0.04em; border-bottom:1px solid #fdba74; padding-bottom:0.4rem;">${titulo}</p>` : ''}

        <p style="margin-top:1rem; text-align:justify;">
            <strong>Motivo / Infração cometida:</strong><br>
            ${motivo.replace(/\n/g, '<br>')}
        </p>
        ${suspensaoParag}
        <p style="margin-top:1rem; text-align:justify;">
            Informamos que esta é <strong>uma medida disciplinar</strong> e que reincidências poderão acarretar
            penalidades mais severas, inclusive a rescisão do contrato de trabalho por justa causa,
            nos termos do artigo 482 da Consolidação das Leis do Trabalho (CLT).
        </p>

        <p style="margin-top:1rem; text-align:justify;">
            O(A) colaborador(a) declara, com sua assinatura, estar ciente do conteúdo desta advertência
            e de que a mesma será arquivada em seu prontuário.
        </p>
    `;

    // Montar dados do colaborador para o padrão do preview
    const tipoSimples = { verbal: 'Advertência Verbal', escrita: 'Advertência Escrita', suspensao_1: 'Suspensão 1 dia', suspensao_2: 'Suspensão 2 dias', suspensao_3: 'Suspensão 3 dias' }[tipo] || tipoTexto;
    window._advertenciaData = {
        html: htmlDoc,
        gerador_nome: tipoTexto,
        titulo: titulo || tipoSimples,
        tipoSimples,
        dataOcorrencia: dataFormatada,
        dataHojeExtenso,
        colaborador: {
            NOME_COMPLETO: nomeColab,
            CPF: cpfColab,
            CARGO: cargoCOlab,
            DEPARTAMENTO: deptColab,
            DATA_ADMISSAO: admissaoColab,
            ENDERECO: c.endereco || '---',
            TELEFONE: c.telefone || '---',
            EMAIL: c.email || '---',
            SALARIO: c.salario || '---'
        }
    };

    // Mostrar no modal em tela cheia em vez do preview resumido
    window.abrirPreviewAdvertencia(window._advertenciaData);
    
    const fb = document.getElementById('adv-feedback');
    if (fb) { fb.style.display = 'inline-flex'; setTimeout(() => { fb.style.display = 'none'; }, 3000); }
};

window.abrirPreviewAdvertencia = function(data) {
    const container = document.getElementById('preview-doc-body');
    if (!container) return;

    const apiBase = API_URL.replace('/api', '');
    const logoSrc = `${apiBase}/assets/logo-header.png`;

    const logoBanner = `<div style="margin-bottom:0.5rem;"><img src="${logoSrc}" style="width:100%; display:block;" onerror="this.style.display='none'"></div>`;
    const colabInfo = `
        <h1 style="text-align:center; color:#1e293b; margin-top:0.1rem; margin-bottom:0.3rem; font-size:1.1rem; text-transform:uppercase;">${data.gerador_nome}</h1>
        <p style="margin:0.2rem 0; font-size:0.85rem;"><b>COLABORADOR:</b> ${data.colaborador.NOME_COMPLETO}</p>
        <div style="border:1px solid #000; padding:0.4rem 0.6rem; margin-top:0.3rem; line-height:1.3; font-size:0.78rem;">
            <p style="margin:0 0 0.1rem 0; font-size:0.75rem;"><b>DADOS DO COLABORADOR:</b></p>
            <div style="display:flex; gap:1.5rem; flex-wrap:wrap;">
                <span>CPF: <b>${data.colaborador.CPF}</b></span>
                <span>CARGO: <b>${data.colaborador.CARGO}</b></span>
                <span>ADMISSÃO: <b>${data.colaborador.DATA_ADMISSAO}</b></span>
            </div>
            <p style="margin:0.1rem 0 0;">DEPARTAMENTO: ${data.colaborador.DEPARTAMENTO}</p>
        </div>
    `;
    const conteudo = `<div style="margin-top:0.6rem; text-align:justify; line-height:1.35; font-size:0.8rem;">${data.html}</div>`;
    const footer = `
        <div style="margin-top:1rem;">
            <p style="font-weight:700; font-size:0.85rem;">Guarulhos, ${data.dataHojeExtenso}.</p>
        </div>
    `;

    container.innerHTML = logoBanner + colabInfo + conteudo + footer;
    document.getElementById('preview-doc-title').textContent = `${data.gerador_nome} - ${data.colaborador.NOME_COMPLETO}`;

    // Configurar botões customizados para Advertência
    const btnsContainer = document.getElementById('preview-doc-buttons');
    if (btnsContainer) {
        btnsContainer.innerHTML = `
            <button onclick="window.anexarAdvertenciaAoProntuario()" id="btn-anexar-adv" class="btn btn-primary" style="background:#2f9e44; border-color:#2b8a3e; align-items:center; gap:5px;">
                <i class="ph ph-paperclip"></i> Anexar ao Prontuário
            </button>
            <button onclick="window.imprimirDocumento()" class="btn btn-primary" style="align-items:center; gap:5px;">
                <i class="ph ph-printer"></i> Imprimir/PDF
            </button>
            <button class="btn btn-secondary" onclick="document.getElementById('modal-preview-doc').style.display='none'">
                <i class="ph ph-x"></i> Fechar
            </button>
        `;
    }

    document.getElementById('modal-preview-doc').style.display = 'block';
};

window.anexarAdvertenciaAoProntuario = async function() {
    if (!viewedColaborador || !window._advertenciaData) return;
    if (typeof html2pdf === 'undefined') {
        alert('A biblioteca de PDF ainda não foi carregada. Tente imprimir como PDF nativo.');
        return;
    }

    const btn = document.getElementById('btn-anexar-adv');
    if (btn) {
        btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Anexando...';
        btn.disabled = true;
    }

    try {
        // Mapeamento de acentos para nome do arquivo
        const semAcentos = (str) => (str||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9]/g,'_');

        const hoje = new Date();
        const dd  = String(hoje.getDate()).padStart(2,'0');
        const mm  = String(hoje.getMonth()+1).padStart(2,'0');
        const yyyy = hoje.getFullYear();
        const nomeArquivo = [
            semAcentos(window._advertenciaData.titulo),
            semAcentos(window._advertenciaData.tipoSimples),
            `${dd}-${mm}-${yyyy}`,
            semAcentos(window._advertenciaData.colaborador.NOME_COMPLETO)
        ].join('_').replace(/_+/g,'_') + '.pdf';

        // Container A4 isolado
        const apiBase = API_URL.replace('/api','');
        const logoSrc = `${apiBase}/assets/logo-header.png`;
        const data = window._advertenciaData;
        
        const htmlTemplate = `
            <div style="width:794px;padding:48px 56px;box-sizing:border-box;background:#fff;color:#111;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.5;">
                <div style="margin-bottom:10px;">
                    <img src="${logoSrc}" style="width:100%;max-width:682px;display:block;" onerror="this.style.display='none'">
                </div>
                <h1 style="text-align:center;font-size:15px;text-transform:uppercase;margin:8px 0 6px;color:#1e293b;">${data.gerador_nome}</h1>
                <p style="margin:4px 0;font-size:13px;"><b>COLABORADOR:</b> ${data.colaborador.NOME_COMPLETO}</p>
                <div style="border:1px solid #000;padding:6px 10px;margin:6px 0;font-size:11.5px;line-height:1.4;">
                    <p style="margin:0 0 3px;font-size:11px;"><b>DADOS DO COLABORADOR:</b></p>
                    <div style="display:flex;gap:24px;flex-wrap:wrap;">
                        <span>CPF: <b>${data.colaborador.CPF}</b></span>
                        <span>CARGO: <b>${data.colaborador.CARGO}</b></span>
                        <span>ADMISSAO: <b>${data.colaborador.DATA_ADMISSAO}</b></span>
                    </div>
                    <p style="margin:3px 0 0;">DEPARTAMENTO: ${data.colaborador.DEPARTAMENTO}</p>
                </div>
                <div style="margin-top:10px;text-align:justify;line-height:1.5;font-size:12.5px;">${data.html}</div>
                <div style="margin-top:14px;">
                    <p style="font-weight:700;font-size:13px;">Guarulhos, ${data.dataHojeExtenso}.</p>
                </div>
            </div>
        `;

        // Pré-carregar a imagem na memória (cache do navegador) para garantir que apareça 
        const imgPreload = new Image();
        imgPreload.src = logoSrc;
        await new Promise(resolve => {
            if (imgPreload.complete) return resolve();
            imgPreload.onload = resolve;
            imgPreload.onerror = resolve;
            setTimeout(resolve, 2000);
        });

        const opt = {
            margin:       [0,0,0,0],
            filename:     nomeArquivo,
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2, useCORS: true, width: 794 },
            jsPDF:        { unit: 'px', format: [794, 1123], orientation: 'portrait' }
        };

        const pdfBlob = await html2pdf().set(opt).from(htmlTemplate).output('blob');
        const file = new File([pdfBlob], nomeArquivo, { type: 'application/pdf' });

        const formData = new FormData();
        formData.append('file', file);
        formData.append('colaborador_id', viewedColaborador.id);
        formData.append('tab_name', 'Advertências');
        // document_type = 'Titulo###TipoSimples' para exibir badge no prontuário
        const docType = `${window._advertenciaData.titulo}###${window._advertenciaData.tipoSimples}`;
        formData.append('document_type', docType);
        formData.append('year', new Date().getFullYear().toString());
        formData.append('colaborador_nome', viewedColaborador.nome_completo || viewedColaborador.nome || '');

        const response = await fetch(`${API_URL}/documentos`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${currentToken}` },
            body: formData
        });

        // O servidor pode retornar 5xx se o OneDrive falhar, mas o doc JÁ foi salvo no banco.
        // Só consideramos falha real se não houver resposta ou status 400.
        const resData = await response.json().catch(() => ({}));
        if (response.status === 400) throw new Error(resData.error || 'Arquivo não recebido pelo servidor.');

        // Fechar modal
        document.getElementById('modal-preview-doc').style.display = 'none';

        // Feedback visual sem alert
        if (btn) {
            btn.innerHTML = '<i class="ph ph-check-circle"></i> Anexado!';
            btn.style.background = '#2f9e44';
            btn.disabled = true;
        }

        // Recarregar documentos e re-renderizar a aba Advertências
        try {
            const docs = await apiGet(`/colaboradores/${viewedColaborador.id}/documentos`);
            if (docs) {
                currentDocs = docs;
                const activeTab = document.querySelector('#tabs-list li.active');
                if (activeTab) {
                    renderTabContent(activeTab.dataset.tab, activeTab.textContent, true);
                } else {
                    renderTabContent('Advertências', 'Advertências', true);
                }
            }
        } catch (refreshErr) {
            console.warn('Aviso: não foi possível atualizar a lista automaticamente.', refreshErr);
        }

    } catch (e) {
        console.error(e);
        if (btn) {
            btn.innerHTML = '<i class="ph ph-warning"></i> ' + (e.message || 'Erro ao anexar');
            btn.style.background = '#e03131';
            btn.disabled = false;
            setTimeout(() => {
                btn.innerHTML = '<i class="ph ph-paperclip"></i> Tentar Novamente';
                btn.style.background = '#2f9e44';
            }, 3000);
        }
    }
};

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
    
    if (typeof updateBreadcrumb === 'function') updateBreadcrumb('tab:' + tabTitle);
    
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
    } else if (tabId === 'Atestados') {
        renderAtestadosTab(listContainer, filteredDocs);
    } else if (tabId === 'Faltas') {
        renderFaltasTab(listContainer);
    } else if (tabId === 'Avaliação') {
        if (window.renderAvaliacaoTab) window.renderAvaliacaoTab(listContainer);
    } else if (tabId === 'Advertências') {
        renderAdvertenciasTab(listContainer, filteredDocs);
    } else if (tabId === 'Ficha de EPI') {
        renderFichaEpiTab(listContainer);
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
        if (tabId === 'Dependentes') {
            const hasDependentes = viewedColaborador && viewedColaborador.dependentes && viewedColaborador.dependentes.filter(d => d.grau_parentesco !== 'Cônjuge').length > 0;
            if (!hasDependentes) {
                listContainer.innerHTML = '<div class="alert alert-info"><i class="ph ph-info"></i> Esta aba está disponível apenas para colaboradores que tenham dependentes cadastrados no sistema.</div>';
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
        if (tabId === 'Multas') {
            const isMotorista = viewedColaborador && (viewedColaborador.cargo || '').toUpperCase().includes('MOTORISTA');
            if (!isMotorista) {
                listContainer.innerHTML = '<div class="alert alert-info"><i class="ph ph-info"></i> Esta aba está disponível apenas para colaboradores com cargo de Motorista.</div>';
                return;
            }
        }
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
}

function createDocSlot(tabId, docType, existingDoc, year = null, month = null, blockReason = null) {
    const div = document.createElement('div');
    div.className = 'doc-item';
    const isSaved = !!existingDoc;
    if (isSaved) {
        div.setAttribute('data-doc-id', existingDoc.id);
        div.setAttribute('data-assinafy-status', existingDoc.assinafy_status || 'Nenhum');
    }

    // Limita o nome do arquivo a 40 caracteres
    let rawFileName = isSaved ? (existingDoc.file_name || '') : '';
    try {
        if (rawFileName.includes('Ã')) {
            rawFileName = decodeURIComponent(escape(rawFileName));
        }
    } catch (e) {}
    const displayFileName = rawFileName.length > 40 ? rawFileName.substring(0, 40) + '…' : rawFileName;

    // Vencimento com cor vermelha se estiver dentro de 30 dias
    let vencInfoHtml = '';
    if (isSaved && existingDoc.vencimento) {
        const vencDate = new Date(existingDoc.vencimento + 'T12:00:00');
        if (tabId === 'ASO') {
            vencDate.setFullYear(vencDate.getFullYear() + 1); // 12 meses apos o exame
        }
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const diasRestantes = Math.floor((vencDate - today) / (1000 * 60 * 60 * 24));
        const vencColor = diasRestantes <= 30 ? '#e03131' : '#475569';
        const vencFormatted = vencDate.toLocaleDateString('pt-BR');
        vencInfoHtml += `<span style="color:${vencColor}; font-weight:600;">Venc.: ${vencFormatted}</span>`;
    }

    let enviadoHtml = '';
    let linkAssinaturaHtml = '';
    if (isSaved && existingDoc.assinafy_sent_at && existingDoc.assinafy_status !== 'Erro') {
        let sd = existingDoc.assinafy_sent_at;
        if (!sd.includes('T')) sd = sd.replace(' ', 'T');
        if (!sd.endsWith('Z')) sd += 'Z';
        const sentDateObj = new Date(sd);
        
        const dd = String(sentDateObj.getDate()).padStart(2, '0');
        const mm = String(sentDateObj.getMonth()+1).padStart(2, '0');
        const yyyy = sentDateObj.getFullYear();
        const h = String(sentDateObj.getHours()).padStart(2, '0');
        const min = String(sentDateObj.getMinutes()).padStart(2, '0');
        
        const enviadoDate = `${dd}/${mm}/${yyyy} - ${h}h${min}m`;
        enviadoHtml = ` <span style="color:#64748b;">|</span> <span style="color:#2f9e44; font-weight:600;">Enviado: ${enviadoDate}</span>`;
        
        // Link de assinatura em linha própria abaixo do Enviado
        if (existingDoc.assinafy_url) {
            const encodedUrl = encodeURIComponent(existingDoc.assinafy_url);
            linkAssinaturaHtml = `<p style="margin:1px 0 0; font-size:0.75rem;"><span data-copy-url="${encodedUrl}" onclick="copiarLinkAssinafy(this)" style="color:#64748b; display:inline-flex; align-items:center; gap:3px; cursor:pointer;" title="Clique para copiar o link de assinatura"><i class="ph ph-copy" style="font-size:0.9rem;"></i> Link para assinatura</span></p>`;
        }
        
        if (existingDoc.assinafy_signed_at) {
            let sda = existingDoc.assinafy_signed_at;
            if (!sda.includes('T')) sda = sda.replace(' ', 'T');
            if (!sda.endsWith('Z')) sda += 'Z';
            const signedObj = new Date(sda);
            const sdd = String(signedObj.getDate()).padStart(2, '0');
            const smm = String(signedObj.getMonth()+1).padStart(2, '0');
            const syyyy = signedObj.getFullYear();
            const sh = String(signedObj.getHours()).padStart(2, '0');
            const smin = String(signedObj.getMinutes()).padStart(2, '0');
            enviadoHtml += `<br><span style="color:#1c7ed6; font-weight:600;"><i class="ph ph-check-circle" style="font-size:0.9rem;"></i> Assinado: ${sdd}/${smm}/${syyyy} - ${sh}h${smin}m</span>`;
        }
    }

    let atestadoInfoHtml = '';
    if (isSaved && existingDoc.atestado_tipo) {
        if (existingDoc.atestado_tipo === 'dias') {
            const ini = existingDoc.atestado_inicio ? existingDoc.atestado_inicio.split('-').reverse().join('/') : '';
            const fim = existingDoc.atestado_fim ? existingDoc.atestado_fim.split('-').reverse().join('/') : '';
            const hojeStr = new Date().toISOString().split('T')[0];
            const isColabAfastado = viewedColaborador && viewedColaborador.status === 'Afastado';
            const isAtivo = (isColabAfastado && existingDoc.atestado_inicio && existingDoc.atestado_fim && existingDoc.atestado_inicio <= hojeStr && hojeStr <= existingDoc.atestado_fim);
            const corText = isAtivo ? '#d9480f' : '#868e96';
            atestadoInfoHtml = ` <span style="color:${corText}; font-weight:600;"><i class="ph ph-warning" style="font-size:0.9em; color:${corText}; margin-right:2px;"></i> ${ini} até ${fim}</span> `;
        } else {
            atestadoInfoHtml = ` <span style="color:#1098ad; font-weight:600;"><i class="ph ph-clock"></i> ${existingDoc.atestado_inicio} às ${existingDoc.atestado_fim}</span> `;
        }
    }

    const subInfoLine = (vencInfoHtml || enviadoHtml || atestadoInfoHtml)
        ? `<p style="margin:2px 0 0; font-size:0.78rem;">${atestadoInfoHtml}${vencInfoHtml}${enviadoHtml}</p>${linkAssinaturaHtml}`
        : '';

    // Suporte ao separador ### para Advertências: 'Título###TipoSimples'
    let docLabel = docType;
    let docBadge = '';
    let tipoAdvSimples = '';
    if (docType && docType.includes('###')) {
        const parts = docType.split('###');
        docLabel = parts[0] || docType;
        tipoAdvSimples = parts[1] || '';
        docBadge = tipoAdvSimples ? (() => {
            const t = tipoAdvSimples.toLowerCase();
            let bg, color;
            if (t.includes('verbal'))              { bg = '#ffd43b'; color = '#5c3d00'; }
            else if (t.includes('escrita') || t.includes('escrito')) { bg = '#fd7e14'; color = '#fff'; }
            else if (t.includes('suspens') && t.includes('1')) { bg = '#ff8787'; color = '#5c0000'; }
            else if (t.includes('suspens') && t.includes('2')) { bg = '#e03131'; color = '#fff'; }
            else if (t.includes('suspens') && t.includes('3')) { bg = '#862e2e'; color = '#fff'; }
            else if (t.includes('suspens'))        { bg = '#e03131'; color = '#fff'; }
            else                                   { bg = '#64748b'; color = '#fff'; }
            return `<span style="display:inline-block; margin-top:3px; background:${bg}; color:${color}; padding:1px 8px; border-radius:10px; font-size:0.68rem; font-weight:700; letter-spacing:0.03em;">${tipoAdvSimples}</span>`;
        })() : '';
    }

    // Icone esquerdo: amarelo=criado, azul aviao=enviado, verde caneta=assinado
    const assinafyStatus = isSaved ? (existingDoc.assinafy_status || '') : '';
    const foiEnviado = isSaved && !!existingDoc.assinafy_sent_at;
    let docIconClass, docIconColor;
    if (assinafyStatus === 'Assinado') {
        docIconClass = 'ph-pen-nib';
        docIconColor = '#2f9e44'; // verde
    } else if (foiEnviado || assinafyStatus === 'Pendente') {
        docIconClass = 'ph-paper-plane-tilt';
        docIconColor = '#1971c2'; // azul
    } else {
        docIconClass = 'ph-file-text';
        docIconColor = isSaved ? '#e8a000' : '#94a3b8'; // amarelo=salvo, cinza=pendente
    }

    let infoHtml = `
        <div class="doc-info ${isSaved ? 'has-file' : ''}">
            <i class="ph ${isSaved ? docIconClass : 'ph-file-dashed'}" style="color:${isSaved ? docIconColor : ''}; font-size:1.3rem;"></i>
            <div>
                <h4>${docLabel}${docBadge ? '<br>' + docBadge : ''}</h4>
                ${isSaved ? `<p style="margin:0; font-size:0.82rem; color:#475569;">${displayFileName}</p>${subInfoLine}` : '<p>Pendente</p>'}
            </div>
        </div>
    `;

    let vencimentoInputHtml = '';
    const needsVencimentoList = ['ASO', 'CNH', 'Exames Complementares', 'RG-CPF', 'CIN-CPF', 'Comprovante de endereço'];
    const needsVencimento = needsVencimentoList.includes(docType) || tabId === 'ASO';
    const safeDocType = docType.replace(/\s+/g, '-');

    if (needsVencimento) {
        let existingVencimento = existingDoc && existingDoc.vencimento ? existingDoc.vencimento : '';
        if (!existingVencimento && docType === 'Comprovante de endereço') {
            const d = new Date();
            d.setFullYear(d.getFullYear() + 1);
            existingVencimento = d.toISOString().split('T')[0];
        }
        vencimentoInputHtml = `
            <div style="display: flex; flex-direction: column; gap: 0.2rem;">
                <label style="font-size: 0.75rem; font-weight: 600; color: #64748b;">${tabId === 'ASO' ? 'Data do Exame' : 'Vencimento'}</label>
                <div style="display:flex; gap:0.25rem; align-items: center;">
                    <input type="date" id="venc-${tabId}-${safeDocType}" class="venc-input" value="${existingVencimento}"
                           style="padding: 0.5rem; border: 1px solid var(--border-color); border-radius: 6px; font-size: 0.9rem; font-family: inherit; color: var(--text-main); width: 145px; height: 42px;">
                </div>
            </div>
        `;
    }

    // Status Assinafy: apenas botão de baixar quando assinado
    let assStatusIcon = '';
    const stMain = isSaved ? (existingDoc.assinafy_status || '') : '';
    const isAssinado = isSaved && (stMain === 'Assinado' || stMain === 'Testemunhas' || stMain.includes('Testemunhas'));

    if (isSaved) {
        const st = existingDoc.assinafy_status || '';
        if (st === 'Assinado') {
            assStatusIcon = `<button type="button" onclick="window.viewDoc(${existingDoc.id})" style="height:42px;display:inline-flex;align-items:center;gap:6px;background:#2f9e44;color:#fff;border:none;border-radius:6px;padding:0 0.85rem;font-size:0.85rem;font-weight:600;cursor:pointer;white-space:nowrap;" title="Visualizar/Baixar PDF Assinado"><i class="ph ph-file-pdf" style="font-size:1.1rem;"></i> Ver Assinado</button>`;
        } else if (st === 'Erro') {
            assStatusIcon = `<span title="Erro ao enviar" style="height:42px;display:inline-flex;align-items:center;gap:3px;color:#e03131;font-size:0.85rem;font-weight:600;white-space:nowrap;"><i class="ph ph-warning-circle" style="font-size:1.1rem;"></i> Erro</span>`;
        }
    }

    let actionsHtml = `
        <div class="doc-actions" style="display: flex; align-items: flex-end; gap: 0.5rem;">
            ${blockReason ? `
                <div style="font-size: 0.85rem; color: #64748b; font-style: italic; background: #f1f5f9; padding: 0.6rem 1rem; border-radius: 6px; display: flex; align-items: center; gap: 0.5rem; min-width: 300px;">
                    <i class="ph ph-info" style="font-size: 1.1rem;"></i> ${blockReason}
                </div>
            ` : (tabId === 'Certificados') ? `
                <div style="display: flex; gap: 0.5rem; align-items: center; flex-wrap: nowrap;">
                    ${vencimentoInputHtml}

                    ${isSaved ? `
                        <button type="button" class="btn btn-secondary" onclick="viewDoc(${existingDoc.id})" title="Visualizar" style="height: 42px;"><i class="ph ph-eye"></i></button>
                    ` : ''}

                    ${(isSaved && stMain !== 'NAO_EXIGE') ? `
                        <button class="btn btn-assinafy" style="height: 42px; display:flex; align-items:center; padding:0 0.85rem; white-space:nowrap;" onclick="window.iniciarAssinafy('${docType}', '${tabId}', this)" ${isAssinado ? 'disabled' : ''}>
                            <i class="ph ph-pen-nib"></i> Solicitar Assinatura
                        </button>
                        ${assStatusIcon}
                    ` : ''}

                    ${(!isAssinado) ? `
                    <label class="btn ${isSaved ? 'btn-warning' : 'btn-primary'}" title="${isSaved ? 'Substituir' : 'Fazer Upload'}" style="height: 42px; display: flex; align-items: center; margin: 0; white-space:nowrap;">
                        <i class="ph ph-upload-simple"></i> ${isSaved ? 'Substituir' : 'Upload'}
                        <input type="file" accept=".pdf" style="display:none;" onchange="let assStatus = '${stMain || 'PENDENTE'}'; uploadDocument(this, '${tabId}', '${docType}', ${year}, ${month}, null, assStatus)">
                    </label>
                    ` : ''}

                    ${isSaved && !isAssinado ? `
                        <button type="button" class="btn btn-danger" onclick="deleteDoc(${existingDoc.id}, this)" title="Excluir" style="height: 42px;"><i class="ph ph-trash"></i></button>
                    ` : ''}
                </div>
            ` : (tabId === 'Advertências') ? `
                <div style="display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap;">
                    ${vencimentoInputHtml}

                    ${isSaved ? `
                        <button type="button" class="btn btn-secondary" onclick="viewDoc(${existingDoc.id})" title="Visualizar" style="height: 42px;"><i class="ph ph-eye"></i></button>
                    ` : ''}

                    ${(tabId === 'Advertências' && isSaved) ? `
                        ${(!stMain || stMain === 'Nenhum') ? `
                        <button type="button" class="btn btn-secondary"
                                onclick="window.abrirModalAssinaturaTestemunhas(${existingDoc.id})"
                                style="height: 42px; display:flex; align-items:center; justify-content:center; gap:6px; background:#475569; color:#fff; border:none; border-radius:6px; padding:0 0.85rem; font-size:0.85rem; font-weight:600; cursor:pointer; white-space:nowrap;">
                            <i class="ph ph-users"></i> Testemunhas
                        </button>` : ''}
                        ${(stMain === 'Testemunhas') ? `
                        <button type="button" class="btn btn-primary"
                                onclick="window.abrirModalAssinaturaColaborador(${existingDoc.id})"
                                style="height: 42px; display:flex; align-items:center; justify-content:center; gap:6px; background:#0f4c81; color:#fff; border:none; border-radius:6px; padding:0 0.85rem; font-size:0.85rem; font-weight:600; cursor:pointer; white-space:nowrap;">
                            <i class="ph ph-pen-nib"></i> Assinar
                        </button>` : ''}
                    ` : ''}

                    ${(!isAssinado) ? `
                    <label class="btn ${isSaved ? 'btn-warning' : 'btn-primary'}" title="${isSaved ? 'Substituir' : 'Fazer Upload'}" style="height: 42px; display: flex; align-items: center; margin: 0;">
                        <i class="ph ph-upload-simple"></i> ${isSaved ? 'Substituir' : 'Upload'}
                        <input type="file" accept=".pdf" style="display:none;" onchange="const venc = this.closest('.doc-item').querySelector('.venc-input')?.value; if((${needsVencimento}) && !venc) { alert('Data de vencimento é obrigatória'); this.value=''; return; } uploadDocument(this, '${tabId}', '${docType}', ${year}, ${month}, venc, null)">
                    </label>
                    ` : ''}

                    ${isSaved && !isAssinado ? `
                        <button type="button" class="btn btn-danger" onclick="deleteDoc(${existingDoc.id}, this)" title="Excluir" style="height: 42px;"><i class="ph ph-trash"></i></button>
                    ` : ''}

                    ${(tabId === 'Advertências' && isSaved && stMain === 'Assinado' && tipoAdvSimples && tipoAdvSimples.toLowerCase().includes('suspens')) ? `
                    <div style="display:flex; flex-direction:column; gap:0.35rem; margin-top:0.35rem; align-items:flex-end; width:100%;">
                        <input type="email" id="susp-contab-email-${existingDoc.id}"
                               value="thais.ricci@americarental.com.br"
                               style="height:36px; padding:0 0.6rem; border:1px solid #cbd5e1; border-radius:6px; font-size:0.82rem; width:100%; min-width:230px; max-width:250px;">
                        <button type="button"
                                onclick="window.enviarSuspensaoContabilidade(${existingDoc.id}, 'susp-contab-email-${existingDoc.id}', this)"
                                style="height:36px; display:flex; align-items:center; justify-content:center; gap:6px; background:#0f4c81; color:#fff; border:none; border-radius:6px; padding:0 0.85rem; font-size:0.82rem; font-weight:600; cursor:pointer; white-space:nowrap; width:100%; min-width:230px; max-width:250px;">
                            <i class="ph ph-buildings"></i> Enviar para Contabilidade
                        </button>
                    </div>` : ''}
                </div>
            ` : `
                <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                    <div style="display: flex; gap: 0.5rem; align-items: flex-end;">
                        ${vencimentoInputHtml}
                        ${isSaved ? `
                            <button type="button" class="btn btn-secondary" onclick="viewDoc(${existingDoc.id})" title="Visualizar" style="height: 42px;"><i class="ph ph-eye"></i></button>
                            ${(!isAssinado) ? `<button type="button" class="btn btn-danger" onclick="deleteDoc(${existingDoc.id}, this)" title="Excluir" style="height: 42px;"><i class="ph ph-trash"></i></button>` : ''}
                        ` : ''}
                        ${(!isAssinado && !(tabId === 'Atestados' && isSaved)) ? `
                        <label class="btn ${isSaved ? 'btn-warning' : 'btn-primary'}" title="${isSaved ? 'Substituir' : 'Fazer Upload'}" style="height: 42px; display: flex; align-items: center;">
                            <i class="ph ph-upload-simple"></i> ${isSaved ? 'Substituir' : 'Upload'}
                            <input type="file" accept=".pdf" style="display:none;" onchange="
                                const venc = this.closest('.doc-item').querySelector('.venc-input')?.value; 
                                if((${needsVencimento}) && !venc) { alert('Data de vencimento é obrigatória'); this.value=''; return; } 
                                let assStatus = null;
                                uploadDocument(this, '${tabId}', '${docType}', ${year}, ${month}, venc, assStatus)
                            ">
                        </label>
                        ` : ''}
                    </div>

                    ${(() => {
                        const showAssinafy = isSaved && tabId !== 'Atestados' && stMain !== 'NAO_EXIGE';
                        return showAssinafy ? `
                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                            <button class="btn btn-assinafy" style="height: 42px; display:flex; align-items:center; padding:0 0.85rem;" onclick="window.iniciarAssinafy('${docType}', '${tabId}', this)" ${isAssinado ? 'disabled' : ''}>
                                <i class="ph ph-pen-nib"></i> Solicitar Assinatura
                            </button>
                            ${assStatusIcon}
                        </div>` : (assStatusIcon ? `<div style="display:flex;align-items:center;gap:0.5rem; justify-content:flex-end; width:100%; margin-top:0.35rem;">${assStatusIcon}</div>` : '');
                    })()}

                    ${(tabId === 'Atestados' && isSaved) ? `
                    <div style="display:flex; flex-direction:column; gap:0.35rem; margin-top:0.35rem; align-items:flex-end;">
                        <input type="email" id="contab-email-${existingDoc.id}"
                               value="thais.ricci@americarental.com.br"
                               style="height:36px; padding:0 0.6rem; border:1px solid #cbd5e1; border-radius:6px; font-size:0.82rem; width:100%; min-width:230px; max-width:250px;">
                        <button type="button"
                                onclick="window.enviarAtestadoContabilidade(${existingDoc.id}, 'contab-email-${existingDoc.id}', this)"
                                style="height:36px; display:flex; align-items:center; justify-content:center; gap:6px; background:#0f4c81; color:#fff; border:none; border-radius:6px; padding:0 0.85rem; font-size:0.82rem; font-weight:600; cursor:pointer; white-space:nowrap; width:100%; min-width:230px; max-width:250px;">
                            <i class="ph ph-buildings"></i> Enviar para Contabilidade
                        </button>
                    </div>` : ''}
                </div>
            `}
        </div>
    `;

    div.innerHTML = infoHtml + actionsHtml;
    return div;
}

function createDynamicUploadForm(tabId, btnLabel, defaultDocType = '') {
    const showVencimento = tabId !== 'Advertências';
    const div = document.createElement('div');
    div.className = 'mb-4 card p-3 bg-light form-dyn';
    div.innerHTML = `
        <div style="display: flex; gap: 1rem; flex-wrap: wrap; align-items: flex-end;">
            <div style="flex: 2; min-width: 200px;">
                <input type="text" id="dyn-doc-type-${tabId}" class="form-control" placeholder="Nome do Documento / Motivo" value="${defaultDocType}" style="padding: 0.5rem; border-radius:4px; border:1px solid #ccc; width: 100%;">
            </div>
            ${showVencimento ? `
            <div style="flex: 1; min-width: 140px;">
                <label style="font-size: 0.75rem; font-weight: 600; color: #64748b; margin-bottom: 2px; display: block;">${tabId === 'ASO' ? 'Data do Exame (opcional)' : 'Vencimento (opcional)'}</label>
                <input type="date" id="dyn-doc-venc-${tabId}" class="form-control" style="padding: 0.5rem; border-radius:4px; border:1px solid #ccc; width: 100%;">
            </div>
            ` : ''}
            ${tabId === 'Certificados' ? `
            <div style="flex: 1; min-width: 140px;">
                <label style="font-size: 0.75rem; font-weight: 600; color: #64748b; margin-bottom: 2px; display: flex;">Exige Assinatura?</label>
                <div style="display:flex; gap:0.5rem; height: 38px; align-items:center; font-size: 0.82rem; font-weight: 500;">
                    <label style="margin:0; display:flex; align-items:center; gap:4px; cursor:pointer;"><input type="radio" name="dyn-assin-${tabId}" value="PENDENTE" checked> Sim</label>
                    <label style="margin:0; display:flex; align-items:center; gap:4px; cursor:pointer;"><input type="radio" name="dyn-assin-${tabId}" value="NAO_EXIGE"> Não</label>
                </div>
            </div>
            ` : ''}
            <div>
                <label class="btn btn-primary" style="margin-bottom: 0px; height: 38px; display: flex; align-items: center;">
                    <i class="ph ph-plus"></i> ${btnLabel}
                    <input type="file" accept=".pdf" style="display:none;" onchange="uploadDynamicDocument(this, '${tabId}')">
                </label>
            </div>
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

    // Dados do envio anterior (se houver)
    const emailEnviado = viewedColaborador ? viewedColaborador.aso_email_enviado : null;
    const exameData    = viewedColaborador ? viewedColaborador.aso_exame_data : null;
    const noticeHtml = emailEnviado
        ? `<div style="display:flex; align-items:center; flex-wrap:wrap; gap:8px; background:#f0fdf4; border:1.5px solid #bbf7d0; border-radius:10px; padding:10px 14px; margin-bottom:1rem; font-size:0.85rem; font-weight:600;">
               <div style="display:flex; align-items:center; gap:6px; color:#059669;">
                   <i class="ph ph-check-circle" style="font-size:1.2rem;"></i>
                   <span>E-mail enviado para a IACI em <strong>${emailEnviado}</strong></span>
               </div>
               ${exameData ? `<span style="color:#64748b;">-</span><div style="display:flex; align-items:center; gap:4px; color:#1d4ed8;"><i class="ph ph-calendar-blank" style="font-size:1.1rem;"></i> <span>Exame agendado: <strong>${exameData}</strong></span></div>` : ''}
           </div>`
        : '';

    const selectorHtml = `
        <div class="card p-3 mb-4 bg-light" style="display:flex; gap:1.5rem; align-items:center;">
            <label style="margin:0; font-weight:600;">Ano do ASO/Exames:</label>
            <select id="aso_year" class="form-control" style="padding:0.4rem; max-width:120px;" onchange="renderASOAno()">
                ${optionsHtml}
            </select>
        </div>

        <!-- Card IACI -->
        <div class="card p-3 mb-4" style="background:#f8fafc; border:1.5px dashed #e2e8f0; border-radius:12px;">
            <h4 style="font-size:0.9rem; color:#64748b; margin-bottom:0.75rem; font-weight:600;">
                <i class="ph ph-envelope-simple"></i> Enviar Solicitação de Exame à IACI
            </h4>
            ${noticeHtml}
            <div style="display:flex; gap:0.75rem; align-items:flex-end; flex-wrap:wrap;">
                <div class="input-group" style="width:160px; flex-shrink:0; margin-bottom:0;">
                    <label style="font-size:0.75rem; font-weight:700;">Data Agendada</label>
                    <input type="date" id="aso-exame-data-tab" style="padding:0.5rem; font-size:0.85rem; height:38px;"
                           value="${exameData ? exameData.split('/').reverse().join('-') : ''}">
                </div>
                <div class="input-group" style="flex:1; min-width:200px; margin-bottom:0;">
                    <label style="font-size:0.75rem; font-weight:700;">Destinatário</label>
                    <input type="email" id="aso-email-dest-tab" value="thais.ricci@americarental.com.br"
                           style="padding:0.5rem; font-size:0.85rem; height:38px;">
                </div>
                <button class="btn btn-primary" id="btn-enviar-aso-email-tab"
                        onclick="window.sendASOEmailTab()"
                        style="height:38px; white-space:nowrap; padding:0 1.2rem; display:flex; align-items:center; gap:8px;">
                    <i class="ph ph-paper-plane-tilt"></i> Enviar Solicitação
                </button>
            </div>
        </div>

        <div id="aso_ano_container"></div>
    `;
    container.innerHTML = selectorHtml;
    renderASOAno();
}

// Função específica para envio pela aba ASO (não conflita com a de Admissão)
window.sendASOEmailTab = async function() {
    if (!viewedColaborador) { alert('Colaborador não selecionado.'); return; }

    const dataExame  = document.getElementById('aso-exame-data-tab').value;
    const destinatario = document.getElementById('aso-email-dest-tab').value;
    if (!dataExame) { alert('Selecione a data do exame.'); return; }

    const [y, m, d] = dataExame.split('-');
    const dt = `${d}/${m}/${y}`;
    const cargo = (viewedColaborador.cargo || '').toLowerCase();
    const exames = cargo.includes('motorista')
        ? 'Exames Complementares, acuidade visual, E.E.G, E.C.G e Glicemia.'
        : 'Exame Padrão';

    const mailBody = `Título: Exame Médico\n\nSegue abaixo as informações para a realização do exame do colaborador.\n\nData: ${dt}\nNome: ${viewedColaborador.nome_completo || viewedColaborador.nome}\nCPF: ${viewedColaborador.cpf || '-'}\nFunção: ${viewedColaborador.cargo || '-'}\nDepartamento: ${viewedColaborador.departamento || '-'}\n\nExames:\n${exames}\n\n⚠️ IMPORTANTE:\nApós o exame ficar pronto, favor enviar o documento por e-mail para: rh@americarental.com.br`;

    const btn = document.getElementById('btn-enviar-aso-email-tab');
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
            alert('✅ E-mail enviado com sucesso para a IACI!');
            // Recarregar aba para mostrar aviso
            viewedColaborador.aso_email_enviado = res.data_envio;
            viewedColaborador.aso_exame_data    = res.data_agendada;
            const activeTab = document.querySelector('#tabs-list li.active');
            if (activeTab) renderTabContent(activeTab.dataset.tab, activeTab.textContent, true);
        } else {
            throw new Error(res.error || 'Erro no servidor');
        }
    } catch (e) {
        if (confirm(`Não foi possível enviar automaticamente. Erro do Servidor:\n\n${e.message}\n\nDeseja abrir seu e-mail com o texto preenchido?`)) {
            window.location.href = `mailto:${destinatario}?cc=rh@americarental.com.br,rh2@americarental.com.br&subject=Exame Médico - ${viewedColaborador.nome_completo || viewedColaborador.nome}&body=${encodeURIComponent(mailBody)}`;
        }
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = originalContent; }
    }
};



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
    if (isMotorista) list.push('Exames Complementares');
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

async function renderFaltasTab(container) {
    if (!viewedColaborador) return;
    const colabId = viewedColaborador.id;

    container.innerHTML = '<p style="color:#64748b; padding:1rem;">Carregando faltas...</p>';

    const faltas = await apiGet(`/colaboradores/${colabId}/faltas`).catch(() => []);

    const formatDateBR = (iso) => {
        if (!iso) return '-';
        const [y, m, d] = iso.split('-');
        return `${d}/${m}/${y}`;
    };

    const turnoColor = { 'Dia todo': '#e03131', 'Manhã': '#f08c00', 'Tarde': '#1971c2' };

    const tableRows = faltas.length === 0
        ? `<tr><td colspan="4" style="text-align:center; color:#94a3b8; padding:1.5rem;">Nenhuma falta registrada.</td></tr>`
        : faltas.map(f => `
            <tr style="border-bottom:1px solid #f1f5f9;">
                <td style="padding:0.65rem 0.75rem; font-weight:600;">${formatDateBR(f.data_falta)}</td>
                <td style="padding:0.65rem 0.75rem;">
                    <span style="background:${turnoColor[f.turno] || '#64748b'}; color:#fff; padding:2px 10px; border-radius:10px; font-size:0.75rem; font-weight:700;">${f.turno}</span>
                </td>
                <td style="padding:0.65rem 0.75rem; color:#475569; font-size:0.88rem;">${f.observacao || '—'}</td>
                <td style="padding:0.65rem 0.75rem; text-align:right;">
                    <button onclick="window.deletarFalta(${f.id}, this)" style="background:none; border:none; cursor:pointer; color:#e03131;" title="Excluir">
                        <i class="ph ph-trash" style="font-size:1.1rem;"></i>
                    </button>
                </td>
            </tr>`).join('');

    container.innerHTML = `
        <!-- Formulário de registro -->
        <div style="background:#fff; border:1px solid #e2e8f0; border-radius:10px; padding:1.25rem; margin-bottom:1.5rem;">
            <h4 style="margin:0 0 1rem; font-size:1rem; color:#1e293b; display:flex; align-items:center; gap:8px;">
                <i class="ph ph-calendar-x" style="color:#e03131;"></i> Registrar Falta
            </h4>
            <div style="display:flex; gap:0.75rem; flex-wrap:wrap; align-items:flex-end;">
                <div style="display:flex; flex-direction:column; gap:0.25rem;">
                    <label style="font-size:0.8rem; font-weight:600; color:#475569;">Data da Falta</label>
                    <input type="date" id="falta-data" style="height:38px; padding:0 0.6rem; border:1px solid #cbd5e1; border-radius:6px; font-size:0.9rem;">
                </div>
                <div style="display:flex; flex-direction:column; gap:0.25rem;">
                    <label style="font-size:0.8rem; font-weight:600; color:#475569;">Turno</label>
                    <select id="falta-turno" style="height:38px; padding:0 0.6rem; border:1px solid #cbd5e1; border-radius:6px; font-size:0.9rem;">
                        <option value="Dia todo">Dia todo</option>
                        <option value="Manhã">Manhã</option>
                        <option value="Tarde">Tarde</option>
                    </select>
                </div>
                <div style="display:flex; flex-direction:column; gap:0.25rem; flex:1; min-width:180px;">
                    <label style="font-size:0.8rem; font-weight:600; color:#475569;">Observação (opcional)</label>
                    <input type="text" id="falta-obs" placeholder="Ex: não comunicou, sem justificativa..." style="height:38px; padding:0 0.6rem; border:1px solid #cbd5e1; border-radius:6px; font-size:0.9rem;">
                </div>
                <button onclick="window.registrarFalta()" style="height:38px; background:#e03131; color:#fff; border:none; border-radius:6px; padding:0 1.2rem; font-size:0.88rem; font-weight:700; cursor:pointer; white-space:nowrap; display:inline-flex; align-items:center; gap:6px;">
                    <i class="ph ph-plus"></i> Registrar
                </button>
            </div>
        </div>

        <!-- Lista de faltas -->
        <div style="background:#fff; border:1px solid #e2e8f0; border-radius:10px; overflow:hidden;">
            <div style="padding:0.85rem 1rem; background:#fef2f2; border-bottom:1px solid #fce7e7; display:flex; align-items:center; gap:8px;">
                <i class="ph ph-calendar-x" style="color:#e03131;"></i>
                <span style="font-weight:700; color:#1e293b;">Faltas Registradas</span>
                <span style="margin-left:auto; background:#e03131; color:#fff; border-radius:12px; padding:1px 10px; font-size:0.8rem; font-weight:700;">${faltas.length} falta${faltas.length !== 1 ? 's' : ''}</span>
            </div>
            <table style="width:100%; border-collapse:collapse; font-size:0.9rem;">
                <thead>
                    <tr style="background:#f8fafc; text-align:left;">
                        <th style="padding:0.6rem 0.75rem; color:#64748b; font-size:0.78rem; text-transform:uppercase;">Data</th>
                        <th style="padding:0.6rem 0.75rem; color:#64748b; font-size:0.78rem; text-transform:uppercase;">Turno</th>
                        <th style="padding:0.6rem 0.75rem; color:#64748b; font-size:0.78rem; text-transform:uppercase;">Observação</th>
                        <th style="padding:0.6rem 0.75rem;"></th>
                    </tr>
                </thead>
                <tbody>${tableRows}</tbody>
            </table>
        </div>
    `;
}

window.registrarFalta = async function() {
    const data = document.getElementById('falta-data')?.value;
    const turno = document.getElementById('falta-turno')?.value;
    const obs = document.getElementById('falta-obs')?.value || '';
    if (!data) { alert('Informe a data da falta.'); return; }
    if (!viewedColaborador) return;

    try {
        await apiPost('/faltas', { colaborador_id: viewedColaborador.id, data_falta: data, turno, observacao: obs });
        // Recarregar aba
        const listContainer = document.getElementById('docs-list-container');
        if (listContainer) await renderFaltasTab(listContainer);
    } catch(e) { alert('Erro ao registrar falta: ' + e.message); }
};

window.deletarFalta = async function(id, btn) {
    if (!confirm('Excluir esta falta?')) return;
    btn.disabled = true;
    try {
        await apiDelete(`/faltas/${id}`);
        const listContainer = document.getElementById('docs-list-container');
        if (listContainer) await renderFaltasTab(listContainer);
    } catch(e) { alert('Erro ao excluir: ' + e.message); btn.disabled = false; }
};

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
            .cid-input-group { position:relative; flex:2; min-width:150px; z-index: 8; }
            .cid-dropdown { position:absolute; top:100%; left:0; right:0; background:#fff; border:1px solid #ccc; border-radius:4px; z-index:99999; max-height:220px; overflow-y:auto; box-shadow:0 4px 12px rgba(0,0,0,.12); }
            .cid-option { padding:.55rem .85rem; cursor:pointer; font-size:.85rem; line-height:1.4; }
            .cid-option:hover, .cid-option.selected { background:#e8f0fe; }
            .cid-option strong { color:#1a73e8; }
            .cid-badge { display:inline-block; background:#e8f0fe; color:#1a73e8; border:1px solid #aac4f5; border-radius:4px; padding:.2rem .6rem; font-size:.8rem; font-weight:600; white-space:nowrap; }
        `;
        document.head.appendChild(s);
    }

    container.innerHTML = `
        <div class="card p-3 mb-4 bg-light" style="overflow: visible;">
            <div style="display:flex; gap:0.75rem; align-items:flex-end; flex-wrap:nowrap; width:100%;">
                <!-- Ano -->
                <div style="flex-shrink:0;">
                    <label style="font-size:0.75rem; font-weight:600; color:#2c5282; margin-bottom:3px; display:block;">Ano</label>
                    <select id="atestados_year" class="form-control" style="padding:0.4rem; width:80px;" onchange="renderAtestadosAno()">
                        ${optionsHtml}
                    </select>
                </div>
                
                <!-- CID-10 -->
                <div class="cid-input-group" style="flex:2; min-width:150px; position:relative;">
                    <label style="font-size:0.75rem; font-weight:600; color:#2c5282; margin-bottom:3px; display:block;"><i class="ph ph-magnifying-glass"></i> CID-10</label>
                    <input type="text" id="cid-search" class="form-control" placeholder="J06 - Outros exames..." autocomplete="off" oninput="searchCID(this.value)" style="padding:.4rem;">
                    <div id="cid-dropdown" class="cid-dropdown" style="display:none;"></div>
                </div>

                <!-- Tipo de Atestado -->
                <div style="flex-shrink:0;">
                    <label style="font-size:0.75rem; font-weight:600; color:#2c5282; margin-bottom:3px; display:block;">Tipo de Atestado</label>
                    <select id="atestado_tipo" class="form-control" style="padding:0.4rem; width:120px;" onchange="toggleAtestadoPeriodFields()">
                        <option value="dias">Dias</option>
                        <option value="horas">Horas</option>
                    </select>
                </div>
                
                <!-- Campos Dias -->
                <div id="atestado-dias-fields" style="display:flex; gap:1rem; flex-shrink:0; align-items:flex-end;">
                    <div>
                        <label style="font-size:0.75rem; font-weight:600; color:#2c5282; margin-bottom:3px; display:block;">Data Início</label>
                        <input type="date" id="atestado_inicio_dia" class="form-control" style="padding:0.4rem; width:130px;" oninput="calcAtestadoFim()">
                    </div>
                    <div>
                        <label style="font-size:0.75rem; font-weight:600; color:#2c5282; margin-bottom:3px; display:block;">Qtd. Dias</label>
                        <input type="number" id="atestado_qtd_dias" class="form-control" min="1" value="1" style="padding:0.4rem; width:75px;" oninput="calcAtestadoFim()">
                    </div>
                    <div>
                        <label style="font-size:0.75rem; font-weight:600; color:#94a3b8; margin-bottom:3px; display:block;">Término (calc.)</label>
                        <input type="date" id="atestado_fim_dia" class="form-control" style="padding:0.4rem; width:130px; background:#f1f5f9; color:#64748b;" readonly>
                    </div>
                </div>

                <!-- Campos Horas -->
                <div id="atestado-horas-fields" style="display:none; gap:1rem; flex-shrink:0;">
                    <div>
                        <label style="font-size:0.75rem; font-weight:600; color:#2c5282; margin-bottom:3px; display:block;">Horário Início</label>
                        <input type="time" id="atestado_inicio_hora" class="form-control" style="padding:0.4rem; width:110px;">
                    </div>
                    <div>
                        <label style="font-size:0.75rem; font-weight:600; color:#2c5282; margin-bottom:3px; display:block;">Horário Fim</label>
                        <input type="time" id="atestado_fim_hora" class="form-control" style="padding:0.4rem; width:110px;">
                    </div>
                </div>

                <!-- Upload Button -->
                <div style="flex-shrink:0;">
                    <input type="file" id="cid-file-input" accept=".pdf,image/*" style="display:none;" onchange="uploadAtestadoWithCID(this)">
                    <button type="button" id="cid-upload-btn" class="btn btn-primary" onclick="window.triggerAtestadoUpload()"
                            style="height:38px; width:45px; display:flex; align-items:center; justify-content:center; padding:0; border-radius:6px; font-size:1.2rem; background:#0056b3; border:none; margin-bottom: 2px;">
                        <i class="ph ph-upload-simple" id="cid-upload-icon"></i>
                    </button>
                </div>
            </div>
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
    
    const todayStr = new Date().toISOString().split('T')[0];
    document.getElementById('atestado_inicio_dia').value = todayStr;
    document.getElementById('atestado_qtd_dias').value = '1';
    calcAtestadoFim();
}

window.triggerAtestadoUpload = function() {
    if (!selectedCID) {
        alert('Selecione primeiro qual é o CID (código) do atestado digitando na barra de busca!');
        const s = document.getElementById('cid-search');
        if (s) { s.focus(); s.style.border = '2px solid red'; setTimeout(()=> s.style.border='', 2000); }
        return;
    }
    document.getElementById('cid-file-input').click();
}

window.toggleAtestadoPeriodFields = function() {
    const tipo = document.getElementById('atestado_tipo').value;
    if (tipo === 'dias') {
        document.getElementById('atestado-dias-fields').style.display = 'flex';
        document.getElementById('atestado-horas-fields').style.display = 'none';
    } else {
        document.getElementById('atestado-dias-fields').style.display = 'none';
        document.getElementById('atestado-horas-fields').style.display = 'flex';
    }
}

// Calcula data de término automaticamente
window.calcAtestadoFim = function() {
    const inicio = document.getElementById('atestado_inicio_dia')?.value;
    const qtd = parseInt(document.getElementById('atestado_qtd_dias')?.value, 10) || 1;
    const fimEl = document.getElementById('atestado_fim_dia');
    if (!fimEl) return;
    if (!inicio) { fimEl.value = ''; return; }
    const d = new Date(inicio + 'T12:00:00');
    d.setDate(d.getDate() + qtd - 1);
    fimEl.value = d.toISOString().split('T')[0];
};

window.uploadAtestadoWithCID = async function(inputEl) {
    const file = inputEl.files[0];
    if (!file || !selectedCID) return;
    if (!viewedColaborador) { alert('Colaborador não selecionado.'); return; }

    // Loading state
    const uploadBtn   = document.getElementById('cid-upload-btn');
    const uploadIcon  = document.getElementById('cid-upload-icon');
    if (uploadBtn) { uploadBtn.style.opacity = '0.7'; uploadBtn.style.pointerEvents = 'none'; }
    if (uploadIcon)  uploadIcon.className = 'ph ph-spinner ph-spin';

    // Gerar nome no padrão Z01_DD-MM-AA_NomeColab
    const today = new Date();
    const dd  = String(today.getDate()).padStart(2, '0');
    const mm  = String(today.getMonth() + 1).padStart(2, '0');
    const aa  = String(today.getFullYear()).slice(2);
    const nomeColabNorm = (viewedColaborador.nome_completo || viewedColaborador.nome || 'COLAB')
        .toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Z0-9]+/g, '_');
    const customName = `${selectedCID.code}_${dd}-${mm}-${aa}_${nomeColabNorm}`;

    const typeIn = `${selectedCID.code} - ${selectedCID.desc.substring(0, 60)}`;
    const year = document.getElementById('atestados_year') ? document.getElementById('atestados_year').value : today.getFullYear().toString();

    const formData = new FormData();
    formData.append('colaborador_id', viewedColaborador.id);
    formData.append('colaborador_nome', viewedColaborador.nome || 'Desconhecido');
    formData.append('tab_name', 'Atestados');
    formData.append('document_type', typeIn);
    formData.append('custom_name', customName);
    formData.append('year', year);

    // Campos de período
    const tipo = document.getElementById('atestado_tipo').value;
    formData.append('atestado_tipo', tipo);
    if (tipo === 'dias') {
        const inicioVal = document.getElementById('atestado_inicio_dia').value;
        const fimVal = document.getElementById('atestado_fim_dia').value;
        if (!inicioVal) { alert('Informe a Data de Início do atestado.'); return; }
        formData.append('atestado_inicio', inicioVal);
        formData.append('atestado_fim', fimVal || inicioVal);
    } else {
        formData.append('atestado_inicio', document.getElementById('atestado_inicio_hora').value);
        formData.append('atestado_fim', document.getElementById('atestado_fim_hora').value);
    }

    formData.append('file', file);

    try {
        const res = await fetch(`${API_URL}/documentos`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${currentToken}` },
            body: formData
        });
        if (res.ok) {
            const inicioSaved = formData.get('atestado_inicio');
            const fimSaved    = formData.get('atestado_fim');
            selectedCID = null;
            document.getElementById('cid-search').value = '';
            document.getElementById('atestado_inicio_dia').value = '';
            if (document.getElementById('atestado_qtd_dias')) document.getElementById('atestado_qtd_dias').value = '1';
            document.getElementById('atestado_fim_dia').value = '';

            // Atualizar badge de status se atestado cobre hoje
            if (tipo === 'dias' && inicioSaved && fimSaved) {
                const todayStr = new Date().toISOString().split('T')[0];
                if (todayStr >= inicioSaved && todayStr <= fimSaved) {
                    viewedColaborador.status = 'Afastado';
                }
            }

            await loadDocumentosList();
            renderAtestadosAno();

            // Toast de sucesso
            const toast = document.createElement('div');
            toast.innerHTML = '<i class="ph ph-check-circle"></i> Atestado enviado com sucesso!';
            toast.style.cssText = 'position:fixed;bottom:30px;left:50%;transform:translateX(-50%);background:#2f9e44;color:#fff;padding:0.75rem 1.75rem;border-radius:10px;font-weight:600;font-size:0.95rem;z-index:99999;box-shadow:0 6px 20px rgba(0,0,0,0.25);display:flex;align-items:center;gap:0.5rem;';
            document.body.appendChild(toast);
            setTimeout(() => toast.remove(), 3500);

        } else {
            const errData = await res.json().catch(() => ({}));
            alert('Erro ao enviar atestado: ' + (errData.error || res.statusText));
        }
    } catch (e) { alert('Erro: ' + e.message); } finally {
        if (uploadBtn) { uploadBtn.style.opacity = ''; uploadBtn.style.pointerEvents = ''; }
        if (uploadIcon) uploadIcon.className = 'ph ph-upload-simple';
    }
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
            const isAdmActive = viewAdm && viewAdm.classList.contains('active');
            
            if (isAdmActive && viewedColaborador) {
                updateAdmissaoStepPercentages();
                initAdmissaoWorkflow(viewedColaborador.id, window.currentActiveAdmissaoStep, true);
            } else {
                const activeTab = document.querySelector('#tabs-list li.active');
                if (activeTab) {
                    renderTabContent(activeTab.dataset.tab, activeTab.textContent);
                }
            }
        } else {
            alert('Erro ao salvar nova validade.');
        }
    } catch(e) { alert('Erro: ' + e.message); }
};

window.enviarAtestadoContabilidade = async function(docId, emailInputId, btn) {
    const emailInput = document.getElementById(emailInputId);
    const email = emailInput ? emailInput.value.trim() : '';
    if (!email) { alert('Informe o e-mail da contabilidade.'); return; }

    const originalHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Enviando...';

    try {
        const res = await apiPost('/send-atestado-contabilidade', { document_id: docId, email_to: email });
        if (res && res.sucesso) {
            btn.innerHTML = '<i class="ph ph-check-circle"></i> Enviado!';
            btn.style.background = '#2f9e44';
            
            // Reload the documents to show the updated timestamp immediately
            if (viewedColaborador) {
                apiGet(`/colaboradores/${viewedColaborador.id}/documentos`).then(docs => {
                    if (docs) {
                        currentDocs = docs;
                        const activeTab = document.querySelector('#tabs-list li.active');
                        if (activeTab) {
                            renderTabContent(activeTab.dataset.tab, activeTab.textContent, true);
                        }
                    }
                }).catch(err => console.warn('Falha ao recarregar atestados:', err));
            }
            
            setTimeout(() => { btn.innerHTML = originalHtml; btn.style.background = ''; btn.disabled = false; }, 3000);
        } else {
            throw new Error(res?.error || 'Erro desconhecido');
        }
    } catch (e) {
        alert('Erro ao enviar: ' + e.message);
        btn.disabled = false;
        btn.innerHTML = originalHtml;
    }
};

window.enviarSuspensaoContabilidade = async function(docId, emailInputId, btn) {
    const emailInput = document.getElementById(emailInputId);
    const email = emailInput ? emailInput.value.trim() : '';
    if (!email) { alert('Informe o e-mail da contabilidade.'); return; }

    const originalHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Enviando...';

    try {
        const res = await apiPost('/send-suspensao-contabilidade', { document_id: docId, email_to: email });
        if (res && res.sucesso) {
            btn.innerHTML = '<i class="ph ph-check-circle"></i> Enviado!';
            btn.style.background = '#2f9e44';
            setTimeout(() => { btn.innerHTML = originalHtml; btn.style.background = ''; btn.disabled = false; }, 3000);
        } else {
            throw new Error(res?.error || 'Erro desconhecido');
        }
    } catch (e) {
        alert('Erro ao enviar: ' + e.message);
        btn.disabled = false;
        btn.innerHTML = originalHtml;
    }
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
        const slot = createDocSlot('Atestados', d.document_type, d, `'${y}'`);
        listContainer.appendChild(slot);
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

window.uploadDocument = async function(inputEl, tabId, docType, year = null, month = null, vencimento = null, reqAssin = null) {
    const file = inputEl.files[0];
    if (!file) return;

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
        alert('Apenas arquivos PDF sao permitidos.');
        inputEl.value = '';
        return;
    }

    if (!viewedColaborador) {
        alert('Colaborador nao selecionado.');
        return;
    }

    // Feedback visual imediato: spinner no label
    const labelBtn = inputEl.closest('label');
    const originalLabelHtml = labelBtn ? labelBtn.innerHTML : '';
    if (labelBtn) {
        labelBtn.style.pointerEvents = 'none';
        labelBtn.style.opacity = '0.7';
        labelBtn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Enviando...';
    }

    const formData = new FormData();
    formData.append('colaborador_id', viewedColaborador.id);
    formData.append('colaborador_nome', viewedColaborador.nome_completo || 'Desconhecido');
    formData.append('tab_name', tabId);
    formData.append('document_type', docType);

    const cleanYear = year ? String(year).replace(/'/g, '').trim() : '';
    const cleanMonth = month ? String(month).replace(/'/g, '').trim() : '';

    if(cleanYear && cleanYear !== 'null' && cleanYear !== 'undefined') formData.append('year', cleanYear);
    if(cleanMonth && cleanMonth !== 'null' && cleanMonth !== 'undefined') formData.append('month', cleanMonth);
    if(vencimento) formData.append('vencimento', vencimento);
    if(reqAssin) formData.append('assinafy_status', reqAssin);
    formData.append('file', file);

    try {
        const res = await fetch(`${API_URL}/documentos`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${currentToken}` },
            body: formData
        });
        if(res.ok) {
            const newDoc = await res.json();

            // Atualizacao otimista imediata do card no DOM
            const docItem = inputEl.closest('.doc-item');
            if (docItem && newDoc && newDoc.id) {
                const fakeDoc = {
                    id: newDoc.id,
                    file_name: file.name,
                    upload_date: new Date().toISOString(),
                    vencimento: vencimento || null,
                    assinafy_status: 'Nenhum',
                    assinafy_sent_at: null,
                    tab_name: tabId,
                    document_type: docType
                };
                const newSlot = createDocSlot(tabId, docType, fakeDoc, year, month);
                docItem.replaceWith(newSlot);
            }

            // Sincronizar em background
            loadDocumentosList().then(() => {
                const viewAdm = document.getElementById('view-admissao');
                const viewPront = document.getElementById('view-prontuario');
                const isAdmActive = viewAdm && viewAdm.classList.contains('active');
                const isProntActive = viewPront && viewPront.classList.contains('active');

                if (isAdmActive && viewedColaborador) {
                    updateAdmissaoStepPercentages();
                    initAdmissaoWorkflow(viewedColaborador.id, window.currentActiveAdmissaoStep, true);
                } else if (isProntActive) {
                    const activeTab = document.querySelector('#tabs-list li.active');
                    if(activeTab) renderTabContent(activeTab.dataset.tab, activeTab.textContent, true);
                }
            });
        } else {
            if (labelBtn) {
                labelBtn.innerHTML = originalLabelHtml;
                labelBtn.style.pointerEvents = '';
                labelBtn.style.opacity = '';
            }
            alert('Erro no upload.');
        }
    } catch(e) {
        if (labelBtn) {
            labelBtn.innerHTML = originalLabelHtml;
            labelBtn.style.pointerEvents = '';
            labelBtn.style.opacity = '';
        }
        console.error(e);
    }
}

window.uploadDynamicDocument = function(inputEl, tabId) {
    const docTypeInput = document.getElementById(`dyn-doc-type-${tabId}`);
    const docVencInput = document.getElementById(`dyn-doc-venc-${tabId}`);
    
    const docType = docTypeInput ? docTypeInput.value.trim() : 'Documento Extra';
    const vencimento = docVencInput && docVencInput.value ? docVencInput.value : null;

    if (!docType) return alert('Insira o nome ou motivo do documento.');

    let reqAssin = null;
    if (tabId === 'Certificados') {
        const checkedRadio = document.querySelector(`input[name="dyn-assin-${tabId}"]:checked`);
        if (checkedRadio) reqAssin = checkedRadio.value;
    }

    uploadDocument(inputEl, tabId, docType, null, null, vencimento, reqAssin);
}

window.deleteDoc = async function(docId, btnEl) {
    // Remoção otimista: esconde o card imediatamente para feedback visual instantâneo
    const docCard = btnEl ? btnEl.closest('.doc-item') : null;
    if (docCard) {
        docCard.style.transition = 'opacity 0.2s ease';
        docCard.style.opacity = '0.3';
        docCard.style.pointerEvents = 'none';
    }

    try {
        const res = await fetch(`${API_URL}/documentos/${docId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        if(res.ok) {
            // Remover o card do DOM imediatamente
            if (docCard) docCard.remove();

            // Atualizar lista em memória e re-renderizar a aba em background
            await loadDocumentosList();

            const viewAdm = document.getElementById('view-admissao');
            const viewPront = document.getElementById('view-prontuario');
            const isAdmActive = viewAdm && viewAdm.classList.contains('active');
            const isProntActive = viewPront && viewPront.classList.contains('active');

            if (isAdmActive && viewedColaborador) {
                updateAdmissaoStepPercentages();
                initAdmissaoWorkflow(viewedColaborador.id, window.currentActiveAdmissaoStep, true);
            } else if (isProntActive) {
                const activeTab = document.querySelector('#tabs-list li.active');
                if (activeTab) {
                    renderTabContent(activeTab.dataset.tab, activeTab.textContent, true);
                }
            }
        } else {
            // Reverter a remoção otimista em caso de erro
            if (docCard) {
                docCard.style.opacity = '1';
                docCard.style.pointerEvents = 'auto';
            }
            alert('Erro ao excluir o documento. Tente novamente.');
        }
    } catch(e) {
        // Reverter em caso de falha de rede
        if (docCard) {
            docCard.style.opacity = '1';
            docCard.style.pointerEvents = 'auto';
        }
        console.error(e);
    }
}

window.viewDoc = async function(docId) {
    const viewUrl = `${API_URL}/documentos/view/${docId}?token=${currentToken}`;
    const downloadUrl = `${API_URL}/documentos/download/${docId}?token=${currentToken}`;

    const modalBody = document.getElementById('modal-doc-body');
    if (modalBody) {
        modalBody.innerHTML = `<iframe src="${viewUrl}" style="width:100%; height:100%; border:none; display:block;"></iframe>`;
    }

    const btnDownload = document.getElementById('btn-download-doc');
    if (btnDownload) {
        btnDownload.onclick = () => {
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = '';
            a.click();
        };
    }

    const modal = document.getElementById('doc-modal');
    if (modal) modal.style.display = 'flex';
}
window.viewAssinado = async function(docId) {
    const url = `${API_URL}/documentos/download-assinado/${docId}`;
    try {
        document.body.style.cursor = 'wait';
        const res = await fetch(url, { headers: { 'Authorization': `Bearer ${currentToken}` } });
        document.body.style.cursor = 'default';
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            alert(err.error || 'PDF assinado ainda não está disponível.');
            return;
        }
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);

        // Obter filename do header
        let fileName = `Documento_Assinado_${docId}.pdf`;
        const cd = res.headers.get('content-disposition');
        if (cd) { const m = cd.match(/filename=\"?([^\"]+)\"?/); if (m && m[1]) fileName = decodeURIComponent(m[1]); }

        // Criar overlay fullscreen
        const overlay = document.createElement('div');
        overlay.id = 'pdf-signed-overlay';
        overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:99999;background:rgba(0,0,0,0.92);display:flex;flex-direction:column;';
        overlay.innerHTML = `
            <div style="display:flex;align-items:center;justify-content:space-between;padding:0.75rem 1.25rem;background:#1e293b;flex-shrink:0;">
                <span style="color:#fff;font-weight:700;font-size:0.95rem;"><i class="ph ph-file-pdf" style="color:#2f9e44;margin-right:6px;"></i>${fileName}</span>
                <div style="display:flex;gap:0.75rem;align-items:center;">
                    <button id="btn-download-signed-pdf" style="display:inline-flex;align-items:center;gap:6px;background:#2f9e44;color:#fff;border:none;border-radius:6px;padding:0.4rem 1rem;font-size:0.85rem;font-weight:700;cursor:pointer;">
                        <i class="ph ph-download-simple"></i> Baixar PDF
                    </button>
                    <button onclick="document.getElementById('pdf-signed-overlay').remove(); URL.revokeObjectURL('${blobUrl}');" style="display:inline-flex;align-items:center;gap:6px;background:#475569;color:#fff;border:none;border-radius:6px;padding:0.4rem 0.9rem;font-size:0.85rem;font-weight:700;cursor:pointer;">
                        <i class="ph ph-x"></i> Fechar
                    </button>
                </div>
            </div>
            <iframe src="${blobUrl}" style="flex:1;width:100%;border:none;"></iframe>
        `;
        document.body.appendChild(overlay);

        // Botão de download
        document.getElementById('btn-download-signed-pdf').addEventListener('click', () => {
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = fileName;
            a.click();
        });
    } catch(e) {
        document.body.style.cursor = 'default';
        alert('Erro ao abrir o PDF assinado: ' + e.message);
    }
};

window.downloadAssinado = async function(docId) {
    const url = `${API_URL}/documentos/download-assinado/${docId}`;
    try {
        let handle = null;
        // Pede a pasta ao usuário antes do fetch para garantir que não perde o foco/evento de clique do navegador (exigência de segurança do Chrome)
        if (window.showSaveFilePicker) {
            try {
                handle = await window.showSaveFilePicker({
                    suggestedName: 'Documento_Assinado_' + docId + '.pdf',
                    types: [{ description: 'Documento PDF', accept: { 'application/pdf': ['.pdf'] } }]
                });
            } catch (e) {
                if (e.name === 'AbortError') return; // Usuário cancelou a janela Salvar Como
            }
        }

        // Adiciona um aviso visual (cursor carregando) caso o download demore
        document.body.style.cursor = 'wait';

        const res = await fetch(url, { headers: { 'Authorization': `Bearer ${currentToken}` } });
        if (!res.ok) {
            document.body.style.cursor = 'default';
            const err = await res.json().catch(() => ({}));
            alert(err.error || 'PDF assinado ainda não está pronto para download. Tente via Atualizar.');
            return;
        }

        const blob = await res.blob();
        document.body.style.cursor = 'default';

        if (handle) {
            const writable = await handle.createWritable();
            await writable.write(blob);
            await writable.close();
            return; // Sucesso, arquivo salvo onde o usuário quis
        }

        // Fallback: se o navegador não suportar a janela Salvar Como (ex: Safari antigo, Firefox padrão)
        let fileName = 'documento_assinado_' + docId + '.pdf';
        const disposition = res.headers.get('content-disposition');
        if (disposition && disposition.indexOf('filename=') !== -1) {
            const match = disposition.match(/filename="?([^"]+)"?/);
            if (match && match[1]) fileName = decodeURIComponent(match[1]);
        }
        
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(a.href);
    } catch(e) {
        document.body.style.cursor = 'default';
        alert('Erro ao baixar o PDF assinado: ' + e.message);
    }
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

window.toggleCertificadoMilitar = function(sexo) {
    const inp = document.getElementById('colab-militar');
    if (!inp) return;
    if (sexo === 'Masculino') {
        inp.disabled = false;
        inp.placeholder = '';
        inp.style.background = '';
        inp.style.color = '';
    } else {
        inp.disabled = true;
        inp.value = '';
        inp.placeholder = 'Apenas para Masculino';
        inp.style.background = '#f8fafc';
        inp.style.color = '#94a3b8';
    }
};


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
    body.innerHTML = cursos.map(c => {
        let duracaoStr = c.tempo_curso ? c.tempo_curso + ' meses' : '-';
        if (c.tempo_curso && !isNaN(c.tempo_curso)) {
            const m = parseInt(c.tempo_curso, 10);
            const s = (m / 6).toFixed(1).replace('.0', '');
            duracaoStr = `${m} meses (${s} semestre${s !== '1' ? 's' : ''})`;
        }
        return `
        <tr>
            <td>
                <div style="font-weight: 600; color: var(--primary-color);">${c.nome_curso}</div>
                <div style="font-size: 0.8rem; color: #64748b;">${c.instituicao}</div>
            </td>
            <td>${duracaoStr}</td>
            <td style="text-align: right;">
                <div style="display: flex; gap: 0.5rem; justify-content: flex-end;">
                    <button class="btn btn-warning btn-sm" onclick="editFaculdadeCurso(${JSON.stringify(c).replace(/"/g, '&quot;')})" title="Editar"><i class="ph ph-pencil-simple"></i></button>
                    <button class="btn btn-danger btn-sm" onclick="deleteFaculdadeCurso(${c.id})" title="Excluir"><i class="ph ph-trash"></i></button>
                </div>
            </td>
        </tr>
    `}).join('');
}

window.calcSemestresFaculdade = function(val) {
    const semestresInput = document.getElementById('faculdade-semestres');
    if (!semestresInput) return;
    if (!val || isNaN(val) || val <= 0) {
        semestresInput.value = '';
        return;
    }
    const meses = parseInt(val, 10);
    // 1 semestre = 6 meses (2 semestres por ano)
    const semestres = Math.ceil(meses / 6);
    semestresInput.value = semestres + (semestres === 1 ? ' semestre' : ' semestres');
};

const formFaculdade = document.getElementById('form-faculdade');
if (formFaculdade) {
    formFaculdade.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('faculdade-id').value;
        const data = {
            nome_curso: document.getElementById('faculdade-nome-curso').value,
            instituicao: document.getElementById('faculdade-instituicao').value,
            tempo_curso: document.getElementById('faculdade-tempo').value,
            valor_mensalidade: 0
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
    const semestresInput = document.getElementById('faculdade-semestres');
    if (semestresInput) semestresInput.value = '';
};

window.editFaculdadeCurso = function(c) {
    document.getElementById('faculdade-id').value = c.id;
    document.getElementById('faculdade-nome-curso').value = c.nome_curso;
    document.getElementById('faculdade-instituicao').value = c.instituicao;
    document.getElementById('faculdade-tempo').value = c.tempo_curso || '';
    window.calcSemestresFaculdade(c.tempo_curso);
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
    
    // Filtro para a aba geradores (lista normal)
    const tabGerador = document.getElementById('geradores-tab-gerador');
    if (tabGerador && tabGerador.style.display !== 'none') {
        const filtered = (window.allGeradores || []).filter(g => g.nome.toLowerCase().includes(q));
        window.renderGeradoresList(filtered);
        return;
    }

    // Filtro para a aba templates (departamentos e geradores)
    const container = document.getElementById('geradores-templates-container');
    if (container) {
        const deptCards = container.querySelectorAll('.dept-template-card');
        deptCards.forEach(card => {
            const deptName = card.dataset.deptName.toLowerCase();
            const docs = card.querySelectorAll('.doc-lbl-item');
            
            let hasVisibleDoc = false;
            docs.forEach(docLbl => {
                const docName = docLbl.dataset.docName.toLowerCase();
                const match = deptName.includes(q) || docName.includes(q);
                docLbl.style.display = match ? 'flex' : 'none';
                if (match) hasVisibleDoc = true;
            });

            // Mostra o departamento se o nome dele der match OU se algum documento dele der match
            card.style.display = (deptName.includes(q) || hasVisibleDoc) ? 'block' : 'none';
        });
    }
};

// ----- ABAS: GERADOR / TEMPLATES -----
window.switchGeradoresTab = function(tab) {
    const tabGerador    = document.getElementById('geradores-tab-gerador');
    const tabTemplates  = document.getElementById('geradores-tab-templates');
    const btnGerador    = document.getElementById('tab-btn-gerador');
    const btnTemplates  = document.getElementById('tab-btn-templates');
    const headerActions = document.getElementById('geradores-header-actions');

    const tabs = { gerador: tabGerador, templates: tabTemplates };
    const btns = { gerador: btnGerador, templates: btnTemplates };

    Object.keys(tabs).forEach(k => {
        if (tabs[k]) tabs[k].style.display = k === tab ? 'block' : 'none';
        if (btns[k]) {
            btns[k].style.background   = k === tab ? '#f503c5' : '#f1f5f9';
            btns[k].style.color        = k === tab ? '#fff'    : '#64748b';
            btns[k].style.borderBottom = k === tab ? '2px solid #f503c5' : '2px solid transparent';
        }
    });

    if (headerActions) headerActions.style.display = 'flex';

    const searchInput = document.getElementById('search-geradores');
    if (searchInput) { searchInput.value = ''; window.filterGeradores(); }

    if (tab === 'templates') window.loadGeradoresTemplates();
};

window.loadGeradoresTemplates = async function() {
    const container = document.getElementById('geradores-templates-container');
    if (!container) return;
    container.innerHTML = `<div style="text-align:center;padding:2rem;color:#94a3b8;"><i class="ph ph-circle-notch" style="font-size:2rem;"></i> Carregando...</div>`;

    try {
        const [departamentos, geradores, templates] = await Promise.all([
            apiGet('/departamentos'),
            apiGet('/geradores'),
            apiGet('/gerador-departamento-templates').catch(() => [])
        ]);
        window._deptTemplatesAll = templates;
        window.renderGeradoresTemplates(departamentos, geradores, templates);
    } catch(e) {
        container.innerHTML = `<div class="card p-4" style="color:#e53e3e;">Erro ao carregar dados: ${e.message}</div>`;
    }
};

window.renderGeradoresTemplates = function(departamentos, geradores, templates) {
    const container = document.getElementById('geradores-templates-container');
    if (!container) return;

    if (!geradores || geradores.length === 0) {
        container.innerHTML = `<div class="card p-4 text-center" style="color:#94a3b8;"><i class="ph ph-file-text" style="font-size:2.5rem;margin-bottom:1rem;display:block;"></i>Nenhum gerador cadastrado.</div>`;
        return;
    }
    if (!departamentos || departamentos.length === 0) {
        container.innerHTML = `<div class="card p-4 text-center" style="color:#94a3b8;"><i class="ph ph-buildings" style="font-size:2.5rem;margin-bottom:1rem;display:block;"></i>Nenhum departamento cadastrado.</div>`;
        return;
    }

    // Mapa: { departamento_id: [gerador_id, ...] }
    const tplMap = {};
    (templates || []).forEach(t => {
        if (!tplMap[t.departamento_id]) tplMap[t.departamento_id] = [];
        tplMap[t.departamento_id].push(Number(t.gerador_id));
    });

    const listHTML = departamentos.map(d => {
        const checked = tplMap[d.id] || [];
        const docsList = geradores.map(g => `
            <label class="doc-lbl-item" data-doc-name="${g.nome.replace(/"/g, '&quot;')}" style="display:flex; align-items:center; gap:0.6rem; padding:0.45rem 0.75rem; border-radius:6px; cursor:pointer; transition:background 0.15s;"
                   onmouseenter="this.style.background='#f8fafc'" onmouseleave="this.style.background=''">
                <input type="checkbox" class="gerador-dept-chk"
                    data-dept="${d.id}" data-gerador="${g.id}"
                    ${checked.includes(Number(g.id)) ? 'checked' : ''}
                    onchange="window.updateLocalDeptCount(${d.id})"
                    style="width:16px;height:16px;cursor:pointer;accent-color:#f503c5;">
                <span style="font-size:0.88rem; color:#334155;">${g.nome}</span>
            </label>`).join('');

        return `
            <div class="card mb-3 dept-template-card" data-dept-name="${d.nome.replace(/"/g, '&quot;')}" style="overflow:hidden;">
                <div style="display:flex; align-items:center; justify-content:space-between; padding:1rem 1.25rem; background:#fdf4ff; border-bottom:1px solid #f0e6fe; cursor:pointer;"
                     onclick="const b=this.nextElementSibling; b.style.display=b.style.display==='none'?'block':'none';">
                    <div style="display:flex; align-items:center; gap:0.75rem;">
                        <div style="width:36px;height:36px;border-radius:50%;background:#f503c5;display:flex;align-items:center;justify-content:center;">
                            <i class="ph ph-buildings" style="color:#fff;font-size:1.1rem;"></i>
                        </div>
                        <div>
                            <div style="font-weight:700;color:#334155;font-size:0.95rem;">${d.nome}</div>
                            <div id="dept-gerador-count-${d.id}" style="font-size:0.78rem;color:#94a3b8;">${checked.length} documento(s) selecionado(s)</div>
                        </div>
                    </div>
                    <i class="ph ph-caret-down" style="color:#94a3b8;font-size:1.2rem;"></i>
                </div>
                <div style="padding:0.75rem 1.25rem; display:grid; grid-template-columns:repeat(auto-fill,minmax(250px,1fr)); gap:0.25rem;">
                    ${docsList}
                </div>
            </div>`;
    }).join('');

    container.innerHTML = `
        <div style="display: flex; justify-content: flex-end; margin-bottom: 1rem;">
            <button class="btn btn-success" onclick="window.saveBatchGeradorDeptTemplates()" style="display:flex; align-items:center; gap:0.5rem; font-weight:600;">
                <i class="ph ph-floppy-disk"></i> Salvar Templates
            </button>
        </div>
        ${listHTML}
        <div style="display: flex; justify-content: flex-end; margin-top: 1rem;">
            <button class="btn btn-success" onclick="window.saveBatchGeradorDeptTemplates()" style="display:flex; align-items:center; gap:0.5rem; font-weight:600;">
                <i class="ph ph-floppy-disk"></i> Salvar Templates
            </button>
        </div>
    `;
    
    // Apply immediate filter just in case the search bar has text
    window.filterGeradores();
};

window.updateLocalDeptCount = function(deptId) {
    const chks = document.querySelectorAll(`.gerador-dept-chk[data-dept="${deptId}"]`);
    const count = Array.from(chks).filter(c => c.checked).length;
    const countEl = document.getElementById(`dept-gerador-count-${deptId}`);
    if (countEl) countEl.textContent = `${count} documento(s) selecionado(s)`;
};

window.saveBatchGeradorDeptTemplates = async function() {
    const chks = document.querySelectorAll('.gerador-dept-chk');
    const templates = [];
    chks.forEach(chk => {
        if (chk.checked) {
            templates.push({
                gerador_id: Number(chk.dataset.gerador),
                departamento_id: Number(chk.dataset.dept)
            });
        }
    });

    try {
        const btn = event.currentTarget;
        const oldHTML = btn.innerHTML;
        btn.innerHTML = `<i class="ph ph-spinner ph-spin"></i> Salvando...`;
        btn.disabled = true;

        await apiPost('/gerador-departamento-templates/batch', { templates });
        
        btn.innerHTML = `<i class="ph ph-check"></i> Salvo com sucesso`;
        setTimeout(() => {
            btn.innerHTML = oldHTML;
            btn.disabled = false;
        }, 2000);
    } catch(e) {
        alert('Erro ao salvar templates: ' + e.message);
        event.currentTarget.disabled = false;
    }
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

    // Verificar opção de assinatura manual
    const comAssinatura = document.querySelector('input[name="assinatura-tipo"]:checked')?.value === 'sim';

    // 1. Cabeçalho com Logotipo
    const logoBanner = `<div style="margin-bottom: 1rem;"><img src="${API_URL.replace('/api', '')}/assets/logo-header.png" style="width: 100%; display: block;"></div>`;

    // 2. Dados do Colaborador
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

    // 3. Conteúdo — compactar espaçamento de parágrafos
    const htmlComDestaque = (data.html || '')
        .replace(/AMERICA RENTAL EQUIPAMENTOS LTDA/g, '<b>AMERICA RENTAL EQUIPAMENTOS LTDA</b>');

    const isSantander = (data.gerador_nome || '').toLowerCase().includes('santander');
    const customFontSize   = isSantander ? '0.7rem' : '0.9rem';
    const customLineHeight = isSantander ? '1.2'    : '1.5';

    // Reduzir espaçamento excessivo: paragrafos com margin compacto
    const conteudoPrincipal = `
        <div style="margin-top: 1rem; text-align: justify; font-size: ${customFontSize};">
            <style scoped>
                #preview-doc-body p { margin: 0.15rem 0; line-height: ${customLineHeight}; }
                #preview-doc-body li { margin: 0.1rem 0; line-height: ${customLineHeight}; }
                #preview-doc-body br { line-height: 0.5; }
            </style>
            ${htmlComDestaque}
        </div>`;

    // 4. Data atual formatada — "Guarulhos, 01 de abril de 2026."
    const meses = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
    const hoje = new Date();
    const dataFormatada = `Guarulhos, ${String(hoje.getDate()).padStart(2,'0')} de ${meses[hoje.getMonth()]} de ${hoje.getFullYear()}.`;

    // 5. Rodapé — com ou sem campo de assinatura manual
    const colabNome = data.colaborador.NOME_COMPLETO;
    const logoSrc = `${API_URL.replace('/api', '')}/assets/logo-header.png`;

    let footerHtml;
    if (comAssinatura) {
        // Com campos de assinatura para impressão e assinatura à mão
        footerHtml = `
        <div style="margin-top: 1.5rem;">
            <p style="font-weight: 700; font-size: 0.9rem;">${dataFormatada}</p>
            <div style="margin-top: 2.5rem; display: flex; justify-content: space-between; align-items: flex-end;">
                <div style="text-align: center; width: 45%;">
                    <div style="border-top: 1.5px solid #000; padding-top: 0.35rem;">
                        <span style="font-weight: 700; font-size: 0.85rem;">${colabNome}</span><br>
                        <span style="font-size: 0.75rem; color: #555;">Colaborador</span>
                    </div>
                </div>
                <div style="text-align: center; width: 45%;">
                    <div style="margin-bottom: 0.25rem;">
                        <img src="${logoSrc}" style="height: 25px; margin: 0 auto; display: block;">
                        <p style="font-size: 0.5rem; margin-top: 1px; font-weight: 700; line-height: 1.1;">AMERICA RENTAL EQUIPAMENTOS LTDA<br>CNPJ: 03.434.448/0001-01</p>
                    </div>
                    <div style="border-top: 1.5px solid #000; padding-top: 0.35rem;">
                        <span style="font-weight: 700; font-size: 0.85rem;">América Rental Equipamentos Ltda</span><br>
                        <span style="font-size: 0.75rem; color: #555;">Empresa</span>
                    </div>
                </div>
            </div>
        </div>`;
    } else {
        // Sem campos de assinatura — apenas a data (assinatura será digital)
        footerHtml = `
        <div style="margin-top: 1.5rem;">
            <p style="font-weight: 700; font-size: 0.9rem;">${dataFormatada}</p>
        </div>`;
    }

    container.innerHTML = logoBanner + colabInfoBase + conteudoPrincipal + footerHtml;
    // Guardar nome para uso no salvar PDF
    container.dataset.docNome = data.gerador_nome || 'Documento';
    container.dataset.colabNome = colabNome || '';

    document.getElementById('preview-doc-title').textContent = data.gerador_nome;
    document.getElementById('modal-preview-doc').style.display = 'block';
};

// Salvar como PDF — usa o diálogo de impressão do navegador com destino "Salvar em PDF"
window.salvarDocumentoPDF = function() {
    const container = document.getElementById('preview-doc-body');
    if (!container) return;
    const content   = container.innerHTML;
    const docNome   = container.dataset.docNome || 'Documento';
    const colabNome = container.dataset.colabNome || '';

    const win = window.open('', '_blank');
    win.document.write(`
        <html>
            <head>
                <title>${docNome}${colabNome ? ' - ' + colabNome : ''}</title>
                <style>
                    * { box-sizing: border-box; }
                    body { font-family: 'Inter', Arial, sans-serif; padding: 0; margin: 0; }
                    @page { size: A4; margin: 1.5cm; }
                    #preview-doc-body p  { margin: 0.15rem 0; line-height: 1.5; }
                    #preview-doc-body li { margin: 0.1rem 0;  line-height: 1.5; }
                    img { max-width: 100%; }
                </style>
            </head>
            <body onload="window.print();">
                <div id="preview-doc-body">${content}</div>
            </body>
        </html>
    `);
    win.document.close();
};

window.imprimirDocumento = function() {
    const content = document.getElementById('preview-doc-body').innerHTML;
    const win = window.open('', '_blank');
    win.document.write(`
        <html>
            <head>
                <title>Imprimir Documento</title>
                <style>
                    * { box-sizing: border-box; }
                    body { font-family: 'Inter', Arial, sans-serif; padding: 0; margin: 0; }
                    @page { size: A4; margin: 1.5cm; }
                    #preview-doc-body p  { margin: 0.15rem 0; line-height: 1.5; }
                    #preview-doc-body li { margin: 0.1rem 0;  line-height: 1.5; }
                    img { max-width: 100%; }
                </style>
            </head>
            <body onload="window.print(); window.close();">
                <div id="preview-doc-body">${content}</div>
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
const ADMISSAO_STATUS_STYLES = {
    'Aguardando início': { bg:'#f1f3f5', color:'#495057', border:'#adb5bd', icon:'ph-hourglass-high', label:'Aguardando' },
    'Processo iniciado': { bg:'#f3e8ff', color:'#7e22ce', border:'#c084fc', icon:'ph-play-circle',   label:'Iniciado' },
    'Ativo':             { bg:'#e8f5e9', color:'#196b36', border:'#196b36', icon:'ph-check-circle',   label:'Ativo' },
    'Férias':            { bg:'#fdf7e3', color:'#c2aa72', border:'#c2aa72', icon:'ph-airplane-tilt',  label:'Férias' },
    'Afastado':          { bg:'#faeed9', color:'#eaa15f', border:'#eaa15f', icon:'ph-warning',        label:'Afastado' },
    'Desligado':         { bg:'#fceeee', color:'#ba7881', border:'#ba7881', icon:'ph-x-circle',       label:'Desligado' }
};

window.loadAdmissaoSelect = async function() {
    try {
        const rows = await apiGet('/colaboradores');
        const hiddenInput = document.getElementById('admissao-select-colab');
        const dropdownList = document.getElementById('admissao-dropdown-list');
        const label = document.getElementById('admissao-dropdown-label');
        if (!dropdownList) return;

        // Apenas colaboradores pendentes de admissão
        const pendentes = rows.filter(r => r.status === 'Aguardando início' || r.status === 'Processo iniciado');
        window._admissaoPendentes = pendentes;

        // Reset label
        if (label) { label.textContent = 'Selecione um colaborador...'; label.style.color = '#94a3b8'; }
        if (hiddenInput) hiddenInput.value = '';

        // Popula lista customizada
        dropdownList.innerHTML = '';

        // Opção vazia
        const empty = document.createElement('div');
        empty.style.cssText = 'padding:0.6rem 1rem; color:#94a3b8; font-size:0.88rem; cursor:pointer;';
        empty.textContent = 'Selecione um colaborador...';
        empty.onclick = () => window.selectAdmissaoColab('', null);
        dropdownList.appendChild(empty);

        pendentes.forEach(p => {
            const s = ADMISSAO_STATUS_STYLES[p.status] || { bg:'#f1f3f5', color:'#495057', border:'#adb5bd', icon:'ph-clock', label: p.status };
            const cargo = p.cargo || 'Sem Cargo';
            const item = document.createElement('div');
            item.style.cssText = 'display:flex; align-items:center; gap:0.75rem; padding:0.6rem 1rem; cursor:pointer; border-bottom:1px solid #f1f5f9; transition:background 0.15s;';
            item.onmouseenter = () => item.style.background = '#f8fafc';
            item.onmouseleave = () => item.style.background = '';
            item.innerHTML = `
                <div style="display:inline-flex; align-items:center; gap:5px; background:${s.bg}; color:${s.color}; border:2px solid ${s.border}; border-radius:20px; font-weight:700; padding:2px 10px; font-size:0.75rem; white-space:nowrap;">
                    <i class="ph ${s.icon}"></i> ${s.label}
                </div>
                <div style="display:flex; flex-direction:column; line-height:1.3;">
                    <span style="font-weight:600; color:#334155; font-size:0.9rem;">${p.nome_completo}</span>
                    <span style="color:#94a3b8; font-size:0.78rem;">${cargo}</span>
                </div>`;
            item.onclick = () => window.selectAdmissaoColab(p.id, p, s);
            dropdownList.appendChild(item);
        });

        window.resetAdmissao();
    } catch (e) { console.error(e); }
};

window.toggleAdmissaoDropdown = function() {
    const list = document.getElementById('admissao-dropdown-list');
    const caret = document.getElementById('admissao-dropdown-caret');
    const trigger = document.getElementById('admissao-dropdown-trigger');
    const container = document.getElementById('admissao-search-container');
    if (!list) return;
    const isOpen = list.style.display !== 'none';
    list.style.display = isOpen ? 'none' : 'block';
    if (caret) caret.style.transform = isOpen ? '' : 'rotate(180deg)';
    if (trigger) trigger.style.borderColor = isOpen ? 'var(--border-color)' : '#f503c5';
    if (container) container.style.paddingBottom = isOpen ? '1.5rem' : '260px';
};

window.selectAdmissaoColab = function(id, colab, s) {
    const hiddenInput = document.getElementById('admissao-select-colab');
    const label = document.getElementById('admissao-dropdown-label');
    const list  = document.getElementById('admissao-dropdown-list');
    const caret = document.getElementById('admissao-dropdown-caret');
    const trigger = document.getElementById('admissao-dropdown-trigger');
    const container = document.getElementById('admissao-search-container');

    // Fecha dropdown
    if (list) list.style.display = 'none';
    if (caret) caret.style.transform = '';
    if (trigger) trigger.style.borderColor = 'var(--border-color)';
    if (container) container.style.paddingBottom = '1.5rem';

    if (!id || !colab) {
        if (hiddenInput) hiddenInput.value = '';
        if (label) { label.innerHTML = 'Selecione um colaborador...'; label.style.color = '#94a3b8'; }
        window.initAdmissaoWorkflow('');
        return;
    }

    if (hiddenInput) hiddenInput.value = id;
    if (label) {
        const cargo = colab.cargo || 'Sem Cargo';
        label.style.color = '#334155';
        label.innerHTML = `
            <div style="display:inline-flex; align-items:center; gap:5px; background:${s.bg}; color:${s.color}; border:2px solid ${s.border}; border-radius:20px; font-weight:700; padding:2px 10px; font-size:0.75rem; margin-right:6px; white-space:nowrap;">
                <i class="ph ${s.icon}"></i> ${s.label}
            </div>
            <span style="font-weight:600;">${colab.nome_completo}</span>
            <span style="color:#94a3b8; font-size:0.82rem; margin-left:4px;">&mdash; ${cargo}</span>`;
    }
    window.initAdmissaoWorkflow(id);
};

// Fechar dropdown ao clicar fora
document.addEventListener('click', function(e) {
    const dd = document.getElementById('admissao-custom-dropdown');
    if (dd && !dd.contains(e.target)) {
        const list = document.getElementById('admissao-dropdown-list');
        const caret = document.getElementById('admissao-dropdown-caret');
        const trigger = document.getElementById('admissao-dropdown-trigger');
        const container = document.getElementById('admissao-search-container');
        if (list) list.style.display = 'none';
        if (caret) caret.style.transform = '';
        if (trigger) trigger.style.borderColor = 'var(--border-color)';
        if (container) container.style.paddingBottom = '1.5rem';
    }
});


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

            // 2. Restaurar e Popular Passo 2 e outros
            const docs = await apiGet(`/colaboradores/${colab.id}/documentos`);

            // Busca dados para o Passo 2: Documentos do Departamento
            const [depts, geradores, templates, assinaturas] = await Promise.all([
                apiGet('/departamentos'),
                apiGet('/geradores'),
                apiGet('/gerador-departamento-templates').catch(() => []),
                apiGet(`/admissao-assinaturas/${colab.id}`).catch(() => [])
            ]);

            let availableGeradores = [];
            const empDeptId = colab.departamento;
            const deptObj = depts.find(d =>
                String(d.id) === String(empDeptId) ||
                d.nome.trim().toLowerCase() === String(empDeptId).trim().toLowerCase()
            );

            if (deptObj) {
                const geradorIds = templates
                    .filter(t => Number(t.departamento_id) === Number(deptObj.id))
                    .map(t => Number(t.gerador_id));
                availableGeradores = geradores.filter(g => geradorIds.includes(Number(g.id)));
            }

            // Guarda globalmente para o botão de envio acessar
            window._admissaoGeradores = availableGeradores;
            window._admissaoAssinaturas = assinaturas;

            // Popula lista de assinaturas (Step 2)
            const sigList = document.getElementById('admissao-signature-list');
            if (sigList) {
                if (availableGeradores.length > 0) {
                    sigList.innerHTML = availableGeradores.map(g => {
                        const ass = assinaturas.find(a => a.gerador_id === g.id || a.nome_documento === g.nome);
                        const isSigned   = ass && ass.assinafy_status === 'Assinado';
                        const isPending  = ass && ass.assinafy_status === 'Pendente';
                        const statusBadge = isSigned
                            ? `<span style="background:#dcfce7;color:#15803d;border-radius:20px;padding:2px 10px;font-size:0.72rem;font-weight:700;white-space:nowrap;"><i class="ph ph-check-circle"></i> Assinado</span>`
                            : isPending
                            ? `<span style="background:#fef9c3;color:#92400e;border-radius:20px;padding:2px 10px;font-size:0.72rem;font-weight:700;white-space:nowrap;"><i class="ph ph-clock"></i> Aguardando</span>`
                            : `<span style="background:#f1f5f9;color:#64748b;border-radius:20px;padding:2px 10px;font-size:0.72rem;font-weight:700;white-space:nowrap;"><i class="ph ph-minus-circle"></i> Não enviado</span>`;
                        const downloadBtn = isSigned
                            ? `<button onclick="window.openSignedDocPopup(${ass.id}, '${g.nome.replace(/'/g,"\\'")}', event)" style="border:none;background:none;cursor:pointer;color:#16a34a;" title="Visualizar assinado"><i class="ph ph-file-pdf" style="font-size:1.2rem;"></i></button>`
                            : '';
                        const colabId = viewedColaborador ? viewedColaborador.id : '';
                        const eyeBtn = `<button onclick="window.previewAdmissaoDoc(${g.id}, ${colabId}, event)" style="border:none;background:none;cursor:pointer;color:#64748b;" title="Visualizar documento"><i class="ph ph-eye" style="font-size:1.2rem;"></i></button>`;
                        return `
                        <label class="doc-check-item" data-gerador-id="${g.id}" style="display:flex; align-items:center; gap:0.6rem; padding:0.6rem 0.75rem; border:1px solid ${isSigned ? '#bbf7d0' : '#f1f5f9'}; border-radius:8px; cursor:pointer; background:${isSigned ? '#f0fdf4' : '#fff'}; transition:all 0.2s; justify-content:space-between;">
                            <div style="display:flex; align-items:center; gap:0.6rem; flex:1;">
                                <input type="checkbox" value="${g.id}" data-nome="${g.nome}" ${isSigned ? '' : 'checked'}
                                    style="width:16px;height:16px;cursor:pointer;accent-color:#f503c5;">
                                <div style="display:flex; flex-direction:column; gap:2px;">
                                    <span style="font-size:0.87rem; font-weight:600; color:#334155;">${g.nome}</span>
                                </div>
                            </div>
                            <div style="display:flex; align-items:center; gap:0.5rem;">
                                ${statusBadge}
                                ${eyeBtn}
                                ${downloadBtn}
                            </div>
                        </label>`;
                    }).join('');
                } else {
                    sigList.innerHTML = `<p class="text-muted" style="grid-column: 1 / -1; padding: 1rem; text-align: center;">Nenhum documento configurado para o departamento <b>${deptObj ? deptObj.nome : (empDeptId || 'Não Informado')}</b>.<br><small>Configure os templates em <b>Geradores → Templates por Departamento</b>.</small></p>`;
                }
            }

            // Atualiza percentual do passo 2 baseado em assinaturas
            window._updateAdmissaoStep2Pct = function() {
                const total  = (window._admissaoGeradores || []).length;
                const signed = (window._admissaoAssinaturas || []).filter(a => a.assinafy_status === 'Assinado').length;
                if (total === 0) return 0;
                const pct = Math.round((signed / total) * 100);
                // Se tem documentos enviados mas não todos assinados: mínimo 20%
                const hasSent = (window._admissaoAssinaturas || []).some(a => a.enviado_em);
                return hasSent ? Math.max(20, pct) : pct;
            };

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


// ===== PASSO 2: VISUALIZAR DOCUMENTO ANTES DA ASSINATURA =====
window.previewAdmissaoDoc = async function(geradorId, colabId, evt) {
    if (evt) { evt.preventDefault(); evt.stopPropagation(); }

    if (!colabId) { alert('Colaborador não identificado.'); return; }

    try {
        // Usa o endpoint existente que retorna HTML + dados do colaborador
        const response = await fetch(`${API_URL}/geradores/${geradorId}/gerar/${colabId}`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        const data = await response.json();

        if (!data.html) {
            alert('Não foi possível carregar o documento.');
            return;
        }

        // Reutiliza a função de preview do gerador (com layout completo)
        // Precisamos temporariamente salvar a seleção de assinatura para não alterar o modal principal
        window.abrirPreviewDocumento(data);

    } catch(e) {
        alert('Erro ao carregar pré-visualização: ' + e.message);
    }
};

// ===== PASSO 2: ENVIO EM LOTE PARA ASSINAFY =====
window.sendAdmissaoSignatures = async function() {
    if (!viewedColaborador) { alert('Nenhum colaborador selecionado.'); return; }

    const checks = document.querySelectorAll('#admissao-signature-list input[type="checkbox"]:checked');
    if (checks.length === 0) { alert('Selecione ao menos um documento para enviar.'); return; }

    const geradorIds = Array.from(checks).map(c => Number(c.value));
    const btn = document.getElementById('btn-enviar-assinaturas');
    if (btn) { btn.disabled = true; btn.innerHTML = `<i class="ph ph-spinner ph-spin"></i> Enviando ${geradorIds.length} documento(s)...`; }

    try {
        const res = await apiPost('/admissao-assinaturas/enviar-lote', {
            colaborador_id: viewedColaborador.id,
            geradores_ids: geradorIds
        });

        const erros = (res.resultados || []).filter(r => r.erro);
        const ok    = (res.resultados || []).filter(r => r.ok);

        let msg = `✅ ${ok.length} documento(s) enviado(s) para assinatura no e-mail do colaborador.`;
        if (erros.length > 0) msg += `\n\n⚠️ ${erros.length} erro(s):\n` + erros.map(e => `• ${e.nome || e.id}: ${e.erro}`).join('\n');
        alert(msg);

        // Recarregar o passo 2 para atualizar os status
        await window.initAdmissaoWorkflow(viewedColaborador.id, 2, true);
    } catch(e) {
        alert('Erro ao enviar documentos: ' + e.message);
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = `<i class="ph ph-paper-plane-tilt"></i> Enviar para Assinatura`; }
    }
};

// ===== POPUP DE PDF ASSINADO =====
window.openSignedDocPopup = function(assId, nomeDoc, evt) {
    if (evt) { evt.preventDefault(); evt.stopPropagation(); }
    const token = localStorage.getItem('token');

    // Criar overlay
    let overlay = document.getElementById('signed-doc-popup-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'signed-doc-popup-overlay';
        overlay.style.cssText = `position:fixed;inset:0;background:rgba(15,23,42,0.7);z-index:9999;display:flex;flex-direction:column;align-items:center;justify-content:center;`;
        document.body.appendChild(overlay);
    }

    overlay.innerHTML = `
        <div style="background:#fff;border-radius:12px;width:95vw;max-width:1000px;height:90vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 25px 60px rgba(0,0,0,0.4);">
            <div style="padding:1rem 1.5rem;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;background:#f8fafc;">
                <div style="display:flex;align-items:center;gap:0.75rem;">
                    <i class="ph ph-file-pdf" style="color:#ef4444;font-size:1.5rem;"></i>
                    <div>
                        <div style="font-weight:700;color:#334155;">${nomeDoc}</div>
                        <div style="font-size:0.78rem;color:#94a3b8;">Documento Assinado</div>
                    </div>
                </div>
                <div style="display:flex;gap:0.5rem;">
                    <a id="signed-doc-download-btn" href="#" download="${nomeDoc}_Assinado.pdf"
                       style="display:inline-flex;align-items:center;gap:0.4rem;background:#22c55e;color:#fff;padding:0.5rem 1rem;border-radius:8px;font-weight:600;font-size:0.85rem;text-decoration:none;">
                        <i class="ph ph-download-simple"></i> Baixar
                    </a>
                    <button onclick="document.getElementById('signed-doc-popup-overlay').remove()"
                            style="background:#ef4444;color:#fff;border:none;border-radius:8px;padding:0.5rem 1rem;cursor:pointer;font-weight:600;">
                        <i class="ph ph-x"></i> Fechar
                    </button>
                </div>
            </div>
            <div style="flex:1;overflow:hidden;background:#64748b;display:flex;align-items:center;justify-content:center;">
                <div id="signed-doc-loading" style="color:#fff;text-align:center;">
                    <i class="ph ph-circle-notch ph-spin" style="font-size:2.5rem;"></i>
                    <div style="margin-top:0.5rem;">Carregando PDF...</div>
                </div>
                <iframe id="signed-doc-iframe" style="display:none;width:100%;height:100%;border:none;"></iframe>
            </div>
        </div>`;

    overlay.style.display = 'flex';
    document.body.appendChild(overlay);

    // Clicar fora fecha
    overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove(); });

    // Carregar PDF
    fetch(`/api/admissao-assinaturas/${assId}/download`, { headers: { 'Authorization': `Bearer ${token}` } })
        .then(res => {
            if (!res.ok) throw new Error('Arquivo não disponível');
            return res.blob();
        })
        .then(blob => {
            const blobUrl = URL.createObjectURL(blob);
            const iframe = document.getElementById('signed-doc-iframe');
            const loading = document.getElementById('signed-doc-loading');
            const dlBtn = document.getElementById('signed-doc-download-btn');
            if (iframe) { iframe.src = blobUrl; iframe.style.display = 'block'; }
            if (loading) loading.style.display = 'none';
            if (dlBtn) dlBtn.href = blobUrl;
        })
        .catch(err => {
            const loading = document.getElementById('signed-doc-loading');
            if (loading) loading.innerHTML = `<i class="ph ph-warning" style="font-size:2.5rem;color:#fbbf24;"></i><div style="margin-top:0.5rem;">${err.message}</div>`;
        });
};

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
    
    // Se for Passo 2: carregar status do certificado digital
    if (step === 2 && typeof window.carregarStatusCertificado === 'function') {
        window.carregarStatusCertificado();
    }

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

    const pc2 = window._updateAdmissaoStep2Pct ? window._updateAdmissaoStep2Pct() : (() => {
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
        ? 'Exames Complementares, acuidade visual, E.E.G, E.C.G e Glicemia.' 
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
        if (confirm(`Não foi possível enviar automaticamente pelo servidor. Erro do Servidor:\n\n${e.message}\n\nDeseja abrir o seu programa de e-mail (Outlook/Gmail) com o texto já preenchido?`)) {
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
 * Copia o link de assinatura para a área de transferência
 */
function copiarLinkAssinafy(el) {
    const url = decodeURIComponent(el.getAttribute('data-copy-url') || '');
    if (!url) return;
    navigator.clipboard.writeText(url).then(() => {
        const orig = el.innerHTML;
        el.innerHTML = '<i class="ph ph-check" style="font-size:0.9rem;"></i> Copiado!';
        el.style.color = '#2f9e44';
        setTimeout(() => { el.innerHTML = orig; el.style.color = '#64748b'; }, 1800);
    }).catch(() => {
        // fallback para navegadores sem clipboard API
        const ta = document.createElement('textarea');
        ta.value = url;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        const orig = el.innerHTML;
        el.innerHTML = '<i class="ph ph-check" style="font-size:0.9rem;"></i> Copiado!';
        el.style.color = '#2f9e44';
        setTimeout(() => { el.innerHTML = orig; el.style.color = '#64748b'; }, 1800);
    });
}

/**
 * Inicia o processo de assinatura eletronica via Assinafy
 */
window.iniciarAssinafy = async function(docType, tabName, btn) {
    if (!viewedColaborador) return;

    const colabId = viewedColaborador.id;
    const container = btn.closest('.assinafy-integrated-container');

    try {
        btn.disabled = true;
        btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Enviando...';

        // 1. Buscar documento no banco
        const docs = await apiGet(`/colaboradores/${colabId}/documentos`);
        if (!docs) throw new Error('Falha ao carregar documentos.');

        const docRecord = docs.find(d => d.tab_name === tabName && d.document_type === docType);
        if (!docRecord) throw new Error('Documento nao encontrado. Faca o upload primeiro.');

        // 2. Chamar backend (retorna imediatamente, processa em background)
        const res = await apiPost('/assinafy/upload', {
            document_id: docRecord.id,
            colaborador_id: colabId
        });

        if (res.sucesso) {
            // Restaurar botao
            btn.disabled = false;
            btn.innerHTML = '<i class="ph ph-pen-nib"></i> Solicitar Assinatura';

            // Atualizar data de envio no DOM
            const now = new Date();
            const dd = String(now.getDate()).padStart(2, '0');
            const mm = String(now.getMonth()+1).padStart(2, '0');
            const yyyy = now.getFullYear();
            const h = String(now.getHours()).padStart(2, '0');
            const min = String(now.getMinutes()).padStart(2, '0');
            const hojeFormatado = `${dd}/${mm}/${yyyy} - ${h}h${min}m`;
            
            const docInfoDiv = btn.closest('.doc-item') && btn.closest('.doc-item').querySelector('.doc-info div');
            if (docInfoDiv) {
                // Atualizar ou criar o parágrafo de data de envio
                let subInfoP = docInfoDiv.querySelector('p.subinfo-line');
                if (!subInfoP) {
                    subInfoP = document.createElement('p');
                    subInfoP.className = 'subinfo-line';
                    subInfoP.style.cssText = 'margin:2px 0 0; font-size:0.78rem;';
                    docInfoDiv.appendChild(subInfoP);
                }
                const vencSpan = subInfoP.firstElementChild;
                const vencHtml = vencSpan ? vencSpan.outerHTML + ' <span style="color:#64748b;">|</span> ' : '';
                subInfoP.innerHTML = vencHtml + '<span style="color:#2f9e44; font-weight:600;">Enviado: ' + hojeFormatado + '</span>';

                // Link de assinatura em parágrafo separado abaixo
                const urlAssinatura = res.urlAssinatura || null;
                if (urlAssinatura) {
                    // Remover link antigo se existir
                    const oldLink = docInfoDiv.querySelector('p.assinafy-link-p');
                    if (oldLink) oldLink.remove();
                    const linkP = document.createElement('p');
                    linkP.className = 'assinafy-link-p';
                    linkP.style.cssText = 'margin:1px 0 0; font-size:0.75rem;';
                    const encodedUrl = encodeURIComponent(urlAssinatura);
                    linkP.innerHTML = `<span data-copy-url="${encodedUrl}" onclick="copiarLinkAssinafy(this)" style="color:#64748b; display:inline-flex; align-items:center; gap:3px; cursor:pointer;" title="Clique para copiar o link de assinatura"><i class="ph ph-copy" style="font-size:0.9rem;"></i> Link para assinatura</span>`;
                    docInfoDiv.appendChild(linkP);
                }
            }

            // Atualizar icone de status para Enviado
            const existingIcon = container ? container.querySelector('span[title]') : null;
            if (existingIcon) {
                existingIcon.title = 'E-mail enviado';
                existingIcon.style.color = '#1971c2';
                existingIcon.innerHTML = '<i class="ph ph-paper-plane-tilt" style="font-size:1.1rem;"></i> Enviado';
            } else if (container) {
                const icon = document.createElement('span');
                icon.title = 'E-mail enviado';
                icon.style.cssText = 'display:inline-flex;align-items:center;gap:3px;color:#1971c2;font-size:0.78rem;font-weight:700;white-space:nowrap;';
                icon.innerHTML = '<i class="ph ph-paper-plane-tilt" style="font-size:1.1rem;"></i> Enviado';
                container.appendChild(icon);
            }

            // Sincronizar em background
            setTimeout(async () => {
                await loadDocumentosList();
                const activeTab = document.querySelector('#tabs-list li.active');
                if (activeTab) renderTabContent(activeTab.dataset.tab, activeTab.textContent, true);
            }, 2000);

        } else {
            throw new Error(res.error || 'Erro na integracao com Assinafy');
        }

    } catch (e) {
        console.error('Erro Assinafy:', e);
        if (e.name === 'AbortError') {
            alert('⏳ O processo está demorando mais que o esperado.\n\nO Assinafy pode já ter processado o documento. Aguarde 1 minuto e recarregue a página para verificar o status.');
        } else {
            alert('Falha ao iniciar Assinafy: ' + e.message);
        }
        btn.disabled = false;
        btn.innerHTML = '<i class="ph ph-pen-nib"></i> Assinar p/ Assinafy';
    }
};

window.syncAssinafyStatus = async function(docId, btn) {
    if (!docId) return;
    
    // Feedback visual rapido no proprio icone
    const icon = btn.querySelector('i');
    if (icon) {
        icon.classList.remove('ph-arrows-clockwise');
        icon.classList.add('ph-spinner', 'ph-spin');
    }
    
    try {
        const res = await fetch(`${API_URL}/documentos/${docId}/sync-assinafy`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        const data = await res.json();
        
        if (res.ok && data.sucesso) {
            // Apenas atualiza o log e a tela silenciosamente
            console.log(`[SYNC ASSINAFY] doc ${docId} antigo: ${data.status_antigo} -> novo: ${data.status_novo}`);
            
            await loadDocumentosList();
            const activeTab = document.querySelector('#tabs-list li.active');
            if (activeTab) renderTabContent(activeTab.dataset.tab, activeTab.textContent, true);
        } else {
            console.warn('Erro sync manual:', data.error);
            alert('Falha ao checar status: ' + (data.error || 'Erro desconhecido.'));
        }
    } catch (err) {
        console.error('Erro requisição sync Assinafy:', err);
    } finally {
        // Redesenho da aba reescreverá o icone, mas por cautela revertermos a animacao se falhar
        if (icon) {
            icon.classList.remove('ph-spinner', 'ph-spin');
            icon.classList.add('ph-arrows-clockwise');
        }
    }
};

window.forceOnedriveSync = async function(docId, btn) {
    const original = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="ph ph-spinner" style="animation:spin 1s linear infinite;"></i> Enviando...';

    try {
        const res = await fetch(`${API_URL}/documentos/${docId}/force-onedrive-sync`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        const data = await res.json();
        const logText = (data.log || []).join('\n');

        if (data.sucesso) {
            alert(`✅ Sincronizado com sucesso!\n\nArquivo: ${data.cloudName}\nPasta: ${data.targetDir}\n\n--- LOG ---\n${logText}`);
        } else {
            alert(`❌ Falha na sincronização OneDrive:\n${data.error}\n\n--- LOG ---\n${logText}`);
        }
    } catch (e) {
        alert('Erro de rede: ' + e.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = original;
    }
};

window.syncAllAtestados = async function(ids, btn) {
    const original = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="ph ph-spinner"></i> Sincronizando...';
    let ok = 0, fail = 0;
    for (const id of ids) {
        try {
            const res = await fetch(`${API_URL}/documentos/${id}/force-onedrive-sync`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${currentToken}` }
            });
            const data = await res.json();
            if (data.sucesso) ok++; else fail++;
        } catch { fail++; }
    }
    btn.disabled = false;
    btn.innerHTML = original;
    alert(`✅ Sincronização concluída!\n✓ Sucesso: ${ok}\n✗ Falha: ${fail}\n\nUse o botão ☁ individual para ver o log de cada falha.`);
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
            alert(`✅ SUCESSO TOTAL!\nCaminho: ${data.path}`);
        } else {
            alert(`❌ Erro na Sincronização:\n${data.message || data.error}`);
        }
    } catch (e) {
        alert("Erro na requisição: " + e.message);
    } finally {
        if(btn) {
            btn.disabled = false;
            btn.innerHTML = originalHtml;
        }
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

/**
 * Auto-polling de status Assinafy a cada 30s.
 */
setInterval(async () => {
    const pendingDocs = Array.from(document.querySelectorAll('.doc-item[data-assinafy-status="Pendente"], .doc-item[data-assinafy-status="Aguardando"]'));
    if (pendingDocs.length === 0) return;

    let updatedAny = false;
    for (const docEl of pendingDocs) {
        const docId = docEl.getAttribute('data-doc-id');
        if (!docId) continue;
        
        try {
            const res = await fetch(`${API_URL}/documentos/${docId}/sync-assinafy`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${currentToken}` }
            });
            const data = await res.json();
            
            if (res.ok && data.sucesso) {
                if (data.status_novo === 'Assinado' && data.status_antigo !== 'Assinado') {
                    docEl.setAttribute('data-assinafy-status', 'Assinado');
                    updatedAny = true;
                }
            }
        } catch (e) {
            console.error('Polling: erro checando doc ' + docId, e);
        }
    }
    
    if (updatedAny) {
        await loadDocumentosList();
        
        const activeTab = document.querySelector('#tabs-list li.active');
        if (activeTab) {
            renderTabContent(activeTab.dataset.tab, activeTab.textContent, true);
        } else {
            initAdmissaoWorkflow(viewedColaborador.id, window.currentActiveAdmissaoStep, true).catch(() => {});
        }
        
        console.log('[POLLING] Documento(s) detectado(s) como Assinado(s). Tela atualizada com sucesso.');
    }
}, 30000);

// --- LÓGICA RENDER PDF (PDF.js) ---
async function renderPdfToContainer(pdfUrl, containerId, onScrollEnd) {
    const container = document.getElementById(containerId);
    container.innerHTML = '<div style="color:white; padding: 2rem;">Carregando PDF...</div>';
    container.scrollTop = 0;
    container.onscroll = null;

    try {
        if (!window.pdfjsLib) throw new Error('Biblioteca pdf.js não carregada');
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

        const loadingTask = pdfjsLib.getDocument(pdfUrl);
        const pdf = await loadingTask.promise;
        container.innerHTML = '';
        
        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const scale = 1.2;
            const viewport = page.getViewport({ scale: scale });

            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            canvas.style.display = 'block';
            canvas.style.margin = '0 auto 10px auto';
            canvas.style.width = '100%';
            canvas.style.maxWidth = '600px';

            await page.render({ canvasContext: context, viewport: viewport }).promise;
            container.appendChild(canvas);
        }
        
        const checkScroll = () => {
            if (container.scrollHeight - container.scrollTop <= container.clientHeight + 100) {
                onScrollEnd();
                container.removeEventListener('scroll', checkScroll);
            }
        };

        container.addEventListener('scroll', checkScroll);
        
        if (container.scrollHeight <= container.clientHeight + 150) {
            onScrollEnd();
        }
        
    } catch (e) {
        console.error("PDFJS Erro:", e);
        container.innerHTML = '<div style="color:red; padding:2rem;">Erro ao carregar renderização do PDF: ' + e.message + '</div>';
        onScrollEnd(); 
    }
}

function getPointerPos(canvas, evt) {
    const rect = canvas.getBoundingClientRect();
    let clientX = evt.clientX;
    let clientY = evt.clientY;
    if(evt.touches && evt.touches.length > 0) {
        clientX = evt.touches[0].clientX;
        clientY = evt.touches[0].clientY;
    }
    const dpr = window.devicePixelRatio || 1;
    return {
        x: (clientX - rect.left),
        y: (clientY - rect.top)
    };
}

function setupHighDpiCanvas(canvasId, refObj, objKey) {
    let canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const newCanvas = canvas.cloneNode(true);
    canvas.parentNode.replaceChild(newCanvas, canvas);
    canvas = newCanvas;

    const dpr = window.devicePixelRatio || 1;
    let w = canvas.clientWidth || 500;
    let h = canvas.clientHeight || 150;

    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    refObj[objKey] = ctx;

    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#0f172a';

    let drawing = false;

    const start = (e) => { e.preventDefault(); drawing = true; const pos = getPointerPos(canvas, e); ctx.beginPath(); ctx.moveTo(pos.x, pos.y); };
    const move = (e) => { e.preventDefault(); if(!drawing) return; const pos = getPointerPos(canvas, e); ctx.lineTo(pos.x, pos.y); ctx.stroke(); };
    const stop = (e) => { e.preventDefault(); drawing = false; ctx.closePath(); };

    canvas.addEventListener('mousedown', start);
    canvas.addEventListener('mousemove', move);
    canvas.addEventListener('mouseup', stop);
    canvas.addEventListener('mouseout', stop);

    canvas.addEventListener('touchstart', start, {passive: false});
    canvas.addEventListener('touchmove', move, {passive: false});
    canvas.addEventListener('touchend', stop);

    ctx.clearRect(0, 0, w, h);
}

function isCanvasBlank(canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return true;
    const blank = document.createElement('canvas');
    blank.width = canvas.width;
    blank.height = canvas.height;
    return canvas.toDataURL() === blank.toDataURL();
}

// --- LÓGICA ASSINATURA TESTEMUNHAS ---
let ctxTestemunhas = {};
let currentDocIdForWitness = null;
let currentDocDataForWitness = null;

window.abrirModalAssinaturaTestemunhas = async function(docId) {
    currentDocIdForWitness = docId;
    currentDocDataForWitness = currentDocs.find(d => d.id === docId);

    const modal = document.getElementById('modal-assinatura-testemunhas');
    const formArea = document.getElementById('area-assinatura-testemunhas');
    formArea.style.display = 'none';
    modal.style.display = 'block';

    let cols = [];
    try {
        const res = await fetch(`${API_URL}/colaboradores`, {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        if (res.ok) {
            cols = await res.json();
        } else {
            console.error("Falha ao buscar colaboradores - status:", res.status);
        }
    } catch (e) {
        console.error("Erro ao buscar colaboradores", e);
    }
    
    console.log('[Testemunhas] Total colaboradores carregados:', cols.length);
    
    // Mostrar todos os colaboradores cadastrados como possíveis testemunhas
    const todos = (cols || []).filter(c => (c.nome_completo || c.nome || '').trim() !== '');
    todos.sort((a,b) => (a.nome_completo||a.nome||'').localeCompare(b.nome_completo||b.nome||''));

    let options = '<option value="">Selecione uma testemunha...</option>';
    todos.forEach(c => {
        const nome = c.nome_completo || c.nome || '';
        const cpf = c.cpf || '';
        options += `<option value="${nome}###${cpf}">${nome} ${cpf ? '(' + cpf + ')' : ''}</option>`;
    });

    document.getElementById('select-testemunha-1').innerHTML = options;
    document.getElementById('select-testemunha-2').innerHTML = options;
    document.getElementById('cpf-t1').innerText = '';
    document.getElementById('cpf-t2').innerText = '';

    const pdfUrl = `${API_URL}/documentos/view/${docId}?token=${currentToken}`;
    
    renderPdfToContainer(pdfUrl, 'pdf-viewer-testemunhas', () => {
        formArea.style.display = 'block';
        setTimeout(() => {
            setupHighDpiCanvas('canvas-testemunha-1', ctxTestemunhas, 'ctx1');
            setupHighDpiCanvas('canvas-testemunha-2', ctxTestemunhas, 'ctx2');
        }, 100);
    });
};

window.limparCanvasTestemunha = function(index) {
    const canvas = document.getElementById('canvas-testemunha-' + index);
    const ctx = index === 1 ? ctxTestemunhas.ctx1 : ctxTestemunhas.ctx2;
    const dpr = window.devicePixelRatio || 1;
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
};

window.salvarAssinaturasTestemunhas = async function() {
    const s1 = document.getElementById('select-testemunha-1').value;
    const s2 = document.getElementById('select-testemunha-2').value;

    if (!s1 || !s2) { alert('Selecione as duas testemunhas.'); return; }
    if (s1 === s2) { alert('Selecione testemunhas diferentes.'); return; }

    if (isCanvasBlank('canvas-testemunha-1') || isCanvasBlank('canvas-testemunha-2')) {
        alert('Colete a assinatura de ambas as testemunhas.'); return;
    }

    const doc = currentDocDataForWitness;
    if(!doc || !doc.file_path) { alert('Documento original não encontrado.'); return; }
    if (typeof PDFLib === 'undefined') { alert('A biblioteca de processamento de PDF não está carregada.'); return; }

    const btn = document.getElementById('btn-salvar-testemunhas');
    const originalBtn = btn.innerHTML;
    try {
        btn.disabled = true;
        btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Processando PDF...';

        const pdfUrl = `${API_URL}/documentos/download/${doc.id}?token=${currentToken}`;
        const pdfResp = await fetch(pdfUrl);
        if(!pdfResp.ok) throw new Error('Não foi possível baixar o PDF original.');
        const existingPdfBytes = await pdfResp.arrayBuffer();

        const pdfDoc = await PDFLib.PDFDocument.load(existingPdfBytes);

        const pages = pdfDoc.getPages();
        const sigPage = pages[0];
        const { width: pageWidth, height: pageHeight } = sigPage.getSize(); // 794 x 1123
        const innerWidth = (pageWidth - 112) / 2 - 20;

        // --- Captura canvas em alta resolução (3x DPI) ---
        async function getHQCanvas(canvasId) {
            const src = document.getElementById(canvasId);
            const dpr = window.devicePixelRatio || 1;
            const scale = 3;
            const off = document.createElement('canvas');
            off.width  = src.width  * scale / dpr;
            off.height = src.height * scale / dpr;
            const ctx = off.getContext('2d');
            ctx.scale(scale, scale);
            ctx.drawImage(src, 0, 0, src.width / dpr, src.height / dpr);
            return fetch(off.toDataURL('image/png')).then(r => r.arrayBuffer());
        }

        const data1 = s1.split('###');
        const data2 = s2.split('###');

        // Em PDF-Lib, Y=0 é o base da página. (Altura = 1123).
        // Organizando de cima para baixo (Y decrescente):
        const t1LabelY = 360;
        const t1ImgY   = 270; // altura 80 (cobre de 270 a 350)
        const t1LineY  = 260; // a linha do assinante fica aqui
        const t1NameY  = 240;
        const t1CpfY   = 225;
        const tImgH    = 80;

        // ══ TESTEMUNHA 1 (Esquerda) ══
        const t1X = 56;
        sigPage.drawText('Testemunha 1:', { x: t1X, y: t1LabelY, size: 10, color: PDFLib.rgb(0.2, 0.2, 0.2) });
        
        const png1Bytes = await getHQCanvas('canvas-testemunha-1');
        const png1Image = await pdfDoc.embedPng(png1Bytes);
        sigPage.drawImage(png1Image, { x: t1X, y: t1ImgY, width: innerWidth, height: tImgH });
        
        sigPage.drawLine({ start: { x: t1X, y: t1LineY }, end: { x: t1X + innerWidth, y: t1LineY }, thickness: 1, color: PDFLib.rgb(0.2, 0.2, 0.2) });
        sigPage.drawText(data1[0], { x: t1X, y: t1NameY, size: 10, color: PDFLib.rgb(0, 0, 0) });
        sigPage.drawText(`CPF: ${data1[1] || 'N/D'}`, { x: t1X, y: t1CpfY, size: 9, color: PDFLib.rgb(0.35, 0.35, 0.35) });

        // ══ TESTEMUNHA 2 (Direita) ══
        const t2X = pageWidth - 56 - innerWidth;
        sigPage.drawText('Testemunha 2:', { x: t2X, y: t1LabelY, size: 10, color: PDFLib.rgb(0.2, 0.2, 0.2) });

        const png2Bytes = await getHQCanvas('canvas-testemunha-2');
        const png2Image = await pdfDoc.embedPng(png2Bytes);
        sigPage.drawImage(png2Image, { x: t2X, y: t1ImgY, width: innerWidth, height: tImgH });
        
        sigPage.drawLine({ start: { x: t2X, y: t1LineY }, end: { x: t2X + innerWidth, y: t1LineY }, thickness: 1, color: PDFLib.rgb(0.2, 0.2, 0.2) });
        sigPage.drawText(data2[0], { x: t2X, y: t1NameY, size: 10, color: PDFLib.rgb(0, 0, 0) });
        sigPage.drawText(`CPF: ${data2[1] || 'N/D'}`, { x: t2X, y: t1CpfY, size: 9, color: PDFLib.rgb(0.35, 0.35, 0.35) });

        const modifiedPdfBytes = await pdfDoc.save();
        const file = new File([modifiedPdfBytes], doc.file_name, { type: 'application/pdf' });
        const formData = new FormData();
        formData.append('document_id', doc.id); // Força UPDATE em vez de INSERT
        formData.append('file', file);
        formData.append('colaborador_id', viewedColaborador.id);
        formData.append('colaborador_nome', viewedColaborador.nome_completo || 'Desconhecido');
        formData.append('tab_name', doc.tab_name);
        formData.append('document_type', doc.document_type);
        formData.append('assinafy_status', 'Testemunhas'); // Atualiza status
        if(doc.year) formData.append('year', doc.year);
        if(doc.month) formData.append('month', doc.month);

        btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Salvando Documento...';
        const resUpload = await fetch(`${API_URL}/documentos`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${currentToken}` },
            body: formData
        });

        if(!resUpload.ok) {
            const errRes = await resUpload.json().catch(()=>({}));
            throw new Error(errRes.error || 'Falha ao reenviar documento com assinaturas.');
        }

        alert('Assinaturas adicionadas com sucesso!');
        document.getElementById('modal-assinatura-testemunhas').style.display = 'none';
        
        await loadDocumentosList();
        const activeTab = document.querySelector('#tabs-list li.active');
        if(activeTab) {
            renderTabContent(activeTab.dataset.tab, activeTab.textContent, true);
        } else {
            renderTabContent('Advertências', 'Advertências', true);
        }
    } catch (e) {
        console.error(e);
        alert('Erro ao salvar assinaturas: ' + e.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalBtn;
    }
};

// --- LÓGICA ASSINATURA COLABORADOR (Advertência) ---
let ctxColaborador = {};
let currentDocIdForColab = null;

window.abrirModalAssinaturaColaborador = async function(docId) {
    currentDocIdForColab = docId;
    const doc = currentDocs.find(d => d.id === docId);

    const modal = document.getElementById('modal-assinatura-colaborador');
    const formArea = document.getElementById('area-assinatura-colaborador');
    formArea.style.display = 'none';
    modal.style.display = 'block';

    document.getElementById('nome-assinatura-colab').innerText = viewedColaborador.nome_completo || 'Colaborador';

    const pdfUrl = `${API_URL}/documentos/view/${docId}?token=${currentToken}`;
    
    renderPdfToContainer(pdfUrl, 'pdf-viewer-colaborador', () => {
        formArea.style.display = 'block';
        setTimeout(() => {
            setupHighDpiCanvas('canvas-colaborador', ctxColaborador, 'ctx1');
        }, 100);
    });
};

window.limparCanvasColaborador = function() {
    const canvas = document.getElementById('canvas-colaborador');
    const ctx = ctxColaborador.ctx1;
    const dpr = window.devicePixelRatio || 1;
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
};

window.salvarAssinaturaColaborador = async function() {
    if (isCanvasBlank('canvas-colaborador')) {
        alert('A assinatura do colaborador é obrigatória.'); return;
    }

    const doc = currentDocs.find(d => d.id === currentDocIdForColab);
    if(!doc || !doc.file_path) { alert('Documento não encontrado.'); return; }

    const btn = document.getElementById('btn-salvar-colaborador');
    const originalBtn = btn.innerHTML;
    try {
        btn.disabled = true;
        btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Processando...';

        const pdfUrl = `${API_URL}/documentos/download/${doc.id}?token=${currentToken}`;
        const pdfResp = await fetch(pdfUrl);
        if(!pdfResp.ok) throw new Error('Não foi possível baixar o PDF original.');
        const existingPdfBytes = await pdfResp.arrayBuffer();

        const pdfDoc = await PDFLib.PDFDocument.load(existingPdfBytes);
        const pages = pdfDoc.getPages();
        const lastPage = pages[0]; // Agora garantimos que tudo fica na página 1
        const { width: pgW, height: pgH } = lastPage.getSize();

        // Captura de alta qualidade
        async function getHQCanvas2(canvasId) {
            const src = document.getElementById(canvasId);
            const dpr = window.devicePixelRatio || 1;
            const scale = 3;
            const off = document.createElement('canvas');
            off.width  = src.width  * scale / dpr;
            off.height = src.height * scale / dpr;
            const ctx = off.getContext('2d');
            ctx.scale(scale, scale);
            ctx.drawImage(src, 0, 0, src.width / dpr, src.height / dpr);
            return fetch(off.toDataURL('image/png')).then(r => r.arrayBuffer());
        }

        // --- COLABORADOR (Abaixo, Centro) ---
        const cImgH = 80;
        const cWidth = 321; // Mesma largura das testemunhas
        const cX = (pgW - cWidth) / 2;
        
        const cLabelY = 190;
        const cImgY   = 100;
        const cLineY  = 90;
        const cNameY  = 70;
        const cCpfY   = 55;

        // Label
        lastPage.drawText('Colaborador (Ciente):', { x: cX, y: cLabelY, size: 10, color: PDFLib.rgb(0.2, 0.2, 0.2) });

        // Imagem da assinatura
        const png1Bytes = await getHQCanvas2('canvas-colaborador');
        const png1Image = await pdfDoc.embedPng(png1Bytes);
        lastPage.drawImage(png1Image, { x: cX, y: cImgY, width: cWidth, height: cImgH });
        
        // Linha e textos
        lastPage.drawLine({ start: { x: cX, y: cLineY }, end: { x: cX + cWidth, y: cLineY }, thickness: 1, color: PDFLib.rgb(0.2, 0.2, 0.2) });
        lastPage.drawText(viewedColaborador.nome_completo || 'Colaborador', { x: cX, y: cNameY, size: 10, color: PDFLib.rgb(0, 0, 0) });
        lastPage.drawText(`CPF: ${viewedColaborador.cpf || 'N/D'}`, { x: cX, y: cCpfY, size: 9, color: PDFLib.rgb(0.35, 0.35, 0.35) });

        const modifiedPdfBytes = await pdfDoc.save();
        const file = new File([modifiedPdfBytes], doc.file_name, { type: 'application/pdf' });
        const formData = new FormData();
        formData.append('document_id', doc.id);
        formData.append('file', file);
        formData.append('colaborador_id', viewedColaborador.id);
        formData.append('colaborador_nome', viewedColaborador.nome_completo || 'Desconhecido');
        formData.append('tab_name', doc.tab_name);
        formData.append('document_type', doc.document_type);
        formData.append('assinafy_status', 'Assinado'); 
        if(doc.year) formData.append('year', doc.year);
        if(doc.month) formData.append('month', doc.month);

        btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Salvando Documento...';
        const resUpload = await fetch(`${API_URL}/documentos`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${currentToken}` },
            body: formData
        });

        if(!resUpload.ok) {
            const errRes = await resUpload.json().catch(()=>({}));
            throw new Error(errRes.error || 'Falha ao reenviar documento assinado.');
        }

        alert('Assinatura do colaborador coletada!');
        document.getElementById('modal-assinatura-colaborador').style.display = 'none';
        
        await loadDocumentosList();
        
        const activeTab = document.querySelector('#tabs-list li.active');
        if(activeTab) {
            renderTabContent(activeTab.dataset.tab, activeTab.textContent, true);
        } else {
            renderTabContent('Advertências', 'Advertências', true);
        }
    } catch (e) {
        console.error(e);
        alert('Erro ao salvar assinatura: ' + e.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalBtn;
    }
};

// ============================================================
// ABA FICHA DE EPI NO PRONTUÁRIO
// ============================================================
async function renderFichaEpiTab(container) {
    container.innerHTML = '<p class="text-muted">Carregando fichas de EPI...</p>';
    const colabId = viewedColaborador?.id;
    if (!colabId) { container.innerHTML = '<div class="alert alert-info">Colaborador não identificado.</div>'; return; }

    let fichas = [], templates = [];
    try {
        [fichas, templates] = await Promise.all([
            apiGet(`/colaboradores/${colabId}/epi-fichas`),
            apiGet('/epi-templates')
        ]);
    } catch(e) {
        container.innerHTML = '<div class="alert alert-danger">Erro ao carregar dados de EPI.</div>';
        return;
    }

    const fichaAtiva = fichas.find(f => f.status === 'ativa');

    const dept = viewedColaborador?.departamento || '';
    const templateDoColab = templates.find(t => (t.departamentos||[]).includes(dept)) ||
                            templates.find(t => t.grupo === dept) || templates[0];

    let btnDesabilitado = false;
    if (fichaAtiva && templateDoColab) {
        const ok = JSON.stringify((fichaAtiva.snapshot_epis||[]).slice().sort()) === JSON.stringify((templateDoColab.epis||[]).slice().sort())
            && (fichaAtiva.snapshot_termo||'') === (templateDoColab.termo_texto||'')
            && (fichaAtiva.snapshot_rodape||'') === (templateDoColab.rodape_texto||'')
            && fichaAtiva.grupo === templateDoColab.grupo;
        if (ok) btnDesabilitado = true;
    }

    const fmtDate = iso => {
        if (!iso) return '-';
        const d = new Date(iso);
        return String(d.getDate()).padStart(2,'0') + '/' + String(d.getMonth()+1).padStart(2,'0') + '/' + d.getFullYear();
    };

    container.innerHTML = `
        <div style="margin-bottom:1.25rem;">
            <h3 style="margin:0 0 4px;font-size:1.1rem;font-weight:700;color:#0f172a;">Fichas de EPI</h3>
            <p style="margin:0;font-size:0.82rem;color:#64748b;">Hist&oacute;rico para ${viewedColaborador?.nome_completo || ''}.</p>
        </div>

        ${fichaAtiva ? `
        <div style="background:#f0fdf4;border:1.5px solid #86efac;border-radius:10px;padding:1rem 1.25rem;margin-bottom:1.25rem;display:flex;align-items:center;gap:1rem;flex-wrap:wrap;">
            <i class="ph ph-check-circle" style="color:#16a34a;font-size:1.5rem;"></i>
            <div style="flex:1;">
                <p style="margin:0;font-weight:700;color:#15803d;">Ficha Ativa: ${fichaAtiva.grupo}</p>
                <p style="margin:2px 0 0;font-size:0.8rem;color:#166534;">Criada em ${fmtDate(fichaAtiva.created_at)}</p>
            </div>
            <button onclick="window.abrirAssinaturaEpi(${fichaAtiva.id})" class="btn btn-primary"
                    style="height:36px;display:flex;align-items:center;gap:6px;font-weight:700;">
                <i class="ph ph-pen"></i> Registrar Entrega
            </button>
        </div>` : `
        <div style="background:#fff7ed;border:1.5px solid #fed7aa;border-radius:10px;padding:1rem 1.25rem;margin-bottom:1.25rem;display:flex;align-items:center;gap:1rem;">
            <i class="ph ph-warning" style="color:#f59e0b;font-size:1.5rem;"></i>
            <p style="margin:0;font-size:0.88rem;color:#92400e;">Nenhuma ficha ativa. O sistema gerar&aacute; uma automaticamente ao salvar o template EPI.</p>
        </div>`}

        <div>
            ${fichas.length === 0 ? '<p class="text-muted" style="font-size:0.9rem;">Nenhuma ficha gerada ainda.</p>' : fichas.map(f => `
            <div style="background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:0.85rem 1.1rem;margin-bottom:0.6rem;display:flex;align-items:center;gap:1rem;flex-wrap:wrap;">
                <i class="ph ph-file-text" style="color:#64748b;font-size:1.3rem;"></i>
                <div style="flex:1;min-width:0;">
                    <p style="margin:0;font-weight:700;font-size:0.9rem;color:#0f172a;">Ficha: ${f.grupo}</p>
                    <p style="margin:2px 0 0;font-size:0.78rem;color:#64748b;">Criada: ${fmtDate(f.created_at)}${f.fechada_em ? ' &middot; Fechada: ' + fmtDate(f.fechada_em) : ''}</p>
                </div>
                <span style="background:${f.status==='ativa'?'#dcfce7':'#f1f5f9'};color:${f.status==='ativa'?'#15803d':'#475569'};border-radius:999px;padding:2px 10px;font-size:0.75rem;font-weight:700;white-space:nowrap;">
                    ${f.status === 'ativa' ? '&#9679; Ativa' : '&#9675; Fechada'}
                </span>
                <button onclick="window.previewFichaEpi(${f.id})" class="btn btn-secondary btn-sm" style="height:32px;display:flex;align-items:center;gap:4px;">
                    <i class="ph ph-eye"></i>
                </button>
            </div>
            `).join('')}
        </div>
    `;

    window._epiProntuarioData = { fichas, templates, fichaAtiva, colabId, templateDoColab };
}

// ============================================================
// FLUXO DE ASSINATURA DE ENTREGA DE EPI
// ============================================================
window.abrirAssinaturaEpi = async function(fichaId) {
    const { fichas, colabId } = window._epiProntuarioData || {};
    const ficha = (fichas || []).find(f => f.id === fichaId);
    if (!ficha) return;

    const epis = ficha.snapshot_epis || [];
    const termo = ficha.snapshot_termo || '';
    const nomeColab = viewedColaborador?.nome_completo || '';

    // Remove popup anterior se existir
    const old = document.getElementById('epi-assinatura-overlay');
    if (old) old.remove();

    const overlay = document.createElement('div');
    overlay.id = 'epi-assinatura-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#fff;display:flex;flex-direction:column;';

    const hoje = new Date();
    const hojeDD = String(hoje.getDate()).padStart(2,'0');
    const hojeM = String(hoje.getMonth()+1).padStart(2,'0');
    const hojeStr = hojeDD + '/' + hojeM + '/' + hoje.getFullYear();

    overlay.innerHTML = `
        <div style="background:#1e3a5f;padding:1rem 1.5rem;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;">
            <div style="display:flex;align-items:center;gap:0.75rem;">
                <i class="ph ph-pen" style="color:#93c5fd;font-size:1.4rem;"></i>
                <div>
                    <p style="margin:0;color:#f1f5f9;font-weight:700;font-size:1rem;">Registro de Entrega de EPI</p>
                    <p style="margin:0;color:#93c5fd;font-size:0.8rem;">${nomeColab} &mdash; ${ficha.grupo}</p>
                </div>
            </div>
            <button onclick="document.getElementById('epi-assinatura-overlay').remove()"
                    style="background:rgba(255,255,255,0.15);border:none;color:#fff;width:32px;height:32px;border-radius:50%;cursor:pointer;font-size:1.1rem;display:flex;align-items:center;justify-content:center;">&times;</button>
        </div>
        <div style="background:#f8fafc;border-bottom:1px solid #e2e8f0;padding:0.6rem 2rem;display:flex;align-items:center;gap:1rem;flex-shrink:0;">
            <div id="step-ind-1" style="display:flex;align-items:center;gap:6px;font-size:0.85rem;font-weight:700;color:#1e3a5f;">
                <span style="background:#1e3a5f;color:#fff;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:0.78rem;">1</span>
                Selecionar EPIs
            </div>
            <div style="flex:1;height:2px;background:#e2e8f0;"></div>
            <div id="step-ind-2" style="display:flex;align-items:center;gap:6px;font-size:0.85rem;font-weight:700;color:#94a3b8;">
                <span id="step-badge-2" style="background:#cbd5e1;color:#fff;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:0.78rem;">2</span>
                Assinar
            </div>
            <div style="flex:1;height:2px;background:#e2e8f0;"></div>
            <div id="step-ind-3" style="display:flex;align-items:center;gap:6px;font-size:0.85rem;font-weight:700;color:#94a3b8;">
                <span id="step-badge-3" style="background:#cbd5e1;color:#fff;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:0.78rem;">3</span>
                Confirmar
            </div>
        </div>
        <div id="epi-assin-body" style="flex:1;overflow-y:auto;padding:1.5rem 2rem;">
            <div id="epi-step-1">
                <div style="display:flex;align-items:flex-end;gap:1rem;margin-bottom:1.25rem;flex-wrap:wrap;">
                    <div>
                        <label style="display:block;font-size:0.85rem;font-weight:700;color:#374151;margin-bottom:4px;">Data de Entrega:</label>
                        <input type="date" id="epi-data-entrega"
                               style="border:1.5px solid #e2e8f0;border-radius:8px;padding:0.5rem 0.9rem;font-size:0.9rem;outline:none;cursor:pointer;">
                    </div>
                    <div style="flex:1;min-width:180px;">
                        <label style="display:block;font-size:0.85rem;font-weight:700;color:#374151;margin-bottom:4px;">Pesquisar:</label>
                        <div style="position:relative;">
                            <i class="ph ph-magnifying-glass" style="position:absolute;left:10px;top:50%;transform:translateY(-50%);color:#94a3b8;font-size:1rem;pointer-events:none;"></i>
                            <input type="text" id="epi-busca" placeholder="Filtrar EPIs..."
                                   oninput="window._filtrarEpis(this.value)"
                                   style="width:100%;border:1.5px solid #e2e8f0;border-radius:8px;padding:0.5rem 0.85rem 0.5rem 2.2rem;font-size:0.88rem;outline:none;box-sizing:border-box;">
                        </div>
                    </div>
                </div>
                <p style="font-size:0.82rem;color:#64748b;margin:0 0 0.75rem;">Ajuste a <strong>quantidade</strong> desejada de cada EPI:</p>
                <div id="epi-lista-botoes" style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;"></div>
                <p id="epi-select-warn" style="color:#dc2626;font-size:0.85rem;margin:0.75rem 0 0;display:none;">&#9888; Defina quantidade &gt; 0 em pelo menos um EPI.</p>
            </div>
            <div id="epi-step-2" style="display:none; grid-template-columns: 1fr 1fr; gap: 2rem;">
                <!-- Esquerda: EPIs e Termo -->
                <div style="display:flex;flex-direction:column;min-width:0;">
                    <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:0.85rem 1rem;margin-bottom:1rem;">
                        <p style="font-size:0.85rem;font-weight:700;color:#166534;margin:0 0 6px;">EPIs para entrega em <strong id="epi-data-display"></strong>:</p>
                        <ul id="epi-lista-selecionada" style="margin:0;padding-left:1.25rem;font-size:0.85rem;color:#15803d;column-count:1;"></ul>
                    </div>
                    <p style="font-size:0.85rem;font-weight:700;color:#374151;margin:0 0 6px;">Termo de Responsabilidade:</p>
                    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:0.9rem;font-size:0.82rem;color:#374151;overflow-y:auto;line-height:1.6;white-space:pre-wrap;flex:1;">${termo}</div>
                </div>
                <!-- Direita: Assinatura -->
                <div style="display:flex;flex-direction:column;min-width:0;">
                    <p style="font-size:0.95rem;font-weight:700;color:#0f172a;margin:0 0 6px;"><i class="ph ph-pen" style="color:#1e3a5f;"></i> Assinatura do Colaborador:</p>
                    <p style="font-size:0.8rem;color:#64748b;margin:0 0 8px;">Assine abaixo. Ser&aacute; aplicada em todos os itens entregues.</p>
                    <div style="border:2px dashed #94a3b8;border-radius:10px;background:#fafafa;position:relative;flex:1;display:flex;">
                        <canvas id="epi-signature-canvas" width="900" height="450"
                                style="width:100%;height:100%;min-height:220px;border-radius:8px;touch-action:none;cursor:crosshair;display:block;"></canvas>
                        <button onclick="window._limparAssinatura()"
                                style="position:absolute;top:8px;right:8px;background:#f1f5f9;border:1px solid #cbd5e1;border-radius:6px;padding:4px 12px;font-size:0.78rem;color:#475569;cursor:pointer;">Limpar</button>
                    </div>
                    <p id="epi-assin-warn" style="color:#dc2626;font-size:0.82rem;margin:0.5rem 0 0;display:none;">A assinatura &eacute; obrigat&oacute;ria.</p>
                </div>
            </div>
            <div id="epi-step-3" style="display:none;text-align:center;padding:4rem 1rem;">
                <i class="ph ph-check-circle" style="font-size:5rem;color:#16a34a;display:block;margin-bottom:1rem;"></i>
                <p style="font-weight:700;font-size:1.2rem;color:#15803d;margin:0 0 6px;">Entrega registrada com sucesso!</p>
                <p style="font-size:0.9rem;color:#64748b;">EPIs e assinatura salvos na ficha.</p>
            </div>
        </div>
        <div id="epi-assin-footer" style="border-top:1px solid #e2e8f0;padding:1rem 2rem;display:flex;justify-content:space-between;align-items:center;background:#f8fafc;flex-shrink:0;">
            <button id="btn-assin-back" onclick="window._assinStep(1)"
                    style="display:none;background:#f1f5f9;border:1px solid #cbd5e1;border-radius:8px;padding:0.65rem 1.5rem;font-weight:600;font-size:0.9rem;cursor:pointer;color:#475569;">
                <i class="ph ph-arrow-left"></i> Voltar
            </button>
            <div></div>
            <button id="btn-assin-next" onclick="window._assinNextStep()" class="btn btn-primary"
                    style="padding:0.65rem 2rem;font-weight:700;font-size:0.95rem;display:flex;align-items:center;gap:8px;">
                Pr&oacute;ximo <i class="ph ph-arrow-right"></i>
            </button>
        </div>
    `;

    document.body.appendChild(overlay);

    window._assinCurrentStep = 1;
    window._assinFichaId = fichaId;
    window._assinColabId = colabId;
    window._assinEpisDisponiveis = epis;
    window._assinQtds = {};
    setTimeout(() => {
        window._initSignatureCanvas();
        const today = new Date();
        const di = document.getElementById('epi-data-entrega');
        if (di) { di.value = today.getFullYear()+'-'+String(today.getMonth()+1).padStart(2,'0')+'-'+String(today.getDate()).padStart(2,'0'); }
        window._renderEpiGrid('');
    }, 100);
};

window._renderEpiGrid = function(filtro) {
    const epis = window._assinEpisDisponiveis || [];
    const c2 = document.getElementById('epi-lista-botoes');
    if (!c2) return;
    const f = (filtro||'').toLowerCase().trim();
    const filtered = f ? epis.filter(e => e.toLowerCase().includes(f)) : epis;
    c2.innerHTML = '';
    filtered.forEach(epi => {
        const qty = window._assinQtds[epi]||0;
        const card = document.createElement('div');
        card.setAttribute('data-epi-card', epi);
        card.style.cssText='display:flex;align-items:center;justify-content:space-between;padding:0.65rem 1rem;border:2px solid '+(qty>0?'#16a34a':'#e2e8f0')+';border-radius:10px;background:'+(qty>0?'#f0fdf4':'#fff')+';box-shadow:0 1px 3px rgba(0,0,0,0.06);';
        const lbl=document.createElement('span'); lbl.style.cssText='font-size:0.88rem;color:#0f172a;font-weight:600;flex:1;margin-right:0.5rem;line-height:1.3;'; lbl.textContent=epi;
        const ctrl=document.createElement('div'); ctrl.style.cssText='display:flex;align-items:center;gap:6px;flex-shrink:0;';
        const btnM=document.createElement('button'); btnM.textContent='−'; btnM.style.cssText='background:'+(qty>0?'#1e3a5f':'#e2e8f0')+';color:#fff;border:none;border-radius:6px;width:32px;height:32px;cursor:pointer;font-size:1.1rem;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;';
        btnM.addEventListener('click',()=>window._setEpiQty(epi,Math.max(0,(window._assinQtds[epi]||0)-1)));
        const inp=document.createElement('input'); inp.type='number'; inp.min='0'; inp.value=qty; inp.style.cssText='width:48px;text-align:center;border:1.5px solid #e2e8f0;border-radius:6px;padding:4px;font-size:0.95rem;font-weight:700;color:#0f172a;';
        inp.addEventListener('input',()=>window._setEpiQty(epi,Math.max(0,parseInt(inp.value)||0)));
        const btnP=document.createElement('button'); btnP.textContent='+'; btnP.style.cssText='background:#1e3a5f;color:#fff;border:none;border-radius:6px;width:32px;height:32px;cursor:pointer;font-size:1.1rem;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;';
        btnP.addEventListener('click',()=>window._setEpiQty(epi,(window._assinQtds[epi]||0)+1));
        ctrl.appendChild(btnM); ctrl.appendChild(inp); ctrl.appendChild(btnP);
        card.appendChild(lbl); card.appendChild(ctrl); c2.appendChild(card);
    });
};

window._setEpiQty = function(epi,qty) {
    window._assinQtds=window._assinQtds||{}; window._assinQtds[epi]=qty;
    const card=document.querySelector('[data-epi-card="'+CSS.escape(epi)+'"]');
    if(card){ card.style.borderColor=qty>0?'#16a34a':'#e2e8f0'; card.style.background=qty>0?'#f0fdf4':'#fff';
        const inp=card.querySelector('input[type=number]'); if(inp) inp.value=qty;
        const btns=card.querySelectorAll('button'); if(btns[0]) btns[0].style.background=qty>0?'#1e3a5f':'#e2e8f0'; }
    if(qty>0){ const w=document.getElementById('epi-select-warn'); if(w) w.style.display='none'; }
};

window._filtrarEpis = function(f){ window._renderEpiGrid(f); };

window._buildItensFromQtds = function() {
    const r=[];
    Object.entries(window._assinQtds||{}).forEach(([e,q])=>{ for(let i=0;i<q;i++) r.push(e); });
    return r;
};

window._addEpiToList=function(e){ window._setEpiQty(e,(window._assinQtds[e]||0)+1); };
window._removeEpiFromList=function(){};
window._renderItensLista=function(){};

window._syncEpiSelection = function() {};

// Navega para step
window._assinStep = function(n) {
    [1,2,3].forEach(s => {
        const el = document.getElementById(`epi-step-${s}`);
        if (el) {
            if (s === n) el.style.display = (s === 2) ? 'grid' : 'block';
            else el.style.display = 'none';
        }
    });
    window._assinCurrentStep = n;

    // Atualiza indicadores de step
    [1,2,3].forEach(s => {
        const badge = document.getElementById(`step-badge-${s}`);
        const ind   = document.getElementById(`step-ind-${s}`);
        if (!badge || !ind) return;
        const done  = s < n;
        const active= s === n;
        badge.style.background = done ? '#16a34a' : active ? '#1e3a5f' : '#cbd5e1';
        if (ind) ind.style.color = active ? '#1e3a5f' : done ? '#15803d' : '#94a3b8';
    });

    const btnBack = document.getElementById('btn-assin-back');
    const btnNext = document.getElementById('btn-assin-next');
    if (btnBack) btnBack.style.display = n > 1 && n < 3 ? '' : 'none';
    if (btnNext) {
        if (n === 1) { btnNext.innerHTML = 'Pr&oacute;ximo <i class="ph ph-arrow-right"></i>'; btnNext.style.display = ''; }
        else if (n === 2) { btnNext.innerHTML = '<i class="ph ph-check"></i> Confirmar Entrega'; btnNext.style.display = ''; }
        else { btnNext.innerHTML = '<i class="ph ph-x"></i> Fechar'; btnNext.style.display = ''; }
    }

    // Atualiza lista selecionada no step 2
    if (n === 2) {
        const ul = document.getElementById('epi-lista-selecionada');
        if (ul) { window._assinItens = window._buildItensFromQtds ? window._buildItensFromQtds() : []; ul.innerHTML = window._assinItens.map(e=>'<li>'+e+'</li>').join(''); }
        const dd = document.getElementById('epi-data-display');
        if (dd) { const inp = document.getElementById('epi-data-entrega'); if(inp&&inp.value){ const p=inp.value.split('-'); dd.textContent=p.length===3?p[2]+'/'+p[1]+'/'+p[0]:inp.value; } }
        window._initSignatureCanvas();
    }
};

// Botão "Próximo / Confirmar / Fechar"
window._assinNextStep = async function() {
    const step = window._assinCurrentStep;

    if (step === 1) {
        window._assinItens = window._buildItensFromQtds ? window._buildItensFromQtds() : [];
        if (!window._assinItens || window._assinItens.length === 0) {
            const warn = document.getElementById('epi-select-warn');
            if (warn) warn.style.display = '';
            return;
        }
        window._assinStep(2);
        return;
    }

    if (step === 2) {
        // Valida assinatura
        if (!window._assinaturaTemConteudo()) {
            const warn = document.getElementById('epi-assin-warn');
            if (warn) warn.style.display = '';
            return;
        }

        // Captura assinatura
        const canvas = document.getElementById('epi-signature-canvas');
        const assinaturaBase64 = canvas.toDataURL('image/png');

        // Salva no backend
        try {
            const btnNext = document.getElementById('btn-assin-next');
            if (btnNext) { btnNext.disabled = true; btnNext.innerHTML = 'Salvando...'; }

            const resp = await fetch(`${API_URL}/epi-fichas/${window._assinFichaId}/entregas`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${currentToken}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    colaborador_id: window._assinColabId,
                    epis_entregues: window._buildItensFromQtds ? window._buildItensFromQtds() : (window._assinItens||[]),
                    assinatura_base64: assinaturaBase64,
                    data_entrega: (()=>{ const i=document.getElementById('epi-data-entrega'); if(!i||!i.value) return ''; const p=i.value.split('-'); return p.length===3?p[2]+'/'+p[1]+'/'+p[0]:i.value; })()
                })
            });
            const result = await resp.json();
            if (result.error) throw new Error(result.error);

            window._assinStep(3);
            // Salvar PDF no OneDrive (fire-and-forget)
            (async () => {
                try {
                    const { fichas: ff, colabId: cid } = window._epiProntuarioData || {};
                    const fich = (ff||[]).find(f => f.id === window._assinFichaId);
                    if (fich && cid) {
                        if (typeof ensureHeaderLogo === 'function') await ensureHeaderLogo().catch(()=>{});
                        const tpl = (window._epiProntuarioData.templates||[]).find(t => t.grupo === fich.grupo) || fich;
                        const { jsPDF } = window.jspdf;
                        const itens = window._buildItensFromQtds ? window._buildItensFromQtds() : [];
                        const dataVal = (()=>{ const i=document.getElementById('epi-data-entrega'); if(!i||!i.value) return ''; const p=i.value.split('-'); return p.length===3?p[2]+'/'+p[1]+'/'+p[0]:i.value; })();
                        const lf = itens.map(nome => ({ data: dataVal, descricao: nome, assinatura_base64: assinaturaBase64 }));
                        const doc = window.gerarDocEpi(tpl, viewedColaborador||{}, jsPDF, lf);
                        // Usar arraybuffer e converter para base64 manualmente
                        const pdfBytes = doc.output('arraybuffer');
                        const pdfB64 = 'data:application/pdf;base64,' + btoa(String.fromCharCode(...new Uint8Array(pdfBytes)));
                        await fetch(API_URL + '/epi-fichas/' + window._assinFichaId + '/save-onedrive', {
                            method: 'POST',
                            headers: { 'Authorization': 'Bearer ' + currentToken, 'Content-Type': 'application/json' },
                            body: JSON.stringify({ pdf_base64: pdfB64, colaborador_id: cid })
                        }).catch(e2 => console.warn('[save-onedrive]', e2));
                    }
                } catch(se) { console.warn('[save-onedrive]', se); }
            })();
            // Recarrega a aba após 2s e abre o PDF na tela
            setTimeout(() => {
                const old = document.getElementById('epi-assinatura-overlay');
                if (old) old.remove();
                
                // Abre o visualizador do PDF da ficha para mostrar a nova assinatura
                window.previewFichaEpi(window._assinFichaId);
                
                const activeTab = document.querySelector('#tabs-list li.active');
                if (activeTab) renderTabContent(activeTab.dataset.tab, activeTab.textContent, true);
            }, 2000);

        } catch(err) {
            alert('Erro ao salvar entrega: ' + err.message);
            const btnNext = document.getElementById('btn-assin-next');
            if (btnNext) { btnNext.disabled = false; btnNext.innerHTML = '<i class="ph ph-check"></i> Confirmar Entrega'; }
        }
        return;
    }

    if (step === 3) {
        const old = document.getElementById('epi-assinatura-overlay');
        if (old) old.remove();
    }
};

// Canvas de assinatura
window._initSignatureCanvas = function() {
    const canvas = document.getElementById('epi-signature-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#1e3a5f';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    let drawing = false;
    let lastX = 0, lastY = 0;

    const getPos = (e) => {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        if (e.touches) {
            return { x: (e.touches[0].clientX - rect.left) * scaleX, y: (e.touches[0].clientY - rect.top) * scaleY };
        }
        return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
    };

    canvas.onmousedown = canvas.ontouchstart = (e) => {
        e.preventDefault();
        drawing = true;
        const p = getPos(e);
        lastX = p.x; lastY = p.y;
    };
    canvas.onmousemove = canvas.ontouchmove = (e) => {
        e.preventDefault();
        if (!drawing) return;
        const p = getPos(e);
        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
        lastX = p.x; lastY = p.y;
    };
    canvas.onmouseup = canvas.ontouchend = () => { drawing = false; };
    canvas.onmouseleave = () => { drawing = false; };
};

window._limparAssinatura = function() {
    const canvas = document.getElementById('epi-signature-canvas');
    if (!canvas) return;
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
};

window._assinaturaTemConteudo = function() {
    const canvas = document.getElementById('epi-signature-canvas');
    if (!canvas) return false;
    const data = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
    for (let i = 3; i < data.length; i += 4) { if (data[i] > 0) return true; }
    return false;
};

window.gerarNovaFichaEpi = async function() {
    const data = window._epiProntuarioData || {};
    const { templates, fichaAtiva, colabId, templateDoColab } = data;
    if (!templates || !colabId) return;

    const template = templateDoColab || templates[0];
    if (!template) {
        alert('Nenhum template de EPI encontrado para o departamento deste colaborador.');
        return;
    }

    if (fichaAtiva) {
        const ok = confirm(`Já existe uma ficha ativa (${fichaAtiva.grupo}). Deseja fechar a atual e criar nova?`);
        if (!ok) return;
    }

    const res = await fetch(`${API_URL}/colaboradores/${colabId}/epi-fichas`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${currentToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            template_id: template.id,
            grupo: template.grupo,
            snapshot_epis: template.epis,
            snapshot_termo: template.termo_texto,
            snapshot_rodape: template.rodape_texto
        })
    });
    const created = await res.json();
    if (!created.id) { alert('Erro ao criar ficha.'); return; }

    // Recarrega a aba para mostrar a nova ficha
    const activeTab = document.querySelector('#tabs-list li.active');
    if (activeTab) renderTabContent(activeTab.dataset.tab, activeTab.textContent, true);
    
    // Abre a visualização automaticamente após criar a nova ficha (assinada)
    if (created.id) {
        setTimeout(() => { window.previewFichaEpi(created.id); }, 500);
    }
};

window.previewFichaEpi = async function(fichaId) {
    const { fichas, templates } = window._epiProntuarioData || {};
    const ficha = (fichas||[]).find(f=>f.id===fichaId);
    if (!ficha) { alert('Ficha nao encontrada.'); return; }
    let linhasFilled = [];
    try {
        const entregas = await apiGet('/epi-fichas/'+fichaId+'/entregas');
        entregas.forEach(e => {
            const epis = e.epis_entregues||[];
            if(epis.length===0) linhasFilled.push({ data:e.data_entrega||'', descricao:'', assinatura_base64:e.assinatura_base64 });
            else epis.forEach(nome => linhasFilled.push({ data:e.data_entrega||'', descricao:nome, assinatura_base64:e.assinatura_base64 }));
        });
    } catch(err) { console.warn('Erro entregas:', err); }

    const template = (templates||[]).find(t=>t.grupo===ficha.grupo) ||
        { epis:ficha.snapshot_epis||[], termo_texto:ficha.snapshot_termo, rodape_texto:ficha.snapshot_rodape, grupo:ficha.grupo };

    if (typeof ensureHeaderLogo==='function') await ensureHeaderLogo().catch(()=>{});
    const { jsPDF } = window.jspdf;
    const doc = window.gerarDocEpi(template, viewedColaborador||{}, jsPDF, linhasFilled);

    // Usar Blob URL em vez de data URI (Chrome bloqueia data: em iframes)
    const pdfBytes = doc.output('arraybuffer');
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const blobUrl = URL.createObjectURL(blob);

    const old = document.getElementById('epi-preview-overlay');
    if (old) { old._blobUrl && URL.revokeObjectURL(old._blobUrl); old.remove(); }
    
    window.closeEpiPreviewOverlay = function() {
        const o = document.getElementById('epi-preview-overlay');
        if (o) {
            if (o._blobUrl) URL.revokeObjectURL(o._blobUrl);
            o.remove();
        }
    };

    const ov = document.createElement('div');
    ov.id = 'epi-preview-overlay';
    ov._blobUrl = blobUrl;
    ov.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(15,23,42,0.92);display:flex;flex-direction:column;align-items:stretch;padding:1rem;gap:0.75rem;';

    const nomeArq = `FichaEPI_${(ficha.grupo||'EPI').replace(/\s+/g,'_')}.pdf`;
    const header = document.createElement('div');
    header.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:0 0.5rem;flex-shrink:0;';
    header.innerHTML = `
        <p style="margin:0;color:#f1f5f9;font-weight:700;font-size:1rem;">
            Ficha de EPI &mdash; ${ficha.grupo}
            ${ficha.status==='ativa' ? '<span style="color:#86efac;margin-left:8px;">&#9679; Ativa</span>' : ''}
        </p>
        <div style="display:flex;gap:8px;align-items:center;">
            <a id="epi-preview-download" href="${blobUrl}" download="${nomeArq}"
               style="background:#1e3a5f;color:#fff;border:none;padding:6px 16px;border-radius:8px;font-weight:700;font-size:0.85rem;cursor:pointer;display:flex;align-items:center;gap:6px;text-decoration:none;">
                <i class="ph ph-download"></i> Baixar
            </a>
            <button onclick="window.closeEpiPreviewOverlay()"
                    style="background:rgba(255,255,255,0.15);border:none;color:#fff;width:32px;height:32px;border-radius:50%;cursor:pointer;font-size:1.1rem;">&times;</button>
        </div>
    `;
    const iframe = document.createElement('iframe');
    iframe.src = blobUrl;
    iframe.style.cssText = 'flex:1;border:none;border-radius:8px;width:100%;';
    ov.appendChild(header);
    ov.appendChild(iframe);
    document.body.appendChild(ov);
};

// ==========================================
// SEARCH & BOOKMARKS LOGIC
// ==========================================

window._pageBookmarks = JSON.parse(localStorage.getItem('pageBookmarks') || '[]');

function getNormalizedPageSearchData() {
    const pages = [];
    for (const [key, obj] of Object.entries(BREADCRUMB_MAP)) {
        const parts = obj.path.split('→').map(p => p.trim());
        const rootPath = parts[0];
        
        let targetKey = key;
        let rootCode = obj.code;
        
        // Se a tela for interna (sem código), redireciona o clique para a root (a raiz, ex: Colaboradores)
        if (!obj.code) {
            const rootEntry = Object.entries(BREADCRUMB_MAP).find(([k, v]) => v.path === rootPath && v.code);
            if (rootEntry) {
                targetKey = rootEntry[0];
                rootCode = rootEntry[1].code;
            } else {
                // Algumas rotas raízes podem variar os nomes, tentar deduções cruas:
                if (rootPath.includes('Colaboradores')) {
                    targetKey = 'colaboradores'; rootCode = 'RHCL00';
                } else if (rootPath.includes('EPI')) {
                    targetKey = 'ficha-epi'; rootCode = 'RHEPI01';
                }
            }
        }
        
        pages.push({ key: targetKey, name: obj.path, code: rootCode });
    }
    return pages;
}

window.handlePageSearch = function(q) {
    const resDiv = document.getElementById('page-search-results');
    if (!resDiv) return;
    q = (q || '').toLowerCase().trim();
    if (!q) { resDiv.style.display = 'none'; return; }
    
    const all = getNormalizedPageSearchData();
    const filtered = all.filter(p => p.name.toLowerCase().includes(q) || (p.code && p.code.toLowerCase().includes(q)));
    
    if (filtered.length === 0) {
        resDiv.innerHTML = '<div style="padding:10px; color:#64748b; font-size:0.85rem;">Nenhuma página encontrada.</div>';
    } else {
        resDiv.innerHTML = filtered.map(p => `
            <div onclick="abrirAbaOuNavegar('${p.key}')" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='transparent'" style="padding:10px 14px; cursor:pointer; border-bottom:1px solid #f1f5f9; font-size:0.85rem; display:flex; align-items:center; gap:10px;">
                <span style="background:#f503c5; color:white; border-radius:12px; padding:2px 8px; font-size:0.7rem; font-weight:700; flex-shrink:0;">${p.code || ''}</span>
                <span style="color:#334155; font-weight:500;">${p.name}</span>
            </div>
        `).join('');
    }
    resDiv.style.display = 'block';
};

window.abrirAbaOuNavegar = function(key) {
    if (key.startsWith('tab:')) {
        const tabName = key.replace('tab:', '');
        const li = document.querySelector(`#tabs-list li[data-tab="${tabName}"]`);
        if (li) {
            // Se estivermos fora do prontuário, não rola assim direto sem abrir o colab. 
            // Mas vamos assumir que o usuário só favorita as abas quando está num colaborador
            renderTabContent(tabName, li.textContent.trim());
        }
    } else {
        navigateTo(key);
    }
    document.getElementById('page-search-results').style.display = 'none';
};

window.toggleBookmarkCurrentPage = function() {
    if (!window.currentBreadcrumbKey) return;
    const idx = window._pageBookmarks.indexOf(window.currentBreadcrumbKey);
    if (idx >= 0) {
        window._pageBookmarks.splice(idx, 1);
    } else {
        window._pageBookmarks.push(window.currentBreadcrumbKey);
    }
    localStorage.setItem('pageBookmarks', JSON.stringify(window._pageBookmarks));
    renderBookmarks();
};

window.renderBookmarks = function() {
    const list = document.getElementById('bookmarks-list');
    const starBtn = document.getElementById('btn-star-page');
    if (!list || !starBtn) return;
    
    // Update star button state (filled or outline)
    if (window._pageBookmarks.includes(window.currentBreadcrumbKey)) {
        starBtn.innerHTML = '<i class="ph-fill ph-star"></i>';
    } else {
        starBtn.innerHTML = '<i class="ph ph-star"></i>';
    }

    list.innerHTML = window._pageBookmarks.map(key => {
        const obj = BREADCRUMB_MAP[key];
        if (!obj) return '';

        // Ignorar tabs ou caminhos com setas, a menos que seja usuarios-permissoes ou form-usuario
        if ((obj.path.includes('→') && key !== 'usuarios-permissoes' && key !== 'form-usuario') || key.startsWith('tab:')) return '';
        
        let btnColor = '#f503c5';
        if (obj.path.includes('Diretoria')) {
            btnColor = '#d9480f';
        }

        let btnLabel = obj.path;
        if (key === 'usuarios-permissoes' || key === 'form-usuario') {
            btnLabel = 'Usuários';
        }

        return `<button onclick="abrirAbaOuNavegar('${key}')" style="background:${btnColor}; color:white; border:none; border-radius:16px; padding:4px 12px; font-size:0.75rem; font-weight:700; cursor:pointer; display:flex; align-items:center; gap:4px; box-shadow:0 2px 4px rgba(0,0,0,0.2); transition:transform 0.2s;" onmousedown="this.style.transform='scale(0.95)'" onmouseup="this.style.transform='scale(1)'">${btnLabel}</button>`;
    }).join('');
};

// Hook renderBookmarks inside navigateTo and renderTabContent
const _oldNavigateTo = window.navigateTo;
window.navigateTo = function(viewId, pushState) {
    _oldNavigateTo.call(window, viewId, pushState);
    if (typeof renderBookmarks === 'function') renderBookmarks();
};
const _oldRenderTabContent = window.renderTabContent;
window.renderTabContent = function(tabId, tabName, force) {
    if (_oldRenderTabContent) _oldRenderTabContent.call(window, tabId, tabName, force);
    if (typeof renderBookmarks === 'function') renderBookmarks();
};

// Start hooks
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(renderBookmarks, 500);
});

// ==========================================
// SIDEBAR TOGGLE
// ==========================================
window._sidebarCollapsed = false;

window.toggleSidebar = function() {
    const sidebar = document.getElementById('app-sidebar');
    const wrapper = document.querySelector('.main-wrapper');
    const icon = document.getElementById('sidebar-toggle-icon');
    if (!sidebar) return;
    window._sidebarCollapsed = !window._sidebarCollapsed;
    sidebar.classList.toggle('collapsed', window._sidebarCollapsed);
    wrapper && wrapper.classList.toggle('sidebar-collapsed', window._sidebarCollapsed);
    if (icon) {
        icon.className = window._sidebarCollapsed ? 'ph ph-sidebar-simple-duotone' : 'ph ph-sidebar-simple';
    }
    localStorage.setItem('sidebarCollapsed', window._sidebarCollapsed ? '1' : '0');
};

// Restore sidebar state on load
(function() {
    const saved = localStorage.getItem('sidebarCollapsed');
    if (saved === '1') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(() => {
                const sidebar = document.getElementById('app-sidebar');
                const wrapper = document.querySelector('.main-wrapper');
                const icon = document.getElementById('sidebar-toggle-icon');
                if (sidebar) sidebar.classList.add('collapsed');
                if (wrapper) wrapper.classList.add('sidebar-collapsed');
                if (icon) icon.className = 'ph ph-sidebar-simple-duotone';
                window._sidebarCollapsed = true;
            }, 100);
        });
    }
})();

// ==========================================
// PRONTUÁRIO TABS SEARCH FILTER
// ==========================================
window.filterTabsList = function(q) {
    q = (q || '').toLowerCase().trim();
    document.querySelectorAll('#tabs-list li').forEach(li => {
        const text = li.textContent.trim().toLowerCase();
        // Never hide the hidden ones (Boletim, Conjuge) unless they match
        const originallyHidden = li.id === 'tab-conjuge' || li.dataset.tab === 'Boletim de ocorrência';
        if (!q) {
            li.style.display = originallyHidden ? 'none' : '';
        } else {
            li.style.display = text.includes(q) ? '' : 'none';
        }
    });
};


// ══════════════════════════════════════════════════════════════════════
// CERTIFICADO DIGITAL (.PFX) — Assinatura Automática da America Rental
// ══════════════════════════════════════════════════════════════════════

/**
 * Carrega o status do certificado digital e atualiza o banner no Passo 2.
 * Chamado ao entrar no step 2 da admissão.
 */
window.carregarStatusCertificado = async function() {
    const banner = document.getElementById('cert-digital-banner');
    if (!banner) return;

    // Verificar se o usuário é da Diretoria
    const isDiretoria = currentUser && (
        currentUser.role === 'Diretoria' ||
        currentUser.role === 'Administrador' ||
        currentUser.departamento === 'Diretoria'
    );

    const btnGerenciar = isDiretoria
        ? `<button onclick="navigateTo('certificado-digital')"
               style="border:none;background:rgba(22,163,74,0.15);color:#166534;border-radius:6px;padding:0.35rem 0.75rem;font-size:0.78rem;font-weight:700;cursor:pointer;white-space:nowrap;display:flex;align-items:center;gap:4px;flex-shrink:0;">
               <i class="ph ph-arrow-square-out"></i> Diretoria → Certificado
           </button>`
        : '';

    const btnConfigurar = isDiretoria
        ? `<button onclick="navigateTo('certificado-digital')"
               style="border:none;background:#fef3c7;color:#92400e;border-radius:6px;padding:0.35rem 0.75rem;font-size:0.78rem;font-weight:700;cursor:pointer;white-space:nowrap;display:flex;align-items:center;gap:4px;flex-shrink:0;">
               <i class="ph ph-arrow-square-out"></i> Configurar na Diretoria
           </button>`
        : `<span style="font-size:0.76rem;opacity:0.75;white-space:nowrap;">Configure em Diretoria → Certificado Digital</span>`;

    try {
        const data = await apiGet('/certificado-digital/status');

        if (data.configurado && data.ok) {
            banner.style.background  = '#f0fdf4';
            banner.style.border      = '1.5px solid #bbf7d0';
            banner.style.color       = '#166534';
            banner.innerHTML = `
                <i class="ph ph-seal-check" style="font-size:1.3rem;color:#16a34a;flex-shrink:0;"></i>
                <div style="flex:1;">
                    <div style="font-weight:700;">✅ Assinatura Digital da Empresa Ativa</div>
                    <div style="font-size:0.76rem;margin-top:2px;opacity:0.85;">
                        ${data.cn ? `<b>${data.cn}</b> — ` : ''}Validade: ${data.validade || 'N/A'}
                        — Os documentos serão pré-assinados com o certificado antes de ir ao colaborador
                    </div>
                </div>
                ${btnGerenciar}`;
        } else {
            banner.style.background  = '#fffbeb';
            banner.style.border      = '1.5px solid #fcd34d';
            banner.style.color       = '#92400e';
            banner.innerHTML = `
                <i class="ph ph-warning" style="font-size:1.3rem;color:#d97706;flex-shrink:0;"></i>
                <div style="flex:1;">
                    <div style="font-weight:700;">Assinatura Digital não configurada</div>
                    <div style="font-size:0.76rem;margin-top:2px;opacity:0.85;">
                        Os documentos serão enviados <b>sem assinatura digital</b>.
                        ${isDiretoria ? 'Configure o certificado .pfx na Diretoria.' : 'Solicite à Diretoria para configurar o certificado digital.'}
                    </div>
                </div>
                ${btnConfigurar}`;
        }
    } catch(e) {
        banner.style.background = '#f1f5f9';
        banner.style.border     = '1.5px solid #e2e8f0';
        banner.style.color      = '#64748b';
        banner.innerHTML = `<i class="ph ph-info" style="font-size:1.1rem;"></i> <span style="flex:1;">Assinatura digital: verificação indisponível</span>`;
    }
};

/**
 * Abre o modal de gerenciamento do certificado digital.
 */
window.abrirModalCertificado = function() {
    // Criar modal se não existir
    let modal = document.getElementById('modal-cert-digital');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modal-cert-digital';
        modal.style.cssText = `position:fixed;inset:0;background:rgba(15,23,42,0.65);z-index:99999;display:flex;align-items:center;justify-content:center;padding:1rem;`;
        modal.innerHTML = `
            <div style="background:#fff;border-radius:16px;width:100%;max-width:520px;box-shadow:0 25px 60px rgba(0,0,0,0.3);overflow:hidden;">
                <!-- Header -->
                <div style="padding:1.25rem 1.5rem;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;background:linear-gradient(135deg,#0f172a,#1e293b);">
                    <div style="display:flex;align-items:center;gap:0.75rem;">
                        <div style="width:40px;height:40px;background:rgba(255,255,255,0.1);border-radius:10px;display:flex;align-items:center;justify-content:center;">
                            <i class="ph ph-certificate" style="font-size:1.4rem;color:#a78bfa;"></i>
                        </div>
                        <div>
                            <div style="font-weight:700;color:#fff;font-size:1rem;">Certificado Digital (.PFX)</div>
                            <div style="font-size:0.75rem;color:#94a3b8;">Assinatura automática da America Rental</div>
                        </div>
                    </div>
                    <button onclick="window.fecharModalCertificado()" style="background:rgba(255,255,255,0.1);border:none;width:32px;height:32px;border-radius:8px;color:#fff;cursor:pointer;font-size:1rem;display:flex;align-items:center;justify-content:center;">
                        <i class="ph ph-x"></i>
                    </button>
                </div>

                <!-- Corpo -->
                <div style="padding:1.5rem;display:flex;flex-direction:column;gap:1.25rem;">

                    <!-- Status atual -->
                    <div id="cert-modal-status" style="padding:0.85rem 1rem;border-radius:10px;background:#f8fafc;border:1.5px solid #e2e8f0;font-size:0.85rem;color:#64748b;display:flex;align-items:center;gap:0.6rem;">
                        <i class="ph ph-spinner ph-spin"></i> Carregando status...
                    </div>

                    <!-- Explicação -->
                    <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:0.85rem 1rem;font-size:0.82rem;color:#1e40af;">
                        <div style="font-weight:700;margin-bottom:4px;"><i class="ph ph-info"></i> Como funciona</div>
                        O certificado digital A1 (.pfx) da empresa é usado para assinar os PDFs gerados <b>antes</b> de serem 
                        enviados ao colaborador via Assinafy. Isso garante que o documento já sai com a assinatura oficial 
                        da <b>America Rental Equipamentos Ltda</b>.
                    </div>

                    <!-- Upload formulário -->
                    <div>
                        <label style="font-size:0.82rem;font-weight:700;color:#374151;display:block;margin-bottom:6px;">
                            Arquivo .PFX <span style="font-weight:400;color:#94a3b8;">(Certificado A1)</span>
                        </label>
                        <div style="display:flex;gap:0.5rem;align-items:center;">
                            <label id="cert-upload-label" style="flex:1;padding:0.6rem 1rem;border:2px dashed #e2e8f0;border-radius:8px;cursor:pointer;font-size:0.83rem;color:#94a3b8;text-align:center;background:#fafafa;transition:0.2s;"
                                onmouseover="this.style.borderColor='#a78bfa';this.style.color='#7c3aed'"
                                onmouseout="this.style.borderColor='#e2e8f0';this.style.color='#94a3b8'">
                                <i class="ph ph-upload-simple"></i> Clique para selecionar o .pfx
                                <input type="file" id="cert-pfx-input" accept=".pfx" style="display:none;" onchange="window.onCertFileSelected(this)">
                            </label>
                        </div>
                        <div id="cert-file-preview" style="display:none;margin-top:0.5rem;padding:0.5rem 0.75rem;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;font-size:0.82rem;color:#166534;display:flex;align-items:center;gap:0.5rem;">
                            <i class="ph ph-file-lock"></i> <span id="cert-file-name"></span>
                        </div>
                    </div>

                    <div>
                        <label style="font-size:0.82rem;font-weight:700;color:#374151;display:block;margin-bottom:6px;">
                            Senha do Certificado
                        </label>
                        <div style="position:relative;">
                            <input type="password" id="cert-senha-input" placeholder="Senha do arquivo .pfx"
                                style="width:100%;padding:0.6rem 2.5rem 0.6rem 0.85rem;border:1.5px solid #e2e8f0;border-radius:8px;font-size:0.88rem;outline:none;box-sizing:border-box;"
                                onfocus="this.style.borderColor='#a78bfa'" onblur="this.style.borderColor='#e2e8f0'">
                            <button type="button" onclick="const i=document.getElementById('cert-senha-input');i.type=i.type==='password'?'text':'password'"
                                style="position:absolute;right:0.6rem;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:#94a3b8;font-size:1rem;padding:0;">
                                <i class="ph ph-eye"></i>
                            </button>
                        </div>
                    </div>

                    <div id="cert-upload-msg" style="display:none;padding:0.6rem 0.85rem;border-radius:8px;font-size:0.82rem;"></div>
                </div>

                <!-- Footer -->
                <div style="padding:1rem 1.5rem;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;gap:0.75rem;background:#f8fafc;">
                    <button id="btn-cert-remover" onclick="window.removerCertificado()" 
                        style="border:1px solid #fca5a5;background:#fff;color:#dc2626;border-radius:8px;padding:0.55rem 1rem;font-size:0.85rem;font-weight:600;cursor:pointer;display:none;align-items:center;gap:4px;">
                        <i class="ph ph-trash"></i> Remover
                    </button>
                    <div style="display:flex;gap:0.5rem;margin-left:auto;">
                        <button id="btn-cert-testar" onclick="window.testarCertificado()"
                            style="border:1px solid #e2e8f0;background:#fff;color:#374151;border-radius:8px;padding:0.55rem 1rem;font-size:0.85rem;font-weight:600;cursor:pointer;display:none;align-items:center;gap:4px;">
                            <i class="ph ph-flask"></i> Testar
                        </button>
                        <button onclick="window.fecharModalCertificado()"
                            style="border:1px solid #e2e8f0;background:#fff;color:#374151;border-radius:8px;padding:0.55rem 1rem;font-size:0.85rem;font-weight:600;cursor:pointer;">
                            Fechar
                        </button>
                        <button id="btn-cert-salvar" onclick="window.salvarCertificado()"
                            style="border:none;background:#7c3aed;color:#fff;border-radius:8px;padding:0.55rem 1.25rem;font-size:0.85rem;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:4px;">
                            <i class="ph ph-floppy-disk"></i> Salvar Certificado
                        </button>
                    </div>
                </div>
            </div>`;
        document.body.appendChild(modal);
        // Fechar ao clicar fora
        modal.addEventListener('click', e => { if(e.target === modal) window.fecharModalCertificado(); });
    }

    modal.style.display = 'flex';
    window._atualizarStatusModalCert();
};

window.fecharModalCertificado = function() {
    const m = document.getElementById('modal-cert-digital');
    if(m) m.style.display = 'none';
};

window.onCertFileSelected = function(input) {
    const file = input.files[0];
    if (!file) return;
    const nameEl = document.getElementById('cert-file-name');
    const preview = document.getElementById('cert-file-preview');
    const label   = document.getElementById('cert-upload-label');
    if (nameEl) nameEl.textContent = file.name;
    if (preview) preview.style.display = 'flex';
    if (label)  label.style.borderColor = '#a78bfa';
};

window._atualizarStatusModalCert = async function() {
    const statusEl  = document.getElementById('cert-modal-status');
    const btnRemover= document.getElementById('btn-cert-remover');
    const btnTestar = document.getElementById('btn-cert-testar');
    if (!statusEl) return;

    statusEl.innerHTML = `<i class="ph ph-spinner ph-spin"></i> Verificando...`;
    try {
        const data = await apiGet('/certificado-digital/status');
        if (data.configurado && data.ok) {
            statusEl.style.background = '#f0fdf4';
            statusEl.style.border     = '1.5px solid #bbf7d0';
            statusEl.style.color      = '#166534';
            statusEl.innerHTML = `
                <i class="ph ph-seal-check" style="font-size:1.2rem;"></i>
                <div>
                    <div style="font-weight:700;">Certificado ativo</div>
                    <div style="font-size:0.77rem;opacity:0.85;">
                        CN: ${data.cn || 'N/A'} | Org: ${data.org || 'N/A'} | 
                        Validade: ${data.validade || 'N/A'} | Serial: ${(data.serial||'').slice(-8)}
                    </div>
                </div>`;
            if (btnRemover) btnRemover.style.display = 'flex';
            if (btnTestar)  btnTestar.style.display  = 'flex';
        } else {
            statusEl.style.background = '#fffbeb';
            statusEl.style.border     = '1.5px solid #fcd34d';
            statusEl.style.color      = '#92400e';
            statusEl.innerHTML = `<i class="ph ph-warning" style="font-size:1.1rem;"></i> <span>Nenhum certificado configurado. ${data.motivo ? '(' + data.motivo + ')' : ''}</span>`;
            if (btnRemover) btnRemover.style.display = 'none';
            if (btnTestar)  btnTestar.style.display  = 'none';
        }
    } catch(e) {
        statusEl.innerHTML = `<i class="ph ph-warning-circle"></i> Erro ao verificar: ${e.message}`;
    }
};

window.salvarCertificado = async function() {
    const fileInput = document.getElementById('cert-pfx-input');
    const senha     = document.getElementById('cert-senha-input')?.value || '';
    const msgEl     = document.getElementById('cert-upload-msg');
    const btnSalvar = document.getElementById('btn-cert-salvar');

    if (!fileInput?.files[0]) {
        alert('Selecione um arquivo .pfx primeiro.');
        return;
    }

    if (msgEl) { msgEl.style.display = 'block'; msgEl.style.background = '#f8fafc'; msgEl.style.color = '#64748b'; msgEl.innerHTML = `<i class="ph ph-spinner ph-spin"></i> Enviando certificado...`; }
    if (btnSalvar) { btnSalvar.disabled = true; btnSalvar.innerHTML = `<i class="ph ph-spinner ph-spin"></i> Salvando...`; }

    try {
        const formData = new FormData();
        formData.append('certificado', fileInput.files[0]);
        formData.append('senha', senha);

        const res = await fetch(`${API_URL}/certificado-digital/upload`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${currentToken}` },
            body: formData
        });
        const data = await res.json();

        if (!res.ok) throw new Error(data.error || 'Erro ao salvar o certificado');

        if (msgEl) { msgEl.style.background = '#f0fdf4'; msgEl.style.border = '1px solid #bbf7d0'; msgEl.style.color = '#166534'; msgEl.innerHTML = `✅ Certificado salvo com sucesso! CN: <b>${data.cn}</b> | Validade: ${data.validade}`; }
        
        // Atualizar status no modal e no banner
        await window._atualizarStatusModalCert();
        window.carregarStatusCertificado();

    } catch(e) {
        if (msgEl) { msgEl.style.background = '#fef2f2'; msgEl.style.border = '1px solid #fca5a5'; msgEl.style.color = '#dc2626'; msgEl.innerHTML = `❌ ${e.message}`; }
    } finally {
        if (btnSalvar) { btnSalvar.disabled = false; btnSalvar.innerHTML = `<i class="ph ph-floppy-disk"></i> Salvar Certificado`; }
    }
};

window.testarCertificado = async function() {
    const msgEl  = document.getElementById('cert-upload-msg');
    const btnTest= document.getElementById('btn-cert-testar');
    if (msgEl) { msgEl.style.display = 'block'; msgEl.style.background = '#eff6ff'; msgEl.style.border = '1px solid #bfdbfe'; msgEl.style.color = '#1e40af'; msgEl.innerHTML = `<i class="ph ph-spinner ph-spin"></i> Testando assinatura de um PDF de exemplo...`; }
    if (btnTest) { btnTest.disabled = true; }

    try {
        const res  = await fetch(`${API_URL}/certificado-digital/testar`, { method: 'POST', headers: { 'Authorization': `Bearer ${currentToken}`, 'Content-Type': 'application/json' } });
        const data = await res.json();
        if (!res.ok || !data.ok) throw new Error(data.erro || 'Falha no teste');
        if (msgEl) { msgEl.style.background = '#f0fdf4'; msgEl.style.border = '1px solid #bbf7d0'; msgEl.style.color = '#166534'; msgEl.innerHTML = `${data.message || '✅ Assinatura funcionando!'} (PDF: ${(data.tamanho_bytes/1024).toFixed(1)} KB)`; }
    } catch(e) {
        if (msgEl) { msgEl.style.background = '#fef2f2'; msgEl.style.border = '1px solid #fca5a5'; msgEl.style.color = '#dc2626'; msgEl.innerHTML = `❌ Teste falhou: ${e.message}`; }
    } finally {
        if (btnTest) { btnTest.disabled = false; }
    }
};

window.removerCertificado = async function() {
    if (!confirm('Tem certeza que deseja remover o certificado digital? Os documentos serão enviados sem assinatura automática da empresa.')) return;
    try {
        const res  = await fetch(`${API_URL}/certificado-digital`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${currentToken}` } });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro ao remover');
        await window._atualizarStatusModalCert();
        window.carregarStatusCertificado();
        const msgEl = document.getElementById('cert-upload-msg');
        if (msgEl) { msgEl.style.display = 'block'; msgEl.style.background = '#f0fdf4'; msgEl.style.border = '1px solid #bbf7d0'; msgEl.style.color = '#166534'; msgEl.innerHTML = '✅ Certificado removido com sucesso.'; }
    } catch(e) { alert(e.message); }
};


// ══════════════════════════════════════════════════════════════════════
// CERTIFICADO DIGITAL — Funções da View da Diretoria
// ══════════════════════════════════════════════════════════════════════

/** Carrega o status na view de Diretoria > Certificado Digital */
window.carregarCertificadoView = async function() {
    const statusEl  = document.getElementById('cert-view-status');
    const btnTestar = document.getElementById('btn-cert-view-testar');
    const btnRemove = document.getElementById('btn-cert-view-remover');
    if (!statusEl) return;

    statusEl.innerHTML = `<i class="ph ph-spinner ph-spin"></i> Verificando certificado...`;
    try {
        const data = await apiGet('/certificado-digital/status');

        const btnRemove2 = document.getElementById('btn-cert-view-remover2');

        if (data.configurado && data.ok) {
            statusEl.style.cssText = 'padding:1rem;border-radius:10px;background:#f0fdf4;border:1.5px solid #bbf7d0;font-size:0.88rem;color:#166534;display:flex;align-items:flex-start;gap:0.75rem;min-height:70px;';
            statusEl.innerHTML = `
                <i class="ph ph-seal-check" style="font-size:1.8rem;color:#16a34a;flex-shrink:0;"></i>
                <div>
                    <div style="font-weight:700;font-size:0.95rem;margin-bottom:4px;">✅ Certificado Digital Ativo</div>
                    <div style="display:grid;grid-template-columns:auto 1fr;gap:2px 12px;font-size:0.82rem;">
                        <span style="opacity:0.7;">Titular:</span> <b>${data.cn || 'N/A'}</b>
                        <span style="opacity:0.7;">Organização:</span> <span>${data.org || 'N/A'}</span>
                        <span style="opacity:0.7;">Validade:</span> <b style="color:${isDateNear(data.validade) ? '#dc2626' : '#166534'}">${data.validade || 'N/A'} ${isDateNear(data.validade) ? '⚠️ Próximo do vencimento!' : ''}</b>
                        <span style="opacity:0.7;">Serial:</span> <span style="font-family:monospace;">${(data.serial||'').slice(-12)}</span>
                    </div>
                </div>`;
            if (btnTestar) btnTestar.style.display = 'flex';
            if (btnRemove) btnRemove.style.display = 'none'; // ocultando o do meio, pois fizemos o novo
        } else {
            const isErro = data.configurado && !data.ok;
            const titulo = isErro ? 'Problema no Certificado Atual' : 'Nenhum certificado configurado';
            const subtitulo = isErro ? `⚠️ ${data.erro || 'Falha ao ler o certificado (senha inválida ou arquivo corrompido).'}` : (data.motivo || 'Configure o arquivo .pfx ao lado para ativar a assinatura automática.');
            
            statusEl.style.cssText = `padding:1rem;border-radius:10px;background:#fffbeb;border:1.5px solid ${isErro ? '#fca5a5' : '#fcd34d'};font-size:0.88rem;color:${isErro ? '#dc2626' : '#92400e'};display:flex;align-items:center;gap:0.75rem;min-height:70px;`;
            statusEl.innerHTML = `
                <i class="ph ${isErro ? 'ph-warning-circle' : 'ph-warning'}" style="font-size:1.5rem;color:${isErro ? '#dc2626' : '#d97706'};flex-shrink:0;"></i>
                <div>
                    <div style="font-weight:700;">${titulo}</div>
                    <div style="font-size:0.8rem;margin-top:2px;">${subtitulo}</div>
                </div>`;
            if (btnTestar) btnTestar.style.display = 'none';
            if (btnRemove) btnRemove.style.display = 'none';
        }

        // NOVO: Mostrar sempre o botão se data.configurado for true, mesmo com erro
        if (btnRemove2) btnRemove2.style.display = 'flex'; // SEMPRE VISIVEL PARA PREVENIR ERROS DE ESTADO
    } catch(e) {
        statusEl.innerHTML = `<i class="ph ph-warning-circle"></i> Erro ao verificar: ${e.message}`;
    }
};

function isDateNear(dateStr) {
    if (!dateStr) return false;
    try {
        const [d, m, y] = dateStr.split('/').map(Number);
        const exp = new Date(y, m - 1, d);
        const diff = (exp - new Date()) / (1000 * 60 * 60 * 24);
        return diff < 60; // menos de 60 dias
    } catch(e) { return false; }
}

window.onCertViewFileSelected = function(input) {
    const file = input.files[0];
    if (!file) return;
    document.getElementById('cert-view-file-name').textContent = file.name;
    const preview = document.getElementById('cert-view-file-preview');
    const label   = document.getElementById('cert-view-upload-label');
    if (preview) preview.style.display = 'flex';
    if (label)   label.style.borderColor = '#a78bfa';
};

window.salvarCertificadoView = async function() {
    const fileInput = document.getElementById('cert-view-pfx-input');
    const senha     = document.getElementById('cert-view-senha')?.value || '';
    const msgEl     = document.getElementById('cert-view-save-msg');
    const btnSalvar = document.getElementById('btn-cert-view-salvar');

    if (!fileInput?.files[0]) { alert('Selecione um arquivo .pfx primeiro.'); return; }

    if (msgEl) { msgEl.style.display='block'; msgEl.style.cssText='display:block;padding:0.6rem 0.85rem;border-radius:8px;font-size:0.82rem;background:#f8fafc;color:#64748b;margin-bottom:0.75rem;'; msgEl.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Enviando e validando certificado...'; }
    if (btnSalvar) { btnSalvar.disabled = true; btnSalvar.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Salvando...'; }

    try {
        const formData = new FormData();
        formData.append('certificado', fileInput.files[0]);
        formData.append('senha', senha);

        const res  = await fetch(`${API_URL}/certificado-digital/upload`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${currentToken}` },
            body: formData
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro ao salvar');

        if (msgEl) { msgEl.style.cssText='display:block;padding:0.6rem 0.85rem;border-radius:8px;font-size:0.82rem;background:#f0fdf4;border:1px solid #bbf7d0;color:#166534;margin-bottom:0.75rem;'; msgEl.innerHTML = `✅ Certificado salvo com sucesso! Ativo para sempre até o vencimento.<br><b>Titular:</b> ${data.cn} | <b>Validade:</b> ${data.validade}`; }

        // Recarregar status
        await window.carregarCertificadoView();

    } catch(e) {
        if (msgEl) { msgEl.style.cssText='display:block;padding:0.6rem 0.85rem;border-radius:8px;font-size:0.82rem;background:#fef2f2;border:1px solid #fca5a5;color:#dc2626;margin-bottom:0.75rem;'; msgEl.innerHTML = `❌ ${e.message}`; }
    } finally {
        if (btnSalvar) { btnSalvar.disabled = false; btnSalvar.innerHTML = '<i class="ph ph-floppy-disk"></i> Salvar Certificado'; }
    }
};

window.testarCertificadoView = async function() {
    const resultEl = document.getElementById('cert-view-test-result');
    const btn      = document.getElementById('btn-cert-view-testar');
    if (resultEl) { resultEl.style.cssText='display:block;padding:0.6rem 0.85rem;border-radius:8px;font-size:0.82rem;background:#eff6ff;border:1px solid #bfdbfe;color:#1e40af;'; resultEl.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Gerando PDF de teste e assinando...'; }
    if (btn) btn.disabled = true;

    try {
        const res  = await fetch(`${API_URL}/certificado-digital/testar`, { method: 'POST', headers: { 'Authorization': `Bearer ${currentToken}`, 'Content-Type': 'application/json' } });
        const data = await res.json();
        if (!res.ok || !data.ok) throw new Error(data.erro || 'Falha no teste');
        if (resultEl) { resultEl.style.cssText='display:block;padding:0.6rem 0.85rem;border-radius:8px;font-size:0.82rem;background:#f0fdf4;border:1px solid #bbf7d0;color:#166534;'; resultEl.innerHTML = `${data.message} PDF gerado: ${(data.tamanho_bytes/1024).toFixed(1)} KB com assinatura embutida.`; }
    } catch(e) {
        if (resultEl) { resultEl.style.cssText='display:block;padding:0.6rem 0.85rem;border-radius:8px;font-size:0.82rem;background:#fef2f2;border:1px solid #fca5a5;color:#dc2626;'; resultEl.innerHTML = `❌ Teste falhou: ${e.message}`; }
    } finally {
        if (btn) btn.disabled = false;
    }
};

window.removerCertificadoView = async function() {
    if (!confirm('Remover o certificado digital? Os documentos serão enviados SEM assinatura automática da empresa até que outro seja configurado.')) return;
    try {
        const res  = await fetch(`${API_URL}/certificado-digital`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${currentToken}` } });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro ao remover');
        await window.carregarCertificadoView();
        const msgEl = document.getElementById('cert-view-save-msg');
        if (msgEl) { msgEl.style.cssText='display:block;padding:0.6rem 0.85rem;border-radius:8px;font-size:0.82rem;background:#f0fdf4;border:1px solid #bbf7d0;color:#166534;margin-bottom:0.75rem;'; msgEl.innerHTML = '✅ Certificado removido.'; }
    } catch(e) { alert(e.message); }
};

// Hook: ao navegar para 'certificado-digital', carregar status automaticamente
const _origShowView = window.showView;
window.showView = function(id) {
    if (typeof _origShowView === 'function') _origShowView(id);
};
// Já existe o navigateTo — adicionar hook para certificado-digital
const _origNavigateTo = window.navigateTo;
if (typeof _origNavigateTo === 'function') {
    window.navigateTo = function(view) {
        _origNavigateTo(view);
        if (view === 'certificado-digital') {
            setTimeout(() => window.carregarCertificadoView(), 150);
        }
    };
}



