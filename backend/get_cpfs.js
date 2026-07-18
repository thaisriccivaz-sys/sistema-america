const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, 'data', 'hr_system_v2.sqlite');
const db = new sqlite3.Database(dbPath);

db.all("SELECT id, nome_completo as nome, cpf FROM colaboradores WHERE nome_completo LIKE '%Pedro%'", [], (err, rows) => {
    if (err) console.error(err);
    else console.log(rows);
});
