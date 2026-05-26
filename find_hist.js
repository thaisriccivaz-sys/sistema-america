const fs = require('fs');
const files = fs.readdirSync('frontend').filter(f => f.endsWith('.js') || f.endsWith('.html'));
for (const file of files) {
    const code = fs.readFileSync('frontend/' + file, 'utf8');
    if (code.includes('HIST') && code.includes('RICO DE ALTERA')) {
        console.log('Found in', file);
    }
}
