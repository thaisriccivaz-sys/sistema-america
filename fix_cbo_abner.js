const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('backend/data/hr_system_v2.sqlite');
db.run("UPDATE colaboradores SET cbo = '3421-25 - Tecnólogo em Logística de Transporte' WHERE nome_completo = 'Abner Abrahão'", function(err) {
    if (err) console.error(err.message);
    else console.log('✅ CBO do Abner atualizado! Registros:', this.changes);
    db.close();
});
