const fs = require('fs');
const serverJs = 'C:\\A\\OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA\\Documentos - America Rental\\Sistema\\Sistema 1\\sistema-america\\backend\\server.js';
const content = fs.readFileSync(serverJs, 'utf8');
const lines = content.split('\n');

console.log('=== PDF generation references in server.js ===');
lines.forEach((line, idx) => {
    const lowerLine = line.toLowerCase();
    if (lowerLine.includes('pdf') && (lowerLine.includes('generate') || lowerLine.includes('criar') || lowerLine.includes('write') || lowerLine.includes('attachment') || lowerLine.includes('fs.write') || lowerLine.includes('html-pdf-node') || lowerLine.includes('html_to_pdf') || lowerLine.includes('htmltopdf'))) {
        console.log(`${idx + 1}: ${line.trim()}`);
    }
});
