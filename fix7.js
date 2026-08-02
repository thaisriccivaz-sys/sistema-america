const fs = require('fs');
let code = fs.readFileSync('frontend/sac.js', 'utf8');

const target1 = `                \${list.length ? list.map(a=>\`
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
                </div>`;
const target1R = target1.replace(/\n/g, '\r\n');

const replace1 = `                <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px;" id="sac-wiz-attachments-list">
                    \${(list).map((a,ai)=>{
                        const fname = a.originalName||a.name||a.filename||'Arquivo';
                        const isImg = /\\.(jpeg|jpg|gif|png|webp|bmp)$/i.test(fname) || /\\.(jpeg|jpg|gif|png|webp|bmp)$/i.test(a.url||'');
                        const key = a.r2Key||a.originalName||a.name||a.filename;
                        if(isImg && a.url) {
                            return \`<div style="position:relative;border-radius:6px;overflow:hidden;width:64px;height:64px;cursor:pointer;border:1.5px solid #e2e8f0;" onclick="event.stopPropagation();window.open('\${a.url}','_blank')" title="\${fname}">
                            <img src="\${a.url}" style="width:100%;height:100%;object-fit:cover;display:block;">
                            <button onclick="event.stopPropagation();SAC.wizRemoveAttachment('\${key}')" style="position:absolute;top:2px;right:2px;background:rgba(220,38,38,0.85);color:#fff;border:none;border-radius:4px;padding:2px 4px;font-size:0.6rem;cursor:pointer;"><i class="ph ph-trash"></i></button>
                            </div>\`;
                        }
                        return \`<div style="background:#f8fafc;border:1.5px solid #e2e8f0;border-radius:6px;width:64px;height:64px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;cursor:pointer;padding:4px;overflow:hidden;position:relative;" onclick="\${a.url?\`event.stopPropagation();window.open('\${a.url}','_blank')\` : ''}" title="\${fname}">
                            <i class="ph ph-file-text" style="font-size:1.4rem;color:#64748b;"></i>
                            <span style="font-size:0.55rem;color:#475569;text-align:center;word-break:break-all;line-height:1.2;max-height:2.4em;overflow:hidden;">\${fname}</span>
                            <button onclick="event.stopPropagation();SAC.wizRemoveAttachment('\${key}')" style="position:absolute;top:2px;right:2px;background:rgba(220,38,38,0.85);color:#fff;border:none;border-radius:4px;padding:2px 4px;font-size:0.6rem;cursor:pointer;"><i class="ph ph-trash"></i></button>
                        </div>\`;
                    }).join('')}
                    <label style="background:#fff;border:1.5px dashed #cbd5e1;border-radius:6px;width:96px;height:64px;display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;color:#94a3b8;transition:all 0.2s;text-align:center;padding:4px;">
                        <input type="file" multiple onchange="SAC.addWizardAttachments(this.files)" style="display:none;">
                        <i class="ph ph-upload-simple" style="font-size:1.2rem;margin-bottom:2px;"></i>
                        <span style="font-size:0.55rem;line-height:1.1;">Arrastar, colar ou<br>selecionar</span>
                    </label>
                </div>`;

if(code.includes(target1)) code = code.replace(target1, replace1);
else if(code.includes(target1R)) code = code.replace(target1R, replace1);
else console.log('not found');

fs.writeFileSync('frontend/sac.js', code, 'utf8');
console.log('done fix7');
