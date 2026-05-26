const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('backend/data/database.sqlite');
db.all("SELECT name, sql FROM sqlite_master WHERE type='table' AND name LIKE '%multa%';", (err, rows) => {
    console.log(rows);
});
