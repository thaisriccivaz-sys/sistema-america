const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('./backend/data/hr_system_v2.sqlite');
db.all("SELECT id, colaborador_id, status FROM sinistros", (err, rows) => {
    if (err) console.error(err);
    else console.log("hr_system_v2.sqlite", rows);
});
