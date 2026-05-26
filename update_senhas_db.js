const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('backend/data/hr_system_v2.sqlite');

db.serialize(() => {
    db.run("ALTER TABLE logistica_senhas ADD COLUMN owner_id INTEGER;", (err) => {
        if (err && !err.message.includes('duplicate column name')) console.error(err);
        else console.log('Added owner_id');
    });
    db.run("ALTER TABLE logistica_senhas ADD COLUMN tipo TEXT DEFAULT 'compartilhada';", (err) => {
        if (err && !err.message.includes('duplicate column name')) console.error(err);
        else console.log('Added tipo');
    });
});