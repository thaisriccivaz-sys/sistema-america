const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('database.sqlite', (err) => {
    if (err) return console.error(err.message);
    console.log('Connected to DB');
});

db.all('SELECT id, nome_completo, email, telefone FROM colaboradores ORDER BY id DESC LIMIT 5', [], (err, rows) => {
    if (err) console.error(err);
    console.log(JSON.stringify(rows, null, 2));
    db.close();
});
