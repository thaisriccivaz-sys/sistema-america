const fs = require('fs');

let path = 'frontend/credenciamento.js';
let content = fs.readFileSync(path, 'utf8');

const regexLink = /acoes = \`<a href="\/credenciamento-publico\.html\?token=\$\{cred\.token\}" target="_blank" class="btn btn-outline" style="padding:4px 8px; font-size:12px; margin-right:4px;" title="Testar \/ Visualizar Link">\s*<i class="ph ph-link"><\/i> Link\s*<\/a>\`;/g;

content = content.replace(regexLink, `acoes = \`\${cred.token ? \`<button class="btn btn-outline btn-sm" style="padding:4px 8px; font-size:12px; margin-right:4px;" onclick="window.reenviarEmailCredenciamento('\${cred.id}')"><i class="ph ph-envelope-simple"></i> Reenviar</button>\` : ''}\`;`);

fs.writeFileSync(path, content, 'utf8');
console.log("Updated Link to Reenviar button in credenciamento.js");