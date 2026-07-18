const htmlPdf = require('html-pdf-node');

const apuracaoDiaria = [];
for (let i = 1; i <= 31; i++) {
    apuracaoDiaria.push({
        date: `2026-05-${String(i).padStart(2, '0')}`,
        totalHorasTrabalhadas: 480,
        horasExtrasCalculadas: 0,
        horasFaltaAtraso: 0,
        marcacoes: ['08:00', '12:00', '13:00', '17:48']
    });
}

function _buildCartaoPontoBlock() {
    let rowsHtml = '';
    apuracaoDiaria.forEach(d => {
        rowsHtml += `
        <tr>
            <td style="padding:3px 1px;border-bottom:1px solid #f1f5f9;">DIA</td>
            <td style="padding:3px 1px;border-bottom:1px solid #f1f5f9;">PREVISTO</td>
            <td style="padding:3px 1px;border-bottom:1px solid #f1f5f9;">08:00</td>
            <td style="padding:3px 1px;border-bottom:1px solid #f1f5f9;">12:00</td>
            <td style="padding:3px 1px;border-bottom:1px solid #f1f5f9;">13:00</td>
            <td style="padding:3px 1px;border-bottom:1px solid #f1f5f9;">17:48</td>
            <td style="padding:3px 1px;border-bottom:1px solid #f1f5f9;"></td>
            <td style="padding:3px 1px;border-bottom:1px solid #f1f5f9;"></td>
            <td style="padding:3px 1px;border-bottom:1px solid #f1f5f9;">480</td>
            <td style="padding:3px 1px;border-bottom:1px solid #f1f5f9;"></td>
            <td style="padding:3px 1px;border-bottom:1px solid #f1f5f9;"></td>
            <td style="padding:3px 1px;border-bottom:1px solid #f1f5f9;"></td>
            <td style="padding:3px 1px;border-bottom:1px solid #f1f5f9;"></td>
            <td style="padding:3px 1px;border-bottom:1px solid #f1f5f9;"></td>
            <td style="padding:3px 1px;border-bottom:1px solid #f1f5f9;"></td>
            <td style="padding:3px 1px;border-bottom:1px solid #f1f5f9;"></td>
            <td style="padding:3px 1px;border-bottom:1px solid #f1f5f9;"></td>
            <td style="padding:3px 1px;border-bottom:1px solid #f1f5f9;"></td>
            <td style="padding:3px 1px;border-bottom:1px solid #f1f5f9;"></td>
        </tr>`;
    });
    return `<div><table>${rowsHtml}</table></div>`;
}

const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <title>Recibos</title>
    <style>
      *{box-sizing:border-box;margin:0;padding:0;}
      body{font-family:Arial,Helvetica,sans-serif;font-size:12px;background:#fff;color:#111;}
      .pb{page-break-before:always;}
      .via{page-break-inside:avoid;}
    </style>
</head>
<body>
    ${_buildCartaoPontoBlock()}
    <div class="pb"></div>
    <div><h1>Recibo VR</h1></div>
</body>
</html>`;

console.log("Generating PDF...");
htmlPdf.generatePdf({ content: html }, { format: 'A4', printBackground: true, args: ['--no-sandbox'] })
  .then(buffer => {
      console.log('Success! Buffer size:', buffer.length);
  })
  .catch(console.error);
