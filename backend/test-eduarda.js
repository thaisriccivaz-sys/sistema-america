const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('backend/data/hr_system_v2.sqlite');

db.all("SELECT id, nome_completo, meio_transporte FROM colaboradores WHERE nome_completo LIKE '%Eduarda%'", [], (err, rows) => {
    if (err) return console.error(err);
    console.log("Eduarda:", rows);
});
