const fs = require('fs');
const code = fs.readFileSync('frontend/index.html', 'utf8');
const lines = code.split('\n');

const agendaSearch = lines.findIndex(l => l.includes('id="agenda-search"'));
if(agendaSearch > -1) console.log('AGENDA SEARCH:\n' + lines.slice(agendaSearch-5, agendaSearch+3).join('\n'));

const mtrSearch = lines.findIndex(l => l.includes('id="mtr-search"'));
if(mtrSearch > -1) console.log('\nMTR SEARCH:\n' + lines.slice(mtrSearch-5, mtrSearch+3).join('\n'));
