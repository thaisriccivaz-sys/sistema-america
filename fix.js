const fs = require('fs');
let code = fs.readFileSync('frontend/sac.js', 'utf8');

// 1. Address display
const addrTarget = '<i class="ph ph-map-pin" style="color:#3b82f6;"></i> ${t.equipment} ${t.address?\'· \'+t.address:\'\'}';
const addrReplacement = '<div style="font-weight:600;color:#1e293b;">${t.equipment}</div>\\n                ${t.address ? `<div style="display:flex;align-items:center;gap:6px;margin-top:4px;"><i class="ph ph-map-pin" style="color:#3b82f6;"></i> ${t.address}</div>` : \'\'}';
code = code.replace(addrTarget, addrReplacement);
code = code.replace('font-size:0.85rem;color:#64748b;margin-top:4px;display:flex;align-items:center;gap:6px;', 'font-size:0.85rem;color:#64748b;margin-top:4px;');

// 2. Hide occurrences in wizard
const occWizTarget = '<div style="margin-bottom:24px;border:1px dashed #cbd5e1;padding:12px;border-radius:8px;background:#f8fafc;">';
const occWizReplacement = '<div style="display:none;margin-bottom:24px;border:1px dashed #cbd5e1;padding:12px;border-radius:8px;background:#f8fafc;">';
code = code.replace(occWizTarget, occWizReplacement);

// 3. Hide occurrences in modal
const occModalTarget = '<div style="margin-top:24px;">\r\n                <div style="font-size:0.75rem;font-weight:700;color:#94a3b8;text-transform:uppercase;margin-bottom:8px;">Ocorrências (${t.occurrences.length})</div>';
const occModalTargetLF = '<div style="margin-top:24px;">\n                <div style="font-size:0.75rem;font-weight:700;color:#94a3b8;text-transform:uppercase;margin-bottom:8px;">Ocorrências (${t.occurrences.length})</div>';
const occModalReplacement = '<div style="display:none;margin-top:24px;">\n                <div style="font-size:0.75rem;font-weight:700;color:#94a3b8;text-transform:uppercase;margin-bottom:8px;">Ocorrências (${t.occurrences.length})</div>';
code = code.replace(occModalTarget, occModalReplacement).replace(occModalTargetLF, occModalReplacement);

// 4. Update equipment modal rendering
const equipMapTarget = '${prods.map((p,i)=>`<button data-idx="${i}" style="background:#fff;border:1.5px solid #e2e8f0;border-radius:8px;padding:10px 14px;font-size:0.85rem;cursor:pointer;text-align:left;font-weight:600;color:#1e293b;transition:all 0.15s;" onmouseover="this.style.background=\\\'#f1f5f9\\\'" onmouseout="this.style.background=\\\'#fff\\\'">${p}</button>`).join(\'\')}';
const equipMapReplacement = `\${prods.map((p,i)=>{
              const m = p.match(/^.*?(\\d+)x/);
              const max = m ? parseInt(m[1]) : 1;
              if (max > 1) {
                  return \`<div style="display:flex;gap:8px;align-items:center;background:#fff;border:1.5px solid #e2e8f0;border-radius:8px;padding:10px 14px;">
                      <div style="flex:1;font-size:0.85rem;font-weight:600;color:#1e293b;">\${p.replace(/(\\d+)x\\s*/, '')}</div>
                      <input type="number" id="_sac-equip-qtd-\${i}" min="1" max="\${max}" value="\${max}" style="width:60px;padding:4px;border:1px solid #cbd5e1;border-radius:4px;text-align:center;">
                      <button data-idx="\${i}" data-max="\${max}" style="background:#3b82f6;color:white;border:none;border-radius:4px;padding:6px 12px;cursor:pointer;font-weight:600;font-size:0.75rem;">Adicionar</button>
                  </div>\`;
              } else {
                  return \`<button data-idx="\${i}" data-max="1" style="background:#fff;border:1.5px solid #e2e8f0;border-radius:8px;padding:10px 14px;font-size:0.85rem;cursor:pointer;text-align:left;font-weight:600;color:#1e293b;transition:all 0.15s;" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='#fff'">\${p}</button>\`;
              }
          }).join('')}`;
code = code.replace(equipMapTarget, equipMapReplacement);

// 5. Update equipment click listener
const btnTarget = 'btn.addEventListener(\'click\', () => { div.remove(); resolve(prods[+btn.dataset.idx]); });';
const btnReplacement = `btn.addEventListener('click', () => { 
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
        });`;
code = code.replace(btnTarget, btnReplacement);

// 6. Update equipment logic to show modal if >1 quantity
const equipFinalTarget = 'const equipFinal = prodsUnicos.length > 1\r\n        ? await _sacEscolherEquipamento(prodsUnicos, _clienteLimpo || os.cliente || \'\', enderecoFinal)\r\n        : (prodsUnicos[0] || _parseProds(os)[0]?.desc || \'\');';
const equipFinalTargetLF = 'const equipFinal = prodsUnicos.length > 1\n        ? await _sacEscolherEquipamento(prodsUnicos, _clienteLimpo || os.cliente || \'\', enderecoFinal)\n        : (prodsUnicos[0] || _parseProds(os)[0]?.desc || \'\');';
const equipFinalReplacement = `const precisaModal = prodsUnicos.length > 1 || (prodsUnicos.length === 1 && (() => { const m = prodsUnicos[0].match(/(\\d+)x /); return m && parseInt(m[1]) > 1; })());
      const equipFinal = precisaModal
        ? await _sacEscolherEquipamento(prodsUnicos, _clienteLimpo || os.cliente || '', enderecoFinal)
        : (prodsUnicos[0] || _parseProds(os)[0]?.desc || '');`;
code = code.replace(equipFinalTarget, equipFinalReplacement).replace(equipFinalTargetLF, equipFinalReplacement);

fs.writeFileSync('frontend/sac.js', code, 'utf8');
console.log('Done!');
