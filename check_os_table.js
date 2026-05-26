const fs = require('fs');
const txt = fs.readFileSync('backend/server.js', 'utf8');
const lines = txt.split('\n');
const osIdx = lines.findIndex(l => l.includes('CREATE TABLE IF NOT EXISTS os_logistica'));
if (osIdx > -1) {
    console.log(lines.slice(osIdx, osIdx+20).join('\n'));
} else {
    console.log("os_logistica NOT FOUND in server.js");
}
