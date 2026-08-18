/**
 * patch_equip_todos.js
 * Adds "Adicionar Todos" button to _sacEscolherEquipamento modal.
 * Also:
 * - Strips emojis from client name in the modal header
 * - Improves layout to match address modal style
 */
const fs = require('fs');
let code = fs.readFileSync('frontend/sac.js', 'utf8');

// Find function boundaries
const fnStart = '  async function _sacEscolherEquipamento(prods, cliente, endereco) {\r\n    return new Promise(resolve => {';
const fnEnd   = "      div.querySelector('#_sac-equip-cancel').addEventListener('click', () => { div.remove(); resolve(null); });\r\n    });\r\n  }\r\n\r\n  function renderWizard()";

const si = code.indexOf(fnStart);
const ei = code.indexOf(fnEnd);

if (si === -1) { console.error('START not found'); process.exit(1); }
if (ei === -1) { console.error('END not found'); process.exit(1); }

const newFn = `  async function _sacEscolherEquipamento(prods, cliente, endereco) {
    return new Promise(resolve => {
      const clienteLimpo = window._stripEmojis ? window._stripEmojis(cliente) : (cliente||'').trim();
      const div = document.createElement('div');
      div.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;';
      const rowsHtml = prods.map((p,i) => {
          const m = p.match(/^.*?(\\d+)x/);
          const max = m ? parseInt(m[1]) : 1;
          const label = p.replace(/(\\d+)x\\s*/, '');
          if (max > 1) {
              return \`<div style="display:flex;gap:8px;align-items:center;background:#fff;border:1.5px solid #e2e8f0;border-radius:8px;padding:10px 14px;">
                  <div style="flex:1;font-size:0.82rem;font-weight:600;color:#1e293b;">\${p.replace(/(\\d+)x\\s*/, '')}</div>
                  <input type="number" id="_sac-equip-qtd-\${i}" min="1" max="\${max}" value="\${max}" style="width:60px;padding:4px;border:1px solid #cbd5e1;border-radius:4px;text-align:center;font-size:0.82rem;">
                  <button data-idx="\${i}" data-max="\${max}" class="_sac-add-one" style="background:#3b82f6;color:white;border:none;border-radius:4px;padding:6px 12px;cursor:pointer;font-weight:600;font-size:0.75rem;">Adicionar</button>
              </div>\`;
          } else {
              return \`<button data-idx="\${i}" data-max="1" class="_sac-add-one" style="background:#fff;border:1.5px solid #e2e8f0;border-radius:8px;padding:10px 14px;font-size:0.82rem;cursor:pointer;text-align:left;font-weight:500;color:#1e293b;transition:all 0.15s;" onmouseover="this.style.background='#f1f5f9';this.style.borderColor='#3b82f6';" onmouseout="this.style.background='#fff';this.style.borderColor='#e2e8f0';">\${p}</button>\`;
          }
      }).join('');
      div.innerHTML = \`
        <div style="background:white;border-radius:12px;padding:24px;min-width:340px;max-width:600px;width:90vw;box-shadow:0 8px 32px rgba(0,0,0,0.18);">
          <h3 style="margin:0 0 12px;font-size:1rem;color:#1e293b;">Mais de um equipamento encontrado</h3>
          <div style="background:#f8fafc;border-radius:8px;padding:12px;margin-bottom:14px;border:1px solid #e2e8f0;">
            <div style="font-size:0.9rem;color:#1e293b;font-weight:700;">\${clienteLimpo}</div>
            <div style="font-size:0.75rem;color:#64748b;margin-top:4px;display:flex;align-items:center;gap:4px;"><span style="color:#ef4444;">📍</span>\${endereco}</div>
          </div>
          <p style="margin:0 0 10px;font-size:0.85rem;color:#475569;">Qual equipamento deseja incluir na ocorrência?</p>
          <div id="_sac-equip-opts" style="display:flex;flex-direction:column;gap:8px;max-height:280px;overflow-y:auto;padding-right:4px;margin-bottom:12px;">
            \${rowsHtml}
          </div>
          <div style="display:flex;gap:8px;">
            <button id="_sac-equip-todos" style="flex:1;background:#10b981;color:white;border:none;border-radius:6px;padding:9px 14px;font-size:0.82rem;cursor:pointer;font-weight:700;">✔ Adicionar Todos</button>
            <button id="_sac-equip-cancel" style="flex:1;background:#e2e8f0;border:none;border-radius:6px;padding:9px 14px;font-size:0.82rem;cursor:pointer;color:#475569;font-weight:600;">Cancelar</button>
          </div>
        </div>\`;
      document.body.appendChild(div);

      // Individual add buttons
      div.querySelectorAll('._sac-add-one').forEach(btn => {
        btn.addEventListener('click', () => {
            const idx = +btn.dataset.idx;
            const max = +btn.dataset.max;
            let prodStr = prods[idx];
            if (max > 1) {
                const input = document.getElementById(\`_sac-equip-qtd-\${idx}\`);
                let val = parseInt(input.value);
                if (isNaN(val) || val < 1 || val > max) { alert('Quantidade inválida!'); return; }
                prodStr = prodStr.replace(/(\\d+)x\\s*/, \`\${val}x \`);
            }
            div.remove(); resolve(prodStr);
        });
      });

      // Adicionar Todos: collect all with current quantities
      div.querySelector('#_sac-equip-todos').addEventListener('click', () => {
          const allProds = prods.map((p, i) => {
              const m = p.match(/^.*?(\\d+)x/);
              const max = m ? parseInt(m[1]) : 1;
              if (max > 1) {
                  const input = document.getElementById(\`_sac-equip-qtd-\${i}\`);
                  const val = input ? (parseInt(input.value) || max) : max;
                  return p.replace(/(\\d+)x\\s*/, \`\${val}x \`);
              }
              return p;
          });
          div.remove(); resolve(allProds.join(' | '));
      });

      div.querySelector('#_sac-equip-cancel').addEventListener('click', () => { div.remove(); resolve(null); });
    });
  }

  function renderWizard()`;

code = code.substring(0, si) + newFn + code.substring(ei + fnEnd.length);

fs.writeFileSync('frontend/sac.js', code, 'utf8');
console.log('✅ _sacEscolherEquipamento rewritten with "Adicionar Todos"');
console.log('File size:', fs.statSync('frontend/sac.js').size);
const c2 = fs.readFileSync('frontend/sac.js', 'utf8');
console.log('Has _sac-equip-todos:', c2.includes('_sac-equip-todos'));
console.log('Has Adicionar Todos btn:', c2.includes('Adicionar Todos'));
console.log('Has allProds join:', c2.includes('allProds.join'));
