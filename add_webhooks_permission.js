const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, 'backend', 'data', 'hr_system_v2.sqlite');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    // 1. Insert into paginas
    db.run("INSERT OR IGNORE INTO paginas (id, titulo, icone, ordem, visivel, departamento) VALUES ('dir-webhooks', 'Webhooks', 'ph-plugs-connected', 99, 1, 'diretoria')", function(err) {
        if (err) {
            console.error("Error inserting pagina:", err.message);
        } else {
            console.log("Pagina dir-webhooks ensured.");
        }
    });
    
    // 2. Grant permission for all groups (so the user Thais can see it)
    db.all("SELECT id FROM grupo_permissoes", (err, rows) => {
        if (err) {
            return console.error(err);
        }
        rows.forEach(row => {
            db.run("INSERT OR IGNORE INTO permissoes (grupo_id, pagina_id, visualizar, adicionar, editar, excluir) VALUES (?, 'dir-webhooks', 1, 1, 1, 1)", [row.id], function(err2) {
                if (err2) {
                    console.error("Error granting permission to group", row.id, ":", err2.message);
                } else {
                    console.log("Granted permission to group", row.id);
                }
            });
        });
    });
});
