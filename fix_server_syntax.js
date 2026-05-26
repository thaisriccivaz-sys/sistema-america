const fs = require('fs');
let c = fs.readFileSync('backend/server.js', 'utf8');
c = c.replace(/subject: \\`✅ Solicitação de Credenciamento Recebida — América Rental\\`,/g, 'subject: `✅ Solicitação de Credenciamento Recebida — América Rental`,');
c = c.replace(/subject: \\`✅ Nova Solicitação de Credenciamento — América Rental\\`,/g, 'subject: `✅ Nova Solicitação de Credenciamento — América Rental`,');
fs.writeFileSync('backend/server.js', c);
console.log("Fixed syntax in backend/server.js");
