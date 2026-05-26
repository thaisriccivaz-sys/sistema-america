const fs = require('fs');
let html = fs.readFileSync('frontend/index.html', 'utf8');
const lines = html.split('\n');
const idx = lines.findIndex(l => l.includes('id="view-logistica-credenciamento"'));
if (idx !== -1) {
    console.log(lines.slice(idx, idx + 60).join('\n'));
} else {
    console.log('Not found');
}
