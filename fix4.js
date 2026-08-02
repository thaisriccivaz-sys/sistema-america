const fs = require('fs');
let code = fs.readFileSync('frontend/sac.js', 'utf8');

// 1. Wizard Anexos HTML
const wizAnexosTarget = '<div class="sac-field" style="margin-bottom:24px;">\n            <input type="file" multiple id="wiz-anexos" accept="image/*,video/*,application/pdf" style="width:100%;padding:10px;border:1px solid #e2e8f0;border-radius:6px;background:#f8fafc;cursor:pointer;">\n            <div style="font-size:0.75rem;color:#64748b;margin-top:4px;">Selecione um ou mais arquivos. (Limite recomendado: 30MB)</div>\n          </div>';
const wizAnexosTarget2 = '<div class="sac-field" style="margin-bottom:24px;">\r\n            <input type="file" multiple id="wiz-anexos" accept="image/*,video/*,application/pdf" style="width:100%;padding:10px;border:1px solid #e2e8f0;border-radius:6px;background:#f8fafc;cursor:pointer;">\r\n            <div style="font-size:0.75rem;color:#64748b;margin-top:4px;">Selecione um ou mais arquivos. (Limite recomendado: 30MB)</div>\r\n          </div>';

const wizAnexosHTML = `<div class="sac-field" style="margin-bottom:24px;">
            \${(() => {
                const list = _wiz.attachments || [];
                return \`
                \${list.length ? list.map(a=>\`
                <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:10px 12px;margin-bottom:6px;display:flex;align-items:center;gap:10px;">
                  <i class="ph ph-file-text" style="font-size:1.2rem;color:#64748b;flex-shrink:0;"></i>
                  <div style="flex:1;">
                    <div style="font-weight:600;font-size:0.85rem;color:#1e293b;">
                      \${a.url ? \`<a href="\${a.url}" target="_blank" style="color:#1e293b;text-decoration:none;">\` : ''}
                      \${a.originalName||a.name||a.filename||'Arquivo'}
                      \${a.url ? \`</a>\` : ''}
                    </div>
                  </div>
                  <button class="sac-btn sac-btn-danger" style="padding:3px 8px;font-size:0.72rem;" onclick="SAC.wizRemoveAttachment('\${a.r2Key||a.originalName||a.name||a.filename}')"><i class="ph ph-trash"></i></button>
                </div>\`).join('') : \`<div style="text-align:center;color:#94a3b8;padding:16px;">Nenhum arquivo anexado.</div>\`}
                <div style="margin-top:16px;background:#fff;border:1.5px dashed #e2e8f0;border-radius:10px;padding:16px;text-align:center;">
                  <i class="ph ph-upload-simple" style="font-size:1.5rem;color:#94a3b8;display:block;margin-bottom:6px;"></i>
                  <label style="cursor:pointer;font-size:0.83rem;font-weight:600;color:#f97316;">
                    <input type="file" multiple onchange="SAC.addWizardAttachments(this.files)" style="display:none;">
                    Selecionar arquivos para upload (serão enviados na hora)
                  </label>
                  <div style="font-size:0.75rem;color:#94a3b8;margin-top:4px;">Ou cole/arraste arquivos para esta tela</div>
                </div>\`;
            })()}
          </div>`;

code = code.replace(wizAnexosTarget, wizAnexosHTML).replace(wizAnexosTarget2, wizAnexosHTML);

// 2. Add id="sac-wiz-dropzone" to the wizard modal container
const wizContainerTarget = '<div class="sac-modal sac-animated" style="width:100vw;max-width:1100px;margin:20px auto;border-radius:12px;background:#fff;display:flex;flex-direction:column;position:relative;box-shadow:0 10px 25px rgba(0,0,0,0.1);height:calc(100vh - 40px);max-height:900px;overflow:hidden;" onclick="event.stopPropagation()">';
const wizContainerReplacement = '<div class="sac-modal sac-animated" id="sac-wiz-dropzone" style="width:100vw;max-width:1100px;margin:20px auto;border-radius:12px;background:#fff;display:flex;flex-direction:column;position:relative;box-shadow:0 10px 25px rgba(0,0,0,0.1);height:calc(100vh - 40px);max-height:900px;overflow:hidden;" onclick="event.stopPropagation()">';
code = code.replace(wizContainerTarget, wizContainerReplacement);

// 3. Update bindUploadEvents to handle both dropzones
const bindUploadEventsTarget = `bindUploadEvents() {
        const dropzone = document.getElementById('sac-modal-dropzone');
        if (!dropzone) return;

        dropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropzone.style.background = '#f0f9ff';
            dropzone.style.border = '2px dashed #3b82f6';
        });

        dropzone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            dropzone.style.background = '#fff';
            dropzone.style.border = 'none';
        });

        dropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropzone.style.background = '#fff';
            dropzone.style.border = 'none';
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                SAC.handleFileUpload(e.dataTransfer.files);
            }
        });

        document.addEventListener('paste', (e) => {
            const mc = document.getElementById('sac-modal-container');
            if (mc && mc.style.display !== 'none' && e.clipboardData && e.clipboardData.files.length > 0) {
                SAC.handleFileUpload(e.clipboardData.files);
            }
        });
    },`;

const bindUploadEventsTarget2 = bindUploadEventsTarget.replace(/\n/g, '\r\n');

const bindUploadEventsReplacement = `bindUploadEvents() {
        [document.getElementById('sac-modal-dropzone'), document.getElementById('sac-wiz-dropzone')].forEach(dropzone => {
            if (!dropzone) return;
            dropzone.addEventListener('dragover', (e) => {
                e.preventDefault();
                dropzone.style.background = '#f0f9ff';
                dropzone.style.border = '2px dashed #3b82f6';
            });
            dropzone.addEventListener('dragleave', (e) => {
                e.preventDefault();
                dropzone.style.background = '#fff';
                dropzone.style.border = 'none';
            });
            dropzone.addEventListener('drop', (e) => {
                e.preventDefault();
                dropzone.style.background = '#fff';
                dropzone.style.border = 'none';
                if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                    if (dropzone.id === 'sac-wiz-dropzone') SAC.addWizardAttachments(e.dataTransfer.files);
                    else SAC.handleFileUpload(e.dataTransfer.files);
                }
            });
        });

        // Only register paste once to avoid multiple listeners
        if (!window._sacPasteBound) {
            window._sacPasteBound = true;
            document.addEventListener('paste', (e) => {
                const mc = document.getElementById('sac-modal-container');
                const wmc = document.getElementById('sac-wizard-overlay');
                if (mc && mc.style.display !== 'none' && e.clipboardData && e.clipboardData.files.length > 0) {
                    SAC.handleFileUpload(e.clipboardData.files);
                } else if (wmc && wmc.style.display !== 'none' && e.clipboardData && e.clipboardData.files.length > 0) {
                    SAC.addWizardAttachments(e.clipboardData.files);
                }
            });
        }
    },`;

code = code.replace(bindUploadEventsTarget, bindUploadEventsReplacement).replace(bindUploadEventsTarget2, bindUploadEventsReplacement);

// 4. Add SAC methods for wizard attachments
const handleFileTarget = `handleFileUpload(files) {
        if (!files || files.length === 0) return;
        SAC.addAttachments(files);
    },`;
const handleFileTarget2 = handleFileTarget.replace(/\n/g, '\r\n');

const handleFileReplacement = `handleFileUpload(files) {
        if (!files || files.length === 0) return;
        SAC.addAttachments(files);
    },
    async addWizardAttachments(files) {
        if (!files || files.length === 0) return;
        const fd = new FormData();
        for (let f of files) fd.append('anexos', f);
        showToast('Enviando anexos...', 'info');
        try {
            const token = localStorage.getItem('erp_token') || localStorage.getItem('token');
            const r = await fetch('/api/sac/upload-anexos', { method: 'POST', headers: { 'Authorization': \`Bearer \${token}\` }, body: fd });
            if (r.ok) {
                const data = await r.json();
                _wiz.attachments = [...(_wiz.attachments||[]), ...(data.urls||[])];
                renderWizard();
                showToast('Anexos enviados com sucesso.', 'success');
            } else {
                showToast('Erro ao enviar anexos.', 'error');
            }
        } catch(e) {
            console.error(e);
            showToast('Erro de rede ao enviar anexos.', 'error');
        }
    },
    wizRemoveAttachment(key) {
        if (!key) return;
        if (confirm('Remover este anexo da lista?')) {
            _wiz.attachments = (_wiz.attachments||[]).filter(a => (a.r2Key||a.originalName||a.name||a.filename) !== key);
            renderWizard();
        }
    },`;
code = code.replace(handleFileTarget, handleFileReplacement).replace(handleFileTarget2, handleFileReplacement);


// 5. Fix wizSubmit file upload
const wizSubmitUploadTarget = `        const fileInput = document.getElementById('wiz-anexos');
        let finalAttachments = [];
        if (fileInput && fileInput.files.length > 0) {
          const fd = new FormData();
          for (let f of fileInput.files) fd.append('anexos', f);
          const uploadRes = await fetch('/api/sac/upload-anexos', {
            method: 'POST',
            headers: { 'Authorization': \`Bearer \${localStorage.getItem('erp_token')||localStorage.getItem('token')}\` },
            body: fd
          });
          if (!uploadRes.ok) throw new Error('Erro no upload de anexos');
          const uploadData = await uploadRes.json();
          finalAttachments = uploadData.urls || [];
        }`;
const wizSubmitUploadTarget2 = wizSubmitUploadTarget.replace(/\n/g, '\r\n');

const wizSubmitUploadReplacement = `        let finalAttachments = _wiz.attachments || [];`;
code = code.replace(wizSubmitUploadTarget, wizSubmitUploadReplacement).replace(wizSubmitUploadTarget2, wizSubmitUploadReplacement);

// Initialize _wiz.attachments
const initTarget = '_wiz = { step:1, protocol: nextProtocol(), osNumber:\'\', _protocolLocked:false, _osLinked:false, clientName:\'\', cnpjCpf:\'\', equipment:\'\', address:\'\', contactName:\'\', contactPhone:\'\', contactEmail:\'\', channel:\'WhatsApp\', typeKey:\'manutencao\', occList:[], currentOcc: (OCCURRENCES_BY_TYPE.manutencao||[])[0]||\'\', currentOccNote:\'\', description:\'\' };';
const initReplacement = '_wiz = { step:1, protocol: nextProtocol(), osNumber:\'\', _protocolLocked:false, _osLinked:false, clientName:\'\', cnpjCpf:\'\', equipment:\'\', address:\'\', contactName:\'\', contactPhone:\'\', contactEmail:\'\', channel:\'WhatsApp\', typeKey:\'manutencao\', occList:[], currentOcc: (OCCURRENCES_BY_TYPE.manutencao||[])[0]||\'\', currentOccNote:\'\', description:\'\', attachments:[] };';
code = code.replace(initTarget, initReplacement);

// Replace getSLADetails closing date logic
const slaTarget = `      return {
        remaining: totalH,
        pct: withinSLA ? (100 - concludedBarPct) : 0,
        consumedPct: concludedBarPct,
        isOverdue: !withinSLA,
        isConcluido: true,
        label: concludedLabel,
        barColor: withinSLA ? '#15803d' : '#dc2626',
        labelColor: concludedColor,
        status: withinSLA ? 'ok' : 'danger',
        closedDateMs: endCalc
      };`;
const slaTarget2 = slaTarget.replace(/\n/g, '\r\n');

const slaReplacement = `      return {
        remaining: totalH,
        pct: withinSLA ? (100 - concludedBarPct) : 0,
        consumedPct: concludedBarPct,
        isOverdue: !withinSLA,
        isConcluido: true,
        label: concludedLabel,
        barColor: withinSLA ? '#15803d' : '#dc2626',
        labelColor: concludedColor,
        status: withinSLA ? 'ok' : 'danger',
        closedDateMs: endCalc,
        deadlineMs: opened + limitMs
      };`;
code = code.replace(slaTarget, slaReplacement).replace(slaTarget2, slaReplacement);

const slaTarget3 = `    return {
      remaining: remainH,
      pct,
      consumedPct,
      isOverdue,
      isConcluido: false,
      label,
      barColor,
      labelColor,
      status: isOverdue ? 'danger' : pct < 30 ? 'warning' : 'ok',
      closedDateMs: isClosed ? endCalc : null
    };`;
const slaTarget4 = slaTarget3.replace(/\n/g, '\r\n');
const slaReplacement3 = `    return {
      remaining: remainH,
      pct,
      consumedPct,
      isOverdue,
      isConcluido: false,
      label,
      barColor,
      labelColor,
      status: isOverdue ? 'danger' : pct < 30 ? 'warning' : 'ok',
      closedDateMs: isClosed ? endCalc : null,
      deadlineMs: opened + limitMs
    };`;
code = code.replace(slaTarget3, slaReplacement3).replace(slaTarget4, slaReplacement3);

// Fix getFilteredTickets SLA filtering
const filterSlaTarget = `        } else if (_filterDateType === 'sla') {
          const sla = getSLADetails(t);
          if (sla.closedDateMs) compareMs = sla.closedDateMs;
          else compareMs = sla.closedDateMs || 0;
        }`;
const filterSlaTarget2 = filterSlaTarget.replace(/\n/g, '\r\n');
const filterSlaReplacement = `        } else if (_filterDateType === 'sla') {
          const sla = getSLADetails(t);
          compareMs = sla.deadlineMs || 0;
        }`;
code = code.replace(filterSlaTarget, filterSlaReplacement).replace(filterSlaTarget2, filterSlaReplacement);

fs.writeFileSync('frontend/sac.js', code, 'utf8');
console.log('Done fix4!');
