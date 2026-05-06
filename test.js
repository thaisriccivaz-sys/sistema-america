const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('data/Colaboradores/colaboradores.db');
db.get('SELECT insalubridade_valor FROM colaboradores WHERE nome_completo LIKE "%Marcelo%"', [], (err, row) => console.log(row));
