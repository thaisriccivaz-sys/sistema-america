const fs = require('fs');
const file = 'backend/routes_candidatos_teste.js';
let content = fs.readFileSync(file, 'utf8');

content = content.replace("'rota_motorista TEXT',", "'rota_motorista TEXT',\n        'criado_por_id INTEGER',\n        'criado_por_nome TEXT',");

fs.writeFileSync(file, content, 'utf8');
