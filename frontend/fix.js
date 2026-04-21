const fs = require('fs');
let js = fs.readFileSync('frontend/app.js', 'utf8');

// Fix admissao-nome-final error
js = js.replace(/document\.getElementById\('admissao-nome-final'\)\.textContent = colab\.nome_completo;/g, "if(document.getElementById('admissao-nome-final')) document.getElementById('admissao-nome-final').textContent = colab.nome_completo;");

if(!js.includes('switchCargoDeptoTab')) {
    js += "\nwindow.switchCargoDeptoTab = function(tab) {\n";
    js += "    document.getElementById('tab-btn-cargos').style.color = '#64748b';\n";
    js += "    document.getElementById('tab-btn-cargos').style.borderBottomColor = 'transparent';\n";
    js += "    document.getElementById('tab-btn-cargos').style.fontWeight = '500';\n";
    js += "    document.getElementById('tab-btn-departamentos').style.color = '#64748b';\n";
    js += "    document.getElementById('tab-btn-departamentos').style.borderBottomColor = 'transparent';\n";
    js += "    document.getElementById('tab-btn-departamentos').style.fontWeight = '500';\n";
    js += "    document.getElementById('tab-content-cargos').style.display = 'none';\n";
    js += "    document.getElementById('tab-content-departamentos').style.display = 'none';\n";
    js += "    document.getElementById('tab-btn-' + tab).style.color = 'var(--primary-color)';\n";
    js += "    document.getElementById('tab-btn-' + tab).style.borderBottomColor = 'var(--primary-color)';\n";
    js += "    document.getElementById('tab-btn-' + tab).style.fontWeight = '600';\n";
    js += "    document.getElementById('tab-content-' + tab).style.display = 'block';\n";
    js += "};\n";
}

fs.writeFileSync('frontend/app.js', js, 'utf8');

let html = fs.readFileSync('frontend/index.html', 'utf8');
// Fix menu display none for Integracao 
html = html.replace('<section id="view-integracao" class="content-view" style="display:none;">', '<section id="view-integracao" class="content-view">');

fs.writeFileSync('frontend/index.html', html, 'utf8');
console.log('Fixed app.js and index.html');
