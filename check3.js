const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('backend/data/hr_system_v2.sqlite');

db.all("PRAGMA table_info(estoque)", (err, rows) => {
    console.log('estoque:', rows.map(r=>r.name));
});
db.all("PRAGMA table_info(estoque_saldos)", (err, rows) => {
    console.log('estoque_saldos:', rows.map(r=>r.name));
});
