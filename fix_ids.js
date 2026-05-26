const fs = require('fs');

let html = fs.readFileSync('frontend/index.html', 'utf8');
html = html.replace('id="module-logistica-entregas" class="app-module" style="display:none;', 'id="view-logistica-entregas" class="content-view" style="');
fs.writeFileSync('frontend/index.html', html);

let js = fs.readFileSync('frontend/entregas.js', 'utf8');
js = js.replace(/module-logistica-entregas/g, 'view-logistica-entregas');
js = js.replace(/module\.style\.display !== 'none'/g, 'module.classList.contains("active")');
js = js.replace(/module\.style\.display === 'none'/g, '!module.classList.contains("active")');
fs.writeFileSync('frontend/entregas.js', js);
console.log('Fixed IDs');
