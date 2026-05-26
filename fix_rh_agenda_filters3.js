const fs = require('fs');

const file = 'frontend/rh_agenda.js';
const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);

// 1. Inserir funcões no lugar de window.rhAgendaSetEscalaFiltro
let newLines = [];
let i = 0;
while (i < lines.length) {
    if (lines[i].includes('window.rhAgendaSetEscalaFiltro = function(status) {') && lines[i+2].includes('window.renderAgendaRH();')) {
        newLines.push("    window.rhAgendaSetEscalaFiltro = function(status) {");
        newLines.push("        agendaEscalaFiltroStatus = status;");
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
        newLines.push("        const newFiltro = tempDiv.querySelector('#ag-escala-filtro-wrap');");
        newLines.push("        const oldFiltro = document.querySelector('#ag-escala-filtro-wrap');");
        newLines.push("        if (newFiltro && oldFiltro) {");
        newLines.push("            oldFiltro.innerHTML = newFiltro.innerHTML;");
        newLines.push("        }");
        newLines.push("    };");
        i += 4;
        continue;
    }
    
    if (lines[i].includes('const colabsFiltrados = (agendaEscalaData || []).filter(colab => {') && lines[i+1].includes("if (agendaEscalaFiltroStatus === 'todos') return true;")) {
        newLines.push(lines[i]);
        newLines.push("                    if (agendaBuscaNome && !(colab.nome_completo || '').toLowerCase().includes(agendaBuscaNome)) return false;");
        newLines.push("                    if (agendaBuscaSetores.length > 0 && !agendaBuscaSetores.includes(colab.departamento)) return false;");
        newLines.push(lines[i+1]);
        i += 2;
        continue;
    }
    
    if (lines[i].includes("<div style=\"display:flex; gap:10px; margin-bottom:10px; flex-wrap:wrap; align-items:center;\">")) {
        newLines.push('            <div id="ag-escala-filtro-wrap" style="display:flex; gap:16px; margin-bottom:16px; align-items:center; flex-wrap:wrap; background:#fff; border:1px solid #e2e8f0; border-radius:10px; padding:12px 16px; box-shadow:0 1px 3px rgba(0,0,0,0.05);">');
        newLines.push('                <div style="display:flex; align-items:center; gap:8px;">');
        newLines.push('                    <i class="ph ph-magnifying-glass" style="color:#94a3b8;font-size:1.1rem;"></i>');
        newLines.push('                    <input type="text" placeholder="Buscar por nome..." value="${agendaBuscaNome || \'\'}" oninput="rhAgendaSetBuscaNome(this.value)" style="padding:6px 10px; border:none; border-bottom:1px solid #cbd5e1; font-size:0.85rem; outline:none; min-width:180px; background:transparent;">');
        newLines.push('                </div>');
        newLines.push('                <div style="width:1px; height:24px; background:#e2e8f0; margin:0 4px;"></div>');
        newLines.push('                <div style="display:flex; flex-wrap:wrap; gap:6px; flex:1; align-items:center;">');
        newLines.push('                    <span style="font-size:0.75rem;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;margin-right:4px;">Setores:</span>');
        newLines.push('                    ${Array.from(new Set(agendaEscalaData.map(c => c.departamento).filter(Boolean))).sort().map(d => {');
        newLines.push('                        const isSelected = agendaBuscaSetores.includes(d);');
        newLines.push('                        return `<button onclick="rhAgendaToggleSetor(\'${d}\')" style="border:1.5px solid ${isSelected ? \'#3b82f6\' : \'#e2e8f0\'}; background:${isSelected ? \'#eff6ff\' : \'#f8fafc\'}; color:${isSelected ? \'#1d4ed8\' : \'#64748b\'}; border-radius:16px; padding:3px 12px; font-size:0.75rem; font-weight:${isSelected ? \'700\' : \'600\'}; cursor:pointer; transition:all .15s;">${d}</button>`;');
        newLines.push('                    }).join(\'\')}');
        newLines.push('                </div>');
        newLines.push('            </div>');
        i += 6; // skip the old div and select
        continue;
    }
    
    // Fix the "Mostrar:" margin since it's now below the new wrap
    if (lines[i].includes('<div id="ag-escala-filtro-bar" style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:0.6rem 0;margin-bottom:0.75rem;">')) {
        newLines.push('            <div id="ag-escala-filtro-bar" style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:0.2rem 0;margin-bottom:0.75rem;">');
        i++;
        continue;
    }
    
    // Fix the label "Mostrar:" to "Status:" 
    if (lines[i].includes('<span style="font-size:0.75rem;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;margin-right:4px;">Mostrar:</span>')) {
        newLines.push('            <span style="font-size:0.75rem;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;margin-right:4px;">Status:</span>');
        i++;
        continue;
    }

    newLines.push(lines[i]);
    i++;
}

fs.writeFileSync(file, newLines.join('\n'));
console.log('Script aplicado por linhas.');
