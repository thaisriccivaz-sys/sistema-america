const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('backend/data/hr_system_v2.sqlite');
db.all("SELECT numero_mtr, status FROM mtr_local", [], (err, rows) => {
    console.log(err || rows);
});
