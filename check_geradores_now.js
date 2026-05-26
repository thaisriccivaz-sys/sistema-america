const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('backend/data/hr_system_v2.sqlite');

db.serialize(() => {
    db.all("SELECT id, nome FROM geradores WHERE nome LIKE '%AUTORIZA%' OR nome LIKE '%ORDEM%'", (err, rows) => {
        if(err) console.error(err);
        else console.log("Geradores atuais:", rows);
    });
});