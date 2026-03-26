const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.resolve(__dirname, 'hr_system_v2.sqlite');
const db = new sqlite3.Database(dbPath);
const check = (table) => {
    db.all(`PRAGMA table_info(${table})`, (err, rows) => {
        if(err) console.error(err);
        else console.log(`Table ${table} info:`, JSON.stringify(rows));
    });
};
check('colaborador_chaves');
check('colaboradores');
setTimeout(() => db.close(), 1000);
