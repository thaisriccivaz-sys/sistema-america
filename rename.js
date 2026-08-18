const fs = require('fs');

// 1. index.html
let indexHtml = fs.readFileSync('frontend/index.html', 'utf8');
indexHtml = indexHtml.replace(
    /<a href="#" class="nav-item" data-target="testes-candidatos" onclick="navigateTo\('testes-candidatos'\); return false;"><i class="ph ph-clipboard-text"><\/i>\s*Testes de Candidatos<\/a>/,
    '<a href="#" class="nav-item" data-target="testes-candidatos" onclick="navigateTo(\\\'testes-candidatos\\\'); return false;"><i class="ph ph-clipboard-text"></i>\\n                        Candidatos</a>'
);
fs.writeFileSync('frontend/index.html', indexHtml, 'utf8');

// 2. testes_candidatos.js
let testesJs = fs.readFileSync('frontend/testes_candidatos.js', 'utf8');
testesJs = testesJs.replace(
    /<i class="ph ph-clipboard-text" style="color:#7c3aed;font-size:1\.5rem;"><\/i> Testes de Candidatos/,
    '<i class="ph ph-clipboard-text" style="color:#7c3aed;font-size:1.5rem;"></i> Candidatos'
);
fs.writeFileSync('frontend/testes_candidatos.js', testesJs, 'utf8');

// 3. app.js
let appJs = fs.readFileSync('frontend/app.js', 'utf8');
appJs = appJs.replace(/titulo = 'Testes de Candidatos';/g, "titulo = 'Candidatos';");
fs.writeFileSync('frontend/app.js', appJs, 'utf8');

// 4. usuarios.js
let usJs = fs.readFileSync('frontend/usuarios.js', 'utf8');
usJs = usJs.replace(/'Testes de Candidatos \(RH\)'/g, "'Candidatos (RH)'");
fs.writeFileSync('frontend/usuarios.js', usJs, 'utf8');

// 5. notificacoes.js
let notifJs = fs.readFileSync('frontend/notificacoes.js', 'utf8');
notifJs = notifJs.replace(/'Testes de Candidatos \(RH\)'/g, "'Candidatos (RH)'");
fs.writeFileSync('frontend/notificacoes.js', notifJs, 'utf8');

console.log('Renamed menu and pages');
