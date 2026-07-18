const fs = require('fs');
let code = fs.readFileSync('backend/server.js', 'utf8');
const lines = code.split('\n');

// Find the broken /api/treinamentos/:id/anexos endpoint
const idx = lines.findIndex(l => l.includes('GET /api/treinamentos/:id/anexos'));
console.log('Endpoint at line:', idx + 1);
console.log(lines.slice(idx, idx + 30).join('\n'));
