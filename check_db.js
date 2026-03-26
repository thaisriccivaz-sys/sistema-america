const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, 'data', 'hr_system_v2.sqlite');
const db = new sqlite3.Database(dbPath);

db.all("PRAGMA table_info(colaboradores)", (err, rows) => {
    if (err) console.error(err);
    console.log(JSON.stringify(rows.map(r => r.name), null, 2));
    db.close();
});
