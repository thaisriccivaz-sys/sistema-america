const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('backend/data/hr_system_v2.sqlite');

db.serialize(() => {
    db.all(`SELECT id, nome_completo FROM colaboradores WHERE nome_completo LIKE '%D_bora%' OR nome_completo LIKE '%Debora%'`, (err, rows) => {
        if(err) console.error(err);
        else console.log("Colaboradores:", rows);
        
        if (rows.length > 0) {
            db.all(`SELECT id, document_type, tab_name FROM documentos WHERE colaborador_id = ?`, [rows[0].id], (err, docs) => {
                if(err) console.error(err);
                else console.log("Documentos:", docs);
            });
        }
    });
});