const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, 'data', 'hr_system_v2.sqlite');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    db.run(`ALTER TABLE colaboradores ADD COLUMN habilitacao_b TEXT DEFAULT 'Não'`, (err) => {
        if (err && !err.message.includes('duplicate column name')) {
            console.error('Erro ao adicionar habilitacao_b:', err.message);
        } else {
            console.log('Coluna habilitacao_b adicionada ou já existia.');
        }
    });
    db.run(`ALTER TABLE colaboradores ADD COLUMN habilitacao_d TEXT DEFAULT 'Não'`, (err) => {
        if (err && !err.message.includes('duplicate column name')) {
            console.error('Erro ao adicionar habilitacao_d:', err.message);
        } else {
            console.log('Coluna habilitacao_d adicionada ou já existia.');
        }
    });
});
