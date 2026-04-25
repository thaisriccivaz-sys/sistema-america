const fs = require('fs');
let js = fs.readFileSync('backend/server.js', 'utf8');

js = js.replace(`app.get('/api/debug-pfx2'`, `app.get('/api/debug-pfx3', async (req, res) => {
    db.run("UPDATE documentos SET assinafy_signed_at = CURRENT_TIMESTAMP WHERE assinafy_status = 'Assinado' AND assinafy_signed_at IS NULL", function() {
        db.run("UPDATE admissao_assinaturas SET assinado_em = CURRENT_TIMESTAMP WHERE assinafy_status = 'Assinado' AND assinado_em IS NULL", function() {
            res.json({ ok: true, msg: "Timestamps repaired" });
        });
    });
});\n\napp.get('/api/debug-pfx2'`);

fs.writeFileSync('backend/server.js', js, 'utf8');
