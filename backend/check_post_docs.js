const fs = require('fs');
const lines = fs.readFileSync('c:/A/OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA/Documentos - America Rental/Diretoria/Teste Sistema/cadastro-colaboradores/backend/server.js', 'utf8').split('\n');
let start = -1;
for(let i=0; i<lines.length; i++) {
    if(lines[i].includes('app.post(') && lines[i].includes('/api/documentos')) start = i;
    if(start !== -1 && lines[i].includes('UPDATE documentos SET')) {
        console.log(lines.slice(start, i+20).join('\n'));
        break;
    }
}
