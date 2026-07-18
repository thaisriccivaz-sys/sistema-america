const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('data/hr_system_v2.sqlite');
db.all("SELECT id, nome_completo, ferias_programadas_inicio, ferias_programadas_fim, status, escala_tipo FROM colaboradores WHERE nome_completo LIKE '%Joselito Viana%'", (err, rows) => {
    if (err) console.error(err);
    else console.log(rows);
});
