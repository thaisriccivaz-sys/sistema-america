const fs = require('fs');
const lines = fs.readFileSync('frontend/sac.js', 'utf8').split('\n');
lines.forEach((l, i) => {
  if (l.includes('function renderCard') || l.includes('COMENTÁRIOS')) {
    console.log(i + 1, l.trim());
  }
});
