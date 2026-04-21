const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./backend/data/database.sqlite', sqlite3.OPEN_READONLY);
db.all("SELECT id, nome_completo, data_admissao, concessivo_ferias_fim FROM colaboradores WHERE status = 'Ativo'", (err, rows) => {
    const invalid = rows.filter(r => !r.concessivo_ferias_fim);
    console.log(invalid.length + ' invalid rows: ', invalid.slice(0, 5));
});
setTimeout(() => db.close(), 1000);
