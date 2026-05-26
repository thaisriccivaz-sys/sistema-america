const fs = require('fs');
let app = fs.readFileSync('app.js', 'utf8');

// Encontrar o bloco onde logistica-mtrs é inicializado (se existir)
const mtrIdx = app.indexOf("'logistica-mtrs'");
if (mtrIdx > -1) {
  console.log('logistica-mtrs block:', app.substring(mtrIdx - 50, mtrIdx + 200));
} else {
  // Encontrar o ultimo else if no bloco de navegacao
  const lastElse = app.lastIndexOf("} else if (target ===");
  console.log('ultimo else if:', app.substring(lastElse, lastElse + 300));
}
