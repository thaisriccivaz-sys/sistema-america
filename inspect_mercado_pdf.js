const { PDFParse } = require('pdf-parse');
const fs = require('fs');
const path = require('path');

const dir = 'C:\\A\\OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA\\Documentos - America Rental\\Diretoria\\Teste Sistema\\Exemplos\\Folha\\Junho 2026\\Mercado';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.pdf')).slice(0, 4);

(async () => {
    for (const f of files) {
        const buf = fs.readFileSync(path.join(dir, f));
        try {
            const parser = new PDFParse({ verbosity: 0, data: buf });
            const data = await parser.getText();
            console.log('\n====', f, '====');
            console.log(data.text.substring(0, 1000).replace(/\n/g, '|'));
        } catch(e) { console.log(f, 'ERRO:', e.message); }
    }
})();
