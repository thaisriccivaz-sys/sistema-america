const fs = require('fs');
const path = 'frontend/credenciamento.js';
let content = fs.readFileSync(path, 'utf8');

const regexActions = /<td style="text-align:right; white-space:nowrap;">\s*\$\{cred\.token \? \`<button class="btn btn-outline btn-sm" style="padding:4px 8px; font-size:12px; margin-right:4px;" onclick="window\.reenviarEmailCredenciamento\('\$\{cred\.id\}'\)"><i class="ph ph-envelope-simple"><\/i> Reenviar<\/button>\` : ''\}\s*<button class="btn btn-outline" style="padding:4px 8px; font-size:12px; color:#dc2626; border-color:#fca5a5; background:#fff;" onclick="window\.excluirCredenciamento\('\$\{cred\.id\}'\)" title="Excluir">\s*<i class="ph ph-trash"><\/i>\s*<\/button>\s*<\/td>\s*<\/tr>/g;

const replacementActions = `<td style="text-align:right; white-space:nowrap;">
                <button class="btn btn-outline btn-sm" style="padding:4px 8px; font-size:12px; margin-right:4px;" onclick="toggleCredDetails(this, 'log-cred-det-\${cred.id}')" title="Ver Detalhes"><i class="ph ph-caret-down"></i></button>
                \${cred.token ? \`<button class="btn btn-outline btn-sm" style="padding:4px 8px; font-size:12px; margin-right:4px;" onclick="window.reenviarEmailCredenciamento('\${cred.id}')"><i class="ph ph-envelope-simple"></i> Reenviar</button>\` : ''}
            </td>
        </tr>
        <tr id="log-cred-det-\${cred.id}" style="display:none; background:#f8fafc;">
            <td colspan="8" style="padding:15px; font-size:0.85rem; border-left:3px solid #16a34a;">
                <div style="display:flex; flex-wrap:wrap; gap:30px;">
                    <div style="flex:1; min-width:250px;">
                        <div style="color:#64748b; font-weight:600; margin-bottom:4px;">📄 Documentos Solicitados:</div>
                        <div style="color:#334155;">\${docs.length ? docs.map(d => window.docNames ? window.docNames[d] || d : d).join(' - ') : '<span style="color:#94a3b8;font-style:italic;">Nenhum documento específico</span>'}</div>
                    </div>
                </div>
                \${cred.observacoes ? \`<div style="margin-top:15px; padding-top:10px; border-top:1px solid #e2e8f0;"><span style="color:#64748b; font-weight:600;">📝 Observações:</span> <span style="color:#475569;">\${cred.observacoes}</span></div>\` : ''}
                
                <div style="margin-top:15px; padding-top:15px; border-top:1px solid #e2e8f0; display:flex; flex-wrap:wrap; gap:30px;">
                    <div style="flex:1; min-width:250px;">
                        <div style="color:#eab308; font-weight:600; margin-bottom:8px;">Solicitação:</div>
                        <div style="display:flex; align-items:center; gap:10px;">
                            <div style="width:32px; height:32px; border-radius:50%; background:#fef08a; display:flex; align-items:center; justify-content:center; color:#854d0e; font-weight:700;">
                                \${(cred.sol_nome_usuario || cred.sol_username || cred.solicitado_por_nome || 'UC').substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                                <div style="font-weight:600; color:#334155;">\${cred.sol_nome_usuario || cred.sol_username || cred.solicitado_por_nome || 'Usuário Comercial'}</div>
                                <div style="font-size:0.75rem; color:#94a3b8;"><i class="ph ph-calendar-blank"></i> \${cred.created_at ? (window.formatUTCDate ? window.formatUTCDate(cred.created_at) : cred.created_at) : 'Data não registrada'}</div>
                            </div>
                        </div>
                    </div>
                    
                    <div style="flex:1; min-width:250px;">
                        <div style="color:#3b82f6; font-weight:600; margin-bottom:8px;">Envio do Credenciamento:</div>
                        <div style="display:flex; align-items:center; gap:10px;">
                            <div style="width:32px; height:32px; border-radius:50%; background:#bfdbfe; display:flex; align-items:center; justify-content:center; color:#1e40af; font-weight:700;">
                                \${(cred.env_nome_usuario || cred.env_username || cred.enviado_por_nome || 'UL').substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                                <div style="font-weight:600; color:#334155;">\${cred.env_nome_usuario || cred.env_username || cred.enviado_por_nome || 'Usuário Logística'}</div>
                                <div style="font-size:0.75rem; color:#94a3b8;"><i class="ph ph-calendar-blank"></i> \${cred.enviado_em ? (window.formatUTCDate ? window.formatUTCDate(cred.enviado_em) : cred.enviado_em) : 'Data não registrada'}</div>
                            </div>
                        </div>
                    </div>
                    
                    <div style="flex:1; min-width:250px;">
                        <div style="color:#16a34a; font-weight:600; margin-bottom:8px;">Acesso do Cliente:</div>
                        \${cred.acessado_em ? \`<div style="color:#16a34a; font-size:0.85rem;"><i class="ph ph-check-circle"></i> Acessado em \${window.formatUTCDate ? window.formatUTCDate(cred.acessado_em) : cred.acessado_em}</div>\` : '<div style="color:#94a3b8; font-size:0.85rem; font-style:italic;">Cliente ainda não abriu o link.</div>'}
                    </div>
                </div>
            </td>
        </tr>`;

content = content.replace(regexActions, replacementActions);
fs.writeFileSync(path, content, 'utf8');
console.log("Restored details row and removed excluir button in credenciamento.js");