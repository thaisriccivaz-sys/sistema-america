const fs = require('fs');
const lines = fs.readFileSync('backend/server.js', 'utf8').split('\n');
const idx = lines.findIndex(l => l.includes("app.post('/api/logistica/agenda'"));
console.log(lines.slice(idx, idx + 60).join('\n'));
