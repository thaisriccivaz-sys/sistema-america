const pdf = require('pdf-parse');
const fs = require('fs');
const data = fs.readFileSync('C:\\A\\OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA\\Documentos - America Rental\\Diretoria\\Teste Sistema\\Exemplos\\CRLVDigital_CRH8438_2025.pdf');
pdf(data).then(function(data) {
    console.log('TEXT:', data.text);
}).catch(err => console.error('ERR:', err.message));
