const fs = require('fs');
const file = 'frontend/testes_candidatos.js';
let content = fs.readFileSync(file, 'utf8');

const targetStr = '<span style="background:#fff3;color:#fff;border-radius:99px;padding:3px 12px;font-size:0.75rem;font-weight:700;">\\</span>';
const newStr = '<span style="background:#fff3;color:#fff;border-radius:99px;padding:3px 12px;font-size:0.75rem;font-weight:700;">${c.tipo === "Motorista" ? "🚚 Motorista" : "🪣 Ajudante"}</span>';

content = content.replace(targetStr, newStr);
// And let's check for any other \</span> just in case
content = content.replace(/>\\<\/span>/g, '>${c.tipo === "Motorista" ? "🚚 Motorista" : "🪣 Ajudante"}</span>');

fs.writeFileSync(file, content, 'utf8');
console.log('Fixed det badge');
