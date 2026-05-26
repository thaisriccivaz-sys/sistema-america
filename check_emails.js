const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('backend/data/hr_system_v2.sqlite');

db.serialize(() => {
    db.all(`SELECT id, nome_completo, email, email_corporativo, cpf FROM colaboradores WHERE nome_completo IN ('Thais Ricci', 'Eduarda Silva Lima', 'Débora Alexandre Salvador')`, (err, rows) => {
        if(err) console.error(err);
        else rows.forEach(r => console.log(`  ${r.nome_completo} | email=${r.email || 'VAZIO'} | corp=${r.email_corporativo || 'VAZIO'} | cpf=${r.cpf}`));
    });
});