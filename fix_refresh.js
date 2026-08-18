const fs = require('fs');
let code = fs.readFileSync('frontend/sac.js', 'utf8');

const badRefreshCode = `            if (!document.querySelector('.sac-modal-overlay')) {`;
const goodRefreshCode = `            const ov = document.getElementById('sac-modal-overlay');\n            if (!ov || ov.style.display === 'none') {`;

if (code.includes(badRefreshCode)) {
    code = code.replace(badRefreshCode, goodRefreshCode);
    fs.writeFileSync('frontend/sac.js', code);
    console.log('Fixed auto refresh check successfully');
} else {
    console.log('Could not find the target code');
}
