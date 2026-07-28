const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, 'data', 'hr_system_v2.sqlite');
const db = new sqlite3.Database(dbPath);
db.all(`SELECT p.id, p.colaborador_id, p.template_id, p.status, c.nome_completo FROM assinaturas_pendentes p JOIN colaboradores c ON p.colaborador_id = c.id WHERE c.nome_completo LIKE '%Rafaela%'`, [], (err, rows) => {
    if (err) console.error("Error1:", err.message);
    console.log("Pendentes:", JSON.stringify(rows, null, 2));
    db.all(`SELECT id, nome, is_active FROM assinatura_templates WHERE is_active = 1`, [], (err2, rows2) => {
        if (err2) console.error("Error2:", err2.message);
        console.log("Templates Ativos:", JSON.stringify(rows2, null, 2));
        process.exit(0);
    });
});
