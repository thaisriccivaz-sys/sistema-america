const fs = require('fs');
const path = require('path');

const serverJs = 'C:\\A\\OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA\\Documentos - America Rental\\Sistema\\Sistema 1\\sistema-america\\backend\\server.js';
const content = fs.readFileSync(serverJs, 'utf8');
const lines = content.split('\n');

// Find lines from 19440 to 19540 (the proposals endpoints)
console.log('=== Checking proposals endpoints (19440-19540) for contract/contrato ===');
for (let i = 19440; i <= 19540; i++) {
    const line = lines[i - 1];
    if (line && line.toLowerCase().includes('contrato')) {
        console.log(`${i}: ${line.trim()}`);
    }
}
