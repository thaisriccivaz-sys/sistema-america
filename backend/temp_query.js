const sqlite3 = require('sqlite3'); 
const fs = require('fs');
const dbs = ['data/hr_system_v2.sqlite', 'data/hr_system.sqlite', 'data/database.sqlite', 'database.sqlite', 'hr_system.sqlite'];
dbs.forEach(file => {
    if (fs.existsSync(file)) {
        const db = new sqlite3.Database(file); 
        db.get("SELECT count(*) as qtd FROM documentos;", (err, row) => { 
            console.log(file, "-> Documentos:", row ? row.qtd : err.message);
        });
    }
});
