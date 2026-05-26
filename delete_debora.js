const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('backend/data/hr_system_v2.sqlite');

db.serialize(() => {
    db.run(`DELETE FROM documentos WHERE document_type = 'Contrato Faculdade' AND colaborador_id IN (SELECT id FROM colaboradores WHERE nome_completo LIKE '%Débora%')`, function(err) {
        if(err) console.error(err);
        else console.log("Registros deletados:", this.changes);
    });
});