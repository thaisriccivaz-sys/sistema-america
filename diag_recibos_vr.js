const fs = require('fs');
const c = fs.readFileSync('frontend/recibos.js', 'utf8');

// Find all valorVR declarations and their context
const allIdx = [];
let pos = 0;
while ((pos = c.indexOf('const valorVR', pos)) !== -1) {
    allIdx.push(pos);
    pos++;
}
console.log('All "const valorVR" at:', allIdx.length, 'positions\n');
allIdx.forEach(i => {
    const snippet = c.substring(i - 100, i + 200);
    console.log('--- at char', i, '---');
    console.log(snippet);
    console.log();
});

// Also find _calcularTotais function
const calcIdx = c.indexOf('_calcularTotais');
const allCalc = [];
pos = 0;
while ((pos = c.indexOf('_calcularTotais', pos)) !== -1) {
    allCalc.push(pos);
    pos++;
}
console.log('\n_calcularTotais at:', allCalc);
if (calcIdx > 0) {
    console.log('\nContext of _calcularTotais definition:');
    // Find the function definition (not calls)
    allCalc.forEach(i => {
        const ctx = c.substring(i - 10, i + 300);
        if (ctx.includes('function') || ctx.includes('=>')) {
            console.log('at', i, ':', ctx.substring(0, 250));
        }
    });
}
