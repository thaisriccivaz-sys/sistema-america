const fs = require('fs');

let serverJs = fs.readFileSync('backend/server.js', 'utf8');

serverJs = serverJs.replace(
    /let sit = data\.objetoResposta\.situacaoManifesto\.simDescricao;\s*if\s*\(\s*sit === 'Salvo'\s*\)\s*sit = 'Ativo';( \/\/ Mapeamento)?/g, 
    `let sit = data.objetoResposta.situacaoManifesto.simDescricao;
           if (sit) {
               sit = sit.charAt(0).toUpperCase() + sit.slice(1).toLowerCase();
               if (sit === 'Salvo') sit = 'Ativo';
           }`
);

fs.writeFileSync('backend/server.js', serverJs);
console.log('SERVER JS PATCHED');
