const fs = require('fs');

let path = 'frontend/credenciamento.js';
let content = fs.readFileSync(path, 'utf8');

const target = "alert('E-mail reenviado com sucesso!');";
const replacement = "alert('E-mail reenviado com sucesso!');\n            if (window.carregarHistoricoCredenciamento) window.carregarHistoricoCredenciamento();\n            if (window.carregarHistoricoComCred) window.carregarHistoricoComCred();";

content = content.replace(target, replacement);

fs.writeFileSync(path, content, 'utf8');
console.log("Updated alert in credenciamento.js");