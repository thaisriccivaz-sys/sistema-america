const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('backend/data/hr_system_v2.sqlite');

db.all("SELECT id, fase_negociacao, valor_total FROM propostas;", [], (err, rows) => {
  if (err) {
    console.error(err);
  } else {
    console.log("All Propostas:", rows);
  }
  db.close();
});
