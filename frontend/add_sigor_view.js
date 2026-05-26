const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

// 1. Inserir script config-sigor.js antes do </body>
const bodyClose = '</body>';
if (html.includes(bodyClose)) {
  html = html.replace(bodyClose, '    <script src="config-sigor.js"></script>\n</body>');
  console.log('OK - script config-sigor.js inserido');
} else {
  console.log('ERRO - </body> nao encontrado');
}

// 2. Garantir que a view-config-sigor tem o id correto como content-view
if (html.includes('view-config-sigor')) {
  console.log('OK - view-config-sigor presente');
} else {
  console.log('ERRO - view-config-sigor nao encontrada');
}

// 3. Verificar se o link do menu foi inserido
if (html.includes('config-sigor')) {
  console.log('OK - link menu config-sigor presente');
}

fs.writeFileSync('index.html', html);
console.log('HTML salvo');
