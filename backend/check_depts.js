const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('../data/database.sqlite', sqlite3.OPEN_READONLY, (err) => {
  if (err) { console.error(err.message); }
  db.all(`SELECT id, nome_completo as nome, departamento, status FROM colaboradores WHERE departamento IS NOT NULL;`, [], (err, rows) => {
    // Print unique departments
    const depts = [...new Set(rows.map(r => r.departamento))];
    console.log("DEPARTMENTS:", depts);
    
    // Find Ygor
    console.log("YGOR:", rows.filter(r => r.nome.toLowerCase().includes('ygor')));
    
    // Find Thayna
    console.log("THAYNA:", rows.filter(r => r.nome.toLowerCase().includes('thayna')));
    
    // Find Motoristas
    console.log("MOTORISTAS:", rows.filter(r => r.departamento && r.departamento.toLowerCase().includes('motorista')));
  });
});
