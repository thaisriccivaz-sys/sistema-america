const http = require('http');
// Need a valid token though to call /api/dashboard. Instead, let's just grep the exact mapping code.
const fs = require('fs');
const js = fs.readFileSync('backend/server.js', 'utf8');
const match = js.match(/resFerias = rows\.map[\s\S]*?\}\);/);
console.log(match ? match[0] : 'not found');
