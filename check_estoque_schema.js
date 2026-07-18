const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const db = new sqlite3.Database(path.join(__dirname, 'backend/data/hr_system_v2.sqlite'));

db.serialize(() => {
    db.all("PRAGMA table_info(estoque)", (err, rows) => {
        console.log(rows);
    });
    db.all("SELECT * FROM estoque LIMIT 5", (err, rows) => {
        console.log("ESTOQUE:");
        console.log(rows);
    });
});
