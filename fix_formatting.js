const fs = require('fs');
let code = fs.readFileSync('frontend/sac.js', 'utf8');

// Helper to replace text
function replace(oldStr, newStr) {
    if (code.includes(oldStr)) {
        code = code.replace(oldStr, newStr);
        return true;
    }
    return false;
}

// 1. Ocultar checklist no card de acompanhamento
// Encontrar a linha onde showCL é definido
const showClOld = 'const showCL = cl.length > 0;';
const showClNew = "const showCL = cl.length > 0 && ticket.stage !== 'execucao';";
if (!replace(showClOld, showClNew)) {
    console.log('Failed to replace showCL definition');
}

// 2. Modificar getSLADetails para mostrar HHhMMm
const slaDetailsOld = `    const elapsedMs = endCalc - opened;
    }
    const remainMs = limitMs - elapsedMs;
    const remainH = Math.round((remainMs / 3600000) * 10) / 10;
    // pct = % remaining (100 = fresh, 0 = just expired)
    let pct = Math.round((remainMs / limitMs) * 100);
    pct = Math.max(0, Math.min(100, pct));
    // consumedPct = % elapsed (0=fresh, 100+=overdue)
    const consumedPct = Math.min(100, Math.max(0, 100 - pct));
    const isOverdue = remainMs <= 0;

    // — Para chamados CONCLUÍDOS: exibe tempo total desde abertura —
    if (isConcluido) {
      const totalH = Math.round((elapsedMs / 3600000) * 10) / 10;
      const withinSLA = elapsedMs <= limitMs;
      const concludedLabel = \`✓ \${totalH}h (\${withinSLA ? 'no prazo' : 'em atraso'})\`;`;

const slaDetailsNew = `    const elapsedMs = endCalc - opened;
    }
    const remainMs = limitMs - elapsedMs;
    
    // Função auxiliar para formatar ms em HHhMMm
    const fmtHM = (ms) => {
        const totalMin = Math.floor(Math.abs(ms) / 60000);
        const h = Math.floor(totalMin / 60);
        const m = totalMin % 60;
        return \`\${h}h\${m.toString().padStart(2, '0')}m\`;
    };
    
    const remainH = Math.round((remainMs / 3600000) * 10) / 10;
    // pct = % remaining (100 = fresh, 0 = just expired)
    let pct = Math.round((remainMs / limitMs) * 100);
    pct = Math.max(0, Math.min(100, pct));
    // consumedPct = % elapsed (0=fresh, 100+=overdue)
    const consumedPct = Math.min(100, Math.max(0, 100 - pct));
    const isOverdue = remainMs <= 0;

    // — Para chamados CONCLUÍDOS: exibe tempo total desde abertura —
    if (isConcluido) {
      const withinSLA = elapsedMs <= limitMs;
      const concludedLabel = \`✓ \${fmtHM(elapsedMs)} (\${withinSLA ? 'no prazo' : 'em atraso'})\`;`;

if (!replace(slaDetailsOld, slaDetailsNew)) {
    console.log('Failed to replace SLA variables / formatHM');
}

const slaLabelOld = `    // Label: positive hours remaining or negative hours overdue
    let label;
    if (isFrozen) {
      const frozenH = Math.round((elapsedMs / 3600000) * 10) / 10;
      label = '🔒 Congelado · ' + frozenH + 'h consumidas';
    } else if (isOverdue) {
      const overdueH = Math.abs(Math.round((remainMs / 3600000) * 10) / 10);
      label = '-' + overdueH + 'h';
    } else {
      label = remainH + 'h restantes';
    }`;

const slaLabelNew = `    // Label: positive hours remaining or negative hours overdue
    let label;
    if (isFrozen) {
      label = '🔒 Congelado · ' + fmtHM(elapsedMs) + ' consumidas';
    } else if (isOverdue) {
      label = '-' + fmtHM(remainMs);
    } else {
      label = fmtHM(remainMs) + ' restantes';
    }`;

if (!replace(slaLabelOld, slaLabelNew)) {
    console.log('Failed to replace SLA label formatting');
}

// 3. Adicionar badge no renderDetailModal
const topBadgesOld = `<span class="sac-tag" style="background:\${sla.status==='danger'?'#fee2e2':sla.status==='warning'?'#fef9c3':'#dcfce7'};color:\${sla.status==='danger'?'#dc2626':sla.status==='warning'?'#d97706':'#15803d'};\"><i class="ph ph-clock"></i> \${sla.label}</span>
            </div>
            <div style="margin-top: 8px; width: 100%; max-width:320px;">`;

const topBadgesNew = `<span class="sac-tag" style="background:\${sla.status==='danger'?'#fee2e2':sla.status==='warning'?'#fef9c3':'#dcfce7'};color:\${sla.status==='danger'?'#dc2626':sla.status==='warning'?'#d97706':'#15803d'};\"><i class="ph ph-clock"></i> \${sla.label}</span>
                \${t.followUpDeadline && t.stage === 'execucao' ? \`<span class="sac-tag" style="background:#fff7ed;color:#c2410c;border:1px solid #fed7aa;"><i class="ph ph-calendar-check"></i> Acomp. até \${formatDateShort(t.followUpDeadline)}</span>\` : ''}
            </div>
            <div style="margin-top: 8px; width: 100%; max-width:320px;">`;

if (!replace(topBadgesOld, topBadgesNew)) {
    console.log('Failed to add badge to renderDetailModal');
}

fs.writeFileSync('frontend/sac.js', code, 'utf8');
console.log('Modificações aplicadas.');
