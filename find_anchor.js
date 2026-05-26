const fs = require('fs');
let html = fs.readFileSync('frontend/index.html', 'utf8');
const idx = html.indexOf('id="view-licencas"');
console.log(idx !== -1 ? html.substring(idx - 50, idx + 50) : 'not found');
