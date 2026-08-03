const sqlite3 = require('sqlite3').verbose();
const dbPath = 'C:\\A\\OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA\\Documentos - America Rental\\Sistema\\Sistema 1\\sistema-america\\backend\\data\\hr_system_v2.sqlite';

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error connecting to database:', err.message);
        return;
    }
    db.all("PRAGMA table_info(historico_logs)", [], (err1, cols1) => {
        if (!err1) {
            console.log('Columns in "historico_logs":', cols1.map(c => `${c.name} (${c.type})`).join(', '));
        }
        db.all("PRAGMA table_info(auditoria)", [], (err2, cols2) => {
            if (!err2) {
                console.log('Columns in "auditoria":', cols2.map(c => `${c.name} (${c.type})`).join(', '));
            }
            db.close();
        });
    });
});
