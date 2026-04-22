const fs = require('fs');
let html = fs.readFileSync('frontend/index.html', 'utf8');
html = html.replace(/A\uFFFD\uFFFDes/g, "Ações");
html = html.replace(/altimos/g, "Últimos");
fs.writeFileSync('frontend/index.html', html, 'utf8');
