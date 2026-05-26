const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('backend/data/hr_system_v2.sqlite');

// Check Monaco table columns
db.all("PRAGMA table_info(multas_monaco)", (err, cols) => {
    console.log('Monaco cols:', cols.map(c => c.name).join(', '));
    db.all("SELECT COUNT(*) as total FROM multas_monaco", (e, r) => {
        console.log('Monaco total:', r);
    });
});

// Check multas_logistica columns
db.all("PRAGMA table_info(multas_logistica)", (err, cols) => {
    console.log('multas_logistica cols:', cols.map(c => c.name).join(', '));
    db.all("SELECT COUNT(*) as total FROM multas_logistica", (e, r) => {
        console.log('multas_logistica total:', r);
    });
});

// Check multas columns
db.all("PRAGMA table_info(multas)", (err, cols) => {
    console.log('multas cols:', cols.map(c => c.name).join(', '));
    db.all("SELECT COUNT(*) as total FROM multas", (e, r) => {
        console.log('multas total:', r);
        db.close();
    });
});
