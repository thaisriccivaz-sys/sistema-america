const fs = require('fs');
const file = 'frontend/testes_candidatos.js';
let content = fs.readFileSync(file, 'utf8');

const targetStr = '<span style="background:#fff3;color:#fff;border-radius:99px;padding:3px 12px;font-size:0.75rem;font-weight:700;">\\</span>';
const newStr = '<span style="background:#fff3;color:#fff;border-radius:99px;padding:3px 12px;font-size:0.75rem;font-weight:700;">${c.tipo === "Motorista" ? "🚚 Motorista" : "🪣 Ajudante"}</span>';

content = content.replace(targetStr, newStr);

// Let's also check if there's any other broken badge
// I remember "Ajudante" was in the left column as well!
// Let's look for "Tipo:" in the file
