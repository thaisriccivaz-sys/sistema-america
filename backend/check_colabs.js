const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('../data/hr_system_v2.sqlite');
db.all(`SELECT id, nome_completo, cargo, departamento FROM colaboradores WHERE nome_completo LIKE '%Walace%' OR nome_completo LIKE '%Levi%'`, (err, rows) => {
    console.log(JSON.stringify(rows, null, 2));
    db.close();
});
