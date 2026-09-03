const fs = require('fs');
const path = require('path');
const { PDFParse } = require('pdf-parse');
const basePath = 'C:\\A\\OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA\\Documentos - America Rental\\Diretoria\\Teste Sistema\\Exemplos\\Folha\\Junho 2026';

async function readPdf(filePath) {
    const buf = fs.readFileSync(filePath);
    const parser = new PDFParse({ verbosity: 0, data: buf });
    const pdfData = await parser.getText();
    return pdfData.text || '';
}

async function main() {
    // Print Farmácia full text
    const farmText = await readPdf(path.join(basePath, 'Farmácia.pdf'));
    console.log('=== FARMÁCIA PDF FULL ===');
    console.log(farmText);
}
main().catch(e => console.error('ERRO:', e.message));
