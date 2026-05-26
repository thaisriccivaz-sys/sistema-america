const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('backend/data/hr_system_v2.sqlite');
db.all("PRAGMA table_info(historico_logs);", (err, rows) => { 
    if(err) throw err;
    console.log('historico_logs:', rows.map(r => r.name).join(', '));
});
db.all("PRAGMA table_info(faltas);", (err, rows) => { 
    if(err) throw err;
    console.log('faltas:', rows.map(r => r.name).join(', '));
});
