const fs = require('fs');
const file = 'c:/A/OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA/Documentos - America Rental/Diretoria/Teste Sistema/cadastro-colaboradores/frontend/app.js';
let code = fs.readFileSync(file, 'utf8');

const target = "async function _epiIniciarCamera() {";
const replacement = "async function _epiIniciarCamera() {\n    _epiPararCamera();";
code = code.replace(target, replacement);

fs.writeFileSync(file, code, 'utf8');
console.log('Fixed camera');
