const fs = require('fs');
const lines = fs.readFileSync('frontend/rota_redonda.js', 'utf8').split('\n');
const start = lines.findIndex(l => l.includes('function getNotasSimpliRoute()') || l.includes('function gerarNotas'));
if (start !== -1) console.log(lines.slice(start, start + 60).join('\n'));
else console.log('Not found');
