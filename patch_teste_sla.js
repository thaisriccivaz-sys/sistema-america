const fs = require('fs');
let code = fs.readFileSync('frontend/sac.js', 'utf8');
let fixed = [];

function repRange(label, startFrag, endFrag, newLines) {
    const si = code.indexOf(startFrag);
    const ei = code.indexOf(endFrag, si);
    if (si === -1 || ei === -1) {
        const si2 = code.indexOf(startFrag.replace(/\r\n/g,'\n'));
        const ei2 = si2 !== -1 ? code.indexOf(endFrag.replace(/\r\n/g,'\n'), si2) : -1;
        if (si2 === -1 || ei2 === -1) {
            console.error('❌ NOT FOUND:', label);
            return false;
        }
        const before = code.substring(0, si2);
        const after = code.substring(ei2 + endFrag.replace(/\r\n/g,'\n').length);
        code = before + newLines + after;
        fixed.push(label + ' [LF]');
        return true;
    }
    const before = code.substring(0, si);
    const after = code.substring(ei + endFrag.length);
    code = before + newLines + after;
    fixed.push(label);
    return true;
}

// FIX 1: getSLADetails
const f1_start = "    // SLA congelado no Acompanhamento (pausa no fds)\r\n    let elapsedMs = getSlaElapsedMs(opened, endCalc);\r\n    if (isFrozen) {\r\n        if (ticket.slaElapsedMs) elapsedMs = ticket.slaElapsedMs;";
const f1_end = "else if (fallbackElapsed) elapsedMs = getSlaElapsedMs(opened, opened + fallbackElapsed);\r\n    }";
const f1_new = `    // SLA congelado no Acompanhamento (pausa no fds)\r\n    let elapsedMs = (ticket.typeKey === 'tipo_teste') ? (endCalc - opened) : getSlaElapsedMs(opened, endCalc);\r\n    if (ticket.typeKey === 'tipo_teste') isFrozen = false;\r\n    if (isFrozen) {\r\n        if (ticket.slaElapsedMs) elapsedMs = ticket.slaElapsedMs;\r\n        else if (fallbackElapsed) elapsedMs = getSlaElapsedMs(opened, opened + fallbackElapsed);\r\n    }`;
repRange('Fix1: getSLADetails', f1_start, f1_end, f1_new);

// FIX 2: Visual counter
const f2_start = "        const AGUARD_TOTAL_MS = 2 * 60 * 60 * 1000; // 2 horas em ms\r\n        const bizMs = businessMsUntilDeadline(ticket.aguardDeadline);\r\n        const isOverAguard = bizMs <= 0;\r\n        const absMs = Math.abs(bizMs);";
const f2_end = "        const nowD = new Date(), nowDow = nowD.getDay(), nowH = nowD.getHours();\r\n        const isPaused = nowDow===0 || nowDow===6 || nowH<8 || nowH>=17;\r\n        const countLabel = isOverAguard ? `-${hh}:${mm}:${ss}` : isPaused ? `❄️ ${hh}:${mm}:${ss}` : `⏳ ${hh}:${mm}:${ss}`;";
const f2_new = `        const isTeste = ticket.typeKey === 'tipo_teste';\r\n        const AGUARD_TOTAL_MS = isTeste ? (2 * 60 * 1000) : (2 * 60 * 60 * 1000); // 2 min ou 2 horas\r\n        const bizMs = isTeste ? (new Date(ticket.aguardDeadline).getTime() - Date.now()) : businessMsUntilDeadline(ticket.aguardDeadline);\r\n        const isOverAguard = bizMs <= 0;\r\n        const absMs = Math.abs(bizMs);\r\n        const hh = Math.floor(absMs/3600000).toString().padStart(2,'0');\r\n        const mm = Math.floor((absMs%3600000)/60000).toString().padStart(2,'0');\r\n        const ss = Math.floor((absMs%60000)/1000).toString().padStart(2,'0');\r\n        const aguardPct = isOverAguard ? 100 : Math.min(100, Math.round((AGUARD_TOTAL_MS - bizMs) / AGUARD_TOTAL_MS * 100));\r\n        const nowD = new Date(), nowDow = nowD.getDay(), nowH = nowD.getHours();\r\n        const isPaused = !isTeste && (nowDow===0 || nowDow===6 || nowH<8 || nowH>=17);\r\n        const countLabel = isOverAguard ? \`-\${hh}:\${mm}:\${ss}\` : isPaused ? \`❄️ \${hh}:\${mm}:\${ss}\` : \`⏳ \${hh}:\${mm}:\${ss}\`;`;
repRange('Fix2: Visual counter', f2_start, f2_end, f2_new);

// FIX 3: Transfer to aguardando_setores
const f3_start = "ticket.financialTask  = sector==='Financeiro' ? { name:`Pendente: Financeiro — aguardando resposta.`, isCompleted:false, feedback:'', history:[], assignedTo: assignedUsername, assignedToName: assignedUserNome, assignedToPhoto: assignedUserPhoto } : null;\r\n\r\n        ticket.aguardDeadline = addBusinessHours(new Date(), 2 * 60 * 60 * 1000).toISOString(); // 2 horas";
const f3_end = "ticket.aguardNotified = false;";
const f3_new = `ticket.financialTask  = sector==='Financeiro' ? { name:\`Pendente: Financeiro — aguardando resposta.\`, isCompleted:false, feedback:'', history:[], assignedTo: assignedUsername, assignedToName: assignedUserNome, assignedToPhoto: assignedUserPhoto } : null;\r\n\r\n        ticket.aguardDeadline = (ticket.typeKey === 'tipo_teste') ? new Date(Date.now() + 2 * 60 * 1000).toISOString() : addBusinessHours(new Date(), 2 * 60 * 60 * 1000).toISOString();\r\n        ticket.aguardNotified = false;`;
repRange('Fix3: Set deadline', f3_start, f3_end, f3_new);

if (fixed.length > 0) {
    fs.writeFileSync('frontend/sac.js', code, 'utf8');
    console.log('✅ Applied:', fixed.join(', '));
}
