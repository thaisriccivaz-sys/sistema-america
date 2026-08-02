// fix_acomp_part2.js — confirmTransition + new functions injected before closing })()
const fs = require('fs');
let code = fs.readFileSync('frontend/sac.js', 'utf8');

// ── 1. confirmTransition: handle execucao + freeze SLA ──
const confirmOld = `      ticket.stage = pt.targetStageId;
      ticket.nextSteps = isClosing ? \`Encerrado: \${closeReason}\` : nextSteps;
      if (isClosing) { ticket.closeDate = new Date().toISOString(); ticket.checklistJustification = clJust||null; }
      ticket.timeline.push({ stage:pt.targetStageId, time:new Date().toISOString(), notes:logNotes, user });`;

const confirmNew = `      // ── execucao: capturar data limite e congelar SLA ──
      const isExecucao = pt.targetStageId === 'execucao';
      let followUpDeadlineVal = null;
      if (isExecucao) {
        followUpDeadlineVal = (document.getElementById('trans-followup-deadline')?.value || '').trim();
        if (!followUpDeadlineVal) { showToast('A data/hora limite do acompanhamento é obrigatória.','warning'); return; }
        if (new Date(followUpDeadlineVal).getTime() <= Date.now()) { showToast('A data/hora limite deve ser no futuro.','warning'); return; }
      }

      ticket.stage = pt.targetStageId;
      ticket.nextSteps = isClosing ? \`Encerrado: \${closeReason}\` : nextSteps;
      if (isClosing) { ticket.closeDate = new Date().toISOString(); ticket.checklistJustification = clJust||null; }
      if (isExecucao) {
        const openedMs = new Date(ticket.openDate).getTime();
        ticket.slaFrozenAt = new Date().toISOString();
        ticket.slaElapsedMs = Date.now() - openedMs;
        ticket.followUpDeadline = new Date(followUpDeadlineVal).toISOString();
        ticket.followUpNotified = false;
        ticket.followUpPendingJustification = true;
        logNotes += ' | SLA congelado. Acompanhamento até ' + new Date(followUpDeadlineVal).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}) + '.';
      } else if (ticket.slaFrozenAt && pt.targetStageId !== 'execucao') {
        // Saiu do acompanhamento: retomar SLA
        ticket.slaFrozenAt = null;
        ticket.followUpDeadline = null;
        ticket.followUpPendingJustification = false;
      }
      ticket.timeline.push({ stage:pt.targetStageId, time:new Date().toISOString(), notes:logNotes, user });
      if (!ticket.comments) ticket.comments = [];
      if (isExecucao) {
        ticket.comments.push({ user:'Sistema', text:'⏸ SLA congelado. Acompanhamento programado até ' + new Date(followUpDeadlineVal).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}) + '. Movido por: ' + user, time: new Date().toISOString() });
      }`;

if (code.includes(confirmOld)) {
  code = code.replace(confirmOld, confirmNew);
  console.log('✓ confirmTransition updated');
} else {
  console.log('✗ confirmTransition target not found');
}

// ── 2. renderTransModal: inject datetime field ──
// find the non-closing, non-aguard branch (Próximos Passos)
const transOld = `        \`<div class="sac-field"><label>Próximos Passos <span style="color:#dc2626">*</span></label><textarea id="trans-next" rows="3" placeholder="O que será feito a seguir?" style="width:100%;padding:8px 10px;border:1.5px solid #e2e8f0;border-radius:6px;font-size:0.85rem;resize:vertical;box-sizing:border-box;outline:none;"></textarea></div>
        <div class="sac-field"><label>Observação (opcional)</label><textarea id="trans-obs" rows="2" placeholder="Informação adicional..." style="width:100%;padding:8px 10px;border:1.5px solid #e2e8f0;border-radius:6px;font-size:0.85rem;resize:vertical;box-sizing:border-box;outline:none;"></textarea></div>\`) +`;

const transNew = `        \`<div class="sac-field"><label>Próximos Passos <span style="color:#dc2626">*</span></label><textarea id="trans-next" rows="3" placeholder="O que será feito a seguir?" style="width:100%;padding:8px 10px;border:1.5px solid #e2e8f0;border-radius:6px;font-size:0.85rem;resize:vertical;box-sizing:border-box;outline:none;"></textarea></div>
        \${pt.targetStageId === 'execucao' ? '<div class="sac-field" style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:12px;margin-top:8px;"><label style="color:#c2410c;font-weight:700;display:block;margin-bottom:6px;"><i class=\\'ph ph-calendar-check\\'></i> Data/Hora Limite do Acompanhamento <span style=\\'color:#dc2626\\'>*</span></label><input type="datetime-local" id="trans-followup-deadline" style="width:100%;padding:8px 10px;border:1.5px solid #fed7aa;border-radius:6px;font-size:0.9rem;box-sizing:border-box;" min="' + new Date().toISOString().slice(0,16) + '"></div>' : ''}
        <div class="sac-field"><label>Observação (opcional)</label><textarea id="trans-obs" rows="2" placeholder="Informação adicional..." style="width:100%;padding:8px 10px;border:1.5px solid #e2e8f0;border-radius:6px;font-size:0.85rem;resize:vertical;box-sizing:border-box;outline:none;"></textarea></div>\`) +`;

if (code.includes(transOld)) {
  code = code.replace(transOld, transNew);
  console.log('✓ renderTransModal datetime field injected');
} else {
  console.log('✗ renderTransModal target not found');
}

// ── 3. Inject new functions + initSAC loop BEFORE closing })() ──
const closingTag = `})();\n`;
const newFunctions = `
  // ══════════════════════════════════════════════════════
  // POPUP OBRIGATÓRIO — não pode ser fechado
  // ══════════════════════════════════════════════════════
  function showMandatoryJustificationPopup(ticket, tipo) {
    const existingId = 'sac-mandatory-popup-' + ticket.id;
    if (document.getElementById(existingId)) return; // já aberto

    localStorage.setItem('sac_pending_popup_' + ticket.id, tipo);

    const isFollowup = tipo === 'followup';
    const title = isFollowup ? '⚠️ Prazo de Acompanhamento Vencido' : '🔴 SLA Estourado';
    const subtitle = isFollowup
      ? 'O prazo de acompanhamento deste chamado já passou há mais de 1 hora sem conclusão.'
      : 'O SLA deste chamado está estourado e não foi concluído no prazo.';
    const btnLabel = isFollowup ? 'Confirmar e Mover para Triagem' : 'Confirmar Justificativa';
    const bgColor = isFollowup ? '#fff7ed' : '#fef2f2';
    const borderColor = isFollowup ? '#fed7aa' : '#fecaca';
    const headerBg = isFollowup ? '#f97316' : '#dc2626';

    const overlay = document.createElement('div');
    overlay.id = existingId;
    overlay.style.cssText = 'position:fixed;inset:0;z-index:999999;background:rgba(0,0,0,0.75);display:flex;align-items:center;justify-content:center;font-family:Inter,system-ui,sans-serif;';

    overlay.innerHTML = \`
      <div style="background:#fff;border-radius:14px;width:520px;max-width:95vw;box-shadow:0 24px 60px rgba(0,0,0,0.35);overflow:hidden;">
        <div style="background:\${headerBg};padding:20px 24px;display:flex;align-items:center;gap:12px;">
          <i class="ph ph-\${isFollowup ? 'calendar-x' : 'warning-circle'}" style="font-size:1.8rem;color:#fff;"></i>
          <div>
            <div style="color:#fff;font-weight:800;font-size:1.1rem;">\${title}</div>
            <div style="color:rgba(255,255,255,0.85);font-size:0.82rem;margin-top:2px;">Chamado Nº \${ticket.protocol} — \${ticket.clientName}</div>
          </div>
        </div>
        <div style="padding:24px;">
          <div style="background:\${bgColor};border:1px solid \${borderColor};border-radius:8px;padding:12px;margin-bottom:16px;font-size:0.85rem;color:#374151;">\${subtitle}</div>
          <label style="font-size:0.85rem;font-weight:700;color:#1e293b;display:block;margin-bottom:6px;">Por que este chamado não foi concluído conforme programado? <span style="color:#dc2626">*</span></label>
          <textarea id="mandatory-justification-\${ticket.id}" rows="4" placeholder="Descreva o motivo detalhadamente..." style="width:100%;padding:10px 12px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:0.85rem;resize:vertical;box-sizing:border-box;outline:none;font-family:inherit;"></textarea>
          <div id="mandatory-error-\${ticket.id}" style="color:#dc2626;font-size:0.78rem;margin-top:4px;display:none;">Por favor, preencha o motivo antes de continuar.</div>
          <button onclick="SAC.confirmMandatoryJustification('\${ticket.id}','\${tipo}')" style="margin-top:16px;width:100%;padding:12px;background:\${headerBg};color:#fff;border:none;border-radius:8px;font-size:0.95rem;font-weight:700;cursor:pointer;">
            <i class="ph ph-check-circle"></i> \${btnLabel}
          </button>
          <div style="text-align:center;margin-top:10px;font-size:0.75rem;color:#94a3b8;">Este popup não pode ser fechado. Preencha o motivo para continuar.</div>
        </div>
      </div>\`;

    // Bloquear ESC e clique fora
    overlay.addEventListener('click', (e) => e.stopPropagation());
    document.body.appendChild(overlay);
  }

  // ══════════════════════════════════════════════════════
  // CHECK FOLLOW-UP ALERTS — roda a cada 1 minuto
  // ══════════════════════════════════════════════════════
  function checkFollowUpAlerts() {
    const now = Date.now();
    _tickets.forEach(ticket => {
      if (ticket.stage !== 'execucao' || !ticket.followUpDeadline) return;
      const prazo = new Date(ticket.followUpDeadline).getTime();
      if (isNaN(prazo)) return;

      // Notificar ao vencer
      if (prazo < now && !ticket.followUpNotified) {
        ticket.followUpNotified = true;
        if (!ticket.comments) ticket.comments = [];
        ticket.comments.push({ user:'Sistema', text:'🔔 Prazo de acompanhamento vencido em ' + new Date(prazo).toLocaleString('pt-BR') + '. Aguardando justificativa do responsável.', time: new Date().toISOString() });
        updateTicket(ticket);
        // Notificar via API
        const token = localStorage.getItem('erp_token')||localStorage.getItem('token');
        const involved = [...new Set((ticket.timeline||[]).map(l => l.user).filter(Boolean))];
        fetch('/api/sac/notificar-acompanhamento', {
          method:'POST',
          headers:{'Authorization':'Bearer '+token,'Content-Type':'application/json'},
          body: JSON.stringify({ ticketId:ticket.id, protocol:ticket.protocol, clientName:ticket.clientName, followUpDeadline:ticket.followUpDeadline, notifyUsernames:involved })
        }).catch(e => console.error('[SAC] notificar-acompanhamento:', e));
      }

      // Popup obrigatório 1h após prazo
      if (prazo + 3600000 < now && ticket.followUpPendingJustification !== false) {
        showMandatoryJustificationPopup(ticket, 'followup');
      }
    });
  }

  // ══════════════════════════════════════════════════════
  // CHECK SLA OVERDUE — roda a cada 1 minuto
  // ══════════════════════════════════════════════════════
  function checkSLAOverdue() {
    _tickets.forEach(ticket => {
      if (['concluido','encerrado','execucao'].includes(ticket.stage)) return;
      const sla = getSLADetails(ticket);
      if (!sla.isOverdue) return;

      let changed = false;

      // Marcar urgente automaticamente
      if (!ticket.isUrgent) {
        ticket.isUrgent = true;
        if (!ticket.comments) ticket.comments = [];
        ticket.comments.push({ user:'Sistema', text:'🚨 Chamado marcado como URGENTE automaticamente — SLA vencido.', time: new Date().toISOString() });
        changed = true;
      }

      // Notificar configurados (uma vez)
      if (!ticket.slaOverdueNotified) {
        ticket.slaOverdueNotified = true;
        if (!ticket.comments) ticket.comments = [];
        ticket.comments.push({ user:'Sistema', text:'🔴 SLA estourado. Notificação enviada aos responsáveis.', time: new Date().toISOString() });
        changed = true;
        const token = localStorage.getItem('erp_token')||localStorage.getItem('token');
        fetch('/api/sac/notificar-sla-vencido', {
          method:'POST',
          headers:{'Authorization':'Bearer '+token,'Content-Type':'application/json'},
          body: JSON.stringify({ ticketId:ticket.id, protocol:ticket.protocol, clientName:ticket.clientName, openDate:ticket.openDate, typeKey:ticket.typeKey })
        }).catch(e => console.error('[SAC] notificar-sla-vencido:', e));
      }

      // Popup obrigatório SLA estourado
      if (ticket.slaOverduePendingJustification !== false) {
        showMandatoryJustificationPopup(ticket, 'sla');
      }

      if (changed) updateTicket(ticket);
    });
  }

})();\n`;

if (code.endsWith(closingTag)) {
  code = code.slice(0, -closingTag.length) + newFunctions;
  console.log('✓ New functions injected');
} else {
  console.log('✗ Closing tag not found, appending anyway');
  code = code.replace(/\}\)\(\);\s*$/, '') + newFunctions;
}

fs.writeFileSync('frontend/sac.js', code, 'utf8');
console.log('Part 2 done.');
