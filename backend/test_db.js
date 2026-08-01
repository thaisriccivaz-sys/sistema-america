const sqlite3 = require('sqlite3');
const path = require('path');
const dbPath = path.join(__dirname, 'data', 'hr_system_v2.sqlite');
const db = new sqlite3.Database(dbPath);
db.all("SELECT cliente, endereco FROM os_logistica WHERE endereco LIKE '%MAU%' LIMIT 5;", (err, rows) => {
    if(err) console.error(err);
    else console.log(rows);
});
