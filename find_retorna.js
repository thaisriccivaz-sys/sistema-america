const fs = require('fs');
const lines = fs.readFileSync('backend/server.js', 'utf8').split('\n');
lines.forEach(l => {
    if(l.includes('/retorna')) {
        console.log(l.trim());
    }
});
