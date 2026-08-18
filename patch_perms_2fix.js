const fs = require('fs');
let code = fs.readFileSync('frontend/sac.js', 'utf8');

// The OLD2 from patch_perms_234.js found "OK2" but it added the canSeeAll guard
// AFTER isAdmin. Now we need to remove the creator bypass line.
// Current state: isAdmin check → creator check → deptNorm
// Target state:  isAdmin check → _canSeeAllEdit → deptNorm

const OLD = "      if (isAdmin) return true;\r\n      // SAC (Ver Todos) pode alterar atribuicao; sac-atribuidos NAO pode\r\n      const _permsEdit = window.activeUserPerms || {};\r\n      const _canSeeAllEdit = window.isTopAdmin || (_permsEdit['sac'] === true && _permsEdit['sac-atribuidos'] !== true);\r\n      if (_canSeeAllEdit) return true;\r\n      if (ticket.timeline && ticket.timeline.length > 0 && ticket.timeline[0].user === cUser) return true;\r\n      const deptNorm";

const NEW = "      if (isAdmin) return true;\r\n      // SAC (Ver Todos) pode alterar atribuicao; sac-atribuidos NAO pode alterar\r\n      const _permsEdit = window.activeUserPerms || {};\r\n      const _canSeeAllEdit = window.isTopAdmin || (_permsEdit['sac'] === true && _permsEdit['sac-atribuidos'] !== true);\r\n      if (_canSeeAllEdit) return true;\r\n      // Apenas gestor do dept pode alterar (criador do chamado NAO pode)\r\n      const deptNorm";

if (code.includes(OLD)) {
    code = code.split(OLD).join(NEW);
    console.log('OK: removed creator bypass (CRLF)');
} else {
    const OLD_LF = OLD.replace(/\r\n/g, '\n');
    if (code.includes(OLD_LF)) {
        code = code.split(OLD_LF).join(NEW.replace(/\r\n/g, '\n'));
        console.log('OK: removed creator bypass (LF)');
    } else {
        // Fallback: just remove the specific line
        const OLD_LINE = "      if (ticket.timeline && ticket.timeline.length > 0 && ticket.timeline[0].user === cUser) return true;";
        const count = (code.split(OLD_LINE)).length - 1;
        console.log('Occurrences of creator line:', count);
        if (count === 1) {
            code = code.split(OLD_LINE + '\r\n').join('');
            code = code.split(OLD_LINE + '\n').join('');
            console.log('OK: removed creator line directly');
        } else {
            console.error('MISS or multiple occurrences:', count);
        }
    }
}

fs.writeFileSync('frontend/sac.js', code, 'utf8');

// Verify
const c2 = fs.readFileSync('frontend/sac.js', 'utf8');
console.log('creator bypass removed:', !c2.includes("ticket.timeline[0].user === cUser) return true;"));
console.log('canSeeAllEdit guard present:', c2.includes('_canSeeAllEdit'));
