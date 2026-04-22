const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('../data/database.sqlite', sqlite3.OPEN_READONLY, (err) => {
    if (err) return console.error('DB Error:', err);
    db.all("SELECT data_admissao FROM colaboradores WHERE data_admissao != '' LIMIT 5", (err, rows) => {
        if (err) console.error(err);
        console.log(rows);
        db.close();
    });
});
