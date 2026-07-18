const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('banco.sqlite');

db.serialize(() => {
    db.run("UPDATE treinamentos SET tipo = 'terapia' WHERE nome LIKE '%teste%' OR nome LIKE '%Teste%'", function(err) {
        if (err) console.error(err);
        else console.log('Rows updated:', this.changes);
    });
    
    db.all('SELECT id, nome, tipo FROM treinamentos', (err, rows) => {
        if (err) console.error(err);
        else console.log(rows);
    });
});
