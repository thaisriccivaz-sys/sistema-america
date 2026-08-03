const fs = require('fs');
const path = require('path');

const serverJs = 'C:\\A\\OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA\\Documentos - America Rental\\Sistema\\Sistema 1\\sistema-america\\backend\\server.js';
const content = fs.readFileSync(serverJs, 'utf8');
const lines = content.split('\n');

console.log('=== All contract-related lines in server.js ===');
let count = 0;
lines.forEach((line, idx) => {
    const lowerLine = line.toLowerCase();
    if (lowerLine.includes('contrato') && !lowerLine.includes('contratos_avulsos') && !lowerLine.includes('dias_contrato')) {
        console.log(`${idx + 1}: ${line.trim()}`);
        count++;
        if (count > 80) {
            console.log('... truncated ...');
            return;
        }
    }
});
