const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('backend/data/hr_system_v2.sqlite');

db.serialize(() => {
    db.all("SELECT id, nome FROM geradores WHERE nome LIKE '%AUTORIZA%DESCONTO%FOLHA%'", (err, rows) => {
        if (err) console.error(err);
        else console.log('Geradores encontrados para renomear:', rows);
    });
    db.all("SELECT id, nome FROM geradores WHERE nome LIKE '%ORDEM DE SERVI%NR01%'", (err, rows) => {
        if (err) console.error(err);
        else console.log('Geradores encontrados para excluir:', rows);
    });
});