const fs = require('fs');
let js = fs.readFileSync('backend/server.js', 'utf8');

const target = `app.get('/api/version', (req, res) => res.json({ version: 'V47_DIAGNOSIS' }));`;
const repl = `app.get('/api/version', (req, res) => res.json({ version: 'V47_DIAGNOSIS' }));
app.get('/api/debug-pfx2', async (req, res) => {
    try {
        const { PDFDocument } = require('pdf-lib');
        const signPdfPfx = require('./sign_pdf_pfx');
        const pdfDoc = await PDFDocument.create();
        const page = pdfDoc.addPage();
        page.drawText('Teste');
        const pdfBytes = await pdfDoc.save();
        let buf = Buffer.from(pdfBytes);
        buf = await signPdfPfx.assinarPDF(buf, {});
        // Send JSON containing base64 so we can see
        res.json({ ok: true, length: buf.length, logs: "success" });
    } catch(e) {
        res.json({ error: e.message, stack: e.stack });
    }
});`;

js = js.replace(target, repl);
fs.writeFileSync('backend/server.js', js, 'utf8');
