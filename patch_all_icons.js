const fs = require('fs');
const path = require('path');
const file = path.join('frontend', 'testes_candidatos.js');
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/\$\{c\.tipo\s*===\s*"Motorista"\s*\?\s*".*?"\s*:\s*".*?"\}/g, '');

fs.writeFileSync(file, content, 'utf8');
console.log('Todos os icones ajustados');
