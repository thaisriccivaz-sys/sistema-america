const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.resolve(__dirname, 'backend', 'hr_system_v2.sqlite');
const db = new sqlite3.Database(dbPath);

db.all("PRAGMA table_info(colaboradores)", (err, rows) => {
    if (err) {
        console.error(err);
    } else {
        console.log('Schema da tabela colaboradores:');
        rows.forEach(row => console.log(`- ${row.name} (${row.type})`));
    }
    db.close();
});
