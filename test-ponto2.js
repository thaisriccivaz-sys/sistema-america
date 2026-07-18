const fs = require('fs');
const htmlPdf = require('html-pdf-node');
const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Recibos</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0;}
  body{font-family:Arial,Helvetica,sans-serif;font-size:12px;background:#fff;color:#111;}
  .pb{page-break-before:always;}
  .via{page-break-inside:avoid;}
</style>
</head><body><div style="font-family: Arial, sans-serif; font-size: 8px; color: #111; page-break-inside: avoid; padding: 15px;"><h1>TESTE PONTO</h1></div><div class="pb"></div><div><h1>TESTE RECIBO</h1></div></body></html>`;

htmlPdf.generatePdf({ content: html }, { format: 'A4', printBackground: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] })
  .then(buffer => {
      fs.writeFileSync('teste2.pdf', buffer);
      console.log('Success! teste2.pdf generated.');
  })
  .catch(console.error);
