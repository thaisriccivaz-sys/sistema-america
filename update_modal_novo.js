const fs = require('fs');

let path = 'frontend/credenciamento.js';
let content = fs.readFileSync(path, 'utf8');

const target = "    atualizarResumoLicencas();\n    // Reset t";
const replacement = "    atualizarResumoLicencas();\n    \n    if (typeof _carregarLicencasAgrupadasLogistica === 'function') {\n        _carregarLicencasAgrupadasLogistica([]);\n    }\n\n    // Reset t";

content = content.replace(target, replacement);

fs.writeFileSync(path, content, 'utf8');
console.log("Updated abrirModalNovoCredenciamento to load licenses");