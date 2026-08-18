const fs = require('fs');
const file = 'backend/server.js';
let content = fs.readFileSync(file, 'utf8');

const startMarker = '// Helper: registra';
const endMarker = "const multerMemoryCandidatos = require('multer')";

const startIdx = content.indexOf(startMarker);
const endIdx = content.indexOf(endMarker);

if (startIdx !== -1 && endIdx !== -1) {
    const finalEndIdx = content.lastIndexOf('try {', endIdx);
    content = content.substring(0, startIdx) + content.substring(finalEndIdx);
    fs.writeFileSync(file, content, 'utf8');
    console.log('Duplicate endpoints removed!');
} else {
    console.log('Markers not found');
}
