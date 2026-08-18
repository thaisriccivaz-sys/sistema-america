const fs = require('fs');
const file = 'backend/routes_candidatos_teste.js';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/\["Motorista",\s*"Ajudante"\]/g, '["Motorista", "Motorista B", "Motorista D", "Ajudante"]');
content = content.replace(/\["Motorista","Ajudante"\]/g, '["Motorista", "Motorista B", "Motorista D", "Ajudante"]');

fs.writeFileSync(file, content, 'utf8');
console.log('Fixed backend valid types');
