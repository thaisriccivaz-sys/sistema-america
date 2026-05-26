const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('backend/data/hr_system_v2.sqlite');
db.all("PRAGMA table_info(frota_veiculos)", (err, rows) => {
    console.log(rows.map(r => r.name));
});
