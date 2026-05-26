const fs = require('fs');

// PATCH INDEX.HTML
let html = fs.readFileSync('frontend/index.html', 'utf8');

html = html.replace(/<input type="text" id="filtro-mtr-numero" autocomplete="off"/g, '<input type="search" id="filtro-mtr-numero" autocomplete="new-password" spellcheck="false"');
html = html.replace(/<input type="text" id="filtro-mtr-gerador" autocomplete="off"/g, '<input type="search" id="filtro-mtr-gerador" autocomplete="new-password" spellcheck="false"');
html = html.replace(/<input type="text" id="filtro-mtr-destinador" autocomplete="off"/g, '<input type="search" id="filtro-mtr-destinador" autocomplete="new-password" spellcheck="false"');

fs.writeFileSync('frontend/index.html', html);
console.log('INDEX AUTOFILL OK');

// PATCH DB
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('backend/data/hr_system_v2.sqlite');
db.run('UPDATE mtr_local SET status = "Cancelado" WHERE numero_mtr = "260011827081"', function(err) {
    if(err) console.error(err);
    else console.log('DB UPDATE OK');
});
