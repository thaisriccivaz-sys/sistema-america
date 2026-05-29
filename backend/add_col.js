const sqlite3 = require('sqlite3');
const path = require('path');
const fs = require('fs');

const dbs = ['banco_sistema.db', 'database.db', 'database.sqlite', 'hr_system.sqlite', 'hr_system_v2.sqlite', 'america_rental.db'];

dbs.forEach(dbName => {
    const dbPath = path.join(__dirname, dbName);
    if (!fs.existsSync(dbPath)) return;
    const db = new sqlite3.Database(dbPath);
    db.all("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'frota%'", (err, rows) => {
        if (!err && rows.length > 0) {
            console.log(`Found frota tables in ${dbName}:`, rows.map(r => r.name).join(', '));
        }
    });
});
