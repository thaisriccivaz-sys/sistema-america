const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./backend/hr_system_v2.sqlite');
db.run('CREATE TABLE IF NOT EXISTS test_tb (id INTEGER)', (err) => {
    console.log('Callback fired!', err);
    db.run('ALTER TABLE test_tb ADD COLUMN col2 TEXT', (e2) => console.log('Alter:', e2));
});
