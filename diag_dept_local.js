const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB = path.join(__dirname, 'backend', 'data', 'hr_system_v2.sqlite');
const db = new sqlite3.Database(DB, sqlite3.OPEN_READONLY, (err) => {
  if (err) { console.error('Erro ao abrir banco:', err.message); process.exit(1); }
});

// 1. Busca colaboradores do Comercial pelo nome
db.all(
  "SELECT id, nome_completo, departamento, cargo, status FROM colaboradores WHERE departamento LIKE '%omercial%' ORDER BY nome_completo",
  [],
  (err, rows) => {
    if (err) { console.error('Erro:', err.message); db.close(); return; }
    console.log('\n=== Colaboradores com departamento LIKE %omercial% ===');
    console.log('Total:', rows ? rows.length : 0);
    (rows || []).forEach(r => {
      const dBytes = Buffer.from(r.departamento || '', 'utf8');
      console.log(`  id=${r.id} | nome=[${r.nome_completo}] | dept=[${r.departamento}] | bytes_hex=${dBytes.toString('hex')} | status=[${r.status}]`);
    });

    // 2. Busca por nomes específicos
    db.all(
      "SELECT id, nome_completo, departamento, cargo, status FROM colaboradores WHERE nome_completo LIKE '%Thayn%' OR nome_completo LIKE '%Caroline%' OR nome_completo LIKE '%Laila%' OR nome_completo LIKE '%Ana V%' ORDER BY nome_completo",
      [],
      (err2, rows2) => {
        if (err2) { console.error('Erro2:', err2.message); db.close(); return; }
        console.log('\n=== Busca por nomes específicos ===');
        (rows2 || []).forEach(r => {
          const dBytes = Buffer.from(r.departamento || '', 'utf8');
          console.log(`  id=${r.id} | nome=[${r.nome_completo}] | dept=[${r.departamento}] | hex=${dBytes.toString('hex')} | status=[${r.status}]`);
        });

        // 3. Todos os departamentos únicos com bytes
        db.all(
          "SELECT DISTINCT departamento FROM colaboradores ORDER BY departamento",
          [],
          (err3, rows3) => {
            if (err3) { console.error(err3.message); db.close(); return; }
            console.log('\n=== Departamentos únicos (com hex) ===');
            (rows3 || []).forEach(r => {
              const v = r.departamento || '(null)';
              const hex = Buffer.from(v, 'utf8').toString('hex');
              console.log(`  [${v}] hex=[${hex}]`);
            });
            db.close();
          }
        );
      }
    );
  }
);
