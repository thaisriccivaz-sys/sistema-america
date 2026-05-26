const fs = require('fs');

// 1. Fix app.js polling token
let app = fs.readFileSync('frontend/app.js', 'utf8');
app = app.replace(
    "const token = localStorage.getItem('token');",
    "const token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token');"
);
app = app.replace(
    "const token = localStorage.getItem('token');",
    "const token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token');"
);
// Also patch the check again to be absolutely sure
app = app.replace(
    "const isLog = window.isTopAdmin || (window.activeUserPerms && window.activeUserPerms['logistica-credenciamento']) || (currentUser && currentUser.departamento === 'Logística');",
    "const isLog = window.isTopAdmin || (window.activeUserPerms && window.activeUserPerms['logistica-credenciamento']) || (typeof currentUser !== 'undefined' && currentUser && (String(currentUser.departamento).toLowerCase().includes('log') || String(currentUser.role).toLowerCase().includes('log')));"
);
fs.writeFileSync('frontend/app.js', app);

// 2. Fix comercial_credenciamento.js
let cc = fs.readFileSync('frontend/comercial_credenciamento.js', 'utf8');
cc = cc.replace(
    "<b>${cred.cliente_nome}</b><br>",
    "<b>${cred.os ? cred.os + ' - ' : ''}${cred.cliente_nome}</b><br>"
);
fs.writeFileSync('frontend/comercial_credenciamento.js', cc);

// 3. Fix credenciamento.js (2 occurrences)
let cg = fs.readFileSync('frontend/credenciamento.js', 'utf8');
cg = cg.replace(
    "<b>${cred.cliente_nome}</b><br>",
    "<b>${cred.os ? cred.os + ' - ' : ''}${cred.cliente_nome}</b><br>"
);
cg = cg.replace(
    "<b>${cred.cliente_nome}</b><br>",
    "<b>${cred.os ? cred.os + ' - ' : ''}${cred.cliente_nome}</b><br>"
);
fs.writeFileSync('frontend/credenciamento.js', cg);
