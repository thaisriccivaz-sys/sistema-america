const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('backend/data/hr_system_v2.sqlite');

db.serialize(() => {
    // Modify observacoes
    db.run(`UPDATE os_logistica 
            SET observacoes = trim(substr(observacoes, instr(observacoes, ':') + 1))
            WHERE observacoes LIKE '%:%'`, function(err) {
        if (err) console.error(err);
        else console.log(`Updated ${this.changes} rows in observacoes.`);
    });
    
    // Modify observacoes_internas
    db.run(`UPDATE os_logistica 
            SET observacoes_internas = trim(substr(observacoes_internas, instr(observacoes_internas, ':') + 1))
            WHERE observacoes_internas LIKE '%:%'`, function(err) {
        if (err) console.error(err);
        else console.log(`Updated ${this.changes} rows in observacoes_internas.`);
    });
});
