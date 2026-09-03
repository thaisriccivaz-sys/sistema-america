const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = "C:\\A\\OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA\\Documentos - America Rental\\Diretoria\\Teste Sistema\\Backups\\Backups_2026-08-21_06-02-42_hr_system_v2.sqlite";

const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
    if (err) {
        console.error('Erro ao abrir o banco de dados:', err.message);
        process.exit(1);
    }
});

db.serialize(() => {
    const query = `
        SELECT numero_os, cliente, tipo_servico, habilidades, variaveis, observacoes
        FROM os_logistica
        WHERE (tipo_servico LIKE '%MANUTEN%' OR tipo_servico LIKE '%VAC%')
          AND status = 'ativo'
          AND (
              (variaveis IS NOT NULL AND variaveis != '[]' AND variaveis != '')
              OR habilidades LIKE '%VAC%'
              OR habilidades LIKE '%CARRETINHA%'
              OR habilidades LIKE '%UTILITARIO%'
          )
          AND (observacoes IS NULL OR trim(observacoes) = '')
        ORDER BY criado_em DESC
    `;
    
    db.all(query, [], (err, rows) => {
        if (err) {
            console.error('Erro na query:', err);
            return;
        }
        
        console.log(JSON.stringify(rows, null, 2));
    });
});
