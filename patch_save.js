const fs = require('fs');
let content = fs.readFileSync('c:/A/OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA/Documentos - America Rental/Diretoria/Teste Sistema/cadastro-colaboradores/frontend/experiencia.js', 'utf8');

content = content.replace(
    "const comentarios = document.getElementById('exp-comentarios').value;",
    "const comentarios = document.getElementById('exp-comentarios').value;\n    const comentariosRhEl = document.getElementById('exp-comentarios-rh');\n    if (comentariosRhEl) respostas.comentarios_rh = comentariosRhEl.value;"
);

fs.writeFileSync('c:/A/OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA/Documentos - America Rental/Diretoria/Teste Sistema/cadastro-colaboradores/frontend/experiencia.js', content);
console.log('patched');
