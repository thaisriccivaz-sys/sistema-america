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
    const farmText = await readPdf(path.join(basePath, 'Farmácia.pdf'));
    console.log('=== FARMÁCIA PDF ===');
    console.log(farmText.substring(0, 8000));

    console.log('\n\n=== FOLHA 062026 PDF (primeiras 8000 chars) ===');
    const folhaText = await readPdf(path.join(basePath, 'FOLHA 062026.pdf'));
    console.log(folhaText.substring(0, 8000));
}
main().catch(e => console.error('ERRO:', e.message, e.stack));
