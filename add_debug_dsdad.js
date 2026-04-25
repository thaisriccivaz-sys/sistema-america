const fs = require('fs');
let js = fs.readFileSync('backend/server.js', 'utf8');

const t2 = `app.get('/api/debug-pfx3', async (req, res) => {`;
const r2 = `app.get('/api/debug-pfx3', async (req, res) => {
    try {
        const doc = await new Promise(r => db.get("SELECT assinafy_id FROM documentos WHERE assinafy_status = 'Assinado' ORDER BY id DESC LIMIT 1", [], (err, row) => r(row)));
        if(!doc) return res.send("No doc");
        const fetch = require('node-fetch') || global.fetch;
        const ASSINAFY_CONFIG = { apiKey: 'AxaT-FiXBckHqEYV0s_MtUhLF3pReRz3dX4zVpC173vmjDwzLGHYtDJuQje4-4Pd' };
        
        const rInfo = await fetch(`https://api.assinafy.com.br/v1/documents/${doc.assinafy_id}`, { headers: { 'X-Api-Key': ASSINAFY_CONFIG.apiKey, 'Accept': 'application/json' } });
        const dt = (await rInfo.json()).data;
        const signedUrl = dt.signed_file_url || (dt.signers && dt.signers[0] && dt.signers[0].signed_file_url) || dt.file_url || dt.document_pdf;
        
        const dl = await fetch(signedUrl, { headers: { 'X-Api-Key': ASSINAFY_CONFIG.apiKey } });
        let buf = Buffer.from(await dl.arrayBuffer());
        
        const signPdfPfx = require('./sign_pdf_pfx');
        if(!signPdfPfx.verificarDisponibilidade().disponivel) return res.send("Certificado INDISPONÍVEL");
        
        try {
            buf = await signPdfPfx.assinarPDF(buf, {});
            res.json({ ok: true, msg: "Signed successfully!", len: buf.length });
        } catch(e) {
            res.json({ error: "PFX ERROR: " + e.message, stack: e.stack });
        }
    } catch(e) { res.send(e.message); }
});

app.get('/api/debug-pfx5', async (req, res) => {`;

js = js.replace(t2, r2);
fs.writeFileSync('backend/server.js', js, 'utf8');
