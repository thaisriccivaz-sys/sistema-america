const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'backend', 'hr_system_v2.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('Iniciando limpeza do sistema...');

db.serialize(() => {
    db.run("PRAGMA foreign_keys = ON;");
    
    // 1. Limpar tabelas dependentes sem cascade (se houver)
    db.run("DELETE FROM colaborador_chaves", (err) => {
        if (err) console.error('Erro chaves:', err.message);
        else console.log('Chaves vinculadas removidas.');
    });

    // 2. Limpar colaboradores (Gatilhos de Cascade removerão dependentes e documentos)
    db.run("DELETE FROM colaboradores", (err) => {
        if (err) console.error('Erro colaboradores:', err.message);
        else console.log('Todos os colaboradores removidos com sucesso.');
    });

    // 3. Limpar logs
    db.run("DELETE FROM historico_logs", (err) => {
        if (err) console.error('Erro logs:', err.message);
        else console.log('Histórico de logs limpo.');
    });

    // 4. Resetar IDs (Auto-increment)
    db.run("DELETE FROM sqlite_sequence WHERE name IN ('colaboradores', 'dependentes', 'documentos', 'historico_logs')", (err) => {
        if (!err) console.log('Sequências de ID resetadas.');
    });

}, () => {
    db.close();
    console.log('Limpeza concluída.');
});
