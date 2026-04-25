const fs = require('fs');
let content = fs.readFileSync('c:/A/OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA/Documentos - America Rental/Diretoria/Teste Sistema/cadastro-colaboradores/frontend/experiencia.js', 'utf8');

// There are multiple places: inside openExperienciaModal and renderPublicExpForm
// In openExperienciaModal:
content = content.replace(
    /const nota = form && form\.respostas && form\.respostas\[`nota_\$\{idx\}`\] !== undefined \? parseInt\(form\.respostas\[`nota_\$\{idx\}`\]\) : 0;/g,
    "const notaOld = form && form.respostas && form.respostas[`req_${idx}`] !== undefined ? parseInt(form.respostas[`req_${idx}`]) : 0; const nota = form && form.respostas && form.respostas[`nota_${idx}`] !== undefined ? parseInt(form.respostas[`nota_${idx}`]) : notaOld;"
);

content = content.replace(
    /const obs = form && form\.respostas && form\.respostas\[`obs_\$\{idx\}`\] \? form\.respostas\[`obs_\$\{idx\}`\] : '';/g,
    "const obsOld = form && form.respostas && form.respostas[`obs_req_${idx}`] ? form.respostas[`obs_req_${idx}`] : ''; const obs = form && form.respostas && form.respostas[`obs_${idx}`] !== undefined ? form.respostas[`obs_${idx}`] : obsOld;"
);

fs.writeFileSync('c:/A/OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA/Documentos - America Rental/Diretoria/Teste Sistema/cadastro-colaboradores/frontend/experiencia.js', content);
console.log("Fixed old scores fallback");
