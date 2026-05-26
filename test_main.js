const fs = require('fs');
const txt = fs.readFileSync('frontend/index.html', 'utf8');
const lines = txt.split('\n');
const start = lines.findIndex(l => l.includes('<main class="content-area"'));
console.log(lines.slice(start, start+10).join('\n'));
