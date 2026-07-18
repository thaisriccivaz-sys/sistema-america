const htmlPdf = require('html-pdf-node');
const fs = require('fs');

const logoStr = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

const htmlContent = `<!DOCTYPE html><html lang='pt-BR'><head><meta charset='UTF-8'><title>Recibos</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0;}
  body{font-family:Arial,Helvetica,sans-serif;font-size:12px;background:#fff;color:#111;}
  .pb{page-break-before:always;}
  .via{page-break-inside:avoid;}
</style>
</head><body>
<div style='font-family: Arial, sans-serif; font-size: 8px; color: #111; page-break-inside: avoid; padding: 15px;'>
    <table style='width: 100%; border-collapse: collapse; margin-bottom: 5px;'>
        <tr>
            <td style='width: 30%; vertical-align: top;'>
                <img src='${logoStr}' style='max-height: 35px;' />
            </td>
            <td style='width: 40%; vertical-align: top; text-align: center;'>
                <div style='font-size: 20px; font-weight: bold; line-height: 1;'>Cartão</div>
                <div style='font-size: 20px; font-weight: normal; color: #4b4b4b; line-height: 1;'>de Ponto</div>
            </td>
            <td style='width: 30%; vertical-align: top; text-align: right;'>
                <span style='font-size: 20px;'>Control iD</span>
            </td>
        </tr>
    </table>
    <div style='border-top: 1px solid #999; margin-bottom: 5px;'></div>
    <table style='width: 100%; border-collapse: collapse; font-size: 8px; margin-bottom: 5px;'>
        <tr><td>NOME DA EMPRESA</td></tr>
        <tr><td>NOME DO FUNCIONARIO</td></tr>
    </table>
    <table style='width: 100%; border-collapse: collapse; font-size: 7px; text-align: left;'>
        <thead>
            <tr><th>DIA</th><th>PREVISTO</th><th>ENT. 1</th><th>SAI. 1</th></tr>
        </thead>
        <tbody>
            ${Array(31).fill(0).map((_,i) => '<tr><td>'+(i+1)+'</td><td>08:00</td><td>08:00</td><td>12:00</td></tr>').join('')}
        </tbody>
    </table>
</div>
<div class='pb'></div>
<div class='via'>
  <h1>Recibo VR</h1>
</div>
</body></html>`;

const options = { format: 'A4', margin: { top: '0', bottom: '0', left: '0', right: '0' }, printBackground: true };
htmlPdf.generatePdfs([{ content: htmlContent }], options).then(res => {
    fs.writeFileSync('temp_test2.pdf', res[0].buffer);
    console.log('PDF saved. Buffer size: ' + res[0].buffer.length);
}).catch(e => console.error(e));
