const fs = require('fs');
let code = fs.readFileSync('backend/server.js', 'utf8');
// Em server.js nós adicionamos via write_to_file também o schema sql usando crases
// E template strings. Para evitar substituir coisas erradas que deveriam ser backslashes, vamos focar só nas áreas injetadas ou focar \` -> ` e \$ -> $ que a LLM escapou.
let replaced = false;
if(code.includes('\\\\\\s+')) { // apenas exemplo 
}
code = code.replace(/\\`/g, '`');
// Para não estragar regex, os $ não estavam escapados no server.js tirando o `req.file` e var no fetch?
// No server.js só tínhamos variaveis node \n e etc. Não tinhamos crases com dolar la na API pois nao há \${} injetada quebrou as rotas backend?
fs.writeFileSync('backend/server.js', code, 'utf8');
console.log('Fixed syntax escapes on server.js');
