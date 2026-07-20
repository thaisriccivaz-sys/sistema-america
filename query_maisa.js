const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./backend/data/hr_system_v2.sqlite');

db.all("SELECT id, nome_completo, departamento, cargo FROM colaboradores WHERE nome_completo LIKE '%Maisa%';", [], (err, rows) => {
    if (err) { console.error(err); }
    else { console.log("Maisa in colaboradores:", JSON.stringify(rows, null, 2)); }
});

db.close();
