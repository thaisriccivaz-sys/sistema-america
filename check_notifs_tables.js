const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('backend/data/hr_system_v2.sqlite');
db.all("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%notificacoes%'", [], (err, rows) => {
    console.log(rows);
    db.close();
});
