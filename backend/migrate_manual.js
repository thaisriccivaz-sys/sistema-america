const sqlite3 = require('sqlite3').verbose();
const dbPath = require('path').resolve(__dirname, 'hr_system_v2.sqlite');
const db = new sqlite3.Database(dbPath);
db.run('ALTER TABLE colaborador_chaves ADD COLUMN data_entrega TEXT', (err) => {
    if(err) console.log('Err (maybe exists):', err.message);
    else console.log('Column added successfully');
    
    db.all('PRAGMA table_info(colaborador_chaves)', (err2, rows) => {
        console.log('New table info:', JSON.stringify(rows));
        db.close();
    });
});
