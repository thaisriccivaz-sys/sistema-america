const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('c:/A/OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA/Documentos - America Rental/Diretoria/Teste Sistema/cadastro-colaboradores/data/database.sqlite');
db.all("SELECT ef.id, c.nome_completo, ef.respostas FROM experiencia_formularios ef JOIN colaboradores c ON ef.colaborador_id = c.id WHERE c.nome_completo LIKE '%Wendell%'", (err, rows) => {
    console.log(rows);
});
