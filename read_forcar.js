const fs = require('fs');
const content = fs.readFileSync('c:/A/OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA/Documentos - America Rental/Diretoria/Teste Sistema/cadastro-colaboradores/backend/server.js', 'utf8');

const startIndex = content.indexOf("app.post('/api/experiencia/cron/forcar'");
if (startIndex !== -1) {
    const endIndex = content.indexOf("});\n\n", startIndex) + 4;
    console.log(content.substring(startIndex, endIndex));
} else {
    console.log("Not found");
}
