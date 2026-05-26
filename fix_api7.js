const fs = require('fs');
let code = fs.readFileSync('backend/server.js', 'utf8');

const target = `        res.sendFile(absPath);
    });

});

});`;
if (code.includes(target)) {
    code = code.replace(target, `        res.sendFile(absPath);\n    });\n});`);
    fs.writeFileSync('backend/server.js', code);
    console.log('Fixed extra brace');
} else {
    // If not found, let's just find "res.sendFile(absPath);" and carefully clean the lines after it
    const lines = code.split('\n');
    const idx = lines.findIndex(l => l.includes('res.sendFile(absPath);'));
    if (idx > -1) {
        let i = idx + 1;
        let bracesCount = 0;
        while(i < lines.length && bracesCount < 3) {
            if (lines[i].includes('});')) {
                bracesCount++;
                if (bracesCount === 3) {
                    lines[i] = ''; // remove 3rd
                }
            }
            i++;
        }
        fs.writeFileSync('backend/server.js', lines.join('\n'));
        console.log('Fixed extra brace via array');
    }
}
