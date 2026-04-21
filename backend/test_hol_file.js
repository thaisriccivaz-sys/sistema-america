const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./backend/data/database.sqlite', sqlite3.OPEN_READONLY);
const fs = require('fs');

db.all("SELECT id, tab_name, document_type, file_name, file_path FROM documentos WHERE tab_name = 'Pagamentos' ORDER BY id DESC LIMIT 5", (err, rows) => {
    if (err) return console.error(err);
    rows.forEach(r => {
        console.log(`Doc ${r.id} (${r.file_name}): ${r.file_path}`);
        if (fs.existsSync(r.file_path)) {
            const buf = fs.readFileSync(r.file_path);
            console.log(`  -> Size: ${buf.length} bytes`);
            console.log(`  -> Starts with: ${buf.slice(0, 50).toString('utf8').replace(/\n/g, '\\n')}`);
        } else {
            console.log(`  -> FILE NOT FOUND ON DISK`);
        }
    });
});
setTimeout(() => db.close(), 1000);
