const fs = require('fs');
const path = 'backend/database.js';
let content = fs.readFileSync(path, 'utf8');

const regex = /db\.get\("SELECT id FROM geradores WHERE nome = 'ORDEM DE SERVIÇO NR01'".*?\}\);/s;
if (content.match(regex)) {
    content = content.replace(regex, '');
    fs.writeFileSync(path, content, 'utf8');
    console.log("Removed ORDEM DE SERVICO NR01 seed");
} else {
    console.log("Not found");
}