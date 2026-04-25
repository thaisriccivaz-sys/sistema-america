const fs = require('fs');
let code = fs.readFileSync('frontend/sinistros.js', 'utf8');
code = code.replace(/\\`/g, '`');
code = code.replace(/\\\$/g, '$');
fs.writeFileSync('frontend/sinistros.js', code, 'utf8');
console.log('Fixed syntax escapes.');
