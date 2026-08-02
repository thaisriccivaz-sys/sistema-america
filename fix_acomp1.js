// fix_acompanhamento_part1.js — safe version using line-level replacement
const fs = require('fs');
let code = fs.readFileSync('frontend/sac.js', 'utf8');

// ── 1. getSLADetails: freeze when execucao + slaFrozenAt ──
// Replace opening block
code = code.replace(
  `  function getSLADetails(ticket) {
    const type = TICKET_TYPES[ticket.typeKey];
    if (!type) return { label: '—', status: 'ok', pct: 100, consumedPct: 0, remaining: 0, isOverdue: false, isConcluido: false };
    const openStr = _normDate(ticket.openDate || new Date().toISOString());
    const opened = new Date(openStr).getTime();
    const limitMs = type.sla * 3600000;
    // isOpen = ticket ainda não encerrado ou concluído
    const isConcluido = ticket.stage === 'concluido';
    const isClosed = isConcluido || ticket.stage === 'encerrado';

    // Se a data de abertura for inválida, retorna fallback seguro
    if (isNaN(opened)) return { label: '—', status: 'ok', pct: 100, consumedPct: 0, remaining: 0, isOverdue: false, isConcluido: false };

    let endCalc = Date.now();
    if (isClosed) {
      const log = ticket.timeline && ticket.timeline.find(l => l.stage === 'concluido' || l.stage === 'encerrado');
      if (log) {
        const t = new Date(_normDate(log.time)).getTime();
        if (!isNaN(t)) endCalc = t;
      }
    }
    const elapsedMs = endCalc - opened;
    const remainMs = limitMs - elapsedMs;`,
  `  function getSLADetails(ticket) {
    const type = TICKET_TYPES[ticket.typeKey];
    if (!type) return { label: '—', status: 'ok', pct: 100, consumedPct: 0, remaining: 0, isOverdue: false, isConcluido: false, isFrozen: false };
    const openStr = _normDate(ticket.openDate || new Date().toISOString());
    const opened = new Date(openStr).getTime();
    const limitMs = type.sla * 3600000;
    const isConcluido = ticket.stage === 'concluido';
    const isClosed = isConcluido || ticket.stage === 'encerrado';
    // SLA CONGELADO: chamado em Acompanhamento com slaFrozenAt
    const isFrozen = ticket.stage === 'execucao' && !!ticket.slaFrozenAt && ticket.slaElapsedMs != null;
    if (isNaN(opened)) return { label: '—', status: 'ok', pct: 100, consumedPct: 0, remaining: 0, isOverdue: false, isConcluido: false, isFrozen: false };
    let elapsedMs;
    if (isFrozen) {
      elapsedMs = ticket.slaElapsedMs;
    } else {
      let endCalc = Date.now();
      if (isClosed) {
        const log = ticket.timeline && ticket.timeline.find(l => l.stage === 'concluido' || l.stage === 'encerrado');
        if (log) {
          const t = new Date(_normDate(log.time)).getTime();
          if (!isNaN(t)) endCalc = t;
        }
      }
      elapsedMs = endCalc - opened;
    }
    const remainMs = limitMs - elapsedMs;`
);

// Fix concluded return (wrong values were there)
code = code.replace(
  `        isOverdue: !withinSLA,\n        isConcluido: true,\n        label: concludedLabel,`,
  `        isOverdue: !withinSLA,\n        isConcluido: true,\n        isFrozen: false,\n        label: concludedLabel,`
);

// Add freeze label
code = code.replace(
  `    // Label: positive hours remaining or negative hours overdue
    let label;
    if (isOverdue) {
      const overdueH = Math.abs(Math.round((remainMs / 3600000) * 10) / 10);
      label = \`-\${overdueH}h\`;
    } else {
      label = \`\${remainH}h restantes\`;
    }`,
  `    // Label: positive hours remaining or negative hours overdue
    let label;
    if (isFrozen) {
      const frozenH = Math.round((elapsedMs / 3600000) * 10) / 10;
      label = '🔒 Congelado · ' + frozenH + 'h consumidas';
    } else if (isOverdue) {
      const overdueH = Math.abs(Math.round((remainMs / 3600000) * 10) / 10);
      label = '-' + overdueH + 'h';
    } else {
      label = remainH + 'h restantes';
    }`
);

// Add isFrozen to final return
code = code.replace(
  `      isConcluido: false,
      label,
      barColor,
      labelColor,
      status: isOverdue ? 'danger' : pct < 30 ? 'warning' : 'ok',
      closedDateMs: isClosed ? endCalc : null,
      deadlineMs: opened + limitMs`,
  `      isConcluido: false,
      isFrozen,
      label,
      barColor: isFrozen ? '#f97316' : barColor,
      labelColor: isFrozen ? '#ea580c' : labelColor,
      status: isFrozen ? 'frozen' : (isOverdue ? 'danger' : pct < 30 ? 'warning' : 'ok'),
      closedDateMs: isClosed ? endCalc : null,
      deadlineMs: opened + limitMs`
);
console.log('✓ getSLADetails done');

// ── 2. renderCard: followUpDeadline badge ──
code = code.replace(
  '      ${anyPending ? `<div style="background:#fef9c3;border:1px solid #fde047;border-radius:6px;padding:4px 8px;font-size:0.72rem;color:#854d0e;font-weight:700;margin-bottom:6px;display:flex;align-items:center;gap:4px;"><i class="ph ph-clock"></i> Pendência ${hasPendingLog?\'Logística\':hasPendingCom?\'Comercial\':\'Financeiro\'}</div>` : \'\'}',
  '      ${ticket.followUpDeadline && ticket.stage === \'execucao\' ? `<div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:5px;padding:3px 7px;font-size:0.68rem;color:#c2410c;font-weight:700;margin-bottom:5px;display:flex;align-items:center;gap:3px;"><i class="ph ph-calendar-check"></i> Acomp. até ${formatDateShort(ticket.followUpDeadline)}</div>` : \'\'}\n      ${anyPending ? `<div style="background:#fef9c3;border:1px solid #fde047;border-radius:6px;padding:4px 8px;font-size:0.72rem;color:#854d0e;font-weight:700;margin-bottom:6px;display:flex;align-items:center;gap:4px;"><i class="ph ph-clock"></i> Pendência ${hasPendingLog?\'Logística\':hasPendingCom?\'Comercial\':\'Financeiro\'}</div>` : \'\'}'
);
console.log('✓ renderCard badge done');

fs.writeFileSync('frontend/sac.js', code, 'utf8');
console.log('\nPart 1 complete.');
