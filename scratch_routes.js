const fs = require('fs');
const code = fs.readFileSync('backend/server.js', 'utf8');
const routes = code.match(/app\.(post|get|put|delete)\(['`"](\/[a-zA-Z0-9_\-\/]+)/g);
if (routes) {
    console.log(routes.filter(r => r.toLowerCase().includes('os') || r.toLowerCase().includes('pipeline') || r.toLowerCase().includes('logistica')).join('\n'));
}
