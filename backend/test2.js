const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('backend/data/hr_system_v2.sqlite');
db.all("SELECT id, nome_completo, status, data_admissao, ferias_programadas_inicio FROM colaboradores", [], (err, rows) => {
    console.log(rows.filter(r => (r.nome_completo || '').toLowerCase().includes('teste')));
});
