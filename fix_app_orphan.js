const fs = require('fs');
let code = fs.readFileSync('frontend/app.js', 'utf8');

const lines = code.split('\n');
// We need to delete from line 14651 to 14727 (inclusive).
// Remember array is 0-indexed, so lines[14650] to lines[14726].
// Let's verify if lines[14650] is "    try {" and lines[14726] is "" (or close to it).

let startIndex = -1;
let endIndex = -1;

for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('try {') && lines[i+1] && lines[i+1].includes('const data = await apiGet(`/treinamento-presenca/auditoria/${presencaId}`);')) {
        // found a match
        // let's check if it's the orphan one by checking previous lines
        if (lines[i-2] && lines[i-2].includes('};')) {
            startIndex = i;
            break;
        }
    }
}

if (startIndex !== -1) {
    for (let i = startIndex; i < lines.length; i++) {
        if (lines[i].startsWith('};') || lines[i] === '};') {
            endIndex = i;
            break;
        }
    }
}

if (startIndex !== -1 && endIndex !== -1) {
    console.log(`Found orphan block from line ${startIndex+1} to ${endIndex+1}`);
    lines.splice(startIndex, endIndex - startIndex + 1);
    fs.writeFileSync('frontend/app.js', lines.join('\n'));
    console.log('✅ Orphan block removed from app.js');
} else {
    console.log('❌ Could not find orphan block');
}
