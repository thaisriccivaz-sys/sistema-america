const fs = require('fs');
let js = fs.readFileSync('frontend/app.js', 'utf8');

js = js.replace(/navigateTo\('integracao'\)/g, "navigateTo('dashboard')");

// Only fix the one inside finalizarAdmissao
js = js.replace(/window\.finalizarAdmissao = async function\(\) \{([\s\S]*?)navigateTo\('dashboard'\);/g, "window.finalizarAdmissao = async function() {$1navigateTo('integracao');");

// Ensure breadcrumb mapping is present
if(!js.includes("'integracao': { path:")) {
    js = js.replace("'dashboard':          { path: 'Dashboard'", "'integracao': { path: 'Integração', code: 'RHAD06' },\n    'assinaturas-digitais': { path: 'Assinaturas Digitais', code: 'RHAD07' },\n    'dashboard':          { path: 'Dashboard'");
}

fs.writeFileSync('frontend/app.js', js, 'utf8');
