const { PDFDocument } = require('pdf-lib'); 
const fs = require('fs'); 
async function create() { 
  const pdfDoc = await PDFDocument.create(); 
  const page1 = pdfDoc.addPage([500, 500]); 
  const page2 = pdfDoc.addPage([500, 500]); 
  const pdfBytes = await pdfDoc.save(); 
  fs.writeFileSync('test_2pages.pdf', pdfBytes); 
} 
create();
