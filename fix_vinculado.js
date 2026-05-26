const fs = require('fs');
const path = 'frontend/usuarios.js';
let content = fs.readFileSync(path, 'utf8');

const target = /const isVinculado = _permUsuarios\.some\(u => u\.nome === c\.nome_completo\);/g;
const replacement = 'const isVinculado = _permUsuarios.some(u => u.nome === c.nome_completo && u.ativo === 1);';

if (content.match(target)) {
    content = content.replace(target, replacement);
    fs.writeFileSync(path, content, 'utf8');
    console.log("Fixed isVinculado check");
} else {
    console.log("Regex not matched!");
}