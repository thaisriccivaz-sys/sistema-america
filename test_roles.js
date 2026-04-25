const sqlite3 = require('c:/A/OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA/Documentos - America Rental/Diretoria/Teste Sistema/cadastro-colaboradores/node_modules/sqlite3').verbose();
const db = new sqlite3.Database('c:/A/OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA/Documentos - America Rental/Diretoria/Teste Sistema/cadastro-colaboradores/data/database.sqlite');
db.all('SELECT username, role FROM users', (err, rows) => {
    if (err) console.error(err);
    console.log(rows);
});
