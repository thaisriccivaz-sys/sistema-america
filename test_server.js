const fs = require('fs');
const lines = fs.readFileSync('backend/server.js', 'utf8').split('\n');
const start = lines.findIndex(l => l.includes('app.get(\'/api/licencas/:id/view\''));
if(start > -1) {
    console.log(lines.slice(start + 25, start + 45).join('\n'));
}
