const fs = require('fs');
const file = 'backend/routes_candidatos_teste.js';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/candidatos_teste_log/g, 'candidatos_teste_comentarios');

fs.writeFileSync(file, content, 'utf8');
console.log('Fixed table names');
