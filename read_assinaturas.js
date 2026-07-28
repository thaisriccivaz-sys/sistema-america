const fs = require('fs');
const content = fs.readFileSync('frontend/assinaturas.js', 'utf8');
const lines = content.split('\n');
lines.forEach(l => {
    if (l.includes('fetch(') || l.includes('api(')) console.log(l.trim());
});
