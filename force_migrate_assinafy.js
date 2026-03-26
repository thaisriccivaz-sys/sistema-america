const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.resolve(__dirname, 'backend', 'hr_system_v2.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('--- INICIANDO MIGRAÇÃO DE COLUNAS ASSINAFY ---');

db.serialize(() => {
    // Adicionar colunas na tabela documentos
    db.run("ALTER TABLE documentos ADD COLUMN assinafy_id TEXT", (err) => {
        if (err) console.log('assinafy_id já existe ou erro:', err.message);
        else console.log('Coluna assinafy_id adicionada.');
    });

    db.run("ALTER TABLE documentos ADD COLUMN assinafy_status TEXT DEFAULT 'Nenhum'", (err) => {
        if (err) console.log('assinafy_status já existe ou erro:', err.message);
        else console.log('Coluna assinafy_status adicionada.');
    });

    db.run("ALTER TABLE documentos ADD COLUMN assinafy_url TEXT", (err) => {
        if (err) console.log('assinafy_url já existe ou erro:', err.message);
        else console.log('Coluna assinafy_url adicionada.');
    });

    // Verificar resultado
    db.all("PRAGMA table_info(documentos)", (err, rows) => {
        if (err) {
            console.error(err);
        } else {
            console.log('Colunas atuais em documentos:', rows.map(r => r.name).join(', '));
        }
        db.close();
    });
});
