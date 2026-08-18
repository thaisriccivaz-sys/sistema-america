/**
 * patch_perms_1.js — Fix checklist/custos buttons (sac-atribuidos excluded)
 */
const fs = require('fs');
let code = fs.readFileSync('frontend/sac.js', 'utf8');

// The old line has: (window.isTopAdmin || (window.activeUserPerms||{})['sac'] === true)
// This catches sac-atribuidos users too.
// New line: check canSeeAll = sac===true AND sac-atribuidos!==true

const OLD1 = "(window.isTopAdmin || (window.activeUserPerms||{})['sac'] === true) ? `<button onclick=\"SAC.openChecklistModal()\"";
const NEW1 = "(() => { const _p = window.activeUserPerms||{}; const _ca = window.isTopAdmin || (_p['sac']===true && _p['sac-atribuidos']!==true); return _ca; })() ? `<button onclick=\"SAC.openChecklistModal()\"";

const OLD2 = "(window.isTopAdmin || (window.activeUserPerms||{})['sac'] === true) ? `<button onclick=\"SAC.openCustosModal()\"";
const NEW2 = "(() => { const _p = window.activeUserPerms||{}; const _ca = window.isTopAdmin || (_p['sac']===true && _p['sac-atribuidos']!==true); return _ca; })() ? `<button onclick=\"SAC.openCustosModal()\"";

if (code.includes(OLD1)) { code = code.split(OLD1).join(NEW1); console.log('OK1'); } else console.error('MISS1');
if (code.includes(OLD2)) { code = code.split(OLD2).join(NEW2); console.log('OK2'); } else console.error('MISS2');

fs.writeFileSync('frontend/sac.js', code, 'utf8');
console.log('[1] Done');
