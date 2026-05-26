const fs = require('fs');

// 1. UPDATE index.html
let html = fs.readFileSync('frontend/index.html', 'utf8');

// Separate view-cargos into view-cargos and view-departamentos
// Change the sidebar link
html = html.replace(
    '<a href="#" class="nav-item" data-target="cargos"><i class="ph ph-briefcase"></i> Cargos e Dept</a>',
    '<a href="#" class="nav-item" data-target="cargos"><i class="ph ph-briefcase"></i> Cargos</a>'
);
// Add to Diretoria menu
html = html.replace(
    '<a href="#" class="nav-item" data-target="homologacao"><i class="ph ph-database"></i> Homologação</a>',
    '<a href="#" class="nav-item" data-target="homologacao"><i class="ph ph-database"></i> Homologação</a>\n                    <a href="#" class="nav-item" data-target="departamentos"><i class="ph ph-buildings"></i> Departamentos</a>'
);

// We need to extract the tab-content-departamentos and create a new section
if (html.includes('<div id="tab-content-departamentos" style="display: none;">')) {
    let deptoContentStart = html.indexOf('<div id="tab-content-departamentos" style="display: none;">');
    let deptoContentEnd = html.indexOf('<!-- FIM CONTAINER DEPARTAMENTOS -->', deptoContentStart);
    if (deptoContentEnd !== -1) {
        deptoContentEnd += '<!-- FIM CONTAINER DEPARTAMENTOS -->'.length;
        
        let deptoHtml = html.substring(deptoContentStart, deptoContentEnd);
        deptoHtml = deptoHtml.replace('style="display: none;"', '');
        
        const newSection = `
                <section id="view-departamentos" class="content-view" style="display: none;">
                    <div class="page-header flex-between" style="position: sticky; top: 60px; z-index: 20; background: var(--bg-main); padding: 1rem 0; margin-top: -1.5rem; margin-bottom: 1.5rem; border-bottom: 1px solid var(--border-color);">
                        <div style="display: flex; align-items: center; gap: 1.5rem;">
                            <i class="ph ph-buildings" style="font-size: 2rem; color: var(--primary-color);"></i>
                            <div>
                                <h2 style="margin: 0; font-size: 1.4rem;">Gestão de Departamentos</h2>
                                <p style="margin: 4px 0 0; color: #64748b; font-size: 0.85rem;">Gerencie a estrutura organizacional e responsáveis.</p>
                            </div>
                        </div>
                    </div>
                    ${deptoHtml}
                </section>
        `;
        
        // Remove the depto content from cargos
        html = html.replace(html.substring(deptoContentStart, deptoContentEnd), '');
        // Remove the tab buttons
        html = html.replace(/<div style="display: flex; gap: 4px; padding: 0 1rem; border-bottom: 2px solid #e2e8f0; margin-bottom: 1.5rem; background: var(--bg-main);">[\s\S]*?<\/div>/, '');
        // Append new section after view-cargos
        html = html.replace('</section>\r\n                <section id="view-faculdade"', '</section>\n' + newSection + '\n                <section id="view-faculdade"');
        html = html.replace('</section>\n                <section id="view-faculdade"', '</section>\n' + newSection + '\n                <section id="view-faculdade"');
    }
}
fs.writeFileSync('frontend/index.html', html);

// 2. UPDATE app.js
let app = fs.readFileSync('frontend/app.js', 'utf8');

// Hide Novo Cargo button and Ações column if !window.isTopAdmin
if (app.includes('async function loadCargos() {')) {
    app = app.replace(
        'async function loadCargos() {',
        `async function loadCargos() {
    const isDir = window.isTopAdmin;
    const btnNovo = document.querySelector('button[onclick="toggleCargoView(\\'new\\')"]');
    if (btnNovo) btnNovo.style.display = isDir ? '' : 'none';
    const colsAcao = document.querySelectorAll('#cargo-list-container th:last-child');
    colsAcao.forEach(c => c.style.display = isDir ? '' : 'none');
`
    );
    app = app.replace(
        '<td style="text-align: right; display:flex; gap:0.4rem; justify-content:flex-end; align-items:center;">',
        '<td style="text-align: right; gap:0.4rem; justify-content:flex-end; align-items:center; display: ${window.isTopAdmin ? "flex" : "none"};">'
    );
}

// Update routing
if (app.includes("if (target === 'cargos') {")) {
    app = app.replace(
        "if (target === 'cargos') {",
        "if (target === 'departamentos') { loadDepartamentos(); }\n    if (target === 'cargos') {"
    );
}
fs.writeFileSync('frontend/app.js', app);

// 3. UPDATE usuarios.js
let u = fs.readFileSync('frontend/usuarios.js', 'utf8');
u = u.replace(
    "{ modulo: 'RH', pagina_id: 'cargos',                 pagina_nome: 'Cargos e Departamentos', icone: 'ph-briefcase' },",
    "{ modulo: 'RH', pagina_id: 'cargos',                 pagina_nome: 'Cargos', icone: 'ph-briefcase' },"
);
if (!u.includes("pagina_id: 'departamentos'")) {
    u = u.replace(
        "{ modulo: 'Diretoria', pagina_id: 'homologacao',         pagina_nome: 'Homologação', icone: 'ph-database' },",
        "{ modulo: 'Diretoria', pagina_id: 'homologacao',         pagina_nome: 'Homologação', icone: 'ph-database' },\n    { modulo: 'Diretoria', pagina_id: 'departamentos',       pagina_nome: 'Departamentos', icone: 'ph-buildings' },"
    );
    u = u.replace(
        "telas: ['usuarios-permissoes', 'chaves', 'certificado-digital', 'homologacao']",
        "telas: ['usuarios-permissoes', 'chaves', 'certificado-digital', 'homologacao', 'departamentos']"
    );
}
fs.writeFileSync('frontend/usuarios.js', u);
