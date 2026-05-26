const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('backend/data/hr_system_v2.sqlite');
db.all("SELECT placa, capacidade_carga, tipo_veiculo FROM frota_veiculos WHERE capacidade_carga IS NOT NULL AND capacidade_carga != '' ORDER BY placa LIMIT 15", [], (err, rows) => {
    console.log('Veículos com capacidade de carga preenchida:', rows.length);
    rows.forEach(r => console.log(r));
    db.close();
});
