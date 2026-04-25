const fs = require('fs');
let content = fs.readFileSync('c:/A/OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA/Documentos - America Rental/Diretoria/Teste Sistema/cadastro-colaboradores/frontend/experiencia.js', 'utf8');

content = content.replace(
    /src="data:image\/jpeg;base64,\$\{c\.foto_base64\}"/g,
    'src="${c.foto_base64.startsWith(\'data:\') ? c.foto_base64 : \'data:image/jpeg;base64,\' + c.foto_base64}"'
);

fs.writeFileSync('c:/A/OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA/Documentos - America Rental/Diretoria/Teste Sistema/cadastro-colaboradores/frontend/experiencia.js', content);
console.log('Fixed list photo');
