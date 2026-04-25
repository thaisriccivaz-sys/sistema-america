const fs = require('fs');
let js = fs.readFileSync('backend/server.js', 'utf8');

const t2 = `app.get('/api/debug-pfx2', async (req, res) => {
    db.run("CREATE TABLE IF NOT EXISTS system_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, msg TEXT, ts DATETIME DEFAULT CURRENT_TIMESTAMP)");`;
const r2 = `app.get('/api/debug-pfx2', async (req, res) => {
    db.all("SELECT id, document_type, assinafy_status, file_name, signed_file_path FROM documentos ORDER BY id DESC LIMIT 10", [], (err, rows) => {
        res.json(rows);
    });`;

js = js.replace(t2, r2);
fs.writeFileSync('backend/server.js', js, 'utf8');
