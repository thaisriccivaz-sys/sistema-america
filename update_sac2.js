const fs = require('fs');
let code = fs.readFileSync('frontend/sac.js', 'utf8');

// The line is: const pendingTipo = localStorage.getItem('sac_pending_popup_' + t.id);
// Followed by: if (pendingTipo) {

code = code.replace(
    "const pendingTipo = localStorage.getItem('sac_pending_popup_' + t.id);\n\n      if (pendingTipo) {",
    "const pendingTipo = localStorage.getItem('sac_pending_popup_' + t.id);\n      const isGestorJustifying = pendingTipo && localStorage.getItem('sac_popup_gestor_required_' + t.id) === '1';\n\n      if (isGestorJustifying) {"
);

// In checkFollowUpAlerts:
//       if (['concluido','encerrado','respondido','acompanhamento'].includes(ticket.stage)) return;
// We change it to:
//       if (['concluido','encerrado','respondido','acompanhamento'].includes(ticket.stage)) {
//           if (ticket.aguardPendingJustification) showMandatoryJustificationPopup(ticket, 'aguard');
//           if (ticket.followUpPendingJustification) showMandatoryJustificationPopup(ticket, 'followup');
//           return;
//       }

code = code.replace(
    "if (['concluido','encerrado','respondido','acompanhamento'].includes(ticket.stage)) return;",
    "if (['concluido','encerrado','respondido','acompanhamento'].includes(ticket.stage)) {\n        if (ticket.aguardPendingJustification === true) showMandatoryJustificationPopup(ticket, 'aguard');\n        if (ticket.followUpPendingJustification === true) showMandatoryJustificationPopup(ticket, 'followup');\n        return;\n      }"
);

// In checkSLAOverdue:
//       if (['concluido','encerrado','execucao','respondido','acompanhamento'].includes(ticket.stage)) return;
// We change it to:
//       if (['concluido','encerrado','execucao','respondido','acompanhamento'].includes(ticket.stage)) {
//           if (ticket.slaOverduePendingJustification === true) showMandatoryJustificationPopup(ticket, 'sla');
//           return;
//       }

code = code.replace(
    "if (['concluido','encerrado','execucao','respondido','acompanhamento'].includes(ticket.stage)) return;",
    "if (['concluido','encerrado','execucao','respondido','acompanhamento'].includes(ticket.stage)) {\n        if (ticket.slaOverduePendingJustification === true) showMandatoryJustificationPopup(ticket, 'sla');\n        return;\n      }"
);


fs.writeFileSync('frontend/sac.js', code);
console.log('Replaced successfully');
