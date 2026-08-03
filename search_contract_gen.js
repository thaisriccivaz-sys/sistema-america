const fs = require('fs');
const path = require('path');

const serverJs = 'C:\\A\\OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA\\Documentos - America Rental\\Sistema\\Sistema 1\\sistema-america\\backend\\server.js';
const content = fs.readFileSync(serverJs, 'utf8');
const lines = content.split('\n');

console.log('=== Lines in server.js matching query patterns for contrato ===');
lines.forEach((line, idx) => {
    const lowerLine = line.toLowerCase();
    if (lowerLine.includes('select') && lowerLine.includes('contrato')) {
        console.log(`${idx + 1}: ${line.trim()}`);
    }
});
