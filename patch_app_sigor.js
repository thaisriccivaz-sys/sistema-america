const fs = require('fs');
let app = fs.readFileSync('frontend/app.js', 'utf8');

// 1. Inserir no TAB_META
const targetFormUser = "'form-usuario': { color: '#d9480f', icon: 'ph-user-gear', title: 'Cadastro de Usuário' },";
if (app.includes(targetFormUser) && !app.includes("'config-sigor':")) {
    app = app.replace(targetFormUser, targetFormUser + "\n    'config-sigor': { color: '#d9480f', icon: 'ph-key', title: 'Credenciais SIGOR' },");
}

// 2. Inserir no if/else de navigateTo
const targetLicencas = "} else if (target === 'licencas') {\r\n        if (typeof window.initLicencas === 'function') setTimeout(() => window.initLicencas(), 80);\r\n    }";
if (app.includes(targetLicencas) && !app.includes("target === 'config-sigor'")) {
    app = app.replace(targetLicencas, targetLicencas + " else if (target === 'config-sigor') {\r\n        if (typeof window.initConfigSigor === 'function') setTimeout(() => window.initConfigSigor(), 80);\r\n    }");
} else {
    // try different endings
    const targetLicencas2 = "} else if (target === 'licencas') {\n        if (typeof window.initLicencas === 'function') setTimeout(() => window.initLicencas(), 80);\n    }";
    if (app.includes(targetLicencas2) && !app.includes("target === 'config-sigor'")) {
        app = app.replace(targetLicencas2, targetLicencas2 + " else if (target === 'config-sigor') {\n        if (typeof window.initConfigSigor === 'function') setTimeout(() => window.initConfigSigor(), 80);\n    }");
    }
}

fs.writeFileSync('frontend/app.js', app);
console.log('app.js modificado');
