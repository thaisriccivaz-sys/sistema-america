const fs = require('fs');
const lines = fs.readFileSync('backend/server.js', 'utf8').split('\n');
const start = lines.findIndex(l => l.includes("app.get('/api/treinamentos',"));
console.log(lines.slice(start, start + 30).join('\n'));
