const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('backend/data/hr_system_v2.sqlite');

db.all("SELECT nome, COUNT(*) as count FROM departamentos GROUP BY LOWER(TRIM(nome)) HAVING count > 1", [], (err, rows) => {
    if (err) console.error(err);
    console.log("Duplicate departments in local DB:", rows);
});
