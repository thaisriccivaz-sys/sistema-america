const fs = require('fs');
const path = require('path');
const file = path.join('frontend', 'app.js');
let content = fs.readFileSync(file, 'utf8');

const targetStr = "'admissao': { path: 'Admissão', code: 'RHAD05' },";
const newStr = "'admissao': { path: 'Admissão', code: 'RHAD05' },\n    'testes-candidatos': { path: 'RH - Testes Candidatos', code: 'RHTC01' },";

// since it might have encoding issues with 'Admissão' due to console printing it as Admisso, let's just replace based on 'geradores'.
const targetStr2 = "'geradores': { path: 'Geradores', code: 'RHDOC01' },";
const newStr2 = "'geradores': { path: 'Geradores', code: 'RHDOC01' },\n    'testes-candidatos': { path: 'RH - Testes Candidatos', code: 'RHTC01' },";

content = content.replace(targetStr2, newStr2);

// Let's also bump the version cache in index.html to reflect these app.js and testes_candidatos.js changes
const indexFile = path.join('frontend', 'index.html');
let indexContent = fs.readFileSync(indexFile, 'utf8');
const ts = Date.now();
indexContent = indexContent.replace(/testes_candidatos\.js\?v=\w+/g, 'testes_candidatos.js?v=' + ts);
indexContent = indexContent.replace(/testes_candidatos\.js"/g, 'testes_candidatos.js?v=' + ts + '"'); // if no v present
indexContent = indexContent.replace(/app\.js\?v=\w+/g, 'app.js?v=' + ts);
fs.writeFileSync(indexFile, indexContent, 'utf8');

fs.writeFileSync(file, content, 'utf8');
console.log('Feito');
