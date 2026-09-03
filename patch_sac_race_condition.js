const fs = require('fs');
let c = fs.readFileSync('frontend/sac.js', 'utf8');

let changes = 0;

function rep(oldStr, newStr, label) {
    if (c.includes(oldStr)) {
        const count = c.split(oldStr).length - 1;
        if (count > 1) { console.log(label + ' MULTI-MATCH (' + count + ') — skip'); return false; }
        c = c.replace(oldStr, newStr);
        changes++;
        console.log(label + ' OK');
        return true;
    }
    const altOld = oldStr.replace(/\r\n/g, '\n');
    const altNew = newStr.replace(/\r\n/g, '\n');
    if (c.includes(altOld)) {
        const count = c.split(altOld).length - 1;
        if (count > 1) { console.log(label + ' MULTI-MATCH LF (' + count + ') — skip'); return false; }
        c = c.replace(altOld, altNew);
        changes++;
        console.log(label + ' OK (LF)');
        return true;
    }
    // Debug
    const key = oldStr.substring(0, 60).replace(/\r\n/g, ' ');
    const idx = c.indexOf(key.replace(/\r\n/g, '\n'));
    const idx2 = c.indexOf(key);
    console.log(label + ' MISS — "' + key + '" at:', idx, idx2);
    return false;
}

// ──────────────────────────────────────────────────────────────────────
// FIX 1: loadTickets — não sobrescrever _tickets se houve save durante a carga
// Isso evita que dados desatualizados do servidor sobrescrevam o estado 'respondido'
// que já foi salvo no banco mas que ainda não foi refletido no próximo poll
// ──────────────────────────────────────────────────────────────────────
rep(
`async function loadTickets() {\r\n    try {\r\n      const token = localStorage.getItem('erp_token')||localStorage.getItem('token');\r\n      const headers = { 'Authorization': \`Bearer \${token}\` };\r\n      const [ticketsRes, deptsRes, usersRes, occsRes] = await Promise.all([\r\n        fetch('/api/sac/tickets', { headers }),\r\n        fetch('/api/departamentos', { headers }).catch(() => null),\r\n        fetch('/api/usuarios', { headers }).catch(() => null),\r\n        fetch('/api/sac/ocorrencias', { headers }).catch(() => null)\r\n      ]);\r\n      if (ticketsRes.ok) _tickets = await ticketsRes.json();`,
`async function loadTickets() {\r\n    try {\r\n      const token = localStorage.getItem('erp_token')||localStorage.getItem('token');\r\n      const headers = { 'Authorization': \`Bearer \${token}\` };\r\n      const _sacLoadTs = Date.now(); // timestamp ANTES da fetch (detectar race condition de save)\r\n      const [ticketsRes, deptsRes, usersRes, occsRes] = await Promise.all([\r\n        fetch('/api/sac/tickets', { headers }),\r\n        fetch('/api/departamentos', { headers }).catch(() => null),\r\n        fetch('/api/usuarios', { headers }).catch(() => null),\r\n        fetch('/api/sac/ocorrencias', { headers }).catch(() => null)\r\n      ]);\r\n      if (ticketsRes.ok) {\r\n          const _fresh = await ticketsRes.json();\r\n          // Só substituir _tickets se nenhum save aconteceu DURANTE essa carga de rede.\r\n          // Evita sobrescrever stage='respondido' com dado desatualizado vindo do servidor.\r\n          if ((window._sacLastSaveMs || 0) <= _sacLoadTs) {\r\n              _tickets = _fresh;\r\n          } else {\r\n              console.warn('[SAC] loadTickets: save detectado durante a carga — dados do servidor descartados para evitar race condition.');\r\n          }\r\n      }`,
'FIX 1: loadTickets race condition guard'
);

// ──────────────────────────────────────────────────────────────────────
// FIX 2: _sacAutoRefresh — verificar novamente após loadTickets completar
// Se um save ocorreu DURANTE o loadTickets, não renderizar (evita flash de estado antigo)
// ──────────────────────────────────────────────────────────────────────
rep(
`            const ov = document.getElementById('sac-modal-overlay');\r\n            if (!ov || ov.style.display === 'none') {\r\n                await loadTickets();\r\n                renderAll();\r\n            }`,
`            const ov = document.getElementById('sac-modal-overlay');\r\n            if (!ov || ov.style.display === 'none') {\r\n                const _snapSave = window._sacLastSaveMs || 0;\r\n                await loadTickets();\r\n                // Verificar novamente após o load: se houve save durante a carga, não renderizar\r\n                // (dados já foram descartados em loadTickets, mas garantimos não fazer renderAll com lixo)\r\n                if ((window._sacLastSaveMs || 0) > _snapSave) return;\r\n                renderAll();\r\n            }`,
'FIX 2: _sacAutoRefresh post-load guard'
);

// ──────────────────────────────────────────────────────────────────────
// FIX 3: updateTicket retry — usar versão mais recente do ticket do _tickets
// Evita reenviar versão antiga de 't' capturada no closure antes de um change de stage
// ──────────────────────────────────────────────────────────────────────
rep(
`        setTimeout(() => updateTicket(t, _retries + 1), delay);`,
`        setTimeout(() => {\r\n            // Usar a versão mais recente do ticket em memória (pode ter mudado durante a espera)\r\n            const _latestT = _tickets.find(x => x.id === t.id);\r\n            updateTicket(_latestT || t, _retries + 1);\r\n        }, delay);`,
'FIX 3: retry usa versão mais recente do ticket'
);

fs.writeFileSync('frontend/sac.js', c, 'utf8');
console.log('\nTotal de correções aplicadas:', changes);

// Verificações
const cf = fs.readFileSync('frontend/sac.js', 'utf8');
console.log('\nVerificações:');
console.log('FIX 1 — _sacLoadTs presente:', cf.indexOf('_sacLoadTs') > 0);
console.log('FIX 1 — guard descarte:', cf.indexOf('dados do servidor descartados') > 0);
console.log('FIX 2 — _snapSave presente:', cf.indexOf('_snapSave') > 0);
console.log('FIX 2 — post-load guard:', cf.indexOf('Verificar novamente após o load') > 0);
console.log('FIX 3 — _latestT presente:', cf.indexOf('_latestT') > 0);
