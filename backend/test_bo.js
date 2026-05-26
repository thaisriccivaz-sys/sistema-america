const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('backend/data/hr_system_v2.sqlite');
db.all("SELECT COUNT(*) AS count FROM documentos", (err, rows) => {
    if (err) console.error("ERRO:", err);
    console.log("COUNT:", rows);
});
