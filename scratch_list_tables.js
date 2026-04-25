const sqlite3 = require('sqlite3').verbose();
const path = require('path');

function checkDb(dbFile) {
    const dbPath = path.resolve(__dirname, 'backend', 'data', dbFile);
    const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
        if (err) {
            console.error(`Error opening ${dbFile}:`, err.message);
            return;
        }
        console.log(`\n--- Tables in ${dbFile} ---`);
        db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, rows) => {
            if (err) {
                console.error(`Error reading ${dbFile}:`, err.message);
            } else {
                rows.forEach(row => console.log(row.name));
            }
        });
    });
}

checkDb('hr_system.sqlite');
checkDb('bd_cadastro.sqlite');
