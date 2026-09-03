const fs = require('fs');
let code = fs.readFileSync('backend/server.js', 'utf8');

const target = `condicao: 'meio_transporte~outros', departamentos: null }), nomeGerador]`;
const replacement = `condicao: 'meio_transporte~outros|vc', departamentos: null }), nomeGerador]`;

if (code.includes(target)) {
    code = code.replace(target, replacement);
    fs.writeFileSync('backend/server.js', code, 'utf8');
    console.log('Regra atualizada com sucesso!');
} else {
    console.log('Alvo não encontrado.');
}
