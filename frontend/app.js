const API_URL = '/api';
window.API_URL = API_URL;




function showToast(msg, type) {
    const toast = document.getElementById('global-toast');
    if (toast) {
        const toastBody = toast.querySelector('.toast-body');
        if (toastBody) toastBody.textContent = msg;
        toast.className = 'toast align-items-center border-0 ' + (type === 'error' ? 'bg-danger text-white' : 'bg-success text-white');
        try { new bootstrap.Toast(toast, { delay: 3000 }).show(); return; } catch (e) { }
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
window.viewedColaborador = null; // Alias para módulos externos (epi.js, etc.)


// Helper global para coletar GPS e Device Info para auditoria jurídica
window.getDeviceSecurityData = async function() {
    let gps_lat = '';
    let gps_lon = '';
    const dispositivo = navigator.userAgent;

    return new Promise((resolve) => {
        if (!navigator.geolocation) {
            resolve({ gps_lat, gps_lon, dispositivo });
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (position) => {
                resolve({
                    gps_lat: position.coords.latitude.toString(),
                    gps_lon: position.coords.longitude.toString(),
                    dispositivo
                });
            },
            (error) => {
                console.warn('[GPS] Permissão negada ou erro:', error);
                resolve({ gps_lat: 'negado/erro', gps_lon: 'negado/erro', dispositivo });
            },
            { timeout: 5000 }
        );
    });
};

// Helper global para PDF
window.gerarPDFBlob = async function (element, filename = 'documento.pdf') {
    return new Promise((resolve, reject) => {
        if (typeof html2pdf === 'undefined') return reject(new Error('Biblioteca html2pdf não carregada'));

        // Salvar estilo original
        const origWidth = element.style.width;
        const origMaxWidth = element.style.maxWidth;
        const origMinH = element.style.minHeight;
        const origBorder = element.style.border;
        const origShadow = element.style.boxShadow;
        const origMargin = element.style.margin;

        // Limpar estilo para não vazar bordas (evita 2a pagina vazia)
        element.style.width = '794px';
        element.style.maxWidth = '794px';
        element.style.minHeight = '0';
        element.style.border = 'none';
        element.style.boxShadow = 'none';
        element.style.margin = '0';

        // Salvar e zerar rolagem da janela e de qualquer container pai para evitar branco no topo
        const origWinScrollY = window.scrollY;
        const origWinScrollX = window.scrollX;
        window.scrollTo(0, 0);

        let parentScrolls = [];
        let scrollableParent = element.parentElement;
        while (scrollableParent && scrollableParent !== document.body && scrollableParent !== document.documentElement) {
            if (scrollableParent.scrollTop > 0) {
                parentScrolls.push({ el: scrollableParent, top: scrollableParent.scrollTop });
                scrollableParent.scrollTop = 0;
            }
            scrollableParent = scrollableParent.parentElement;
        }

        const opt = {
            margin: [5, 0, 10, 0], // 5mm topo, 0 esq, 10mm inferior, 0 dir para margem de segurança na emenda das páginas
            filename: filename,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
            pagebreak: { mode: ['css', 'legacy'], avoid: 'p, h1, h2, h3, h4, h5, h6, tr, li, ul, ol' }
        };

        html2pdf()
            .set(opt)
            .from(element)
            .output('blob')
            .then(blob => {
                element.style.width = origWidth;
                element.style.maxWidth = origMaxWidth;
                element.style.minHeight = origMinH;
                element.style.border = origBorder;
                element.style.boxShadow = origShadow;
                element.style.margin = origMargin;
                parentScrolls.forEach(s => s.el.scrollTop = s.top);
                window.scrollTo(origWinScrollX, origWinScrollY);
                resolve(blob);
            })
            .catch(err => {
                element.style.width = origWidth;
                element.style.maxWidth = origMaxWidth;
                element.style.minHeight = origMinH;
                element.style.border = origBorder;
                element.style.boxShadow = origShadow;
                element.style.margin = origMargin;
                parentScrolls.forEach(s => s.el.scrollTop = s.top);
                window.scrollTo(origWinScrollX, origWinScrollY);
                reject(err);
            });
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
    // Check for public form token
    const urlParams = new URLSearchParams(window.location.search);
    const expPublicToken = urlParams.get('exp_public_token');

    if (expPublicToken) {
        window.location.href = `/avaliacao-publica.html?token=${expPublicToken}`;
        return; // Stop normal boot
    }

    setupNavigation();
    setupGeradores();

    const savedToken = localStorage.getItem('erp_token');
    const savedUser = localStorage.getItem('erp_user');

    if (savedToken && savedUser) {
        currentToken = savedToken;
        window.currentToken = currentToken;
        currentUser = JSON.parse(savedUser);

        const nameEl = document.getElementById('logged-user-name');
        if (nameEl) nameEl.textContent = currentUser.username;

        carregarFotoUsuarioTopbar();

        const appShell = document.getElementById('app-shell');
        if (appShell) {
            if (typeof window.carregarPermissoesOnline === 'function') {
                window.carregarPermissoesOnline().then(() => {
                    showView('app-shell');
                    window.navigateInitialPage();
                });
            } else {
                showView('app-shell');
                window.navigateInitialPage();
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
(function () {
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
        } catch (e) { }
    }
})();

const formLogin = document.getElementById('form-login');
if (formLogin) {
    formLogin.addEventListener('submit', async (e) => {
        e.preventDefault();
        const usernameInp = document.getElementById('login-user').value.trim();
        const passwordInp = document.getElementById('login-pass').value;
        const rememberMe = document.getElementById('login-remember')?.checked;
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
            window.currentToken = currentToken;

            localStorage.setItem('erp_token', currentToken);
            localStorage.setItem('erp_user', JSON.stringify(currentUser));
            localStorage.setItem('erp_login_time', Date.now().toString());

            const nameEl = document.getElementById('logged-user-name');
            if (nameEl) nameEl.textContent = currentUser.username;

            carregarFotoUsuarioTopbar();

            // Carrega permissões se existir função global
            if (typeof window.carregarPermissoesOnline === 'function') {
                await window.carregarPermissoesOnline();
            }

            showView('app-shell');
            window.navigateInitialPage();
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
        localStorage.removeItem('erp_login_time');
        window.location.reload();
    });
}

// ── Sessão automática: logout após 5 horas ─────────────────────────────
(function () {
    const SESSION_MS = 5 * 60 * 60 * 1000; // 5 horas em ms
    const AVISO_MS = 60 * 1000; // Avisar 60 segundos antes

    function getTempoSessao() {
        const t = localStorage.getItem('erp_login_time');
        if (!t) return -1;
        return Date.now() - parseInt(t);
    }

    function mostrarAvisoExpiracao(faltamMs) {
        let div = document.getElementById('aviso-sessao-expirando');
        if (!div) {
            div = document.createElement('div');
            div.id = 'aviso-sessao-expirando';
            div.style.cssText = 'position:fixed; bottom:20px; left:20px; background:#ef4444; color:#fff; padding:15px 20px; border-radius:10px; box-shadow:0 10px 25px rgba(0,0,0,0.3); z-index:99999; display:flex; align-items:center; gap:12px; font-family:Inter, sans-serif; max-width:320px; animation: slideInLeft 0.3s ease-out;';
            
            // Animação CSS para o card aparecer da esquerda
            const style = document.createElement('style');
            style.textContent = `@keyframes slideInLeft { from { transform: translateX(-100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`;
            document.head.appendChild(style);

            div.innerHTML = `
                <i class="ph ph-warning-circle" style="font-size:2.2rem; flex-shrink:0;"></i>
                <div>
                    <h4 style="margin:0 0 4px; font-size:0.95rem; font-weight:700;">Atenção! Salve tudo.</h4>
                    <p style="margin:0; font-size:0.85rem; line-height:1.4;">
                        O sistema será relogado em <strong id="aviso-sessao-timer" style="font-size:1.1rem;">--</strong> segundos.
                    </p>
                </div>
            `;
            document.body.appendChild(div);
        }
        
        let faltamSeg = Math.max(0, Math.ceil(faltamMs / 1000));
        document.getElementById('aviso-sessao-timer').textContent = faltamSeg;
    }

    function mostrarModalSessaoExpirada() {
        if (document.getElementById('modal-sessao-expirada')) return;
        
        const aviso = document.getElementById('aviso-sessao-expirando');
        if (aviso) aviso.remove();

        const ov = document.createElement('div');
        ov.id = 'modal-sessao-expirada';
        ov.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.85);z-index:99999;display:flex;align-items:center;justify-content:center;';
        ov.innerHTML = `
            <div style="background:#fff;border-radius:16px;width:92vw;max-width:400px;box-shadow:0 25px 60px rgba(0,0,0,0.4);overflow:hidden;text-align:center;">
                <div style="background:linear-gradient(135deg,#1e293b,#334155);padding:2rem 1.5rem;">
                    <i class="ph ph-lock" style="font-size:2.8rem;color:#f59e0b;display:block;margin-bottom:0.5rem;"></i>
                    <h3 style="margin:0;color:#fff;font-size:1.15rem;font-weight:700;">Sessão Expirada</h3>
                </div>
                <div style="padding:1.75rem 1.5rem;">
                    <p style="color:#475569;margin:0 0 1.5rem;font-size:0.93rem;line-height:1.6;">
                        Sua sessão expirou após <strong>5 horas</strong> de uso.<br>
                        Por segurança, faça login novamente para continuar.
                    </p>
                    <button id="btn-sessao-ok" style="background:#1e293b;color:#fff;border:none;border-radius:10px;padding:0.8rem 2rem;font-weight:700;font-size:0.95rem;cursor:pointer;width:100%;display:flex;align-items:center;justify-content:center;gap:8px;">
                        <i class="ph ph-sign-in"></i> Fazer Login Novamente
                    </button>
                </div>
            </div>`;
        document.body.appendChild(ov);
        document.getElementById('btn-sessao-ok').addEventListener('click', function () {
            localStorage.removeItem('erp_token');
            localStorage.removeItem('erp_user');
            localStorage.removeItem('erp_login_time');
            window.location.reload();
        });
    }

    function verificarSessao() {
        if (!localStorage.getItem('erp_token')) return; // não logado
        
        const tempoDecorrido = getTempoSessao();
        if (tempoDecorrido < 0) return;

        if (tempoDecorrido >= SESSION_MS) {
            mostrarModalSessaoExpirada();
        } else if (tempoDecorrido >= (SESSION_MS - AVISO_MS)) {
            mostrarAvisoExpiracao(SESSION_MS - tempoDecorrido);
        }
    }

    // Verificar ao carregar (caso o usuário reabra após 5h)
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { setTimeout(verificarSessao, 3000); });
    } else {
        setTimeout(verificarSessao, 3000);
    }

    // Verificar a cada 1 segundo para o cronômetro funcionar corretamente
    setInterval(verificarSessao, 1000);
})();


window.navigateInitialPage = function () {
    if (window.isTopAdmin) {
        navigateTo('dashboard');
        return;
    }

    if (window.activeUserPerms) {
        if (window.activeUserPerms['dashboard']) {
            navigateTo('dashboard');
            return;
        }
        if (window.activeUserPerms['logistica-pipeline']) {
            navigateTo('logistica-pipeline');
            return;
        }
        if (window.activeUserPerms['logistica-rota-redonda']) {
            navigateTo('logistica-rota-redonda');
            return;
        }
        // Pega a primeira aba autorizada caso nenhuma das favoritas esteja disponível
        const firstPerm = Object.keys(window.activeUserPerms).find(k => window.activeUserPerms[k] && k !== 'logistica-em-breve');
        if (firstPerm) {
            navigateTo(firstPerm);
            return;
        }
    }

    // Fallback
    navigateTo('dashboard');
};

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
        const norm = (s) => s ? s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim() : "";
        const uNome = norm(usuarioAtual.nome);
        let colaborador = colaboradores.find(c => norm(c.nome_completo) === uNome);
        if (!colaborador) {
            colaborador = colaboradores.find(c => {
                const cNome = norm(c.nome_completo);
                return cNome && uNome && (cNome.includes(uNome) || uNome.includes(cNome));
            });
        }

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
    } catch (e) {
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
    'pagamentos-massa': { path: 'Envio de Documentos em Massa', code: 'RHPG01' },
    'dashboard': { path: 'Dashboard', code: 'RH001' },
    'colaboradores': { path: 'Colaboradores', code: 'RHCL00' },
    'form-colaborador': { path: 'Colaboradores → Cadastro / Edição' },
    'departamentos': { path: 'Departamentos', code: 'RHAD02' },
    'faculdade': { path: 'Faculdade', code: 'RHAD03' },
    'chaves': { path: 'Chaves', code: 'RHAD04' },
    'geradores': { path: 'Geradores', code: 'RHDOC01' },
    'admissao': { path: 'Admissão', code: 'RHAD05' },
    'treinamento-materiais': { path: 'Treinamentos → Materiais', code: 'TREIN01' },
    'treinamento-presenca': { path: 'Treinamentos → Presenças', code: 'TREIN02' },
    'treinamento-materiais-terapia': { path: 'Treinamentos - Terapia - Palestras', code: 'TER01' },
    'treinamento-presenca-terapia': { path: 'Treinamentos - Terapia - Listas', code: 'TER02' },
    'ficha-epi': { path: 'Ficha EPI', code: 'RHEPI01' },
    'avaliacoes': { path: 'Avaliações', code: 'RHAV01' },
    'gerenciar-avaliacoes': { path: 'Diretoria → Gerenciar Avaliações', code: 'DIRAVAL' },
    'usuarios-permissoes': { path: 'Diretoria → Usuários e Permissões', code: 'DIR001' },
    'cargos': { path: 'Diretoria → Cargos', code: 'DIR004' },
    'form-usuario': { path: 'Diretoria → Usuários e Permissões → Cadastro', code: 'DIR002' },
    'certificado-digital': { path: 'Diretoria → Certificado Digital', code: 'DIR003' },
    'auditoria': { path: 'Diretoria → Trilha de Auditoria', code: 'DIR006' },
    // Sub-telas (Prontuário Digital - abas)
    'tab:00. CheckList': { path: 'Colaboradores → Prontuário Digital → 00. CheckList', },
    'tab:01_FICHA_CADASTRAL': { path: 'Colaboradores → Prontuário Digital → Ficha Cadastral', },
    'tab:Ficha Cadastral': { path: 'Colaboradores → Prontuário Digital → Ficha Cadastral', },
    'tab:Pagamentos': { path: 'Colaboradores → Prontuário Digital → Pagamentos', },
    'tab:ASO': { path: 'Colaboradores → Prontuário Digital → ASO', },
    'tab:Ficha de EPI': { path: 'Colaboradores → Prontuário Digital → Ficha de EPI', },
    'tab:Atestados': { path: 'Colaboradores → Prontuário Digital → Atestados', },
    'tab:Faltas': { path: 'Colaboradores → Prontuário Digital → Faltas', },
    'tab:Contratos': { path: 'Colaboradores → Prontuário Digital → Contratos', },
    'tab:Avaliação': { path: 'Colaboradores → Prontuário Digital → Avaliação', },
    'tab:Avaliações': { path: 'Colaboradores → Prontuário Digital → Avaliações', },
    'tab:Advertências': { path: 'Colaboradores → Prontuário Digital → Ocorrências', },
    'tab:Faculdade': { path: 'Colaboradores → Prontuário Digital → Faculdade', },
    'tab:Boletim de ocorrência': { path: 'Colaboradores → Prontuário Digital → Boletim de Ocorrência', },
    'tab:Certificados': { path: 'Colaboradores → Prontuário Digital → Certificados', },
    'tab:Conjuge': { path: 'Colaboradores → Prontuário Digital → Conjuge', },
    'tab:Dependentes': { path: 'Colaboradores → Prontuário Digital → Dependentes', },
    'tab:Fotos': { path: 'Colaboradores → Prontuário Digital → Fotos', },
    'tab:Multas': { path: 'Colaboradores → Prontuário Digital → Multas', },
    'tab:NRs': { path: 'Colaboradores → Prontuário Digital → NRs', },
    'tab:Terapia': { path: 'Colaboradores → Prontuário Digital → Terapia', },
    'tab:Treinamento': { path: 'Colaboradores → Prontuário Digital → Treinamento', },
    'tab:Documentos': { path: 'Colaboradores → Prontuário Digital → Documentos', },
    'tab:Afastamentos': { path: 'Colaboradores → Prontuário Digital → Afastamentos', },
    'tab:Chaves': { path: 'Colaboradores → Prontuário Digital → Chaves', },
    'tab:Prontuário Digital': { path: 'Colaboradores → Prontuário Digital', },
    // Módulos adicionais
    'dissidio': { path: 'Dissídio', code: 'RHDIS01' },
    'recibos': { path: 'Recibos de Benefícios', code: 'RHREC01' },
    'ferias': { path: 'Controle de Férias', code: 'RHFER01' },
    // Logística
    'logistica-dashboard': { path: 'Dashboard Logística', code: 'LOG000' },
    'logistica-sinistros': { path: 'Sinistros Logística', code: 'LOG010' },
    'logistica-rota-redonda': { path: 'OS', code: 'LOG001' },
    'logistica-frota-resumo': { path: 'Resumo de Frota', code: 'LOG002' },
    'logistica-pipeline': { path: 'Pipeline OS', code: 'LOG003' },
    'logistica-multas': { path: 'Multas', code: 'LOG004' },
    'logistica-multas-monaco': { path: 'Multas Mônaco', code: 'LOG012' },
    'logistica-equipes': { path: 'Equipes', code: 'LOG013' },
    'logistica-frota': { path: 'Frota', code: 'LOG005' },
    'logistica-credenciamento': { path: 'Credenciamento', code: 'LOG006' },
    'logistica-senhas': { path: 'Cofre de Senhas', code: 'LOG007' },
    'logistica-resumo-rota': { path: 'Resumo de Rota', code: 'LOG008' },
    'logistica-itinerantes': { path: 'Clientes Itinerantes', code: 'LOG009' },
    'rh-agenda': { path: 'Agenda RH', code: 'RH020' },
    'logistica-agenda': { path: 'Agenda Logística', code: 'LOG011' },
    'logistica-epi': { path: 'Entrega de EPI', code: 'LOG012' },
    // Comercial
    'comercial-credenciamento': { path: 'Solicitar Credencial', code: 'COM001' },
    'comercial-proposta': { path: 'Proposta', code: 'COM002' },
    // Administrativo
    'licencas': { path: 'Licenças', code: 'ADM001' },
    'estoque': { path: 'Estoque', code: 'ADM002' },
};

window.carregarPermissoesOnline = async function () {
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

        // Ocultar sub-grupos (nav-group) se não tiverem nenhum nav-item liberado
        document.querySelectorAll('.nav-group').forEach(group => {
            const navItems = Array.from(group.querySelectorAll('.nav-item[data-target]'));
            if (navItems.length > 0) {
                const isAnyVisible = navItems.some(i => mapPerms[i.getAttribute('data-target')] === true);
                if (!isAnyVisible) {
                    group.style.cssText = 'display: none !important;';
                } else {
                    group.style.display = '';
                }
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
        
        // Aplica permissões no Prontuário Digital
        if (window.aplicarPermissoesProntuario) {
            window.aplicarPermissoesProntuario();
        }

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
    let deptIconHTML = '';
    if (activeNav) {
        const deptItem = activeNav.closest('.dept-item');
        if (deptItem) {
            const cssColor = deptItem.style.getPropertyValue('--dept-color').trim();
            if (cssColor) pageColor = cssColor;

            const iconEl = deptItem.querySelector('.dept-btn i');
            if (iconEl) {
                deptIconHTML = `<i class="${iconEl.className}" style="margin-right:6px; color:#fff; font-size:1.1rem; vertical-align:text-bottom; filter: brightness(1.2);"></i>`;
            }
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
        const isSimplePage = (!entryObj.path.includes('→') && !key.startsWith('tab:')) || key === 'usuarios-permissoes' || key === 'form-usuario' || key === 'logistica-rota-redonda' || key === 'logistica-multas' || key === 'logistica-multas-monaco' || key === 'logistica-equipes' || key === 'logistica-pipeline' || key === 'logistica-frota' || key === 'logistica-credenciamento' || key === 'logistica-senhas' || key === 'comercial-credenciamento' || key === 'comercial-proposta' || key === 'departamentos' || key === 'logistica-agenda' || key === 'logistica-epi' || key === 'rh-agenda' || key === 'estoque' || key === 'licencas' || key === 'treinamento-presenca' || key === 'treinamento-materiais' || key === 'treinamento-materiais-terapia' || key === 'treinamento-presenca-terapia';
        if (isSimplePage) {
            starBtn.style.display = 'flex';
        } else {
            starBtn.style.display = 'none';
        }
    }

    if (typeof renderBookmarks === 'function') setTimeout(renderBookmarks, 50); // Força render com o novo key
    if (!bar) return;
    const entry = BREADCRUMB_MAP[key] || { path: key };
    const parts = entry.path.split('→').map(p => p.trim());

    // Assegurar que 'Diretoria' ou 'RH' não se duplique se colocarmos o ícone,
    // mas o usuário pediu "icones dos setores e o código" (talvez "nome"?). Vamos por o ícone:
    bar.innerHTML = `${deptIconHTML}` +
        parts.map((p, i) =>
            i < parts.length - 1
                ? `<span style="opacity:0.75;">${p}</span><span style="margin:0 5px;opacity:0.5;">→</span>`
                : `<strong>${p}</strong>`
        ).join('');
}
let appOpenTabs = [];

// ── METADADOS DE ABAS: cor, ícone e módulo por tela ─────────────────────────
const TAB_META = {
    // RH - Rosa
    'dashboard': { color: '#f503c5', icon: 'ph-squares-four', title: 'Dashboard' },
    'colaboradores': { color: '#f503c5', icon: 'ph-address-book', title: 'Colaboradores' },
    'form-colaborador': { color: '#f503c5', icon: 'ph-user-plus', title: 'Cadastro Colaborador' },
    'prontuario': { color: '#f503c5', icon: 'ph-folder-open', title: 'Prontuário Digital' },
    'admissao': { color: '#f503c5', icon: 'ph-list-checks', title: 'Admissão' },
    'integracao': { color: '#f503c5', icon: 'ph-users-three', title: 'Integração' },
    'departamentos': { color: '#f503c5', icon: 'ph-buildings', title: 'Departamentos' },
    'faculdade': { color: '#f503c5', icon: 'ph-graduation-cap', title: 'Faculdade' },
    'geradores': { color: '#f503c5', icon: 'ph-file-text', title: 'Geradores' },
    'ficha-epi': { color: '#f503c5', icon: 'ph-shield-check', title: 'Ficha EPI' },
    'gerenciar-avaliacoes': { color: '#d9480f', icon: 'ph-clipboard-text', title: 'Avaliações' },
    'rh-agenda': { color: '#f503c5', icon: 'ph-calendar-check', title: 'Agenda RH' },
    'assinaturas-digitais': { color: '#f503c5', icon: 'ph-signature', title: 'Assinaturas' },
    'pagamentos-massa': { color: '#f503c5', icon: 'ph-currency-dollar', title: 'Docs. em Massa' },
    'dissidio': { color: '#f503c5', icon: 'ph-trend-up', title: 'Dissídio' },
    'recibos': { color: '#f503c5', icon: 'ph-receipt', title: 'Recibos' },
    'ferias': { color: '#f503c5', icon: 'ph-airplane-tilt', title: 'Férias' },
    'experiencia': { color: '#f503c5', icon: 'ph-user-check', title: 'Experiência' },
    'treinamento-materiais': { color: '#0e7490', icon: 'ph-books', title: 'Materiais' },
    'treinamento-presenca': { color: '#0e7490', icon: 'ph-check-square', title: 'Presenças' },
    'treinamento-materiais-terapia': { color: '#0e7490', icon: 'ph-books', title: 'Palestras' },
    'treinamento-presenca-terapia': { color: '#0e7490', icon: 'ph-list-numbers', title: 'Listas' },
    // Diretoria - Laranja
    'usuarios-permissoes': { color: '#d9480f', icon: 'ph-users-three', title: 'Usuários e Permissões' },
    'cargos': { color: '#d9480f', icon: 'ph-briefcase', title: 'Cargos' },
    'certificado-digital': { color: '#d9480f', icon: 'ph-certificate', title: 'Certificado Digital' },
    'chaves': { color: '#d9480f', icon: 'ph-key', title: 'Chaves' },
    'form-usuario': { color: '#d9480f', icon: 'ph-user-gear', title: 'Cadastro de Usuário' },
    'config-sigor': { color: '#d9480f', icon: 'ph-key', title: 'Credenciais SIGOR' },
    // Logística - Verde
    'logistica-em-breve': { color: '#2d9e5f', icon: 'ph-truck', title: 'Logística' },
    'logistica-dashboard': { color: '#2d9e5f', icon: 'ph-chart-bar', title: 'Dashboard Logística' },
    'logistica-sinistros': { color: '#059669', icon: 'ph-warning', title: 'Sinistros Logística' },
    'logistica-rota-redonda': { color: '#2d9e5f', icon: 'ph-clipboard-text', title: 'OS' },
    'logistica-resumo-rota': { color: '#2d9e5f', icon: 'ph-list-bullets', title: 'Resumo de Rota' },
    'logistica-frota-resumo': { color: '#1e3a5f', icon: 'ph-truck', title: 'Resumo de Frota' },
    'logistica-pipeline': { color: '#2d9e5f', icon: 'ph-kanban', title: 'Pipeline' },
    'logistica-entregas': { color: '#2d9e5f', icon: 'ph-package', title: 'Entregas' },
    'logistica-multas': { color: '#2d9e5f', icon: 'ph-receipt', title: 'Multas' },
    'logistica-multas-monaco': { color: '#dc2626', icon: 'ph-car', title: 'Multas Mônaco' },
    'logistica-equipes': { color: '#2d9e5f', icon: 'ph-users-three', title: 'Equipes' },
    'logistica-frota': { color: '#2d9e5f', icon: 'ph-truck', title: 'Frota' },
    'logistica-credenciamento': { color: '#2d9e5f', icon: 'ph-identification-card', title: 'Credenciamento' },
    'logistica-senhas': { color: '#2d9e5f', icon: 'ph-lock-key', title: 'Cofre de Senhas' },
    'logistica-itinerantes': { color: '#2d9e5f', icon: 'ph-map-pin-line', title: 'Clientes Itinerantes' },
    'logistica-agenda': { color: '#2d9e5f', icon: 'ph-calendar-check', title: 'Agenda' },
    'logistica-epi': { color: '#2d9e5f', icon: 'ph-shield-check', title: 'Entrega de EPI' },
    'rh-agenda': { color: '#f503c5', icon: 'ph-calendar-check', title: 'Agenda RH' },
    // Financeiro - Azul
    'financeiro-em-breve': { color: '#1971c2', icon: 'ph-currency-dollar', title: 'Financeiro' },
    // Comercial - Roxo
    'comercial-credenciamento': { color: '#7048e8', icon: 'ph-identification-card', title: 'Solicitar Credencial' },
    'comercial-proposta': { color: '#7048e8', icon: 'ph-file-text', title: 'Proposta' },
    'comercial-em-breve': { color: '#7048e8', icon: 'ph-handshake', title: 'Comercial' },
    // Administrativo - Amarelo
    'admin-em-breve': { color: '#e67700', icon: 'ph-gear', title: 'Administrativo' },
    'licencas': { color: '#e67700', icon: 'ph-certificate', title: 'Licenças' },
    'estoque': { color: '#e67700', icon: 'ph-package', title: 'Estoque' },
    // Treinamento - Azul Turquesa
    'treinamento-materiais': { color: '#0e7490', icon: 'ph-books', title: 'Materiais' },
    'treinamento-presenca': { color: '#0e7490', icon: 'ph-check-square', title: 'Presenças' },
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
window.navigateToTab = function (tabId) {
    const tab = appOpenTabs.find(t => t.tabId === tabId);
    if (!tab) return;
    appOpenTabs.forEach(t => t.active = (t.tabId === tabId));
    renderAppTabs();
    // Salvar o scroll do Pipeline se ele estiver aberto no momento
    const pipeView = document.getElementById('view-logistica-pipeline');
    if (pipeView && pipeView.classList.contains('active')) {
        window._pipelineScrollY = window.scrollY;
    }

    // Restaurar o estado da view correspondente
    document.querySelectorAll('.content-view').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));

    if (tab.target !== 'logistica-pipeline') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (typeof window._pipelineScrollY !== 'undefined') {
        window.scrollTo({ top: window._pipelineScrollY, behavior: 'instant' });
    }

    if (tab.target === 'treinamento-materiais-terapia' || tab.target === 'treinamento-presenca-terapia') {
        window._currentTreinamentoTipo = 'terapia';
    } else if (tab.target === 'treinamento-materiais' || tab.target === 'treinamento-presenca') {
        window._currentTreinamentoTipo = 'treinamento';
    }

    const actualTarget = tab.target.endsWith('-terapia') ? tab.target.replace('-terapia', '') : tab.target;
    const targetView = document.getElementById(`view-${actualTarget}`);
    if (targetView) targetView.classList.add('active');
    const targetNavObj = document.querySelector(`[data-target="${tab.target}"]`);
    if (targetNavObj) targetNavObj.classList.add('active');
    updateBreadcrumb(tab.target);
    // Module-specific render hooks
    if (tab.target === 'treinamento-materiais' && typeof window.renderTreinamentosTable === 'function') {
        setTimeout(() => window.renderTreinamentosTable(), 80);
    }
    if (tab.target === 'treinamento-presenca' && typeof window.initPresencaTreinamento === 'function') {
        setTimeout(() => window.initPresencaTreinamento(), 80);
    }
    if (tab.target === 'treinamento-materiais-terapia' && typeof window.renderTreinamentosTable === 'function') {
        setTimeout(() => window.renderTreinamentosTable(), 80);
    }
    if (tab.target === 'treinamento-presenca-terapia' && typeof window.initPresencaTreinamento === 'function') {
        setTimeout(() => window.initPresencaTreinamento(), 80);
    }
    if (tab.target === 'logistica-dashboard' && typeof window.renderLogisticaDashboard === 'function') {
        setTimeout(() => window.renderLogisticaDashboard(), 80);
    }
    if (tab.target === 'logistica-sinistros' && typeof window.renderLogisticaSinistros === 'function') {
        setTimeout(() => window.renderLogisticaSinistros(), 80);
    }
    if (tab.target === 'logistica-frota-resumo' && typeof renderFrotaResumo === 'function') {
        setTimeout(() => renderFrotaResumo(), 50);
    }
    if (tab.target === 'logistica-pipeline' && typeof renderPipelinePage === 'function') {
        setTimeout(() => renderPipelinePage(), 80);
    }
    if (tab.target === 'logistica-frota' && typeof window.initFrotaVeiculos === 'function') {
        setTimeout(() => window.initFrotaVeiculos(), 80);
    }
    if (tab.target === 'logistica-credenciamento' && typeof window.carregarHistoricoCredenciamento === 'function') {
        setTimeout(() => window.carregarHistoricoCredenciamento(), 80);
    }
    if (tab.target === 'logistica-itinerantes' && typeof window.renderItinerantesPage === 'function') {
        setTimeout(() => window.renderItinerantesPage(), 80);
    }
    if (tab.target === 'logistica-agenda' && typeof window.renderAgendaLogistica === 'function') {
        setTimeout(() => window.renderAgendaLogistica(), 80);
    }
    // Se a aba tem dados de colaborador (prontuário ou form), restaura o viewedColaborador
    if (tab._colaboradorData) {
        viewedColaborador = tab._colaboradorData;
    }
};

window.closeAppTab = function (tabId) {
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

    // Salvar o scroll do Pipeline se ele estiver aberto no momento
    const pipeView = document.getElementById('view-logistica-pipeline');
    if (pipeView && pipeView.classList.contains('active')) {
        window._pipelineScrollY = window.scrollY;
    }

    document.querySelectorAll('.content-view').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));

    if (target !== 'logistica-pipeline') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (typeof window._pipelineScrollY !== 'undefined') {
        window.scrollTo({ top: window._pipelineScrollY, behavior: 'instant' });
    }

    if (target === 'treinamento-materiais-terapia' || target === 'treinamento-presenca-terapia') {
        window._currentTreinamentoTipo = 'terapia';
    } else if (target === 'treinamento-materiais' || target === 'treinamento-presenca') {
        window._currentTreinamentoTipo = 'treinamento';
    }

    const actualTarget = target.endsWith('-terapia') ? target.replace('-terapia', '') : target;
    const targetView = document.getElementById(`view-${actualTarget}`);
    if (targetView) targetView.classList.add('active');

    const targetNavObj = document.querySelector(`[data-target="${target}"]`);
    if (targetNavObj) targetNavObj.classList.add('active');

    updateBreadcrumb(target);

    if (target === 'dashboard') {
        loadDashboard();
    } else if (target === 'colaboradores') {
        loadColaboradores();
    } else if (target === 'departamentos') { loadDepartamentos(); }
    if (target === 'cargos') {
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
    } else if (target === 'experiencia') {
        if (typeof window.loadExperiencia === 'function') window.loadExperiencia();
    } else if (target === 'ferias') {
        if (typeof window.renderFerias === 'function') window.renderFerias();
    } else if (target === 'dissidio') {
        if (typeof window.renderDissidio === 'function') window.renderDissidio();
    } else if (target === 'recibos') {
        if (typeof window.initRecibosView === 'function') setTimeout(() => window.initRecibosView(), 80);
    } else if (target === 'logistica-dashboard') {
        if (typeof window.renderLogisticaDashboard === 'function') setTimeout(() => window.renderLogisticaDashboard(), 80);
    } else if (target === 'logistica-sinistros') {
        if (typeof window.renderLogisticaSinistros === 'function') setTimeout(() => window.renderLogisticaSinistros(), 80);
    } else if (target === 'logistica-frota-resumo') {
        if (typeof renderFrotaResumo === 'function') setTimeout(() => renderFrotaResumo(), 80);
    } else if (target === 'logistica-pipeline') {
        if (typeof renderPipelinePage === 'function') setTimeout(() => renderPipelinePage(), 80);
    } else if (target === 'logistica-resumo-rota') {
        if (typeof window.renderResumoRota === 'function') setTimeout(() => window.renderResumoRota(), 80);
    } else if (target === 'logistica-multas') {
        if (typeof initMultasLogistica === 'function') setTimeout(() => initMultasLogistica(), 80);
    } else if (target === 'logistica-multas-monaco') {
        if (typeof window.initMultasMonaco === 'function') setTimeout(() => window.initMultasMonaco(), 80);
    } else if (target === 'logistica-equipes') {
        if (typeof window.initEquipes === 'function') setTimeout(() => window.initEquipes(), 80);
    } else if (target === 'logistica-frota') {
        if (typeof window.initFrotaVeiculos === 'function') setTimeout(() => window.initFrotaVeiculos(), 80);
    } else if (target === 'logistica-credenciamento') {
        if (typeof window.carregarHistoricoCredenciamento === 'function') setTimeout(() => window.carregarHistoricoCredenciamento(), 80);
    } else if (target === 'logistica-itinerantes') {
        if (typeof window.renderItinerantesPage === 'function') setTimeout(() => window.renderItinerantesPage(), 80);
    } else if (target === 'rh-agenda') {
        if (typeof window.renderAgendaRH === 'function') setTimeout(() => window.renderAgendaRH(), 80);
    } else if (target === 'pagamentos-massa') {
        if (typeof window.renderPagamentosMassa === 'function') setTimeout(() => window.renderPagamentosMassa(), 80);
    } else if (target === 'logistica-agenda') {
        if (typeof window.renderAgendaLogistica === 'function') setTimeout(() => window.renderAgendaLogistica(), 80);
    } else if (target === 'logistica-epi') {
        if (typeof window.renderLogisticaEpi === 'function') setTimeout(() => window.renderLogisticaEpi(), 80);
    } else if (target === 'comercial-credenciamento') {
        if (typeof window.carregarHistoricoComCred === 'function') setTimeout(() => window.carregarHistoricoComCred(), 80);
    } else if (target === 'comercial-proposta') {
        if (typeof window.inicializarPropostas === 'function') setTimeout(() => window.inicializarPropostas(), 80);
    } else if (target === 'licencas') {
        if (typeof window.initLicencas === 'function') setTimeout(() => window.initLicencas(), 80);
    } else if (target === 'config-sigor') {
        if (typeof window.initConfigSigor === 'function') setTimeout(() => window.initConfigSigor(), 80);
    } else if (target === 'treinamento-materiais') {
        if (typeof window.renderTreinamentosTable === 'function') setTimeout(() => window.renderTreinamentosTable(), 80);
    } else if (target === 'treinamento-presenca') {
        if (typeof window.initPresencaTreinamento === 'function') setTimeout(() => window.initPresencaTreinamento(), 80);
    } else if (target === 'treinamento-materiais-terapia') {
        if (typeof window.renderTreinamentosTable === 'function') setTimeout(() => window.renderTreinamentosTable(), 80);
    } else if (target === 'treinamento-presenca-terapia') {
        if (typeof window.initPresencaTreinamento === 'function') setTimeout(() => window.initPresencaTreinamento(), 80);
    }
}


// Abre uma aba de CADASTRO de colaborador, nomeada com o colaborador.
// Se já existir aba para esse colaborador, apenas ativa. Novo colaborador usa tabId 'form-colaborador-novo'.
window._openColaboradorTab = function (colabId, nomeColab) {
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
window._openProntuarioTab = function (colabId, nomeColab, colaboradorData) {
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
    } catch (e) {
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
    const isDir = window.isTopAdmin;
    const btnNovo = document.querySelector('button[onclick="toggleCargoView(\'new\')"]');
    if (btnNovo) btnNovo.style.display = isDir ? '' : 'none';
    const colsAcao = document.querySelectorAll('#cargo-list-container th:last-child');
    // Remove action buttons if not top admin
    if (!isDir) { setTimeout(() => { document.querySelectorAll('#table-cargos-body td:last-child').forEach(td => td.style.display = 'none'); }, 100); }
    colsAcao.forEach(c => c.style.display = isDir ? '' : 'none');

    const cargos = await apiGet('/cargos');
    const deptos = await apiGet('/departamentos') || [];
    window.allCargosCache = cargos;
    const tbody = document.getElementById('table-cargos-body');
    if (!tbody || !cargos) return;

    tbody.innerHTML = '';
    cargos.forEach(c => {
        tbody.innerHTML += `
            <tr>
                <td>${c.id}</td>
                <td style="font-weight: 600;">${c.nome}</td>
                <td>
                    ${c.departamento 
                        ? `<span style="background:#f1f5f9;color:#475569;padding:2px 8px;border-radius:10px;font-size:0.8rem;font-weight:600;">${c.departamento}</span>` 
                        : '-'}
                </td>
                <td>
                    ${(() => {
                        const deptoObj = deptos.find(d => d.nome === c.departamento);
                        const resp = deptoObj ? deptoObj.responsavel_nome : '';
                        return resp ? `<span style="font-size:0.85rem; color:#64748b;"><i class="ph ph-user"></i> ${resp}</span>` : '-';
                    })()}
                </td>
                <td style="text-align: right; gap:0.4rem; justify-content:flex-end; align-items:center; display: ${window.isTopAdmin ? "flex" : "none"};">
                    <button type="button" class="btn btn-primary btn-sm" onclick="window.toggleCargoView('edit', ${c.id})">
                        <i class="ph ph-note-pencil"></i> Editar
                    </button>
                    <button type="button" class="btn btn-danger btn-sm" onclick="window.deleteCargo(${c.id}, '${c.nome.replace(/'/g, "\\'")}')"
                        style="background:#e03131; border-color:#e03131;">
                        <i class="ph ph-trash"></i> Excluir
                    </button>
                </td>
            </tr>
        `;
    });

    // Também popula o select do formulário de colaborador (para quando estiver cadastrando alguém)
    const cargoList = document.getElementById('colab-cargo-list');
    if (cargoList) {
        cargoList.innerHTML = '';
        cargos.forEach(c => {
            const option = document.createElement('option');
            option.value = c.nome;
            cargoList.appendChild(option);
        });
    }
}

window.deleteCargo = async function (id, nome) {
    if (!confirm(`Excluir permanentemente o cargo "${nome}"?\n\nEsta ação não pode ser desfeita.`)) return;
    try {
        const res = await fetch(`${API_URL}/cargos/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        const data = await res.json();
        if (!res.ok) {
            alert(data.error || 'Erro ao excluir cargo.');
            return;
        }
        // Recarrega a lista
        await loadCargos();
    } catch (e) {
        alert('Erro ao excluir cargo: ' + e.message);
    }
};

// Filtra as linhas da tabela de cargos pelo texto digitado
window.filtrarListaCargos = function (query) {
    const q = (query || '').toLowerCase().trim();
    document.querySelectorAll('#table-cargos-body tr').forEach(row => {
        const nome = (row.cells[1]?.textContent || '').toLowerCase();
        const depto = (row.cells[2]?.textContent || '').toLowerCase();
        row.style.display = (!q || nome.includes(q) || depto.includes(q)) ? '' : 'none';
    });
};

// Filtra as linhas da tabela de departamentos pelo texto digitado
window.filtrarListaDepartamentos = function (query) {
    const q = (query || '').toLowerCase().trim();
    document.querySelectorAll('#table-departamentos tr').forEach(row => {
        const nome = (row.cells[1]?.textContent || '').toLowerCase();
        row.style.display = (!q || nome.includes(q)) ? '' : 'none';
    });
};

window.toggleCargoView = async function (mode, id = null) {
    const listContainer = document.getElementById('cargo-list-container');
    const formContainer = document.getElementById('cargo-form-container');
    const headerActions = document.getElementById('cargo-header-actions');
    const btnDelete = document.getElementById('btn-cargo-delete');

    // Esconder/Mostrar Containers
    if (mode === 'list') {
        if (listContainer) listContainer.style.display = 'block';
        if (formContainer) formContainer.style.display = 'none';
        if (headerActions) headerActions.style.display = 'none'; // Esconde botões no topo ao ver a lista
        loadCargos();
    } else {
        if (listContainer) listContainer.style.display = 'none';
        if (formContainer) formContainer.style.display = 'block';
        if (headerActions) headerActions.style.display = 'flex'; // Mostra botões no topo ao editar/criar

        if (mode === 'new') {
            document.getElementById('manage-cargo-id').value = '';
            document.getElementById('cargo-input-name').value = '';
            document.getElementById('cargo-form-label').textContent = 'Novo Cargo';
            if (btnDelete) btnDelete.style.display = 'none';
            renderCargoChecklist(null);  // null = sem cargo ainda, checkboxes desabilitados
            document.getElementById('cargo-input-name').focus();
            // Garantir que o dropdown de departamentos esteja populado
            await populateCargoDeptoSelect();
        } else if (mode === 'edit' && id) {
            document.getElementById('manage-cargo-id').value = id;
            document.getElementById('cargo-form-label').textContent = 'Editar Cargo';
            if (btnDelete) btnDelete.style.display = 'block';

            await populateCargoDeptoSelect();
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
        } catch (e) { console.error('Erro ao carregar documentos:', e); }
    }

    checklist.innerHTML = '';
    DOCS_DISPONIVEIS.forEach(doc => {
        const checked = documentosSalvos.includes(doc) ? 'checked' : '';
        const disabled = cargoId ? '' : 'disabled';
        const cbId = `cb-doc-${doc.replace(/[^a-zA-Z0-9]/g, '_')}`;
        const label = document.createElement('label');
        label.style.cssText = 'display:flex; align-items:center; gap:8px; font-size:0.82rem; cursor:pointer; padding:0.35rem; border-radius:4px; border:1px solid transparent; transition:all 0.2s;';
        label.onmouseover = () => { label.style.background = '#edf2f7'; label.style.borderColor = '#cbd5e0'; };
        label.onmouseout = () => { label.style.background = 'transparent'; label.style.borderColor = 'transparent'; };
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.id = cbId;
        cb.className = 'cb-cargo-doc-main';
        cb.value = doc;
        if (checked) cb.checked = true;
        if (disabled) cb.disabled = true;
        cb.onchange = async function () {
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
            toggleCargoView('list');
            return;
        }
        alert('Nome do cargo salvo!');
        toggleCargoView('list');
    } catch (err) {
        console.error('Erro ao salvar cargo:', err);
        alert('Erro de conexão ao salvar cargo.');
    }
}

window.saveCargoConfig = async function () {
    console.log('saveCargoConfig called');
    await handleCargoFormSubmit();
};

window.handleDeleteCargoUI = async function () {
    const id = document.getElementById('manage-cargo-id').value;
    const nome = document.getElementById('cargo-input-name').value;
    if (!id) return;

    if (nome.toUpperCase() === 'MOTORISTA') {
        alert('O cargo MOTORISTA é essencial para o sistema e não pode ser excluído.');
        return;
    }

    if (confirm('Tem certeza que deseja excluir este cargo?')) {
        const res = await apiDelete(`/cargos/${id}`);
        if (res && res.error) alert(res.error);
        else {
            toggleCargoView('list');
        }
    }
}

// Excluir cargo diretamente da listagem (sem precisar abrir o formulário de edição)
window.deletarCargoDireto = async function (id, nome) {
    if (nome.toUpperCase() === 'MOTORISTA') {
        alert('O cargo MOTORISTA é essencial para o sistema e não pode ser excluído.');
        return;
    }
    if (!confirm(`Tem certeza que deseja excluir o cargo "${nome}"?`)) return;
    const res = await apiDelete(`/cargos/${id}`);
    if (res && res.error) {
        alert(res.error);
    } else {
        loadCargos();
    }
}

// ─── CERTIFICADO DIGITAL PÓS-ASSINATURA ───────────────────────────────────────
// Aplica o certificado A1 da empresa no PDF após o colaborador assinar no Assinafy
window.assinarComCertificado = async function (assId, event) {
    if (event) { event.preventDefault(); event.stopPropagation(); }
    const btn = event?.currentTarget || event?.target;
    const originalText = btn ? btn.innerHTML : '';
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Assinando...'; }

    try {
        const res = await fetch(`${API_URL}/admissao-assinaturas/${assId}/assinar-certificado`, {
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

    } catch (e) {
        if (btn) { btn.disabled = false; btn.innerHTML = originalText; }
        if (typeof showToast === 'function') showToast('❌ ' + e.message, 'error');
        else alert('❌ ' + e.message);
    }
};

async function carregarOpcoesResponsavel(selectElementId, responsavelId) {
    const select = document.getElementById(selectElementId);
    if (!select) return;

    // Buscar colaboradores
    const colabs = await apiGet('/colaboradores');
    select.innerHTML = '<option value="">Nenhum</option>';

    if (colabs) {
        colabs.forEach(c => {
            if (c.status === 'Desligado') return;
            const opt = document.createElement('option');
            opt.value = c.id;
            opt.dataset.nome = c.nome_completo;
            opt.textContent = c.nome_completo;
            if (responsavelId && c.id == responsavelId) opt.selected = true;
            select.appendChild(opt);
        });
    }
}

async function loadDepartamentos() {
    const deptos = await apiGet('/departamentos');
    const tbody = document.getElementById('table-departamentos');
    if (!tbody || !deptos) return;
    tbody.innerHTML = '';

    carregarOpcoesResponsavel('novo-departamento-responsavel');

    deptos.forEach(d => {
        const responsavel = d.responsavel_nome ? d.responsavel_nome : '<span style="color:#94a3b8;font-style:italic;">Não definido</span>';
        const tipo = d.tipo || 'Operacional';
        const badgeColor = tipo === 'Administrativo'
            ? 'background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe;'
            : 'background:#fff7ed;color:#c2410c;border:1px solid #fed7aa;';
        tbody.innerHTML += `<tr>
            <td>${d.id}</td>
            <td style="font-weight: 600;">${d.nome}</td>
            <td><span style="${badgeColor}font-size:0.75rem;padding:2px 10px;border-radius:999px;font-weight:600;">${tipo}</span></td>
            <td>${responsavel}</td>
            <td style="text-align: right; display:flex; gap:0.4rem; justify-content:flex-end; align-items:center;">
                <button type="button" class="btn btn-primary btn-sm" onclick="editDepartamento(${d.id}, '${d.nome.replace(/'/g, "\\'")}','${tipo}','${d.responsavel_id || ''}')" title="Editar">
                    <i class="ph ph-note-pencil"></i> Editar
                </button>
                <button type="button" class="btn btn-danger btn-sm" onclick="deleteDepartamento(${d.id}, '${d.nome.replace(/'/g, "\\'").replace(/"/g, "&quot;")}')" title="Excluir" style="background:#e03131; border-color:#e03131;">
                    <i class="ph ph-trash"></i> Excluir
                </button>
            </td>
        </tr>`;
    });
}

window.editDepartamento = async function (id, nomeAtual, tipoAtual, responsavelIdAtual) {
    document.getElementById('edit-departamento-id').value = id;
    document.getElementById('edit-departamento-nome').value = nomeAtual;
    document.getElementById('edit-departamento-tipo').value = tipoAtual || 'Operacional';
    await carregarOpcoesResponsavel('edit-departamento-responsavel', responsavelIdAtual);
    document.getElementById('modal-editar-departamento').style.display = 'flex';
}

document.getElementById('form-editar-departamento')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('edit-departamento-id').value;
    const nome = document.getElementById('edit-departamento-nome').value.trim();
    const tipo = document.getElementById('edit-departamento-tipo').value;
    const selectResp = document.getElementById('edit-departamento-responsavel');
    const responsavel_id = selectResp.value || null;
    const responsavel_nome = selectResp.options[selectResp.selectedIndex]?.dataset.nome || null;

    const res = await fetch(`${API_URL}/departamentos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${currentToken}` },
        body: JSON.stringify({ nome: nome, tipo, responsavel_id, responsavel_nome })
    });
    const data = await res.json();
    if (data.error) alert(data.error);

    document.getElementById('modal-editar-departamento').style.display = 'none';
    loadDepartamentos();
});

window.deleteDepartamento = async function (id, nome) {
    const msg = nome ? `Tem certeza que deseja excluir o departamento "${nome}"?` : 'Tem certeza que deseja excluir este departamento?';
    if (confirm(msg)) {
        const res = await apiDelete(`/departamentos/${id}`);
        if (res && res.error) alert(res.error);
        loadDepartamentos();
    }
}

document.getElementById('form-departamento')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nome = document.getElementById('novo-departamento-nome').value.trim();
    const tipo = document.getElementById('novo-departamento-tipo')?.value || 'Operacional';
    const selectResp = document.getElementById('novo-departamento-responsavel');
    const responsavel_id = selectResp.value || null;
    const responsavel_nome = selectResp.options[selectResp.selectedIndex]?.dataset.nome || null;

    if (!nome) return;
    await apiPost('/departamentos', { nome, tipo, responsavel_id, responsavel_nome });
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
window.toggleFormEscalaTipo = function () {
    const tipo = document.getElementById('colab-escala-padrao').value;
    const boxFolgas = document.getElementById('colab-box-folgas');
    const boxSabado = document.getElementById('colab-box-sabado');
    const outSaida = document.getElementById('colab-saida');

    const boxUmaFolga = document.getElementById('colab-box-uma-folga');
    const boxCiclo = document.getElementById('colab-box-ciclo-domingo');

    if (tipo === 'escala_uma_folga') {
        if (boxUmaFolga) boxUmaFolga.style.display = 'block';
        if (boxFolgas) boxFolgas.style.display = 'none';
        if (boxCiclo) { boxCiclo.style.display = 'block'; atualizarLabelCiclo('folga'); }
        document.querySelectorAll('.cb-folga-colab').forEach(cb => cb.checked = false);
    } else if (tipo === 'escala_duas_folgas') {
        if (boxFolgas) boxFolgas.style.display = 'block';
        if (boxUmaFolga) boxUmaFolga.style.display = 'none';
        if (boxCiclo) { boxCiclo.style.display = 'block'; atualizarLabelCiclo('folga'); }
        document.querySelectorAll('.cb-uma-folga-colab').forEach(cb => cb.checked = false);
    } else if (tipo === 'escala_12x36') {
        if (boxFolgas) boxFolgas.style.display = 'none';
        if (boxUmaFolga) boxUmaFolga.style.display = 'none';
        if (boxCiclo) { boxCiclo.style.display = 'block'; atualizarLabelCiclo('12x36'); }
        document.querySelectorAll('.cb-folga-colab').forEach(cb => cb.checked = false);
        document.querySelectorAll('.cb-uma-folga-colab').forEach(cb => cb.checked = false);
    } else if (tipo === 'padrao_sab_alternado') {
        if (boxFolgas) boxFolgas.style.display = 'none';
        if (boxUmaFolga) boxUmaFolga.style.display = 'none';
        if (boxCiclo) { boxCiclo.style.display = 'block'; atualizarLabelCiclo('sab_alternado'); }
        document.querySelectorAll('.cb-folga-colab').forEach(cb => cb.checked = false);
        document.querySelectorAll('.cb-uma-folga-colab').forEach(cb => cb.checked = false);
    } else {
        if (boxFolgas) boxFolgas.style.display = 'none';
        if (boxUmaFolga) boxUmaFolga.style.display = 'none';
        if (boxCiclo) boxCiclo.style.display = 'none';
        document.querySelectorAll('.cb-folga-colab').forEach(cb => cb.checked = false);
        document.querySelectorAll('.cb-uma-folga-colab').forEach(cb => cb.checked = false);
    }

    if (boxSabado) {
        if (tipo === 'padrao_sab_4h' || tipo === 'padrao_sab_alternado') {
            boxSabado.style.display = 'block';
        } else {
            boxSabado.style.display = 'none';
            document.getElementById('colab-sabado-entrada').value = '';
            document.getElementById('colab-sabado-saida').value = '';
        }
    }

    // 12x36: saída calculada automaticamente (não editável)
    if (outSaida) {
        if (tipo === 'escala_12x36') {
            outSaida.setAttribute('readonly', 'true');
            outSaida.style.backgroundColor = '#e9ecef';
            outSaida.style.cursor = 'not-allowed';
            outSaida.title = 'Calculado automaticamente: entrada + 12h';
        } else {
            outSaida.removeAttribute('readonly');
            outSaida.style.backgroundColor = '';
            outSaida.style.cursor = '';
            outSaida.title = '';
        }
    }

    calcularHorarioSaida();
}

// Atualiza o título e descrição do bloco de ciclo conforme o tipo de escala
window.atualizarLabelCiclo = function (modo) {
    const lbl = document.querySelector('#colab-box-ciclo-domingo label');
    const small = document.querySelector('#colab-box-ciclo-domingo small');
    if (!lbl || !small) return;
    if (modo === '12x36') {
        lbl.innerHTML = '<i class="ph ph-calendar-blank"></i> 12x36 — Data de início do ciclo';
        small.innerHTML = '<i class="ph ph-info"></i> Informe o <strong>primeiro dia de trabalho</strong> desta pessoa. '
            + 'O sistema alterna automaticamente: <strong>1 dia trabalha → 1 dia folga (36h)</strong>.<br>'
            + 'Sem essa data o colaborador aparece sempre como disponível na agenda.';
    } else if (modo === 'sab_alternado') {
        lbl.innerHTML = '<i class="ph ph-calendar-blank"></i> Sábados Alternados — Data de referência';
        small.innerHTML = '<i class="ph ph-info"></i> Informe um <strong>sábado trabalhado</strong> de referência. '
            + 'O sistema alterna automaticamente: <strong>sábado trabalha → sábado folga → sábado trabalha...</strong><br>'
            + 'Sem essa data o sistema não saberá qual sábado é folga.';
    } else {
        lbl.innerHTML = '<i class="ph ph-calendar-blank"></i> Domingo de Lei — Data de Referência do Ciclo';
        small.innerHTML = '<i class="ph ph-info"></i> Informe um <strong>domingo</strong> onde o ciclo começa (<em>1º domingo trabalhado</em>). '
            + 'A cada 3 domingos, o sistema automaticamente marca o 3º como <strong>Domingo de Lei</strong> (folga obrigatória).<br>'
            + 'Para Folga 2 dias: na semana do Domingo de Lei, o 1º dia fixo se torna trabalho para manter a carga horária.<br>'
            + 'Para Folga 1 dia: o Domingo de Lei é somado à folga fixa (semana com menos horas — legal).';
    }
};


window.toggleTipoDocumento = function () {
    const sel = document.getElementById('colab-rg-tipo');
    const rgInput = document.getElementById('colab-rg');
    const cpfInput = document.getElementById('colab-cpf');
    const lbl = document.getElementById('lbl-colab-rg');
    const boxOrgao = document.getElementById('box-rg-orgao');
    const boxData = document.getElementById('box-rg-data');

    if (sel && rgInput && cpfInput && lbl) {
        if (sel.value === 'CIN') {
            lbl.textContent = 'Número (CIN)';
            rgInput.value = cpfInput.value;
            rgInput.setAttribute('readonly', 'true');
            rgInput.style.backgroundColor = '#e9ecef';
            if (boxOrgao) boxOrgao.style.display = 'none';
            if (boxData) boxData.style.display = 'none';
        } else {
            lbl.textContent = 'Número (RG)';
            rgInput.removeAttribute('readonly');
            rgInput.style.backgroundColor = '';
            if (boxOrgao) boxOrgao.style.display = 'block';
            if (boxData) boxData.style.display = 'block';
            // Limpa apenas se estiver igual ao CPF (foi preenchido por CIN)
            if (rgInput.value === cpfInput.value) {
                rgInput.value = '';
            }
        }
    }
};


window.toggleFormacaoFields = function (val) {
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

window.toggleAcademiaFields = function (val) {
    const section = document.getElementById('section-academia');
    if (section) {
        section.style.display = (val === 'Sim') ? 'block' : 'none';
        if (val === 'Não') {
            const diInput = document.getElementById('colab-academia-data-inicio');
            if (diInput) diInput.value = '';
        }
    }
};

window.toggleTerapiaFields = function (val) {
    const section = document.getElementById('section-terapia');
    if (section) {
        section.style.display = (val === 'Sim') ? 'block' : 'none';
        if (val === 'Não') {
            const diInput = document.getElementById('colab-terapia-data-inicio');
            if (diInput) diInput.value = '';
        }
    }
};

window.toggleCelularFields = function (val) {
    const section = document.getElementById('section-celular');
    if (section) {
        section.style.display = (val === 'Sim') ? 'block' : 'none';
        if (val === 'Não') {
            const dInput = document.getElementById('colab-celular-data');
            if (dInput) dInput.value = '';
        }
    }
};

window.toggleChavesColabFields = function (val) {
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

window.toggleBrigadistaFields = function (val) {
    const section = document.getElementById('section-brigadista');
    if (section) {
        section.style.display = (val === 'Sim') ? 'block' : 'none';
        if (val === 'Não') {
            const vld = document.getElementById('colab-brigadista-validade');
            if (vld) vld.value = '';
        }
    }
};

window.addNewChaveRow = async function (selectedChaveId = null, selectedDate = null) {
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

window.removeChaveRow = function (btn) {
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
    } catch (e) { console.error('Erro ao carregar cursos para dropdown:', e); }
}

window.toggleTransporteValor = function (val) {
    const group = document.getElementById('group-valor-transporte');
    const input = document.getElementById('colab-valor-transporte');
    if (group) {
        // Mostrar se for VT ou VC
        if (val === 'Vale Transporte (VT)' || val === 'Vale Combustível (VC)') {
            group.style.display = 'block';
            // Se for VT, definir valor diário fixo
            if (val === 'Vale Transporte (VT)') {
                if (input) input.value = 'R$ 6,20';
                // Atualiza o label com dica visual
                const lbl = group.querySelector('label');
                if (lbl && !lbl.querySelector('.vt-hint')) {
                    const hint = document.createElement('small');
                    hint.className = 'vt-hint';
                    hint.style.cssText = 'color:#16a34a;font-weight:600;margin-left:6px;font-size:0.78rem;';
                    hint.textContent = '(Valor Diário Fixo)';
                    lbl.appendChild(hint);
                }
            } else {
                // Para VC, remove hint se existir
                const lbl = group.querySelector('label');
                const hint = lbl && lbl.querySelector('.vt-hint');
                if (hint) hint.remove();
            }
        } else {
            group.style.display = 'none';
            if (input) input.value = '';
            // Remove hint se existir
            const lbl = group && group.querySelector('label');
            const hint = lbl && lbl.querySelector('.vt-hint');
            if (hint) hint.remove();
        }
    }
};

// Recalcula VT em tempo real ao editar o salário (chamado pelo onkeyup do campo salário)
window.atualizarVTSeSelecionado = function () {
    const meioEl = document.getElementById('colab-meio-transporte');
    if (!meioEl || meioEl.value !== 'Vale Transporte (VT)') return;
    const inputT = document.getElementById('colab-valor-transporte');
    if (!inputT) return;
    
    // Força 6,20 para VT em vez de calcular 6% do salário
    inputT.value = 'R$ 6,20';
};

window.calcularHorarioSaida = function () {
    const tipo = document.getElementById('colab-escala-padrao').value;
    const entrada = document.getElementById('colab-entrada').value;
    const intEntrada = document.getElementById('colab-intervalo-entrada').value;
    const intSaida = document.getElementById('colab-intervalo-saida').value;
    const outSaida = document.getElementById('colab-saida');

    // ── Escala 12x36: lógica especial ──────────────────────────────────────────
    if (tipo === 'escala_12x36') {
        if (entrada) {
            const [he, me] = entrada.split(':').map(Number);
            const entradaMins = he * 60 + me;

            // Saída = entrada + 12h (não editável)
            const saidaMins = entradaMins + 12 * 60;
            const hSaida = Math.floor(saidaMins / 60) % 24;
            const mSaida = saidaMins % 60;
            if (outSaida) outSaida.value = `${String(hSaida).padStart(2, '0')}:${String(mSaida).padStart(2, '0')}`;

            // Pausa = 1h a partir de 6h após entrada (editável — só preenche se estiver vazio)
            if (!intEntrada && !intSaida) {
                const pausaInicioMins = entradaMins + 6 * 60;
                const pausaFimMins = pausaInicioMins + 60;
                const hPI = Math.floor(pausaInicioMins / 60) % 24;
                const mPI = pausaInicioMins % 60;
                const hPF = Math.floor(pausaFimMins / 60) % 24;
                const mPF = pausaFimMins % 60;
                document.getElementById('colab-intervalo-entrada').value = `${String(hPI).padStart(2, '0')}:${String(mPI).padStart(2, '0')}`;
                document.getElementById('colab-intervalo-saida').value = `${String(hPF).padStart(2, '0')}:${String(mPF).padStart(2, '0')}`;
            }
        } else if (outSaida) {
            outSaida.value = '';
        }
        return; // Encerra: 12x36 não tem cálculo de sábado
    }
    // ── Demais escalas ──────────────────────────────────────────────────────────

    if (tipo && entrada) {
        // Calcula duração do intervalo em minutos
        let intervaloMins = 0;
        if (intEntrada && intSaida) {
            const [h1, m1] = intEntrada.split(':').map(Number);
            const [h2, m2] = intSaida.split(':').map(Number);
            intervaloMins = (h2 * 60 + m2) - (h1 * 60 + m1);
            if (intervaloMins < 0) intervaloMins += 24 * 60;
        }

        // Tempo líquido de trabalho diário
        let workMins = 0;
        if (tipo === 'padrao_seis_dias' || tipo === 'escala_uma_folga') {
            workMins = 7 * 60 + 20; // 7h 20m
        } else if (tipo === 'padrao_sab_4h' || tipo === 'padrao_sab_alternado') {
            workMins = 8 * 60; // 8h
        } else if (tipo === 'escala_duas_folgas' || tipo === 'padrao_seg_sexta') {
            workMins = 8 * 60 + 48; // 8h 48m
        }

        // Definir e preencher intervalo automaticamente se o turno for >= 6 horas (regras da CLT)
        let almoçoPadraoMin = 0;
        if (workMins >= (6 * 60)) {
            almoçoPadraoMin = 60; // 1 hora de almoço

            // Se os campos de intervalo estiverem em branco, preenchemos com um padrão inteligente
            if (!intEntrada && !intSaida) {
                const [he, me] = entrada.split(':').map(Number);
                // Sugere almoço 4 horas após a entrada
                let tempEntradaAlmoco = (he * 60 + me) + (4 * 60);
                const hEntAlmoco = Math.floor(tempEntradaAlmoco / 60) % 24;
                const mEntAlmoco = tempEntradaAlmoco % 60;

                let tempSaidaAlmoco = tempEntradaAlmoco + almoçoPadraoMin;
                const hSaiAlmoco = Math.floor(tempSaidaAlmoco / 60) % 24;
                const mSaiAlmoco = tempSaidaAlmoco % 60;

                document.getElementById('colab-intervalo-entrada').value = `${String(hEntAlmoco).padStart(2, '0')}:${String(mEntAlmoco).padStart(2, '0')}`;
                document.getElementById('colab-intervalo-saida').value = `${String(hSaiAlmoco).padStart(2, '0')}:${String(mSaiAlmoco).padStart(2, '0')}`;
                intervaloMins = almoçoPadraoMin;
            }
        }

        if (workMins > 0) {
            const [he, me] = entrada.split(':').map(Number);
            let totalMins = (he * 60 + me) + workMins + intervaloMins; // O total do dia no relógio é o trabalho + o intervalo
            const hFinal = Math.floor(totalMins / 60) % 24;
            const mFinal = totalMins % 60;
            if (outSaida) outSaida.value = `${String(hFinal).padStart(2, '0')}:${String(mFinal).padStart(2, '0')}`;
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


async function populateCargoDeptoSelect(selectedValue = '') {
    const selectCargoDepto = document.getElementById('cargo-input-departamento');
    if (!selectCargoDepto) return;
    try {
        const deptos = await apiGet('/departamentos');
        selectCargoDepto.innerHTML = '<option value="" selected disabled>Selecionar</option>';
        (deptos || []).forEach(d => {
            const opt = document.createElement('option');
            opt.value = d.nome;
            opt.textContent = d.nome;
            if (selectedValue && d.nome === selectedValue) opt.selected = true;
            selectCargoDepto.appendChild(opt);
        });
    } catch (e) { console.error('Erro ao carregar departamentos:', e); }
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

window.autoFillDepartamento = function () {
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

window.updateVacationInfo = function (admissaoStr) {
    const aqField = document.getElementById('ferias-periodo-aquisitivo');
    const concField = document.getElementById('ferias-periodo-concessivo');
    const indicator = document.getElementById('ferias-concessivo-indicator');

    // Tenta ler do campo do formulário se admissaoStr vazio
    if (!admissaoStr) admissaoStr = document.getElementById('colab-admissao')?.value || '';

    if (!admissaoStr || !aqField || !concField) {
        if (aqField) aqField.value = '-';
        if (concField) { concField.value = '-'; concField.style.color = '#495057'; }
        if (indicator) indicator.style.display = 'none';
        return;
    }

    try {
        // ─── Usa calcularFerias do ferias.js se disponível (garante cálculo idêntico) ───
        const fmt = window._feriasFmt || ((s) => {
            if (!s) return '—';
            const [y, m, d] = String(s).split('T')[0].split('-');
            return (!y || !m || !d) ? s : `${d}/${m}/${y}`;
        });

        // Parse robusto: aceita YYYY-MM-DD, DD/MM/YYYY e timestamps
        const parseAdm = (s) => {
            if (!s) return null;
            let clean = String(s).split('T')[0].split(' ')[0];
            // Converte DD/MM/YYYY → YYYY-MM-DD
            if (/^\d{2}\/\d{2}\/\d{4}$/.test(clean)) {
                const [dd, mm, yyyy] = clean.split('/');
                clean = `${yyyy}-${mm}-${dd}`;
            }
            const d = new Date(clean + 'T12:00:00');
            return isNaN(d.getTime()) ? null : d;
        };

        const adm = parseAdm(admissaoStr);
        if (!adm) {
            aqField.value = '-';
            concField.value = '-';
            if (indicator) indicator.style.display = 'none';
            return;
        }

        const today = new Date(); today.setHours(12, 0, 0, 0);

        // ─── Usa calcularFerias do ferias.js (exposta via window._feriasCalc) ───
        if (typeof window._feriasCalc === 'function') {
            // Normaliza para YYYY-MM-DD antes de passar
            const admISO = adm.toISOString().split('T')[0];
            const info = window._feriasCalc(admISO);
            if (!info || !info.temDireitoAtual || info.periodos.length === 0) {
                aqField.value = 'Em aquisição';
                concField.value = '-';
                concField.style.color = '#495057';
                if (indicator) indicator.style.display = 'none';
                return;
            }
            const ult = info.periodos[info.periodos.length - 1];
            aqField.value = fmt(ult.fim);       // início do concessivo
            concField.value = fmt(ult.prazoGozo); // prazo limite

            const diasParaVencimento = Math.floor((new Date(ult.prazoGozo + 'T12:00:00') - today) / 86400000);
            const concStart = new Date(ult.fim + 'T12:00:00');
            const concEnd = new Date(ult.prazoGozo + 'T12:00:00');

            const fInicioEl = document.getElementById('colab-ferias-programadas-inicio');
            const fFimEl = document.getElementById('colab-ferias-programadas-fim');
            let feriasValidas = false;
            if (fInicioEl?.value && fFimEl?.value) {
                const fI = new Date(fInicioEl.value + 'T12:00:00');
                const fF = new Date(fFimEl.value + 'T12:00:00');
                feriasValidas = fI <= concEnd && fF >= concStart;
            }

            const emConcessivo = today >= concStart;
            const exibirAlerta = emConcessivo && diasParaVencimento >= 0 && diasParaVencimento <= 90 && !feriasValidas;

            if (exibirAlerta) {
                concField.style.color = '#e03131'; concField.style.fontWeight = '700';
                if (indicator) {
                    indicator.style.display = 'flex';
                    const span = indicator.querySelector('span');
                    if (span) span.textContent = diasParaVencimento === 0
                        ? 'Atenção: Férias vencem HOJE!'
                        : `Atenção: As férias vencem em ${diasParaVencimento} dia(s). Devem ser concedidas antes de ${concField.value}!`;
                }
            } else {
                concField.style.color = '#495057'; concField.style.fontWeight = '600';
                if (indicator) indicator.style.display = 'none';
            }
            return;
        }

        // ─── Fallback: cálculo interno (mesmo algoritmo do ferias.js) ───
        const diasTotal = Math.floor((today - adm) / 86400000);
        const anosCompletos = Math.floor(diasTotal / 365);
        if (anosCompletos < 1) {
            aqField.value = 'Em aquisição'; concField.value = '-';
            concField.style.color = '#495057'; concField.style.fontWeight = '600';
            if (indicator) indicator.style.display = 'none';
            return;
        }
        const concStart = new Date(adm); concStart.setFullYear(adm.getFullYear() + anosCompletos);
        const concEnd = new Date(adm); concEnd.setFullYear(adm.getFullYear() + anosCompletos + 1);
        aqField.value = concStart.toLocaleDateString('pt-BR');
        concField.value = concEnd.toLocaleDateString('pt-BR');
        const diasParaVencimento = Math.floor((concEnd - today) / 86400000);
        const emConcessivo = today >= concStart;
        if (emConcessivo && diasParaVencimento >= 0 && diasParaVencimento <= 90) {
            concField.style.color = '#e03131'; concField.style.fontWeight = '700';
        } else {
            concField.style.color = '#495057'; concField.style.fontWeight = '600';
            if (indicator) indicator.style.display = 'none';
        }
    } catch (e) {
        console.error('Erro ao calcular datas de férias:', e);
    }
}



window.calculateVacationDays = function () {
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

    // Re-avaliar alerta de férias ao alterar as datas do formulário
    const admissaoEl = document.getElementById('colab-admissao');
    if (admissaoEl?.value) window.updateVacationInfo(admissaoEl.value);
}

// === FÉRIAS FRACIONADAS ===
window.toggleFeriasFracionadas = function (val) {
    const sec = document.getElementById('section-ferias-fracionadas');
    if (!sec) return;
    sec.style.display = val === 'Sim' ? 'block' : 'none';
    if (val !== 'Sim') {
        // Limpar tipo e segunda data ao desativar
        const tipoN = document.querySelector('input[name="ferias_fracionadas_tipo"][value="Vendida"]');
        if (tipoN) tipoN.checked = false;
        const tipoT = document.querySelector('input[name="ferias_fracionadas_tipo"][value="Tirada"]');
        if (tipoT) tipoT.checked = false;
        window.toggleFeriasFracionadasTipo('');
    }
};

window.toggleFeriasFracionadasTipo = function (val) {
    const sec2 = document.getElementById('section-ferias-segunda-data');
    if (!sec2) return;
    sec2.style.display = val === 'Tirada' ? 'block' : 'none';
    if (val !== 'Tirada') {
        const i2 = document.getElementById('colab-ferias-fracionadas-inicio2');
        const f2 = document.getElementById('colab-ferias-fracionadas-fim2');
        const d2 = document.getElementById('colab-ferias-fracionadas-dias2');
        if (i2) i2.value = '';
        if (f2) f2.value = '';
        if (d2) d2.value = '-';
    }
};

window.calcularTotalFeriasFracionadas = function () {
    const i2 = document.getElementById('colab-ferias-fracionadas-inicio2')?.value;
    const f2 = document.getElementById('colab-ferias-fracionadas-fim2')?.value;
    const d2 = document.getElementById('colab-ferias-fracionadas-dias2');
    if (!i2 || !f2 || !d2) return;
    const start = new Date(i2), end = new Date(f2);
    if (isNaN(start) || isNaN(end)) { d2.value = '-'; return; }
    const diff = Math.ceil((end - start) / 86400000) + 1;
    d2.value = diff >= 0 ? `${diff} ${diff === 1 ? 'dia' : 'dias'}` : 'Data Inválida';
};

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
                tbFerias.innerHTML = '<tr><td colspan="3" style="text-align:center;color:#999;font-style:italic;">Nenhuma férias a vencer em 90 dias com agendamento.</td></tr>';
            } else {
                chartsData.feriasVencendo.forEach(f => {
                    const cfPts = f.concessivo_fim.split('-');
                    const cfmt = `${cfPts[2]}/${cfPts[1]}/${cfPts[0]}`;

                    const aqPts = f.aquisitivo_fim ? f.aquisitivo_fim.split('-') : cfPts;
                    const afmt = `${aqPts[2]}/${aqPts[1]}/${aqPts[0]}`;

                    const pct = Math.max(0, Math.min(100, 100 - (f.dias_restantes / 365) * 100));

                    // Lógica de cores igual à tela de Controle de Férias
                    let barColor, labelRestante, labelColor;
                    if (f.ferias_agendadas && f.ferias_inicio_fmt) {
                        // Verde — férias agendadas
                        barColor = '#16a34a';
                        labelRestante = `✅ Agendada: ${f.ferias_inicio_fmt}`;
                        labelColor = '#15803d';
                    } else if (f.dias_restantes <= 0) {
                        // Vermelho — prazo vencido
                        barColor = '#ef4444';
                        labelRestante = '⚠️ Prazo vencido!';
                        labelColor = '#ef4444';
                    } else if (f.dias_restantes <= 30) {
                        // Vermelho — urgente (≤30 dias)
                        barColor = '#ef4444';
                        labelRestante = `Vence ${f.dias_restantes}d`;
                        labelColor = '#ef4444';
                    } else if (f.dias_restantes <= 90) {
                        // Laranja — atenção (≤90 dias sem agenda)
                        barColor = '#f59e0b';
                        labelRestante = `Vence ${f.dias_restantes}d`;
                        labelColor = '#b45309';
                    } else {
                        // Cinza — no prazo
                        barColor = '#94a3b8';
                        labelRestante = `Vence ${f.dias_restantes}d`;
                        labelColor = '#94a3b8';
                    }

                    const progressBarHtml = `<div style="min-width:145px;">
                        <div style="font-size:0.71rem;color:#64748b;margin-bottom:3px;">${afmt} &rarr; ${cfmt}</div>
                        <div style="background:#e2e8f0;border-radius:99px;height:6px;position:relative;">
                            <div style="width:${pct}%;background:${barColor};height:100%;border-radius:99px;position:relative;z-index:1;"></div>
                        </div>
                        <div style="font-size:0.69rem;color:${labelColor};margin-top:2px;white-space:nowrap;">${labelRestante}</div>
                    </div>`;

                    const nomeStr = f.nome || '?';
                    const iniciais = nomeStr.trim().split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
                    const fotoApiUrl = `/api/colaboradores/foto/${f.id}`;
                    tbFerias.innerHTML += `
                        <tr style="border-bottom:1px solid #f1f5f9;">
                            <td style="padding:0.6rem 0.65rem;">
                                <div style="display:flex;align-items:center;gap:0.55rem;">
                                    <img src="${fotoApiUrl}" alt="" style="width:31px;height:31px;border-radius:50%;object-fit:cover;flex-shrink:0;border:1.5px solid #f503c540;" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
                                    <div style="display:none;width:31px;height:31px;border-radius:50%;background:#f503c5;align-items:center;justify-content:center;font-size:0.75rem;font-weight:800;color:#fff;flex-shrink:0;opacity:.9;">${iniciais}</div>
                                    <a href="#" style="color:#1c7ed6;text-decoration:none;font-weight:600;font-size:0.85rem;" onclick="event.preventDefault(); editColaborador(${f.id})">${nomeStr}</a>
                                </div>
                            </td>
                            <td colspan="2" style="padding:0.6rem 0.65rem;vertical-align:middle;">${progressBarHtml}</td>
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
                tbAso.innerHTML = '<tr><td colspan="3" style="text-align:center;color:#999;font-style:italic;">Nenhum ASO a vencer em 30 dias.</td></tr>';
            } else {
                chartsData.asoVencendo.forEach(a => {
                    let agendadoDisplay = '<span style="color:#999;font-size:0.8rem;">Não registrado</span>';
                    if (a.aso_exame_data) {
                        agendadoDisplay = `<span style="color:#166534;font-weight:600;"><i class="ph ph-calendar-check"></i> ${a.aso_exame_data}</span>`;
                    }

                    const dtParts = a.vencimento ? a.vencimento.split('-') : [];
                    const vencfmt = dtParts.length === 3 ? `${dtParts[2]}/${dtParts[1]}/${dtParts[0]}` : a.vencimento;

                    const nomeStr = a.nome || '?';
                    const iniciais = nomeStr.trim().split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
                    const fotoApiUrl = `/api/colaboradores/foto/${a.id || 0}`;

                    tbAso.innerHTML += `
                        <tr>
                            <td style="padding:0.6rem 0.65rem;">
                                <div style="display:flex;align-items:center;gap:0.55rem;">
                                    <img src="${fotoApiUrl}" alt="" style="width:31px;height:31px;border-radius:50%;object-fit:cover;flex-shrink:0;border:1.5px solid #d9480f40;" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
                                    <div style="display:none;width:31px;height:31px;border-radius:50%;background:#d9480f;align-items:center;justify-content:center;font-size:0.75rem;font-weight:800;color:#fff;flex-shrink:0;opacity:.9;">${iniciais}</div>
                                    <a href="#" style="color:#1c7ed6;text-decoration:none;font-weight:600;font-size:0.85rem;" onclick="event.preventDefault(); editColaborador(${a.id || 0})">${nomeStr}</a>
                                </div>
                            </td>
                            <td style="color:#d9480f;font-weight:600;vertical-align:middle;">${vencfmt}</td>
                            <td style="vertical-align:middle;">${agendadoDisplay}</td>
                        </tr>
                    `;
                });
            }
        }
    } else {
        // API falhou - mostrar estado vazio nas tabelas
        const tbFerias2 = document.getElementById('dash-table-ferias');
        if (tbFerias2) tbFerias2.innerHTML = '<tr><td colspan="3" style="text-align:center;color:#999;font-style:italic;">Sem dados disponíveis.</td></tr>';
        const tbAso2 = document.getElementById('dash-table-aso');
        if (tbAso2) tbAso2.innerHTML = '<tr><td colspan="3" style="text-align:center;color:#999;font-style:italic;">Sem dados disponíveis.</td></tr>';
        const tbDevol2 = document.getElementById('dash-table-devolucoes');
        if (tbDevol2) tbDevol2.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#999;font-style:italic;">Sem dados disponíveis.</td></tr>';
    }

    // --- Quadro de Devolução de Equipamentos ---
    const tbDevol = document.getElementById('dash-table-devolucoes');
    if (tbDevol) {
        try {
            const emprestimos = await apiGet('/epi-emprestimos');
            tbDevol.innerHTML = '';
            if (!emprestimos || emprestimos.length === 0) {
                tbDevol.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#999;font-style:italic;">Nenhuma devolução pendente.</td></tr>';
            } else {
                const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
                emprestimos.forEach(emp => {
                    const parseData = s => { if (!s) return null; if (s.includes('/')) { const [d,m,y] = s.split('/'); return new Date(y, m-1, d); } return new Date(s + 'T12:00:00'); };
                    const dtDevol = parseData(emp.data_devolucao_prevista);
                    const vencida = dtDevol && dtDevol < hoje;
                    const rowStyle = vencida ? 'background:#fff5f5;' : '';
                    const dataColor = vencida ? '#ef4444' : '#334155';
                    const dtEntregaFmt = emp.data_entrega || '—';
                    const dtDevolFmt = emp.data_devolucao_prevista || '—';
                    const nomeStr = emp.colaborador_nome || '?';
                    const iniciais = nomeStr.trim().split(/\s+/).filter(Boolean).slice(0,2).map(w => w[0]).join('').toUpperCase();
                    const fotoApiUrl = `/api/colaboradores/foto/${emp.colaborador_id}`;
                    const alertIcon = vencida ? '<span title="Prazo vencido" style="color:#ef4444;font-size:1rem;">⚠️ </span>' : '';
                    tbDevol.innerHTML += `
                        <tr style="border-bottom:1px solid #f1f5f9;${rowStyle}">
                            <td style="padding:0.6rem 0.65rem;">
                                <div style="display:flex;align-items:center;gap:0.55rem;">
                                    <img src="${fotoApiUrl}" alt="" style="width:31px;height:31px;border-radius:50%;object-fit:cover;flex-shrink:0;border:1.5px solid #2563eb40;" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
                                    <div style="display:none;width:31px;height:31px;border-radius:50%;background:#2563eb;align-items:center;justify-content:center;font-size:0.75rem;font-weight:800;color:#fff;flex-shrink:0;">${iniciais}</div>
                                    <a href="#" style="color:#1c7ed6;text-decoration:none;font-weight:600;font-size:0.85rem;" onclick="event.preventDefault();editColaborador(${emp.colaborador_id})">${nomeStr}</a>
                                </div>
                            </td>
                            <td style="padding:0.6rem 0.65rem;font-size:0.85rem;color:#475569;">${emp.epi_nome}</td>
                            <td style="padding:0.6rem 0.65rem;font-size:0.82rem;color:#64748b;">${dtEntregaFmt}</td>
                            <td style="padding:0.6rem 0.65rem;font-size:0.85rem;font-weight:600;color:${dataColor};">${alertIcon}${dtDevolFmt}</td>
                            <td style="padding:0.6rem 0.65rem;text-align:center;">
                                <button onclick="window.devolverEquipamento(${emp.id})" title="Registrar Devolução ao Estoque"
                                    style="background:#2563eb;border:none;border-radius:8px;color:#fff;padding:6px 12px;cursor:pointer;font-size:0.85rem;display:inline-flex;align-items:center;gap:5px;transition:background 0.15s;"
                                    onmouseover="this.style.background='#1d4ed8'" onmouseout="this.style.background='#2563eb'">
                                    <i class="ph ph-arrow-u-up-left"></i> Devolver
                                </button>
                            </td>
                        </tr>`;
                });
            }
        } catch(e) {
            if (tbDevol) tbDevol.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#999;font-style:italic;">Erro ao carregar devoluções.</td></tr>';
        }
    }

    // --- Quadro de Aniversariantes do Mês ---
    const tbAniver = document.getElementById('dash-table-aniversariantes');
    if (tbAniver) {
        try {
            const cols = await apiGet('/colaboradores');
            tbAniver.innerHTML = '';
            if (!cols || cols.length === 0) {
                tbAniver.innerHTML = '<tr><td colspan="2" style="text-align:center;color:#999;font-style:italic;">Nenhum aniversariante.</td></tr>';
                const titAniv = document.getElementById('titulo-aniversariantes');
                if (titAniv) titAniv.innerHTML = '0';
            } else {
                const mesAtual = new Date().getMonth() + 1;
                const aniversariantes = cols.filter(c => {
                    if (c.status === 'Desligado') return false;
                    if (!c.data_nascimento) return false;
                    let dt = null;
                    if (c.data_nascimento.includes('-')) {
                        const p = c.data_nascimento.split('-');
                        dt = new Date(p[0], p[1]-1, p[2]);
                    } else if (c.data_nascimento.includes('/')) {
                        const p = c.data_nascimento.split('/');
                        dt = new Date(p[2], p[1]-1, p[0]);
                    } else {
                        dt = new Date(c.data_nascimento);
                    }
                    if (isNaN(dt.getTime())) return false;
                    return dt.getMonth() + 1 === mesAtual;
                });
                
                aniversariantes.sort((a,b) => {
                    const getDay = dtStr => {
                        if (dtStr.includes('-')) return parseInt(dtStr.split('-')[2], 10);
                        if (dtStr.includes('/')) return parseInt(dtStr.split('/')[0], 10);
                        return new Date(dtStr).getDate();
                    };
                    return getDay(a.data_nascimento) - getDay(b.data_nascimento);
                });

                if (aniversariantes.length === 0) {
                    tbAniver.innerHTML = '<tr><td colspan="2" style="text-align:center;color:#999;font-style:italic;">Nenhum aniversariante neste mês.</td></tr>';
                    const titAniv = document.getElementById('titulo-aniversariantes');
                    if (titAniv) titAniv.innerHTML = '0';
                } else {
                    const titAniv = document.getElementById('titulo-aniversariantes');
                    if (titAniv) titAniv.innerHTML = aniversariantes.length;
                    aniversariantes.forEach(c => {
                        const getFormatData = dtStr => {
                            if (dtStr.includes('-')) { const p = dtStr.split('-'); return `${p[2]}/${p[1]}`; }
                            if (dtStr.includes('/')) { const p = dtStr.split('/'); return `${p[0]}/${p[1]}`; }
                            const dt = new Date(dtStr); return `${String(dt.getDate()).padStart(2,'0')}/${String(dt.getMonth()+1).padStart(2,'0')}`;
                        };
                        const dataFmt = getFormatData(c.data_nascimento);
                        const fotoApiUrl = `/api/colaboradores/foto/${c.id}`;
                        const iniciais = (c.nome_completo||'').trim().split(/\\s+/).filter(Boolean).slice(0,2).map(w=>w[0]).join('').toUpperCase();
                        
                        tbAniver.innerHTML += `
                            <tr style="border-bottom:1px solid #f1f5f9;">
                                <td style="padding:0.6rem 0.65rem;">
                                    <div style="display:flex;align-items:center;gap:0.55rem;">
                                        <img src="${fotoApiUrl}" alt="" style="width:31px;height:31px;border-radius:50%;object-fit:cover;flex-shrink:0;border:1.5px solid #10b98140;" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
                                        <div style="display:none;width:31px;height:31px;border-radius:50%;background:#10b981;align-items:center;justify-content:center;font-size:0.75rem;font-weight:800;color:#fff;flex-shrink:0;">${iniciais}</div>
                                        <a href="#" style="color:#10b981;text-decoration:none;font-weight:600;font-size:0.85rem;" onclick="event.preventDefault();editColaborador(${c.id})">${c.nome_completo}</a>
                                    </div>
                                </td>
                                <td style="padding:0.6rem 0.65rem;font-size:0.85rem;font-weight:600;color:#475569;"><i class="ph ph-calendar"></i> ${dataFmt}</td>
                            </tr>
                        `;
                    });
                }
            }
        } catch(e) {
            if (tbAniver) tbAniver.innerHTML = '<tr><td colspan="2" style="text-align:center;color:#999;font-style:italic;">Erro ao carregar aniversariantes.</td></tr>';
        }
    }
}


// --- COLABORADORES ---
// Armazena a lista completa para filtragem local
let _todosColaboradores = [];

// --- Devolu\u00e7\u00e3o de EPI ---
window.devolverEquipamento = async function(id) {
    const conf = await Swal.fire({
        title: 'Confirmar Devolu\u00e7\u00e3o',
        text: 'Registrar a devolu\u00e7\u00e3o deste equipamento ao estoque?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: '<i class="ph ph-arrow-u-up-left"></i> Sim, Devolver',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#2563eb',
        cancelButtonColor: '#64748b'
    });
    if (!conf.isConfirmed) return;

    try {
        const resp = await fetch(`${API_URL}/epi-emprestimos/${id}/devolver`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${currentToken}`, 'Content-Type': 'application/json' }
        });
        const data = await resp.json().catch(() => ({}));
        if (!resp.ok) throw new Error(data.error || 'Erro ao registrar devolu\u00e7\u00e3o');
        await Swal.fire({
            icon: 'success',
            title: 'Devolu\u00e7\u00e3o Registrada!',
            html: data.estoque_reposto
                ? `Equipamento devolvido ao estoque: <strong>${data.item_estoque || ''}</strong>`
                : 'Devolu\u00e7\u00e3o registrada. Item n\u00e3o encontrado no estoque autom\u00e1tico.',
            timer: 3000,
            showConfirmButton: false
        });
        loadDashboard();
    } catch(err) {
        Swal.fire({ icon: 'error', title: 'Erro', text: err.message });
    }
};


async function loadColaboradores() {
    try {
        const wrapper = document.querySelector('#view-colaboradores .card');
        if (!wrapper) return;
        wrapper.innerHTML = '<div style="text-align:center; padding: 3rem;"><i class="ph ph-spinner ph-spin" style="font-size:2.5rem; color:var(--primary-color);"></i><p class="mt-3">Carregando lista...</p></div>';

        const response = await fetch(`${API_URL}/colaboradores`, { headers: { 'Authorization': `Bearer ${currentToken}` } });
        if (!response.ok) throw new Error('Falha na resposta do servidor');
        _todosColaboradores = await response.json();

        renderColaboradores(_todosColaboradores);
        aplicarFiltrosColaboradores();
    } catch (err) {
        console.error(err);
        const wrapper = document.querySelector('#view-colaboradores .card');
        if (wrapper) wrapper.innerHTML = `<div style="text-align:center; padding: 3rem; color: var(--danger-color);"><i class="ph ph-warning" style="font-size:2.5rem;"></i><p class="mt-3">Erro ao carregar colaboradores.</p></div>`;
    }
}

window._colabSortCol = 'nome';
window._colabSortDir = 'asc';

window.colabToggleSort = function (col) {
    if (window._colabSortCol === col) {
        window._colabSortDir = window._colabSortDir === 'asc' ? 'desc' : 'asc';
    } else {
        window._colabSortCol = col;
        window._colabSortDir = 'asc';
    }
    aplicarFiltrosColaboradores();
};

function getSortIcon(col) {
    if (window._colabSortCol !== col) return '<i class="ph ph-arrows-down-up" style="color:#cbd5e1;font-size:0.8rem;margin-left:4px;"></i>';
    return window._colabSortDir === 'asc' ? '<i class="ph ph-arrow-up" style="color:#3b82f6;font-size:0.8rem;margin-left:4px;"></i>' : '<i class="ph ph-arrow-down" style="color:#3b82f6;font-size:0.8rem;margin-left:4px;"></i>';
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
        nome: (document.getElementById('f-nome')?.value || '').toLowerCase().trim(),
        email: (document.getElementById('f-email')?.value || '').toLowerCase().trim(),
        cpf: (document.getElementById('f-cpf')?.value || '').replace(/\D/g, ''),
        nascIni: document.getElementById('f-nasc-ini')?.value || '',
        nascFim: document.getElementById('f-nasc-fim')?.value || '',
        estadoCivil: (document.getElementById('f-estado-civil')?.value || '').toLowerCase().trim(),
        sexo: (document.getElementById('f-sexo')?.value || '').toLowerCase().trim(),
        tipoDepartamento: (document.getElementById('f-tipo-departamento')?.value || '').toLowerCase().trim(),
        departamento: (document.getElementById('f-departamento')?.value || '').toLowerCase().trim(),
        cargo: (document.getElementById('f-cargo')?.value || '').toLowerCase().trim(),
        experiencia: document.getElementById('f-experiencia')?.value || '',
        tipoCadastro: document.getElementById('f-tipo-cadastro-hidden')?.value || '',
        salMin: parseCurrency(document.getElementById('f-sal-min')?.value) || null,
        salMax: parseCurrency(document.getElementById('f-sal-max')?.value) || null,
        escala: document.getElementById('f-escala')?.value || '',
        dependentes: document.getElementById('f-dependentes')?.value || '',
        beneficios: [...(document.querySelectorAll('.f-beneficios-chk:checked') || [])].map(cb => cb.value),
        tamCamiseta: document.getElementById('f-tam-camiseta')?.value || '',
        tamCalca: document.getElementById('f-tam-calca')?.value || '',
        tamCalcado: document.getElementById('f-tam-calcado')?.value || '',
        aptoSorteio: document.getElementById('f-apto-sorteio')?.value || ''
    };

    const lista = _todosColaboradores.filter(c => {
        if (f.nome && !(c.nome_completo || '').toLowerCase().includes(f.nome)) return false;
        if (f.email && !((c.email || '') + '|' + (c.email_corporativo || '')).toLowerCase().includes(f.email)) return false;
        if (f.cpf && !(c.cpf || '').replace(/\D/g, '').includes(f.cpf)) return false;
        if (f.nascIni || f.nascFim) {
            if (!c.data_nascimento) return false;
            let dt = null;
            if (c.data_nascimento.includes('-')) {
                const p = c.data_nascimento.split('-');
                dt = new Date(p[0], p[1]-1, p[2]);
            } else if (c.data_nascimento.includes('/')) {
                const p = c.data_nascimento.split('/');
                dt = new Date(p[2], p[1]-1, p[0]);
            } else {
                dt = new Date(c.data_nascimento);
            }
            if (isNaN(dt.getTime())) return false;
            
            const m = dt.getMonth() + 1;
            const d = dt.getDate();
            const colabMMDD = m * 100 + d;

            if (f.nascIni && f.nascIni.length === 5) {
                const parts = f.nascIni.split('/');
                const iniMMDD = parseInt(parts[1], 10) * 100 + parseInt(parts[0], 10);
                if (colabMMDD < iniMMDD) return false;
            }
            if (f.nascFim && f.nascFim.length === 5) {
                const parts = f.nascFim.split('/');
                const fimMMDD = parseInt(parts[1], 10) * 100 + parseInt(parts[0], 10);
                if (colabMMDD > fimMMDD) return false;
            }
        }

        if (f.estadoCivil && (!c.estado_civil || c.estado_civil.toLowerCase().trim() !== f.estadoCivil)) return false;
        if (f.sexo && (!c.sexo || c.sexo.toLowerCase().trim() !== f.sexo)) return false;

        if (f.tipoDepartamento && !(c.departamento_tipo || '').toLowerCase().includes(f.tipoDepartamento)) return false;
        if (f.departamento && !(c.departamento || '').toLowerCase().includes(f.departamento)) return false;
        if (f.cargo && !(c.cargo || '').toLowerCase().includes(f.cargo)) return false;

        if (f.experiencia === 'sim') {
            if (!c.data_admissao) return false;
            const dias = Math.floor((new Date() - new Date(c.data_admissao + 'T12:00:00')) / 86400000);
            if (dias > 90 || dias < 0) return false;
        }

        if (f.tipoCadastro && getEffectiveStatus(c) !== f.tipoCadastro) return false;

        // Ocultar Desligados por padrão — só aparecem se o filtro de status for explicitamente 'Desligado'
        if (!f.tipoCadastro && getEffectiveStatus(c) === 'Desligado') return false;

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
            if (f.beneficios.includes('Brigadista') && c.brigadista_participa !== 'Sim') return false;
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

    if (window._colabSortCol) {
        lista.sort((a, b) => {
            let valA, valB;
            switch (window._colabSortCol) {
                case 'nome': valA = (a.nome_completo || '').toLowerCase(); valB = (b.nome_completo || '').toLowerCase(); break;
                case 'departamento': valA = (a.departamento || '').toLowerCase(); valB = (b.departamento || '').toLowerCase(); break;
                case 'cargo': valA = (a.cargo || '').toLowerCase(); valB = (b.cargo || '').toLowerCase(); break;
                case 'admissao':
                    valA = a.data_admissao ? new Date(a.data_admissao).getTime() : 0;
                    valB = b.data_admissao ? new Date(b.data_admissao).getTime() : 0;
                    break;
                default: valA = ''; valB = '';
            }
            if (valA < valB) return window._colabSortDir === 'asc' ? -1 : 1;
            if (valA > valB) return window._colabSortDir === 'asc' ? 1 : -1;
            return 0;
        });
    }

    window._listaColaboradoresFiltrada = lista;

    renderTabelaColaboradores(lista);
    const countEl = document.getElementById('colab-count');
    if (countEl) countEl.textContent = `${lista.length} de ${_todosColaboradores.length} colaboradores`;
}

function limparFiltrosColaboradores() {
    ['f-nome', 'f-cpf', 'f-nasc-ini', 'f-nasc-fim', 'f-estado-civil', 'f-sexo', 'f-tipo-departamento', 'f-departamento',
        'f-cargo', 'f-experiencia', 'f-sal-min', 'f-sal-max',
        'f-escala', 'f-dependentes', 'f-tipo-cadastro-hidden',
        'f-tam-camiseta', 'f-tam-calca', 'f-tam-calcado', 'f-apto-sorteio'
    ].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });

    // Atualizar botões visuais de tipo cadastro
    document.querySelectorAll('.btn-tipo-cadastro').forEach(btn => {
        btn.style.opacity = '0.5';
        if (btn.dataset.status === '') {
            btn.style.opacity = '1';
        }
    });

    const checkboxes = document.querySelectorAll('.f-beneficios-chk');
    checkboxes.forEach(c => c.checked = false);

    aplicarFiltrosColaboradores();
}

window.openFiltroSidebar = function () {
    const sidebar = document.getElementById('filtro-sidebar');
    const backdrop = document.getElementById('filtro-backdrop');
    if (sidebar) sidebar.style.right = '0';
    if (backdrop) {
        backdrop.style.display = 'block';
        setTimeout(() => { backdrop.style.opacity = '1'; }, 10);
    }
};

window.closeFiltroSidebar = function () {
    const sidebar = document.getElementById('filtro-sidebar');
    const backdrop = document.getElementById('filtro-backdrop');
    if (sidebar) sidebar.style.right = '-400px';
    if (backdrop) {
        backdrop.style.opacity = '0';
        setTimeout(() => { backdrop.style.display = 'none'; }, 300);
    }
};

window.selecionarTipoCadastro = function (btnElement, status) {
    document.getElementById('f-tipo-cadastro-hidden').value = status;
    document.querySelectorAll('.btn-tipo-cadastro').forEach(btn => {
        btn.style.opacity = '0.5';
        btn.style.boxShadow = 'none';
    });
    btnElement.style.opacity = '1';
    btnElement.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
    aplicarFiltrosColaboradores();
};

window.exportarColaboradoresXLSX = async function () {
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
    } catch (e) {
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

    const safeDate = (dt) => dt ? new Date(dt.includes('T') ? dt : dt + 'T12:00:00').toLocaleDateString('pt-BR') : '';

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
    const formatEscala = (e) => (e || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

    // Coletar opções únicas para os selects dos filtros
    const deptos = [...new Set(_todosColaboradores.map(c => c.departamento).filter(Boolean))].sort();
    const cargos = [...new Set(_todosColaboradores.map(c => c.cargo).filter(Boolean))].sort();
    const escalas = [...new Set(_todosColaboradores.map(c => c.escala_tipo).filter(Boolean))].sort();
    const beneficiosList = ['Faculdade', 'Academia', 'Terapia', 'Celulares', 'Chaves', 'Brigadista'];

    window._listaColaboradoresFiltrada = lista;

    wrapper.innerHTML = `
        <input type="hidden" id="f-tipo-cadastro-hidden" value="">
        <!-- HEADER DA TABELA - linha única -->
        <div style="display:flex; align-items:center; flex-wrap:wrap; gap:0.4rem; margin-bottom:1rem; flex-shrink:0;">
            <h3 style="margin:0; font-size:1rem; color:#334155; white-space:nowrap; font-weight:700;">Lista de Colaboradores</h3>
            <span id="colab-count" style="background:#f1f5f9; padding:0.2rem 0.65rem; border-radius:999px; font-size:0.78rem; color:#64748b; font-weight:600; white-space:nowrap; flex-shrink:0;">${lista.length} de ${_todosColaboradores.length} colaboradores</span>

            <div style="width:1px; height:20px; background:#e2e8f0; flex-shrink:0; margin:0 2px;"></div>

            <!-- Status Pills -->
            <button class="btn-tipo-cadastro" data-status="" onclick="selecionarTipoCadastro(this, '')" style="padding:0.25rem 0.65rem; border:none; border-radius:999px; font-size:0.78rem; font-weight:600; cursor:pointer; background:#e2e8f0; color:#475569; display:flex; gap:3px; align-items:center; transition:0.2s; white-space:nowrap;">Todos</button>
            <button class="btn-tipo-cadastro" data-status="Processo iniciado" onclick="selecionarTipoCadastro(this, 'Processo iniciado')" style="padding:0.25rem 0.65rem; border:none; border-radius:999px; font-size:0.78rem; font-weight:600; cursor:pointer; background:#e7f5ff; color:#1864ab; display:flex; gap:3px; align-items:center; transition:0.2s; opacity:0.5; white-space:nowrap;"><i class="ph ph-play-circle"></i> Iniciado</button>
            <button class="btn-tipo-cadastro" data-status="Aguardando início" onclick="selecionarTipoCadastro(this, 'Aguardando início')" style="padding:0.25rem 0.65rem; border:none; border-radius:999px; font-size:0.78rem; font-weight:600; cursor:pointer; background:#f1f3f5; color:#495057; display:flex; gap:3px; align-items:center; transition:0.2s; opacity:0.5; white-space:nowrap;"><i class="ph ph-hourglass-high"></i> Aguardando</button>
            <button class="btn-tipo-cadastro" data-status="Ativo" onclick="selecionarTipoCadastro(this, 'Ativo')" style="padding:0.25rem 0.65rem; border:none; border-radius:999px; font-size:0.78rem; font-weight:600; cursor:pointer; background:#e8f5e9; color:#196b36; display:flex; gap:3px; align-items:center; transition:0.2s; opacity:0.5; white-space:nowrap;"><i class="ph ph-check-circle"></i> Ativo</button>
            <button class="btn-tipo-cadastro" data-status="Afastado" onclick="selecionarTipoCadastro(this, 'Afastado')" style="padding:0.25rem 0.65rem; border:none; border-radius:999px; font-size:0.78rem; font-weight:600; cursor:pointer; background:#faeed9; color:#eaa15f; display:flex; gap:3px; align-items:center; transition:0.2s; opacity:0.5; white-space:nowrap;"><i class="ph ph-first-aid"></i> Afastado</button>
            <button class="btn-tipo-cadastro" data-status="Férias" onclick="selecionarTipoCadastro(this, 'Férias')" style="padding:0.25rem 0.65rem; border:none; border-radius:999px; font-size:0.78rem; font-weight:600; cursor:pointer; background:#ffedd5; color:#c2410c; display:flex; gap:3px; align-items:center; transition:0.2s; opacity:0.5; white-space:nowrap;"><i class="ph ph-airplane-tilt"></i> Férias</button>
            <button class="btn-tipo-cadastro" data-status="Desligado" onclick="selecionarTipoCadastro(this, 'Desligado')" style="padding:0.25rem 0.65rem; border:none; border-radius:999px; font-size:0.78rem; font-weight:600; cursor:pointer; background:#fceeee; color:#ba7881; display:flex; gap:3px; align-items:center; transition:0.2s; opacity:0.5; white-space:nowrap;"><i class="ph ph-x-circle"></i> Desligado</button>

            <div style="width:1px; height:20px; background:#e2e8f0; flex-shrink:0; margin:0 2px;"></div>

            <button onclick="openFiltroSidebar()" style="padding:0.3rem 0.85rem; border:1px solid #e2e8f0; border-radius:6px; background:#fff; font-size:0.8rem; cursor:pointer; color:#334155; font-weight:600; display:flex; align-items:center; gap:5px; white-space:nowrap; flex-shrink:0;">
                <i class="ph ph-funnel"></i> Filtros
            </button>
            <button onclick="exportarColaboradoresXLSX()" style="padding:0.3rem 0.85rem; border:none; border-radius:6px; background:#10b981; font-size:0.8rem; font-weight:600; cursor:pointer; color:#fff; display:flex; align-items:center; gap:5px; white-space:nowrap; flex-shrink:0;">
                <i class="ph ph-file-xls" style="font-size:1rem;"></i> Exportar XLSX
            </button>
        </div>


        <!-- TABELA -->
        <div id="colab-table-wrapper" style="flex:1; overflow-y:auto; min-height:0;"></div>


        <!-- BACKDROP DE FILTROS -->
        <div id="filtro-backdrop" onclick="closeFiltroSidebar()" style="display:none; position:fixed; top:0; right:0; width:100vw; height:100vh; background:rgba(0,0,0,0.3); z-index:9998; transition:opacity 0.3s; opacity:0;"></div>

        <!-- SIDEBAR DE FILTROS -->
        <div id="filtro-sidebar" style="position:fixed; top:0; right:-400px; width:400px; max-width:100vw; height:100vh; background:#fff; z-index:9999; box-shadow:-4px 0 15px rgba(0,0,0,0.1); transition:right 0.3s cubic-bezier(0.4, 0, 0.2, 1); overflow-y:auto; display:flex; flex-direction:column;">
            
            <div style="padding:1.5rem; border-bottom:1px solid #e2e8f0; display:flex; justify-content:space-between; align-items:center; position:sticky; top:0; background:#fff; z-index:10;">
                <span style="font-weight:700; color:#334155; font-size:1.1rem; display:flex; align-items:center; gap:8px;">
                    <i class="ph ph-funnel"></i> Filtros Avançados
                </span>
                <button onclick="closeFiltroSidebar()" style="background:none; border:none; cursor:pointer; color:#94a3b8; font-size:1.25rem;">
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
                <div>
                    <label style="font-size:0.75rem;font-weight:600;color:#64748b;display:block;margin-bottom:3px;">E-mail</label>
                    <input id="f-email" type="text" placeholder="Pesquisar e-mail..." oninput="aplicarFiltrosColaboradores()" style="width:100%;padding:0.5rem;border:1px solid #e2e8f0;border-radius:6px;font-size:0.85rem;">
                </div>
                <div style="display:flex; gap:1rem;">
                    <div style="flex:1;">
                        <label style="font-size:0.75rem;font-weight:600;color:#64748b;display:block;margin-bottom:3px;">Nascimento De</label>
                        <input id="f-nasc-ini" type="text" placeholder="DD/MM" maxlength="5" oninput="this.value=this.value.replace(/\\D/g,'').replace(/^(\\d{2})(\\d)/,'$1/$2'); aplicarFiltrosColaboradores()" style="width:100%;padding:0.5rem;border:1px solid #e2e8f0;border-radius:6px;font-size:0.85rem;">
                    </div>
                    <div style="flex:1;">
                        <label style="font-size:0.75rem;font-weight:600;color:#64748b;display:block;margin-bottom:3px;">Até</label>
                        <input id="f-nasc-fim" type="text" placeholder="DD/MM" maxlength="5" oninput="this.value=this.value.replace(/\\D/g,'').replace(/^(\\d{2})(\\d)/,'$1/$2'); aplicarFiltrosColaboradores()" style="width:100%;padding:0.5rem;border:1px solid #e2e8f0;border-radius:6px;font-size:0.85rem;">
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
                    <label style="font-size:0.75rem;font-weight:600;color:#64748b;display:block;margin-bottom:3px;">Tipo de Departamento</label>
                    <select id="f-tipo-departamento" onchange="aplicarFiltrosColaboradores()" style="width:100%;padding:0.5rem;border:1px solid #e2e8f0;border-radius:6px;font-size:0.85rem;">
                        <option value="">Todos</option><option value="operacional">Operacional</option><option value="administrativo">Administrativo</option>
                    </select>
                </div>
                <div>
                    <label style="font-size:0.75rem;font-weight:600;color:#64748b;display:block;margin-bottom:3px;">Departamento</label>
                    <select id="f-departamento" onchange="aplicarFiltrosColaboradores()" style="width:100%;padding:0.5rem;border:1px solid #e2e8f0;border-radius:6px;font-size:0.85rem;">
                        <option value="">Todos</option>${deptos.map(d => `<option>${d}</option>`).join('')}
                    </select>
                </div>
                <div>
                    <label style="font-size:0.75rem;font-weight:600;color:#64748b;display:block;margin-bottom:3px;">Cargo</label>
                    <select id="f-cargo" onchange="aplicarFiltrosColaboradores()" style="width:100%;padding:0.5rem;border:1px solid #e2e8f0;border-radius:6px;font-size:0.85rem;">
                        <option value="">Todos</option>${cargos.map(c => `<option>${c}</option>`).join('')}
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
                        <option value="">Todas</option>${escalas.map(e => `<option value="${e}">${formatEscala(e)}</option>`).join('')}
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
                        ${beneficiosList.map(b => `
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
                        ${Array.from({ length: 14 }, (_, i) => 33 + i).map(size => `<option value="${size}">${size}</option>`).join('')}
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

    wrapper.style.cssText = 'flex:1; overflow:auto; min-height:0;';
    wrapper.innerHTML = `
        <table class="table" style="width:100%; border-collapse:collapse; min-width:800px;">
            <thead style="position:sticky; top:0; z-index:2; background:#f8fafc; outline:1px solid #e2e8f0;"><tr>
                    <th style="padding-left:1rem;width:50px;">Foto</th>
                    <th style="cursor:pointer;white-space:nowrap;user-select:none;" onclick="colabToggleSort('nome')">Nome ${getSortIcon('nome')}</th>
                    <th>CPF</th>
                    <th style="cursor:pointer;white-space:nowrap;user-select:none;" onclick="colabToggleSort('departamento')">Departamento ${getSortIcon('departamento')}</th>
                    <th style="cursor:pointer;white-space:nowrap;user-select:none;" onclick="colabToggleSort('cargo')">Cargo ${getSortIcon('cargo')}</th>
                    <th style="cursor:pointer;white-space:nowrap;user-select:none;" onclick="colabToggleSort('admissao')">Admissão ${getSortIcon('admissao')}</th>
                    <th>Status</th>
                    <th style="text-align:right;padding-right:1.5rem;">Ações</th>
                </tr></thead>
                <tbody>
                    ${lista.map(c => {
        const d = c.data_admissao ? new Date(c.data_admissao.includes('T') ? c.data_admissao : c.data_admissao + 'T12:00:00').toLocaleDateString('pt-BR') : '-';
        expInfoHtml = `<div style="font-size:0.95rem; color:#334155; font-weight:500;">${d}</div>`;
        if (c.data_admissao) {
            const admDate = new Date(c.data_admissao + 'T12:00:00');
            const today = new Date();
            if (today >= admDate) {
                let years = today.getFullYear() - admDate.getFullYear();
                let months = today.getMonth() - admDate.getMonth();
                if (today.getDate() < admDate.getDate()) {
                    months--;
                }
                if (months < 0) {
                    years--;
                    months += 12;
                }

                let badgeColor = '';
                if (years === 0) badgeColor = '#eab308'; // amarelo
                else if (years >= 1 && years < 3) badgeColor = '#f97316'; // laranja
                else if (years >= 3 && years < 5) badgeColor = '#3b82f6'; // azul
                else if (years >= 5 && years < 10) badgeColor = '#059669'; // verde escuro
                else if (years >= 10) badgeColor = '#8b5cf6'; // roxo

                let textPart = [];
                if (years > 0) textPart.push(`${years} ano${years > 1 ? 's' : ''}`);
                if (months > 0) textPart.push(`${months} mes${months > 1 ? 'es' : ''}`);

                if (textPart.length > 0) {
                    expInfoHtml += `<div style="font-size:0.75rem; font-weight:700; margin-top:2px; color: ${badgeColor};">${textPart.join(' e ')}</div>`;
                } else if (years === 0 && months === 0) {
                    // acabou de entrar
                    expInfoHtml += `<div style="font-size:0.75rem; font-weight:700; margin-top:2px; color: ${badgeColor};">Menos de 1 mes</div>`;
                }
            }
        }
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
        else if (effectiveStatus === 'Processo iniciado') statusHtml = `<div style="background:#e7f5ff;color:#1864ab;border:2px solid #1864ab;border-radius:20px;font-weight:600;padding:2px 10px;display:inline-flex;align-items:center;gap:4px;font-size:0.75rem;"><i class="ph ph-play-circle"></i> Iniciado</div>`;
        else if (effectiveStatus === 'Ativo') statusHtml = `<div style="background:#e8f5e9;color:#196b36;border:2px solid #196b36;border-radius:20px;font-weight:600;padding:2px 10px;display:inline-flex;align-items:center;gap:4px;font-size:0.75rem;"><i class="ph ph-check-circle"></i> Ativo</div>`;
        else if (effectiveStatus === 'Férias') statusHtml = `<div style="background:#ffedd5;color:#c2410c;border:2px solid #c2410c;border-radius:20px;font-weight:600;padding:2px 10px;display:inline-flex;align-items:center;gap:4px;font-size:0.75rem;"><i class="ph ph-airplane-tilt"></i> Férias</div>`;
        else if (effectiveStatus === 'Afastado') statusHtml = `<div style="background:#faeed9;color:#eaa15f;border:2px solid #eaa15f;border-radius:20px;font-weight:600;padding:2px 10px;display:inline-flex;align-items:center;gap:4px;font-size:0.75rem;"><i class="ph ph-first-aid"></i> Afastado</div>`;
        else if (effectiveStatus === 'Desligado') statusHtml = `<div style="background:#fceeee;color:#ba7881;border:2px solid #ba7881;border-radius:20px;font-weight:600;padding:2px 10px;display:inline-flex;align-items:center;gap:4px;font-size:0.75rem;"><i class="ph ph-x-circle"></i> Desligado</div>`;
        else if (effectiveStatus === 'Incompleto') statusHtml = `<div style="background:#f8f9fa;color:#6c757d;border:2px solid transparent;border-radius:20px;font-weight:600;padding:2px 10px;display:inline-flex;align-items:center;gap:4px;font-size:0.75rem;"><i class="ph ph-pencil-simple"></i> Incompleto</div>`;
        else statusHtml = `<div style="background:#f1f3f5;color:#495057;border:2px solid #adb5bd;border-radius:20px;font-weight:600;padding:2px 10px;display:inline-flex;align-items:center;gap:4px;font-size:0.75rem;"><i class="ph ph-clock"></i> Aguardando</div>`;

        let experienceUnderName = '';
        if (c.data_admissao) {
            const adm = new Date(c.data_admissao + 'T12:00:00');
            const today = new Date(); today.setHours(12, 0, 0, 0);
            const diffDays = Math.floor((today - adm) / (1000 * 60 * 60 * 24));
            if (diffDays >= 0 && diffDays <= 90) {
                const d45 = new Date(adm); d45.setDate(adm.getDate() + 45);
                const d90 = new Date(adm); d90.setDate(adm.getDate() + 90);
                let tagHtml = diffDays <= 45
                    ? `<span class="probation-badge" style="font-size:0.6rem;padding:0.15rem 0.4rem;border-radius:4px;white-space:nowrap;">1º 45</span>`
                    : `<span class="probation-badge second" style="font-size:0.6rem;padding:0.15rem 0.4rem;border-radius:4px;white-space:nowrap;">2º 45</span>`;
                let vigenciaHtml = diffDays <= 45
                    ? `<span style="font-size:0.65rem;color:#64748b;white-space:nowrap;font-weight:600;">1º: ${d45.toLocaleDateString('pt-BR')}</span>`
                    : `<span style="font-size:0.65rem;color:#64748b;white-space:nowrap;font-weight:600;">2º: ${d90.toLocaleDateString('pt-BR')}</span>`;
                experienceUnderName = `<div style="display:flex;align-items:center;gap:6px;margin-top:4px;">${tagHtml}${vigenciaHtml}</div>`;
            }
        }

        const photoUrl = `${API_URL}/colaboradores/foto/${c.id}?t=${Date.now()}`;
        const fallbackIcon = `data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiNjYmQ1ZTEiIHN0cm9rZS13aWR0aD0iMS41IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxwYXRoIGQ9Ik0yMCAyMWE4IDggMCAwMC0xNiAwIi8+PGNpcmNsZSBjeD0iMTIiIGN5PSI3IiByPSI0Ii8+PC9zdmc+`;

        let cargoDisplay = c.cargo || '-';
        if (cargoDisplay.toLowerCase().includes('motorista') && c.cnh_categoria) {
            cargoDisplay += ` (${c.cnh_categoria})`;
        }

        return `<tr>
                            <td style="padding-left:1rem;"><a href="${photoUrl}" target="_blank" style="display:block;width:36px;height:36px;border-radius:50%;overflow:hidden;border:1px solid #e2e8f0;background:#f8fafc;cursor:pointer;" title="Clique para ampliar e baixar"><img src="${photoUrl}" onerror="this.src='${fallbackIcon}'; this.parentElement.removeAttribute('href'); this.parentElement.style.cursor='default'; this.parentElement.title='';" style="width:100%;height:100%;object-fit:cover;"></a></td>
                            <td><div style="display:flex;flex-direction:column;"><strong style="color:#334155;font-size:0.95rem;">${c.nome_completo || 'Sem Nome'}</strong>${experienceUnderName}</div></td>
                            <td style="color:#64748b;font-size:0.85rem;white-space:nowrap;">${c.cpf || '-'}</td>
                            <td style="color:#64748b;font-size:0.85rem;">${c.departamento || '-'}</td>
                            <td style="color:#64748b;font-size:0.85rem;">${cargoDisplay}</td>
                            <td>${expInfoHtml}</td>
                            <td>${statusHtml}</td>
                            <td style="text-align:right;padding-right:1rem;">
                                <div style="display:flex;gap:0.4rem;justify-content:flex-end;">
                                    <button class="btn btn-warning btn-sm" onclick="editColaborador(${c.id})" title="Editar" style="padding:0.4rem;width:32px;height:32px;justify-content:center;"><i class="ph ph-pencil-simple"></i></button>
                                    <button class="btn btn-primary btn-sm" onclick="openProntuario(${c.id},'${(c.nome_completo || '').replace(/'/g, "\\'")}','${(c.cargo || '').replace(/'/g, "\\'")}','${c.cpf || ''}','${c.sexo || ''}','${c.data_admissao || ''}','${c.status || ''}','${c.rg_tipo || 'RG'}')" title="Prontuário" style="padding:0.4rem;width:32px;height:32px;justify-content:center;background:#2563eb;"><i class="ph ph-folder-open"></i></button>
                                    
                                </div>
                            </td>
                        </tr>`;
    }).join('')}
        </tbody>
        </table>
    `;
}

window.deleteColaborador = async function (id, isStatusIncompleto = false) {
    let msg = '🚨 ATENÇÃO: Tem certeza que deseja inativar este colaborador?\n\nO status dele(a) será alterado para "Desligado" mantendo todos os arquivos intactos.';
    if (isStatusIncompleto) {
        msg = '🚨 ATENÇÃO: Este colaborador está INCOMPLETO. A exclusão irá DELETAR PERMANENTEMENTE todos os dados e eventuais arquivos já enviados. Deseja prosseguir?';
    }
    if (!confirm(msg)) return;
    try {
        const res = await fetch(`${API_URL}/colaboradores/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        if (res.ok) {
            loadColaboradores();
            loadDashboard();
        } else {
            alert('Falha ao inativar/excluir colaborador do sistema.');
        }
    } catch (e) { console.error(e); }
}

// ── [DEV] Anonimizar colaborador individual ───────────────────────────────
window.devAnonimizarColaborador = async function(id, nome) {
    if (!window._IS_DEV_HOMOLOG) return;
    // descobre o índice desse colaborador na lista para gerar dados únicos
    const idx = _todosColaboradores.findIndex(c => c.id === id);
    const dados = _devDadosFicticios(idx >= 0 ? idx : Math.floor(Math.random() * 100));
    try {
        const res = await fetch(`${API_URL}/colaboradores/${id}`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${currentToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(dados)
        });
        if (res.ok) {
            aplicarFiltrosColaboradores();
            loadColaboradores();
        } else { alert('Erro ao anonimizar colaborador.'); }
    } catch(e) { alert('Erro de rede.'); }
}

// ── [DEV] Gera dados fictícios para anonimização ─────────────────────────
function _devDadosFicticios(index) {
    const nomes = ['João','Maria','Carlos','Ana','Pedro','Lucia','Rafael','Juliana','Marcos','Fernanda'];
    const sobrenomes = ['Silva','Santos','Oliveira','Souza','Lima','Pereira','Costa','Ferreira','Alves','Rodrigues'];
    const depts = ['Logística','Administrativo','Comercial','RH','Financeiro'];
    const cargos = ['Assistente','Analista','Auxiliar','Operador','Técnico'];
    const n = nomes[index % nomes.length];
    const s = sobrenomes[(index + 3) % sobrenomes.length];
    const s2 = sobrenomes[(index + 7) % sobrenomes.length];
    const pad = String(index + 1).padStart(2, '0');
    return {
        nome_completo: `${n} ${s} ${s2}`,
        cpf: `000.000.${pad.padStart(3,'0')}-${pad}`,
        rg: `0000000${pad}`,
        data_nascimento: '1990-01-01',
        email: `teste${index + 1}@homologacao.com`,
        email_corporativo: `colaborador${index + 1}@americarental.com.br`,
        telefone: `(11) 9${pad}000-000${pad.slice(-1)}`,
        departamento: depts[index % depts.length],
        cargo: cargos[index % cargos.length],
        status: 'Ativo',
        data_admissao: '2024-01-01',
        tipo_contrato: 'CLT',
        endereco: `Rua Fictícia, ${index + 1} - São Paulo/SP`,
        nome_mae: 'Maria de Teste',
        nome_pai: 'José de Teste',
        estado_civil: 'Solteiro',
        nacionalidade: 'Brasileiro',
        sexo: index % 2 === 0 ? 'M' : 'F',
    };
}

// ── [DEV] Anonimizar todos (exceto Teste de Sistema da Silva) ─────────────
window.devAnonimizarTodosColaboradores = async function() {
    if (!window._IS_DEV_HOMOLOG) return;
    const protegido = 'teste de sistema da silva';
    const paraAnonimizar = _todosColaboradores.filter(c =>
        (c.nome_completo || '').trim().toLowerCase() !== protegido
    );
    if (paraAnonimizar.length === 0) { alert('Nenhum colaborador para anonimizar.'); return; }

    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:99999;display:flex;align-items:center;justify-content:center;';
    overlay.innerHTML = `
        <div style="background:#fff;border-radius:16px;padding:2rem 2.5rem;max-width:420px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,0.3);text-align:center;">
            <div style="width:56px;height:56px;background:#fef3c7;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 1rem;font-size:1.6rem;"><i class="ph ph-shuffle" style="color:#d97706;"></i></div>
            <h3 style="margin:0 0 0.4rem;font-size:1.1rem;color:#0f172a;">Substituir dados por fictícios?</h3>
            <p style="margin:0 0 1.25rem;color:#64748b;font-size:0.85rem;">
                Os dados de <strong>${paraAnonimizar.length} colaboradores</strong> serão substituídos por informações fictícias para testes.<br>
                <span style="color:#059669;font-weight:600;">"Teste de Sistema da Silva" será mantido intacto.</span>
            </p>
            <div id="dev-anon-progress" style="display:none;margin-bottom:1rem;">
                <div style="background:#f1f5f9;border-radius:8px;height:8px;overflow:hidden;">
                    <div id="dev-anon-bar" style="height:100%;background:#d97706;width:0%;transition:width 0.2s;"></div>
                </div>
                <p id="dev-anon-txt" style="font-size:0.8rem;color:#64748b;margin-top:6px;">Aguarde...</p>
            </div>
            <div id="dev-anon-btns" style="display:flex;gap:0.75rem;justify-content:center;">
                <button id="dev-anon-cancel" style="padding:0.55rem 1.25rem;border:1px solid #cbd5e1;background:#fff;border-radius:8px;cursor:pointer;font-weight:600;color:#64748b;">Cancelar</button>
                <button id="dev-anon-confirm" style="padding:0.55rem 1.25rem;background:#d97706;color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:700;display:flex;align-items:center;gap:6px;">
                    <i class="ph ph-shuffle"></i> Sim, substituir ${paraAnonimizar.length}
                </button>
            </div>
        </div>`;
    document.body.appendChild(overlay);
    document.getElementById('dev-anon-cancel').onclick = () => overlay.remove();
    document.getElementById('dev-anon-confirm').onclick = async () => {
        document.getElementById('dev-anon-btns').style.display = 'none';
        document.getElementById('dev-anon-progress').style.display = 'block';
        let processados = 0;
        for (let i = 0; i < paraAnonimizar.length; i++) {
            const colab = paraAnonimizar[i];
            try {
                await fetch(`${API_URL}/colaboradores/${colab.id}`, {
                    method: 'PUT',
                    headers: { 'Authorization': `Bearer ${currentToken}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify(_devDadosFicticios(i))
                });
            } catch(e) {}
            processados++;
            const pct = Math.round((processados / paraAnonimizar.length) * 100);
            document.getElementById('dev-anon-bar').style.width = pct + '%';
            document.getElementById('dev-anon-txt').textContent = `Processando... ${processados} de ${paraAnonimizar.length}`;
        }
        overlay.remove();
        loadColaboradores();
    };
}
// ── fim [DEV] ──────────────────────────────────────────────────────────────


window.resetFormColaborador = function () {
    const form = document.getElementById('form-colaborador');
    if (form) form.reset();

    document.getElementById('colab-id').value = '';
    document.getElementById('form-colab-title').textContent = 'Cadastrar Colaborador';
    document.getElementById('conjuge-id').value = '';
    document.getElementById('section-conjuge').style.display = 'none';

    // CNH reset
    const sectionCnh = document.getElementById('section-cnh');
    if (sectionCnh) sectionCnh.style.display = 'none';
    if (document.getElementById('colab-cnh-numero')) document.getElementById('colab-cnh-numero').value = '';
    if (document.getElementById('colab-cnh-vencimento')) document.getElementById('colab-cnh-vencimento').value = '';
    if (document.getElementById('colab-cnh-categoria')) document.getElementById('colab-cnh-categoria').value = '';

    const novosCamposIds = [
        'colab-matricula-esocial', 'colab-numero-registro', 'colab-local-nascimento', 'colab-rg-orgao', 'colab-rg-data',
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
    // Reset Férias Fracionadas
    const ffNao = document.querySelector('input[name="ferias_fracionadas_check"][value="Não"]');
    if (ffNao) { ffNao.checked = true; }
    if (typeof window.toggleFeriasFracionadas === 'function') window.toggleFeriasFracionadas('Não');
    if (document.getElementById('colab-ferias-fracionadas-inicio2')) document.getElementById('colab-ferias-fracionadas-inicio2').value = '';
    if (document.getElementById('colab-ferias-fracionadas-fim2')) document.getElementById('colab-ferias-fracionadas-fim2').value = '';
    if (document.getElementById('colab-ferias-fracionadas-dias2')) document.getElementById('colab-ferias-fracionadas-dias2').value = '-';

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
    if (radioInN) radioInN.checked = true;
    if (document.getElementById('colab-insalubridade-valor')) document.getElementById('colab-insalubridade-valor').value = '';
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
    if (errorCpf) errorCpf.style.display = 'none';

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

window.editColaborador = async function (id) {
    // Botão de sincronização manual ocultado (a automação já faz isso ao salvar)
    const formSyncBtn = document.getElementById('btn-form-sync-onedrive');
    if (formSyncBtn) {
        formSyncBtn.style.display = 'none';
        formSyncBtn.onclick = function () { window.syncOneDriveManual(id, this); };
    }

    try {
        await loadSelects();
        const c = await apiGet(`/colaboradores/${id}`);
        if (!c) return;

        const docs = await apiGet(`/colaboradores/${id}/documentos`);
        currentDocs = docs || [];

        viewedColaborador = c;
        window.viewedColaborador = c; // Sync para módulos externos

        const titleEl = document.getElementById('form-colab-title');
        if (titleEl) titleEl.textContent = c.nome_completo || `Colaborador #${c.id}`;

        document.getElementById('colab-id').value = c.id;
        document.getElementById('colab-nome').value = c.nome_completo || '';
        document.getElementById('colab-cpf').value = c.cpf || '';
        if (document.getElementById('colab-rg')) document.getElementById('colab-rg').value = c.rg || '';

        const rgTipoEl = document.getElementById('colab-rg-tipo');
        if (rgTipoEl) {
            rgTipoEl.value = c.rg_tipo || 'RG';
            if (typeof toggleTipoDocumento === 'function') toggleTipoDocumento();
        }

        const _safeDate = (dStr) => {
            if (!dStr) return '';
            try { const d = new Date(dStr); return isNaN(d.getTime()) ? '' : d.toISOString().split('T')[0]; }
            catch (e) { return ''; }
        };

        document.getElementById('colab-nascimento').value = _safeDate(c.data_nascimento);

        document.getElementById('colab-estadocivil').value = c.estado_civil || '';
        document.getElementById('colab-nacionalidade').value = c.nacionalidade || 'Brasileira';
        document.getElementById('colab-mae').value = c.nome_mae || '';
        document.getElementById('colab-pai').value = c.nome_pai || '';
        document.getElementById('colab-telefone').value = c.telefone || '';
        document.getElementById('colab-email').value = c.email || '';
        const emailCorpEl = document.getElementById('colab-email-corporativo');
        if (emailCorpEl) emailCorpEl.value = c.email_corporativo || '';
        document.getElementById('colab-endereco').value = c.endereco || '';
        document.getElementById('colab-cargo').value = c.cargo || '';
        document.getElementById('colab-departamento').value = c.departamento || '';
        const admDate = c.data_admissao || c.admissao || '';
        document.getElementById('colab-admissao').value = admDate;
        updateProbationBadge(admDate);
        document.getElementById('colab-contrato').value = c.tipo_contrato || 'CLT';
        const rawSal = c.salario;
        if (rawSal !== undefined && rawSal !== null && rawSal !== '') {
            let str = String(rawSal).replace(/R\$\s*/g, '').trim();
            let numSal = 0;
            if (str.includes(',') && str.includes('.')) {
                numSal = parseFloat(str.replace(/\./g, '').replace(',', '.'));
            } else if (str.includes(',')) {
                numSal = parseFloat(str.replace(',', '.'));
            } else {
                numSal = parseFloat(str);
            }
            document.getElementById('colab-salario').value = !isNaN(numSal) && numSal > 0
                ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(numSal)
                : rawSal;
        } else {
            document.getElementById('colab-salario').value = '';
        }

        if (document.getElementById('colab-matricula-esocial')) document.getElementById('colab-matricula-esocial').value = c.matricula_esocial || '';
        if (document.getElementById('colab-numero-registro')) document.getElementById('colab-numero-registro').value = c.numero_registro || '';
        if (document.getElementById('colab-local-nascimento')) document.getElementById('colab-local-nascimento').value = c.local_nascimento || '';
        if (document.getElementById('colab-rg-orgao')) document.getElementById('colab-rg-orgao').value = c.rg_orgao || '';
        if (document.getElementById('colab-rg-data')) document.getElementById('colab-rg-data').value = _safeDate(c.rg_data_emissao);
        if (document.getElementById('colab-titulo')) document.getElementById('colab-titulo').value = c.titulo_eleitoral || '';
        if (document.getElementById('colab-titulo-zona')) document.getElementById('colab-titulo-zona').value = c.titulo_zona || '';
        if (document.getElementById('colab-titulo-secao')) document.getElementById('colab-titulo-secao').value = c.titulo_secao || '';
        if (document.getElementById('colab-ctps')) document.getElementById('colab-ctps').value = c.ctps_numero || '';
        if (document.getElementById('colab-ctps-serie')) document.getElementById('colab-ctps-serie').value = c.ctps_serie || '';
        if (document.getElementById('colab-ctps-uf')) document.getElementById('colab-ctps-uf').value = c.ctps_uf || '';
        if (document.getElementById('colab-ctps-data')) document.getElementById('colab-ctps-data').value = _safeDate(c.ctps_data_expedicao);
        // Auto-preencher CTPS a partir do CPF
        (function () {
            const cpfDigits = (c.cpf || '').replace(/\D/g, '');
            const ctpsEl = document.getElementById('colab-ctps');
            const serieEl = document.getElementById('colab-ctps-serie');
            if (ctpsEl) { ctpsEl.value = ctpsEl.value || cpfDigits.substring(0, 7); ctpsEl.readOnly = false; ctpsEl.style.background = ''; ctpsEl.style.cursor = ''; }
            if (serieEl) { serieEl.value = serieEl.value || cpfDigits.substring(7, 11); serieEl.readOnly = false; serieEl.style.background = ''; serieEl.style.cursor = ''; }
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
        let cboCode = cboParts ? cboParts[1] : cboFull;
        const cboDesc = cboParts ? cboParts[2] : '';
        // Normalizar código: se tiver 6 dígitos sem traço (ex: 342125), formatar como 3421-25
        if (cboCode && /^\d{6}$/.test(cboCode.replace(/-/g, ''))) {
            const digits = cboCode.replace(/-/g, '');
            cboCode = digits.slice(0, 4) + '-' + digits.slice(4);
        }
        if (document.getElementById('colab-cbo-codigo')) document.getElementById('colab-cbo-codigo').value = cboCode;
        if (document.getElementById('colab-cbo')) document.getElementById('colab-cbo').value = cboDesc;

        if (document.getElementById('colab-militar')) document.getElementById('colab-militar').value = c.certificado_militar || '';
        if (document.getElementById('colab-militar-categoria')) document.getElementById('colab-militar-categoria').value = c.militar_categoria || '';
        if (document.getElementById('colab-deficiencia')) document.getElementById('colab-deficiencia').value = c.deficiencia || '';
        if (document.getElementById('colab-horario-trabalho')) document.getElementById('colab-horario-trabalho').value = c.horario_trabalho || '';
        if (document.getElementById('colab-horario-intervalo')) document.getElementById('colab-horario-intervalo').value = c.horario_intervalo || '';
        if (document.getElementById('colab-fgts-opcao')) document.getElementById('colab-fgts-opcao').value = _safeDate(c.fgts_opcao);
        if (document.getElementById('colab-banco-nome')) document.getElementById('colab-banco-nome').value = c.banco_nome || '';
        if (document.getElementById('colab-banco-agencia')) document.getElementById('colab-banco-agencia').value = c.banco_agencia || '';
        if (document.getElementById('colab-banco-conta')) document.getElementById('colab-banco-conta').value = c.banco_conta || '';

        // Contato de Emergência
        if (document.getElementById('colab-emergencia-nome')) document.getElementById('colab-emergencia-nome').value = c.contato_emergencia_nome || '';
        if (document.getElementById('colab-emergencia-telefone')) document.getElementById('colab-emergencia-telefone').value = c.contato_emergencia_telefone || '';
        if (document.getElementById('colab-emergencia2-nome')) document.getElementById('colab-emergencia2-nome').value = c.contato_emergencia2_nome || '';
        if (document.getElementById('colab-emergencia2-telefone')) document.getElementById('colab-emergencia2-telefone').value = c.contato_emergencia2_telefone || '';

        // Meio de transporte
        if (document.getElementById('colab-meio-transporte')) {
            document.getElementById('colab-meio-transporte').value = c.meio_transporte || '';
            if (typeof toggleTransporteValor === 'function') toggleTransporteValor(c.meio_transporte);
        }
        if (document.getElementById('colab-valor-transporte')) {
            const valT = c.valor_transporte ? parseFloat(c.valor_transporte).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '';
            const inputT = document.getElementById('colab-valor-transporte');
            inputT.value = valT;
            // Se for VT e não tiver valor salvo, calcular 6% do salário
            if (!valT && c.meio_transporte === 'Vale Transporte (VT)') {
                inputT.value = 'R$ 6,20';
            }
        }

        if (document.getElementById('colab-escala-padrao')) {
            document.getElementById('colab-escala-padrao').value = c.escala_tipo || '';
            if (document.getElementById('colab-entrada')) document.getElementById('colab-entrada').value = c.horario_entrada || '';
            if (document.getElementById('colab-saida')) document.getElementById('colab-saida').value = c.horario_saida || '';
            if (document.getElementById('colab-intervalo-entrada')) document.getElementById('colab-intervalo-entrada').value = c.intervalo_entrada || '';
            if (document.getElementById('colab-intervalo-saida')) document.getElementById('colab-intervalo-saida').value = c.intervalo_saida || '';
            if (document.getElementById('colab-sabado-entrada')) document.getElementById('colab-sabado-entrada').value = c.sabado_entrada || '';
            if (document.getElementById('colab-sabado-saida')) document.getElementById('colab-sabado-saida').value = c.sabado_saida || '';

            toggleFormEscalaTipo();

            if (c.escala_folgas) {
                try {
                    const folgasArr = JSON.parse(c.escala_folgas);
                    document.querySelectorAll('.cb-folga-colab').forEach(cb => {
                        cb.checked = folgasArr.includes(cb.value);
                    });
                    document.querySelectorAll('.cb-uma-folga-colab').forEach(cb => {
                        cb.checked = folgasArr.includes(cb.value);
                    });
                } catch (e) { console.error('Erro ao ler folgas:', e); }
            }
            // Carregar data de referência do ciclo de domingos
            const cicloEl = document.getElementById('colab-escala-ciclo-inicio');
            if (cicloEl) {
                cicloEl.value = c.escala_ciclo_inicio || '';
                // Atualizar label conforme tipo de escala
                if (typeof window.atualizarLabelCiclo === 'function') {
                    const modo = c.escala_tipo === 'escala_12x36' ? '12x36'
                        : c.escala_tipo === 'padrao_sab_alternado' ? 'sab_alternado'
                            : 'folga';
                    window.atualizarLabelCiclo(modo);
                }
            }
        }

        // toggleMotorista ANTES de carregar CNH — se chamado depois limpa os campos
        if (typeof toggleMotorista === 'function') toggleMotorista();
        if (document.getElementById('colab-cnh-numero')) document.getElementById('colab-cnh-numero').value = c.cnh_numero || '';
        if (document.getElementById('colab-cnh-categoria')) document.getElementById('colab-cnh-categoria').value = c.cnh_categoria || '';

        // Férias
        if (document.getElementById('colab-ferias-programadas-inicio')) document.getElementById('colab-ferias-programadas-inicio').value = c.ferias_programadas_inicio || '';
        if (document.getElementById('colab-ferias-programadas-fim')) document.getElementById('colab-ferias-programadas-fim').value = c.ferias_programadas_fim || '';
        if (typeof updateVacationInfo === 'function') updateVacationInfo(admDate);
        if (typeof calculateVacationDays === 'function') calculateVacationDays();

        // Férias Fracionadas
        const ffVal = c.ferias_fracionadas || 'Não';
        const ffRadio = document.querySelector(`input[name="ferias_fracionadas_check"][value="${ffVal}"]`);
        if (ffRadio) { ffRadio.checked = true; window.toggleFeriasFracionadas(ffVal); }
        const ffTipo = c.ferias_fracionadas_tipo || '';
        if (ffTipo) {
            const ffTipoRadio = document.querySelector(`input[name="ferias_fracionadas_tipo"][value="${ffTipo}"]`);
            if (ffTipoRadio) { ffTipoRadio.checked = true; window.toggleFeriasFracionadasTipo(ffTipo); }
        }
        if (document.getElementById('colab-ferias-fracionadas-inicio2')) document.getElementById('colab-ferias-fracionadas-inicio2').value = c.ferias_fracionadas_inicio2 || '';
        if (document.getElementById('colab-ferias-fracionadas-fim2')) document.getElementById('colab-ferias-fracionadas-fim2').value = c.ferias_fracionadas_fim2 || '';
        if (typeof window.calcularTotalFeriasFracionadas === 'function') window.calcularTotalFeriasFracionadas();

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
                    ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(numAdi)
                    : rawAdi;
            } else {
                document.getElementById('colab-adiantamento-valor').value = '';
            }
        }

        // Insalubridade — formatar valor como moeda ao carregar
        const insVal = c.insalubridade || 'Não';
        const radioInS = document.querySelector(`input[name="insalubridade_check"][value="${insVal === 'Sim' ? 'Sim' : 'Não'}"]`);
        if (radioInS) radioInS.checked = true;
        if (document.getElementById('colab-insalubridade-valor')) {
            const rawIns = c.insalubridade_valor;
            if (rawIns) {
                const numIns = parseFloat(String(rawIns).replace(/[^\d.]/g, ''));
                document.getElementById('colab-insalubridade-valor').value = !isNaN(numIns)
                    ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(numIns)
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
        if (document.getElementById('colab-faculdade-data-inicio')) document.getElementById('colab-faculdade-data-inicio').value = c.faculdade_data_inicio || '';
        if (document.getElementById('colab-faculdade-curso') && c.faculdade_curso_id) document.getElementById('colab-faculdade-curso').value = c.faculdade_curso_id;

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

        // Brigadista
        const participaBrig = c.brigadista_participa || 'Não';
        const radioBrig = document.querySelector(`input[name="brigadista_participa"][value="${participaBrig}"]`);
        if (radioBrig) radioBrig.checked = true;
        toggleBrigadistaFields(participaBrig);
        if (document.getElementById('colab-brigadista-validade')) document.getElementById('colab-brigadista-validade').value = c.brigadista_validade || '';

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
        // Popula o cache de férias para checagem de sobreposição no alerta CLT
        window._feriasListCache = (c.ferias_programadas_inicio && c.ferias_programadas_fim)
            ? [{ data_inicio: c.ferias_programadas_inicio, data_fim: c.ferias_programadas_fim }]
            : [];
        calculateVacationDays();
        // Re-avaliar APÓS tudo preenchido — lê do campo do formulário que já foi setado corretamente
        window.updateVacationInfo(document.getElementById('colab-admissao')?.value || c.data_admissao || c.admissao || '');

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
            if (typeof toggleMotorista === 'function') toggleMotorista();
        }, 100);
        // Failsafe: re-calcula período de férias após render completo
        setTimeout(() => {
            const admVal = document.getElementById('colab-admissao')?.value;
            if (admVal) window.updateVacationInfo(admVal);
        }, 400);
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
            cpfInput.addEventListener('input', function () {
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
            rg: document.getElementById('colab-rg') ? document.getElementById('colab-rg').value : null,
            data_nascimento: document.getElementById('colab-nascimento').value,
            estado_civil: estadoCivilInput ? estadoCivilInput.value : '',
            nacionalidade: document.getElementById('colab-nacionalidade').value,
            nome_mae: document.getElementById('colab-mae').value,
            nome_pai: document.getElementById('colab-pai').value,
            telefone: document.getElementById('colab-telefone').value,
            email: document.getElementById('colab-email').value,
            email_corporativo: document.getElementById('colab-email-corporativo') ? document.getElementById('colab-email-corporativo').value : '',
            endereco: document.getElementById('colab-endereco').value,
            cargo: document.getElementById('colab-cargo').value,
            departamento: document.getElementById('colab-departamento').value,
            data_admissao: document.getElementById('colab-admissao').value,
            tipo_contrato: document.getElementById('colab-contrato').value,
            salario: document.getElementById('colab-salario').value,
            status: statusInput ? statusInput.value : '',
            contato_emergencia_nome: document.getElementById('colab-emergencia-nome').value,
            contato_emergencia_telefone: document.getElementById('colab-emergencia-telefone').value,
            contato_emergencia2_nome: document.getElementById('colab-emergencia2-nome') ? document.getElementById('colab-emergencia2-nome').value : '',
            contato_emergencia2_telefone: document.getElementById('colab-emergencia2-telefone') ? document.getElementById('colab-emergencia2-telefone').value : '',
            cnh_numero: document.getElementById('colab-cnh-numero') ? document.getElementById('colab-cnh-numero').value : null,
            cnh_categoria: document.getElementById('colab-cnh-categoria') ? document.getElementById('colab-cnh-categoria').value : null,
            matricula_esocial: document.getElementById('colab-matricula-esocial') ? document.getElementById('colab-matricula-esocial').value : null,
            numero_registro: document.getElementById('colab-numero-registro') ? document.getElementById('colab-numero-registro').value : null,
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
            cbo: (function () {
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
            faz_apontamento: 0,

            escala_folgas: null,
            escala_ciclo_inicio: document.getElementById('colab-escala-ciclo-inicio') ? (document.getElementById('colab-escala-ciclo-inicio').value || null) : null,
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
            ferias_fracionadas: document.querySelector('input[name="ferias_fracionadas_check"]:checked')?.value || 'Não',
            ferias_fracionadas_tipo: document.querySelector('input[name="ferias_fracionadas_tipo"]:checked')?.value || null,
            ferias_fracionadas_inicio2: document.getElementById('colab-ferias-fracionadas-inicio2') ? document.getElementById('colab-ferias-fracionadas-inicio2').value || null : null,
            ferias_fracionadas_fim2: document.getElementById('colab-ferias-fracionadas-fim2') ? document.getElementById('colab-ferias-fracionadas-fim2').value || null : null,
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

        if (data.escala_tipo === 'escala_uma_folga' && !isPartial) {
            const folgas = Array.from(document.querySelectorAll('.cb-uma-folga-colab:checked')).map(cb => cb.value);
            if (folgas.length !== 1) {
                alert('Atenção: Para a escala Folga 1 Dia na Semana, você deve marcar *exatamente 1 dia* de folga na lista.');
                btnRestorer();
                return;
            }
            data.escala_folgas = JSON.stringify(folgas);
        } else if (data.escala_tipo === 'escala_duas_folgas' && !isPartial) {
            const folgas = Array.from(document.querySelectorAll('.cb-folga-colab:checked')).map(cb => cb.value);
            if (folgas.length !== 2) {
                alert('Atenção: Para o esquema 5x2 (Revezamento), você deve marcar *exatamente 2 dias* de folga na lista.');
                btnRestorer();
                return;
            }
            data.escala_folgas = JSON.stringify(folgas);
        } else if (data.escala_tipo && data.escala_tipo !== 'escala_duas_folgas' && data.escala_tipo !== 'escala_uma_folga') {
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
                const cnhNumeroEl = document.getElementById('colab-cnh-numero');
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
                
                // Upload da foto caso tenha sido selecionada no input
                const fotoInput = document.getElementById('colab-foto-input');
                if (fotoInput && fotoInput.files && fotoInput.files[0]) {
                    const fdFoto = new FormData();
                    fdFoto.append('nome', data.nome_completo);
                    fdFoto.append('foto', fotoInput.files[0]);
                    await fetch(`${API_URL}/upload-foto/${colabId}`, {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${currentToken}` },
                        body: fdFoto
                    });
                    // Limpar input após upload para não reenviar sem necessidade
                    fotoInput.value = '';
                }
                
                // Navegação silenciosa — sem alertas de confirmação
            } else {
                // Colaborador salvo sem sync (novo colaborador)
            }

            // Fecha a aba do formulário e vai para a lista de colaboradores
            const formTabIdx = appOpenTabs.findIndex(t => t.target === 'form-colaborador');
            if (formTabIdx !== -1) appOpenTabs.splice(formTabIdx, 1);
            renderAppTabs();
            navigateTo('colaboradores');

        } catch (err) {
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

window.openProntuarioFromCurrentForm = function () {
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
window.openProntuario = async function (id, nome, cargo, cpf, sexo = '', admissao = '', status = '', rgTipo = 'RG') {
    viewedColaborador = { id, nome_completo: nome, cargo, cpf, sexo, data_admissao: admissao, status, rg_tipo: rgTipo };
    window.viewedColaborador = viewedColaborador; // Sync para módulos externos

    // Vincular botão IMEDIATAMENTE (antes de qualquer await)
    const syncBtn = document.getElementById('btn-sync-onedrive');
    if (syncBtn) {
        syncBtn.onclick = function () { window.syncOneDriveManual(id, this); };
    }

    // Buscar dados atualizados para garantir que temos o foto_path correto
    const c = await apiGet(`/colaboradores/${id}`);
    viewedColaborador = c || { id, nome, cargo, cpf, sexo, admissao, status, rgTipo };
    window.viewedColaborador = viewedColaborador; // Sync para módulos externos

    const admission = viewedColaborador.data_admissao || viewedColaborador.admissao || admissao;
    updateProbationBadge(admission);

    const nomeEl = document.getElementById('prontuario-nome-title');
    if (nomeEl) nomeEl.textContent = viewedColaborador.nome_completo || nome || 'Colaborador';

    const cargoEl = document.getElementById('prontuario-cargo-info');
    if (cargoEl) cargoEl.textContent = `${viewedColaborador.cargo || cargo || 'Sem Cargo'} | CPF: ${viewedColaborador.cpf || cpf || ''}`;
    
    const rgEl = document.getElementById('prontuario-rg-info');
    if (rgEl) rgEl.textContent = `${viewedColaborador.rg_tipo || 'RG'}: ${viewedColaborador.rg || 'Não informado'}`;

    // Status Badge
    const statusDisplay = document.getElementById('prontuario-status-display');
    if (statusDisplay) {
        const s = getEffectiveStatus(viewedColaborador || { status });
        let statusHtml = '';
        if (s === 'Aguardando início') statusHtml = `<div style="background:#f1f3f5;color:#495057;border:2px solid #adb5bd;border-radius:20px;font-weight:600;padding:2px 10px;display:inline-flex;align-items:center;gap:4px;font-size:0.75rem;"><i class="ph ph-clock"></i> Aguardando</div>`;
        else if (s === 'Processo iniciado') statusHtml = `<div style="background:#e7f5ff;color:#1864ab;border:2px solid #1864ab;border-radius:20px;font-weight:600;padding:2px 10px;display:inline-flex;align-items:center;gap:4px;font-size:0.75rem;"><i class="ph ph-play-circle"></i> Iniciado</div>`;
        else if (s === 'Ativo') statusHtml = `<div style="background:#e8f5e9;color:#196b36;border:2px solid #196b36;border-radius:20px;font-weight:600;padding:2px 10px;display:inline-flex;align-items:center;gap:4px;font-size:0.75rem;"><i class="ph ph-check-circle"></i> Ativo</div>`;
        else if (s === 'Férias') statusHtml = `<div style="background:#ffedd5;color:#c2410c;border:2px solid #c2410c;border-radius:20px;font-weight:600;padding:2px 10px;display:inline-flex;align-items:center;gap:4px;font-size:0.75rem;"><i class="ph ph-airplane-tilt"></i> Férias</div>`;
        else if (s === 'Afastado') statusHtml = `<div style="background:#faeed9;color:#eaa15f;border:2px solid #eaa15f;border-radius:20px;font-weight:600;padding:2px 10px;display:inline-flex;align-items:center;gap:4px;font-size:0.75rem;"><i class="ph ph-first-aid"></i> Afastado</div>`;
        else if (s === 'Desligado') statusHtml = `<div style="background:#fceeee;color:#ba7881;border:2px solid #ba7881;border-radius:20px;font-weight:600;padding:2px 10px;display:inline-flex;align-items:center;gap:4px;font-size:0.75rem;"><i class="ph ph-x-circle"></i> Desligado</div>`;
        else if (s === 'Incompleto') statusHtml = `<div style="background:#f8f9fa;color:#6c757d;border:2px solid transparent;border-radius:20px;font-weight:600;padding:2px 10px;display:inline-flex;align-items:center;gap:4px;font-size:0.75rem;"><i class="ph ph-pencil-simple"></i> Incompleto</div>`;
        else statusHtml = `<div style="background:#f1f3f5;color:#495057;border:2px solid #adb5bd;border-radius:20px;font-weight:600;padding:2px 10px;display:inline-flex;align-items:center;gap:4px;font-size:0.75rem;"><i class="ph ph-clock"></i> Aguardando</div>`;
        statusDisplay.innerHTML = statusHtml;
    }

    // Foto no Prontuário
    const fotoImg = document.getElementById('prontuario-foto-img');
    const fotoLink = document.getElementById('prontuario-foto-link');
    const fotoPlaceholder = document.getElementById('prontuario-photo-placeholder');
    if (fotoImg && fotoPlaceholder) {
        const fotoSrc = viewedColaborador.foto_base64 ||
            (viewedColaborador.foto_path ? `${API_URL.replace('/api', '')}/${viewedColaborador.foto_path}?t=${Date.now()}` : null);
        if (fotoSrc) {
            fotoImg.src = fotoSrc;
            if (fotoLink) fotoLink.href = `${API_URL.replace('/api', '')}/api/colaboradores/foto/${viewedColaborador.id}`;
            fotoImg.style.display = 'block';
            fotoPlaceholder.style.display = 'none';
        } else {
            fotoImg.style.display = 'none';
            if (fotoLink) fotoLink.removeAttribute('href');
            fotoPlaceholder.style.display = 'flex';
        }
    }

    document.querySelectorAll('#tabs-list li').forEach(t => t.classList.remove('active'));

    // Exibir aba Cônjuge apenas para Casado ou União Estável
    const tabConjuge = document.getElementById('tab-conjuge');
    if (tabConjuge) {
        tabConjuge.style.display = 'none'; // Aba de Cônjuge extinta nativamente (migrado para Passo 4)
    }

    // Aplica permissões de abas do prontuário e seleciona a primeira aba permitida
    let firstAllowed = null;
    if (window.aplicarPermissoesProntuario) {
        firstAllowed = window.aplicarPermissoesProntuario();
    }
    const defaultTab = document.querySelector('#tabs-list li[data-tab="00.CheckList"]');
    const tabToActivate = (defaultTab && !defaultTab.classList.contains('perm-hidden')) ? defaultTab : firstAllowed;
    if (tabToActivate) tabToActivate.classList.add('active');

    const _nomePront = viewedColaborador ? (viewedColaborador.nome_completo || viewedColaborador.nome || nome) : nome;
    const _idPront = viewedColaborador ? (viewedColaborador.id || id) : id;
    window._openProntuarioTab(_idPront, _nomePront, viewedColaborador);
    await loadDocumentosList();
    window.renderTabContent('00.CheckList', '00. CheckList');
};

window.uploadFotoProntuario = async function (input) {
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
                const fotoLink = document.getElementById('prontuario-foto-link');
                const fotoPlaceholder = document.getElementById('prontuario-photo-placeholder');
                if (fotoImg && fotoPlaceholder) {
                    const newSrc = `${API_URL.replace('/api', '')}/${updated.foto_path}?t=${Date.now()}`;
                    fotoImg.src = newSrc;
                    if (fotoLink) fotoLink.href = `${API_URL.replace('/api', '')}/api/colaboradores/foto/${updated.id}`;
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
    'Contratos': ['Contrato de Trabalho', 'Termo de Confidencialidade', 'Acordo Individual Benefícios', 'Acordo Prorrogação e Compensação', 'Declaração Vale Transporte', 'Contrato Experiência 45 dias', 'Prorrogação de Contrato', 'Termo de Estágio'],
    'ASO': ['ASO Padrão'],
    'Ficha de EPI': ['Ficha de EPI Assinada'],
    'Multas': ['Contrato de Responsabilidade com o Veículo']
};

window.getFixedDocsForTab = function(tabId) {
    if (!FIXED_DOCS[tabId]) return null;
    let list = [...FIXED_DOCS[tabId]];
    if (tabId === 'Contratos' && typeof viewedColaborador !== 'undefined' && viewedColaborador) {
        const isMotorista = (viewedColaborador.cargo || '').toUpperCase().includes('MOTORISTA') || (viewedColaborador.departamento || '').toUpperCase().includes('MOTORISTA');
        const isAdministrativo = (viewedColaborador.tipo || viewedColaborador.departamento || '').toUpperCase().includes('ADMINISTRATIVO') || (viewedColaborador.cargo || '').toUpperCase().includes('ADMINISTRATIVO');
        
        if (isMotorista && !list.includes('Responsabilidade Veículo')) {
            list.push('Responsabilidade Veículo');
        }
        if (isAdministrativo && !list.includes('Responsabilidade Equipamento')) {
            list.push('Responsabilidade Equipamento');
        }
    }
    return list;
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
        "Carteira de Trabalho",
        "Contrato e-social"
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
// GERADOR DE OCORRÊNCIA - Renderiza painel na aba Ocorrências (tabId: Advertências)
// ============================================================
window.renderAdvertenciasTab = function (listContainer, filteredDocs) {
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
                    <h4 style="margin:0; font-size:1rem; font-weight:700; color:#1e293b;">Gerar Ocorrência</h4>
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

window.gerarAdvertencia = function () {
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
        suspensao_3: 'SUSPENSÃO DISCIPLINAR — 3 DIAS',
        ocorrencia: 'OCORRÊNCIA'
    };
    const tipoTexto = tipoMap[tipo] || 'ADVERTÊNCIA';
    const isSuspensao = tipo.startsWith('suspensao');
    const diasSuspensao = tipo === 'suspensao_1' ? 1 : tipo === 'suspensao_2' ? 2 : tipo === 'suspensao_3' ? 3 : 0;

    const [ay, am, ad] = (dataOcorrencia || new Date().toISOString().split('T')[0]).split('-');
    const dataFormatada = `${ad}/${am}/${ay}`;
    const meses = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
    const dataExtenso = `${parseInt(ad)} de ${meses[parseInt(am) - 1]} de ${ay}`;
    const dataHoje = new Date();
    const dataHojeFormatada = `${String(dataHoje.getDate()).padStart(2, '0')}/${String(dataHoje.getMonth() + 1).padStart(2, '0')}/${dataHoje.getFullYear()}`;
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
        verbal: 'Advertência Verbal',
        escrita: 'Advertência Escrita',
        suspensao_1: 'Suspensão 1 dia',
        suspensao_2: 'Suspensão 2 dias',
        suspensao_3: 'Suspensão 3 dias',
        ocorrencia: 'Ocorrência'
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

window.abrirPreviewAdvertencia = function (data) {

    // Voltar para o modal centralizado tradicional onde os botões ficam no topo
    const container = document.getElementById('preview-doc-body');
    if (!container) return;

    const apiBase = API_URL.replace('/api', '');
    const logoSrc = `${apiBase}/assets/logo-header.png`;

    container.innerHTML = buildAdvertenciaTemplate(data, logoSrc);
    document.getElementById('preview-doc-title').textContent = `${data.gerador_nome} - ${data.colaborador.NOME_COMPLETO}`;

    const btnsContainer = document.getElementById('preview-doc-buttons');
    if (btnsContainer) {
        btnsContainer.innerHTML = `
            <button onclick="window.anexarAdvertenciaAoProntuario()" id="btn-anexar-adv" class="btn btn-primary" style="background:#2f9e44; border-color:#2b8a3e; align-items:center; gap:5px;">
                <i class="ph ph-paperclip"></i> Anexar ao Prontuário
            </button>
            <button onclick="window.imprimirDocumento()" class="btn btn-primary" style="align-items:center; gap:5px;">
                <i class="ph ph-printer"></i> Imprimir / PDF
            </button>
            <button class="btn btn-secondary" onclick="document.getElementById('modal-preview-doc').style.display='none'">
                <i class="ph ph-x"></i> Fechar
            </button>
        `;
    }

    document.getElementById('modal-preview-doc').style.display = 'block';
};


window.anexarAdvertenciaAoProntuario = async function () {
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
        const semAcentos = (str) => (str || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]/g, '_');

        const hoje = new Date();
        const dd = String(hoje.getDate()).padStart(2, '0');
        const mm = String(hoje.getMonth() + 1).padStart(2, '0');
        const yyyy = hoje.getFullYear();
        const nomeArquivo = [
            semAcentos(window._advertenciaData.titulo),
            semAcentos(window._advertenciaData.tipoSimples),
            `${dd}-${mm}-${yyyy}`,
            semAcentos(window._advertenciaData.colaborador.NOME_COMPLETO)
        ].join('_').replace(/_+/g, '_') + '.pdf';

        // Container A4 isolado
        const apiBase = API_URL.replace('/api', '');
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
        const origBorder = previewEl.style.border;
        const origMinHeight = previewEl.style.minHeight;
        previewEl.style.boxShadow = 'none';
        previewEl.style.border = 'none';
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
        previewEl.style.border = origBorder;
        previewEl.style.minHeight = origMinHeight;

        // Converter canvas → PDF A4 com suporte a múltiplas páginas
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
        const pageW = pdf.internal.pageSize.getWidth();   // 210mm
        const pageH = pdf.internal.pageSize.getHeight();  // 297mm
        const imgData = canvas.toDataURL('image/jpeg', 0.98);
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

        const secData = (typeof window.getDeviceSecurityData === 'function') ? await window.getDeviceSecurityData() : { gps_lat: '', gps_lon: '', dispositivo: navigator.userAgent };
        formData.append('gps_lat', secData.gps_lat);
        formData.append('gps_lon', secData.gps_lon);
        formData.append('dispositivo', secData.dispositivo);

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
                    renderTabContent('Advertências', 'Ocorrências', true);
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

window.renderTemporalTab = function (listContainer, tabId, tabTitle) {

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

window.renderTemporalAno = function (tabId) {
    const safeTabId = tabId.replace(/[^a-zA-Z0-9]/g, '_');
    const yEl = document.getElementById(`temporal_year_${safeTabId}`);
    const y = yEl ? yEl.value : new Date().getFullYear().toString();
    const container = document.getElementById(`temporal_ano_container_${safeTabId}`);
    if (!container) return;
    container.innerHTML = '';

    const docsToUse = currentDocs.filter(d => d.tab_name === tabId && d.year == y);

    // Se for uma aba com documentos fixos, carregar slots fixos primeiro
    const fixedDocsList = window.getFixedDocsForTab(tabId);
    if (fixedDocsList) {
        fixedDocsList.forEach(docType => {
            const existing = docsToUse.find(d => d.document_type === docType);
            container.appendChild(createDocSlot(tabId, docType, existing, `'${y}'`));
        });
        // Docs extras do mesmo ano
        docsToUse.filter(d => !fixedDocsList.includes(d.document_type)).forEach(d => {
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
    fileInput.onchange = function () {
        const typeIn = form.querySelector('input[type="text"]').value || 'Documento';
        uploadDocument(this, tabId, typeIn, `'${y}'`, null, null);
    };
    container.appendChild(form);
}


window.renderTabContent = function (tabId, tabTitle, preventScroll = false) {
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
                    <input type="text" id="doc-search-input" placeholder="Pesquisar documento..." oninput="renderTabContent('${tabId}', '${tabTitle}')" autocomplete="off" readonly onfocus="this.removeAttribute('readonly')" onblur="this.setAttribute('readonly', 'readonly')"
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
    } else if (tabId === 'Sinistros') {
        if (typeof window.renderSinistrosTab === 'function') {
            window.renderSinistrosTab(listContainer);
        } else {
            listContainer.innerHTML = '<div class="alert alert-warning"><i class="ph ph-warning"></i> Módulo de sinistros não carregado. Tente recarregar a página.</div>';
        }
    } else if (tabId === 'Contratos') {

        renderContratosTab(listContainer, searchTerm);
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
        if (typeof window.renderFichaEpiTab === 'function') {
            window.renderFichaEpiTab(listContainer);
        } else {
            listContainer.innerHTML = '<div style="padding:2rem;color:#94a3b8;text-align:center;"><i class="ph ph-shield-slash" style="font-size:2rem;display:block;margin-bottom:8px;"></i>Módulo de EPI não carregado. Tente recarregar a página.</div>';
        }
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

        fixed.push('Carteira de vacinação', 'Currículo', 'Carteira de Trabalho', 'Contrato e-social');
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
        window.setPensaoPront = function (resposta) {
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
                }).catch(() => { });
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
                const safeDepName = (dep.nome || 'DEP').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');

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
                    { label: 'CPF ou RG', show: true },
                    { label: 'Caderneta de Vacinação', show: idade !== null && idade < 7 },
                    { label: 'Atestado de Frequência Escolar', show: idade !== null && idade >= 7 && idade <= 17 },
                    { label: 'Certidão de Nascimento', show: true },
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
    } else if (window.getFixedDocsForTab(tabId)) {
        const fixedDocsList = window.getFixedDocsForTab(tabId);
        if (tabId === 'Multas') {
            // Renderiza aba completa de multas (para qualquer colaborador)
            if (typeof window.renderMultasMotoristaTab === 'function') {
                window.renderMultasMotoristaTab(listContainer);
            } else {
                listContainer.innerHTML = '<div class="alert alert-info">Carregando módulo de multas...</div>';
            }
            return;
        }

        if (tabId === 'Sinistros') {
            if (typeof window.renderSinistrosTab === 'function') {
                window.renderSinistrosTab(listContainer);
            } else {
                listContainer.innerHTML = '<div class="alert alert-info">Carregando módulo de sinistros...</div>';
            }
            return;
        }
        fixedDocsList.forEach(docType => {
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
        filteredDocs.filter(d => !fixedDocsList.includes(d.document_type)).forEach(d => {
            listContainer.appendChild(createDocSlot(tabId, d.document_type, d));
        });
    } else {
        // Slot fixo NR1 para a aba Certificados (upload-only, equivale ao credenciamento NR1)
        if (tabId === 'Certificados') {
            const _normC = s => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
            const nr1Doc = filteredDocs.find(d =>
                _normC(d.document_type).includes('nr1') ||
                _normC(d.document_type).includes('nr 1') ||
                _normC(d.document_type).includes('ordem de servico') ||
                _normC(d.document_type).includes('ordem de servi')
            );
            if (nr1Doc) {
                listContainer.appendChild(createDocSlot(tabId, nr1Doc.document_type, nr1Doc));
            } else {
                const nr1Wrapper = document.createElement('div');
                nr1Wrapper.style.cssText = 'display:flex; align-items:center; justify-content:space-between; padding:0.65rem 0.75rem; border:1.5px dashed #16a34a; border-radius:8px; background:#f0fdf4; gap:0.75rem; margin-bottom:0.5rem;';
                nr1Wrapper.innerHTML = `
                    <div style="display:flex; align-items:center; gap:0.6rem; flex:1;">
                        <span style="background:#dcfce7;color:#15803d;border:1px solid #86efac;border-radius:10px;padding:2px 8px;font-size:0.7rem;font-weight:700;white-space:nowrap;">NR-1</span>
                        <div>
                            <span style="font-weight:600; color:#334155; font-size:0.9rem;">NR1 / Ordem de Serviço</span>
                            <div style="font-size:0.75rem; color:#16a34a; margin-top:1px;">Documento exigido no credenciamento — faça o upload do PDF</div>
                        </div>
                    </div>
                    <label class="btn btn-secondary" style="display:flex;align-items:center;gap:0.4rem;cursor:pointer;font-size:0.82rem;padding:0.35rem 0.8rem;margin:0;">
                        <i class="ph ph-upload-simple"></i> Anexar PDF
                        <input type="file" accept=".pdf" style="display:none" onchange="window.uploadContratoExternoComTipo(this, 'NR1', 'Certificados')">
                    </label>`;
                listContainer.appendChild(nr1Wrapper);
            }
        }

        const form = createDynamicUploadForm(tabId, `Adicionar doc. em ${tabTitle.replace(/^\d+\.\s*/, '')}`);
        listContainer.appendChild(form);
        listContainer.appendChild(document.createElement('hr'));
        filteredDocs.filter(d => {
            if (tabId !== 'Certificados') return true;
            // Já mostrou NR1 no slot fixo — não duplicar
            const _n = (s => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim())(d.document_type);
            return !(_n.includes('nr1') || _n.includes('nr 1') || _n.includes('ordem de servico') || _n.includes('ordem de servi'));
        }).forEach(d => {
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
                <button type="button" class="btn btn-primary" onclick="renderFaculdadeCompetencia()" style="display:none;">Carregar</button>
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

window.renderFaculdadeCompetencia = function () {
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
    } catch (e) { }
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
        const mm = String(sentDateObj.getMonth() + 1).padStart(2, '0');
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
            const smm = String(signedObj.getMonth() + 1).padStart(2, '0');
            const syyyy = signedObj.getFullYear();
            const sh = String(signedObj.getHours()).padStart(2, '0');
            const smin = String(signedObj.getMinutes()).padStart(2, '0');
            enviadoHtml += `<br><span style="display:inline-flex;align-items:center;gap:4px;background:#dbeafe;color:#1d4ed8;border-radius:8px;padding:2px 8px;font-weight:700;font-size:0.78rem;margin-top:2px;">
              <i class="ph ph-pen-nib" style="font-size:0.9rem;"></i>
              Assinado: ${sdd}/${smm}/${syyyy} às ${sh}h${smin}m
            </span>`;
        }
    }

    let atestadoInfoHtml = '';
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
    }

    let atestadoContabHtml = '';    if (isSaved && (existingDoc.enviado_contabilidade_em || existingDoc.atestado_contab_enviado_em)) {
        let sd = existingDoc.enviado_contabilidade_em || existingDoc.atestado_contab_enviado_em;
        if (!sd.includes('T')) sd = sd.replace(' ', 'T');
        if (!sd.endsWith('Z')) sd += 'Z';
        const contabDateObj = new Date(sd);
        const dd = String(contabDateObj.getDate()).padStart(2, '0');
        const mm = String(contabDateObj.getMonth() + 1).padStart(2, '0');
        const yyyy = contabDateObj.getFullYear();
        const h = String(contabDateObj.getHours()).padStart(2, '0');
        const min = String(contabDateObj.getMinutes()).padStart(2, '0');
        atestadoContabHtml = ` <br><span style="color:#2f9e44; font-weight:600; font-size:0.75rem;"><i class="ph ph-check-circle"></i> Enviado p/ Contab: ${dd}/${mm}/${yyyy} - ${h}h${min}m</span> `;
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
            if (t.includes('ocorr')) { bg = '#0ea5e9'; color = '#fff'; }
            else if (t.includes('verbal')) { bg = '#ffd43b'; color = '#5c3d00'; }
            else if (t.includes('escrita') || t.includes('escrito')) { bg = '#fd7e14'; color = '#fff'; }
            else if (t.includes('suspens') && t.includes('1')) { bg = '#ff8787'; color = '#5c0000'; }
            else if (t.includes('suspens') && t.includes('2')) { bg = '#e03131'; color = '#fff'; }
            else if (t.includes('suspens') && t.includes('3')) { bg = '#862e2e'; color = '#fff'; }
            else if (t.includes('suspens')) { bg = '#e03131'; color = '#fff'; }
            else { bg = '#64748b'; color = '#fff'; }
            return `<span style="display:inline-block; margin-top:3px; background:${bg}; color:${color}; padding:1px 8px; border-radius:10px; font-size:0.68rem; font-weight:700; letter-spacing:0.03em;">${tipoAdvSimples}</span>`;
        })() : '';
    }

    // Icone esquerdo: amarelo=criado, azul aviao=enviado, verde caneta=assinado
    const assinafyStatus = isSaved ? (existingDoc.assinafy_status || '') : '';
    const foiEnviado = isSaved && !!existingDoc.assinafy_sent_at;
    // Cartao especial roxo para tipo 'Pagamentos' na aba Pagamentos
    const isPagamentosCard = (tabId === 'Pagamentos' && docType === 'Pagamentos');
    let docIconClass, docIconColor;
    if (assinafyStatus === 'Assinado') {
        docIconClass = 'ph-pen-nib';
        docIconColor = '#2f9e44'; // verde
    } else if (foiEnviado || assinafyStatus === 'Pendente') {
        docIconClass = 'ph-paper-plane-tilt';
        docIconColor = '#1971c2'; // azul
    } else if (isPagamentosCard) {
        docIconClass = isSaved ? 'ph-file-pdf' : 'ph-file-dashed';
        docIconColor = isSaved ? '#a21caf' : '#c084fc'; // roxo
    } else {
        docIconClass = 'ph-file-text';
        docIconColor = isSaved ? '#e8a000' : '#94a3b8'; // amarelo=salvo, cinza=pendente
    }

    const toggleArrow = (tabId === 'Advertências' && isSaved) 
        ? `<span id="ocorr-arrow-${existingDoc.id}" style="color:#64748b; font-size:0.95rem; transition:transform 0.25s; display:inline-flex; align-items:center; cursor:pointer; margin-right:6px;" title="Ver anexos">▶</span>` 
        : '';

    let infoHtml = `
        <div class="doc-info ${isSaved ? 'has-file' : ''}">
            <i class="ph ${isSaved ? docIconClass : 'ph-file-dashed'}" style="color:${isSaved ? docIconColor : ''}; font-size:1.3rem; margin-top:2px;"></i>
            <div style="display: flex; flex-direction: column;">
                <h4 style="display:flex; align-items:flex-start; margin:0;">
                    ${toggleArrow}
                    <div style="display:flex; flex-direction:column; line-height:1.2;">
                        <span>${docLabel}</span>
                        ${docBadge ? `<div>${docBadge}</div>` : ''}
                    </div>
                </h4>
                ${isSaved ? `<p style="margin:2px 0 0; font-size:0.82rem; color:#475569;">${displayFileName}</p>${subInfoLine}` : '<p>Pendente</p>'}
            </div>
        </div>
    `;

    let vencimentoInputHtml = '';
    const needsVencimentoList = ['ASO', 'CNH', 'Exames Complementares', 'Comprovante de endereço'];
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
            assStatusIcon = `<button type="button" onclick="window.openSignedDocPopupDocumento(${existingDoc.id}, '${(docType || '').replace(/'/g, "\\'")}')"
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

                    ${(isSaved && !(tabId === 'Advertências' && ['Assinado', 'Testemunhas'].includes(stMain) && (docType && (docType.toLowerCase().includes('suspens') || docType.toLowerCase().includes('advert'))))) ? `
                        <button type="button" class="btn btn-secondary" onclick="viewDoc(${existingDoc.id})" title="Visualizar" style="height: 42px;"><i class="ph ph-eye"></i></button>
                    ` : ''}

                    ${(tabId === 'Advertências' && isSaved) ? (() => {
                const _isOcorrDoc = (docType || '').includes('###Ocorr');
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

                    ${(tabId === 'Advertências' && isSaved && ['Assinado', 'Testemunhas'].includes(stMain) && (docType && (docType.toLowerCase().includes('suspens') || docType.toLowerCase().includes('advert')))) ? `
                    <div style="display:flex; flex-direction:column; gap:0.35rem; margin-top:0.35rem; align-items:flex-end;">
                        <input type="text" id="susp-contab-email-${existingDoc.id}"
                               value="vanessa.santana@grupowp.com.br; vanessa.caroline@grupowp.com.br"
                               style="height:36px; padding:0 0.6rem; border:1px solid #cbd5e1; border-radius:6px; font-size:0.82rem; width:100%; min-width:340px; max-width:420px;">
                        <div style="display:flex; gap:0.5rem; align-items:center; justify-content:flex-end; width:100%;">
                            <button type="button" class="btn btn-secondary" onclick="viewDoc(${existingDoc.id})" title="Visualizar" style="height: 36px;"><i class="ph ph-eye"></i></button>
                            ${!isAssinado ? `<button type="button" class="btn btn-danger" onclick="deleteDoc(${existingDoc.id}, this)" title="Excluir" style="height:36px;"><i class="ph ph-trash"></i></button>` : ''}
                            <button type="button"
                                    onclick="window.enviarSuspensaoContabilidade(${existingDoc.id}, 'susp-contab-email-${existingDoc.id}', this)"
                                    style="height:36px; display:flex; align-items:center; justify-content:center; gap:6px; background:#0f4c81; color:#fff; border:none; border-radius:6px; padding:0 0.85rem; font-size:0.82rem; font-weight:600; cursor:pointer; white-space:nowrap; min-width:230px; max-width:250px;">
                                <i class="ph ph-buildings"></i> Enviar para Contabilidade
                            </button>
                        </div>
                    </div>` : ''}
                    
                    ${(tabId === 'Faculdade' && isSaved && docType === 'Boleto') ? ` 
                    <div style="display:flex; flex-direction:column; gap:0.35rem; margin-top:0.35rem; align-items:flex-end; width:100%; border-top: 1px dashed #e2e8f0; padding-top: 0.5rem;">
                        <div style="display:flex; gap:0.5rem; align-items:center; justify-content:flex-end; width:100%;">
                            <input type="text" id="faculdade-financeiro-email-${existingDoc.id}"
                                   value="financeiro1@americarental.com.br; financeiro@americarental.com.br; contas@americarental.com.br"
                                   style="height:36px; padding:0 0.6rem; border:1px solid #cbd5e1; border-radius:6px; font-size:0.82rem; width:100%; max-width:500px;">
                            <button type="button"
                                    onclick="window.enviarBoletoFinanceiro(${existingDoc.id}, 'faculdade-financeiro-email-${existingDoc.id}', this)"
                                    style="height:36px; display:flex; align-items:center; justify-content:center; gap:6px; background:#16a34a; color:#fff; border:none; border-radius:6px; padding:0 0.85rem; font-size:0.82rem; font-weight:600; cursor:pointer; white-space:nowrap; max-width:250px;">
                                <i class="ph ph-currency-circle-dollar"></i> Enviar para o Financeiro
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
                                <input type="radio" name="exig-assin-${(docType || '').replace(/[^a-zA-Z0-9]/g, '_')}" value="PENDENTE" ${stMain !== 'NAO_EXIGE' ? 'checked' : ''}> Sim
                            </label>
                            <label style="display:flex;align-items:center;gap:3px;cursor:pointer;margin:0;font-weight:500;">
                                <input type="radio" name="exig-assin-${(docType || '').replace(/[^a-zA-Z0-9]/g, '_')}" value="NAO_EXIGE" ${stMain === 'NAO_EXIGE' ? 'checked' : ''}> Não
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

                    ${(tabId === 'Atestados' && isSaved && existingDoc.atestado_tipo !== 'horas') ? `
                    <div style="display:flex; flex-direction:column; gap:0.35rem; margin-top:0.35rem; align-items:flex-end;">
                        <input type="text" id="contab-email-${existingDoc.id}"
                               value="vanessa.santana@grupowp.com.br; vanessa.caroline@grupowp.com.br"
                               style="height:36px; padding:0 0.6rem; border:1px solid #cbd5e1; border-radius:6px; font-size:0.82rem; width:100%; min-width:340px; max-width:420px;">
                        <div style="display:flex; gap:0.5rem; align-items:center; justify-content:flex-end; width:100%;">
                            <button type="button" class="btn btn-secondary" onclick="viewDoc(${existingDoc.id})" title="Visualizar" style="height:36px;">
                                <i class="ph ph-eye"></i>
                            </button>
                            ${!isAssinado ? `<button type="button" class="btn btn-danger" onclick="deleteDoc(${existingDoc.id}, this)" title="Excluir" style="height:36px;"><i class="ph ph-trash"></i></button>` : ''}
                            <button type="button"
                                    onclick="window.enviarAtestadoContabilidade(${existingDoc.id}, 'contab-email-${existingDoc.id}', this)"
                                    style="height:36px; display:flex; align-items:center; justify-content:center; gap:6px; background:#0f4c81; color:#fff; border:none; border-radius:6px; padding:0 0.85rem; font-size:0.82rem; font-weight:600; cursor:pointer; white-space:nowrap; min-width:230px; max-width:250px;">
                                <i class="ph ph-buildings"></i> Enviar para Contabilidade
                            </button>
                        </div>
                    </div>` : ''}

                    ${(tabId === 'Faculdade' && isSaved && docType === 'Boleto') ? `
                    <div style="display:flex; flex-direction:column; gap:0.35rem; margin-top:0.35rem; align-items:flex-end; width:100%; border-top: 1px dashed #e2e8f0; padding-top: 0.5rem;">
                        <div style="display:flex; gap:0.5rem; align-items:center; justify-content:flex-end; width:100%;">
                            <input type="text" id="faculdade-financeiro-email-${existingDoc.id}"
                                   value="financeiro1@americarental.com.br; financeiro@americarental.com.br; contas@americarental.com.br"
                                   style="height:36px; padding:0 0.6rem; border:1px solid #cbd5e1; border-radius:6px; font-size:0.82rem; width:100%; max-width:500px;">
                            <button type="button"
                                    onclick="window.enviarBoletoFinanceiro(${existingDoc.id}, 'faculdade-financeiro-email-${existingDoc.id}', this)"
                                    style="height:36px; display:flex; align-items:center; justify-content:center; gap:6px; background:#16a34a; color:#fff; border:none; border-radius:6px; padding:0 0.85rem; font-size:0.82rem; font-weight:600; cursor:pointer; white-space:nowrap;">
                                <i class="ph ph-currency-circle-dollar"></i> Enviar para o Financeiro
                            </button>
                        </div>
                    </div>` : ''}
                </div>
            `}
        </div>
    `;

    div.innerHTML = infoHtml + actionsHtml;

    // ─── PAINEL DE ANEXOS para Advertências ───────────────────────────────────
    if (tabId === 'Advertências' && isSaved) {
        const docId = existingDoc.id;

        // Painel expansível de anexos abaixo do card
        const anexoPanel = document.createElement('div');
        anexoPanel.id = `ocorr-anexo-panel-${docId}`;
        anexoPanel.style.cssText = 'flex-basis:100%; border-top:1px dashed #e2e8f0; margin-top:0.5rem; overflow:hidden; max-height:0; transition:max-height 0.35s ease, padding 0.2s; padding:0 1rem;';

        div.style.flexWrap = 'wrap'; // Garante que o painel quebre para a linha de baixo

        anexoPanel.innerHTML = `
            <div style="display:flex; align-items:center; justify-content:space-between; margin-top:0.5rem; margin-bottom:0.5rem;">
                <span id="ocorr-label-${docId}" style="font-size:0.78rem; font-weight:600; color:#64748b;"><i class="ph ph-paperclip"></i> Anexos da Ocorrência</span>
                <label onclick="event.stopPropagation();" style="display:inline-flex; align-items:center; gap:5px; cursor:pointer; background:#f0f9ff; border:1px solid #bae6fd; border-radius:6px; padding:4px 12px; font-size:0.75rem; font-weight:600; color:#0369a1; white-space:nowrap; margin:0; transition:background 0.2s;">
                    <i class="ph ph-upload-simple" style="font-size:0.9rem;"></i> Anexar arquivo
                    <input type="file" accept="image/*,.pdf,.doc,.docx" multiple style="display:none;"
                        onchange="window.uploadOcorrenciaAnexo(${docId}, this)">
                </label>
            </div>
            <div id="ocorr-galeria-${docId}" style="display:flex; flex-wrap:wrap; gap:0.75rem; padding:0.25rem 0 0.75rem 0;">
                <span style="color:#94a3b8; font-size:0.8rem; font-style:italic;">Carregando anexos...</span>
            </div>
        `;

        div.appendChild(anexoPanel);

        // Toggle expande/recolhe a partir da seta no título
        const arrow = div.querySelector(`#ocorr-arrow-${docId}`);
        if (arrow) {
            let _loaded = false;
            arrow.addEventListener('click', (e) => {
                e.stopPropagation();
                const panel = document.getElementById(`ocorr-anexo-panel-${docId}`);
                const isOpen = panel.style.maxHeight !== '0px' && panel.style.maxHeight !== '';
                if (isOpen) {
                    panel.style.maxHeight = '0';
                    panel.style.padding = '0 1rem';
                    arrow.style.transform = 'rotate(0deg)';
                } else {
                    panel.style.maxHeight = '800px';
                    panel.style.padding = '0.5rem 1rem';
                    arrow.style.transform = 'rotate(90deg)';
                    if (!_loaded) {
                        _loaded = true;
                        window.carregarOcorrenciaAnexos(docId);
                    }
                }
            });
        }
    }
    // ─────────────────────────────────────────────────────────────────────────

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

window.renderTerapiaCompetencia = function () {
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

window.renderASOTab = function (container, filteredDocs) {
    const selected = window.tabPersistence ? window.tabPersistence['aso_year'] : null;
    window.lastASODocs = filteredDocs;
    const optionsHtml = getAnosAdmissaoOptions(selected);

    // Dados do envio anterior (se houver)
    const emailEnviado = viewedColaborador ? viewedColaborador.aso_email_enviado : null;
    const exameData = viewedColaborador ? viewedColaborador.aso_exame_data : null;
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
                <div class="input-group" style="width:180px; flex-shrink:0; margin-bottom:0;">
                    <label style="font-size:0.75rem; font-weight:700;">Tipo de Exame</label>
                    <select id="aso-tipo-exame-tab" class="form-control" style="padding:0.5rem; font-size:0.85rem; height:38px;" onchange="document.getElementById('aso-nova-funcao-container').style.display = this.value === 'Troca de Função' ? 'block' : 'none';">
                        <option value="Admissional">Admissional</option>
                        <option value="Demissional">Demissional</option>
                        <option value="Retorno ao trabalho">Retorno ao trabalho</option>
                        <option value="Periódico">Periódico</option>
                        <option value="Troca de Função">Troca de Função</option>
                    </select>
                </div>
                <div class="input-group" id="aso-nova-funcao-container" style="display:none; width:180px; flex-shrink:0; margin-bottom:0;">
                    <label style="font-size:0.75rem; font-weight:700;">Nova Função</label>
                    <input type="text" id="aso-nova-funcao-tab" class="form-control" style="padding:0.5rem; font-size:0.85rem; height:38px;">
                </div>
                <div class="input-group" style="flex:1; min-width:200px; margin-bottom:0;">
                    <label style="font-size:0.75rem; font-weight:700;">Destinatário</label>
                    <input type="text" id="aso-email-dest-tab" value="recepcao@iacimedtrab.com.br;cobranca@iacimedtrab.com.br"
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
window.sendASOEmailTab = async function () {
    if (!viewedColaborador) { alert('Colaborador não selecionado.'); return; }

    const dataExame = document.getElementById('aso-exame-data-tab').value;
    const tipoExame = document.getElementById('aso-tipo-exame-tab').value;
    const destinatario = document.getElementById('aso-email-dest-tab').value;
    const novaFuncao = document.getElementById('aso-nova-funcao-tab')?.value || '';
    if (!dataExame) { alert('Selecione a data do exame.'); return; }
    if (tipoExame === 'Troca de Função' && !novaFuncao) { alert('Preencha a nova função.'); return; }

    const [y, m, d] = dataExame.split('-');
    const dt = `${d}/${m}/${y}`;
    const cargo = (viewedColaborador.cargo || '').toLowerCase();
    const tipoExameUpper = (tipoExame || '').toLowerCase();
    const isMotorista = cargo.includes('motorista');
    const tipoComExamesCompl = ['admissional', 'periódico', 'periodico', 'periódico'];
    const examesCompl = isMotorista && tipoComExamesCompl.some(t => tipoExameUpper.includes(t))
        ? 'Audiometria, Acuidade Visual, E.E.G, E.C.G e Glicemia.'
        : '';
    const exames = examesCompl ? `Exame Padrão\nExames Complementares: ${examesCompl}` : 'Exame Padrão';

    const novaFuncaoText = (tipoExame === 'Troca de Função' && novaFuncao) ? `\nNova Função: ${novaFuncao}` : '';
    const mailBody = `Título: Exame Médico\n\nSegue abaixo as informações para a realização do exame do colaborador.\n\nData: ${dt}\nNome: ${viewedColaborador.nome_completo || viewedColaborador.nome}\nCPF: ${viewedColaborador.cpf || '-'}\nFunção Atual: ${viewedColaborador.cargo || '-'}${novaFuncaoText}\nDepartamento: ${viewedColaborador.departamento || '-'}\n\nExames:\n${exames}\n\n⚠️ IMPORTANTE:\nApós o exame ficar pronto, favor enviar o documento por e-mail para: rh@americarental.com.br`;

    const btn = document.getElementById('btn-enviar-aso-email-tab');
    const originalContent = btn.innerHTML;
    try {
        btn.disabled = true;
        btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Enviando...';

        const res = await apiPost('/send-aso-email', {
            colaborador_id: viewedColaborador.id,
            email_to: destinatario.replace(/;/g, ','),
            data_exame: dataExame,
            tipo_exame: tipoExame,
            nova_funcao: novaFuncao,
            cc: ['rh@americarental.com.br', 'rh2@americarental.com.br']
        });

        if (res.sucesso) {
            alert('✅ E-mail enviado com sucesso para a IACI!');
            // Recarregar aba para mostrar aviso
            viewedColaborador.aso_email_enviado = res.data_envio;
            viewedColaborador.aso_exame_data = res.data_agendada;
            if (res.new_doc && typeof currentDocs !== 'undefined') {
                currentDocs.push(res.new_doc);
            }
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
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="ph ph-paper-plane-tilt"></i> Enviar Solicitação'; }
    }
};



window.renderASOAno = function () {
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
                    <button onclick="window.transformarFaltaEmAtestado(${f.id}, '${f.data_falta}')" style="background:#0ea5e9; border:none; cursor:pointer; color:#fff; border-radius:6px; padding:4px 8px; font-size:0.75rem; font-weight:700; margin-right:8px;" title="Transformar em Atestado">
                        <i class="ph ph-file-plus"></i> Transformar em Atestado
                    </button>
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

window.registrarFalta = async function () {
    const data = document.getElementById('falta-data')?.value;
    const turno = document.getElementById('falta-turno')?.value;
    const obs = document.getElementById('falta-obs')?.value || '';
    const avisado = document.querySelector('input[name="falta-avisado"]:checked')?.value || 'Não';
    if (!data) { alert('Informe a data da falta.'); return; }
    if (!viewedColaborador) return;

    try {
        await apiPost('/faltas', { colaborador_id: viewedColaborador.id, data_falta: data, turno, observacao: obs, avisado_previamente: avisado });
        const listContainer = document.getElementById('faltas-combined-container') || document.getElementById('docs-list-container');
        if (listContainer) await renderFaltasTab(listContainer);
    } catch (e) { alert('Erro ao registrar falta: ' + e.message); }
};

window.deletarFalta = async function (id, btn) {
    if (!confirm('Excluir esta falta?')) return;
    btn.disabled = true;
    try {
        await apiDelete(`/faltas/${id}`);
        const listContainer = document.getElementById('faltas-combined-container') || document.getElementById('docs-list-container');
        if (listContainer) await renderFaltasTab(listContainer);
    } catch (e) { alert('Erro ao excluir: ' + e.message); btn.disabled = false; }
};

window.transformarFaltaEmAtestado = function (faltaId, dataFalta) {
    window.faltaIdParaAtestado = faltaId;

    var overlay = document.getElementById('modal-transformar-falta-overlay');
    if (overlay) overlay.remove();

    overlay = document.createElement('div');
    overlay.id = 'modal-transformar-falta-overlay';
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(15,23,42,0.6);z-index:999999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);';

    const today = new Date().toISOString().split('T')[0];
    const dataInicial = dataFalta || today;

    overlay.innerHTML = `
        <div style="background:#fff;border-radius:12px;width:90%;max-width:550px;box-shadow:0 10px 25px rgba(0,0,0,0.1);display:flex;flex-direction:column;overflow:visible;">
            <div style="padding:1.25rem 1.5rem;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;">
                <h3 style="margin:0;font-size:1.15rem;color:#1e293b;display:flex;align-items:center;gap:0.5rem;"><i class="ph ph-file-plus" style="color:#0ea5e9;"></i> Transformar em Atestado</h3>
                <button onclick="document.getElementById('modal-transformar-falta-overlay').remove()" style="background:none;border:none;cursor:pointer;color:#94a3b8;font-size:1.2rem;"><i class="ph ph-x"></i></button>
            </div>
            <div style="padding:1.5rem;display:flex;flex-direction:column;gap:1.25rem;overflow:visible;">
                
                <div class="cid-input-group" style="position:relative;z-index:999;">
                    <label style="font-size:0.8rem;font-weight:600;color:#334155;margin-bottom:0.25rem;display:block;">CID-10</label>
                    <input type="text" id="modal_cid_search" class="form-control" placeholder="Digite para buscar o CID..." autocomplete="off" oninput="window.searchModalCID(this.value)" style="width:100%;padding:0.5rem;border:1px solid #cbd5e1;border-radius:6px;">
                    <div id="modal_cid_dropdown" class="cid-dropdown" style="display:none;position:absolute;top:100%;left:0;right:0;background:#fff;border:1px solid #ccc;border-radius:4px;max-height:200px;overflow-y:auto;box-shadow:0 4px 12px rgba(0,0,0,0.1);"></div>
                </div>

                <div style="display:flex;gap:1rem;">
                    <div style="flex:1;">
                        <label style="font-size:0.8rem;font-weight:600;color:#334155;margin-bottom:0.25rem;display:block;">Data Início</label>
                        <input type="date" id="modal_atestado_inicio" class="form-control" value="${dataInicial}" oninput="window.calcModalAtestadoFim()" style="width:100%;padding:0.5rem;border:1px solid #cbd5e1;border-radius:6px;">
                    </div>
                    <div style="flex:1;">
                        <label style="font-size:0.8rem;font-weight:600;color:#334155;margin-bottom:0.25rem;display:block;">Qtd. Dias</label>
                        <input type="number" id="modal_atestado_qtd" class="form-control" min="1" value="1" oninput="window.calcModalAtestadoFim()" style="width:100%;padding:0.5rem;border:1px solid #cbd5e1;border-radius:6px;">
                    </div>
                    <div style="flex:1;">
                        <label style="font-size:0.8rem;font-weight:600;color:#334155;margin-bottom:0.25rem;display:block;">Término</label>
                        <input type="date" id="modal_atestado_fim" class="form-control" style="width:100%;padding:0.5rem;border:1px solid #cbd5e1;border-radius:6px;background:#f1f5f9;" readonly>
                    </div>
                </div>

                <div>
                    <label style="font-size:0.8rem;font-weight:600;color:#334155;margin-bottom:0.25rem;display:block;">Anexar Documento (PDF/Imagem)</label>
                    <input type="file" id="modal_cid_file" accept=".pdf,image/*" class="form-control" style="width:100%;padding:0.4rem;border:1px solid #cbd5e1;border-radius:6px;">
                </div>

            </div>
            <div style="padding:1rem 1.5rem;border-top:1px solid #e2e8f0;display:flex;justify-content:flex-end;gap:0.75rem;background:#f8fafc;border-bottom-left-radius:12px;border-bottom-right-radius:12px;">
                <button onclick="document.getElementById('modal-transformar-falta-overlay').remove()" class="btn btn-light" style="padding:0.5rem 1rem;border:1px solid #cbd5e1;border-radius:6px;background:#fff;cursor:pointer;">Cancelar</button>
                <button onclick="window.uploadModalAtestado()" class="btn btn-primary" id="modal-btn-upload-atestado" style="padding:0.5rem 1rem;background:#0ea5e9;border:none;border-radius:6px;color:#fff;display:flex;align-items:center;gap:0.4rem;cursor:pointer;font-weight:600;"><i class="ph ph-check"></i> Salvar Atestado</button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);
    window.calcModalAtestadoFim();
};

window.selectedModalCID = null;

window.searchModalCID = async function (val) {
    const dd = document.getElementById('modal_cid_dropdown');
    if (!val || val.length < 2) { dd.style.display = 'none'; return; }
    try {
        const res = await fetch(`${API_URL}/cid10?q=${encodeURIComponent(val)}`, { headers: { 'Authorization': `Bearer ${currentToken}` } });
        const data = await res.json();
        if (!data.length) { dd.style.display = 'none'; return; }
        dd.innerHTML = data.map((c, i) =>
            `<div style="padding:0.6rem 0.8rem;cursor:pointer;font-size:0.85rem;border-bottom:1px solid #f1f5f9;" onclick="window.selectModalCID('${c.code}', this.dataset.desc)" data-desc="${c.desc.replace(/"/g, '&quot;')}">
                <strong style="color:#1a73e8;">${c.code}</strong> — ${c.desc}
             </div>`
        ).join('');
        dd.style.display = 'block';
    } catch (e) { 
        console.error('Erro na busca de CID (modal):', e);
        dd.style.display = 'none'; 
    }
};

window.selectModalCID = function (code, desc) {
    window.selectedModalCID = { code, desc };
    document.getElementById('modal_cid_dropdown').style.display = 'none';
    document.getElementById('modal_cid_search').value = `${code} — ${desc}`;
};

window.calcModalAtestadoFim = function () {
    const inicio = document.getElementById('modal_atestado_inicio')?.value;
    const qtd = parseInt(document.getElementById('modal_atestado_qtd')?.value, 10) || 1;
    const fimEl = document.getElementById('modal_atestado_fim');
    if (!fimEl) return;
    if (!inicio) { fimEl.value = ''; return; }
    const d = new Date(inicio + 'T12:00:00');
    d.setDate(d.getDate() + qtd - 1);
    fimEl.value = d.toISOString().split('T')[0];
};

window.uploadModalAtestado = async function () {
    const fileEl = document.getElementById('modal_cid_file');
    const file = fileEl.files[0];
    if (!file) { alert('Anexe o documento do atestado.'); return; }
    if (!window.selectedModalCID) { alert('Selecione o CID.'); return; }
    if (!viewedColaborador) return;

    const btn = document.getElementById('modal-btn-upload-atestado');
    const oldHtml = btn.innerHTML;
    btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Salvando...';
    btn.disabled = true;

    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const aa = String(today.getFullYear()).slice(2);
    const nomeColabNorm = (viewedColaborador.nome_completo || viewedColaborador.nome || 'COLAB')
        .toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Z0-9]+/g, '_');
    const customName = `${window.selectedModalCID.code}_${nomeColabNorm}_${dd}${mm}${aa}`;
    const typeIn = `${window.selectedModalCID.code} - ${window.selectedModalCID.desc.substring(0, 60)}`;

    const formData = new FormData();
    formData.append('colaborador_id', viewedColaborador.id);
    formData.append('colaborador_nome', viewedColaborador.nome || 'Desconhecido');
    formData.append('tab_name', 'Atestados');
    formData.append('document_type', typeIn);
    formData.append('custom_name', customName);
    formData.append('cloud_name', customName + '.pdf');
    formData.append('year', document.getElementById('atestados_year') ? document.getElementById('atestados_year').value : today.getFullYear().toString());

    const inicioVal = document.getElementById('modal_atestado_inicio').value;
    const fimVal = document.getElementById('modal_atestado_fim').value;
    formData.append('atestado_tipo', 'dias');
    formData.append('atestado_inicio', inicioVal);
    formData.append('atestado_fim', fimVal || inicioVal);
    formData.append('file', file);

    try {
        const res = await fetch(`${API_URL}/documentos`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${currentToken}` },
            body: formData
        });
        if (res.ok) {
            // Remove a falta relacionada
            if (window.faltaIdParaAtestado) {
                try {
                    await apiDelete(`/faltas/${window.faltaIdParaAtestado}`);
                    window.faltaIdParaAtestado = null;
                } catch (e) { console.error('Erro ao excluir falta:', e); }
            }

            // Atualiza status se o atestado for válido para hoje
            const todayStr = today.toISOString().split('T')[0];
            if (todayStr >= inicioVal && todayStr <= fimVal) {
                viewedColaborador.status = 'Afastado';
            }

            document.getElementById('modal-transformar-falta-overlay').remove();

            await loadDocumentosList();
            if (typeof renderAtestadosAno === 'function') renderAtestadosAno();
            const faltasCont = document.getElementById('faltas-combined-container');
            if (faltasCont) renderFaltasTab(faltasCont);

            if (typeof showToast !== 'undefined') showToast('Falta transformada em atestado com sucesso!', 'success');
        } else {
            const err = await res.json().catch(() => ({}));
            alert('Erro: ' + (err.error || res.statusText));
            btn.innerHTML = oldHtml;
            btn.disabled = false;
        }
    } catch (e) {
        alert('Erro: ' + e.message);
        btn.innerHTML = oldHtml;
        btn.disabled = false;
    }
};

window.renderAtestadosTab = function (container, filteredDocs) {
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
        <div style="display:flex; border-bottom:2px solid #e2e8f0; margin-bottom:1.5rem; gap:1rem;">
            <button onclick="window.switchAtestadosSubTab('atestados')" id="subtab-atestados-btn" style="background:none; border:none; padding:0.75rem 1.5rem; font-weight:700; color:#0ea5e9; border-bottom:3px solid #0ea5e9; cursor:pointer; font-size:0.95rem; display:flex; align-items:center; gap:0.4rem; transition:all 0.2s;">
                <i class="ph ph-file-plus"></i> Atestados
            </button>
            <button onclick="window.switchAtestadosSubTab('faltas')" id="subtab-faltas-btn" style="background:none; border:none; padding:0.75rem 1.5rem; font-weight:600; color:#64748b; border-bottom:3px solid transparent; cursor:pointer; font-size:0.95rem; display:flex; align-items:center; gap:0.4rem; transition:all 0.2s;">
                <i class="ph ph-calendar-x"></i> Faltas
            </button>
        </div>

        <div id="subtab-atestados-content">
            <div class="card p-3 mb-4 bg-light" style="overflow: visible;">
                <div style="display:flex; gap:0.75rem; align-items:flex-end; flex-wrap:nowrap; width:100%;">
                    <!-- Ano -->
                    <div style="flex-shrink:0;">
                        <label style="font-size:0.75rem; font-weight:600; color:#2c5282; margin-bottom:3px; display:block;">Ano</label>
                        <select id="atestados_year" class="form-control" style="padding:0.4rem; width:80px;" onchange="renderAtestadosAno()">
                            ${optionsHtml}
                        </select>
                    </div>
                    
                    <!-- CID-10 ou Título (horas) -->
                    <div class="cid-input-group" id="cid-field-wrap" style="flex:2; min-width:150px; position:relative;">
                        <label style="font-size:0.75rem; font-weight:600; color:#2c5282; margin-bottom:3px; display:block;"><i class="ph ph-magnifying-glass"></i> CID-10</label>
                        <input type="text" id="cid-search" class="form-control" placeholder="J06 - Outros exames..." autocomplete="off" oninput="window.searchCID(this.value)" style="padding:.4rem;">
                        <div id="cid-dropdown" class="cid-dropdown" style="display:none;"></div>
                    </div>
                    <div id="titulo-field-wrap" style="flex:2; min-width:150px; display:none;">
                        <label style="font-size:0.75rem; font-weight:600; color:#2c5282; margin-bottom:3px; display:block;"><i class="ph ph-text-t"></i> Título do Atestado</label>
                        <input type="text" id="atestado-titulo-horas" class="form-control" placeholder="Ex: Consulta médica, Acompanhamento..." style="padding:.4rem;">
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
                    <div id="atestado-horas-fields" style="display:none; gap:1rem; flex-shrink:0; align-items:flex-end;">
                        <div>
                            <label style="font-size:0.75rem; font-weight:600; color:#2c5282; margin-bottom:3px; display:block;">Data do Atestado</label>
                            <input type="date" id="atestado_data_hora" class="form-control" style="padding:0.4rem; width:130px;">
                        </div>
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
        </div>
        
        <div id="subtab-faltas-content" style="display:none;">
            <div id="faltas-combined-container"></div>
        </div>
    `;

    renderAtestadosAno();
    renderFaltasTab(document.getElementById('faltas-combined-container'));
}

window.switchAtestadosSubTab = function (tab) {
    const btnAt = document.getElementById('subtab-atestados-btn');
    const btnFa = document.getElementById('subtab-faltas-btn');
    const contAt = document.getElementById('subtab-atestados-content');
    const contFa = document.getElementById('subtab-faltas-content');

    if (!btnAt || !btnFa || !contAt || !contFa) return;

    if (tab === 'atestados') {
        btnAt.style.color = '#0ea5e9'; btnAt.style.borderBottomColor = '#0ea5e9'; btnAt.style.fontWeight = '700';
        btnFa.style.color = '#64748b'; btnFa.style.borderBottomColor = 'transparent'; btnFa.style.fontWeight = '600';
        contAt.style.display = 'block';
        contFa.style.display = 'none';
    } else {
        btnFa.style.color = '#0ea5e9'; btnFa.style.borderBottomColor = '#0ea5e9'; btnFa.style.fontWeight = '700';
        btnAt.style.color = '#64748b'; btnAt.style.borderBottomColor = 'transparent'; btnAt.style.fontWeight = '600';
        contFa.style.display = 'block';
        contAt.style.display = 'none';
    }
}

let selectedCID = null;

window.searchCID = async function (val) {
    const dd = document.getElementById('cid-dropdown');
    if (!val || val.length < 2) { dd.style.display = 'none'; return; }
    try {
        const res = await fetch(`${API_URL}/cid10?q=${encodeURIComponent(val)}`, { headers: { 'Authorization': `Bearer ${currentToken}` } });
        const data = await res.json();
        if (!data.length) { dd.style.display = 'none'; return; }
        dd.innerHTML = data.map((c, i) =>
            `<div class="cid-option" data-code="${c.code}" data-desc="${c.desc.replace(/"/g, '&quot;')}" onclick="window.selectCID('${c.code}', this.dataset.desc)">
                <strong>${c.code}</strong> — ${c.desc}
             </div>`
        ).join('');
        dd.style.display = 'block';
    } catch (e) { 
        console.error('Erro na busca de CID:', e);
        alert('Erro ao buscar CID: ' + e.message);
        dd.style.display = 'none'; 
    }
}

window.selectCID = function (code, desc) {
    selectedCID = { code, desc };
    document.getElementById('cid-dropdown').style.display = 'none';
    document.getElementById('cid-search').value = `${code} — ${desc}`;

    const todayStr = new Date().toISOString().split('T')[0];
    document.getElementById('atestado_inicio_dia').value = todayStr;
    document.getElementById('atestado_qtd_dias').value = '1';
    calcAtestadoFim();
}

window.triggerAtestadoUpload = function () {
    const tipo = document.getElementById('atestado_tipo')?.value || 'dias';
    if (tipo === 'horas') {
        const titulo = document.getElementById('atestado-titulo-horas')?.value?.trim();
        if (!titulo) {
            alert('Digite o título do atestado de horas!');
            const s = document.getElementById('atestado-titulo-horas');
            if (s) { s.focus(); s.style.border = '2px solid red'; setTimeout(() => s.style.border = '', 2000); }
            return;
        }
    } else {
        // CID é opcional: aceita código válido OU título livre digitado no campo
        const cidText = document.getElementById('cid-search')?.value?.trim();
        if (!selectedCID && !cidText) {
            alert('Digite um CID ou um título para o atestado antes de anexar o arquivo.');
            const s = document.getElementById('cid-search');
            if (s) { s.focus(); s.style.border = '2px solid red'; setTimeout(() => s.style.border = '', 2000); }
            return;
        }
    }
    document.getElementById('cid-file-input').click();
}

window.toggleAtestadoPeriodFields = function () {
    const tipo = document.getElementById('atestado_tipo').value;
    const cidWrap = document.getElementById('cid-field-wrap');
    const tituloWrap = document.getElementById('titulo-field-wrap');
    if (tipo === 'dias') {
        document.getElementById('atestado-dias-fields').style.display = 'flex';
        document.getElementById('atestado-horas-fields').style.display = 'none';
        if (cidWrap) cidWrap.style.display = '';
        if (tituloWrap) tituloWrap.style.display = 'none';
    } else {
        document.getElementById('atestado-dias-fields').style.display = 'none';
        document.getElementById('atestado-horas-fields').style.display = 'flex';
        if (cidWrap) cidWrap.style.display = 'none';
        if (tituloWrap) tituloWrap.style.display = '';
    }
}

// Calcula data de término automaticamente
window.calcAtestadoFim = function () {
    const inicio = document.getElementById('atestado_inicio_dia')?.value;
    const qtd = parseInt(document.getElementById('atestado_qtd_dias')?.value, 10) || 1;
    const fimEl = document.getElementById('atestado_fim_dia');
    if (!fimEl) return;
    if (!inicio) { fimEl.value = ''; return; }
    const d = new Date(inicio + 'T12:00:00');
    d.setDate(d.getDate() + qtd - 1);
    fimEl.value = d.toISOString().split('T')[0];
};

window.uploadAtestadoWithCID = async function (inputEl) {
    const file = inputEl.files[0];
    if (!file) return;
    const tipo = document.getElementById('atestado_tipo')?.value || 'dias';
    
    // Na hora de fazer o upload, verifica se tem CID selecionado OU se tem texto livre
    if (tipo !== 'horas') {
        const cidText = document.getElementById('cid-search')?.value?.trim();
        if (!selectedCID && !cidText) return; 
    }
    if (!viewedColaborador) { alert('Colaborador não selecionado.'); return; }

    // Loading state
    const uploadBtn = document.getElementById('cid-upload-btn');
    const uploadIcon = document.getElementById('cid-upload-icon');
    if (uploadBtn) { uploadBtn.style.opacity = '0.7'; uploadBtn.style.pointerEvents = 'none'; }
    if (uploadIcon) uploadIcon.className = 'ph ph-spinner ph-spin';

    // Gerar nome no padrão Z01_DD-MM-AA_NomeColab
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const aa = String(today.getFullYear()).slice(2);
    const nomeColabNorm = (viewedColaborador.nome_completo || viewedColaborador.nome || 'COLAB')
        .toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Z0-9]+/g, '_');

    let customName, typeIn;
    if (tipo === 'horas') {
        const titulo = (document.getElementById('atestado-titulo-horas')?.value?.trim() || 'Atestado de Horas');
        const tituloNorm = titulo.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Z0-9]+/g, '_').substring(0, 30);
        customName = `HORAS_${tituloNorm}_${nomeColabNorm}_${dd}${mm}${aa}`;
        typeIn = titulo;
    } else {
        // CID válido selecionado OU texto livre digitado no campo
        const cidText = document.getElementById('cid-search')?.value?.trim() || 'Atestado';
        if (selectedCID) {
            customName = `${selectedCID.code}_${nomeColabNorm}_${dd}${mm}${aa}`;
            typeIn = `${selectedCID.code} - ${selectedCID.desc.substring(0, 60)}`;
        } else {
            const cidNorm = cidText.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Z0-9]+/g, '_').substring(0, 30);
            customName = `DIAS_${cidNorm}_${nomeColabNorm}_${dd}${mm}${aa}`;
            typeIn = cidText;
        }
    }

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
    formData.append('atestado_tipo', tipo);
    if (tipo === 'dias') {
        const inicioVal = document.getElementById('atestado_inicio_dia').value;
        const fimVal = document.getElementById('atestado_fim_dia').value;
        if (!inicioVal) { alert('Informe a Data de Início do atestado.'); return; }
        formData.append('atestado_inicio', inicioVal);
        formData.append('atestado_fim', fimVal || inicioVal);
    } else {
        // Horas: data do atestado + horários
        const dataHora = document.getElementById('atestado_data_hora')?.value || today.toISOString().split('T')[0];
        formData.append('atestado_data', dataHora);
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
            const fimSaved = formData.get('atestado_fim');
            selectedCID = null;

            if (window.faltaIdParaAtestado) {
                try {
                    await apiDelete(`/faltas/${window.faltaIdParaAtestado}`);
                    window.faltaIdParaAtestado = null;
                } catch (e) { console.error('Erro ao remover falta:', e); }
            }

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
            const faltasCont = document.getElementById('faltas-combined-container');
            if (faltasCont) renderFaltasTab(faltasCont);

        } else {
            const errData = await res.json().catch(() => ({}));
            alert('Erro ao enviar atestado: ' + (errData.error || res.statusText));
        }
    } catch (e) { alert('Erro: ' + e.message); } finally {
        if (uploadBtn) { uploadBtn.style.opacity = ''; uploadBtn.style.pointerEvents = ''; }
        if (uploadIcon) uploadIcon.className = 'ph ph-upload-simple';
    }
}

window.saveVencimento = async function (docId, inputId) {
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
    } catch (e) { alert('Erro: ' + e.message); }
};

window.enviarAtestadoContabilidade = async function (docId, emailInputId, btn) {
    const emailInput = document.getElementById(emailInputId);
    const email = emailInput ? emailInput.value.trim() : '';
    if (!email) { alert('Informe o e-mail da contabilidade.'); return; }

    // Suporte a múltiplos e-mails separados por ';'
    const emails = email.split(';').map(e => e.trim()).filter(e => e.length > 0);
    if (emails.length === 0) { alert('Informe ao menos um e-mail válido.'); return; }

    const originalHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Enviando...';

    try {
        // Envia para cada e-mail individualmente
        for (const dest of emails) {
            const res = await apiPost('/send-atestado-contabilidade', { document_id: docId, email_to: dest });
            if (!res || !res.sucesso) { throw new Error(res?.error || `Falha ao enviar para ${dest}`); }
        }

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
    } catch (e) {
        alert('Erro ao enviar: ' + e.message);
        btn.disabled = false;
        btn.innerHTML = originalHtml;
    }
};

window.enviarBoletoFinanceiro = async function (docId, emailInputId, btn) {
    const emailInput = document.getElementById(emailInputId);
    const email = emailInput ? emailInput.value.trim() : '';
    if (!email) { alert('Informe o e-mail do financeiro.'); return; }

    const originalHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Enviando...';

    try {
        const res = await apiPost('/send-boleto-financeiro', { document_id: docId, email_to: email, colaborador_id: viewedColaborador?.id });
        if (res && res.sucesso) {
            btn.innerHTML = '<i class="ph ph-check-circle"></i> Enviado!';
            btn.style.background = '#16a34a';
            if (viewedColaborador) {
                apiGet(`/colaboradores/${viewedColaborador.id}/documentos`).then(docs => {
                    if (docs) {
                        currentDocs = docs;
                        const activeTab = document.querySelector('#tabs-list li.active');
                        if (activeTab) {
                            renderTabContent(activeTab.dataset.tab, activeTab.textContent, true);
                        }
                    }
                }).catch(() => { });
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

window.enviarSuspensaoContabilidade = async function (docId, emailInputId, btn) {
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

window.renderAtestadosAno = function () {
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

window.renderPagamentosCompetencia = function () {
    const yEl = document.getElementById('pag_year');
    const mEl = document.getElementById('pag_month');
    const y = yEl ? yEl.value : '2026';
    const m = mEl ? mEl.value : '01';

    const subContainer = document.getElementById('pag_competencia_container');
    if (!subContainer) return;
    subContainer.innerHTML = '';

    // ── Slots mensais ──────────────────────────────────────────────────────────
    const docs = currentDocs.filter(d => d.tab_name === 'Pagamentos' && d.year == y && d.month == m);
    // doc tipo Pagamentos (holerite salvo via Docs. em Massa) — fica em primeiro, roxo
    const docPagamentos = docs.find(x => x.document_type === 'Pagamentos');
    const slotPag = createDocSlot('Pagamentos', 'Pagamentos', docPagamentos, `'${y}'`, `'${m}'`);
    // Estilo roxo para o cartão Pagamentos
    slotPag.style.cssText = 'border-left: 4px solid #a21caf; background: linear-gradient(to right, #fdf4ff, #fff);';
    subContainer.appendChild(slotPag);



    // ── Seção sazonal: Férias (por ano, sem vínculo de mês) ───────────────────
    const feriasDoAno = currentDocs.filter(d => d.tab_name === 'Pagamentos' && d.document_type === 'Férias' && d.year == y);

    const secFerias = document.createElement('div');
    secFerias.style.cssText = 'margin-top:1.5rem; border-top:2px dashed #bfdbfe; padding-top:1.25rem;';
    secFerias.innerHTML = `
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:1rem; flex-wrap:wrap; gap:0.75rem;">
            <h5 style="margin:0; color:#1e40af; display:flex; align-items:center; gap:0.5rem;">
                <i class="ph ph-sun-horizon" style="font-size:1.2rem;"></i> Férias <span style="font-size:0.8rem; font-weight:400; color:#64748b; margin-left:4px;">(${y} — sazonal)</span>
            </h5>
            <div style="display:flex; align-items:center; gap:1rem; flex-wrap:wrap;">
                <div style="display:flex; align-items:center; gap:8px; font-size:0.82rem;">
                    <span style="font-weight:600;color:#64748b;">Exige Assinatura?</span>
                    <label style="display:flex;align-items:center;gap:3px;cursor:pointer;margin:0;font-weight:500;">
                        <input type="radio" name="ferias-assin-${y}" value="PENDENTE" checked> Sim
                    </label>
                    <label style="display:flex;align-items:center;gap:3px;cursor:pointer;margin:0;font-weight:500;">
                        <input type="radio" name="ferias-assin-${y}" value="NAO_EXIGE"> Não
                    </label>
                </div>
                <label style="display:inline-flex; align-items:center; gap:6px; cursor:pointer; background:#1e40af; color:#fff; border-radius:8px; padding:6px 14px; font-size:0.85rem; font-weight:600; transition:background 0.2s;"
                       onmouseover="this.style.background='#1d4ed8'" onmouseout="this.style.background='#1e40af'">
                    <i class="ph ph-upload-simple"></i> Adicionar Férias
                    <input type="file" accept=".pdf" style="display:none;"
                        onchange="const r=this.closest('div').querySelector('input[name^=ferias-assin-]:checked'); window.uploadDocument(this, 'Pagamentos', 'Férias', '${y}', null, null, r ? r.value : 'PENDENTE')">
                </label>
            </div>
        </div>
        <div id="ferias-slots-${y}" style="display:flex; flex-wrap:wrap; gap:0.75rem;">
            ${feriasDoAno.length === 0
                ? `<p style="color:#94a3b8; font-size:0.85rem; margin:0;">Nenhum documento de férias cadastrado para ${y}. Clique em "Adicionar Férias" para inserir.</p>`
                : feriasDoAno.map(d => `
                    <div style="background:#eff6ff; border:1px solid #bfdbfe; border-radius:10px; padding:0.75rem 1rem; display:flex; align-items:center; gap:0.75rem; min-width:220px;">
                        <i class="ph ph-file-pdf" style="color:#1e40af; font-size:1.4rem;"></i>
                        <div style="flex:1; min-width:0;">
                            <div style="font-weight:600; font-size:0.85rem; color:#1e3a8a; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${d.file_name || 'Férias'}">Férias ${y}</div>
                            <div style="font-size:0.75rem; color:#64748b;">${d.file_name || ''}</div>
                        </div>
                        <div style="display:flex; gap:4px;">
                            <button onclick="viewDoc(${d.id})" title="Visualizar" style="background:#dbeafe; color:#1e40af; border:none; border-radius:6px; padding:4px 8px; cursor:pointer;">
                                <i class="ph ph-eye"></i>
                            </button>
                            <button onclick="deleteDoc(${d.id})" title="Excluir" style="background:#fee2e2; color:#dc2626; border:none; border-radius:6px; padding:4px 8px; cursor:pointer;">
                                <i class="ph ph-trash"></i>
                            </button>
                        </div>
                    </div>`).join('')
            }
        </div>
    `;
    subContainer.appendChild(secFerias);

    // ── Seção Outros (documentos avulsos do mês) ──────────────────────────────────────────
    const outrosDocs = currentDocs.filter(d => d.tab_name === 'Pagamentos' && d.document_type === 'Outros' && d.year == y && d.month == m);

    const secOutros = document.createElement('div');
    secOutros.style.cssText = 'margin-top:1.5rem; border-top:2px dashed #e2e8f0; padding-top:1.25rem;';
    secOutros.innerHTML = `
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:1rem; flex-wrap:wrap; gap:0.75rem;">
            <h5 style="margin:0; color:#475569; display:flex; align-items:center; gap:0.5rem;">
                <i class="ph ph-folder-open" style="font-size:1.2rem;"></i> Outros <span style="font-size:0.8rem; font-weight:400; color:#94a3b8; margin-left:4px;">(documentos avulsos do mês)</span>
            </h5>
            <div style="display:flex; align-items:center; gap:1rem; flex-wrap:wrap;">
                <div style="display:flex; align-items:center; gap:8px; font-size:0.82rem;">
                    <span style="font-weight:600;color:#64748b;">Exige Assinatura?</span>
                    <label style="display:flex;align-items:center;gap:3px;cursor:pointer;margin:0;font-weight:500;">
                        <input type="radio" name="outros-assin-${y}-${m}" value="PENDENTE" checked> Sim
                    </label>
                    <label style="display:flex;align-items:center;gap:3px;cursor:pointer;margin:0;font-weight:500;">
                        <input type="radio" name="outros-assin-${y}-${m}" value="NAO_EXIGE"> Não
                    </label>
                </div>
                <label style="display:inline-flex; align-items:center; gap:6px; cursor:pointer; background:#475569; color:#fff; border-radius:8px; padding:6px 14px; font-size:0.85rem; font-weight:600; transition:background 0.2s;"
                       onmouseover="this.style.background='#334155'" onmouseout="this.style.background='#475569'">
                    <i class="ph ph-upload-simple"></i> Adicionar Outro
                    <input type="file" accept=".pdf" style="display:none;"
                        onchange="const r=this.closest('div').querySelector('input[name^=outros-assin-]:checked'); window.uploadDocument(this, 'Pagamentos', 'Outros', '${y}', '${m}', null, r ? r.value : 'PENDENTE')">
                </label>
            </div>
        </div>

        <div style="display:flex; flex-wrap:wrap; gap:0.75rem;">
            ${outrosDocs.length === 0
                ? `<p style="color:#94a3b8; font-size:0.85rem; margin:0;">Nenhum documento avulso para este mês.</p>`
                : outrosDocs.map(d => `
                    <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:0.75rem 1rem; display:flex; align-items:center; gap:0.75rem; min-width:220px;">
                        <i class="ph ph-file-text" style="color:#64748b; font-size:1.4rem;"></i>
                        <div style="flex:1; min-width:0;">
                            <div style="font-weight:600; font-size:0.85rem; color:#374151; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${d.file_name || 'Outros'}">Outros</div>
                            <div style="font-size:0.75rem; color:#64748b;">${d.file_name || ''}</div>
                        </div>
                        <div style="display:flex; gap:4px;">
                            <button onclick="viewDoc(${d.id})" title="Visualizar" style="background:#e2e8f0; color:#475569; border:none; border-radius:6px; padding:4px 8px; cursor:pointer;">
                                <i class="ph ph-eye"></i>
                            </button>
                            <button onclick="deleteDoc(${d.id})" title="Excluir" style="background:#fee2e2; color:#dc2626; border:none; border-radius:6px; padding:4px 8px; cursor:pointer;">
                                <i class="ph ph-trash"></i>
                            </button>
                        </div>
                    </div>`).join('')
            }
        </div>
    `;
    subContainer.appendChild(secOutros);
};

window.uploadDocument = async function (inputEl, tabId, docType, year = null, month = null, vencimento = null, reqAssin = null) {
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

    if (cleanYear && cleanYear !== 'null' && cleanYear !== 'undefined') formData.append('year', cleanYear);
    if (cleanMonth && cleanMonth !== 'null' && cleanMonth !== 'undefined') formData.append('month', cleanMonth);
    if (vencimento) formData.append('vencimento', vencimento);
    if (reqAssin) formData.append('assinafy_status', reqAssin);
    formData.append('file', file);

    try {
        const res = await fetch(`${API_URL}/documentos`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${currentToken}` },
            body: formData
        });
        if (res.ok) {
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
                    if (activeTab) renderTabContent(activeTab.dataset.tab, activeTab.textContent, true);
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
    } catch (e) {
        if (labelBtn) {
            labelBtn.innerHTML = originalLabelHtml;
            labelBtn.style.pointerEvents = '';
            labelBtn.style.opacity = '';
        }
        console.error(e);
    }
}

window.uploadDynamicDocument = function (inputEl, tabId) {
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

window.deleteDoc = async function (docId, btnEl) {
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
        if (res.ok) {
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
    } catch (e) {
        // Reverter em caso de falha de rede
        if (docCard) {
            docCard.style.opacity = '1';
            docCard.style.pointerEvents = 'auto';
        }
        console.error(e);
    }
}

window.abrirArquivoOneDrive = function (path) {
    if (!path) return alert('Caminho do arquivo não fornecido.');
    const token = localStorage.getItem('erp_token');
    window.open(`${API_URL}/onedrive/download?path=${encodeURIComponent(path)}&token=${token}`, '_blank');
};

window.viewDoc = async function (docId) {
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
    } catch (e) {
        alert('Erro ao abrir documento: ' + e.message);
    }
}
window.viewAssinado = async function (docId) {
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
    } catch (e) {
        document.body.style.cursor = 'default';
        alert('Erro ao abrir o PDF assinado: ' + e.message);
    }
};

window.downloadAssinado = async function (docId) {
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
    } catch (e) {
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
        const today = new Date().toISOString().split('T')[0];

        // 1º período
        const ini1 = c.ferias_programadas_inicio;
        const fim1 = c.ferias_programadas_fim;
        const em1 = ini1 && fim1 && today >= ini1 && today <= fim1;

        // 2º período (apenas quando fracionada = Sim + tirada)
        const ini2 = (c.ferias_fracionadas === 'Sim' && c.ferias_fracionadas_tipo === 'Tirada')
            ? c.ferias_fracionadas_inicio2 : null;
        const fim2 = (c.ferias_fracionadas === 'Sim' && c.ferias_fracionadas_tipo === 'Tirada')
            ? c.ferias_fracionadas_fim2 : null;
        const em2 = ini2 && fim2 && today >= ini2 && today <= fim2;

        if (em1 || em2) return 'Férias';

        // Voltou de férias: apenas retorna Ativo se hoje é posterior ao fim de TODOS os períodos válidos
        if (status === 'Férias') {
            const ultimoFim = [fim1, fim2].filter(Boolean).sort().pop();
            if (ultimoFim && today > ultimoFim) return 'Ativo';
        }
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

window.previewFoto = function (input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function (e) {
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

window.checkQuickDocsState = function () {
    const idEl = document.getElementById('colab-id');
    const id = idEl ? idEl.value : '';
    const btnHeader = document.getElementById('btn-header-prontuario');

    if (id) {
        if (btnHeader) btnHeader.style.display = 'inline-flex';
    } else {
        if (btnHeader) btnHeader.style.display = 'none';
    }
};

// CPF Masking
window.mascaraCPF = function (el) {
    let v = el.value.replace(/\D/g, "");
    if (v.length > 11) v = v.substring(0, 11);
    v = v.replace(/(\d{3})(\d)/, "$1.$2");
    v = v.replace(/(\d{3})(\d)/, "$1.$2");
    v = v.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    el.value = v;

    // Sincronizar com RG se for CIN
    if (el.id === 'colab-cpf' && document.getElementById('colab-rg-tipo') && document.getElementById('colab-rg-tipo').value === 'CIN') {
        const rgEl = document.getElementById('colab-rg');
        if (rgEl) rgEl.value = v;
    }
};

// RG Masking
window.mascaraRG = function (el) {
    let raw = el.value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
    
    if (raw.length <= 9) {
        let v = raw;
        if (v.length > 2) v = v.substring(0, 2) + '.' + v.substring(2);
        if (v.length > 6) v = v.substring(0, 6) + '.' + v.substring(6);
        if (v.length > 10) v = v.substring(0, 10) + '-' + v.substring(10);
        el.value = v;
    } else {
        // Para RGs maiores que 9 dígitos, permite formato livre mantendo a pontuação original digitada
        el.value = el.value.toUpperCase().replace(/[^A-Z0-9.-]/g, "").substring(0, 20);
    }
};

window.toggleTipoDocumento = function () {
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




window.mascaraPIS = function (el) {
    let v = el.value.replace(/\D/g, "");
    if (v.length > 11) v = v.substring(0, 11);
    v = v.replace(/^(\d{3})(\d)/, "$1.$2");
    v = v.replace(/^(\d{3})\.(\d{5})(\d)/, "$1.$2.$3");
    v = v.replace(/^(\d{3})\.(\d{5})\.(\d{2})(\d)/, "$1.$2.$3-$4");
    el.value = v;
};

window.mascaraTitulo = function (el) {
    let v = el.value.replace(/\D/g, "");
    if (v.length > 12) v = v.substring(0, 12);
    v = v.replace(/(\d{4})(\d)/, "$1 $2");
    v = v.replace(/(\d{4}) (\d{4})(\d)/, "$1 $2 $3");
    el.value = v;
};

window.mascaraApenasNumeros = function (el) {
    el.value = el.value.replace(/\D/g, "");
};

window.mascaraMilitar = window.mascaraApenasNumeros;

window.toggleCertificadoMilitar = function (sexo) {
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
window.validarCPFCampo = function (el) {
    const v = el.value.replace(/\D/g, "");
    const errorMsg = document.getElementById(el.id === 'colab-cpf' ? 'cpf-error' : '');
    if (v.length > 0 && v.length < 11) {
        el.classList.add('is-invalid');
        if (errorMsg) errorMsg.style.display = 'inline';
    } else {
        el.classList.remove('is-invalid');
        if (errorMsg) errorMsg.style.display = 'none';
    }
};

window.toggleConjuge = function () {
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

window.toggleMotorista = function () {
    const cargoSelect = document.getElementById('colab-cargo');
    const section = document.getElementById('section-cnh');

    if (cargoSelect && cargoSelect.value.toUpperCase().includes('MOTORISTA')) {
        if (section) section.style.display = 'block';
    } else if (section) {
        section.style.display = 'none';
        // NEVER auto-clear CNH fields — user must edit them manually
    }
};





// FORMATADORES E HELPERS
function formatStringGlobal(str) {
    if (!str) return "SEM_NOME";
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/[^A-Z0-9 ]/g, "").trim().replace(/\s+/g, "_");
}

window.mascaraCNH = function (el) {
    let v = el.value.replace(/\D/g, "");
    if (v.length > 11) v = v.substring(0, 11);
    el.value = v;
};

window.mascaraTelefone = function (i) {

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

window.mascaraMoeda = function (i) {
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
        today.setHours(12, 0, 0, 0);

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
    } catch (e) { console.error('Erro ao calcular período de experiência:', e); }
}

// --- CBO LOOKUP ---
window.buscarCBO = async function (q) {
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
    } catch (e) { console.error('Erro ao buscar CBO:', e); }
};

window.selecionarCBO = function (code, desc) {
    const codeEl = document.getElementById('colab-cbo-codigo');
    const descEl = document.getElementById('colab-cbo');
    const dropdown = document.getElementById('cbo-dropdown');

    if (codeEl) codeEl.value = code;
    if (descEl) descEl.value = desc;
    if (dropdown) dropdown.style.display = 'none';
};

// --- GESTÃO DE FACULDADE ---
window.loadFaculdadeCursos = async function () {
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

window.calcSemestresFaculdade = function (val) {
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

window.resetFaculdadeForm = function () {
    document.getElementById('form-faculdade').reset();
    document.getElementById('faculdade-id').value = '';
    document.getElementById('faculdade-form-title').textContent = 'Cadastrar Novo Curso';
    const semestresInput = document.getElementById('faculdade-semestres');
    if (semestresInput) semestresInput.value = '';
};

window.editFaculdadeCurso = function (c) {
    document.getElementById('faculdade-id').value = c.id;
    document.getElementById('faculdade-nome-curso').value = c.nome_curso;
    document.getElementById('faculdade-instituicao').value = c.instituicao;
    document.getElementById('faculdade-tempo').value = c.tempo_curso || '';
    window.calcSemestresFaculdade(c.tempo_curso);
    document.getElementById('faculdade-form-title').textContent = 'Editar Curso';
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.deleteFaculdadeCurso = async function (id) {
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

window.loadGeradores = async function () {
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
        const admSet = new Set((templAdm || []).map(t => Number(t.gerador_id)));
        const outSet = new Set((templOut || []).map(t => Number(t.gerador_id)));
        const templateMap = {};
        geradores.forEach(g => {
            const inAdm = admSet.has(Number(g.id));
            const inOut = outSet.has(Number(g.id));
            if (inAdm && inOut) templateMap[g.id] = 'ambos';
            else if (inAdm) templateMap[g.id] = 'admissao';
            else if (inOut) templateMap[g.id] = 'contratos';
            else templateMap[g.id] = 'nenhum';
        });

        window.allGeradores = geradores;
        window._templateMap = templateMap;
        window.renderGeradoresList(geradores);
        window.renderRecibosGeradoresSection();
    } catch (e) { console.error(e); }
};

// ─── Seção de Recibos de Benefícios nos Geradores ─────────────────────────────
window.renderRecibosGeradoresSection = function () {
    const sec = document.getElementById('recibos-geradores-section');
    if (sec) sec.style.display = 'none';
    return;

    sec.innerHTML = `
    <div style="margin-bottom:1.5rem;">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:.85rem;">
        <div style="width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg,#1e3a5f,#2563eb);display:flex;align-items:center;justify-content:center;">
          <i class="ph ph-receipt" style="color:#fff;font-size:1.1rem;"></i>
        </div>
        <div>
          <div style="font-size:.95rem;font-weight:700;color:#1e293b;">Recibos de Benefícios</div>
          <div style="font-size:.78rem;color:#64748b;">Geração individual de recibo por colaborador</div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:.85rem;">

        <!-- VR -->
        <div style="border:1.5px solid #bbf7d0;border-radius:12px;padding:1rem 1.1rem;background:#f0fdf4;display:flex;flex-direction:column;gap:.6rem;">
          <div style="display:flex;align-items:center;gap:8px;">
            <div style="width:34px;height:34px;border-radius:8px;background:#059669;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
              <i class="ph ph-fork-knife" style="color:#fff;font-size:1rem;"></i>
            </div>
            <div>
              <div style="font-weight:700;color:#065f46;font-size:.92rem;">Vale Refeição</div>
              <div style="font-size:.74rem;color:#059669;">Para todos os colaboradores</div>
            </div>
          </div>
          <button onclick="window.abrirModalReciboIndividual('VR')"
            style="width:100%;padding:.45rem;background:#059669;color:#fff;border:none;border-radius:8px;font-size:.85rem;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;">
            <i class="ph ph-file-arrow-down"></i> Gerar Recibo VR
          </button>
        </div>

        <!-- VT -->
        <div style="border:1.5px solid #bfdbfe;border-radius:12px;padding:1rem 1.1rem;background:#eff6ff;display:flex;flex-direction:column;gap:.6rem;">
          <div style="display:flex;align-items:center;gap:8px;">
            <div style="width:34px;height:34px;border-radius:8px;background:#2563eb;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
              <i class="ph ph-bus" style="color:#fff;font-size:1rem;"></i>
            </div>
            <div>
              <div style="font-weight:700;color:#1e40af;font-size:.92rem;">Vale Transporte</div>
              <div style="font-size:.74rem;color:#2563eb;">Meio: VT (bilhete único)</div>
            </div>
          </div>
          <button onclick="window.abrirModalReciboIndividual('VT')"
            style="width:100%;padding:.45rem;background:#2563eb;color:#fff;border:none;border-radius:8px;font-size:.85rem;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;">
            <i class="ph ph-file-arrow-down"></i> Gerar Recibo VT
          </button>
        </div>

        <!-- VC -->
        <div style="border:1.5px solid #fed7aa;border-radius:12px;padding:1rem 1.1rem;background:#fff7ed;display:flex;flex-direction:column;gap:.6rem;">
          <div style="display:flex;align-items:center;gap:8px;">
            <div style="width:34px;height:34px;border-radius:8px;background:#d97706;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
              <i class="ph ph-gas-pump" style="color:#fff;font-size:1rem;"></i>
            </div>
            <div>
              <div style="font-weight:700;color:#92400e;font-size:.92rem;">Vale Combustível</div>
              <div style="font-size:.74rem;color:#d97706;">Meio: VC (combustível)</div>
            </div>
          </div>
          <button onclick="window.abrirModalReciboIndividual('VC')"
            style="width:100%;padding:.45rem;background:#d97706;color:#fff;border:none;border-radius:8px;font-size:.85rem;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;">
            <i class="ph ph-file-arrow-down"></i> Gerar Recibo VC
          </button>
        </div>

      </div>
    </div>
    <hr style="border:none;border-top:1.5px solid #e2e8f0;margin-bottom:1.25rem;">`;

    // Modal de geração individual (cria uma vez)
    if (!document.getElementById('modal-recibo-individual')) {
        const modal = document.createElement('div');
        modal.id = 'modal-recibo-individual';
        modal.style.cssText = 'display:none;position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;align-items:center;justify-content:center;';
        modal.innerHTML = `
        <div style="background:#fff;border-radius:16px;padding:1.75rem 2rem;width:420px;max-width:96vw;box-shadow:0 20px 60px rgba(0,0,0,.2);">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.25rem;">
            <div>
              <div id="mri-titulo" style="font-size:1.05rem;font-weight:700;color:#1e293b;">Gerar Recibo</div>
              <div id="mri-subtitulo" style="font-size:.8rem;color:#64748b;"></div>
            </div>
            <button onclick="document.getElementById('modal-recibo-individual').style.display='none'"
              style="background:none;border:none;font-size:1.4rem;color:#94a3b8;cursor:pointer;line-height:1;">×</button>
          </div>

          <div style="display:flex;flex-direction:column;gap:1rem;">
            <div>
              <label style="font-size:.8rem;font-weight:600;color:#475569;display:block;margin-bottom:.3rem;">Colaborador</label>
              <input type="text" id="mri-colab-busca" placeholder="Digite o nome do colaborador..."
                style="width:100%;padding:.55rem .75rem;border:1.5px solid #e2e8f0;border-radius:8px;font-size:.92rem;box-sizing:border-box;"
                oninput="window._mriSearch(this.value)">
              <div id="mri-lista" style="border:1.5px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px;max-height:160px;overflow-y:auto;display:none;"></div>
              <input type="hidden" id="mri-colab-id">
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:.75rem;">
              <div>
                <label style="font-size:.8rem;font-weight:600;color:#475569;display:block;margin-bottom:.3rem;">Mês</label>
                <select id="mri-mes" style="width:100%;padding:.52rem .65rem;border:1.5px solid #e2e8f0;border-radius:8px;font-size:.9rem;background:#fff;">
                  ${MESES.map((m,i)=>`<option value="${i+1}" ${i+1===mesAt?'selected':''}>${m}</option>`).join('')}
                </select>
              </div>
              <div>
                <label style="font-size:.8rem;font-weight:600;color:#475569;display:block;margin-bottom:.3rem;">Ano</label>
                <select id="mri-ano" style="width:100%;padding:.52rem .65rem;border:1.5px solid #e2e8f0;border-radius:8px;font-size:.9rem;background:#fff;">
                  ${[anoAt-1,anoAt,anoAt+1].map(a=>`<option value="${a}" ${a===anoAt?'selected':''}>${a}</option>`).join('')}
                </select>
              </div>
            </div>

            <div>
              <label style="font-size:.8rem;font-weight:600;color:#475569;display:block;margin-bottom:.3rem;">
                Valor VR por dia (R$) <span style="font-weight:400;color:#94a3b8;">— apenas para VR</span>
              </label>
              <input type="number" id="mri-valor-vr" value="35.00" min="0" step="0.01"
                style="width:130px;padding:.52rem .65rem;border:1.5px solid #e2e8f0;border-radius:8px;font-size:.95rem;font-weight:700;color:#059669;">
            </div>

            <div style="display:flex;gap:.75rem;justify-content:flex-end;margin-top:.25rem;">
              <button onclick="document.getElementById('modal-recibo-individual').style.display='none'"
                style="padding:.55rem 1.2rem;border:1.5px solid #e2e8f0;background:#fff;border-radius:8px;font-size:.9rem;cursor:pointer;color:#475569;font-weight:600;">
                Cancelar
              </button>
              <button onclick="window._mriGerar()"
                style="padding:.55rem 1.4rem;background:linear-gradient(135deg,#1e3a5f,#2563eb);color:#fff;border:none;border-radius:8px;font-size:.9rem;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:6px;">
                <i class="ph ph-printer"></i> Gerar PDF
              </button>
            </div>
          </div>
        </div>`;
        document.body.appendChild(modal);
    }
};

// ─── Abrir modal de recibo individual ─────────────────────────────────────────
window.abrirModalReciboIndividual = function (tipo) {
    const modal = document.getElementById('modal-recibo-individual');
    if (!modal) return;
    const nomes = { VR: 'Vale Refeição', VT: 'Vale Transporte', VC: 'Vale Combustível' };
    const cores = { VR: '#059669', VT: '#2563eb', VC: '#d97706' };
    document.getElementById('mri-titulo').textContent = `Gerar Recibo de ${nomes[tipo]}`;
    document.getElementById('mri-subtitulo').textContent = `Selecione o colaborador e o período de referência.`;
    document.getElementById('mri-titulo').style.color = cores[tipo];
    document.getElementById('mri-colab-busca').value = '';
    document.getElementById('mri-colab-id').value = '';
    document.getElementById('mri-lista').style.display = 'none';
    modal.dataset.tipo = tipo;
    modal.style.display = 'flex';
};

// ─── Busca inline de colaborador no modal ─────────────────────────────────────
window._mriSearch = function (q) {
    const lista = document.getElementById('mri-lista');
    if (!lista) return;
    const colabs = window._recibosAllColabs || window.allColaboradores || [];
    const res = colabs.filter(c => (c.nome || '').toLowerCase().includes((q || '').toLowerCase())).slice(0, 8);
    if (!res.length || !q) { lista.style.display = 'none'; return; }
    lista.style.display = 'block';
    lista.innerHTML = res.map(c => `
        <div onclick="window._mriSelectColab(${c.id},'${(c.nome||'').replace(/'/g,'\\\'')}')"
            style="padding:.5rem .75rem;cursor:pointer;font-size:.88rem;color:#1e293b;border-bottom:1px solid #f1f5f9;"
            onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='#fff'">
          <strong>${c.nome}</strong>
          <span style="font-size:.75rem;color:#94a3b8;margin-left:8px;">${c.cargo || ''} · ${c.departamento || ''}</span>
        </div>`).join('');
};

window._mriSelectColab = function (id, nome) {
    document.getElementById('mri-colab-id').value = id;
    document.getElementById('mri-colab-busca').value = nome;
    document.getElementById('mri-lista').style.display = 'none';
};

// ─── Gerar recibo individual pelo modal ───────────────────────────────────────
window._mriGerar = function () {
    const modal    = document.getElementById('modal-recibo-individual');
    const tipo     = modal?.dataset.tipo || 'VR';
    const colabId  = document.getElementById('mri-colab-id')?.value;
    const mes      = parseInt(document.getElementById('mri-mes')?.value);
    const ano      = parseInt(document.getElementById('mri-ano')?.value);
    const valorVR  = parseFloat(document.getElementById('mri-valor-vr')?.value) || 35.00;

    if (!colabId) {
        if (typeof Swal !== 'undefined') Swal.fire('Atenção', 'Selecione um colaborador.', 'warning');
        else alert('Selecione um colaborador.'); return;
    }
    modal.style.display = 'none';
    if (typeof window.gerarReciboIndividual === 'function') {
        window.gerarReciboIndividual(tipo, colabId, mes, ano, valorVR);
    } else {
        // fallback: navegar para a tela de recibos
        if (typeof window.navigateTo === 'function') window.navigateTo('recibos');
    }
};

window.renderGeradoresList = function (items) {
    const tbody = document.getElementById('table-geradores-body');
    if (!tbody) return;

    const templateMap = window._templateMap || {};

    // Labels e styles por tipo de template
    const TEMPLATE_LABELS = {
        admissao: { label: 'Admissão', bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
        contratos: { label: 'Contratos', bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
        ambos: { label: 'Ambos', bg: '#fdf4ff', color: '#c026d3', border: '#f0abfc' },
        nenhum: { label: '—', bg: '#f8fafc', color: '#94a3b8', border: '#e2e8f0' },
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
        const tmpl = templateMap[g.id] || 'nenhum';
        const lbl = TEMPLATE_LABELS[tmpl] || TEMPLATE_LABELS.nenhum;
        const badge = `<span style="background:${lbl.bg};color:${lbl.color};border:1px solid ${lbl.border};border-radius:20px;padding:2px 10px;font-size:0.75rem;font-weight:700;">${lbl.label}</span>`;
        const prot = isProtected(g.nome);
        return `
        <tr data-template="${tmpl}">
            <td>
                <div style="font-weight:600; color:var(--primary-color);">${g.nome}</div>
            </td>
            <td>${g.created_at ? new Date(g.created_at).toLocaleDateString('pt-BR') : '-'}</td>
            <td style="text-align:right;">
                <div style="display:flex; gap:0.5rem; justify-content:flex-end;">
                    <button class="btn btn-primary btn-sm" onclick="window.abrirModalSelecaoColab(${g.id})" title="Visualizar"><i class="ph ph-eye"></i></button>
                    <button class="btn btn-warning btn-sm" onclick="window.editGerador(${g.id})" title="Editar"><i class="ph ph-pencil-simple"></i></button>
                </div>
            </td>
        </tr>`;
    }).join('');
};

window.filterGeradores = function () {
    const q = (document.getElementById('search-geradores')?.value || '').toLowerCase();
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
window.switchGeradoresTab = function (tab) {
    const tabGerador = document.getElementById('geradores-tab-gerador');
    const tabTemplates = document.getElementById('geradores-tab-templates');
    const tabOutros = document.getElementById('geradores-tab-outros-contratos');
    const btnGerador = document.getElementById('tab-btn-gerador');
    const btnTemplates = document.getElementById('tab-btn-templates');
    const btnOutros = document.getElementById('tab-btn-outros-contratos');
    const headerActions = document.getElementById('geradores-header-actions');

    const tabs = { gerador: tabGerador, templates: tabTemplates, 'outros-contratos': tabOutros };
    const btns = { gerador: btnGerador, templates: btnTemplates, 'outros-contratos': btnOutros };

    Object.keys(tabs).forEach(k => {
        if (tabs[k]) tabs[k].style.display = k === tab ? 'block' : 'none';
        if (btns[k]) {
            btns[k].style.background = k === tab ? '#f503c5' : '#f1f5f9';
            btns[k].style.color = k === tab ? '#fff' : '#64748b';
            btns[k].style.border = k === tab ? '1.5px solid #f503c5' : '1.5px solid #e2e8f0';
        }
    });

    if (headerActions) headerActions.style.display = 'flex';

    const searchInput = document.getElementById('search-geradores');
    if (searchInput) { searchInput.value = ''; window.filterGeradores(); }

    if (tab === 'templates') window.loadGeradoresTemplates();
    if (tab === 'outros-contratos') window.loadGeradoresOutrosContratos();
};

window.loadGeradoresTemplates = async function () {
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
    } catch (e) {
        container.innerHTML = `<div class="card p-4" style="color:#e53e3e;">Erro ao carregar dados: ${e.message}</div>`;
    }
};

window.renderGeradoresTemplates = function (departamentos, geradores, templates) {
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

window.updateLocalDocCount = function (docId) {
    const chks = document.querySelectorAll(`.gerador-dept-chk[data-gerador="${docId}"]`);
    const count = Array.from(chks).filter(c => c.checked).length;
    const badge = document.getElementById(`doc-count-${docId}`);
    if (badge) badge.textContent = `${count} Setores`;
};

window.selecionarTodosSetores = function (docId) {
    const chks = document.querySelectorAll(`.gerador-dept-chk[data-gerador="${docId}"]`);
    const anyUnchecked = Array.from(chks).some(c => !c.checked);
    chks.forEach(c => { c.checked = anyUnchecked; });
    window.updateLocalDocCount(docId);
};

window.saveBatchGeradorDeptTemplates = async function (tipo) {
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
    } catch (e) {
        alert('Erro ao salvar templates: ' + e.message);
        event.currentTarget.disabled = false;
    }
};

// === TEMPLATE DE OUTROS CONTRATOS ===

window.loadGeradoresOutrosContratos = async function () {
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
    } catch (e) {
        container.innerHTML = `<div class="card p-4" style="color:#e53e3e;">Erro ao carregar dados: ${e.message}</div>`;
    }
};

window.renderGeradoresOutrosContratos = function (departamentos, geradores, templates) {
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
                        <button type="button" onclick="event.stopPropagation(); window.selecionarTodosSetoresOutros(${g.id})" style="font-size:0.72rem;padding:0.25em 0.65em;border:1px solid #cbd5e1;border-radius:6px;background:#f8fafc;cursor:pointer;color:#475569;font-weight:600;">Todos</button>
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

window.updateOutrosDocCount = function (docId) {
    const chks = document.querySelectorAll(`.gerador-outros-chk[data-gerador="${docId}"]`);
    const count = Array.from(chks).filter(c => c.checked).length;
    const badge = document.getElementById(`outros-count-${docId}`);
    if (badge) badge.textContent = `${count} Setores`;
};

window.selecionarTodosSetoresOutros = function (docId) {
    const chks = document.querySelectorAll(`.gerador-outros-chk[data-gerador="${docId}"]`);
    const anyUnchecked = Array.from(chks).some(c => !c.checked);
    chks.forEach(c => { c.checked = anyUnchecked; });
    window.updateOutrosDocCount(docId);
};



async function seedInitialGeradores() {
    const templates = [
        {
            nome: "NR1",
            conteudo: `
<p style="text-align: center; font-weight: bold; font-size: 1.2rem; margin-bottom: 2rem;">ORDEM DE SERVIÇO - NR1</p>

<p style="font-weight: bold; text-decoration: underline;">DESCRIÇÃO DA ATIVIDADE</p>
<p style="text-transform: uppercase;">FAZER SUCÇÃO COM EQUIPAMENTOS APROPRIADOS DOS DEJETOS DOS BANHEIROS, REPOR OS DESODORANTES, EFETUAR LAVAGEM E SECAGEM DOS MESMOS E EFETUAR A CARGA E DESCARGA DOS BANHEIROS QUÍMICOS NOS CAMINHÕES E NOS LOCAIS DEFINIDOS PELO SEU SUPERIOR IMEDIATO, NORMAS E PROCEDIMENTOS INTERNOS.</p>

<p style="font-weight: bold; text-decoration: underline; margin-top: 1.5rem;">IDENTIFICAÇÃO DOS RISCOS AMBIENTAIS</p>
<p style="font-weight: bold;">RISCOS / FONTES GERADORAS</p>
<ul style="list-style-type: none; padding-left: 0; margin-top: 0.5rem; line-height: 1.6;">
    <li><b>Físicos:</b> Ruído peculiar a ambientes externos e umidade da lavagem dos sanitários.</li>
    <li><b>Químicos:</b> Produtos saneantes: desinfetantes, bactericida e desodorização sanitária.</li>
    <li><b>Biológicos:</b> Sucção de dejetos e limpeza de sanitários químicos.</li>
    <li><b>Ergonômicos:</b> intensidade pequena (possível postura inadequada, possível stress).</li>
    <li><b>Acidentes:</b> intensidade pequena (possíveis acidentes de quedas, cortes e perfurações e outros).</li>
</ul>

<p style="font-weight: bold; text-decoration: underline; margin-top: 1.5rem;">MEDIDAS PREVENTIVAS</p>
<table style="width: 100%; border-collapse: collapse; margin-top: 0.5rem;" border="1">
    <thead>
        <tr style="background-color: #f1f5f9;">
            <th style="padding: 8px; text-align: left;">EPI’s (Equipamentos de Proteção Individual)</th>
            <th style="padding: 8px; text-align: left;">OBSERVAÇÕES</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td style="padding: 8px;">ÓCULOS DE PROTEÇÃO, LUVA DE NEOLATEX, CAPACETE COM JUGULAR, BOTA TIPO B COM BICO DE AÇO, UNIFORME COMPLETO, PROTETOR SOLAR, PROTETOR AUDITIVO, CAPA DE CHUVA.</td>
            <td style="padding: 8px;">SEM MAIS</td>
        </tr>
    </tbody>
</table>

<p style="font-weight: bold; text-decoration: underline; margin-top: 1.5rem;">MEDIDAS ADMINISTRATIVAS</p>
<ul style="margin-top: 0.5rem; line-height: 1.6;">
    <li>TREINAMENTO E MONITORAMENTO DAS ATIVIDADES.</li>
    <li>ORIENTAÇÕES DE SEGURANÇA DOS LOCAIS DE PRESTAÇÃO DE SERVIÇOS.</li>
</ul>

<p style="margin-top: 2rem;">Declaro ter recebido as instruções de Segurança e Saúde no Trabalho de acordo com a NR-1, bem como os EPIs necessários e comprometo-me a cumprir todas as normas estabelecidas.</p>
`
        },
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

window.openModalGerador = function () {
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

window.closeModalGerador = function () {
    document.getElementById('modal-gerador').style.display = 'none';
};

window.editGerador = async function (id) {
    try {
        const [g, depts, templAdm, templOut] = await Promise.all([
            apiGet(`/geradores/${id}`),
            apiGet('/departamentos').catch(() => []),
            apiGet('/gerador-departamento-templates').catch(() => []),
            apiGet('/gerador-outros-contratos-templates').catch(() => [])
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

window.deleteGerador = async function (id) {
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
                } catch (te) { console.warn('Erro ao associar templates:', te); }

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
window.formatDoc = function (cmd, value = null) {
    document.execCommand(cmd, false, value);
};

window.abrirModalSelecaoColab = async function (geradorId) {
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

window.calcParcelaDesconto = function () {
    let valStr = document.getElementById('desconto-valor').value;
    if (!valStr) valStr = '0';
    // Substituir vírgula por ponto para cálculo
    valStr = valStr.replace(',', '.');
    const valor = parseFloat(valStr) || 0;
    const parcelas = parseInt(document.getElementById('desconto-parcelas').value) || 1;

    const maxVal = (valor / parcelas).toFixed(2).replace('.', ',');
    document.getElementById('desconto-valor-parcelamento').innerText = `Valor de cada parcela: R$ ${maxVal}`;
};

window.processarGeracao = async function () {
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

            setTimeout(() => {
                const previewBtnSalvar = document.querySelector('#modal-preview-doc button.btn-primary');
                if (previewBtnSalvar) {
                    previewBtnSalvar.style.display = 'none'; // Apenas para ver como vai ficar o documento
                }
            }, 100);
        }
    } catch (e) { console.error(e); }
};

window.abrirPreviewDocumento = function (data) {
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
        previewBtnSalvar.style.display = 'flex';
        previewBtnSalvar.innerHTML = '<i class="ph ph-paperclip"></i> Anexar ao Prontuário';
        previewBtnSalvar.onclick = async function () {
            const self = this;
            const oldHtml = self.innerHTML;
            self.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Anexando...';
            self.disabled = true;
            try {
                const previewContent = document.getElementById('preview-doc-body');
                const geradorNome = previewContent.dataset.docNome || data.gerador_nome || 'Documento';
                const nomeArquivo = `${geradorNome.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;

                const pdfBlob = await window.gerarPDFBlob(previewContent, nomeArquivo);

                // Determinar colaborador_id: prioridade viewedColaborador, depois data.colaborador.ID (retornado pelo backend /gerar)
                const colaboradorId = (viewedColaborador && viewedColaborador.id)
                    || (data.colaborador && data.colaborador.ID)
                    || (data.colaborador && data.colaborador.id)
                    || data.colabId;

                if (!colaboradorId) {
                    throw new Error('Não foi possível identificar o colaborador. Abra o prontuário e tente novamente.');
                }

                const formData = new FormData();
                formData.append('file', new File([pdfBlob], nomeArquivo, { type: 'application/pdf' }));
                formData.append('colaborador_id', colaboradorId);
                formData.append('tab_name', 'CONTRATOS_AVULSOS');
                formData.append('document_type', geradorNome);

                const uploadRes = await fetch(`${API_URL}/documentos`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${currentToken}` },
                    body: formData
                });
                if (!uploadRes.ok) {
                    const errObj = await uploadRes.json().catch(() => ({}));
                    throw new Error(errObj.error || 'Falha ao anexar o documento (' + uploadRes.status + ')');
                }

                document.getElementById('modal-preview-doc').style.display = 'none';

                if (typeof showToast !== 'undefined') {
                    showToast('Documento anexado ao prontuário com sucesso!', 'success');
                } else {
                    Swal.close(); if (typeof showToast !== 'undefined') showToast('Documento anexado!', 'success');
                }

                // Reload da lista de contratos
                await window._reloadContratosContainer();

            } catch (e) {
                Swal.fire('Erro', e.message || 'Erro ao anexar documento', 'error');
                self.innerHTML = oldHtml;
                self.disabled = false;
            }
        };
    }
    // Verificar opção de assinatura manual
    const comAssinatura = document.querySelector('input[name="assinatura-tipo"]:checked')?.value === 'sim';


    // 1. Cabeçalho com Logotipo — sem margem para colar no topo da página
    const logoBanner = `<div style="margin:0;padding:0;line-height:0;"><img src="${API_URL.replace('/api', '')}/assets/logo-header.png" style="width:100%;display:block;margin:0;padding:0;"></div>`;

    // 2. Dados do Colaborador
    const colabInfoBase = `
        <div style="border: 1px solid #000; padding: 0.4rem 0.75rem; margin-top: 0.5rem; line-height: 1.3; font-size: 0.75rem;">
            <p style="margin-bottom: 0.2rem; font-size: 0.8rem;"><b>DADOS COLABORADOR:</b></p>
            <div style="display: grid; grid-template-columns: 55% 45%; margin-bottom: 0px;">
                <span>NOME: <b>${data.colaborador.NOME_COMPLETO}</b></span>
                <span>CPF: <b>${data.colaborador.CPF}</b></span>
            </div>
            <p style="margin: 0px;">ENDEREÇO: ${data.colaborador.ENDERECO || '---'}</p>
            <p style="margin: 0px;">CARGO: ${data.colaborador.CARGO || '---'}</p>
            <div style="display: grid; grid-template-columns: 55% 45%; margin-top: 0px;">
                <span>CELULAR: ${data.colaborador.TELEFONE || '---'}</span>
                <span>E-MAIL: ${data.colaborador.EMAIL || '---'}</span>
            </div>
        </div>
    `;

    // 3. Conteúdo — compactar espaçamento de parágrafos
    const htmlComDestaque = (data.html || '')
        .replace(/AMERICA RENTAL EQUIPAMENTOS LTDA/g, '<b>AMERICA RENTAL EQUIPAMENTOS LTDA</b>');

    const isSantander = (data.gerador_nome || '').toLowerCase().includes('santander');
    const customFontSize = isSantander ? '0.68rem' : '0.82rem';
    const customLineHeight = isSantander ? '1.2' : '1.45';

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
    const meses = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
    const hoje = new Date();
    const dataFormatada = `Guarulhos, ${String(hoje.getDate()).padStart(2, '0')} de ${meses[hoje.getMonth()]} de ${hoje.getFullYear()}.`;

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
    const conteudoComPadding = `<div style="padding: 20px 60px 40px 60px;">${colabInfoBase}${conteudoPrincipal}${footerHtml}</div>`;
    container.innerHTML = logoBanner + conteudoComPadding;
    // Guardar nome para uso no salvar PDF
    container.dataset.docNome = data.gerador_nome || 'Documento';
    container.dataset.colabNome = colabNome || '';

    document.getElementById('preview-doc-title').textContent = data.gerador_nome;
    document.getElementById('modal-preview-doc').style.display = 'block';
};

// Salvar como PDF — usa o diálogo de impressão do navegador com destino "Salvar em PDF"
window.salvarDocumentoPDF = function () {
    const container = document.getElementById('preview-doc-body');
    if (!container) return;
    const content = container.innerHTML;
    const docNome = container.dataset.docNome || 'Documento';
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

window.imprimirDocumento = function () {
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
window.loadChaves = async function () {
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

window.resetChavesForm = function () {
    document.getElementById('form-chaves').reset();
    document.getElementById('chave-id').value = '';
    document.getElementById('chaves-form-title').textContent = 'Cadastrar Nova Chave';
};

window.editChave = function (id, nome) {
    document.getElementById('chave-id').value = id;
    document.getElementById('chave-nome').value = nome;
    document.getElementById('chaves-form-title').textContent = 'Editar Chave';
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.deleteChave = async function (id) {
    if (!confirm('Deseja excluir esta chave?')) return;
    try {
        await apiDelete(`/chaves/${id}`);
        loadChaves();
    } catch (e) { alert(e.message); }
};

// --- GESTÃO DE ADMISSÃO ---
const ADMISSAO_STATUS_STYLES = {
    'Aguardando início': { bg: '#f1f3f5', color: '#495057', border: '#adb5bd', icon: 'ph-hourglass-high', label: 'Aguardando' },
    'Processo iniciado': { bg: '#f3e8ff', color: '#7e22ce', border: '#c084fc', icon: 'ph-play-circle', label: 'Iniciado' },
    'Ativo': { bg: '#e8f5e9', color: '#196b36', border: '#196b36', icon: 'ph-check-circle', label: 'Ativo' },
    'Férias': { bg: '#fdf7e3', color: '#c2aa72', border: '#c2aa72', icon: 'ph-airplane-tilt', label: 'Férias' },
    'Afastado': { bg: '#faeed9', color: '#eaa15f', border: '#eaa15f', icon: 'ph-warning', label: 'Afastado' },
    'Desligado': { bg: '#fceeee', color: '#ba7881', border: '#ba7881', icon: 'ph-x-circle', label: 'Desligado' }
};

window.loadAdmissaoSelect = async function () {
    try {
        const rows = await apiGet('/colaboradores');
        const hiddenInput = document.getElementById('admissao-select-colab');
        const dropdownList = document.getElementById('admissao-dropdown-list');
        const label = document.getElementById('admissao-dropdown-label');
        if (!dropdownList) return;

        // Apenas colaboradores pendentes de admissão
        // Apenas colaboradores com status de admissão pendente
        const ADMISSAO_PENDENTES = [
            'aguardando inicio', 'aguardando início',
            'processo iniciado', 'em admissao', 'em admissão',
            'aguardando', 'pendente'
        ];
        const pendentes = rows.filter(r => {
            const s = (r.status || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            const admStatus = (r.admissao_status || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            // Inclui se o status for de admissão pendente OU se admissao_status indicar processo em aberto
            if (ADMISSAO_PENDENTES.includes(s)) return true;
            if (admStatus && admStatus !== 'concluida' && admStatus !== 'concluído') return true;
            return false;
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
            const s = ADMISSAO_STATUS_STYLES[p.status] || { bg: '#f1f3f5', color: '#495057', border: '#adb5bd', icon: 'ph-clock', label: p.status };
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

window.toggleAdmissaoDropdown = function () {
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

window.selectAdmissaoColab = function (id, colab, s) {
    const hiddenInput = document.getElementById('admissao-select-colab');
    const label = document.getElementById('admissao-dropdown-label');
    const list = document.getElementById('admissao-dropdown-list');
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
document.addEventListener('click', function (e) {
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


window.sendAssinafyWhatsApp = async function (tipo, suffix) {
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
window.buildAdmissaoSignatureRows = function (availableGeradores, assinaturas, docs, colab) {
    return availableGeradores.map(g => {
        const ass = assinaturas.find(a => a.gerador_id === g.id || a.nome_documento === g.nome);
        const docEquivalente = (docs || []).find(d => d.tab_name === 'CONTRATOS' && (d.document_type === g.nome || (d.file_name && d.file_name.includes(g.nome))));

        let realStatus = '';
        if (docEquivalente && docEquivalente.assinafy_status === 'Assinado') realStatus = 'Assinado';
        else if (ass && ass.assinafy_status === 'Assinado') realStatus = 'Assinado';
        else if (docEquivalente && docEquivalente.assinafy_status === 'Pendente') realStatus = 'Pendente';
        else if (docEquivalente && docEquivalente.assinafy_status === 'Aguardando') realStatus = 'Pendente';
        else if (ass && ass.assinafy_status === 'Pendente') realStatus = 'Pendente';
        else if (docEquivalente && docEquivalente.assinafy_status === 'NAO_EXIGE') realStatus = 'NAO_EXIGE';
        else if (docEquivalente && docEquivalente.file_path) realStatus = 'Anexado';

        const isSigned = realStatus === 'Assinado';
        const isPending = realStatus === 'Pendente';
        const isAnexado = realStatus === 'Anexado';
        const naoExige = realStatus === 'NAO_EXIGE';
        const colabId = colab ? colab.id : '';

        // Formatador de datas
        const fmtDate = (str) => {
            if (!str) return '';
            try {
                const d = new Date(str + (str.includes('Z') ? '' : 'Z'));
                if (isNaN(d.getTime())) return '';
                const dd = String(d.getDate()).padStart(2, '0');
                const mm = String(d.getMonth() + 1).padStart(2, '0');
                const yy = d.getFullYear();
                const hh = String(d.getHours()).padStart(2, '0');
                const mi = String(d.getMinutes()).padStart(2, '0');
                return dd + '/' + mm + '/' + yy + ' - ' + hh + ':' + mi;
            } catch (e) { return ''; }
        };

        const sentDate = (ass && ass.enviado_em) ? fmtDate(ass.enviado_em) : (docEquivalente && docEquivalente.upload_date ? fmtDate(docEquivalente.upload_date) : '');
        const signedDate = (ass && ass.assinado_em) ? fmtDate(ass.assinado_em) : (docEquivalente && docEquivalente.assinafy_signed_at ? fmtDate(docEquivalente.assinafy_signed_at) : '');
        const uploadDate = docEquivalente && docEquivalente.upload_date ? fmtDate(docEquivalente.upload_date) : '';
        const fileName = docEquivalente ? (docEquivalente.file_name || docEquivalente.original_name || '') : '';

        let leftIcon = '';
        let subText = '';

        if (isSigned) {
            leftIcon = '<div style="display:flex;align-items:center;justify-content:center;width:24px;color:#16a34a;"><i class="ph ph-check-circle" style="font-size:1.4rem;"></i></div>';
            subText = '<span style="color:#16a34a;font-size:0.75rem;font-weight:600;">' + (signedDate ? '<i class="ph ph-signature"></i> Assinado: ' + signedDate : 'Documento Assinado') + '</span>';
        } else if (isPending) {
            leftIcon = '<div style="display:flex;align-items:center;justify-content:center;width:24px;color:#2563eb;"><i class="ph ph-paper-plane-tilt" style="font-size:1.4rem;"></i></div>';
            subText = '<span style="color:#2563eb;font-size:0.75rem;font-weight:600;">' + (sentDate ? '<i class="ph ph-paper-plane-tilt"></i> Enviado: ' + sentDate : 'Enviado para Assinatura') + '</span>';
        } else if (naoExige || isAnexado) {
            leftIcon = '<div style="display:flex;align-items:center;justify-content:center;width:24px;color:#9333ea;"><i class="ph ph-file-text" style="font-size:1.4rem;"></i></div>';
            subText = '<span style="color:#9333ea;font-size:0.75rem;font-weight:600;">' + (uploadDate ? '<i class="ph ph-file-arrow-up"></i> Anexado: ' + uploadDate : 'Documento Anexado') + '</span>';
        } else {
            leftIcon = '<div style="display:flex;align-items:center;justify-content:center;width:24px;color:#94a3b8;"><i class="ph ph-file-dashed" style="font-size:1.4rem;"></i></div>';
            subText = '';
        }

        const fileNameTag = fileName ? '<span style="font-size:0.72rem;color:#94a3b8;margin-top:1px;"><i class="ph ph-file"></i> ' + fileName + '</span>' : '';

        // Botão do olho sempre existe
        let eyeBtn = '';
        if (ass && ass.id && isSigned) {
            eyeBtn = '<button onclick="window.openSignedDocPopup(' + ass.id + ', \'' + g.nome.replace(/'/g, "\\'") + '\', event)" style="border:none;background:none;cursor:pointer;color:#16a34a;" title="Ver documento assinado"><i class="ph ph-eye" style="font-size:1.4rem;"></i></button>';
        } else if (docEquivalente && docEquivalente.id) {
            eyeBtn = '<button onclick="window.openContratoViewerById(' + docEquivalente.id + ')" style="border:none;background:none;cursor:pointer;color:#16a34a;" title="Ver documento"><i class="ph ph-eye" style="font-size:1.4rem;"></i></button>';
        } else {
            eyeBtn = '<button onclick="window.previewAdmissaoDoc(' + g.id + ', ' + colabId + ', event)" style="border:none;background:none;cursor:pointer;color:#64748b;" title="Ver preview do documento"><i class="ph ph-eye" style="font-size:1.4rem;"></i></button>';
        }

        let dynamicControls = '';
        if (!isSigned && !isPending && !naoExige && !isAnexado) {
            dynamicControls = `
                <div id="admissao-inline-box-${g.id}" style="display:flex; align-items:center; gap:12px; background:#f8fafc; padding:8px 12px; border-radius:6px; border:1px solid #e2e8f0; font-size:0.85rem;">
                    <strong style="color:#334155;">Exige assinatura?</strong>
                    <label style="display:flex; align-items:center; gap:4px; margin:0; cursor:pointer;">
                        <input type="radio" name="req-ass-adm-${g.id}" value="sim" onchange="window.renderInlineAdmissaoAction('${g.id}', 'sim', '${colabId}')"> Sim
                    </label>
                    <label style="display:flex; align-items:center; gap:4px; margin:0; cursor:pointer;">
                        <input type="radio" name="req-ass-adm-${g.id}" value="nao" onchange="window.renderInlineAdmissaoAction('${g.id}', 'nao', '${colabId}')"> Não
                    </label>
                </div>
                <div id="admissao-inline-action-${g.id}"></div>
            `;
        } else if (isPending && docEquivalente && docEquivalente.id) {
            dynamicControls = `<button type="button" onclick="window.reenviarAssinaturaContratoAdmissao('${docEquivalente.id}', '${colabId}', event)" class="btn btn-sm" style="background:#0284c7;color:#fff;border:none;border-radius:6px;padding:6px 14px;font-size:0.8rem;font-weight:600;display:inline-flex;align-items:center;gap:6px;"><i class="ph ph-pen"></i> Reenviar Ass.</button>`;
        }

        const borderColor = isSigned ? '#bbf7d0' : isPending ? '#bfdbfe' : (naoExige || isAnexado) ? '#e9d5ff' : '#f1f5f9';
        const bgColor = isSigned ? '#f0fdf4' : isPending ? '#eff6ff' : (naoExige || isAnexado) ? '#faf5ff' : '#fff';

        // Botão excluir: usa id do doc (admissao_assinaturas) ou docEquivalente (documentos)
        const _assId = ass && ass.id ? ass.id : null;
        const _docEqId = docEquivalente && docEquivalente.id ? docEquivalente.id : null;
        let admDelBtn = '';
        if (_assId) {
            admDelBtn = `<button onclick="window.excluirContratoComSenha(${_assId}, 'admissao')" style="border:none;background:none;cursor:pointer;color:#dc2626;" title="Excluir Contrato"><i class="ph ph-trash" style="font-size:1.4rem;"></i></button>`;
        } else if (_docEqId) {
            admDelBtn = `<button onclick="window.excluirContratoComSenha(${_docEqId}, 'documento')" style="border:none;background:none;cursor:pointer;color:#dc2626;" title="Excluir Contrato"><i class="ph ph-trash" style="font-size:1.4rem;"></i></button>`;
        }

        return `
            <label class="doc-check-item" style="display:flex; align-items:center; gap:0.6rem; padding:1.1rem 1.25rem; border:1px solid ${borderColor}; border-radius:8px; background:${bgColor}; box-shadow:0 1px 2px rgba(0,0,0,0.03); transition:all 0.2s; justify-content:space-between; margin-bottom:12px;">
                <div style="display:flex; align-items:center; gap:12px; flex:1;">
                    ${leftIcon}
                    <div style="display:flex; flex-direction:column; gap:1px;">
                        <span style="font-size:0.95rem; font-weight:700; color:#0f172a; margin-bottom:3px;">${g.nome.toUpperCase()}</span>
                        ${subText}
                        ${fileNameTag}
                    </div>
                </div>
                <div style="display:flex; align-items:center; gap:12px;">
                    ${dynamicControls}
                    ${admDelBtn}
                    ${eyeBtn}
                </div>
            </label>
        `;
    }).join('');
};

window.renderInlineAdmissaoAction = function (geradorId, resp, colabId) {
    const actionDiv = document.getElementById('admissao-inline-action-' + geradorId);
    if (!actionDiv) return;

    if (resp === 'sim') {
        actionDiv.innerHTML = `<button type="button" onclick="window.sendSingleAdmissaoSignature('${geradorId}', '${colabId}', this)" class="btn btn-sm" style="background:#2563eb;color:#fff;border:none;border-radius:6px;padding:6px 14px;font-size:0.8rem;font-weight:600;display:inline-flex;align-items:center;gap:6px;"><i class="ph ph-paper-plane-tilt"></i> Enviar</button>`;
    } else if (resp === 'nao') {
        actionDiv.innerHTML = `<button type="button" onclick="document.getElementById('adm-upload-${geradorId}').click()" class="btn btn-sm" style="background:#9333ea;color:#fff;border:none;border-radius:6px;padding:6px 14px;font-size:0.8rem;font-weight:600;display:inline-flex;align-items:center;gap:6px;"><i class="ph ph-upload-simple"></i> Anexar PDF</button>
        <input type="file" id="adm-upload-${geradorId}" accept="application/pdf" style="display:none;" onchange="window.uploadAdmissaoAvulso('${geradorId}', '${colabId}', this)">`;
    }
};

window.sendSingleAdmissaoSignature = async function (geradorId, colabId, btn) {
    const ogHtml = btn.innerHTML;
    btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Enviando...';
    btn.disabled = true;

    try {
        const gerador = window._admissaoGeradores?.find(g => String(g.id) === String(geradorId));
        if (!gerador) throw new Error("Gerador não encontrado.");

        const admObj = viewedColaborador || { id: colabId };
        const reqData = {
            colaborador_id: admObj.id,
            nome_completo: admObj.nome_completo || admObj.nome || '',
            cargo: admObj.cargo_nome_exibindo || admObj.cargo || '',
            cpf: admObj.cpf,
            admissao: admObj.data_admissao || admObj.admissao || '',
            docs: [{ gerador_id: gerador.id, tipo_documento: gerador.nome }]
        };

        const res = await fetch(`${window.location.origin}/api/admissao-assinaturas/enviar-lote`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${currentToken}` },
            body: JSON.stringify(reqData)
        });
        const data = await res.json();
        if (res.ok) {
            showToast('Documento enviado com sucesso!', 'success');
            const admDiv = document.getElementById('contratos-sub-admissao');
            if (admDiv) { admDiv.innerHTML = '<p class="text-muted"><i class="ph ph-spinner ph-spin"></i> Atualizando...</p>'; window.renderContratosTab(document.getElementById('docs-list-container')); }
        } else {
            throw new Error(data.error || 'Erro ao enviar.');
        }
    } catch (e) {
        btn.innerHTML = ogHtml;
        btn.disabled = false;
        showToast(e.message, 'error');
    }
};

window.uploadAdmissaoAvulso = async function (geradorId, colabId, fileInput) {
    if (!fileInput.files || fileInput.files.length === 0) return;
    const file = fileInput.files[0];

    const gerador = window._admissaoGeradores?.find(g => String(g.id) === String(geradorId));
    if (!gerador) return alert('Gerador não encontrado.');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('colaborador_id', colabId);
    formData.append('colaborador_nome', viewedColaborador?.nome_completo || '');
    formData.append('document_type', gerador.nome);
    formData.append('tab_name', 'CONTRATOS');
    formData.append('is_nao_exige', 'true');

    try {
        const res = await fetch(`${window.location.origin}/api/documentos`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${currentToken}` },
            body: formData
        });
        const d = await res.json();
        if (res.ok) {
            showToast('Anexado com sucesso.', 'success');
            const admDiv = document.getElementById('contratos-sub-admissao');
            if (admDiv) { admDiv.innerHTML = '<p class="text-muted"><i class="ph ph-spinner ph-spin"></i> Atualizando...</p>'; window.renderContratosTab(document.getElementById('docs-list-container')); }
        } else {
            throw new Error(d.error || 'Erro ao anexar');
        }
    } catch (e) {
        showToast(e.message, 'error');
    }
    fileInput.value = '';
};

// ===== ABA CONTRATOS (PRONTUÁRIO DIGITAL) — apenas Outros Contratos =====
window.renderContratosTab = async function (container, searchTerm = '') {
    if (!viewedColaborador) return;
    container.innerHTML = '<p class="text-muted" style="padding:0.5rem;"><i class="ph ph-spinner ph-spin"></i> Carregando geradores...</p>';
    // Vai direto para Outros Contratos — sem sub-aba de Admissão
    await window.renderContratosAvulso(container, searchTerm);
};

// Helper: recarrega a aba Contratos no container correto
// Só roda se ca-list-container estiver no DOM (indica que a aba Contratos está ativa)
window._reloadContratosContainer = async function () {
    window._contratosAvulsoLoaded = false;
    // O elemento ca-list-container é renderizado por renderContratosAvulso
    // Se ele existe, o usuário ESTÁ na aba Contratos
    const caList = document.getElementById('ca-list-container');
    let ct = document.getElementById('docs-list-container') ||
        document.getElementById('tab-dynamic-content');
    if (ct && caList) {
        const searchTerm = document.getElementById('doc-search-input')?.value.toLowerCase() || '';
        ct.innerHTML = '<p class="text-muted" style="padding:0.5rem;"><i class="ph ph-spinner ph-spin"></i> Atualizando...</p>';
        await window.renderContratosAvulso(ct, searchTerm);
    }
};

// === SUB-ABA OUTROS CONTRATOS ===
// Helper: avalia se um gerador deve aparecer automaticamente para o colaborador
window._avaliarRegraGerador = function (g, colab, deptNome) {
    if (g.is_sinistro_only) return false;
    let regra = {};
    try { regra = g.visibilidade_regra ? JSON.parse(g.visibilidade_regra) : {}; } catch (e) { }

    if (!regra.visivel_automatico) return false;

    // Verificar restrição de departamento (ou cargo/tipo)
    if (regra.departamentos && regra.departamentos.length > 0) {
        const deptNomeLower = (deptNome || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
        const cargoLower = (colab.cargo || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
        const tipoLower = (colab.tipo || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
        
        const match = regra.departamentos.some(d => {
            const dLower = d.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
            // Remove o 's' final do 'motoristas' para buscar 'motorista'
            const dLowerBase = dLower.endsWith('s') && dLower !== 'liderancas' ? dLower.slice(0, -1) : dLower;
            return deptNomeLower.includes(dLowerBase) || cargoLower.includes(dLowerBase) || tipoLower.includes(dLowerBase);
        });
        if (!match) return false;
    }

    // Verificar condição de campo do colaborador
    if (regra.condicao) {
        const [campo, ...resto] = regra.condicao.split('~').length > 1
            ? regra.condicao.split('~') : regra.condicao.split('=');
        const valor = regra.condicao.split('~').length > 1
            ? regra.condicao.split('~')[1] : resto.join('=');
        const operador = regra.condicao.includes('~') ? 'contains' : 'equals';

        const valorColab = (colab[campo.trim()] || '').toString().toLowerCase().trim();
        const valorEsperado = (valor || '').toLowerCase().trim();

        if (operador === 'contains') {
            if (!valorColab.includes(valorEsperado)) return false;
        } else {
            // Aceitar variações "Sim"/"sim", "Nao"/"Não"/"não", "Intermitente" etc.
            const normalize = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
            if (normalize(valorColab) !== normalize(valorEsperado)) return false;
        }
    }

    return true;
};

window.renderContratosAvulso = async function (container, searchTerm = '') {
    if (!viewedColaborador || !container) return;
    container.innerHTML = '<p class="text-muted"><i class="ph ph-spinner ph-spin"></i> Carregando Documentos...</p>';
    try {
        const safeGet = async (url) => {
            try {
                const r = await apiGet(url);
                return Array.isArray(r) ? r : (r ? [r] : []);
            } catch (e) { return []; }
        };
        const [assinaturas, docs, geradores, departamentos] = await Promise.all([
            safeGet(`/colaboradores/${viewedColaborador.id}/admissao-assinaturas`),
            safeGet(`/colaboradores/${viewedColaborador.id}/documentos`),
            safeGet('/geradores'),
            safeGet('/departamentos')
        ]);
        window._todosGeradores = geradores;

        const c = viewedColaborador;
        const empDeptId = c.departamento;
        const deptObj = departamentos.find(d =>
            String(d.id) === String(empDeptId) ||
            String(d.nome).trim().toLowerCase() === String(empDeptId).trim().toLowerCase()
        );
        const deptNome = deptObj ? deptObj.nome : String(empDeptId || '');

        // Nomes que NUNCA devem aparecer em Outros Contratos
        const EXCLUIDOS_FIXOS = [
            'autorização de desconto em folha de pagamento',
            'autorizacao de desconto em folha de pagamento',
            'autorizar desconto',
            'termo de responsabilidade de chaves'
        ];
        const isExcluido = (g) => {
            const nLower = (g.nome || '').toLowerCase().trim();
            if (EXCLUIDOS_FIXOS.includes(nLower)) return true;
            if (g.is_sinistro_only) return true;
            // Excluir geradores cujo nome começa com "Sinistro"
            if (nLower.startsWith('sinistro')) return true;
            if (nLower.startsWith('sinistro -')) return true;
            return false;
        };

        // Geradores elegíveis (sem excluídos e sem sinistro)
        const geradoresElegiveis = geradores.filter(g => !isExcluido(g));

        // Determinar quais aparecem automaticamente pelo perfil (usa regras do banco)
        let autoGeradores = geradoresElegiveis.filter(g =>
            window._avaliarRegraGerador(g, c, deptNome)
        );

        // FALLBACK: se nenhum gerador tem regras seeded ainda, usa mapa legado de perfil
        const algumTemRegra = geradoresElegiveis.some(g => g.visibilidade_regra);
        if (!algumTemRegra) {
            const deNorm = s => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
            const LEGACY_MAP = [
                { nome: 'Termo de NÃO Interesse Terapia', cond: deNorm(c.terapia_participa) === 'nao' || deNorm(c.terapia_participa) === 'nao' },
                { nome: 'Termo de Interesse Terapia', cond: deNorm(c.terapia_participa) === 'sim' },
                { nome: 'Responsabilidade Bilhete Único', cond: (c.meio_transporte || '').toLowerCase().includes('vt') },
                { nome: 'Responsabilidade Celular', cond: deNorm(c.celular_participa) === 'sim' },
                { nome: 'Responsabilidade Chaves', cond: deNorm(c.chaves_participa) === 'sim' },
                { nome: 'Contrato Faculdade', cond: deNorm(c.faculdade_participa) === 'sim' },
                { nome: 'Contrato Academia', cond: deNorm(c.academia_participa) === 'sim' },
                { nome: 'Contrato Intermitente', cond: deNorm(c.tipo_contrato) === 'intermitente' },
                { nome: 'Acordo Individual Benefícios', cond: true },
                { nome: 'Autorização de Uso de Imagem', cond: true },
                { nome: 'Compartilhamento de Dados', cond: true },
                { nome: 'Recebimento de Regimento Interno', cond: true },
                { nome: 'Regras Sorteio Final de Ano', cond: true },
                { nome: 'Termo de Confidencialidade', cond: true },
                { nome: 'Solicitação de VT', cond: true },
                { nome: 'Responsabilidade Veículo', cond: deNorm(deptNome).includes('motorista') || deNorm(c.cargo || '').includes('motorista') },
                { nome: 'Responsabilidade Equipamento', cond: deNorm(deptNome).includes('administrativo') || deNorm(c.cargo || '').includes('administrativo') || deNorm(c.tipo || '').includes('administrativo') },
            ];
            autoGeradores = LEGACY_MAP
                .filter(m => m.cond)
                .map(m => geradoresElegiveis.find(g => deNorm(g.nome) === deNorm(m.nome)))
                .filter(Boolean);
        }

        // Geradores para a lista suspensa "Gerar Novo"
        // Regra: mostrar TODOS os elegíveis na lista suspensa de qualquer colaborador
        // (excetos sinistro e excluídos, já tratados acima)
        // Quando as regras estiverem no banco, aplica filtro adicional de dropdown_todos
        const dropdownGeradores = geradoresElegiveis.filter(g => {
            if (!g.visibilidade_regra) return true; // sem regra = aparece sempre
            let regra = {};
            try { regra = JSON.parse(g.visibilidade_regra); } catch (e) { }
            // Se dropdown_todos = false e não é auto-visível para este colab, não aparece no dropdown
            if (regra.dropdown_todos === false && !window._avaliarRegraGerador(g, c, deptNome)) return false;
            return true;
        });

        window._caAvailableGeradores = dropdownGeradores;

        // filteredDocs: apenas documentos da aba CONTRATOS_AVULSOS
        const filteredDocs = docs.filter(d => d.tab_name === 'CONTRATOS_AVULSOS');

        // Normalização para matching de nomes
        const _norm = s => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

        // Função para encontrar doc correspondente a um gerador
        const _findDocForGerador = (g) => {
            const gNorm = _norm(g.nome);
            return filteredDocs.find(d => {
                const dNorm = _norm(d.document_type);
                return dNorm === gNorm || dNorm.includes(gNorm) || gNorm.includes(dNorm);
            });
        };

        // ──────────────────────────────────────────────────────────────────────
        // Renderização INTERCALADA: para cada gerador de perfil, mostra o doc
        // correspondente (se já existir) ou a linha pendente (se ainda não).
        // Docs avulsos sem gerador correspondente ficam no final.
        // ──────────────────────────────────────────────────────────────────────
        const docsUsados = new Set();
        let combinedHtml = '';

        // --- MUDANÇA: Ordenar TODOS os documentos já gerados do mais novo para o mais antigo ---
        let allExistingDocs = [...filteredDocs];

        if (searchTerm) {
            const st = searchTerm.toLowerCase();
            allExistingDocs = allExistingDocs.filter(d => (d.document_type || '').toLowerCase().includes(st) || (d.file_name || '').toLowerCase().includes(st));
            autoGeradores = autoGeradores.filter(g => (g.nome || '').toLowerCase().includes(st));
        }

        const _normFR = s => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
        const fichaRegistroDoc = docs.find(d =>
            (d.tab_name === '01_FICHA_CADASTRAL' || d.tab_name === 'CONTRATOS_AVULSOS') &&
            (_normFR(d.document_type).includes('ficha de registro') || _normFR(d.document_type).includes('ficha cadastral'))
        );

        if (fichaRegistroDoc && !allExistingDocs.some(d => d.id === fichaRegistroDoc.id)) {
            allExistingDocs.push(fichaRegistroDoc);
        }

        // Ordena descending por ID
        allExistingDocs.sort((a, b) => b.id - a.id);

        if (allExistingDocs.length > 0) {
            combinedHtml += window.buildContratosSignatureRows(assinaturas, allExistingDocs, viewedColaborador);
            allExistingDocs.forEach(d => docsUsados.add(d.id));
        }

        for (const g of autoGeradores) {
            const docMatch = _findDocForGerador(g);
            if (!docMatch) {
                // Gerador pendente: renderiza a linha de perfil aguardando geração
                const escNome = (g.nome || '').replace(/'/g, "\\'").replace(/"/g, "&quot;");
                combinedHtml += `
                <div style="display:flex; align-items:center; justify-content:space-between; padding:0.65rem 0.75rem; border:1.5px dashed #c026d3; border-radius:8px; background:#fdf4ff; gap:0.75rem;">
                    <div style="display:flex; align-items:center; gap:0.6rem; flex:1;">
                        <span style="background:#fdf4ff;color:#c026d3;border:1px solid #f0abfc;border-radius:10px;padding:2px 8px;font-size:0.7rem;font-weight:700;white-space:nowrap;">Perfil</span>
                        <div>
                            <span style="font-weight:600; color:#334155; font-size:0.9rem;">${g.nome}</span>
                            <div id="perfil-status-txt-${g.id}" style="font-size:0.75rem; color:#a21caf; margin-top:1px;">Necessário pelo perfil do colaborador — aguardando geração</div>
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
            }
        }

        // ── Slot especial: Ficha de Registro (upload-only, não gerado por template) ──
        if (!docsUsados.has(fichaRegistroDoc?.id) && !fichaRegistroDoc) {
            // Slot vazio: exibe linha para anexar
            combinedHtml += `
            <div style="display:flex; align-items:center; justify-content:space-between; padding:0.65rem 0.75rem; border:1.5px dashed #64748b; border-radius:8px; background:#f8fafc; gap:0.75rem;">
                <div style="display:flex; align-items:center; gap:0.6rem; flex:1;">
                    <span style="background:#f1f5f9;color:#475569;border:1px solid #cbd5e1;border-radius:10px;padding:2px 8px;font-size:0.7rem;font-weight:700;white-space:nowrap;">Upload</span>
                    <div>
                        <span style="font-weight:600; color:#334155; font-size:0.9rem;">Ficha de Registro</span>
                        <div style="font-size:0.75rem; color:#64748b; margin-top:1px;">Anexe o PDF da Ficha de Registro para envio à assinatura</div>
                    </div>
                </div>
                <label class="btn btn-secondary" style="display:flex;align-items:center;gap:0.4rem;cursor:pointer;font-size:0.82rem;padding:0.35rem 0.8rem;margin:0;">
                    <i class="ph ph-upload-simple"></i> Anexar PDF
                    <input type="file" accept=".pdf" style="display:none" onchange="window.uploadContratoExternoComTipo(this, 'Ficha de Registro')">
                </label>
            </div>`;
        }

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
                    <button class="btn btn-primary" onclick="window.abrirModalGerarContrato()" style="display:flex;align-items:center;margin:0;gap:0.4rem;background:#9333ea;border-color:#9333ea;color:#fff;">
                        <i class="ph ph-file-plus"></i> Gerar Novo
                    </button>
                </div>
            </div>
            <div id="ca-list-container" style="display:flex; flex-direction:column; gap:0.5rem; margin-bottom:1.5rem;">
                ${combinedHtml}
            </div>

        `; // fim do innerHTML

    } catch (err) {
        container.innerHTML = `<div class="alert alert-danger"><i class="ph ph-warning"></i> Erro: ${err.message}</div>`;
    }
};



// Guard: impede execuções concorrentes do sync
window._syncContratosRunning = false;

// Helper: sincroniza o status de documentos Pendentes no Assinafy
// showFeedback=true => mostra toast ao concluir; false => silencioso
window.sincronizarStatusAssinaturas = async function (showFeedback) {
    if (!viewedColaborador) return;
    // Evita execuções concorrentes (loop de reload)
    if (window._syncContratosRunning) return;
    window._syncContratosRunning = true;

    const btn = null; // botão manual removido, mantido por compatibilidade

    try {
        const docs = await apiGet(`/colaboradores/${viewedColaborador.id}/documentos`).catch(() => []);
        const contratosDocs = (Array.isArray(docs) ? docs : []).filter(d => d.tab_name === 'CONTRATOS_AVULSOS');

        // Docs que o banco JÁ atualizou para Assinado (backend polling já rodou)
        const jaAssinados = contratosDocs.filter(d => d.assinafy_status === 'Assinado');

        // Docs Pendentes ou Aguardando que precisamos verificar no Assinafy
        // 'Pendente' = salvo mas ainda não enviado / 'Aguardando' = já enviado ao Assinafy
        const pendentes = contratosDocs.filter(d =>
            (d.assinafy_status === 'Pendente' || d.assinafy_status === 'Aguardando') && d.assinafy_id
        );

        // Se não há pendentes mas há assinados recentes: se é o botão manual, apenas recarregar a lista
        if (pendentes.length === 0) {
            if (showFeedback) {
                // Recarrega para garantir que a UI esteja atualizada com o que o banco tem
                await window._reloadContratosContainer();
                if (typeof showToast !== 'undefined') {
                    const msg = jaAssinados.length > 0
                        ? `Lista atualizada — ${jaAssinados.length} documento(s) assinado(s).`
                        : 'Nenhum documento pendente de assinatura.';
                    showToast(msg, jaAssinados.length > 0 ? 'success' : 'info');
                }
            } else {
                if (btn) { btn.disabled = false; btn.innerHTML = origHtml; }
            }
            return;
        }

        let atualizado = 0;
        for (const doc of pendentes) {
            try {
                const res = await fetch(`${API_URL}/documentos/${doc.id}/sync-assinafy`, {
                    method: 'POST',
                    headers: { 'Authorization': 'Bearer ' + currentToken }
                });
                const data = await res.json().catch(() => ({}));
                if (res.ok && (data.status_novo === 'Assinado' || data.sucesso)) atualizado++;
            } catch (e) { /* ignora erros individuais */ }
        }

        // Só recarrega a lista se algum status mudou para Assinado
        // Evita loop infinito: reload → auto-sync → reload
        if (atualizado > 0) {
            window._syncContratosRunning = false; // libera ANTES do reload (reload vai setar novo contexto)
            await window._reloadContratosContainer();
        }

        if (showFeedback && typeof showToast !== 'undefined') {
            const msg = atualizado > 0
                ? `${atualizado} documento(s) atualizado(s) para Assinado!`
                : `Verificado — ${pendentes.length} documento(s) ainda aguardando assinatura.`;
            showToast(msg, atualizado > 0 ? 'success' : 'info');
        }
    } catch (e) {
        if (showFeedback && typeof showToast !== 'undefined') showToast('Erro ao verificar: ' + e.message, 'error');
    } finally {
        window._syncContratosRunning = false; // sempre libera o guard
    }
};

window.toggleAcaoContratoPerfil = function (geradorId, exige, geradorNome) {
    const actionDiv = document.getElementById('pg-action-' + geradorId);
    if (!actionDiv) return;
    if (exige === 'nao') {
        actionDiv.innerHTML = `
            <label class="btn btn-warning btn-sm" style="margin:0;cursor:pointer;display:inline-flex;align-items:center;gap:4px;font-size:0.85rem;background:#eab308;color:#fff;border:none;padding:0.4rem 1rem;border-radius:6px;font-weight:600;">
                <i class="ph ph-upload-simple"></i> Anexar PDF
                <input type="file" accept=".pdf" style="display:none;" onchange="window.uploadContratoPerfilNaoAssinado(this, '${geradorNome}')">
            </label>
        `;
    } else {
        actionDiv.innerHTML = `
            <button class="btn btn-primary btn-sm" style="margin:0;cursor:pointer;display:inline-flex;align-items:center;gap:4px;font-size:0.85rem;background:#c026d3;border-color:#c026d3;padding:0.4rem 1rem;border-radius:6px;"
                onclick="window.previewContratoPerfilAssinado('${geradorId}', '${geradorNome}')">
                <i class="ph ph-file-arrow-down"></i> Gerar Documento
            </button>
        `;
    }
};

window.uploadContratoPerfilNaoAssinado = async function (input, geradorNome) {
    const file = input.files[0];
    if (!file || !viewedColaborador) return;
    Swal.fire({ title: 'Anexando...', allowOutsideClick: false, didOpen: function () { Swal.showLoading(); } });

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
        var data = await res.json().catch(function () { return {}; });
        if (!res.ok) throw new Error(data.error || 'Falha ao salvar PDF');
        Swal.close(); if (typeof showToast !== 'undefined') showToast('Documento anexado!', 'success');
        await window._reloadContratosContainer();
    } catch (e) {
        Swal.fire('Erro', e.message, 'error');
    }
};

// ═══════════════════════════════════════════════════════════
// POPUP ESPECIAL: Solicitação de Vale Transporte (VT)
// ═══════════════════════════════════════════════════════════
window._abrirPopupVT = function (geradorId, geradorNome) {
    const c = viewedColaborador || {};

    // ── Parser de endereço do colaborador ──────────────────────────────────
    // O campo `endereco` pode ser uma string composta. Tenta extrair as partes.
    const endFull = c.endereco || '';

    // Se o colaborador tiver campos separados (endereco, bairro, cidade, cep, etc.) usa-os
    // Caso contrário, tenta fazer o parse da string completa
    let vtRua    = c.vt_rua    || c.end_rua    || '';
    let vtNumero = c.vt_numero || c.end_numero || '';
    let vtBairro = c.vt_bairro || c.end_bairro || c.bairro || '';
    let vtCidade = c.vt_cidade || c.end_cidade || c.cidade || 'Guarulhos';
    let vtUF     = c.vt_uf    || c.end_uf     || c.uf     || 'SP';
    let vtCEP    = c.vt_cep   || c.end_cep    || c.cep    || '';

    if (!vtRua && endFull) {
        // Padrão comum: "Rua das Flores, 123, Bairro, Guarulhos - SP, 00000-000"
        // Tenta extrair por vírgulas
        const partes = endFull.split(',').map(p => p.trim());
        vtRua    = partes[0] || '';
        // Número pode ser 2ª parte numérica ou embutido na rua ("Rua X 123")
        if (partes[1] && /^\d/.test(partes[1])) {
            vtNumero = partes[1];
            vtBairro = vtBairro || partes[2] || '';
            const cidadeUF = partes[3] || '';
            if (cidadeUF.includes('-')) {
                const [cid, uf] = cidadeUF.split('-').map(x => x.trim());
                if (!vtCidade || vtCidade === 'Guarulhos') vtCidade = cid || vtCidade;
                if (!vtUF || vtUF === 'SP') vtUF = uf || vtUF;
            } else if (cidadeUF) {
                if (!vtCidade || vtCidade === 'Guarulhos') vtCidade = cidadeUF;
            }
            // CEP costuma ser a última parte numérica
            const cepParte = partes[partes.length - 1] || '';
            if (/\d{5}-?\d{3}/.test(cepParte) && !vtCEP) vtCEP = cepParte.match(/\d{5}-?\d{3}/)[0];
        } else {
            // Tenta extrair número embutido na string da rua: "Rua das Flores 123"
            const mNum = vtRua.match(/^(.+?)\s+(\d+[A-Za-z]?)$/);
            if (mNum) { vtRua = mNum[1]; vtNumero = mNum[2]; }
            vtBairro = vtBairro || partes[1] || '';
        }
    }

    // CEP: tenta extrair do campo endFull como fallback
    if (!vtCEP && endFull) {
        const mCEP = endFull.match(/\d{5}-?\d{3}/);
        if (mCEP) vtCEP = mCEP[0];
    }

    const modalId = 'modal-popup-vt';
    const prev = document.getElementById(modalId);
    if (prev) prev.remove();

    const el = document.createElement('div');
    el.id = modalId;
    el.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(15,23,42,0.75);display:flex;align-items:center;justify-content:center;padding:1rem;overflow-y:auto;';
    el.innerHTML = `
    <div style="background:#fff;border-radius:14px;width:100%;max-width:700px;box-shadow:0 25px 80px rgba(0,0,0,0.35);max-height:92vh;display:flex;flex-direction:column;">
      <!-- Header -->
      <div style="background:#0f172a;padding:1.1rem 1.5rem;border-radius:14px 14px 0 0;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;">
        <div style="display:flex;align-items:center;gap:10px;">
          <div style="width:36px;height:36px;background:rgba(245,3,197,0.2);border-radius:9px;display:flex;align-items:center;justify-content:center;">
            <i class="ph ph-bus" style="color:#f503c5;font-size:1.2rem;"></i>
          </div>
          <div>
            <h3 style="margin:0;color:#f1f5f9;font-size:1rem;font-weight:700;">Solicitação de Vale Transporte</h3>
            <p style="margin:0;color:#94a3b8;font-size:0.75rem;">${c.nome_completo || ''}</p>
          </div>
        </div>
        <button onclick="document.getElementById('${modalId}').remove()" style="background:rgba(255,255,255,0.1);border:none;color:#94a3b8;width:32px;height:32px;border-radius:8px;cursor:pointer;font-size:1.2rem;display:flex;align-items:center;justify-content:center;">&times;</button>
      </div>

      <!-- Body -->
      <div style="overflow-y:auto;flex:1;padding:1.5rem;">

        <!-- Opção VT -->
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:1.2rem;margin-bottom:1.2rem;">
          <p style="margin:0 0 0.8rem;font-weight:700;color:#334155;font-size:0.95rem;">O colaborador opta pela utilização do Vale Transporte?</p>
          <div style="display:flex;gap:2rem;">
            <label style="display:flex;align-items:center;gap:0.5rem;cursor:pointer;font-size:1rem;font-weight:600;color:#16a34a;">
              <input type="radio" name="vt-opcao" value="sim" id="vt-opcao-sim"
                onchange="document.getElementById('vt-secao-sim').style.display='block';document.getElementById('vt-secao-nao').style.display='none';">
              ✅ Sim — Opto pelo Vale Transporte
            </label>
            <label style="display:flex;align-items:center;gap:0.5rem;cursor:pointer;font-size:1rem;font-weight:600;color:#dc2626;">
              <input type="radio" name="vt-opcao" value="nao" id="vt-opcao-nao"
                onchange="document.getElementById('vt-secao-sim').style.display='none';document.getElementById('vt-secao-nao').style.display='block';">
              ❌ Não — Não opto pelo Vale Transporte
            </label>
          </div>
        </div>

        <!-- Seção SIM: endereço + linhas -->
        <div id="vt-secao-sim" style="display:none;">
          <!-- Endereço Residencial — oculto, preenchido automaticamente do cadastro -->
          <div style="display:none;">
            <input id="vt-end"    type="text" value="${vtRua}">
            <input id="vt-num"    type="text" value="${vtNumero}">
            <input id="vt-bairro" type="text" value="${vtBairro}">
            <input id="vt-cidade" type="text" value="${vtCidade}">
            <input id="vt-uf"     type="text" value="${vtUF}">
            <input id="vt-cep"    type="text" value="${vtCEP}">
            </div>
          </div>

          <!-- Linhas de Transporte Residência→Trabalho -->
          <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:1rem;margin-bottom:0.8rem;">
            <p style="margin:0 0 0.6rem;font-weight:700;color:#1d4ed8;font-size:0.9rem;">🚌 Residência → Trabalho</p>
            <table style="width:100%;border-collapse:collapse;font-size:0.85rem;">
              <thead><tr style="background:#dbeafe;">
                <th style="border:1px solid #bfdbfe;padding:5px 8px;text-align:center;width:40px;">#</th>
                <th style="border:1px solid #bfdbfe;padding:5px 8px;text-align:left;">Empresa Transportadora</th>
                <th style="border:1px solid #bfdbfe;padding:5px 8px;text-align:center;width:110px;">Tarifa R$</th>
              </tr></thead>
              <tbody id="vt-linhas-rt">
                ${[1,2,3,4,5,6].map(i => `<tr>
                  <td style="border:1px solid #bfdbfe;padding:4px 8px;text-align:center;color:#64748b;">${i}</td>
                  <td style="border:1px solid #bfdbfe;padding:3px 6px;"><input type="text" placeholder="Nome da linha/empresa" style="width:100%;border:none;outline:none;font-size:0.83rem;background:transparent;" id="vt-rt-emp-${i}"></td>
                  <td style="border:1px solid #bfdbfe;padding:3px 6px;"><input type="text" placeholder="0,00" style="width:100%;border:none;outline:none;font-size:0.83rem;background:transparent;text-align:center;" id="vt-rt-tar-${i}"></td>
                </tr>`).join('')}
              </tbody>
            </table>
          </div>

          <!-- Linhas de Transporte Trabalho→Residência -->
          <div style="background:#fdf4ff;border:1px solid #f0abfc;border-radius:10px;padding:1rem;">
            <p style="margin:0 0 0.6rem;font-weight:700;color:#c026d3;font-size:0.9rem;">🚌 Trabalho → Residência</p>
            <table style="width:100%;border-collapse:collapse;font-size:0.85rem;">
              <thead><tr style="background:#fae8ff;">
                <th style="border:1px solid #f0abfc;padding:5px 8px;text-align:center;width:40px;">#</th>
                <th style="border:1px solid #f0abfc;padding:5px 8px;text-align:left;">Empresa Transportadora</th>
                <th style="border:1px solid #f0abfc;padding:5px 8px;text-align:center;width:110px;">Tarifa R$</th>
              </tr></thead>
              <tbody id="vt-linhas-tr">
                ${[1,2,3,4,5,6].map(i => `<tr>
                  <td style="border:1px solid #f0abfc;padding:4px 8px;text-align:center;color:#64748b;">${i}</td>
                  <td style="border:1px solid #f0abfc;padding:3px 6px;"><input type="text" placeholder="Nome da linha/empresa" style="width:100%;border:none;outline:none;font-size:0.83rem;background:transparent;" id="vt-tr-emp-${i}"></td>
                  <td style="border:1px solid #f0abfc;padding:3px 6px;"><input type="text" placeholder="0,00" style="width:100%;border:none;outline:none;font-size:0.83rem;background:transparent;text-align:center;" id="vt-tr-tar-${i}"></td>
                </tr>`).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Seção NÃO -->
        <div id="vt-secao-nao" style="display:none;">
          <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:1.2rem;text-align:center;">
            <i class="ph ph-x-circle" style="font-size:2rem;color:#dc2626;"></i>
            <p style="margin:0.5rem 0 0;color:#b91c1c;font-weight:600;">O colaborador não optou pelo Vale Transporte.</p>
            <p style="margin:0.3rem 0 0;color:#64748b;font-size:0.85rem;">O documento será gerado com a opção "Não opto" marcada e enviado para assinatura.</p>
          </div>
        </div>

      </div><!-- /body -->

      <!-- Footer -->
      <div style="padding:1rem 1.5rem;background:#f8fafc;border-top:1px solid #e2e8f0;border-radius:0 0 14px 14px;display:flex;justify-content:flex-end;gap:0.75rem;flex-shrink:0;">
        <button onclick="document.getElementById('${modalId}').remove()" style="padding:0.6rem 1.4rem;background:#f1f5f9;border:1px solid #cbd5e1;border-radius:8px;cursor:pointer;font-weight:600;color:#475569;">Cancelar</button>
        <button id="vt-btn-gerar" onclick="window._gerarVTConfirmado('${geradorId}', '${geradorNome.replace(/'/g, "\\'")}')"
          style="padding:0.6rem 1.6rem;background:#9333ea;color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:700;display:flex;align-items:center;gap:6px;">
          <i class="ph ph-file-arrow-down"></i> Gerar Documento
        </button>
      </div>
    </div>`;

    document.body.appendChild(el);
};

window._gerarVTConfirmado = async function (geradorId, geradorNome) {
    const opcao = document.querySelector('input[name="vt-opcao"]:checked');
    if (!opcao) { alert('Selecione se o colaborador opta ou não pelo Vale Transporte.'); return; }

    const vtOpcao = opcao.value; // 'sim' | 'nao'
    const btn = document.getElementById('vt-btn-gerar');
    if (btn) { btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Gerando...'; btn.disabled = true; }

    const body = {
        colaborador_id: viewedColaborador.id,
        colabId: viewedColaborador.id,
        vt_opcao: vtOpcao,
        vt_endereco: document.getElementById('vt-end')?.value || '',
        vt_numero: document.getElementById('vt-num')?.value || '',
        vt_bairro: document.getElementById('vt-bairro')?.value || '',
        vt_cidade: document.getElementById('vt-cidade')?.value || 'Guarulhos',
        vt_uf: document.getElementById('vt-uf')?.value || 'SP',
        vt_cep: document.getElementById('vt-cep')?.value || '',
    };

    // Montar linhas RT e TR
    const rt = [], tr = [];
    for (let i = 1; i <= 6; i++) {
        const empRT = document.getElementById(`vt-rt-emp-${i}`)?.value || '';
        const tarRT = document.getElementById(`vt-rt-tar-${i}`)?.value || '';
        rt.push({ empresa: empRT, tarifa: tarRT });
        const empTR = document.getElementById(`vt-tr-emp-${i}`)?.value || '';
        const tarTR = document.getElementById(`vt-tr-tar-${i}`)?.value || '';
        tr.push({ empresa: empTR, tarifa: tarTR });
    }
    body.vt_linhas_rt = JSON.stringify(rt);
    body.vt_linhas_tr = JSON.stringify(tr);

    try {
        const res = await fetch(`${API_URL}/geradores/${geradorId}/gerar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${currentToken}` },
            body: JSON.stringify(body)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro ao gerar documento');

        // Fecha popup VT
        const modalVT = document.getElementById('modal-popup-vt');
        if (modalVT) modalVT.remove();

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
                    <button id="btn-anexar-prontuario" class="btn" onclick="window.anexarAoProntuarioPerfil(this)"
                        style="background:#7c3aed;color:#fff;border-color:#7c3aed;display:inline-flex;align-items:center;gap:6px;font-weight:600;">
                        <i class="ph ph-paperclip"></i> Anexar ao Prontuário
                    </button>
                `;
            }
        }, 150);
    } catch (e) {
        if (btn) { btn.innerHTML = '<i class="ph ph-file-arrow-down"></i> Gerar Documento'; btn.disabled = false; }
        Swal.fire('Erro', e.message, 'error');
    }
};

window.previewContratoPerfilAssinado = async function (geradorId, geradorNome) {
    // ── Intercepção especial para Solicitação de VT ────────────────────────────
    if ((geradorNome || '').toLowerCase().includes('solicita') && (geradorNome || '').toLowerCase().includes('vt')) {
        window._abrirPopupVT(geradorId, geradorNome);
        return;
    }

    // ─────────────────────────────────────────────────────────────────────────
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
                    <button id="btn-anexar-prontuario" class="btn" onclick="window.anexarAoProntuarioPerfil(this)"
                        style="background:#7c3aed;color:#fff;border-color:#7c3aed;display:inline-flex;align-items:center;gap:6px;font-weight:600;">
                        <i class="ph ph-paperclip"></i> Anexar ao Prontuário
                    </button>
                `;
            }
        }, 150);

    } catch (e) {
        Swal.fire('Erro', e.message, 'error');
    }
};

window.fecharPreviewEHabitarEnvio = function () {
    const elModal = document.getElementById('modal-preview-doc') || document.getElementById('doc-modal');
    if (elModal) elModal.style.display = 'none';

    const gId = window._perfilGeradorIdCtx;
    if (!gId) return;

    const actionDiv = document.getElementById('pg-action-' + gId);
    if (actionDiv) {
        actionDiv.innerHTML = `
            <button class="btn btn-primary" style="margin:0;cursor:pointer;display:inline-flex;align-items:center;gap:6px;font-size:0.95rem;font-weight:500;padding:0.55rem 1.25rem;border-radius:8px;background:#0056b3;border-color:#0056b3;color:#fff;transition:all 0.2s;"
                onclick="window.enviarAssinaturaPerfilDireto(event)">
                <i class="ph ph-paper-plane-tilt"></i> Enviar para Assinatura
            </button>
        `;
    }
};

// Anexar ao Prontuário direto do preview (com assinatura pendente)
// Salva o PDF como 'Pendente', fecha o preview e mostra o botão "Enviar para Assinatura"
window.anexarAoProntuarioPerfil = async function (btn) {
    const geradorId = window._perfilGeradorIdCtx;
    const geradorNome = window._perfilGeradorNomeCtx;
    if (!geradorId || !viewedColaborador) return;

    const origHtml = btn.innerHTML;
    btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Salvando...';
    btn.disabled = true;

    try {
        const previewContent = document.querySelector('#modal-preview-doc #preview-doc-body') ||
            document.querySelector('#doc-modal .preview-content');
        if (!previewContent) throw new Error('Conteúdo do preview não encontrado. Feche e gere novamente.');

        const pdfBlob = await window.gerarPDFBlob(previewContent);
        const safeName = (geradorNome || 'documento').replace(/[^a-zA-Z0-9À-� _-]/g, '');
        const colabNome = (viewedColaborador.nome_completo || viewedColaborador.id).toString();

        const formData = new FormData();
        formData.append('file', pdfBlob, `Outros_${safeName}_${colabNome}.pdf`);
        formData.append('tab_name', 'CONTRATOS_AVULSOS');
        formData.append('document_type', geradorNome);
        formData.append('gerador_id', geradorId);
        formData.append('colaborador_id', viewedColaborador.id);
        formData.append('colaborador_nome', colabNome);
        // Pendente = documento gerado aguardando envio para assinatura (sem assinafy_id ainda)
        formData.append('assinafy_status', 'Pendente');

        const r = await fetch(`${API_URL}/documentos?colaborador_id=${viewedColaborador.id}`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${currentToken}` },
            body: formData
        });
        if (!r.ok) {
            const errData = await r.json().catch(() => ({}));
            throw new Error(errData.error || 'Falha ao salvar');
        }
        const savedDoc = await r.json().catch(() => ({}));
        const savedDocId = savedDoc.id || null;

        // Fechar preview
        const elModal = document.getElementById('modal-preview-doc') || document.getElementById('doc-modal');
        if (elModal) elModal.style.display = 'none';

        if (typeof showToast !== 'undefined') showToast('Documento salvo! Clique em "Enviar para Assinatura".', 'success');

        await window._reloadContratosContainer();

    } catch (e) {
        Swal.fire('Erro', e.message, 'error');
        btn.innerHTML = origHtml;
        btn.disabled = false;
    }
};

// Enviar para assinatura um doc já salvo no banco (Pendente, sem assinafy_id)
// docId pode ser o document_id real (quando vindo de anexarAoProntuarioPerfil)
// ou o gerador_id como fallback (fluxo antigo)
window.enviarAssinaturaDocSalvo = async function (docId, geradorNome) {
    const colabId = viewedColaborador?.id;
    if (!colabId || !docId) return;
    const btn = document.querySelector(`[onclick*="enviarAssinaturaDocSalvo(${docId},"]`) ||
        document.querySelector(`[onclick*="enviarAssinaturaDocSalvo(${docId}, "]`);
    const origHtml = btn ? btn.innerHTML : '';
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Enviando...'; }
    try {
        // Usa /api/assinafy/upload com o document_id real, igual ao fluxo de reenvio.
        // Isso garante que o documento correto (CONTRATOS_AVULSOS) recebe o assinafy_id.
        const res = await fetch(API_URL + '/assinafy/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + currentToken },
            body: JSON.stringify({ document_id: Number(docId), colaborador_id: Number(colabId) })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Erro ao enviar para assinatura');

        if (typeof showToast !== 'undefined') showToast('Documento enviado para assinatura!', 'success');
        // Recarrega para refletir o novo status do banco (assinafy_id preenchido → estado "Aguardando")
        await window._reloadContratosContainer();
    } catch (e) {
        Swal.fire('Erro ao enviar', e.message, 'error');
        if (btn) { btn.disabled = false; btn.innerHTML = origHtml; }
    }
};



window.enviarAssinaturaPerfilDireto = async function (event) {
    const geradorId = window._perfilGeradorIdCtx;
    const geradorNome = window._perfilGeradorNomeCtx;
    if (!geradorId) return;

    let targetBtn = null;
    let originalHtml = '';
    if (event && event.currentTarget) {
        targetBtn = event.currentTarget;
        originalHtml = targetBtn.innerHTML;
        targetBtn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Enviando...';
        targetBtn.disabled = true;
    }

    try {
        const previewContent = document.querySelector('#modal-preview-doc #preview-doc-body') || document.querySelector('#doc-modal .preview-content');
        if (!previewContent) throw new Error('Conteúdo do formulário foi perdido. Tente gerar novamente.');

        const pdfBlob = await window.gerarPDFBlob(previewContent);
        const safeName = (geradorNome || 'documento').replace(/[^a-zA-Z0-9À-� _-]/g, '');
        const colabId = viewedColaborador?.id || '';
        const colabNome = (viewedColaborador?.nome_completo || colabId).toString();

        const formData = new FormData();
        formData.append('file', pdfBlob, `${safeName}_${colabNome}.pdf`);
        formData.append('tab_name', 'CONTRATOS_AVULSOS');
        formData.append('document_type', geradorNome);
        formData.append('gerador_id', geradorId);
        formData.append('colaborador_id', colabId);
        formData.append('assinafy_status', 'Pendente');

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

        Swal.fire({ title: 'Enviado com sucesso!', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000, icon: 'success' });

        if (targetBtn && targetBtn.parentElement) {
            const dtStr = new Date().toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).replace(',', ' -');
            const txt = document.getElementById('perfil-status-txt-' + geradorId);
            if (txt) {
                txt.innerHTML = '<div style="display:flex; flex-direction:column; gap:2px;"><span style="color:#2563eb;font-weight:600;"><i class="ph ph-paper-plane-tilt"></i> Enviado para Assinatura</span><span style="font-size:0.75rem;color:#64748b;margin-left:22px;">' + dtStr + '</span></div>';
            }
            targetBtn.parentElement.innerHTML = '<span style="color:#16a34a;font-weight:600;"><i class="ph ph-check"></i> OK</span>';
        }

        await window._reloadContratosContainer();

    } catch (e) {
        Swal.fire('Erro ao enviar', e.message, 'error');
        if (targetBtn) { targetBtn.innerHTML = originalHtml; targetBtn.disabled = false; }
    }
};

window.uploadContratoExterno = async function (input) {
    const file = input.files[0];
    if (!file || !viewedColaborador) return;
    input.value = '';

    const modalResult = await Swal.fire({
        title: '<i class="ph ph-file-plus"></i> Anexar Contrato',
        html: `
            <div style="text-align:left;display:flex;flex-direction:column;gap:1.2rem;padding:0.25rem 0;">
                <div>
                    <label style="font-size:0.85rem;font-weight:700;color:#374151;display:block;margin-bottom:6px;">Nome do Documento</label>
                    <input id="swal-doctype" class="swal2-input" style="margin:0;width:100%;box-sizing:border-box;" placeholder="Ex: Acordo de Confidencialidade">
                </div>
                <div>
                    <label style="font-size:0.85rem;font-weight:700;color:#374151;display:block;margin-bottom:6px;">Exige assinatura do colaborador?</label>
                    <div style="display:flex; gap:1.5rem;">
                        <label style="display:flex; align-items:center; gap:0.4rem; cursor:pointer; font-size:0.9rem;">
                            <input type="radio" name="swal-assinatura" value="sim" style="width:16px;height:16px;accent-color:#2563eb;"> Sim
                        </label>
                        <label style="display:flex; align-items:center; gap:0.4rem; cursor:pointer; font-size:0.9rem;">
                            <input type="radio" name="swal-assinatura" value="nao" checked style="width:16px;height:16px;accent-color:#2563eb;"> Não
                        </label>
                    </div>
                </div>
            </div>`,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: '<i class="ph ph-upload-simple"></i> Anexar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#2563eb',
        showLoaderOnConfirm: true,
        allowOutsideClick: function () { return !Swal.isLoading(); },
        didOpen: function () {
            var dtInput = document.getElementById('swal-doctype');
            if (dtInput) dtInput.value = file.name.replace(/\.pdf$/i, '').substring(0, 60);
        },
        preConfirm: async function () {
            var docType = (document.getElementById('swal-doctype') || {}).value;
            if (docType) docType = docType.trim();
            if (!docType) { Swal.showValidationMessage('Informe o nome do documento'); return false; }

            var reqAssinatura = document.querySelector('input[name="swal-assinatura"]:checked').value;

            var formData = new FormData();
            formData.append('file', file);
            formData.append('tab_name', 'CONTRATOS_AVULSOS');
            formData.append('document_type', docType);
            formData.append('colaborador_id', viewedColaborador.id);
            formData.append('colaborador_nome', viewedColaborador.nome_completo || '');
            formData.append('assinafy_status', reqAssinatura === 'sim' ? 'Pendente' : 'NAO_EXIGE');

            try {
                var res = await fetch(API_URL + '/documentos', {
                    method: 'POST',
                    headers: { 'Authorization': 'Bearer ' + currentToken },
                    body: formData
                });
                var data = await res.json().catch(function () { return {}; });
                if (!res.ok) throw new Error(data.error || 'Falha ao anexar PDF');

                if (reqAssinatura === 'sim') {
                    const assRes = await fetch(API_URL + '/assinafy/upload', {
                        method: 'POST',
                        headers: {
                            'Authorization': 'Bearer ' + currentToken,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ document_id: data.id, colaborador_id: viewedColaborador.id })
                    });
                    const assData = await assRes.json().catch(e => ({}));
                    if (!assRes.ok) throw new Error(assData.error || 'Falha ao enviar para o Assinafy');

                    const dt = new Date();
                    const horaEnvio = dt.toLocaleDateString() + ' às ' + dt.toLocaleTimeString();
                    return { action: 'assinatura', horaEnvio: horaEnvio };
                } else {
                    return { action: 'anexado' };
                }
            } catch (err) {
                Swal.showValidationMessage(err.message);
                return false;
            }
        }
    });

    if (modalResult.isConfirmed) {
        const res = modalResult.value;
        if (res && res.action === 'assinatura') {
            Swal.fire('Sucesso!', `Documento anexado e enviado para assinatura em ${res.horaEnvio}`, 'success');
        } else {
            if (typeof showToast !== 'undefined') showToast('Documento anexado no Prontuário!', 'success');
        }
        await window._reloadContratosContainer();
    }
};

// Upload com tipo de documento pré-definido (ex: Ficha de Registro, NR1 - não gerados por template)
window.uploadContratoExternoComTipo = async function (input, docType, tabName) {
    const file = input.files[0];
    if (!file || !viewedColaborador) return;
    input.value = '';

    var tabToSave = tabName || 'CONTRATOS_AVULSOS';

    var formData = new FormData();
    formData.append('file', file);
    formData.append('tab_name', tabToSave);
    formData.append('document_type', docType);
    formData.append('colaborador_id', viewedColaborador.id);
    formData.append('colaborador_nome', viewedColaborador.nome_completo || '');
    formData.append('assinafy_status', 'NAO_EXIGE');

    try {
        var res = await fetch(API_URL + '/documentos', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + currentToken },
            body: formData
        });
        var data = await res.json().catch(function () { return {}; });
        if (!res.ok) throw new Error(data.error || 'Falha ao anexar PDF');
        if (typeof showToast !== 'undefined') showToast(docType + ' anexado com sucesso!', 'success');
        // Recarregar a aba correta após upload
        await loadDocumentosList();
        if (tabName && tabName !== 'CONTRATOS_AVULSOS') {
            if (typeof window.renderTabContent === 'function') {
                window.renderTabContent(tabName, tabName, true);
            }
        } else {
            await window._reloadContratosContainer();
        }
    } catch (err) {
        alert('Erro: ' + err.message);
    }
};

window.openContratoViewerById = function (docId, nomeDoc) {
    var token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token') || '';
    if (!token) { alert('Sessão expirada. Faça login novamente.'); return; }
    var pdfUrl = API_URL + '/documentos/view/' + docId + '?token=' + encodeURIComponent(token);
    window.openContratoViewerPopup(pdfUrl, nomeDoc);
};

window.openContratoViewerPopup = function (pdfUrl, nomeDoc) {
    if (!pdfUrl || pdfUrl.endsWith('undefined')) { alert('URL do documento não encontrada.'); return; }
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
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:#0f172a;z-index:999999;display:flex;flex-direction:column;overflow:hidden;';

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
    info.appendChild(titleEl); info.appendChild(subEl); left.appendChild(info);

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
    closeBtn.onclick = function () { overlay.remove(); };
    right.appendChild(dlBtn); right.appendChild(closeBtn);
    header.appendChild(left); header.appendChild(right);

    var content = document.createElement('div');
    content.style.cssText = 'flex:1;position:relative;background:#525659;overflow:hidden;';
    var loading = document.createElement('div');
    loading.id = 'cv-fs-loading';
    loading.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#fff;gap:0.75rem;z-index:1;';
    loading.innerHTML = '<i class="ph ph-circle-notch ph-spin" style="font-size:3rem;color:#6366f1;"></i><span style="font-weight:600;">Carregando documento...</span>';
    var iframe = document.createElement('iframe');
    iframe.src = finalUrl;
    iframe.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;border:none;z-index:2;';
    iframe.onload = function () { var l = document.getElementById('cv-fs-loading'); if (l) l.style.display = 'none'; };
    content.appendChild(loading); content.appendChild(iframe);
    overlay.appendChild(header); overlay.appendChild(content);
    document.body.appendChild(overlay);

    var onEsc = function (e) { if (e.key === 'Escape') { overlay.remove(); document.removeEventListener('keydown', onEsc); } };
    document.addEventListener('keydown', onEsc);
};

window.reenviarAssinaturaContrato = async function (docId, ev) {
    if (ev) ev.stopPropagation();
    if (!confirm('Confirmar envio deste documento para assinatura digital?')) return;
    let trBtn = null, ogHtml = '';
    try {
        trBtn = ev ? ev.currentTarget : null;
        if (trBtn) { ogHtml = trBtn.innerHTML; trBtn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Aguarde...'; trBtn.disabled = true; }

        let targetColabId = (viewedColaborador && viewedColaborador.id) ? viewedColaborador.id : window.lastColaboradorId;
        if (!targetColabId) throw new Error('Não foi possível identificar o colaborador atual.');

        const res = await fetch(`${API_URL}/assinafy/upload`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + (window.currentToken || localStorage.getItem('token')) },
            body: JSON.stringify({ document_id: Number(docId), colaborador_id: targetColabId })
        });
        const data = await res.json().catch(() => ({}));
        if (trBtn) { trBtn.innerHTML = ogHtml; trBtn.disabled = false; }
        if (res.ok) {
            if (typeof showToast !== 'undefined') showToast('E-mail de assinatura enviado ao colaborador!', 'success');
            await window._reloadContratosContainer();
        } else {
            throw new Error(data.error || 'Erro ao reenviar assinatura');
        }
    } catch (err) {
        if (trBtn) { trBtn.innerHTML = ogHtml; trBtn.disabled = false; }
        if (typeof showToast !== 'undefined') showToast(err.message, 'error');
        else alert(err.message);
    }
};

window.buildContratosSignatureRows = function (assinaturas, docs, colab) {
    docs = Array.isArray(docs) ? docs : [];
    if (docs.length === 0) {
        return '';
    }

    let html = '';
    docs.forEach(doc => {
        let realStatus = 'Não enviado';
        if (doc.assinafy_status === 'Assinado') realStatus = 'Assinado';
        // 'Pendente' SEM assinafy_id = doc salvo localmente, nunca enviado ao Assinafy (1ª vez)
        // 'Pendente' COM assinafy_id = enviado, aguardando assinatura
        // 'Aguardando' = confirmado no Assinafy
        else if (doc.assinafy_status === 'Pendente' && !doc.assinafy_id) realStatus = 'ProntoParaEnviar';
        else if (doc.assinafy_status === 'Pendente' || doc.assinafy_status === 'Aguardando') realStatus = 'Aguardando';

        const isSigned = (realStatus === 'Assinado');
        const isPending = (realStatus === 'Aguardando');
        const isPronto = (realStatus === 'ProntoParaEnviar');
        const literallyNaoExige = (doc.assinafy_status === 'NAO_EXIGE');
        const requiresButNotSent = (!isSigned && !isPending && !isPronto && !literallyNaoExige);

        const _docName = (doc.document_type || doc.file_name || 'Documento Avulso');
        const _docTitle = _docName.replace(/_/g, ' ');

        const formatDate = (str) => {
            if (!str) return '';
            const d = new Date(str.includes('T') ? str : str + 'Z');
            if (isNaN(d.getTime())) return '';
            return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()} - ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
        };

        const _uploadStr = formatDate(doc.upload_date || doc.created_at);
        const _sentStr = formatDate(doc.assinafy_sent_at || doc.upload_date);
        const _signedStr = formatDate(doc.assinafy_signed_at || doc.upload_date);

        let statusBadge = '', leftIconMarkup = '', sendBtn = '', actionUX = '';
        const borderBgColor = isSigned
            ? 'border:1px solid #bbf7d0; background:#f0fdf4;'
            : isPending
                ? 'border:1px solid #bfdbfe; background:#eff6ff;'
                : isPronto
                    ? 'border:1px solid #ddd6fe; background:#f5f3ff;'
                    : literallyNaoExige
                        ? 'border:1px solid #e9d5ff; background:#faf5ff;'
                        : 'border:1px solid #fde047; background:#fefce8;';

        if (isSigned) {
            leftIconMarkup = `<div style="display:flex;align-items:center;justify-content:center;width:24px;color:#16a34a;"><i class="ph ph-check-circle" style="font-size:1.4rem;"></i></div>`;
            statusBadge = `<span style="color:#16a34a;font-size:0.75rem;font-weight:600;">Documento Assinado${_signedStr ? ': ' + _signedStr : ''}</span>`;
        } else if (isPending) {
            leftIconMarkup = `<div style="display:flex;align-items:center;justify-content:center;width:24px;color:#2563eb;"><i class="ph ph-paper-plane-tilt" style="font-size:1.4rem;"></i></div>`;
            statusBadge = `<div style="display:flex;flex-direction:column;gap:2px;"><span style="color:#2563eb;font-size:0.75rem;font-weight:600;">Enviado para Assinatura</span>${_sentStr ? '<span style="font-size:0.65rem;color:#64748b;">' + _sentStr + '</span>' : ''}</div>`;
            sendBtn = `<button type="button" onclick="window.reenviarAssinaturaContrato(${doc.id}, event);" style="background:#0284c7;color:#fff;border:none;border-radius:6px;padding:6px 14px;font-size:0.8rem;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:6px;"><i class="ph ph-pen"></i> Reenviar para Assinatura</button>`;
        } else if (isPronto) {
            // Documento salvo localmente (Pendente sem assinafy_id) — aguardando envio ao Assinafy
            const gerDocId = doc.gerador_id || '';
            const escNomeDoc = (doc.document_type || '').replace(/'/g, "\\'");
            leftIconMarkup = `<div data-role="status-icon" style="display:flex;align-items:center;justify-content:center;width:24px;color:#7c3aed;"><i class="ph ph-paperclip" style="font-size:1.4rem;"></i></div>`;
            statusBadge = `<span data-role="status-badge" style="color:#7c3aed;font-size:0.75rem;font-weight:600;">Documento salvo — clique em Enviar para Assinatura${_uploadStr ? ': ' + _uploadStr : ''}</span>`;
            sendBtn = `<button type="button" onclick="window.enviarDocumentoAvulsoAssinatura('${doc.id}', this)" style="background:#0056b3;color:#fff;border:none;border-radius:6px;padding:6px 14px;font-size:0.8rem;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:6px;"><i class="ph ph-paper-plane-tilt"></i> Enviar para Assinatura</button>`;
        } else if (literallyNaoExige) {
            leftIconMarkup = `<div style="display:flex;align-items:center;justify-content:center;width:24px;color:#9333ea;"><i class="ph ph-file-text" style="font-size:1.4rem;"></i></div>`;
            statusBadge = `<span style="color:#9333ea;font-size:0.75rem;font-weight:600;">Documento anexado${_uploadStr ? ': ' + _uploadStr : ''}</span>`;
        } else {
            leftIconMarkup = `<div style="display:flex;align-items:center;justify-content:center;width:24px;color:#eab308;"><i class="ph ph-info" style="font-size:1.4rem;"></i></div>`;
            statusBadge = `<span style="color:#eab308;font-size:0.75rem;font-weight:600;">Documento anexado${_uploadStr ? ': ' + _uploadStr : ''}</span>`;
            const escNome = _docName.replace(/'/g, "\\'");
            actionUX = `
                <div style="display:flex; align-items:center; gap:0.75rem; border-left: 1px solid #fde047; padding-left: 1rem; margin-right:5px;">
                    <span style="font-size:0.85rem; font-weight:600; color:#334155;">Exige Assinatura?</span>
                    <label style="cursor:pointer; display:flex; align-items:center; gap:0.25rem; font-size:0.85rem; color:#0f172a; margin:0;">
                        <input type="radio" name="req-ass-doc-${doc.id}" value="sim" onchange="window.toggleAcaoDocumentoAvulso('${doc.id}', 'sim', '${escNome}')"> Sim
                    </label>
                    <label style="cursor:pointer; display:flex; align-items:center; gap:0.25rem; font-size:0.85rem; color:#0f172a; margin:0;">
                        <input type="radio" name="req-ass-doc-${doc.id}" value="nao" onchange="window.toggleAcaoDocumentoAvulso('${doc.id}', 'nao', '${escNome}')"> Não
                    </label>
                </div>
                <div id="pg-action-doc-${doc.id}" style="min-width: 160px; text-align: right; display: flex; justify-content: flex-end;">
                    <span style="font-size:0.8rem; color:#64748b; font-style:italic;">Selecione uma opção</span>
                </div>
            `;
        }

        const eyeBtn = `<button onclick="window.openContratoViewerById(${doc.id})" style="border:none;background:none;cursor:pointer;color:#64748b;" title="Visualizar Documento"><i class="ph ph-eye" style="font-size:1.4rem;"></i></button>`;
        const delBtn = `<button onclick="window.excluirContratoComSenha(${doc.id}, 'documento')" style="border:none;background:none;cursor:pointer;color:#dc2626;" title="Excluir Contrato"><i class="ph ph-trash" style="font-size:1.4rem;"></i></button>`;

        html += `
        <div class="doc-check-item" style="display:flex; align-items:center; gap:0.6rem; padding:1.1rem 1.25rem; ${borderBgColor}; border-radius:8px; cursor:default; box-shadow:0 1px 2px rgba(0,0,0,0.03); transition:all 0.2s; justify-content:space-between; margin-bottom:12px;">
            <div style="display:flex; align-items:center; gap:12px; flex:1;">
                ${leftIconMarkup}
                <div style="display:flex; flex-direction:column; gap:2px;">
                    <span style="font-size:0.95rem; font-weight:700; color:#0f172a; margin-bottom:2px;">${_docTitle.toUpperCase()}</span>
                    ${statusBadge}
                    ${doc.file_name ? `<span style="font-size:0.72rem;color:#94a3b8;margin-top:1px;"><i class="ph ph-file"></i> ${doc.file_name}</span>` : ''}
                </div>
            </div>
            <div style="display:flex; align-items:center; gap:12px;">
                ${actionUX}
                ${sendBtn}
                ${delBtn}
                ${eyeBtn}
            </div>
        </div>`;
    });
    return html;
};

// Excluir contrato com proteção por senha (funciona para assinados e não-assinados)
window.excluirContratoComSenha = async function (docId, tipo) {
    const senha = prompt('⚠️ Esta ação é irreversível.\n\nDigite a senha para excluir o contrato:');
    if (senha === null) return; // cancelado
    if (senha !== 'EXc2499!') {
        alert('Senha incorreta. Exclusão cancelada.');
        return;
    }
    if (!confirm('Confirmar exclusão do contrato? Esta ação não pode ser desfeita.')) return;

    try {
        let res;
        if (tipo === 'admissao') {
            // Exclui da tabela admissao_assinaturas via endpoint próprio
            res = await fetch(`${API_URL}/admissao-assinaturas/${docId}`, {
                method: 'DELETE',
                headers: { 'Authorization': 'Bearer ' + currentToken }
            });
        } else {
            // Exclui da tabela documentos
            res = await fetch(`${API_URL}/documentos/${docId}`, {
                method: 'DELETE',
                headers: { 'Authorization': 'Bearer ' + currentToken }
            });
        }
        if (res.ok) {
            if (typeof showToast !== 'undefined') showToast('Contrato excluído com sucesso.', 'success');
            await window._reloadContratosContainer();
        } else {
            const d = await res.json().catch(() => ({}));
            alert('Erro ao excluir: ' + (d.error || res.statusText));
        }
    } catch (e) {
        alert('Erro ao excluir: ' + e.message);
    }
};

window.toggleAcaoDocumentoAvulso = function (docId, exige, docType) {
    const actionDiv = document.getElementById('pg-action-doc-' + docId);
    if (!actionDiv) return;
    if (exige === 'nao') {
        actionDiv.innerHTML = `
            <label class="btn btn-warning btn-sm" style="margin:0;cursor:pointer;display:inline-flex;align-items:center;gap:4px;font-size:0.85rem;background:#eab308;color:#fff;border:none;padding:0.4rem 1rem;border-radius:6px;font-weight:600;">
                <i class="ph ph-upload-simple"></i> Anexar PDF
                <input type="file" accept=".pdf" style="display:none;" onchange="window.uploadContratoAvulsoSobrescrever(this, '${docId}', '${docType}')">
            </label>
        `;
    } else {
        actionDiv.innerHTML = `
            <button type="button" class="btn btn-primary btn-sm" style="margin:0;cursor:pointer;display:inline-flex;align-items:center;gap:4px;font-size:0.85rem;background:#0284c7;color:#fff;border:none;padding:0.4rem 1rem;border-radius:6px;font-weight:600;"
                onclick="window.enviarDocumentoAvulsoAssinatura('${docId}', this)">
                <i class="ph ph-paper-plane-tilt"></i> Enviar p/ Assinatura
            </button>
        `;
    }
};

window.enviarDocumentoAvulsoAssinatura = async function (docId, btn) {
    if (!docId || !viewedColaborador) return;
    const oldHtml = btn ? btn.innerHTML : null;
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Enviando...'; }
    try {
        const res = await fetch(API_URL + '/assinafy/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + currentToken },
            body: JSON.stringify({ document_id: Number(docId), colaborador_id: viewedColaborador.id })
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
            if (typeof showToast !== 'undefined') showToast('Documento enviado para assinatura!', 'success');

            // Usa os dados da resposta para atualizar a UI imediatamente (sem depender do reload)
            const sentAt = data.assinafy_sent_at ? new Date(data.assinafy_sent_at) : new Date();
            const fmt = `${String(sentAt.getDate()).padStart(2, '0')}/${String(sentAt.getMonth() + 1).padStart(2, '0')}/${sentAt.getFullYear()} - ${String(sentAt.getHours()).padStart(2, '0')}:${String(sentAt.getMinutes()).padStart(2, '0')}`;

            // Atualiza o card diretamente no DOM usando data-role (imune à normalização de estilos do browser)
            const card = btn ? btn.closest('.doc-check-item') : null;
            if (card) {
                // Borda e fundo: azul
                card.style.border = '1px solid #bfdbfe';
                card.style.background = '#eff6ff';

                // Ícone: paperclip → avião (usa data-role para seleção confiável)
                const iconWrap = card.querySelector('[data-role="status-icon"]');
                if (iconWrap) iconWrap.innerHTML = '<i class="ph ph-paper-plane-tilt" style="font-size:1.4rem;color:#2563eb;"></i>';

                // Status badge (usa data-role para seleção confiável)
                const statusEl = card.querySelector('[data-role="status-badge"]');
                if (statusEl) {
                    statusEl.style.color = '#2563eb';
                    statusEl.innerHTML = `<div style="display:flex;flex-direction:column;gap:2px;"><span style="font-weight:600;">Enviado para Assinatura</span><span style="font-size:0.65rem;color:#64748b;">${fmt}</span></div>`;
                }

                // Troca botão por "Reenviar"
                if (btn && btn.parentElement) {
                    const reenviarBtn = document.createElement('button');
                    reenviarBtn.type = 'button';
                    reenviarBtn.onclick = function (e) { window.reenviarAssinaturaContrato(docId, e); };
                    reenviarBtn.style.cssText = 'background:#0284c7;color:#fff;border:none;border-radius:6px;padding:6px 14px;font-size:0.8rem;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:6px;';
                    reenviarBtn.innerHTML = '<i class="ph ph-pen"></i> Reenviar para Assinatura';
                    btn.parentElement.replaceChild(reenviarBtn, btn);
                }
            }
            // Nota: NÃO recarrega aqui — novo_processo demora 3s+ e reload antecipado reverte UI.
            // O interval de 30s sincroniza com o DB após o processo completar.
            window._syncContratosRunning = false;
        } else {
            Swal.fire('Atenção', 'Erro no envio para assinar: ' + (data.error || 'Erro desconhecido'), 'warning');
            if (btn) { btn.disabled = false; btn.innerHTML = oldHtml; }
        }
    } catch (err) {
        Swal.fire('Erro', err.message, 'error');
        if (btn) { btn.disabled = false; btn.innerHTML = oldHtml; }
    }
};

window.uploadContratoAvulsoSobrescrever = async function (input, docId, docType) {
    const file = input.files[0];
    if (!file || !viewedColaborador) return;
    Swal.fire({ title: 'Sobrescrevendo...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('tab_name', 'CONTRATOS_AVULSOS');
        formData.append('document_type', docType);
        formData.append('colaborador_id', viewedColaborador.id);
        formData.append('colaborador_nome', viewedColaborador.nome_completo || '');
        formData.append('assinafy_status', 'NAO_EXIGE');
        formData.append('document_id', docId);

        const resUpload = await fetch(API_URL + '/documentos', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + currentToken },
            body: formData
        });
        if (!resUpload.ok) throw new Error('Falha no upload do arquivo');
        Swal.close();
        if (typeof showToast !== 'undefined') showToast('Documento anexado no Prontuário!', 'success');
        await window._reloadContratosContainer();
    } catch (err) {
        Swal.close();
        Swal.fire('Erro', err.message, 'error');
    }
};

// === MODAL GERAR NOVO CONTRATO ===
window.abrirModalGerarContrato = function () {
    const geradores = window._caAvailableGeradores || [];
    document.getElementById('modal-contrato-avulso')?.remove();
    const overlay = document.createElement('div');
    overlay.id = 'modal-contrato-avulso';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;padding:1rem;';
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
                            readonly onfocus="this.removeAttribute('readonly'); window._openGeradorDropdown()" onblur="this.setAttribute('readonly', 'readonly')"
                            style="width:100%;padding:0.65rem 2.2rem 0.65rem 0.75rem;border:1.5px solid #e2e8f0;border-radius:8px;font-size:0.9rem;box-sizing:border-box;outline:none;"
                            oninput="window._filterGeradorDropdown(this.value)"
                        >
                        <i class="ph ph-caret-down" style="position:absolute;right:0.65rem;top:50%;transform:translateY(-50%);color:#94a3b8;pointer-events:none;"></i>
                        <input type="hidden" id="ca-gerador-select" value="">
                        <div id="ca-gerador-dropdown"
                             style="display:none;position:absolute;top:calc(100% + 4px);left:0;right:0;background:#fff;border:1.5px solid #e2e8f0;border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,0.12);max-height:220px;overflow-y:auto;z-index:99999;">
                        </div>
                    </div>
                </div>
                <!-- CAMPOS EXTRAS PARA DESCONTO -->
                <div id="ca-extra-fields-desconto" style="display:none; padding:1rem; background:#f8fafc; border:1px dashed #cbd5e1; border-radius:8px;">
                    <div style="font-weight:600; font-size:0.85rem; color:#0f172a; margin-bottom:0.75rem;"><i class="ph ph-receipt"></i> Detalhes do Desconto</div>
                    <div style="display:flex; flex-direction:column; gap:0.6rem;">
                        <div>
                            <label style="font-size:0.75rem;font-weight:600;color:#475569;">Descrição do Desconto</label>
                            <input type="text" id="ca-desconto-descricao" placeholder="Ex: Multa de Trânsito..." style="width:100%;padding:0.5rem;border:1px solid #cbd5e1;border-radius:6px;font-size:0.85rem;">
                        </div>
                        <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.5rem;">
                            <div>
                                <label style="font-size:0.75rem;font-weight:600;color:#475569;">Valor Total (R$)</label>
                                <input type="text" id="ca-desconto-valor" placeholder="0,00" onkeyup="window.calcParcelaDescontoCA()" style="width:100%;padding:0.5rem;border:1px solid #cbd5e1;border-radius:6px;font-size:0.85rem;">
                            </div>
                            <div>
                                <label style="font-size:0.75rem;font-weight:600;color:#475569;">Qtd. Parcelas</label>
                                <input type="number" id="ca-desconto-parcelas" value="1" min="1" onchange="window.calcParcelaDescontoCA()" onkeyup="window.calcParcelaDescontoCA()" style="width:100%;padding:0.5rem;border:1px solid #cbd5e1;border-radius:6px;font-size:0.85rem;">
                            </div>
                        </div>
                        <div id="ca-desconto-valor-parcelamento" style="font-size:0.8rem;font-weight:700;color:#2563eb;margin-top:0.25rem;">Valor de cada parcela: R$ 0,00</div>
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

    const _geradores = window._caAvailableGeradores || [];
    window._geradorItems = _geradores.map(g => ({ id: String(g.id), nome: g.nome || '' }));

    window._openGeradorDropdown = function () {
        window._filterGeradorDropdown(document.getElementById('ca-gerador-search')?.value || '');
    };

    window._filterGeradorDropdown = function (q) {
        const dd = document.getElementById('ca-gerador-dropdown');
        if (!dd) return;
        const filtered = (window._geradorItems || []).filter(g => g.nome.toLowerCase().includes((q || '').toLowerCase()));
        if (filtered.length === 0) {
            dd.innerHTML = '<div style="padding:0.75rem 1rem;font-size:0.88rem;color:#94a3b8;">Nenhum resultado.</div>';
        } else {
            dd.innerHTML = filtered.map(g => `
                <div onclick="window._selectGerador('${g.id}', '${g.nome.replace(/'/g, "\\'")}')"
                     style="padding:0.6rem 1rem;font-size:0.88rem;color:#334155;cursor:pointer;"
                     onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background=''"><i class="ph ph-file-text" style="margin-right:6px;color:#94a3b8;"></i>${g.nome}</div>
            `).join('');
        }
        dd.style.display = 'block';
    };

    window._selectGerador = function (id, nome) {
        const search = document.getElementById('ca-gerador-search');
        const hidden = document.getElementById('ca-gerador-select');
        const dd = document.getElementById('ca-gerador-dropdown');
        if (search) search.value = nome;
        if (hidden) hidden.value = id;
        if (dd) dd.style.display = 'none';

        const extras = document.getElementById('ca-extra-fields-desconto');
        if (extras) {
            const isDesconto = nome.toUpperCase().includes('DESCONTO EM FOLHA');
            extras.style.display = isDesconto ? 'block' : 'none';
            if (isDesconto) {
                document.getElementById('ca-desconto-descricao').value = '';
                document.getElementById('ca-desconto-valor').value = '';
                document.getElementById('ca-desconto-parcelas').value = '1';
                if (window.calcParcelaDescontoCA) window.calcParcelaDescontoCA();
            }
        }
    };

    window.calcParcelaDescontoCA = function () {
        let valStr = document.getElementById('ca-desconto-valor')?.value || '0';
        valStr = valStr.replace(',', '.');
        const valor = parseFloat(valStr) || 0;
        const parcelas = parseInt(document.getElementById('ca-desconto-parcelas')?.value) || 1;
        const vp = (valor / parcelas).toFixed(2).replace('.', ',');
        const vpEl = document.getElementById('ca-desconto-valor-parcelamento');
        if (vpEl) vpEl.innerText = 'Valor de cada parcela: R$ ' + vp;
    };

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

window.gerarContratoAvulso = async function () {
    const hidden = document.getElementById('ca-gerador-select');
    const geradorId = hidden ? hidden.value : '';
    if (!geradorId) return alert('Selecione um documento.');

    const gNome = document.getElementById('ca-gerador-search')?.value || '';

    // ── Intercepção especial para Solicitação de VT ────────────────────────────
    if ((gNome || '').toLowerCase().includes('solicita') && (gNome || '').toLowerCase().includes('vt')) {
        document.getElementById('modal-contrato-avulso')?.remove();
        window._abrirPopupVT(geradorId, gNome);
        return;
    }

    const btn = document.getElementById('ca-btn-gerar');
    btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Gerando...';
    btn.disabled = true;

    try {
        let requestBody = {
            colaborador_id: viewedColaborador.id,
            colabId: viewedColaborador.id
        };

        const gNome = document.getElementById('ca-gerador-search')?.value || '';
        if (gNome.toUpperCase().includes('DESCONTO EM FOLHA')) {
            requestBody.desconto_descricao = document.getElementById('ca-desconto-descricao')?.value || 'Não informado';
            requestBody.desconto_valor = document.getElementById('ca-desconto-valor')?.value || '0,00';
            requestBody.desconto_parcelas = document.getElementById('ca-desconto-parcelas')?.value || '1';
            const vpEl = document.getElementById('ca-desconto-valor-parcelamento');
            requestBody.desconto_valor_parcela = vpEl ? vpEl.innerText.replace('Valor de cada parcela: R$ ', '') : '0,00';
        }

        const res = await fetch(`${API_URL}/geradores/${geradorId}/gerar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${currentToken}` },
            body: JSON.stringify(requestBody)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro ao gerar documento');

        document.getElementById('modal-contrato-avulso').remove();

        window.abrirPreviewDocumento({
            html: data.html,
            colaborador: data.colaborador,
            gerador_nome: data.gerador_nome,
            geradorId: geradorId
        });

        // Sobrescreve o botão Salvar para fazer upload ao prontuário
        setTimeout(() => {
            const previewBtnSalvar = document.querySelector('#modal-preview-doc button.btn-primary') || document.querySelector('#doc-modal button.btn-primary');
            if (previewBtnSalvar) {
                previewBtnSalvar.style.display = 'flex';
                previewBtnSalvar.innerHTML = '<i class="ph ph-paperclip"></i> Anexar ao Prontuário';
                previewBtnSalvar.onclick = async function () {
                    const oldHtml = this.innerHTML;
                    this.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Anexando...';
                    this.disabled = true;
                    try {
                        const htmlTemplate = document.getElementById('preview-doc-body');
                        const nomeArquivo = `${data.gerador_nome.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;

                        const pdfBlob = await window.gerarPDFBlob(htmlTemplate, nomeArquivo);

                        const file = new File([pdfBlob], nomeArquivo, { type: 'application/pdf' });
                        const formData = new FormData();
                        formData.append('file', file);
                        formData.append('colaborador_id', viewedColaborador.id);
                        formData.append('tab_name', 'CONTRATOS_AVULSOS');
                        formData.append('document_type', data.gerador_nome);

                        const uploadRes = await fetch(`${API_URL}/documentos`, {
                            method: 'POST', headers: { 'Authorization': `Bearer ${currentToken}` }, body: formData
                        });
                        if (!uploadRes.ok) throw new Error('Falha no upload do PDF gerado');

                        // Fechar modais
                        const modalPrev = document.getElementById('modal-preview-doc');
                        const docModal = document.getElementById('doc-modal');
                        if (modalPrev) modalPrev.style.display = 'none';
                        if (docModal) docModal.style.display = 'none';

                        if (typeof showToast !== 'undefined') showToast('Documento anexado com sucesso!', 'success');

                        await window._reloadContratosContainer();
                    } catch (err) {
                        alert('Erro ao anexar: ' + err.message);
                    } finally {
                        this.innerHTML = oldHtml;
                        this.disabled = false;
                    }
                };
            }
        }, 200);

    } catch (err) {
        btn.innerHTML = '<i class="ph ph-file-arrow-down"></i> Visualizar e Salvar';
        btn.disabled = false;
        const msg = document.getElementById('ca-msg');
        if (msg) { msg.style.display = 'block'; msg.innerHTML = `<div class="alert alert-danger"><i class="ph ph-warning"></i> ${err.message}</div>`; }
    }
};

// =======
window.previewAdmissaoDoc = async function (geradorId, colabId, evt) {
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
            btnSalvar.onclick = async function () {
                const oldHtml = this.innerHTML;
                this.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Processando...';
                this.disabled = true;
                try {
                    const previewContent = document.querySelector('#modal-preview-doc .preview-content') ||
                        document.querySelector('#modal-preview-doc #preview-doc-body');
                    if (!previewContent) throw new Error('Conteúdo do preview não encontrado');

                    const pdfBlob = await window.gerarPDFBlob(previewContent);
                    const safeName = (data.gerador_nome || 'documento_admissao').replace(/[^a-zA-Z0-9À-� _-]/g, '');
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
                        await apiPost('/admissao-assinaturas/enviar-lote', {
                            colaborador_id: colabId,
                            geradores_ids: [parseInt(geradorId)]
                        });
                        if (typeof showToast !== 'undefined') showToast('Documento enviado para assinatura.', 'success');
                    } else {
                        showToast('Documento de admissão salvo na pasta do colaborador.', 'success');
                    }

                    // Recarrega workflow se estiver aberto para atualizar status do item
                    if (document.getElementById('admissao-workflow-overlay')) {
                        window.initAdmissaoWorkflow(colabId, 2, true);
                    }

                } catch (err) {
                    this.innerHTML = oldHtml;
                    this.disabled = false;
                    Swal.fire('Erro', err.message, 'error');
                }
            };
        }, 150);

    } catch (e) {
        alert('Erro ao carregar pré-visualização: ' + e.message);
    }
};

window.rodarDiagnosticoAssinafy = async function () {
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
    } catch (e) {
        alert("Erro no diagnostico: " + e.message);
    }
}

// ===== PASSO 2: ENVIO EM LOTE PARA ASSINAFY =====
window.sendAdmissaoSignatures = async function (listId = 'admissao-signature-list', btnId = 'btn-enviar-assinaturas') {
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
        const ok = (res.resultados || []).filter(r => r.ok);

        let msg = `✅ ${ok.length} documento(s) enviado(s) para assinatura no e-mail do colaborador.`;
        if (erros.length > 0) msg += `\n\n⚠️ ${erros.length} erro(s):\n` + erros.map(e => `• ${e.nome || e.id}: ${e.erro}`).join('\n');
        alert(msg);

        // Recarregar a aba em que o usuário está (Passo 2 Admissão ou Contratos no Prontuário)
        if (document.getElementById('current-tab-title') && document.getElementById('current-tab-title').innerText === 'Contratos') {
            await renderContratosTab(document.getElementById('docs-list-container'));
        } else {
            await window.initAdmissaoWorkflow(viewedColaborador.id, 2, true);
        }
    } catch (e) {
        alert('Erro ao enviar documentos: ' + e.message);
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = `<i class="ph ph-paper-plane-tilt"></i> Enviar para Assinatura`; }
    }
};

// ===== POPUP DE PDF ASSINADO =====
window.openSignedDocPopup = function (assId, nomeDoc, evt) {
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
    overlay.addEventListener('click', function (e) { if (e.target === overlay) overlay.remove(); });
};

// Função para visualizar documentos assinados via tabela 'documentos' (ASO, EPI, Contratos)
window.openSignedDocPopupDocumento = function (docId, nomeDoc) {
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

// ===== INIT ADMISSÃO WORKFLOW =====
// Exibe o painel correto (botão "Iniciar" ou stepper) dependendo do status do colaborador
window.initAdmissaoWorkflow = async function (colabId, step, silent) {
    // Se colabId vazio = reset (chamado por selectAdmissaoColab com id vazio)
    if (!colabId) {
        window.resetAdmissao();
        return;
    }

    try {
        // Busca dados frescos do colaborador
        let colab = null;
        try {
            const cols = await apiGet('/colaboradores');
            colab = cols.find(c => String(c.id) === String(colabId));
        } catch (e) { colab = viewedColaborador; }

        if (!colab) { if (!silent) console.warn('[Admissao] Colaborador não encontrado:', colabId); return; }

        // Atualiza referência global
        viewedColaborador = colab;
        window.viewedColaborador = colab; // Sync para módulos externos

        // Pré-carrega documentos, assinaturas e geradores para o dashboard de admissão funcionar sem dependência da aba prontuário
        try {
            const [docs, admissaoAssinaturas, geradores, departamentos] = await Promise.all([
                apiGet(`/colaboradores/${colabId}/documentos`).catch(() => []),
                apiGet(`/colaboradores/${colabId}/admissao-assinaturas`).catch(() => []),
                apiGet('/geradores').catch(() => []),
                apiGet('/departamentos').catch(() => [])
            ]);
            window.currentDocs = docs;
            window._admissaoAssinaturas = admissaoAssinaturas;
            window._todosGeradores = geradores;

            // Resolve Auto Geradores exactly like Prontuário Digital unified Contratos Tab
            const empDeptId = colab.departamento;
            const deptObj = (departamentos || []).find(d => String(d.id) === String(empDeptId) || String(d.nome).trim().toLowerCase() === String(empDeptId).trim().toLowerCase());
            const deptNome = deptObj ? deptObj.nome : String(empDeptId || '');

            const EXCLUIDOS_FIXOS = ['autorização de desconto em folha de pagamento', 'autorizacao de desconto em folha de pagamento', 'autorizar desconto', 'termo de responsabilidade de chaves'];
            const isExcluido = (g) => {
                const nLower = (g.nome || '').toLowerCase().trim();
                return EXCLUIDOS_FIXOS.includes(nLower) || g.is_sinistro_only || nLower.startsWith('sinistro') || nLower.startsWith('sinistro -');
            };

            const geradoresElegiveis = (geradores || []).filter(g => !isExcluido(g));
            let autoGeradores = geradoresElegiveis.filter(g => window._avaliarRegraGerador && window._avaliarRegraGerador(g, colab, deptNome));

            if (geradoresElegiveis.length > 0 && !geradoresElegiveis.some(g => g.visibilidade_regra)) {
                // Legacy Map Fallback
                const deNorm = s => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
                const c = colab;
                const LEGACY_MAP = [
                    { nome: 'Termo de NÃO Interesse Terapia', cond: deNorm(c.terapia_participa) === 'nao' },
                    { nome: 'Termo de Interesse Terapia', cond: deNorm(c.terapia_participa) === 'sim' },
                    { nome: 'Responsabilidade Bilhete Único', cond: (c.meio_transporte || '').toLowerCase().includes('vt') },
                    { nome: 'Responsabilidade Celular', cond: deNorm(c.celular_participa) === 'sim' },
                    { nome: 'Responsabilidade Chaves', cond: deNorm(c.chaves_participa) === 'sim' },
                    { nome: 'Contrato Faculdade', cond: deNorm(c.faculdade_participa) === 'sim' },
                    { nome: 'Contrato Academia', cond: deNorm(c.academia_participa) === 'sim' },
                    { nome: 'Contrato Intermitente', cond: deNorm(c.tipo_contrato) === 'intermitente' },
                    { nome: 'Acordo Individual Benefícios', cond: true },
                    { nome: 'Autorização de Uso de Imagem', cond: true },
                    { nome: 'Compartilhamento de Dados', cond: true },
                    { nome: 'Recebimento de Regimento Interno', cond: true },
                    { nome: 'Regras Sorteio Final de Ano', cond: true },
                    { nome: 'Termo de Confidencialidade', cond: true },
                    { nome: 'Solicitação de VT', cond: true },
                    { nome: 'Responsabilidade Veículo', cond: deNorm(deptNome).includes('motorista') || deNorm(c.cargo || '').includes('motorista') },
                    { nome: 'Responsabilidade Equipamento', cond: deNorm(deptNome).includes('administrativo') || deNorm(c.cargo || '').includes('administrativo') || deNorm(c.tipo || '').includes('administrativo') },
                ];
                autoGeradores = LEGACY_MAP.filter(m => m.cond).map(m => geradoresElegiveis.find(g => deNorm(g.nome) === deNorm(m.nome))).filter(Boolean);
            }
            window._admissaoGeradores = autoGeradores;
        } catch (e) { console.error('Erro ao pré-carregar dependências da admissão:', e); }

        const wf = document.getElementById('admissao-workflow');
        const start = document.getElementById('admissao-start-action');
        const searchContainer = document.getElementById('admissao-search-container');

        if (!wf || !start) return;

        const statusNorm = (colab.status || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const admStatusNorm = (colab.admissao_status || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

        // Se o processo já foi iniciado, mostrar o stepper
        const INICIADOS = ['processo iniciado', 'em admissao', 'em andamento'];
        const processoIniciado = INICIADOS.some(s => statusNorm.includes(s)) ||
            (admStatusNorm && admStatusNorm !== 'concluida' && admStatusNorm !== '' && admStatusNorm !== 'pendente');

        // if (searchContainer) searchContainer.style.display = 'none';

        if (processoIniciado) {
            // Mostrar o stepper completo
            start.style.display = 'none';
            wf.style.display = 'block';
            // Preenche dados do passo 1
            if (typeof window.renderAdmissaoDataSummary === 'function') {
                window.renderAdmissaoDataSummary(colab);
            }
            if (typeof updateAdmissaoStepPercentages === 'function') updateAdmissaoStepPercentages();
            // Navega para o passo desejado
            const targetStep = step || window.currentActiveAdmissaoStep || 1;
            window.nextAdmissaoStep(targetStep, true);
        } else {
            // Mostrar botão de iniciar
            wf.style.display = 'none';
            start.style.display = 'block';
            const nameEl = document.getElementById('admissao-start-name');
            if (nameEl) nameEl.textContent = colab.nome_completo || '';
        }
    } catch (e) {
        if (!silent) console.error('[initAdmissaoWorkflow] Erro:', e);
    }
};

window.startFinalAdmission = async function () {

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

window.nextAdmissaoStep = function (step, preventScroll = false) {
    window.currentActiveAdmissaoStep = step;
    document.querySelectorAll('.admissao-stepper .step-item').forEach(s => s.classList.remove('active'));
    let activeStepEl = document.getElementById('step-' + step);
    if (activeStepEl) activeStepEl.classList.add('active');

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

window.handleAdmissaoFotoUpload = async function (event) {
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
    } catch (e) {
        showToast('Falha ao adicionar a foto', 'error');
        console.error(e);
    }
};

window.renderAdmissaoDataSummary = async function (colab) {
    const summaryDiv = document.getElementById('admissao-data-summary');
    if (!summaryDiv) return;
    try {
        // Resolve summary texts
        const step1 = calculateAdmissaoStep1Completion(colab);
        const missing = step1.missing;
        const total = step1.total;
        const complete = total - missing.length;

        let fieldsHtml = '';
        if (missing.length === 0) {
            fieldsHtml = `<div style="color:#059669; font-weight:700; margin-top:0.5rem;"><i class="ph ph-check-circle"></i> Todos os dados essenciais estão preenchidos!</div>`;
        } else {
            fieldsHtml = `<div style="color:#475569; margin-top:0.5rem;"><b>${complete} de ${total}</b> campos preenchidos. Para atingir 100%, certifique-se de preencher todos no cadastro do colaborador.</div>`;
        }

        const alertEl = document.getElementById('admissao-missing-fields-alert');
        const listEl = document.getElementById('admissao-missing-fields-list');
        if (alertEl && listEl) {
            if (missing.length > 0) {
                alertEl.style.display = 'block';
                listEl.innerHTML = missing.map(f => `<div>• ${f}</div>`).join('');
                const nextBtn = document.getElementById('btn-admissao-step1-next');
                if (nextBtn) nextBtn.disabled = false;
            } else {
                alertEl.style.display = 'none';
            }
        }

        const gridHtml = `
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 1rem; position:relative; margin-top: 1.5rem;">
                ${step1.fields.map(f => `
                    <div style="background: ${f.filled ? '#fff' : '#fff5f5'}; padding: 0.75rem; border-radius: 6px; border: 1px solid ${f.filled ? '#e2e8f0' : '#feb2b2'}; box-shadow: 0 1px 2px rgba(0,0,0,0.02);">
                        <label style="font-weight:700; color:${f.filled ? '#64748b' : '#c53030'}; font-size:0.7rem; text-transform:uppercase; margin-bottom:4px; display:block;">
                            ${f.label} ${f.filled ? '<i class="ph-bold ph-check-circle" style="color:#22c55e; margin-left:4px;"></i>' : '<span style="color:#ef4444!important; margin-left:4px;">(PENDENTE)</span>'}
                        </label>
                        <div style="font-size:0.95rem; font-weight:600; color:${f.filled ? '#1e293b' : '#ef4444'}; text-overflow:ellipsis; overflow:hidden; white-space:nowrap;">
                            ${f.value || 'NÃO PREENCHIDO'}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;

        summaryDiv.innerHTML = `
            <div style="display:flex; flex-direction:column; gap:1.25rem;">
                <div>
                    <h5 style="margin:0; font-size:1rem; color:#1e293b;">Resumo do Cadastro</h5>
                    ${fieldsHtml}
                    ${gridHtml}
                </div>
            </div>
        `;

    } catch (e) {
        console.error(e);
        summaryDiv.innerHTML = `<div class="alert alert-danger">Erro ao carregar dados: ${e.message}</div>`;
    }
};

window.saveAdmissaoResponsavel = async function (colabId, nomeResponsavel) {
    try {
        const res = await fetch(`${API_URL}/colaboradores/${colabId}/admissao-responsavel`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('erp_token')}`
            },
            body: JSON.stringify({ admissao_responsavel_nome: nomeResponsavel })
        });

        if (!res.ok) throw new Error('Falha ao salvar responsável');

        if (typeof Toastify !== 'undefined') {
            Toastify({ text: 'Responsável atribuído com sucesso!', backgroundColor: '#059669' }).showToast();
        }

        if (viewedColaborador && viewedColaborador.id === colabId) {
            viewedColaborador.admissao_responsavel_nome = nomeResponsavel;
        }
    } catch (e) {
        console.error(e);
        alert('Erro ao salvar responsável.');
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
        { key: 'contato_emergencia2_nome', label: 'Emg. Nome 2' },
        { key: 'contato_emergencia2_telefone', label: 'Emg. Tel. 2' },
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
    try { depArr = c.dependentes ? (typeof c.dependentes === 'string' ? JSON.parse(c.dependentes) : c.dependentes) : []; } catch (e) { }
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
            try { displayVal = new Date(val + 'T12:00:00').toLocaleDateString('pt-BR'); } catch (e) { }
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
        extraFields.push({ label: `Dependente ${i + 1} - Nome`, value: f.nome, filled: !!f.nome, isExtra: true });
        extraFields.push({ label: `Dependente ${i + 1} - CPF`, value: f.cpf, filled: !!f.cpf, isExtra: true });
        if (f.data_nascimento) {
            let dFmt = f.data_nascimento;
            try { dFmt = new Date(f.data_nascimento + 'T12:00:00').toLocaleDateString('pt-BR'); } catch (e) { }
            extraFields.push({ label: `Dependente ${i + 1} - Nasc.`, value: dFmt, filled: true, isExtra: true });
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
        const allUploadedContracts = docs.filter(d => d.tab_name === 'CONTRATOS');
        const combinedList = [];

        geradores.forEach(g => {
            const docEquivalente = allUploadedContracts.find(d => d.document_type === g.nome || (d.file_name && d.file_name.includes(g.nome)));
            combinedList.push({ nome: g.nome, doc: docEquivalente });
        });

        allUploadedContracts.forEach(d => {
            const isAlreadyAdded = combinedList.some(item => d.document_type === item.nome || (d.file_name && d.file_name.includes(item.nome)));
            if (!isAlreadyAdded) {
                combinedList.push({ nome: d.document_type || d.file_name || 'Documento', doc: d });
            }
        });

        if (combinedList.length === 0) {
            containerSignature.innerHTML = `<div style="padding:1rem; text-align:center; color:#64748b; font-size:0.85rem; font-style:italic;">Nenhum contrato configurado no sistema ou anexado no prontuário.</div>`;
        } else {
            containerSignature.innerHTML = combinedList.map(item => {
                const hasFile = !!item.doc;

                let statusBadge = hasFile
                    ? `<span style="background:#ecfdf5; color:#059669; border:1px solid #a7f3d0; padding:2px 8px; border-radius:12px; font-size:0.7rem; font-weight:700;"><i class="ph ph-check-circle"></i> Anexado</span>`
                    : `<span style="background:#fef2f2; color:#dc2626; border:1px solid #fecaca; padding:2px 8px; border-radius:12px; font-size:0.7rem; font-weight:700;"><i class="ph ph-x-circle"></i> Faltante</span>`;

                let dataText = '';
                if (hasFile && item.doc.created_at) {
                    const d = new Date(item.doc.created_at + (item.doc.created_at.includes('Z') ? '' : 'Z'));
                    dataText = `<div style="font-size:0.75rem; color:#64748b; margin-top:2px;">Anexado em: <b>${d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</b></div>`;
                } else if (!hasFile) {
                    dataText = `<div style="font-size:0.75rem; color:#94a3b8; margin-top:2px;"><i>Upload obrigatório via Prontuário Digital</i></div>`;
                }

                return `
                <div style="background:#fff; border:1px solid ${hasFile ? '#bbf7d0' : '#e2e8f0'}; border-radius:8px; padding:0.6rem 0.8rem; margin-bottom:0.4rem; display:flex; justify-content:space-between; align-items:center;">
                    <div style="display:flex; flex-direction:column; gap:2px;">
                        <span style="font-weight:600; color:#334155; font-size:0.85rem;">${item.nome}</span>
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
        const safeDepName = (dep.nome || 'DEP').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');

        const docsConfig = [
            { label: 'CPF ou RG', show: true },
            { label: 'Caderneta de Vacinação', show: idade !== null && idade < 7 },
            { label: 'Atestado de Frequência Escolar', show: idade !== null && idade >= 7 && idade <= 17 },
            { label: 'Certidão de Nascimento', show: true },
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
             <div style="background:#fff; border:1px solid ${hasFile ? '#bbf7d0' : '#e2e8f0'}; border-radius:8px; padding:0.6rem 0.8rem; margin-bottom:0.4rem; display:flex; justify-content:space-between; align-items:center;">
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
             <div style="background:#fff; border:1px solid ${hasFile ? '#bbf7d0' : '#e2e8f0'}; border-radius:8px; padding:0.6rem 0.8rem; margin-bottom:0.4rem; display:flex; justify-content:space-between; align-items:center;">
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

    const percentages = { 1: pc1, 2: pc2, 3: pc3, 4: pc4, 5: pc5, 6: pc6, 7: pc7, 8: pc8, 9: pc9, 10: pc10 };

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
    for (let i = 1; i <= totalAtivos; i++) sumAtivos += percentages[i];

    const avg = Math.round(sumAtivos / totalAtivos);
    const totalEl = document.getElementById('admissao-pc-total');
    if (totalEl) totalEl.textContent = `${avg}%`;
    const bar = document.getElementById('admissao-progress-bar');
    if (bar) bar.style.width = `${avg}%`;
}

window.addDependenteRow = function (nome = '', cpf = '', nascimento = '', parentesco = '') {
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

window.removeDependenteRow = function (id) {
    const row = document.getElementById(id);
    if (row) row.remove();

    const container = document.getElementById('dependentes-container');
    if (container.children.length === 0) {
        const noMsg = document.getElementById('no-dependentes-msg');
        if (noMsg) noMsg.style.display = 'block';
    }
};

window.filterAdmissaoDocs = function () {
    const q = document.getElementById('search-admissao-docs').value.toLowerCase();
    const items = document.querySelectorAll('#admissao-signature-list .doc-check-item');
    items.forEach(item => {
        const text = item.querySelector('span').textContent.toLowerCase();
        item.style.display = text.includes(q) ? 'flex' : 'none';
    });
};

// Hook into toggleCheck to update counts
const originalToggleCheck = window.toggleCheck;
window.toggleCheck = function (el) {
    // Desativado: seleção agora é apenas via upload
    console.log('Toggle desativado. Use o botão de Upload.');
};

window.editColabFromAdmission = function () {
    if (!viewedColaborador) return;
    const id = viewedColaborador.id;
    navigateTo('colaboradores');
    window.editColaborador(id);
};

window.sendASOEmail = async function () {
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
    const tipoAdmUpper = 'admissional';
    const isMotoristaAdm = cargo.includes('motorista');
    const examesCompl2 = isMotoristaAdm ? 'Audiometria, Acuidade Visual, E.E.G, E.C.G e Glicemia.' : '';
    const exames = examesCompl2 ? `Exame Padrão\nExames Complementares: ${examesCompl2}` : 'Exame Padrão';

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
            tipo_exame: 'Admissional',
            cc: ['rh@americarental.com.br', 'rh2@americarental.com.br']
        });

        if (res.sucesso) {
            alert('E-mail enviado com sucesso pelo servidor!');
            if (res.new_doc && typeof currentDocs !== 'undefined') currentDocs.push(res.new_doc);
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

window.resetAdmissao = function () {
    document.getElementById('admissao-workflow').style.display = 'none';
    document.getElementById('admissao-start-action').style.display = 'none';
    document.getElementById('admissao-search-container').style.display = 'block';
    document.getElementById('admissao-select-colab').value = '';

    // Reset Checklist
    document.querySelectorAll('.upload-status').forEach(span => span.style.display = 'none');
    document.querySelectorAll('.checklist-item').forEach(item => item.classList.remove('checked'));
    updateAdmissaoStepPercentages();
};

window.finalizarAdmissao = async function () {
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
window.iniciarAssinafy = async function (docType, tabName, btn) {
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
            const mm = String(now.getMonth() + 1).padStart(2, '0');
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

window.syncAssinafyStatus = async function (docId, btn) {
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

window.forceOnedriveSync = async function (docId, btn) {
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

window.syncAllAtestados = async function (ids, btn) {
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

window.testOneDriveConnection = async function () {
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

window.syncOneDriveManual = async function (id, btnElement = null) {
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
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = originalHtml;
        }
    }
};

window.resetSystem = async function () {
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
            initAdmissaoWorkflow(viewedColaborador.id, window.currentActiveAdmissaoStep, true).catch(() => { });
        }

        console.log('[POLLING] Documento(s) detectado(s) como Assinado(s). Tela atualizada com sucesso.');
    }
}, 30000);


window.markExpNotifLida = function (id) {
    const token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token');
    fetch('/api/experiencia/notificacoes/' + id + '/lida', { method: 'PUT', headers: { 'Authorization': 'Bearer ' + token } }).catch(() => { });
};
window.markLogNotifLida = function (id) {
    const token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token');
    fetch('/api/logistica/notificacoes/' + id + '/lida', { method: 'PUT', headers: { 'Authorization': 'Bearer ' + token } }).catch(() => { });
};


// --- POLLING: Notificacoes de Diretoria ---
const _dirNotifSeen = new Set();
async function checkDiretoriaNotificacoes() {
    const token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token');
    if (!token) return;
    try {
        if (!window.isTopAdmin) return;
    } catch (e) { return; }

    try {
        const resp = await fetch('/api/diretoria/notificacoes/pendentes', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!resp.ok) return;
        const notifs = await resp.json();

        for (const notif of notifs) {
            if (_dirNotifSeen.has(notif.id)) continue;
            _dirNotifSeen.add(notif.id);

            try {
                const dados = JSON.parse(notif.dados || '{}');
                // Theme: Red (Diretoria)
                const popup = document.createElement('div');
                popup.style.cssText = `
                    position:fixed; bottom:24px; left:24px; z-index:99999;
                    background:#fff; border-radius:16px; padding:1.5rem;
                    box-shadow: 0 20px 60px rgba(201,42,42,0.25), 0 0 0 1px rgba(201,42,42,0.1);
                    max-width:380px; animation: slideInLeft 0.4s ease-out;
                    border-left: 4px solid #c92a2a;
                `;
                popup.innerHTML = `
                    <div style="display:flex;align-items:flex-start;gap:1rem;">
                        <div style="width:44px;height:44px;border-radius:12px;background:#fee2e2;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:1.4rem;color:#dc2626;">
                            <i class="ph ph-warning-circle"></i>
                        </div>
                        <div style="flex:1;">
                            <div style="font-weight:700;font-size:0.9rem;color:#0f172a;margin-bottom:4px;">
                                <i class="ph ph-bell-ringing" style="color:#dc2626;"></i> Notificação
                            </div>
                            <div style="color:#64748b;font-size:0.8rem;">
                                ${notif.mensagem}
                            </div>
                            <div style="display:flex;gap:8px;margin-top:12px;">
                                <button onclick="window.markDirNotifLida('${notif.id}'); navigateTo('multas'); this.closest('[data-notif-id]').remove();" 
                                    style="flex:1;padding:6px 12px;background:#dc2626;color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:600;font-size:0.8rem;">
                                    Ver Tela
                                </button>
                                <button onclick="window.markDirNotifLida('${notif.id}'); this.closest('[data-notif-id]').remove();" 
                                    style="padding:6px 12px;background:#f1f5f9;color:#334155;border:none;border-radius:8px;cursor:pointer;font-size:0.8rem;">
                                    X 
                                </button>
                            </div>
                        </div>
                    </div>
                `;
                popup.setAttribute('data-notif-id', notif.id);
                document.body.appendChild(popup);
                setTimeout(() => { if (popup.parentNode) popup.remove(); }, 30000);
            } catch (parseErr) { }
        }
    } catch (e) { }
}
setInterval(checkDiretoriaNotificacoes, 60000);
setTimeout(checkDiretoriaNotificacoes, 7000);

window.markDirNotifLida = function (id) {
    const token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token');
    fetch('/api/diretoria/notificacoes/' + id + '/lida', { method: 'PUT', headers: { 'Authorization': 'Bearer ' + token } }).catch(() => { });
};

// --- POLLING: Notificações de Formulário de Experiência (para usuários RH) ---
const _expNotifSeen = new Set();
async function checkExperienciaNotificacoes() {
    const token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token');
    if (!token) return;
    // Only RH users: check via token permissions
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const permissoes = payload.permissoes || [];
        const isRH = permissoes.includes('rh_completo') || permissoes.some(p => String(p).includes('rh')) || permissoes.includes('experiencia');
        if (!isRH) return;
    } catch (e) { return; }

    try {
        const resp = await fetch('/api/experiencia/notificacoes/pendentes', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!resp.ok) return;
        const notifs = await resp.json();

        for (const notif of notifs) {
            if (_expNotifSeen.has(notif.id)) continue;
            _expNotifSeen.add(notif.id);

            try {
                const dados = JSON.parse(notif.dados || '{}');
                // Show popup - blue theme (like assinatura but azul)
                const popup = document.createElement('div');
                popup.style.cssText = `
                    position:fixed; bottom:24px; right:24px; z-index:99999;
                    background:#fff; border-radius:16px; padding:1.5rem;
                    box-shadow: 0 20px 60px rgba(29,78,216,0.25), 0 0 0 1px rgba(29,78,216,0.1);
                    max-width:380px; animation: slideInRight 0.4s ease-out;
                    border-left: 4px solid #1d4ed8;
                `;
                popup.innerHTML = `
                    <div style="display:flex;align-items:flex-start;gap:1rem;">
                        <div style="width:44px;height:44px;border-radius:12px;background:#dbeafe;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:1.4rem;color:#1d4ed8;">
                            <i class="ph ph-clipboard-text"></i>
                        </div>
                        <div style="flex:1;">
                            <div style="font-weight:700;font-size:0.9rem;color:#0f172a;margin-bottom:4px;">
                                <i class="ph ph-user-check" style="color:#1d4ed8;"></i> Formulário de Experiência Preenchido
                            </div>
                            <div style="color:#1d4ed8;font-weight:600;font-size:0.95rem;margin-bottom:4px;">${dados.colaborador_nome || 'Colaborador'}</div>
                            <div style="color:#64748b;font-size:0.8rem;">
                                ${dados.departamento ? dados.departamento + ' · ' : ''}
                                ${dados.resultado ? `Resultado: <strong style="color:${dados.resultado === 'Aprovado' ? '#059669' : '#dc2626'}">${dados.resultado}</strong>` : 'Aguardando resultado'}
                            </div>
                            <div style="display:flex;gap:8px;margin-top:12px;">
                                <button onclick="window.markExpNotifLida('${notif.id}'); navigateTo('experiencia'); this.closest('[data-notif-id]').remove();" 
                                    style="flex:1;padding:6px 12px;background:#1d4ed8;color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:600;font-size:0.8rem;">
                                    Ver Tela de Experiência
                                </button>
                                <button onclick="window.markExpNotifLida('${notif.id}'); this.closest('[data-notif-id]').remove();" 
                                    style="padding:6px 12px;background:#f1f5f9;color:#334155;border:none;border-radius:8px;cursor:pointer;font-size:0.8rem;">
                                    ✕
                                </button>
                            </div>
                        </div>
                    </div>
                `;
                popup.setAttribute('data-notif-id', notif.id);
                document.body.appendChild(popup);

                // Mark as read
                // markExpNotifLida removed from auto

                // Auto-close after 30s
                setTimeout(() => { if (popup.parentNode) popup.remove(); }, 30000);
            } catch (parseErr) { /* skip malformed */ }
        }
    } catch (e) { /* silent */ }
}

// Poll every 60s
setInterval(checkExperienciaNotificacoes, 60000);
setTimeout(checkExperienciaNotificacoes, 5000); // first check after 5s



// --- POLLING: Notificacoes de Comercial ---
const _comNotifSeen = new Set();
async function checkComercialNotificacoes() {
    const token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token');
    if (!token) return;

    try {
        const resp = await fetch('/api/comercial/notificacoes/pendentes', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!resp.ok) return;
        const notificacoes = await resp.json();

        for (const notif of notificacoes) {
            if (!_comNotifSeen.has(notif.id)) {
                _comNotifSeen.add(notif.id);

                const popup = document.createElement('div');
                popup.style.cssText = `
                    position:fixed; bottom:24px; right:24px; z-index:99999;
                    background:#fff; border-radius:16px; padding:1.5rem;
                    box-shadow: 0 20px 60px rgba(22,163,74,0.25), 0 0 0 1px rgba(22,163,74,0.1);
                    max-width:380px; animation: slideInRight 0.4s ease-out;
                    border-left: 4px solid #16a34a;
                `;

                let titulo = notif.tipo === 'credenciamento_enviado' ? 'Envio do Credenciamento' : 'Acesso ao Credenciamento';
                let icon = notif.tipo === 'credenciamento_enviado' ? 'ph-paper-plane-right' : 'ph-eye';

                let dados = {};
                try { dados = JSON.parse(notif.dados || '{}'); } catch (e) { }
                const remetente = dados.remetente || 'Logística';
                const clienteNome = dados.cliente_nome || 'Cliente não informado';

                popup.innerHTML = `
                    <div style="display:flex;align-items:flex-start;gap:1rem;">
                        <div style="width:44px;height:44px;border-radius:12px;background:#dcfce7;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:1.4rem;color:#16a34a;">
                            <i class="ph ${icon}"></i>
                        </div>
                        <div style="flex:1;">
                            <div style="font-weight:700;font-size:0.9rem;color:#0f172a;margin-bottom:4px;">
                                <i class="ph ph-bell-ringing" style="color:#16a34a;"></i> ${titulo}
                            </div>
                            <div style="color:#16a34a;font-weight:600;font-size:0.95rem;margin-bottom:4px;">${clienteNome}</div>
                            <div style="color:#64748b;font-size:0.8rem;">
                                ${notif.tipo === 'credenciamento_enviado' ? `Enviado por: <strong>${remetente}</strong>` : `O cliente acessou o link gerado.`}
                            </div>
                            <div style="display:flex;gap:8px;margin-top:12px;">
                                <button onclick="window.markComNotifLida('${notif.id}'); navigateTo('credenciamento'); this.closest('[data-notif-id]').remove();" 
                                    style="flex:1;padding:6px 12px;background:#16a34a;color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:600;font-size:0.8rem;">
                                    Ver Credenciamento
                                </button>
                                <button onclick="window.markComNotifLida('${notif.id}'); this.closest('[data-notif-id]').remove();" 
                                    style="padding:6px 12px;background:#f1f5f9;color:#334155;border:none;border-radius:8px;cursor:pointer;font-size:0.8rem;">
                                    X 
                                </button>
                            </div>
                        </div>
                    </div>
                `;
                popup.setAttribute('data-notif-id', notif.id);
                document.body.appendChild(popup);
                setTimeout(() => { if (popup.parentNode) popup.remove(); }, 30000);
            }
        }
    } catch (err) {
        // ignora silently
    }
}

window.markComNotifLida = function (id) {
    const token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token');
    fetch('/api/comercial/notificacoes/' + id + '/lida', { method: 'PUT', headers: { 'Authorization': 'Bearer ' + token } }).catch(() => { });
};

setInterval(checkComercialNotificacoes, 60000);
setTimeout(checkComercialNotificacoes, 3000);

// --- POLLING: Notificacoes de Logistica ---
const _logNotifSeen = new Set();
async function checkLogisticaNotificacoes() {
    const token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token');
    if (!token) return;
    try {
        const isLog = window.isTopAdmin || (window.activeUserPerms && window.activeUserPerms['logistica-credenciamento']) || (typeof currentUser !== 'undefined' && currentUser && (String(currentUser.departamento).toLowerCase().includes('log') || String(currentUser.role).toLowerCase().includes('log')));
        if (!isLog) return;
    } catch (e) { return; }

    try {
        const resp = await fetch('/api/logistica/notificacoes/pendentes', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!resp.ok) return;
        const notifs = await resp.json();

        for (const notif of notifs) {
            if (_logNotifSeen.has(notif.id)) continue;
            _logNotifSeen.add(notif.id);

            try {
                const dados = JSON.parse(notif.dados || '{}');
                // Theme: Purple (Comercial)
                const popup = document.createElement('div');
                popup.style.cssText = `
                    position:fixed; bottom:24px; right:24px; z-index:99999;
                    background:#fff; border-radius:16px; padding:1.5rem;
                    box-shadow: 0 20px 60px rgba(112,72,232,0.25), 0 0 0 1px rgba(112,72,232,0.1);
                    max-width:380px; animation: slideInRight 0.4s ease-out;
                    border-left: 4px solid #7048e8;
                `;
                popup.innerHTML = `
                    <div style="display:flex;align-items:flex-start;gap:1rem;">
                        <div style="width:44px;height:44px;border-radius:12px;background:#f3e8ff;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:1.4rem;color:#7048e8;">
                            <i class="ph ph-identification-card"></i>
                        </div>
                        <div style="flex:1;">
                            <div style="font-weight:700;font-size:0.9rem;color:#0f172a;margin-bottom:4px;">
                                <i class="ph ph-bell-ringing" style="color:#7048e8;"></i> Novo Credenciamento
                            </div>
                            <div style="color:#7048e8;font-weight:600;font-size:0.95rem;margin-bottom:4px;">${dados.cliente_nome || 'Cliente não informado'}</div>
                            <div style="color:#64748b;font-size:0.8rem;">
                                Solicitado por: <strong>${dados.solicitante || 'Comercial'}</strong>
                            </div>
                            <div style="display:flex;gap:8px;margin-top:12px;">
                                <button onclick="window.markLogNotifLida('${notif.id}'); navigateTo('logistica-credenciamento'); this.closest('[data-notif-id]').remove();" 
                                    style="flex:1;padding:6px 12px;background:#7048e8;color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:600;font-size:0.8rem;">
                                    Ver Credenciamento
                                </button>
                                <button onclick="window.markLogNotifLida('${notif.id}'); this.closest('[data-notif-id]').remove();" 
                                    style="padding:6px 12px;background:#f1f5f9;color:#334155;border:none;border-radius:8px;cursor:pointer;font-size:0.8rem;">
                                    X 
                                </button>
                            </div>
                        </div>
                    </div>
                `;
                popup.setAttribute('data-notif-id', notif.id);
                document.body.appendChild(popup);

                // markLogNotifLida removed from auto

                setTimeout(() => { if (popup.parentNode) popup.remove(); }, 30000);
            } catch (parseErr) { }
        }
    } catch (e) { }
}

setInterval(checkLogisticaNotificacoes, 60000);
setTimeout(checkLogisticaNotificacoes, 5000);

// --- POLLING: Notificacoes por Usuario (Configuraveis) ---
const _userNotifSeen = new Set();
async function checkUserNotificacoes() {
    const token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token');
    if (!token) return;

    try {
        const resp = await fetch('/api/notificacoes/me', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!resp.ok) return;
        const notifs = await resp.json();

        for (const notif of notifs) {
            if (_userNotifSeen.has(notif.id)) continue;
            _userNotifSeen.add(notif.id);

            try {
                let dados = {};
                try { dados = JSON.parse(notif.dados || '{}'); } catch (e) { }

                let bg, icon, color, titulo, navTarget;
                if (notif.tipo === 'aviso_faltas') {
                    if (dados.origem === 'agenda') {
                        bg = '#dcfce7'; color = '#16a34a'; icon = 'ph-calendar-x'; titulo = 'Aviso de Falta'; navTarget = 'logistica-agenda';
                    } else {
                        bg = '#fffbeb'; color = '#d97706'; icon = 'ph-warning'; titulo = 'Aviso de Falta'; navTarget = 'colaboradores';
                    }
                } else if (notif.tipo === 'aviso_equipes') {
                    bg = '#fee2e2'; color = '#ef4444'; icon = 'ph-users-three'; titulo = 'Equipe Desfalcada'; navTarget = 'equipes';
                } else if (notif.tipo === 'licenca_vencida') {
                    bg = '#fef2f2'; color = '#ef4444'; icon = 'ph-warning-circle'; titulo = 'Licença Vencida'; navTarget = 'admin'; // Navigates to admin panel or wherever licencas are managed
                } else if (notif.tipo === 'formulario_experiencia') {
                    bg = '#fdf2f8'; color = '#ec4899'; icon = 'ph-clipboard-text'; titulo = 'Experiência'; navTarget = 'experiencia';
                } else if (notif.tipo === 'novo_sinistro') {
                    bg = '#dcfce7'; color = '#059669'; icon = 'ph-warning'; titulo = 'Novo Sinistro (Logística)'; navTarget = 'colaboradores';
                } else if (notif.tipo === 'estoque_minimo') {
                    bg = '#fff5e6'; color = '#e67700'; icon = 'ph-package'; titulo = 'Estoque Mínimo'; navTarget = 'estoque';
                } else if (notif.tipo === 'novo_colaborador_equipe') {
                    bg = '#fdf2f8'; color = '#ec4899'; icon = 'ph-user-plus'; titulo = 'Novo Colaborador para Distribuição'; navTarget = 'logistica-equipes';
                } else if (notif.tipo === 'nova_ocorrencia') {
                    bg = '#fdf2f8'; color = '#ec4899'; icon = 'ph-warning-octagon'; titulo = 'Ocorrência Registrada'; navTarget = 'dashboard';
                } else if (notif.tipo === 'pesquisa_satisfacao_treinamento') {
                    bg = '#ecfeff'; color = '#0e7490'; icon = 'ph-star'; titulo = 'Pesquisa de Satisfação'; navTarget = 'treinamentos';
                } else if (notif.tipo === 'nova_multa_prontuario' || notif.tipo === 'nova_multa_monaco') {
                    bg = '#dcfce7'; color = '#16a34a'; icon = 'ph-traffic-cone'; titulo = 'Nova Multa'; navTarget = 'logistica';


                    bg = '#fdf2f8'; color = '#ec4899'; icon = 'ph-warning-octagon'; titulo = 'Ocorrência Registrada'; navTarget = 'dashboard';

                } else {
                    bg = '#f1f5f9'; color = '#475569'; icon = 'ph-bell-ringing'; titulo = 'Notificação'; navTarget = 'dashboard';
                }

                const popup = document.createElement('div');
                popup.style.cssText = `
                    position:fixed; bottom:24px; right:24px; z-index:99999;
                    background:#fff; border-radius:16px; padding:1.5rem;
                    box-shadow: 0 20px 60px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.05);
                    max-width:380px; animation: slideInRight 0.4s ease-out;
                    border-left: 4px solid ${color};
                `;

                let contentHTML = '';
                if (notif.tipo === 'aviso_faltas') {
                    const nomeColab = dados.nome_colab || 'Colaborador não identificado';
                    const dataFaltaFmt = dados.data_falta ? dados.data_falta.split('-').reverse().join('/') : '';
                    contentHTML = `
                        <div style="font-weight:800;font-size:1.2rem;color:${color};margin-bottom:8px;text-transform:uppercase;letter-spacing:0.5px;">
                            <i class="ph ${icon}"></i> ${titulo}
                        </div>
                        <div style="color:#0f172a;font-weight:600;font-size:1rem;margin-bottom:4px;">${nomeColab}</div>
                        <div style="color:#64748b;font-size:0.85rem;"><i class="ph ph-calendar"></i> Data: ${dataFaltaFmt}</div>
                    `;
                } else if (notif.tipo === 'aviso_equipes') {
                    const eqNome = dados.equipe_nome || 'Equipe Desconhecida';
                    const colabNome = dados.colab_nome || 'Colaborador';
                    contentHTML = `
                        <div style="font-weight:800;font-size:1.2rem;color:${color};margin-bottom:8px;text-transform:uppercase;letter-spacing:0.5px;">
                            <i class="ph ${icon}"></i> ${titulo}
                        </div>
                        <div style="color:#0f172a;font-weight:600;font-size:1rem;margin-bottom:4px;">${eqNome}</div>
                        <div style="color:#64748b;font-size:0.85rem;">O colaborador <b>${colabNome}</b> entrou de férias e foi retirado da equipe, deixando a equipe desfalcada com apenas 1 membro.</div>
                    `;
                } else if (notif.tipo === 'licenca_vencida') {
                    const nomeLicenca = dados.nome_licenca || 'Licença desconhecida';
                    const dataVenc = dados.data_vencimento ? dados.data_vencimento.split('-').reverse().join('/') : '';
                    contentHTML = `
                        <div style="font-weight:800;font-size:1.2rem;color:${color};margin-bottom:8px;text-transform:uppercase;letter-spacing:0.5px;">
                            <i class="ph ${icon}"></i> ${titulo}
                        </div>
                        <div style="color:#0f172a;font-weight:600;font-size:1rem;margin-bottom:4px;">${nomeLicenca}</div>
                        <div style="color:#64748b;font-size:0.85rem;"><i class="ph ph-calendar-blank"></i> Vencimento: ${dataVenc}</div>
                    `;
                } else if (notif.tipo === 'novo_sinistro') {
                    const nomeStr = notif.mensagem.replace('Novo sinistro registrado para', '').trim();
                    contentHTML = `
                        <div style="font-weight:800;font-size:1.2rem;color:${color};margin-bottom:8px;text-transform:uppercase;letter-spacing:0.5px;">
                            <i class="ph ${icon}"></i> ${titulo}
                        </div>
                        <div style="color:#0f172a;font-weight:800;font-size:1.15rem;margin-bottom:4px;">${nomeStr}</div>
                        <div style="color:#64748b;font-size:0.85rem;">Um novo boletim de ocorrência foi anexado.</div>
                    `;
                } else if (notif.tipo === 'estoque_minimo') {
                    const nomeProduto = dados.nome || (notif.mensagem || '').replace(/^ESTOQUE BAIXO:\s*/i, '').split('(')[0].trim();
                    const qtdAtual = dados.quantidade_atual !== undefined ? dados.quantidade_atual : '—';
                    const qtdMin   = dados.quantidade_minima !== undefined ? dados.quantidade_minima : '—';
                    contentHTML = `
                        <div style="font-weight:800;font-size:1.2rem;color:${color};margin-bottom:6px;text-transform:uppercase;letter-spacing:0.5px;">
                            <i class="ph ${icon}"></i> ${titulo}
                        </div>
                        <div style="color:#475569;font-weight:700;font-size:0.97rem;margin-bottom:6px;letter-spacing:0.2px;">
                            ${nomeProduto}
                        </div>
                        <div style="display:flex;gap:12px;font-size:0.82rem;">
                            <span style="color:#ef4444;font-weight:700;"><i class="ph ph-arrow-down"></i> Atual: ${qtdAtual}</span>
                            <span style="color:#64748b;">Mínimo: ${qtdMin}</span>
                        </div>
                    `;
                } else if (notif.tipo === 'formulario_experiencia') {
                    const colabNome = dados.colaborador_nome || 'Colaborador';
                    const respNome = dados.responsavel_nome || 'Gestor';
                    contentHTML = `
                        <div style="font-weight:800;font-size:1.2rem;color:${color};margin-bottom:8px;text-transform:uppercase;letter-spacing:0.5px;">
                            <i class="ph ${icon}"></i> ${titulo}
                        </div>
                        <div style="color:#475569;background:#f1f5f9;padding:4px 8px;border-radius:4px;font-weight:700;font-size:1rem;margin-bottom:6px;display:inline-block;">
                            ${colabNome}
                        </div>
                        <div style="color:#64748b;font-size:0.85rem;margin-bottom:4px;">
                            ${notif.mensagem}
                        </div>
                        <div style="color:#94a3b8;font-size:0.75rem;">
                            Preenchido por: ${respNome}
                        </div>
                    `;
                } else if (notif.tipo === 'novo_colaborador_equipe') {
                    const colabNome = dados.nome || 'Colaborador';
                    contentHTML = `
                        <div style="font-weight:800;font-size:1.2rem;color:${color};margin-bottom:8px;text-transform:uppercase;letter-spacing:0.5px;">
                            <i class="ph ${icon}"></i> ${titulo}
                        </div>
                        <div style="color:#64748b;font-size:0.85rem;">O colaborador <b style="color:${color}">${colabNome}</b> é um novo colaborador para distribuição de equipe.</div>
                    `;
                } else if (notif.tipo === 'nova_ocorrencia') {
                    const nomeStr = notif.mensagem.replace(/^Uma nova ocorrência foi registrada no prontuário do colaborador:\s*/i, '').trim();
                    contentHTML = `
                        <div style="font-weight:800;font-size:1.2rem;color:${color};margin-bottom:4px;text-transform:uppercase;letter-spacing:0.5px;">
                            <i class="ph ${icon}"></i> Ocorrência Registrada
                        </div>
                        <div style="color:#475569;font-weight:800;font-size:1.15rem;margin-bottom:4px;">
                            ${nomeStr}
                        </div>
                    `;
                } else if (notif.tipo === 'pesquisa_satisfacao_treinamento') {
                    const treinNome = dados.treinamento_nome || 'Treinamento';
                    const colabNome = dados.colaborador_nome || 'Colaborador';
                    contentHTML = `
                        <div style="font-weight:800;font-size:1.2rem;color:${color};margin-bottom:8px;text-transform:uppercase;letter-spacing:0.5px;">
                            <i class="ph ${icon}"></i> ${titulo}
                        </div>
                        <div style="color:#0f172a;font-weight:600;font-size:1rem;margin-bottom:4px;">${colabNome}</div>
                        <div style="color:#64748b;font-size:0.85rem;">Respondeu à pesquisa do treinamento: <b>${treinNome}</b></div>
                    `;
                } else if (notif.tipo === 'nova_multa_prontuario' || notif.tipo === 'nova_multa_monaco') {
                    const aitNum = dados.numero_ait || dados.ait || '';
                    const placaStr = dados.placa || '';
                    const prazoStr = dados.data_limite ? dados.data_limite.split('-').reverse().join('/') : (dados.prazo_indicacao ? dados.prazo_indicacao.split('-').reverse().join('/') : '');
                    const motoristaNome = dados.motorista_nome || dados.colaborador_nome || '';
                    contentHTML = `
                        <div style="font-weight:800;font-size:1.25rem;color:${color};margin-bottom:8px;text-transform:uppercase;letter-spacing:0.5px;">
                            <i class="ph ${icon}"></i> ${titulo}
                        </div>
                        ${aitNum ? `<div style="color:#0f172a;font-weight:700;font-size:1rem;margin-bottom:4px;">AIT: ${aitNum}${placaStr ? ' — ' + placaStr : ''}</div>` : ''}
                        ${motoristaNome ? `<div style="color:#065f46;font-size:0.88rem;font-weight:600;margin-bottom:4px;"><i class="ph ph-user"></i> ${motoristaNome}</div>` : ''}
                        ${prazoStr ? `<div style="background:#fef9c3;border:1px solid #fde047;border-radius:6px;padding:4px 10px;font-size:0.85rem;font-weight:700;color:#854d0e;margin-top:4px;display:inline-flex;align-items:center;gap:6px;"><i class="ph ph-calendar-x"></i> Prazo indicação: ${prazoStr}</div>` : `<div style="color:#64748b;font-size:0.82rem;">${notif.mensagem}</div>`}
                    `;
                } else {
                let btnOnClick = `window.markUserNotifLida('${notif.id}'); navigateTo('${navTarget}'); this.closest('[data-notif-id]').remove();`;
                if (notif.tipo === 'novo_sinistro' && dados.colaborador_id) {
                    btnOnClick = `window.markUserNotifLida('${notif.id}'); this.closest('[data-notif-id]').remove(); window.verProntuarioColaborador('${dados.colaborador_id}', 'Sinistros');`;
                } else if (notif.tipo === 'nova_ocorrencia' && dados.colaborador_id) {
                    btnOnClick = `window.markUserNotifLida('${notif.id}'); this.closest('[data-notif-id]').remove(); window.verProntuarioColaborador('${dados.colaborador_id}', 'Advertências');`;
                } else if ((notif.tipo === 'nova_multa_prontuario' || notif.tipo === 'nova_multa_monaco') && dados.colaborador_id) {
                    btnOnClick = `window.markUserNotifLida('${notif.id}'); this.closest('[data-notif-id]').remove(); window.verProntuarioColaborador('${dados.colaborador_id}', 'Multas');`;
                }
                }

                popup.innerHTML = `
                    <div style="display:flex;align-items:flex-start;gap:1rem;">
                        <div style="width:44px;height:44px;border-radius:12px;background:${bg};display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:1.4rem;color:${color};">
                            <i class="ph ${icon}"></i>
                        </div>
                        <div style="flex:1;">
                            ${contentHTML}
                            <div style="display:flex;gap:8px;margin-top:12px;">
                                <button onclick="${btnOnClick}" 
                                    style="flex:1;padding:6px 12px;background:${color};color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:600;font-size:0.8rem;">
                                    Ver Detalhes
                                </button>
                                <button onclick="window.markUserNotifLida('${notif.id}'); this.closest('[data-notif-id]').remove();" 
                                    style="padding:6px 12px;background:#f1f5f9;color:#334155;border:none;border-radius:8px;cursor:pointer;font-size:0.8rem;">
                                    X 
                                </button>
                            </div>
                        </div>
                    </div>
                `;
                popup.setAttribute('data-notif-id', notif.id);
                document.body.appendChild(popup);
                if (notif.tipo !== 'novo_sinistro' && notif.tipo !== 'nova_ocorrencia') {
                    setTimeout(() => { if (popup.parentNode) popup.remove(); }, 30000);
                }
            } catch (parseErr) { }
        }
    } catch (e) { }
}

window.markUserNotifLida = function (id) {
    const token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token');
    fetch('/api/notificacoes/me/' + id + '/lida', { method: 'PUT', headers: { 'Authorization': 'Bearer ' + token } }).catch(() => { });
};

setInterval(checkUserNotificacoes, 60000);
setTimeout(checkUserNotificacoes, 8000);

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
    if (evt.touches && evt.touches.length > 0) {
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
    const move = (e) => { e.preventDefault(); if (!drawing) return; const pos = getPointerPos(canvas, e); ctx.lineTo(pos.x, pos.y); ctx.stroke(); };
    const stop = (e) => { e.preventDefault(); drawing = false; ctx.closePath(); };

    canvas.addEventListener('mousedown', start);
    canvas.addEventListener('mousemove', move);
    canvas.addEventListener('mouseup', stop);
    canvas.addEventListener('mouseout', stop);

    canvas.addEventListener('touchstart', start, { passive: false });
    canvas.addEventListener('touchmove', move, { passive: false });
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

window.abrirModalAssinaturaTestemunhas = async function (docId) {
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
    todos.sort((a, b) => (a.nome_completo || a.nome || '').localeCompare(b.nome_completo || b.nome || ''));

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

window.limparCanvasTestemunha = function (index) {
    const canvas = document.getElementById('canvas-testemunha-' + index);
    const ctx = index === 1 ? ctxTestemunhas.ctx1 : ctxTestemunhas.ctx2;
    const dpr = window.devicePixelRatio || 1;
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
};

window.salvarAssinaturasTestemunhas = async function () {
    const s1 = document.getElementById('select-testemunha-1').value;
    const s2 = document.getElementById('select-testemunha-2').value;

    if (!s1 || !s2) { alert('Selecione as duas testemunhas.'); return; }
    if (s1 === s2) { alert('Selecione testemunhas diferentes.'); return; }

    if (isCanvasBlank('canvas-testemunha-1') || isCanvasBlank('canvas-testemunha-2')) {
        alert('Colete a assinatura de ambas as testemunhas.'); return;
    }

    const doc = currentDocDataForWitness;
    if (!doc || !doc.file_path) { alert('Documento original não encontrado.'); return; }
    if (typeof PDFLib === 'undefined') { alert('A biblioteca de processamento de PDF não está carregada.'); return; }

    const btn = document.getElementById('btn-salvar-testemunhas');
    const originalBtn = btn.innerHTML;
    try {
        btn.disabled = true;
        btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Processando PDF...';

        const pdfUrl = `${API_URL}/documentos/download/${doc.id}?token=${currentToken}`;
        const pdfResp = await fetch(pdfUrl);
        if (!pdfResp.ok) throw new Error('Não foi possível baixar o PDF original.');
        const existingPdfBytes = await pdfResp.arrayBuffer();

        const pdfDoc = await PDFLib.PDFDocument.load(existingPdfBytes);

        const pages = pdfDoc.getPages();
        // Usa SEMPRE a última página para as assinaturas das testemunhas
        const sigPage = pages[pages.length - 1];
        const { width: pageWidth, height: pageHeight } = sigPage.getSize();
        const innerWidth = (pageWidth - 112) / 2 - 20;

        // --- Captura canvas em alta resolução (3x DPI) ---
        async function getHQCanvas(canvasId) {
            const src = document.getElementById(canvasId);
            const dpr = window.devicePixelRatio || 1;
            const scale = 3;
            const off = document.createElement('canvas');
            off.width = src.width * scale / dpr;
            off.height = src.height * scale / dpr;
            const ctx = off.getContext('2d');
            ctx.scale(scale, scale);
            ctx.drawImage(src, 0, 0, src.width / dpr, src.height / dpr);
            return fetch(off.toDataURL('image/png')).then(r => r.arrayBuffer());
        }

        const data1 = s1.split('###');
        const data2 = s2.split('###');

        // ── Posicionamento ancorado no RODAPÉ da última página ──
        // TESTEMUNHAS ficam na faixa de ~150 a ~270pt do rodapé
        // (abaixo delas ficará o bloco do Colaborador, em ~30 a ~130pt)
        const tImgH    = 55;  // altura da imagem de assinatura
        const bottomMargin = 160; // margem do rodapé para o bloco das testemunhas
        const t1CpfY   = bottomMargin;
        const t1NameY  = t1CpfY  + 14;
        const t1LineY  = t1NameY + 14;
        const t1ImgY   = t1LineY + 6;
        const t1LabelY = t1ImgY  + tImgH + 6;

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

        const dateStrTestemunhas = new Date().toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        sigPage.drawText(`Assinado em: ${dateStrTestemunhas}`, { x: t1X, y: t1CpfY - 12, size: 8, color: PDFLib.rgb(0.35, 0.35, 0.35) });
        sigPage.drawText(`Assinado em: ${dateStrTestemunhas}`, { x: t2X, y: t1CpfY - 12, size: 8, color: PDFLib.rgb(0.35, 0.35, 0.35) });

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
        if (doc.year) formData.append('year', doc.year);
        if (doc.month) formData.append('month', doc.month);

        btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Salvando Documento...';
        const resUpload = await fetch(`${API_URL}/documentos`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${currentToken}` },
            body: formData
        });

        if (!resUpload.ok) {
            const errRes = await resUpload.json().catch(() => ({}));
            throw new Error(errRes.error || 'Falha ao reenviar documento com assinaturas.');
        }

        alert('Assinaturas adicionadas com sucesso!');
        document.getElementById('modal-assinatura-testemunhas').style.display = 'none';

        await loadDocumentosList();
        const activeTab = document.querySelector('#tabs-list li.active');
        if (activeTab) {
            renderTabContent(activeTab.dataset.tab, activeTab.textContent, true);
        } else {
            renderTabContent('Advertências', 'Ocorrências', true);
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

// ─── SELFIE EPI ─────────────────────────────────────────────────────────────
let _epiSelfieStream = null;
let _epiSelfieBase64 = null;
let _epiSelfieTimestamp = null;

window._fecharModalAssinaturaColab = function () {
    document.getElementById('modal-assinatura-colaborador').style.display = 'none';
    _epiPararCamera();
};

function _epiPararCamera() {
    if (_epiSelfieStream) {
        _epiSelfieStream.getTracks().forEach(t => t.stop());
        _epiSelfieStream = null;
    }
    const video = document.getElementById('epi-selfie-video');
    if (video) { video.srcObject = null; }
}

async function _epiIniciarCamera() {
    const statusEl = document.getElementById('epi-selfie-status');
    try {
        // Preferir câmera frontal (user-facing)
        _epiSelfieStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
            audio: false
        });
        const video = document.getElementById('epi-selfie-video');
        video.srcObject = _epiSelfieStream;
        video.style.display = 'block';
        document.getElementById('epi-selfie-canvas').style.display = 'none';
        document.getElementById('btn-epi-tirar-foto').style.display = 'flex';
        document.getElementById('btn-epi-refazer-foto').style.display = 'none';
        document.getElementById('btn-epi-confirmar-foto').style.display = 'none';
        if (statusEl) statusEl.textContent = 'Câmera pronta. Posicione seu rosto.';
    } catch (err) {
        console.error('[EPI Selfie] Câmera:', err);
        if (statusEl) statusEl.innerHTML = '<span style="color:#dc2626;"><i class="ph ph-warning"></i> Não foi possível acessar a câmera. Verifique as permissões do navegador.</span>';
        document.getElementById('btn-epi-tirar-foto').style.display = 'none';
    }
}

window._epiTirarFoto = function () {
    const video = document.getElementById('epi-selfie-video');
    const canvas = document.getElementById('epi-selfie-canvas');
    if (!video || !_epiSelfieStream) return;

    // Captura o frame do vídeo no canvas — espelhado para ficar natural
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');

    // Espelha horizontalmente (pois o vídeo está flipado via CSS; queremos salvar sem flip)
    ctx.save();
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    ctx.restore();

    // Timestamp e info de quem fez a entrega
    _epiSelfieTimestamp = new Date();
    const dtStr = _epiSelfieTimestamp.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const entregadorNome = (typeof currentUser !== 'undefined' && currentUser) ? (currentUser.nome || currentUser.username || 'Usuário') : 'Usuário';
    const colabNome = (typeof viewedColaborador !== 'undefined' && viewedColaborador) ? (viewedColaborador.nome_completo || '') : '';

    // Desenhar overlay de texto na foto salva
    const overlayH = 56;
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(0, canvas.height - overlayH, canvas.width, overlayH);

    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 13px Arial';
    ctx.fillText('Entregue por: ' + entregadorNome, 8, canvas.height - overlayH + 16);

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '12px Arial';
    ctx.fillText('Colaborador: ' + colabNome, 8, canvas.height - overlayH + 32);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px Arial';
    ctx.fillText(dtStr, 8, canvas.height - overlayH + 48);

    _epiSelfieBase64 = canvas.toDataURL('image/jpeg', 0.88);

    // Mostrar canvas com foto, esconder vídeo
    video.style.display = 'none';
    canvas.style.display = 'block';

    document.getElementById('btn-epi-tirar-foto').style.display = 'none';
    document.getElementById('btn-epi-refazer-foto').style.display = 'flex';
    document.getElementById('btn-epi-confirmar-foto').style.display = 'flex';

    const statusEl = document.getElementById('epi-selfie-status');
    if (statusEl) statusEl.innerHTML = '<span style="color:#16a34a;"><i class="ph ph-check-circle"></i> Foto tirada! Confirme ou refaça.</span>';
};

window._epiRefazerFoto = function () {
    _epiSelfieBase64 = null;
    _epiSelfieTimestamp = null;
    const video = document.getElementById('epi-selfie-video');
    const canvas = document.getElementById('epi-selfie-canvas');
    video.style.display = 'block';
    canvas.style.display = 'none';
    document.getElementById('btn-epi-tirar-foto').style.display = 'flex';
    document.getElementById('btn-epi-refazer-foto').style.display = 'none';
    document.getElementById('btn-epi-confirmar-foto').style.display = 'none';
    const statusEl = document.getElementById('epi-selfie-status');
    if (statusEl) statusEl.textContent = 'Câmera pronta. Posicione seu rosto.';
};

window._epiConfirmarFotoIrParaAssinatura = function () {
    if (!_epiSelfieBase64) return;

    // Para a câmera
    _epiPararCamera();

    // Copia selfie para o thumb no passo 2
    const srcCanvas = document.getElementById('epi-selfie-canvas');
    const thumb = document.getElementById('epi-selfie-thumb');
    if (srcCanvas && thumb) {
        const thumbCtx = thumb.getContext('2d');
        thumb.width = srcCanvas.width;
        thumb.height = srcCanvas.height;
        thumbCtx.drawImage(srcCanvas, 0, 0);
    }

    const dtStr = _epiSelfieTimestamp
        ? _epiSelfieTimestamp.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
        : '';
    const thumbDt = document.getElementById('epi-selfie-thumb-dt');
    if (thumbDt) thumbDt.textContent = dtStr;

    // Transição para o passo 2
    document.getElementById('epi-step-selfie').style.display = 'none';
    const assinaturaArea = document.getElementById('area-assinatura-colaborador');
    assinaturaArea.style.display = 'flex';
    setTimeout(() => { setupHighDpiCanvas('canvas-colaborador', ctxColaborador, 'ctx1'); }, 100);
};

window.abrirModalAssinaturaColaborador = async function (docId) {
    currentDocIdForColab = docId;
    _epiSelfieBase64 = null;
    _epiSelfieTimestamp = null;

    const modal = document.getElementById('modal-assinatura-colaborador');
    document.getElementById('area-assinatura-colaborador').style.display = 'none';
    document.getElementById('epi-step-selfie').style.display = 'none';
    modal.style.display = 'block';

    document.getElementById('nome-assinatura-colab').innerText = viewedColaborador.nome_completo || 'Colaborador';

    // Preencher overlay info
    const entregadorNome = (typeof currentUser !== 'undefined' && currentUser) ? (currentUser.nome || currentUser.username || 'Usuário') : 'Usuário';
    const colabNome = viewedColaborador.nome_completo || '';
    const el = document.getElementById('epi-selfie-info-entregador');
    if (el) el.textContent = 'Entregue por: ' + entregadorNome;
    const el2 = document.getElementById('epi-selfie-info-colab');
    if (el2) el2.textContent = 'Colaborador: ' + colabNome;

    // Atualizar timestamp no overlay em tempo real
    const dtEl = document.getElementById('epi-selfie-info-dt');
    if (dtEl) {
        const _tick = () => { dtEl.textContent = new Date().toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }); };
        _tick();
        clearInterval(window._epiSelfieClock);
        window._epiSelfieClock = setInterval(() => {
            if (!document.getElementById('epi-step-selfie') || document.getElementById('epi-step-selfie').style.display === 'none') {
                clearInterval(window._epiSelfieClock);
            } else { _tick(); }
        }, 1000);
    }

    const pdfUrl = `${API_URL}/documentos/view/${docId}?token=${currentToken}`;
    renderPdfToContainer(pdfUrl, 'pdf-viewer-colaborador', () => {
        // Após PDF carregado, iniciar câmera e mostrar passo 1
        const selfieArea = document.getElementById('epi-step-selfie');
        selfieArea.style.display = 'flex';
        _epiIniciarCamera();
    });
};

window.limparCanvasColaborador = function () {
    const canvas = document.getElementById('canvas-colaborador');
    const ctx = ctxColaborador.ctx1;
    const dpr = window.devicePixelRatio || 1;
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
};

window.salvarAssinaturaColaborador = async function () {
    if (!_epiSelfieBase64) {
        alert('É necessário tirar a selfie antes de assinar.'); return;
    }
    if (isCanvasBlank('canvas-colaborador')) {
        alert('A assinatura do colaborador é obrigatória.'); return;
    }

    const doc = currentDocs.find(d => d.id === currentDocIdForColab);
    if (!doc || !doc.file_path) { alert('Documento não encontrado.'); return; }

    const btn = document.getElementById('btn-salvar-colaborador');
    const originalBtn = btn.innerHTML;
    try {
        btn.disabled = true;
        btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Processando...';

        const pdfUrl = `${API_URL}/documentos/download/${doc.id}?token=${currentToken}`;
        const pdfResp = await fetch(pdfUrl);
        if (!pdfResp.ok) throw new Error('Não foi possível baixar o PDF original.');
        const existingPdfBytes = await pdfResp.arrayBuffer();

        const pdfDoc = await PDFLib.PDFDocument.load(existingPdfBytes);
        const pages = pdfDoc.getPages();
        // Usa SEMPRE a última página, igual às testemunhas
        const lastPage = pages[pages.length - 1];
        const { width: pgW, height: pgH } = lastPage.getSize();

        // Captura de alta qualidade
        async function getHQCanvas2(canvasId) {
            const src = document.getElementById(canvasId);
            const dpr = window.devicePixelRatio || 1;
            const scale = 3;
            const off = document.createElement('canvas');
            off.width = src.width * scale / dpr;
            off.height = src.height * scale / dpr;
            const ctx = off.getContext('2d');
            ctx.scale(scale, scale);
            ctx.drawImage(src, 0, 0, src.width / dpr, src.height / dpr);
            return fetch(off.toDataURL('image/png')).then(r => r.arrayBuffer());
        }

        // --- COLABORADOR ---
        // Testemunhas ocupam a faixa 160-260pt do rodapé.
        // Colaborador fica na faixa 30-130pt do rodapé, sem sobreposição.
        const isAdvertenciaOuSuspensao = (doc.document_type && (doc.document_type.includes('Advertência') || doc.document_type.includes('Suspensão'))) || doc.tab_name === 'Advertências';

        let cImgH = 55;
        let cWidth = 280;
        let cX = (pgW - cWidth) / 2;

        if (isAdvertenciaOuSuspensao && _epiSelfieBase64) {
            cWidth = 240;
            cX = 50; // Alinhado à esquerda
        }

        const cCpfY   = 30;
        const cNameY  = cCpfY  + 14;
        const cLineY  = cNameY + 14;
        const cImgY   = cLineY + 6;
        const cLabelY = cImgY  + cImgH + 6;

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


        const dateStrColab = new Date().toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        lastPage.drawText(`Assinado em: ${dateStrColab}`, { x: cX, y: cCpfY - 12, size: 8, color: PDFLib.rgb(0.35, 0.35, 0.35) });
        
        if (doc.created_at || doc.data_inclusao) {
            const dtCriado = new Date(doc.created_at || doc.data_inclusao);
            if (!isNaN(dtCriado)) {
                const dateStrCriado = dtCriado.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
                lastPage.drawText(`Incluído no sistema em: ${dateStrCriado}`, { x: cX, y: cCpfY - 24, size: 8, color: PDFLib.rgb(0.35, 0.35, 0.35) });
            }
        }

        if (_epiSelfieBase64) {
            try {
                const selfieBase64Data = _epiSelfieBase64.split(',')[1];
                const selfieBytes = Uint8Array.from(atob(selfieBase64Data), c => c.charCodeAt(0));
                const selfieImage = await pdfDoc.embedJpg(selfieBytes);
                const sImgW = 85;
                const sImgH = 64;
                lastPage.drawImage(selfieImage, { x: cX + cWidth + 10, y: cCpfY - 10, width: sImgW, height: sImgH });
            } catch (e) { console.error('Erro ao add selfie no pdf', e); }
        }


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
        if (doc.year) formData.append('year', doc.year);
        if (doc.month) formData.append('month', doc.month);

        // Salva selfie no banco antes de fechar
        if (_epiSelfieBase64) {
            try {
                const entregadorNome = (typeof currentUser !== 'undefined' && currentUser) ? (currentUser.nome || currentUser.username || '') : '';
                await fetch(`${API_URL}/epi-selfie`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${currentToken}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        colaborador_id: viewedColaborador.id,
                        selfie_base64: _epiSelfieBase64,
                        registrado_por: entregadorNome,
                        timestamp: _epiSelfieTimestamp ? _epiSelfieTimestamp.toISOString() : new Date().toISOString()
                    })
                });
            } catch (selfieErr) {
                console.error('[EPI Selfie] Erro ao salvar selfie:', selfieErr);
            }
        }

        btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Salvando Documento...';
        const resUpload = await fetch(`${API_URL}/documentos`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${currentToken}` },
            body: formData
        });

        if (!resUpload.ok) {
            const errRes = await resUpload.json().catch(() => ({}));
            throw new Error(errRes.error || 'Falha ao reenviar documento assinado.');
        }

        alert('Assinatura do colaborador coletada!');
        _epiPararCamera();
        document.getElementById('modal-assinatura-colaborador').style.display = 'none';

        await loadDocumentosList();

        const activeTab = document.querySelector('#tabs-list li.active');
        if (activeTab) {
            renderTabContent(activeTab.dataset.tab, activeTab.textContent, true);
        } else {
            renderTabContent('Advertências', 'Ocorrências', true);
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
// ABA FICHA DE EPI NO PRONTUÁRIO — função original restaurada
// ============================================================
async function renderFichaEpiTab(container) {
    container.innerHTML = '<p class="text-muted">Carregando fichas de EPI...</p>';
    const colabId = viewedColaborador?.id;
    if (!colabId) { container.innerHTML = '<div class="alert alert-info">Colaborador não identificado.</div>'; return; }

    let fichas = [], templates = [], todasEntregas = [];
    try {
        [fichas, templates, todasEntregas] = await Promise.all([
            apiGet(`/colaboradores/${colabId}/epi-fichas`),
            apiGet('/epi-templates'),
            apiGet(`/colaboradores/${colabId}/epi-entregas`)
        ]);
    } catch (e) {
        container.innerHTML = '<div class="alert alert-danger">Erro ao carregar dados de EPI.</div>';
        return;
    }

    if (!fichas || !templates) {
        container.innerHTML = `
            <div style="text-align:center; padding: 40px 20px; color: #64748b;">
                <i class="ph-fill ph-warning-circle" style="font-size:2.5rem; color:#e67700; margin-bottom:12px; display:block;"></i>
                <p style="font-size:1rem; font-weight:600; color:#1e3a5f; margin-bottom:8px;">Não foi possível carregar os dados de EPI</p>
                <p style="font-size:0.85rem; margin-bottom:20px;">O servidor pode estar reiniciando. Aguarde alguns segundos e tente novamente.</p>
                <button onclick="window.renderFichaEpiTab(this.closest('[data-prontuario-container]') || document.querySelector('.epi-tab-container') || document.getElementById('docs-list-container'))"
                    style="background:#e67700; color:#fff; border:none; border-radius:8px; padding:10px 24px; font-size:0.9rem; font-weight:600; cursor:pointer;">
                    🔄 Tentar novamente
                </button>
            </div>`;
        return;
    }

    fichas = fichas || [];
    templates = templates || [];
    todasEntregas = todasEntregas || [];

    const fichaAtiva = fichas.find(f => f.status === 'ativa');
    const dept = viewedColaborador?.departamento || '';
    const cargo = viewedColaborador?.cargo || '';

    const SETORES_ADMIN = ['Comercial', 'Financeiro', 'Logística', 'Logistica', 'Administrativo', 'RH'];
    const isSetorAdmin = SETORES_ADMIN.includes(dept) || SETORES_ADMIN.includes(cargo);

    let templateDoColab = templates.find(t => (t.departamentos || []).includes(dept) || (t.departamentos || []).includes(cargo)) ||
        templates.find(t => t.grupo === dept || t.grupo === cargo) ||
        (isSetorAdmin ? templates.find(t => t.categoria === 'Administrativo') : null) ||
        templates[0];

    const fmtDate = iso => {
        if (!iso) return '-';
        const d = new Date(iso);
        return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear();
    };

    const parseDateEntrega = str => {
        if (!str) return null;
        if (str.includes('/')) {
            const [d, m, y] = str.split('/');
            return new Date(y, m - 1, d);
        }
        return new Date(str + 'T12:00:00');
    };

    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    let tabelaHtml = '';
    if (todasEntregas && todasEntregas.length > 0) {
        // Ordena entregas da mais recente para a mais antiga
        todasEntregas.sort((a, b) => {
            const dateA = parseDateEntrega(a.data_entrega) || new Date(0);
            const dateB = parseDateEntrega(b.data_entrega) || new Date(0);
            return dateB - dateA;
        });

        const linhas = todasEntregas.map(e => {
            const dataObj = parseDateEntrega(e.data_entrega);
            const diasAtras = dataObj ? Math.floor((hoje - dataObj) / (1000 * 60 * 60 * 24)) : null;
            const recente = diasAtras !== null && diasAtras <= 15;
            return `
                <tr style="border-bottom:1px solid #f1f5f9;${recente ? 'background:#fffbeb;' : ''}">
                    <td style="padding:0.55rem 0.85rem;font-size:0.85rem;color:#334155;white-space:nowrap;">
                        ${e.data_entrega || '—'}
                        ${recente ? '<span style="margin-left:6px;background:#fef3c7;color:#92400e;font-size:0.7rem;font-weight:700;padding:1px 7px;border-radius:999px;border:1px solid #fcd34d;">recente</span>' : ''}
                    </td>
                    <td style="padding:0.55rem 0.85rem;font-size:0.85rem;color:#0f172a;font-weight:500;">${e.epi_nome || '—'}</td>
                    <td style="padding:0.55rem 0.85rem;font-size:0.85rem;text-align:center;">
                        <span style="display:inline-block;background:#e0f2fe;color:#0369a1;font-weight:700;font-size:0.82rem;min-width:28px;padding:2px 8px;border-radius:999px;text-align:center;">${e.qty || 1}</span>
                    </td>
                    <td style="padding:0.55rem 0.85rem;font-size:0.8rem;color:#64748b;">${e.grupo || '—'}</td>
                    <td style="padding:0.55rem 0.85rem;font-size:0.8rem;color:#64748b;">${e.registrado_por || '—'}</td>
                    <td style="padding:0.35rem 0.6rem;text-align:center;">
                        <button
                            onclick="window.previewFichaEpi(${e.ficha_id})"
                            title="Ver Comprovante de Entrega"
                            class="btn btn-secondary btn-sm"
                            style="height:32px;display:inline-flex;align-items:center;gap:4px;padding:3px 8px;">
                            <i class="ph ph-eye"></i>
                        </button>
                    </td>
                </tr>`;
        }).join('');

        tabelaHtml = `
        <div style="margin-top:2rem;">
            <div style="display:flex;align-items:center;gap:0.6rem;margin-bottom:0.85rem;padding-bottom:0.5rem;border-bottom:2px solid #e2e8f0;">
                <i class="ph ph-list-bullets" style="color:#3b82f6;font-size:1.15rem;"></i>
                <h4 style="margin:0;font-size:0.97rem;font-weight:700;color:#0f172a;">Histórico de EPIs Entregues</h4>
                <span data-epi-count-badge style="background:#3b82f6;color:#fff;font-size:0.72rem;font-weight:700;padding:2px 9px;border-radius:999px;">${todasEntregas.length} registro${todasEntregas.length !== 1 ? 's' : ''}</span>
            </div>
            <div style="overflow-x:auto;border:1px solid #e2e8f0;border-radius:10px;">
                <table style="width:100%;border-collapse:collapse;">
                    <thead>
                        <tr style="background:#f8fafc;">
                            <th style="padding:0.6rem 0.85rem;font-size:0.78rem;font-weight:700;color:#475569;text-align:left;white-space:nowrap;">Data de Entrega</th>
                            <th style="padding:0.6rem 0.85rem;font-size:0.78rem;font-weight:700;color:#475569;text-align:left;">EPI</th>
                            <th style="padding:0.6rem 0.85rem;font-size:0.78rem;font-weight:700;color:#475569;text-align:center;">Qtd</th>
                            <th style="padding:0.6rem 0.85rem;font-size:0.78rem;font-weight:700;color:#475569;text-align:left;">Grupo/Ficha</th>
                            <th style="padding:0.6rem 0.85rem;font-size:0.78rem;font-weight:700;color:#475569;text-align:left;">Registrado por</th>
                            <th style="padding:0.6rem 0.85rem;font-size:0.78rem;font-weight:700;color:#475569;text-align:center;"></th>
                        </tr>
                    </thead>
                    <tbody>${linhas}</tbody>
                </table>
            </div>
        </div>`;
    } else {
        tabelaHtml = `
        <div style="margin-top:2rem;padding:1.25rem;background:#f8fafc;border:1.5px dashed #e2e8f0;border-radius:10px;text-align:center;color:#94a3b8;font-size:0.88rem;">
            <i class="ph ph-package" style="font-size:2rem;display:block;margin-bottom:0.4rem;"></i>
            Nenhum EPI entregue registrado para este colaborador.
        </div>`;
    }

    container.innerHTML = `
        <div style="margin-bottom:1.25rem;">
            <h3 style="margin:0 0 4px;font-size:1.1rem;font-weight:700;color:#0f172a;">Fichas de EPI</h3>
            <p style="margin:0;font-size:0.82rem;color:#64748b;">Histórico para ${viewedColaborador?.nome_completo || ''}.</p>
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
                <span style="background:${f.status === 'ativa' ? '#dcfce7' : '#f1f5f9'};color:${f.status === 'ativa' ? '#15803d' : '#475569'};border-radius:999px;padding:2px 10px;font-size:0.75rem;font-weight:700;white-space:nowrap;">
                    ${f.status === 'ativa' ? '&#9679; Ativa' : '&#9675; Fechada'}
                </span>
                <button onclick="window.previewFichaEpi(${f.id})" class="btn btn-secondary btn-sm" style="height:32px;display:flex;align-items:center;gap:4px;">
                    <i class="ph ph-eye"></i>
                </button>
            </div>
            `).join('')}
        </div>

        ${tabelaHtml}
    `;

    window._epiProntuarioData = { fichas, templates, fichaAtiva, colabId, templateDoColab, todasEntregas };
}
// Expõe como window.renderFichaEpiTab para compatibilidade com módulos externos
window.renderFichaEpiTab = renderFichaEpiTab;

// ============================================================
// FLUXO DE ASSINATURA DE ENTREGA DE EPI — funções restauradas
// ============================================================

window.gerarFichaEpiManualProntuario = async function (templateId) {
    if (!confirm('Deseja gerar a Ficha de EPI para esse colaborador usando o template padrão vinculado a este cargo?')) return;
    const colabId = viewedColaborador?.id;
    if (!colabId) return;
    const template = window._epiProntuarioData?.templates?.find(t => t.id === templateId);
    if (!template) return alert('Template inválido.');
    const payload = { template_id: template.id, grupo: template.grupo, snapshot_epis: template.epis || [], snapshot_termo: template.termo_texto || '', snapshot_rodape: template.rodape_texto || '' };
    const btn = event.currentTarget;
    const oldHtml = btn.innerHTML;
    btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Gerando...'; btn.disabled = true;
    try {
        const res = await fetch(`${API_URL}/colaboradores/${colabId}/epi-fichas`, { method: 'POST', headers: { 'Authorization': `Bearer ${currentToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (!res.ok) throw new Error('Erro na resposta do servidor.');
        renderTabContent('Ficha de EPI', 'Ficha de EPI');
    } catch (err) { console.error(err); alert('Ocorreu um erro ao gerar a ficha ativa.'); btn.innerHTML = oldHtml; btn.disabled = false; }
};

window.abrirAssinaturaEpi = async function (fichaId) {
    const { fichas, colabId } = window._epiProntuarioData || {};
    const ficha = (fichas || []).find(f => f.id === fichaId);
    if (!ficha) return;
    const epis = ficha.snapshot_epis || [];
    const termo = ficha.snapshot_termo || '';
    const old = document.getElementById('epi-assinatura-overlay');
    if (old) old.remove();
    const overlay = document.createElement('div');
    overlay.id = 'epi-assinatura-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:99990;background:rgba(15,23,42,0.92);display:flex;flex-direction:column;overflow:hidden;';
    overlay.innerHTML = `
        <div style="background:#1e3a5f;padding:1rem 2rem;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;">
            <div style="display:flex;align-items:center;gap:0.75rem;"><i class="ph ph-shield-check" style="color:#60a5fa;font-size:1.3rem;"></i><span style="color:#f1f5f9;font-weight:700;font-size:0.97rem;">Registrar Entrega de EPI — ${ficha.grupo}</span></div>
            <button onclick="document.getElementById('epi-assinatura-overlay').remove()" style="background:rgba(255,255,255,0.15);border:none;color:#fff;width:32px;height:32px;border-radius:50%;cursor:pointer;font-size:1.1rem;">×</button>
        </div>
        <div id="epi-assin-body" style="flex:1;overflow-y:auto;padding:1.5rem 2rem;">
            <div id="epi-step-1">
                <div style="display:flex;align-items:center;gap:1rem;margin-bottom:1rem;flex-wrap:wrap;">
                    <div><label style="font-size:0.82rem;font-weight:700;color:#475569;display:block;margin-bottom:4px;">Data de Entrega</label><input type="date" id="epi-data-entrega" style="border:1.5px solid #e2e8f0;border-radius:8px;padding:8px 12px;font-size:0.9rem;color:#0f172a;outline:none;"></div>
                    <div style="flex:1;min-width:200px;"><label style="font-size:0.82rem;font-weight:700;color:#475569;display:block;margin-bottom:4px;">Buscar EPI</label><input type="text" id="epi-filtro-input" placeholder="Filtrar EPIs..." oninput="window._renderEpiGrid(this.value)" style="width:100%;border:1.5px solid #e2e8f0;border-radius:8px;padding:8px 12px;font-size:0.9rem;color:#0f172a;outline:none;box-sizing:border-box;"></div>
                </div>
                <p style="font-size:0.82rem;color:#64748b;margin:0 0 0.75rem;">Ajuste a <strong>quantidade</strong> desejada de cada EPI:</p>
                <div id="epi-lista-botoes" style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;"></div>
                <p id="epi-select-warn" style="color:#dc2626;font-size:0.85rem;margin:0.75rem 0 0;display:none;">&#9888; Defina quantidade > 0 em pelo menos um EPI.</p>
            </div>
            <div id="epi-step-2" style="display:none; grid-template-columns: 1fr 1fr; gap: 2rem;">
                <div style="display:flex;flex-direction:column;min-width:0;">
                    <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:0.85rem 1rem;margin-bottom:1rem;"><p style="font-size:0.85rem;font-weight:700;color:#166534;margin:0 0 6px;">EPIs para entrega em <strong id="epi-data-display"></strong>:</p><ul id="epi-lista-selecionada" style="margin:0;padding-left:1.25rem;font-size:0.85rem;color:#15803d;"></ul></div>
                    <p style="font-size:0.85rem;font-weight:700;color:#374151;margin:0 0 6px;">Termo de Responsabilidade:</p>
                    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:0.9rem;font-size:0.82rem;color:#374151;overflow-y:auto;line-height:1.6;white-space:pre-wrap;flex:1;">${termo}</div>
                </div>
                <div style="display:flex;flex-direction:column;min-width:0;">
                    <p style="font-size:0.95rem;font-weight:700;color:#0f172a;margin:0 0 6px;"><i class="ph ph-pen" style="color:#1e3a5f;"></i> Assinatura do Colaborador:</p>
                    <p style="font-size:0.8rem;color:#64748b;margin:0 0 8px;">Assine abaixo. Será aplicada em todos os itens entregues.</p>
                    <div style="border:2px dashed #94a3b8;border-radius:10px;background:#fafafa;position:relative;flex:1;display:flex;">
                        <canvas id="epi-signature-canvas" width="900" height="450" style="width:100%;height:100%;min-height:220px;border-radius:8px;touch-action:none;cursor:crosshair;display:block;"></canvas>
                        <button onclick="window._limparAssinatura()" style="position:absolute;top:8px;right:8px;background:#f1f5f9;border:1px solid #cbd5e1;border-radius:6px;padding:4px 12px;font-size:0.78rem;color:#475569;cursor:pointer;">Limpar</button>
                    </div>
                    <p id="epi-assin-warn" style="color:#dc2626;font-size:0.82rem;margin:0.5rem 0 0;display:none;">A assinatura é obrigatória.</p>
                </div>
            </div>
            <div id="epi-step-3" style="display:none;text-align:center;padding:4rem 1rem;">
                <i class="ph ph-check-circle" style="font-size:5rem;color:#16a34a;display:block;margin-bottom:1rem;"></i>
                <p style="font-weight:700;font-size:1.2rem;color:#15803d;margin:0 0 6px;">Entrega registrada com sucesso!</p>
                <p style="font-size:0.9rem;color:#64748b;">EPIs e assinatura salvos na ficha.</p>
            </div>
        </div>
        <div id="epi-assin-footer" style="border-top:1px solid #e2e8f0;padding:1rem 2rem;display:flex;justify-content:space-between;align-items:center;background:#f8fafc;flex-shrink:0;">
            <button id="btn-assin-back" onclick="window._assinStep(1)" style="display:none;background:#f1f5f9;border:1px solid #cbd5e1;border-radius:8px;padding:0.65rem 1.5rem;font-weight:600;font-size:0.9rem;cursor:pointer;color:#475569;"><i class="ph ph-arrow-left"></i> Voltar</button>
            <div></div>
            <button id="btn-assin-next" onclick="window._assinNextStep()" class="btn btn-primary" style="padding:0.65rem 2rem;font-weight:700;font-size:0.95rem;display:flex;align-items:center;gap:8px;">Próximo <i class="ph ph-arrow-right"></i></button>
        </div>`;
    document.body.appendChild(overlay);
    window._assinCurrentStep = 1; window._assinFichaId = fichaId; window._assinColabId = colabId; window._assinEpisDisponiveis = epis; window._assinQtds = {};
    setTimeout(() => { window._initSignatureCanvas(); const today = new Date(); const di = document.getElementById('epi-data-entrega'); if (di) { di.value = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0'); } window._renderEpiGrid(''); }, 100);
};

window._renderEpiGrid = function (filtro) {
    const epis = window._assinEpisDisponiveis || [];
    const c2 = document.getElementById('epi-lista-botoes');
    if (!c2) return;
    const f = (filtro || '').toLowerCase().trim();
    const filtered = f ? epis.filter(e => e.toLowerCase().includes(f)) : epis;
    c2.innerHTML = '';
    filtered.forEach(epi => {
        const qty = window._assinQtds[epi] || 0;
        const card = document.createElement('div'); card.setAttribute('data-epi-card', epi);
        card.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:0.65rem 1rem;border:2px solid '+(qty>0?'#16a34a':'#e2e8f0')+';border-radius:10px;background:'+(qty>0?'#f0fdf4':'#fff')+';box-shadow:0 1px 3px rgba(0,0,0,0.06);';
        const lbl = document.createElement('span'); lbl.style.cssText = 'font-size:0.88rem;color:#0f172a;font-weight:600;flex:1;margin-right:0.5rem;line-height:1.3;'; lbl.textContent = epi;
        const ctrl = document.createElement('div'); ctrl.style.cssText = 'display:flex;align-items:center;gap:6px;flex-shrink:0;';
        const btnM = document.createElement('button'); btnM.textContent = '−'; btnM.style.cssText = 'background:'+(qty>0?'#1e3a5f':'#e2e8f0')+';color:#fff;border:none;border-radius:6px;width:32px;height:32px;cursor:pointer;font-size:1.1rem;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;';
        btnM.addEventListener('click', () => window._setEpiQty(epi, Math.max(0, (window._assinQtds[epi]||0)-1)));
        const inp = document.createElement('input'); inp.type='number'; inp.min='0'; inp.value=qty; inp.style.cssText='width:48px;text-align:center;border:1.5px solid #e2e8f0;border-radius:6px;padding:4px;font-size:0.95rem;font-weight:700;color:#0f172a;';
        inp.addEventListener('input', () => window._setEpiQty(epi, Math.max(0, parseInt(inp.value)||0)));
        const btnP = document.createElement('button'); btnP.textContent = '+'; btnP.style.cssText = 'background:#1e3a5f;color:#fff;border:none;border-radius:6px;width:32px;height:32px;cursor:pointer;font-size:1.1rem;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;';
        btnP.addEventListener('click', () => window._setEpiQty(epi, (window._assinQtds[epi]||0)+1));
        ctrl.appendChild(btnM); ctrl.appendChild(inp); ctrl.appendChild(btnP); card.appendChild(lbl); card.appendChild(ctrl); c2.appendChild(card);
    });
};

window._requiresSize = function(epi) { const e=epi.toUpperCase(); if(['CAMISETA','POLO','CALÇA','BLUSA','JAQUETA','COLETE','BLUSAO','BLUSÃO','UNIFORME'].some(k=>e.includes(k))) return 'roupa'; if(e.includes('BOTA')) return 'bota'; return false; };

window._setEpiQty = async function (epi, qty) {
    const prevQty = (window._assinQtds||{})[epi]||0;
    if (qty>prevQty && prevQty===0 && window._requiresSize(epi)) {
        const tipoSize=window._requiresSize(epi); const opcoes=tipoSize==='bota'?['33','34','35','36','37','38','39','40','41','42','43','44','45','46']:['PP','P','M','G','GG','XG','XXG'];
        const {value:tamanho}=await Swal.fire({title:'Qual tamanho?',html:`<p style="color:#475569;font-size:0.9rem;">Selecione o tamanho para <strong>${epi}</strong>:</p><div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin-top:12px;">${opcoes.map(o=>`<button type="button" class="swal-size-btn" data-size="${o}" onclick="document.querySelectorAll('.swal-size-btn').forEach(b=>b.style.background='#f1f5f9');this.style.background='#1e3a5f';this.style.color='#fff';document.getElementById('swal-size-val').value='${o}'" style="padding:8px 14px;border:1.5px solid #e2e8f0;border-radius:8px;font-weight:700;font-size:0.9rem;cursor:pointer;background:#f1f5f9;">${o}</button>`).join('')}</div><input type="hidden" id="swal-size-val" value="">`,showCancelButton:true,confirmButtonText:'Confirmar',cancelButtonText:'Pular',confirmButtonColor:'#1e3a5f',preConfirm:()=>document.getElementById('swal-size-val').value||null,didOpen:()=>{const c=document.querySelector('.swal2-container');if(c)c.style.zIndex='999999';}});
        if(tamanho){const nomeComTamanho=`${epi} (TAM ${tamanho})`;if(!window._assinEpisDisponiveis.includes(nomeComTamanho))window._assinEpisDisponiveis.push(nomeComTamanho);window._assinQtds[nomeComTamanho]=qty;window._renderEpiGrid(document.getElementById('epi-filtro-input')?.value||'');return;}
    }
    if(!window._assinQtds)window._assinQtds={};
    window._assinQtds[epi]=qty;
    const card=document.querySelector(`[data-epi-card="${CSS.escape(epi)}"]`);
    if(card){card.style.border=qty>0?'2px solid #16a34a':'2px solid #e2e8f0';card.style.background=qty>0?'#f0fdf4':'#fff';const inp=card.querySelector('input[type="number"]');if(inp)inp.value=qty;const btnM=card.querySelectorAll('button')[0];if(btnM)btnM.style.background=qty>0?'#1e3a5f':'#e2e8f0';}
};

window._assinStep = function(step) {
    const s1=document.getElementById('epi-step-1'),s2=document.getElementById('epi-step-2'),s3=document.getElementById('epi-step-3');
    const back=document.getElementById('btn-assin-back'),next=document.getElementById('btn-assin-next'),footer=document.getElementById('epi-assin-footer');
    if(s1)s1.style.display=step===1?'':'none'; if(s2)s2.style.display=step===2?'grid':'none'; if(s3)s3.style.display=step===3?'':'none';
    if(back)back.style.display=step===2?'':'none';
    if(next){if(step===1){next.style.display='';next.innerHTML='Próximo <i class="ph ph-arrow-right"></i>';next.disabled=false;}else if(step===2){next.style.display='';next.innerHTML='<i class="ph ph-check"></i> Confirmar Entrega';next.disabled=false;}else{next.style.display='none';}}
    if(footer)footer.style.display=step===3?'none':'';
    window._assinCurrentStep=step;
    if(step===2)setTimeout(()=>window._initSignatureCanvas(),80);
};

window._assinNextStep = async function () {
    const step=window._assinCurrentStep||1;
    if(step===1){
        const sel=Object.entries(window._assinQtds||{}).filter(([,q])=>q>0);
        if(sel.length===0){const w=document.getElementById('epi-select-warn');if(w){w.style.display='';setTimeout(()=>w.style.display='none',3000);}return;}
        const di=document.getElementById('epi-data-entrega'); const dataVal=di?di.value:''; const dataDisplay=document.getElementById('epi-data-display');
        if(dataDisplay&&dataVal){const[y,m,d]=dataVal.split('-');dataDisplay.textContent=`${d}/${m}/${y}`;}
        const lista=document.getElementById('epi-lista-selecionada'); if(lista)lista.innerHTML=sel.map(([nome,qty])=>`<li>${nome}${qty>1?` <strong>(×${qty})</strong>`:''}</li>`).join('');
        window._assinStep(2); return;
    }
    if(step===2){
        const w2=document.getElementById('epi-assin-warn');
        if(!window._assinaturaTemConteudo()){if(w2){w2.style.display='';setTimeout(()=>w2.style.display='none',3000);}return;}
        if(w2)w2.style.display='none';
        const btnNext=document.getElementById('btn-assin-next'); if(btnNext){btnNext.disabled=true;btnNext.innerHTML='<i class="ph ph-spinner ph-spin"></i> Salvando...';}
        try {
            const canvas=document.getElementById('epi-signature-canvas'); const assinaturaBase64=canvas?canvas.toDataURL('image/png'):'';
            const di=document.getElementById('epi-data-entrega'); const dataVal=di?di.value:new Date().toISOString().split('T')[0]; const[y,m,d]=dataVal.split('-'); const dataFormatada=`${d}/${m}/${y}`;
            const episSelecionados=[]; Object.entries(window._assinQtds||{}).forEach(([nome,qty])=>{for(let i=0;i<qty;i++)episSelecionados.push(nome);});
            const controller=new AbortController(); const timeout=setTimeout(()=>controller.abort(),30000);
            const res=await fetch(`${API_URL}/epi-fichas/${window._assinFichaId}/entregas`,{method:'POST',headers:{'Authorization':`Bearer ${currentToken}`,'Content-Type':'application/json'},body:JSON.stringify({data_entrega:dataFormatada,epis_entregues:episSelecionados,assinatura_base64:assinaturaBase64,colaborador_id:window._assinColabId,registrado_por:currentUser?.nome||currentUser?.email||'Sistema'}),signal:controller.signal});
            clearTimeout(timeout);
            if(!res.ok){const errJson=await res.json().catch(()=>({}));throw new Error(errJson.error||`Erro HTTP ${res.status}`);}
            window._assinStep(3);
            (async()=>{try{const{fichas:ff,colabId:cid,templates}=window._epiProntuarioData||{};const fich=(ff||[]).find(f=>f.id===window._assinFichaId);if(fich&&cid){if(typeof ensureHeaderLogo==='function')await ensureHeaderLogo().catch(()=>{});const tpl=(templates||[]).find(t=>t.grupo===fich.grupo)||fich;const{jsPDF}=window.jspdf;const todasEntregas=await fetch(`${API_URL}/epi-fichas/${window._assinFichaId}/entregas`,{headers:{'Authorization':'Bearer '+currentToken}}).then(r=>r.json()).catch(()=>[]);const linhasFull=[];(todasEntregas||[]).forEach(e=>{const epis=e.epis_entregues||[];if(epis.length===0){linhasFull.push({data:e.data_entrega||'',descricao:'',qtd:1,assinatura_base64:e.assinatura_base64});}else{const grp={};epis.forEach(nome=>{grp[nome]=(grp[nome]||0)+1;});Object.entries(grp).forEach(([nome,qty])=>{linhasFull.push({data:e.data_entrega||'',descricao:nome,qtd:qty,assinatura_base64:e.assinatura_base64});});}});const doc=window.gerarDocEpi(tpl,viewedColaborador||{},jsPDF,linhasFull);const pdfB64=doc.output('datauristring');await fetch(API_URL+'/epi-fichas/'+window._assinFichaId+'/save-onedrive',{method:'POST',headers:{'Authorization':'Bearer '+currentToken,'Content-Type':'application/json'},body:JSON.stringify({pdf_base64:pdfB64,colaborador_id:cid})}).catch(e2=>console.warn('[save-onedrive]',e2));}}catch(se){console.warn('[save-onedrive]',se);}})();
            setTimeout(()=>{const old=document.getElementById('epi-assinatura-overlay');if(old)old.remove();window.previewFichaEpi(window._assinFichaId);const activeTab=document.querySelector('#tabs-list li.active');if(activeTab)renderTabContent(activeTab.dataset.tab,activeTab.textContent,true);},2000);
        } catch(err){
            const btnNext=document.getElementById('btn-assin-next');if(btnNext){btnNext.disabled=false;btnNext.innerHTML='<i class="ph ph-check"></i> Confirmar Entrega';}
            const msg=err.name==='AbortError'?'O servidor demorou muito para responder (30s). Verifique se o servidor está online e tente novamente.':'Erro ao salvar entrega: '+err.message;
            Swal.fire({icon:'error',title:'Falha ao salvar',text:msg,confirmButtonColor:'#e67700',didOpen:()=>{const c=document.querySelector('.swal2-container');if(c)c.style.zIndex='999999';}});
        }
        return;
    }
    if(step===3){const old=document.getElementById('epi-assinatura-overlay');if(old)old.remove();}
};

window._initSignatureCanvas = function () {
    const canvas=document.getElementById('epi-signature-canvas'); if(!canvas)return;
    const ctx=canvas.getContext('2d'); ctx.clearRect(0,0,canvas.width,canvas.height); ctx.strokeStyle='#1e3a5f'; ctx.lineWidth=4; ctx.lineCap='round'; ctx.lineJoin='round';
    let drawing=false,lastX=0,lastY=0;
    const getPos=(e)=>{const rect=canvas.getBoundingClientRect();const scaleX=canvas.width/rect.width;const scaleY=canvas.height/rect.height;if(e.touches)return{x:(e.touches[0].clientX-rect.left)*scaleX,y:(e.touches[0].clientY-rect.top)*scaleY};return{x:(e.clientX-rect.left)*scaleX,y:(e.clientY-rect.top)*scaleY};};
    canvas.onmousedown=canvas.ontouchstart=(e)=>{e.preventDefault();drawing=true;const p=getPos(e);lastX=p.x;lastY=p.y;};
    canvas.onmousemove=canvas.ontouchmove=(e)=>{e.preventDefault();if(!drawing)return;const p=getPos(e);ctx.beginPath();ctx.moveTo(lastX,lastY);ctx.lineTo(p.x,p.y);ctx.stroke();lastX=p.x;lastY=p.y;};
    canvas.onmouseup=canvas.ontouchend=()=>{drawing=false;}; canvas.onmouseleave=()=>{drawing=false;};
};
window._limparAssinatura=function(){const c=document.getElementById('epi-signature-canvas');if(c)c.getContext('2d').clearRect(0,0,c.width,c.height);};
window._assinaturaTemConteudo=function(){const c=document.getElementById('epi-signature-canvas');if(!c)return false;const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;for(let i=3;i<d.length;i+=4)if(d[i]>0)return true;return false;};

window.gerarNovaFichaEpi = async function () {
    const{templates,fichaAtiva,colabId,templateDoColab}=window._epiProntuarioData||{};
    if(!templates||!colabId)return; const template=templateDoColab||templates[0];
    if(!template){alert('Nenhum template de EPI encontrado para o departamento deste colaborador.');return;}
    if(fichaAtiva){const ok=confirm(`Já existe uma ficha ativa (${fichaAtiva.grupo}). Deseja fechar a atual e criar nova?`);if(!ok)return;}
    const res=await fetch(`${API_URL}/colaboradores/${colabId}/epi-fichas`,{method:'POST',headers:{'Authorization':`Bearer ${currentToken}`,'Content-Type':'application/json'},body:JSON.stringify({template_id:template.id,grupo:template.grupo,snapshot_epis:template.epis,snapshot_termo:template.termo_texto,snapshot_rodape:template.rodape_texto})});
    const created=await res.json(); if(!created.id){alert('Erro ao criar ficha.');return;}
    const activeTab=document.querySelector('#tabs-list li.active'); if(activeTab)renderTabContent(activeTab.dataset.tab,activeTab.textContent,true);
    if(created.id)setTimeout(()=>{window.previewFichaEpi(created.id);},500);
};

window.previewFichaEpi = async function (fichaId) {
    const{fichas,templates}=window._epiProntuarioData||{};
    const ficha=(fichas||[]).find(f=>f.id===fichaId); if(!ficha){alert('Ficha nao encontrada.');return;}
    let linhasFilled=[];
    try{const entregas=await apiGet('/epi-fichas/'+fichaId+'/entregas');(entregas||[]).forEach(e=>{const epis=e.epis_entregues||[];if(epis.length===0){linhasFilled.push({data:e.data_entrega||'',descricao:'',qtd:1,assinatura_base64:e.assinatura_base64});}else{const grp={};epis.forEach(nome=>{grp[nome]=(grp[nome]||0)+1;});Object.entries(grp).forEach(([nome,qty])=>{linhasFilled.push({data:e.data_entrega||'',descricao:nome,qtd:qty,assinatura_base64:e.assinatura_base64});});}});}catch(err){console.warn('Erro entregas:',err);}
    const template=(templates||[]).find(t=>t.grupo===ficha.grupo)||{epis:ficha.snapshot_epis||[],termo_texto:ficha.snapshot_termo,rodape_texto:ficha.snapshot_rodape,grupo:ficha.grupo};
    if(typeof ensureHeaderLogo==='function')await ensureHeaderLogo().catch(()=>{});
    const{jsPDF}=window.jspdf; const doc=window.gerarDocEpi(template,viewedColaborador||{},jsPDF,linhasFilled);
    const pdfBytes=doc.output('arraybuffer'); const blob=new Blob([pdfBytes],{type:'application/pdf'}); const blobUrl=URL.createObjectURL(blob);
    const old=document.getElementById('epi-preview-overlay'); if(old){old._blobUrl&&URL.revokeObjectURL(old._blobUrl);old.remove();}
    window.closeEpiPreviewOverlay=function(){const o=document.getElementById('epi-preview-overlay');if(o){if(o._blobUrl)URL.revokeObjectURL(o._blobUrl);o.remove();}};
    const ov=document.createElement('div'); ov.id='epi-preview-overlay'; ov._blobUrl=blobUrl;
    ov.style.cssText='position:fixed;inset:0;z-index:99999;background:rgba(15,23,42,0.92);display:flex;flex-direction:column;align-items:stretch;padding:1rem;gap:0.75rem;';
    const nomeArq=`FichaEPI_${(ficha.grupo||'EPI').replace(/\s+/g,'_')}.pdf`;
    const header=document.createElement('div'); header.style.cssText='display:flex;justify-content:space-between;align-items:center;padding:0 0.5rem;flex-shrink:0;';
    header.innerHTML=`<p style="margin:0;color:#f1f5f9;font-weight:700;font-size:1rem;">Ficha de EPI &mdash; ${ficha.grupo}${ficha.status==='ativa'?'<span style="color:#86efac;margin-left:8px;">&#9679; Ativa</span>':''}</p><div style="display:flex;gap:8px;align-items:center;"><a href="${blobUrl}" download="${nomeArq}" style="background:#1e3a5f;color:#fff;border:none;padding:6px 16px;border-radius:8px;font-weight:700;font-size:0.85rem;cursor:pointer;display:flex;align-items:center;gap:6px;text-decoration:none;"><i class="ph ph-download"></i> Baixar</a><button onclick="window.closeEpiPreviewOverlay()" style="background:rgba(255,255,255,0.15);border:none;color:#fff;width:32px;height:32px;border-radius:50%;cursor:pointer;font-size:1.1rem;">&times;</button></div>`;
    ov.appendChild(header); const iframe=document.createElement('iframe'); iframe.src=blobUrl; iframe.style.cssText='flex:1;border:none;border-radius:8px;background:#fff;'; ov.appendChild(iframe); document.body.appendChild(ov);
};

window._excluirEpiEntrega = async function(id, nome, btnEl, ficha_id) {
    if (!confirm(`Deseja realmente excluir o EPI "${nome}" da ficha?`)) return;
    const senha = prompt('Digite a senha para autorizar a exclusão:');
    if (!senha && senha !== '') return;
    try {
        btnEl.disabled = true;
        btnEl.innerHTML = '<i class="ph ph-spinner" style="font-size:0.85rem;"></i>';
        const res = await fetch(`${API_URL}/epi-entregas/${id}/epi`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${currentToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ senha, epi_nome: nome })
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error || 'Erro ao excluir.');
        
        // Remove a linha da tabela sem recarregar tudo
        const tr = btnEl.closest('tr');
        if (tr) {
            tr.style.transition = 'opacity .3s';
            tr.style.opacity = '0';
            setTimeout(() => {
                tr.remove();
                // Atualiza contador
                const badge = document.querySelector('[data-epi-count-badge]');
                if (badge) {
                    const n = parseInt(badge.textContent) - 1;
                    badge.textContent = n + ' registro' + (n !== 1 ? 's' : '');
                }
            }, 300);
        }
        
        // Regenerar PDF e salvar na pasta (OneDrive)
        (async () => {
            try {
                if (ficha_id && window._epiProntuarioData && window._epiProntuarioData.colabId) {
                    const cid = window._epiProntuarioData.colabId;
                    const fich = (window._epiProntuarioData.fichas || []).find(f => f.id === ficha_id);
                    if (fich) {
                        if (typeof ensureHeaderLogo === 'function') await ensureHeaderLogo().catch(() => { });
                        const tpl = (window._epiProntuarioData.templates || []).find(t => t.grupo === fich.grupo) || fich;
                        const { jsPDF } = window.jspdf;

                        const todasEntregas = await fetch(`${API_URL}/epi-fichas/${ficha_id}/entregas`, {
                            headers: { 'Authorization': 'Bearer ' + currentToken }
                        }).then(r => r.json()).catch(() => []);

                        const linhasFull = [];
                        (todasEntregas || []).forEach(ent => {
                            const epis = ent.epis_entregues || [];
                            if (epis.length === 0) {
                                linhasFull.push({ data: ent.data_entrega || '', descricao: '', qtd: 1, assinatura_base64: ent.assinatura_base64 });
                            } else {
                                const grp = {};
                                epis.forEach(n => { grp[n] = (grp[n] || 0) + 1; });
                                Object.entries(grp).forEach(([n, qty]) => {
                                    linhasFull.push({ data: ent.data_entrega || '', descricao: n, qtd: qty, assinatura_base64: ent.assinatura_base64 });
                                });
                            }
                        });

                        const doc = window.gerarDocEpi(tpl, viewedColaborador || {}, jsPDF, linhasFull);
                        const pdfB64 = doc.output('datauristring');
                        await fetch(API_URL + '/epi-fichas/' + ficha_id + '/save-onedrive', {
                            method: 'POST',
                            headers: { 'Authorization': 'Bearer ' + currentToken, 'Content-Type': 'application/json' },
                            body: JSON.stringify({ pdf_base64: pdfB64, colaborador_id: cid })
                        }).catch(e2 => console.warn('[save-onedrive]', e2));
                        
                        // Atualiza preview se estiver aberto (opcional)
                        const activeTab = document.querySelector('#tabs-list li.active');
                        if (activeTab && activeTab.dataset.tab === 'Ficha de EPI') {
                            // setTimeout(() => renderTabContent('Ficha de EPI', 'Ficha de EPI', true), 1000);
                        }
                    }
                }
            } catch (errPdf) { console.warn('Erro ao atualizar PDF do EPI no OneDrive:', errPdf); }
        })();
        
    } catch(e) {
        alert(e.message);
        btnEl.disabled = false;
        btnEl.innerHTML = '<i class="ph ph-trash" style="font-size:0.85rem;"></i>';
    }
};

// 
// ═══════════════════════════════════════════════════════════════════════════════
// ANEXOS DE OCORRÊNCIAS (Advertências)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Carrega a lista de anexos de uma ocorrência e renderiza as miniaturas.
 */
window.carregarOcorrenciaAnexos = async function(docId) {
    const galeria = document.getElementById(`ocorr-galeria-${docId}`);
    if (!galeria) return;
    galeria.innerHTML = '<span style="color:#94a3b8; font-size:0.8rem; font-style:italic;">Carregando anexos...</span>';
    try {
        const token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token') || '';
        const resp = await fetch(`${window.API_URL}/ocorrencias/${docId}/anexos`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!resp.ok) throw new Error('Erro ao buscar anexos');
        const anexos = await resp.json();
        window._renderizarAnexosGaleria(docId, anexos);
    } catch(e) {
        galeria.innerHTML = '<span style="color:#ef4444; font-size:0.8rem;">Não foi possível carregar os anexos.</span>';
    }
};

/**
 * Faz upload de arquivos selecionados para a ocorrência.
 */
window.uploadOcorrenciaAnexo = async function(docId, inputEl) {
    const files = Array.from(inputEl.files);
    if (!files.length) return;

    // Abre o painel se não estiver aberto
    const panel = document.getElementById(`ocorr-anexo-panel-${docId}`);
    const arrow  = document.getElementById(`ocorr-arrow-${docId}`);
    if (panel && (!panel.style.maxHeight || panel.style.maxHeight === '0px')) {
        panel.style.maxHeight = '600px';
        panel.style.padding = '0.5rem 1rem';
        if (arrow) arrow.style.transform = 'rotate(90deg)';
    }

    for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('docId', docId);
        try {
            const token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token') || '';
            const resp = await fetch(`${window.API_URL}/ocorrencias/${docId}/anexos`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });
            if (!resp.ok) throw new Error('Falha no upload');
        } catch(e) {
            showToast(`Erro ao enviar ${file.name}: ${e.message}`, 'danger');
        }
    }
    inputEl.value = '';
    await window.carregarOcorrenciaAnexos(docId);
    showToast('Anexo(s) enviado(s) com sucesso!', 'success');
};

/**
 * Exclui um anexo de uma ocorrência.
 */
window.excluirOcorrenciaAnexo = async function(docId, anexoId) {
    if (!confirm('Deseja excluir este anexo?')) return;
    try {
        const token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token') || '';
        const resp = await fetch(`${window.API_URL}/ocorrencias/${docId}/anexos/${anexoId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!resp.ok) throw new Error('Erro ao excluir');
        await window.carregarOcorrenciaAnexos(docId);
        showToast('Anexo excluído.', 'success');
    } catch(e) {
        showToast('Erro ao excluir o anexo.', 'danger');
    }
};

/**
 * Renderiza as miniaturas dos anexos na galeria.
 */
window._renderizarAnexosGaleria = function(docId, anexos) {
    const galeria = document.getElementById(`ocorr-galeria-${docId}`);
    const label   = document.getElementById(`ocorr-label-${docId}`);
    if (!galeria) return;

    if (label) {
        label.textContent = anexos.length > 0 ? `Anexos (${anexos.length})` : 'Anexos';
    }

    if (!anexos.length) {
        galeria.innerHTML = '<span style="color:#94a3b8; font-size:0.8rem; font-style:italic;">Nenhum anexo. Clique em "Anexar arquivo" para adicionar.</span>';
        return;
    }

    galeria.innerHTML = anexos.map(a => {
        const isImage = /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(a.nome || '') || (a.tipo && a.tipo.startsWith('image/'));
        const isPdf   = /\.pdf$/i.test(a.nome || '') || a.tipo === 'application/pdf';
        const url     = a.url;
        const nome    = a.nome || 'Arquivo';

        const thumbnail = isImage
            ? `<img src="${url}" alt="${nome}" style="width:100%; height:100%; object-fit:cover; display:block;">`
            : isPdf
                ? `<div style="width:100%; height:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; background:#fef2f2;">
                     <i class="ph ph-file-pdf" style="font-size:2rem; color:#ef4444;"></i>
                     <span style="font-size:0.62rem; color:#64748b; margin-top:4px; text-align:center; padding:0 4px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:90px;">${nome}</span>
                   </div>`
                : `<div style="width:100%; height:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; background:#f8fafc;">
                     <i class="ph ph-file-doc" style="font-size:2rem; color:#0369a1;"></i>
                     <span style="font-size:0.62rem; color:#64748b; margin-top:4px; text-align:center; padding:0 4px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:90px;">${nome}</span>
                   </div>`;

        return `
            <div style="position:relative; width:100px; height:100px; border-radius:8px; overflow:hidden; border:1.5px solid #e2e8f0; cursor:pointer; box-shadow:0 1px 4px rgba(0,0,0,.07); flex-shrink:0;"
                 title="${nome}" onclick="window._abrirAnexoOcorrencia('${url}', '${nome}', ${isImage})">
                ${thumbnail}
                <button onclick="event.stopPropagation(); window.excluirOcorrenciaAnexo(${docId}, ${a.id})"
                        style="position:absolute; top:3px; right:3px; background:rgba(239,68,68,0.85); color:#fff; border:none; border-radius:4px; width:20px; height:20px; font-size:0.7rem; cursor:pointer; display:flex; align-items:center; justify-content:center; line-height:1;"
                        title="Excluir anexo">✕</button>
            </div>`;
    }).join('');
};

/**
 * Abre o visualizador de anexo (modal inline para imagens, nova aba para outros).
 */
window._abrirAnexoOcorrencia = function(url, nome, isImage) {
    if (!isImage) {
        window.open(url, '_blank');
        return;
    }
    // Modal de imagem
    let modal = document.getElementById('ocorr-img-modal');
    if (modal) modal.remove();

    modal = document.createElement('div');
    modal.id = 'ocorr-img-modal';
    modal.style.cssText = 'position:fixed; inset:0; background:rgba(0,0,0,.82); z-index:99999; display:flex; align-items:center; justify-content:center;';
    modal.innerHTML = `
        <div style="position:relative; max-width:90vw; max-height:90vh;">
            <img src="${url}" alt="${nome}" style="max-width:90vw; max-height:85vh; border-radius:10px; box-shadow:0 8px 40px rgba(0,0,0,.5);">
            <button onclick="document.getElementById('ocorr-img-modal').remove()"
                    style="position:absolute; top:-14px; right:-14px; background:#ef4444; color:#fff; border:none; border-radius:50%; width:30px; height:30px; font-size:1rem; cursor:pointer; display:flex; align-items:center; justify-content:center; box-shadow:0 2px 8px rgba(0,0,0,.3);">✕</button>
            <a href="${url}" target="_blank"
               style="position:absolute; bottom:-32px; left:50%; transform:translateX(-50%); color:#fff; font-size:0.8rem; text-decoration:underline; white-space:nowrap;">${nome}</a>
        </div>`;
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
    document.body.appendChild(modal);
};

window._carregarAuditoria = async function () {
    const tbody = document.getElementById('auditoria-tbody');
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:20px;color:#94a3b8;"><i class="ph ph-spinner" style="font-size:1.5rem;animation:spin 1s linear infinite;display:block;margin-bottom:8px;"></i> Carregando registros...</td></tr>`;

    try {
        const r = await apiGet('/assinaturas-auditoria');
        if (!r || r.error) throw new Error(r?.error || 'Erro desconhecido');

        if (r.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:20px;color:#94a3b8;">Nenhum registro de auditoria encontrado.</td></tr>`;
            return;
        }

        tbody.innerHTML = r.map(aud => {
            // Converte timestamp para horário de Brasília (UTC-3)
            const dtFormatada = aud.data_hora
                ? new Date(aud.data_hora).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
                : '-';
            return `
            <tr style="border-bottom:1px solid #e2e8f0;">
                <td style="padding:12px 16px;">${dtFormatada}</td>
                <td style="padding:12px 16px;font-weight:500;">${aud.tipo_documento}<br><small style="color:#64748b;">${aud.detalhes || ''}</small></td>
                <td style="padding:12px 16px;">${aud.colaborador_nome}</td>
                <td style="padding:12px 16px;font-family:monospace;font-size:0.85em;">${aud.ip || '-'}</td>
                <td style="padding:12px 16px;max-width:200px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${aud.dispositivo}">${aud.dispositivo || '-'}</td>
                <td style="padding:12px 16px;">${aud.gps_lat ? `<a href="https://maps.google.com/?q=${aud.gps_lat},${aud.gps_lon}" target="_blank" style="color:#0ea5e9;text-decoration:none;"><i class="ph ph-map-pin"></i> Ver no Mapa</a>` : '-'}</td>
                <td style="padding:12px 16px;font-family:monospace;font-size:0.8em;word-break:break-all;max-width:250px;">${aud.hash_pdf || '-'}</td>
            </tr>`;
        }).join('');



    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:20px;color:#dc2626;"><i class="ph ph-warning-circle"></i> Erro ao carregar auditoria: ${e.message}</td></tr>`;
    }
};

// Hook para navegar e carregar
document.addEventListener('DOMContentLoaded', () => {
    const originalNavigateTo = window.navigateTo;
    if (originalNavigateTo) {
        window.navigateTo = function(targetId) {
            originalNavigateTo(targetId);
            if (targetId === 'auditoria') {
                if (window._carregarAuditoria) window._carregarAuditoria();
            }
        };
    }
});

