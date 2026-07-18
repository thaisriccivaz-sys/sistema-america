const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('./data/hr_system_v2.sqlite');
db.all("SELECT id, nome, dados FROM logistica_resumo_rota WHERE dados LIKE '%BRK AMBIENTAL%'", (err, rows) => {
    if(err) console.error(err);
    else console.log(rows.map(r => ({ id: r.id, nome: r.nome })));
});
