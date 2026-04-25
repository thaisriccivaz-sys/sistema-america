const s = require('sqlite3').verbose();
const db = new s.Database('backend/data/hr_system_v2.sqlite');
db.all("SELECT id, nome, tipo, is_sinistro_only, visibilidade_regra FROM geradores", (e, r) => {
    if(e) console.error(e);
    else console.table(r);
    db.close();
});
