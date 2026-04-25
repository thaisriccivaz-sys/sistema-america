const fs = require('fs');
console.log(fs.readFileSync('backend/sign_pdf_pfx.js', 'utf8').substring(6500, 10000));
