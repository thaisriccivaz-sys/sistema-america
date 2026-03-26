const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.resolve(__dirname, 'backend/hr_system_v2.sqlite');
const db = new sqlite3.Database(dbPath);
db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS cursos_faculdade (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome_curso TEXT NOT NULL,
            instituicao TEXT NOT NULL,
            tempo_curso TEXT,
            valor_mensalidade REAL,
            data_inicio TEXT,
            data_termino_prevista TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `, (err) => {
        if (err) console.error('Erro:', err);
        else console.log('Tabela cursos_faculdade criada com sucesso!');
    });
});
db.close();
