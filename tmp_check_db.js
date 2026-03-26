const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.resolve(__dirname, 'backend/hr_system_v2.sqlite');
const db = new sqlite3.Database(dbPath);
db.get('SELECT id, nome_completo, foto_path FROM colaboradores WHERE id = 36', (err, row) => {
    if (err) console.error(err);
    console.log('--- DATABASE QUERY RESULT ---');
    console.log(JSON.stringify(row, null, 2));
    db.close();
});
