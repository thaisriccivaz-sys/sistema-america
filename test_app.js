const fs = require('fs');
const txt = fs.readFileSync('frontend/app.js', 'utf8');
const lines = txt.split('\n');
const start1 = lines.findIndex(l => l.includes('case \'logistica-entregas\':'));
if(start1 > -1) console.log(lines.slice(Math.max(0, start1-5), start1+10).join('\n'));
