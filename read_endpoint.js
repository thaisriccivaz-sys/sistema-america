const fs = require('fs');
const lines = fs.readFileSync('backend/server.js', 'utf8').split('\n');
const start = lines.findIndex(l => l.includes('INSERT INTO treinamentos'));
console.log(lines.slice(start - 10, start + 20).join('\n'));
