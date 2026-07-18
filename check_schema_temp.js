const sqlite3 = require('sqlite3');
const dbs = ['database.db', 'banco.sqlite', 'america_rental.db', 'cadastro.db', 'colaboradores.db', 'hr_system.sqlite', 'hr_system_v2.sqlite', 'data/hr_system_v2.sqlite'];

async function checkDbs() {
    for (const dbName of dbs) {
        await new Promise(resolve => {
            const db = new sqlite3.Database('backend/' + dbName, sqlite3.OPEN_READONLY, (err) => {
                if (err) return resolve();
                db.all("SELECT sql FROM sqlite_master WHERE tbl_name LIKE '%treinamento%'", [], (err, rows) => {
                    if (rows && rows.length > 0) {
                        console.log('--- ' + dbName + ' ---');
                        console.log(rows);
                    }
                    resolve();
                });
            });
        });
    }
}
checkDbs();
