const pdfParseModule = require('pdf-parse');
const pdfParse = pdfParseModule.default || pdfParseModule;
const fs = require('fs');
const buf = fs.readFileSync('C:/Users/thata/Downloads/Tabela-de-doencas-e-cid.pdf');
pdfParse(buf).then(d => {
    fs.writeFileSync('C:/Users/thata/Downloads/cid_extraido.txt', d.text, 'utf8');
    console.log('OK - paginas: ' + d.numpages + ' chars: ' + d.text.length);
}).catch(e => console.error('ERRO:', e.message));
