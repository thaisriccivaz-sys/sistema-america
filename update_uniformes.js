const fs = require('fs');
let html = fs.readFileSync('frontend/index.html', 'utf8');

html = html.replace('<!-- 7. Tamanhos de Uniformes -->', '<!-- 8. Tamanhos de Uniformes -->');
html = html.replace('7. Tamanhos de Uniformes', '8. Tamanhos de Uniformes');

fs.writeFileSync('frontend/index.html', html, 'utf8');
console.log('Update success');
