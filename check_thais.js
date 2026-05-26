const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('backend/data/hr_system_v2.sqlite');

db.serialize(() => {
    db.all(`SELECT id, nome_completo, email, email_corporativo, cpf FROM colaboradores WHERE nome_completo LIKE '%Thais%' OR nome_completo LIKE '%Ricci%'`, (err, rows) => {
        if(err) console.error(err);
        else {
            if (rows.length === 0) console.log("Nenhum colaborador 'Thais Ricci' encontrado");
            else rows.forEach(r => console.log(`  ${r.nome_completo} | email=${r.email || 'VAZIO'} | corp=${r.email_corporativo || 'VAZIO'} | cpf=${r.cpf}`));
        }
    });
    
    // Também verificar qual o campo que o endpoint de geradores usa para buscar o email
    db.all(`PRAGMA table_info(colaboradores)`, (err, cols) => {
        if (!err) {
            const emailCols = cols.filter(c => c.name.toLowerCase().includes('email'));
            console.log("Colunas de email:", emailCols.map(c => c.name).join(', '));
        }
    });
});