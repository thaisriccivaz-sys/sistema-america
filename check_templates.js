const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, 'backend', 'data', 'hr_system_v2.sqlite');

const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
    if (err) return console.error(err);
    db.all("SELECT id, nome, tipo, categorias_json FROM avaliacao_templates", [], (err, rows) => {
        if (err) return console.error(err);
        console.log("All Templates:");
        rows.forEach(r => {
            console.log(`ID: ${r.id}, Tipo: ${r.tipo}, Nome: ${r.nome}`);
            console.log(r.categorias_json.substring(0, 100) + '...');
        });
    });
});
