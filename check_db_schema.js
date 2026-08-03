const sqlite3 = require('sqlite3').verbose();
const dbPath = 'C:\\A\\OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA\\Documentos - America Rental\\Sistema\\Sistema 1\\sistema-america\\backend\\data\\hr_system_v2.sqlite';

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error connecting to database:', err.message);
        return;
    }
    db.all("SELECT name FROM sqlite_master WHERE type='table'", [], (err, rows) => {
        if (err) {
            console.error('Error listing tables:', err.message);
            db.close();
            return;
        }
        console.log('Tables found:', rows.map(r => r.name).join(', '));
        
        // Check schema of propostas
        db.all("PRAGMA table_info(propostas)", [], (err, columns) => {
            if (!err) {
                console.log('Columns in "propostas":', columns.map(c => `${c.name} (${c.type})`).join(', '));
            }
            
            // Check for contract table (e.g. contratos, os_logistica, etc.)
            const contractTable = rows.find(r => r.name.toLowerCase().includes('contrato'));
            if (contractTable) {
                db.all(`PRAGMA table_info(${contractTable.name})`, [], (errC, colsC) => {
                    console.log(`Columns in "${contractTable.name}":`, colsC.map(c => `${c.name} (${c.type})`).join(', '));
                });
            } else {
                console.log('No contract table found in database.');
            }
            
            // Let's see if there is an os_logistica table which is common
            const osTable = rows.find(r => r.name === 'os_logistica');
            if (osTable) {
                db.all(`PRAGMA table_info(os_logistica)`, [], (errO, colsO) => {
                    console.log(`Columns in "os_logistica":`, colsO.map(c => `${c.name} (${c.type})`).join(', '));
                });
            }

            const logTable = rows.find(r => r.name.toLowerCase().includes('log') || r.name.toLowerCase().includes('historico') || r.name.toLowerCase().includes('auditoria'));
            if (logTable) {
                console.log(`Log table found: ${logTable.name}`);
            } else {
                console.log('No obvious log table found.');
            }
            
            db.close();
        });
    });
});
