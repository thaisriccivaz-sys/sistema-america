const fs = require('fs');
const c = fs.readFileSync('frontend/recibos.js', 'utf8');
// Find VALOR VR in table TH context
const idx = c.indexOf('VALOR VR');
const allIdx = [];
let pos = 0;
while ((pos = c.indexOf('VALOR VR', pos)) !== -1) {
    allIdx.push(pos);
    pos++;
}
console.log('VALOR VR positions:', allIdx);
allIdx.forEach(i => {
    const snippet = c.substring(i - 100, i + 400);
    console.log('\n--- at', i, '---');
    console.log(snippet);
});
// Also find 'ph-caret-down' near valorVR
const thIdx = c.indexOf('ph-caret');
console.log('\nFirst ph-caret at:', thIdx);
// find valorVR with th
const valVR2 = c.indexOf("'valorVR'");
const allVR2 = [];
pos = 0;
while ((pos = c.indexOf("'valorVR'", pos)) !== -1) {
    allVR2.push(pos);
    pos++;
}
console.log("'valorVR' positions:", allVR2);
allVR2.forEach(i => console.log('  at', i, ':', c.substring(i - 50, i + 100)));
