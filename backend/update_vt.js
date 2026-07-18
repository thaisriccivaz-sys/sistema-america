const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(path.join(__dirname, 'data', 'hr_system_v2.sqlite'), (err) => {
    if (err) {
        console.error('Erro ao conectar', err.message);
        process.exit(1);
    }
});

db.run(`UPDATE colaboradores SET valor_transporte = '6.20' WHERE LOWER(meio_transporte) LIKE '%vt%' OR LOWER(meio_transporte) LIKE '%vale transporte%'`, function(err) {
    if (err) {
        console.error(err);
    } else {
        console.log(`Atualizados ${this.changes} colaboradores para valor_transporte = 6.20`);
    }
    db.close();
});
