const fs = require('fs');
let app = fs.readFileSync('frontend/app.js', 'utf8');

// Find the broken section boundaries
const START = 'window.loadGeradoresTemplates = async function() {';
const END = 'window.saveBatchGeradorDeptTemplates = async function() {';

const startIdx = app.indexOf(START);
const endIdx = app.indexOf(END);

if (startIdx === -1 || endIdx === -1) {
    console.error('Markers not found!', 'start:', startIdx, 'end:', endIdx);
    process.exit(1);
}

const before = app.substring(0, startIdx);
const after = app.substring(endIdx);

const replacement = `window.loadGeradoresTemplates = async function() {
    const container = document.getElementById('geradores-templates-container');
    if (!container) return;
    container.innerHTML = \`<div style="text-align:center;padding:2rem;color:#94a3b8;"><i class="ph ph-circle-notch" style="font-size:2rem;"></i> Carregando...</div>\`;

    try {
        const [departamentos, geradores, templates] = await Promise.all([
            apiGet('/departamentos'),
            apiGet('/geradores'),
            apiGet('/gerador-departamento-templates').catch(() => [])
        ]);
        window._deptTemplatesAll = templates;
        window.renderGeradoresTemplates(departamentos, geradores, templates);
    } catch(e) {
        container.innerHTML = \`<div class="card p-4" style="color:#e53e3e;">Erro ao carregar dados: \${e.message}</div>\`;
    }
};

window.renderGeradoresTemplates = function(departamentos, geradores, templates) {
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
                        <button onclick="event.stopPropagation(); window.selecionarTodosSetores(\${g.id})" style="font-size:0.72rem;padding:0.25em 0.65em;border:1px solid #cbd5e1;border-radius:6px;background:#f8fafc;cursor:pointer;color:#475569;font-weight:600;">Todos</button>
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
    window.filterGeradores();
};

window.updateLocalDocCount = function(docId) {
    const chks = document.querySelectorAll(\`.gerador-dept-chk[data-gerador="\${docId}"]\`);
    const count = Array.from(chks).filter(c => c.checked).length;
    const badge = document.getElementById(\`doc-count-\${docId}\`);
    if (badge) badge.textContent = \`\${count} Setores\`;
};

window.selecionarTodosSetores = function(docId) {
    const chks = document.querySelectorAll(\`.gerador-dept-chk[data-gerador="\${docId}"]\`);
    const anyUnchecked = Array.from(chks).some(c => !c.checked);
    chks.forEach(c => { c.checked = anyUnchecked; });
    window.updateLocalDocCount(docId);
};

`;

// Remove stale copies of updateLocalDocCount and selecionarTodosSetores that appear after saveBatchGeradorDeptTemplates
let newApp = before + replacement + after;

// Clean up any duplicates that might have been left over
const dupPattern1 = /window\.updateLocalDocCount = function\(docId\)[\s\S]*?^};\s*/mg;
const dupPattern2 = /window\.selecionarTodosSetores = function\(docId\)[\s\S]*?^};\s*/mg;

// Keep only the first occurrence of each by removing after saveBatchGeradorDeptTemplates
const saveBatchIdx = newApp.indexOf('window.saveBatchGeradorDeptTemplates = async function() {');
const beforeSave = newApp.substring(0, saveBatchIdx);
let afterSave = newApp.substring(saveBatchIdx);

// Remove any residual updateLocalDocCount or selecionarTodosSetores in afterSave
afterSave = afterSave.replace(/\nwindow\.updateLocalDocCount = function\(docId\)[\s\S]*?^};\n/mg, '\n');
afterSave = afterSave.replace(/\nwindow\.selecionarTodosSetores = function\(docId\)[\s\S]*?^};\n/mg, '\n');

newApp = beforeSave + afterSave;
fs.writeFileSync('frontend/app.js', newApp);

// Verify
const v = fs.readFileSync('frontend/app.js', 'utf8');
const selecionarCount = (v.match(/window\.selecionarTodosSetores = function/g) || []).length;
const updateCount = (v.match(/window\.updateLocalDocCount = function/g) || []).length;
const deptListOK = v.includes("const deptList = departamentos.map(d =>");
const todosBtn = v.includes("selecionarTodosSetores(${g.id})");
console.log('selecionarTodosSetores count (should be 1):', selecionarCount);
console.log('updateLocalDocCount count (should be 1):', updateCount);
console.log('deptList OK:', deptListOK);
console.log('Todos button OK:', todosBtn);
console.log('DONE');
