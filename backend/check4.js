const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('data/hr_system_v2.sqlite');
db.all("SELECT sql FROM sqlite_master WHERE name='multas_monaco'", [], (err, rows) => {
    if(err) console.error(err);
    else console.log(rows);
});
