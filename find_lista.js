const fs = require('fs');
const lines = fs.readFileSync('backend/server.js', 'utf8').split('\n');
const idx = lines.findIndex(l => l.includes('app.get(\'/api/mtr/lista\''));
console.log(lines.slice(idx, idx + 20).join('\n'));
