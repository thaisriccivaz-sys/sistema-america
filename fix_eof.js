const fs = require('fs');
const path = 'backend/server.js';
let content = fs.readFileSync(path, 'utf8');

if (!content.endsWith('}, 3000);')) {
    content += '\n}, 3000);\n';
    fs.writeFileSync(path, content, 'utf8');
    console.log("Fixed end of file");
}