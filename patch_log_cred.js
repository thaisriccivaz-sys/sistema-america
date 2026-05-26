const fs = require('fs');
let code = fs.readFileSync('frontend/credenciamento.js', 'utf8');

// 1. Add toggleLogCredDetails if it doesn't exist
if (!code.includes('toggleLogCredDetails')) {
    code += `\nwindow.toggleLogCredDetails = function(btn, id) {
    const el = document.getElementById(id);
    if (!el) return;
    if (el.style.display === 'none') {
        el.style.display = 'table-row';
        btn.innerHTML = '<i class="ph ph-caret-up"></i>';
        btn.classList.replace('btn-outline', 'btn-secondary');
    } else {
        el.style.display = 'none';
        btn.innerHTML = '<i class="ph ph-caret-down"></i>';
        btn.classList.replace('btn-secondary', 'btn-outline');
    }
};\n`;
}

// 2. Replace the row rendering
const searchStr = `          return \`
          <tr>
              <td>
                  <b>\${cred.os ? cred.os + ' - ' : ''}\${cred.cliente_nome}</b><br>
                  <span style="font-size:0.8rem; color:#64748b;">\${cred.cliente_email}</span>
                  \${cred.endereco_instalacao ? \`<br><span style="font-size:0.75rem; color:#94a3b8;"><i class="ph ph-map-pin"></i> \${cred.endereco_instalacao}</span>\` : ''}
              </td>
              <td style="font-size:0.8rem; line-height:1.6;">\${colabsText}</td>
              <td style="font-size:0.8rem; line-height:1.6;">\${veicsText}</td>
              <td style="font-size:0.8rem; line-height:1.6;">\${licencasText}</td>
              <td style="font-size:0.85rem;">\${statusBadge}</td>
              <td style="text-align:right; white-space:nowrap;">
                  <a href="/credenciamento-publico.html?token=\${cred.token}" target="_blank" class="btn btn-outline" style="padding:4px 8px; font-size:12px; margin-right:4px;" title="Testar / Visualizar Link">
                      <i class="ph ph-link"></i> Link`;

const replaceStr = `          return \`
          <tr>
              <td>
                  <b>\${cred.os ? cred.os + ' - ' : ''}\${cred.cliente_nome}</b><br>
                  <span style="font-size:0.8rem; color:#64748b;">\${cred.cliente_email}</span>
                  \${cred.endereco_instalacao ? \`<br><span style="font-size:0.75rem; color:#94a3b8;"><i class="ph ph-map-pin"></i> \${cred.endereco_instalacao}</span>\` : ''}
              </td>
              <td style="font-size:0.8rem; line-height:1.6;">\${colabsText}</td>
              <td style="font-size:0.8rem; line-height:1.6;">\${veicsText}</td>
              <td style="font-size:0.8rem; line-height:1.6;">\${licencasText}</td>
              <td style="font-size:0.85rem;">\${statusBadge}</td>
              <td style="text-align:right; white-space:nowrap;">
                  <button class="btn btn-outline btn-sm" style="padding:4px 8px; font-size:12px; margin-right:4px;" onclick="toggleLogCredDetails(this, 'log-cred-det-\${cred.id}')" title="Ver Detalhes"><i class="ph ph-caret-down"></i></button>
                  <a href="/credenciamento-publico.html?token=\${cred.token}" target="_blank" class="btn btn-outline" style="padding:4px 8px; font-size:12px; margin-right:4px;" title="Testar / Visualizar Link">
                      <i class="ph ph-link"></i> Link`;

if (code.includes(searchStr)) {
    code = code.replace(searchStr, replaceStr);
} else {
    console.log("Search string not found!");
}

// 3. Add the hidden row
const searchStr2 = `                      <i class="ph ph-trash"></i>
                  </button>
              </td>
          </tr>\`;`;

const replaceStr2 = `                      <i class="ph ph-trash"></i>
                  </button>
              </td>
          </tr>
          <tr id="log-cred-det-\${cred.id}" style="display:none; background:#f8fafc;">
              <td colspan="6" style="padding:15px; font-size:0.85rem; border-left:3px solid #16a34a;">
                  <div style="display:flex; flex-wrap:wrap; gap:30px;">
                      <div style="flex:1; min-width:250px; display:flex; flex-direction:column; gap:10px;">
                          <div style="color:#64748b; font-weight:600; margin-bottom:4px;">Y"? Autoria do Credenciamento:</div>
                          
                          \${cred.solicitado_por_nome ? \`
                          <div style="display:flex; align-items:center; gap:8px;">
                              <div style="width:30px; height:30px; border-radius:50%; background:#e2e8f0; display:flex; align-items:center; justify-content:center; overflow:hidden;">
                                  \${cred.solicitado_por_foto ? \\\`<img src="\${cred.solicitado_por_foto}" style="width:100%; height:100%; object-fit:cover;">\\\` : \\\`<i class="ph ph-user" style="color:#64748b; font-size:1.1rem;"></i>\\\`}
                              </div>
                              <div style="display:flex; flex-direction:column;">
                                  <span style="font-weight:600; color:#334155; font-size:0.85rem;">\${cred.solicitado_por_nome || 'Desconhecido'}</span>
                                  <span style="font-size:0.7rem; color:#64748b;">Solicitado por (Comercial)</span>
                              </div>
                          </div>\` : ''}
                          
                          \${(cred.enviado_por_nome || (!cred.solicitado_por_nome && cred.status !== 'solicitado')) ? \`
                          <div style="display:flex; align-items:center; gap:8px;">
                              <div style="width:30px; height:30px; border-radius:50%; background:#dcfce7; display:flex; align-items:center; justify-content:center; overflow:hidden;">
                                  \${cred.enviado_por_foto ? \\\`<img src="\${cred.enviado_por_foto}" style="width:100%; height:100%; object-fit:cover;">\\\` : \\\`<i class="ph ph-user" style="color:#166534; font-size:1.1rem;"></i>\\\`}
                              </div>
                              <div style="display:flex; flex-direction:column;">
                                  <span style="font-weight:600; color:#334155; font-size:0.85rem;">\${cred.enviado_por_nome || 'Desconhecido'}</span>
                                  <span style="font-size:0.7rem; color:#166534;">Enviado por (Logística)</span>
                              </div>
                          </div>
                          \` : ''}
                      </div>
                  </div>
              </td>
          </tr>\`;`;

if (code.includes(searchStr2)) {
    code = code.replace(searchStr2, replaceStr2);
}

fs.writeFileSync('frontend/credenciamento.js', code);
console.log('Logistica patched');
