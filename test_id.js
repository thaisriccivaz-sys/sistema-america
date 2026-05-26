const fs = require('fs');
const txt = fs.readFileSync('frontend/index.html', 'utf8');
const lines = txt.split('\n');
lines.forEach(l => {
    if (l.includes('id="view-') || l.includes('class="view-section"')) console.log(l.trim());
});
