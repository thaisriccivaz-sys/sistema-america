const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./data/database.sqlite', sqlite3.OPEN_READONLY, (err) => {
  if (err) { console.error(err.message); }
  db.all(`SELECT id, nome_completo as nome, departamento, status FROM colaboradores WHERE nome_completo LIKE '%ygor%' OR nome_completo LIKE '%beatriz%' OR nome_completo LIKE '%thais%';`, [], (err, rows) => {
    console.log(rows);
  });
});
