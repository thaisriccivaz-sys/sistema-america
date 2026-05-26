const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('backend/data/hr_system_v2.sqlite');

db.all('SELECT * FROM comercial_notificacoes ORDER BY id DESC LIMIT 5', [], (err, rows) => {
    if(err) console.error(err);
    else console.log(JSON.stringify(rows, null, 2));
});