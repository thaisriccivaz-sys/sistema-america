const fs = require('fs');
let js = fs.readFileSync('./frontend/usuarios.js', 'utf8');

const oldBlock = /mod\.grupos\.forEach\(grp =>[^\{]*\{[\s\S]*?html \+= `<\/div><\/div>`;\r?\n\s*\}\);/;

const newBlock = `mod.grupos.forEach(grp => {
            const tituloHTML = grp.titulo && grp.titulo !== 'Telas'
                ? '<h5 style="margin:0 0 0.75rem 0;font-size:0.8rem;color:#d9480f;text-transform:uppercase;letter-spacing:0.05em;border-bottom:1px solid #f1f5f9;padding-bottom:0.25rem;">' + grp.titulo + '</h5>'
                : '';
            html += '<div style="margin-bottom:1rem;">' + tituloHTML + '<div style="display:grid;grid-template-columns:1fr;gap:0.5rem;">';
                    
            grp.telas.forEach(telaId => {
                const telaInfo = TELAS_SISTEMA.find(t => t.pagina_id === telaId);
                const nomeTela = telaInfo ? telaInfo.pagina_nome : telaId;
                const p = _permissoesFormAtivas[telaId] || { visualizar:false, alterar:false, incluir:false, excluir:false };
                
                html += \`
                        <div style="display:flex;align-items:center;justify-content:space-between;padding:0.4rem 0.75rem;background:#f8fafc;border-radius:6px;border:1px solid #f1f5f9;">
                            <span style="font-size:0.85rem;font-weight:600;color:#334155;">&bull; \${nomeTela}</span>
                            <div style="display:flex;gap:1.5rem;">
                                <label style="display:flex;align-items:center;gap:4px;font-size:0.75rem;cursor:pointer;color:#1971c2;font-weight:600;">
                                    <input type="checkbox" onchange="togglePermForm('\${telaId}', this.checked)" \${p.visualizar?'checked':''} style="accent-color:#1971c2;"> Acesso Liberado
                                </label>
                            </div>
                        </div>\`;
            });
            html += '</div></div>';
        });`;

const m = js.match(oldBlock);
if (m) {
    js = js.replace(oldBlock, newBlock);
    fs.writeFileSync('./frontend/usuarios.js', js, 'utf8');
    console.log('Replaced successfully');
} else {
    console.log('Pattern not matched, trying alternate...');
    // show what the current grupos.forEach looks like
    const idx = js.indexOf('mod.grupos.forEach');
    console.log('Current block (200 chars):', js.substring(idx, idx+200));
}
