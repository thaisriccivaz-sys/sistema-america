const fs = require('fs');
const path = require('path');
const p = path.join(__dirname, 'frontend', 'sac.js');
let content = fs.readFileSync(p, 'utf8');

const reps = [
  {
    from: `  let _filterType = 'all';\n  let _selectedTicket = null;`,
    to: `  let _filterType = 'all';\n  let _filterDateType = 'abertura';\n  let _filterDateStart = '';\n  let _filterDateEnd = '';\n  let _filterUrgent = false;\n  let _selectedTicket = null;`
  },
  {
    from: `description:'' };`,
    to: `description:'', isUrgent:false };`
  },
  {
    from: `status: isOverdue ? 'danger' : pct < 30 ? 'warning' : 'ok'\n    };`,
    to: `status: isOverdue ? 'danger' : pct < 30 ? 'warning' : 'ok',\n      closedDateMs: isClosed ? endCalc : null\n    };`
  },
  {
    from: `<div style="position:relative;flex:1;max-width:360px;display:flex;align-items:center;">`,
    to: `<div style="position:relative;flex:1;min-width:260px;max-width:360px;display:flex;align-items:center;">`
  },
  {
    from: `align-items:center;gap:10px;flex-shrink:0;">\n        <div style="position:relative;flex:1;min-width:260px`,
    to: `align-items:center;flex-wrap:wrap;gap:10px;flex-shrink:0;">\n        <div style="position:relative;flex:1;min-width:260px`
  },
  {
    from: `<span id="sac-count-badge" style="font-size:0.8rem;color:#64748b;white-space:nowrap;"></span>`,
    to: `
        <select id="sac-filter-datetype" style="padding:7px 10px;border:1px solid #e2e8f0;border-radius:8px;font-size:0.85rem;outline:none;cursor:pointer;" onchange="SAC.onFilterDateType(this.value)">
          <option value="abertura">Data Abertura</option>
          <option value="sla">Data Encerramento SLA</option>
        </select>
        
        <div style="display:flex;align-items:center;gap:6px;font-size:0.8rem;color:#64748b;">
          De: <input type="date" id="sac-filter-datestart" style="padding:6px 8px;border:1px solid #e2e8f0;border-radius:6px;font-size:0.8rem;outline:none;" onchange="SAC.onFilterDate(this.value, document.getElementById('sac-filter-dateend').value)">
          Até: <input type="date" id="sac-filter-dateend" style="padding:6px 8px;border:1px solid #e2e8f0;border-radius:6px;font-size:0.8rem;outline:none;" onchange="SAC.onFilterDate(document.getElementById('sac-filter-datestart').value, this.value)">
        </div>

        <label style="display:flex;align-items:center;gap:6px;font-size:0.85rem;color:#1e293b;cursor:pointer;padding:6px 8px;border-radius:6px;border:1px solid #e2e8f0;background:#f8fafc;">
          <input type="checkbox" id="sac-filter-urgent" onchange="SAC.onFilterUrgent(this.checked)" style="accent-color:#dc2626;width:16px;height:16px;cursor:pointer;">
          <i class="ph ph-warning-circle" style="color:#dc2626;"></i> Urgentes
        </label>
        <span id="sac-count-badge" style="font-size:0.8rem;color:#64748b;white-space:nowrap;margin-left:auto;"></span>`
  },
  {
    from: `      ondragend="SAC.onDragEnd(event)" onclick="SAC.selectTicket('\${t.id}')">\n        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;">\n          <div style="font-size:0.75rem;color:#64748b;font-weight:600;">Nº \${t.protocol.replace(/^0+/,'')}</div>\n          \${t.osNumber ? \`<div style="background:#f1f5f9;color:#475569;border-radius:4px;padding:2px 6px;font-size:0.65rem;font-weight:600;">OS \${t.osNumber}</div>\` : ''}\n        </div>`,
    to: `      ondragend="SAC.onDragEnd(event)" onclick="SAC.selectTicket('\${t.id}')">\n        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;">\n          <div style="font-size:0.75rem;color:#64748b;font-weight:600;">Nº \${t.protocol.replace(/^0+/,'')}</div>\n          \${t.isUrgent ? '<div style="background:#fee2e2;color:#ef4444;border-radius:4px;padding:2px 4px;font-size:0.65rem;font-weight:700;"><i class="ph-fill ph-warning-circle"></i> URGENTE</div>' : ''}\n          \${t.osNumber ? \`<div style="background:#f1f5f9;color:#475569;border-radius:4px;padding:2px 6px;font-size:0.65rem;font-weight:600;">OS \${t.osNumber}</div>\` : ''}\n        </div>`
  },
  {
    from: `          <!-- COL ESQUERDA -->\n          <div style="flex:1;">\n            <h3 style="margin:0 0 12px;font-size:1.05rem;color:#1e293b;display:flex;align-items:center;gap:8px;border-bottom:1px solid #e2e8f0;padding-bottom:8px;"><i class="ph ph-identification-card" style="color:#0ea5e9;"></i> Dados do Chamado & Cliente</h3>`,
    to: `          <!-- COL ESQUERDA -->\n          <div style="flex:1;">\n            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;border-bottom:1px solid #e2e8f0;padding-bottom:8px;">\n              <h3 style="margin:0;font-size:1.05rem;color:#1e293b;display:flex;align-items:center;gap:8px;"><i class="ph ph-identification-card" style="color:#0ea5e9;"></i> Dados do Chamado & Cliente</h3>\n              <label style="display:flex;align-items:center;gap:4px;font-size:0.8rem;color:#1e293b;cursor:pointer;background:#fee2e2;padding:4px 8px;border-radius:6px;border:1px solid #fca5a5;">\n                <input type="checkbox" id="wiz-isUrgent" onchange="_sacWiz('isUrgent',this.checked)" \${_wiz.isUrgent?'checked':''} style="accent-color:#ef4444;width:14px;height:14px;cursor:pointer;">\n                <i class="ph-fill ph-warning-circle" style="color:#ef4444;"></i> Chamado Urgente\n              </label>\n            </div>`
  },
  {
    from: `const matchType = _filterType === 'all' || t.typeKey === _filterType;`,
    to: `const matchType = _filterType === 'all' || t.typeKey === _filterType;\n      const matchUrgent = !_filterUrgent || t.isUrgent;\n      let matchDate = true;\n      if (_filterDateStart || _filterDateEnd) {\n        let compareMs = 0;\n        if (_filterDateType === 'abertura') {\n          compareMs = new Date(t.openDate).getTime();\n        } else if (_filterDateType === 'sla') {\n          const sla = getSLADetails(t);\n          if (sla.closedDateMs) compareMs = sla.closedDateMs;\n          else compareMs = sla.closedDateMs || 0;\n        }\n        if (compareMs > 0) {\n          if (_filterDateStart) {\n            const startMs = new Date(_filterDateStart + 'T00:00:00').getTime();\n            if (compareMs < startMs) matchDate = false;\n          }\n          if (_filterDateEnd && matchDate) {\n            const endMs = new Date(_filterDateEnd + 'T23:59:59').getTime();\n            if (compareMs > endMs) matchDate = false;\n          }\n        } else {\n          matchDate = false;\n        }\n      }`
  },
  {
    from: `return matchSearch && matchType && matchPermission;`,
    to: `return matchSearch && matchType && matchUrgent && matchDate && matchPermission;`
  },
  {
    from: `typeKey: _wiz.typeKey,\n          occurrences:`,
    to: `typeKey: _wiz.typeKey,\n          isUrgent: _wiz.isUrgent,\n          occurrences:`
  },
  {
    from: `onFilterType(val) {\n      _filterType = val;\n      renderAll();\n    },`,
    to: `onFilterType(val) {\n      _filterType = val;\n      renderAll();\n    },\n    onFilterDateType(val) {\n      _filterDateType = val;\n      renderAll();\n    },\n    onFilterDate(start, end) {\n      _filterDateStart = start;\n      _filterDateEnd = end;\n      renderAll();\n    },\n    onFilterUrgent(checked) {\n      _filterUrgent = checked;\n      renderAll();\n    },`
  },
  {
    from: `const headers = ['Protocolo','OS Relacionada','Data Abertura','Cliente','CNPJ/CPF','Equipamento','Tipo','Etapa','SLA','Ocorrncias'];`,
    to: `const headers = ['Protocolo','OS Relacionada','Data Abertura','Cliente','CNPJ/CPF','Equipamento','Tipo','Urgente','Etapa','SLA','Ocorrncias'];`
  },
  {
    from: `t.equipment, TICKET_TYPES[t.typeKey]?.name||t.typeKey,`,
    to: `t.equipment, TICKET_TYPES[t.typeKey]?.name||t.typeKey, t.isUrgent?'Sim':'Nao',`
  },
  {
    from: `<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">\n              <span style="font-family:monospace;font-weight:800;font-size:1rem;color:#f97316;">Nº \${t.protocol}</span>`,
    to: `<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">\n              <span style="font-family:monospace;font-weight:800;font-size:1rem;color:#f97316;">Nº \${t.protocol}</span>\n              \${t.isUrgent ? '<span class="sac-tag" style="background:#fee2e2;color:#dc2626;"><i class="ph-fill ph-warning-circle"></i> URGENTE</span>' : ''}`
  }
];

let error = false;
for (const rep of reps) {
  if (!content.includes(rep.from)) {
    console.log("Could not find string:\n" + rep.from);
    error = true;
  } else {
    content = content.replace(rep.from, rep.to);
  }
}

if (!error) {
  fs.writeFileSync(p, content);
  console.log("Successfully patched sac.js");
}
