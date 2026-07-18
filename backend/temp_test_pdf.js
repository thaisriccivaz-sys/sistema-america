const htmlPdf = require('html-pdf-node');
const fs = require('fs');

const htmlContent = `<!DOCTYPE html><html><head></head><body>
<div style='page-break-inside: avoid;'><h1>Cartão de Ponto</h1></div>
<div style='page-break-before: always;'></div>
<div><h1>Recibo 1</h1></div>
</body></html>`;

const options = { format: 'A4', printBackground: true };
htmlPdf.generatePdfs([{ content: htmlContent }], options).then(res => {
    fs.writeFileSync('temp_test.pdf', res[0].buffer);
    console.log('PDF saved. Buffer size: ' + res[0].buffer.length);
}).catch(e => console.error(e));
