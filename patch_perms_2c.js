const fs = require('fs');
let code = fs.readFileSync('frontend/sac.js','utf8');
const OLD = '      if (isAdmin) return true;\r\n      const deptNorm';
const NEW = '      if (isAdmin) return true;\r\n      // SAC (Ver todos) pode alterar atribuicao; sac-atribuidos NAO pode\r\n      const _pea = window.activeUserPerms || {};\r\n      if (window.isTopAdmin || (_pea["sac"] === true && _pea["sac-atribuidos"] !== true)) return true;\r\n      const deptNorm';
if (code.includes(OLD)) {
    code = code.split(OLD).join(NEW);
    console.log('OK CRLF');
    fs.writeFileSync('frontend/sac.js', code, 'utf8');
} else {
    const OLD2 = OLD.replace(/\r\n/g, '\n');
    if (code.includes(OLD2)) {
        code = code.split(OLD2).join(NEW.replace(/\r\n/g, '\n'));
        console.log('OK LF');
        fs.writeFileSync('frontend/sac.js', code, 'utf8');
    } else {
        console.error('MISS');
    }
}
const c2 = fs.readFileSync('frontend/sac.js','utf8');
console.log('has canSeeAll in canEdit:', c2.includes('_pea["sac-atribuidos"] !== true')) ;
