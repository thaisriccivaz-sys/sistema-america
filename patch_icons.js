const fs = require('fs');
const path = require('path');
const file = path.join('frontend', 'testes_candidatos.js');
let content = fs.readFileSync(file, 'utf8');

// Replace "Ajudante" string / icon with bucket 🪣
content = content.replace(/"\?\? Ajudante"/g, '"🪣 Ajudante"');
content = content.replace(/"👷 Ajudante"/g, '"🪣 Ajudante"');
content = content.replace(/"\?\? Motorista"/g, '"🚚 Motorista"');
content = content.replace(/"🚚 Motorista"/g, '"🚚 Motorista"');
content = content.replace(/"ph-user-gear"/g, '"ph-bucket"'); // fallback

fs.writeFileSync(file, content, 'utf8');
console.log('Icones atualizados');
