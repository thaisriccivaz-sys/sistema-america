const fs = require('fs');
let b = fs.readFileSync('backend/routes_candidatos_teste.js', 'utf8');
const targetLog = 'Motivo: \\, req);';
const newLog = 'Motivo: <b>\</b>\, req);';
b = b.replace(targetLog, newLog);
fs.writeFileSync('backend/routes_candidatos_teste.js', b, 'utf8');
console.log('Fixed log');
