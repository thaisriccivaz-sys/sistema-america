const fs = require('fs');
const path = 'frontend/index.html';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(/app\.js\?v=131/g, 'app.js?v=132');

fs.writeFileSync(path, content, 'utf8');
console.log("Updated app.js cache buster to v=132");