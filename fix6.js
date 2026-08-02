const fs = require('fs');
let code = fs.readFileSync('frontend/sac.js', 'utf8');

const target = `                        if(isImg && a.url) {
                            return \\\`<div style="position:relative;border-radius:6px;overflow:hidden;width:64px;height:64px;cursor:pointer;border:1.5px solid #e2e8f0;" onclick="event.stopPropagation();window.open('\\\\\\\${a.url}','_blank')" title="\\\\\\\${fname}">
                            <img src="\\\\\\\${a.url}" style="width:100%;height:100%;object-fit:cover;display:block;">
                            <button onclick="event.stopPropagation();SAC.wizRemoveAttachment('\\\\\\\${key}')" style="position:absolute;top:2px;right:2px;background:rgba(220,38,38,0.85);color:#fff;border:none;border-radius:4px;padding:2px 4px;font-size:0.6rem;cursor:pointer;"><i class="ph ph-trash"></i></button>
                            </div>\\\`;
                        }
                        return \\\`<div style="background:#f8fafc;border:1.5px solid #e2e8f0;border-radius:6px;width:64px;height:64px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;cursor:pointer;padding:4px;overflow:hidden;position:relative;" onclick="\\\\\\\${a.url?\\\`event.stopPropagation();window.open('\\\\\\\${a.url}','_blank')\\\` : ''}" title="\\\\\\\${fname}">
                            <i class="ph ph-file-text" style="font-size:1.4rem;color:#64748b;"></i>
                            <span style="font-size:0.55rem;color:#475569;text-align:center;word-break:break-all;line-height:1.2;max-height:2.4em;overflow:hidden;">\\\\\\\${fname}</span>
                            <button onclick="event.stopPropagation();SAC.wizRemoveAttachment('\\\\\\\${key}')" style="position:absolute;top:2px;right:2px;background:rgba(220,38,38,0.85);color:#fff;border:none;border-radius:4px;padding:2px 4px;font-size:0.6rem;cursor:pointer;"><i class="ph ph-trash"></i></button>
                        </div>\\\`;`;

// Actually, let's just replace lines 1052-1065 directly using a precise string index replacement.
const replacementBlock = `                        const fname = a.originalName||a.name||a.filename||'Arquivo';
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
                        </div>\`;`;

let lines = code.split('\n');
lines.splice(1051, 15, replacementBlock);
fs.writeFileSync('frontend/sac.js', lines.join('\n'), 'utf8');
console.log('done fix6');
