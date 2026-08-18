/**
 * patch_sac_final.js
 * Applies remaining patches:
 * 1. Add window._stripEmojis helper (anchor = "let _tickets = [];")
 * 2. Fix duplicateTicket: add contacts, use POST /api/sac/tickets
 */
const fs = require('fs');
let code = fs.readFileSync('frontend/sac.js', 'utf8');
let ok = [];
let warn = [];

function rep(label, search, replace) {
    if (!code.includes(search)) { warn.push(label); return; }
    code = code.split(search).join(replace);
    ok.push(label);
}

// ─── 1. Add _stripEmojis after "let _tickets = [];" ───────────────
rep(
    'add _stripEmojis helper',
    `  let _tickets = [];`,
    `  let _tickets = [];
  window._stripEmojis = function(str) {
    if (!str || typeof str !== 'string') return '';
    return str.replace(/^[^a-zA-Z0-9\u00C0-\u024F]+/, '').replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}]/gu, '').trim();
  };`
);

// ─── 2a. Add contacts to newTicket in duplicateTicket ─────────────
rep(
    'duplicateTicket: add contacts clone',
    `          address: t.address || '',
          contactName: t.contactName || '',`,
    `          address: t.address || '',
          contacts: t.contacts ? JSON.parse(JSON.stringify(t.contacts)) : [],
          contactName: t.contactName || '',`
);

// ─── 2b. Deep clone occurrences and attachments ───────────────────
rep(
    'duplicateTicket: clone occurrences+attachments',
    `          occurrences: t.occurrences || [],
          attachments: t.attachments || [],`,
    `          occurrences: t.occurrences ? JSON.parse(JSON.stringify(t.occurrences)) : [],
          attachments: t.attachments ? JSON.parse(JSON.stringify(t.attachments)) : [],`
);

// ─── 2c. Switch from updateTicket to POST ─────────────────────────
rep(
    'duplicateTicket: use POST instead of updateTicket',
    `      try {
          await updateTicket(newTicket);
          await loadTickets();
          renderAll();
          showToast('Chamado duplicado com sucesso!', 'success');
          SAC.openDetail(newTicket.id);
      } catch (e) {
          showToast('Erro ao duplicar chamado', 'error');
      }`,
    `      try {
          const _dupToken = localStorage.getItem('erp_token') || localStorage.getItem('token');
          const _dupRes = await fetch('/api/sac/tickets', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + _dupToken },
              body: JSON.stringify(newTicket)
          });
          if (!_dupRes.ok) throw new Error('Erro ao salvar duplicata');
          await loadTickets();
          renderAll();
          showToast('Chamado duplicado com sucesso!', 'success');
          setTimeout(() => { SAC.openDetail(newTicket.id); }, 400);
      } catch (e) {
          console.error('Erro duplicar:', e);
          showToast('Erro ao duplicar chamado', 'error');
      }`
);

fs.writeFileSync('frontend/sac.js', code, 'utf8');
console.log('\u2705 OK:', ok.join(', '));
if (warn.length) console.log('\u26A0\uFE0F WARN (not found):', warn.join(', '));
console.log('File size:', fs.statSync('frontend/sac.js').size, 'bytes');
