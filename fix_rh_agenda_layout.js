const fs = require('fs');

const rhFile = 'frontend/rh_agenda.js';
let lines = fs.readFileSync(rhFile, 'utf8').split(/\r?\n/);

let newLines = [];
let i = 0;

while (i < lines.length) {
    if (lines[i].includes('window.rhAgendaSetEscalaFiltro = function(status) {') && lines[i+2].includes('window.rhAgendaUpdateGrid();')) {
        newLines.push("    window.rhAgendaSetEscalaFiltro = function(status) {");
        newLines.push("        agendaEscalaFiltroStatus = status;");
        newLines.push("        window.rhAgendaRenderFiltroStatus();");
        newLines.push("        window.rhAgendaUpdateGrid();");
        newLines.push("    };");
        newLines.push("");
        newLines.push("    window.rhAgendaSetBuscaNome = function(val) {");
        newLines.push("        agendaBuscaNome = (val || '').toLowerCase();");
        newLines.push("        window.rhAgendaUpdateGrid();");
        newLines.push("    };");
        newLines.push("");
        newLines.push("    window.rhAgendaToggleSetor = function(setor) {");
        newLines.push("        if (agendaBuscaSetores.includes(setor)) {");
        newLines.push("            agendaBuscaSetores = agendaBuscaSetores.filter(s => s !== setor);");
        newLines.push("        } else {");
        newLines.push("            agendaBuscaSetores.push(setor);");
        newLines.push("        }");
        newLines.push("        window.rhAgendaRenderSetorDropdown();");
        newLines.push("        window.rhAgendaUpdateGrid();");
        newLines.push("    };");
        newLines.push("");
        newLines.push("    window.rhAgendaUpdateGrid = function() {");
        newLines.push("        const tempDiv = document.createElement('div');");
        newLines.push("        tempDiv.innerHTML = buildAgendaHTML();");
        newLines.push("        const newGrid = tempDiv.querySelector('.ag-grid');");
        newLines.push("        const oldGrid = document.querySelector('.ag-grid');");
        newLines.push("        if (newGrid && oldGrid) {");
        newLines.push("            oldGrid.innerHTML = newGrid.innerHTML;");
        newLines.push("        }");
        newLines.push("    };");
        newLines.push("");
        newLines.push("    window.rhAgendaRenderFiltroStatus = function() {");
        newLines.push("        const container = document.getElementById('ag-status-buttons-container');");
        newLines.push("        if (!container) return;");
        newLines.push("        const tempDiv = document.createElement('div');");
        newLines.push("        tempDiv.innerHTML = buildAgendaHTML();");
        newLines.push("        const newContainer = tempDiv.querySelector('#ag-status-buttons-container');");
        newLines.push("        if (newContainer) container.innerHTML = newContainer.innerHTML;");
        newLines.push("    };");
        newLines.push("");
        newLines.push("    window.rhAgendaRenderSetorDropdown = function() {");
        newLines.push("        const container = document.getElementById('ag-setor-dropdown-container');");
        newLines.push("        if (!container) return;");
        newLines.push("        const tempDiv = document.createElement('div');");
        newLines.push("        tempDiv.innerHTML = buildAgendaHTML();");
        newLines.push("        const newContainer = tempDiv.querySelector('#ag-setor-dropdown-container');");
        newLines.push("        if (newContainer) {");
        newLines.push("            container.innerHTML = newContainer.innerHTML;");
        newLines.push("            // keep it open since we just clicked it");
        newLines.push("            document.getElementById('ag-setor-dropdown-list').style.display = 'block';");
        newLines.push("        }");
        newLines.push("    };");
        i += 29; // skip the old definition
        continue;
    }
    
    if (lines[i].includes('<div id="ag-escala-filtro-wrap" style="display:flex; gap:16px; margin-bottom:16px; align-items:center; flex-wrap:wrap; background:#fff; border:1px solid #e2e8f0; border-radius:10px; padding:12px 16px; box-shadow:0 1px 3px rgba(0,0,0,0.05);">')) {
        // Skip the old wrap AND the old filtro bar
        // We will insert the new single-line layout
        newLines.push('            ${agendaFilterTipo === \'escala\' ? `');
        newLines.push('            <div id="ag-escala-filtro-bar" style="display:flex;align-items:center;gap:12px;flex-wrap:nowrap;padding:0.4rem 0;margin-bottom:1rem; overflow-x:auto;">');
        newLines.push('                <span style="font-size:0.75rem;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;white-space:nowrap;">Status:</span>');
        newLines.push('                <div id="ag-status-buttons-container" style="display:flex; align-items:center; gap:6px;">');
        newLines.push('                ${[');
        newLines.push('                    {k:\'todos\',    label:\'Todos\',      color:\'#334155\', bg:\'#f1f5f9\'},');
        newLines.push('                    {k:\'disponivel\',label:\'🟢 Escalados\',color:\'#16a34a\', bg:\'#dcfce7\'},');
        newLines.push('                    {k:\'folga\',    label:\'⚪ Folga\',    color:\'#94a3b8\', bg:\'#f1f5f9\'},');
        newLines.push('                    {k:\'ferias\',   label:\'🟠 Férias\',   color:\'#ea580c\', bg:\'#fff7ed\'},');
        newLines.push('                    {k:\'afastado\', label:\'🟡 Afastado\', color:\'#ca8a04\', bg:\'#fefce8\'},');
        newLines.push('                    {k:\'falta\',    label:\'🔴 Falta\',    color:\'#dc2626\', bg:\'#fef2f2\'},');
        newLines.push('                    {k:\'aso\',      label:\'⚪ ASO\',      color:\'#64748b\', bg:\'#f8fafc\'},');
        newLines.push('                ].map(f => `<button onclick="rhAgendaSetEscalaFiltro(\'${f.k}\')"');
        newLines.push('                    style="border:1.5px solid ${agendaEscalaFiltroStatus===f.k?f.color:\'#e2e8f0\'};background:${agendaEscalaFiltroStatus===f.k?f.bg:\'#fff\'};color:${agendaEscalaFiltroStatus===f.k?f.color:\'#64748b\'};border-radius:20px;padding:4px 14px;font-size:0.8rem;font-weight:${agendaEscalaFiltroStatus===f.k?\'700\':\'500\'};cursor:pointer;transition:all .15s;white-space:nowrap;">${f.label}</button>`');
        newLines.push('                ).join(\'\')}');
        newLines.push('                </div>');
        newLines.push('                ');
        newLines.push('                <div style="flex:1; min-width:20px;"></div>');
        newLines.push('                ');
        newLines.push('                <input type="text" id="ag-busca-nome-input" placeholder="Buscar por nome..." value="${agendaBuscaNome || \'\'}" oninput="rhAgendaSetBuscaNome(this.value)" style="padding:6px 12px; border:1px solid #cbd5e1; border-radius:20px; font-size:0.8rem; outline:none; min-width:200px; background:#fff;">');
        newLines.push('                ');
        newLines.push('                <div id="ag-setor-dropdown-container" style="position:relative; min-width:160px;">');
        newLines.push('                    <div onclick="document.getElementById(\'ag-setor-dropdown-list\').style.display = document.getElementById(\'ag-setor-dropdown-list\').style.display === \'none\' ? \'block\' : \'none\'" style="padding:6px 12px; border:1px solid #cbd5e1; border-radius:20px; font-size:0.8rem; background:#fff; cursor:pointer; display:flex; justify-content:space-between; align-items:center;">');
        newLines.push('                        <span style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis; color:#334155; font-weight:600;">');
        newLines.push('                            ${agendaBuscaSetores.length === 0 ? \'Todos os Setores\' : (agendaBuscaSetores.length === 1 ? agendaBuscaSetores[0] : agendaBuscaSetores.length + \' selecionados\')}');
        newLines.push('                        </span>');
        newLines.push('                        <i class="ph ph-caret-down" style="color:#64748b; margin-left:8px;"></i>');
        newLines.push('                    </div>');
        newLines.push('                    <div id="ag-setor-dropdown-list" style="display:none; position:absolute; top:100%; right:0; width:100%; min-width:200px; background:#fff; border:1px solid #cbd5e1; border-radius:8px; margin-top:4px; max-height:250px; overflow-y:auto; z-index:100; box-shadow:0 4px 12px rgba(0,0,0,0.15); padding:4px;">');
        newLines.push('                        ${Array.from(new Set(agendaEscalaData.map(c => c.departamento).filter(Boolean))).sort().map(d => {');
        newLines.push('                            const isSelected = agendaBuscaSetores.includes(d);');
        newLines.push('                            return `<div onclick="rhAgendaToggleSetor(\'${d}\')" style="padding:6px 10px; cursor:pointer; display:flex; align-items:center; gap:8px; border-radius:4px; background:${isSelected ? \'#f0fdf4\' : \'transparent\'}; margin-bottom:2px;">');
        newLines.push('                                <input type="checkbox" ${isSelected ? \'checked\' : \'\'} style="pointer-events:none; accent-color:#16a34a; width:14px; height:14px; margin:0;">');
        newLines.push('                                <span style="font-size:0.8rem; color:${isSelected ? \'#16a34a\' : \'#334155\'}; font-weight:${isSelected ? \'600\' : \'400\'};">${d}</span>');
        newLines.push('                            </div>`;');
        newLines.push('                        }).join(\'\')}');
        newLines.push('                    </div>');
        newLines.push('                </div>');
        newLines.push('            </div>` : \'\'}');
        
        // Skip until we find the end of the old filter bar
        while (!lines[i].includes("            ].map(f => `<button onclick=\"rhAgendaSetEscalaFiltro('${f.k}')\"")) {
            i++;
        }
        while (!lines[i].includes("        </div>` : ''}")) {
            i++;
        }
        i++; // skip the closing div
        continue;
    }
    
    // In case the `rhAgendaSetEscalaFiltro` definition logic didn't match perfectly, let's fix the first occurrence:
    if (lines[i].includes('            ${agendaFilterTipo === \'escala\' ? `')) {
        // Just let the above block handle the replacement.
    }

    newLines.push(lines[i]);
    i++;
}

// Ensure global click closes the dropdown
if (!newLines.join('').includes('window.addEventListener(\'click\'')) {
    newLines.push(`
// Fecha o dropdown se clicar fora
window.addEventListener('click', function(e) {
    const dropdown = document.getElementById('ag-setor-dropdown-list');
    const container = document.getElementById('ag-setor-dropdown-container');
    if (dropdown && container && !container.contains(e.target)) {
        dropdown.style.display = 'none';
    }
});`);
}

fs.writeFileSync(rhFile, newLines.join('\n'));
console.log('Script layout aplicado.');
