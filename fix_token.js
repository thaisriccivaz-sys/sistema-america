const fs = require('fs');
let code = fs.readFileSync('frontend/fechamento.js', 'utf8');
const before = (code.match(/authToken/g) || []).length;
code = code.replaceAll("localStorage.getItem('authToken')", "window.currentToken || localStorage.getItem('erp_token') || ''");
const after = (code.match(/authToken/g) || []).length;
fs.writeFileSync('frontend/fechamento.js', code, 'utf8');
console.log('Substituicoes realizadas: ' + before + ', restantes: ' + after);
