const fs = require('fs');
const path = require('path');
const { PDFParse } = require('pdf-parse');
const basePath = 'C:\\A\\OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA\\Documentos - America Rental\\Diretoria\\Teste Sistema\\Exemplos\\Folha\\Junho 2026';

async function main() {
    const parser = new PDFParse();

    const farmBuf = fs.readFileSync(path.join(basePath, 'Farmácia.pdf'));
    const farmData = await parser.parse(farmBuf);
    const farmText = farmData.pages.map(p => p.Lines.map(l => l.Words.map(w => w.text).join(' ')).join('\n')).join('\n---PAGE---\n');
    console.log('=== FARMÁCIA PDF ===');
    console.log(farmText.substring(0, 8000));
}
main().catch(e => { console.error('ERRO:', e.message, e.stack); });
