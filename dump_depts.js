const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, 'backend', 'data', 'hr_system_v2.sqlite');

const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
    if (err) return console.error(err);
    db.all("SELECT id, nome, responsavel_nome, responsavel_id FROM departamentos", [], (err, rows) => {
        if (err) return console.error(err);
        console.table(rows);
    });
    db.all("SELECT nome FROM usuarios", [], (err, rows) => {
        if (err) return console.error(err);
        console.log("Usuarios:", rows.map(r => r.nome).join(', '));
    });
});
