const fs = require('fs');

// Fix 1: Add migration for 'os' column in server.js
const serverPath = 'backend/server.js';
let server = fs.readFileSync(serverPath, 'utf8');

const oldMigration = "// MIGRATION: Adicionar coluna docs_exigidos na tabela credenciamentos (se nao existir)\r\ndb.run(\"ALTER TABLE credenciamentos ADD COLUMN docs_exigidos TEXT DEFAULT '[]'\", (err) => {\r\n    if (!err) console.log('[MIGRATION] Coluna docs_exigidos adicionada na tabela credenciamentos.');\r\n    // Ignora erro de coluna ja existente (expected)\r\n});";
const newMigration = "// MIGRATION: Adicionar coluna docs_exigidos na tabela credenciamentos (se nao existir)\r\ndb.run(\"ALTER TABLE credenciamentos ADD COLUMN docs_exigidos TEXT DEFAULT '[]'\", (err) => {\r\n    if (!err) console.log('[MIGRATION] Coluna docs_exigidos adicionada na tabela credenciamentos.');\r\n    // Ignora erro de coluna ja existente (expected)\r\n});\r\n\r\n// MIGRATION: Adicionar coluna 'os' na tabela credenciamentos (se nao existir)\r\ndb.run(\"ALTER TABLE credenciamentos ADD COLUMN os TEXT DEFAULT ''\", (err) => {\r\n    if (!err) console.log('[MIGRATION] Coluna os adicionada na tabela credenciamentos.');\r\n    // Ignora erro de coluna ja existente (expected)\r\n});\r\n\r\n// MIGRATION: Adicionar colunas qtd_max_colaboradores, qtd_max_veiculos, data_limite_envio, status na tabela credenciamentos\r\n['qtd_max_colaboradores INTEGER DEFAULT 0', 'qtd_max_veiculos INTEGER DEFAULT 0', 'data_limite_envio TEXT', 'status TEXT DEFAULT \\'solicitado\\'', 'licencas_ids TEXT DEFAULT \\'[]\\''].forEach(col => {\r\n    const colName = col.split(' ')[0];\r\n    db.run(`ALTER TABLE credenciamentos ADD COLUMN ${col}`, (err) => {\r\n        if (!err) console.log(`[MIGRATION] Coluna ${colName} adicionada na tabela credenciamentos.`);\r\n    });\r\n});";

if (server.includes(oldMigration)) {
    server = server.replace(oldMigration, newMigration);
    console.log('Fixed: Added os column migration');
} else {
    // Try with LF
    const oldMigrationLF = oldMigration.replace(/\r\n/g, '\n');
    const newMigrationLF = newMigration.replace(/\r\n/g, '\n');
    if (server.includes(oldMigrationLF)) {
        server = server.replace(oldMigrationLF, newMigrationLF);
        console.log('Fixed: Added os column migration (LF)');
    } else {
        console.error('Could not find migration block!');
        process.exit(1);
    }
}

fs.writeFileSync(serverPath, server);
console.log('server.js updated');
