const fs = require('fs');
const path = require('path');
const { PDFParse } = require('pdf-parse');
const basePath = 'C:\\A\\OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA\\Documentos - America Rental\\Diretoria\\Teste Sistema\\Exemplos\\Folha\\Junho 2026\\Folha';

async function readPdf(filePath) {
    const buf = fs.readFileSync(filePath);
    const parser = new PDFParse({ verbosity: 0, data: buf });
    const pdfData = await parser.getText();
    return pdfData.text || '';
}

async function main() {
    // PLR is in FOLHA 072026.pdf - let's look at specific PLR values to understand the pattern
    const text = await readPdf(path.join(basePath, 'FOLHA 072026.pdf'));
    
    // Find colaborador blocks that have PLR 
    const blocks = text.split(/\n(?=\d+ [A-Z])/);
    
    // Show first 10 blocks with PLR 873
    let count = 0;
    for (const block of blocks) {
        if (block.includes('873') && count < 8) {
            console.log('=== COLABORADOR COM PLR ===');
            console.log(block.substring(0, 600));
            console.log('---');
            count++;
        }
    }
    
    // Also look for Desconto de Farmácia and Desconto Mercado codes in June
    const jun = await readPdf(path.join(basePath, 'FOLHA 062026.pdf'));
    console.log('\n=== RUBRICAS ESPECIAIS JUNHO ===');
    const junLines = jun.split('\n').filter(l => /238|279|Farmácia|Mercado|Coca Cola|275/i.test(l)).slice(0, 20);
    junLines.forEach(l => console.log(l.trim()));
}
main().catch(e => console.error('ERRO:', e.message));
