const fs = require('fs');

const rhFile = 'frontend/rh_agenda.js';
let text = fs.readFileSync(rhFile, 'utf8');

// 1. Atualizar state vars
text = text.replace(
    /let agendaBuscaSetor = '';/,
    "let agendaBuscaSetores = [];"
);

// 2. Atualizar funções de filtro
const funcsOld = `    window.rhAgendaSetEscalaFiltro = function(status) {
        agendaEscalaFiltroStatus = status;
        window.renderAgendaRH();
    };`;
    
const funcsNew = `    window.rhAgendaSetEscalaFiltro = function(status) {
        agendaEscalaFiltroStatus = status;
        window.rhAgendaUpdateGrid();
    };

    window.rhAgendaSetBuscaNome = function(val) {
        agendaBuscaNome = (val || '').toLowerCase();
        window.rhAgendaUpdateGrid();
    };

    window.rhAgendaToggleSetor = function(setor) {
        if (agendaBuscaSetores.includes(setor)) {
            agendaBuscaSetores = agendaBuscaSetores.filter(s => s !== setor);
        } else {
            agendaBuscaSetores.push(setor);
        }
        window.rhAgendaUpdateGrid();
    };

    window.rhAgendaUpdateGrid = function() {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = buildAgendaHTML();
        const newGrid = tempDiv.querySelector('.ag-grid');
        const oldGrid = document.querySelector('.ag-grid');
        if (newGrid && oldGrid) {
            oldGrid.innerHTML = newGrid.innerHTML;
        }
        
        const newFiltro = tempDiv.querySelector('#ag-escala-filtro-wrap');
        const oldFiltro = document.querySelector('#ag-escala-filtro-wrap');
        if (newFiltro && oldFiltro) {
            oldFiltro.innerHTML = newFiltro.innerHTML;
        }
    };`;
text = text.replace(funcsOld, funcsNew);

// 3. Atualizar filter condition
const filterOld = `                // Filtrar colaboradores pelo status selecionado
                const colabsFiltrados = (agendaEscalaData || []).filter(colab => {
                    if (agendaEscalaFiltroStatus === 'todos') return true;
                    const diaInfo = (colab.dias || []).find(x => x.data === dateStr);
                    const status = diaInfo ? diaInfo.status : 'disponivel';
                    return status === agendaEscalaFiltroStatus;
                });`;
const filterNew = `                // Filtrar colaboradores pelo status selecionado
                const colabsFiltrados = (agendaEscalaData || []).filter(colab => {
                    if (agendaBuscaNome && !(colab.nome_completo || '').toLowerCase().includes(agendaBuscaNome)) return false;
                    if (agendaBuscaSetores.length > 0 && !agendaBuscaSetores.includes(colab.departamento)) return false;
                    
                    if (agendaEscalaFiltroStatus === 'todos') return true;
                    const diaInfo = (colab.dias || []).find(x => x.data === dateStr);
                    const status = diaInfo ? diaInfo.status : 'disponivel';
                    return status === agendaEscalaFiltroStatus;
                });`;
text = text.replace(filterOld, filterNew);

// 4. Atualizar o DOM do filtro
const domOld = `            \${agendaFilterTipo === 'escala' ? \`
            <div style="display:flex; gap:10px; margin-bottom:10px; flex-wrap:wrap; align-items:center;">
                <input type="text" placeholder="Buscar por nome..." value="\${agendaBuscaNome || ''}" oninput="rhAgendaSetBuscaNome(this.value)" style="padding:6px 12px; border:1px solid #cbd5e1; border-radius:6px; font-size:0.85rem; outline:none; min-width:200px;">
                <select onchange="rhAgendaSetBuscaSetor(this.value)" style="padding:6px 12px; border:1px solid #cbd5e1; border-radius:6px; font-size:0.85rem; outline:none; min-width:150px; background:#fff;">
                    <option value="">Todos os Setores</option>
                    \${Array.from(new Set(agendaEscalaData.map(c => c.departamento).filter(Boolean))).sort().map(d => \`<option value="\${d}" \${agendaBuscaSetor===d?'selected':''}>\${d}</option>\`).join('')}
                </select>
            </div>
            <div id="ag-escala-filtro-bar" style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:0.6rem 0;margin-bottom:0.75rem;">
            <span style="font-size:0.75rem;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;margin-right:4px;">Mostrar:</span>`;

const domNew = `            \${agendaFilterTipo === 'escala' ? \`
            <div id="ag-escala-filtro-wrap" style="display:flex; gap:16px; margin-bottom:16px; align-items:center; flex-wrap:wrap; background:#fff; border:1px solid #e2e8f0; border-radius:10px; padding:12px 16px; box-shadow:0 1px 3px rgba(0,0,0,0.05);">
                <div style="display:flex; align-items:center; gap:8px;">
                    <i class="ph ph-magnifying-glass" style="color:#94a3b8;font-size:1.1rem;"></i>
                    <input type="text" placeholder="Buscar por nome..." value="\${agendaBuscaNome || ''}" oninput="rhAgendaSetBuscaNome(this.value)" style="padding:6px 10px; border:none; border-bottom:1px solid #cbd5e1; font-size:0.85rem; outline:none; min-width:180px; background:transparent;">
                </div>
                
                <div style="width:1px; height:24px; background:#e2e8f0; margin:0 4px;"></div>
                
                <div style="display:flex; flex-wrap:wrap; gap:6px; flex:1; align-items:center;">
                    <span style="font-size:0.75rem;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;margin-right:4px;">Setores:</span>
                    \${Array.from(new Set(agendaEscalaData.map(c => c.departamento).filter(Boolean))).sort().map(d => {
                        const isSelected = agendaBuscaSetores.includes(d);
                        return \`<button onclick="rhAgendaToggleSetor('\${d}')" style="border:1.5px solid \${isSelected ? '#3b82f6' : '#e2e8f0'}; background:\${isSelected ? '#eff6ff' : '#f8fafc'}; color:\${isSelected ? '#1d4ed8' : '#64748b'}; border-radius:16px; padding:3px 12px; font-size:0.75rem; font-weight:\${isSelected ? '700' : '600'}; cursor:pointer; transition:all .15s;">\${d}</button>\`;
                    }).join('')}
                </div>
            </div>
            
            <div id="ag-escala-filtro-bar" style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:0.2rem 0;margin-bottom:0.75rem;">
            <span style="font-size:0.75rem;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;margin-right:4px;">Status:</span>`;
text = text.replace(domOld, domNew);

fs.writeFileSync(rhFile, text, 'utf8');
console.log('Feito!');
