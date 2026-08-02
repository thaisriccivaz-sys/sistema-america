const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB = path.join(__dirname, 'backend', 'data', 'hr_system_v2.sqlite');
const db = new sqlite3.Database(DB, sqlite3.OPEN_READONLY, (err) => {
  if (err) { console.error('Erro ao abrir banco:', err.message); process.exit(1); }
});

// 1. Todos os cargos do Comercial
db.all(
  "SELECT id, nome, departamento, status FROM cargos WHERE departamento LIKE '%omercial%' OR nome LIKE '%omercial%' ORDER BY nome",
  [],
  (err, rows) => {
    if (err) { console.error(err.message); return; }
    console.log('\n=== Cargos relacionados ao Comercial ===');
    (rows || []).forEach(r => console.log(`  id=${r.id} | cargo=[${r.nome}] | dept=[${r.departamento}] | status=[${r.status}]`));

    // 2. Mostra todos os departamentos únicos na tabela cargos
    db.all(
      "SELECT DISTINCT departamento FROM cargos ORDER BY departamento",
      [],
      (err2, rows2) => {
        if (err2) { console.error(err2.message); return; }
        console.log('\n=== Departamentos únicos na tabela CARGOS ===');
        (rows2 || []).forEach(r => console.log(`  [${r.departamento || '(null/vazio)'}]`));
        
        // 3. Quantidade de colaboradores por departamento
        db.all(
          "SELECT departamento, COUNT(*) as total FROM colaboradores GROUP BY departamento ORDER BY departamento",
          [],
          (err3, rows3) => {
            if (err3) { console.error(err3.message); return; }
            console.log('\n=== Colaboradores por departamento ===');
            (rows3 || []).forEach(r => console.log(`  [${r.departamento || '(null)'}] = ${r.total}`));
            db.close();
          }
        );
      }
    );
  }
);
