const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('database.sqlite');
db.all("SELECT sql FROM sqlite_master WHERE name='colaboradores'", [], (err, rows) => {
    if(err) console.error(err);
    else console.log(rows);
});
