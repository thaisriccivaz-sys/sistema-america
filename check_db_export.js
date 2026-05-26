const db = require('./backend/database.js');
db.all("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%notificacoes%'", [], (err, rows) => {
    console.log("Tables:", rows);
});
