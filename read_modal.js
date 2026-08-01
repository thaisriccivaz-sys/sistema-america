const fs = require('fs');
const lines = fs.readFileSync('frontend/index.html', 'utf8').split('\n');
const start = lines.findIndex(l => l.includes('modal-assinatura-treinamento'));
console.log('modal-assinatura-treinamento found at line:', start);
