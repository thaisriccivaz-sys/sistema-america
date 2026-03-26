const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./backend/hr_system_v2.sqlite');

db.run(
    `CREATE TABLE IF NOT EXISTS cargo_documentos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cargo_id INTEGER NOT NULL,
        documento TEXT NOT NULL,
        UNIQUE(cargo_id, documento)
    )`,
    (err) => {
        if (err) console.error('Erro ao criar tabela:', err.message);
        else console.log('Tabela cargo_documentos criada com sucesso!');
        db.close();
    }
);
