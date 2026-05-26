const fs = require('fs');

let code = fs.readFileSync('frontend/comercial_credenciamento.js', 'utf8');

const autoriaHtml = `
                    <div style="flex:1; min-width:250px; display:flex; flex-direction:column; gap:10px;">
                        <div style="color:#64748b; font-weight:600; margin-bottom:4px;">Y"? Autoria do Credenciamento:</div>
                        
                        <div style="display:flex; align-items:center; gap:8px;">
                            <div style="width:30px; height:30px; border-radius:50%; background:#e2e8f0; display:flex; align-items:center; justify-content:center; overflow:hidden;">
                                \${cred.solicitado_por_foto ? \`<img src="\${cred.solicitado_por_foto}" style="width:100%; height:100%; object-fit:cover;">\` : \`<i class="ph ph-user" style="color:#64748b; font-size:1.1rem;"></i>\`}
                            </div>
                            <div style="display:flex; flex-direction:column;">
                                <span style="font-weight:600; color:#334155; font-size:0.85rem;">\${cred.solicitado_por_nome || 'Desconhecido'}</span>
                                <span style="font-size:0.7rem; color:#64748b;">Solicitado por (Comercial)</span>
                            </div>
                        </div>
                        
                        \${cred.status === 'enviado' ? \`
                        <div style="display:flex; align-items:center; gap:8px;">
                            <div style="width:30px; height:30px; border-radius:50%; background:#dcfce7; display:flex; align-items:center; justify-content:center; overflow:hidden;">
                                \${cred.enviado_por_foto ? \`<img src="\${cred.enviado_por_foto}" style="width:100%; height:100%; object-fit:cover;">\` : \`<i class="ph ph-user" style="color:#166534; font-size:1.1rem;"></i>\`}
                            </div>
                            <div style="display:flex; flex-direction:column;">
                                <span style="font-weight:600; color:#334155; font-size:0.85rem;">\${cred.enviado_por_nome || 'Desconhecido'}</span>
                                <span style="font-size:0.7rem; color:#166534;">Enviado por (Logística)</span>
                            </div>
                        </div>
                        \` : ''}
                    </div>
`;

if (!code.includes('Autoria do Credenciamento')) {
    code = code.replace(
        '<div style="color:#334155; line-height:1.6;">${licsFormatted}</div>\n                      </div>\n                  </div>',
        `<div style="color:#334155; line-height:1.6;">\${licsFormatted}</div>\n                      </div>\n${autoriaHtml}\n                  </div>`
    );
    fs.writeFileSync('frontend/comercial_credenciamento.js', code);
    console.log('Comercial patched');
}
