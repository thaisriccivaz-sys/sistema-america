const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./data/hr_system_v2.sqlite');
db.run(`ALTER TABLE treinamentos ADD COLUMN departamento TEXT DEFAULT 'Todos'`, (err) => {
    if (err) {
        if (err.message.includes('duplicate column name')) {
            console.log('Column already exists.');
        } else {
            console.error(err.message);
        }
    } else {
        console.log('Column added');
    }
    db.close();
});
