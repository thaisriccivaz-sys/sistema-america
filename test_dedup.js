const sqlite3 = require('sqlite3'); 
const db = new sqlite3.Database(':memory:'); 
db.serialize(() => { 
    db.run('CREATE TABLE t (id INTEGER, nome TEXT)'); 
    db.run('INSERT INTO t VALUES (1, "A"), (2, "A"), (3, "B")'); 
    db.run('DELETE FROM t WHERE id NOT IN (SELECT MIN(id) FROM t GROUP BY nome)', (err) => { 
        db.all('SELECT * FROM t', (err, rows) => console.log(rows)); 
    }); 
});
