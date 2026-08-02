// fix_acomp_part2b.js — use exact line-based approach
const fs = require('fs');
let code = fs.readFileSync('frontend/sac.js', 'utf8');

// ── 1. confirmTransition: inject execucao handling ──
// Using CRLF-safe replacement on exact block
const oldBlock = 'ticket.stage = pt.targetStageId;\r\n      ticket.nextSteps = isClosing ? `Encerrado: ${closeReason}` : nextSteps;\r\n      if (isClosing) { ticket.closeDate = new Date().toISOString(); ticket.checklistJustification = clJust||null; }\r\n      ticket.timeline.push({ stage:pt.targetStageId, time:new Date().toISOString(), notes:logNotes, user });';

const newBlock = `// ── execucao: capturar data limite e congelar SLA ──
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
        const dlFmt = new Date(followUpDeadlineVal).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});
        logNotes += ' | SLA congelado. Acompanhamento até ' + dlFmt + '.';
      } else if (ticket.slaFrozenAt && pt.targetStageId !== 'execucao') {
        ticket.slaFrozenAt = null;
        ticket.followUpDeadline = null;
        ticket.followUpPendingJustification = false;
      }
      ticket.timeline.push({ stage:pt.targetStageId, time:new Date().toISOString(), notes:logNotes, user });
      if (!ticket.comments) ticket.comments = [];
      if (isExecucao) {
        const dlFmt2 = new Date(followUpDeadlineVal).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});
        ticket.comments.push({ user:'Sistema', text:'⏸ SLA congelado. Acompanhamento programado até ' + dlFmt2 + '. Movido por: ' + user, time: new Date().toISOString() });
      }`;

if (code.includes(oldBlock)) {
  code = code.replace(oldBlock, newBlock);
  console.log('✓ confirmTransition updated (CRLF match)');
} else {
  // Try LF
  const oldBlockLF = oldBlock.replace(/\r\n/g, '\n');
  if (code.includes(oldBlockLF)) {
    code = code.replace(oldBlockLF, newBlock);
    console.log('✓ confirmTransition updated (LF match)');
  } else {
    // Manual index-based replace
    const marker = 'ticket.stage = pt.targetStageId;';
    const idx = code.indexOf(marker);
    if (idx >= 0) {
      const endMarker = 'ticket.timeline.push({ stage:pt.targetStageId, time:new Date().toISOString(), notes:logNotes, user });';
      const endIdx = code.indexOf(endMarker, idx) + endMarker.length;
      code = code.slice(0, idx) + newBlock + code.slice(endIdx);
      console.log('✓ confirmTransition updated (index-based)');
    } else {
      console.log('✗ confirmTransition marker not found at all');
    }
  }
}

// ── 2. renderTransModal: inject datetime field ──
// Find the marker: the textarea for trans-obs
const transMarker = 'id="trans-obs" rows="2" placeholder="Informação adicional..."';
const transIdx = code.indexOf(transMarker);
if (transIdx >= 0) {
  // Find the start of the ternary block (go back to find `Próximos Passos`)
  const nextStepsMarker = 'id="trans-next" rows="3"';
  const nsIdx = code.lastIndexOf(nextStepsMarker, transIdx);
  if (nsIdx >= 0) {
    // Go forward to just before the trans-obs div
    const divBeforeObs = code.lastIndexOf('<div class="sac-field"><label>Observação', transIdx);
    const insertPos = divBeforeObs;
    const dateFieldHtml = `\${pt.targetStageId === 'execucao' ? '<div class="sac-field" style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:12px;margin-top:8px;"><label style="color:#c2410c;font-weight:700;display:block;margin-bottom:6px;"><i class=\\'ph ph-calendar-check\\'></i> Data/Hora Limite do Acompanhamento <span style=\\'color:#dc2626\\'>*</span></label><input type="datetime-local" id="trans-followup-deadline" style="width:100%;padding:8px 10px;border:1.5px solid #fed7aa;border-radius:6px;font-size:0.9rem;box-sizing:border-box;" min="' + new Date().toISOString().slice(0,16) + '"></div>' : ''}
        `;
    code = code.slice(0, insertPos) + dateFieldHtml + code.slice(insertPos);
    console.log('✓ renderTransModal datetime field injected');
  } else {
    console.log('✗ trans-next marker not found');
  }
} else {
  console.log('✗ trans-obs marker not found');
}

// ── 3. SAC.confirmMandatoryJustification — inject into SAC object ──
// Add before the closing of the SAC = window.SAC = { block
// Find exportCSV which is the last known method
const exportCSVMarker = '    exportCSV() {';
const exportIdx = code.indexOf(exportCSVMarker);
if (exportIdx >= 0) {
  const insertBefore = '    exportCSV() {';
  const confirmJustFunc = `    confirmMandatoryJustification(ticketId, tipo) {
      const textarea = document.getElementById('mandatory-justification-' + ticketId);
      const errorDiv = document.getElementById('mandatory-error-' + ticketId);
      if (!textarea || !textarea.value.trim()) {
        if (errorDiv) errorDiv.style.display = 'block';
        return;
      }
      const justText = textarea.value.trim();
      const ticket = _tickets.find(t => t.id === ticketId);
      if (!ticket) return;
      const user = currentUsername();
      if (!ticket.comments) ticket.comments = [];
      const typeLabel = tipo === 'followup' ? 'prazo de acompanhamento' : 'SLA';
      ticket.comments.push({ user: user, text: '📝 Justificativa (' + typeLabel + ' vencido): ' + justText, time: new Date().toISOString() });
      if (tipo === 'followup') {
        ticket.stage = 'triagem';
        ticket.slaFrozenAt = null;
        ticket.followUpDeadline = null;
        ticket.followUpPendingJustification = false;
        ticket.comments.push({ user: 'Sistema', text: '↩ Chamado devolvido para Triagem após justificativa de prazo de acompanhamento vencido. Por: ' + user, time: new Date().toISOString() });
        ticket.timeline.push({ stage: 'triagem', time: new Date().toISOString(), notes: 'Retorno automático: prazo de acompanhamento vencido. Justificativa registrada.', user });
      } else {
        ticket.slaOverduePendingJustification = false;
      }
      localStorage.removeItem('sac_pending_popup_' + ticketId);
      const popup = document.getElementById('sac-mandatory-popup-' + ticketId);
      if (popup) popup.remove();
      updateTicket(ticket);
      showToast('Justificativa registrada com sucesso.', 'success');
    },
    `;
  code = code.replace(insertBefore, confirmJustFunc + insertBefore);
  console.log('✓ SAC.confirmMandatoryJustification injected');
} else {
  console.log('✗ exportCSV marker not found');
}

// ── 4. initSAC: add loops and pending popup check ──
const initSACOld = `    // Auto-refresh a cada 5 minutos
    if (!window._sacAutoRefresh) {
      window._sacAutoRefresh = setInterval(async () => {
        const root = document.getElementById('view-sac');
        if (root && root.style.display !== 'none' && document.body.contains(root)) {
            // Apenas atualiza se nenhum modal estiver aberto para nao interromper o usuario
            if (!document.querySelector('.sac-modal-overlay')) {
                await loadTickets();
                renderAll();
            }
        }
      }, 5 * 60 * 1000);
    }
  };`;

const initSACNew = `    // Auto-refresh a cada 5 minutos
    if (!window._sacAutoRefresh) {
      window._sacAutoRefresh = setInterval(async () => {
        const root = document.getElementById('view-sac');
        if (root && root.style.display !== 'none' && document.body.contains(root)) {
            if (!document.querySelector('.sac-modal-overlay')) {
                await loadTickets();
                renderAll();
            }
        }
      }, 5 * 60 * 1000);
    }
    // Loop de alertas: SLA vencido + follow-up vencido a cada 1 min
    if (!window._sacAlertLoop) {
      window._sacAlertLoop = setInterval(() => {
        const root = document.getElementById('view-sac');
        if (root && document.body.contains(root)) {
          checkFollowUpAlerts();
          checkSLAOverdue();
        }
      }, 60 * 1000);
    }
    // Verificar imediatamente ao carregar (reoabrir popups pendentes após reload)
    setTimeout(() => {
      checkFollowUpAlerts();
      checkSLAOverdue();
      // Reabrir popups pendentes do localStorage
      _tickets.forEach(ticket => {
        const pendingType = localStorage.getItem('sac_pending_popup_' + ticket.id);
        if (pendingType) {
          showMandatoryJustificationPopup(ticket, pendingType);
        }
      });
    }, 2000);
  };`;

if (code.includes(initSACOld)) {
  code = code.replace(initSACOld, initSACNew);
  console.log('✓ initSAC loops added');
} else {
  // CRLF
  const initSACOldCRLF = initSACOld.replace(/\n/g, '\r\n');
  if (code.includes(initSACOldCRLF)) {
    code = code.replace(initSACOldCRLF, initSACNew);
    console.log('✓ initSAC loops added (CRLF)');
  } else {
    console.log('✗ initSAC target not found');
  }
}

// ── 5. Remove duplicate closing })() if added by part2 ──
// Clean up duplicate closings
const badDouble = '})();\n\n  // ══════';
const goodReplace = '\n\n  // ══════';
if (code.includes(badDouble)) {
  code = code.replace(badDouble, goodReplace);
  console.log('✓ Removed duplicate closing');
}

fs.writeFileSync('frontend/sac.js', code, 'utf8');
console.log('Part 2b done.');
