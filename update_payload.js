const fs = require('fs');
const path = 'frontend/credenciamento.js';
let content = fs.readFileSync(path, 'utf8');

const regexPayload = /const payload = \{\s*cliente_nome: clienteNome,\s*cliente_email: clienteEmail,\s*endereco_instalacao: enderecoInstalacao,/g;
const replacementPayload = `const osValue = (document.getElementById('cred-os') || {}).value?.trim() || '';\n\n    const payload = {\n        cliente_nome: clienteNome,\n        cliente_email: clienteEmail,\n        endereco_instalacao: enderecoInstalacao,\n        os: osValue,`;

if (content.match(regexPayload)) {
    content = content.replace(regexPayload, replacementPayload);
    fs.writeFileSync(path, content, 'utf8');
    console.log("Fixed payload in credenciamento.js");
} else {
    console.log("Payload regex not matched!");
}