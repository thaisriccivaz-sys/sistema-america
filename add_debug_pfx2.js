const fs = require('fs');
let js = fs.readFileSync('backend/server.js', 'utf8');

const target = `app.get('/api/get-system-logs', (req, res) => {`;
const repl = `app.get('/api/debug-pfx2', async (req, res) => {
    try {
        const { PDFDocument } = require('pdf-lib');
        const signPdfPfx = require('./sign_pdf_pfx');
        const pdfDoc = await PDFDocument.create();
        const page = pdfDoc.addPage();
        page.drawText('Teste');
        const pdfBytes = await pdfDoc.save();
        let buf = Buffer.from(pdfBytes);
        buf = await signPdfPfx.assinarPDF(buf, {});
        res.send("OK! length: " + buf.length);
    } catch(e) {
        res.json({ error: e.message, stack: e.stack });
    }
});
app.get('/api/get-system-logs', (req, res) => {`;

js = js.replace(target, repl);
fs.writeFileSync('backend/server.js', js, 'utf8');
