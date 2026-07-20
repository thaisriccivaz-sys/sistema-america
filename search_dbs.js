const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const dirs = ['backend', 'backend/data'];
const dbFiles = [];

for (const dir of dirs) {
    if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir);
        for (const file of files) {
            if (file.endsWith('.sqlite') || file.endsWith('.db')) {
                dbFiles.push(path.join(dir, file));
            }
        }
    }
}

async function searchDB(dbPath) {
    return new Promise((resolve) => {
        const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
            if (err) return resolve(); // Skip if can't open
            
            db.all("SELECT name FROM sqlite_master WHERE type='table' AND name='colaboradores'", [], (err, tables) => {
                if (err || tables.length === 0) {
                    db.close();
                    return resolve();
                }
                
                db.all("SELECT id, nome_completo, departamento FROM colaboradores WHERE nome_completo LIKE '%Beatriz%' OR nome_completo LIKE '%Juliane%'", [], (err, rows) => {
                    if (!err && rows && rows.length > 0) {
                        console.log(`\nFound in ${dbPath}:`);
                        console.log(rows);
                    }
                    db.close();
                    resolve();
                });
            });
        });
    });
}

async function main() {
    for (const dbPath of dbFiles) {
        await searchDB(dbPath);
    }
    console.log('Search complete.');
}
main();
