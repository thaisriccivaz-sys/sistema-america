const fs = require('fs');
const lines = fs.readFileSync('backend/server.js', 'utf8').split('\n');
lines.forEach((l, i) => {
  if (l.includes('sendEmailParaNotificados') && l.includes('nova_ocorrencia')) {
    console.log(i + 1, l.trim());
  }
});
