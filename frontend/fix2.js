const fs = require('fs');
let js = fs.readFileSync('frontend/app.js', 'utf8');

js = js.replace(/document\.getElementById\('admissao-start-name'\)\.textContent = colab\.nome_completo;/g, "if(document.getElementById('admissao-start-name')) document.getElementById('admissao-start-name').textContent = colab.nome_completo;");

fs.writeFileSync('frontend/app.js', js, 'utf8');
console.log('Fixed admissao-start-name');
