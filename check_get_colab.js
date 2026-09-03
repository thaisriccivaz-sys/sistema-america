const fs = require('fs');
const c = fs.readFileSync('backend/server.js', 'utf8');

// Search for all patterns that might be the GET single colaborador
const patterns = [
    "GET /colaboradores/:id",
    "GET colaboradores/:id",
    "/colaboradores/:id",
    "colaboradores/:id",
];
for (const p of patterns) {
    const allIdx = [];
    let pos = 0;
    while ((pos = c.indexOf(p, pos)) !== -1) {
        allIdx.push(pos);
        pos++;
    }
    if (allIdx.length > 0) {
        console.log(`"${p}" found at:`, allIdx.slice(0, 5));
        // Show first occurrence context
        allIdx.slice(0, 2).forEach(i => {
            console.log(`\n  Context at ${i}:`);
            console.log(c.substring(i - 30, i + 200));
        });
    }
}
