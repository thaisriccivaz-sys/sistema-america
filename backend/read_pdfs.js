const { default: pdfParse } = require('pdf-parse/lib/pdf-parse.js');
const fs = require('fs');
const path = require('path');
const basePath = 'C:\\A\\OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA\\Documentos - America Rental\\Diretoria\\Teste Sistema\\Exemplos\\Folha\\Junho 2026';

async function main() {
    const farmBuf = fs.readFileSync(path.join(basePath, 'Farmácia.pdf'));
    const farmData = await pdfParse(farmBuf);
    console.log('=== FARMÁCIA PDF ===');
    console.log(farmData.text.substring(0, 8000));

    console.log('\n\n=== FOLHA 062026 PDF ===');
    const folhaBuf = fs.readFileSync(path.join(basePath, 'FOLHA 062026.pdf'));
    const folhaData = await pdfParse(folhaBuf);
    console.log(folhaData.text.substring(0, 8000));
}
main().catch(e => { console.error('ERRO:', e.message); });
