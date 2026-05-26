const fs = require('fs');
let code = fs.readFileSync('frontend/credenciamento.js', 'utf8');

// The replacement logic:
const trStart = '          return `\n          <tr>';
const searchHTML = `<td style="text-align:right; white-space:nowrap;">
                  <a href="/credenciamento-publico.html?token=\${cred.token}" target="_blank" class="btn btn-outline" style="padding:4px 8px; font-size:12px; margin-right:4px;" title="Testar / Visualizar Link">
                      <i class="ph ph-link"></i> Link
                  </a>
                  <button class="btn btn-outline" style="padding:4px 8px; font-size:12px; color:#dc2626; border-color:#fca5a5; background:#fff;" onclick="window.excluirCredenciamento('\${cred.id}')" title="Excluir">
                      <i class="ph ph-trash"></i>
                  </button>
              </td>
          </tr>\`;`;

const fixedHTML = `<td style="text-align:right; white-space:nowrap;">
                  <button class="btn btn-outline btn-sm" style="padding:4px 8px; font-size:12px; margin-right:4px;" onclick="toggleLogCredDetails(this, 'log-cred-det-\${cred.id}')" title="Ver Detalhes"><i class="ph ph-caret-down"></i></button>
                  <a href="/credenciamento-publico.html?token=\${cred.token}" target="_blank" class="btn btn-outline" style="padding:4px 8px; font-size:12px; margin-right:4px;" title="Testar / Visualizar Link">
                      <i class="ph ph-link"></i> Link
                  </a>
                  <button class="btn btn-outline" style="padding:4px 8px; font-size:12px; color:#dc2626; border-color:#fca5a5; background:#fff;" onclick="window.excluirCredenciamento('\${cred.id}')" title="Excluir">
                      <i class="ph ph-trash"></i>
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

if (code.includes(searchHTML)) {
    code = code.replace(searchHTML, fixedHTML);
    console.log("Replaced correctly!");
} else {
    console.log("HTML not found for replacement.");
    // Fallback: try removing carriage returns from search string
    let searchHTML2 = searchHTML.replace(/\r/g, '');
    let code2 = code.replace(/\r/g, '');
    if (code2.includes(searchHTML2)) {
        code = code.replace(searchHTML, fixedHTML);
        // Wait, if it didn't match before due to \r, replacing it without \r won't work either.
        // Let's do it with split/join on a unique string
        let parts = code.split('title="Excluir">');
        if (parts.length > 1) {
            let p1 = parts[0];
            let p2 = parts[1];
            p2 = p2.replace('</tr>`;', '</tr>\n          <tr id="log-cred-det-${cred.id}" style="display:none; background:#f8fafc;">\n              <td colspan="6" style="padding:15px; font-size:0.85rem; border-left:3px solid #16a34a;">\n                  <div style="display:flex; flex-wrap:wrap; gap:30px;">\n                      <div style="flex:1; min-width:250px; display:flex; flex-direction:column; gap:10px;">\n                          <div style="color:#64748b; font-weight:600; margin-bottom:4px;">Y"? Autoria do Credenciamento:</div>\n                          \n                          ${cred.solicitado_por_nome ? `\n                          <div style="display:flex; align-items:center; gap:8px;">\n                              <div style="width:30px; height:30px; border-radius:50%; background:#e2e8f0; display:flex; align-items:center; justify-content:center; overflow:hidden;">\n                                  ${cred.solicitado_por_foto ? `<img src="${cred.solicitado_por_foto}" style="width:100%; height:100%; object-fit:cover;">` : `<i class="ph ph-user" style="color:#64748b; font-size:1.1rem;"></i>`}\n                              </div>\n                              <div style="display:flex; flex-direction:column;">\n                                  <span style="font-weight:600; color:#334155; font-size:0.85rem;">${cred.solicitado_por_nome || \'Desconhecido\'}</span>\n                                  <span style="font-size:0.7rem; color:#64748b;">Solicitado por (Comercial)</span>\n                              </div>\n                          </div>` : \'\'}\n                          \n                          ${(cred.enviado_por_nome || (!cred.solicitado_por_nome && cred.status !== \'solicitado\')) ? `\n                          <div style="display:flex; align-items:center; gap:8px;">\n                              <div style="width:30px; height:30px; border-radius:50%; background:#dcfce7; display:flex; align-items:center; justify-content:center; overflow:hidden;">\n                                  ${cred.enviado_por_foto ? `<img src="${cred.enviado_por_foto}" style="width:100%; height:100%; object-fit:cover;">` : `<i class="ph ph-user" style="color:#166534; font-size:1.1rem;"></i>`}\n                              </div>\n                              <div style="display:flex; flex-direction:column;">\n                                  <span style="font-weight:600; color:#334155; font-size:0.85rem;">${cred.enviado_por_nome || \'Desconhecido\'}</span>\n                                  <span style="font-size:0.7rem; color:#166534;">Enviado por (Logística)</span>\n                              </div>\n                          </div>\n                          ` : \'\'}\n                      </div>\n                  </div>\n              </td>\n          </tr>`;');
            
            // Now add the button before the link
            p1 = p1.replace('<a href="/credenciamento-publico.html?token=${cred.token}" target="_blank" class="btn btn-outline" style="padding:4px 8px; font-size:12px; margin-right:4px;" title="Testar / Visualizar Link">', '<button class="btn btn-outline btn-sm" style="padding:4px 8px; font-size:12px; margin-right:4px;" onclick="toggleLogCredDetails(this, \'log-cred-det-${cred.id}\')" title="Ver Detalhes"><i class="ph ph-caret-down"></i></button>\n                  <a href="/credenciamento-publico.html?token=${cred.token}" target="_blank" class="btn btn-outline" style="padding:4px 8px; font-size:12px; margin-right:4px;" title="Testar / Visualizar Link">');
            
            code = p1 + 'title="Excluir">' + p2;
            console.log("Replaced via fallback!");
        }
    }
}

fs.writeFileSync('frontend/credenciamento.js', code);
