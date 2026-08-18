/**
 * patch_perms_234.js — Fixes 2, 3, 4 (no template literals in script)
 */
const fs = require('fs');
let code = fs.readFileSync('frontend/sac.js', 'utf8');

// ─── FIX 2: canEditAssignment — remove creator bypass ────────────────────────
// Remove line: if (ticket.timeline && ticket.timeline.length > 0 && ticket.timeline[0].user === cUser) return true;
const OLD2 = '      if (isAdmin) return true;\r\n      if (ticket.timeline && ticket.timeline.length > 0 && ticket.timeline[0].user === cUser) return true;\r\n      const deptNorm';
const NEW2 = '      if (isAdmin) return true;\r\n      // SAC (Ver Todos) pode alterar atribuicao; sac-atribuidos NAO pode\r\n      const _permsEdit = window.activeUserPerms || {};\r\n      const _canSeeAllEdit = window.isTopAdmin || (_permsEdit[\'sac\'] === true && _permsEdit[\'sac-atribuidos\'] !== true);\r\n      if (_canSeeAllEdit) return true;\r\n      const deptNorm';

if (code.includes(OLD2)) { code = code.split(OLD2).join(NEW2); console.log('OK2'); }
else {
    // Try LF
    const OLD2LF = OLD2.replace(/\r\n/g,'\n');
    if (code.includes(OLD2LF)) { code = code.split(OLD2LF).join(NEW2.replace(/\r\n/g,'\n')); console.log('OK2 LF'); }
    else console.error('MISS2');
}

// Also fix the gestorId lookup to use responsavel_usuario_id
const OLD2b = "          const gestorId = deptObj.responsavel_id ? String(deptObj.responsavel_id) : null;\r\n          const gestorNome = deptObj.responsavel_nome ? String(deptObj.responsavel_nome) : null;\r\n          if ((gestorId && (gestorId === cUserId || gestorId === cUser)) || (gestorNome && gestorNome === cUser)) return true;";
const NEW2b = "          const gestorId = deptObj.responsavel_usuario_id ? String(deptObj.responsavel_usuario_id) : (deptObj.responsavel_id ? String(deptObj.responsavel_id) : null);\r\n          const gestorUsername = (deptObj.responsavel_username || '').toLowerCase();\r\n          const gestorNome = (deptObj.responsavel_nome || '').toLowerCase();\r\n          const cUserLow = (cUser || '').toLowerCase();\r\n          const cUserIdStr = cUserId ? String(cUserId) : '';\r\n          if ((gestorId && cUserIdStr && gestorId === cUserIdStr) || (gestorUsername && cUserLow && gestorUsername === cUserLow) || (gestorNome && cUserLow && gestorNome === cUserLow && cUserLow.length > 3)) return true;";
if (code.includes(OLD2b)) { code = code.split(OLD2b).join(NEW2b); console.log('OK2b'); }
else { const l = OLD2b.replace(/\r\n/g,'\n'); if (code.includes(l)) { code = code.split(l).join(NEW2b.replace(/\r\n/g,'\n')); console.log('OK2b LF'); } else console.error('MISS2b'); }

// ─── FIX 3: canMoveTicket — allow gestors ────────────────────────────────────
const OLD3 = '    const canSeeAll = isTopAdmin || (perms[\'sac\'] === true && perms[\'sac-atribuidos\'] !== true);\r\n    return canSeeAll;\r\n  }';
const NEW3 = '    const canSeeAll = isTopAdmin || (perms[\'sac\'] === true && perms[\'sac-atribuidos\'] !== true);\r\n    if (canSeeAll) return true;\r\n    // Gestores de qualquer departamento tambem podem mover chamados\r\n    let _mvUID = null;\r\n    try { const _mvu = JSON.parse(localStorage.getItem(\'erp_user\')||\'{}'); _mvUID = String(_mvu.id); } catch(e) {}\r\n    const _mvUser = currentUsername();\r\n    const _mvC = s => (s||\'\').toLowerCase().normalize(\'NFD\').replace(/[\\u0300-\\u036f]/g,\'\').replace(/[^a-z0-9]/g,\'\');\r\n    return (_globalDepartamentos||[]).some(d => {\r\n      const rId = (d.responsavel_usuario_id||\'\').toString().trim();\r\n      const rU = _mvC(d.responsavel_username); const rN = _mvC(d.responsavel_nome); const cU = _mvC(_mvUser);\r\n      return (_mvUID && rId && rId === _mvUID) || (cU && rU && rU === cU) || (cU && rN && rN === cU && cU.length > 3);\r\n    });\r\n  }';

if (code.includes(OLD3)) { code = code.split(OLD3).join(NEW3); console.log('OK3'); }
else { const l = OLD3.replace(/\r\n/g,'\n'); if (code.includes(l)) { code = code.split(l).join(NEW3.replace(/\r\n/g,'\n')); console.log('OK3 LF'); } else console.error('MISS3'); }

// ─── FIX 4: getFilteredTickets — isCreator only for non-gestors ──────────────
const OLD4 = '        const isCreator = t.timeline && t.timeline.length > 0 && t.timeline[0].user && t.timeline[0].user.toLowerCase() === cuLower;\r\n        const wasEverAssigned = isAssigned || (t.logisticsTask && t.logisticsTask.history && t.logisticsTask.history.some(h => h.assignedTo && h.assignedTo.toLowerCase() === actualUsernameLower)) ||\r\n                                (t.commercialTask && t.commercialTask.history && t.commercialTask.history.some(h => h.assignedTo && h.assignedTo.toLowerCase() === actualUsernameLower)) ||\r\n                                (t.financialTask && t.financialTask.history && t.financialTask.history.some(h => h.assignedTo && h.assignedTo.toLowerCase() === actualUsernameLower));\r\n        const isManagerOfTicket = myManagedDepts.length > 0 && myManagedDepts.some(dept => {\r\n          const taskKey = deptMap[dept];\r\n          return taskKey && t[taskKey];\r\n        });\r\n        matchPermission = isAssigned || wasEverAssigned || isCreator || isManagerOfTicket;';
const NEW4 = '        // isCreator: so para SAC-atribuidos (nao gestores); gestor ve pelo isManagerOfTicket\r\n        const isCreator = !myManagedDepts.length && t.timeline && t.timeline.length > 0 && t.timeline[0].user && t.timeline[0].user.toLowerCase() === cuLower;\r\n        const wasEverAssigned = isAssigned || (t.logisticsTask && t.logisticsTask.history && t.logisticsTask.history.some(h => h.assignedTo && h.assignedTo.toLowerCase() === actualUsernameLower)) ||\r\n                                (t.commercialTask && t.commercialTask.history && t.commercialTask.history.some(h => h.assignedTo && h.assignedTo.toLowerCase() === actualUsernameLower)) ||\r\n                                (t.financialTask && t.financialTask.history && t.financialTask.history.some(h => h.assignedTo && h.assignedTo.toLowerCase() === actualUsernameLower));\r\n        // Gestor ve apenas chamados onde a task do seu dept esta ATIVA (nao concluida/nula)\r\n        const isManagerOfTicket = myManagedDepts.length > 0 && myManagedDepts.some(dept => {\r\n          const taskKey = deptMap[dept];\r\n          return taskKey && t[taskKey] && !t[taskKey].isCompleted;\r\n        });\r\n        matchPermission = isAssigned || wasEverAssigned || isCreator || isManagerOfTicket;';

if (code.includes(OLD4)) { code = code.split(OLD4).join(NEW4); console.log('OK4'); }
else { const l = OLD4.replace(/\r\n/g,'\n'); if (code.includes(l)) { code = code.split(l).join(NEW4.replace(/\r\n/g,'\n')); console.log('OK4 LF'); } else console.error('MISS4'); }

fs.writeFileSync('frontend/sac.js', code, 'utf8');
console.log('Done. Lines:', code.split('\n').length);
