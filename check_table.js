const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('backend/data/hr_system_v2.sqlite', sqlite3.OPEN_READONLY);
db.all("SELECT sql FROM sqlite_master WHERE tbl_name='assinaturas_auditoria'", [], (err, rows) => {
    console.log(rows);
});
