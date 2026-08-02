const fs = require('fs');
let code = fs.readFileSync('frontend/sac.js', 'utf8');

// Fix 1: Add OS Number to search
const searchTarget = 't.protocol.toLowerCase().includes(s) ||\r\n        t.clientName.toLowerCase().includes(s) ||\r\n        (t.equipment||\'\').toLowerCase().includes(s) ||';
const searchTargetLF = 't.protocol.toLowerCase().includes(s) ||\n        t.clientName.toLowerCase().includes(s) ||\n        (t.equipment||\'\').toLowerCase().includes(s) ||';

const searchReplacement = `t.protocol.toLowerCase().includes(s) ||
        (t.osNumber||'').toLowerCase().includes(s) ||
        t.clientName.toLowerCase().includes(s) ||
        (t.equipment||'').toLowerCase().includes(s) ||`;

code = code.replace(searchTarget, searchReplacement).replace(searchTargetLF, searchReplacement);


// Fix 2: Add Creator user to Modal
const moverParaTarget = '<div style="display:flex;align-items:center;gap:8px;margin-top:20px;">\r\n                <span style="font-size:0.75rem;font-weight:700;color:#94a3b8;text-transform:uppercase;">MOVER PARA:</span>\r\n                <select style="padding:6px 12px;border:1.5px solid #e2e8f0;border-radius:6px;font-size:0.85rem;outline:none;cursor:pointer;background:#fff;" onchange="SAC.changeStageFromModal(this.value)" ${!canMoveTicket(t) ? \'disabled title="Você só pode mover chamados abertos por você."\' : \'\'}>${stageOpts}</select>\r\n            </div>';
const moverParaTargetLF = '<div style="display:flex;align-items:center;gap:8px;margin-top:20px;">\n                <span style="font-size:0.75rem;font-weight:700;color:#94a3b8;text-transform:uppercase;">MOVER PARA:</span>\n                <select style="padding:6px 12px;border:1.5px solid #e2e8f0;border-radius:6px;font-size:0.85rem;outline:none;cursor:pointer;background:#fff;" onchange="SAC.changeStageFromModal(this.value)" ${!canMoveTicket(t) ? \'disabled title="Você só pode mover chamados abertos por você."\' : \'\'}>${stageOpts}</select>\n            </div>';

const moverParaReplacement = `
            \${(() => {
                const creatorUserStr = (t.timeline && t.timeline.length > 0 && t.timeline[0].user) ? t.timeline[0].user : null;
                let creatorInfo = '';
                if (creatorUserStr) {
                    const u = (window._sacUsersList || []).find(x => {
                        const val = x.username || x.login || x.email || x.nome;
                        return (val || '').toLowerCase() === creatorUserStr.toLowerCase();
                    });
                    const cName = u ? (u.nome || u.name || creatorUserStr) : creatorUserStr;
                    const cPhoto = u ? (u.foto_colaborador || '') : '';
                    creatorInfo = \`<div style="display:flex;align-items:center;gap:8px;margin-left:auto;background:#f8fafc;padding:4px 12px;border-radius:20px;border:1px solid #e2e8f0;">
                        <span style="font-size:0.7rem;color:#64748b;font-weight:600;text-transform:uppercase;">Aberto por</span>
                        \${cPhoto ? \`<img src="\${cPhoto}" style="width:22px;height:22px;border-radius:50%;object-fit:cover;">\` : \`<div style="width:22px;height:22px;border-radius:50%;background:#e2e8f0;display:flex;align-items:center;justify-content:center;font-size:0.6rem;font-weight:bold;color:#475569;">\${cName.charAt(0).toUpperCase()}</div>\`}
                        <span style="font-size:0.8rem;font-weight:600;color:#1e293b;">\${cName}</span>
                    </div>\`;
                }
                return \`<div style="display:flex;align-items:center;gap:8px;margin-top:20px;flex-wrap:wrap;width:100%;">
                    <span style="font-size:0.75rem;font-weight:700;color:#94a3b8;text-transform:uppercase;">MOVER PARA:</span>
                    <select style="padding:6px 12px;border:1.5px solid #e2e8f0;border-radius:6px;font-size:0.85rem;outline:none;cursor:pointer;background:#fff;" onchange="SAC.changeStageFromModal(this.value)" \${!canMoveTicket(t) ? 'disabled title="Você só pode mover chamados abertos por você."' : ''}>\${stageOpts}</select>
                    \${creatorInfo}
                </div>\`;
            })()}`;

code = code.replace(moverParaTarget, moverParaReplacement).replace(moverParaTargetLF, moverParaReplacement);

fs.writeFileSync('frontend/sac.js', code, 'utf8');
console.log('Done fix2!');
