const fs = require('fs');
let path = 'frontend/credenciamento.js';
let content = fs.readFileSync(path, 'utf8');

let regexRow1 = /onclick="window\.reenviarEmailCredenciamento\('\$\{cred\.id\}'\)"/g;
let repRow1 = `onclick="window.reenviarEmailCredenciamento('\${cred.id}', '\${cred.cliente_email}')"`;
content = content.replace(regexRow1, repRow1);

let targetFunc1 = `window.reenviarEmailCredenciamento = async function(id) {
    if (!confirm('Deseja reenviar o e-mail do credenciamento para o cliente?')) return;
    try {
        const token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token');
        const res = await fetch(\`/api/credenciamentos/\${id}/reenviar\`, { method: 'POST', headers: { 'Authorization': \`Bearer \${token}\` } });`;

let repFunc1 = `window.reenviarEmailCredenciamento = async function(id, emailAtual) {
    const novoEmail = prompt('Deseja reenviar o e-mail do credenciamento? Se quiser alterar o e-mail do cliente, edite abaixo:', emailAtual || '');
    if (novoEmail === null) return;
    try {
        const token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token');
        const res = await fetch(\`/api/credenciamentos/\${id}/reenviar\`, { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json', 'Authorization': \`Bearer \${token}\` },
            body: JSON.stringify({ novoEmail: novoEmail })
        });`;
        
content = content.replace(targetFunc1, repFunc1);
fs.writeFileSync(path, content, 'utf8');

// comercial_credenciamento.js
path = 'frontend/comercial_credenciamento.js';
content = fs.readFileSync(path, 'utf8');
content = content.replace(regexRow1, repRow1);
fs.writeFileSync(path, content, 'utf8');
console.log("Updated frontend JS files");