const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('data/hr_system_v2.sqlite');
db.get("SELECT sql FROM sqlite_master WHERE type='table' AND name='multas_logistica'", (err, row) => {
    if (err) console.error(err);
    else console.log(row ? row.sql : "Table not found");
    db.close();
});
