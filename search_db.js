const fs = require('fs');
const path = require('path');
const s = require('sqlite3').verbose();
const dir = 'backend/data';
fs.readdirSync(dir).filter(f => f.endsWith('.sqlite') || f.endsWith('.db')).forEach(f => {
    const dbPath = path.join(dir, f);
    const db = new s.Database(dbPath);
    db.all("SELECT * FROM sqlite_master WHERE type='table' AND name='geradores'", (e, r) => {
        if (r && r.length > 0) {
            db.all("SELECT nome, conteudo FROM geradores WHERE nome LIKE '%Academia%'", (e2, r2) => {
                if (r2 && r2.length > 0) {
                    console.log('FOUND IN', f);
                    console.log(r2);
                }
            });
        }
    });
});
