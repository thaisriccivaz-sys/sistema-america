const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('./backend/data/hr_system_v2.sqlite');

db.all("SELECT id, nome_completo, escala_tipo, escala_ciclo_inicio FROM colaboradores WHERE nome_completo LIKE '%gor%'", [], (e, r) => {
    console.log('Busca por gor:', JSON.stringify(r, null, 2));
    
    // Also try by first letter Y
    db.all("SELECT id, nome_completo, escala_tipo, escala_ciclo_inicio FROM colaboradores WHERE nome_completo LIKE 'Y%'", [], (e2, r2) => {
        console.log('Busca Y%:', JSON.stringify(r2, null, 2));
        db.close();
    });
});
