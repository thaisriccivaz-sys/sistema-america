const fs = require('fs');
let code = fs.readFileSync('frontend/sac.js', 'utf8');

// 1. openWizard binding
code = code.replace(
`  function openWizard() {
    _wiz = { step:1, protocol: nextProtocol(), osNumber:'', _protocolLocked:false, _osLinked:false, clientName:'', cnpjCpf:'', equipment:'', address:'', contactName:'', contactPhone:'', contactEmail:'', channel:'WhatsApp', typeKey:'manutencao', occList:[], currentOcc: (OCCURRENCES_BY_TYPE.manutencao||[])[0]||'', currentOccNote:'', description:'', attachments:[] };`,
`  function openWizard() {
    if(typeof SAC.bindUploadEvents === 'function') SAC.bindUploadEvents();
    _wiz = { step:1, protocol: nextProtocol(), osNumber:'', _protocolLocked:false, _osLinked:false, clientName:'', cnpjCpf:'', equipment:'', address:'', contactName:'', contactPhone:'', contactEmail:'', channel:'WhatsApp', typeKey:'manutencao', occList:[], currentOcc: (OCCURRENCES_BY_TYPE.manutencao||[])[0]||'', currentOccNote:'', description:'', attachments:[] };`
);

// 2. Wizard Description height
code = code.replace(
`<textarea rows="3" placeholder="Descreva o problema ou solicitação com detalhes..." oninput="_sacWiz('description',this.value)" style="resize:vertical;">\${_wiz.description}</textarea>`,
`<textarea rows="6" placeholder="Descreva o problema ou solicitação com detalhes..." oninput="_sacWiz('description',this.value)" style="resize:vertical;">\${_wiz.description}</textarea>`
);

// 3. Nome do Contato -> CONTATO DE INSTALAÇÃO
code = code.replace(
`<label>Nome do Contato <span style="color:#dc2626">*</span></label>`,
`<label>CONTATO DE INSTALAÇÃO <span style="color:#dc2626">*</span></label>`
);

// modal detail display "Contato:" -> "Contato de Instalação:"
const targetContato = `<div><strong>Contato:</strong> \${t.contactName||'—'} \${t.contactPhone?'· '+t.contactPhone:''}</div>`;
const replaceContato = `<div><strong>Contato de Instalação:</strong> \${t.contactName||'—'} \${t.contactPhone?'· '+t.contactPhone:''}</div>`;
code = code.replace(targetContato, replaceContato);

// 4. Limite 15 chars creator name
const creatorOld = `                    creatorInfo = \`<div style="display:flex;align-items:center;gap:8px;margin-left:auto;background:#f8fafc;padding:4px 12px;border-radius:20px;border:1px solid #e2e8f0;">
                        <span style="font-size:0.7rem;color:#64748b;font-weight:600;text-transform:uppercase;">Aberto por</span>
                        \${cPhoto ? \`<img src="\${cPhoto}" style="width:22px;height:22px;border-radius:50%;object-fit:cover;">\` : \`<div style="width:22px;height:22px;border-radius:50%;background:#e2e8f0;display:flex;align-items:center;justify-content:center;font-size:0.6rem;font-weight:bold;color:#475569;">\${cName.charAt(0).toUpperCase()}</div>\`}
                        <span style="font-size:0.8rem;font-weight:600;color:#1e293b;">\${cName}</span>
                    </div>\`;`;

const creatorOldR = creatorOld.replace(/\n/g, '\r\n');
const creatorNew = `                    const cNameTrunc = cName.length > 15 ? cName.substring(0, 15) + '...' : cName;
                    creatorInfo = \`<div style="display:flex;align-items:center;gap:8px;margin-left:auto;background:#f8fafc;padding:4px 12px;border-radius:20px;border:1px solid #e2e8f0;" title="\${cName}">
                        <span style="font-size:0.7rem;color:#64748b;font-weight:600;text-transform:uppercase;">Aberto por</span>
                        \${cPhoto ? \`<img src="\${cPhoto}" style="width:22px;height:22px;border-radius:50%;object-fit:cover;">\` : \`<div style="width:22px;height:22px;border-radius:50%;background:#e2e8f0;display:flex;align-items:center;justify-content:center;font-size:0.6rem;font-weight:bold;color:#475569;">\${cName.charAt(0).toUpperCase()}</div>\`}
                        <span style="font-size:0.8rem;font-weight:600;color:#1e293b;">\${cNameTrunc}</span>
                    </div>\`;`;

if(code.includes(creatorOld)) code = code.replace(creatorOld, creatorNew);
else if(code.includes(creatorOldR)) code = code.replace(creatorOldR, creatorNew);

// 5. Mostrar foto de usuario atribuido
const assignedOld = `<span style="font-size:0.75rem;color:#64748b;">Responsável:</span>
                            <select style="padding:4px 8px;border:1px solid #cbd5e1;border-radius:4px;font-size:0.75rem;background:#fff;" onchange="SAC.changeTaskAssignment('\${key}', this.value)" \${disabledAttr}>`;
const assignedOldR = assignedOld.replace(/\n/g, '\r\n');

const assignedNew = `<span style="font-size:0.75rem;color:#64748b;">Responsável:</span>
                            \${(() => {
                                const assignedUser = (window._sacUsersList||[]).find(u => {
                                    const val = u.username || u.login || u.email || (u.nome || '').toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').replace(/\\s+/g, '.');
                                    return val === task.assignedTo;
                                });
                                const photoUrl = task.assignedToPhoto || (assignedUser ? (assignedUser.foto_colaborador || '') : '');
                                return photoUrl ? \`<img src="\${photoUrl}" style="width:24px;height:24px;border-radius:50%;object-fit:cover;border:1px solid #cbd5e1;flex-shrink:0;">\` : '';
                            })()}
                            <select style="padding:4px 8px;border:1px solid #cbd5e1;border-radius:4px;font-size:0.75rem;background:#fff;" onchange="SAC.changeTaskAssignment('\${key}', this.value)" \${disabledAttr}>`;

if(code.includes(assignedOld)) code = code.replace(assignedOld, assignedNew);
else if(code.includes(assignedOldR)) code = code.replace(assignedOldR, assignedNew);

fs.writeFileSync('frontend/sac.js', code, 'utf8');
console.log('done fix8');
