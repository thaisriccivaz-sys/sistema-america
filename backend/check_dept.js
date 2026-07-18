const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'colaboradores.db');

const db = new sqlite3.Database(dbPath);

db.all("SELECT DISTINCT departamento FROM colaboradores WHERE departamento IS NOT NULL ORDER BY departamento", (e, rows) => {
    console.log('TODOS DEPARTAMENTOS NO BANCO:');
    rows.forEach(r => console.log('  -', JSON.stringify(r.departamento)));
});

db.get("SELECT nome_completo, departamento, cargo FROM colaboradores WHERE nome_completo LIKE '%Augusto%'", (e, r) => {
    console.log('AUGUSTO:', JSON.stringify(r));
});

db.get("SELECT nome_completo, departamento, cargo FROM colaboradores WHERE nome_completo LIKE '%Jonhnatan%'", (e, r) => {
    console.log('JONHNATAN:', JSON.stringify(r));
    setTimeout(() => process.exit(0), 300);
});
