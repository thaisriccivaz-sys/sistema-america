const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./backend/data/database.sqlite', sqlite3.OPEN_READONLY);
db.all("SELECT * FROM admissao_assinaturas WHERE assinafy_id IS NOT NULL LIMIT 5", (err, rows) => {
    console.log('--- admissao_assinaturas ---');
    console.log(rows);
});
db.all("SELECT * FROM documentos WHERE assinafy_id IS NOT NULL LIMIT 5", (err, rows) => {
    console.log('--- documentos ---');
    console.log(rows);
});
