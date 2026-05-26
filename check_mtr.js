const Database = require('better-sqlite3');
const path = require('path');

// Find the DB
const dbPath = path.join(__dirname, 'backend', 'database.db');
const db = new Database(dbPath, { readonly: true });

const rows = db.prepare('SELECT id, numero_mtr, status, gerador_nome, payload_json FROM mtr_local ORDER BY id').all();
console.log('MTRs no banco:');
rows.forEach(r => {
    console.log(`  ID=${r.id} numero_mtr="${r.numero_mtr}" tipo=${typeof r.numero_mtr} status="${r.status}" gerador="${r.gerador_nome}"`);
    // Check if numero_mtr has quotes or extra chars
    if(r.numero_mtr) console.log(`    length=${r.numero_mtr.toString().length} parseInt=${parseInt(r.numero_mtr)}`);
});
db.close();
