const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('backend/data/hr_system_v2.sqlite');
db.all("SELECT id, assinafy_id, assinafy_status FROM admissao_assinaturas WHERE assinafy_id IS NOT NULL LIMIT 5", [], (err, rows) => {
    console.log("admissao_assinaturas:", rows);
});
db.all("SELECT id, assinafy_id, assinafy_status FROM documentos WHERE assinafy_id IS NOT NULL LIMIT 5", [], (err, rows) => {
    console.log("documentos:", rows);
});
