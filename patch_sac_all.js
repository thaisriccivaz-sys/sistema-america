/**
 * patch_sac_all.js — v2
 * Safe version: reads exact byte sequences from file to avoid regex escaping issues
 */

const fs = require('fs');

let code = fs.readFileSync('frontend/sac.js', 'utf8');
let changes = [];

function applyReplace(label, search, replace) {
    if (typeof search === 'string') {
        if (!code.includes(search)) {
            console.warn(`[WARN] Pattern not found for: ${label}`);
            return false;
        }
        code = code.split(search).join(replace);
        changes.push(label);
        return true;
    }
    // regex
    if (!search.test(code)) {
        console.warn(`[WARN] Regex not found for: ${label}`);
        return false;
    }
    code = code.replace(search, replace);
    changes.push(label);
    return true;
}

// ─────────────────────────────────────────────────────────────────
// 1. Add window._stripEmojis helper after "window._tickets = [];"
// ─────────────────────────────────────────────────────────────────
applyReplace(
    'add _stripEmojis helper',
    'window._tickets = [];',
    `window._tickets = [];
  window._stripEmojis = function(str) {
    if (!str) return '';
    return str.replace(/^[^a-zA-Z0-9\u00C0-\u024F]+/, '').replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}]/gu, '').trim();
  };`
);

// ─────────────────────────────────────────────────────────────────
// 2. Fix _clienteLimpo uses (may be 1 or 2 versions)
// ─────────────────────────────────────────────────────────────────
const newClienteLimpo = "const _clienteLimpo = window._stripEmojis(clienteNome);";
// Version A: single backslash (in-code literal)
applyReplace(
    'fix _clienteLimpo version A',
    "const _clienteLimpo = clienteNome.replace(/^[\\s\\S]*?([A-Z\\u00C0-\\u024F])/u, '$1').trim();",
    newClienteLimpo
);
// Version B: double backslash (escaped version)
applyReplace(
    'fix _clienteLimpo version B',
    "const _clienteLimpo = clienteNome.replace(/^[\\\\s\\\\S]*?([A-Z\\u00C0-\\u024F])/u, '$1').trim();",
    newClienteLimpo
);

// ─────────────────────────────────────────────────────────────────
// 3. Fix clientName in detail modal h2 (already has emoji replace inline)
// ─────────────────────────────────────────────────────────────────
// Find the exact line and replace
const h2OldPart = ">${(t.clientName || '').replace(/[\\u{1F300}-\\u{1F9FF}\\u{2600}-\\u{26FF}\\u{2700}-\\u{27BF}\\u{1F600}-\\u{1F64F}\\u{1F680}-\\u{1F6FF}\\u{1F1E0}-\\u{1F1FF}]/gu, '').trim()}</h2>";
const h2NewPart = ">${window._stripEmojis(t.clientName)}</h2>";
applyReplace('fix clientName h2 in detail modal', h2OldPart, h2NewPart);

// ─────────────────────────────────────────────────────────────────
// 4. Fix clientName in table view
// ─────────────────────────────────────────────────────────────────
applyReplace(
    'fix clientName in table cell',
    'white-space:nowrap;">${t.clientName}</td>',
    'white-space:nowrap;">${window._stripEmojis(t.clientName)}</td>'
);

// ─────────────────────────────────────────────────────────────────
// 5. Fix clientName in existing ticket mini-card in OS search modal
// ─────────────────────────────────────────────────────────────────
applyReplace(
    'fix clientName in OS search mini-card',
    '><span style="font-weight:600;flex:1;line-height:1.3;">${t.clientName}</span>',
    '><span style="font-weight:600;flex:1;line-height:1.3;">${window._stripEmojis(t.clientName)}</span>'
);

// ─────────────────────────────────────────────────────────────────
// 6. Fix cleanClientName in Kanban card (already uses replace, just use helper)
// ─────────────────────────────────────────────────────────────────
applyReplace(
    'fix cleanClientName in kanban card',
    "const cleanClientName = (ticket.clientName || '').replace(/[\\u{1F300}-\\u{1F9FF}\\u{2600}-\\u{26FF}\\u{2700}-\\u{27BF}\\u{1F600}-\\u{1F64F}\\u{1F680}-\\u{1F6FF}\\u{1F1E0}-\\u{1F1FF}]/gu, '').trim();",
    "const cleanClientName = window._stripEmojis(ticket.clientName);"
);

// ─────────────────────────────────────────────────────────────────
// 7. Always prefix address with OS number (remove isContract condition)
// ─────────────────────────────────────────────────────────────────
applyReplace(
    'always prefix address with OS number',
    'label: isContract && o.numero_os ? `OS ${o.numero_os} - ${ender}` : ender,',
    'label: o.numero_os ? `OS ${o.numero_os} - ${ender}` : ender,'
);

// ─────────────────────────────────────────────────────────────────
// 8. Update _sacEscolherEndereco call: pass osList, handle {label,todos}
// ─────────────────────────────────────────────────────────────────
applyReplace(
    'update _sacEscolherEndereco call',
    `const labelSelecionado = labelsUnicos.length > 1
        ? await _sacEscolherEndereco(labelsUnicos, _clienteLimpo || clienteNome)
        : (labelsUnicos[0] || '');
        
      if (labelsUnicos.length > 1 && labelSelecionado === null) { 
          if (!isContract) { _wiz._osLinked = false; _wiz._protocolLocked = false; renderWizard(); }
          return; 
      }`,
    `const _enderRes = labelsUnicos.length > 1
        ? await _sacEscolherEndereco(labelsUnicos, _clienteLimpo || clienteNome, osList)
        : { label: labelsUnicos[0] || '', todos: false };
      const labelSelecionado = _enderRes ? _enderRes.label : null;
      const adicionarTodos   = _enderRes ? _enderRes.todos  : false;
        
      if (labelsUnicos.length > 1 && labelSelecionado === null) { 
          if (!isContract) { _wiz._osLinked = false; _wiz._protocolLocked = false; renderWizard(); }
          return; 
      }`
);

// ─────────────────────────────────────────────────────────────────
// 9. Replace _sacEscolherEndereco function via regex (encoding-safe)
// ─────────────────────────────────────────────────────────────────
const sacFnRegex = /async function _sacEscolherEndereco\(enderecos, cliente\) \{[\s\S]*?\n  \}/;
const newSacFn = `async function _sacEscolherEndereco(enderecos, cliente, osList) {
    return new Promise(resolve => {
      const clienteLimpo = window._stripEmojis ? window._stripEmojis(cliente) : (cliente||'').replace(/^[^a-zA-Z0-9\u00C0-\u024F]+/, '').trim();
      const div = document.createElement('div');
      div.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;';
      const btnsHtml = enderecos.map((e,i) =>
        \`<button data-idx="\${i}" style="background:#fff;border:1.5px solid #e2e8f0;border-radius:8px;padding:10px 14px;font-size:0.82rem;cursor:pointer;text-align:left;font-weight:500;color:#1e293b;transition:all 0.15s;display:flex;align-items:flex-start;gap:8px;" onmouseover="this.style.background='#f1f5f9';this.style.borderColor='#3b82f6';" onmouseout="this.style.background='#fff';this.style.borderColor='#e2e8f0';"><span style='color:#ef4444;flex-shrink:0;'>\u{1F4CD}</span><span style='flex:1;line-height:1.4;'>\${e}</span></button>\`
      ).join('');
      div.innerHTML = \`
        <div style="background:white;border-radius:12px;padding:24px;min-width:340px;max-width:600px;width:90vw;box-shadow:0 8px 32px rgba(0,0,0,0.18);">
          <h3 style="margin:0 0 12px;font-size:1rem;color:#1e293b;">Mais de um endere\u00e7o encontrado</h3>
          <div style="background:#f8fafc;border-radius:8px;padding:12px;margin-bottom:14px;border:1px solid #e2e8f0;">
            <div style="font-size:0.9rem;color:#1e293b;font-weight:700;">\${clienteLimpo}</div>
          </div>
          <p style="margin:0 0 10px;font-size:0.85rem;color:#475569;">Qual endere\u00e7o deseja utilizar na ocorr\u00eancia?</p>
          <div id="_sac-ender-opts" style="display:flex;flex-direction:column;gap:8px;max-height:280px;overflow-y:auto;padding-right:4px;margin-bottom:12px;">
            \${btnsHtml}
          </div>
          <div style="display:flex;gap:8px;">
            <button id="_sac-ender-todos" style="flex:1;background:#10b981;color:white;border:none;border-radius:6px;padding:9px 14px;font-size:0.82rem;cursor:pointer;font-weight:700;">\u2714 Adicionar Todos</button>
            <button id="_sac-ender-cancel" style="flex:1;background:#e2e8f0;border:none;border-radius:6px;padding:9px 14px;font-size:0.82rem;cursor:pointer;color:#475569;font-weight:600;">Cancelar</button>
          </div>
        </div>\`;
      document.body.appendChild(div);
      div.querySelectorAll('[data-idx]').forEach(btn => {
        btn.addEventListener('click', () => { div.remove(); resolve({ label: enderecos[+btn.dataset.idx], todos: false }); });
      });
      div.querySelector('#_sac-ender-todos').addEventListener('click', () => { div.remove(); resolve({ label: enderecos[0], todos: true }); });
      div.querySelector('#_sac-ender-cancel').addEventListener('click', () => { div.remove(); resolve(null); });
    });
  }`;

if (sacFnRegex.test(code)) {
    code = code.replace(sacFnRegex, newSacFn);
    changes.push('replace _sacEscolherEndereco function');
} else {
    console.warn('[WARN] _sacEscolherEndereco function not found via regex');
}

// ─────────────────────────────────────────────────────────────────
// 10. Fix duplicate ticket: add contacts, POST instead of updateTicket
// ─────────────────────────────────────────────────────────────────
applyReplace(
    'fix duplicateTicket: clone contacts',
    "          address: t.address || '',\n          contactName:",
    "          address: t.address || '',\n          contacts: t.contacts ? JSON.parse(JSON.stringify(t.contacts)) : [],\n          contactName:"
);
applyReplace(
    'fix duplicateTicket: clone occurrences+attachments',
    "          occurrences: t.occurrences || [],\n          attachments: t.attachments || [],",
    "          occurrences: t.occurrences ? JSON.parse(JSON.stringify(t.occurrences)) : [],\n          attachments: t.attachments ? JSON.parse(JSON.stringify(t.attachments)) : [],"
);
applyReplace(
    'fix duplicateTicket: POST instead of updateTicket',
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
          setTimeout(() => { SAC.openDetail(newTicket.id); }, 300);
      } catch (e) {
          console.error(e);
          showToast('Erro ao duplicar chamado', 'error');
      }`
);

// ─────────────────────────────────────────────────────────────────
// Write
// ─────────────────────────────────────────────────────────────────
fs.writeFileSync('frontend/sac.js', code, 'utf8');
console.log('\n\u2705 Patches applied:');
changes.forEach(c => console.log('  \u2022', c));
console.log('\nFile size:', require('fs').statSync('frontend/sac.js').size, 'bytes');
