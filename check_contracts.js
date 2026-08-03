const fs = require('fs');
const path = require('path');

const serverJs = 'C:\\A\\OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA\\Documentos - America Rental\\Sistema\\Sistema 1\\sistema-america\\backend\\server.js';
const content = fs.readFileSync(serverJs, 'utf8');
const lines = content.split('\n');

console.log('=== Contract API Routes in server.js ===');
lines.forEach((line, idx) => {
    if (line.includes('app.post(') || line.includes('app.get(') || line.includes('app.put(')) {
        if (line.toLowerCase().includes('contrato') || line.toLowerCase().includes('outros_contratos')) {
            console.log(`${idx + 1}: ${line.trim()}`);
        }
    }
});
