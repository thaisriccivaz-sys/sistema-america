const fs = require('fs');
let content = fs.readFileSync('c:/A/OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA/Documentos - America Rental/Diretoria/Teste Sistema/cadastro-colaboradores/frontend/experiencia.js', 'utf8');

const regex = /const dataEnvioFormatada = c\.data_envio_email \? new Date\(c\.data_envio_email\)\.toLocaleString[^\;]+;/g;
const replacement = `const dataEnvioFormatada = c.atualizado_em ? new Date(c.atualizado_em + 'Z').toLocaleString('pt-BR', {day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}) : '';`;

content = content.replace(regex, replacement);

fs.writeFileSync('c:/A/OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA/Documentos - America Rental/Diretoria/Teste Sistema/cadastro-colaboradores/frontend/experiencia.js', content);
