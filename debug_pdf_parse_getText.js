// debug_pdf_parse_getText.js
// Testa o retorno exato de PDFParse.getText() e PDFParse construtor
const { PDFParse } = require('pdf-parse');
const fs = require('fs');
const path = require('path');

const dir = 'C:\\A\\OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA\\Documentos - America Rental\\Diretoria\\Teste Sistema\\Exemplos\\Folha\\Junho 2026\\Mercado';
const pdfFile = path.join(dir, 'DANIEL ALMEIDA.pdf');
const buf = fs.readFileSync(pdfFile);

console.log('PDFParse type:', typeof PDFParse);
console.log('PDFParse:', PDFParse);

(async () => {
    try {
        const parser = new PDFParse({ verbosity: 0, data: buf });
        console.log('\nparser type:', typeof parser);
        console.log('parser.getText type:', typeof parser.getText);
        
        const result = await parser.getText();
        console.log('\nresult type:', typeof result);
        console.log('result keys:', result ? Object.keys(result) : 'null');
        
        if (typeof result === 'string') {
            console.log('\nresult is STRING, length:', result.length);
            console.log('sample:', result.substring(0, 200));
        } else if (result && typeof result === 'object') {
            console.log('\nresult.text type:', typeof result.text);
            if (typeof result.text === 'string') {
                console.log('result.text length:', result.text.length);
                console.log('sample:', result.text.substring(0, 200));
                // Test match
                const m = result.text.match(/\|?[\t -]+R\$\s*([\d,.]+)/m);
                console.log('\nmatch result:', m ? m[0].substring(0, 80) : 'null');
            }
        }
    } catch(e) {
        console.error('ERRO:', e.message);
        console.error(e.stack);
    }
})();
