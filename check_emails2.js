const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('backend/data/hr_system_v2.sqlite');

db.serialize(() => {
    // Find collaborators that have non-empty email for testing
    db.all(`SELECT id, nome_completo, email, cpf FROM colaboradores WHERE email IS NOT NULL AND email != '' ORDER BY id`, (err, rows) => {
        if(err) console.error(err);
        else {
            console.log("Colaboradores COM email preenchido:");
            rows.forEach(r => console.log(`  ID=${r.id} | ${r.nome_completo} | email=${r.email} | cpf=${r.cpf}`));
        }
    });
});