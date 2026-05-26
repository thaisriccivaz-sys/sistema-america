const fs = require('fs');

// 1. FIX INDEX.HTML
let html = fs.readFileSync('frontend/index.html', 'utf8');

// Change Diretoria color to Red
html = html.replace('--dept-color:#d9480f; --dept-bg:#ffddd0;', '--dept-color:#c92a2a; --dept-bg:#fff5f5;');

// Separate the views correctly
const startMarker = '<!-- TAB 2: GESTÃO DE DEPARTAMENTOS -->';
const endMarker = '</section>';

if (html.includes(startMarker)) {
    // We will extract everything from startMarker until the NEXT </section>
    let cargoEnd = html.indexOf('</section>', html.indexOf(startMarker));
    if (cargoEnd !== -1) {
        let deptoHtml = html.substring(html.indexOf(startMarker), cargoEnd);
        // Clean up the extraction
        deptoHtml = deptoHtml.replace('<!-- TAB 2: GESTÃO DE DEPARTAMENTOS -->', '');
        deptoHtml = deptoHtml.replace('<div id="tab-content-departamentos" style="display: none;">', '');
        // Remove the closing div of tab-content-departamentos
        deptoHtml = deptoHtml.trim();
        if (deptoHtml.endsWith('</div>')) {
            deptoHtml = deptoHtml.slice(0, -6);
        }

        const newSection = `</section>

                <section id="view-departamentos" class="content-view">
                    <div class="page-header flex-between" style="position: sticky; top: 60px; z-index: 20; background: var(--bg-main); padding: 1rem 0; margin-top: -1.5rem; margin-bottom: 1.5rem; border-bottom: 1px solid var(--border-color);">
                        <div style="display: flex; align-items: center; gap: 1.5rem;">
                            <div style="width: 80px; height: 80px; border-radius: 50%; border: 2px dashed #cbd5e0; display: flex; align-items: center; justify-content: center; background: #fff5f5; color: #c92a2a; font-size: 2rem;">
                                <i class="ph ph-buildings"></i>
                            </div>
                            <div>
                                <h2 style="margin: 0; font-size: 1.4rem;">Gestão de Departamentos</h2>
                                <p style="margin: 4px 0 0; color: #64748b; font-size: 0.85rem;">Gerencie a estrutura organizacional e responsáveis.</p>
                            </div>
                        </div>
                    </div>
                    ${deptoHtml}
                </section>`;

        // Replace the chunk in the original html
        html = html.substring(0, html.indexOf(startMarker)) + newSection + html.substring(cargoEnd + 10);
        
        // Remove the tab buttons in view-cargos
        const tabsRegex = /<!-- ABAS INTERNAS \(CARGOS E DEPARTAMENTOS\) -->[\s\S]*?<div id="tab-content-cargos">/;
        html = html.replace(tabsRegex, '');
        // And remove the closing div of tab-content-cargos which should be right before where we inserted
        html = html.replace(/<\/div>\s*<\/div>\s*<\/section>/, '</div>\n                </section>');
    }
}

// Ensure the buttons on the sidebar are correctly updated
html = html.replace('onclick="switchCargoDeptoTab(\'cargos\')"', '');
html = html.replace('onclick="switchCargoDeptoTab(\'departamentos\')"', '');

fs.writeFileSync('frontend/index.html', html);

// 2. FIX APP.JS
let app = fs.readFileSync('frontend/app.js', 'utf8');

// Force update bookmarks color for departamentos
app = app.replace(
    "let favs = JSON.parse(localStorage.getItem('erp_bookmarks') || '[]');",
    "let favs = JSON.parse(localStorage.getItem('erp_bookmarks') || '[]');\n    favs = favs.map(f => { if(f.id === 'departamentos' && f.color === '#f503c5') { f.color = '#c92a2a'; } return f; });\n    localStorage.setItem('erp_bookmarks', JSON.stringify(favs));"
);

// Add 'departamentos' to isSimplePage
app = app.replace(
    "key === 'comercial-credenciamento';",
    "key === 'comercial-credenciamento' || key === 'departamentos';"
);

// Change window.isTopAdmin check for cargos Edit/Delete buttons dynamically instead of only onload
app = app.replace(
    "const colsAcao = document.querySelectorAll('#cargo-list-container th:last-child');",
    "const colsAcao = document.querySelectorAll('#cargo-list-container th:last-child');\n    // Remove action buttons if not top admin\n    if (!isDir) { setTimeout(() => { document.querySelectorAll('#table-cargos-body td:last-child').forEach(td => td.style.display = 'none'); }, 100); }"
);

fs.writeFileSync('frontend/app.js', app);

// 3. FIX USUARIOS.JS (Ensure red color for Diretoria in menu builder)
let u = fs.readFileSync('frontend/usuarios.js', 'utf8');
u = u.replace("modulo: 'Diretoria', icone: 'ph-crown', cor: '#d9480f'", "modulo: 'Diretoria', icone: 'ph-crown', cor: '#c92a2a'");
fs.writeFileSync('frontend/usuarios.js', u);
