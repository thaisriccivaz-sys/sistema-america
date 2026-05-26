const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('backend/data/hr_system_v2.sqlite');
db.get("SELECT * FROM frota_veiculos WHERE placa LIKE '%QSR%'", (err, row) => console.log(row));
