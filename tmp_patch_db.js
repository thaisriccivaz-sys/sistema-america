const sqlite3 = require('sqlite3').verbose();
const con = new sqlite3.Database('backend/data/hr_system_v2.sqlite');

con.serialize(() => {
    ['folgas_vt','faltas_vt','folgas_vr','faltas_vr'].forEach(col => {
        con.run(`ALTER TABLE recibos_historico ADD COLUMN ${col} INTEGER`, err => {
            if(err && !err.message.includes('duplicate')) console.log(err.message);
        });
    });
});

con.close(() => {
    console.log('DB Patched');
});
