const fs = require('fs');
const { PDFDocument, rgb } = require('pdf-lib');

async function test() {
    const pdfOriginal = await PDFDocument.create();
    const page = pdfOriginal.addPage([595, 842]);
    page.drawText('TOP HALF', { x: 50, y: 700, size: 50 });
    page.drawText('BOTTOM HALF', { x: 50, y: 200, size: 50 });
    const buf = await pdfOriginal.save();
    
    const doc = await PDFDocument.load(buf);
    const novoPdf = await PDFDocument.create();
    const [paginaOriginal] = await novoPdf.copyPages(doc, [0]);
    
    const page1 = novoPdf.addPage([595, 842]);
    const page2 = novoPdf.addPage([595, 842]);
    
    const embeddedPage = await novoPdf.embedPage(paginaOriginal);
    
    page1.drawPage(embeddedPage, { x: 0, y: 0 });
    page1.drawRectangle({ x: 0, y: 0, width: 595, height: 421, color: rgb(1,1,1) });
    
    page2.drawPage(embeddedPage, { x: 0, y: 421 });
    page2.drawRectangle({ x: 0, y: 0, width: 595, height: 421, color: rgb(1,1,1) });
    
    fs.writeFileSync('backend/test_crop.pdf', await novoPdf.save());
    console.log('Saved test_crop.pdf');
}
test();
