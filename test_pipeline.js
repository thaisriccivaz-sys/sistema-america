const fs = require('fs');
const txt = fs.readFileSync('frontend/index.html', 'utf8');
const lines = txt.split('\n');
const start = lines.findIndex(l => l.includes('id="view-logistica-pipeline"'));
if(start > -1) {
    console.log(lines.slice(start, start + 30).join('\n'));
}
