const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('data/hr_system.sqlite');
db.all("SELECT id, nome_completo, meio_transporte FROM colaboradores WHERE meio_transporte IS NOT NULL AND meio_transporte != ''", (err, rows) => { 
    if (err) console.error(err);
    else console.log(rows);
    db.close(); 
});
