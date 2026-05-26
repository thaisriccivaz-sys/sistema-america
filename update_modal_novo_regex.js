const fs = require('fs');

let path = 'frontend/credenciamento.js';
let content = fs.readFileSync(path, 'utf8');

const regex = /atualizarResumoLicencas\(\);\s*\/\/\s*Reset/g;
const replacement = `atualizarResumoLicencas();\n    \n    if (typeof _carregarLicencasAgrupadasLogistica === 'function') {\n        _carregarLicencasAgrupadasLogistica([]);\n    }\n\n    // Reset`;

content = content.replace(regex, replacement);

fs.writeFileSync(path, content, 'utf8');
console.log("Updated using regex to bypass encoding issues");