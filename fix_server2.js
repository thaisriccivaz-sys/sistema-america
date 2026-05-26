const fs = require('fs');

const path = 'backend/server.js';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
    /const matches = jsonStr\.match\(\/https:const \{ cliente_nome, os, cliente_email\/const \{ cliente_nome, os, cliente_email\/\[\^"\]\+const \{ cliente_nome, os, cliente_email\.pdf\[\^"\]\*\/gi\);/g,
    'const matches = jsonStr.match(/https:\\/\\/[^"]+\\.pdf[^"]*/gi);'
);

fs.writeFileSync(path, content);
console.log('Fixed line 710');
