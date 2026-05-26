const fs = require('fs');
const p = 'frontend/index.html';
let c = fs.readFileSync(p, 'utf8');
const now = Date.now();
c = c.replace(/\?v=\d+/g, '?v=' + now);
fs.writeFileSync(p, c, 'utf8');
console.log('Cache busted with ' + now);
