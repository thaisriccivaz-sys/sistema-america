const fs = require('fs');
let js = fs.readFileSync('backend/server.js', 'utf8');

const t2 = `app.get('/api/debug-pfx2', async (req, res) => {
    db.run("CREATE TABLE IF NOT EXISTS system_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, msg TEXT, ts DATETIME DEFAULT CURRENT_TIMESTAMP)");
`;
const r2 = `app.get('/api/debug-pfx2', async (req, res) => {
    db.run("UPDATE documentos SET assinafy_signed_at = CURRENT_TIMESTAMP WHERE assinafy_status = 'Assinado' AND assinafy_signed_at IS NULL");
    db.run("UPDATE admissao_assinaturas SET assinado_em = CURRENT_TIMESTAMP WHERE assinafy_status = 'Assinado' AND assinado_em IS NULL");
    res.json({ ok: true, msg: "Timestamps repaired" });
`;

js = js.replace(t2, r2);
fs.writeFileSync('backend/server.js', js, 'utf8');
