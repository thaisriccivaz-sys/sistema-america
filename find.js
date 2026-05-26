const fs = require('fs');
const lines = fs.readFileSync('backend/server.js', 'utf8').split('\n');
const idx = lines.findIndex(l => l.includes("const statusSistema = (c.status || '').toLowerCase();"));
console.log('LINE:', idx + 1); // 1-indexed
console.log(lines.slice(idx, idx + 20).join('\n'));
