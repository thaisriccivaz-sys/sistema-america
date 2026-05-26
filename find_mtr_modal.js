const fs = require('fs');
const lines = fs.readFileSync('frontend/index.html', 'utf8').split('\n');
const idx = lines.findIndex(l => l.includes('id="modal-gerar-mtr"'));
console.log(lines.slice(idx, idx + 100).join('\n'));
