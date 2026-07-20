const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('backend/data/hr_system_v2.sqlite');
db.all(`PRAGMA table_info('departamentos')`, [], (err, rows) => {
    if (err) console.error(err);
    else console.log(rows);
    db.close();
});
