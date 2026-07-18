const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('backend/data/hr_system_v2.sqlite');

db.get("SELECT * FROM colaboradores WHERE nome_completo LIKE '%Eduarda%'", [], (err, row) => {
    if (err) return console.error(err);
    console.log("Eduarda:", row);
});
