const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('c:/A/OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA/Documentos - America Rental/Diretoria/Teste Sistema/cadastro-colaboradores/backend/data/hr_system_v2.sqlite');
db.all("PRAGMA table_info(documentos)", [], (err, rows) => {
    if (err) console.error(err);
    else console.log(rows.map(r => r.name).join(', '));
});
