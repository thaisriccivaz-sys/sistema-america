const fs = require('fs');
let content = fs.readFileSync('c:/A/OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA/Documentos - America Rental/Diretoria/Teste Sistema/cadastro-colaboradores/frontend/avaliacao-publica.html', 'utf8');

content = content.replace(
    '<script src="/experiencia.js"></script>',
    '<script src="/experiencia.js?v=' + Date.now() + '"></script>'
);
// In case it already has a version string
content = content.replace(
    /<script src="\/experiencia\.js\?v=\d+"><\/script>/g,
    '<script src="/experiencia.js?v=' + Date.now() + '"></script>'
);

fs.writeFileSync('c:/A/OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA/Documentos - America Rental/Diretoria/Teste Sistema/cadastro-colaboradores/frontend/avaliacao-publica.html', content);
console.log('Cache buster added');
