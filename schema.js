const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./backend/data/hr_system_v2.sqlite');

db.all("PRAGMA table_info('usuarios');", [], (err, rows) => {
    if (err) { console.error(err); }
    else { console.log("Usuarios Schema:", JSON.stringify(rows, null, 2)); }
});

db.all("SELECT * FROM usuarios LIMIT 20;", [], (err, rows) => {
    if (err) { console.error(err); }
    else { console.log("Usuarios Data:", JSON.stringify(rows, null, 2)); }
});

db.close();
