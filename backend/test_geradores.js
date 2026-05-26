const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('backend/data/hr_system_v2.sqlite');
db.all("SELECT id, nome FROM geradores", (err, rows) => {
    if (err) console.error("ERRO:", err);
    console.log("GERADORES:", rows);
});
