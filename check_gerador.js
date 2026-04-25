const sqlite3 = require('sqlite3');
const path = require('path');
const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('Connecting to:', dbPath);

db.all("SELECT id, nome FROM geradores", [], (err, rows) => {
    if (err) console.error(err);
    console.log(rows?.filter(r => r.nome.includes('Sinistro')));
});
