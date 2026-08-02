const fs = require('fs');
let code = fs.readFileSync('frontend/sac.js', 'utf8');
const lines = code.split('\n');

const startIdx = lines.findIndex(l => l.includes('function renderDetailModal() {'));
const endIdx = lines.findIndex(l => l.includes('function renderModalCusto(t) {'));

if (startIdx === -1 || endIdx === -1) {
  console.log('Not found');
  process.exit(1);
}

const replacement = `  function renderDetailModal() {
    const t = _selectedTicket;
    if (!t) return;
    const ov = document.getElementById('sac-modal-overlay');
    const mc = document.getElementById('sac-modal-container');
    ov.style.display = 'block';
    mc.style.display = 'flex';

    const stage  = PIPELINE_STAGES.find(s=>s.id===t.stage)||{name:t.stage,color:'#64748b'};
    const type   = TICKET_TYPES[t.typeKey]||{name:t.typeKey,icon:'?',sla:48};
    const sla    = getSLADetails(t);
    const slaColor = sla.labelColor || (sla.status === 'danger' ? '#dc2626' : sla.status === 'warning' ? '#d97706' : '#15803d');
    const slaConsumedPct = sla.consumedPct !== undefined ? sla.consumedPct : Math.min(100, Math.max(0, 100 - sla.pct));
    const slaBarColor = sla.barColor || slaColor;

    const occOpts = (OCCURRENCES_BY_TYPE[t.typeKey]||[]).map(o=>\`<option value="\${o}">\${o}</option>\`).join('');
    const stageOpts = PIPELINE_STAGES.filter(s => s.id !== 'respondido' || s.id === t.stage).map(s=>\`<option value="\${s.id}" \${s.id===t.stage?'selected':''}>\${s.name}</option>\`).join('');

    const canEditAssignment = (ticket, taskLabel) => {
      const cUser = currentUsername();
      let cUserId = null, isAdmin = false;
      try {
        const u = JSON.parse(localStorage.getItem('erp_user'));
        if (u) {
          cUserId = String(u.id);
          isAdmin = (u.perfil === 'Admin' || u.perfil === 'Administrador' || String(u.grupo_permissao_id) === '1' || u.departamento === 'Processos');
        }
      } catch(e) {}
      if (isAdmin) return true;
      if (ticket.timeline && ticket.timeline.length > 0 && ticket.timeline[0].user === cUser) return true;
      const deptNorm = (taskLabel||'').normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase().trim();
      const deptObj = _globalDepartamentos.find(d => {
          const dNorm = (d.nome||'').normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase().trim();
          return dNorm.includes(deptNorm) || deptNorm.includes(dNorm);
      });
      if (deptObj) {
          const gestorId = deptObj.responsavel_id ? String(deptObj.responsavel_id) : null;
          const gestorNome = deptObj.responsavel_nome ? String(deptObj.responsavel_nome) : null;
          if ((gestorId && (gestorId === cUserId || gestorId === cUser)) || (gestorNome && gestorNome === cUser)) return true;
      }
      return false;
    };

    const allTasks = [
      t.logisticsTask && { label:'Logística', task:t.logisticsTask, key:'logisticsTask' },
      t.commercialTask && { label:'Comercial', task:t.commercialTask, key:'commercialTask' },
      t.financialTask && { label:'Financeiro', task:t.financialTask, key:'financialTask' }
    ].filter(Boolean);

    mc.innerHTML = \`
    <div class="sac-modal sac-animated" id="sac-modal-dropzone" style="width:100vw;max-width:1100px;margin:20px auto;border-radius:12px;background:#fff;display:flex;flex-direction:column;position:relative;box-shadow:0 10px 25px rgba(0,0,0,0.1);height:calc(100vh - 40px);max-height:900px;overflow:hidden;" onclick="event.stopPropagation()">
      <div style="padding:16px 24px;border-bottom:1px solid #f1f5f9;display:flex;justify-content:flex-end;">
        <button onclick="SAC.closeModal()" style="background:none;border:none;font-size:1.4rem;cursor:pointer;color:#94a3b8;padding:4px;line-height:1;">✕</button>
      </div>

      <div style="flex:1;overflow-y:auto;padding:24px;display:grid;grid-template-columns:1fr 400px;gap:40px;" id="sac-modal-body">
        
        <!-- COLUNA ESQUERDA -->
        <div style="display:flex;flex-direction:column;">
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                <span style="font-family:monospace;font-weight:800;font-size:1rem;color:#f97316;">Nº \${t.protocol}</span>
                <span class="sac-tag" style="background:\${stage.color}18;color:\${stage.color};">\${stage.name}</span>
                <span class="sac-tag" style="background:#e0e7ff;color:#4338ca;"><i class="ph \${type.icon}"></i> \${type.name}</span>
                <span class="sac-tag" style="background:\${sla.status==='danger'?'#fee2e2':sla.status==='warning'?'#fef9c3':'#dcfce7'};color:\${sla.status==='danger'?'#dc2626':sla.status==='warning'?'#d97706':'#15803d'};">\${sla.label}</span>
            </div>
            <div style="margin-top: 8px; width: 100%; max-width:320px;">
                <div class="sac-sla-bar" style="height: 6px;"><div class="sac-sla-fill" style="width:\${slaConsumedPct}%;background:\${slaBarColor};transition:width 0.3s;"></div></div>
            </div>
            
            <h2 style="margin:16px 0 0;font-size:1.25rem;color:#1e293b;">\${t.clientName}</h2>
            <div style="font-size:0.85rem;color:#64748b;margin-top:4px;display:flex;align-items:center;gap:6px;">
                <i class="ph ph-map-pin" style="color:#3b82f6;"></i> \${t.equipment} \${t.address?'· '+t.address:''}
            </div>

            <div style="display:flex;align-items:center;gap:8px;margin-top:20px;">
                <span style="font-size:0.75rem;font-weight:700;color:#94a3b8;text-transform:uppercase;">MOVER PARA:</span>
                <select style="padding:6px 12px;border:1.5px solid #e2e8f0;border-radius:6px;font-size:0.85rem;outline:none;cursor:pointer;background:#fff;" onchange="SAC.changeStageFromModal(this.value)" \${!canMoveTicket(t) ? 'disabled title="Você só pode mover chamados abertos por você."' : ''}>\${stageOpts}</select>
            </div>

            <div style="margin-top:24px;">
                <div style="font-size:0.75rem;font-weight:700;color:#94a3b8;text-transform:uppercase;margin-bottom:8px;">Próximos Passos</div>
                <div style="background:#f8fafc;border-radius:8px;padding:12px;font-size:0.85rem;color:#475569;border:1px solid #e2e8f0;white-space:pre-wrap;">\${t.nextSteps||'Nenhum próximo passo registrado.'}</div>
            </div>

            <div style="margin-top:24px;">
                <div style="font-size:0.75rem;font-weight:700;color:#94a3b8;text-transform:uppercase;margin-bottom:8px;">Descrição</div>
                <div style="background:#f8fafc;border-radius:8px;padding:12px;font-size:0.85rem;color:#475569;border:1px solid #e2e8f0;white-space:pre-wrap;">\${t.description||'Nenhuma descrição informada.'}</div>
            </div>

            \${allTasks.length ? \`
            <div style="margin-top:24px;">
                <div style="font-size:0.75rem;font-weight:700;color:#94a3b8;text-transform:uppercase;margin-bottom:8px;">Tarefas Setoriais</div>
                \${allTasks.map(({label,task,key}) => {
                    const canEdit = canEditAssignment(t, label);
                    const disabledAttr = canEdit ? '' : 'disabled title="Apenas o criador ou gestor podem alterar a atribuição"';
                    return \`
                    <div style="background:\${task.isCompleted?'#f0fdf4':'#fffbeb'};border:1.5px solid \${task.isCompleted?'#86efac':'#fde68a'};border-radius:8px;padding:12px;margin-bottom:8px;">
                        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
                            <i class="ph ph-\${task.isCompleted?'check-circle':'clock'}" style="color:\${task.isCompleted?'#15803d':'#d97706'};font-size:1rem;"></i>
                            <strong style="font-size:0.85rem;color:#1e293b;">\${label}:</strong>
                            <span style="font-size:0.8rem;color:#475569;">\${task.name}</span>
                        </div>
                        <div style="display:flex;align-items:center;gap:8px;">
                            <span style="font-size:0.75rem;color:#64748b;">Responsável:</span>
                            <select style="padding:4px 8px;border:1px solid #cbd5e1;border-radius:4px;font-size:0.75rem;background:#fff;" onchange="SAC.changeTaskAssignment('\${key}', this.value)" \${disabledAttr}>
                                <option value="">Sem atribuição</option>
                                \${(window._sacUsersList||[]).map(u=>\`<option value="\${u}" \${u===task.assignedTo?'selected':''}>\${u}</option>\`).join('')}
                            </select>
                        </div>
                    </div>\`;
                }).join('')}
            </div>\` : ''}

            <div style="margin-top:24px;">
                <div style="font-size:0.75rem;font-weight:700;color:#94a3b8;text-transform:uppercase;margin-bottom:8px;">Ocorrências (\${t.occurrences.length})</div>
                \${t.occurrences.map((o,i)=>\`
                <div style="background:#fff;border-radius:8px;padding:10px 12px;margin-bottom:6px;border:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">
                <div style="flex:1;">
                    <div style="font-weight:700;font-size:0.85rem;color:#1e293b;">\${o.name}</div>
                    \${o.note?\`<div style="font-size:0.78rem;color:#64748b;margin-top:2px;">\${o.note}</div>\` : ''}
                </div>
                \${t.occurrences.length>1?\`<button class="sac-btn sac-btn-danger" style="padding:3px 8px;font-size:0.72rem;" onclick="SAC.removeOccurrence(\${i})"><i class="ph ph-trash"></i></button>\`:''}
                </div>\`).join('')}
                \${!['concluido','encerrado'].includes(t.stage)?\`
                <div style="background:#f8fafc;border:1px dashed #cbd5e1;border-radius:8px;padding:12px;margin-top:8px;">
                <div style="font-size:0.75rem;font-weight:700;color:#64748b;margin-bottom:6px;">Adicionar Ocorrência</div>
                <select id="modal-occ-select" style="width:100%;padding:7px 10px;border:1px solid #e2e8f0;border-radius:6px;font-size:0.83rem;margin-bottom:6px;">\${occOpts}</select>
                <textarea id="modal-occ-note" rows="2" placeholder="Observação sobre a ocorrência..." style="width:100%;padding:7px 10px;border:1px solid #e2e8f0;border-radius:6px;font-size:0.83rem;outline:none;box-sizing:border-box;resize:vertical;margin-bottom:6px;"></textarea>
                <button class="sac-btn sac-btn-secondary" onclick="SAC.addOccurrenceFromModal()"><i class="ph ph-plus"></i> Adicionar</button>
                </div>\`:''}
            </div>
        </div>

        <!-- COLUNA DIREITA -->
        <div style="display:flex;flex-direction:column;">
            
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
                <div style="font-size:0.75rem;font-weight:700;color:#94a3b8;text-transform:uppercase;">Dados da OS</div>
                <div style="display:flex;gap:6px;">
                    <button class="sac-btn" style="background:#fee2e2;color:#dc2626;padding:4px 10px;font-size:0.75rem;border:1px solid #fecaca;" onclick="SAC.deleteTicket('\${t.id}')"><i class="ph ph-trash"></i> Excluir OS</button>
                    <button class="sac-btn" style="background:#c4b5fd;color:#5b21b6;padding:4px 10px;font-size:0.75rem;border:1px solid #a78bfa;" onclick="SAC.openCustosModal()"><i class="ph ph-currency-dollar"></i> Custos</button>
                </div>
            </div>
            
            <div style="font-size:0.85rem;color:#1e293b;line-height:1.8;margin-bottom:24px;">
                <div><strong>Abertura:</strong> \${formatDate(t.openDate)}</div>
                \${t.closeDate?\`<div><strong>Encerramento:</strong> \${formatDate(t.closeDate)}</div>\`:''}
                <div><strong>Nº OS Relacionada:</strong> \${t.osNumber||'—'}</div>
                <div><strong>Canal:</strong> \${t.channel||'—'}</div>
                <div><strong>Nº Contrato:</strong> \${t.cnpjCpf||'—'}</div>
                <div><strong>Contato:</strong> \${t.contactName||'—'} \${t.contactPhone?'· '+t.contactPhone:''}</div>
                \${t.contactEmail?\`<div><strong>E-mail:</strong> \${t.contactEmail}</div>\`:''}
            </div>

            <!-- COMENTÁRIOS / HISTÓRICO -->
            <div style="font-size:0.75rem;font-weight:700;color:#94a3b8;text-transform:uppercase;margin-bottom:8px;">Comentários</div>
            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;display:flex;flex-direction:column;flex:1;min-height:300px;margin-bottom:24px;">
                <div style="flex:1;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:8px;" id="sac-comments-list">
                    \${(() => {
                        const stageColors = {};
                        if (typeof PIPELINE_STAGES !== 'undefined') PIPELINE_STAGES.forEach(s => stageColors[s.id] = s.color);
                        const unified = [
                            ...(t.comments || []).map(c => ({ type: 'comment', time: c.time, user: c.user, text: c.text })),
                            ...(t.timeline || []).map(l => ({ type: 'timeline', time: l.time, user: l.user, stage: l.stage, notes: l.notes }))
                        ].sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
                        if (!unified.length) return '<div style="color:#94a3b8;font-size:0.8rem;text-align:center;padding:20px;">Nenhum registro.</div>';
                        return unified.map(item => {
                            if (item.type === 'comment') {
                                return \`<div style="background:#fff;border:1px solid #e2e8f0;border-radius:6px;padding:8px;">
                                <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
                                    <strong style="font-size:0.75rem;color:#1e293b;">\${item.user || 'Desconhecido'}</strong>
                                    <span style="font-size:0.65rem;color:#94a3b8;">\${formatDate(item.time)}</span>
                                </div>
                                <div style="font-size:0.8rem;color:#475569;white-space:pre-wrap;">\${item.text}</div>
                                </div>\`;
                            } else {
                                const stageName = (typeof PIPELINE_STAGES !== 'undefined' ? (PIPELINE_STAGES.find(s=>s.id===item.stage)?.name||item.stage) : item.stage);
                                const sColor = stageColors[item.stage] || '#475569';
                                return \`<div style="background:#f1f5f9;border-left:3px solid \${sColor};border-radius:0 6px 6px 0;padding:6px 10px;">
                                <div style="display:flex;justify-content:space-between;align-items:center;">
                                    <strong style="font-size:0.7rem;color:\${sColor};text-transform:uppercase;">\${stageName}</strong>
                                    <span style="font-size:0.65rem;color:#94a3b8;">\${formatDate(item.time)}</span>
                                </div>
                                \${item.notes ? \`<div style="font-size:0.75rem;color:#475569;margin-top:2px;">\${item.notes}</div>\` : ''}
                                \${item.user ? \`<div style="font-size:0.68rem;color:#94a3b8;margin-top:2px;">Por: \${item.user}</div>\` : ''}
                                </div>\`;
                            }
                        }).join('');
                    })()}
                </div>
                <div style="border-top:1px solid #e2e8f0;padding:8px;background:#fff;border-radius:0 0 8px 8px;display:flex;gap:6px;">
                    <textarea id="new-comment-text" rows="1" placeholder="Escreva um recado..." style="flex:1;padding:6px;border:1px solid #e2e8f0;border-radius:4px;font-size:0.8rem;resize:none;outline:none;font-family:inherit;"></textarea>
                    <button class="sac-btn sac-btn-primary" style="padding:0 10px;" onclick="SAC.addComment('\${t.id}')"><i class="ph ph-paper-plane-right"></i></button>
                </div>
            </div>

            <!-- ANEXOS -->
            <div>
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                    <div style="font-size:0.75rem;font-weight:700;color:#94a3b8;text-transform:uppercase;">Anexos</div>
                    <label style="cursor:pointer;font-size:0.75rem;color:#3b82f6;font-weight:600;">
                        <input type="file" multiple onchange="SAC.handleFileUpload(this.files)" style="display:none;">
                        <i class="ph ph-upload-simple"></i> Enviar
                    </label>
                </div>
                <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px;" id="sac-attachments-list">
                    \${(t.attachments||[]).map((a,ai)=>{
                        const fname = a.originalName||a.name||a.filename||'Arquivo';
                        const isImg = /\\.(jpeg|jpg|gif|png|webp|bmp)$/i.test(fname) || /\\.(jpeg|jpg|gif|png|webp|bmp)$/i.test(a.url||'');
                        const key = a.r2Key||a.originalName||a.name||a.filename;
                        if(isImg && a.url) {
                            return \`<div style="position:relative;border-radius:6px;overflow:hidden;width:64px;height:64px;cursor:pointer;border:1.5px solid #e2e8f0;" onclick="event.stopPropagation();SAC.openAttachmentViewer(\${ai})" title="\${fname}">
                            <img src="\${a.url}" style="width:100%;height:100%;object-fit:cover;display:block;">
                            <button onclick="event.stopPropagation();SAC.removeAttachment('\${key}')" style="position:absolute;top:2px;right:2px;background:rgba(220,38,38,0.85);color:#fff;border:none;border-radius:4px;padding:2px 4px;font-size:0.6rem;cursor:pointer;"><i class="ph ph-trash"></i></button>
                            </div>\`;
                        }
                        return \`<div style="background:#f8fafc;border:1.5px solid #e2e8f0;border-radius:6px;width:64px;height:64px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;cursor:pointer;padding:4px;overflow:hidden;position:relative;" onclick="\${a.url?\`event.stopPropagation();window.open('\${a.url}','_blank')\` : ''}" title="\${fname}">
                            <i class="ph ph-file-text" style="font-size:1.4rem;color:#64748b;"></i>
                            <span style="font-size:0.55rem;color:#475569;text-align:center;word-break:break-all;line-height:1.2;max-height:2.4em;overflow:hidden;">\${fname}</span>
                            <button onclick="event.stopPropagation();SAC.removeAttachment('\${key}')" style="position:absolute;top:2px;right:2px;background:rgba(220,38,38,0.85);color:#fff;border:none;border-radius:4px;padding:2px 4px;font-size:0.6rem;cursor:pointer;"><i class="ph ph-trash"></i></button>
                        </div>\`;
                    }).join('')}
                    <label id="sac-dropzone" style="background:#fff;border:1.5px dashed #cbd5e1;border-radius:6px;width:96px;height:64px;display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;color:#94a3b8;transition:all 0.2s;text-align:center;padding:4px;">
                        <input type="file" multiple onchange="SAC.handleFileUpload(this.files)" style="display:none;">
                        <i class="ph ph-upload-simple" style="font-size:1.2rem;margin-bottom:2px;"></i>
                        <span style="font-size:0.55rem;line-height:1.1;">Arrastar, colar ou<br>selecionar</span>
                    </label>
                </div>
            </div>
            
        </div>
      </div>
    </div>\`;
    
    setTimeout(() => {
        const clist = document.getElementById('sac-comments-list');
        if (clist) clist.scrollTop = clist.scrollHeight;
        if(typeof SAC.bindUploadEvents === 'function') SAC.bindUploadEvents();
    }, 50);
  }
`;

lines.splice(startIdx, endIdx - startIdx, replacement);
fs.writeFileSync('frontend/sac.js', lines.join('\n'));
