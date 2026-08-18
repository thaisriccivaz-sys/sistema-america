const fs = require('fs');
let code = fs.readFileSync('frontend/sac.js', 'utf8');

// ──────────────────────────────────────────────────
// 1. Always prefix enderecos com OS number (remover isContract condicional)
// ──────────────────────────────────────────────────
code = code.replace(
    "label: isContract && o.numero_os ? `OS ${o.numero_os} - ${ender}` : ender,",
    "label: o.numero_os ? `OS ${o.numero_os} - ${ender}` : ender,"
);

// ──────────────────────────────────────────────────
// 2. Update the call to _sacEscolherEndereco no _sacProcessarResultadoBusca
//    de single return string → objeto {label, todos}
// ──────────────────────────────────────────────────
code = code.replace(
    `const labelSelecionado = labelsUnicos.length > 1
        ? await _sacEscolherEndereco(labelsUnicos, _clienteLimpo || clienteNome)
        : (labelsUnicos[0] || '');
        
      if (labelsUnicos.length > 1 && labelSelecionado === null) { 
          if (!isContract) { _wiz._osLinked = false; _wiz._protocolLocked = false; renderWizard(); }
          return; 
      }

      const selecionado = enderecosFormatados.find(e => e.label === labelSelecionado) || enderecosFormatados[0];
      const enderecoFinal = selecionado ? selecionado.original : '';`,
    `const resultadoEndereco = labelsUnicos.length > 1
        ? await _sacEscolherEndereco(labelsUnicos, _clienteLimpo || clienteNome, osList)
        : { label: labelsUnicos[0] || '', todos: false };
      
      const labelSelecionado = resultadoEndereco ? resultadoEndereco.label : null;
      const adicionarTodos   = resultadoEndereco ? resultadoEndereco.todos  : false;
        
      if (labelsUnicos.length > 1 && labelSelecionado === null) { 
          if (!isContract) { _wiz._osLinked = false; _wiz._protocolLocked = false; renderWizard(); }
          return; 
      }

      const selecionado = enderecosFormatados.find(e => e.label === labelSelecionado) || enderecosFormatados[0];
      const enderecoFinal = selecionado ? selecionado.original : '';`
);

// ──────────────────────────────────────────────────
// 3. Replace _sacEscolherEndereco function
// ──────────────────────────────────────────────────
const oldFn = `  async function _sacEscolherEndereco(enderecos, cliente) {
    return new Promise(resolve => {
      const div = document.createElement('div');
      div.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;';
      div.innerHTML = \`<div style="background:white;border-radius:12px;padding:24px;min-width:340px;max-width:90vw;box-shadow:0 8px 32px rgba(0,0,0,0.18);">
        <h3 style="margin:0 0 12px;font-size:1rem;color:#1e293b;">Mais de um endere\u00C3\u00A7o encontrado</h3>
        <div style="background:#f8fafc;border-radius:8px;padding:12px;margin-bottom:14px;border:1px solid #e2e8f0;">
          <div style="font-size:0.85rem;color:#1e293b;margin-bottom:4px;font-weight:600;">\${cliente}</div>
        </div>
        <p style="margin:0 0 10px;font-size:0.85rem;color:#475569;">Qual endere\u00C3\u00A7o deseja utilizar na ocorr\u00C3\u00AAncia?</p>
        <div id="_sac-ender-opts" style="display:flex;flex-direction:column;gap:8px;max-height:250px;overflow-y:auto;padding-right:4px;">
          \${enderecos.map((e,i)=>\`<button data-idx="\${i}" style="background:#fff;border:1.5px solid #e2e8f0;border-radius:8px;padding:10px 14px;font-size:0.85rem;cursor:pointer;text-align:left;font-weight:600;color:#1e293b;transition:all 0.15s;" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='#fff'">\u00F0\u009F\u0093\u008D \${e}</button>\`).join('')}
        </div>
        <button id="_sac-ender-cancel" style="margin-top:14px;background:#e2e8f0;border:none;border-radius:6px;padding:8px 18px;font-size:0.8rem;cursor:pointer;color:#475569;width:100%;font-weight:600;">Cancelar</button>
      </div>\`;
      document.body.appendChild(div);
      div.querySelectorAll('[data-idx]').forEach(btn => {
        btn.addEventListener('click', () => { div.remove(); resolve(enderecos[+btn.dataset.idx]); });
      });
      div.querySelector('#_sac-ender-cancel').addEventListener('click', () => { div.remove(); resolve(null); });
    });
  }`;

const newFn = `  async function _sacEscolherEndereco(enderecos, cliente, osList) {
    return new Promise(resolve => {
      const clienteLimpo = window._stripEmojis ? window._stripEmojis(cliente) : (cliente||'').replace(/^[^a-zA-Z0-9\\u00C0-\\u024F]+/, '').trim();
      const div = document.createElement('div');
      div.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;';
      const btnsHtml = enderecos.map((e,i) =>
        \`<button data-idx="\${i}" style="background:#fff;border:1.5px solid #e2e8f0;border-radius:8px;padding:10px 14px;font-size:0.82rem;cursor:pointer;text-align:left;font-weight:500;color:#1e293b;transition:all 0.15s;display:flex;align-items:flex-start;gap:8px;" onmouseover="this.style.background='#f1f5f9';this.style.borderColor='#3b82f6';" onmouseout="this.style.background='#fff';this.style.borderColor='#e2e8f0';"><span style='color:#ef4444;flex-shrink:0;'>\u{1F4CD}</span><span style='flex:1;line-height:1.4;'>\${e}</span></button>\`
      ).join('');
      div.innerHTML = \`
        <div style="background:white;border-radius:12px;padding:24px;min-width:340px;max-width:600px;width:90vw;box-shadow:0 8px 32px rgba(0,0,0,0.18);">
          <h3 style="margin:0 0 12px;font-size:1rem;color:#1e293b;">Mais de um endereço encontrado</h3>
          <div style="background:#f8fafc;border-radius:8px;padding:12px;margin-bottom:14px;border:1px solid #e2e8f0;">
            <div style="font-size:0.9rem;color:#1e293b;font-weight:700;">\${clienteLimpo}</div>
          </div>
          <p style="margin:0 0 10px;font-size:0.85rem;color:#475569;">Qual endereço deseja utilizar na ocorrência?</p>
          <div id="_sac-ender-opts" style="display:flex;flex-direction:column;gap:8px;max-height:280px;overflow-y:auto;padding-right:4px;margin-bottom:12px;">
            \${btnsHtml}
          </div>
          <div style="display:flex;gap:8px;">
            <button id="_sac-ender-todos" style="flex:1;background:#10b981;color:white;border:none;border-radius:6px;padding:9px 14px;font-size:0.82rem;cursor:pointer;font-weight:700;">✔ Adicionar Todos</button>
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

if (code.includes(oldFn)) {
    code = code.replace(oldFn, newFn);
    console.log('Function replaced');
} else {
    // Try to find it via a looser pattern
    const match = code.match(/  async function _sacEscolherEndereco\(enderecos, cliente\) \{[\s\S]*?\n  \}/);
    if (match) {
        code = code.replace(match[0], newFn);
        console.log('Function replaced via regex');
    } else {
        console.log('WARN: Function not found exactly – may need manual edit');
    }
}

fs.writeFileSync('frontend/sac.js', code, 'utf8');
console.log('Done');
