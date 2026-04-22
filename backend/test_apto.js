const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('../data/hr_system_v2.sqlite', sqlite3.OPEN_READONLY);

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
    if (err) return console.error(err);
    
    rows.forEach(c => {
        const faltas = c.faltas_ano || 0;
        const punicoes = c.punicoes || 0;
        let statusEf = c.status || 'Ativo';
        
        let admDias = 0;
        if (c.data_admissao) {
            admDias = Math.floor((new Date() - new Date(c.data_admissao + 'T12:00:00')) / 86400000);
        }
        
        const isCLT = (c.tipo_contrato || '').toLowerCase().includes('clt');
        
        const isApto = (faltas <= 3) && 
                       (punicoes === 0) &&
                       (['Ativo', 'Afastado', 'Férias'].includes(statusEf)) &&
                       (admDias >= 90) &&
                       isCLT;
                       
        if (!isApto) {
            console.log(`Failed ${c.nome_completo}: faltas=${faltas}, punicoes=${punicoes}, status=${statusEf}, admDias=${admDias}, isCLT=${isCLT} (${c.tipo_contrato})`);
        } else {
            console.log(`✓ Passed ${c.nome_completo}`);
        }
    });

    db.close();
});
