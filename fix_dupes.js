const fs = require('fs');
const file = 'backend/server.js';
let content = fs.readFileSync(file, 'utf8');

const startMarker = '// Helper: registra';
const endMarker = 'const multerMemoryCandidatos = require(\\'multer\\')';

const startIdx = content.indexOf(startMarker);
const endIdx = content.indexOf(endMarker);

if (startIdx !== -1 && endIdx !== -1) {
    // Find the try { block start before multerMemoryCandidatos
    const tryBlock = 'try {\n    ' + endMarker;
    const finalEndIdx = content.lastIndexOf('try {', endIdx);
    
    // Also remove the // ????? TESTES DE CANDIDATOS ????? above try {
    const commentMarker = content.lastIndexOf('// ', finalEndIdx - 10);
    
    // Actually, I can just slice from startIdx to finalEndIdx. Let's just remove startIdx to finalEndIdx.
    content = content.substring(0, startIdx) + content.substring(finalEndIdx);
    fs.writeFileSync(file, content, 'utf8');
    console.log('Duplicate endpoints removed!');
} else {
    console.log('Markers not found');
}
