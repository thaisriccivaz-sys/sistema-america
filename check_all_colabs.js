require('dotenv').config({ path: 'backend/.env' });
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const dbPath = process.env.DATABASE_PATH || path.join(__dirname, 'backend', 'data', 'hr_system_v2.sqlite');

const db = new sqlite3.Database(dbPath);

db.all("SELECT id, nome_completo, email_corporativo, email, departamento, status FROM colaboradores", [], (err, rows) => {
    if (err) console.error(err);
    
    const beatriz = rows.filter(r => r.nome_completo.toLowerCase().includes('beatriz'));
    const juliane = rows.filter(r => r.nome_completo.toLowerCase().includes('juliane'));
    
    console.log('Beatriz:', beatriz);
    console.log('Juliane:', juliane);
});
