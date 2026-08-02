const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Tenta o banco de produção
const DB_PATH = path.join(__dirname, 'data', 'hr_system_v2.sqlite');
const db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READONLY, (err) => {
  if (err) {
    console.error('Erro ao abrir banco:', err.message);
    process.exit(1);
  }
  console.log('Banco aberto:', DB_PATH);
});

db.all(
  `SELECT id, nome_completo, departamento, status 
   FROM colaboradores 
   WHERE nome_completo LIKE '%Ana V%' 
      OR nome_completo LIKE '%Caroline%' 
      OR nome_completo LIKE '%Laila%' 
      OR nome_completo LIKE '%Thayn%'
   ORDER BY nome_completo`,
  [],
  (err, rows) => {
    if (err) { console.error('Erro na query:', err.message); db.close(); return; }
    console.log('\n=== Colaboradores do Comercial (busca por nome) ===');
    if (!rows || rows.length === 0) {
      console.log('Nenhum resultado encontrado!');
    } else {
      rows.forEach(r => {
        const dept = r.departamento;
        const bytes = [...(dept||'')].map(c => '0x' + c.charCodeAt(0).toString(16)).join(' ');
        console.log(`ID=${r.id} | Nome=${r.nome_completo} | Dept=[${dept}] | Bytes=${bytes} | Status=${r.status}`);
      });
    }

    // Mostrar TODOS os valores únicos de departamento
    db.all(`SELECT DISTINCT departamento FROM colaboradores ORDER BY departamento`, [], (err2, depts) => {
      if (err2) { console.error(err2); db.close(); return; }
      console.log('\n=== Todos os valores únicos de "departamento" na tabela colaboradores ===');
      depts.forEach(d => {
        const v = d.departamento || '(null)';
        console.log(`  [${v}]`);
      });
      db.close();
    });
  }
);
