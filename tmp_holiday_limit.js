const fs = require('fs');
let code = fs.readFileSync('frontend/recibos.js', 'utf8');

const regexStr = /if\s*\(d\.isHoliday\)\s*\{\s*tipo2\s*=\s*hT2\s*>=\s*MIN_VR\s*\?\s*''\s*:\s*'folga';/;
const replacementStr = `if (d.isHoliday) {
                        tipo2 = hT2 >= 120 ? '' : 'folga';`;

code = code.replace(regexStr, replacementStr);
fs.writeFileSync('frontend/recibos.js', code, 'utf8');
console.log('Fixed holiday limit with regex.');
