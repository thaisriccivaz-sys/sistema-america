const fs = require('fs');
let code = fs.readFileSync('frontend/sac.js', 'utf8');

// Helper to replace text
function replace(oldStr, newStr, name) {
    if (code.includes(oldStr)) {
        code = code.replace(oldStr, newStr);
        console.log('✓ Replaced: ' + name);
        return true;
    }
    
    // Try LF instead of CRLF
    const oldStrLF = oldStr.replace(/\r\n/g, '\n');
    if (code.includes(oldStrLF)) {
        code = code.replace(oldStrLF, newStr.replace(/\r\n/g, '\n'));
        console.log('✓ Replaced (LF): ' + name);
        return true;
    }

    console.log('✗ Failed to replace: ' + name);
    return false;
}

// 1. Ocultar checklist no card de acompanhamento
replace('const showCL = showChecklistInStage(ticket.stage);', "const showCL = showChecklistInStage(ticket.stage) && ticket.stage !== 'execucao';", 'showCL');

// 2. Modificar getSLADetails para mostrar HHhMMm
const slaFmtOld = `    const remainH = Math.round((remainMs / 3600000) * 10) / 10;
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
      const concludedLabel = \`✓ \${totalH}h (\${withinSLA ? 'no prazo' : 'em atraso'})\`;
      return { pct:0, consumedPct: 100, label: concludedLabel, status: withinSLA ? 'success' : 'danger', labelColor: withinSLA ? '#15803d' : '#dc2626', barColor: withinSLA ? '#15803d' : '#dc2626' };
    }

    // Label: positive hours remaining or negative hours overdue
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

const slaFmtNew = `    const fmtHM = (ms) => {
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
      const concludedLabel = \`✓ \${fmtHM(elapsedMs)} (\${withinSLA ? 'no prazo' : 'em atraso'})\`;
      return { pct:0, consumedPct: 100, label: concludedLabel, status: withinSLA ? 'success' : 'danger', labelColor: withinSLA ? '#15803d' : '#dc2626', barColor: withinSLA ? '#15803d' : '#dc2626' };
    }

    // Label: positive hours remaining or negative hours overdue
    let label;
    if (isFrozen) {
      label = '🔒 Congelado · ' + fmtHM(elapsedMs) + ' consumidas';
    } else if (isOverdue) {
      label = '-' + fmtHM(remainMs);
    } else {
      label = fmtHM(remainMs) + ' restantes';
    }`;

replace(slaFmtOld, slaFmtNew, 'SLA Logic');


// 3. Adicionar badge no renderDetailModal
const badgesOld = `<span class="sac-tag" style="background:\${sla.status==='danger'?'#fee2e2':sla.status==='warning'?'#fef9c3':'#dcfce7'};color:\${sla.status==='danger'?'#dc2626':sla.status==='warning'?'#d97706':'#15803d'};\"><i class="ph ph-clock"></i> \${sla.label}</span>
            </div>
            <div style="margin-top: 8px; width: 100%; max-width:320px;">`;

const badgesNew = `<span class="sac-tag" style="background:\${sla.status==='danger'?'#fee2e2':sla.status==='warning'?'#fef9c3':'#dcfce7'};color:\${sla.status==='danger'?'#dc2626':sla.status==='warning'?'#d97706':'#15803d'};\"><i class="ph ph-clock"></i> \${sla.label}</span>
                \${t.followUpDeadline && t.stage === 'execucao' ? \`<span class="sac-tag" style="background:#fff7ed;color:#c2410c;border:1px solid #fed7aa;"><i class="ph ph-calendar-check"></i> Acomp. até \${formatDateShort(t.followUpDeadline)}</span>\` : ''}
            </div>
            <div style="margin-top: 8px; width: 100%; max-width:320px;">`;

replace(badgesOld, badgesNew, 'Modal Badges');


fs.writeFileSync('frontend/sac.js', code, 'utf8');
