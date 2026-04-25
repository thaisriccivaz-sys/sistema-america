const fs = require('fs');

// ─── Fix 1: index.html sidebar ───────────────────────────────────────────────
let html = fs.readFileSync('./frontend/index.html', 'utf8');

// Replace the RH submenu entries (only Admissao/Integracao/Ferias visible, need all back)
// and re-add missing departments Logistica/Financeiro/Comercial/Admin between RH and Diretoria

const oldSidebar = /(<div class="dept-submenu" id="sub-rh">[\s\S]*?<\/div>\s*<\/div>\s*\r?\n)(\s*<!-- Diretoria - Laranja -->)/;

const newRH = `                <div class="dept-submenu" id="sub-rh">
                    <div class="dept-submenu-header" style="color:#f503c5;"><i class="ph ph-users"></i> RH</div>
                    <a href="#" class="nav-item" data-target="dashboard"><i class="ph ph-squares-four"></i> Dashboard</a>
                    <a href="#" class="nav-item" data-target="colaboradores"><i class="ph ph-address-book"></i> Colaboradores</a>
                    <a href="#" class="nav-item" data-target="ferias"><i class="ph ph-airplane-tilt"></i> F&eacute;rias</a>
                    <a href="#" class="nav-item" data-target="admissao"><i class="ph ph-list-checks"></i> Admiss&atilde;o</a>
                    <a href="#" class="nav-item" data-target="integracao"><i class="ph ph-users-three"></i> Integra&ccedil;&atilde;o</a>
                    <a href="#" class="nav-item" data-target="assinaturas-digitais"><i class="ph ph-signature"></i> Assinaturas</a>
                    <a href="#" class="nav-item" data-target="cargos"><i class="ph ph-briefcase"></i> Cargos e Dept</a>
                    <a href="#" class="nav-item" data-target="faculdade"><i class="ph ph-graduation-cap"></i> Faculdade</a>
                    <a href="#" class="nav-item" data-target="geradores"><i class="ph ph-file-text"></i> Geradores</a>
                    <a href="#" class="nav-item" data-target="ficha-epi"><i class="ph ph-shield-check"></i> Ficha EPI</a>
                    <a href="#" class="nav-item" data-target="gerenciar-avaliacoes"><i class="ph ph-clipboard-text"></i> Avalia&ccedil;&otilde;es</a>
                    <a href="#" class="nav-item" data-target="dissidio"><i class="ph ph-trend-up"></i> Diss&iacute;dio</a>
                </div>
            </div>

            <!-- Log&iacute;stica - Verde -->
            <div class="dept-item" style="--dept-color:#2d9e5f; --dept-bg:#d6f5e5;">
                <button class="dept-btn" title="Log&iacute;stica">
                    <i class="ph ph-truck"></i>
                    <span>Log&iacute;stica</span>
                </button>
                <div class="dept-submenu">
                    <div class="dept-submenu-header" style="color:#2d9e5f;"><i class="ph ph-truck"></i> Log&iacute;stica</div>
                    <a href="#" class="nav-item" data-target="logistica-em-breve" style="color:#94a3b8;pointer-events:none;"><i class="ph ph-hourglass"></i> Em breve...</a>
                </div>
            </div>

            <!-- Financeiro - Azul -->
            <div class="dept-item" style="--dept-color:#1971c2; --dept-bg:#d0e8fa;">
                <button class="dept-btn" title="Financeiro">
                    <i class="ph ph-currency-dollar"></i>
                    <span>Financeiro</span>
                </button>
                <div class="dept-submenu">
                    <div class="dept-submenu-header" style="color:#1971c2;"><i class="ph ph-currency-dollar"></i> Financeiro</div>
                    <a href="#" class="nav-item" data-target="financeiro-em-breve" style="color:#94a3b8;pointer-events:none;"><i class="ph ph-hourglass"></i> Em breve...</a>
                </div>
            </div>

            <!-- Comercial - Roxo -->
            <div class="dept-item" style="--dept-color:#7048e8; --dept-bg:#ede9fc;">
                <button class="dept-btn" title="Comercial">
                    <i class="ph ph-handshake"></i>
                    <span>Comercial</span>
                </button>
                <div class="dept-submenu">
                    <div class="dept-submenu-header" style="color:#7048e8;"><i class="ph ph-handshake"></i> Comercial</div>
                    <a href="#" class="nav-item" data-target="comercial-em-breve" style="color:#94a3b8;pointer-events:none;"><i class="ph ph-hourglass"></i> Em breve...</a>
                </div>
            </div>

            <!-- Administrativo - Amarelo -->
            <div class="dept-item" style="--dept-color:#e67700; --dept-bg:#fff3cd;">
                <button class="dept-btn" title="Administrativo">
                    <i class="ph ph-gear"></i>
                    <span>Admin.</span>
                </button>
                <div class="dept-submenu">
                    <div class="dept-submenu-header" style="color:#e67700;"><i class="ph ph-gear"></i> Administrativo</div>
                    <a href="#" class="nav-item" data-target="admin-em-breve" style="color:#94a3b8;pointer-events:none;"><i class="ph ph-hourglass"></i> Em breve...</a>
                </div>
            </div>

`;

html = html.replace(oldSidebar, (match, rhEnd, dirLabel) => {
    return newRH + `            ${dirLabel.trim()}`;
});

fs.writeFileSync('./frontend/index.html', html, 'utf8');
console.log('index.html sidebar updated!');

// ─── Fix 2: usuarios.js - TELAS_SISTEMA + MENU_HIERARQUIA ────────────────────
let js = fs.readFileSync('./frontend/usuarios.js', 'utf8');

const newTELAS = `const TELAS_SISTEMA = [
    // Módulo RH
    { modulo: 'RH', pagina_id: 'dashboard',             pagina_nome: 'Dashboard' },
    { modulo: 'RH', pagina_id: 'colaboradores',          pagina_nome: 'Colaboradores' },
    { modulo: 'RH', pagina_id: 'ferias',                 pagina_nome: 'Férias' },
    { modulo: 'RH', pagina_id: 'admissao',               pagina_nome: 'Admissão' },
    { modulo: 'RH', pagina_id: 'integracao',             pagina_nome: 'Integração' },
    { modulo: 'RH', pagina_id: 'assinaturas-digitais',   pagina_nome: 'Assinaturas Digitais' },
    { modulo: 'RH', pagina_id: 'cargos',                 pagina_nome: 'Cargos e Departamentos' },
    { modulo: 'RH', pagina_id: 'faculdade',              pagina_nome: 'Faculdade' },
    { modulo: 'RH', pagina_id: 'geradores',              pagina_nome: 'Geradores de Documentos' },
    { modulo: 'RH', pagina_id: 'ficha-epi',              pagina_nome: 'Ficha EPI' },
    { modulo: 'RH', pagina_id: 'gerenciar-avaliacoes',   pagina_nome: 'Avaliações' },
    { modulo: 'RH', pagina_id: 'dissidio',               pagina_nome: 'Dissídio' },
    // Módulo Logística
    { modulo: 'Logística', pagina_id: 'logistica-em-breve', pagina_nome: 'Logística (Em breve)' },
    // Módulo Financeiro
    { modulo: 'Financeiro', pagina_id: 'financeiro-em-breve', pagina_nome: 'Financeiro (Em breve)' },
    // Módulo Comercial
    { modulo: 'Comercial', pagina_id: 'comercial-em-breve', pagina_nome: 'Comercial (Em breve)' },
    // Módulo Administrativo
    { modulo: 'Administrativo', pagina_id: 'admin-em-breve', pagina_nome: 'Administrativo (Em breve)' },
    // Módulo Diretoria / Sistema
    { modulo: 'Diretoria', pagina_id: 'usuarios-permissoes', pagina_nome: 'Usuários e Permissões' },
    { modulo: 'Diretoria', pagina_id: 'chaves',              pagina_nome: 'Chaves' },
    { modulo: 'Diretoria', pagina_id: 'certificado-digital', pagina_nome: 'Certificado Digital' },
    { modulo: 'Diretoria', pagina_id: 'homologacao',         pagina_nome: 'Homologação' },
];`;

const newMENU = `const MENU_HIERARQUIA = [
    {
        modulo: 'RH', icone: 'ph-users',
        grupos: [
            {
                titulo: 'Telas',
                telas: [
                    'dashboard', 'colaboradores', 'ferias', 'admissao', 'integracao',
                    'assinaturas-digitais', 'cargos', 'faculdade', 'geradores',
                    'ficha-epi', 'gerenciar-avaliacoes', 'dissidio'
                ]
            }
        ]
    },
    {
        modulo: 'Logística', icone: 'ph-truck',
        grupos: [{ titulo: 'Telas', telas: ['logistica-em-breve'] }]
    },
    {
        modulo: 'Financeiro', icone: 'ph-currency-dollar',
        grupos: [{ titulo: 'Telas', telas: ['financeiro-em-breve'] }]
    },
    {
        modulo: 'Comercial', icone: 'ph-handshake',
        grupos: [{ titulo: 'Telas', telas: ['comercial-em-breve'] }]
    },
    {
        modulo: 'Administrativo', icone: 'ph-gear',
        grupos: [{ titulo: 'Telas', telas: ['admin-em-breve'] }]
    },
    {
        modulo: 'Diretoria', icone: 'ph-crown',
        grupos: [
            {
                titulo: 'Telas',
                telas: ['usuarios-permissoes', 'chaves', 'certificado-digital', 'homologacao']
            }
        ]
    }
];`;

// Replace TELAS_SISTEMA block
js = js.replace(/const TELAS_SISTEMA = \[[\s\S]*?\];/, newTELAS);

// Replace MENU_HIERARQUIA block  
js = js.replace(/const MENU_HIERARQUIA = \[[\s\S]*?\];/, newMENU);

// Also update the modulo field in selecionarGrupo to use Diretoria instead of Sistema
js = js.replace(/modulo: 'Sistema'/g, "modulo: 'Diretoria'");

fs.writeFileSync('./frontend/usuarios.js', js, 'utf8');
console.log('usuarios.js TELAS_SISTEMA + MENU_HIERARQUIA updated!');
