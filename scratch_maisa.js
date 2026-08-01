const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('backend/data/hr_system_v2.sqlite');
db.all("SELECT a.id, a.respostas_json FROM avaliacoes a JOIN colaboradores c ON a.colaborador_id = c.id WHERE c.nome_completo LIKE '%Maisa%' AND a.tipo = 'satisfacao'", [], (err, rows) => {
    if (err) console.error(err);
    else console.log(JSON.stringify(rows, null, 2));
    db.close();
});
