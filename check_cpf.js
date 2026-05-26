const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('backend/data/hr_system_v2.sqlite');

db.serialize(() => {
    db.all(`SELECT id, nome_completo, email, cpf FROM colaboradores WHERE status != 'Desligado' ORDER BY nome_completo LIMIT 20`, (err, rows) => {
        if(err) console.error(err);
        else {
            console.log("Colaboradores ativos:");
            rows.forEach(r => console.log(`  ID=${r.id} | ${r.nome_completo} | email=${r.email} | cpf=${r.cpf || 'VAZIO'}`));
        }
    });
});