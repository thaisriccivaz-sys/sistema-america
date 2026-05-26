const fs = require('fs');
const path = 'backend/server.js';
let content = fs.readFileSync(path, 'utf8');

const insertion = `
// Renomear Autorização de Desconto em Folha
db.run("UPDATE geradores SET nome = 'Autorização de Desconto em Folha' WHERE nome LIKE '%AUTORIZA%DESCONTO%FOLHA%'");
// Excluir permanentemente ORDEM DE SERVIÇO NR01
db.run("DELETE FROM geradores WHERE nome = 'ORDEM DE SERVIÇO NR01'");
`;

content = content.replace(
    /db\.run\("DELETE FROM geradores WHERE nome = 'Termo de Responsabilidade de Chaves'"\);/,
    "db.run(\"DELETE FROM geradores WHERE nome = 'Termo de Responsabilidade de Chaves'\");" + insertion
);

content = content.replace(
    /db\.run\("INSERT OR IGNORE INTO geradores_excluidos \(nome\) VALUES \('Autorizar Desconto'\)"\);/,
    "db.run(\"INSERT OR IGNORE INTO geradores_excluidos (nome) VALUES ('Autorizar Desconto')\");\n    db.run(\"INSERT OR IGNORE INTO geradores_excluidos (nome) VALUES ('ORDEM DE SERVIÇO NR01')\");"
);

fs.writeFileSync(path, content, 'utf8');
console.log("Updated server.js");