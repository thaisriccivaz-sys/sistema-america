const fs = require('fs');
const file = 'backend/routes_candidatos_teste.js';
let content = fs.readFileSync(file, 'utf8');

// Replace doc_key with doc_r2_key
content = content.replace(/doc_key\b/g, 'doc_r2_key');

fs.writeFileSync(file, content, 'utf8');
console.log('Fixed doc_r2_key mismatch');
