const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('backend/data/hr_system_v2.sqlite');
db.run("DELETE FROM colaboradores WHERE nome_completo IN ('Teste Colaborador', 'Nome')", function(err) {
    if(err) console.error(err);
    else console.log('Apagados: ' + this.changes);
    db.close();
});
