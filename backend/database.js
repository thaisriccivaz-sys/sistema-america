const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Caminho absoluto para o banco (compatível com Render)
// Local: backend/data/hr_system.sqlite
const dataDir = path.join(__dirname, 'data');
const dbPath = path.join(dataDir, 'hr_system.sqlite');

// Criar pasta data se não existir
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// Criar pasta colaboradores se não existir
const colabDir = path.join(dataDir, 'colaboradores');
if (!fs.existsSync(colabDir)) {
    fs.mkdirSync(colabDir, { recursive: true });
}

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Erro ao conectar no banco:', err.message);
        process.exit(1);
    } else {
        console.log('--------------------------------------------------');
        console.log('Banco SQLite carregado: backend/data/hr_system.sqlite');
        console.log('--------------------------------------------------');
        
        db.serialize(() => {
            // 1. Tabela: colaboradores
            db.run(`
                CREATE TABLE IF NOT EXISTS colaboradores (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    nome TEXT,
                    cpf TEXT,
                    cargo TEXT,
                    data_admissao TEXT,
                    status TEXT
                )
            `);

            // 2. Tabela: documentos
            db.run(`
                CREATE TABLE IF NOT EXISTS documentos (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    colaborador_id INTEGER,
                    tipo TEXT,
                    nome_arquivo TEXT,
                    caminho TEXT,
                    data_upload TEXT,
                    FOREIGN KEY (colaborador_id) REFERENCES colaboradores (id) ON DELETE CASCADE
                )
            `);

            console.log('Tabelas sincronizadas. Sistema pronto.');
        });
    }
});

// Habilitar chaves estrangeiras
db.run("PRAGMA foreign_keys = ON;");

module.exports = db;
