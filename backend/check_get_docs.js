const fs = require('fs');
const code = fs.readFileSync('c:/A/OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA/Documentos - America Rental/Diretoria/Teste Sistema/cadastro-colaboradores/backend/server.js', 'utf8');
const start = code.indexOf("app.get('/api/colaboradores/:id/documentos',");
console.log(code.substring(start, start + 800));
