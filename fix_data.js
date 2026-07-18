
const db = require('./backend/database');
const sql = `
UPDATE assinaturas_auditoria
SET pesquisa_respondida_em = (
    SELECT tpr.respondido_em 
    FROM treinamento_presenca tp
    JOIN treinamento_pesquisa_respostas tpr 
      ON tpr.treinamento_id = tp.treinamento_id 
      AND tpr.colaborador_id = tp.colaborador_id
    WHERE tp.id = assinaturas_auditoria.documento_id
    AND tpr.respondido_em IS NOT NULL
)
WHERE pesquisa_respondida_em IS NULL
AND (document_type LIKE '%Treinamento%' OR document_type LIKE '%Terapia%' OR document_type LIKE '%Palestra%' OR document_type LIKE '%Lista de Presença%')
AND EXISTS (
    SELECT 1 
    FROM treinamento_presenca tp
    JOIN treinamento_pesquisa_respostas tpr 
      ON tpr.treinamento_id = tp.treinamento_id 
      AND tpr.colaborador_id = tp.colaborador_id
    WHERE tp.id = assinaturas_auditoria.documento_id
    AND tpr.respondido_em IS NOT NULL
);
`;

setTimeout(() => {
    db.run(sql, (err) => {
        if (err) console.error(err);
        else console.log('✅ Old data fixed');
        process.exit(0);
    });
}, 1000);
