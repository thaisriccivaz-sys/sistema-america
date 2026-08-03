const fs = require('fs');
const serverJs = 'C:\\A\\OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA\\Documentos - America Rental\\Sistema\\Sistema 1\\sistema-america\\backend\\server.js';
const content = fs.readFileSync(serverJs, 'utf8');
const lines = content.split('\n');

console.log('=== historico_logs references ===');
lines.forEach((line, idx) => {
    if (line.toLowerCase().includes('historico_logs')) {
        console.log(`${idx + 1}: ${line.trim()}`);
    }
});

console.log('=== auditoria references ===');
lines.forEach((line, idx) => {
    if (line.toLowerCase().includes('auditoria')) {
        console.log(`${idx + 1}: ${line.trim()}`);
    }
});
