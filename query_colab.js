const Database = require('better-sqlite3');
const db = new Database('./backend/database.db');

// Busca por nome "total" ou ID 73
const byName = db.prepare("SELECT id, nome_completo, cpf, situacao FROM colaboradores WHERE LOWER(nome_completo) LIKE '%total%'").all();
const byId   = db.prepare("SELECT id, nome_completo, cpf, situacao FROM colaboradores WHERE id = 73").all();
const noCpf  = db.prepare("SELECT id, nome_completo, cpf, situacao FROM colaboradores WHERE cpf IS NULL OR cpf = '' ORDER BY id DESC LIMIT 20").all();

console.log('=== Por nome "total" ===');
console.log(JSON.stringify(byName, null, 2));
console.log('=== Por ID 73 ===');
console.log(JSON.stringify(byId, null, 2));
console.log('=== Sem CPF (últimos 20) ===');
console.log(JSON.stringify(noCpf, null, 2));
console.log('=== Total de colaboradores ===');
const total = db.prepare("SELECT COUNT(*) as total FROM colaboradores").get();
console.log(total);

db.close();
