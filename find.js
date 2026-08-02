const fs = require('fs');
const lines = fs.readFileSync('frontend/sac.js', 'utf8').split('\n');
lines.forEach((l, i) => {
  if (l.includes('DESCRIÇÃO') || l.includes('Descrição') || l.includes('NOME DO CONTATO')) {
    console.log(i + 1, l.trim());
  }
});
