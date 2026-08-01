const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, 'data', 'hr_system_v2.sqlite');
const db = new sqlite3.Database(dbPath);

const query_com_dup = `
    SELECT p.id as pendencia_id, c.id as colaborador_id, c.nome_completo
    FROM colaboradores c
    LEFT JOIN assinatura_templates t ON t.is_active = 1
    LEFT JOIN assinaturas_pendentes p ON c.id = p.colaborador_id AND p.template_id = t.id
    WHERE c.nome_completo LIKE '%Rafaela%'
`;

const query_sem_dup = `
    SELECT p.id as pendencia_id, c.id as colaborador_id, c.nome_completo
    FROM colaboradores c
    LEFT JOIN assinatura_templates t ON t.is_active = 1
    LEFT JOIN (
        SELECT p.* FROM assinaturas_pendentes p
        INNER JOIN (SELECT colaborador_id, template_id, MAX(id) as max_id FROM assinaturas_pendentes GROUP BY colaborador_id, template_id) pm
        ON p.id = pm.max_id
    ) p ON c.id = p.colaborador_id AND p.template_id = t.id
    WHERE c.nome_completo LIKE '%Rafaela%'
`;

db.all(query_com_dup, [], (err, rows) => {
    console.log("Com dup (se existisse no DB local):", rows);
    db.all(query_sem_dup, [], (err, rows2) => {
        console.log("Sem dup:", rows2);
        process.exit(0);
    });
});
