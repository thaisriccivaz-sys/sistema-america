const fs = require('fs');

/* 1) INDEX.HTML */
let html = fs.readFileSync('frontend/index.html', 'utf8');
html = html.replace('<option value="test">Colaborador Teste (Demonstração)</option>', '');
html = html.replace('onchange="window.startIntegracao(this.value)"', 'id="select-integracao-colab" onchange="window.startIntegracao(this.value)"');
fs.writeFileSync('frontend/index.html', html, 'utf8');

/* 2) APP.JS */
let js = fs.readFileSync('frontend/app.js', 'utf8');

// Breadcrumb additions
if(!js.includes("'integracao':")) {
    js = js.replace(/"dashboard":\s+\{\s+path:\s+'Dashboard',\s+code:\s+'RH001'\s+\},/g, 
        "'dashboard':          { path: 'Dashboard',                                                    code: 'RH001' },\n    'integracao':         { path: 'Integração',                                                   code: 'RHAD06' },\n    'assinaturas-digitais': { path: 'Assinaturas Digitais',                                         code: 'RHAD07' },");
}

// Update finalizarAdmissao
js = js.replace(/status:\s*'Ativo'/g, "status: 'Em Integração'");
js = js.replace(/O colaborador agora está ATIVO/g, "O colaborador agora está Em Integração");
js = js.replace(/navigateTo\('dashboard'\)/g, "navigateTo('integracao')");

// Add loadIntegracaoColabs logic inside navigateTo
js = js.replace(/} else if \(target === 'admissao'\) \{[\s\S]*?loadAdmissaoSelect\(.*?\);\n\s*\}/g, 
`} else if (target === 'admissao') {
        loadAdmissaoSelect();
    } else if (target === 'integracao') {
        if(typeof window.loadIntegracaoColabs === 'function') window.loadIntegracaoColabs();
    }`);

// Append loadIntegracaoColabs exactly
if(!js.includes('window.loadIntegracaoColabs')) {
    js += `
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
`;
}

fs.writeFileSync('frontend/app.js', js, 'utf8');
console.log('App.js patched!');
