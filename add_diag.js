const fs = require('fs');
let js = fs.readFileSync('backend/server.js', 'utf8');

const target = `app.get('/api/version', (req, res) => res.json({ version: 'V46_ASSINAFY_FIX_POLLING_ALL' }));`;

const replace = `app.get('/api/version', (req, res) => res.json({ version: 'V47_DIAGNOSIS' }));

app.get('/api/check-pfx', (req, res) => {
    try {
        const signPdfPfx = require('./sign_pdf_pfx');
        const disp = signPdfPfx.verificarDisponibilidade();
        const info = disp.disponivel ? signPdfPfx.infosCertificado(signPdfPfx.getPfxPath(), signPdfPfx.getPfxPassword()) : null;
        res.json({ disp, info, envs: { PFX_PATH: process.env.PFX_PATH || 'NOT SET', PFX_PASS: (process.env.PFX_PASSWORD ? 'SET' : 'NOT SET') }});
    } catch(e) {
        res.status(500).json({ error: e.message, stack: e.stack });
    }
});`;

js = js.replace(target, replace);
fs.writeFileSync('backend/server.js', js, 'utf8');
