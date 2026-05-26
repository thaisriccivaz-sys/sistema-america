const fs = require('fs');
const path = 'backend/server.js';
let content = fs.readFileSync(path, 'utf8');

const target = /\/\/ Excluir Contrato Faculdade de teste da Debora\r?\ndb\.run\("DELETE FROM documentos WHERE document_type = 'Contrato Faculdade' AND colaborador_id IN \(SELECT id FROM colaboradores WHERE nome_completo LIKE '%Débora%'\)"\);/;
const replacement = `// Excluir Contrato Faculdade de teste da Debora
db.run("DELETE FROM documentos WHERE document_type = 'Contrato Faculdade' AND colaborador_id IN (SELECT id FROM colaboradores WHERE nome_completo LIKE '%Débora%')");
// Excluir Contrato Faculdade de teste da Eduarda
db.run("DELETE FROM documentos WHERE document_type = 'Contrato Faculdade' AND colaborador_id IN (SELECT id FROM colaboradores WHERE nome_completo LIKE '%Eduarda%')");`;

if (content.match(target)) {
    content = content.replace(target, replacement);
    fs.writeFileSync(path, content, 'utf8');
    console.log("Added DELETE query for Eduarda's test contract");
} else {
    console.log("Regex not matched!");
}