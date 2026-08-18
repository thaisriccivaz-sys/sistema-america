const fs = require('fs');
let code = fs.readFileSync('frontend/sac.js', 'utf8');

// First fix: add GET endpoint logic inside addComment
let fix1 = `      const token = localStorage.getItem('erp_token')||localStorage.getItem('token');
      let t = tLocal;
      try {
          const resp = await fetch('/api/sac/tickets/' + ticketId, { headers: { 'Authorization': \`Bearer \${token}\` } });
          if (resp.ok) {
              t = await resp.json();
          }
      } catch (e) { console.error('Erro ao buscar versão mais recente do ticket', e); }
      const user = currentUsername();`;
      
code = code.replace("      const user = currentUsername();", fix1);

// Second fix: isGestorJustifying
// We match:
//       const pendingTipo = localStorage.getItem('sac_pending_popup_' + t.id);
//
//       if (pendingTipo) {
code = code.replace(
    "const pendingTipo = localStorage.getItem('sac_pending_popup_' + t.id);\r\n\r\n      if (pendingTipo) {",
    "const pendingTipo = localStorage.getItem('sac_pending_popup_' + t.id);\r\n      const isGestorJustifying = pendingTipo && localStorage.getItem('sac_popup_gestor_required_' + t.id) === '1';\r\n\r\n      if (isGestorJustifying) {"
);

// Fallback for LF instead of CRLF
code = code.replace(
    "const pendingTipo = localStorage.getItem('sac_pending_popup_' + t.id);\n\n      if (pendingTipo) {",
    "const pendingTipo = localStorage.getItem('sac_pending_popup_' + t.id);\n      const isGestorJustifying = pendingTipo && localStorage.getItem('sac_popup_gestor_required_' + t.id) === '1';\n\n      if (isGestorJustifying) {"
);

// Third fix: checkFollowUpAlerts
code = code.replace(
    "if (['concluido','encerrado','respondido','acompanhamento'].includes(ticket.stage)) return;",
    "if (['concluido','encerrado','respondido','acompanhamento'].includes(ticket.stage)) {\n        if (ticket.aguardPendingJustification === true) showMandatoryJustificationPopup(ticket, 'aguard');\n        if (ticket.followUpPendingJustification === true) showMandatoryJustificationPopup(ticket, 'followup');\n        return;\n      }"
);

// Fourth fix: checkSLAOverdue
code = code.replace(
    "if (['concluido','encerrado','execucao','respondido','acompanhamento'].includes(ticket.stage)) return;",
    "if (['concluido','encerrado','execucao','respondido','acompanhamento'].includes(ticket.stage)) {\n        if (ticket.slaOverduePendingJustification === true) showMandatoryJustificationPopup(ticket, 'sla');\n        return;\n      }"
);

fs.writeFileSync('frontend/sac.js', code);
console.log('Replaced successfully');
