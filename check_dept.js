const sqlite3 = require('sqlite3').verbose();
const dbPath = process.env.DB_PATH || 'backend/data/hr_system_v2.sqlite';
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
    if (err) { console.error('Error opening DB:', err); return; }
    db.all("SELECT * FROM departamentos WHERE nome LIKE '%Ajudante%'", (err, rows) => {
        console.log('Departamentos:', rows);
    });
});
