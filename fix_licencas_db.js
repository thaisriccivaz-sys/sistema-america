const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./backend/data/hr_system_v2.sqlite');

db.serialize(() => {
    db.run("UPDATE licencas SET nome = 'CLI - Alvará' WHERE nome IN ('CLI', 'ALVARÁ', 'Alvará')", function(err) {
        if (err) console.error(err); else console.log("CLI atualizados:", this.changes);
    });
    db.run("UPDATE licencas SET nome = 'LO - CETESB' WHERE nome IN ('Licença de Operação', 'CETESB', 'LO - Licença de Operação', 'LO')", function(err) {
        if (err) console.error(err); else console.log("LO atualizados:", this.changes);
    });
});
