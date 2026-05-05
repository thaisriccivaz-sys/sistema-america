const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('backend/data/hr_system_v2.sqlite');

db.serialize(() => {
    db.run(`UPDATE os_logistica SET produtos = REPLACE(produtos, '"SLX ', '"ELX ') WHERE produtos LIKE '%"SLX %'`, function(err) {
        if (!err) console.log('SLX updated:', this.changes);
    });
    db.run(`UPDATE os_logistica SET produtos = REPLACE(produtos, '"EXL ', '"ELX ') WHERE produtos LIKE '%"EXL %'`, function(err) {
        if (!err) console.log('EXL updated:', this.changes);
    });
    db.run(`UPDATE os_logistica SET produtos = REPLACE(produtos, '"SLX"', '"ELX"') WHERE produtos LIKE '%"SLX"%'`, function(err) {
        if (!err) console.log('SLX exact updated:', this.changes);
    });
    db.run(`UPDATE os_logistica SET produtos = REPLACE(produtos, '"EXL"', '"ELX"') WHERE produtos LIKE '%"EXL"%'`, function(err) {
        if (!err) console.log('EXL exact updated:', this.changes);
    });
});

db.close(() => console.log('Done'));
