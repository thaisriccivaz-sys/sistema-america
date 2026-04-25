const fs = require('fs');
let js = fs.readFileSync('backend/server.js', 'utf8');

const t2 = `app.get('/api/debug-pfx2', async (req, res) => {
    db.all("SELECT id, document_type, assinafy_status, file_name, signed_file_path FROM documentos ORDER BY id DESC LIMIT 10", [], (err, rows) => {
        res.json(rows);
    });
});`;
const r2 = `app.get('/api/debug-pfx2', async (req, res) => {
    db.run("UPDATE documentos SET assinafy_signed_at = CURRENT_TIMESTAMP WHERE assinafy_status = 'Assinado' AND assinafy_signed_at IS NULL", function() {
        db.run("UPDATE admissao_assinaturas SET assinado_em = CURRENT_TIMESTAMP WHERE assinafy_status = 'Assinado' AND assinado_em IS NULL", function() {
            res.json({ ok: true, msg: "Timestamps repaired" });
        });
    });
});`;

js = js.replace(t2, r2);
fs.writeFileSync('backend/server.js', js, 'utf8');
