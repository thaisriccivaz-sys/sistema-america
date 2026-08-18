const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('backend/database.sqlite');
db.all('PRAGMA table_info(usuarios)', [], (err, rows) => {
    console.log(rows);
});
