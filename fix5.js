const fs = require('fs');
let code = fs.readFileSync('frontend/sac.js', 'utf8');

// 1. renderCard OS number
const renderCardTarget1 = '<span style="font-size:0.7rem;font-weight:700;color:#64748b;font-family:monospace;">Nº ${ticket.protocol}</span>';
const renderCardReplace1 = '<span style="font-size:0.7rem;font-weight:700;color:#64748b;font-family:monospace;">Nº ${ticket.protocol}${ticket.osNumber ? \' · OS \' + ticket.osNumber : \'\'}</span>';
code = code.replace(renderCardTarget1, renderCardReplace1);

// 2. renderCard strip emojis from clientName
const renderCardTarget2 = `    const clientShort = ticket.clientName.length > 15
      ? ticket.clientName.substring(0, 15) + '…'
      : ticket.clientName;`;
const renderCardTarget2R = renderCardTarget2.replace(/\n/g, '\r\n');
const renderCardReplace2 = `    const cleanClientName = (ticket.clientName || '').replace(/[\\u{1F300}-\\u{1F9FF}\\u{2600}-\\u{26FF}\\u{2700}-\\u{27BF}\\u{1F600}-\\u{1F64F}\\u{1F680}-\\u{1F6FF}\\u{1F1E0}-\\u{1F1FF}]/gu, '').trim();
    const clientShort = cleanClientName.length > 25
      ? cleanClientName.substring(0, 25) + '…'
      : cleanClientName;`;
code = code.replace(renderCardTarget2, renderCardReplace2).replace(renderCardTarget2R, renderCardReplace2);

const renderCardTarget2b = 'title="${ticket.clientName}">${clientShort}</div>';
const renderCardReplace2b = 'title="${cleanClientName}">${clientShort}</div>';
code = code.replace(renderCardTarget2b, renderCardReplace2b);


// 3. Comments fixed height and width
const modalBodyTarget = '<div style="flex:1;overflow-y:auto;padding:24px;display:grid;grid-template-columns:1fr 400px;gap:40px;" id="sac-modal-body">';
const modalBodyReplace = '<div style="flex:1;overflow-y:auto;padding:24px;display:grid;grid-template-columns:1fr 500px;gap:40px;" id="sac-modal-body">';
code = code.replace(modalBodyTarget, modalBodyReplace);

const commentsListTarget = '<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;display:flex;flex-direction:column;flex:1;min-height:300px;margin-bottom:24px;">';
const commentsListReplace = '<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;display:flex;flex-direction:column;height:400px;margin-bottom:24px;">';
code = code.replace(commentsListTarget, commentsListReplace);

// 4. Address limit 60 chars
const addressTarget = '${t.address ? `<div style="display:flex;align-items:center;gap:6px;margin-top:4px;"><i class="ph ph-map-pin" style="color:#3b82f6;"></i> ${t.address}</div>` : \'\'}';
const addressReplace = '${t.address ? `<div style="display:flex;align-items:center;gap:6px;margin-top:4px;" title="${t.address}"><i class="ph ph-map-pin" style="color:#3b82f6;flex-shrink:0;"></i> ${t.address.length > 60 ? t.address.substring(0, 60) + \'...\' : t.address}</div>` : \'\'}';
code = code.replace(addressTarget, addressReplace);

fs.writeFileSync('frontend/sac.js', code, 'utf8');
console.log('fix5 complete');
