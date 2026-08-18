const fs = require('fs');
let code = fs.readFileSync('backend/server.js', 'utf8');

const target = `    ], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });`;

const replacement = `    ], function(err) {
        if (err) {
            console.error('[SAC PUT ERROR]', err.message);
            return res.status(500).json({ error: err.message });
        }
        res.json({ success: true });
    });`;

if (code.includes(target)) {
    code = code.replace(target, replacement);
    fs.writeFileSync('backend/server.js', code);
    console.log('Successfully injected error logging into PUT endpoint');
} else {
    // Try LF version
    const targetLF = target.replace(/\r\n/g, '\n');
    const replacementLF = replacement.replace(/\r\n/g, '\n');
    if (code.includes(targetLF)) {
        code = code.replace(targetLF, replacementLF);
        fs.writeFileSync('backend/server.js', code);
        console.log('Successfully injected error logging into PUT endpoint (LF)');
    } else {
        console.log('Target not found in server.js');
    }
}
