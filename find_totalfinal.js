const fs = require('fs');
const c = fs.readFileSync('frontend/recibos.js', 'utf8');
// Find all occurrences of the TOTAL RECEBIDO pattern in the VR block
const pattern = '_recFmt(totalFinal)';
const allIdx = [];
let pos = 0;
while ((pos = c.indexOf(pattern, pos)) !== -1) {
    allIdx.push(pos);
    pos++;
}
console.log('_recFmt(totalFinal) count:', allIdx.length, allIdx);
// Show context around each
allIdx.forEach(i => {
    console.log('\n--- at', i, '---');
    console.log(c.substring(i - 100, i + 400));
});
