const fs = require('fs');
const { PDFParse } = require('pdf-parse');

async function testPdf() {
    try {
        const filePath = "C:\\A\\OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA\\Documentos - America Rental\\Diretoria\\Teste Sistema\\Exemplos\\22BoletimOcorrencia.pdf";
        const buffer = fs.readFileSync(filePath);
        const parser = new PDFParse({ data: buffer });
        const res = await parser.getText();
        const cleanText = res.text.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ');
        
        const matOc = cleanText.match(/Ocorr[eê]ncia.*?(\d{2}\/\d{2}\/\d{4})\s+[aà]s?\s+(\d{2}:\d{2})/i);
        console.log('Date:', matOc ? matOc[1] + ' às ' + matOc[2] : null);
        
        const matPl = cleanText.match(/\b([A-Z]{3}[-\s]*[0-9][A-Z0-9]{3,4})\b/i);
        console.log('Placa:', matPl ? matPl[1] : null);

    } catch (e) {
        console.error("Error:", e);
    }
}

testPdf();
