const fs = require('fs');
let txt = fs.readFileSync('backend/server.js', 'utf8');

txt = txt.replace('???? Solicitação de Credenciamento Recebida', '✅ Solicitação de Credenciamento Recebida');
txt = txt.replace('???? Documentos Solicitados', '📄 Documentos Solicitados');
txt = txt.replace('??????? Licenças Solicitadas', '📋 Licenças Solicitadas');
txt = txt.replace('???? Observações:', '💬 Observações:');
txt = txt.replace('??? <strong>Prazo', '⏰ <strong>Prazo');
txt = txt.replace('d??vidas', 'dúvidas');

fs.writeFileSync('backend/server.js', txt, 'utf8');
console.log('Fixed encoding in server.js email template.');
