const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./hr_system_v2.sqlite');
db.all("SELECT id, nome, tipo, grupo_key, SUBSTR(categorias_json,1,100) as cat_preview FROM avaliacao_templates WHERE tipo = 'experiencia'", [], (e, r) => {
    if (e) { console.error(e); } else { console.log(JSON.stringify(r, null, 2)); }
    db.close();
});
