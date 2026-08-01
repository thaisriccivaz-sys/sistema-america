require('dotenv').config({ path: 'backend/.env' });
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const dbPath = process.env.DATABASE_PATH || path.join(__dirname, 'backend', 'data', 'hr_system_v2.sqlite');
console.log('Using DB:', dbPath);

const db = new sqlite3.Database(dbPath);

db.all("SELECT id, nome_completo, email_corporativo, email, departamento, status FROM colaboradores WHERE nome_completo LIKE '%Beatriz%' OR nome_completo LIKE '%Juliane%'", [], (err, rows) => {
    if (err) console.error(err);
    console.log('Colaboradores:');
    console.log(rows);
    
    db.all("SELECT id, nome, responsavel_nome, responsavel_id FROM departamentos", [], (err2, rows2) => {
        if (err2) console.error(err2);
        
        console.log('\nDepartamentos com Beatriz/Juliane como responsavel_nome:');
        console.log(rows2.filter(d => (d.responsavel_nome && d.responsavel_nome.includes('Beatriz')) || (d.responsavel_nome && d.responsavel_nome.includes('Juliane'))));
        
        console.log('\nDepartamentos com Beatriz/Juliane como responsavel_id:');
        console.log(rows2.filter(d => rows.some(r => r.id === d.responsavel_id)));
    });
});
