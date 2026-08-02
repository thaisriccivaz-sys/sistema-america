const fs = require('fs');
let code = fs.readFileSync('frontend/sac.js', 'utf8');

code = code.replace(/\\\\\d\+/g, '\\d+');
code = code.replace(/\\\\s\*/g, '\\s*');

fs.writeFileSync('frontend/sac.js', code, 'utf8');
console.log('Done fix3!');
