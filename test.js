const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('backend/database.sqlite');
db.all("SELECT * FROM colaboradores WHERE nome LIKE '%juli%'", (err, rows) => {
    if(err) console.error(err);
    else console.log(JSON.stringify(rows, null, 2));
});
