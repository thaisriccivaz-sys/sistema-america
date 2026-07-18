const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('backend/banco_america.sqlite');

db.all(`SELECT c.nome_completo, c.departamento, d.tipo AS departamento_tipo FROM colaboradores c LEFT JOIN departamentos d ON c.departamento = d.nome LIMIT 10`, [], (err, rows) => {
    console.log(rows);
});
