const fs = require('fs');
const txt = fs.readFileSync('frontend/index.html', 'utf8');
const start = txt.indexOf('data-target="logistica-entregas"');
if(start > -1) {
    console.log(txt.substring(start - 200, start + 200));
}
