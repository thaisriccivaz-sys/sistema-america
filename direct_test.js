const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.resolve(__dirname, 'backend', 'hr_system_v2.sqlite');
const db = new sqlite3.Database(dbPath);

const id = 36;
const inicio = '2025-12-25';
const query = "UPDATE colaboradores SET ferias_programadas_inicio = ? WHERE id = ?";

db.run(query, [inicio, id], function(err) {
    if (err) { console.error(err); process.exit(1); }
    console.log(`Rows updated: ${this.changes}`);
    
    db.get("SELECT ferias_programadas_inicio FROM colaboradores WHERE id = ?", [id], (err2, row) => {
        if (err2) { console.error(err2); process.exit(1); }
        console.log(`Value in DB: ${row.ferias_programadas_inicio}`);
        db.close();
    });
});
