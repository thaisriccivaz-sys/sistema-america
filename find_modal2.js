const fs = require('fs');
const lines = fs.readFileSync('frontend/index.html', 'utf8').split('\n');
lines.forEach((l, i) => {
    if (l.includes('id="modal-gerar-mtr"')) {
        console.log('Line', i + 1, l.trim());
    }
});
