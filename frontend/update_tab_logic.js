const fs = require('fs');
let js = fs.readFileSync('frontend/app.js', 'utf8');

js = js.replace(/document\.getElementById\('tab-content-' \+ tab\)\.style\.display = 'block';/g, 
    "document.getElementById('tab-content-' + tab).style.display = 'block';\n    if(tab === 'departamentos' && typeof loadDepartamentos === 'function') loadDepartamentos();"
);

fs.writeFileSync('frontend/app.js', js, 'utf8');
