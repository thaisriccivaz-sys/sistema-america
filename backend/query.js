const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('data/hr_system_v2.sqlite');
db.all("SELECT * FROM departamentos", [], (err, rows) => {
    if (err) console.error(err);
    else console.log(JSON.stringify(rows, null, 2));
    db.close();
});
