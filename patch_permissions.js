/**
 * patch_permissions.js v2 — uses line-number based replacement
 */
const fs = require('fs');
let lines = fs.readFileSync('frontend/sac.js', 'utf8').split('\n');
let fixed = [];

function repLine(label, lineNum, oldFrag, newLine) {
    const idx = lineNum - 1;
    if (idx >= 0 && idx < lines.length && lines[idx].includes(oldFrag)) {
        lines[idx] = newLine;
        fixed.push(label);
        return true;
    }
    // scan nearby ±10 lines
    for (let i = Math.max(0, idx-10); i < Math.min(lines.length, idx+10); i++) {
        if (lines[i].includes(oldFrag)) {
            lines[i] = newLine;
            fixed.push(label + ' (±' + (i+1-lineNum) + ')');
            return true;
        }
    }
    console.error('❌ NOT FOUND:', label, '| looking for:', oldFrag.substring(0, 60));
    return false;
}

function repRange(label, startFrag, endFrag, newLines) {
    const code = lines.join('\n');
    const si = code.indexOf(startFrag);
    const ei = code.indexOf(endFrag, si);
    if (si === -1 || ei === -1) {
        // try CRLF variants
        const si2 = code.indexOf(startFrag.replace(/\r\n/g,'\n'));
        const ei2 = si2 !== -1 ? code.indexOf(endFrag.replace(/\r\n/g,'\n'), si2) : -1;
        if (si2 === -1 || ei2 === -1) {
            console.error('❌ NOT FOUND:', label);
            return false;
        }
        const before = code.substring(0, si2);
        const after = code.substring(ei2 + endFrag.replace(/\r\n/g,'\n').length);
        const newCode = before + newLines + after;
        lines = newCode.split('\n');
        fixed.push(label + ' [LF]');
        return true;
    }
    const before = code.substring(0, si);
    const after = code.substring(ei + endFrag.length);
    const newCode = before + newLines + after;
    lines = newCode.split('\n');
    fixed.push(label);
    return true;
}

// ─── FIX 1: Checklist/Custos buttons — swap sac===true to canSeeAll check ────
// Lines 1959-1960 (approx) in the original file
// Old: (window.isTopAdmin || (window.activeUserPerms||{})['sac'] === true)
// New: canSeeAll computation inline
repRange(
    'Fix1: Checklist/Custos canSeeAll',
    "openChecklistModal()\" style=\"font-size:0.8rem;font-weight:700;color:#fff;background:#0369a1",
    "openCustosModal()\" style=\"font-size:0.8rem;font-weight:700;color:#fff;background:#7e22ce;padding:4px 12px;border-radius:6px;border:none;cursor:pointer;display:flex;align-items:center;gap:6px;\"><i class=\"ph ph-currency-dollar\"></i> Centro de Custos</button>` : ''}",
    `${(() => { const _p = window.activeUserPerms||{}; const _canAll = window.isTopAdmin || (_p['sac']===true && _p['sac-atribuidos']!==true); return _canAll ? \`<button onclick="SAC.openChecklistModal()" style="font-size:0.8rem;font-weight:700;color:#fff;background:#0369a1;padding:4px 12px;border-radius:6px;border:none;cursor:pointer;display:flex;align-items:center;gap:6px;"><i class="ph ph-list-checks"></i> Check-list</button>\` : ''; })()}\r\n                    \${(() => { const _p = window.activeUserPerms||{}; const _canAll = window.isTopAdmin || (_p['sac']===true && _p['sac-atribuidos']!==true); return _canAll ? \`<button onclick="SAC.openCustosModal()" style="font-size:0.8rem;font-weight:700;color:#fff;background:#7e22ce;padding:4px 12px;border-radius:6px;border:none;cursor:pointer;display:flex;align-items:center;gap:6px;"><i class="ph ph-currency-dollar"></i> Centro de Custos</button>\` : ''; })()}`
);

// ─── FIX 2: canEditAssignment — remove creator bypass, add canSeeAll check ────
repRange(
    'Fix2: canEditAssignment',
    'if (isAdmin) return true;\r\n      if (ticket.timeline && ticket.timeline.length > 0 && ticket.timeline[0].user === cUser) return true;',
    'if ((gestorId && (gestorId === cUserId || gestorId === cUser)) || (gestorNome && gestorNome === cUser)) return true;\r\n      }\r\n      return false;\r\n    };',
    `      if (isAdmin) return true;\r\n      // SAC (Ver Todos) pode alterar atribuicao; sac-atribuidos NAO pode\r\n      const _permsNowEdit = window.activeUserPerms || {};\r\n      const _canSeeAllEdit = window.isTopAdmin || (_permsNowEdit['sac'] === true && _permsNowEdit['sac-atribuidos'] !== true);\r\n      if (_canSeeAllEdit) return true;\r\n      // Apenas gestor do departamento da tarefa pode alterar\r\n      const deptNorm = (taskLabel||'').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();\r\n      const deptObj = _globalDepartamentos.find(d => {\r\n          const dNorm = (d.nome||'').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();\r\n          return dNorm.includes(deptNorm) || deptNorm.includes(dNorm);\r\n      });\r\n      if (deptObj) {\r\n          const gestorId = deptObj.responsavel_usuario_id ? String(deptObj.responsavel_usuario_id) : (deptObj.responsavel_id ? String(deptObj.responsavel_id) : null);\r\n          const gestorUsername = (deptObj.responsavel_username || '').toLowerCase();\r\n          const gestorNome = (deptObj.responsavel_nome || '').toLowerCase();\r\n          const cUserLow = (cUser || '').toLowerCase();\r\n          const cUserIdStr = cUserId ? String(cUserId) : '';\r\n          if ((gestorId && cUserIdStr && gestorId === cUserIdStr) ||\r\n              (gestorUsername && cUserLow && gestorUsername === cUserLow) ||\r\n              (gestorNome && cUserLow && gestorNome === cUserLow && cUserLow.length > 3)) return true;\r\n      }\r\n      return false;\r\n    };`
);

// ─── FIX 3: canMoveTicket — allow dept gestors ────────────────────────────────
repRange(
    'Fix3: canMoveTicket allow gestors',
    'function canMoveTicket(t) {\r\n    const perms = window.activeUserPerms || {};\r\n    const isTopAdmin = window.isTopAdmin || false;\r\n    const canSeeAll = isTopAdmin || (perms[\'sac\'] === true && perms[\'sac-atribuidos\'] !== true);\r\n    return canSeeAll;\r\n  }',
    '\r\n\r\n  // ── FILTRAGEM',
    `function canMoveTicket(t) {\r\n    const perms = window.activeUserPerms || {};\r\n    const isTopAdmin = window.isTopAdmin || false;\r\n    const canSeeAll = isTopAdmin || (perms['sac'] === true && perms['sac-atribuidos'] !== true);\r\n    if (canSeeAll) return true;\r\n    // Gestores de qualquer departamento tambem podem mover chamados\r\n    let _mvUserId = null;\r\n    try { const _u = JSON.parse(localStorage.getItem('erp_user')||'{}'); _mvUserId = String(_u.id); } catch(e) {}\r\n    const _mvUser = currentUsername();\r\n    const _mvClean = s => (s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'');\r\n    return (_globalDepartamentos||[]).some(d => {\r\n      const rId = (d.responsavel_usuario_id||'').toString().trim();\r\n      const rUser = _mvClean(d.responsavel_username);\r\n      const rNome = _mvClean(d.responsavel_nome);\r\n      const cUC = _mvClean(_mvUser);\r\n      return (_mvUserId && rId && rId === _mvUserId) || (cUC && rUser && rUser === cUC) || (cUC && rNome && rNome === cUC && cUC.length > 3);\r\n    });\r\n  }\r\n\r\n  // ── FILTRAGEM`
);

// ─── FIX 4: getFilteredTickets – isCreator only for non-gestors; active tasks only ──
repRange(
    'Fix4: isCreator restricted; isManagerOfTicket active tasks only',
    'const isCreator = t.timeline && t.timeline.length > 0 && t.timeline[0].user && t.timeline[0].user.toLowerCase() === cuLower;',
    'return taskKey && t[taskKey];\r\n        });\r\n        matchPermission = isAssigned || wasEverAssigned || isCreator || isManagerOfTicket;',
    `// isCreator: so para SAC-atribuidos (nao gestores); gestor vê pelo isManagerOfTicket\r\n        const isCreator = !myManagedDepts.length && t.timeline && t.timeline.length > 0 && t.timeline[0].user && t.timeline[0].user.toLowerCase() === cuLower;\r\n        const wasEverAssigned = isAssigned || (t.logisticsTask && t.logisticsTask.history && t.logisticsTask.history.some(h => h.assignedTo && h.assignedTo.toLowerCase() === actualUsernameLower)) ||\r\n                                (t.commercialTask && t.commercialTask.history && t.commercialTask.history.some(h => h.assignedTo && h.assignedTo.toLowerCase() === actualUsernameLower)) ||\r\n                                (t.financialTask && t.financialTask.history && t.financialTask.history.some(h => h.assignedTo && h.assignedTo.toLowerCase() === actualUsernameLower));\r\n        // Gestor vê apenas chamados onde a task do seu dept esta ATIVA (nao concluida/nula)\r\n        // Quando chamado e transferido para outro dept, task vira null -> gestor original para de ver\r\n        const isManagerOfTicket = myManagedDepts.length > 0 && myManagedDepts.some(dept => {\r\n          const taskKey = deptMap[dept];\r\n          return taskKey && t[taskKey] && !t[taskKey].isCompleted;\r\n        });\r\n        matchPermission = isAssigned || wasEverAssigned || isCreator || isManagerOfTicket;`
);

const finalCode = lines.join('\n');
fs.writeFileSync('frontend/sac.js', finalCode, 'utf8');
console.log('\n✅ Applied:', fixed.join(' | '));
console.log('File lines:', lines.length);

// Safety checks
console.log('\nSafety checks:');
console.log('openDetail:', finalCode.includes('function openDetail'));
console.log('renderDetailModal:', finalCode.includes('function renderDetailModal'));
console.log('wizSubmit:', finalCode.includes('wizSubmit'));
console.log('\nFeature checks:');
console.log('Checklist _canAll:', finalCode.includes("_p['sac-atribuidos']!==true); return _canAll ? `<button onclick=\"SAC.openChecklistModal()"));
console.log('canEditAssignment no creator:', !finalCode.includes("ticket.timeline[0].user === cUser) return true;"));
console.log('canMoveTicket gestors:', finalCode.includes('Gestores de qualquer departamento'));
console.log('isCreator non-gestors:', finalCode.includes('!myManagedDepts.length && t.timeline'));
console.log('isManagerOfTicket active:', finalCode.includes('!t[taskKey].isCompleted'));
