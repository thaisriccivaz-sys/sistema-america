const API_URL = `${window.location.origin}/api`;
function showToast(msg, type) {
    const toast = document.getElementById('global-toast');
    if (toast) {
        const toastBody = toast.querySelector('.toast-body');
        if (toastBody) toastBody.textContent = msg;
        toast.className = 'toast align-items-center border-0 ' + (type === 'error' ? 'bg-danger text-white' : 'bg-success text-white');
        try { new bootstrap.Toast(toast, { delay: 3000 }).show(); return; } catch(e) {}
    }
    const div = document.createElement('div');
    div.style = 'position:fixed;bottom:24px;right:24px;z-index:99999;background:' + (type === 'error' ? '#dc2626' : '#16a34a') + ';color:#fff;padding:12px 20px;border-radius:10px;font-weight:600;box-shadow:0 4px 16px rgba(0,0,0,0.2);';
    div.textContent = msg;
    document.body.appendChild(div);
    setTimeout(() => div.remove(), 3000);
}

// Estado global
let currentUser = null;
let currentToken = null;
let currentDocs = [];
let viewedColaborador = null;

// Helper global para PDF
window.gerarPDFBlob = async function(element) {
    return new Promise((resolve, reject) => {
        if (typeof html2pdf === 'undefined') return reject(new Error('Biblioteca html2pdf não carregada'));
        const opt = {
            margin: 10,
            filename: 'documento.pdf',
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };
        html2pdf().set(opt).from(element).outputPdf('blob').then(resolve).catch(reject);
    });
};

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
    'integracao': { path: 'Integração', code: 'RHAD06' },
    'assinaturas-digitais': { path: 'Assinaturas Digitais', code: 'RHAD07' },
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
    'tab:01_FICHA_CADASTRAL':     { path: 'Colaboradores → Prontuário Digital → Ficha Cadastral',        },
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
    // Verifica: role do banco, departamento OU nome do grupo de permissão
    const isTopAdmin = currentUser.role === 'Diretoria' 
        || currentUser.departamento === 'Diretoria'
        || (currentUser.grupo_nome && currentUser.grupo_nome.toLowerCase() === 'diretoria');
    window.isTopAdmin = isTopAdmin;

    // Remove qualquer display-none forçado das categorias primeiro
    document.querySelectorAll('.dept-item').forEach(el => el.style.display = '');

    if (isTopAdmin) {
        // Regra fixa solicitada: Ocultar módulos nunca se aplica a liderança da Diretoria.
        // Eles têm acesso automático e irrestrito a todas as telas visualmente.
        document.querySelectorAll('.nav-item').forEach(el => el.style.display = '');
        return; // Retorna cedo ignorando qualquer grupo
    }

    if (!currentUser.grupo_permissao_id) {
        // Usuário comum sem permissões. Ocultar tudo.
        document.querySelectorAll('.nav-item').forEach(el => el.style.cssText = 'display: none !important;');
        document.querySelectorAll('.dept-item').forEach(el => el.style.cssText = 'display: none !important;');
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
        permissoes.forEach(p => {
            const v = p.visualizar;
            mapPerms[p.pagina_id] = (v === 1 || v === '1' || v === true || v === 'true');
        });

        // Auto-liberar certificado-digital para quem já tem acesso a usuarios-permissoes
        if (mapPerms['usuarios-permissoes']) {
            mapPerms['certificado-digital'] = true;
        }
        window.activeUserPerms = mapPerms;

        // Percorre todos os botões de navegação (.nav-item)
        document.querySelectorAll('.nav-item[data-target]').forEach(link => {
            const pathId = link.getAttribute('data-target');
            
            // Hardcode: módulos "Em breve" nunca devem aparecer para usuários comuns, 
            // mesmo que marcados sem querer no banco.
            if (pathId && pathId.includes('em-breve')) {
                link.style.cssText = 'display: none !important;';
                mapPerms[pathId] = false; // Força no mapa para ocultar a bolota também
                return;
            }

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
    'integracao':             { color: '#f503c5', icon: 'ph-users-three',     title: 'Integração' },
    'cargos':                 { color: '#f503c5', icon: 'ph-briefcase',       title: 'Cargos' },
    'departamentos':          { color: '#f503c5', icon: 'ph-buildings',       title: 'Departamentos' },
    'faculdade':              { color: '#f503c5', icon: 'ph-graduation-cap',  title: 'Faculdade' },
    'geradores':              { color: '#f503c5', icon: 'ph-file-text',       title: 'Geradores' },
    'ficha-epi':              { color: '#f503c5', icon: 'ph-shield-check',    title: 'Ficha EPI' },
    'gerenciar-avaliacoes':   { color: '#f503c5', icon: 'ph-clipboard-text',  title: 'Avaliações' },
    'assinaturas-digitais':   { color: '#f503c5', icon: 'ph-signature',       title: 'Assinaturas' },
    // Diretoria - Laranja
    'usuarios-permissoes':    { color: '#d9480f', icon: 'ph-users-three',     title: 'Usuários e Permissões' },
    'certificado-digital':    { color: '#d9480f', icon: 'ph-certificate',     title: 'Certificado Digital' },
    'chaves':                 { color: '#d9480f', icon: 'ph-key',             title: 'Chaves' },
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
            <span title="${t.title}">${t.title.length > 15 ? t.title.substring(0, 15) + '…' : t.title}</span>
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
    const isTopAdmin = currentUser && (
        currentUser.role === 'Diretoria' 
        || currentUser.role === 'Administrador' 
        || currentUser.departamento === 'Diretoria'
        || (currentUser.grupo_nome && currentUser.grupo_nome.toLowerCase() === 'diretoria')
    );

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
    window.allCargosCache = cargos;
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
            document.getElementById('cargo-input-departamento').value = '';
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
                if (cargo.departamento) document.getElementById('cargo-input-departamento').value = cargo.departamento;
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

async function handleCargoFormSubmit() {
    const id = document.getElementById('manage-cargo-id').value;
    const nomeInput = document.getElementById('cargo-input-name');
    const deptoInput = document.getElementById('cargo-input-departamento');
    const nome = (nomeInput ? nomeInput.value : '').trim();
    const departamento = deptoInput ? deptoInput.value : '';
    if (!nome) { alert('Informe o nome do cargo'); return; }
    if (!departamento) { alert('Informe o departamento vinculado'); return; }

    try {
        if (id) {
            const r = await fetch(`${API_URL}/cargos/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${currentToken}` },
                body: JSON.stringify({ nome, departamento, documentos_obrigatorios: '' })
            });
            if (!r.ok) { const err = await r.json(); alert('Erro ao salvar: ' + (err.error || 'Erro')); return; }
        } else {
            // Criar novo cargo
            const res = await apiPost('/cargos', { nome, departamento, documentos_obrigatorios: '' });
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

// ─── CERTIFICADO DIGITAL PÓS-ASSINATURA ───────────────────────────────────────
// Aplica o certificado A1 da empresa no PDF após o colaborador assinar no Assinafy
window.assinarComCertificado = async function(assId, event) {
    if (event) { event.preventDefault(); event.stopPropagation(); }
    const btn = event?.currentTarget || event?.target;
    const originalText = btn ? btn.innerHTML : '';
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Assinando...'; }

    try {
        const res  = await fetch(`${API_URL}/admissao-assinaturas/${assId}/assinar-certificado`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${currentToken}`, 'Content-Type': 'application/json' }
        });
        const data = await res.json();

        if (!res.ok || !data.ok) throw new Error(data.error || 'Falha ao aplicar certificado');

        // Feedback visual de sucesso
        if (btn) {
            btn.style.background = '#f0fdf4';
            btn.style.borderColor = '#16a34a';
            btn.style.color = '#16a34a';
            btn.innerHTML = '<i class="ph ph-seal-check"></i> ✅ Certificado Aplicado';
            setTimeout(() => {
                // Recarregar a view para refletir o novo status
                if (viewedColaborador) window.viewColaborador(viewedColaborador.id);
            }, 1500);
        }
        if (typeof showToast === 'function') showToast('✅ ' + data.mensagem, 'success');
        else alert('✅ ' + data.mensagem);

    } catch(e) {
        if (btn) { btn.disabled = false; btn.innerHTML = originalText; }
        if (typeof showToast === 'function') showToast('❌ ' + e.message, 'error');
        else alert('❌ ' + e.message);
    }
};

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
    
    if (tipo && entrada) {
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
        } else if (outSaida) {
            outSaida.value = '';
        }
    } else if (outSaida) {
        outSaida.value = '';
    }

    // Sábado
    const sabEntrada = document.getElementById('colab-sabado-entrada').value;
    const outSabSaida = document.getElementById('colab-sabado-saida');
    if (sabEntrada && outSabSaida) {
        const [hse, mse] = sabEntrada.split(':').map(Number);
        let totalSabMins = (hse * 60 + mse) + (4 * 60);
        const hSabFinal = Math.floor(totalSabMins / 60) % 24;
        const mSabFinal = totalSabMins % 60;
        outSabSaida.value = `${String(hSabFinal).padStart(2, '0')}:${String(mSabFinal).padStart(2, '0')}`;
    } else if (outSabSaida) {
        outSabSaida.value = '';
    }
}

async function loadSelects() {
    loadCargos();
    const deptos = await apiGet('/departamentos');
    const selectCargoDepto = document.getElementById('cargo-input-departamento');
    if (selectCargoDepto && deptos) {
        selectCargoDepto.innerHTML = '<option value="" selected disabled>Selecionar</option>';
        deptos.forEach(d => selectCargoDepto.innerHTML += `<option value="${d.nome}">${d.nome}</option>`);
    }
    loadFaculdadeCursosDropdown();
}

window.autoFillDepartamento = function() {
    const selectCargo = document.getElementById('colab-cargo');
    const inputDepto = document.getElementById('colab-departamento');
    if (!selectCargo || !inputDepto || !window.allCargosCache) return;
    
    const cargoName = selectCargo.value;
    const desc = window.allCargosCache.find(c => c.nome === cargoName);
    if (desc && desc.departamento) {
        inputDepto.value = desc.departamento;
    } else {
        inputDepto.value = '';
    }
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
let chartAtestadosInst = null;
let chartFaltasInst = null;

async function loadDashboard() {
    const stats = await apiGet('/dashboard');
    if (stats) {
        const totalEl = document.getElementById('stat-total');
        if (totalEl) totalEl.textContent = stats.total || 0;
        
        const aguardandoEl = document.getElementById('stat-aguardando');
        if (aguardandoEl) aguardandoEl.textContent = stats.aguardando || 0;
        
        const iniciadoEl = document.getElementById('stat-iniciado');
        if (iniciadoEl) iniciadoEl.textContent = stats.iniciado || 0;

        const ativosEl = document.getElementById('stat-ativos');
        if (ativosEl) ativosEl.textContent = stats.ativos || 0;
        
        const feriasEl = document.getElementById('stat-ferias');
        if (feriasEl) feriasEl.textContent = stats.ferias || 0;
        
        const afastadosEl = document.getElementById('stat-afastados');
        if (afastadosEl) afastadosEl.textContent = stats.afastados || 0;
        
        const desligadosEl = document.getElementById('stat-desligados');
        if (desligadosEl) desligadosEl.textContent = stats.desligados || 0;
    }

    const chartsData = await apiGet('/dashboard/charts');
    if (chartsData) {
        // Render Atestados Chart
        const ctxAtestados = document.getElementById('chart-atestados');
        if (ctxAtestados) {
            if (chartAtestadosInst) chartAtestadosInst.destroy();
            
            const labelsMeses = (chartsData.faltasAgrupadasMes || []).map(d => {
                const parts = d.mes.split('-');
                return parts.length === 2 ? `${parts[1]}/${parts[0]}` : d.mes;
            });
            const dataFaltas = (chartsData.faltasAgrupadasMes || []).map(d => d.faltas);
            const dataAtestados = (chartsData.faltasAgrupadasMes || []).map(d => d.atestados);

            chartAtestadosInst = new Chart(ctxAtestados, {
                type: 'bar',
                data: {
                    labels: labelsMeses.length ? labelsMeses : ['Sem dados'],
                    datasets: [
                    {
                        label: 'Faltas Injustificadas',
                        data: dataFaltas.length ? dataFaltas : [0],
                        backgroundColor: '#fa5252',
                        borderRadius: 4
                    },
                    {
                        label: 'Atestados',
                        data: dataAtestados.length ? dataAtestados : [0],
                        backgroundColor: '#228be6',
                        borderRadius: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { position: 'bottom' } },
                    scales: { x: { stacked: false }, y: { beginAtZero: true, ticks: { precision: 0 } } }
                }
            });

            const dataMeses = chartsData.atestadosMes.map(d => d.count);
            
            chartAtestadosInst = new Chart(ctxAtestados, {
                type: 'bar',
                data: {
                    labels: labelsMeses.length ? labelsMeses : ['Sem dados'],
                    datasets: [{
                        label: 'Qtd. de Atestados',
                        data: dataMeses.length ? dataMeses : [0],
                        backgroundColor: '#228be6',
                        borderRadius: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }
                }
            });
        }

        // Render Faltas Chart
        const ctxFaltas = document.getElementById('chart-faltas');
        if (ctxFaltas) {
            if (chartFaltasInst) chartFaltasInst.destroy();
            const ranking = chartsData.faltasRanking;
            
            chartFaltasInst = new Chart(ctxFaltas, {
                type: 'bar',
                data: {
                    labels: ranking.length ? ranking.map(r => r.nome ? r.nome.split(' ')[0] + ' ' + (r.nome.split(' ')[1] || '') : 'Sem Nome') : ['Sem dados'],
                    datasets: [
                        {
                            label: 'Faltas Injustificadas',
                            data: ranking.length ? ranking.map(r => r.faltas_sem_atestado) : [0],
                            backgroundColor: '#fa5252',
                            borderRadius: 4
                        },
                        {
                            label: 'Dias Atestado',
                            data: ranking.length ? ranking.map(r => r.dias_atestado) : [0],
                            backgroundColor: '#f59f00',
                            borderRadius: 4
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { position: 'bottom' } },
                    scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true, ticks: { precision: 0 } } }
                }
            });
        }

        // Render Férias Table
        const tbFerias = document.getElementById('dash-table-ferias');
        if (tbFerias) {
            tbFerias.innerHTML = '';
            if (!chartsData.feriasVencendo || chartsData.feriasVencendo.length === 0) {
                tbFerias.innerHTML = '<tr><td colspan="3" style="text-align:center;color:#999;font-style:italic;">Nenhuma férias a vencer em 60 dias.</td></tr>';
            } else {
                chartsData.feriasVencendo.forEach(f => {
                    const cfPts = f.concessivo_fim.split('-');
                    const cfmt = `${cfPts[2]}/${cfPts[1]}/${cfPts[0]}`;
                    const corRestante = f.dias_restantes <= 15 ? 'color:#e03131;font-weight:bold;' : 'color:#f08c00;';
                    tbFerias.innerHTML += `
                        <tr>
                            <td><a href="#" style="color:#1c7ed6;text-decoration:none;" onclick="event.preventDefault(); viewColaborador(${f.id})">${f.nome}</a></td>
                            <td>${cfmt}</td>
                            <td style="${corRestante}">${f.dias_restantes} dias</td>
                        </tr>
                    `;
                });
            }
        }

        // Render ASO Table
        const tbAso = document.getElementById('dash-table-aso');
        if (tbAso) {
            tbAso.innerHTML = '';
            if (!chartsData.asoVencendo || chartsData.asoVencendo.length === 0) {
                tbAso.innerHTML = '<tr><td colspan="2" style="text-align:center;color:#999;font-style:italic;">Nenhum ASO a vencer em 30 dias.</td></tr>';
            } else {
                chartsData.asoVencendo.forEach(a => {
                    tbAso.innerHTML += `
                        <tr>
                            <td>${a.nome}</td>
                            <td style="color:#d9480f;font-weight:600;">${a.vencimento}</td>
                        </tr>
                    `;
                });
            }
        }
    }
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
        beneficios:  [...(document.querySelectorAll('.f-beneficios-chk:checked') || [])].map(cb => cb.value),
        tamCamiseta: document.getElementById('f-tam-camiseta')?.value || '',
        tamCalca:    document.getElementById('f-tam-calca')?.value || '',
        tamCalcado:  document.getElementById('f-tam-calcado')?.value || '',
        aptoSorteio: document.getElementById('f-apto-sorteio')?.value || ''
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

        if (f.tamCamiseta && (!c.tamanho_camiseta || c.tamanho_camiseta !== f.tamCamiseta)) return false;
        if (f.tamCalca && (!c.tamanho_calca || c.tamanho_calca !== f.tamCalca)) return false;
        if (f.tamCalcado && (!c.tamanho_calcado || c.tamanho_calcado !== f.tamCalcado)) return false;

        if (f.aptoSorteio) {
            const faltas = c.faltas_ano || 0;
            const punicoes = c.punicoes || 0;
            const statusEf = getEffectiveStatus(c);
            let admDias = 999; // Assume apto se data não informada
            if (c.data_admissao) {
                if (c.data_admissao.includes('-')) {
                    admDias = Math.floor((new Date() - new Date(c.data_admissao + 'T12:00:00')) / 86400000);
                } else if (c.data_admissao.includes('/')) {
                    const [d, m, y] = c.data_admissao.split('/');
                    admDias = Math.floor((new Date() - new Date(`${y}-${m}-${d}T12:00:00`)) / 86400000);
                }
                if (isNaN(admDias)) admDias = 999;
            }
            const tc = (c.tipo_contrato || '').toLowerCase();
            const isCLT = tc === '' || tc.includes('clt');
            
            const isApto = (faltas <= 3) && 
                           (punicoes === 0) &&
                           (['Ativo', 'Afastado', 'Férias'].includes(statusEf)) &&
                           (admDias >= 90) &&
                           isCLT;
            
            if (f.aptoSorteio === 'sim' && !isApto) return false;
            if (f.aptoSorteio === 'nao' && isApto) return false;
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
     'f-escala','f-dependentes','f-tipo-cadastro-hidden',
     'f-tam-camiseta','f-tam-calca','f-tam-calcado','f-apto-sorteio'
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
        "Faculdade", "Academia", "Terapia", "Celular", "Chaves",
        "Tamanho Camiseta", "Tamanho Calça", "Tamanho Calçado"
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
            c.chaves_participa === 'Sim' ? 'Sim' : 'Não',
            c.tamanho_camiseta || '',
            c.tamanho_calca || '',
            c.tamanho_calcado || ''
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
                    <label style="font-size:0.75rem;font-weight:600;color:#64748b;display:block;margin-bottom:3px;">Apto ao Sorteio?</label>
                    <select id="f-apto-sorteio" onchange="aplicarFiltrosColaboradores()" style="width:100%;padding:0.5rem;border:1px solid #e2e8f0;border-radius:6px;font-size:0.85rem;">
                        <option value="">Todos</option><option value="sim">Sim</option><option value="nao">Não</option>
                    </select>
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
                <div>
                    <label style="font-size:0.75rem;font-weight:600;color:#64748b;display:block;margin-bottom:3px;">Tamanho Camiseta</label>
                    <select id="f-tam-camiseta" onchange="aplicarFiltrosColaboradores()" style="width:100%;padding:0.5rem;border:1px solid #e2e8f0;border-radius:6px;font-size:0.85rem;">
                        <option value="">Todos</option><option value="PP">PP</option><option value="P">P</option><option value="M">M</option><option value="G">G</option><option value="GG">GG</option><option value="EXGG">EXGG</option>
                    </select>
                </div>
                <div>
                    <label style="font-size:0.75rem;font-weight:600;color:#64748b;display:block;margin-bottom:3px;">Tamanho Calça</label>
                    <select id="f-tam-calca" onchange="aplicarFiltrosColaboradores()" style="width:100%;padding:0.5rem;border:1px solid #e2e8f0;border-radius:6px;font-size:0.85rem;">
                        <option value="">Todos</option><option value="PP">PP</option><option value="P">P</option><option value="M">M</option><option value="G">G</option><option value="GG">GG</option><option value="EXGG">EXGG</option>
                    </select>
                </div>
                <div>
                    <label style="font-size:0.75rem;font-weight:600;color:#64748b;display:block;margin-bottom:3px;">Tamanho Calçado</label>
                    <select id="f-tam-calcado" onchange="aplicarFiltrosColaboradores()" style="width:100%;padding:0.5rem;border:1px solid #e2e8f0;border-radius:6px;font-size:0.85rem;">
                        <option value="">Todos</option>
                        ${Array.from({length: 14}, (_, i) => 33 + i).map(size => `<option value="${size}">${size}</option>`).join('')}
                    </select>
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
    if(document.getElementById('doc-driver-license-id')) document.getElementById('doc-driver-license-id').value = '';
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
    
    // Reset Alergias e novos campos
    if (document.getElementById('colab-alergias')) document.getElementById('colab-alergias').value = '';
    const radA = document.querySelector('input[name="alergia_check"][value="Não"]');
    if (radA) radA.checked = true;
    if (typeof window.toggleAlergias === 'function') window.toggleAlergias('Não');

    const radAdt = document.querySelector('input[name="adiantamento_check"][value="Não"]');
    if (radAdt) radAdt.checked = true;
    if (typeof window.toggleAdiantamento === 'function') window.toggleAdiantamento('Não');
    if (document.getElementById('colab-adiantamento-valor')) document.getElementById('colab-adiantamento-valor').value = '';

    const radioInN = document.querySelector('input[name="insalubridade_check"][value="Não"]');
    if(radioInN) radioInN.checked = true;
    if(document.getElementById('colab-insalubridade-valor')) document.getElementById('colab-insalubridade-valor').value = '';
    if (typeof window.toggleInsalubridade === 'function') window.toggleInsalubridade('Não');
    
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
        // Auto-preencher CTPS a partir do CPF
        (function() {
            const cpfDigits = (c.cpf || '').replace(/\D/g, '');
            const ctpsEl = document.getElementById('colab-ctps');
            const serieEl = document.getElementById('colab-ctps-serie');
            if (ctpsEl) { ctpsEl.value = cpfDigits.substring(0, 7); ctpsEl.readOnly = true; ctpsEl.style.background = '#f1f5f9'; ctpsEl.style.cursor = 'not-allowed'; }
            if (serieEl) { serieEl.value = cpfDigits.substring(7, 11); serieEl.readOnly = true; serieEl.style.background = '#f1f5f9'; serieEl.style.cursor = 'not-allowed'; }
        })();;
        if (document.getElementById('colab-pis')) document.getElementById('colab-pis').value = c.pis || '';
        if (document.getElementById('colab-cor-raca')) document.getElementById('colab-cor-raca').value = c.cor_raca || '';
        
        if (document.getElementById('tamanho_camiseta')) document.getElementById('tamanho_camiseta').value = c.tamanho_camiseta || '';
        if (document.getElementById('tamanho_calca')) document.getElementById('tamanho_calca').value = c.tamanho_calca || '';
        if (document.getElementById('tamanho_calcado')) document.getElementById('tamanho_calcado').value = c.tamanho_calcado || '';
        
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
        if (document.getElementById('colab-banco-conta')) document.getElementById('colab-banco-conta').value = c.banco_conta || '';

        // Contato de Emergência
        if (document.getElementById('colab-emergencia-nome')) document.getElementById('colab-emergencia-nome').value = c.contato_emergencia_nome || '';
        if (document.getElementById('colab-emergencia-telefone')) document.getElementById('colab-emergencia-telefone').value = c.contato_emergencia_telefone || '';

        // Meio de transporte
        if (document.getElementById('colab-meio-transporte')) {
            document.getElementById('colab-meio-transporte').value = c.meio_transporte || '';
            if (typeof toggleTransporteValor === 'function') toggleTransporteValor(c.meio_transporte);
        }
        if (document.getElementById('colab-valor-transporte')) {
            const valT = c.valor_transporte ? parseFloat(c.valor_transporte).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '';
            document.getElementById('colab-valor-transporte').value = valT;
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

        // toggleMotorista ANTES de carregar CNH — se chamado depois limpa os campos
        if(typeof toggleMotorista === 'function') toggleMotorista();
        if(document.getElementById('doc-driver-license-id')) document.getElementById('doc-driver-license-id').value = c.cnh_numero || '';
        if(document.getElementById('colab-cnh-categoria')) document.getElementById('colab-cnh-categoria').value = c.cnh_categoria || '';

        // Férias
        if(document.getElementById('colab-ferias-programadas-inicio')) document.getElementById('colab-ferias-programadas-inicio').value = c.ferias_programadas_inicio || '';
        if(document.getElementById('colab-ferias-programadas-fim')) document.getElementById('colab-ferias-programadas-fim').value = c.ferias_programadas_fim || '';
        if(typeof updateVacationInfo === 'function') updateVacationInfo(admDate);
        if(typeof calculateVacationDays === 'function') calculateVacationDays();

        // Alergias
        if (document.getElementById('colab-alergias')) {
            const hasAlergia = c.alergias && c.alergias.trim() !== '' ? 'Sim' : 'Não';
            const radioAlergia = document.querySelector(`input[name="alergia_check"][value="${hasAlergia}"]`);
            if (radioAlergia) radioAlergia.checked = true;
            if (typeof window.toggleAlergias === 'function') window.toggleAlergias(hasAlergia);
            document.getElementById('colab-alergias').value = c.alergias || '';
        }

        // Adiantamento — formatar valor como moeda ao carregar
        const adiVal = c.adiantamento_salarial || 'Não';
        const radioAdt = document.querySelector(`input[name="adiantamento_check"][value="${adiVal}"]`);
        if (radioAdt) radioAdt.checked = true;
        if (typeof window.toggleAdiantamento === 'function') window.toggleAdiantamento(adiVal);
        if (document.getElementById('colab-adiantamento-valor')) {
            const rawAdi = c.adiantamento_valor;
            if (rawAdi) {
                const numAdi = parseFloat(String(rawAdi).replace(/[^\d.]/g, ''));
                document.getElementById('colab-adiantamento-valor').value = !isNaN(numAdi)
                    ? new Intl.NumberFormat('pt-BR', {style:'currency', currency:'BRL'}).format(numAdi)
                    : rawAdi;
            } else {
                document.getElementById('colab-adiantamento-valor').value = '';
            }
        }

        // Insalubridade — formatar valor como moeda ao carregar
        const insVal = c.insalubridade || 'Não';
        const radioInS = document.querySelector(`input[name="insalubridade_check"][value="${insVal === 'Sim' ? 'Sim' : 'Não'}"]`);
        if(radioInS) radioInS.checked = true;
        if(document.getElementById('colab-insalubridade-valor')) {
            const rawIns = c.insalubridade_valor;
            if (rawIns) {
                const numIns = parseFloat(String(rawIns).replace(/[^\d.]/g, ''));
                document.getElementById('colab-insalubridade-valor').value = !isNaN(numIns)
                    ? new Intl.NumberFormat('pt-BR', {style:'currency', currency:'BRL'}).format(numIns)
                    : rawIns;
            } else {
                document.getElementById('colab-insalubridade-valor').value = '';
            }
        }
        if (typeof window.toggleInsalubridade === 'function') window.toggleInsalubridade(insVal);
        
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
        calculateVacationDays();

        updateStatusChip(getEffectiveStatus(c));
        
        if (c.estado_civil === 'Casado' || c.estado_civil === 'União Estável') {
            toggleConjuge();
            // Cônjuge agora salvo diretamente no colaborador (conjuge_nome / conjuge_cpf)
            if (document.getElementById('conjuge-nome')) document.getElementById('conjuge-nome').value = c.conjuge_nome || '';
            if (document.getElementById('conjuge-cpf')) document.getElementById('conjuge-cpf').value = c.conjuge_cpf || '';
        } else {
            toggleConjuge();
            if (document.getElementById('conjuge-nome')) document.getElementById('conjuge-nome').value = '';
            if (document.getElementById('conjuge-cpf')) document.getElementById('conjuge-cpf').value = '';
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
        // Listener: sincronizar CTPS com CPF em tempo real
        if (cpfInput && !cpfInput.dataset.ctpsListener) {
            cpfInput.addEventListener('input', function() {
                const digits = this.value.replace(/\D/g, '');
                const ctpsEl = document.getElementById('colab-ctps');
                const serieEl = document.getElementById('colab-ctps-serie');
                if (ctpsEl) ctpsEl.value = digits.substring(0, 7);
                if (serieEl) serieEl.value = digits.substring(7, 11);
            });
            cpfInput.dataset.ctpsListener = 'true';
        }
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
            cnh_numero: document.getElementById('doc-driver-license-id') ? document.getElementById('doc-driver-license-id').value : null,
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
                // Incluir Filhos / Dependentes (Cônjuge não é mais dependente)
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
                // Incluir apenas filhos como dependentes (cônjuge é salvo separadamente)
                return results;
            })(),
            // Cônjuge salvo como colunas diretas no colaborador
            conjuge_nome: document.getElementById('conjuge-nome') ? document.getElementById('conjuge-nome').value.trim() : null,
            conjuge_cpf: document.getElementById('conjuge-cpf') ? document.getElementById('conjuge-cpf').value.trim() : null,
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
            ferias_programadas_fim: document.getElementById('colab-ferias-programadas-fim') ? document.getElementById('colab-ferias-programadas-fim').value : null,
            adiantamento_salarial: document.querySelector('input[name="adiantamento_check"]:checked')?.value || 'Não',
            adiantamento_valor: document.getElementById('colab-adiantamento-valor') ? document.getElementById('colab-adiantamento-valor').value : null,
            insalubridade: document.querySelector('input[name="insalubridade_check"]:checked')?.value || 'Não',
            insalubridade_valor: document.getElementById('colab-insalubridade-valor') ? document.getElementById('colab-insalubridade-valor').value : null,
            tamanho_camiseta: document.getElementById('tamanho_camiseta') ? document.getElementById('tamanho_camiseta').value : null,
            tamanho_calca: document.getElementById('tamanho_calca') ? document.getElementById('tamanho_calca').value : null,
            tamanho_calcado: document.getElementById('tamanho_calcado') ? document.getElementById('tamanho_calcado').value : null
        };

        // Converter valores formatados (R$) para números antes de enviar
        const parseMoeda = (v) => {
            if (!v || typeof v !== 'string') return v;
            const clean = v.replace(/[^\d,]/g, "").replace(",", ".");
            return clean ? parseFloat(clean) : null;
        };
        data.salario = parseMoeda(data.salario);
        data.valor_transporte = parseMoeda(data.valor_transporte);
        data.adiantamento_valor = parseMoeda(data.adiantamento_valor);
        data.insalubridade_valor = parseMoeda(data.insalubridade_valor);

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
                const cnhNumeroEl = document.getElementById('doc-driver-license-id');
                const cnhCatEl = document.getElementById('colab-cnh-categoria');
                const cnhNumeroVal = cnhNumeroEl ? cnhNumeroEl.value.trim() : (data.cnh_numero || '').trim();
                const cnhCatVal = cnhCatEl ? cnhCatEl.value : (data.cnh_categoria || '');
                if (cnhNumeroEl && cnhCatEl) {
                    // Só valida se os campos estiverem no DOM
                    if (!cnhNumeroVal || !cnhCatVal) {
                        alert('Preenchimento Obrigatório: Dados da CNH (Número e Categoria) para Motorista não podem ficar vazios.');
                        btnRestorer();
                        return;
                    }
                    if (cnhNumeroVal.length < 11) {
                        alert('Preenchimento Obrigatório: O número da CNH deve conter pelo menos 11 dígitos.');
                        btnRestorer();
                        return;
                    }
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
        tabConjuge.style.display = 'none'; // Aba de Cônjuge extinta nativamente (migrado para Passo 4)
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
    'ASO': ['ASO Padrão'],
    'Ficha de EPI': ['Ficha de EPI Assinada'],
    'Multas': ['Contrato de Responsabilidade com o Veículo']
};

function getFichaCadastralDocs() {
    const isMotorista = viewedColaborador && (viewedColaborador.cargo || '').toUpperCase().includes('MOTORISTA');
    const isMasc = viewedColaborador && viewedColaborador.sexo === 'Masculino';
    const ec = (viewedColaborador && viewedColaborador.estado_civil || '').toLowerCase();
    const isCasado = ec.includes('casad') || ec.includes('vi\u00fav') || ec.includes('viuv') || ec.includes('divorc');
    const certidao = isCasado ? "Certid\u00e3o de Casamento" : "Certid\u00e3o de Nascimento";
    const rgTipoInput = document.getElementById('colab-rg-tipo');
    const rgTipo = (viewedColaborador && viewedColaborador.rg_tipo) ? viewedColaborador.rg_tipo : (rgTipoInput ? rgTipoInput.value : 'RG');
    
    const docs = [
        "T\u00edtulo Eleitoral",
        certidao,
        "Comprovante de endere\u00e7o",
        "Hist\u00f3rico escolar"
    ];
    
    if (isMasc) docs.push("Reservista");
    
    if (isMotorista) {
        docs.push("CNH");
    } else {
        if (rgTipo === 'CIN') docs.push("CIN-CPF");
        else docs.push("RG-CPF");
    }

    docs.push(
        "Carteira de vacina\u00e7\u00e3o",
        "Curr\u00edculo",
        "Carteira de Trabalho"
    );
    
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
        <div class="card p-4 mb-4" style="background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 12px;">
            <div style="display:flex; align-items:center; gap:0.75rem; margin-bottom:1.25rem;">
                <div style="background:#475569; border-radius:8px; width:36px; height:36px; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                    <i class="ph ph-warning" style="color:#fff; font-size:1.3rem;"></i>
                </div>
                <div>
                    <h4 style="margin:0; font-size:1rem; font-weight:700; color:#1e293b;">Gerar Documento de Advertência</h4>
                    <p style="margin:0; font-size:0.8rem; color:#64748b;">Preencha os campos e gere o documento já com os dados do colaborador</p>
                </div>
            </div>

            <div style="display:grid; grid-template-columns:1.5fr 2fr 1fr; gap:1rem; margin-bottom:1rem;">
                <div>
                    <label style="font-size:0.75rem; font-weight:700; color:#475569; display:block; margin-bottom:4px;">Tipo de Advertência</label>
                    <select id="adv-tipo" class="form-control" style="padding:0.5rem; border:1px solid #cbd5e1; border-radius:6px; font-size:0.9rem;">
                        <option value="ocorrencia">Ocorrência</option>
                        <option value="verbal">Advertência Verbal</option>
                        <option value="escrita">Advertência Escrita</option>
                        <option value="suspensao_1">Suspensão — 1 dia</option>
                        <option value="suspensao_2">Suspensão — 2 dias</option>
                        <option value="suspensao_3">Suspensão — 3 dias</option>
                    </select>
                </div>
                <div>
                    <label style="font-size:0.75rem; font-weight:700; color:#475569; display:block; margin-bottom:4px;">Título da Advertência <span style="color:#94a3b8; font-weight:400;">(opcional)</span></label>
                    <input type="text" id="adv-titulo" class="form-control" placeholder="Ex: Desrespeito às normas internas..." style="padding:0.5rem; border:1px solid #cbd5e1; border-radius:6px; font-size:0.9rem;">
                </div>
                <div>
                    <label style="font-size:0.75rem; font-weight:700; color:#475569; display:block; margin-bottom:4px;">Data Ocorrência</label>
                    <input type="date" id="adv-data" class="form-control" value="${new Date().toISOString().split('T')[0]}" style="padding:0.5rem; border:1px solid #cbd5e1; border-radius:6px; font-size:0.9rem;">
                </div>
            </div>

            <div style="margin-bottom:1rem;">
                <label style="font-size:0.75rem; font-weight:700; color:#475569; display:block; margin-bottom:4px;">Motivo / Descrição da Infração <span style="color:#ef4444;">*</span></label>
                <textarea id="adv-motivo" rows="3" class="form-control" placeholder="Descreva o motivo da advertência..." style="padding:0.5rem; border:1px solid #cbd5e1; border-radius:6px; font-size:0.9rem; resize:vertical; width:100%; box-sizing:border-box;"></textarea>
            </div>

            <div style="display:flex; gap:0.75rem; align-items:center; flex-wrap:wrap;">
                <button onclick="window.gerarAdvertencia()" class="btn btn-primary" style="background:#1d4ed8; border-color:#1d4ed8; display:flex; align-items:center; gap:6px; font-weight:700;">
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
        verbal:      'ADVERTÊNCIA VERBAL',
        escrita:     'ADVERTÊNCIA ESCRITA',
        suspensao_1: 'SUSPENSÃO DISCIPLINAR — 1 DIA',
        suspensao_2: 'SUSPENSÃO DISCIPLINAR — 2 DIAS',
        suspensao_3: 'SUSPENSÃO DISCIPLINAR — 3 DIAS',
        ocorrencia:  'OCORRÊNCIA'
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


    const isOcorrencia = tipo === 'ocorrencia';

    const htmlDoc = `
        <p style="margin-top:1.5rem; text-align:justify;">
            A empresa <strong>AMERICA RENTAL EQUIPAMENTOS LTDA</strong>, inscrita no CNPJ sob o nº 03.434.448/0001-01,
            situada na Rua Salto da Divisa, nº 97, CEP 07252-300, Parque Alvorada – Guarulhos/SP,
            ${isOcorrencia
                ? `vem por meio deste documento <strong>registrar a seguinte ocorrência</strong> envolvendo o(a) colaborador(a) <strong>${nomeColab}</strong>.`
                : `vem por meio deste documento aplicar ao(à) colaborador(a) <strong>${nomeColab}</strong> a presente <strong>${tipoTexto}</strong>.`
            }
        </p>
        ${titulo ? `<p style="margin-top:0.75rem; text-align:center; font-size:1rem; font-weight:700; color:#92400e; text-transform:uppercase; letter-spacing:0.04em; border-bottom:1px solid #fdba74; padding-bottom:0.4rem;">${titulo}</p>` : ''}

        <p style="margin-top:1rem; text-align:justify;">
            <strong>${isOcorrencia ? 'Descrição da ocorrência:' : 'Motivo / Infração cometida:'}</strong><br>
            ${motivo.replace(/\n/g, '<br>')}
        </p>
        ${suspensaoParag}
        ${!isOcorrencia ? `
        <p style="margin-top:1rem; text-align:justify;">
            Informamos que esta é <strong>uma medida disciplinar</strong> e que reincidências poderão acarretar
            penalidades mais severas, inclusive a rescisão do contrato de trabalho por justa causa,
            nos termos do artigo 482 da Consolidação das Leis do Trabalho (CLT).
        </p>

        <p style="margin-top:1rem; text-align:justify;">
            O(A) colaborador(a) declara, com sua assinatura, estar ciente do conteúdo desta advertência
            e de que a mesma será arquivada em seu prontuário.
        </p>` : `
        <p style="margin-top:1rem; text-align:justify; color:#475569; font-size:0.92em;">
            Este registro é de caráter informativo e será arquivado no prontuário do colaborador.
        </p>`}
    `;

    // Montar dados do colaborador para o padrão do preview
    const tipoSimples = {
        verbal:      'Advertência Verbal',
        escrita:     'Advertência Escrita',
        suspensao_1: 'Suspensão 1 dia',
        suspensao_2: 'Suspensão 2 dias',
        suspensao_3: 'Suspensão 3 dias',
        ocorrencia:  'Ocorrência'
    }[tipo] || tipoTexto;
    window._advertenciaData = {
        html: htmlDoc,
        tipo,
        isOcorrencia,
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

// ─── Template único para Preview e PDF de Advertências / Suspensões / Ocorrências ───
function buildAdvertenciaTemplate(data, logoSrc) {
    const isOcorrencia = data.isOcorrencia;

    // Seção de assinaturas (não exibida para ocorrências)
    const assinaturasHtml = !isOcorrencia ? `
        <div style="margin-top:40px;">
            <div style="display:flex; gap:40px; justify-content:center;">
                <div style="flex:1; text-align:center; max-width:220px;">
                    <div style="border-top:1px solid #111; padding-top:6px; font-size:11px;">
                        <div>Testemunha 1:</div>
                        <div>CPF:</div>
                    </div>
                </div>
                <div style="flex:1; text-align:center; max-width:220px;">
                    <div style="border-top:1px solid #111; padding-top:6px; font-size:11px;">
                        <div>Testemunha 2:</div>
                        <div>CPF:</div>
                    </div>
                </div>
            </div>
            <div style="margin-top:40px; text-align:center;">
                <div style="display:inline-block; width:260px; border-top:1px solid #111; padding-top:6px; font-size:11px; text-align:center;">
                    <div>Nome do Colaborador: ${data.colaborador.NOME_COMPLETO}</div>
                    <div>CPF: ${data.colaborador.CPF}</div>
                </div>
            </div>
        </div>
    ` : '';

    return `<style>html,body{margin:0!important;padding:0!important;background:#fff!important;}*{box-sizing:border-box;}</style><div style="width:794px; background:#fff; font-family:Arial,Helvetica,sans-serif; font-size:12px; color:#111; line-height:1.5; display:block;">
        <!-- LOGO BANNER - largura total sem margens -->
        <img src="${logoSrc}" style="width:100%; max-width:794px; display:block; margin:0; padding:0;" onerror="this.style.display='none'">

        <!-- CONTEÚDO COM MARGENS LATERAIS -->
        <div style="padding:20px 40px 40px 40px;">

            <!-- LINHA EMPRESA / CNPJ -->
            <table style="width:100%; border-collapse:collapse; margin-bottom:4px;">
                <tr>
                    <td style="font-size:11px; padding:0;">Empresa: <strong>AMERICA RENTAL EQUIPAMENTOS LTDA</strong></td>
                    <td style="font-size:11px; padding:0; text-align:right;">CNPJ: 03.434.448/0001-01</td>
                </tr>
                <tr>
                    <td style="font-size:11px; padding:0;">Colaborador: ${data.colaborador.NOME_COMPLETO}</td>
                    <td style="font-size:11px; padding:0; text-align:right;">CPF: ${data.colaborador.CPF}</td>
                </tr>
                <tr>
                    <td style="font-size:11px; padding:0;">Data do ocorrido: ${data.dataOcorrencia || ''}</td>
                    <td style="font-size:11px; padding:0; text-align:right;">Cargo: ${data.colaborador.CARGO}</td>
                </tr>
            </table>

            <hr style="border:none; border-top:1px solid #ccc; margin:10px 0 14px;">

            <!-- TÍTULO -->
            <h1 style="text-align:center; font-size:14px; font-weight:bold; text-transform:uppercase; margin:0 0 14px; color:#1e293b;">${data.gerador_nome}</h1>

            <!-- CORPO DO DOCUMENTO -->
            <div style="font-size:12px; line-height:1.6; text-align:justify;">
                ${data.html}
            </div>

            <!-- DATA -->
            <p style="margin-top:24px; font-size:12px; font-weight:bold;">Guarulhos, ${data.dataHojeExtenso}.</p>

            <!-- ESPAÇO RESERVADO PARA ASSINATURAS (desenhadas pelo pdf-lib após coleta) -->
            ${!isOcorrencia ? '<div style="height:180px;"></div>' : ''}
        </div>
    </div>`;
}

window.abrirPreviewAdvertencia = function(data) {

    const container = document.getElementById('preview-doc-body');
    if (!container) return;

    const apiBase = API_URL.replace('/api', '');
    const logoSrc = `${apiBase}/assets/logo-header.png`;

    // Monta o mesmo template do PDF para consistência visual
    container.innerHTML = buildAdvertenciaTemplate(data, logoSrc);
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

        // Pré-carregar o logo
        const imgPreload = new Image();
        imgPreload.src = logoSrc;
        await new Promise(resolve => {
            if (imgPreload.complete) return resolve();
            imgPreload.onload = resolve;
            imgPreload.onerror = resolve;
            setTimeout(resolve, 2000);
        });

        // ── Capturar direto do preview que já está renderizado corretamente na tela ──
        const previewEl = document.getElementById('preview-doc-body');
        if (!previewEl) throw new Error('Preview não encontrado. Abra o documento antes de anexar.');

        // Remover temporariamente sombra/borda/min-height para PDF mais limpo e sem página em branco extra
        const origBoxShadow = previewEl.style.boxShadow;
        const origBorder    = previewEl.style.border;
        const origMinHeight = previewEl.style.minHeight;
        previewEl.style.boxShadow = 'none';
        previewEl.style.border    = 'none';
        previewEl.style.minHeight = 'auto'; // evita página em branco extra

        const canvas = await html2canvas(previewEl, {
            scale: 2,
            useCORS: true,
            logging: false,
            allowTaint: true,
            backgroundColor: '#ffffff'
        });

        // Restaurar estilos
        previewEl.style.boxShadow = origBoxShadow;
        previewEl.style.border    = origBorder;
        previewEl.style.minHeight = origMinHeight;

        // Converter canvas → PDF A4 com suporte a múltiplas páginas
        const { jsPDF } = window.jspdf;
        const pdf   = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
        const pageW = pdf.internal.pageSize.getWidth();   // 210mm
        const pageH = pdf.internal.pageSize.getHeight();  // 297mm
        const imgData    = canvas.toDataURL('image/jpeg', 0.98);
        const imgHeightMm = pageW * (canvas.height / canvas.width);

        let posY = 0, page = 0;
        while (posY < imgHeightMm) {
            if (page > 0) pdf.addPage();
            pdf.addImage(imgData, 'JPEG', 0, -posY, pageW, imgHeightMm);
            posY += pageH;
            page++;
        }

        const pdfBlob = pdf.output('blob');

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

        // Ocorrência: sem assinatura e sem OneDrive — apenas salvo no prontuário local
        // (Advertência Verbal → OneDrive ocorre após testemunhas; Escrita/Suspensão → após testemunhas + colaborador)

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

    if (tabId === 'Multas') {
        // Aba de multas — renderiza a UI customizada de gestão de multas
        if (typeof window.renderMultasMotoristaTab === 'function') {
            window.renderMultasMotoristaTab(listContainer);
        } else {
            listContainer.innerHTML = '<div class="alert alert-warning"><i class="ph ph-warning"></i> Módulo de multas não carregado. Tente recarregar a página.</div>';
        }
    } else if (tabId === 'Contratos') {
        renderContratosTab(listContainer);
    } else if (tabId === '00.CheckList') {
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
    } else if (tabId === '01_FICHA_CADASTRAL') {
        // Usa a MESMA lista ordenada do Passo 3 da Admissão para garantir espelhamento
        const _ec = (viewedColaborador && viewedColaborador.estado_civil || '').toLowerCase();
        const _isCasado = _ec.includes('casad') || _ec.includes('vi\u00fav') || _ec.includes('viuv') || _ec.includes('divorc');
        const _certidao = _isCasado ? 'Certid\u00e3o de Casamento' : 'Certid\u00e3o de Nascimento';
        const _isMotorista2 = viewedColaborador && (viewedColaborador.cargo || '').toUpperCase().includes('MOTORISTA');
        const fixed = [
            'T\u00edtulo Eleitoral',
            _certidao,
            'Comprovante de endere\u00e7o',
            'Hist\u00f3rico escolar'
        ];
        const isMasc = viewedColaborador && viewedColaborador.sexo === 'Masculino';
        if (isMasc) fixed.push('Reservista');
        const rgTipo = (viewedColaborador && viewedColaborador.rg_tipo) ? viewedColaborador.rg_tipo : 'RG';
        
        if (_isMotorista2) {
            fixed.push('CNH');
        } else {
            fixed.push(rgTipo === 'CIN' ? 'CIN-CPF' : 'RG-CPF');
        }
        
        fixed.push('Carteira de vacinação', 'Currículo', 'Carteira de Trabalho');
        if (_isCasado) {
            fixed.push('CPF do Cônjuge');
        }

        fixed.forEach(docType => {  
            if (!searchTerm || docType.toLowerCase().includes(searchTerm)) {
                const existingDoc = filteredDocs.find(d => d.document_type === docType);
                listContainer.appendChild(createDocSlot(tabId, docType, existingDoc));
            }
        });
        filteredDocs.filter(d => !fixed.includes(d.document_type) && d.document_type !== 'Pensão Alimentícia').forEach(d => {
            listContainer.appendChild(createDocSlot(tabId, d.document_type, d));
        });

        // === PENSÃO ALIMENTÍCIA (Condicional - Prontuário) ===
        const pensaoDocPront = filteredDocs.find(d => d.document_type === 'Pensão Alimentícia');
        const temPensaoPront = (viewedColaborador && viewedColaborador.tem_pensao_alimenticia === 'Sim') || !!pensaoDocPront;
        const pensaoWrapperPront = document.createElement('div');
        pensaoWrapperPront.id = 'pensao-wrapper-pront';
        pensaoWrapperPront.style = 'border:1.5px solid #e2e8f0; border-radius:10px; padding:1rem; margin:0.5rem 0; background:#f8fafc;';
        pensaoWrapperPront.innerHTML = `
            <div style="display:flex; align-items:center; justify-content:space-between; gap:1rem; flex-wrap:wrap;">
                <div style="display:flex; align-items:center; gap:8px;">
                    <i class="ph ph-scales" style="color:#f503c5; font-size:1.1rem;"></i>
                    <span style="font-weight:600; font-size:0.9rem; color:#334155;">Possui documento de Pensão Alimentícia?</span>
                </div>
                <div style="display:flex; gap:6px;">
                    <button type="button" id="pensao-sim-pront" onclick="window.setPensaoPront('Sim')" style="padding:0.35rem 1rem; border-radius:6px; border:1.5px solid ${temPensaoPront ? '#10b981' : '#e2e8f0'}; background:${temPensaoPront ? '#ecfdf5' : '#fff'}; color:${temPensaoPront ? '#065f46' : '#334155'}; font-weight:700; cursor:pointer; font-size:0.85rem;">Sim</button>
                    <button type="button" id="pensao-nao-pront" onclick="window.setPensaoPront('Não')" style="padding:0.35rem 1rem; border-radius:6px; border:1.5px solid ${!temPensaoPront ? '#10b981' : '#e2e8f0'}; background:${!temPensaoPront ? '#ecfdf5' : '#fff'}; color:${!temPensaoPront ? '#065f46' : '#334155'}; font-weight:700; cursor:pointer; font-size:0.85rem;">Não</button>
                </div>
            </div>
            <div id="pensao-slot-pront" style="margin-top:0.75rem; display:${temPensaoPront ? 'block' : 'none'};"></div>
        `;
        listContainer.appendChild(pensaoWrapperPront);
        if (temPensaoPront) {
            const slotPront = listContainer.querySelector('#pensao-slot-pront');
            if (slotPront) slotPront.appendChild(createDocSlot(tabId, 'Pensão Alimentícia', pensaoDocPront || null));
        }
        window.setPensaoPront = function(resposta) {
            const simBtn = document.getElementById('pensao-sim-pront');
            const naoBtn = document.getElementById('pensao-nao-pront');
            const slot = document.getElementById('pensao-slot-pront');
            const isSimNow = resposta === 'Sim';
            if (simBtn) { simBtn.style.borderColor = isSimNow ? '#10b981' : '#e2e8f0'; simBtn.style.background = isSimNow ? '#ecfdf5' : '#fff'; simBtn.style.color = isSimNow ? '#065f46' : '#334155'; }
            if (naoBtn) { naoBtn.style.borderColor = !isSimNow ? '#10b981' : '#e2e8f0'; naoBtn.style.background = !isSimNow ? '#ecfdf5' : '#fff'; naoBtn.style.color = !isSimNow ? '#065f46' : '#334155'; }
            if (slot) {
                slot.style.display = isSimNow ? 'block' : 'none';
                if (isSimNow && slot.children.length === 0) {
                    slot.appendChild(createDocSlot(tabId, 'Pensão Alimentícia', null));
                }
            }
            if (viewedColaborador) viewedColaborador.tem_pensao_alimenticia = resposta;
            const colabId = viewedColaborador && viewedColaborador.id;
            if (colabId) {
                fetch(`${API_URL}/colaboradores/${colabId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${currentToken}` },
                    body: JSON.stringify({ tem_pensao_alimenticia: resposta })
                }).catch(()=>{});
            }
        };

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
            const deps = (viewedColaborador.dependentes || []).filter(d => d.grau_parentesco !== 'Cônjuge');
            if (!deps.length) {
                listContainer.innerHTML = '<div class="alert alert-info"><i class="ph ph-info"></i> Esta aba está disponível apenas para colaboradores que tenham dependentes cadastrados no sistema.</div>';
                return;
            }

            const hoje = new Date();
            deps.forEach((dep, idx) => {
                // Calcular idade
                let idade = null;
                if (dep.data_nascimento) {
                    const iso = dep.data_nascimento.includes('T') ? dep.data_nascimento : dep.data_nascimento + 'T12:00:00';
                    const nasc = new Date(iso);
                    if (!isNaN(nasc)) idade = Math.floor((hoje - nasc) / (365.25 * 24 * 3600 * 1000));
                }

                // Nome seguro para montar o document_type único por dependente
                const safeDepName = (dep.nome || 'DEP').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]/g,'_').replace(/_+/g,'_').replace(/^_|_$/g,'');

                // Cabeçalho da seção do dependente
                const header = document.createElement('div');
                header.style.cssText = 'display:flex; align-items:center; gap:10px; background:#f0f9ff; border:1px solid #bae6fd; border-radius:8px; padding:0.6rem 1rem; margin-bottom:0.75rem; margin-top:' + (idx > 0 ? '1.25rem' : '0');
                header.innerHTML = `
                    <i class="ph ph-user-circle" style="font-size:1.5rem; color:#0284c7;"></i>
                    <div>
                        <strong style="font-size:0.95rem; color:#0c4a6e;">${dep.nome || 'Dependente'}</strong>
                        <span style="font-size:0.82rem; color:#64748b; margin-left:8px;">${dep.grau_parentesco || ''}</span>
                        ${idade !== null ? `<span style="font-size:0.78rem; background:#e0f2fe; color:#0369a1; border-radius:10px; padding:1px 8px; margin-left:6px; font-weight:600;">${idade} ${idade === 1 ? 'ano' : 'anos'}</span>` : ''}
                    </div>`;
                listContainer.appendChild(header);

                // Documentos condícionais por faixa etária
                const docsConfig = [
                    { label: 'CPF ou RG',                    show: true },
                    { label: 'Caderneta de Vacinação',      show: idade !== null && idade < 7 },
                    { label: 'Atestado de Frequência Escolar', show: idade !== null && idade >= 7 && idade <= 17 },
                    { label: 'Certidão de Nascimento',       show: true },
                ];

                docsConfig.filter(d => d.show).forEach(docCfg => {
                    const fullDocType = `${docCfg.label}###DEP_${safeDepName}`;
                    const existingDoc = filteredDocs.find(d => d.document_type === fullDocType);
                    listContainer.appendChild(createDocSlot(tabId, fullDocType, existingDoc));
                });
            });
            return;
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
            // Renderiza aba completa de multas (para qualquer colaborador)
            if (typeof window.renderMultasMotoristaTab === 'function') {
                window.renderMultasMotoristaTab(listContainer);
            } else {
                listContainer.innerHTML = '<div class="alert alert-info">Carregando módulo de multas...</div>';
            }
            return;
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
    let atestadoContabHtml = '';
    if (isSaved) {
        if (existingDoc.atestado_tipo) {
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
        
        if (existingDoc.atestado_contab_enviado_em) {
            let sd = existingDoc.atestado_contab_enviado_em;
            if (!sd.includes('T')) sd = sd.replace(' ', 'T');
            if (!sd.endsWith('Z')) sd += 'Z';
            const contabDateObj = new Date(sd);
            const dd = String(contabDateObj.getDate()).padStart(2, '0');
            const mm = String(contabDateObj.getMonth()+1).padStart(2, '0');
            const yyyy = contabDateObj.getFullYear();
            const h = String(contabDateObj.getHours()).padStart(2, '0');
            const min = String(contabDateObj.getMinutes()).padStart(2, '0');
            atestadoContabHtml = ` <br><span style="color:#2f9e44; font-weight:600; font-size:0.75rem;"><i class="ph ph-check-circle"></i> Enviado p/ Contab: ${dd}/${mm}/${yyyy} - ${h}h${min}m</span> `;
        }
    }

    const subInfoLine = (vencInfoHtml || enviadoHtml || atestadoInfoHtml || atestadoContabHtml)
        ? `<p style="margin:2px 0 0; font-size:0.78rem;">${atestadoInfoHtml}${atestadoContabHtml}${vencInfoHtml}${enviadoHtml}</p>${linkAssinaturaHtml}`
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
            if (t.includes('ocorr'))               { bg = '#0ea5e9'; color = '#fff'; }
            else if (t.includes('verbal'))         { bg = '#ffd43b'; color = '#5c3d00'; }
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
        // Buscar o assId da tabela admissao_assinaturas para este documento
        // Se o existingDoc é da tabela documentos mas tem um ass relacionado
        const assId = existingDoc.admissao_ass_id || existingDoc.id;
        if (st === 'Assinado') {
            // Tenta usar o assId da tabela admissao_assinaturas se disponível
            // caso contrário usa o id do próprio documento
            assStatusIcon = `<button type="button" onclick="window.openSignedDocPopupDocumento(${existingDoc.id}, '${(docType||'').replace(/'/g,"\\'")}')"
                style="height:42px;display:inline-flex;align-items:center;gap:6px;background:#2f9e44;color:#fff;border:none;border-radius:6px;padding:0 0.85rem;font-size:0.85rem;font-weight:600;cursor:pointer;white-space:nowrap;"
                title="Visualizar PDF Assinado">
                <i class="ph ph-file-pdf" style="font-size:1.1rem;"></i> Ver Assinado
            </button>`;
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
                <div style="display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap; justify-content: flex-end; flex: 1;">
                    ${vencimentoInputHtml}

                    ${isSaved ? `
                        <button type="button" class="btn btn-secondary" onclick="viewDoc(${existingDoc.id})" title="Visualizar" style="height: 42px;"><i class="ph ph-eye"></i></button>
                    ` : ''}

                    ${(tabId === 'Advertências' && isSaved) ? (() => {
                        const _isOcorrDoc  = (docType || '').includes('###Ocorr');
                        const _isVerbalDoc = (docType || '').toLowerCase().includes('###advert') && (docType || '').toLowerCase().includes('verbal');
                        if (_isOcorrDoc) return ''; // Ocorrência não tem assinatura
                        return `
                        ${(!stMain || stMain === 'Nenhum') ? `
                        <button type="button" class="btn btn-secondary"
                                onclick="window.abrirModalAssinaturaTestemunhas(${existingDoc.id})"
                                style="height: 42px; display:flex; align-items:center; justify-content:center; gap:6px; background:#475569; color:#fff; border:none; border-radius:6px; padding:0 0.85rem; font-size:0.85rem; font-weight:600; cursor:pointer; white-space:nowrap;">
                            <i class="ph ph-users"></i> Testemunhas
                        </button>` : ''}
                        ${(stMain === 'Testemunhas' && !_isVerbalDoc) ? `
                        <button type="button" class="btn btn-primary"
                                onclick="window.abrirModalAssinaturaColaborador(${existingDoc.id})"
                                style="height: 42px; display:flex; align-items:center; justify-content:center; gap:6px; background:#0f4c81; color:#fff; border:none; border-radius:6px; padding:0 0.85rem; font-size:0.85rem; font-weight:600; cursor:pointer; white-space:nowrap;">
                            <i class="ph ph-pen-nib"></i> Assinar
                        </button>` : ''}
                        `;
                    })() : ''}




                    ${isSaved && !isAssinado ? `
                        <button type="button" class="btn btn-danger" onclick="deleteDoc(${existingDoc.id}, this)" title="Excluir" style="height: 42px;"><i class="ph ph-trash"></i></button>
                    ` : ''}

                    ${(tabId === 'Advertências' && isSaved && ['Assinado', 'Testemunhas', 'Aguardando', 'Pendente'].includes(stMain) && tipoAdvSimples && tipoAdvSimples.toLowerCase().includes('suspens')) ? `
                    <div style="display:flex; flex-direction:column; gap:0.35rem; margin-top:0.35rem; align-items:flex-end; width:100%; border-top: 1px dashed #e2e8f0; padding-top: 0.5rem;">
                        <div style="display:flex; gap:0.5rem; align-items:center; justify-content:flex-end; width:100%;">
                            <input type="email" id="susp-contab-email-${existingDoc.id}"
                                   value="thais.ricci@americarental.com.br"
                                   style="height:36px; padding:0 0.6rem; border:1px solid #cbd5e1; border-radius:6px; font-size:0.82rem; width:100%; max-width:250px;">
                            <button type="button"
                                    onclick="window.enviarSuspensaoContabilidade(${existingDoc.id}, 'susp-contab-email-${existingDoc.id}', this)"
                                    style="height:36px; display:flex; align-items:center; justify-content:center; gap:6px; background:#0f4c81; color:#fff; border:none; border-radius:6px; padding:0 0.85rem; font-size:0.82rem; font-weight:600; cursor:pointer; white-space:nowrap; max-width:250px;">
                                <i class="ph ph-buildings"></i> Enviar para Contabilidade
                            </button>
                        </div>
                    </div>` : ''}
                </div>
            ` : `
                <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                    <div style="display: flex; gap: 0.5rem; align-items: flex-end;">
                        ${vencimentoInputHtml}
                        ${isSaved && !(isAssinado && (tabId === 'Pagamentos' || tabId === 'ASO')) ? `
                            <button type="button" class="btn btn-secondary" onclick="viewDoc(${existingDoc.id})" title="Visualizar" style="height: 42px;"><i class="ph ph-eye"></i></button>
                            ${(!isAssinado) ? `<button type="button" class="btn btn-danger" onclick="deleteDoc(${existingDoc.id}, this)" title="Excluir" style="height: 42px;"><i class="ph ph-trash"></i></button>` : ''}
                        ` : ''}
                        ${(tabId === 'Pagamentos' || tabId === 'ASO') && !isSaved ? `
                        <div style="display:flex; align-items:center; gap:8px; font-size:0.82rem; white-space:nowrap;">
                            <span style="font-weight:600;color:#64748b;">Exige Assinatura?</span>
                            <label style="display:flex;align-items:center;gap:3px;cursor:pointer;margin:0;font-weight:500;">
                                <input type="radio" name="exig-assin-${(docType||'').replace(/[^a-zA-Z0-9]/g,'_')}" value="PENDENTE" ${stMain !== 'NAO_EXIGE' ? 'checked' : ''}> Sim
                            </label>
                            <label style="display:flex;align-items:center;gap:3px;cursor:pointer;margin:0;font-weight:500;">
                                <input type="radio" name="exig-assin-${(docType||'').replace(/[^a-zA-Z0-9]/g,'_')}" value="NAO_EXIGE" ${stMain === 'NAO_EXIGE' ? 'checked' : ''}> Não
                            </label>
                        </div>
                        ` : ''}
                        ${(!isAssinado && !(tabId === 'Atestados' && isSaved)) ? `
                        <label class="btn ${isSaved ? 'btn-warning' : 'btn-primary'}" title="${isSaved ? 'Substituir' : 'Fazer Upload'}" style="height: 42px; display: flex; align-items: center;">
                            <i class="ph ph-upload-simple"></i> ${isSaved ? 'Substituir' : 'Upload'}
                            <input type="file" accept=".pdf" style="display:none;" onchange="
                                const venc = this.closest('.doc-item').querySelector('.venc-input')?.value; 
                                if((${needsVencimento}) && !venc) { alert('Data de vencimento é obrigatória'); this.value=''; return; } 
                                let assStatus = null;
                                if('${tabId}' === 'Pagamentos' || '${tabId}' === 'ASO') {
                                    const r = this.closest('.doc-item').querySelector('input[name^=\\'exig-assin-\\']:checked');
                                    if(r) assStatus = r.value;
                                }
                                uploadDocument(this, '${tabId}', '${docType}', ${year}, ${month}, venc, assStatus)
                            ">
                        </label>
                        ` : ''}
                    </div>

                    ${(() => {
                        const isOcorrenciaDoc = (docType || '').includes('###Ocorr');
                        const showAssinafy = isSaved && tabId !== 'Atestados' && tabId !== '01_FICHA_CADASTRAL' && tabId !== 'Faculdade' && tabId !== 'Dependentes' && stMain !== 'NAO_EXIGE' && !isOcorrenciaDoc;
                        return showAssinafy ? `
                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                            ${(isAssinado && isSaved && (tabId === 'Pagamentos' || tabId === 'ASO')) ? `<button type="button" class="btn btn-secondary" onclick="viewDoc(${existingDoc.id})" title="Visualizar" style="height: 42px;"><i class="ph ph-eye"></i></button>` : ''}
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
        <div id="cert-digital-banner-pagamentos" style="border-radius:12px; padding:1.25rem; display:flex; gap:1.25rem; align-items:center; margin-bottom: 1.5rem; font-size:0.9rem; transition:all 0.3s ease;"></div>
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

    // Injetar status do certificado digital
    window.carregarStatusCertificado('cert-digital-banner-pagamentos');
    
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
        <div id="cert-digital-banner-aso" style="border-radius:12px; padding:1.25rem; display:flex; gap:1.25rem; align-items:center; margin-bottom: 1.5rem; font-size:0.9rem; transition:all 0.3s ease;"></div>
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
    // Injetar status do certificado digital
    window.carregarStatusCertificado('cert-digital-banner-aso');
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
        ? `<tr><td colspan="5" style="text-align:center; color:#94a3b8; padding:1.5rem;">Nenhuma falta registrada.</td></tr>`
        : faltas.map(f => `
            <tr style="border-bottom:1px solid #f1f5f9;">
                <td style="padding:0.65rem 0.75rem; font-weight:600;">${formatDateBR(f.data_falta)}</td>
                <td style="padding:0.65rem 0.75rem;">
                    <span style="background:${turnoColor[f.turno] || '#64748b'}; color:#fff; padding:2px 10px; border-radius:10px; font-size:0.75rem; font-weight:700;">${f.turno}</span>
                </td>
                <td style="padding:0.65rem 0.75rem; text-align:center;">
                    <span style="background:${f.avisado_previamente === 'Sim' ? '#dcfce7' : '#fee2e2'}; color:${f.avisado_previamente === 'Sim' ? '#166534' : '#991b1b'}; padding:2px 10px; border-radius:10px; font-size:0.75rem; font-weight:700;">
                        ${f.avisado_previamente === 'Sim' ? '✓ Sim' : '✗ Não'}
                    </span>
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
                <div style="display:flex; flex-direction:column; gap:0.25rem;">
                    <label style="font-size:0.8rem; font-weight:600; color:#475569;">Avisado previamente?</label>
                    <div style="display:flex; gap:0.75rem; height:38px; align-items:center; font-size:0.88rem;">
                        <label style="display:flex; align-items:center; gap:4px; cursor:pointer; margin:0; font-weight:500;">
                            <input type="radio" name="falta-avisado" value="Sim" checked> Sim
                        </label>
                        <label style="display:flex; align-items:center; gap:4px; cursor:pointer; margin:0; font-weight:500;">
                            <input type="radio" name="falta-avisado" value="Não"> Não
                        </label>
                    </div>
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
                        <th style="padding:0.6rem 0.75rem; color:#64748b; font-size:0.78rem; text-transform:uppercase; text-align:center;">Avisado Prev.</th>
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
    const avisado = document.querySelector('input[name="falta-avisado"]:checked')?.value || 'Não';
    if (!data) { alert('Informe a data da falta.'); return; }
    if (!viewedColaborador) return;

    try {
        await apiPost('/faltas', { colaborador_id: viewedColaborador.id, data_falta: data, turno, observacao: obs, avisado_previamente: avisado });
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
    const customName = `${selectedCID.code}_${nomeColabNorm}_${dd}${mm}${aa}`;

    const typeIn = `${selectedCID.code} - ${selectedCID.desc.substring(0, 60)}`;
    const year = document.getElementById('atestados_year') ? document.getElementById('atestados_year').value : today.getFullYear().toString();

    const formData = new FormData();
    formData.append('colaborador_id', viewedColaborador.id);
    formData.append('colaborador_nome', viewedColaborador.nome || 'Desconhecido');
    formData.append('tab_name', 'Atestados');
    formData.append('document_type', typeIn);
    formData.append('custom_name', customName);
    formData.append('cloud_name', customName + '.pdf'); // nome final sem timestamp para OneDrive
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

            // Quiet success – no toast needed when just attaching an atestado

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
                }).catch(err => console.warn('Falha ao recarregar documentos:', err));
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
                    assinafy_status: reqAssin || 'Nenhum',
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

    const prefix = tabId === 'ASO' ? 'aso' : tabId === 'Atestados' ? 'atestados' : tabId.toLowerCase();
    const yearEl = document.getElementById(`${prefix}_year`) || document.getElementById('pag_year') || document.getElementById('terapia_year');
    const monthEl = document.getElementById(`${prefix}_month`) || document.getElementById('pag_month') || document.getElementById('terapia_month');
    const year = yearEl ? yearEl.value : null;
    const month = monthEl ? monthEl.value : null;

    let reqAssin = null;
    if (tabId === 'Certificados') {
        const checkedRadio = document.querySelector(`input[name="dyn-assin-${tabId}"]:checked`);
        if (checkedRadio) reqAssin = checkedRadio.value;
    }

    uploadDocument(inputEl, tabId, docType, year, month, vencimento, reqAssin);
}

window.deleteDoc = async function(docId, btnEl) {
    if (!confirm("Tem certeza que deseja excluir esse anexo?")) {
        return;
    }

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
    try {
        // Buscar info do documento para decidir o que mostrar
        const doc = await apiGet(`/documentos/info/${docId}`).catch(() => null);
        
        // Se tem assinafy_status = Assinado, preferir o endpoint de download (que faz proxy do Assinafy)
        const token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token');
        const viewUrl = `${API_URL}/documentos/view/${docId}?token=${token}`;
        const downloadUrl = `${API_URL}/documentos/download/${docId}?token=${token}`;

        // Verificar se popup de doc-modal existe, caso contrário abrir numa nova janela
        const modal = document.getElementById('doc-modal');
        const modalBody = document.getElementById('modal-doc-body');
        const modalTitle = document.getElementById('modal-doc-title');
        
        if (modal && modalBody) {
            if (modalTitle) modalTitle.textContent = doc?.document_type || doc?.file_name || 'Documento';
            modalBody.innerHTML = '';
            
            // Usar iframe com URL direta (funciona com redirect do Assinafy)
            const iframe = document.createElement('iframe');
            iframe.src = viewUrl;
            iframe.style.cssText = 'width:100%;height:100%;border:none;display:block;';
            modalBody.appendChild(iframe);
            
            const btnDownload = document.getElementById('btn-download-doc');
            if (btnDownload) btnDownload.onclick = () => { window.open(downloadUrl, '_blank'); };
            
            modal.style.display = 'flex';
        } else {
            // Fallback: abrir em nova aba
            window.open(viewUrl, '_blank');
        }
    } catch(e) {
        alert('Erro ao abrir documento: ' + e.message);
    }
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
        // c.style.display = 'none'; // Mantido visível para permitir a seleção
    });
    const target = document.querySelector(`.status-chip[data-value="${val}"]`);
    if (target) {
        target.classList.add('active');
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
    const num = document.getElementById('doc-driver-license-id');
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
        const [items, templAdm, templOut] = await Promise.all([
            apiGet('/geradores'),
            apiGet('/gerador-departamento-templates').catch(() => []),
            apiGet('/gerador-outros-contratos-templates').catch(() => [])
        ]);

        // Garantir lista não vazia
        let geradores = Array.isArray(items) ? items : [];
        if (geradores.length === 0) {
            await seedInitialGeradores();
            geradores = await apiGet('/geradores');
        }

        // Montar mapa de template por gerador_id
        const admSet  = new Set((templAdm  || []).map(t => Number(t.gerador_id)));
        const outSet  = new Set((templOut  || []).map(t => Number(t.gerador_id)));
        const templateMap = {};
        geradores.forEach(g => {
            const inAdm = admSet.has(Number(g.id));
            const inOut = outSet.has(Number(g.id));
            if (inAdm && inOut) templateMap[g.id] = 'ambos';
            else if (inAdm)    templateMap[g.id] = 'admissao';
            else if (inOut)    templateMap[g.id] = 'contratos';
            else               templateMap[g.id] = 'nenhum';
        });

        window.allGeradores   = geradores;
        window._templateMap   = templateMap;
        window.renderGeradoresList(geradores);
    } catch (e) { console.error(e); }
};

window.renderGeradoresList = function(items) {
    const tbody = document.getElementById('table-geradores-body');
    if (!tbody) return;

    const templateMap = window._templateMap || {};

    // Labels e styles por tipo de template
    const TEMPLATE_LABELS = {
        admissao:  { label: 'Admissão',  bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
        contratos: { label: 'Contratos', bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
        ambos:     { label: 'Ambos',     bg: '#fdf4ff', color: '#c026d3', border: '#f0abfc' },
        nenhum:    { label: '—',         bg: '#f8fafc', color: '#94a3b8', border: '#e2e8f0' },
    };

    const PROTECTED_NAMES = [
        'autorização de desconto em folha',
        'ordem de serviço nr01',
        'termo de não interesse terapia',
        'termo de interesse terapia',
        'responsabilidade chaves',
        'termo de responsabilidade de chaves',
        'responsabilidade celular',
        'responsabilidade bilhete único',
        'contrato faculdade',
        'contrato academia',
        'acordo de auxílio-combustível',
        'contrato intermitente'
    ];
    
    const isProtected = (nome) => {
        const originalName = (nome || '').trim();
        const u = originalName.toLowerCase();
        
        // Expor essas cópias precisas para que o usuário consiga excluí-las
        const BAD_EXACT_NAMES = [
            'AUTORIZAÇÃO DE DESCONTO EM FOLHA DE PAGAMENTO',
            'ORDEM DE SERVIÇO NR01'
        ];
        if (BAD_EXACT_NAMES.includes(originalName)) return false;

        // Forcefully allow these to be deleted
        if (u.includes('equipamento') || u.includes('veículo') || u.includes('veiculo')) return false;

        return PROTECTED_NAMES.some(pn => u.includes(pn));
    };

    // Sort: protegidos primeiro, depois alfabético
    const sortedItems = [...items].sort((a, b) => {
        const aProt = isProtected(a.nome);
        const bProt = isProtected(b.nome);
        if (aProt && !bProt) return -1;
        if (!aProt && bProt) return 1;
        return (a.nome || '').localeCompare(b.nome || '');
    });

    tbody.innerHTML = sortedItems.map(g => {
        const tmpl  = templateMap[g.id] || 'nenhum';
        const lbl   = TEMPLATE_LABELS[tmpl] || TEMPLATE_LABELS.nenhum;
        const badge = `<span style="background:${lbl.bg};color:${lbl.color};border:1px solid ${lbl.border};border-radius:20px;padding:2px 10px;font-size:0.75rem;font-weight:700;">${lbl.label}</span>`;
        const prot  = isProtected(g.nome);
        return `
        <tr data-template="${tmpl}">
            <td>
                <div style="font-weight:600; color:var(--primary-color);">${g.nome}</div>
            </td>
            <td>${badge}</td>
            <td>${g.created_at ? new Date(g.created_at).toLocaleDateString('pt-BR') : '-'}</td>
            <td style="text-align:right;">
                <div style="display:flex; gap:0.5rem; justify-content:flex-end;">
                    <button class="btn btn-primary btn-sm" onclick="window.abrirModalSelecaoColab(${g.id})" title="Visualizar"><i class="ph ph-eye"></i></button>
                    <button class="btn btn-warning btn-sm" onclick="window.editGerador(${g.id})" title="Editar"><i class="ph ph-pencil-simple"></i></button>
                    ${prot ? '' : `<button class="btn btn-danger btn-sm" onclick="window.deleteGerador(${g.id})" title="Excluir"><i class="ph ph-trash"></i></button>`}
                </div>
            </td>
        </tr>`;
    }).join('');
};

window.filterGeradores = function() {
    const q       = (document.getElementById('search-geradores')?.value || '').toLowerCase();
    const tmplFilter = document.getElementById('filter-gerador-template')?.value || 'todos';

    // Filtro para a aba geradores (lista normal)
    const tabGerador = document.getElementById('geradores-tab-gerador');
    if (tabGerador && tabGerador.style.display !== 'none') {
        let filtered = window.allGeradores || [];
        if (q) filtered = filtered.filter(g => (g.nome || '').toLowerCase().includes(q));
        if (tmplFilter !== 'todos') {
            const map = window._templateMap || {};
            filtered = filtered.filter(g => (map[g.id] || 'nenhum') === tmplFilter);
        }
        window.renderGeradoresList(filtered);
        return;
    }

    // Filtro para a aba templates (departamentos e geradores)
    const container = document.getElementById('geradores-templates-container');
    if (container) {
        const deptCards = container.querySelectorAll('.dept-template-card');
        deptCards.forEach(card => {
            const docName = (card.dataset.docName || '').toLowerCase();
            const docs = card.querySelectorAll('.doc-lbl-item');
            let hasVisibleDoc = false;
            docs.forEach(docLbl => {
                const deptName = (docLbl.dataset.deptName || '').toLowerCase();
                const match = deptName.includes(q) || docName.includes(q);
                docLbl.style.display = match ? 'flex' : 'none';
                if (match) hasVisibleDoc = true;
            });
            card.style.display = (docName.includes(q) || hasVisibleDoc) ? 'block' : 'none';
        });
    }
};

// ----- ABAS: GERADOR / TEMPLATES -----
window.switchGeradoresTab = function(tab) {
    const tabGerador         = document.getElementById('geradores-tab-gerador');
    const tabTemplates       = document.getElementById('geradores-tab-templates');
    const tabOutros          = document.getElementById('geradores-tab-outros-contratos');
    const btnGerador         = document.getElementById('tab-btn-gerador');
    const btnTemplates       = document.getElementById('tab-btn-templates');
    const btnOutros          = document.getElementById('tab-btn-outros-contratos');
    const headerActions      = document.getElementById('geradores-header-actions');

    const tabs = { gerador: tabGerador, templates: tabTemplates, 'outros-contratos': tabOutros };
    const btns = { gerador: btnGerador, templates: btnTemplates, 'outros-contratos': btnOutros };

    Object.keys(tabs).forEach(k => {
        if (tabs[k]) tabs[k].style.display = k === tab ? 'block' : 'none';
        if (btns[k]) {
            btns[k].style.background   = k === tab ? '#f503c5' : '#f1f5f9';
            btns[k].style.color        = k === tab ? '#fff'    : '#64748b';
            btns[k].style.border       = k === tab ? '1.5px solid #f503c5' : '1.5px solid #e2e8f0';
        }
    });

    if (headerActions) headerActions.style.display = 'flex';

    const searchInput = document.getElementById('search-geradores');
    if (searchInput) { searchInput.value = ''; window.filterGeradores(); }

    if (tab === 'templates') window.loadGeradoresTemplates();
    if (tab === 'outros-contratos') window.loadGeradoresOutrosContratos();
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

    // Mapa: { gerador_id: [departamento_id, ...] }
    const docMap = {};
    (templates || []).forEach(t => {
        if (!docMap[t.gerador_id]) docMap[t.gerador_id] = [];
        docMap[t.gerador_id].push(Number(t.departamento_id));
    });

    // Contratos de uso exclusivo de outros fluxos (ex: Multas) não devem aparecer nos templates de admissão
    const GERADORES_EXCLUSIVOS_AVULSO = ['AUTORIZAÇÃO DE DESCONTO EM FOLHA DE PAGAMENTO', 'AUTORIZAÇÃO DE DESCONTO EM FOLHA'];
    const geradoresParaTemplate = geradores.filter(g => !GERADORES_EXCLUSIVOS_AVULSO.includes((g.nome || '').toUpperCase().trim()));

    const listHTML = geradoresParaTemplate.map(g => {
        const checked = docMap[g.id] || [];
        const deptList = departamentos.map(d => `
            <label class="doc-lbl-item" data-dept-name="${d.nome.replace(/"/g, '&quot;')}" style="display:flex; align-items:center; gap:0.6rem; padding:0.45rem 0.75rem; border-radius:6px; cursor:pointer; transition:background 0.15s;"
                   onmouseenter="this.style.background='#f8fafc'" onmouseleave="this.style.background=''">
                <input type="checkbox" class="gerador-dept-chk"
                    data-dept="${d.id}" data-gerador="${g.id}"
                    ${checked.includes(Number(d.id)) ? 'checked' : ''}
                    onchange="window.updateLocalDocCount(${g.id})"
                    style="width:16px;height:16px;cursor:pointer;accent-color:#f503c5;">
                <span style="font-size:0.88rem; color:#334155;">${d.nome}</span>
            </label>`).join('');

        return `
            <div class="card mb-3 dept-template-card" data-doc-name="${g.nome.replace(/"/g, '&quot;')}" style="overflow:hidden;">
                <div class="card-header bg-light d-flex align-items-center justify-content-between" style="padding:0.75rem 1rem; border-bottom:1px solid #e2e8f0; cursor:pointer;" onclick="const b=this.nextElementSibling; const i=this.querySelector('.tg-icon'); if(b.style.display==='none'){b.style.display='grid'; i.style.transform='rotate(180deg)';}else{b.style.display='none'; i.style.transform='rotate(0deg)';}">
                    <div style="display:flex; align-items:center; gap:0.5rem; font-weight:600; color:#1e293b;">
                        <i class="ph ph-file-text" style="color:#f503c5; font-size:1.1rem;"></i>
                        ${g.nome}
                    </div>
                    <div style="display:flex; align-items:center; gap:0.5rem;">
                        <span class="badge bg-secondary" id="doc-count-${g.id}" style="font-size:0.75rem; padding:0.4em 0.6em; border-radius:12px;">
                            ${checked.length} Setores
                        </span>
                        <button onclick="event.stopPropagation(); window.selecionarTodosSetores(${g.id})" style="font-size:0.72rem;padding:0.25em 0.65em;border:1px solid #cbd5e1;border-radius:6px;background:#f8fafc;cursor:pointer;color:#475569;font-weight:600;">Todos</button>
                        <i class="ph ph-caret-down tg-icon" style="transition:0.2s; color:#64748b;"></i>
                    </div>
                </div>
                <div class="card-body" style="display:none; padding:1rem; background:#fff; grid-template-columns:repeat(auto-fill, minmax(240px, 1fr)); gap:0.5rem;">
                    ${deptList}
                </div>
            </div>
        `;
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
    window.filterGeradores();
};

window.updateLocalDocCount = function(docId) {
    const chks = document.querySelectorAll(`.gerador-dept-chk[data-gerador="${docId}"]`);
    const count = Array.from(chks).filter(c => c.checked).length;
    const badge = document.getElementById(`doc-count-${docId}`);
    if (badge) badge.textContent = `${count} Setores`;
};

window.selecionarTodosSetores = function(docId) {
    const chks = document.querySelectorAll(`.gerador-dept-chk[data-gerador="${docId}"]`);
    const anyUnchecked = Array.from(chks).some(c => !c.checked);
    chks.forEach(c => { c.checked = anyUnchecked; });
    window.updateLocalDocCount(docId);
};

window.saveBatchGeradorDeptTemplates = async function(tipo) {
    const tipoReal = tipo || 'admissao';
    const selector = tipoReal === 'outros' ? '.gerador-outros-chk' : '.gerador-dept-chk';
    const endpoint = tipoReal === 'outros' ? '/gerador-outros-contratos-templates/batch' : '/gerador-departamento-templates/batch';

    const chks = document.querySelectorAll(selector);
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

        await apiPost(endpoint, { templates });
        
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

// === TEMPLATE DE OUTROS CONTRATOS ===

window.loadGeradoresOutrosContratos = async function() {
    const container = document.getElementById('geradores-outros-contratos-container');
    if (!container) return;
    container.innerHTML = `<div style="text-align:center;padding:2rem;color:#94a3b8;"><i class="ph ph-circle-notch" style="font-size:2rem;"></i> Carregando...</div>`;

    try {
        const [departamentos, geradores, templates] = await Promise.all([
            apiGet('/departamentos'),
            apiGet('/geradores'),
            apiGet('/gerador-outros-contratos-templates').catch(() => [])
        ]);
        window._outrosContratosTemplatesAll = templates;
        window.renderGeradoresOutrosContratos(departamentos, geradores, templates);
    } catch(e) {
        container.innerHTML = `<div class="card p-4" style="color:#e53e3e;">Erro ao carregar dados: ${e.message}</div>`;
    }
};

window.renderGeradoresOutrosContratos = function(departamentos, geradores, templates) {
    const container = document.getElementById('geradores-outros-contratos-container');
    if (!container) return;

    if (!geradores || geradores.length === 0) {
        container.innerHTML = `<div class="card p-4 text-center" style="color:#94a3b8;"><i class="ph ph-file-text" style="font-size:2.5rem;margin-bottom:1rem;display:block;"></i>Nenhum gerador cadastrado.</div>`;
        return;
    }

    const docMap = {};
    (templates || []).forEach(t => {
        if (!docMap[t.gerador_id]) docMap[t.gerador_id] = [];
        docMap[t.gerador_id].push(Number(t.departamento_id));
    });

    const listHTML = geradores.map(g => {
        const checked = docMap[g.id] || [];
        const deptList = departamentos.map(d => `
            <label style="display:flex; align-items:center; gap:0.6rem; padding:0.45rem 0.75rem; border-radius:6px; cursor:pointer; transition:background 0.15s;"
                   onmouseenter="this.style.background='#f8fafc'" onmouseleave="this.style.background=''">
                <input type="checkbox" class="gerador-outros-chk"
                    data-dept="${d.id}" data-gerador="${g.id}"
                    ${checked.includes(Number(d.id)) ? 'checked' : ''}
                    onchange="window.updateOutrosDocCount(${g.id})"
                    style="width:16px;height:16px;cursor:pointer;accent-color:#f503c5;">
                <span style="font-size:0.88rem; color:#334155;">${d.nome}</span>
            </label>`).join('');

        return `
            <div class="card mb-3" data-doc-name="${g.nome.replace(/"/g, '&quot;')}" style="overflow:hidden;">
                <div class="card-header bg-light d-flex align-items-center justify-content-between" style="padding:0.75rem 1rem; border-bottom:1px solid #e2e8f0; cursor:pointer;" onclick="const b=this.nextElementSibling; const i=this.querySelector('.tg-icon'); if(b.style.display==='none'){b.style.display='grid'; i.style.transform='rotate(180deg)';}else{b.style.display='none'; i.style.transform='rotate(0deg)';}">
                    <div style="display:flex; align-items:center; gap:0.5rem; font-weight:600; color:#1e293b;">
                        <i class="ph ph-file-plus" style="color:#f503c5; font-size:1.1rem;"></i>
                        ${g.nome}
                    </div>
                    <div style="display:flex; align-items:center; gap:0.5rem;">
                        <span class="badge bg-secondary" id="outros-count-${g.id}" style="font-size:0.75rem; padding:0.4em 0.6em; border-radius:12px;">${checked.length} Setores</span>
                        <i class="ph ph-caret-down tg-icon" style="transition:0.2s; color:#64748b;"></i>
                    </div>
                </div>
                <div class="card-body" style="display:none; padding:1rem; background:#fff; grid-template-columns:repeat(auto-fill, minmax(240px, 1fr)); gap:0.5rem;">
                    ${deptList}
                </div>
            </div>`;
    }).join('');

    container.innerHTML = `
        <div style="display: flex; justify-content: flex-end; margin-bottom: 1rem;">
            <button class="btn btn-success" onclick="window.saveBatchGeradorDeptTemplates('outros')" style="display:flex; align-items:center; gap:0.5rem; font-weight:600;">
                <i class="ph ph-floppy-disk"></i> Salvar Templates
            </button>
        </div>
        ${listHTML}
        <div style="display: flex; justify-content: flex-end; margin-top: 1rem;">
            <button class="btn btn-success" onclick="window.saveBatchGeradorDeptTemplates('outros')" style="display:flex; align-items:center; gap:0.5rem; font-weight:600;">
                <i class="ph ph-floppy-disk"></i> Salvar Templates
            </button>
        </div>
    `;
};

window.updateOutrosDocCount = function(docId) {
    const chks = document.querySelectorAll(`.gerador-outros-chk[data-gerador="${docId}"]`);
    const count = Array.from(chks).filter(c => c.checked).length;
    const badge = document.getElementById(`outros-count-${docId}`);
    if (badge) badge.textContent = `${count} Setores`;
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
    document.getElementById('gerador-conteudo-editor').innerHTML = '';
    // Padrão: marcar ambos os templates
    const chkAdm = document.getElementById('gerador-template-admissao');
    const chkOut = document.getElementById('gerador-template-outros');
    if (chkAdm) chkAdm.checked = true;
    if (chkOut) chkOut.checked = true;
    document.getElementById('modal-gerador').style.display = 'block';
};

window.closeModalGerador = function() {
    document.getElementById('modal-gerador').style.display = 'none';
};

window.editGerador = async function(id) {
    try {
        const [g, depts, templAdm, templOut] = await Promise.all([
            apiGet(`/geradores/${id}`),
            apiGet('/departamentos').catch(()=>[]),
            apiGet('/gerador-departamento-templates').catch(()=>[]),
            apiGet('/gerador-outros-contratos-templates').catch(()=>[])
        ]);
        document.getElementById('gerador-modal-title').textContent = 'Editar Gerador';
        document.getElementById('gerador-id').value = g.id;
        document.getElementById('gerador-nome').value = g.nome;
        
        // Detectar se é texto puro legível (legado) ou HTML
        let finalContent = g.conteudo;
        if (!finalContent.includes('<') && !finalContent.includes('>')) {
            finalContent = finalContent.replace(/\n/g, '<br>');
        }
        document.getElementById('gerador-conteudo-editor').innerHTML = finalContent;

        // Marcar checkboxes baseado nas templates existentes
        const chkAdm = document.getElementById('gerador-template-admissao');
        const chkOut = document.getElementById('gerador-template-outros');
        if (chkAdm) chkAdm.checked = templAdm.some(t => Number(t.gerador_id) === Number(id));
        if (chkOut) chkOut.checked = templOut.some(t => Number(t.gerador_id) === Number(id));

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
        const id = document.getElementById('gerador-id').value;
        const data = {
            nome: document.getElementById('gerador-nome').value,
            conteudo: document.getElementById('gerador-conteudo-editor').innerHTML,
            variaveis: '' 
        };
        
        try {
            let result;
            if (id) result = await apiPut(`/geradores/${id}`, data);
            else result = await apiPost('/geradores', data);
            
            if (result && !result.error) {
                const geradorId = result.id || Number(id);

                // Associar aos templates selecionados em todos os departamentos
                const chkAdm = document.getElementById('gerador-template-admissao');
                const chkOut = document.getElementById('gerador-template-outros');
                const incluirAdm = chkAdm && chkAdm.checked;
                const incluirOut = chkOut && chkOut.checked;

                try {
                    const depts = await apiGet('/departamentos').catch(() => []);
                    const deptIds = (depts || []).map(d => Number(d.id));

                    if (geradorId && deptIds.length > 0) {
                        // Buscar templates atuais para não sobrescrever os de outros geradores
                        const [admAtual, outAtual] = await Promise.all([
                            apiGet('/gerador-departamento-templates').catch(() => []),
                            apiGet('/gerador-outros-contratos-templates').catch(() => [])
                        ]);

                        // Montar novo batch preservando outros geradores
                        const outrasAdm = (admAtual || []).filter(t => Number(t.gerador_id) !== geradorId);
                        const outrasOut = (outAtual || []).filter(t => Number(t.gerador_id) !== geradorId);

                        const novasAdm = incluirAdm ? deptIds.map(d => ({ gerador_id: geradorId, departamento_id: d })) : [];
                        const novasOut = incluirOut ? deptIds.map(d => ({ gerador_id: geradorId, departamento_id: d })) : [];

                        await Promise.all([
                            apiPost('/gerador-departamento-templates/batch', { templates: [...outrasAdm, ...novasAdm] }),
                            apiPost('/gerador-outros-contratos-templates/batch', { templates: [...outrasOut, ...novasOut] })
                        ]);
                    }
                } catch(te) { console.warn('Erro ao associar templates:', te); }

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

        // Limpar e mostrar/esconder campos extras se for Desconto em Folha
        const gerador = (window.allGeradores || []).find(g => g.id == geradorId);
        const isDesconto = gerador && (gerador.nome || '').toUpperCase().includes('DESCONTO EM FOLHA');
        const extras = document.getElementById('extra-fields-desconto');
        if (extras) {
            extras.style.display = isDesconto ? 'block' : 'none';
            document.getElementById('desconto-descricao').value = '';
            document.getElementById('desconto-valor').value = '';
            document.getElementById('desconto-parcelas').value = '1';
            window.calcParcelaDesconto();
        }

        document.getElementById('modal-selecionar-colab').style.display = 'block';
    } catch (e) { console.error(e); }
};

window.calcParcelaDesconto = function() {
    let valStr = document.getElementById('desconto-valor').value;
    if(!valStr) valStr = '0';
    // Substituir vírgula por ponto para cálculo
    valStr = valStr.replace(',', '.');
    const valor = parseFloat(valStr) || 0;
    const parcelas = parseInt(document.getElementById('desconto-parcelas').value) || 1;
    
    const maxVal = (valor / parcelas).toFixed(2).replace('.', ',');
    document.getElementById('desconto-valor-parcelamento').innerText = `Valor de cada parcela: R$ ${maxVal}`;
};

window.processarGeracao = async function() {
    const geradorId = document.getElementById('gerador-id-temp').innerText;
    const colabId = document.getElementById('select-colab-gerar').value;
    
    if (!geradorId || !colabId) return;
    
    let requestBody = {};
    const gerador = (window.allGeradores || []).find(g => g.id == geradorId);
    if (gerador && (gerador.nome || '').toUpperCase().includes('DESCONTO EM FOLHA')) {
        requestBody.desconto_descricao = document.getElementById('desconto-descricao').value || 'Não informado';
        requestBody.desconto_valor = document.getElementById('desconto-valor').value || '0,00';
        requestBody.desconto_parcelas = document.getElementById('desconto-parcelas').value || '1';
        requestBody.desconto_valor_parcela = document.getElementById('desconto-valor-parcelamento').innerText.replace('Valor de cada parcela: R$ ', '');
    }

    try {
        const response = await fetch(`${API_URL}/geradores/${geradorId}/gerar/${colabId}`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${currentToken}`,
                'Content-Type': 'application/json' 
            },
            body: JSON.stringify(requestBody)
        });
        const data = await response.json();
        
        if (data.html) {
            document.getElementById('modal-selecionar-colab').style.display = 'none';
            window.abrirPreviewDocumento(data);
        }
    } catch (e) { console.error(e); }
};

window.abrirPreviewDocumento = function(data) {
    let container = document.getElementById('preview-doc-body');
    if (!container) {
        // Fallback robusto se o modal foi removido erroneamente por cache/códigos antigos
        console.warn("Modal preview doc não encontrado. Recriando...");
        const htmlFallback = `
        <div id="modal-preview-doc" class="modal" style="display:block; z-index:99999;">
            <div class="modal-content fullness">
                <div class="modal-header">
                    <h3 id="preview-doc-title">Visualizar Documento</h3>
                    <div id="preview-doc-buttons" style="display: flex; gap: 0.75rem; align-items: center;">
                        <button class="btn btn-primary" onclick="window.salvarDocumentoPDF()"><i class="ph ph-download-simple"></i> Salvar</button>
                        <button class="btn btn-secondary" onclick="document.getElementById('modal-preview-doc').style.display='none'"><i class="ph ph-x"></i> Fechar</button>
                    </div>
                </div>
                <div class="modal-body" style="padding: 2rem 0; background-color: #f4f6f9;">
                    <div id="preview-doc-body" style="background: white; margin: 0 auto; width: 21cm; min-height: 29.7cm; padding: 0; box-shadow: 0 0 20px rgba(0,0,0,0.1); border: 1px solid #ddd;"></div>
                </div>
            </div>
        </div>`;
        document.body.insertAdjacentHTML('beforeend', htmlFallback);
        container = document.getElementById('preview-doc-body');
    }

    const previewBtnSalvar = document.querySelector('#modal-preview-doc button.btn-primary');
    if (previewBtnSalvar) {
        previewBtnSalvar.innerHTML = '<i class="ph ph-download-simple"></i> Salvar como PDF';
        previewBtnSalvar.onclick = window.salvarDocumentoPDF;
    }
    // Verificar opção de assinatura manual
    const comAssinatura = document.querySelector('input[name="assinatura-tipo"]:checked')?.value === 'sim';

    // 1. Cabeçalho com Logotipo — sem margem para colar no topo da página
    const logoBanner = `<div style="margin:0;padding:0;line-height:0;"><img src="${API_URL.replace('/api', '')}/assets/logo-header.png" style="width:100%;display:block;margin:0;padding:0;"></div>`;

    // 2. Dados do Colaborador
    const colabInfoBase = `
        <h1 style="text-align: center; color: #1e293b; margin-top: 0.2rem; margin-bottom: 0.2rem; font-size: 1.1rem; text-transform: uppercase;">${data.gerador_nome}</h1>
        <p style="margin-top: 0.5rem; margin-bottom: 0.3rem; font-size: 0.85rem;"><b>COLABORADOR:</b> ${data.colaborador.NOME_COMPLETO}</p>
        <div style="border: 1px solid #000; padding: 0.4rem 0.75rem; margin-top: 0.3rem; line-height: 1.3; font-size: 0.75rem;">
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
    const customFontSize   = isSantander ? '0.68rem' : '0.82rem';
    const customLineHeight = isSantander ? '1.2'    : '1.45';

    // CSS de quebra de página correta — evita cortar parágrafos e cláusulas no meio
    const conteudoPrincipal = `
        <style>
            #preview-doc-body p  { margin: 0.1rem 0; line-height: ${customLineHeight}; page-break-inside: avoid; }
            #preview-doc-body li { margin: 0.08rem 0; line-height: ${customLineHeight}; page-break-inside: avoid; }
            #preview-doc-body br { line-height: 0.3; }
        </style>
        <div style="margin-top: 0.6rem; text-align: justify; font-size: ${customFontSize};">
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

    // Logo cola no topo (sem padding), o resto do conteúdo tem padding lateral uniforme
    const conteudoComPadding = `<div style="padding: 0 15px 15px 15px;">${colabInfoBase}${conteudoPrincipal}${footerHtml}</div>`;
    container.innerHTML = logoBanner + conteudoComPadding;
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
        // Apenas colaboradores com status de admissão pendente
        const ADMISSAO_PENDENTES = ['aguardando início', 'aguardando inicio', 'processo iniciado'];
        const pendentes = rows.filter(r => {
            const s = (r.status || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            return ADMISSAO_PENDENTES.includes(s);
        });
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
    // Atualiza título da aba Admissão com o nome do colaborador
    const admissaoTab = appOpenTabs.find(t => t.tabId === 'admissao');
    if (admissaoTab && colab) {
        const firstName = (colab.nome_completo || '').split(' ')[0];
        admissaoTab.title = `Admissão: ${firstName}`;
        renderAppTabs();
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
// --- Refatoração: Função genérica para construir HTML da lista de contratos (Admissão / Prontuário) ---
window.buildAdmissaoSignatureRows = function(availableGeradores, assinaturas, docs, colab) {
    return availableGeradores.map(g => {
        const ass = assinaturas.find(a => a.gerador_id === g.id || a.nome_documento === g.nome);
        const docEquivalente = (docs || []).find(d => d.tab_name === 'CONTRATOS' && (d.document_type === g.nome || (d.file_name && d.file_name.includes(g.nome))));
        let realStatus = '';
        if (docEquivalente && docEquivalente.assinafy_status === 'Assinado') realStatus = 'Assinado';
        else if (ass && ass.assinafy_status === 'Assinado') realStatus = 'Assinado';
        else if (docEquivalente && docEquivalente.assinafy_status === 'Pendente') realStatus = 'Pendente';
        else if (ass && ass.assinafy_status === 'Pendente') realStatus = 'Pendente';

        const isSigned   = realStatus === 'Assinado';
        const isPending  = realStatus === 'Pendente';
        const statusBadge = isSigned
            ? `<span style="background:#dcfce7;color:#15803d;border-radius:20px;padding:2px 10px;font-size:0.72rem;font-weight:700;white-space:nowrap;"><i class="ph ph-check-circle"></i> Assinado</span>`
            : isPending
            ? `<span style="background:#fef9c3;color:#92400e;border-radius:20px;padding:2px 10px;font-size:0.72rem;font-weight:700;white-space:nowrap;"><i class="ph ph-clock"></i> Aguardando</span>`
            : `<span style="background:#f1f5f9;color:#64748b;border-radius:20px;padding:2px 10px;font-size:0.72rem;font-weight:700;white-space:nowrap;"><i class="ph ph-minus-circle"></i> Não enviado</span>`;
        const colabId = colab ? colab.id : '';
        const certificadoAcionado = ass ? ass.certificado_assinado_em : null;
        let eyeBtn;
        if (isSigned && ass && certificadoAcionado) {
            eyeBtn = `<button onclick="window.openSignedDocPopup(${ass.id}, '${g.nome.replace(/'/g,"\\'")}', event)" style="border:none;background:none;cursor:pointer;color:#7c3aed;" title="Ver documento assinado pela empresa"><i class="ph ph-eye" style="font-size:1.2rem;"></i></button>`;
        } else if (isSigned && ass) {
            eyeBtn = `<button onclick="window.openSignedDocPopup(${ass.id}, '${g.nome.replace(/'/g,"\\'")}', event)" style="border:none;background:none;cursor:pointer;color:#16a34a;" title="Ver documento assinado pelo colaborador"><i class="ph ph-eye" style="font-size:1.2rem;"></i></button>`;
        } else {
            eyeBtn = `<button onclick="window.previewAdmissaoDoc(${g.id}, ${colabId}, event)" style="border:none;background:none;cursor:pointer;color:#64748b;" title="Ver documento original"><i class="ph ph-eye" style="font-size:1.2rem;"></i></button>`;
        }
        
        let dataEnvioBadge = '';
        if (isSigned && (ass?.assinado_em || docEquivalente?.assinafy_signed_at)) {
            try {
                const dateVal = ass?.assinado_em || docEquivalente?.assinafy_signed_at;
                const d = new Date(dateVal + (dateVal.includes('Z') ? '' : 'Z'));
                const dateStr = d.toLocaleDateString('pt-BR');
                const timeStr = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                dataEnvioBadge = `<span style="font-size:0.7rem; color:#15803d; margin-right:2px; font-weight:600;"><i class="ph ph-signature"></i> ${dateStr} ${timeStr}</span>`;
            } catch(e) {}
        } else if (ass && ass.enviado_em) {
            try {
                const d = new Date(ass.enviado_em + (ass.enviado_em.includes('Z') ? '' : 'Z'));
                const dateStr = d.toLocaleDateString('pt-BR');
                const timeStr = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                dataEnvioBadge = `<span style="font-size:0.7rem; color:#15803d; margin-right:2px; font-weight:600;"><i class="ph ph-paper-plane-tilt"></i> ${dateStr} ${timeStr}</span>`;
            } catch(e) {}
        }

        return `
        <label class="doc-check-item" data-gerador-id="${g.id}" style="display:flex; align-items:center; gap:0.6rem; padding:0.6rem 0.75rem; border:1px solid ${isSigned ? '#bbf7d0' : '#f1f5f9'}; border-radius:8px; cursor:pointer; background:${isSigned ? '#f0fdf4' : '#fff'}; transition:all 0.2s; justify-content:space-between;">
            <div style="display:flex; align-items:center; gap:0.6rem; flex:1;">
                ${isSigned 
                    ? `<i class="ph-fill ph-check-circle" style="color:#22c55e; font-size:1.2rem;"></i>`
                    : `<input type="checkbox" value="${g.id}" data-nome="${g.nome}" checked style="width:16px;height:16px;cursor:pointer;accent-color:#f503c5;">`
                }
                <div style="display:flex; flex-direction:column; gap:2px;">
                    <span style="font-size:0.87rem; font-weight:600; color:#334155;">${g.nome}</span>
                </div>
            </div>
            <div style="display:flex; align-items:center; gap:0.5rem;">
                ${dataEnvioBadge}
                ${statusBadge}
                ${eyeBtn}
            </div>
        </label>`;
    }).join('');
};

window.renderContratosTab = async function(container) {
    if (!viewedColaborador) return;
    container.innerHTML = '';

    const wrapper = document.createElement('div');
    wrapper.innerHTML = `
        <div style="display:flex; gap:4px; border-bottom:2px solid #e2e8f0; margin-bottom:1.25rem;">
            <button id="sub-tab-btn-admissao"
                style="padding:0.55rem 1.2rem; border:none; border-radius:8px 8px 0 0; font-weight:700; cursor:pointer; background:var(--primary-color); color:#fff; font-size:0.88rem; display:flex; align-items:center; gap:6px;">
                <i class="ph ph-briefcase"></i> Contratos de Admissão
            </button>
            <button id="sub-tab-btn-avulso"
                style="padding:0.55rem 1.2rem; border:none; border-radius:8px 8px 0 0; font-weight:600; cursor:pointer; background:#f1f5f9; color:#64748b; font-size:0.88rem; display:flex; align-items:center; gap:6px;">
                <i class="ph ph-file-plus"></i> Outros Contratos
            </button>
        </div>
        <div id="contratos-sub-admissao">
            <p class="text-muted" style="padding:0.5rem;"><i class="ph ph-spinner ph-spin"></i> Carregando...</p>
        </div>
        <div id="contratos-sub-avulso" style="display:none;">
            <p class="text-muted" style="padding:0.5rem;"><i class="ph ph-spinner ph-spin"></i> Carregando geradores...</p>
        </div>`;
    container.appendChild(wrapper);

    window._contratosAvulsoLoaded = false;

    window.switchContratosSubTab = function(tab) {
        const admDiv = document.getElementById('contratos-sub-admissao');
        const avDiv  = document.getElementById('contratos-sub-avulso');
        const btnAdm = document.getElementById('sub-tab-btn-admissao');
        const btnAv  = document.getElementById('sub-tab-btn-avulso');
        if (tab === 'admissao') {
            if (admDiv) admDiv.style.display = '';
            if (avDiv)  avDiv.style.display  = 'none';
            if (btnAdm) { btnAdm.style.background = 'var(--primary-color)'; btnAdm.style.color = '#fff'; }
            if (btnAv)  { btnAv.style.background  = '#f1f5f9'; btnAv.style.color  = '#64748b'; }
        } else {
            if (admDiv) admDiv.style.display = 'none';
            if (avDiv)  avDiv.style.display  = '';
            if (btnAdm) { btnAdm.style.background = '#f1f5f9'; btnAdm.style.color = '#64748b'; }
            if (btnAv)  { btnAv.style.background  = 'var(--primary-color)'; btnAv.style.color  = '#fff'; }
            if (!window._contratosAvulsoLoaded) {
                window._contratosAvulsoLoaded = true;
                const avDiv2 = document.getElementById('contratos-sub-avulso');
                if (avDiv2) window.renderContratosAvulso(avDiv2);
            }
        }
    };

    document.getElementById('sub-tab-btn-admissao').onclick = () => window.switchContratosSubTab('admissao');
    document.getElementById('sub-tab-btn-avulso').onclick   = () => window.switchContratosSubTab('avulso');

    try {
        const [depts, geradores, templates, assinaturas, docs] = await Promise.all([
            apiGet('/departamentos'),
            apiGet('/geradores'),
            apiGet('/gerador-departamento-templates').catch(() => []),
            apiGet(`/admissao-assinaturas/${viewedColaborador.id}`).catch(() => []),
            apiGet(`/colaboradores/${viewedColaborador.id}/documentos`).catch(() => [])
        ]);

        window._todosGeradores = geradores;

        let availableGeradores = [];
        const empDeptId = viewedColaborador.departamento;
        const deptObj = depts.find(d =>
            String(d.id) === String(empDeptId) ||
            d.nome.trim().toLowerCase() === String(empDeptId).trim().toLowerCase()
        );
        if (deptObj) {
            const geradorIds = [...new Set(templates
                .filter(t => Number(t.departamento_id) === Number(deptObj.id))
                .map(t => Number(t.gerador_id)))];
            const seen1 = new Set();
            availableGeradores = geradores.filter(g => geradorIds.includes(Number(g.id)) && !seen1.has(Number(g.id)) && seen1.add(Number(g.id)));
        }

        window._admissaoGeradores = availableGeradores;
        window._admissaoAssinaturas = assinaturas;

        const admDiv = document.getElementById('contratos-sub-admissao');
        if (admDiv) {
            if (availableGeradores.length > 0) {
                let html = `
                    <div class="alert alert-info mb-3">
                        <i class="ph ph-info"></i> Contratos configurados via <b>Admissão</b> para o departamento deste colaborador.
                    </div>
                    <div id="contratos-signature-list" style="display:flex;flex-direction:column;gap:0.75rem;margin-bottom:1.5rem;">`;
                html += window.buildAdmissaoSignatureRows(availableGeradores, assinaturas, docs, viewedColaborador);
                html += `</div>
                    <div style="background:#f8fafc; padding:15px; border-radius:8px; border:1px solid #e2e8f0; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
                        <div>
                            <div style="font-weight:700; color:#0f172a; margin-bottom:4px;">Envio para Assinatura Digital</div>
                            <div style="font-size:0.78rem; color:#64748b;">Documentos enviados ao e-mail do colaborador via Assinafy.</div>
                        </div>
                        <button id="btn-enviar-contratos" class="btn btn-primary" onclick="window.sendAdmissaoSignatures('contratos-signature-list','btn-enviar-contratos')" style="display:flex;align-items:center;gap:5px;">
                            <i class="ph ph-paper-plane-tilt"></i> Enviar para Assinatura
                        </button>
                    </div>`;
                admDiv.innerHTML = html;
            } else {
                admDiv.innerHTML = `<p class="text-muted" style="padding:1rem;text-align:center;">
                    Nenhum contrato configurado para o departamento <b>${deptObj ? deptObj.nome : (empDeptId || 'Não Informado')}</b>.<br>
                    <small>Configure em <b>Geradores → Template de Admissão</b>.</small>
                </p>`;
            }
        }
    } catch(err) {
        const admDiv = document.getElementById('contratos-sub-admissao');
        if (admDiv) admDiv.innerHTML = `<div class="alert alert-danger"><i class="ph ph-warning"></i> Erro: ${err.message}</div>`;
    }
};

// === SUB-ABA CONTRATOS ===
window.renderContratosAvulso = async function(container) {
    if (!viewedColaborador || !container) return;
    container.innerHTML = '<p class="text-muted"><i class="ph ph-spinner ph-spin"></i> Carregando Documentos...</p>';
    try {
        // Busca paralela com null-safe em todas as respostas
        const safeGet = async (url) => {
            try {
                const r = await apiGet(url);
                return Array.isArray(r) ? r : (r ? [r] : []);
            } catch(e) { return []; }
        };
        const [assinaturas, docs, geradores, outrosTemplates, departamentos] = await Promise.all([
            safeGet(`/colaboradores/${viewedColaborador.id}/admissao-assinaturas`),
            safeGet(`/colaboradores/${viewedColaborador.id}/documentos`),
            safeGet('/geradores'),
            safeGet('/gerador-outros-contratos-templates'),
            safeGet('/departamentos')
        ]);
        window._todosGeradores = geradores;

        // Geradores configurados via Template de Outros Contratos (por departamento)
        let templateGeradores = [];
        const empDeptId = viewedColaborador.departamento; 
        const deptObj = departamentos.find(d =>
            String(d.id) === String(empDeptId) ||
            String(d.nome).trim().toLowerCase() === String(empDeptId).trim().toLowerCase()
        );
        if (deptObj) {
            const geradorIds = outrosTemplates.filter(t => Number(t.departamento_id) === Number(deptObj.id)).map(t => Number(t.gerador_id));
            if (geradorIds.length > 0) {
                templateGeradores = geradores.filter(g => geradorIds.includes(Number(g.id)));
            }
        }

        // === CONTRATOS DINÂMICOS POR PERFIL DO COLABORADOR ===
        // Mapeia nome do gerador → condição baseada no perfil
        const c = viewedColaborador;
        const PROFILE_CONTRACT_MAP = [
            // Terapia
            { nome: 'Termo de NÃO Interesse Terapia',   cond: c.terapia_participa === 'Não' || c.terapia_participa === 'Nao' },
            { nome: 'Termo de Interesse Terapia',        cond: c.terapia_participa === 'Sim' },
            // Meio de transporte
            { nome: 'Responsabilidade Bilhete Único',    cond: (c.meio_transporte || '').toLowerCase().includes('vt') || (c.meio_transporte || '').toLowerCase().includes('vale transporte') },
            { nome: 'Acordo de Auxílio-Combustível',     cond: (c.meio_transporte || '').toLowerCase().includes('vc') || (c.meio_transporte || '').toLowerCase().includes('combustível') || (c.meio_transporte || '').toLowerCase().includes('combustivel') },
            // Celular
            { nome: 'Responsabilidade Celular',          cond: c.celular_participa === 'Sim' },
            // Faculdade
            { nome: 'Contrato Faculdade',                cond: c.faculdade_participa === 'Sim' },
            // Academia
            { nome: 'Contrato Academia',                 cond: c.academia_participa === 'Sim' },
        ];

        // Chaves: se o colaborador tiver chaves atribuídas (já vem no payload do colaborador)
        const temChaves = Array.isArray(c.chaves_lista) && c.chaves_lista.length > 0;
        if (temChaves) {
            PROFILE_CONTRACT_MAP.push({ nome: 'Termo de Responsabilidade de Chaves', cond: true });
        }

        // Filtrar apenas os contratos cujas condições são verdadeiras
        const profileGeradorNomes = PROFILE_CONTRACT_MAP.filter(m => m.cond).map(m => m.nome);

        // Encontrar esses geradores na lista geral (match por nome, case-insensitive)
        const profileGeradores = profileGeradorNomes
            .map(nome => geradores.find(g => (g.nome || '').trim().toLowerCase() === nome.toLowerCase()))
            .filter(Boolean);

        // Geradores dinâmicos (perfil) primeiro, depois os do template — sem duplicatas
        const seenIds = new Set();
        const availableGeradores = [...profileGeradores, ...templateGeradores].filter(g => {
            if (seenIds.has(g.id)) return false;
            seenIds.add(g.id);
            return true;
        });

        // Remover o contrato de multa (AUTORIZAÇÃO DE DESCONTO) da lista geral de contratos avulsos, pois tem fluxo próprio de Multas
        const finalGeradores = availableGeradores.filter(g => 
            !['AUTORIZAÇÃO DE DESCONTO EM FOLHA DE PAGAMENTO', 'AUTORIZAÇÃO DE DESCONTO EM FOLHA']
                .includes((g.nome || '').toUpperCase().trim())
        );

        // Apenas documentos da aba separada de outros contratos (não mistura com admissão)
        const filteredDocs = docs.filter(d => d.tab_name === 'CONTRATOS_AVULSOS');

        // Pendentes: geradores de perfil que ainda não foram gerados (sem doc salvo com esse nome)
        const geradosNomes = new Set(filteredDocs.map(d => (d.document_type || '').trim().toLowerCase()));
        const pendingGeradores = profileGeradores.filter(g =>
            !geradosNomes.has((g.nome || '').trim().toLowerCase())
        );

        // HTML das linhas pendentes (topo da lista)
        const pendingRowsHtml = pendingGeradores.map(g => {
            const escNome = (g.nome||'').replace(/'/g,"\\'").replace(/"/g, "&quot;");
            return `
            <div style="display:flex; align-items:center; justify-content:space-between; padding:0.65rem 0.75rem; border:1.5px dashed #c026d3; border-radius:8px; background:#fdf4ff; gap:0.75rem;">
                <div style="display:flex; align-items:center; gap:0.6rem; flex:1;">
                    <span style="background:#fdf4ff;color:#c026d3;border:1px solid #f0abfc;border-radius:10px;padding:2px 8px;font-size:0.7rem;font-weight:700;white-space:nowrap;">Perfil</span>
                    <div>
                        <span style="font-weight:600; color:#334155; font-size:0.9rem;">${g.nome}</span>
                        <div style="font-size:0.75rem; color:#a21caf; margin-top:1px;">Necessário pelo perfil do colaborador — aguardando geração</div>
                    </div>
                </div>
                
                <div style="display:flex; align-items:center; gap:0.75rem; border-left: 1px solid #f0abfc; padding-left: 1rem;">
                    <span style="font-size:0.85rem; font-weight:600; color:#334155;">Exige Assinatura?</span>
                    <label style="cursor:pointer; display:flex; align-items:center; gap:0.25rem; font-size:0.85rem; color:#0f172a; margin:0;">
                        <input type="radio" name="req-ass-${g.id}" value="sim" onchange="window.toggleAcaoContratoPerfil('${g.id}', 'sim', '${escNome}')"> Sim
                    </label>
                    <label style="cursor:pointer; display:flex; align-items:center; gap:0.25rem; font-size:0.85rem; color:#0f172a; margin:0;">
                        <input type="radio" name="req-ass-${g.id}" value="nao" onchange="window.toggleAcaoContratoPerfil('${g.id}', 'nao', '${escNome}')"> Não
                    </label>
                </div>
                
                <div id="pg-action-${g.id}" style="min-width: 160px; text-align: right; display: flex; justify-content: flex-end;">
                    <span style="font-size:0.8rem; color:#64748b; font-style:italic;">Selecione uma opção</span>
                </div>
            </div>`;
        }).join('');

        container.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem; flex-wrap:wrap; gap:1rem;">
                <div>
                     <h3 style="margin:0; font-size:1.1rem; color:#1e293b; font-weight:700;"><i class="ph ph-files"></i> Contratos e Autorizações</h3>
                     <p style="margin:0; font-size:0.85rem; color:#64748b;">Gere templates ou anexe PDFs para assinatura.</p>
                </div>
                <div style="display:flex; gap:0.5rem;">
                    <label class="btn btn-secondary" style="display:flex;align-items:center;margin:0;gap:0.4rem;cursor:pointer;">
                        <i class="ph ph-upload-simple"></i> Anexar PDF
                        <input type="file" accept=".pdf" style="display:none" onchange="window.uploadContratoExterno(this)">
                    </label>
                    <button class="btn btn-primary" onclick="window.abrirModalGerarContrato()" style="display:flex;align-items:center;margin:0;gap:0.4rem;">
                        <i class="ph ph-file-plus"></i> Gerar Novo
                    </button>
                 </div>
            </div>
            
            <div id="ca-list-container" style="display:flex; flex-direction:column; gap:0.5rem; margin-bottom:1.5rem;">
                ${pendingRowsHtml}
                ${window.buildContratosSignatureRows(assinaturas, filteredDocs, viewedColaborador)}
            </div>

            <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; padding:1.25rem;">
                <p style="margin:0 0 1rem 0; font-size:0.88rem; color:#475569;"><i class="ph ph-info"></i> Selecione os documentos acima que deseja enviar para assinatura digital via Assinafy.</p>
                <button class="btn btn-primary" id="ca-btn-assinar-lote" onclick="window.enviarAssinaturaLoteContratos()" style="display:flex; align-items:center; gap:0.5rem; font-weight:600;">
                    <i class="ph ph-paper-plane-tilt"></i> Enviar Selecionados para Assinatura
                </button>
            </div>
        `;
        
        window._caAvailableGeradores = finalGeradores;
    } catch(err) {
        container.innerHTML = `<div class="alert alert-danger"><i class="ph ph-warning"></i> Erro: ${err.message}</div>`;
    }
};

window.toggleAcaoContratoPerfil = function(geradorId, exige, geradorNome) {
    const actionDiv = document.getElementById('pg-action-' + geradorId);
    if (!actionDiv) return;
    
    if (exige === 'nao') {
        actionDiv.innerHTML = `
            <label class="btn btn-secondary btn-sm" style="margin:0;cursor:pointer;display:inline-flex;align-items:center;gap:4px;font-size:0.8rem;">
                <i class="ph ph-upload-simple"></i> Anexar PDF
                <input type="file" accept=".pdf" style="display:none;" onchange="window.uploadContratoPerfilNaoAssinado(this, '${geradorNome}')">
            </label>
        `;
    } else {
        actionDiv.innerHTML = `
            <button class="btn btn-primary btn-sm" style="margin:0;cursor:pointer;display:inline-flex;align-items:center;gap:4px;font-size:0.8rem;background:#c026d3;border-color:#c026d3;" 
                onclick="window.previewContratoPerfilAssinado('${geradorId}', '${geradorNome}')">
                <i class="ph ph-file-arrow-down"></i> Gerar Documento
            </button>
        `;
    }
};

window.uploadContratoPerfilNaoAssinado = async function(input, geradorNome) {
    const file = input.files[0];
    if (!file || !viewedColaborador) return;
    Swal.fire({ title: 'Anexando...', allowOutsideClick: false, didOpen: function() { Swal.showLoading(); } });

    var formData = new FormData();
    formData.append('file', file);
    formData.append('tab_name', 'CONTRATOS_AVULSOS');
    formData.append('document_type', geradorNome);
    formData.append('colaborador_id', viewedColaborador.id);
    formData.append('colaborador_nome', viewedColaborador.nome_completo || '');
    formData.append('assinafy_status', 'NAO_EXIGE');

    try {
        var res = await fetch(API_URL + '/documentos', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + currentToken },
            body: formData
        });
        var data = await res.json().catch(function() { return {}; });
        if (!res.ok) throw new Error(data.error || 'Falha ao salvar PDF');
        Swal.fire({ icon: 'success', title: 'Documento anexado!', timer: 1800, showConfirmButton: false });
        window._contratosAvulsoLoaded = false;
        var avDiv = document.getElementById('contratos-sub-avulso');
        if (avDiv) await window.renderContratosAvulso(avDiv);
    } catch(e) {
        Swal.fire('Erro', e.message, 'error');
    }
};

window.previewContratoPerfilAssinado = async function(geradorId, geradorNome) {
    Swal.fire({ title: 'Gerando...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    try {
        const res = await fetch(`${API_URL}/geradores/${geradorId}/gerar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${currentToken}` },
            body: JSON.stringify({ colaborador_id: viewedColaborador.id, colabId: viewedColaborador.id })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro ao gerar documento');
        Swal.close();

        window._perfilGeradorIdCtx = geradorId;
        window._perfilGeradorNomeCtx = geradorNome;

        window.abrirPreviewDocumento(data);

        setTimeout(() => {
            const previewBtns = document.getElementById('preview-doc-buttons');
            if (previewBtns) {
                previewBtns.innerHTML = `
                    <button class="btn btn-secondary" onclick="window.fecharPreviewEHabitarEnvio()">
                        <i class="ph ph-x"></i> Fechar Prévia
                    </button>
                `;
            }
        }, 150);

    } catch(e) {
        Swal.fire('Erro', e.message, 'error');
    }
};

window.fecharPreviewEHabitarEnvio = function() {
    const elModal = document.getElementById('modal-preview-doc') || document.getElementById('doc-modal');
    if (elModal) elModal.style.display = 'none';

    const gId = window._perfilGeradorIdCtx;
    if (!gId) return;

    const actionDiv = document.getElementById('pg-action-' + gId);
    if (actionDiv) {
        actionDiv.innerHTML = `
            <button class="btn btn-success btn-sm" style="margin:0;cursor:pointer;display:inline-flex;align-items:center;gap:4px;font-size:0.8rem;" 
                onclick="window.enviarAssinaturaPerfilDireto()">
                <i class="ph ph-paper-plane-tilt"></i> Enviar para Assinatura
            </button>
        `;
    }
};

window.enviarAssinaturaPerfilDireto = async function() {
    const geradorId = window._perfilGeradorIdCtx;
    const geradorNome = window._perfilGeradorNomeCtx;
    if (!geradorId) return;

    Swal.fire({ title: 'Salvando e Enviando...', text: 'Enviando para Assinafy...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    try {
        const previewContent = document.querySelector('#modal-preview-doc #preview-doc-body') || document.querySelector('#doc-modal .preview-content');
        if (!previewContent) throw new Error('Conteúdo do formulário foi perdido. Tente gerar novamente.');
        
        const pdfBlob = await window.gerarPDFBlob(previewContent);
        const safeName = (geradorNome || 'documento').replace(/[^a-zA-Z0-9À-ÿ _-]/g, '');
        const colabId  = viewedColaborador?.id || '';
        const colabNome = (viewedColaborador?.nome_completo || colabId).toString();
        
        const formData = new FormData();
        formData.append('file', pdfBlob, `${safeName}_${colabNome}.pdf`);
        formData.append('tab_name', 'CONTRATOS_AVULSOS');
        formData.append('document_type', geradorNome);
        formData.append('colaborador_id', colabId);
        
        const r = await fetch(`${API_URL}/documentos?colaborador_id=${colabId}`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${currentToken}` },
            body: formData
        });
        
        if (!r.ok) {
            const errData = await r.json().catch(() => ({}));
            throw new Error(errData.error || 'Falha ao salvar PDF');
        }

        await apiPost('/admissao-assinaturas/enviar-lote', {
            colaborador_id: colabId,
            geradores_ids: [parseInt(geradorId)]
        });

        Swal.fire('Enviado!', 'Documento gerado, anexado e enviado para assinatura via Certificado e Assinafy.', 'success');
        
        window._contratosAvulsoLoaded = false;
        const avDiv = document.getElementById('contratos-sub-avulso');
        if (avDiv) await window.renderContratosAvulso(avDiv);

    } catch(e) {
        Swal.fire('Erro ao enviar', e.message, 'error');
    }
};

window.uploadContratoExterno = async function(input) {
    const file = input.files[0];
    if (!file || !viewedColaborador) return;

    // Modal personalizado para capturar nome e se exige assinatura
    const modalResult = await Swal.fire({
        title: '<i class="ph ph-file-plus"></i> Anexar Contrato',
        html: '<div style="text-align:left;display:flex;flex-direction:column;gap:0.75rem;padding:0.25rem 0;"><div><label style="font-size:0.82rem;font-weight:700;color:#374151;display:block;margin-bottom:4px;">Nome do Documento</label><input id="swal-doctype" class="swal2-input" style="margin:0;width:100%;box-sizing:border-box;" placeholder="Ex: Acordo de Confidencialidade"></div><div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:0.75rem;display:flex;align-items:center;justify-content:space-between;gap:1rem;"><span style="font-size:0.85rem;font-weight:700;color:#334155;">Exige Assinatura?</span><div style="display:flex;gap:1rem;"><label style="display:flex;align-items:center;gap:4px;cursor:pointer;font-size:0.9rem;font-weight:500;"><input type="radio" name="swal-ass" value="sim" id="swal-ass-sim"> Sim</label><label style="display:flex;align-items:center;gap:4px;cursor:pointer;font-size:0.9rem;font-weight:500;"><input type="radio" name="swal-ass" value="nao" id="swal-ass-nao" checked> Nao</label></div></div></div>',
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: '<i class="ph ph-upload-simple"></i> Anexar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#2563eb',
        didOpen: function() {
            var dtInput = document.getElementById('swal-doctype');
            if (dtInput) dtInput.value = file.name.replace(/\.pdf$/i, '').substring(0, 60);
        },
        preConfirm: function() {
            var docType = (document.getElementById('swal-doctype') || {}).value;
            if (docType) docType = docType.trim();
            var assRadio = document.querySelector('input[name="swal-ass"]:checked');
            if (!docType) { Swal.showValidationMessage('Informe o nome do documento'); return false; }
            return { docType: docType, exigeAssinatura: assRadio && assRadio.value === 'sim' };
        }
    });

    if (!modalResult.isConfirmed || !modalResult.value) return;
    var docType = modalResult.value.docType;
    var exigeAssinatura = modalResult.value.exigeAssinatura;
    var colaboradorNome = viewedColaborador.nome_completo || '';

    var formData = new FormData();
    formData.append('file', file);
    formData.append('tab_name', 'CONTRATOS_AVULSOS');
    formData.append('document_type', docType);
    formData.append('colaborador_id', viewedColaborador.id);
    formData.append('colaborador_nome', colaboradorNome);
    if (!exigeAssinatura) {
        formData.append('assinafy_status', 'NAO_EXIGE');
    }

    try {
        Swal.fire({ title: 'Anexando...', allowOutsideClick: false, didOpen: function() { Swal.showLoading(); } });
        var res = await fetch(API_URL + '/documentos', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + currentToken },
            body: formData
        });
        var data = await res.json().catch(function() { return {}; });
        if (!res.ok) throw new Error(data.error || 'Falha ao anexar PDF');

        var docId = data.id;

        // Se exige assinatura, enviar para Assinafy automaticamente
        if (exigeAssinatura && docId) {
            Swal.update({ title: 'Enviando para assinatura via Assinafy...' });
            try {
                var assResp = await fetch(API_URL + '/assinafy/upload', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + currentToken },
                    body: JSON.stringify({ document_id: docId, colaborador_id: viewedColaborador.id })
                });
                var assData = await assResp.json().catch(function() { return {}; });
                if (!assResp.ok) {
                    Swal.fire('Atencao', 'Documento salvo, mas o envio para assinatura falhou: ' + (assData.error || 'Erro desconhecido'), 'warning');
                } else {
                    Swal.fire({ icon: 'success', title: 'Enviado para assinatura!', text: 'O colaborador recebera um e-mail para assinar.', timer: 3000, showConfirmButton: false });
                }
            } catch(assErr) {
                Swal.fire('Atencao', 'Documento salvo, mas falha no envio para assinatura: ' + assErr.message, 'warning');
            }
        } else {
            Swal.fire({ icon: 'success', title: 'Documento anexado!', timer: 1800, showConfirmButton: false });
        }

        // Forca reload da lista
        window._contratosAvulsoLoaded = false;
        var avDivUp = document.getElementById('contratos-sub-avulso');
        if (avDivUp) {
            avDivUp.innerHTML = '<p class="text-muted"><i class="ph ph-spinner ph-spin"></i> Atualizando...</p>';
            window._contratosAvulsoLoaded = true;
            await window.renderContratosAvulso(avDivUp);
        }
        window.switchContratosSubTab('avulso');
    } catch(e) {
        Swal.fire('Erro', e.message, 'error');
    }
};

// Versão segura: pega o token no momento do clique (não no build-time da lista)
window.openContratoViewerById = function(docId, nomeDoc) {
    var token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token') || '';
    if (!token) { alert('Sessão expirada. Faça login novamente.'); return; }
    var pdfUrl = API_URL + '/documentos/view/' + docId + '?token=' + encodeURIComponent(token);
    window.openContratoViewerPopup(pdfUrl, nomeDoc);
};

window.openContratoViewerPopup = function(pdfUrl, nomeDoc) {
    if (!pdfUrl || pdfUrl.endsWith('undefined')) {
        alert('URL do documento nao encontrada.');
        return;
    }
    var token = window.currentToken || localStorage.getItem('erp_token') || '';
    var finalUrl = pdfUrl;
    if ((pdfUrl.indexOf('onrender.com') >= 0 || pdfUrl.indexOf(window.location.hostname) >= 0) && pdfUrl.indexOf('token=') === -1) {
        finalUrl = (pdfUrl.indexOf('?') >= 0 ? pdfUrl + '&token=' + token : pdfUrl + '?token=' + token);
    }
    var nomeSafe = (nomeDoc || 'Documento');

    var prev = document.getElementById('cv-overlay-fs');
    if (prev) prev.remove();

    var overlay = document.createElement('div');
    overlay.id = 'cv-overlay-fs';
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100vw';
    overlay.style.height = '100vh';
    overlay.style.background = '#0f172a';
    overlay.style.zIndex = '999999';
    overlay.style.display = 'flex';
    overlay.style.flexDirection = 'column';
    overlay.style.overflow = 'hidden';

    var header = document.createElement('div');
    header.style.cssText = 'background:#1e293b;display:flex;align-items:center;justify-content:space-between;padding:0.75rem 1.25rem;flex-shrink:0;border-bottom:1px solid #334155;min-height:58px;box-sizing:border-box;';

    var left = document.createElement('div');
    left.style.cssText = 'display:flex;align-items:center;gap:0.75rem;';
    left.innerHTML = '<i class="ph ph-file-pdf" style="color:#ef4444;font-size:1.5rem;"></i>';
    var info = document.createElement('div');
    var titleEl = document.createElement('div');
    titleEl.style.cssText = 'font-weight:700;color:#f1f5f9;font-size:0.95rem;';
    titleEl.textContent = nomeSafe;
    var subEl = document.createElement('div');
    subEl.style.cssText = 'font-size:0.72rem;color:#94a3b8;';
    subEl.textContent = 'Visualizador de Documento';
    info.appendChild(titleEl);
    info.appendChild(subEl);
    left.appendChild(info);

    var right = document.createElement('div');
    right.style.cssText = 'display:flex;gap:0.5rem;';

    var dlBtn = document.createElement('a');
    dlBtn.href = finalUrl;
    dlBtn.setAttribute('download', nomeSafe + '.pdf');
    dlBtn.target = '_blank';
    dlBtn.style.cssText = 'display:inline-flex;align-items:center;gap:0.4rem;background:#22c55e;color:#fff;padding:0.5rem 1.1rem;border-radius:8px;font-weight:600;font-size:0.85rem;text-decoration:none;';
    dlBtn.innerHTML = '<i class="ph ph-download-simple"></i> Baixar';

    var closeBtn = document.createElement('button');
    closeBtn.style.cssText = 'background:#ef4444;color:#fff;border:none;border-radius:8px;padding:0.5rem 1.1rem;cursor:pointer;font-weight:600;display:flex;align-items:center;gap:0.4rem;font-size:0.85rem;';
    closeBtn.innerHTML = '<i class="ph ph-x"></i> Fechar';
    closeBtn.onclick = function() { overlay.remove(); };

    right.appendChild(dlBtn);
    right.appendChild(closeBtn);
    header.appendChild(left);
    header.appendChild(right);

    var content = document.createElement('div');
    content.style.cssText = 'flex:1;position:relative;background:#525659;overflow:hidden;';

    var loading = document.createElement('div');
    loading.id = 'cv-fs-loading';
    loading.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#fff;gap:0.75rem;z-index:1;';
    loading.innerHTML = '<i class="ph ph-circle-notch ph-spin" style="font-size:3rem;color:#6366f1;"></i><span style="font-weight:600;">Carregando documento...</span>';

    var iframe = document.createElement('iframe');
    iframe.src = finalUrl;
    iframe.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;border:none;z-index:2;';
    iframe.onload = function() { var l = document.getElementById('cv-fs-loading'); if (l) l.style.display = 'none'; };

    content.appendChild(loading);
    content.appendChild(iframe);
    overlay.appendChild(header);
    overlay.appendChild(content);
    document.body.appendChild(overlay);

    var onEsc = function(e) { if (e.key === 'Escape') { overlay.remove(); document.removeEventListener('keydown', onEsc); } };
    document.addEventListener('keydown', onEsc);
};
window.buildContratosSignatureRows = function(assinaturas, docs, colab) {
    assinaturas = Array.isArray(assinaturas) ? assinaturas : [];
    docs = Array.isArray(docs) ? docs : [];
    if (docs.length === 0) {
        return `<div style="padding:2rem;text-align:center;color:#94a3b8;border:2px dashed #e2e8f0;border-radius:12px;"><i class="ph ph-files" style="font-size:2rem;margin-bottom:0.5rem;display:block;"></i>Nenhum contrato listado.</div>`;
    }

    let html = '';
    docs.forEach(doc => {
       const ass = assinaturas.find(a => (a.nome_documento === doc.document_type) || (a.documento_url && doc.file_url && a.documento_url === doc.file_url));
       
       let realStatus = 'Não enviado';
       if (doc.assinafy_status === 'Assinado' || (ass && ass.assinafy_status === 'Assinado')) realStatus = 'Assinado';
       else if (doc.assinafy_status === 'Pendente' || (ass && ass.assinafy_status === 'Pendente')) realStatus = 'Aguardando';
       else if (ass) realStatus = 'Aguardando';

       const isSigned = (realStatus === 'Assinado' || doc.assinafy_status === 'Assinado' || (ass && ass.assinafy_status === 'Assinado'));
       const isPending = realStatus === 'Aguardando';

       // openContratoViewerById busca o token no CLIQUE (não no build-time)
       const _docName = (doc.document_type || doc.file_name || 'Documento').replace(/'/g, "\\'");
       let eyeBtn = `<button type="button" onclick="window.openContratoViewerById(${doc.id}, '${_docName}'); event.preventDefault(); event.stopPropagation();" style="border:none;background:none;cursor:pointer;color:#64748b;" title="Ver PDF"><i class="ph ph-eye" style="font-size:1.2rem;"></i></button>`;
       if (isSigned && ass && ass.certificado_assinado_em) {
           eyeBtn = `<button type="button" onclick="window.openSignedDocPopup(${ass.id}, '${(doc.document_type||'').replace(/'/g,"\\'")}', event); event.stopPropagation();" style="border:none;background:none;cursor:pointer;color:#7c3aed;" title="Ver documento final (Empresa+Colaborador)"><i class="ph ph-eye" style="font-size:1.2rem;"></i></button>`;
       } else if (isSigned && ass) {
           eyeBtn = `<button type="button" onclick="window.openSignedDocPopup(${ass.id}, '${(doc.document_type||'').replace(/'/g,"\\'")}', event); event.stopPropagation();" style="border:none;background:none;cursor:pointer;color:#16a34a;" title="Ver PDF assinado (Colaborador)"><i class="ph ph-eye" style="font-size:1.2rem;"></i></button>`;
       }

       // Formatar datas para exibir no badge
       const formatDate = (dateStr) => {
           if (!dateStr) return '';
           const _d = new Date(dateStr);
           if (isNaN(_d.getTime())) return '';
           const _dd = String(_d.getDate()).padStart(2,'0');
           const _mm = String(_d.getMonth()+1).padStart(2,'0');
           const _yy = _d.getFullYear();
           const _hh = String(_d.getHours()).padStart(2,'0');
           const _mi = String(_d.getMinutes()).padStart(2,'0');
           return `${_dd}/${_mm}/${_yy} - ${_hh}:${_mi}`;
       };

       const _uploadDt = doc.upload_date || doc.created_at;
       const _uploadStr = formatDate(_uploadDt);
       const _sentDt = doc.assinafy_sent_at || _uploadDt;
       const _sentStr = formatDate(_sentDt);
       const _signedDt = (ass ? ass.assinado_em : null) || doc.assinafy_signed_at || _uploadDt;
       const _signedStr = formatDate(_signedDt);

       const isNaoExige = (doc.assinafy_status === 'NAO_EXIGE' || doc.assinafy_status === 'Nenhum' || !doc.assinafy_status);
       let statusBadge = `<span style="background:#f1f5f9;color:#64748b;border-radius:20px;padding:2px 10px;font-size:0.72rem;font-weight:700;"><i class="ph ph-minus-circle"></i> Nao enviado</span>`;
       
       if (isNaoExige) {
           statusBadge = `<span style="background:#eff6ff;color:#1d4ed8;border-radius:20px;padding:3px 10px;font-size:0.72rem;font-weight:700;display:inline-flex;align-items:center;gap:4px;"><i class="ph ph-info"></i> Documento anexado${_uploadStr ? ': ' + _uploadStr : ''}</span>`;
       } else if (isSigned) {
           statusBadge = `<span style="background:#dcfce7;color:#15803d;border-radius:20px;padding:3px 10px;font-size:0.72rem;font-weight:700;display:inline-flex;align-items:center;gap:4px;"><i class="ph ph-check-circle"></i> Documento assinado${_signedStr ? ': ' + _signedStr : ''}</span>`;
       } else if (isPending) {
           statusBadge = `<span style="background:#fef9c3;color:#92400e;border-radius:20px;padding:3px 10px;font-size:0.72rem;font-weight:700;display:inline-flex;align-items:center;gap:4px;"><i class="ph ph-clock"></i> Enviado para Assinatura${_sentStr ? ': ' + _sentStr : ''}</span>`;
       }
       html += `
        <label class="doc-check-item" style="display:flex; align-items:center; gap:0.6rem; padding:0.6rem 0.75rem; border:1px solid ${isSigned ? '#bbf7d0' : '#f1f5f9'}; border-radius:8px; cursor:pointer; background:${isSigned ? '#f0fdf4' : '#fff'}; transition:all 0.2s; justify-content:space-between;">
            <div style="display:flex; align-items:center; gap:0.6rem; flex:1;">
                ${isSigned || isPending 
                    ? `<div style="width:20px;height:20px;border-radius:10px;background:${isSigned?'#22c55e':'#eab308'};color:#fff;display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 3px ${isSigned?'#dcfce7':'#fef3c7'};"><i class="ph ${isSigned?'ph-check':'ph-clock'}" style="font-size:0.8rem;font-weight:bold;"></i></div>`
                    : `<input type="checkbox" class="ca-row-chk ms-3" data-doc-id="${doc.id}" data-doc-url="${doc.file_url}" data-doc-type="${doc.document_type || 'Documento'}" style="width:18px;height:18px;cursor:pointer;accent-color:#2563eb;">`
                }
                <div style="display:flex; flex-direction:column;">
                    <span style="font-weight:600; color:#334155; font-size:0.9rem;">${doc.document_type || doc.file_name}</span>
                    <div style="display:flex; align-items:center; gap:8px; flex
                        ${statusBadge}
                    </div>
                </div>
            </div>
            <div>
               ${eyeBtn}
               ${isSigned ? '' : `<button type="button" onclick="window.deleteDocumentoContrato(${doc.id}); event.preventDefault(); event.stopPropagation();" style="border:none;background:none;cursor:pointer;color:#ef4444;margin-left:8px;" title="Excluir do Prontuário"><i class="ph ph-trash" style="font-size:1.2rem;"></i></button>`}
            </div>
        </label>`;
    });
    return html;
};

window.deleteDocumentoContrato = async function(docId) {
    if (!confirm('Deseja excluir este documento?')) return;
    try {
        const res = await fetch(`${API_URL}/documentos/${docId}`,{ method:'DELETE', headers:{'Authorization':`Bearer ${currentToken}`}});
        if(!res.ok) throw new Error('Falha ao excluir');
        // Força reload mesmo que já esteja na aba avulso
        window._contratosAvulsoLoaded = false;
        const avDiv = document.getElementById('contratos-sub-avulso');
        if (avDiv) { avDiv.innerHTML = '<p class="text-muted"><i class="ph ph-spinner ph-spin"></i> Atualizando...</p>'; }
        window._contratosAvulsoLoaded = true;
        if (avDiv) await window.renderContratosAvulso(avDiv);
        window.switchContratosSubTab('avulso');
        showToast('Documento excluído!', 'success');
    } catch(e) { alert(e.message); }
};

window.enviarAssinaturaLoteContratos = async function() {
    const chks = document.querySelectorAll('.ca-row-chk:checked');
    if(chks.length === 0) { alert('Selecione pelo menos um documento na lista.'); return; }

    const docs = Array.from(chks).map(c => ({
        id: c.dataset.docId,
        nome: c.dataset.docType
    }));
    
    if(!confirm(`Enviar ${docs.length} documento(s) para assinatura do colaborador via Assinafy?`)) return;
    
    const btn = document.getElementById('ca-btn-assinar-lote');
    const oldHtml = btn.innerHTML;
    btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Enviando para Assinafy...';
    btn.disabled = true;

    try {
        let errorCount = 0;
        for (const doc of docs) {
            try {
                const resp = await fetch(`${API_URL}/assinafy/upload`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${currentToken}` },
                    body: JSON.stringify({
                        document_id: Number(doc.id),
                        colaborador_id: viewedColaborador.id
                    })
                });
                const result = await resp.json();
                if (!resp.ok || result.sucesso === false) {
                    console.error(`[LOTE] Erro no doc ${doc.id}:`, result.error || result);
                    errorCount++;
                }
            } catch(ex) { errorCount++; console.error(ex); }
        }

        if (errorCount > 0) alert(errorCount + ' documento(s) falharam no envio. Verifique o console.');
        else showToast('E-mail de assinatura enviado ao colaborador!', 'success');
        
        // Forçar reload da lista para mostrar o timestamp de envio
        window._contratosAvulsoLoaded = false;
        const _avDivLote = document.getElementById('contratos-sub-avulso');
        if (_avDivLote) await window.renderContratosAvulso(_avDivLote);
        window.switchContratosSubTab('avulso');
    } catch(e) {
        alert('Erro fatal: ' + e.message);
        btn.innerHTML = oldHtml;
        btn.disabled = false;
    }
};
window.abrirModalGerarContrato = function() {
    const geradores = window._caAvailableGeradores || [];
    document.getElementById('modal-contrato-avulso')?.remove();
    const overlay = document.createElement('div');
    overlay.id = 'modal-contrato-avulso';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;padding:1rem;';
    const opts = geradores.map(g => `<option value="${g.id}" data-nome="${(g.nome||'').replace(/"/g,'&quot;')}">${g.nome}</option>`).join('');
    overlay.innerHTML = `
        <div style="background:#fff;border-radius:14px;width:100%;max-width:520px;box-shadow:0 20px 60px rgba(0,0,0,0.2);overflow:visible;">
            <div style="padding:1rem 1.5rem;border-bottom:1.5px solid #e2e8f0;background:#f8fafc;display:flex;justify-content:space-between;align-items:center;">
                <h3 style="margin:0;font-size:1rem;font-weight:700;color:#0f172a;"><i class="ph ph-file-plus"></i> Gerar Documento Template</h3>
                <button onclick="document.getElementById('modal-contrato-avulso').remove()" style="background:#f1f5f9;border:1px solid #e2e8f0;width:30px;height:30px;border-radius:8px;cursor:pointer;color:#64748b;display:flex;align-items:center;justify-content:center;"><i class="ph ph-x"></i></button>
            </div>
            <div style="padding:1.5rem;display:flex;flex-direction:column;gap:1rem;">
                <div>
                    <label style="font-size:0.82rem;font-weight:700;color:#374151;display:block;margin-bottom:6px;">Selecionar Documento</label>
                    <div style="position:relative;" id="ca-gerador-wrapper">
                        <input
                            id="ca-gerador-search"
                            type="text"
                            placeholder="Digite para filtrar..."
                            autocomplete="off"
                            style="width:100%;padding:0.65rem 2.2rem 0.65rem 0.75rem;border:1.5px solid #e2e8f0;border-radius:8px;font-size:0.9rem;box-sizing:border-box;outline:none;"
                            onfocus="window._openGeradorDropdown()"
                            oninput="window._filterGeradorDropdown(this.value)"
                        >
                        <i class="ph ph-caret-down" style="position:absolute;right:0.65rem;top:50%;transform:translateY(-50%);color:#94a3b8;pointer-events:none;"></i>
                        <input type="hidden" id="ca-gerador-select" value="">
                        <div id="ca-gerador-dropdown"
                             style="display:none;position:absolute;top:calc(100% + 4px);left:0;right:0;background:#fff;border:1.5px solid #e2e8f0;border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,0.12);max-height:220px;overflow-y:auto;z-index:99999;">
                        </div>
                    </div>
                </div>
                <!-- Campos específicos para desconto em folha -->
                <div id="ca-campos-desconto" style="display:none; flex-direction:column; gap:1rem; background:#f8fafc; padding:1rem; border-radius:8px; border:1px solid #e2e8f0;">
                    <div>
                        <label style="font-size:0.82rem;font-weight:700;color:#374151;">Descrição Principal</label>
                        <input type="text" id="ca-m-descricao" class="form-control" placeholder="Ex: Multa de Trânsito NIC...">
                    </div>
                    <div style="display:flex;gap:1rem;">
                        <div style="flex:1;">
                            <label style="font-size:0.82rem;font-weight:700;color:#374151;">Valor Total (R$)</label>
                            <input type="text" id="ca-m-valor" class="form-control" placeholder="00,00" oninput="this.value = this.value.replace(/[^0-9,]/g,'')">
                        </div>
                        <div style="flex:1;">
                            <label style="font-size:0.82rem;font-weight:700;color:#374151;">Parcelamento</label>
                            <select id="ca-m-parcelas" class="form-control">
                                <option value="1">1x</option>
                                <option value="2">2x</option>
                                <option value="3">3x</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div id="ca-msg" style="display:none;"></div>
                <div style="display:flex;justify-content:flex-end;gap:0.75rem;">
                    <button onclick="document.getElementById('modal-contrato-avulso').remove()" class="btn btn-secondary">Cancelar</button>
                    <button id="ca-btn-gerar" class="btn btn-primary" onclick="window.gerarContratoAvulso()" style="display:flex;align-items:center;gap:6px;">
                        <i class="ph ph-file-arrow-down"></i> Visualizar e Salvar
                    </button>
                </div>
            </div>
        </div>`;
    document.body.appendChild(overlay);

    // Inicializar itens do combobox
    const _geradores = window._caAvailableGeradores || [];
    window._geradorItems = _geradores.map(g => ({ id: String(g.id), nome: g.nome || '' }));

    window._openGeradorDropdown = function() {
        window._filterGeradorDropdown(document.getElementById('ca-gerador-search')?.value || '');
    };

    window._filterGeradorDropdown = function(q) {
        const dd = document.getElementById('ca-gerador-dropdown');
        if (!dd) return;
        const filtered = (window._geradorItems || []).filter(g => g.nome.toLowerCase().includes((q||'').toLowerCase()));
        if (filtered.length === 0) {
            dd.innerHTML = '<div style="padding:0.75rem 1rem;font-size:0.88rem;color:#94a3b8;">Nenhum resultado.</div>';
        } else {
            dd.innerHTML = filtered.map(g => `
                <div onclick="window._selectGerador('${g.id}', '${g.nome.replace(/'/g,"\\'")}')"
                     style="padding:0.6rem 1rem;font-size:0.88rem;color:#334155;cursor:pointer;"
                     onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background=''"><i class="ph ph-file-text" style="margin-right:6px;color:#94a3b8;"></i>${g.nome}</div>
            `).join('');
        }
        dd.style.display = 'block';
    };

    window._selectGerador = function(id, nome) {
        const search = document.getElementById('ca-gerador-search');
        const hidden = document.getElementById('ca-gerador-select');
        const dd     = document.getElementById('ca-gerador-dropdown');
        if (search) search.value = nome;
        if (hidden) hidden.value = id;
        if (dd)     dd.style.display = 'none';
        // verificar campos extras (ex: desconto em folha)
        const camposDesconto = document.getElementById('ca-campos-desconto');
        if (camposDesconto) {
            if (nome === 'AUTORIZAÇÃO DE DESCONTO EM FOLHA DE PAGAMENTO') {
                camposDesconto.style.display = 'flex';
            } else {
                camposDesconto.style.display = 'none';
                ['ca-m-descricao','ca-m-valor'].forEach(id => { const el=document.getElementById(id); if(el) el.value=''; });
                const parc = document.getElementById('ca-m-parcelas'); if(parc) parc.value='1';
            }
        }
    };

    // Fechar dropdown ao clicar fora
    setTimeout(() => {
        document.addEventListener('mousedown', function _closeGeradorDD(e) {
            const wrapper = document.getElementById('ca-gerador-wrapper');
            if (wrapper && !wrapper.contains(e.target)) {
                const dd = document.getElementById('ca-gerador-dropdown');
                if (dd) dd.style.display = 'none';
            }
            if (!document.getElementById('modal-contrato-avulso')) {
                document.removeEventListener('mousedown', _closeGeradorDD);
            }
        });
    }, 100);
};

window.toggleContratoAvulsoCampos = function(select) {
    const nome = select.options[select.selectedIndex]?.getAttribute('data-nome') || '';
    const camposDesconto = document.getElementById('ca-campos-desconto');
    if (nome === 'AUTORIZAÇÃO DE DESCONTO EM FOLHA DE PAGAMENTO') {
        camposDesconto.style.display = 'flex';
    } else {
        camposDesconto.style.display = 'none';
        document.getElementById('ca-m-descricao').value = '';
        document.getElementById('ca-m-valor').value = '';
        document.getElementById('ca-m-parcelas').value = '1';
    }
};

window.gerarContratoAvulso = async function() {
    const hidden = document.getElementById('ca-gerador-select');
    const geradorId = hidden ? hidden.value : '';
    if (!geradorId) return alert('Selecione um documento.');

    const btn = document.getElementById('ca-btn-gerar');
    btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Gerando...';
    btn.disabled = true;

    // Optional fields
    const desc = document.getElementById('ca-m-descricao')?.value || '';
    const valor = document.getElementById('ca-m-valor')?.value || '';
    const parc = document.getElementById('ca-m-parcelas')?.value || '1';

    try {
        const res = await fetch(`${API_URL}/geradores/${geradorId}/gerar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${currentToken}` },
            body: JSON.stringify({
                colaborador_id: viewedColaborador.id,
                colabId: viewedColaborador.id, // backend fallback
                m_descricao: desc, m_valor: valor, m_parcelas: parc, m_valor_parcela: (valor ? (parseFloat(valor.replace(',','.'))/parseInt(parc)).toFixed(2).replace('.',',') : '')
            })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro ao gerar documento');

        document.getElementById('modal-contrato-avulso').remove();
        
        // Exibe o preview para o usuário ver. Quando ele clicar em "Salvar", é disparado win.salvarDocumentoPDF()
        // Mas o salvar original não enviava. Vamos sobrecarregar a funcao "Salvar como PDF" quando está no contexto de Prontuário.
        window.abrirPreviewDocumento({
            html: data.html,
            colaborador: data.colaborador, 
            gerador_nome: data.gerador_nome,
            geradorId: geradorId
        });

        // Rewrite Salvar PDF button to Save AND upload instead of print!
        const previewBtnSalvar = document.querySelector('#doc-modal button.btn-primary') || document.querySelector('#modal-preview-doc button.btn-primary');
        if (previewBtnSalvar) {
            previewBtnSalvar.innerHTML = '<i class="ph ph-floppy-disk"></i> Salvar no Prontuário';
            previewBtnSalvar.onclick = async function() {
                const oldHtml = this.innerHTML;
                this.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Salvando...';
                this.disabled = true;
                try {
                    // Generate Blob with HTML2PDF
                    const htmlTemplate = document.getElementById('preview-doc-body');
                    const nomeArquivo = `${data.gerador_nome.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
                    
                    const opt = {
                        margin: 8, // 8mm em todas as bordas — fina e profissional
                        filename: nomeArquivo, 
                        image: { type: 'jpeg', quality: 0.98 },
                        html2canvas: { scale: 2, useCORS: true },
                        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
                        pagebreak: { mode: ['avoid-all', 'css', 'legacy'], before: '.page-break', avoid: ['p', 'li'] }
                    };
                    
                    // Salvar estilos originais
                    const origWidth    = htmlTemplate.style.width;
                    const origMaxWidth = htmlTemplate.style.maxWidth;
                    const origMinH     = htmlTemplate.style.minHeight;

                    // Forçar largura A4 e remover min-height para evitar página em branco extra
                    htmlTemplate.style.width     = '794px';
                    htmlTemplate.style.maxWidth  = '794px';
                    htmlTemplate.style.minHeight = '0';  // ← elimina a página em branco

                    const pdfBlob = await html2pdf().set(opt).from(htmlTemplate).output('blob');
                    
                    // Restaurar estilos originais
                    htmlTemplate.style.width     = origWidth;
                    htmlTemplate.style.maxWidth  = origMaxWidth;
                    htmlTemplate.style.minHeight = origMinH;


                    const file = new File([pdfBlob], nomeArquivo, { type: 'application/pdf' });
                    
                    const formData = new FormData();
                    formData.append('file', file);
                    formData.append('colaborador_id', viewedColaborador.id);
                    formData.append('tab_name', 'CONTRATOS_AVULSOS');
                    formData.append('document_type', data.gerador_nome);
                    
                    const uploadRes = await fetch(`${API_URL}/documentos`, {
                        method: 'POST', headers: {'Authorization': `Bearer ${currentToken}`}, body: formData
                    });
                    if (!uploadRes.ok) throw new Error('Falha no upload do PDF gerado');
                    
                    document.getElementById('modal-preview-doc').style.display = 'none';
                    document.getElementById('doc-modal').style.display = 'none';

                    const sendPrompt = await Swal.fire({
                        title: 'Documento Salvo',
                        text: 'Deseja enviar este contrato para assinatura digital via Assinafy?',
                        icon: 'question',
                        showCancelButton: true,
                        confirmButtonText: 'Sim, enviar',
                        cancelButtonText: 'Não'
                    });

                    if (sendPrompt.isConfirmed) {
                        Swal.fire({ title: 'Enviando...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
                        await apiPost('/admissao-assinaturas/enviar-lote', {
                            colaborador_id: viewedColaborador.id,
                            geradores_ids: [parseInt(geradorId)]
                        });
                        Swal.fire('Enviado!', 'Documento enviado para assinatura.', 'success');
                    } else {
                        showToast('Documento gerado e salvo no Prontuário!', 'success');
                    }

                    // Forçar reload da lista de contratos imediatamente
                    window._contratosAvulsoLoaded = false;
                    const _avDivSave = document.getElementById('contratos-sub-avulso');
                    if (_avDivSave) {
                        _avDivSave.innerHTML = '<p class="text-muted"><i class="ph ph-spinner ph-spin"></i> Atualizando lista...</p>';
                        window._contratosAvulsoLoaded = true;
                        await window.renderContratosAvulso(_avDivSave);
                    }
                    window.switchContratosSubTab('avulso');
                } catch(err) {
                    alert('Erro ao salvar: ' + err.message);
                } finally {
                    this.innerHTML = oldHtml;
                    this.disabled = false;
                }
            };
        }
    } catch(e) {
        alert('Erro: ' + e.message);
        btn.innerHTML = '<i class="ph ph-file-arrow-down"></i> Visualizar e Salvar';
        btn.disabled = false;
    }
};

window.enviarContratoAvulsoAssinatura = null; // removing old


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
            if(document.getElementById('admissao-start-name')) if(document.getElementById('admissao-start-name')) document.getElementById('admissao-start-name').textContent = colab.nome_completo;
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
            
            if(document.getElementById('admissao-nome-final')) if(document.getElementById('admissao-nome-final')) document.getElementById('admissao-nome-final').textContent = colab.nome_completo;

            // Busca dados para o Passo 2: Documentos do Departamento
            // Verifica status no Assinafy ANTES de buscar os dados do banco
            await fetch(`${API_URL}/admissao-assinaturas/verificar-status`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${currentToken}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ colaborador_id: colab.id })
            }).catch(() => {});

            const [depts, geradores, templates, assinaturas, docs] = await Promise.all([
                apiGet('/departamentos'),
                apiGet('/geradores'),
                apiGet('/gerador-departamento-templates').catch(() => []),
                apiGet(`/admissao-assinaturas/${colab.id}`).catch(() => []),
                apiGet(`/colaboradores/${colab.id}/documentos`).catch(() => [])
            ]);

            let availableGeradores = [];
            const empDeptId = colab.departamento;
            const deptObj = depts.find(d =>
                String(d.id) === String(empDeptId) ||
                d.nome.trim().toLowerCase() === String(empDeptId).trim().toLowerCase()
            );

            if (deptObj) {
                const geradorIds = [...new Set(templates
                    .filter(t => Number(t.departamento_id) === Number(deptObj.id))
                    .map(t => Number(t.gerador_id)))];
                const seen2 = new Set();
                availableGeradores = geradores.filter(g => geradorIds.includes(Number(g.id)) && !seen2.has(Number(g.id)) && seen2.add(Number(g.id)));
            }

            // Guarda globalmente para calcular e renderizar o status documental
            window._admissaoGeradores = availableGeradores;
            window._admissaoAssinaturas = assinaturas;
            window.currentDocs = docs;

            // Foto step was removed from Admissao, logic removed.
            updateAdmissaoStepPercentages(colab);
            // Ensure log panel is populated from fresh colab data
            if (typeof window.renderEnvioContabilidadeLog === 'function') {
                viewedColaborador = Object.assign(viewedColaborador || {}, colab);
                window.renderEnvioContabilidadeLog();
            }
            window.nextAdmissaoStep(targetStep, preventScroll);
        }
    } catch (e) { alert('Erro ao carregar dados: ' + e.message); }
};

window.irAoProntuarioDigital = function(targetTab = 'Contratos') {
    const colab = viewedColaborador;
    if (!colab) return alert('Nenhum colaborador selecionado.');
    
    // Usa o fluxo oficial para abrir o Prontuário Digital do colaborador logado
    window.openProntuario(colab.id, colab.nome_completo, colab.cargo_nome_exibindo || colab.cargo, colab.cpf, colab.sexo, colab.data_admissao, colab.status, colab.rg_tipo);
    
    // Aguarda o Prontuário renderizar e seleciona a tab desejada
    setTimeout(() => {
        const prontuarioTab = document.querySelector(`#tabs-list li[data-tab="${targetTab}"]`);
        if (prontuarioTab) {
            prontuarioTab.click();
            prontuarioTab.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, 600); // 600ms para renderização suave da View
};

// --- PASSO 4, 3, 5: Apenas renderizações de leitura para acompanhamento ---

function renderAdmissaoDocStatus(containerId, docs, emptyMsg) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';
    
    if (!docs || docs.length === 0) {
        container.innerHTML = `<div style="padding:1rem; text-align:center; color:#64748b; font-size:0.85rem; font-style:italic;">${emptyMsg}</div>`;
        return;
    }
    
    docs.forEach(doc => {
        const isSigned = doc.assinafy_status === 'Assinado' || doc.assinafy_status === 'NAO_EXIGE';
        const docName = doc.document_type || doc.original_name || 'Documento';
        const dateStr = doc.created_at ? new Date(doc.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '';
        const signedDateStr = doc.assinafy_signed_at ? new Date(doc.assinafy_signed_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '';
        const hasFile = !!doc.file_path;
        
        let subInfo = '';
        if (doc.assinafy_id) {
            subInfo += dateStr ? `<div style="font-size:0.75rem; color:#64748b; margin-top:2px;">Enviado p/ Assinatura: <b>${dateStr}</b></div>` : '';
            if (isSigned && signedDateStr) {
               subInfo += `<div style="font-size:0.75rem; color:#059669; margin-top:2px;">Assinado em: <b>${signedDateStr}</b></div>`;
            }
        } else if (hasFile) {
            subInfo += dateStr ? `<div style="font-size:0.75rem; color:#64748b; margin-top:2px;">Anexado em: <b>${dateStr}</b></div>` : '';
        }

        const el = document.createElement('div');
        el.style.cssText = `background:#fff; border:1px solid #e2e8f0; border-radius:8px; padding:0.6rem 0.8rem; margin-bottom:0.4rem; display:flex; justify-content:space-between; align-items:center;`;
        el.innerHTML = `
            <div style="display:flex; flex-direction:column; gap:2px;">
                <span style="font-weight:600; color:#334155; font-size:0.85rem;">${docName}</span>
                ${subInfo}
            </div>
            <div style="display:flex; gap:0.5rem; align-items:center; flex-shrink: 0;">
                ${hasFile ? `<span style="background:#ecfdf5; color:#059669; border:1px solid #a7f3d0; padding:2px 8px; border-radius:12px; font-size:0.7rem; font-weight:700;"><i class="ph ph-check-circle"></i> Anexado</span>` : `<span style="background:#fef2f2; color:#dc2626; border:1px solid #fecaca; padding:2px 8px; border-radius:12px; font-size:0.7rem; font-weight:700;"><i class="ph ph-x-circle"></i> Faltante</span>`}
                ${doc.assinafy_id ? `<span style="background:${isSigned ? '#eff6ff' : '#fffbeb'}; color:${isSigned ? '#2563eb' : '#d97706'}; border:1px solid ${isSigned ? '#bfdbfe' : '#fde68a'}; padding:2px 8px; border-radius:12px; font-size:0.7rem; font-weight:700;">${isSigned ? '<i class="ph ph-check"></i> Assinado' : '<i class="ph ph-clock"></i> Pendente Ass.'}</span>` : ''}
            </div>
        `;
        container.appendChild(el);
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

        // Subscreve o evento de salvar na Admissão para enviar ao backend
        setTimeout(() => {
            const btnSalvar = document.querySelector('#modal-preview-doc button.btn-primary');
            if (!btnSalvar) return;
            btnSalvar.innerHTML = '<i class="ph ph-floppy-disk"></i> Salvar e Configurar Envio';
            btnSalvar.onclick = async function() {
                const oldHtml = this.innerHTML;
                this.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Processando...';
                this.disabled = true;
                try {
                    const previewContent = document.querySelector('#modal-preview-doc .preview-content') ||
                                          document.querySelector('#modal-preview-doc #preview-doc-body');
                    if (!previewContent) throw new Error('Conteúdo do preview não encontrado');
                    
                    const pdfBlob = await window.gerarPDFBlob(previewContent);
                    const safeName = (data.gerador_nome || 'documento_admissao').replace(/[^a-zA-Z0-9À-ÿ _-]/g, '');
                    const cNome = (data.colaborador?.NOME_COMPLETO || colabId).toString();
                    
                    const formData = new FormData();
                    formData.append('arquivo', pdfBlob, `${safeName}_${cNome}.pdf`);
                    formData.append('tab_name', 'CONTRATOS');
                    formData.append('document_type', data.gerador_nome);
                    
                    const r = await fetch(`${API_URL}/documentos`, {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${currentToken}` },
                        body: formData
                    });
                    if (!r.ok) throw new Error('Falha ao salvar PDF');

                    document.getElementById('modal-preview-doc').style.display = 'none';
                    
                    const sendPrompt = await Swal.fire({
                        title: 'Documento Salvo',
                        text: 'Deseja enviar este contrato para assinatura digital via Assinafy?',
                        icon: 'question',
                        showCancelButton: true,
                        confirmButtonText: 'Sim, enviar',
                        cancelButtonText: 'Não'
                    });

                    if (sendPrompt.isConfirmed) {
                        Swal.fire({ title: 'Enviando...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
                        await apiPost('/admissao-assinaturas/enviar-lote', {
                            colaborador_id: colabId,
                            geradores_ids: [parseInt(geradorId)]
                        });
                        Swal.fire('Enviado!', 'Documento enviado para assinatura.', 'success');
                    } else {
                        showToast('Documento de admissão salvo na pasta do colaborador.', 'success');
                    }
                    
                    // Recarrega workflow se estiver aberto para atualizar status do item
                    if (document.getElementById('admissao-workflow-overlay')) {
                        window.initAdmissaoWorkflow(colabId, 2, true);
                    }
                    
                } catch(err) {
                    this.innerHTML = oldHtml;
                    this.disabled = false;
                    Swal.fire('Erro', err.message, 'error');
                }
            };
        }, 150);

    } catch(e) {
        alert('Erro ao carregar pré-visualização: ' + e.message);
    }
};

window.rodarDiagnosticoAssinafy = async function() {
    if (!viewedColaborador) { alert('Nenhum colaborador selecionado.'); return; }
    try {
        const diag = await apiGet(`/admissao-assinaturas/diagnostico/${viewedColaborador.id}`);
        console.log("=== DIAGNOSTICO ===", diag);
        
        let msg = "ID do Colaborador: " + viewedColaborador.id + "\n\n";
        msg += "=== DOCUMENTOS DA ADMISSAO VS ASSINAFY ===\n\n";
        
        if (diag.assinafy_api_status) {
            diag.assinafy_api_status.forEach(statusDoc => {
                msg += `- ${statusDoc.nome}:\n`;
                msg += `  Status no Banco: ${statusDoc.status_banco}\n`;
                msg += `  Status Real Assinafy: ${statusDoc.status_assinafy_api}\n\n`;
            });
        }
        
        alert("Diagnóstico completo! A tela seguinte mostrará o status exato.");
        alert(msg);
    } catch(e) {
        alert("Erro no diagnostico: " + e.message);
    }
}

// ===== PASSO 2: ENVIO EM LOTE PARA ASSINAFY =====
window.sendAdmissaoSignatures = async function(listId = 'admissao-signature-list', btnId = 'btn-enviar-assinaturas') {
    if (!viewedColaborador) { alert('Nenhum colaborador selecionado.'); return; }

    // Buscar checkboxes somente dentro do container correto
    const container = document.getElementById(listId);
    if (!container) { alert('Lista de documentos não encontrada.'); return; }
    
    const checks = container.querySelectorAll('input[type="checkbox"]:checked');
    if (checks.length === 0) { alert('Selecione ao menos um documento para enviar.'); return; }

    // Dedup: garantir que não há IDs duplicados
    const geradorIds = [...new Set(Array.from(checks).map(c => Number(c.value)))];
    
    if (!confirm(`Deseja enviar ${geradorIds.length} documento(s) para assinatura digital via Assinafy?`)) return;

    const btn = document.getElementById(btnId);
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

        // Recarregar a aba em que o usuário está (Passo 2 Admissão ou Contratos no Prontuário)
        if (document.getElementById('current-tab-title') && document.getElementById('current-tab-title').innerText === 'Contratos') {
            await renderContratosTab(document.getElementById('docs-list-container'));
        } else {
            await window.initAdmissaoWorkflow(viewedColaborador.id, 2, true);
        }
    } catch(e) {
        alert('Erro ao enviar documentos: ' + e.message);
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = `<i class="ph ph-paper-plane-tilt"></i> Enviar para Assinatura`; }
    }
};

// ===== POPUP DE PDF ASSINADO =====
window.openSignedDocPopup = function(assId, nomeDoc, evt) {
    if (evt) { evt.preventDefault(); evt.stopPropagation(); }
    const token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token');

    // Criar overlay
    let overlay = document.getElementById('signed-doc-popup-overlay');
    if (overlay) overlay.remove();
    overlay = document.createElement('div');
    overlay.id = 'signed-doc-popup-overlay';
    overlay.style.cssText = `position:fixed;inset:0;background:rgba(15,23,42,0.7);z-index:9999;display:flex;flex-direction:column;align-items:center;justify-content:center;`;
    document.body.appendChild(overlay);

    // URL com token na querystring (autenticado sem CORS issue do iframe)
    const pdfUrl = `${API_URL}/admissao-assinaturas/${assId}/download?token=${token}`;

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
                    <a href="${pdfUrl}" download="${nomeDoc}_Assinado.pdf"
                       style="display:inline-flex;align-items:center;gap:0.4rem;background:#22c55e;color:#fff;padding:0.5rem 1rem;border-radius:8px;font-weight:600;font-size:0.85rem;text-decoration:none;">
                        <i class="ph ph-download-simple"></i> Baixar
                    </a>
                    <button onclick="document.getElementById('signed-doc-popup-overlay').remove()"
                            style="background:#ef4444;color:#fff;border:none;border-radius:8px;padding:0.5rem 1rem;cursor:pointer;font-weight:600;">
                        <i class="ph ph-x"></i> Fechar
                    </button>
                </div>
            </div>
            <div style="flex:1;overflow:hidden;background:#e2e8f0;position:relative;">
                <div id="signed-doc-loading" style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#334155;">
                    <i class="ph ph-circle-notch ph-spin" style="font-size:2.5rem;color:#6366f1;"></i>
                    <div style="margin-top:0.5rem;font-weight:600;">Carregando PDF...</div>
                </div>
                <iframe id="signed-doc-iframe" src="${pdfUrl}"
                    style="width:100%;height:100%;border:none;display:block;"
                    onload="document.getElementById('signed-doc-loading').style.display='none';"
                    onerror="document.getElementById('signed-doc-loading').innerHTML='<i class=\'ph ph-warning\' style=\'font-size:2.5rem;color:#f59e0b;\'></i><div>Erro ao carregar PDF</div>';"></iframe>
            </div>
        </div>`;

    // Clicar fora fecha
    overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove(); });
};

// Função para visualizar documentos assinados via tabela 'documentos' (ASO, EPI, Contratos)
window.openSignedDocPopupDocumento = function(docId, nomeDoc) {
    const token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token');
    const pdfUrl = `${API_URL}/documentos/view/${docId}?token=${token}`;
    const downloadUrl = `${API_URL}/documentos/download/${docId}?token=${token}`;

    let overlay = document.getElementById('signed-doc-popup-overlay');
    if (overlay) overlay.remove();
    overlay = document.createElement('div');
    overlay.id = 'signed-doc-popup-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.7);z-index:9999;display:flex;align-items:center;justify-content:center;';
    document.body.appendChild(overlay);

    overlay.innerHTML = `
        <div style="background:#fff;border-radius:12px;width:95vw;max-width:1000px;height:90vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 25px 60px rgba(0,0,0,0.4);">
            <div style="padding:1rem 1.5rem;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;background:#f8fafc;flex-shrink:0;">
                <div style="display:flex;align-items:center;gap:0.75rem;">
                    <i class="ph ph-file-pdf" style="color:#ef4444;font-size:1.5rem;"></i>
                    <div>
                        <div style="font-weight:700;color:#334155;">${nomeDoc || 'Documento'}</div>
                        <div style="font-size:0.78rem;color:#94a3b8;">Documento Assinado</div>
                    </div>
                </div>
                <div style="display:flex;gap:0.5rem;">
                    <a href="${downloadUrl}" download style="display:inline-flex;align-items:center;gap:0.4rem;background:#22c55e;color:#fff;padding:0.5rem 1rem;border-radius:8px;font-weight:600;font-size:0.85rem;text-decoration:none;">
                        <i class="ph ph-download-simple"></i> Baixar
                    </a>
                    <button onclick="document.getElementById('signed-doc-popup-overlay').remove()"
                            style="background:#ef4444;color:#fff;border:none;border-radius:8px;padding:0.5rem 1rem;cursor:pointer;font-weight:600;">
                        <i class="ph ph-x"></i> Fechar
                    </button>
                </div>
            </div>
            <div style="flex:1;overflow:hidden;background:#e2e8f0;position:relative;">
                <div id="signed-doc-loading2" style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#334155;">
                    <i class="ph ph-circle-notch ph-spin" style="font-size:2.5rem;color:#6366f1;"></i>
                    <div style="margin-top:0.5rem;font-weight:600;">Carregando PDF...</div>
                </div>
                <iframe src="${pdfUrl}" style="width:100%;height:100%;border:none;display:block;"
                    onload="const l=document.getElementById('signed-doc-loading2');if(l)l.style.display='none';"></iframe>
            </div>
        </div>`;

    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
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
    document.querySelectorAll('.admissao-stepper .step-item').forEach(s => s.classList.remove('active'));
    let activeStepEl = document.getElementById('step-' + step);
    if(activeStepEl) activeStepEl.classList.add('active');

    window.currentActiveAdmissaoStep = step;
    // Atualizar Panels
    document.querySelectorAll('.admissao-panel').forEach(p => p.classList.remove('active'));
    const panel = document.getElementById(`panel-step-${step}`);
    if (panel) panel.classList.add('active');
    
    // Passo 3 (Assinaturas): carregar certificado digital
    if (step === 3 && typeof window.carregarStatusCertificado === 'function') {
        window.carregarStatusCertificado('cert-digital-banner');
    }
    // Passo 4 (Ficha Cadastral): carregar certificado digital
    if (step === 4 && typeof window.carregarStatusCertificado === 'function') {
        window.carregarStatusCertificado('cert-digital-banner-step3');
    }

    // Passo 2 (Santander): popular dados do colaborador na ficha
    if (step === 2 && typeof window.populateSantanderPreview === 'function') {
        window.populateSantanderPreview();
    }

    // Passo 5 (ASO): verificar se mostra linha de Exames Motorista
    if (step === 5 && viewedColaborador) {
        const rowExames = document.getElementById('row-aso-exames');
        if (rowExames) {
            rowExames.style.display = (viewedColaborador.cargo || '').toLowerCase().includes('motorista') ? 'flex' : 'none';
        }
    }

    if (!preventScroll) window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.handleAdmissaoFotoUpload = async function(event) {
    const file = event.target.files[0];
    if (!file || !viewedColaborador) return;

    if (file.size > 5 * 1024 * 1024) {
        showToast('Foto muito grande! Máximo 5MB.', 'error');
        return;
    }

    const formData = new FormData();
    formData.append('documento', file);
    formData.append('colaborador_id', viewedColaborador.id);
    formData.append('tab_name', 'FOTO_PERFIL');
    formData.append('document_type', 'Foto de Perfil');

    try {
        const result = await apiPostMultipard('/documentos', formData);
        
        // Update viewedColaborador object specifically
        viewedColaborador.foto = result.file_path; // Simular que tá com a foto preenchida (se o back atualiza o collab também era ótimo). O back já lida com os documentos tab_name FOTO_PERFIL ou a gente pode mandar o path e fazer um PUT no colab pra gravar "foto"
        
        // Atualizando o campo 'foto' no colaborador via PUT pra garantir 100%
        await apiPut(`/colaboradores/${viewedColaborador.id}`, {
            foto: result.file_path
        });
        
        const photoUrl = window.BASE_URL + result.file_path;

        document.getElementById('admissao-foto-img').src = photoUrl;
        document.getElementById('admissao-foto-img').style.display = 'block';
        document.getElementById('admissao-foto-icon').style.display = 'none';
        
        document.getElementById('admissao-foto-status').style.display = 'block';
        
        // Recalcular as porcentagens (a foto atualizou!)
        if (typeof updateAdmissaoStepPercentages === 'function') {
            updateAdmissaoStepPercentages(viewedColaborador);
        }
    } catch(e) {
        showToast('Falha ao adicionar a foto', 'error');
        console.error(e);
    }
};

function calculateAdmissaoStep1Completion(c) {
    // Checklist base — todos os campos obrigatórios
    const baseChecklist = [
        { key: 'nome_completo', label: 'Nome Completo' },
        { key: 'cpf', label: 'CPF' },
        { key: 'data_nascimento', label: 'Nascimento' },
        { key: 'local_nascimento', label: 'Naturalidade' },
        { key: 'estado_civil', label: 'Estado Civil' },
        { key: 'sexo', label: 'Sexo' },
        { key: 'cor_raca', label: 'Cor/Raça' },
        { key: 'nacionalidade', label: 'Nacionalidade' },
        { key: 'grau_instrucao', label: 'Grau Instrução' },
        { key: 'nome_mae', label: 'Nome Mãe' },
        { key: 'nome_pai', label: 'Nome Pai' },
        { key: 'rg_tipo', label: 'Tipo Doc' },
        { key: 'rg', label: 'Número Doc' },
        { key: 'pis', label: 'PIS/PASEP' },
        { key: 'titulo_eleitoral', label: 'Título Eleitoral' },
        { key: 'titulo_zona', label: 'Zona Eletr.' },
        { key: 'titulo_secao', label: 'Seção Eletr.' },
        { key: 'ctps_numero', label: 'CTPS Núm.' },
        { key: 'ctps_serie', label: 'CTPS Série' },
        { key: 'ctps_uf', label: 'CTPS UF' },
        { key: 'ctps_data_expedicao', label: 'CTPS Data' },
        { key: 'telefone', label: 'Telefone' },
        { key: 'email', label: 'E-mail' },
        { key: 'contato_emergencia_nome', label: 'Emg. Nome' },
        { key: 'contato_emergencia_telefone', label: 'Emg. Tel.' },
        { key: 'endereco', label: 'Endereço' },
        { key: 'matricula_esocial', label: 'Matrícula eSocial' },
        { key: 'cargo', label: 'Cargo' },
        { key: 'departamento', label: 'Departamento' },
        { key: 'cbo', label: 'CBO' },
        { key: 'data_admissao', label: 'Admissão' },
        { key: 'tipo_contrato', label: 'Tipo Contrato' },
        { key: 'salario', label: 'Salário Base' },
        { key: 'meio_transporte', label: 'Meio Transp.' },
        { key: 'adiantamento_salarial', label: 'Adiantamento' },
        { key: 'insalubridade', label: 'Insalubridade' },
        { key: 'escala_tipo', label: 'Escala Padrão' },
        { key: 'horario_entrada', label: 'Entrada' },
        { key: 'horario_saida', label: 'Saída' },
        { key: 'intervalo_entrada', label: 'Intervalo Ini' },
        { key: 'intervalo_saida', label: 'Intervalo Fim' },
        { key: 'banco_nome', label: 'Banco' },
        { key: 'banco_agencia', label: 'Agência' },
        { key: 'banco_conta', label: 'Conta' }
    ];

    let activeChecklist = [...baseChecklist];

    // Campos condicionais por tipo de documento (RG = exige órgão e data; CIN/CNH = não exige)
    const rgTipo = c.rg_tipo || 'RG';
    if (rgTipo === 'RG') {
        activeChecklist.push({ key: 'rg_orgao', label: 'Órgão Emissor' });
        activeChecklist.push({ key: 'rg_data_emissao', label: 'Expedição Doc' });
    }

    // Campo condicional por sexo
    if (c.sexo === 'Masculino') {
        activeChecklist.push({ key: 'certificado_militar', label: 'Cert. Militar' });
    }

    // Campo condicional por cargo (motorista)
    const isMotorista = (c.cargo || '').toUpperCase().includes('MOTORISTA');
    if (isMotorista) {
        activeChecklist.push({ key: 'cnh_numero', label: 'CNH Núm.' });
        activeChecklist.push({ key: 'cnh_categoria', label: 'CNH Cat.' });
    }

    // Cônjuge: mostrar se casado/união estável
    const isCasado = c.estado_civil && (c.estado_civil.toLowerCase().includes('casad') || c.estado_civil.toLowerCase().includes('uni'));

    // Cônjuge agora salvo diretamente no colaborador (não nos dependentes)
    const conjuge_nome = c.conjuge_nome || '';
    const conjuge_cpf = c.conjuge_cpf || '';

    // Dependentes (apenas filhos/outros)
    let depArr = [];
    try { depArr = c.dependentes ? (typeof c.dependentes === 'string' ? JSON.parse(c.dependentes) : c.dependentes) : []; } catch(e) {}
    const filhos = depArr.filter(d => d.grau_parentesco !== 'Cônjuge');

    if (isCasado) {
        activeChecklist.push({ key: 'conjuge_nome', label: 'Nome Cônjuge' });
        activeChecklist.push({ key: 'conjuge_cpf', label: 'CPF Cônjuge' });
    }

    // Clonar c com campos resolvidos
    const resolved = Object.assign({}, c, { conjuge_nome, conjuge_cpf });

    let filledCount = 0;
    const resultFields = [];
    const missing = [];

    activeChecklist.forEach(item => {
        const val = resolved[item.key];
        const isFilled = val !== undefined && val !== null && String(val).trim() !== '' && String(val) !== 'null';
        if (isFilled) filledCount++;
        else missing.push(item.label);

        let displayVal = val;
        if (item.key.includes('data') && val && String(val).length >= 10) {
            try { displayVal = new Date(val + 'T12:00:00').toLocaleDateString('pt-BR'); } catch(e) {}
        }

        resultFields.push({ label: item.label, value: displayVal, filled: isFilled });
    });

    // Adicionar blocos informativos (cônjuge/dependentes/valores) — sem contar na porcentagem
    const extraFields = [];
    if (conjuge_nome) {
        extraFields.push({ label: 'Cônjuge - Nome', value: conjuge_nome, filled: true, isExtra: true });
        extraFields.push({ label: 'Cônjuge - CPF', value: conjuge_cpf, filled: !!conjuge_cpf, isExtra: true });
    }
    filhos.forEach((f, i) => {
        extraFields.push({ label: `Dependente ${i+1} - Nome`, value: f.nome, filled: !!f.nome, isExtra: true });
        extraFields.push({ label: `Dependente ${i+1} - CPF`, value: f.cpf, filled: !!f.cpf, isExtra: true });
        if (f.data_nascimento) {
            let dFmt = f.data_nascimento;
            try { dFmt = new Date(f.data_nascimento + 'T12:00:00').toLocaleDateString('pt-BR'); } catch(e) {}
            extraFields.push({ label: `Dependente ${i+1} - Nasc.`, value: dFmt, filled: true, isExtra: true });
        }
    });
    if (c.adiantamento_salarial === 'Sim') {
        extraFields.push({ label: 'Valor Adiantamento', value: c.adiantamento_valor, filled: !!c.adiantamento_valor, isExtra: true });
    }
    if (c.insalubridade === 'Sim') {
        extraFields.push({ label: 'Valor Insalubridade', value: c.insalubridade_valor, filled: !!c.insalubridade_valor, isExtra: true });
    }
    if (c.meio_transporte && c.meio_transporte !== 'Próprio / A pé') {
        extraFields.push({ label: 'Valor Transporte', value: c.valor_transporte, filled: !!c.valor_transporte, isExtra: true });
    }

    const totalActive = activeChecklist.length;
    return {
        percent: totalActive > 0 ? Math.round((filledCount / totalActive) * 100) : 0,
        fields: [...resultFields, ...extraFields],
        missing: missing
    };
}


function updateAdmissaoStepPercentages(colab) {
    const targetColab = colab || viewedColaborador;
    if (!targetColab) return;

    // ── Passo 1: Dados cadastrais ─────────────────────────────────────
    const step1 = calculateAdmissaoStep1Completion(targetColab);
    const pc1 = step1.percent;

    // ── Passo 2: Santander — 100% se ficha foi gerada ─────────────────
    const pc2 = targetColab.santander_ficha_data ? 100 : 0;

    // ── Passo 3: Assinaturas — usa geradores/assinaturas carregados via Admissão ───
    let pc3 = 0;
    const geradores = window._admissaoGeradores || [];
    const assinaturas = window._admissaoAssinaturas || [];
    const docs = window.currentDocs || [];

    if (geradores.length > 0) {
        let pontos = 0;
        geradores.forEach(g => {
            const ass = assinaturas.find(a => a.gerador_id === g.id || a.nome_documento === g.nome);
            const docEquivalente = docs.find(d => d.tab_name === 'CONTRATOS' && (d.document_type === g.nome || (d.file_name && d.file_name.includes(g.nome))));
            
            let realStatus = '';
            if (docEquivalente && docEquivalente.assinafy_status === 'Assinado') realStatus = 'Assinado';
            else if (ass && ass.assinafy_status === 'Assinado') realStatus = 'Assinado';
            else if (docEquivalente && docEquivalente.assinafy_status === 'Pendente') realStatus = 'Pendente';
            else if (ass && ass.assinafy_status === 'Pendente') realStatus = 'Pendente';
            
            if (realStatus === 'Assinado') pontos += 2;
            else if (realStatus === 'Pendente') pontos += 1;
        });
        const maxPontos = geradores.length * 2;
        pc3 = Math.min(100, Math.round((pontos / maxPontos) * 100));
    }
    
    // Atualiza a view de status se o modal estiver aberto
    const containerSignature = document.getElementById('admissao-signature-status');
    if (containerSignature) {
        if (geradores.length === 0) {
            containerSignature.innerHTML = `<div style="padding:1rem; text-align:center; color:#64748b; font-size:0.85rem; font-style:italic;">Nenhum contrato configurado para o departamento.</div>`;
        } else {
            containerSignature.innerHTML = geradores.map(g => {
                const ass = assinaturas.find(a => a.gerador_id === g.id || a.nome_documento === g.nome);
                const docEquivalente = docs.find(d => d.tab_name === 'CONTRATOS' && (d.document_type === g.nome || (d.file_name && d.file_name.includes(g.nome))));
                
                let realStatus = '';
                if (docEquivalente && docEquivalente.assinafy_status === 'Assinado') realStatus = 'Assinado';
                else if (ass && ass.assinafy_status === 'Assinado') realStatus = 'Assinado';
                else if (docEquivalente && docEquivalente.assinafy_status === 'Pendente') realStatus = 'Pendente';
                else if (ass && ass.assinafy_status === 'Pendente') realStatus = 'Pendente';

                const isSigned = (realStatus === 'Assinado' || doc.assinafy_status === 'Assinado' || (ass && ass.assinafy_status === 'Assinado'));
                const isPending = realStatus === 'Pendente';
                
                let statusBadge = isSigned
                    ? `<span style="background:#ecfdf5; color:#059669; border:1px solid #a7f3d0; padding:2px 8px; border-radius:12px; font-size:0.7rem; font-weight:700;"><i class="ph ph-check"></i> Assinado</span>`
                    : isPending
                    ? `<span style="background:#fffbeb; color:#d97706; border:1px solid #fde68a; padding:2px 8px; border-radius:12px; font-size:0.7rem; font-weight:700;"><i class="ph ph-clock"></i> Pendente Assinatura</span>`
                    : `<span style="background:#f1f5f9; color:#64748b; border:1px solid #e2e8f0; padding:2px 8px; border-radius:12px; font-size:0.7rem; font-weight:700;"><i class="ph ph-minus-circle"></i> Não enviado</span>`;

                let dataText = '';
                let dataLines = [];
                if (ass && ass.enviado_em) {
                    const d = new Date(ass.enviado_em + (ass.enviado_em.includes('Z') ? '' : 'Z'));
                    dataLines.push(`<div style="font-size:0.75rem; color:#2563eb; margin-top:2px;"><i class="ph ph-paper-plane-tilt"></i> Enviado p/ Assinatura: <b>${d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</b></div>`);
                }
                if (isSigned && (ass?.assinado_em || docEquivalente?.assinafy_signed_at)) {
                    const dateVal = ass?.assinado_em || docEquivalente?.assinafy_signed_at;
                    const d = new Date(dateVal + (dateVal.includes('Z') ? '' : 'Z'));
                    dataLines.push(`<div style="font-size:0.75rem; color:#16a34a; margin-top:2px;"><i class="ph ph-check-circle"></i> Assinado em: <b>${d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</b></div>`);
                }
                
                if (dataLines.length > 0) {
                    dataText = dataLines.join('');
                } else if (docEquivalente && docEquivalente.file_path && docEquivalente.created_at) {
                    const d = new Date(docEquivalente.created_at + (docEquivalente.created_at.includes('Z') ? '' : 'Z'));
                    dataText = `<div style="font-size:0.75rem; color:#64748b; margin-top:2px;">Gerado e Anexado: <b>${d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</b></div>`;
                } else {
                    dataText = `<div style="font-size:0.75rem; color:#94a3b8; margin-top:2px;"><i>Configurado via Prontuário Digital</i></div>`;
                }

                return `
                <div style="background:#fff; border:1px solid ${isSigned?'#bbf7d0':'#e2e8f0'}; border-radius:8px; padding:0.6rem 0.8rem; margin-bottom:0.4rem; display:flex; justify-content:space-between; align-items:center;">
                    <div style="display:flex; flex-direction:column; gap:2px;">
                        <span style="font-weight:600; color:#334155; font-size:0.85rem;">${g.nome}</span>
                        ${dataText}
                    </div>
                    <div style="display:flex; gap:0.5rem; align-items:center; flex-shrink: 0;">
                        ${statusBadge}
                    </div>
                </div>`;
            }).join('');
        }
    }

    // ── Passo 4: Ficha Cadastral — documentos do colaborador (01_FICHA_CADASTRAL) ──
    const _ec = (targetColab.estado_civil || '').toLowerCase();
    const _isCasado = _ec.includes('casad') || _ec.includes('viúv') || _ec.includes('viuv') || _ec.includes('divorc');
    const _certidao = _isCasado ? 'Certidão de Casamento' : 'Certidão de Nascimento';
    const _isMotorista2 = (targetColab.cargo || '').toUpperCase().includes('MOTORISTA');
    const fixed = [
        'Título Eleitoral',
        _certidao,
        'Comprovante de endereço',
        'Histórico escolar'
    ];
    const isMasc = targetColab.sexo === 'Masculino';
    if (isMasc) fixed.push('Reservista');
    const rgTipo = targetColab.rg_tipo ? targetColab.rg_tipo : 'RG';
    
    if (_isMotorista2) {
        fixed.push('CNH');
    } else {
        fixed.push(rgTipo === 'CIN' ? 'CIN-CPF' : 'RG-CPF');
    }
    
    fixed.push('Carteira de vacinação', 'Currículo', 'Carteira de Trabalho');
    if (_isCasado) {
        fixed.push('CPF do Cônjuge');
    }

    const fichaDocs = (window.currentDocs || []).filter(d => d.tab_name === '01_FICHA_CADASTRAL');
    
    // Pensão (Dinâmico)
    const temPensaoPront = (targetColab.tem_pensao_alimenticia === 'Sim') || !!fichaDocs.find(d => d.document_type === 'Pensão Alimentícia');
    if (temPensaoPront) fixed.push('Pensão Alimentícia');

    let preenchidos4 = 0;
    let totalEsperado4 = fixed.length;
    const capturedDocIds = new Set();
    
    const itemsFicha = fixed.map(docType => {
        const found = fichaDocs.find(d => d.document_type === docType);
        if (found && found.file_path) preenchidos4++;
        if (found) capturedDocIds.add(found.id);
        return { nome: docType, doc: found };
    });

    fichaDocs.forEach(d => {
        if (!capturedDocIds.has(d.id)) {
            if (d.file_path) preenchidos4++;
            capturedDocIds.add(d.id);
            itemsFicha.push({ nome: d.document_type || d.original_name, doc: d });
        }
    });

    // === DEPENDENTES (Adicionado ao Passo 4) ===
    const depList = targetColab.dependentes ? (typeof targetColab.dependentes === 'string' ? JSON.parse(targetColab.dependentes) : targetColab.dependentes) : [];
    const deps = depList.filter(d => d.grau_parentesco !== 'Cônjuge');
    const hoje = new Date();
    const dependentDocs = (window.currentDocs || []).filter(d => d.tab_name === 'Dependentes');
    
    deps.forEach(dep => {
        let idade = null;
        if (dep.data_nascimento) {
            const iso = dep.data_nascimento.includes('T') ? dep.data_nascimento : dep.data_nascimento + 'T12:00:00';
            const nasc = new Date(iso);
            if (!isNaN(nasc)) idade = Math.floor((hoje - nasc) / (365.25 * 24 * 3600 * 1000));
        }
        const safeDepName = (dep.nome || 'DEP').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]/g,'_').replace(/_+/g,'_').replace(/^_|_$/g,'');
                
        const docsConfig = [
            { label: 'CPF ou RG',                    show: true },
            { label: 'Caderneta de Vacinação',      show: idade !== null && idade < 7 },
            { label: 'Atestado de Frequência Escolar', show: idade !== null && idade >= 7 && idade <= 17 },
            { label: 'Certidão de Nascimento',       show: true },
        ];

        const expectedForDep = docsConfig.filter(d => d.show);
        totalEsperado4 += expectedForDep.length;
        
        expectedForDep.forEach(cfg => {
            const fullDocType = `${cfg.label}###DEP_${safeDepName}`;
            const found = dependentDocs.find(d => d.document_type === fullDocType);
            if (found && found.file_path) preenchidos4++;
            if (found) capturedDocIds.add(found.id);
            itemsFicha.push({ nome: `Dep. ${dep.nome ? dep.nome.split(' ')[0] : ''}: ${cfg.label}`, doc: found });
        });
    });

    dependentDocs.forEach(d => {
        if (!capturedDocIds.has(d.id)) {
            if (d.file_path) preenchidos4++;
            capturedDocIds.add(d.id);
            let label = d.document_type || d.original_name;
            if (label && label.includes('###DEP_')) label = label.split('###DEP_')[0];
            itemsFicha.push({ nome: `Dependente: ${label}`, doc: d });
        }
    });

    let pc4 = Math.min(100, Math.round((preenchidos4 / Math.max(1, totalEsperado4)) * 100));

    const containerStep4 = document.getElementById('admissao-checklist-step3');
    if (containerStep4) {
         containerStep4.innerHTML = itemsFicha.map(item => {
             const hasFile = item.doc && item.doc.file_path;
             const statusBadge = hasFile 
                ? `<span style="background:#ecfdf5; color:#059669; border:1px solid #a7f3d0; padding:2px 8px; border-radius:12px; font-size:0.7rem; font-weight:700;"><i class="ph ph-check-circle"></i> Anexado</span>` 
                : `<span style="background:#fef2f2; color:#dc2626; border:1px solid #fecaca; padding:2px 8px; border-radius:12px; font-size:0.7rem; font-weight:700;"><i class="ph ph-x-circle"></i> Faltante</span>`;
             const dateText = hasFile ? (item.doc && item.doc.created_at ? `<div style="font-size:0.75rem; color:#64748b; margin-top:2px;">Anexado em: <b>${new Date(item.doc.created_at + (item.doc.created_at.includes('Z') ? '' : 'Z')).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</b></div>` : '') : `<div style="font-size:0.75rem; color:#94a3b8; margin-top:2px;"><i>Upload obrigatório via Prontuário Digital</i></div>`;
             
             return `
             <div style="background:#fff; border:1px solid ${hasFile?'#bbf7d0':'#e2e8f0'}; border-radius:8px; padding:0.6rem 0.8rem; margin-bottom:0.4rem; display:flex; justify-content:space-between; align-items:center;">
                 <div style="display:flex; flex-direction:column; gap:2px;">
                     <span style="font-weight:600; color:#334155; font-size:0.85rem;">${item.nome}</span>
                     ${dateText}
                 </div>
                 <div style="display:flex; gap:0.5rem; align-items:center; flex-shrink: 0;">
                     ${statusBadge}
                 </div>
             </div>`;
         }).join('');
    }

    // ── Passo 5: ASO — 50% e-mail / 100% doc  ──
    let pc5 = 0;
    const asoDocs = (window.currentDocs || []).filter(d => d.tab_name === 'ASO');
    
    // Reproduzir regras de ASO
    const listAso = ['ASO Padrão'];
    if ((targetColab.cargo || '').toUpperCase().includes('MOTORISTA')) listAso.push('Exames Complementares');

    let preenchidos5 = 0;
    const itemsAso = listAso.map(docType => {
        const found = asoDocs.find(d => d.document_type === docType);
        if (found && found.file_path) preenchidos5++;
        return { nome: docType, doc: found };
    });

    const extras5 = asoDocs.filter(d => !listAso.includes(d.document_type));
    extras5.forEach(d => {
        if (d.file_path) preenchidos5++;
        itemsAso.push({ nome: d.document_type || d.original_name, doc: d });
    });

    const asoDocAnexado = itemsAso.some(item => item.doc && item.doc.file_path);
    
    if (asoDocAnexado) {
        pc5 = 100;
        const noticeEl = document.getElementById('aso-email-notice');
        if (noticeEl) noticeEl.style.display = 'none';
    } else if (targetColab.aso_email_enviado) {
        pc5 = 50;
        const noticeEl = document.getElementById('aso-email-notice');
        if (noticeEl) {
            noticeEl.style.display = 'block';
            document.getElementById('aso-notice-date').textContent = targetColab.aso_email_enviado || '--/--/--';
            document.getElementById('aso-notice-agendada').textContent = targetColab.aso_exame_data || '--/--/--';
        }
    }

    const containerStep5 = document.getElementById('step5-aso-status');
    if (containerStep5) {
         containerStep5.innerHTML = itemsAso.map(item => {
             const hasFile = item.doc && item.doc.file_path;
             const statusBadge = hasFile 
                ? `<span style="background:#ecfdf5; color:#059669; border:1px solid #a7f3d0; padding:2px 8px; border-radius:12px; font-size:0.7rem; font-weight:700;"><i class="ph ph-check-circle"></i> Anexado</span>` 
                : `<span style="background:#fef2f2; color:#dc2626; border:1px solid #fecaca; padding:2px 8px; border-radius:12px; font-size:0.7rem; font-weight:700;"><i class="ph ph-x-circle"></i> Faltante</span>`;
             const dateText = hasFile ? (item.doc && item.doc.created_at ? `<div style="font-size:0.75rem; color:#64748b; margin-top:2px;">Anexado em: <b>${new Date(item.doc.created_at + (item.doc.created_at.includes('Z') ? '' : 'Z')).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</b></div>` : '') : `<div style="font-size:0.75rem; color:#94a3b8; margin-top:2px;"><i>Upload obrigatório via Prontuário Digital</i></div>`;
             
             return `
             <div style="background:#fff; border:1px solid ${hasFile?'#bbf7d0':'#e2e8f0'}; border-radius:8px; padding:0.6rem 0.8rem; margin-bottom:0.4rem; display:flex; justify-content:space-between; align-items:center;">
                 <div style="display:flex; flex-direction:column; gap:2px;">
                     <span style="font-weight:600; color:#334155; font-size:0.85rem;">${item.nome}</span>
                     ${dateText}
                 </div>
                 <div style="display:flex; gap:0.5rem; align-items:center; flex-shrink: 0;">
                     ${statusBadge}
                 </div>
             </div>`;
         }).join('');
    }

    // ── Passo 6: Contabilidade — 100% se ficha enviada ────────────────
    const pc6 = targetColab.admissao_contabil_enviada_em ? 100 : 0;

    // ── Passo 7: Efetivação ───────────────────────────────────────────
    const pc7 = targetColab.status === 'Ativo' ? 100 : 0;

    const pc8 = 0;
    const pc9 = 0;
    const pc10 = 0;

    const percentages = { 1:pc1, 2:pc2, 3:pc3, 4:pc4, 5:pc5, 6:pc6, 7:pc7, 8:pc8, 9:pc9, 10:pc10 };

    let totalPc = 0;
    for (let s in percentages) {
        const pc = percentages[s];
        totalPc += pc;
        const el = document.getElementById(`step-${s}-pc`);
        if (el) el.textContent = `${pc}%`;

        const item = document.getElementById(`step-${s}`);
        if (item) {
            // Regra especial Step 5 (ASO): fica amarelo se e-mail foi enviado mas sem upload
            let isWarning = pc > 0 && pc < 100;
            if (s == 5 && targetColab && targetColab.aso_email_enviado) {
                isWarning = pc < 100;
            }
            item.classList.toggle('pc-warning', isWarning);
            item.classList.toggle('pc-success', pc === 100);
        }
    }

    const totalAtivos = 7;
    let sumAtivos = 0;
    for(let i=1; i<=totalAtivos; i++) sumAtivos += percentages[i];
    
    const avg = Math.round(sumAtivos / totalAtivos);
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
                'Authorization': `Bearer ${currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token') || 'mock_token'}`
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

    if (!confirm(`Confirmar a admissão definitiva de ${viewedColaborador.nome_completo}?\n\nO colaborador passará para o status "Em Integração".`)) return;

    try {
        await apiPut(`/colaboradores/${viewedColaborador.id}`, {
            status: 'Em Integração',
            admissao_status: 'Concluída'
        });

        // Atualizar o objeto local
        viewedColaborador.status = 'Em Integração';
        if (viewedColaborador) viewedColaborador.status = 'Em Integração';

        // Toast de sucesso
        if (typeof admissaoToast === 'function') {
            admissaoToast(`✅ ${viewedColaborador.nome_completo} admitido com sucesso! Agora em Integração.`, 'success');
        } else {
            alert('Admissão realizada com sucesso! O colaborador agora está Em Integração.');
        }

        // Navegar para módulo de integração
        setTimeout(() => {
            if (typeof navigateTo === 'function') navigateTo('integracao');
            // Recarregar lista de colaboradores para refletir o novo status
            if (typeof loadColaboradores === 'function') loadColaboradores();
        }, 800);
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

        // Coordenadas PDF-Lib (Y=0 na base da página. Altura ≈ 841pt para A4)
        // Posicionamento compacto: label → imagem → linha → nome → CPF
        const t1LabelY = 310;
        const tImgH    = 70;
        const t1ImgY   = 230; // imagem de Y=230 até Y=300
        const t1LineY  = 222; // linha logo abaixo da imagem
        const t1NameY  = 208; // nome bem próximo da linha
        const t1CpfY   = 195; // CPF logo abaixo do nome

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
    const cargo = viewedColaborador?.cargo || '';
    
    // Procura template por departamento ou por cargo (e.g. Motorista)
    let templateDoColab = templates.find(t => (t.departamentos||[]).includes(dept) || (t.departamentos||[]).includes(cargo)) ||
                          templates.find(t => t.grupo === dept || t.grupo === cargo) || templates[0];

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
        <div style="background:#fff7ed;border:1.5px solid #fed7aa;border-radius:10px;padding:1rem 1.25rem;margin-bottom:1.25rem;display:flex;justify-content:space-between;align-items:center;gap:1rem;flex-wrap:wrap;">
            <div style="display:flex;align-items:center;gap:0.75rem;">
                <i class="ph ph-warning" style="color:#f59e0b;font-size:1.5rem;"></i>
                <p style="margin:0;font-size:0.88rem;color:#92400e;">Nenhuma ficha ativa disponível para ${cargo || dept}.</p>
            </div>
            ${templateDoColab ? `
                <button onclick="window.gerarFichaEpiManualProntuario(${templateDoColab.id})" class="btn btn-warning" style="height:34px;display:flex;align-items:center;gap:4px;font-weight:700;background:#f59e0b;color:#fff;border:none;">
                    <i class="ph ph-plus-circle"></i> Gerar Ficha Automaticamente
                </button>
            ` : ''}
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

window.gerarFichaEpiManualProntuario = async function(templateId) {
    if (!confirm('Deseja gerar a Ficha de EPI para esse colaborador usando o template padrão vinculado a este cargo?')) return;
    
    const colabId = viewedColaborador?.id;
    if (!colabId) return;

    // Acha o template no state
    const template = window._epiProntuarioData?.templates?.find(t => t.id === templateId);
    if (!template) return alert('Template inválido.');

    const payload = {
        template_id: template.id,
        grupo: template.grupo,
        snapshot_epis: template.epis || [],
        snapshot_termo: template.termo_texto || '',
        snapshot_rodape: template.rodape_texto || ''
    };

    const btn = event.currentTarget;
    const oldHtml = btn.innerHTML;
    btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Gerando...';
    btn.disabled = true;

    try {
        const res = await fetch(`${API_URL}/colaboradores/${colabId}/epi-fichas`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${currentToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error('Erro na resposta do servidor.');
        
        // Recarrega a aba para exibir a ficha ativa recém-criada
        renderTabContent('Ficha de EPI', 'Ficha de EPI');
    } catch(err) {
        console.error(err);
        alert('Ocorreu um erro ao gerar a ficha ativa.');
        btn.innerHTML = oldHtml;
        btn.disabled = false;
    }
};

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
            // Salvar PDF no OneDrive com TODAS as entregas (fire-and-forget)
            (async () => {
                try {
                    const { fichas: ff, colabId: cid, templates } = window._epiProntuarioData || {};
                    const fich = (ff||[]).find(f => f.id === window._assinFichaId);
                    if (fich && cid) {
                        if (typeof ensureHeaderLogo === 'function') await ensureHeaderLogo().catch(()=>{});
                        const tpl = (templates||[]).find(t => t.grupo === fich.grupo) || fich;
                        const { jsPDF } = window.jspdf;

                        // Buscar TODAS as entregas já registradas para esta ficha (histórico completo)
                        const todasEntregas = await fetch(`${API_URL}/epi-fichas/${window._assinFichaId}/entregas`, {
                            headers: { 'Authorization': 'Bearer ' + currentToken }
                        }).then(r => r.json()).catch(() => []);

                        const linhasFull = [];
                        (todasEntregas || []).forEach(e => {
                            const epis = e.epis_entregues || [];
                            if (epis.length === 0) {
                                linhasFull.push({ data: e.data_entrega || '', descricao: '', assinatura_base64: e.assinatura_base64 });
                            } else {
                                epis.forEach(nome => linhasFull.push({ data: e.data_entrega || '', descricao: nome, assinatura_base64: e.assinatura_base64 }));
                            }
                        });

                        const doc = window.gerarDocEpi(tpl, viewedColaborador||{}, jsPDF, linhasFull);
                        const pdfB64 = doc.output('datauristring');
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
    ctx.lineWidth = 4;
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
 * Carrega o status do certificado digital e atualiza o banner.
 * Chamado ao entrar no step 2 da admissão e também nas abas ASO / Pagamentos do Prontuário.
 */
window.carregarStatusCertificado = async function(customBannerId = null) {
    const bannerId = customBannerId || 'cert-digital-banner';
    const banner = document.getElementById(bannerId);
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
            if (btnRemove) btnRemove.style.display = 'flex';
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
            if (btnRemove) btnRemove.style.display = data.configurado ? 'flex' : 'none';
        }


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
    return window.testarAssinaturaView();
};

window.testarAssinaturaView = async function() {
    const resultEl = document.getElementById('cert-view-test-result');
    const btn      = document.getElementById('btn-cert-view-testar');
    if (resultEl) { resultEl.style.cssText='display:block;padding:0.6rem 0.85rem;border-radius:8px;font-size:0.82rem;background:#eff6ff;border:1px solid #bfdbfe;color:#1e40af;'; resultEl.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Testando assinatura no servidor...'; }
    if (btn) btn.disabled = true;

    try {
        const res  = await fetch(`${API_URL}/certificado-digital/testar-assinatura`, { method: 'POST', headers: { 'Authorization': `Bearer ${currentToken}`, 'Content-Type': 'application/json' } });
        const data = await res.json();
        if (!res.ok || !data.ok) throw new Error(data.erro || 'Falha no teste');
        if (resultEl) { resultEl.style.cssText='display:block;padding:0.6rem 0.85rem;border-radius:8px;font-size:0.82rem;background:#f0fdf4;border:1px solid #bbf7d0;color:#166534;'; resultEl.innerHTML = `✅ ${data.mensagem} PDF assinado: ${(data.tamanhoAssinado/1024).toFixed(1)} KB`; }
    } catch(e) {
        if (resultEl) { resultEl.style.cssText='display:block;padding:0.6rem 0.85rem;border-radius:8px;font-size:0.82rem;background:#fef2f2;border:1px solid #fca5a5;color:#dc2626;'; resultEl.innerHTML = `❌ Erro: ${e.message}`; }
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


// ===== TELA DE ASSINATURAS DIGITAIS =====
window.limparAsssinaturasTeste = async function() {
    if (!confirm('Isso vai remover TODOS os registros de assinatura (apenas os de teste). Confirmar?')) return;
    try {
        const res = await fetch(`${API_URL}/assinaturas/limpar-testes`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        const data = await res.json();
        if (res.ok) {
            alert('✅ Registros de teste removidos com sucesso!');
            window.loadAssinaturasDigitais();
        } else {
            alert('Erro: ' + (data.error || 'Falha ao limpar.'));
        }
    } catch(e) {
        alert('Erro de conexão: ' + e.message);
    }
};

window.loadAssinaturasDigitais = async function() {
    const container = document.getElementById('assinaturas-digitais-container');
    if (!container) return;
    container.innerHTML = '<div style="text-align:center;padding:3rem;"><i class="ph ph-circle-notch ph-spin" style="font-size:2.5rem;color:#f503c5;"></i><p style="margin-top:1rem;color:#64748b;">Carregando...</p></div>';

    try {
        const dados = await apiGet('/admissao-assinaturas/todos');
        if (!dados || dados.length === 0) {
            container.innerHTML = '<div style="text-align:center;padding:4rem;color:#94a3b8;"><i class="ph ph-signature" style="font-size:3rem;"></i><p style="margin-top:1rem;">Nenhum documento enviado para assinatura ainda.</p></div>';
            return;
        }

        // Coletar tipos únicos de documentos e statuses para filtros
        const tipos = [...new Set(dados.map(d => d.nome_documento).filter(Boolean))].sort();
        const statuses = ['Todos', 'Assinado', 'Pendente'];

        const fmtDate = (v) => {
            if (!v) return '—';
            try {
                const d = new Date(String(v).includes('Z') ? v : v + 'Z');
                return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            } catch { return v; }
        };

        const token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token');

        container.innerHTML = `
        <div style="background:#fff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;">
            <!-- Filtros -->
            <div style="padding:1rem 1.25rem;border-bottom:1px solid #f1f5f9;display:flex;gap:0.75rem;flex-wrap:wrap;align-items:center;background:#f8fafc;">
                <div style="display:flex;align-items:center;gap:0.5rem;flex:1;min-width:200px;">
                    <i class="ph ph-magnifying-glass" style="color:#94a3b8;"></i>
                    <input type="text" id="ass-search" placeholder="Buscar colaborador ou documento..." oninput="window.filtrarAssinaturas()"
                        style="border:none;outline:none;font-size:0.9rem;width:100%;background:transparent;color:#334155;">
                </div>
                <select id="ass-filter-status" onchange="window.filtrarAssinaturas()"
                    style="border:1px solid #e2e8f0;border-radius:6px;padding:0.4rem 0.75rem;font-size:0.85rem;color:#334155;background:#fff;cursor:pointer;">
                    <option value="">Todos os status</option>
                    <option value="Assinado">✅ Assinado</option>
                    <option value="Pendente">⏳ Aguardando</option>
                </select>
                <select id="ass-filter-tipo" onchange="window.filtrarAssinaturas()"
                    style="border:1px solid #e2e8f0;border-radius:6px;padding:0.4rem 0.75rem;font-size:0.85rem;color:#334155;background:#fff;cursor:pointer;">
                    <option value="">Todos os documentos</option>
                    ${tipos.map(t => `<option value="${t}">${t}</option>`).join('')}
                </select>
                <span id="ass-count-label" style="font-size:0.82rem;color:#64748b;white-space:nowrap;font-weight:600;"></span>
            </div>
            <!-- Tabela -->
            <div style="overflow-x:auto;max-height:70vh;overflow-y:auto;">
                <table id="ass-table" style="width:100%;border-collapse:collapse;font-size:0.85rem;">
                    <thead>
                        <tr style="background:#f8fafc;border-bottom:2px solid #e2e8f0;position:sticky;top:0;z-index:1;">
                            <th style="padding:0.75rem 1rem;text-align:left;font-weight:700;color:#475569;white-space:nowrap;">Colaborador</th>
                            <th style="padding:0.75rem 1rem;text-align:left;font-weight:700;color:#475569;white-space:nowrap;">Documento</th>
                            <th style="padding:0.75rem 1rem;text-align:center;font-weight:700;color:#475569;white-space:nowrap;">Status</th>
                            <th style="padding:0.75rem 1rem;text-align:left;font-weight:700;color:#475569;white-space:nowrap;">Enviado em</th>
                            <th style="padding:0.75rem 1rem;text-align:left;font-weight:700;color:#475569;white-space:nowrap;">Assinado em</th>
                            <th style="padding:0.75rem 1rem;text-align:center;font-weight:700;color:#475569;white-space:nowrap;">Ações</th>
                        </tr>
                    </thead>
                    <tbody id="ass-table-body">
                    </tbody>
                </table>
            </div>
        </div>`;

        // Guardar dados globalmente para filtro
        window._assinaturasData = dados;
        window._assinaturaToken = token;
        window.filtrarAssinaturas();

    } catch(e) {
        container.innerHTML = `<div style="text-align:center;padding:3rem;color:#ef4444;"><i class="ph ph-warning" style="font-size:2.5rem;"></i><p>${e.message}</p></div>`;
    }
};


window.setStatusOutroMeio = async function(id, source) {
    if (!confirm('Tem certeza que deseja marcar este documento como assinado por "Outro Meio"? Ele saíra da fila de pendentes.')) return;
    try {
        const res = await apiPost('/admissao-assinaturas/outro-meio', { id, source });
        alert(res.message || 'Status atualizado com sucesso!');
        await loadAssinaturasDigitaisList(); // Reload se existir
        if (window.filtrarAssinaturas) {
            const container = document.getElementById('assinaturas-digitais-container');
            if (container) {
                container.innerHTML = '<div style="text-align:center;padding:3rem;"><i class="ph ph-circle-notch ph-spin" style="font-size:2.5rem;color:#f503c5;"></i></div>';
                const dados = await apiGet('/admissao-assinaturas/todos');
                window._assinaturasData = dados || [];
                window.filtrarAssinaturas();
            }
        }
    } catch(e) { alert('Erro: ' + e.message); }
};
window.filtrarAssinaturas = function() {
    const dados = window._assinaturasData || [];
    const search = (document.getElementById('ass-search')?.value || '').toLowerCase();
    const filterStatus = document.getElementById('ass-filter-status')?.value || '';
    const filterTipo = document.getElementById('ass-filter-tipo')?.value || '';
    const token = window._assinaturaToken || window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token');

    const filtered = dados.filter(d => {
        const matchSearch = !search || 
            (d.colaborador_nome || '').toLowerCase().includes(search) ||
            (d.nome_documento || '').toLowerCase().includes(search);
        const matchStatus = !filterStatus || d.assinafy_status === filterStatus;
        const matchTipo = !filterTipo || d.nome_documento === filterTipo;
        return matchSearch && matchStatus && matchTipo;
    });

    const label = document.getElementById('ass-count-label');
    if (label) label.textContent = `${filtered.length} registro(s)`;

    const fmtDate = (v) => {
        if (!v) return '—';
        try {
            const d = new Date(String(v).includes('Z') ? v : v + 'Z');
            return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        } catch { return v; }
    };

    const tbody = document.getElementById('ass-table-body');
    if (!tbody) return;

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:2rem;color:#94a3b8;">Nenhum resultado encontrado</td></tr>';
        return;
    }

    tbody.innerHTML = filtered.map(d => {
        const isSigned = d.assinafy_status === 'Assinado';
        const statusBadge = isSigned
            ? '<span style="background:#dcfce7;color:#15803d;border-radius:20px;padding:3px 10px;font-size:0.72rem;font-weight:700;white-space:nowrap;display:inline-flex;align-items:center;gap:3px;"><i class="ph ph-check-circle"></i> Assinado</span>'
            : d.assinafy_status === 'Pendente'
            ? '<span style="background:#fef9c3;color:#92400e;border-radius:20px;padding:3px 10px;font-size:0.72rem;font-weight:700;white-space:nowrap;display:inline-flex;align-items:center;gap:3px;"><i class="ph ph-clock"></i> Aguardando</span>'
            : '<span style="background:#f1f5f9;color:#64748b;border-radius:20px;padding:3px 10px;font-size:0.72rem;font-weight:700;white-space:nowrap;">—</span>';

        let viewBtn = `<span style="color:#94a3b8;font-size:0.78rem;">—</span>`;
        if (isSigned) {
            const nomeEsc = (d.nome_documento||'').replace(/'/g, "\\'");
            if (d.source === 'documento') {
                viewBtn = `<button onclick="window.openSignedDocPopupDocumento(${d.id}, '${nomeEsc}')" style="background:#1d4ed8;color:#fff;border:none;border-radius:6px;padding:0.35rem 0.75rem;font-size:0.78rem;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:4px;"><i class="ph ph-eye"></i> Ver PDF</button>`;
            } else {
                viewBtn = `<button onclick="window.openSignedDocPopup(${d.id}, '${nomeEsc}', event)" style="background:#1d4ed8;color:#fff;border:none;border-radius:6px;padding:0.35rem 0.75rem;font-size:0.78rem;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:4px;"><i class="ph ph-eye"></i> Ver PDF</button>`;
            }
        } else if (d.assinafy_status === 'Pendente') {
            viewBtn = `<button onclick="window.reenviarAssinatura(${d.id}, '${d.source}', this)" style="background:#f59e0b;color:#fff;border:none;border-radius:6px;padding:0.35rem 0.75rem;font-size:0.78rem;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:4px;" title="Copiar link ou Enviar WhatsApp"><i class="ph ph-paper-plane-right"></i> Reenviar</button>`;
        }

        return `
        <tr style="border-bottom:1px solid #f1f5f9;transition:background 0.15s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background=''">
            <td style="padding:0.75rem 1rem;">
                <div style="font-weight:600;color:#1e293b;">${d.colaborador_nome || '—'}</div>
                <div style="font-size:0.75rem;color:#94a3b8;">${d.colaborador_cargo || ''} ${d.colaborador_departamento ? '· ' + d.colaborador_departamento : ''}</div>
            </td>
            <td style="padding:0.75rem 1rem;">
                <div style="font-weight:600;color:#334155;">${d.nome_documento || '—'}</div>
            </td>
            <td style="padding:0.75rem 1rem;text-align:center;">${statusBadge}</td>
            <td style="padding:0.75rem 1rem;color:#475569;white-space:nowrap;">${fmtDate(d.enviado_em)}</td>
            <td style="padding:0.75rem 1rem;${isSigned ? 'color:#15803d;' : 'color:#94a3b8;'}white-space:nowrap;font-weight:${isSigned?'600':'400'};">${fmtDate(d.assinado_em)}</td>
            <td style="padding:0.75rem 1rem;text-align:center;">${viewBtn}</td>
        </tr>`;
    }).join('');
};

window.reenviarAssinatura = async function(id, source, btn) {
    const oldHtml = btn.innerHTML;
    btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i>';
    btn.disabled = true;

    try {
        const token = window._assinaturaToken || window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token');
        const res = await fetch(`${API_URL}/assinaturas/reenviar`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, source })
        });
        const data = await res.json();
        
        btn.innerHTML = `<i class="ph ph-check-circle"></i> Gerado`;
        setTimeout(() => { btn.innerHTML = oldHtml; btn.disabled = false; }, 1500);
        
        if (res.ok && data.success) {
            if (data.warn) {
                alert('Atenção: ' + data.warn + '\n\nO link é: ' + (data.link || ''));
            } else {
                alert('E-mail de lembrete enviado com sucesso para o colaborador!');
            }
        } else {
            alert(data.error || 'Erro ao comunicar com o servidor.');
        }
    } catch(e) {
        alert('Erro ao processar: ' + e.message);
        btn.innerHTML = oldHtml;
        btn.disabled = false;
    }
};

// Registrar navegação para a tela de assinaturas
(function() {
    const origNavigate = window.navigateTo;
    if (typeof origNavigate === 'function') {
        window.navigateTo = function(view) {
            origNavigate(view);
            if (view === 'assinaturas-digitais') {
                setTimeout(() => window.loadAssinaturasDigitais(), 150);
            }
        };
    } else {
        // Fallback: observar clique no item do menu
        document.addEventListener('click', function(e) {
            const link = e.target.closest('[data-target="assinaturas-digitais"]');
            if (link) setTimeout(() => window.loadAssinaturasDigitais(), 200);
        });
    }
})();


// === SISTEMA DE HISTÓRICO DE AUDITORIA ===
window._historyData = [];
window._historyPage = 1;
const HISTORY_PER_PAGE = 20;

window.historyPageChange = function(delta) {
    const totalPages = Math.ceil(window._historyData.length / HISTORY_PER_PAGE);
    window._historyPage = Math.max(1, Math.min(totalPages, window._historyPage + delta));
    window._renderHistoryPage();
};

window._renderHistoryPage = function() {
    const tbody = document.getElementById('history-table-body');
    const pageInfo = document.getElementById('history-page-info');
    const prevBtn = document.getElementById('history-prev-btn');
    const nextBtn = document.getElementById('history-next-btn');
    if (!tbody) return;

    const data = window._historyData;
    const page = window._historyPage;
    const totalPages = Math.max(1, Math.ceil(data.length / HISTORY_PER_PAGE));
    const start = (page - 1) * HISTORY_PER_PAGE;
    const slice = data.slice(start, start + HISTORY_PER_PAGE);

    if (pageInfo) pageInfo.textContent = `Pág. ${page} / ${totalPages}`;
    if (prevBtn) prevBtn.disabled = page <= 1;
    if (nextBtn) nextBtn.disabled = page >= totalPages;

    if (slice.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 2rem; color: #94a3b8;">Nenhum registro de alteração encontrado.</td></tr>';
        return;
    }

    let html = '';
    slice.forEach((log, i) => {
        const rawDate = log.data_hora || '';
        let dateStr = '-', horaStr = '-';
        try {
            const dt = new Date(rawDate.endsWith('Z') ? rawDate : rawDate + 'Z');
            dateStr = dt.toLocaleDateString('pt-BR');
            horaStr = dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        } catch(e) {}

        const stripBg = i % 2 === 0 ? 'background:#fff;' : 'background:#f8fafc;';

        const campoLabel = log.campo ? `<span style="color:#94a3b8;font-size:0.75rem;font-weight:600;">${log.campo}: </span>` : '';
        const anteriorCell = log.conteudo_anterior
            ? `${campoLabel}<span>${log.conteudo_anterior}</span>`
            : `<span style="color:#cbd5e1;">—</span>`;
        const atualCell = log.conteudo_atual
            ? `${campoLabel}<span style="font-weight:600;">${log.conteudo_atual}</span>`
            : `<span style="color:#cbd5e1;">—</span>`;

        html += `<tr style="${stripBg}border-bottom:1px solid #f1f5f9;">
            <td style="padding:0.7rem 1rem; white-space:nowrap; color:#334155; font-size:0.82rem;">${dateStr}</td>
            <td style="padding:0.7rem 1rem; white-space:nowrap; color:#64748b; font-family:monospace; font-size:0.82rem;">${horaStr}</td>
            <td style="padding:0.7rem 1rem; font-weight:700; color:#f503c5; font-size:0.82rem; text-transform:uppercase;">${log.usuario || 'SISTEMA'}</td>
            <td style="padding:0.7rem 1rem; color:#ef4444; font-size:0.82rem;">${anteriorCell}</td>
            <td style="padding:0.7rem 1rem; color:#16a34a; font-size:0.82rem;">${atualCell}</td>
        </tr>`;
    });
    tbody.innerHTML = html;
};

window.showHistoryPopup = async function() {
    const historyMod = document.getElementById('modal-history');
    if (historyMod) historyMod.style.display = 'flex';
    const tbody = document.getElementById('history-table-body');
    const loading = document.getElementById('history-loading');
    const contextLabel = document.getElementById('history-context-label');
    
    window._historyPage = 1;
    window._historyData = [];
    tbody.innerHTML = '';
    loading.style.display = 'block';

    try {
        let url = `${API_URL}/auditoria`;
        let labelText = 'Todas as alterações do sistema';
        
        const viewPront = document.getElementById('view-prontuario');
        const viewAdm = document.getElementById('view-admissao');
        const viewForm = document.getElementById('view-form-colaborador');
        const viewListColab = document.getElementById('view-colaboradores');
        const viewGer = document.getElementById('view-geradores');
        const viewCargos = document.getElementById('view-cargos');
        const viewFaculdade = document.getElementById('view-faculdade');
        const viewEpi = document.getElementById('view-ficha-epi');
        const viewAvaliacoes = document.getElementById('view-gerenciar-avaliacoes');

        const isColabActive = (viewPront && viewPront.classList.contains('active')) || 
                              (viewAdm && viewAdm.classList.contains('active')) ||
                              (viewForm && viewForm.classList.contains('active')) ||
                              (viewListColab && viewListColab.classList.contains('active'));
        const isGerActive = viewGer && viewGer.classList.contains('active');
        const isCargosActive = viewCargos && viewCargos.classList.contains('active');
        const isFaculdadeActive = viewFaculdade && viewFaculdade.classList.contains('active');
        const isEpiActive = viewEpi && viewEpi.classList.contains('active');
        const isAvaliacoesActive = viewAvaliacoes && viewAvaliacoes.classList.contains('active');

        if (isColabActive && viewedColaborador && viewedColaborador.id) {
            // Prontuário ou Admissão de um colaborador específico
            url += `?contexto=colaborador&id=${viewedColaborador.id}`;
            labelText = `Colaborador: ${viewedColaborador.nome_completo || viewedColaborador.nome || ''}`;
        } else if (isColabActive) {
            // Lista de colaboradores = todas as alterações em todos os colaboradores
            url += `?contexto=colaboradores_geral`;
            labelText = 'Todas as alterações em Colaboradores';
        } else if (isGerActive) {
            url += `?contexto=gerador`;
            labelText = 'Tela: Geradores de Documentos';
        } else if (isCargosActive) {
            url += `?programa=Cargos`;
            labelText = 'Tela: Cargos';
        } else if (isFaculdadeActive) {
            url += `?programa=Faculdade`;
            labelText = 'Tela: Faculdade';
        } else if (isEpiActive) {
            url += `?programa=EPI`;
            labelText = 'Tela: Fichas EPI';
        } else if (isAvaliacoesActive) {
            url += `?programa=Avalia`;
            labelText = 'Tela: Avaliações';
        } else {
            url += `?contexto=geral`;
        }
        
        if (contextLabel) contextLabel.textContent = labelText;

        const res = await fetch(url, { headers: { 'Authorization': `Bearer ${currentToken}` } });
        if (!res.ok) throw new Error('Falha ao carregar histórico');
        const data = await res.json();

        loading.style.display = 'none';
        window._historyData = data || [];
        window._renderHistoryPage();

    } catch (e) {
        loading.style.display = 'none';
        document.getElementById('history-table-body').innerHTML = `<tr><td colspan="5" style="text-align:center; color:#ef4444; padding:1rem;">Erro ao carregar histórico: ${e.message}</td></tr>`;
    }
};

// Automatically show/hide history icon based on view
setInterval(() => {
    const btnHistory = document.getElementById('btn-history-page');
    if (!btnHistory) return;
    const viewPront = document.getElementById('view-prontuario');
    const viewAdms = document.getElementById('view-admissao');
    const viewForm = document.getElementById('view-form-colaborador');
    const viewGer = document.getElementById('view-geradores');
    // Including view-colaboradores to allow global collaborator history
    const viewListColab = document.getElementById('view-colaboradores');
    
    const isColabActive = (viewPront && viewPront.classList.contains('active')) || 
                          (viewAdms && viewAdms.classList.contains('active')) ||
                          (viewForm && viewForm.classList.contains('active')) ||
                          (viewListColab && viewListColab.classList.contains('active'));
    const isGerActive = (viewGer && viewGer.classList.contains('active'));

    if (isColabActive || isGerActive) {
        btnHistory.style.display = 'flex';
    } else {
        btnHistory.style.display = 'none';
    }
}, 500);

// ===== SISTEMA DE TOAST: NOTIFICAÇÕES DE DOCUMENTOS ASSINADOS (ADMISSÃO) =====
(function() {
    // Container de toasts
    function getToastContainer() {
        let c = document.getElementById('admissao-toast-container');
        if (!c) {
            c = document.createElement('div');
            c.id = 'admissao-toast-container';
            c.style.cssText = `
                position: fixed;
                bottom: 1.2rem;
                right: 1.2rem;
                z-index: 99999;
                display: flex;
                flex-direction: column-reverse;
                gap: 0.6rem;
                pointer-events: none;
                max-width: 360px;
            `;
            document.body.appendChild(c);
        }
        return c;
    }

    function showToast(nomeDoc, nomeColab, hora, isAso = false) {
        hora = hora || new Date().toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' });
        const container = getToastContainer();
        const toast = document.createElement('div');
        toast.setAttribute('data-toast-item', '1');
        
        let colorMain = isAso ? '#84cc16' : '#22c55e'; // lime-500/olive-like para ASO, green-500 default
        let colorBg = isAso ? '#f7fee7' : '#f0fdf4'; // very subtle green background variations inside
        let colorText = isAso ? '#a3e635' : '#86efac';

        toast.style.cssText = `
            background: linear-gradient(135deg, #0f172a, #1e293b);
            color: #fff;
            border-radius: 12px;
            padding: 0.9rem 1.1rem;
            display: flex;
            align-items: flex-start;
            gap: 0.75rem;
            box-shadow: 0 8px 30px rgba(0,0,0,0.35);
            border-left: 4px solid ${colorMain};
            pointer-events: all;
            animation: toastSlideIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
            max-width: 340px;
        `;
        toast.innerHTML = `
            <i class="ph-fill ph-check-circle" style="font-size:1.8rem;color:${colorMain};flex-shrink:0;margin-top:1px;"></i>
            <div style="flex:1;min-width:0;">
                <div style="font-size:0.7rem;font-weight:700;color:${colorText};text-transform:uppercase;letter-spacing:0.6px;margin-bottom:2px;">
                    ✅ Documento Assinado
                </div>
                <div style="font-size:0.9rem;font-weight:700;color:#f0fdf4;line-height:1.3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                    ${nomeDoc}
                </div>
                <div style="font-size:0.78rem;color:#94a3b8;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                    <i class="ph ph-user"></i> ${nomeColab}
                </div>
                <div style="font-size:0.73rem;color:#64748b;margin-top:1px;">
                    <i class="ph ph-clock"></i> ${hora}
                </div>
            </div>
            <button onclick="this.closest('[data-toast-item]')?.remove()"
                style="background:none;border:none;color:#64748b;cursor:pointer;font-size:1.1rem;padding:0 0 0 4px;flex-shrink:0;pointer-events:all;line-height:1;"
                title="Fechar">✕</button>
        `;
        // Inject animation keyframes once
        if (!document.getElementById('toast-anim-style')) {
            const style = document.createElement('style');
            style.id = 'toast-anim-style';
            style.textContent = `
                @keyframes toastSlideIn {
                    from { opacity: 0; transform: translateX(80px) scale(0.9); }
                    to   { opacity: 1; transform: translateX(0) scale(1); }
                }
                @keyframes toastFadeOut {
                    from { opacity: 1; transform: scale(1); }
                    to   { opacity: 0; transform: scale(0.9); }
                }
            `;
            document.head.appendChild(style);
        }
        container.appendChild(toast);
        // Removido auto-remove: o popup ficará ativo até ser fechado manualmente
    }

    // Polling: verifica a cada 30 segundos por documentos recém-assinados
    const SEEN_KEY = 'admissao_toasts_vistos';
    const SEEN_TTL_KEY = 'admissao_toasts_ttl';
    function getSeenIds() {
        try {
            // Limpar seen IDs a cada 24h para not mostrar alertas velhos de forma permanente
            const ttl = localStorage.getItem(SEEN_TTL_KEY);
            if (!ttl || Date.now() - parseInt(ttl) > 86400000) {
                localStorage.removeItem(SEEN_KEY);
                localStorage.setItem(SEEN_TTL_KEY, String(Date.now()));
                return new Set();
            }
            return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) || '[]'));
        } catch { return new Set(); }
    }
    function markSeen(ids) {
        try {
            const seen = getSeenIds();
            ids.forEach(id => seen.add(id));
            // Manter apenas os últimos 200 para não encher o storage
            const arr = Array.from(seen).slice(-200);
            localStorage.setItem(SEEN_KEY, JSON.stringify(arr));
        } catch {}
    }

    async function checkAlertasRecentes() {
        const token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token');
        if (!token) return;

        // Verificação simples: apenas requer login
        try {
            const resp = await fetch(`${API_URL}/admissao-assinaturas/alertas-recentes`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!resp.ok) return;
            const alertas = await resp.json();
            if (!Array.isArray(alertas) || alertas.length === 0) return;
            const seen = getSeenIds();
            const novos = alertas.filter(a => !seen.has(String(a.unq_id)));
            if (novos.length === 0) return;
            
            novos.slice(0, 5).forEach(a => {
                const hora = a.assinado_em 
                    ? new Date(a.assinado_em + (String(a.assinado_em).includes('Z') ? '' : 'Z')).toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' })
                    : new Date().toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' });
                showToast(a.nome_documento || 'Documento', a.colaborador_nome || 'Colaborador', hora);
            });
            markSeen(novos.map(a => String(a.unq_id)));

            // AUTO-REFRESH STATUS
            // Se estiver na tela de admissão (passo 2) ou de contratos, já aciona a atualização da lista atual
            if (document.getElementById('admissao-signature-list')) {
                if (document.getElementById('current-tab-title') && document.getElementById('current-tab-title').innerText === 'Contratos') {
                    if (typeof renderContratosTab === 'function') renderContratosTab(document.getElementById('docs-list-container'));
                } else if (typeof window.initAdmissaoWorkflow === 'function' && viewedColaborador) {
                    window.initAdmissaoWorkflow(viewedColaborador.id, 2, true);
                }
            }
        } catch {}
    }


    // Iniciar polling após 5 segundos (aguarda login completo) e repetir a cada 15s
    setTimeout(() => {
        checkAlertasRecentes();
        setInterval(checkAlertasRecentes, 15000);
    }, 5000);
})();

// --- GESTÃO DE INTEGRAÇÃO ---
window.startIntegracao = function(val) {
    if(val) {
        document.getElementById('integracao-workflow').style.display = 'block';
    } else {
        document.getElementById('integracao-workflow').style.display = 'none';
    }
};
window.nextIntegracaoStep = function(step) {
    document.querySelectorAll('.integracao-panel').forEach(p => p.style.display = 'none');
    document.querySelectorAll('#integracao-workflow .step-item').forEach(s => s.classList.remove('active'));
    
    const panel = document.getElementById('int-panel-step-' + step);
    if(panel) panel.style.display = 'block';
    
    const icon = document.getElementById('int-step-' + step);
    if(icon) icon.classList.add('active');
};

window.switchCargoDeptoTab = function(tab) {
    document.getElementById('tab-btn-cargos').style.color = '#64748b';
    document.getElementById('tab-btn-cargos').style.borderBottomColor = 'transparent';
    document.getElementById('tab-btn-cargos').style.fontWeight = '500';
    document.getElementById('tab-btn-departamentos').style.color = '#64748b';
    document.getElementById('tab-btn-departamentos').style.borderBottomColor = 'transparent';
    document.getElementById('tab-btn-departamentos').style.fontWeight = '500';
    document.getElementById('tab-content-cargos').style.display = 'none';
    document.getElementById('tab-content-departamentos').style.display = 'none';
    document.getElementById('tab-btn-' + tab).style.color = 'var(--primary-color)';
    document.getElementById('tab-btn-' + tab).style.borderBottomColor = 'var(--primary-color)';
    document.getElementById('tab-btn-' + tab).style.fontWeight = '600';
    document.getElementById('tab-content-' + tab).style.display = 'block';
    if(tab === 'departamentos' && typeof loadDepartamentos === 'function') loadDepartamentos();
};

window.loadIntegracaoColabs = async function() {
    try {
        const colaboradores = await apiGet('/colaboradores');
        if(!colaboradores) return;
        const integracaoUsers = colaboradores.filter(c => c.status === 'Em Integração');
        const sel = document.getElementById('select-integracao-colab');
        if(sel) {
            sel.innerHTML = '<option value="">Selecione um colaborador...</option>';
            integracaoUsers.forEach(c => {
                const opt = document.createElement('option');
                opt.value = c.id;
                opt.textContent = c.nome_completo;
                sel.appendChild(opt);
            });
        }
    } catch(e) {}
};
window.toggleAlergias = function(val) {
    const input = document.getElementById('colab-alergias');
    if (!input) return;
    if (val === 'Sim') {
        input.disabled = false;
        input.style.background = '#fff';
        input.style.cursor = 'text';
        input.placeholder = 'Descreva aqui alergias, restri��es ou intoler�ncias...';
    } else {
        input.disabled = true;
        input.style.background = '#f8fafc';
        input.style.cursor = 'not-allowed';
        input.value = '';
    }
};
window.toggleAdiantamento = function(val) {
    const input = document.getElementById('colab-adiantamento-valor');
    if (!input) return;
    if (val === 'Sim') {
        input.disabled = false;
        input.style.background = '#fff';
        input.style.cursor = 'text';
    } else {
        input.disabled = true;
        input.style.background = '#f8fafc';
        input.style.cursor = 'not-allowed';
        input.value = '';
    }
};

window.toggleInsalubridade = function(val) {
    const input = document.getElementById('colab-insalubridade-valor');
    if (!input) return;
    if (val === 'Sim' || val === 'Sim') {
        input.disabled = false;
        input.style.background = '#fff';
        input.style.cursor = 'text';
    } else {
        input.disabled = true;
        input.style.background = '#f8fafc';
        input.style.cursor = 'not-allowed';
        input.value = '';
    }
};

window.previewFichaAdmissao = function() {
    let colabId = viewedColaborador && viewedColaborador.id;
    if (!colabId) {
        const hid = document.getElementById('admissao-select-colab');
        colabId = hid ? hid.value : null;
    }
    if (!colabId) { alert('Nenhum colaborador selecionado na admiss\u00e3o.'); return; }
    const token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token');
    if (!token) { alert('Sess\u00e3o expirada. Fa\u00e7a login novamente.'); return; }

    const pdfUrl = `/api/colaboradores/${colabId}/ficha-admissao/html?token=${token}`;

    // Remove modal anterior se existir
    const existing = document.getElementById('ficha-pdf-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'ficha-pdf-modal';
    modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.88);z-index:99999;display:flex;flex-direction:column;';
    modal.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 20px;background:#1e293b;flex-shrink:0;">
            <span style="color:#fff;font-weight:600;font-size:0.95rem;display:flex;align-items:center;gap:8px;">
                <i class="ph ph-file-pdf" style="color:#e03131;font-size:1.2rem;"></i> Ficha de Admiss\u00e3o
            </span>
            <button onclick="document.getElementById('ficha-pdf-modal').remove()" style="background:#e03131;border:none;color:#fff;padding:6px 18px;border-radius:6px;cursor:pointer;font-weight:700;font-size:0.9rem;">\u00d7 Fechar</button>
        </div>
        <iframe src="${pdfUrl}" style="flex:1;width:100%;border:none;" type="application/pdf"></iframe>
    `;
    document.body.appendChild(modal);
};

window.enviarFichaContabilidade = async function(btn) {
    let colabId = viewedColaborador && viewedColaborador.id;
    if (!colabId) {
        const hid = document.getElementById('admissao-select-colab');
        colabId = hid ? hid.value : null;
    }
    if (!colabId) {
        alert('Nenhum colaborador selecionado.');
        return;
    }
    const email = document.getElementById('email-contabilidade').value;
    const dataInicio = document.getElementById('data-inicio-contabilidade').value;

    if (!email) {
        alert("Preencha o e-mail destino.");
        return;
    }
    if (!dataInicio) {
        alert("Preencha a Data de Início Prevista.");
        return;
    }

    // Verificar se todos os passos estão em 100%
    const stepBadges = document.querySelectorAll('.step-badge .step-pct');
    let allComplete = true;
    stepBadges.forEach(badge => {
        const pct = parseInt(badge.textContent) || 0;
        if (pct < 100) allComplete = false;
    });
    if (!allComplete) {
        const ok = confirm('⚠️ Atenção! Ainda existem passos não concluídos (não estão em 100%).\n\nDeseja continuar mesmo assim e enviar os documentos para a Contabilidade?');
        if (!ok) return;
    }

    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Enviando...';
    btn.disabled = true;

    try {
        const url = (typeof API_URL !== 'undefined' ? API_URL : 'https://sistema-america.onrender.com/api') + `/colaboradores/${colabId}/enviar-ficha-contabilidade`;
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token')}` },
            body: JSON.stringify({ email: email, data_inicio: dataInicio })
        });
        const data = await res.json();
        if (data.sucesso) {
            // Mostrar imediatamente os documentos enviados usando os dados da resposta
            if (viewedColaborador) {
                viewedColaborador.admissao_contabil_enviada_em = data.enviada_em || new Date().toISOString();
                viewedColaborador.admissao_contabil_anexos = data.anexos || '';
            }
            if (typeof window.renderEnvioContabilidadeLog === 'function') {
                window.renderEnvioContabilidadeLog();
            }
            // Mostrar toast em vez de alert bloqueante
            if (typeof admissaoToast === 'function') {
                admissaoToast(`✅ E-mail enviado para ${email}`, 'success');
            } else {
                alert('Ficha e anexos enviados com sucesso para ' + email);
            }
            // Refresh assíncrono em background para garantir consistência
            apiGet(`/colaboradores/${colabId}`).then(ref => {
                if (ref && viewedColaborador) {
                    viewedColaborador = Object.assign(viewedColaborador, ref);
                    if (typeof window.renderEnvioContabilidadeLog === 'function') {
                        window.renderEnvioContabilidadeLog();
                    }
                }
            }).catch(() => {});
        } else {
            alert('Erro ao enviar para Contabilidade: ' + (data.error || 'Erro desconhecido.'));
        }
    } catch(err) {
        alert('Erro de conexão: ' + err.message);
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
};

// ===== RENDER LOG DE ENVIO PARA CONTABILIDADE (PASSO 5) =====
window.renderEnvioContabilidadeLog = function() {
    const colab = viewedColaborador;
    const logPanel = document.getElementById('envio-contabilidade-log');
    const dataEl = document.getElementById('envio-contab-data');
    const anexosEl = document.getElementById('envio-contab-anexos');
    if (!logPanel) return;

    const enviada_em = colab && colab.admissao_contabil_enviada_em;
    if (!enviada_em) {
        logPanel.style.display = 'none';
        return;
    }

    // Formatar data/hora em pt-BR com destaque
    let dataFormatada = enviada_em;
    try {
        const dt = new Date(enviada_em.endsWith('Z') ? enviada_em : enviada_em + 'Z');
        const dia = dt.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const hora = dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        dataFormatada = `${dia} às ${hora}`;
    } catch(e) {}

    if (dataEl) dataEl.textContent = dataFormatada;

    // Listar anexos
    if (anexosEl && colab.admissao_contabil_anexos) {
        const lista = colab.admissao_contabil_anexos.split(',').map(s => s.trim()).filter(Boolean);
        if (lista.length > 0) {
            anexosEl.innerHTML = lista.map(a => `<li>📄 ${a}</li>`).join('');
        } else {
            anexosEl.innerHTML = '<li style="color:#94a3b8">Nenhum anexo registrado</li>';
        }
    }

    logPanel.style.display = 'block';
};


// ============================================================
// PASSO 2 ADMISSÃO — SANTANDER (Pedido de Abertura de Conta)
// ============================================================
// Helper: atualiza UI do Step 2 Santander (usada ao gerar e ao voltar ao passo)
window._updateSantanderStepUI = function(dataSantander) {
    var log = document.getElementById('santander-status-log');
    var logText = document.getElementById('santander-status-text');

    if (!dataSantander) return;

    // Mostrar bloco verde
    if (log) log.style.display = 'block';
    if (logText) {
        try {
            var dt = new Date(dataSantander);
            logText.textContent = 'Ficha gerada em ' + dt.toLocaleString('pt-BR');
        } catch(e) { logText.textContent = 'Ficha gerada'; }
    }

    // === Marcar step 2 como 100% ===
    // Estratégia 1: element com id step-2-pc
    var elPc = document.getElementById('step-2-pc');
    if (elPc) elPc.textContent = '100%';

    // Estratégia 2: o step-item do stepper (bolinha)
    var stepEl = document.getElementById('step-2');
    if (stepEl) {
        // Checar em diferentes estilos de stepper
        // Aplicar via classe CSS (não via style inline - conflita com .active:not(.pc-success))
        stepEl.classList.remove('pc-warning');
        stepEl.classList.add('pc-success');
        var iconEl = stepEl.querySelector('.step-icon');
        if (iconEl) {
            iconEl.style.removeProperty('background');
            iconEl.style.removeProperty('border-color');
            iconEl.style.removeProperty('color');
        }
        var numEl = stepEl.querySelector('.num, .step-number');
        if (numEl) numEl.style.removeProperty('display'); // NUNCA esconder o número
        var pcEl = stepEl.querySelector('.percent, .step-percent, .pc');
        if (pcEl) { pcEl.style.display = 'inline'; pcEl.textContent = '100%'; }
    }

    // Estratégia 3: procurar qualquer elemento que contenha "step-2" e "pc"
    var allPc = document.querySelectorAll('[id*="step"][id*="pc"]');
    allPc.forEach(function(el) {
        if (el.id === 'step-2-pc' || el.id.match(/step.?2.?pc/i)) {
            el.textContent = '100%';
        }
    });
}

window.populateSantanderPreview = async function() {
    var colab = viewedColaborador || window._admissaoColabSelecionado;
    if (!colab) return;

    // Se ainda não tem a data na memória, busca do servidor (dados podem estar desatualizados)
    if (!colab.santander_ficha_data && colab.id) {
        try {
            var fresh = await apiGet('/colaboradores/' + colab.id);
            if (fresh && fresh.santander_ficha_data) {
                colab.santander_ficha_data = fresh.santander_ficha_data;
                if (viewedColaborador) viewedColaborador.santander_ficha_data = fresh.santander_ficha_data;
            }
        } catch(e) { /* silent fail */ }
    }

    window._updateSantanderStepUI(colab.santander_ficha_data);
};

window.gerarFichaSantander = async function() {
    const colab = viewedColaborador || window._admissaoColabSelecionado;
    if (!colab) { alert('Selecione um colaborador primeiro.'); return; }

    const fmt = (v) => v || '—';
    const hoje = new Date();
    const dataHoje = hoje.toLocaleDateString('pt-BR');
    const mesExtenso = hoje.toLocaleDateString('pt-BR', { month: 'long' });
    const anoStr = hoje.getFullYear();
    
    // Salário formatado
    const salario = colab.salario ? parseFloat(colab.salario).toLocaleString('pt-BR', {style:'currency', currency:'BRL'}) : '—';
    
    // Endereço e Cidade extraídos corretamente do endereço do Colaborador (agora separado por vírgula e traço)
    let enderecoPuro = fmt(colab.endereco_completo);
    let numero = '—', complemento = '—', bairro = '—', cidade = '—', estado = '—', cep = '—';
    if (colab.endereco_completo) {
        // Separação típica: "Rua X, 123, Bairro, Cidade - SP, CEP"
        const parts = colab.endereco_completo.split(',');
        enderecoPuro = parts[0] ? parts[0].trim() : '—';
        if (parts.length > 1) {
            const part2 = parts[1].trim(); 
            numero = part2.split(' ')[0] || part2;
            if (part2.includes(' ')) complemento = part2.substring(numero.length).trim();
        }
        if (parts.length > 2) bairro = parts[2].trim();
        if (parts.length > 3) {
            const cidadeEst = parts[3].trim().split('-');
            if (cidadeEst.length === 2) { cidade = cidadeEst[0].trim(); estado = cidadeEst[1].trim(); }
            else { cidade = parts[3].trim(); }
        }
        if (colab.cep) cep = colab.cep;
    }
    
    // Data admissão formatada
    let admissaoFmt = '—';
    if (colab.data_admissao) {
        const d = new Date(colab.data_admissao);
        d.setMinutes(d.getMinutes() + d.getTimezoneOffset());
        admissaoFmt = d.toLocaleDateString('pt-BR');
    }

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Pedido de Abertura de Conta - ${colab.nome_completo}</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 10pt; color: #000; background: #fff; padding: 20px; }
  .page { max-width: 750px; margin: 0 auto; }
  .logo-area { text-align: center; margin-bottom: 16px; }
  .logo-area { text-align: center; }
  .logo-area img { width: 100%; max-height: 100px; object-fit: contain; object-position: center; }
  h1.titulo { text-align: center; font-size: 13pt; font-weight: 900; background: #e8e8e8; border: 1.5px solid #ccc; padding: 8px 0; margin: 14px 0 20px 0; letter-spacing: 1px; }
  .colab-label { font-size: 10pt; font-weight: 900; margin: 10px 0 4px; }
  .colab-nome { font-size: 14pt; font-weight: 900; margin-bottom: 18px; }
  p.body-text { font-size: 9.5pt; margin-bottom: 10px; text-align: justify; line-height: 1.5; }
  ul.docs { font-size: 9.5pt; margin: 4px 0 14px 20px; line-height: 1.7; }
  .data-box { border: 1.5px solid #555; margin: 18px 0; }
  .data-box-title { background: #d0d0d0; font-weight: 900; font-size: 10pt; padding: 5px 10px; border-bottom: 1.5px solid #555; }
  .data-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 3px; padding: 10px 12px; }
  .data-line { font-size: 9pt; margin: 2px 0; }
  .data-line b { font-weight: 700; }
  .assinaturas { display: flex; justify-content: space-between; margin-top: 50px; align-items: flex-end; }
  .assin-block { text-align: center; width: 45%; }
  .assin-line { border-top: 1px solid #000; padding-top: 6px; margin-top: 55px; font-size: 9pt; }
  .assin-label { font-size: 9pt; color: #333; margin-top: 3px; }
  @media print {
    body { padding: 8px; }
    .no-print { display: none !important; }
  }
</style>
</head>
<body>
<div class="page">
  <!-- Logo real da América Rental -->
  <div class="logo-area">
    <img src="data:image/png;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/4gHYSUNDX1BST0ZJTEUAAQEAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADb/2wBDAAMCAgICAgMCAgIDAwMDBAYEBAQEBAgGBgUGCQgKCgkICQkKDA8MCgsOCwkJDRENDg8QEBEQCgwSExIQEw8QEBD/2wBDAQMDAwQDBAgEBAgQCwkLEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBD/wAARCAC+BAADASIAAhEBAxEB/8QAHQABAAEEAwEAAAAAAAAAAAAAAAgFBgcJAgMEAf/EAGUQAAEDAwICBQUFEgoGBwQLAAEAAgMEBQYHERIhCBMxQVEUImFxgQkyUnKRFRYXIzM0N0JTV2KSlaGxwdHSNlRzdHWCk7KztCQ4VXaUohk1Q1ajpMKFw9PUGCUnREZHWGNmlvD/xAAcAQEAAQUBAQAAAAAAAAAAAAAABQECAwQGBwj/xABBEQACAQIDAwgHBgUEAgMAAAAAAQIDBAURMQYSIRNBUWFxkaGxFiIygcHR8BQVNFJT4SMzNUJyQ6Li8SRjYmSy/9oADAMBAAIRAxEAPwDamrNzzU2y4TEYHjyu4vbvHTMPZ4F5+1H51y1MzuHCLJ1sJa+4VZMdLGfzvPoHL2kKMNVVVFbUSVdXM+WaVxe973ElxJ5kkraoUOU9aWhp3Nzyfqx1LqyLVXM8ie9st0fSU7+XUUpMbdvAkcz8qs2se+SGaSR7nuc1xLnHck7dq5rrqfraX4jv0KQhFR4JEZOUp5uTLQREW8QYVz6YfZFxv+lKf++FbCufTD7IuN/0pT/3wrKnsS7DLQ/mx7UTfWGOkjr9RaN4+2itboqjJbmwijgdzEDOwzPHgO4d59RWXbpcqOzWyru9wmbDS0UD6iaR3Y1jGlzj8gK1W6oZ7cdTM4umYXF7962Y9RG4/UoRyjYPU3b27rSwawV7Vcqnsx8eo3dqsalhVsoUX/EnwXUud/L9ijX/ACC9ZTd6i+5Dcp6+vq3ccs8z+Jzj+oDuA5BU5EXdJKKyR4/KTm3KTzbOxn1OT1D9K612M+pyeofpXWiKM+tc5jg9ji1zTuCDsQVM7op9JytvVXT6Z6hVvXVUgDLVcZXedKR/2MhPafgu7T2HuUMF2U9RPSVEdVSzPhmheJI5GOLXMcDuCCOwgrUvbOne0nTn7n0ElhWK18JuFWpPhzrma+tOg3BIsd6B6kO1S0ytWS1L2mvazyWu25fT2cnO27uLk72rIi88q05UZunPVcD3K3rwuqUa1N+rJJr3hERYzMEREAREQBRA6YnSxqsLlm0u02rjHeXM2ulyidzowRyijP3QjmT9qNtuZ5SA111Nh0j0uvmbEMfVU0PVUMTuySqk82MHxAJ4j6Glairncq+83Gpu10qpKmsrJXTzzSHdz3uO5J9pXRYDh0bmbr1VnGOi6X+xyW1GLzs4K1oPKUtX0L9zolllnlfPPK+SSRxc973Euc49pJPaVwRF2x5ucj70esriuR96PWVxQHusl8u+N3WmvlhuNRQV9HIJYKiB5Y+Nw7wQtlXRO6TlNrVZX43kzo6fLrXGHTAABlbD2dcwdzgeTm93IjkeWsdXLpxnd400zW05tY5CKm2VDZSzfYSx/bxu9Dm7j2qNxPD4X9JrL1lo/h2Exg2LVMLrqWfqP2l8e1G5lQo6WfSornXCr0w01ujoYKfeC63Knfs6R/Y6GNw7AOxzh37gdizRrrrnQY5oCzPsZq/p+UU0UNpdv5zXTsLi70FjA4nwIWtR73yPdJI4uc4lznE7kk96gcAwyNWTuKy4J5Jdf7HRbW45KhFWdtLJyWba6Hol2+XafCSTuTuSiIuzPNS1sn/6wb/Jj9JVIVXyf/rBv8mP0lUhYnqTtD+VHsCIioZTbR0JP9WPDPiVv+cmWc1gzoSf6seGfErf85Ms5rzS+/FVP8n5nq+Hfg6X+MfJBERapuBERAEREBDbXRnBqjejt758Z/8ADarCWSde4D9EK51AHIStYfxGkfrWNl0dB50o9hxt5Hdrz7WERFlNYIiIAvo7V8X0dqIF3wfUWfFC5rhB9RZ8ULmtJk0tAiIhUIiIAro0xoDcM7s8PDuI6gTHcb7Bg4v0gK11lno+WR1Teq6+yM+l0cQhYT8N/b8gH5wsdWW7Bsy0Y79RIz0iIogmwiIgCIiAIiIChZpmFpwew1F9uz/MiG0cTSOKV/c1vpKh1nOe3/Pbq643ipd1bSeopmn6XC09wHj4nvV39ILOXZPl77NSSk0FmJgbseT5vt3ezs9hWLFN2duqcd96s5jErx1punF+qvEKk5b/AAauX83cqsqTlv8ABq5fzdykaP8AMj2ohLr+RPsfkYVREXTnmwWXOij9nnGP5Sb/AAnrEay30U3NZrvjT3uDWtfMST2AdS9at7+Gqf4vyJHCfx9D/OPmianSK16smhOGOus/V1V7r+KG1UBdzlk25vd3hjdwSfUO9auM6z3KtSMiqcpzC7zXCvqD76R3mxt7mMb2NaO4BXn0k9WKjV/Va65BHUuktdJI6itbd/NFOwkBwH4R3d7Vixa+EYdGypKUl6716uo6TH8XniNdwg/4cXwXT1/LqC5x9j/i/rC4LnH2P+L+sKWZAI4IiKoJg9EDpaXGw3Kh0t1JuLqi0VJEFsuEz930cnY2J5PbGewH7U7d3ZPwEEbhaQwS0hzSQRzBC2c9FHXFmaaFyXbKq7jrsOhfTXGZ586SGKPiZI495LBsT3lpPeuQx/DY08rmitXk119J3+y2MSq52dd55LOLfQtV7uY9HSx6TVFoJjDLfZhDVZbeI3eQQP5tp4+wzyDvAPJo7z6AVq0ybJ7/AJlfKvJMnutRcblWyGSeoneXOcf1AdgA5BV/WHUm76tajXrO7vO97rhUHyeMnlBTt82KNo7gGges7ntJVmKZwvD4WNJZr13q/gRGLYnPEKzyfqLRfHtYXnuH1o747f1r0Lz3D60d8dv61JPQjaftopSIiobgU3Pctv4f5r/Q8H+OFCNTc9y2/h/mv9Dwf44Ubi/4Kp2fFEng/wCNp/XMzY4iIvPj0AIiIAiIgCIiAIiIAiIgCIiALXp7o4z/AO1bHH//AMeYP/MzrYWtfnui8Zk1NsJA5sx+N3/mZ1N7P/jV2M5rax5Ya+2PmREREXenl4REQBERAFXKD6yh9R/vFUNVyg+sofUf7xRamGt7J3oiK81QiIgCIiA5wxPnmjgjG7pHBgHpJ2W33B7R8wMNsdlLeE0Vvp4HDwc2MA/n3Wsbo74NJqFrHjVhMXHTR1ba6sO24EEH0xwPxuEN9bgtqi4/aesnKnRXNm+/TyZ6NsLbNU6tw9G0l7uL80Re1ayF+QZpW8MvFT0LvJYQOwBvvv8Am3VmrnNJLUTSTykufK4vcSe0k7krjsVGxjupJHQzk5ycmfF11P1tL8R36F27Fdc7HOgka0bksdsPYrlqWPQs9F3+RVn8Wk/FTyKs/i0n4q3M0Q+7LoOhXPph9kXG/wClKf8AvhW/5FWfxaT8VXXpTbamXUjHQ+GRrW18chPD8E8X6lZUa3JdhloRlyseHOjOfS1v01h0JyA07yyS4CGg3HwZHgPHtYHD2rW0thPTdY92hFZIyThMVxpHevziNvzrXL5RN90Kk9nKado2vzPyRzm27lLEYp6KK82VFFTvKJvuhTyib7oVP8mzjd1lVZ9Tk9Q/Suteajmle57XPJHD+telWNZMNZBERC0mV7n/AH6aSiy7GZHExwSU1bEO4F4ex39xql4oY+5+0cxuuZV/B9JbT0cJd+EXSHb5ApnLgcaSV9PLq8ke0bJylLCKW91//phERRR0YREQBERAQ690eyGamxDFcZik2ZXV0tVI0HtEbAB+d6gMpme6bzTRV+CCN5aDFW77eO8ag55XU/dnL0DA0o2MMufPzPLtpISq4lN56ZeSKuipHldT92cnldT92cpfMgvs8ukrJ96PWVxXmoJZJY3GR5ds7luvSqriYZR3XkEREKGV8i1Gqcm0qwXC31D3NxttcHMPZvJKOD17NHLw3KsteoY/cLbjdovdTHw013E7qc+PVycLvz7LyqyjCEI5Q0zffm8/EwXlSpUq51Ncl3JJLwCIizGsWtk3/WDf5MfpKpCvuqt9FUGOWemY9xbtufWV0fMi2fxKP5CrN3PiSNO8hCCi0+BZaK9PmRbP4lH8hT5kWz+JR/IU3WX/AG+HQzZp0JP9WPDPiVv+cmWc1h7oi282zo74fTGHqg6Coma38F9RK9p9ocD7VmFeY334qp/k/M9kw171lRf/AMY+SCIi1TdCIiAIiICKms9OKnOb5D3uezb18DdliVwLSWuGxB2IWYdWvshXj+VZ/casZ3yhLH+Vxt813v8A0HxU7bSyil1HL39Pek5rmbKSiItsjAiIgC+jtXxfR2ogXfB9RZ8ULmuEH1FnxQua0mTS0CIiFQiIgPrWue4NaCSTsAO8qVGmmMfOpidJQSMDamUdfUcufG7uPqGw9ixHorghvt2GR3GAmgoHbxBzeUsw7PWG9vr2UhloXVTN7iJGzpZLlGERFpm+EREAREQBeS7VYoLXV1xOwp4Hy7+ppK9apuS076vHbnTR++lpJmD1lhVY8Wsyks0nkQSral9bWT1kp3fPI6Rx8STuuhfXNLHFjhsWnYr4unOGfEKk5b/Bm5fzdyqy66ingq4H01TEJIpBwvYewjwV0JbslJ8xirQdSnKC500YDRZp+dDGf9jU/wAh/anzoYz/ALGp/kP7VL/eVPoZyno7X/OvH5GFlVsbyiTDquqvcDnNmbb6unhc07Fj5YXxtcPUX7+xZT+dDGf9jU/yH9qoGoOF2wYFf7harZBFLQUgqDIN92tEjGnb8ZV+30qvqNPjw7y+GBXFCSqqazjx5+bj0EfUVI8rqfuzk8rqfuzlK5mD7PLpKuucfY/4v6wqL5XU/dnL0UNTO+fhfISC07hUzDoOKzzPeiIrjAFkfTvUufC9NNT8bjq3ROyOz09PA0Htf5VGx+3p6qST5FjhVe3YtX33GMovNKPpOP0MFXPy7Wvq4YgP/E3/AKpWGvCE4ZT0zXmsvE2rKc6dZSp65PyefgWWiIrzYC89w+tHfGb+tehcurZLC9sjQ4At7faqMug92WZQEVY8kpvuLU8kpvuLVTJmxy66CjqbnuW38P8ANf6Hg/xwod+SU33FqnF7mDag2957dY4GNZHS0NPx9+7nyu29XmfoUZjHCxqZ9XmiUwWop31NJdPkyfyIi8/PRQiIgCIiAIiIAiIgCIiAIiIAoC+6DtDtU7AHDcOx5g/8zOp9KA/ugpH0VMfHf877P8zOpvZ78cuxnL7Yf0uXbHzIezxGCV0Z7jy9S61VrlSmVnWsHnM7fSFSV3zPL6ct6OYREVC8IiIAq5QfWUPqP94qhquUH1lD6j/eKLUw1vZO9ERXmqEREARFfWjGld41fzyhxS2xPFOXCavqAPNp6YHznE+J7B4khY6lSNGDqTeSRko0Z3FSNKms5N5IlR0B9MZbdY7nqjcqYsfdSaG3Fw5mFjvpjx6C8cP9QqXKp9gsdtxmyUOP2embT0NugZTQRtGwaxo2H6FUF5nfXTvLiVZ8+nZzHuOFWEcNtIW0eZcet8/iQ1ulDJa7lVW2YbPpZnwu9bSR+peZZK1xxSSz5IL7BE7yS6ec5wHJswHME9245/L4LGq3act+KkaVSDpycWF9Z74L4vrPfBXlhxAC+7DwQdiIBsPBXno9QS12oNr6sHhpjJUSEdwaw/rIHtVmLPGgWLSUVuqcnqoi19cOpp9xz6oHmR6CQPxVhrz3IMzW8N+okUDptfYEuX8+pP761vDsWyHptfYEuX8+pP761vDsXTbN/g3/AJPyRwe2v9RX+K82ERF0ByB6aH6o74v617F46H6o74v617FhnqY5ahEWWujrohcdYsvj8pp5WY7bZGSXKpAIa4doha74TvR2Dn4LBWrQt6bqVHkkZrS1q3taNCis5SJYdDHBpsT0lZeKyEx1ORVBrtnDY9SBwx/KAT7VnxdNJSU1DSw0VHAyGCnY2KKNg2axjRsGgdwAC7l5xc13c1pVXzs94sLSNhbQto6RWXzfvYREWA2wiIgCIiAgV7p39fYH/JV36YlBlTm907+vsD/kq79MSgyvQcF/Aw9/mzzTHv6hU93kgiIpQhyo2z6k/wCMvYvHbPqT/jL2K5aGjV9thdlPTz1c8dLTQvlmmeI442Ddz3E7AAd5JXWpddB/o512R3+m1fy23mOzWx5faYpW/XdQOyUA/aMPYe9w9C1ry6hZ0XVnzeL6DYw+xqYhcRoU+fXqXOy8NfOj/Pi/Rhw409NxXTC4w+4hg33bU7Gc8u3hk4OfgCocLcfd7Tb77a6uzXWmbUUdbC+CeJ3Y9jhsR8hWr7X3RK96K5jNa6hkk9mrHultdbw+bLFv7xx7nt3AI9o5FQ2AYjyylQqv1s21158X4k5tfgztpRu6C9TJRfVlwT964e7rMYoiLpjhznJ7yL4v6yuC5ye8i+L+srgqIML32Cy12SXygsFsidLVXGpjpoWNG5LnuAH6V4FNPoUdH2oopItYcwt5je+M/MOCZuxDXDY1JB8W7hvocT3grTv7yFjQdWWvMulklhOG1MVuo0Iac76Fzv5dZK/Dsdp8RxS0YxSgCK10UNI3b8BoG/5lWUReZSk5NyerPcYQUIqMdEERFQuCIiAIiICLerX2Qrx/Ks/uNVnSRtlYY3gFrhsQe9Xjq19kK8fyrP7jVaCmKfsLsIKr7cu1lsXG3yUUm4BMTveu/UV41eEsUczDHKwOaeRBVAr7PLTbyQ7vi/O1bcKmfBkXWt3H1o6FOREWU1Qvo7V8X0dqIF3wfUWfFC5rhB9RZ8ULmtJk0tAiIhUK69P9P7lnFyEcYdDQQkGoqCOQHwW+LiqzgWj14yd0VxvDZKC2O2cCRtLK38EHsB8SpBWiz2yxUMdttNGymp4h5rG/pJ7SfStWtcKHqx1Nyhaub3p6HK1WuhstugtdugbDT07AxjWjb2n0ntJXrRFHakollwQREQBERAEREAXxzQ5pa4bgjYhfUQEI9TsXnxHNrpaZYyIuuM1O7bk6J/nNI+Xb1gq1VLfXPTGTOrIy5WiIOu9taTE3sM0faWb+PePT61EuaGWnlfBPG6OSNxa9jhsWkdoIXQWtZVqafOtTkb62dtVa5nocERFsGkEREAVeybFJY+jNqTmNSwBktJDRU245naoic93q96PlXZguEXfPL9DZrVEeEkOqJyPNhj35uJ/QO8rNXSnsVBjPRRyux22Pgp6S3wRt8T9Pj3J9JPNYZVlGvTprVyXmjdoWznQq1paKMu/Jmp5ERdmcUF6bd9cj4pXmXpt31yPilC2fssqiIivI8Ka/RG0KOWaAZ/V3Om4HZtTSW2ic4faRAlrx6OtPb4t9CjhoRorkGt+bwY5aoZY7fAWzXOtDfMpoN+fPs4jzDR3n0ArbHjWOWfEbBb8YsFGylt1sp2U1PC3saxo2HrPeT3kkrm8fxBUYKhTfrNpvqy4rxOw2Vwp16juqq9RJpdbfB9yNIN0ttZZ7lVWm4QOhqqOZ8E0bhsWvaSHD5QvKpudPbo01FBc6nXDCrc59FVAOv9PE3fqJezykAdjXcuLwPnd5UI1L2V3C9oqrD39TI2+s52Fd0Z+7rXSF2R/UpPW39a612R/UpPW39a2mah1oiIigW0ToCaay4Nom3ILhAY6/LKo3BwcNiKdo4IW/IHO/rqFHRY6Ot314ziHyqKWDFrTKyW7VgbycAdxAw/Dftt6BufDfbPQ0NJbKKC3UFOyCmpY2wwxMGzWMaNgAPAALl9ob2O6rWD46v4I6/ZiwlvO7muGi+L+B3oiLkjtAiIgCIiAIiIAiIgCIiAIiIAoDe6C/ZWsH+70f+ZnU+VAb3QX7K1g/3ej/AMzOpvZ78cuxnL7Yf0uXbHzIuqlV9F1ZM0TfNPaB3KqoRvyK788khNweaLcRVGrtp3MlOPW39ip5BB2I2IVpuRkprNHxERC4KuUH1lD6j/eKoarlB9ZQ+o/3ii1MNb2TvREV5qhEV/aTaJZ5rHdfIcVtjhRxPDaq4TAtp6cel3e7b7UblY6lWFGLnUeSRloUKlzUVKjFyk9Ei2sQw/Ic7yGkxfF7dJW3CteGRxtHJo73OPY1o7SStmugmiNm0SxBtnpnR1V2rOGW51obt10gHJrd+YY3nsPWe9fdEtBcO0UsYpLPA2ru1Q0eXXOVg62Y/Bb8Bg7mj27lZMXDYxjDvnyVLhBeP7HqmzmziwtfaLjjVf8At6u3pfuXWREUCdYUnJ8coMqs09muLN45Ru1225jeOxw9IUXssw+84dcnUF1gPCSepnaPMlb4g/qUt14L1Y7VkNA+23iijqad/MteOw9xB7QfSFno13S4cxr17dVlmtSHa+s98FmfIej3IXOmxi7s2PMQVe429AeAfzhWXPo9qJTTGMY+ZQOx8c8ZaflcFvxrU5c5Gyt6kXxRZY7EV827RbUCul6ua1R0bR2yTzs2+RpJ/MshYxoFabfKyqyOuNwe0g9RGCyLf095HyKkq9OPOVhb1J8xj7TXTSvzGuZW1sT4LTC4OklI263b7Rvj6T3KSlNTQUdPHSUsTY4YWBjGNGwa0DYBfaengpIWU1LCyKKNoaxjGgNaB3ABdij6tV1XmyTo0VRWS1MC9Nr7Aly/n1J/fWt4di3GXqxWTI6F1ryC0Udyo3uDnU9XA2WMkdhLXAjcK3voO6S/exxX8kU/7qnMLxqGH0OSlBvjn5HK49szVxe6VxCoorJLin1mpRFtr+g7pL97HFfyRT/up9B3SX72OK/kin/dUl6UUv033ohPQW4/WXczU7Q/VHfF/Wqxa7Pdr3VNobNbKquqHnZsVPC6Rx9jQtpsOkeldOSYNNsYYT2ltpgH/pVftljstli6iz2iioY/gU1OyJvyNAWGptLF8YU+9l8Ng6jl/ErLLqX7kGNI+hfmmVVUNz1C48ftAIc6DkaucfBDexgPiefoU3MSxHHsGsNNjeMW2KioKUbMjYO097nHtLj3kqsooC9xGvfP+I+HQtDsMKwO0wiOVBZyesnq/kupBERaJMBERAEREAREQECvdO/r7A/5Ku/TEoMrd9kuCYTmToH5diNmvTqUOEBuFDHUGMHbfh4wdt9h2eCon0DdF/vTYh+Raf8AcXSWGOU7O3jRcG8vmcriOz1S9uZV4zSTy5upI0uIt0f0DdF/vTYh+Raf9xPoG6L/AHpsQ/ItP+4tz0lpfpvvNL0UrfqLuZpttn1J/wAb9SunFsGzHNqxtBiWNXG6zOPDtTU7ngetwGw9pW3e3aU6X2gtda9OcYpHNdxNdDaadhB7NwQxXHSUNDb4hBQUcFNE3sZDGGNHsHJY57TJLKnT49b/AGLI7GuU96rV4dS/f4EI9BegPVCpp8n1qkjbFGRJFZKeTiLz2jr3jkB+A3t7yOxTboKCitdFBbrdSxU1LTMEUMMTQ1jGAbAADsC9CLn7y+rX096q+xcyOrw/DLfDae5Qj2vnfawrdzvAMV1Jx6fGcutUdbRTcxxDZ8T+57HdrXDxCuJFqxlKElKLyaNypThVi4TWaeqZrx1d6FeoWFVc9xweN+S2XcuYIhtVwt+C9n223i3t8Ao93G13K0VTqK7W+poqhh2dFUROjePY4brckqddcdx++x9Te7Hb7hGDvw1VMyUb+pwK6S22lq01u1473Xozir7Ym3rSc7Wbh1NZr3aPzNPEnvIvi/rKuDEdOc5zyqZSYli9wuTnnbjhhPVt9bz5o9pW1GLS/TSB4kh09xtj29jm2qAEf8quKCmp6WMQ0tPHDG0bBsbQ0AeoLPU2o4ZU6fHrZqUdhXvZ1q3DqXxb+BEzQjoRUlhqKfKdW5YK+sjIkgtER4oIyOYMrv8AtD+CPN9JUtmMZGxscbGta0BrQBsAB2ALki5y7va17PfrPPyXYdph+G22GUuSto5dL532sIiLVN8IiIAiIgCIiAi3q19kK8fyrP7jVaCmJUWGxVczqiqstBNK/m58lMxzneskbldfzsY1/wB3rZ/wkf7FuxulGKWRHysnKTeZD9FMD52Ma/7vWz/hI/2J87GN/wDd62f8JH+xXfbF0FPsL/MQxq7RS1O7wOree9vf7FSZ7LWwk8DRI3uLe35FOQ4zjZ7cftv/AAkf7E+djGv+71s/4SP9ivjiG7zGCeExnxzIHvikiO0kbmn0jZcR2qeRxfGiNjjtsPrpI/2Lr+dHE+352LT/AMFF+6sixJflMDwWXNPwIgQ8oWfFCqVBYb3cyG2+0VdRv2GOFxHy7bKW9PZLNSb+S2mih4uR6uBjd/kC9bWNYNmtAA7gFrO86Eb8bDLWRHCxaH5ndXMfXRQ22E7Fzp3bv29DR3+vZZZxTSHFMY4KiSD5o1jefXVDQQD+C3sH51fCLBO4nPgbFO2p0+OWbPgAA2A2AX1EWE2AiIgCIiAIiIAiIgCIiALF+p2hlkzkyXa1yMtt3PMyBu8cx/DA7/SPzrKCoOXZtjmEW83DILg2Fp+pxDzpJT4Nb2n9CyUpThLOnqYa8KVSDVXQiDk+mObYlM5l1sVQYmk7TwNMkRHjxDs9uytYgg7EbFZtynpPX+tkfDi1qgoYOYbJUDrJCPHb3o/OsT5BlV9yisFde63r5mjhBEbGAD1NACnqUqsl/ESRylxC3i/4Mm/d8f2KfTUlVWyiCjppZ5D2MjYXOPsCyVhHR/zLJ5o6i7wmz0BILpJ2/TXDwazt39eyoGK6s5rh8MdLaa+E08Z5RS07HD1b7cX51mTB+kxarjLHQZlQi3yPPCKuHd0O/wCEO1vr5rFcTrxX8NGa0p2k5LlZPyXf/wBGUsNwjH8GtYtlipBGDsZZXc5JXbdrj/8A4LG3TJ/1a83/AJpF/jxrMdNVU1bTx1VJPHNDK0OZIxwc1w8QQvNe7FZcltc9kyG00lzt9UA2elq4WyxSAEEBzHAg8wDz8FE0azp1o1Zccmn3M6OtQVShKjDhmml70aMkW536AGhn3nsM/IlN+4n0ANDPvPYZ+RKb9xdT6S0fyPwOP9FK36i7maYl6bd9cj4pW5T6AGhn3nsM/IlN+4vsWgWh0Eonh0gw5kg7HCyU4P8AcT0lo/kfgUlsnXay5RdzNQ1BbrhdallFbKGoq6iQ7MigidI9x9AaCSpD6PdCHVDUGqgr8vp34rYyQ6SSpZvVSN8I4u4nxdsB4HsWxuzYrjGOx9Vj+OWu2MP2tHSRwj/lAVUWpc7SVZrdoR3et8WZ7PY+hSkpXM97qXBfPyLT000vw7SbGosWwy2NpaVh4pZHedLUSbbF8jvtnfo7ldiIucnOVSTlN5tnX06cKUVCCyS0R11FPBV08lLVQxzQzMMckcjQ5r2kbEEHkQR3KD/SF9z6bcamoy3RGaGCSQmSew1DuGPftJgk+1+I7l4EdinIsTaw9JPT/SJjqGrqTdb2Ruy20jgXt8DI7sjHr5+AW7h1a6pVf/F4t83M+0jsWp2U6DlfNKK59Guz5c5qgzHTjO9P6x9DmWKXO0ysPDvU07msd6n+9PsKoEf1KT1t/Wpk530xtU8v62kt7LbZ6CTcdTHSsncW+BdKCPkAWA7w5twlmuNVBTuqJpeN72wMZuTuTyaAB7Au8tp3E4/x4pPqefw+LPLLu9soVMraUpLrSXx+CMe2aw3vIq1lusForLjVPIDYaWB0rz7GgqUWh3QCz/M6ynvOqPFjFjaQ91MdnV1QPghvZGD3udz8G94x1ZdWNS8cpWUOP51erZTxjZsVJVvhaPY0hVH6Pmtn318q/Kk37ytuaV5Uju0ZRj18W/IzWmJYfSkpV4Sl1cEvPM2gYRg2K6c43S4nh1ngt1tpG7Miibzc7ve49rnHvJ5qvLVD9HzWz76+VflSb95Sa6DepGfZrlWTUWX5hdrzBT2+KWFldVPmEb+s23bxE7cj3Llr3Aq1tSlcTmnlrrmdnhu1dte3ELSlScc+C0yXAmIiIufOuCIuEkscMbpZpGsYwbuc47ADxJQHNFhbUfpaaS6fmSigub7/AHJm4NLbdntYfw5SQwewk+hR+ynp36gXF72YrjtstMRPmumDqiTb8w/MpK3wm7uVnGOS6XwIG92lw2xbhOpnLojx/bxJ1ItZt16UOu92c4y6hV1O132tLHHCB6i1oP51bddrvrSHMc3VTKWnn2XSYf8AqUjDZuvLWa8SFlt1Z55QpyfcvibVkWqEa+62j/8ANbKfbdJv3l2N6QOtQ99qjk5/9qTfvK/0Yr/nXiU9Orb9KXeja0i1Wx6/awybD6KeUtPgbpN+8u36Oms3308o/Kk37ytezddazXiW+nlr+lLwNpqLVl9HTWb76WUflSb95Po6azffSyj8qTfvKno3W/OvEenlr+lLwNpqgN7oL9lawf7vR/5mdYr+jprN99LKPypN+8padFiy2fV7TeoyPVS00eXXWnuk1HDW3qBtZNHA2ONwja+QEhoc9527N3HxWSlZywOau6j3kuGS6zHVxentZB4dQi4SfHN6cOw1+otsn0ENG/vV4n+SIP3U+gho396vE/yRB+6tz0no/pvvRpegtz+rHuZqbXTPSQ1Hv27HxHattX0ENG/vV4n+SIP3VyOiWjpaGnSzFNh2D5kQfup6T0f033oqthrlcVWj3M1BzWuZm5icHj5CvK+GWPk+Nw9YW4T6CGjf3q8T/JEH7qfQP0a+9Vif5Ig/dVPSaj+m+9GZbF3S1qx7maeFXKD6yh9R/vFbZ36EaJye/wBJcQd67NT/ALi9NHozpFb+HyLTDFYeH3vBaIBt/wAqek9L9N96E9iriay5VdzNTtFQV1ymFNbqKeqmdyEcMZe4+wc1k3DujDrXmr2G34XVUUD9v9IuH+jsA8fO875AtmPkmLYlbZattJbLRQ0zC+R7Yo4I42jtJ2AAUaNU+nLZrRUzWfTK0NuskRLTcqrdtOT+Awec4ek7frVaeN3V6920pe9v/owV9mcOwqKqYjcPsSyb7NWNL+gZi1jdDc9TL06+1TdneQ0oMVK0+DnHz5P+UehSfs1ktGO22Cz2K201BRUzeGKCnjDGMHoAWuC/9KfXTIJHufnNTQRu/wCzt8bIA31Fo4vzqk0vSD1toZhPBqdf3OAHKarMrfxX7j8y17jCb+99avVT6uOXkZrPafB8MW5aUJJdPDN97z8TaGigVhHTj1Jsk0cOYUNFf6UcnuDBBPt6HN80n+qpcaV62YHq9bfK8XuXDVxtBqLfUbMqID6W7+cPwm7hQl3hdzZreqLNdK0Orw3aGwxR7lGWUuh8H8n7mX6iIo8mwiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIC1tRc9t2n2PSXisb1szj1dNADsZZO4eodpKhzlGU3jMLxNer1VOlmldybv5sbe5rR3AK7tdM1my3OKqnim3oLU40tM0HkSPfv9Zdv7AFjpTlnQVKG89WctiN269Rwj7KCIi3CNCIiAydo7q9W4LcGWq7TST2SoeA9hO5p3H7dvo8QpaU9RDVQR1NNK2WKVoex7TuHNPMEFa/VKLo15rLfMbqMZr5S+ps7gYXE83QO7B/VII9RCjL+3WXKx95OYVdve5Cb7PkZkREUUT4REQBERAERU7Ib1SY3YbhkFe4Np7dTSVMpJ+1Y0k/oVUnJ5IpKSgnKWiMHdKnpCv0ttTcRxWpZ881zhLusGzjRQncdZt8M7Hh38N/BQBrKyruFVLXV1TJUVE7i+WWRxc57j2kk8yVVs3y25Z1lt0y27yukqblUOmdufet7GtHoDQAPUqGvQsOsYWNFRXtPV/XMeIY7jFXF7lzb9RcIroXT2vnC6az63Pxh+tdy6az63Pxh+tSMdSGjqeBERZzIFLP3PP+GmWf0XD/AIqiYpZ+55/w0yz+i4f8VReNfgKnYvNE7sz/AFWj2vyZOhEWMddtcLFovjJragNqrzWNc23UIdsZH/Df4MHee/sC88pUp15qnTWbZ7Dc3NK0pSrVnlFasq2q2sOG6QWT5rZRW7zzAikooiDPUOHc0dw8XHkFA3WDpLag6sVMlK+tfaLHvtHbaSQta4eMru159fLwCx/meaZHn+QVOS5TcpKytqTzc4+axvcxg+1aO4BUNdvh+D0rNKc/Wn09HZ8zyTHNqLjFJOlRbhS6Od9vy07QiIpg5YLy132ntXqXlrvtParoal0dTyIiLMZAu2GofEdt92+BXUio1mUyzKlFKyVvE0+seC5qmMe6N3Ew7Fe+GZszdxyPeFilHIsayOxT66Cf2Ha7+naj/BhUBVProJ/Ydrv6dqP8GFQWP/g32o6vYv8Aqi/xfwJGIiLhz14IiIAiIgC6qqpp6KmlrKuZkUEDDJJI87Na0Dcknw2Xao3dNrUyqxTA6XC7TUGKsyWRzahzTs5tIzm4Dw4nFo9QcO9bFrbyuq0aMec0sRvYYdazuZ6RXe+Ze9kfOkp0ibpqvfJbDYqmSmxWgkLIYmnY1jgfqsniPgt7AOfasGoi9FoUKdtTVOmskjwy9va1/WlXrvOT+sl1BfXd3qXxfXd3qWY1T4qnjmSXzErzTZBjtymoa+keHxTRO2IPgfEHvB5FUxFRpSWT0KxlKElKLyaNmPR81wt+tGJ+Vysjpr5b+GK5UrTy4tuUjPwHc/Udx6TlVawuj5qXU6X6n2m9GVwt9XK2iuMe/J0EhDS71sJDh8XbvWzxrmvaHscC1w3BHeFwWL2Ksq/qezLivij2XZjF5YtafxX/ABIcH19D9/mj6iIoo6QIiIAiIgCIvhIaC5xAA5knuQAkNBJOwHaVR7bl1iu1d8z6OsBlex0sBcNm1DGu4XOjP2wa4bHbs3B7CCcIak6sV2o+W02jmmta5sdbUeT3K5xHl1Y5yNYR9qGg7nv22HI8731ewqoh08pqnC3Po7nh7W1dtfF78Mjbs9npBaNyDyJA3Wz9n3d1VHk5eHaaP2vf35Ulmo69fSl2IyiixhoprXbNUbZ5JWGKkv8ASMBqaUHYSDs6yMHmW79o7t/UsnrDUpypScZLibNGtCvBVKbzTCIisMoREQBERAEREARFx42fCHyoDkiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIvhc0ENLhuewb9qA+oiIAiIgCIiAIiIAiIgCtDUvVjBNI7NFfM6vQoYKiUQwMbG6WWZ/eGsaCTsOZPYFdk0sUET555GxxxtL3vedmtaBuSSewKFllt9T0wekPPlFUJDp5hMoipmuBDatzXbtaB4yOHE7wYAORKAmbbLjSXe3Ut1oJC+mrIWTwuLS0uY4Ag7HYjkewr0rixjI2NjjaGtaAGtA2AA7lyQBEVJyvKbHhWO1+VZJXx0dttsLp55nnsA7AB3uJ2AA5kkAdqA5ZJlOOYfa5L1lF6o7XQxcnz1UojYD4bntPoXlw7PMO1Atz7theRUV3pI39W+Smk4gx/g4doPrUY9PcWyHpa50dWtSKaaDT+0zuix+xyn6XVOaeb3t7HDfbicffEcPY3ZZd0ettqbqNqTeMct9PRWltbR2iKOmjEcT56aIiZwDeW4dJwH0sQGXUREAREQBERAEREAXivVX5BZ66tG+8FPJJy9DSV7Va2qj5Y9NcofBIY5G2iqLXA7EHqnc1fTjvTUelmOtPk6cp9CbITVE7qmolqJCS6V5eT6Sd117rBYvN225XSr/tnftT5s3f/alX/bO/au5+7H+Y8k9JIfpvvM6bosF/Nm7/AO1Kv+2d+1VXFrrc5cjt0ctxqXtdO0FrpXEEfKrZYc4xb3tC+ltBCrNQ3HxaWpl9Fy6yT4Z+VOsk+GflUdwOi4HFZT6OFykotR4qZrncFbTSxOA79hxD9Cxd1knwz8qyb0dqWas1LpZAXFtNTzSu8NuHb9aw3GXJS7DZs/xEMulEt0RFzh2IREQBERAFhvpdXiez6C5CackOrTT0RIPY2SZgd8rdx7VmRYV6YdBUV2gt8fTA70k9JUP27eATsBP51t2GX2qnn+ZeZG4y5LDq7jruS8ma5Nj4JsfBcutm+6u+Up1s33V3ylekHg/A47HwXRWfW5+MP1r09bN91d8pXLje+J4e4u5jtKJ5PMqssyioqrsPBNh4LJyhdvIpSln7nn/DPLP6Lh/xVGHYeClt7n9bZnXrL7vwkQxUtLTb7ci5z3u7fQGfnUXjNRfYanu80T2zHrYtRS6X5MlnnGY2jAcVuOW3yYR0luhMjhvze77Vg9JOwHrWsDUzUS/6o5fW5dkM5dLUO4YIQfMp4R7yNo7gB8p3Pes+dOLVSa75JS6YWuqIobQBU17WnlLUuHmNPoY09ni4+AUWVo4FYqhS5ea9aXgv3JHbDGJXdz9jpv1Ia9cufu07wiIp44wIiIAvLXfae1epeWu+09quhqXR1PIiIsxkCIiALlFIYnh49vpXFFQFUY4PaHNPIqffQT+w7Xf07Uf4UK19UUmxMR7+YWwXoJ/Ydrv6dqP8KFc/tCsrRrrR1GxiyxRf4v4EjERFwp66EREAREQBa/8Apw3eav1ijtrnExW62QsYPAvLnH9S2ALW300Zp2a+3hrZngeS0mwDjy+lBT2zsN+8fUn8DkNtZNYaornkvizD2x8E2Pgqb5TU/d3/AIxTymp+7v8Axiu43GeTbiKlsfBfXA8uXcqZ5TU/d3/jFVCCaYwMJlf2fCKtlFxDSSOWx8E2PguXXS/dX/jFOul+6v8AxiqFvA4tLmuDm7gg7gravpFe5cj0wxa9z79ZV2qne7c77ngA3/MtVXWy/dH/AClbTtFbXUWbSXErZVjaaC004fv4lgP61ze0mXJQfPm/I73YNy+0VktN1d+fD4l6oiLkD00IiIAiIgPhIaC5xAA5klRZ6QfSFdXmfB8Cr9qYEx19wid9V7jHG74Pi4dvYOW+9idOXpYXXGrodH9OK8QVMTQ++VzDuRxcxTN8NxzefSBy5rC+kt3Gq1wt9htkYZdaqZkElODvwknYvHi3bc+jv8VO2eGyhTV1VXDm+bOaxTFHKbtaGujfwRLfoh4C6Cir9QrhAQ6qJo6AuHaxp+mPHoLvN/qlSSc1rmlrgCCNiD2EKmY5Y6DFMeoLBQNbHS26nbC3u5NHMn1ncn1rGelOt8GeZ/k2MSSM8nil620OH28LPMePTzAePQ53goyq53U51VovIlrdU7CnTt5Pi/PV/XYRz1Zxq56Paqzz45NLRRGXy+2SRnbgjcT5g8Q07t27x2qTeiettr1QtjaGt4KS/wBLGPKaffzZgO2WP0HvHaPT2qkdKPT4ZXgpyKii3uGPkz8hzkpzykb7OTv6p8VroyjWi74xe6Z2n92kpK+3zNlNfCebXtPvG+I7ndxBI8VLULf70opL2lz/ADIOrXng128vYlxy+XYbf0WIOjBrzQa+abw395ihvlucKS8UrDt1c224kA+A8cx6nDuKy+oOrSlQm6c1k0dPSqwrwVSDzTPMbjQNuLbS6qjFY+E1DYSfPMYIaXAeAJA9q9Kg50p9e7jpF0tsMu1HI+Shs9oZFc6cHlLTVMzutb6w1jHt/Ca1TatlyobxbqW7W2oZUUlZCyeCVh3a9jhu0j1grNXtJ0KcKj0kszBb3cK9SpTWsXkelEXTWVdPQUk1dVzNigp43SyyOOwYxo3JPoAC1TbOBuVA24ttBq4vLXwOqRBxef1QcGl+3hu4Ddds88NNDJU1MzIoYml8kj3BrWNA3JJPIADvUGej1r7WardNG/3d9TIbXcrTPbLXET5sdLA8PjAH4R4nn0uKmtlFtqLzjN3s9I5gnrqGopoi8kND3xuaNyN9hufBbd1aStKkadTVpPvNS1u43dOVSnom13fMsXN9UtLsgw6+WG06wYdTV1wt9RS00xv1O0RyvjLWuJa/cbEg7jmoIfQA1E//AFc4J/8A3WX9q9D/AHNvX1zi4XrC+ZJ/6wqP/l18/wCja19/23hf5QqP/l10FrG0tE1TuFx6Umc9dSu7xp1Ld8OhtE+cW1T0vZbLRYfop4pW3BtPBScMN6gkfNMGtbs0ce7iXdned1c2RZfimIQw1OV5NarNFUOLIX3Csjp2yOA3IaXkbnbuC1/6f+58a4YtnWPZLcbxiD6W1XSlrJ2xV85eY45WucGgwAE7A7cwpIdMrQDN9f8AGMes2E1dop57VXS1M5uM8kTS10fCOEsY/c7+ICia1raxrxhGrnF55voJajdXcqE5ypZSWWS6TKf0atHfvrYh+W6b99e616n6a3yobSWbULGq+d52bFTXWCR5Poa1xK13/wDRta+/7bwv8oVH/wAuvFd/c6ukLbKGWspXYxdHxgkU1HcniV/xetjY3f8ArLa+7rB8FcI1vvK/XF2/mbQ0WrfQTpQaqdH3OYMC1GnuVRj8FS2iuFsuRcZrcN9i+Iu5t4d9+H3pHZtvutodNUQ1lPFV00gkhmY2SN7exzSNwR7FHX1hUsZJSeaejXOSNjf076LcVk1qnzFvHU/TYXj53jqBjgunXim8iN0g6/rt9ur6vi4uLfltturmWp6r/wBeFn+/kX+ZatsKuv7KNnuZPPeWZZh97K8381luvIKnXzIrBjNE65ZHe6C1UjeRnralkMYPhxPICjv0tul3R6G07cPxCOnr8xrIusIk86K3xOHmySAdrz2tb7Ty5GFGNaU9JPpZ3p+US+XXaNziw3a71Bio4Rv72PcHzR8GNp9Sz2mFOtT5evJQh0vnMN3iyo1OQoRc59C5jZQzpIaDSVXkbdWsZ63fbnXMDd/jHzfzq/LVd7TfKKO5WS6UlwpJebJ6WZssbvU5pIK11Te5mauMozLDnWJSVQbv1RfUtYT4B/Vf+lY7tGI9KDovajWq1WyC42mtvNbFSUwgk6+33J7nBrWEDdj99+w7OG/ctj7rtK6atqycuh/XzNf71u6DTuaLUelfXyNsqLz28VwoKYXMxGs6lnlBiBDDJsOLh37t99l6FAE+uJ5rlcqCz2+put0q4qWjo4nTTzSu4WRxtG7nE9wAXdFLHPEyaF7XxyNDmuadw4HmCFEH3RfWB+MYDRaV2er4K7J39bX8B85tFG4Hh9HG8AeppHer86EOsbdVdGqS3XGo475ipba60Odu6SMDeCX1Fnmn8JjvQt6VhUjaK65m8vd095oRv6crt2nOln7+juJCoiLRN8IiIDprKumt9JNXVkzIYKeN0ssjzsGMaNyT6gFFXRW/5LrNrFfte8kvkluwnEvKaGzxdcYqZzeEhz377B2zDxucftnN7A0BXB0yNRaqisVs0fx6ujprpmUhZWzudsKS3M5yvce4HY7n4LX+hcNL9Mmaj41aLTWW6e16V2JrWWq0P3jlv8jTxOraoDYiJ0m72xn32+57kBdztVNRtTJnwaH45QxWhjy12T39sjaWbbkfJoGbPlH4ZIb6D2qv6QZ5k+TSZFiudUtBFkeJ17aKslt4cKapY9gfHKxriXN3aeYJ7QVfU01rx+1PnldT0Fvt8Bc47BkUETG/IGgD8yxN0bhUZFR5XqxUwSQx5ve5KygbINneQxARQEju3a3f2oDMqIiAK1NS9S8Y0oxl2VZZJUtoxM2naKeB0r3yOB4WgDs32PM8ldaICPtt6XlJfHb4/ojqTcYT72aG1N6tw8Q4v2Vfh10z2t50HRxzdwPYaiWlh/TIVmNEBiD6LOs8p/0Xo4XH0eUZBTx/oY5dUmo/SNnO1H0ebdD4GfLIz+YQhZkXhvd6tmOWetv16q2UtBb4H1NTM8+bHGwEuJ9gQETNd9WOkPcY6LRd+BWO0XjNo3wwiguxqp2wAgPLtg0RtduRxHua/wAFdWk+H9JDSTC6LDMb0+wMQ0wL5p5rnMZaiV3N0j+HlufDuAAXp6Nljr9Scvv3SXyymkZNeXvoMcp5f/utvYduMeBd2cvB3wlI5AYfjvHSrd9Uw3T1v/tGp/YvVFd+k1/22G4Cfi3WpH/uysrIgMaR3jpDj6phGEn1XuoH/uCoyal5Pqh0o9SWaLWu12uC24xOai8+Q3OR1LUPYRuDOYgW7HdjfMcOLc8wFIvpPatx6RaV190pJtr1dD8zrVGPfGd45v8AUxvE71ho71ROinpTT6QaV/PBkrmRXu/R/NW7VEx2MEexcyNzj2cLTu78Iu8AgOzKMy1M01w63YtYdMsdoKquLLJYoaTIHzFkzmkNcIzSt4msAL3buHJpJKrOlVtzvTuxWLB6nTqN9Iw7V92ivjJnunfu6WokY6NjjxPJOwJI3A5r1YHbarPcpfq/fmSNpI45KPF6KRuwp6RxHHVkHskn2HqjawdpO2T0AREQBERAEREAREQBWrqp9jTKf6Iqv8JyupWrqp9jTKf6Iqv8JyyUf5ke1GC6/kT7H5GqNERennz2FV8S/hNbf5w1UhVfEv4TW3+cNVlT2JdjNi1/nw7V5maURFy56QFJHowYhLRWyvzCsi4TXkU9LuOfVtO7neou2H9UrD2mmnN01CvsdFAx8VBE7iq6rh82NngPFx7APTupl2q10VlttNabdC2KmpY2xRsA7AAo6/rqMeSWrJnCbVyny8tFp2nrREUQdEEREAREQBUTN8ap8yxC8YrVAdXdKOWmO/cXNIB9h2KraKsZODUlqi2cI1IuEtHwNQ99s1fjt6rrDdIXRVdvqH00zHDYh7XEH9C8Kmr0w+j5U33rNVcMt7pa6JgF3pYWbumY0bCcAdrgAA70AHuKhWQQdiNiF6NY3kL2iqkdeddDPC8YwurhN1KhPT+19K+tes+Lm36m/wBYXBc2/U3+sLbItHBERVKBbCujNjNPo/oLNlF/iMM1bHNfazcbObEGfS2/iNB9bio19GDo/VuqWRw5HkFJJFi9slEkrnDbyyRp3ELfFu/vj4cu/lKjpa3wY5oVeYKbaLy8w29gaNgGucNwPRwtIXN4xcxuKsLGD1az+XxO82XsJ2NvVxesssovd6+l/Be8165RkNfluR3LJro8uqrnVSVUvPsLnE7D0DsHoCpaIujSUVktDhZyc5OUnm2ERFUtCIiALy132ntXqXlrvtParoal0dTyIiLMZAiIgCIiA+tcWODh2g7rYb0EiDo5XEdhvtR/gwrXithXQKdxaL1h8L7UD/woVA7R/g/ejqtjf6ov8X8CSKIi4I9bCIiAIiIAtbHTU+z9eP5rSf4QWyda2Omp9n68fzWk/wAILodmvxb/AMX5o4/bb+nR/wA15MwWiIu6PKgqjT/UI/iqnKo0/wBQj+Ksc9C2Wh2Ii7aWlqa2pio6OCSaeZ4ZHHG0uc9xOwAA7SsRYlnwRdukOBV2pWollxOijcWVFS2SqeByipmHilcf6oIHpIHetqFPBFSwR00DAyKFgjY0djWgbAfIsEdFTQSXSrHX5HksLBkl5jHWR9vkkHa2Lf4R5F3p5c9tzntcNjV7G7r7sH6sfPnPYdk8Jlhlo51llOfFroXMvi+0IiKGOpCIiAK3tQ8wo9P8Fv8Am9e3jgsdunrnM32MhjYXNYPS4gNHpKuFYL6bdVPS9GbMeocR1sdNE8j4JqY9/wBizW1NVa0Kb52l4mG5qOlRnUWqTfgaoMgvtzye+XDI7zUOnrrnUyVVRIftpHuLj7Nz2KanubWkPlVzu+st2pd2UbXWu0lw5da4AzSD0huzP67lCzHbBc8pv1vxuzU5nrrnUx0tPGPtnvcAPZzW6PSTTq1aT6dWLAbQAYrVSMjll22M855yyn0ueXH0b7dy67HbpW9uqEdZeX1wOQwK1dxcOtPSPn9cS2OkhqAMJ09qaOjqRHcr2HUVPs7Z7WEfTHjv5NO2/cXBQ6wbK6rCMstuT0hJdQzte9oPv4+x7fa3dWL0y9drhnmutQccuDmWvEN7ZQOY7dssgO88hHYQ5+7fAtY1YyyfVqtvNmit1up3UcszNqyQO7fwWeAPbuefd6VhssMnChFNe1r1fSLMTv8Alrpyg+EeC937m5CirLNl2PQ11JLFXWu70gexzTxMmhkb6O4tK07dIfSms0a1bvuFTRuFHHN5VbpSOUtJJ50bh6ubT+ExwU3Pc59W/nn0+rtL7nVcVfi7+upGuPnOopHdg9DHkj0cTfQnui2kRyjT6i1QtVIX1+Lv6qsLG7udRSOA3PoY8g+gOJ8Vp4dOWGX8raej4fJkriMFiVhG5hquPzX10Ea+gRqHUYXrzQ2N07m0OVQPts8e/mmQAvid6w5pAP4RHetqa0saCzzU+tmCS05If88NA3l4GdgP5iVuhq6mKipJqyd20cEbpXnwa0bn8wVNoqSjcRmtWvIu2dqOVvKD5n5kJenfglj1VwaTWPB3NrK7B7hU2K+NjbvIyOKYxv4gOfmP2d8STi5DdXL7nnrcMxwOo0qvlTxXbFm8dE57uc9A48gPTG48J/Bcz0rEXQt1Rq8g1szLTW+0zq+yaiG41VRE7zmMl2ke9xB7nxl7T6eFYwnF/wChv0n9wyZ9Haa0PDRy8stcx7vE8BI+Mz0Fbbtd+jPD5+1Fb0fl35o01dqFaGIQ4Rk92Xz7smbZ1FH3QPWt+B6bM06sdZ1V4y4Oincx2z4aBpHWerj958UvUl6fLMeqsVjzaC5wusslCLi2rB8w05Zx8f4q1X3utyfpldJ0Q0TXtpbpW9RTDmW0NqhPvz4HgBcfF79h2gKLwi1VSs6tX2YcX2kri906dFUqXGU+C7PrgZ56Bmnlm03xb6OWdubSz5TXQWDHmSDzi2WYR8YB+HJyH4LCeYcFO5a4OnBqZV4dqHh+kmJ0j7fZdO4aKvp2DkJ6jZr43cu0MY1oB+E5/oWwG+Vs11wW4XGwulfLWWmWaiMXv3OfCTHw7d+5GypicJ1XC5n/AKmeXUuGXgMMqQpKdrD/AE8s+t8c/HgV5FqifaenJxu2o9TdtztyqF8+ZPTl/iepvyVCz/ci/WiYfvx/oyNryKInQWo9eqW8ZcdZYcpjgdTUnkHza6zhL+OTj4OPv24d9vQsu9IzpE2jo7WS0Xq745WXdl3qn0rGU0zYywtZxbni7VG1bOcLj7PTe8+rn4ZklSvYTt/tFRbq6+3Iy8ihR/0nmFfeuvf/ABsX7F4rx7p9ZG0MnzA0prn1haRH5ZcWNiae4ngaSR6Bt6ws6we9fDk/FfMwPGLJceU8H8jGPukNttVJrXbayiZG2rrbNE+s4dgS5r3NaT6eEfmU+dC5aufRfBZq8uNS/Hbe6Uu7eIwM33WszCsW1S6Z2trrzemPmjnnjku1bHEWUtBSNPKNm5O3mjha3cuJ5nfmVtjttvpbTbqW10MYjp6OFkETR9qxrQAPkC3MXyo0KNq3nKK4mlhGde4rXUVlGWhqnq/9eFn+/kX+Zatomd5VSYPhl7zCu2MNnoZqxwPfwMJA9pAC1d1f+vCz/fyL/MtWwDpeiqPRuzoUm/H8zd3bfA6xvF/y7rJikFUq28Ho0l5GPCpunSuJrVNvwNemg+nl26VfSAnqMurZ5aWpnlvV8n4vOdEH79U093ES1g+C3fbs2W2Cz2e1Y/a6ay2S3wUVBRRNhp6eFgayNgGwAAUBvcwzRfPJm4dw+V+RUvD49Xxu329uy2CrXx2tKVxyP9sUsl7jYwGlFW3Lf3SbzfvC89Xb6CvMLq6igqDTStnhMsYf1cjex7d+xw7iOa9CKE0JzULpraylt1HPcK6dkNPTRummkedmsY0bucfQACV3KMHT71hj090k+c22VfBeswc6lY1p86OjbsZ3nw33awfHPgVntqErmrGlHnMFzXjbUZVZcxDbI6nIumR0n5KW1PfDT3erdTUbnDdtFbYGnz3DuPA0vI73v2HaFW+ivm9w6O3STlwrKpjSUVfWPx65iQ8LI5Os4YpTvyAD+Hn3NcSs7e5t6S/MrGbtq9c6Xae8uNutrnDmKeN301w9DpAB/UVi+6P6QtsmWWvWCzUvBT3xgornwDkKuMfS5D6XRgN9cY7yuq+00qtxLDf7Mt1dq+u9HJ/ZatK3jiX9+9vPsf13M2IosNdEzVsawaL2e9VdT1t2tjfmXc9zu4zxNGzj6XMLXe0rMq5KtSlRqOnLVcDr6NWNenGpHRrMLrqJ4KWCSqqZWRQwsMkj3nZrWgbkk9wAVsajanYjpVaKe+5pWzUlDU1TKQTMgdI1j3b7F3COQ5HmsUdInWHGrxpYzHtPcys9dcM0qYrNTywVsbhDFJ9Vkfsd2NDAd99u1YzIYr0xwyu6Uut+Qax5CJo8IoKjyKhp3gtNdFGQY4jv2M5B7/Eu4fFTTjjip4mxRsZHHG0Na0DZrWjuHgFhW16uaAaHYdasGtGZUFebbAymhpLU4VlTUy7ec4ti3HG925O5HMrwVVLrHr/I2kr6Su04wN/1eMvAvN0j+CduVOwju5n19gA680vtX0icpqNJcMmmbhlqnb89d7hcWsqSDv5BA8e+JI89w7B7N88UFBRWqhp7ZbaWKmpKSJsMEMTQ1kcbRs1rQOwAABeDFMTx7CLFS41i1rht9uo28MUMQ+Uk9pce8nmVjjVHpFWTB7pUYli9kqcryemgdUVFDSPDIaKIDcyVMx3bE0Ajt58x4oDLyLDHRi1yyHXTGrve7/jNPa3W6u8likpXudDOC3cgcW53by357ecOxZnQBFSMsymy4TjlwyrIattNb7bA6eaQ+A7h4knYAeJWPOjxrNetbcdvOXXHG4bPa4bk+mtjhIXOmhaASXk8uIEjcjYd3cgMtIseY3rxpvl2dzae47d5K64Qsld18UJNLI6Lh6xjJfeuc3ibuB4hZDQBR36StwuGpGU470bsZrHxSX5zbjkE8XM0ttjdvsfS4tOwPg3fkVnPKcjtmH45csovM7YaK100lVO8nbzWjfb1nsHpKw90YsQulbBe9c8xiPzwZ7UGqhY8c6S3DlBEPDcAH1cA7igM0WSzW3HbPRWGz0raaht8DKanib2MjaNgPkHavcsY6r9InTTR+rp7Vk1xnqLrUtD47fQxddOGnsc4D3oPdvzK9emGvWmOrgbBh+QMlr+qfPJb5mGOpjYxzWuc5h7t3N5796AyGiK1NVM3p9OdPL9mc5bvbKKSWFrux8220bfa4hARyyugk6RPSzgxpx63E9M2CW4HfeOSpDgTH4cRfwtPoif4LNNc9msl2fYqIudhFoqQ24zs3bHd6mMg+TRn7eBjgOsI81xBZzAcsI9FnTzOr/gLjcoK2w2zJKuS6X65zebX3oOJ4IYT2xQkEudIfOdxEN2BLlLO2Wygs1vp7VaqSKlpKWMRQwxN4WsYOwAID0MYyNjY42BrWgBrQNgB4Bcl47vd7dYbdPdrrVNp6WnbxPe7c+gAAcySSAAOZJACpGLSZPc6ipv9946GkqWtZQ2pzG8cEY59ZM7t6x3wQdmjYczuUBcaIiAIiIAiIgCIiAK1tUwTprlAAJJtFVsB/JOV0r45rXtLXNBB5EHsKuhLckpdBjqw5SEodKaNQHkVZ/FJv7Mp5FWfxSb+zK28fM+g/iNP/Zt/YnzPoP4jT/2Tf2LqPSX/ANXj+x576A//AGP9v/I1D+RVn8Um/syqxiFBXOya2htHOT5Q3sjK2wfM+g/iNP8A2Tf2L62homODmUkLSDuCIwCFbLaTei1yfj+xkpbCclUjPl9Gn7P/ACILWzE8nvM4p7Xj9wqZCQNo6dxAPpO2w9qythfRnv8AXzR1WZVLLdTdrqeJ4fM4eG481v51JkADsAC+qGqYhUksorI6yjhFKDzm8/Aptgx6z4xbIrRY6GOlpoRsGsHae8k9pJ8SqkiLRbbebJVJRWSCIioVCIiAIiIAiIgPhAcCCNwe0KOGtfQ4xzOqqoyTBKiKxXiYl81OW/6JO/x2HONx7yOXoUkEWxbXVW0nv0nkzSvsPtsSpclcxzXiux8xq4zXQbVnAah8V/wq4OhaeVVRxGpp3Dx449wP62x9CsryGtY17H0c7XAgEGMgrb3tv2rzut1ve7jdQU5d27mJu/6FPU9pJpZVKab6nl8zja2wdJyzo1ml0NZ+Oa8jVPjOmmoOY1LKTGcNu9we8gB0dK4Rjf4UhAa0ekkKS+k3QbrTUwXfVmvjjhYQ/wCZVHJxOf8AgySjkB4hu/rUyGMZG0MjY1rR2ADYBclr3OP3FZbtNbq733m9YbF2VrJTrt1GuZ8F3c/fkeS1Wm22O3U9ps9DBR0dKwRwwQsDWMaOwABRz6eNU6LTGz0rSdp7u3cDvDY3lSXUaOnjTyP0zs1UwkdRd27keDonhaOFvO9pt9JK7RLdwmso/l+RBHY+BTY+BXLrpfur/wAYp10v3V/4xXoR4jwOOx8Cmx8CuXXS/dX/AIxTrpfur/xig4HHY+BTY+BXLrpfur/xinXS/dX/AIxQcDjsfAryVzXeZyPevb10v3V/4xQySEc5HH2q6LyeZVZIpHC74J+ROF3wT8iq3G/4bvlTjf8ADd8qv5Qu3kUnhd8E/InC74J+RVbjf8N3ypxv+G75U5QbyKTwu+CfkThd8E/Iqtxv+G75U43/AA3fKnKDeRSeF3wT8i2B9ASQu0buUZG3V5BUD5YID+tQS43/AA3fKtgPQdpnw6KvneD/AKTeKqQE94DY2/paVBbQzzs8utHWbGetifD8r+BINERcKethERAEREAWt3poUtTLr5d3xU8r2+S0nNrCR9SC2RLpko6SZ3HLSwvce9zASpDDb/7urOru58MtciHxvCfvi2Vvv7uTTzyz6etdJpx8hrf4nP8A2ZTyGt/ic/8AZlbjPmdb/wCI0/8AZN/YnzOt/wDEaf8Asm/sU76U/wDq/wB37HKegf8A7/8Ab/yNOfkNb/E5/wCzKqdFbLlPHFFBb6mR7hsGsicSfYAtvPzOt/8AEaf+yb+xfWUVHE4OjpIWEdhbGAQqS2n3l/K8f2KPYLPWv/t/5GtLAujTrBqBKx1DidTbaJxHFWXNppowPEB3nv8A6oKmPof0W8P0lcy+XBzb3kXDsKyVm0dP4iJh7D+Eefq5rNqKJvMZuLtOHsx6F8WT+F7LWOGSVXLfmud83Yv+2ERFEnShERAEREAWOekXhlTqDofmeKUMJmrKu1SyUsYHN88W0sbR6S5jR7VkZfFfTm6U1Nap5llSCqwcHo1ka4fc6dG35NnVfqteKX/6uxgeT0PG3lJXSDmR/Js3J9L2+BUxOlJq3T6N6NXvJGVDWXSsj+Z1qZv5z6qUEAj4jeJ59DPSFfeE4JjOnlolseKW5lFRzVk9c+NvfLM8vefVudgO4ADuWuf3QrVr59NV48Bt1V1ltxBhhkDXbtdWSAGT2tHCz0EOCnKTeM4gpP2V5L5sg6iWDYe4p+s/N/JEVpZZJ5XzzPL5JHFz3OO5cSdySuKIu0OLMl9HPVSq0d1esOZRzObRNm8kuTAdhLSSkNkB9XJ49LAe5bhrlQWfLsdqbZWxxVlrvNG+CVp5smglYQR6QWu/OtFy2l9ArWF+o+j8eL3eq6y8Ye5tA8udu6WkI3gefHYAsPxAT2rmdobVuMbmGq4P4HTbPXSUpW09HxXx8CKei2hF3xrpoUWntbBI+HGLlJcTI4e/pYwXwyb+neP2rYVrpkAxbRzMr9x8JpLLVOafwjGWj85VdhwnGYM0qdQorXG2/VduitctWPfGmZI57W+vidzPaQ1o7AFhTp7ZIMf6Nt7p2ycMt5q6S2x+nikEjh+JE9RNS6eJ3VJPqXjxJWnarDLWq0+l+HBEWvc2rAbjrRd8geziFqssjQT3PmkY0H5GuHtWe/dB9Fm5vpzDqVZ6IPvGJAmocxvnS0Dju8HxDHeePAF/iVZ3uYmP9XY81yh7NjNU01Cx3iGtc9w/5m/Kpu1lHS3CknoK6njqKapjdDNFI0OZIxw2c1wPaCCQQs+I3kqGJcrD+3Ly4mDDbONfDOSl/dm/Hh5Gpmk6UmQ0nRmn0Hj6/wAplreqbW8XJlsIL3wjv3Mmw8OEkKVXuduiz8Vweq1YvdEY7jk46mgD27OZQtd74eAkcN/SGtPeFHK5dEm6RdKtmi1JBP8AMOpqPmlFUnc8Nq34iS7xA+l797tu8raNbbdRWi3Utpt1OyCkooWU8ETG7NjjY0Na0AdgAAC2MWuqVOiqVv8A6nrP66zXwi1q1Kzq3H+n6q+uo10e6Y435BqtjWUMj4WXayeTOO3vpIJn7n8WaMexTV6NeQ/PRoNg13MnG82anp3nfc8UTeqO/p8xR4902x/yrBMRyVjN3W+5zUrjt2MljB/TG1XP0IcyqHdFOtnpntdV40+4sj4xu0FrDKwEeHnBYLhcvhdKS1i8vP8AYz275DFaseaSz8v3JVotX7vdF+kK15AixbYEj/qx/wD8RP8ApGekL9xxX8mP/wDirH9wXfV3/sZfSCz6+42gKFvunf8AALC/6XqP8ELGOnvT914yfPMdxu5xYyKS6XSlo5zHbntf1ckrWu4T1h2OxKyd7p3/AACwv+lqj/BCvtLGrY31KNXLjnp2Fl3fUr6wqypZ8Mte0tnof9FTRvV7RqDMc2stZU3N9xqqd0kVa+NpYwt4Rwjl3rDHS56Nk+gWaQXPH6SWfD7u4PoJZSXiCVvN9PIfHvBPa0+IO0xvc8f9XKl/piu/S1Zr1W0zx3V3BbnguSw8VNcI9o5QAX08w5slb6Wnn6eY71keKVbW/mptuGbWXV1dhjjhdK6sIOEUp5J59fX2mP8AoiaiYBqDpFQVGEY/bLBPQbU91tdDEI2w1QHN+3a5r9uIOdue4k7LNy1OYDlefdCrXyqtV+jkdSQy+R3WnZv1NwonHdk8e/fts9p7Qd2ntcFtSx6/2jKrFQZJYa2Ort1ygZU008Z3a+Nw3BWjiln9nqcpB5wlxTN3Crz7RT5KaynDg18TVfV/68LP9/Iv8y1bRs2xejzbELziNft5PeKGajeSOwPaRv7N91q4q/8AXhZ/v5F/mWrbEtrGW48i1+VGpgkVJV0/zM1I6LZ5feib0g5YMroJmU9HUSWe+U22zjTOcPprPhcOzZG/CHLfzt1tesF/s2U2ekyDHrlBX2+ujEtPUQv4mPae8H9SwD0ruiPa9eqVmTY5UU9szCih6qOeQbRVsY5tilI5gj7V3PbfvCg7Yc56TPRGvtRYw26WWLjJlt9wgM9vqPw2b7sO/wAONwJ7N+S2KtKnjcFVpSSqpcU+f6/7MNKrVwSbpVYt0m+DXN9f9G3BeK43m02h9JHdLlTUjq6obS0zZpAwzTO96xm/vnHwC1vS+6Ua1PpOqixvF46jbbrvJ5SN/Hh6z9asmx1XSj6VGo9rv1NNc7nV22qiqKarLPJrdbOBwcHjYBjNtgeW73bfbFasMCrRzlXkoxXPmbM8eoyyjbxcpPmyNsZIaC4kADmSVqg11ym6dKLpNiy41M6oo5a2OxWlzfOa2nY8h0o9BJe/1KbPTI1br9KdBp6U10bMkyWEWmJ8BLeFz2f6RKzvADeLY9xcO9YE9zb0eFdd7trPeIN4reHWu0hzeRmeAZpR8VuzB8d/gr8MirO3qX09dI9v18SzE5O8uKdjDTWXZ9fAnRhmKWnBcTtGHWKnENBZ6OKjgaB9qxoHEfEk7knvJJVs68aXUmseld+wObq21NZTmSglf2Q1bPOicfRxAA+glZARQkas41FUT455+8nJUoTpuk1wyy9xrC6CuqFw0n1sqdOsjc+koclebbVQS8uor4i4RE+B342H4w8Atnq1jdPfS+s0z1mpdRbAySloso/06GeLl1NfEW9YAR2Hmx4+MfAqeHR51XptZ9JrHmzXMbXSw+T3KJv/AGVXH5sg27gT5w9DgpnF6ca8IX1PSSyfb9cPcQuD1JUJzsamsXmuz64+8yBcbbbrvRS227UFPW0k7eCWCoibJHI3wc1wII9ahJf+jLb871WzO8aS49ZYLXictPSttlfx+R3OuLS+oiaWuBiDQWDly3I7Oe0z8rvsWL4veMlnifLHaaCornsYN3PEUbnkAd5PDsrQ0Bx6aw6W2iav8643pr7zcHkEF9RUu612+/PlxAegABQRPFgaK5ho7YLizFbnprbtNM0YOrko6umYw1HdvT1RH01p8N9/X2mQQII3B5KhZhgmH5/an2bMceorrSv7GzxgujPwmPHnMd+E0gqwLdo/n+Ct8m0y1bro7Y0/S7XkUHzShhHwWSktla0dzeLYICu645tesIwOefFafyjIrtPFarPFy51cx4WOO/LZvN3Ply58lgDTXos6o32yTWXVS8R47Zqyo8qu1HbqgT198n33L6qpBIDNydmgnt7AeZzBlWC6wZBYYK25XrGq+/2G6U12s8VNSy00Ejow8SRSl73nz2u2BHvT4qr0WY60XSIQDRyns9Tts6e43+CSAHxAgD3u9RAQF4YpieOYJj1JjGL2yG3WygYWxQxjYDnuXE95JJJJ5klUmqz1lzqX2nBKNt8rmu4JKgOLaGlPeZZgCCR8BnE4nl5o5inHTm95SWSam5VLcqZruL5j20Oo6Bx8JeF3WTj8F7uA97VfFFRUVupY6K30kNLTwtDY4oYwxjB4Bo5AICCvSyzO9Zfntu0IocqM0YniqL7VyO6qnbNtuG8G5DI4mEvIJJJI3JLQVkPDaK6aw2ih0q0olrMb0jx6IUdfe42mKpvj2n6bHB3hj3lxc/v4juOfCrEwPoY6h5vqlecq1tDaK2OuM1TKIalr5Lm5zy7ZhYT1cRB7TsdtgAO6b1qtVtsduprRZ6GCioqONsMFPAwMZGxo2DQByAQGFRi2P4b0g9PMZxy2w0Ftt2K3VlNDG3YAmSLiPpce0ntJKzqrD1E0+umR3uwZpit1p7fkONvmFM+piMkE8EzQJYZA0hwB4WkEHcELzXmTUCCw112zbJrVYLVQ00k9Y6zMe6d0bWkuDZZeUZIHaGk+BB5oDH/SEddNXcwsfR6xS4RxQzPbeMnqB57aejicCyJ4HaXP2Iae0hu+w3KyjmuR0GjulN0yLgkqYcctjnwxyOJMr2jhjYT3AvLR6AfQrB6K+FOocbuWp9ytgorjnNT5dDC7cvgt45UzHOPnOJZs8uJLnF3E4kkrNtVS0tdTSUdbTRVEEzSySKVgex7T2gg8iPQgIF6EOz/OqmuzDCsYlueeZDUSuuGX3mLhoLJCTsGUwO5kk4fAchs0bjdZV6FmmlNbJsv1Qnr5rpPd7nU2+juFQ0CWpgjlJkmI57dbIOIjc+9A3O26k7SUVHb6dlJQUkNNBGOFkUMYYxo8AByCxph+lub6f2kYhh+cW+mx6nnnlpG1Fq66qgZLK6Qs4+sDXbF52Jb2dqAyVXV9DbKWSuuNZDS08Q3fLM8Ma0eklR012vjtXsxwXRa009bDZ75XPudyq5GBgqKWl2dsxjvOLC77ZzQDty4tjtmq26f22GtZeMguFdkVyZzjqLk8OjhPjFA0NhiP4TWcXi4rGl/p6S2dL/HLtdHCCGvw6opKCSRxDX1LKhxexu/IHq3g7DxQGbaKkjoaSKjidI5kLAwOkeXOO3eSe1dN4vFssFunu14rYqWkp28Uksh2A8APEk7AAcyTsFQ8u1IxbDmRw11aau51J4KO10Q66sqpO5rIm89vFx2aO0kBU+yYvfsjulNluokcDJaU9ZbLLE/rIKAkfVJHdks+3Li96znw97iB22a2XLMLhBleT08lNQ07+ttFpkbsY/g1E475T2tZ2MHi7ci9ERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAWFul/YX3zQ28SRMLn22WGt5duzXgH8zis0qmZPYaPKccueN3Bu9Pc6SWkk9DXtLd/WN91ntqvIVo1Ohpmpf2/2u1qUPzRa70ajEVRyKxV+MX64Y7dIyyrttTJSzD8JjiCfUdtx61Tl6WmpLNHgMouEnGSyaCIiqWhERAF97vavi+93tQqfEREKBERAEREAWzPow2B+O6HYvRyM4ZJ6d1Y8Hxle5/6HBa58KxmuzPLrPitujL57pWRUzdh70OcOJx9AbuT6AVtgtVuprPa6S00beGCjgZBGPBrWgD9C5naSslCFFc7zPQNg7VurVunolu9/F+SPWiIuSPSwiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgOMjS9jmNe5hcCA5u27fSN+S1b9IfoYavYHe7plVoirM0s9VPLWS19PGX1bONxc508Q3JO5JLm7jtPJbSkW9Y39Swm5Q4p6o0b7D6d/BRnwa0Zodc1zHFj2lrmnYgjYgr4t12WaLaTZ1O+qy3TyxXKok9/US0bBM71yNAcflVs0nRM6OVFOKiDSay8YO44xI8fI5xC6GO0lHL1oPP3HPS2brJ+rNZe81I4lheWZ3d47DhuO194r5eyCjgdI4D4TtuTW+JOwC2M9C/oo5fonVVmcZtfOouV0pPJvmPTODoo2FwdxSv+2eNuQbyG55lScx/F8axOiFtxfH7daKUc+poqZkLCfEhoG59KqijL/G6l3B0oR3Yv3sk7DBKdpNVZy3pL3JBeG7WOzX+mbR3y00dwgY8SNiqoGysDwCA4BwI32JG/pK9yKETa4om2k+DPDabFZbBA6lsdoorfC93G6OlgbE1zuzchoA3XuREbb4sJJLJHkNothuwvpoIPmi2nNIKrgHWiEuDjHxdvDxAHbxC9aIqZ5jJI8V1stnvtMKO92qkuEAcHiKqgbKwOHYdnAjdddtx2wWaklt9oslBRUs5Jlhp6dkbJCRseJrQAdxy5qooq7zyyzG6s88i2/obadn/APAmP/k2H91Poa6d/wDcTH/ybD+6rkRXcpPpZbycOhFvwae4FSzx1NNhViimicHxyMt0LXMcDuCCG8iFULvj9hyCKOG/WWhuMcTi6NtXTslDCe8BwOxVQRU35N55ldyKWWR47XaLTY6UUNmtlLQUwcXiGmhbEziPaeFoA3XsRFRtviyqSXBFIu2I4pfqgVd7xm1XCdreASVVHHK4N8N3AnZe632632mjjt9roYKOli3EcMEYjjZudzs0chzJPtXpRHJtZNhRSeeRRDhOGm4/Nc4nZzXdZ13lPkUfW9Zvvxce2++/fvuq2iI5N6sKKjogvHc7Rab1TGivFspa6nd2xVMLZGfI4EL2IibXFBpPgyyGaH6PR1XlrNMsaE++/H8zot9/kV30VBQ22nbR26igpYGe9igjDGN9QHIL0IrpVJz9p5lsacIeykim3jGsdyHqvm9Ybfcuo36ryumZLwb7b7cQO2+w+Rd9stNrstI2gs9tpaGmaS4Q00LY2AntPC0AL1ord55ZZ8C7dWeeXEIiKhU8F3sFjyCFlPfbNQ3GKJ3GxlVTsla12224DgdjsvtpsdlsMDqWx2ijt8L3cbo6WBsTS7xIaAN17kVd55ZZ8Cm6s88uJ8c1rgWuAII2IPeEAAGwGwC8F/v9nxay1mQ3+viordb4nT1E8p2axg7/ANQHeVgjVrXu/VOkmQX/ABDAMzt1K6i4qO/SwwU7GbuHDKGOl6wMO/I8O/PsWWjQnWaUenIxVq8KKbl0Zkh0VPtMj6XH6Oa5VG74qON08sh7wwcTnH5SVjs6/W6a1VOVWrAcruOL0nWOkvVPTQ9S6NhIfLHG6USyRjYkuDOwEgFWxpSnnuoulVhDLeZlRFTqfIbPV4+zKKeuZJa5KTy1tQ3ctMPBxcX4vNWXp/rGNRZKKrs+n2UU9juQe6kvNVDA2nka0EhxaJTI1ruHZpLe0jfZUVObTllwQdWCaWfFmRUVu51nuNac2J2QZRWPhpzKyCGOKMyTVEzzsyKNg5veT2ALEGoeruY3Gowujt+D5disFzym3QOrK0U8bZ4DKOOJzWSuc3ibvyI+RZKVvOrpoWVbiFLg9egkCip2RZBaMVslbkV+rGUlvt8Lp6iZ3Y1g9HefQrAfrxQ0MFFeMjwLKbHYLhPFBBd66CEQtdK4NjdKxkrpImuJaAXN7xvsrIUp1FnFF86sKbykzKCw30gauTKazF9EbfI7r8xruuuXAfqdqptnzk+HGeBg8QXLMfbzCwxpzUW3LOkBqJk1TVRSV2Ow0mOUVOXefBT8PXTP4e3Z8jmjf8ArGZDMlPTw0lPFS00bY4oWNjjY0bBrQNgB7AuxYQ1+uWX2XNNM5LBl9bQUV2yektlVb4GtayeNzi57nu7TyAG3Idqzess6e5CM89TFCrvzlDLQIsCYnDW6zZbnE2T5zfLXDjl4ktNFaLXcHUfk8TGNIqJCzZzy8uO2/m7N9auHo+ZJkV1pMtxrIbzLefnTyKqs9LcpgOtqIWHzesI5F7ewnxWSdu4Rbz4rLP3mOFypySy4PPL3GWlQMxwPEs+oIrbl1kguMMEnWw8e7Xwv+Ex7SHNPpBCxbda656j683zTW6ZTdLHZsctdLUwUluqzSzXKSYcTpTI3zyxm/Ds09rTuvTpDeL9aNWM40qqchrb9ZrJTUNfQVVbL1s9N17TxQPk7XjluCefIo7ZqLefFJPLqeXzCuU5JZcG2s+tf9GQsS02wfBesfi+O0tHNKNpKjYyTyDwdI8l59pVzLC2pF7vGRa1Y9pG7KazHLLVWie7VE1HKIai4yskaxtMyXtaACXnh5kNK4YvJeMD14h03ocput6sF3sEt06i5VRqZaGeKYM82V3ncL9zyJOxaUVu93PPjlnl1B3K3ssuGeWfWZsREWsbIREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAQX6b+lsthy2m1JttKfmffNoKxzRyjq2t5b/HaN/W0qMK2x6g4PaNRsQuOH3uMGmr4uEP23MUg5sePSDsVq/wBQMEv+m+V12JZHSmKqo5CGu+0mj+1kYe9rhz/N2rtsDvlXo8jJ+tHxX7aHku2GDuzund016lTwlz9+veW4iIp044IiIAvvd7V8X3u9qFT4iIhQIiIAiK7dL9OL7qnmNFidjhcXTuDqmfh3bTwAjjkce7YdnidgrJzjTi5yeSRko0p16ipU1nJvJIkN0FtL5Ky712qdypj1FE11Dbi5vJ0rh9MePU08O/4RU01RsOxSz4PjNuxSw0zYaK2wiGNoHNx+2cfFziSSfElVleeX9272u6vNzdh7lguGxwqzjbrXVvpb1+XYgiItIlQiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIDEnSisd4vuktVHaLXPc20VfR19ZQwDifVUkUzXSsDftvNG+3oVidIbWDDs30Su1iwGplvFXc4IhLT09O8Gjg42lzptwBGRyaGnmSeQPNSWXSykpIw8MpYmiQ7vAYBxHxPitqjcRpqO9HPdea49mvcata3lUct2WW8snw7fmUbNrNWXvBr1YbXJ1dVWW2emgdvts90ZDefrWBdM6vRhunFtx3NsoyGw3W20TLZdbNW5RdKUslY3gexkAnDXRu23AjaW7OA2HMCTK6ZKKjmlE8tJC+Qdj3RguHtVtKvuQcHnrnweRdVocpNT4aZcVmUOBmJYDg0ccMXkmO2miAawskm6unA7weJ7hsee+5WG9LcksuP6rUuAaS3l1+wi60lVXz00bXvix+VvnNEcpGwjkcSOqJ80nlsFIUgOBa4Ag8iCuuClpqYOFNTxRcR3dwMDdz6dlSFZRjJSWefX49qKzouUouLyy6vDsZhzX5xsmVacZ9drdU1uN45eJpLqIYXS+TGWB0cNS5jQSWxyEOJAO23jsrf1T1EsGoGW6bWrCppLvRU+VUtVXV8ETvJ4CGuLI+MgBzzzOw34Q3ntuN5Dua1zS1wBBGxB7CF1x0tNExscVPExrTxNa1gAB8QFfTuIxUc1m1mlx6f8AssqW8puWUsk2m+HRl8jG/SQxu75Vo9e7XZKSerqWOp6s00Di2SeOGdkj42kc+ItY4DbvVp0H/wBHXPLRQWmty+9V4ur6eIWavym6vlM3G0sjkpnzkgteG++bsCN+7dZ5XS2io2zGobSQiU9sgjHF8varadw4Q3OPB58Hl9aFalupz3+HFZcVn9anZHGyNjY2DZrQGgegLx0Visltr626W6z0VLWXJzX1lRDTsZLUuaNmmRwG7yByG++y9yLXNkwnr5DLVai6OU7Inva3KXTvLWkhoZFvufDmVmxcXRseWucxpLebSR2epclknU34Rj0fPMxQp7k5Sz1+WRg7pD2DTyx0UeYMwCju2c3KeOhsgjjcJKirJHA+UMID2M5OJfuAAB3q+tG9OY9LsBoMYfVeV15L6u5VZ5mprJTxSv3PMjc7DfnsBur1dHG9zXvja5zPekjcj1Lkr5V5SpKl9dXcWxoRjVdX66+8xfrxZNJocWqc61IxKnu0lnhLaTga8VUrz7yBjoyHHicezfhG5J5bro6Oun1fh+JVGQZDRx02QZVM2410LBsKWMN4YKYeDY2ctvEuWVZI45RwyxteAd9nDdck5eXJcl9dg5CPK8r8PEszVPFdNr9jc901KsFHcKCzxvqhLKw9bCAOfVvbs9pOwGzSN+Sx70acHnay46r3Syi0m/xspbFayDvbrRG4mJh358UhJkdvzJdueZIGc3sZI0skYHNPaCNwV9AAAAAAHYAka8o0nTXP5dglQjKqqr5vPtPqIiwGcIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCxN0gtBbRrRjw6p0dHkFA1xoKwjkf/wBqTxYfzHn4rLKLLRrTt5qpTeTRr3VrSvaMqFdZxepqOyfF77ht7qsdyS3S0NfRvLJYpBt6iD3g9oI5FUpbQdYdDcN1ks5o75T+TXGFpFJcoWjroD4H4TfFp9mx5qBOrXR/1B0iqXSXq2vq7SXcMV0pWl0DvAO+5n0O9m67jD8WpXqUZcJ9HT2HkWN7NXOFSdSC3qXT0dvz0MaIiKWOZC+93tXxfe72oVPiIiFAiLK2kHRx1B1cmirKKidbLIXefc6phbG4b8+rHbIfVy8SsVatToR36jyRsW1rWvKipUIuUnzIsXDMLyPP8gpcZxa2yVldVODQ1vvWN73vd2NaO0krY9oVolZNFsX+Z1M5lVd6wNfca7h2MrwOTW94Y3nsPWe9VHSjRvDNILI2141RB9TI0eV18zQZ6l3i49w8GjkPzq+1xeKYtK9/h0+EPM9X2d2ahhK5evxqvuj1Lr6X3dZERQp1gREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAXVVUtNW08lJWU8U8ErSySORgc17T2gg8iF2ogaz4MwLqF0NdKsydLWWSOfGq6Tch9EA6Eu9MTuW3xS1R7yvoP6t2SR77BU2u/U4J4TDN1MpHpY/lv6nFT+RSlvjF3brJSzXXx/c5692Wwy9e84br6Y8PDTwNW140G1isRPzR08vQAO3FFTmUH8TdUb6GuovvfnCyLff/Zc/wC6tsSKQjtJVy4wXeyEnsHbN+pWkl2J/I1c2bQLWS/cJt+nl44XHbimgMQHPbnx7bLJuJdBvVS9SskyW4Wuw0x5u4pDUTbehjPN39bgp8osNXaG5msoJLxNm32Hw+k86spS9+S8OPiYN086H+k+DvirbjRy5HXx7HrrgAYg7xbEPN+XdZvhhip4mQQRMjjjAa1jGgNaB2AAdgXNFD1rircS3qsm2dTaWNtYw3LaCiur49IREWE2giIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiID//2Q==" alt="América Rental">
  </div>

  <h1 class="titulo">PEDIDO DE ABERTURA DE CONTA</h1>

  <div class="colab-label">COLABORADOR:</div>
  <div class="colab-nome">${fmt(colab.nome_completo)}</div>

  <p class="body-text">Prezado (a)</p>
  <p class="body-text">Escolhemos o Santander como nosso parceiro para o processamento do pagamento do seu salário.</p>
  <p class="body-text">Conforme determinam as Resoluções nº 3.402 e 3.424/06, do Conselho Monetário Nacional, seu salário será creditado em uma conta de registro, denominada 'conta salário', que não é movimentável por cheque, não admite créditos de outras naturezas que não salariais e possui serviços limitados.</p>
  <p class="body-text">Você também poderá aproveitar as vantagens de ter uma <b>CONTA CORRENTE</b> e transferir automaticamente o seu salário, possibilitando assim fazer uso de diversos outros serviços e condições diferenciadas oferecidas pelo Santander, que acreditamos que tenham um valor diferenciado para você. Para conhecer as vantagens de uma conta corrente compareça a uma agência até a data da sua admissão e apresente o original e uma cópia simples (frente e verso) dos documentos abaixo indicados:</p>

  <ul class="docs">
    <li>Esta carta;</li>
    <li>Documento de identidade com foto;</li>
    <li>CPF – Cadastro de Pessoa Física;</li>
    <li>Comprovante de endereço residencial (onde prefere receber correspondência) com prazo inferior a 60 dias da data de vencimento. Ex.: conta de luz, de água, de gás, de telefone fixo, IPTU;</li>
    <li>Se casado (a), apresentar nome completo do cônjuge, número do CPF, data de nascimento e data do casamento.</li>
  </ul>

  <p class="body-text">Se a sua opção for apenas pela utilização da conta salário, você poderá realizar a portabilidade de salário para outra instituição ou utilizar o cartão de débito, fornecido sem custo*, para os serviços mensais gratuitos** disponíveis para a conta salário. Procure a agência Santander de sua conveniência e fale com o gerente que está apto a orientar-lo e a prestar todas as informações necessárias para a movimentação da sua conta.</p>

  <!-- Dados do colaborador -->
  <div class="data-box">
    <div class="data-box-title">Dados do Colaborador</div>
    <div class="data-grid">
      <div class="data-line">Declaramos que o Sr (a) <b>${fmt(colab.nome_completo)}</b></div>
      <div class="data-line">CPF: <b>${fmt(colab.cpf)}</b>&nbsp;&nbsp;&nbsp;Admissão: <b>${admissaoFmt}</b></div>
      <div class="data-line">Endereço: <b>${enderecoPuro}</b></div>
      <div class="data-line">Nº <b>${numero}</b>&nbsp;&nbsp;Complemento: <b>${complemento}</b></div>
      <div class="data-line">Bairro: <b>${bairro}</b></div>
      <div class="data-line">Cidade: <b>${cidade}</b>&nbsp;&nbsp;&nbsp;Estado: <b>${estado}</b>&nbsp;&nbsp;&nbsp;CEP: <b>${cep}</b></div>
      <div class="data-line">Cargo: <b>${fmt(colab.cargo)}</b></div>
      <div class="data-line">Salário Mensal: <b>${salario}</b></div>
    </div>
  </div>

  <!-- Assinaturas -->
  <div class="assinaturas">
    <!-- Bloco empresa: linha + nome abaixo (espaço para carimbo físico acima) -->
    <div class="assin-block">
      <div class="assin-line">
        América Rental
      </div>
    </div>
    <!-- Bloco colaborador -->
    <div class="assin-block">
      <div class="assin-line">${fmt(colab.nome_completo)}</div>
    </div>
  </div>

</div>
</body>
</html>`;

    // Salvar o HTML globalmente para poder via via "Ver Documento"
    window._santanderPreVHtml = html;

    // Registrar no backend / interface
    if (colab) {
        colab.santander_ficha_data = new Date().toISOString();
        const log = document.getElementById('santander-status-log');
        const logText = document.getElementById('santander-status-text');
        
        if (log) log.style.display = 'block';
        if (logText) logText.textContent = `Ficha gerada em ${new Date().toLocaleString('pt-BR')}`;
        
        // Exibe o botão de visualização
        const btnVer = document.getElementById('btn-ver-santander');
        if (btnVer) btnVer.style.display = 'flex';

        // Atualizar visual do Step 2 para 100% (sempre, independente de _admissaoChecklist)
        window._updateSantanderStepUI(colab.santander_ficha_data);

        try {
            // Salvar santander_ficha_data diretamente no colaborador (endpoint correto)
            await fetch(`${API_URL}/colaboradores/${colab.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${currentToken}` },
                body: JSON.stringify({ santander_ficha_data: colab.santander_ficha_data })
            });
            console.log('[Santander] Data salva no banco:', colab.santander_ficha_data);
        } catch(e) { console.error('[Santander] Erro ao salvar data:', e); }
        
        if (typeof showToast === 'function') {
            showToast('Ficha gerada com sucesso! Use o botão Visualizar para imprimir.', 'success');
        } else alert('Ficha gerada com sucesso! Use o botão Visualizar para imprimir.');
    }
};

window.verFichaSantander = async function() {
    // Se tem cache: usa direto
    if (window._santanderPreVHtml) {
        const win = window.open('', '_blank', 'width=820,height=900');
        win.document.write(window._santanderPreVHtml);
        win.document.close();
        win.focus();
        return;
    }

    // Se não tem cache mas a ficha já foi gerada: regenera silenciosamente
    const colab = viewedColaborador || window._admissaoColabSelecionado;
    if (colab && colab.santander_ficha_data) {
        // Mostrar loading
        const btn = document.querySelector('[onclick*="verFichaSantander"]');
        if (btn) { btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Gerando...'; btn.disabled = true; }
        
        try {
            // Reutiliza a função de geração, mas sem exibir toast de sucesso
            window._silentSantanderGen = true;
            await window.gerarFichaSantander();
            window._silentSantanderGen = false;
            
            // Agora o cache deve estar preenchido
            if (window._santanderPreVHtml) {
                const win = window.open('', '_blank', 'width=820,height=900');
                win.document.write(window._santanderPreVHtml);
                win.document.close();
                win.focus();
            }
        } catch(e) {
            alert('Erro ao regenerar documento: ' + e.message);
        } finally {
            if (btn) { btn.innerHTML = '<i class="ph ph-eye"></i> Visualizar'; btn.disabled = false; }
        }
        return;
    }

    alert("Gere o documento primeiro.");
};

// Funçao mockup caso nòo exista _recalculateAdmissaoFinalProg
if (typeof window._recalculateAdmissaoFinalProg !== 'function') {
    window._recalculateAdmissaoFinalProg = function() {
        const bar = document.getElementById('admissao-progress-bar');
        const pc = document.getElementById('admissao-pc-total');
        if(bar) bar.style.width = '30%';
    }
}


// ============================================================
// ABA MULTAS — MOTORISTAS (v2 — Novo Fluxo de Processo)
// ============================================================

window._recarregarListaMultas = async function(colabId) {
    var tabContent = document.getElementById('tab-dynamic-content');
    if (tabContent && typeof window.renderMultasMotoristaTab === 'function') {
        tabContent.innerHTML = '';
        await window.renderMultasMotoristaTab(tabContent);
    }
};

window.renderMultasMotoristaTab = async function(container) {
    const colab = viewedColaborador;
    if (!colab) return;
    container.innerHTML = '';

    const btnNova = document.createElement('button');
    btnNova.className = 'btn btn-primary';
    btnNova.style = 'margin-bottom:1.5rem; display:flex; align-items:center; gap:6px;';
    btnNova.innerHTML = '<i class="ph ph-plus"></i> Registrar Nova Multa';
    btnNova.onclick = () => window.abrirFormNovaMulta(colab.id, container);
    container.appendChild(btnNova);

    const listaContainer = document.createElement('div');
    listaContainer.id = 'multas-lista-container';
    listaContainer.innerHTML = `<div style="display:flex;align-items:center;gap:8px;color:#94a3b8;padding:1rem 0;">
        <i class="ph ph-spinner ph-spin"></i> Carregando multas registradas...
    </div>`;
    container.appendChild(listaContainer);

    let multas = [];
    try {
        multas = await apiGet(`/colaboradores/${colab.id}/multas`) || [];
    } catch(e) {
        listaContainer.innerHTML = `<div class="alert alert-info"><i class="ph ph-info"></i> Nenhuma multa registrada ainda.</div>`;
        return;
    }

    listaContainer.innerHTML = '';
    if (multas.length === 0) {
        const vazio = document.createElement('div');
        vazio.className = 'alert alert-info';
        vazio.innerHTML = '<i class="ph ph-traffic-cone"></i> Nenhuma multa registrada para este colaborador.';
        listaContainer.appendChild(vazio);
    } else {
        multas.forEach(m => window._renderMultaCard(m, colab.id, listaContainer));
    }
};

window._renderMultaCard = function(m, colabId, container) {
    const statusColor = { pendente:'#f59e0b', doc_gerado:'#3b82f6', testemunhas_assinadas:'#8b5cf6', assinado:'#10b981', confirmado:'#8b5cf6' };
    const statusLabel = { pendente:'Pendente', doc_gerado:'Processo Iniciado', testemunhas_assinadas:'Testemunhas Assinadas', assinado:'Assinado', confirmado:'Confirmado' };
    const cor = statusColor[m.status] || '#64748b';

    const card = document.createElement('div');
    card.style = 'border:1.5px solid #e2e8f0;border-radius:12px;padding:1rem;margin-bottom:1rem;background:#fff;';
    card.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;">
            <div>
                <span style="font-weight:700;font-size:1rem;color:#1e293b;">🚦 ${m.codigo_infracao || '—'}</span>
                <span style="margin-left:8px;color:#64748b;font-size:0.85rem;">${m.descricao_infracao || ''}</span>
            </div>
            <span style="background:${cor}20;color:${cor};font-weight:700;font-size:0.78rem;padding:3px 10px;border-radius:20px;">${statusLabel[m.status] || m.status}</span>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:6px;margin-top:8px;font-size:0.82rem;color:#475569;">
            <span><b>Placa:</b> ${m.placa || '—'}</span>
            <span><b>Veículo:</b> ${m.veiculo || '—'}</span>
            <span><b>Data:</b> ${m.data_infracao || '—'} ${m.hora_infracao || ''}</span>
            <span><b>Valor:</b> ${m.valor_multa || '—'}</span>
            <span><b>Pontos:</b> ${m.pontuacao || '—'}</span>
            ${m.processo_iniciado ? `<span><b>Tipo:</b> ${m.tipo_resolucao === 'indicacao' ? 'Indicação' : m.tipo_resolucao === 'nic' ? 'NIC' : '—'}</span>
            <span><b>Parcelas:</b> ${m.parcelas || 1}x</span>` : ''}
        </div>
        <div id="multa-actions-${m.id}" style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap;align-items:center;">
        </div>
    `;
    container.appendChild(card);
    window._renderMultaActions(m, colabId, card.querySelector(`#multa-actions-${m.id}`));
};

window._renderMultaActions = function(m, colabId, actionsDiv) {
    actionsDiv.innerHTML = '';
    const assinFinalizado = m.assinaturas_finalizadas || m.status === 'assinado' || m.status === 'confirmado';

    // ── Botão Iniciar / Processo Iniciado ──
    if (!m.processo_iniciado) {
        const btnIniciar = document.createElement('button');
        btnIniciar.style = 'background:linear-gradient(135deg,#f503c5,#8b5cf6);color:#fff;border:none;border-radius:8px;padding:6px 14px;cursor:pointer;font-weight:700;font-size:0.85rem;display:inline-flex;align-items:center;gap:6px;';
        btnIniciar.innerHTML = '<i class="ph ph-play"></i> Iniciar Processo';
        btnIniciar.onclick = () => window.abrirPopupIniciarProcesso(m, colabId);
        actionsDiv.appendChild(btnIniciar);
    } else {
        const btnPI = document.createElement('button');
        const processoTravado = !!(m.assinatura_testemunha1_base64);
        if (processoTravado) {
            btnPI.style = 'background:#e0f2fe;color:#0369a1;border:1.5px solid #7dd3fc;border-radius:8px;padding:6px 14px;cursor:not-allowed;font-weight:700;font-size:0.85rem;display:inline-flex;align-items:center;gap:6px;opacity:0.6;';
            btnPI.innerHTML = '<i class="ph ph-check-circle"></i> Processo Iniciado';
            btnPI.disabled = true;
        } else {
            btnPI.style = 'background:#e0f2fe;color:#0369a1;border:1.5px solid #7dd3fc;border-radius:8px;padding:6px 14px;cursor:pointer;font-weight:700;font-size:0.85rem;display:inline-flex;align-items:center;gap:6px;';
            btnPI.innerHTML = '<i class="ph ph-check-circle"></i> Processo Iniciado';
            btnPI.onclick = () => window.abrirPopupIniciarProcesso(m, colabId);
        }
        actionsDiv.appendChild(btnPI);

        // ── Botão 👁 Visualizar ──
        const btnEye = document.createElement('button');
        btnEye.style = 'background:#dbeafe;color:#1d4ed8;border:1.5px solid #93c5fd;border-radius:8px;padding:6px 10px;cursor:pointer;font-size:0.85rem;display:inline-flex;align-items:center;gap:4px;';
        btnEye.innerHTML = '<i class="ph ph-eye"></i>';
        btnEye.title = 'Ver Documento';
        btnEye.onclick = () => window.verDocumentoMulta(m.id, colabId, m.tipo_resolucao || 'indicacao');
        actionsDiv.appendChild(btnEye);

        // ── Botão Testemunhas ──
        const testemunhasOk = m.assinatura_testemunha1_base64;
        const btnTest = document.createElement('button');
        if (testemunhasOk) {
            btnTest.style = 'background:#d1fae5;color:#065f46;border:1.5px solid #6ee7b7;border-radius:8px;padding:6px 12px;cursor:not-allowed;font-weight:700;font-size:0.85rem;display:inline-flex;align-items:center;gap:5px;opacity:0.7;';
            btnTest.innerHTML = '<i class="ph ph-users"></i> Testemunhas ✓';
            btnTest.disabled = true;
        } else {
            btnTest.style = 'background:#f3e8ff;color:#7c3aed;border:1.5px solid #c4b5fd;border-radius:8px;padding:6px 12px;cursor:pointer;font-weight:700;font-size:0.85rem;display:inline-flex;align-items:center;gap:5px;';
            btnTest.innerHTML = '<i class="ph ph-users"></i> Testemunhas';
            btnTest.onclick = () => window.abrirModalTestemunhas(m, colabId);
        }
        actionsDiv.appendChild(btnTest);

        // ── Botão Assinatura do Condutor (só após testemunhas) ──
        if (testemunhasOk) {
            const condutorOk = m.assinatura_condutor_base64;
            const btnCond = document.createElement('button');
            if (condutorOk) {
                btnCond.style = 'background:#d1fae5;color:#065f46;border:1.5px solid #6ee7b7;border-radius:8px;padding:6px 12px;cursor:not-allowed;font-weight:700;font-size:0.85rem;display:inline-flex;align-items:center;gap:5px;opacity:0.7;';
                btnCond.innerHTML = '<i class="ph ph-pen"></i> Condutor ✓';
                btnCond.disabled = true;
            } else {
                btnCond.style = 'background:#fef3c7;color:#92400e;border:1.5px solid #fcd34d;border-radius:8px;padding:6px 12px;cursor:pointer;font-weight:700;font-size:0.85rem;display:inline-flex;align-items:center;gap:5px;';
                btnCond.innerHTML = '<i class="ph ph-pen"></i> Assinatura do Condutor';
                btnCond.onclick = () => window.abrirModalAssinaturaCondutor(m, colabId);
            }
            actionsDiv.appendChild(btnCond);
        }
    }

    // ── Excluir (apenas pendente/doc_gerado não assinado) ──
    if (!assinFinalizado && (m.status === 'pendente' || m.status === 'doc_gerado') && !m.assinatura_testemunha1_base64) {
        const btnDel = document.createElement('button');
        btnDel.style = 'background:#fee2e2;color:#dc2626;border:1.5px solid #fca5a5;border-radius:8px;padding:6px 10px;cursor:pointer;font-size:0.8rem;display:inline-flex;align-items:center;gap:4px;';
        btnDel.innerHTML = '<i class="ph ph-trash"></i>';
        btnDel.onclick = () => window.excluirMulta(m.id, colabId, btnDel);
        actionsDiv.appendChild(btnDel);
    }
};

// ─── Modal: Formulário de nova multa (SEM tipo/parcelas) ──────────────────────
window.abrirFormNovaMulta = function(colabId, container) {
    let modal = document.getElementById('modal-nova-multa');
    if (modal) modal.remove();
    modal = document.createElement('div');
    modal.id = 'modal-nova-multa';
    modal.style = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;padding:1rem;';
    modal.innerHTML = `
        <div style="background:#fff;border-radius:16px;padding:2rem;width:100%;max-width:680px;max-height:90vh;overflow-y:auto;">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.5rem;">
                <h3 style="margin:0;color:#1e293b;font-size:1.1rem;"><i class="ph ph-traffic-sign" style="color:#f503c5;"></i> Nova Multa de Trânsito</h3>
                <button onclick="document.getElementById('modal-nova-multa').remove()" style="background:none;border:none;font-size:1.5rem;cursor:pointer;color:#64748b;">×</button>
            </div>

            <div style="border:2px dashed #e2e8f0;border-radius:10px;padding:1.5rem;text-align:center;margin-bottom:1.5rem;cursor:pointer;background:#f8fafc;" id="multa-upload-area">
                <i class="ph ph-file-pdf" style="font-size:2.5rem;color:#ef4444;display:block;margin-bottom:8px;"></i>
                <p style="margin:0;font-weight:600;color:#334155;">Anexar Notificação de Autuação (PDF)</p>
                <p style="margin:4px 0 0;font-size:0.8rem;color:#94a3b8;">Clique ou arraste o PDF — dados serão extraídos automaticamente</p>
                <input type="file" id="multa-notificacao-input" accept=".pdf" style="display:none;" onchange="window.processarNotificacaoMulta(this, ${colabId})">
            </div>
            <div id="multa-loader" style="display:none;text-align:center;color:#64748b;padding:1rem;">
                <i class="ph ph-spinner ph-spin" style="font-size:1.5rem;"></i> Extraindo dados...
            </div>

            <div id="multa-dados" style="display:none;">
                <h4 style="color:#475569;font-size:0.9rem;margin-bottom:0.75rem;border-bottom:1px solid #e2e8f0;padding-bottom:6px;">📋 Dados da Infração</h4>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;margin-bottom:1.5rem;">
                    <div class="input-group"><label>Placa</label><input id="m-placa" class="form-control" placeholder="AAA0000"></div>
                    <div class="input-group"><label>Veículo</label><input id="m-veiculo" class="form-control"></div>
                    <div class="input-group"><label>Código da Infração</label><input id="m-codigo" class="form-control" placeholder="Ex: 7455" oninput="window.lookupCtb(this.value)"></div>
                    <div class="input-group"><label>N° AIT</label><input id="m-ait" class="form-control"></div>
                    <div class="input-group" style="grid-column:span 2;"><label>Descrição</label><input id="m-descricao" class="form-control"></div>
                    <div class="input-group"><label>Data</label><input id="m-data" class="form-control" placeholder="DD/MM/AAAA"></div>
                    <div class="input-group"><label>Hora</label><input id="m-hora" class="form-control" placeholder="HH:MM"></div>
                    <div class="input-group" style="grid-column:span 2;"><label>Local</label><input id="m-local" class="form-control"></div>
                    <div class="input-group"><label>Pontuação</label><input id="m-pontuacao" class="form-control" readonly style="background:#f1f5f9;"></div>
                    <div class="input-group"><label>Valor da Multa</label><input id="m-valor" class="form-control" readonly style="background:#f1f5f9;"></div>
                </div>
                <p style="font-size:0.8rem;color:#64748b;background:#f8fafc;padding:10px;border-radius:8px;margin-bottom:1rem;">
                    <i class="ph ph-info"></i> Após salvar, clique em <b>"Iniciar Processo"</b> no card para escolher a forma de resolução e parcelamento.
                </p>
                <button onclick="window.salvarNovaMulta(${colabId})"
                    style="width:100%;padding:0.85rem;background:linear-gradient(135deg,#f503c5,#8b5cf6);color:#fff;border:none;border-radius:10px;font-weight:700;font-size:1rem;cursor:pointer;">
                    <i class="ph ph-floppy-disk"></i> Salvar Multa
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    modal.querySelector('#multa-upload-area').addEventListener('click', () => modal.querySelector('#multa-notificacao-input').click());
    window._multaArquivo = null;
};

// ─── Popup: Iniciar Processo (popup menor, não fullscreen) ────────────────────
window.abrirPopupIniciarProcesso = function(m, colabId) {
    let modal = document.getElementById('modal-iniciar-processo');
    if (modal) modal.remove();
    modal = document.createElement('div');
    modal.id = 'modal-iniciar-processo';
    modal.style = 'position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:10000;display:flex;align-items:center;justify-content:center;padding:1rem;';

    const tipoAtual = m.tipo_resolucao || '';
    const parcAtual = m.parcelas || 1;

    modal.innerHTML = `
        <div style="background:#fff;border-radius:16px;padding:2rem;width:100%;max-width:520px;box-shadow:0 20px 60px rgba(0,0,0,0.3);">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.5rem;">
                <h3 style="margin:0;color:#1e293b;font-size:1.1rem;">⚖️ Iniciar Processo — Multa ${m.codigo_infracao || ''}</h3>
                <button onclick="document.getElementById('modal-iniciar-processo').remove()" style="background:none;border:none;font-size:1.4rem;cursor:pointer;color:#64748b;">×</button>
            </div>

            <h4 style="color:#475569;font-size:0.9rem;margin:0 0 0.75rem;border-bottom:1px solid #e2e8f0;padding-bottom:6px;">⚖️ Forma de Resolução</h4>
            <div style="display:flex;gap:12px;margin-bottom:1.5rem;">
                <button id="tipo-indicacao" onclick="window.selecionarTipoMulta('indicacao')"
                    style="flex:1;padding:0.75rem;border-radius:8px;border:2px solid ${tipoAtual==='indicacao'?'#f503c5':'#e2e8f0'};background:${tipoAtual==='indicacao'?'#fdf4ff':'#fff'};cursor:pointer;font-weight:600;color:${tipoAtual==='indicacao'?'#f503c5':'#334155'};">
                    📋 Seguir com a Indicação
                </button>
                <button id="tipo-nic" onclick="window.selecionarTipoMulta('nic')"
                    style="flex:1;padding:0.75rem;border-radius:8px;border:2px solid ${tipoAtual==='nic'?'#f503c5':'#e2e8f0'};background:${tipoAtual==='nic'?'#fdf4ff':'#fff'};cursor:pointer;font-weight:600;color:${tipoAtual==='nic'?'#f503c5':'#334155'};">
                    💳 Pagamento da Multa NIC
                </button>
            </div>

            <h4 style="color:#475569;font-size:0.9rem;margin:0 0 0.75rem;">💰 Parcelamento do Desconto</h4>
            <div style="display:flex;gap:10px;margin-bottom:1.5rem;">
                ${[1,2,3].map(n=>`<button id="parc-${n}" onclick="window.selecionarParcelas(${n})"
                    style="flex:1;padding:0.6rem;border-radius:8px;border:2px solid ${parcAtual===n?'#8b5cf6':'#e2e8f0'};background:${parcAtual===n?'#f5f3ff':'#fff'};cursor:pointer;font-weight:700;color:${parcAtual===n?'#8b5cf6':'#334155'};">${n}x</button>`).join('')}
            </div>

            <button onclick="window.confirmarIniciarProcesso(${m.id}, ${colabId})"
                style="width:100%;padding:0.85rem;background:linear-gradient(135deg,#f503c5,#8b5cf6);color:#fff;border:none;border-radius:10px;font-weight:700;font-size:1rem;cursor:pointer;">
                <i class="ph ph-play"></i> Confirmar Processo
            </button>
        </div>
    `;
    document.body.appendChild(modal);
    window._multaTipoSelecionado = tipoAtual || null;
    window._multaParcelasSelecionadas = parcAtual;
    window._multaProcessoId = m.id;
};

window.confirmarIniciarProcesso = async function(multaId, colabId) {
    if (!window._multaTipoSelecionado) {
        alert('Selecione a forma de resolução antes de continuar.'); return;
    }
    try {
        // Gera o documento HTML
        const docRes = await fetch(`${API_URL}/colaboradores/${colabId}/multas/${multaId}/gerar-documento`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${currentToken}` },
            body: JSON.stringify({ tipo: window._multaTipoSelecionado })
        });
        const docData = await docRes.json();

        await fetch(`${API_URL}/colaboradores/${colabId}/multas/${multaId}/iniciar-processo`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${currentToken}` },
            body: JSON.stringify({
                tipo_resolucao: window._multaTipoSelecionado,
                parcelas: window._multaParcelasSelecionadas,
                documento_html: docData.html || null
            })
        });
        document.getElementById('modal-iniciar-processo')?.remove();
        await window._recarregarListaMultas(colabId);
        if (typeof showToast === 'function') showToast('Processo iniciado!', 'success');
    } catch(e) { alert('Erro: ' + e.message); }
};

// ─── Modal Testemunhas (100% fullscreen) ──────────────────────────────────────
window.abrirModalTestemunhas = async function(m, colabId) {
    let modal = document.getElementById('modal-testemunhas-multa');
    if (modal) modal.remove();

    // Buscar lista de colaboradores para o dropdown
    let listaColab = [];
    try { listaColab = await apiGet('/colaboradores') || []; } catch(e) {}
    const optsColab = listaColab.map(c => `<option value="${c.nome_completo || c.nome}">${c.nome_completo || c.nome}</option>`).join('');

    // Gerar/recuperar HTML do documento
    let docHtml = m.documento_html || '';
    if (!docHtml && m.processo_iniciado) {
        try {
            const r = await fetch(`${API_URL}/colaboradores/${colabId}/multas/${m.id}/gerar-documento`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${currentToken}` },
                body: JSON.stringify({ tipo: m.tipo_resolucao || 'indicacao' })
            });
            const d = await r.json();
            docHtml = d.html || '';
        } catch(e) {}
    }

    modal = document.createElement('div');
    modal.id = 'modal-testemunhas-multa';
    modal.style = 'position:fixed;inset:0;z-index:10001;background:#0f172a;display:flex;flex-direction:column;overflow:hidden;';
    modal.innerHTML = `
        <div style="background:#1e293b;padding:0.85rem 1.5rem;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;">
            <h3 style="margin:0;color:#fff;font-size:1rem;"><i class="ph ph-users" style="color:#a78bfa;"></i> Assinatura das Testemunhas — Multa ${m.codigo_infracao || ''}</h3>
            <button onclick="document.getElementById('modal-testemunhas-multa').remove()" style="background:rgba(255,255,255,0.1);border:none;color:#fff;border-radius:8px;padding:6px 12px;cursor:pointer;">Fechar</button>
        </div>
        <div style="flex:1;display:flex;overflow:hidden;">
            <!-- Documento à esquerda -->
            <div style="flex:1;overflow-y:auto;background:#f1f5f9;padding:1rem;" id="doc-preview-testemunhas">
                <div style="color:#64748b;text-align:center;padding:2rem;">Carregando documento...</div>
            </div>
            <!-- Painel direito -->
            <div style="width:380px;background:#fff;overflow-y:auto;padding:1.5rem;display:flex;flex-direction:column;gap:1rem;border-left:1px solid #e2e8f0;flex-shrink:0;">
                <div>
                    <label style="font-size:0.85rem;font-weight:700;color:#374151;display:block;margin-bottom:4px;">Testemunha 1 *</label>
                    <select id="test1-select" class="form-control" style="width:100%;">
                        <option value="">Selecione a testemunha</option>
                        ${optsColab}
                    </select>
                </div>
                <div>
                    <label style="font-size:0.85rem;font-weight:700;color:#374151;display:block;margin-bottom:4px;">Assinatura da Testemunha 1 *</label>
                    <canvas id="canvas-test1" width="340" height="130" style="border:1.5px solid #c4b5fd;border-radius:8px;touch-action:none;background:#fafafa;cursor:crosshair;width:100%;"></canvas>
                    <button onclick="window._limparCanvasMulta('canvas-test1')" style="margin-top:4px;background:none;border:none;color:#64748b;cursor:pointer;font-size:0.8rem;"><i class="ph ph-eraser"></i> Limpar</button>
                </div>
                <div>
                    <label style="font-size:0.85rem;font-weight:700;color:#374151;display:block;margin-bottom:4px;">Testemunha 2 (opcional)</label>
                    <select id="test2-select" class="form-control" style="width:100%;">
                        <option value="">Selecione a testemunha</option>
                        ${optsColab}
                    </select>
                </div>
                <div>
                    <label style="font-size:0.85rem;font-weight:700;color:#374151;display:block;margin-bottom:4px;">Assinatura da Testemunha 2</label>
                    <canvas id="canvas-test2" width="340" height="130" style="border:1.5px solid #e2e8f0;border-radius:8px;touch-action:none;background:#fafafa;cursor:crosshair;width:100%;"></canvas>
                    <button onclick="window._limparCanvasMulta('canvas-test2')" style="margin-top:4px;background:none;border:none;color:#64748b;cursor:pointer;font-size:0.8rem;"><i class="ph ph-eraser"></i> Limpar</button>
                </div>
                <p style="font-size:0.78rem;color:#94a3b8;background:#f8fafc;padding:8px;border-radius:6px;">Role o documento até o final antes de assinar.</p>
                <button id="btn-confirmar-testemunhas"
                    onclick="window.confirmarAssinaturaTestemunhas(${m.id}, ${colabId})"
                    style="padding:0.85rem;background:linear-gradient(135deg,#7c3aed,#f503c5);color:#fff;border:none;border-radius:10px;font-weight:700;font-size:1rem;cursor:pointer;">
                    <i class="ph ph-check"></i> Confirmar Assinaturas das Testemunhas
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    // Renderizar documento no preview
    const docPreview = modal.querySelector('#doc-preview-testemunhas');
    if (docHtml) {
        const iframe = document.createElement('iframe');
        iframe.style = 'width:100%;height:100%;min-height:600px;border:none;border-radius:8px;background:#fff;';
        docPreview.innerHTML = '';
        docPreview.appendChild(iframe);
        setTimeout(() => {
            const doc = iframe.contentDocument || iframe.contentWindow.document;
            doc.open(); doc.write(docHtml); doc.close();
        }, 50);
    } else {
        docPreview.innerHTML = '<div style="color:#94a3b8;text-align:center;padding:3rem;">Documento não disponível.</div>';
    }

    // Inicializar canvas
    window._initCanvasMulta('canvas-test1');
    window._initCanvasMulta('canvas-test2');
};

window.confirmarAssinaturaTestemunhas = async function(multaId, colabId) {
    const t1Nome = document.getElementById('test1-select')?.value || '';
    const t2Nome = document.getElementById('test2-select')?.value || '';
    const c1 = document.getElementById('canvas-test1');
    const c2 = document.getElementById('canvas-test2');

    if (!t1Nome) { alert('Selecione a Testemunha 1.'); return; }
    if (!window._canvasTemConteudo('canvas-test1')) { alert('A Testemunha 1 precisa assinar.'); return; }

    const t1Ass = c1.toDataURL('image/png');
    const t2Ass = (c2 && window._canvasTemConteudo('canvas-test2')) ? c2.toDataURL('image/png') : null;

    const btn = document.getElementById('btn-confirmar-testemunhas');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Salvando...'; }

    try {
        const res = await fetch(`${API_URL}/colaboradores/${colabId}/multas/${multaId}/assinar-testemunhas`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${currentToken}` },
            body: JSON.stringify({
                testemunha1_nome: t1Nome,
                testemunha1_assinatura: t1Ass,
                testemunha2_nome: t2Nome || null,
                testemunha2_assinatura: t2Ass
            })
        });
        const data = await res.json();
        if (!data.sucesso) throw new Error(data.error || 'Erro ao salvar.');
        document.getElementById('modal-testemunhas-multa')?.remove();
        await window._recarregarListaMultas(colabId);
        if (typeof showToast === 'function') showToast('Assinaturas das testemunhas salvas!', 'success');
    } catch(e) {
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="ph ph-check"></i> Confirmar Assinaturas das Testemunhas'; }
        alert('Erro: ' + e.message);
    }
};

// ─── Modal Assinatura do Condutor (fullscreen) ────────────────────────────────
window.abrirModalAssinaturaCondutor = async function(m, colabId) {
    let modal = document.getElementById('modal-condutor-multa');
    if (modal) modal.remove();

    // Buscar documento e inserir assinaturas das testemunhas no HTML
    let docHtml = m.documento_html || '';
    if (!docHtml) {
        try {
            const r = await fetch(`${API_URL}/colaboradores/${colabId}/multas/${m.id}/gerar-documento`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${currentToken}` },
                body: JSON.stringify({ tipo: m.tipo_resolucao || 'indicacao' })
            });
            docHtml = (await r.json()).html || '';
        } catch(e) {}
    }

    // Injetar assinaturas das testemunhas no documento HTML
    if (docHtml && m.assinatura_testemunha1_base64) {
        const inject = `
            <div style="margin-top:20px;padding:10px;border-top:2px solid #e2e8f0;">
                <p style="font-weight:700;font-size:11px;">ASSINATURAS DAS TESTEMUNHAS:</p>
                <div style="display:flex;gap:20px;">
                    <div style="text-align:center;">
                        <img src="${m.assinatura_testemunha1_base64}" style="max-width:180px;max-height:60px;border-bottom:1px solid #000;">
                        <p style="font-size:10px;margin:2px 0;">${m.assinatura_testemunha1_nome || 'Testemunha 1'}</p>
                    </div>
                    ${m.assinatura_testemunha2_base64 ? `<div style="text-align:center;">
                        <img src="${m.assinatura_testemunha2_base64}" style="max-width:180px;max-height:60px;border-bottom:1px solid #000;">
                        <p style="font-size:10px;margin:2px 0;">${m.assinatura_testemunha2_nome || 'Testemunha 2'}</p>
                    </div>` : ''}
                </div>
            </div>`;
        docHtml = docHtml.replace('</body>', inject + '</body>');
    }

    modal = document.createElement('div');
    modal.id = 'modal-condutor-multa';
    modal.style = 'position:fixed;inset:0;z-index:10001;background:#0f172a;display:flex;flex-direction:column;overflow:hidden;';
    modal.innerHTML = `
        <div style="background:#1e293b;padding:0.85rem 1.5rem;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;">
            <h3 style="margin:0;color:#fff;font-size:1rem;"><i class="ph ph-pen" style="color:#fcd34d;"></i> Assinatura do Condutor — Multa ${m.codigo_infracao || ''}</h3>
            <button onclick="document.getElementById('modal-condutor-multa').remove()" style="background:rgba(255,255,255,0.1);border:none;color:#fff;border-radius:8px;padding:6px 12px;cursor:pointer;">Fechar</button>
        </div>
        <div style="flex:1;display:flex;overflow:hidden;">
            <!-- Documento -->
            <div style="flex:1;overflow-y:auto;background:#f1f5f9;padding:1rem;" id="doc-preview-condutor">
                <div style="color:#64748b;text-align:center;padding:2rem;">Carregando...</div>
            </div>
            <!-- Painel assinatura -->
            <div style="width:360px;background:#fff;overflow-y:auto;padding:1.5rem;display:flex;flex-direction:column;gap:1rem;border-left:1px solid #e2e8f0;flex-shrink:0;">
                <div style="background:#fef3c7;border-radius:8px;padding:10px;">
                    <p style="margin:0;font-size:0.82rem;color:#92400e;"><i class="ph ph-warning"></i> <b>Role o documento até o final</b> antes de assinar.</p>
                </div>
                <div>
                    <label style="font-size:0.85rem;font-weight:700;color:#374151;display:block;margin-bottom:6px;">Assinatura do Condutor *</label>
                    <canvas id="canvas-condutor" width="320" height="140" style="border:1.5px solid #fcd34d;border-radius:8px;touch-action:none;background:#fafafa;cursor:crosshair;width:100%;"></canvas>
                    <button onclick="window._limparCanvasMulta('canvas-condutor')" style="margin-top:4px;background:none;border:none;color:#64748b;cursor:pointer;font-size:0.8rem;"><i class="ph ph-eraser"></i> Limpar</button>
                </div>
                <button id="btn-confirmar-condutor"
                    onclick="window.confirmarAssinaturaCondutor(${m.id}, ${colabId})"
                    style="padding:0.85rem;background:linear-gradient(135deg,#d97706,#f59e0b);color:#fff;border:none;border-radius:10px;font-weight:700;font-size:1rem;cursor:pointer;">
                    <i class="ph ph-check"></i> Confirmar Assinatura do Condutor
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    // Renderizar documento
    const docPreview = modal.querySelector('#doc-preview-condutor');
    if (docHtml) {
        const iframe = document.createElement('iframe');
        iframe.style = 'width:100%;height:100%;min-height:600px;border:none;border-radius:8px;background:#fff;';
        docPreview.innerHTML = '';
        docPreview.appendChild(iframe);
        setTimeout(() => {
            const doc = iframe.contentDocument || iframe.contentWindow.document;
            doc.open(); doc.write(docHtml); doc.close();
        }, 50);
    }

    window._initCanvasMulta('canvas-condutor');
};

window.confirmarAssinaturaCondutor = async function(multaId, colabId) {
    if (!window._canvasTemConteudo('canvas-condutor')) { alert('O condutor precisa assinar.'); return; }
    const assinatura = document.getElementById('canvas-condutor').toDataURL('image/png');
    const btn = document.getElementById('btn-confirmar-condutor');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Salvando...'; }
    try {
        const res = await fetch(`${API_URL}/colaboradores/${colabId}/multas/${multaId}/assinar-condutor`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${currentToken}` },
            body: JSON.stringify({ assinatura_base64: assinatura })
        });
        const data = await res.json();
        if (!data.sucesso) throw new Error(data.error || 'Erro.');
        document.getElementById('modal-condutor-multa')?.remove();
        await window._recarregarListaMultas(colabId);
        if (typeof showToast === 'function') showToast('Documento assinado pelo condutor!', 'success');
    } catch(e) {
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="ph ph-check"></i> Confirmar Assinatura do Condutor'; }
        alert('Erro: ' + e.message);
    }
};

// ─── Helpers de canvas ────────────────────────────────────────────────────────
window._initCanvasMulta = function(id) {
    const canvas = document.getElementById(id);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    let drawing = false, lx = 0, ly = 0;
    const pos = (e) => {
        const r = canvas.getBoundingClientRect();
        const sx = canvas.width / r.width, sy = canvas.height / r.height;
        if (e.touches) return { x:(e.touches[0].clientX-r.left)*sx, y:(e.touches[0].clientY-r.top)*sy };
        return { x:(e.clientX-r.left)*sx, y:(e.clientY-r.top)*sy };
    };
    canvas.onmousedown = canvas.ontouchstart = (e) => { e.preventDefault(); drawing=true; const p=pos(e); lx=p.x; ly=p.y; };
    canvas.onmousemove = canvas.ontouchmove = (e) => { e.preventDefault(); if(!drawing) return; const p=pos(e); ctx.beginPath(); ctx.moveTo(lx,ly); ctx.lineTo(p.x,p.y); ctx.stroke(); lx=p.x; ly=p.y; };
    canvas.onmouseup = canvas.ontouchend = canvas.onmouseleave = () => { drawing=false; };
};

window._limparCanvasMulta = function(id) {
    const canvas = document.getElementById(id);
    if (!canvas) return;
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
};

window._canvasTemConteudo = function(id) {
    const canvas = document.getElementById(id);
    if (!canvas) return false;
    const data = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
    for (let i = 3; i < data.length; i += 4) { if (data[i] > 0) return true; }
    return false;
};

// ─── Helpers legados (compatibilidade) ───────────────────────────────────────
window.selecionarTipoMulta = function(tipo) {
    window._multaTipoSelecionado = tipo;
    ['indicacao','nic'].forEach(t => {
        const btn = document.getElementById(`tipo-${t}`);
        if (!btn) return;
        const sel = t === tipo;
        btn.style.borderColor = sel ? '#f503c5' : '#e2e8f0';
        btn.style.background  = sel ? '#fdf4ff' : '#fff';
        btn.style.color       = sel ? '#f503c5' : '#334155';
    });
};

window.selecionarParcelas = function(n) {
    window._multaParcelasSelecionadas = n;
    [1,2,3].forEach(i => {
        const btn = document.getElementById(`parc-${i}`);
        if (!btn) return;
        const sel = i === n;
        btn.style.borderColor = sel ? '#8b5cf6' : '#e2e8f0';
        btn.style.background  = sel ? '#f5f3ff' : '#fff';
        btn.style.color       = sel ? '#8b5cf6' : '#334155';
    });
};

window.lookupCtb = async function(codigo) {
    if (!codigo || codigo.length < 4) return;
    try {
        const data = await apiGet(`/ctb/${codigo}`);
        if (data && data.pontuacao) {
            const el = document.getElementById('m-pontuacao');
            const el2 = document.getElementById('m-valor');
            if (el) el.value = data.pontuacao;
            if (el2) el2.value = data.valor || '';
            if (!document.getElementById('m-descricao').value && data.descricao)
                document.getElementById('m-descricao').value = data.descricao;
        }
    } catch(e) {}
};

window.processarNotificacaoMulta = async function(input, colabId) {
    const file = input.files[0];
    if (!file) return;
    window._multaArquivo = file;
    const loader = document.getElementById('multa-loader');
    const uploadArea = document.getElementById('multa-upload-area');
    const dadosDiv = document.getElementById('multa-dados');
    loader.style.display = 'block';
    uploadArea.style.display = 'none';
    try {
        const formData = new FormData();
        formData.append('file', file); // campo esperado pelo /api/documentos
        const res = await fetch(`${API_URL}/colaboradores/${colabId}/multas/upload-notificacao`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${currentToken}` },
            body: formData
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
        set('m-placa', data.placa); set('m-veiculo', data.veiculo);
        set('m-codigo', data.codigo_infracao); set('m-descricao', data.descricao_infracao);
        set('m-data', data.data_infracao); set('m-hora', data.hora_infracao);
        set('m-local', data.local_infracao); set('m-valor', data.valor_multa);
        set('m-pontuacao', data.pontuacao); set('m-ait', data.numero_ait);
        dadosDiv.style.display = 'block';
        loader.textContent = '✅ Dados extraídos! Confira e corrija se necessário.';
        loader.style.color = '#10b981';
    } catch(e) {
        loader.textContent = `⚠️ Falha ao extrair: ${e.message || 'Preencha manualmente.'}`;
        loader.style.color = '#ef4444';
        document.getElementById('multa-dados').style.display = 'block';
    }
};

window.salvarNovaMulta = async function(colabId) {
    const get = id => (document.getElementById(id) || {}).value || '';
    const formData = new FormData();
    formData.append('codigo_infracao', get('m-codigo'));
    formData.append('descricao_infracao', get('m-descricao'));
    formData.append('placa', get('m-placa'));
    formData.append('veiculo', get('m-veiculo'));
    formData.append('data_infracao', get('m-data'));
    formData.append('hora_infracao', get('m-hora'));
    formData.append('local_infracao', get('m-local'));
    formData.append('numero_ait', get('m-ait'));
    formData.append('pontuacao', get('m-pontuacao'));
    formData.append('valor_multa', get('m-valor'));
    if (window._multaArquivo) formData.append('arquivo', window._multaArquivo);
    try {
        const res = await fetch(`${API_URL}/colaboradores/${colabId}/multas`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${currentToken}` },
            body: formData
        });
        const data = await res.json();
        if (!data.sucesso) throw new Error(data.error || 'Erro ao salvar.');
        document.getElementById('modal-nova-multa')?.remove();
        await window._recarregarListaMultas(colabId);
        if (typeof showToast === 'function') showToast('Multa salva! Clique em "Iniciar Processo" para continuar.', 'success');
    } catch(e) { alert('Erro: ' + e.message); }
};

window.excluirMulta = async function(multaId, colabId, btn) {
    if (!confirm('Excluir este registro de multa? Esta ação não pode ser desfeita.')) return;
    if (btn) { btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i>'; btn.disabled = true; }
    try {
        const res = await fetch(`${API_URL}/colaboradores/${colabId}/multas/${multaId}`, {
            method: 'DELETE', headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        if (!res.ok) throw new Error('Falha ao excluir');
        await window._recarregarListaMultas(colabId);
        if (typeof showToast === 'function') showToast('Multa excluída.', 'success');
    } catch(e) {
        if (btn) { btn.innerHTML = '<i class="ph ph-trash"></i>'; btn.disabled = false; }
        alert('Erro: ' + e.message);
    }
};

window.verDocumentoMulta = async function(multaId, colabId, tipo) {
    try {
        const res = await fetch(`${API_URL}/colaboradores/${colabId}/multas/${multaId}/gerar-documento`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${currentToken}` },
            body: JSON.stringify({ tipo: tipo || 'indicacao' })
        });
        const data = await res.json();
        if (!data.html) { alert('Documento não disponível.'); return; }
        let modal = document.getElementById('modal-preview-multa');
        if (modal) modal.remove();
        modal = document.createElement('div');
        modal.id = 'modal-preview-multa';
        modal.style = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:9999;display:flex;flex-direction:column;';
        modal.innerHTML = `
            <div style="background:#1e293b;padding:1rem;display:flex;align-items:center;justify-content:space-between;">
                <h3 style="margin:0;color:#fff;font-size:1rem;"><i class="ph ph-file-text" style="color:#f503c5;"></i> Documento — ${tipo === 'indicacao' ? 'Indicação de Condutor' : 'Pagamento NIC'}</h3>
                <button onclick="document.getElementById('modal-preview-multa').remove()" style="padding:0.5rem 1rem;background:#475569;color:#fff;border:none;border-radius:8px;cursor:pointer;">Fechar</button>
            </div>
            <iframe id="multa-preview-iframe" style="flex:1;border:none;background:#fff;"></iframe>
        `;
        document.body.appendChild(modal);
        setTimeout(() => {
            const iframe = document.getElementById('multa-preview-iframe');
            if (iframe) { const doc = iframe.contentDocument || iframe.contentWindow.document; doc.open(); doc.write(data.html); doc.close(); }
        }, 50);
    } catch(e) { alert('Erro: ' + e.message); }
};
