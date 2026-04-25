const fs = require('fs');
let js = fs.readFileSync('backend/server.js', 'utf8');

const target = `console.warn('[POLL-ADMISSAO] OneDrive sync falhou:', odErr.message);`;
const replace = `console.warn('[POLL-ADMISSAO] OneDrive sync falhou:', odErr.message);
try {
    db.run("CREATE TABLE IF NOT EXISTS system_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, msg TEXT, ts DATETIME DEFAULT CURRENT_TIMESTAMP)", () => {
        db.run("INSERT INTO system_logs (msg) VALUES (?)", ['OneDrive Sync Error: ' + odErr.message + ' | Path: ' + targetDir]);
    });
} catch(e) {}
`;

js = js.replace(target, replace);
fs.writeFileSync('backend/server.js', js, 'utf8');
