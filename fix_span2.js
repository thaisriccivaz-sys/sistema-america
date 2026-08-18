const fs = require('fs');
const file = 'frontend/testes_candidatos.js';
let content = fs.readFileSync(file, 'utf8');

const targetStr = '<span style="font-size:0.68rem;font-weight:700;color:${ct};background:${ct}18;border-radius:99px;padding:1px 6px;"></span>';
const newStr = '<span style="font-size:0.68rem;font-weight:700;color:${ct};background:${ct}18;border-radius:99px;padding:1px 6px;">${c.tipo === "Motorista" ? "🚚 Motorista" : "🪣 Ajudante"}</span>';

content = content.replace(targetStr, newStr);

fs.writeFileSync(file, content, 'utf8');
console.log('Fixed renderCard icon');
