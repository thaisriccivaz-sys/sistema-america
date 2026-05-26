const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('backend/data/hr_system_v2.sqlite');
db.all("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%os%';", [], (err, tables) => {
    console.log(tables);
    db.all("SELECT * FROM logistica_os WHERE id IN (3910, 6044)", [], (err, rows) => {
        console.log(rows);
        db.close();
    });
});
