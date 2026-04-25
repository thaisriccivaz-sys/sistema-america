const fs = require('fs');
const s = fs.readFileSync('backend/server.js', 'utf8');
const lines = s.split('\n');
// Look for the PUT /colaboradores/:id/admissao route
lines.forEach((l, i) => {
    if (l.includes("'admissao'") || l.includes('"admissao"') || l.includes('/admissao') || l.includes('santander')) {
        console.log(i + 1, l.trim().substring(0, 150));
    }
});
