const fs = require('fs');
const lines = fs.readFileSync('backend/server.js', 'utf8').split('\n');
const start = lines.findIndex(l => l.includes("app.get('/api/logistica/entregas'"));
if(start > -1) {
    console.log(lines.slice(start - 2, start + 15).join('\n'));
}
