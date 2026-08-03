const sqlite3 = require('sqlite3').verbose();
const dbPath = 'C:\\A\\OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA\\Documentos - America Rental\\Sistema\\Sistema 1\\sistema-america\\backend\\data\\hr_system_v2.sqlite';

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error connecting to database:', err.message);
        return;
    }
    // Query a few rows where contrato is not null and not empty
    db.all("SELECT DISTINCT contrato FROM os_logistica WHERE contrato IS NOT NULL AND contrato != '' LIMIT 20", [], (err, rows) => {
        if (err) {
            console.error('Error querying contrato:', err.message);
        } else {
            console.log('Contract numbers found in os_logistica:', rows.map(r => r.contrato));
        }
        
        // Also check if there are any contracts in propostas table (if we missed a column)
        db.all("SELECT DISTINCT contrato FROM propostas LIMIT 5", [], (errP, rowsP) => {
            if (errP) {
                console.log('Error querying contrato in propostas (likely column does not exist):', errP.message);
            } else {
                console.log('Contract numbers in propostas:', rowsP.map(r => r.contrato));
            }
            db.close();
        });
    });
});
