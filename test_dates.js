const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./backend/data/database.sqlite', sqlite3.OPEN_READONLY);
db.all("SELECT id, nome_completo, data_admissao FROM colaboradores WHERE status = 'Ativo'", (err, rows) => {
    rows.forEach(r => {
        let adm = r.data_admissao;
        if (!adm) return;
        if (adm.includes('/')) {
            const pts = adm.split('/');
            if (pts.length===3) adm = `${pts[2]}-${pts[1]}-${pts[0]}`;
        }
        const d = new Date(adm + 'T12:00:00');
        if (isNaN(d.valueOf())) {
            console.log(`INVALID DATE FOR COLAB ${r.id}: ${r.data_admissao}`);
        }
    });
});
setTimeout(() => db.close(), 1000);
