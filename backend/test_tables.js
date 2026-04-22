const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('../data/hr_system_v2.sqlite', sqlite3.OPEN_READONLY);
db.all("SELECT name FROM sqlite_master WHERE type='table';", (err, rows) => {
    console.log(rows);
    db.close();
});
