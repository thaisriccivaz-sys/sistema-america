const sqlite3 = require('sqlite3'); 
const db = new sqlite3.Database(':memory:'); 
db.serialize(() => { 
    db.run('CREATE TABLE c (id INTEGER PRIMARY KEY, nome TEXT, icone TEXT, ordem INTEGER)'); 
    db.run('INSERT INTO c VALUES (1, "A", "i", 1), (2, "B", "j", 2)'); 
    db.run('DELETE FROM c WHERE id NOT IN (SELECT MIN(id) FROM c GROUP BY nome)', (err) => { 
        db.all('SELECT * FROM c', (err, rows) => console.log(rows)); 
    }); 
});
