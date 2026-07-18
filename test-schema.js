const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('backend/data/hr_system_v2.sqlite');

db.serialize(() => {
    db.all("PRAGMA table_info(recibos_historico)", (err, rows) => {
        console.log('Columns:', rows);
    });
    db.all("PRAGMA index_list(recibos_historico)", (err, idxs) => {
        console.log('Indexes:', idxs);
    });
    db.all("SELECT sql FROM sqlite_master WHERE type='table' AND name='recibos_historico'", (err, rows) => {
        console.log('SQL:', rows[0].sql);
    });
});
