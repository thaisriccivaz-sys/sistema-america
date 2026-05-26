const fs = require('fs');
let js = fs.readFileSync('frontend/comercial_credenciamento.js', 'utf8');

js = js.replace(/\\`/g, '`');
js = js.replace(/\\\$\{/g, '${');

fs.writeFileSync('frontend/comercial_credenciamento.js', js, 'utf8');
console.log('comercial_credenciamento.js syntax fixed');
