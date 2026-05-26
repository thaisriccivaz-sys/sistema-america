const fs = require('fs');
let html = fs.readFileSync('frontend/index.html', 'utf8');
const lines = html.split('\n');

const comercialIdx = lines.findIndex(l => l.includes('Comercial</div>'));
console.log('Comercial menu:');
console.log(lines.slice(Math.max(0, comercialIdx-1), comercialIdx+5).join('\n'));

const credIdx = lines.findIndex(l => l.includes('id="view-logistica-credenciamento"'));
console.log('\nLogistica cred view:', credIdx !== -1 ? 'FOUND at ' + credIdx : 'MISSING');

const comCredIdx = lines.findIndex(l => l.includes('id="view-comercial-credenciamento"'));
console.log('\nComercial cred view:', comCredIdx !== -1 ? 'FOUND at ' + comCredIdx : 'MISSING');
