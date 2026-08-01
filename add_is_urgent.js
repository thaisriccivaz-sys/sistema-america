const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, 'backend', 'data', 'hr_system_v2.sqlite');

const db = new sqlite3.Database(dbPath);
db.serialize(() => {
    db.all("SELECT name FROM sqlite_master WHERE type='table';", [], (err, rows) => {
        if (err) console.error(err);
        else console.log(rows);
    });
    db.run("ALTER TABLE sac_tickets ADD COLUMN is_urgent INTEGER DEFAULT 0;", (err) => {
        if (err) console.error("Error adding column:", err.message);
        else console.log("Added column is_urgent");
    });
});
db.close();
