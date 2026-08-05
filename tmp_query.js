const db = require('./backend/database.js'); db.all('PRAGMA table_info(epi_entregas)', (err, rows) => { console.log(rows); });
