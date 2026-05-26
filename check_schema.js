const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('backend/data/hr_system_v2.sqlite');
db.all("PRAGMA table_info(departamentos)", (err, rows) => {
    console.log("Departamentos:", rows);
});
db.all("SELECT * FROM departamentos LIMIT 3", (err, rows) => {
    console.log("Data:", rows);
});
