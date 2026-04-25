const crypto = require('crypto');
const fs = require('fs');
const js = fs.readFileSync('backend/server.js', 'utf8');
const routes = js.match(/(app\.(get|post|put|delete)\('.*?'/g);
console.log(routes.filter(r => r.includes('documentos')));
