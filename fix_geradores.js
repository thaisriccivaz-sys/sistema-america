const fs = require('fs');
let code = fs.readFileSync('backend/server.js', 'utf8');

const regex1 = /db\.run\("UPDATE geradores SET conteudo = \? WHERE LOWER\(TRIM\(nome\)\) = LOWER\(TRIM\(\?\)\)", \[conteudoHTML, nomeGerador\]\);/g;
const count1 = (code.match(regex1) || []).length;
code = code.replace(regex1, '// $&');

const regex2 = /db\.run\("UPDATE geradores SET conteudo = \?, visibilidade_regra = \? WHERE nome = 'Habilita.*?'", \[habBHtml.*?\]\);/g;
const count2 = (code.match(regex2) || []).length;
code = code.replace(regex2, '// $&');

const regex3 = /db\.run\("UPDATE geradores SET conteudo = \?, visibilidade_regra = \? WHERE nome = 'Habilita.*?'", \[habDHtml.*?\]\);/g;
const count3 = (code.match(regex3) || []).length;
code = code.replace(regex3, '// $&');

fs.writeFileSync('backend/server.js', code, 'utf8');
console.log('Comentados:', count1, count2, count3);
