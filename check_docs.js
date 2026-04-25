const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('backend/data/hr_system_v2.sqlite');
db.all("SELECT id, document_type, assinafy_status, file_name, signed_file_path FROM documentos ORDER BY id DESC LIMIT 5", [], (err, rows) => {
    console.log(rows);
});
