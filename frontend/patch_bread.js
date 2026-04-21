const fs = require('fs');
let js = fs.readFileSync('frontend/app.js', 'utf8');

if (!js.includes("'integracao':")) {
    js = js.replace("'dashboard':", "'integracao': { path: 'Integração', code: 'RHAD06' },\n    'assinaturas-digitais': { path: 'Assinaturas Digitais', code: 'RHAD07' },\n    'dashboard':");
    fs.writeFileSync('frontend/app.js', js, 'utf8');
    console.log('Breadcrumb mapped');
}
