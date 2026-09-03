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
    // Search all PDF files for PLR rubric and vacation patterns
    const files = ['FOLHA 012026.pdf', 'FOLHA 022026.pdf', 'FOLHA 032026.pdf', 'FOLHA 042026. 2.pdf', 'FOLHA 052026.pdf', 'FOLHA 062026.pdf', 'FOLHA 072026.pdf'];
    
    for (const file of files) {
        const text = await readPdf(path.join(basePath, file));
        const lines = text.split('\n');
        
        // Find PLR mentions
        const plrLines = lines.filter(l => /PLR|PARTILHA|PARTICIPACAO|PARTICIPAÇÃO/i.test(l));
        
        console.log(`\n=== ${file} ===`);
        if (plrLines.length > 0) {
            console.log('PLR encontrado:');
            plrLines.forEach(l => console.log('  ', l.trim()));
        } else {
            console.log('PLR: nenhum encontrado');
        }
        
        // Find vacation + pattern
        const feriaLines = lines.filter(l => /8783|DIAS FERIAS|8800|ABONO|931|1\/3 DAS|806 |807 /i.test(l)).slice(0, 3);
        if (feriaLines.length > 0) {
            console.log('Férias exemplo:');
            feriaLines.forEach(l => console.log('  ', l.trim()));
        }
    }
}
main().catch(e => console.error('ERRO:', e.message));
