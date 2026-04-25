const fs = require('fs');
const sinistrosPath = 'frontend/sinistros.js';
let content = fs.readFileSync(sinistrosPath, 'utf8');
content = content.replace(/localStorage\.getItem\('token'\)/g, "localStorage.getItem('erp_token')");
fs.writeFileSync(sinistrosPath, content, 'utf8');
console.log('Fixed localStorage token key in sinistros.js');
