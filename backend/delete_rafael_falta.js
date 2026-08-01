const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, 'data', 'hr_system_v2.sqlite');
const db = new sqlite3.Database(dbPath);

db.run(`DELETE FROM faltas WHERE data_falta = '2026-07-31' AND colaborador_id IN (SELECT id FROM colaboradores WHERE nome_completo LIKE '%Rafael%')`, function(err) {
    if (err) {
        console.error("Erro ao deletar:", err.message);
    } else {
        console.log(`Deletados ${this.changes} registros.`);
    }
});
