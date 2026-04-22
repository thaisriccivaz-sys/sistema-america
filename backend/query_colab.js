const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// O banco fica no mesmo dir que server.js
const dbPath = path.join(__dirname, 'database.db');
const db = new sqlite3.Database(dbPath);

db.all(
  "SELECT id, nome_completo, cpf, situacao FROM colaboradores WHERE LOWER(nome_completo) LIKE '%total%' ORDER BY id",
  [],
  (err, byName) => {
    if (err) { console.error('Err byName:', err.message); }
    else { console.log('=== Por nome "total" ===\n', JSON.stringify(byName, null, 2)); }
  }
);

db.get("SELECT id, nome_completo, cpf, situacao FROM colaboradores WHERE id = 73", [], (err, byId) => {
  if (err) { console.error('Err byId:', err.message); }
  else { console.log('=== Por ID 73 ===\n', JSON.stringify(byId, null, 2)); }
});

db.all(
  "SELECT id, nome_completo, cpf, situacao FROM colaboradores WHERE (cpf IS NULL OR TRIM(cpf)='') ORDER BY id DESC LIMIT 10",
  [],
  (err, noCpf) => {
    if (err) { console.error('Err noCpf:', err.message); }
    else { console.log('=== Sem CPF (últimos 10) ===\n', JSON.stringify(noCpf, null, 2)); }
  }
);

db.get("SELECT COUNT(*) as total FROM colaboradores", [], (err, row) => {
  if (err) { console.error('Err total:', err.message); }
  else { console.log('=== TOTAL DE COLABORADORES ===', row.total); }
  db.close();
});
