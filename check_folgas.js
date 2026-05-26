const Database = require('better-sqlite3');
const db = new Database('hr_system_v2.sqlite');
const rows = db.prepare("SELECT nome_completo, escala_tipo, escala_folgas FROM colaboradores WHERE escala_folgas IS NOT NULL AND TRIM(escala_folgas) != ''").all();
console.log(JSON.stringify(rows, null, 2));
