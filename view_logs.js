const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('backend/data/hr_system_v2.sqlite');
db.all("SELECT * FROM system_logs ORDER BY id DESC LIMIT 10", [], (err, rows) => {
    if (err) console.error(err);
    else console.log(rows);
});
