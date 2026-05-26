const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('backend/data/hr_system_v2.sqlite');

db.serialize(() => {
    db.get(`SELECT id, nome_completo, email, cpf FROM colaboradores WHERE nome_completo LIKE '%teste%'`, (err, row) => {
        if(err) console.error(err);
        else console.log("Colaborador teste:", row);
    });
});