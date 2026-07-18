const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('backend/data/hr_system_v2.sqlite');

db.all("SELECT sql FROM sqlite_master WHERE type='table' AND name LIKE '%estoque%'", (err, rows) => {
    console.log(rows.map(r=>r.sql).join('\n\n'));
});
