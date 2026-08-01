const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('backend/data/hr_system_v2.sqlite');
db.all("SELECT respostas_json FROM avaliacoes WHERE tipo = 'desempenho' AND respostas_json IS NOT NULL LIMIT 5", [], (err, rows) => { 
    console.log(JSON.stringify(rows, null, 2)); 
});
