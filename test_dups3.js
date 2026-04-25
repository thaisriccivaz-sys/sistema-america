const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./backend/data/database.sqlite', sqlite3.OPEN_READONLY);
db.all("SELECT id, colaborador_id, assinafy_id, nome_documento, assinafy_status, data_envio FROM admissao_assinaturas WHERE colaborador_id = 26", (err, rows) => {
    require('fs').writeFileSync('./out.json', JSON.stringify(rows, null, 2));
});
setTimeout(() => db.close(), 1000);
