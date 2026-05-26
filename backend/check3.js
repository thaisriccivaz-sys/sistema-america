const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('data/hr_system_v2.sqlite');
db.all("SELECT id, nome_completo, status FROM colaboradores", [], (err, rows) => {
    if(err) console.error(err);
    else {
        const others = rows.filter(r => ['Thais Ricci Vaz', 'Laila Rebeca Felix Costa', 'Victor Magno Bordin da Silva'].includes(r.nome_completo));
        console.log("Others:");
        console.dir(others);
    }
});
