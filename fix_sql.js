const fs = require('fs');
const path = 'backend/server.js';
let content = fs.readFileSync(path, 'utf8');

const target = /db\.run\(`CREATE TABLE IF NOT EXISTS comercial_notificacoes \([\s\S]*?created_at DATETIME DEFAULT CURRENT_TIMESTAMP\s*\);\s*db\.run\("ALTER TABLE comercial_notificacoes ADD COLUMN dados TEXT", \(\) => \{\}\);\s*CREATE TABLE IF NOT EXISTS logistica_notificacoes_pendentes \(/m;

const replacement = `db.run(\`CREATE TABLE IF NOT EXISTS comercial_notificacoes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            usuario_id INTEGER,
            mensagem TEXT,
            tipo TEXT,
            dados TEXT,
            lida INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );\`, () => {
            db.run("ALTER TABLE comercial_notificacoes ADD COLUMN dados TEXT", () => {});
        });

    db.run(\`CREATE TABLE IF NOT EXISTS logistica_notificacoes_pendentes (`;

if (content.match(target)) {
    content = content.replace(target, replacement);
    fs.writeFileSync(path, content, 'utf8');
    console.log("Fixed broken SQL string in server.js");
} else {
    console.log("Regex not matched!");
}