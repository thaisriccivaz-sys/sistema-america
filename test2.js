const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('./backend/data/hr_system_v2.sqlite');
db.all("SELECT * FROM gerador_documentos WHERE nome LIKE '%Solicita%'", (err, rows) => {
    if (err) {
        console.error(err);
    } else {
        console.log(rows);
    }
});
