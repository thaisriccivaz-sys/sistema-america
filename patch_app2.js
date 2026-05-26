const fs = require('fs');
let app = fs.readFileSync('frontend/app.js', 'utf8');

const anchor = `    } else if (target === 'logistica-frota') {
        if (typeof window.initFrotaVeiculos === 'function') setTimeout(() => window.initFrotaVeiculos(), 80);
    }`;

if (app.includes(anchor)) {
    const replacement = `    } else if (target === 'logistica-frota') {
        if (typeof window.initFrotaVeiculos === 'function') setTimeout(() => window.initFrotaVeiculos(), 80);
    } else if (target === 'logistica-credenciamento') {
        if (typeof window.carregarHistoricoCredenciamento === 'function') setTimeout(() => window.carregarHistoricoCredenciamento(), 80);
    }`;
    app = app.replace(anchor, replacement);
    fs.writeFileSync('frontend/app.js', app, 'utf8');
    console.log('app.js patched for navigateTo.');
} else {
    console.log('Could not find anchor in app.js');
}
