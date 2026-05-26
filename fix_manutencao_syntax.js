const fs = require('fs');

// Fix broken frota_manutencao.js by finding and removing the orphaned HTML after line 39
let f = fs.readFileSync('frontend/frota_manutencao.js', 'utf8');
const lines = f.split('\n');

// Find the two c.innerHTML closing backtick lines
// Line ~39: `</div>\`` (end of new header) 
// Line ~60: `</div>\`;` (old orphaned end)
// We need to merge them: remove lines 40-60 (the orphaned km-bar/preventivo-panel/lista HTML)

let inOrphan = false;
const result = [];
for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Detect the end of new header (line with just the backtick closing)
    if (line.trim() === '`' && !inOrphan && i < 50) {
        // This is the orphaned template close - remove it and start skipping
        inOrphan = true;
        continue;
    }
    if (inOrphan) {
        // Skip until we hit the old closing backtick-semicolon
        if (line.includes('</div>`') && line.includes(';')) {
            inOrphan = false;
            // Replace with proper semicolon to end the c.innerHTML assignment
            result.push('    c.innerHTML += \'\'; // end');
        }
        continue;
    }
    result.push(line);
}

fs.writeFileSync('frontend/frota_manutencao.js', result.join('\n'));
console.log('Fixed. New lines:', result.length);

// Verify syntax
const {execSync} = require('child_process');
try {
    execSync('node --check frontend/frota_manutencao.js', {cwd: process.cwd(), stdio: 'pipe'});
    console.log('Syntax OK');
} catch(e) {
    console.log('Syntax error:', e.stderr?.toString().slice(0,200));
}
