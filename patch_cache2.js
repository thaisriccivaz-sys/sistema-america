const fs = require('fs');
const path = require('path');
const file = path.join('frontend', 'index.html');
let content = fs.readFileSync(file, 'utf8');

const ts = Date.now();
content = content.replace(/testes_candidatos\.js\?v=\d+/g, 'testes_candidatos.js?v=' + ts);

fs.writeFileSync(file, content, 'utf8');
console.log('Cache index.html bumpado');
