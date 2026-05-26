const fs = require('fs');
let credJsPath = 'frontend/credenciamento.js';
let credJs = fs.readFileSync(credJsPath, 'utf8');

const r1 = /<td>\$\{colabsText\}<\/td>\r?\n\s*<td>\$\{veicsText\}<\/td>\r?\n\s*<td>\$\{licencasText\}<\/td>/g;
credJs = credJs.replace(r1, "<td>${cred.qtd_max_colaboradores === 0 ? 'Ilimitado' : cred.qtd_max_colaboradores}</td>\n            <td>${colabsText}</td>\n            <td>${cred.qtd_max_veiculos === 0 ? 'Ilimitado' : cred.qtd_max_veiculos}</td>\n            <td>${veicsText}</td>\n            <td>${licencasText}</td>");

fs.writeFileSync(credJsPath, credJs, 'utf8');
console.log("Updated table rendering in credenciamento.js via Regex");