const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('./backend/data/hr_system_v2.sqlite');
db.all("PRAGMA table_info(experiencia_formularios);", (err, rows) => { console.log('experiencia cols:', rows); });
db.all("PRAGMA table_info(departamentos);", (err, rows) => { console.log('departamentos cols:', rows); });
