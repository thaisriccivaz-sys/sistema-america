const fs = require('fs');
let code = fs.readFileSync('backend/server.js', 'utf8');

const target = "    ], function(err) {";

code = code.replace(target, "    ], function(err) {\n        if (err) console.error('[SAC PUT ERROR]', err.message);");

fs.writeFileSync('backend/server.js', code);
console.log('Replaced');
