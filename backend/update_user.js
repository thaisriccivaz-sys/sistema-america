const sqlite3 = require('sqlite3');
const path = require('path');
const dbPath = path.join(__dirname, 'data', 'hr_system_v2.sqlite');
const db = new sqlite3.Database(dbPath);

db.run("UPDATE usuarios SET username = 'Thais.Ricci' WHERE username = 'diretoria.1'", function(err) {
    if (err) {
        console.error(err);
    } else {
        console.log('Rows updated:', this.changes);
    }
    db.close();
});
