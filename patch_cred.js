const fs = require('fs');

// 1. UPDATE DATABASE.JS
let db = fs.readFileSync('backend/database.js', 'utf8');
if (!db.includes('solicitado_por_nome TEXT')) {
    db = db.replace(
        'db.run("ALTER TABLE credenciamentos ADD COLUMN endereco_instalacao TEXT", (err) => {',
        `db.run("ALTER TABLE credenciamentos ADD COLUMN solicitado_por_nome TEXT", (err) => {});\n    db.run("ALTER TABLE credenciamentos ADD COLUMN solicitado_por_id INTEGER", (err) => {});\n    db.run("ALTER TABLE credenciamentos ADD COLUMN enviado_por_nome TEXT", (err) => {});\n    db.run("ALTER TABLE credenciamentos ADD COLUMN enviado_por_id INTEGER", (err) => {});\n    db.run("ALTER TABLE credenciamentos ADD COLUMN solicitado_por_foto TEXT", (err) => {});\n    db.run("ALTER TABLE credenciamentos ADD COLUMN enviado_por_foto TEXT", (err) => {});\n    db.run("ALTER TABLE credenciamentos ADD COLUMN endereco_instalacao TEXT", (err) => {`
    );
    fs.writeFileSync('backend/database.js', db);
}

// 2. UPDATE SERVER.JS POST ROUTES
let server = fs.readFileSync('backend/server.js', 'utf8');

// POST /api/comercial/credenciamento (Solicitar Credencial - Comercial)
if (!server.includes('solicitado_por_nome, solicitado_por_id')) {
    server = server.replace(
        `VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'solicitado', ?)`,
        `VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'solicitado', ?, ?, ?, ?)`
    );
    server = server.replace(
        `observacoes || '',\n              tokenPlaceholder\n          ]`,
        `observacoes || '',\n              tokenPlaceholder,\n              req.user ? req.user.nome || req.user.username : null,\n              req.user ? req.user.id : null,\n              req.body.solicitado_por_foto || null\n          ]`
    );
    server = server.replace(
        `status, token)`,
        `status, token, solicitado_por_nome, solicitado_por_id, solicitado_por_foto)`
    );
}

// POST /api/logistica/credenciamento (Solicitar e Gerar - Logística)
if (!server.includes('solicitado_por_nome, solicitado_por_id') && server.includes(`INSERT INTO credenciamentos (cliente_nome`)) {
    // There are two inserts for credenciamentos in logistics. Oh wait, /api/logistica/credenciamento creates a new one and marks it enviando?
    // Let's use string replace carefully
}

fs.writeFileSync('backend/server.js', server);
console.log('Done!');
