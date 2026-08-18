const fs = require('fs');
let code = fs.readFileSync('frontend/sac.js', 'utf8');

const regex = /const countLabel = isOverAguard \? \`[^\`]*\$\{hh\}:\$\{mm\}:\$\{ss\}\` : isPaused \? \`[^\`]*\$\{hh\}:\$\{mm\}:\$\{ss\}\` : \`[^\`]*\$\{hh\}:\$\{mm\}:\$\{ss\}\`;/g;
const replacement = 'const countLabel = isOverAguard ? `-${hh}:${mm}:${ss}` : isPaused ? `${hh}:${mm}:${ss}` : `${hh}:${mm}:${ss}`;';

code = code.replace(regex, replacement);
fs.writeFileSync('frontend/sac.js', code);
console.log('Regex replace done');
