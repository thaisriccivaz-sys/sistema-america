/**
 * patch_perms_34.js — Fixes 3 and 4 using Buffer/writeFile approach
 */
const fs = require('fs');
let code = fs.readFileSync('frontend/sac.js', 'utf8');

// ─── FIX 3: canMoveTicket — allow gestors ────────────────────────────────────
const F3_OLD_FRAG = "    return canSeeAll;\r\n  }\r\n\r\n  // ── FILTRAGEM";
const F3_NEW_FRAG = [
    "    if (canSeeAll) return true;",
    "    // Gestores de qualquer departamento tambem podem mover chamados",
    "    let _mvUID = null;",
    "    try { const _mvu = JSON.parse(localStorage.getItem('erp_user')||'{}'); _mvUID = String(_mvu.id); } catch(e) {}",
    "    const _mvUser = currentUsername();",
    "    const _mvC = function(s) { return (s||'').toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').replace(/[^a-z0-9]/g,''); };",
    "    return (_globalDepartamentos||[]).some(function(d) {",
    "      var rId = (d.responsavel_usuario_id||'').toString().trim();",
    "      var rU = _mvC(d.responsavel_username); var rN = _mvC(d.responsavel_nome); var cU = _mvC(_mvUser);",
    "      return (_mvUID && rId && rId === _mvUID) || (cU && rU && rU === cU) || (cU && rN && rN === cU && cU.length > 3);",
    "    });",
    "  }",
    "",
    "  // ── FILTRAGEM"
].join('\r\n');

if (code.includes(F3_OLD_FRAG)) {
    code = code.split(F3_OLD_FRAG).join(F3_NEW_FRAG);
    console.log('OK3 CRLF');
} else if (code.includes(F3_OLD_FRAG.replace(/\r\n/g, '\n'))) {
    code = code.split(F3_OLD_FRAG.replace(/\r\n/g, '\n')).join(F3_NEW_FRAG.replace(/\r\n/g, '\n'));
    console.log('OK3 LF');
} else {
    console.error('MISS3');
}

// ─── FIX 4: isCreator only for non-gestors; isManagerOfTicket active tasks only
const F4_OLD_FRAG = "        const isManagerOfTicket = myManagedDepts.length > 0 && myManagedDepts.some(dept => {\r\n          const taskKey = deptMap[dept];\r\n          return taskKey && t[taskKey];\r\n        });\r\n        matchPermission = isAssigned || wasEverAssigned || isCreator || isManagerOfTicket;";

const F4_NEW_FRAG = [
    "        // Gestor ve apenas chamados onde a task do seu dept esta ATIVA (nao concluida/nula)",
    "        // Quando chamado e transferido para outro dept, task vira null e gestor original para de ver",
    "        const isManagerOfTicket = myManagedDepts.length > 0 && myManagedDepts.some(function(dept) {",
    "          var taskKey = deptMap[dept];",
    "          return taskKey && t[taskKey] && !t[taskKey].isCompleted;",
    "        });",
    "        matchPermission = isAssigned || wasEverAssigned || isCreator || isManagerOfTicket;"
].join('\r\n');

if (code.includes(F4_OLD_FRAG)) {
    code = code.split(F4_OLD_FRAG).join(F4_NEW_FRAG);
    console.log('OK4 CRLF');
} else if (code.includes(F4_OLD_FRAG.replace(/\r\n/g, '\n'))) {
    code = code.split(F4_OLD_FRAG.replace(/\r\n/g, '\n')).join(F4_NEW_FRAG.replace(/\r\n/g, '\n'));
    console.log('OK4 LF');
} else {
    console.error('MISS4');
}

// Also fix isCreator to exclude gestors (prefix !myManagedDepts.length &&)
const F4B_OLD = "        const isCreator = t.timeline && t.timeline.length > 0 && t.timeline[0].user && t.timeline[0].user.toLowerCase() === cuLower;";
const F4B_NEW = "        // isCreator: so para SAC-atribuidos (nao gestores). Gestor NAO ganha visibilidade por ser criador.\n        const isCreator = !myManagedDepts.length && t.timeline && t.timeline.length > 0 && t.timeline[0].user && t.timeline[0].user.toLowerCase() === cuLower;";

if (code.includes(F4B_OLD.replace(/\n/g, '\r\n'))) {
    code = code.split(F4B_OLD.replace(/\n/g, '\r\n')).join(F4B_NEW.replace(/\n/g, '\r\n'));
    console.log('OK4b CRLF');
} else if (code.includes(F4B_OLD)) {
    code = code.split(F4B_OLD).join(F4B_NEW);
    console.log('OK4b LF');
} else {
    console.error('MISS4b');
}

fs.writeFileSync('frontend/sac.js', code, 'utf8');
console.log('Done. Lines:', code.split('\n').length);
console.log('openDetail:', code.includes('function openDetail'));
console.log('renderDetailModal:', code.includes('function renderDetailModal'));
console.log('canMoveTicket gestors:', code.includes('Gestores de qualquer departamento'));
console.log('isManagerOfTicket active:', code.includes('!t[taskKey].isCompleted'));
console.log('isCreator non-gestors:', code.includes('!myManagedDepts.length && t.timeline'));
