const fs = require('fs');
const path = require('path');
const file = path.join('frontend', 'testes_candidatos.js');
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
    /const EXIGE_DATA = \["Aguardando Data","Teste 1º Dia","Teste 2º Dia","Teste Extra"\];/g,
    'const EXIGE_DATA = ["Teste 1º Dia","Teste 2º Dia","Teste Extra"];'
);
content = content.replace(
    /const EXIGE_DATA = \["Aguardando Data","Teste 1\\u00ba Dia","Teste 2\\u00ba Dia","Teste Extra"\];/g,
    'const EXIGE_DATA = ["Teste 1\\u00ba Dia","Teste 2\\u00ba Dia","Teste Extra"];'
);

fs.writeFileSync(file, content, 'utf8');
console.log('EXIGE_DATA atualizado');
