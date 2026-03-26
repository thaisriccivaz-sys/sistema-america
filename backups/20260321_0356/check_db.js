const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.resolve(__dirname, 'backend', 'hr_system_v2.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if(err) { console.error('Error connecting:', err); process.exit(1); }
});

db.all("PRAGMA table_info(cargos)", (err, rows) => {
    if (err) {
        console.error(err);
    } else {
        console.log('Schema da tabela cargos:');
        rows.forEach(row => console.log(`- ${row.name} (${row.type})`));
    }
    
    db.all("SELECT * FROM cargos", (err, rows) => {
        if (!err) {
            console.log('\nDados na tabela cargos:');
            console.log(JSON.stringify(rows, null, 2));
        }
        db.close();
    });
});
