const fs = require('fs');
let code = fs.readFileSync('frontend/sac.js', 'utf8');

code = code.replace(
    "}, 5 * 60 * 1000);",
    "}, 30 * 1000);"
);

fs.writeFileSync('frontend/sac.js', code);
console.log('Replaced successfully');
