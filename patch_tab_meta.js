const fs = require('fs');

const path = 'frontend/app.js';
let content = fs.readFileSync(path, 'utf8');

// Add to TAB_META
content = content.replace(
    "'logistica-credenciamento':    { color: '#2d9e5f', icon: 'ph-identification-card', title: 'Credenciamento' },",
    "'logistica-credenciamento':    { color: '#2d9e5f', icon: 'ph-identification-card', title: 'Credenciamento' },\n    'comercial-credenciamento':    { color: '#7048e8', icon: 'ph-handshake', title: 'Solicitar Credencial' },"
);

// Add comercial-credenciamento to isSimplePage explicitly just to be safe
content = content.replace(
    "key === 'logistica-credenciamento';",
    "key === 'logistica-credenciamento' || key === 'comercial-credenciamento';"
);

fs.writeFileSync(path, content);
console.log('Done');
