const fs = require('fs');
const path = 'backend/server.js';
let content = fs.readFileSync(path, 'utf8');

const target = /db\.run\("DELETE FROM documentos WHERE document_type = 'Contrato Academia' AND colaborador_id IN \(SELECT id FROM colaboradores WHERE nome_completo LIKE '%Abner Abrahão%'\)"\);/;
const replacement = `db.run("DELETE FROM documentos WHERE document_type = 'Contrato Academia' AND colaborador_id IN (SELECT id FROM colaboradores WHERE nome_completo LIKE '%Abner Abrahão%')");
// Excluir Contrato Faculdade de teste da Debora
db.run("DELETE FROM documentos WHERE document_type = 'Contrato Faculdade' AND colaborador_id IN (SELECT id FROM colaboradores WHERE nome_completo LIKE '%Débora%')");`;

if (content.match(target)) {
    content = content.replace(target, replacement);
    fs.writeFileSync(path, content, 'utf8');
    console.log("Added DELETE query for Débora's test contract");
} else {
    console.log("Regex not matched!");
}