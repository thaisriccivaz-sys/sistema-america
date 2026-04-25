const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('./backend/data/hr_system_v2.sqlite');
const query = `
    SELECT c.*,
        (SELECT COUNT(*) FROM faltas f 
         WHERE f.colaborador_id = c.id 
           AND strftime('%Y', f.data_falta) = strftime('%Y', 'now') 
           AND NOT EXISTS (
               SELECT 1 FROM documentos d 
               WHERE d.colaborador_id = c.id 
                 AND (d.tab_name LIKE '%ATESTADO%' OR d.document_type LIKE '%Atestado%')
                 AND f.data_falta >= d.atestado_inicio 
                 AND f.data_falta <= d.atestado_fim
           )
        ) as faltas_ano,
        (SELECT COUNT(*) FROM documentos d 
         WHERE d.colaborador_id = c.id 
           AND (d.document_type LIKE '%Advertência%' OR d.document_type LIKE '%Suspensão%' OR d.tab_name LIKE '%Advertência%' OR d.tab_name LIKE '%Suspensão%')
        ) as punicoes
    FROM colaboradores c
`;
db.all(query, [], (err, rows) => {
    if (err) console.error("ERRO:", err.message);
    else console.log("SUCESSO:", rows.length);
});
