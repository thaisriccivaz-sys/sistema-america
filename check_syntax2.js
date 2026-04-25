const fs = require('fs');
const js = fs.readFileSync('backend/server.js', 'utf8');
const lines = js.split('\n');
for(let i=2008; i<2022; i++) {
  console.log(`${i+1}: ${lines[i]}`);
}
