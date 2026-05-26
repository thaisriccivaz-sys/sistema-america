const fs = require('fs');
let serverJs = fs.readFileSync('backend/server.js', 'utf8');

// 1. Remove the Salvo -> Ativo conversion in sync
serverJs = serverJs.replace(
    /sit = sit\.charAt\(0\)\.toUpperCase\(\) \+ sit\.slice\(1\)\.toLowerCase\(\);\s*if \(sit === 'Salvo'\) sit = 'Ativo';/g,
    `sit = sit.charAt(0).toUpperCase() + sit.slice(1).toLowerCase();
               // Manter o status exatamente como o SIGOR retorna`
);

// 2. Initial MTR status should be 'Salvo' (not 'Ativo') to match SIGOR
serverJs = serverJs.replace(
    `[numeroMTR, 'Ativo', geradorNome`,
    `[numeroMTR, 'Salvo', geradorNome`
);

fs.writeFileSync('backend/server.js', serverJs);
console.log('SERVER PATCHED - removed Salvo->Ativo mapping, initial status now Salvo');
