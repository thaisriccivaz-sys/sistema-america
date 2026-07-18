const fs = require('fs');
const htmlPdf = require('html-pdf-node');
const html = `<!DOCTYPE html><html><body><div style='font-family: Arial; font-size: 8px; color: #111; padding: 15px;'><h1>Teste Cartao Ponto</h1><div class='pb' style='page-break-before:always;'></div><h2>Pagina 2</h2></div></body></html>`;
htmlPdf.generatePdf({ content: html }, { format: 'A4', printBackground: true, args: ['--no-sandbox'] })
  .then(buffer => fs.writeFileSync('teste.pdf', buffer))
  .catch(console.error);
