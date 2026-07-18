const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('backend/data/hr_system_v2.sqlite');

db.serialize(() => {
    db.run("DELETE FROM experiencia_formularios WHERE responsavel_nome = '-' OR responsavel_nome = ' - '", function(err) {
        if (err) console.error(err);
        else console.log(`Deleted ${this.changes} forms with responsavel_nome = '-'`);
    });

    db.run("DELETE FROM experiencia_formularios WHERE colaborador_id IN (SELECT id FROM colaboradores WHERE nome_completo LIKE '%Thais Ricci%')", function(err) {
        if (err) console.error(err);
        else console.log(`Deleted ${this.changes} forms for Thais Ricci`);
    });
});
