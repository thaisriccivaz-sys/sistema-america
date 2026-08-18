const fs = require('fs');
const path = require('path');
const file = path.join('frontend', 'app.js');
let content = fs.readFileSync(file, 'utf8');

const targetStr = "'treinamento-materiais': { color: '#0e7490'";
const newStr = "'testes-candidatos': { color: '#f503c5', icon: 'ph-clipboard-text', title: 'Testes' },\n    'treinamento-materiais': { color: '#0e7490'";

content = content.replace(targetStr, newStr);

fs.writeFileSync(file, content, 'utf8');
console.log('App.js atualizado via Node.js');
