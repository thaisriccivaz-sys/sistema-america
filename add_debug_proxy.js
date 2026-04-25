const fs = require('fs');
let js = fs.readFileSync('backend/server.js', 'utf8');

const t2 = `app.get('/api/debug-pfx2', async (req, res) => {`;
const r2 = `app.post('/api/debug-proxy/:id', async (req, res) => {
    db.get('SELECT * FROM documentos WHERE id = ?', [req.params.id], async (err, row) => {
        if (!row || !row.assinafy_id) return res.send("Nao achou on db");
        try {
            const fetch = require('node-fetch') || global.fetch;
            const ASSINAFY_CONFIG = {
                apiKey: 'AxaT-FiXBckHqEYV0s_MtUhLF3pReRz3dX4zVpC173vmjDwzLGHYtDJuQje4-4Pd'
            };
            const r = await fetch(`https://api.assinafy.com.br/v1/documents/${row.assinafy_id}`, { headers: { 'X-Api-Key': ASSINAFY_CONFIG.apiKey, 'Accept': 'application/json' } });
            const data = await r.json();
            const dt = data.data || data;
            const signedUrl = dt.signed_file_url || (dt.signers && dt.signers[0] && dt.signers[0].signed_file_url) || dt.file_url || dt.document_pdf;
            const dl = await fetch(signedUrl, { headers: { 'X-Api-Key': ASSINAFY_CONFIG.apiKey } });
            const arr = await dl.arrayBuffer();
            let finalBuf = Buffer.from(arr);
            try {
                const signPdfPfx = require('./sign_pdf_pfx');
                if (signPdfPfx.verificarDisponibilidade().disponivel) {
                    finalBuf = await signPdfPfx.assinarPDF(finalBuf, { motivo: 'Debug local' });
                    res.send("SIGNED OK! " + finalBuf.length);
                } else res.send("NO PFX CONFIG");
            } catch(e) {
                res.send("ERR: " + e.message + " --- " + e.stack);
            }
        } catch(e) { res.send("outer: " + e.message); }
    });
});
app.get('/api/debug-pfx2', async (req, res) => {`;

js = js.replace(t2, r2);
fs.writeFileSync('backend/server.js', js, 'utf8');
