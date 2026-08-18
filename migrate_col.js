const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('backend/data/hr_system_v2.sqlite');

db.serialize(() => {
    // Add column
    db.run("ALTER TABLE candidatos_teste ADD COLUMN retornou_teste_extra INTEGER DEFAULT 0", (err) => {
        if (err) console.log("Column already exists or error:", err.message);
        else console.log("Column retornou_teste_extra added.");
    });

    // Update existing candidates
    db.run("UPDATE candidatos_teste SET status = 'Dias de Teste' WHERE status IN ('Teste 1º Dia', 'Teste 2º Dia', 'Teste Extra')", function(err) {
        if (err) console.log("Error updating statuses:", err.message);
        else console.log("Updated statuses for", this.changes, "candidates.");
    });
    
    // Check if it's there
    db.get("SELECT COUNT(*) as c FROM candidatos_teste WHERE status = 'Dias de Teste'", (err, row) => {
        console.log("Candidates in Dias de Teste:", row ? row.c : 0);
    });
});
