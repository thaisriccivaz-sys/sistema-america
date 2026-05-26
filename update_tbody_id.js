const fs = require('fs');

let path = 'frontend/credenciamento.js';
let content = fs.readFileSync(path, 'utf8');

const target = "const rows = document.querySelectorAll('#tbody-credenciamentos tr');";
const replacement = "const rows = document.querySelectorAll('#tbody-historico-cred tr');";

content = content.replace(target, replacement);

fs.writeFileSync(path, content, 'utf8');
console.log("Fixed tbody ID in credenciamento.js");