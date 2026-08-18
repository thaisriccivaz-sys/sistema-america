const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('backend/data/hr_system_v2.sqlite');
db.all('PRAGMA table_info(usuarios)', [], (err, rows) => {
    console.log("usuarios columns:");
    rows.forEach(r => console.log(r.name));
});
