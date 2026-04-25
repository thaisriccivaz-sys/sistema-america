const fs = require('fs');
let app = fs.readFileSync('frontend/app.js', 'utf8');

// Find the entire renderGeradoresTemplates function and replace it cleanly
const START_MARKER = 'window.renderGeradoresTemplates = function(departamentos, geradores, templates) {';
const startIdx = app.indexOf(START_MARKER);
if (startIdx === -1) { console.error('START MARKER NOT FOUND'); process.exit(1); }

// Find the end: "window.filterGeradores = function()"
const END_MARKER = '\nwindow.filterGeradores = function() {';
const endIdx = app.indexOf(END_MARKER, startIdx);
if (endIdx === -1) { console.error('END MARKER NOT FOUND'); process.exit(1); }

const before = app.substring(0, startIdx);
const after = app.substring(endIdx);

const newFunc = `window.renderGeradoresTemplates = function(departamentos, geradores, templates) {
    const container = document.getElementById('geradores-templates-container');
    if (!container) return;

    if (!geradores || geradores.length === 0) {
        container.innerHTML = \`<div class="card p-4 text-center" style="color:#94a3b8;"><i class="ph ph-file-text" style="font-size:2.5rem;margin-bottom:1rem;display:block;"></i>Nenhum gerador cadastrado.</div>\`;
        return;
    }
    if (!departamentos || departamentos.length === 0) {
        container.innerHTML = \`<div class="card p-4 text-center" style="color:#94a3b8;"><i class="ph ph-buildings" style="font-size:2.5rem;margin-bottom:1rem;display:block;"></i>Nenhum departamento cadastrado.</div>\`;
        return;
    }

    // Mapa: { gerador_id: [departamento_id, ...] }
    const docMap = {};
    (templates || []).forEach(t => {
        if (!docMap[t.gerador_id]) docMap[t.gerador_id] = [];
        docMap[t.gerador_id].push(Number(t.departamento_id));
    });

    const listHTML = geradores.map(g => {
        const checked = docMap[g.id] || [];
        const deptList = departamentos.map(d => \`
            <label class="doc-lbl-item" data-dept-name="\${d.nome.replace(/"/g, '&quot;')}" style="display:flex; align-items:center; gap:0.6rem; padding:0.45rem 0.75rem; border-radius:6px; cursor:pointer; transition:background 0.15s;"
                   onmouseenter="this.style.background='#f8fafc'" onmouseleave="this.style.background=''">
                <input type="checkbox" class="gerador-dept-chk"
                    data-dept="\${d.id}" data-gerador="\${g.id}"
                    \${checked.includes(Number(d.id)) ? 'checked' : ''}
                    onchange="window.updateLocalDocCount(\${g.id})"
                    style="width:16px;height:16px;cursor:pointer;accent-color:#f503c5;">
                <span style="font-size:0.88rem; color:#334155;">\${d.nome}</span>
            </label>\`).join('');

        return \`
            <div class="card mb-3 dept-template-card" data-doc-name="\${g.nome.replace(/"/g, '&quot;')}" style="overflow:hidden;">
                <div class="card-header bg-light d-flex align-items-center justify-content-between" style="padding:0.75rem 1rem; border-bottom:1px solid #e2e8f0; cursor:pointer;" onclick="const b=this.nextElementSibling; const i=this.querySelector('.tg-icon'); if(b.style.display==='none'){b.style.display='grid'; i.style.transform='rotate(180deg)';}else{b.style.display='none'; i.style.transform='rotate(0deg)';}">
                    <div style="display:flex; align-items:center; gap:0.5rem; font-weight:600; color:#1e293b;">
                        <i class="ph ph-file-text" style="color:#f503c5; font-size:1.1rem;"></i>
                        \${g.nome}
                    </div>
                    <div style="display:flex; align-items:center; gap:0.5rem;">
                        <span class="badge bg-secondary" id="doc-count-\${g.id}" style="font-size:0.75rem; padding:0.4em 0.6em; border-radius:12px;">
                            \${checked.length} Setores
                        </span>
                        <button onclick="event.stopPropagation(); window.selecionarTodosSetores(\${g.id})" style="font-size:0.72rem;padding:0.25em 0.6em;border:1px solid #cbd5e1;border-radius:6px;background:#f8fafc;cursor:pointer;color:#475569;font-weight:600;" title="Selecionar / Desmarcar todos">Todos</button>
                        <i class="ph ph-caret-down tg-icon" style="transition:0.2s; color:#64748b;"></i>
                    </div>
                </div>
                <div class="card-body" style="display:none; padding:1rem; background:#fff; grid-template-columns:repeat(auto-fill, minmax(240px, 1fr)); gap:0.5rem;">
                    \${deptList}
                </div>
            </div>
        \`;
    }).join('');

    container.innerHTML = \`
        <div style="display: flex; justify-content: flex-end; margin-bottom: 1rem;">
            <button class="btn btn-success" onclick="window.saveBatchGeradorDeptTemplates()" style="display:flex; align-items:center; gap:0.5rem; font-weight:600;">
                <i class="ph ph-floppy-disk"></i> Salvar Templates
            </button>
        </div>
        \${listHTML}
        <div style="display: flex; justify-content: flex-end; margin-top: 1rem;">
            <button class="btn btn-success" onclick="window.saveBatchGeradorDeptTemplates()" style="display:flex; align-items:center; gap:0.5rem; font-weight:600;">
                <i class="ph ph-floppy-disk"></i> Salvar Templates
            </button>
        </div>
    \`;
    
    // Apply immediate filter just in case the search bar has text
    window.filterGeradores();
};

`;

app = before + newFunc + after;
fs.writeFileSync('frontend/app.js', app);
console.log('renderGeradoresTemplates rewritten successfully!');

// Verify
const v = fs.readFileSync('frontend/app.js', 'utf8');
console.log('Todos button present:', v.includes('selecionarTodosSetores'));
console.log('deptList correctly placed:', v.includes('const deptList = departamentos.map'));
