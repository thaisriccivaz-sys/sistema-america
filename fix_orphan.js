const fs = require('fs');
let js = fs.readFileSync('backend/server.js', 'utf8');

js = js.replace(/\n    \}\);\n\}\);\n\n\/\/ --- GRUPOS DE PERMISSÃO ---/g, '\n\n// --- GRUPOS DE PERMISSÃO ---');

// Fallback if formatting was slightly different
js = js.replace(/\s*\}\);\s*\}\);\s*\/\/ --- GRUPOS DE PERMISSÃO ---/g, '\n\n// --- GRUPOS DE PERMISSÃO ---');

fs.writeFileSync('backend/server.js', js, 'utf8');
console.log('Fixed orphan brackets');
