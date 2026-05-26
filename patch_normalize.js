const fs = require('fs');
let code = fs.readFileSync('frontend/mtr.js', 'utf8');

code = code.replace(/includes\('america rental'\)/g, "normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').includes('america rental')");

fs.writeFileSync('frontend/mtr.js', code);
console.log('NORMALIZE OK');
