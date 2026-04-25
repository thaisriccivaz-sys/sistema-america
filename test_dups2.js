const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./backend/data/database.sqlite', sqlite3.OPEN_READONLY);
db.all("SELECT * FROM admissao_assinaturas WHERE nome_documento LIKE '%teste%' OR nome_documento LIKE '%Teste%'", (err, rows) => {
    console.log('--- admissao_assinaturas ---');
    console.log(rows);
});
setTimeout(() => db.close(), 1000);
