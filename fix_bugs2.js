const fs = require('fs');
let app = fs.readFileSync('frontend/app.js', 'utf8');

// ===================================================
// FIX 1: renderContratosAvulso — usar rota correta de assinaturas
//         e garantir que todos os valores são null-safe
// ===================================================
const OLD_RENDER = `// === SUB-ABA CONTRATOS ===
window.renderContratosAvulso = async function(container) {
    if (!viewedColaborador || !container) return;
    container.innerHTML = '<p class="text-muted"><i class="ph ph-spinner ph-spin"></i> Carregando Documentos...</p>';
    try {
        const [assinaturas, docs, geradores, templates, departamentos] = await Promise.all([
            apiGet('/assinaturas').catch(()=>[]),
            apiGet(\`/colaboradores/\${viewedColaborador.id}/documentos\`).catch(()=>[]),
            apiGet('/geradores').catch(()=>[]),
            apiGet('/geradores-templates').catch(()=>[]),
            apiGet('/departamentos').catch(()=>[])
        ]);
        window._todosGeradores = geradores;

        let availableGeradores = geradores;
        const empDeptId = viewedColaborador.departamento; 
        const deptObj = departamentos.find(d => String(d.nome).trim().toLowerCase() === String(empDeptId).trim().toLowerCase());
        if (deptObj) {
            const geradorIds = templates.filter(t => Number(t.departamento_id) === Number(deptObj.id)).map(t => Number(t.gerador_id));
            if (geradorIds.length > 0) {
                availableGeradores = geradores.filter(g => geradorIds.includes(Number(g.id)));
            }
        }

        const filteredDocs = (docs || []).filter(d => d.tab_name === 'CONTRATOS');`;

const NEW_RENDER = `// === SUB-ABA CONTRATOS ===
window.renderContratosAvulso = async function(container) {
    if (!viewedColaborador || !container) return;
    container.innerHTML = '<p class="text-muted"><i class="ph ph-spinner ph-spin"></i> Carregando Documentos...</p>';
    try {
        // Busca paralela com null-safe em todas as respostas
        const safeGet = async (url) => {
            try {
                const r = await apiGet(url);
                return Array.isArray(r) ? r : (r ? [r] : []);
            } catch(e) { return []; }
        };
        const [assinaturas, docs, geradores, templates, departamentos] = await Promise.all([
            safeGet(\`/colaboradores/\${viewedColaborador.id}/admissao-assinaturas\`),
            safeGet(\`/colaboradores/\${viewedColaborador.id}/documentos\`),
            safeGet('/geradores'),
            safeGet('/geradores-templates'),
            safeGet('/departamentos')
        ]);
        window._todosGeradores = geradores;

        let availableGeradores = geradores;
        const empDeptId = viewedColaborador.departamento; 
        const deptObj = departamentos.find(d => String(d.nome).trim().toLowerCase() === String(empDeptId).trim().toLowerCase());
        if (deptObj) {
            const geradorIds = templates.filter(t => Number(t.departamento_id) === Number(deptObj.id)).map(t => Number(t.gerador_id));
            if (geradorIds.length > 0) {
                availableGeradores = geradores.filter(g => geradorIds.includes(Number(g.id)));
            }
        }

        const filteredDocs = docs.filter(d => d.tab_name === 'CONTRATOS');`;

if (!app.includes(OLD_RENDER)) {
    // Try to find and fix what's there
    app = app.replace(
        "const filteredDocs = (docs || []).filter(d => d.tab_name === 'CONTRATOS');",
        "const filteredDocs = docs.filter(d => d.tab_name === 'CONTRATOS');"
    );
    // Fix assinaturas call
    app = app.replace(
        "apiGet('/assinaturas').catch(()=>[])",
        "safeGet(`/colaboradores/${viewedColaborador.id}/admissao-assinaturas`)"
    );
    // Add safeGet helper right after the try {
    app = app.replace(
        `    container.innerHTML = '<p class="text-muted"><i class="ph ph-spinner ph-spin"></i> Carregando Documentos...</p>';
    try {
        // Busca paralela com null-safe em todas as respostas`,
        `    container.innerHTML = '<p class="text-muted"><i class="ph ph-spinner ph-spin"></i> Carregando Documentos...</p>';
    try {
        // Busca paralela com null-safe em todas as respostas
        const safeGet = async (url) => {
            try {
                const r = await apiGet(url);
                return Array.isArray(r) ? r : (r ? [r] : []);
            } catch(e) { return []; }
        };`
    );
    console.log('Applied targeted fix');
} else {
    app = app.replace(OLD_RENDER, NEW_RENDER);
    console.log('Applied full replace');
}

// ===================================================
// FIX 2: buildContratosSignatureRows — null-safe assinaturas
// ===================================================
app = app.replace(
    `window.buildContratosSignatureRows = function(assinaturas, docs, colab) {
    assinaturas = assinaturas || [];
    docs = docs || [];`,
    `window.buildContratosSignatureRows = function(assinaturas, docs, colab) {
    assinaturas = Array.isArray(assinaturas) ? assinaturas : [];
    docs = Array.isArray(docs) ? docs : [];`
);

// ===================================================
// FIX 3: Adicionar botão "Selecionar Todos" no card do gerador templates
// ===================================================

// Find the card header in renderGeradoresTemplates and add select all button
const OLD_CARD_HEADER = `                    <div style="display:flex; align-items:center; gap:1rem;">
                        <span class="badge bg-secondary" id="doc-count-\${g.id}" style="font-size:0.75rem; padding:0.4em 0.6em; border-radius:12px;">
                            \${checked.length} Setores
                        </span>
                        <i class="ph ph-caret-down tg-icon" style="transition:0.2s; color:#64748b;"></i>
                    </div>
                </div>
                <div class="card-body" style="display:none; padding:1rem; background:#fff; grid-template-columns:repeat(auto-fill, minmax(240px, 1fr)); gap:0.5rem;">
                    \${deptList}
                </div>`;

const NEW_CARD_HEADER = `                    <div style="display:flex; align-items:center; gap:0.5rem;">
                        <span class="badge bg-secondary" id="doc-count-\${g.id}" style="font-size:0.75rem; padding:0.4em 0.6em; border-radius:12px;">
                            \${checked.length} Setores
                        </span>
                        <button onclick="event.stopPropagation(); window.selecionarTodosSetores(\${g.id})" style="font-size:0.72rem;padding:0.3em 0.6em;border:1px solid #e2e8f0;border-radius:6px;background:#fff;cursor:pointer;color:#475569;" title="Selecionar/Desmarcar todos">Todos</button>
                        <i class="ph ph-caret-down tg-icon" style="transition:0.2s; color:#64748b;"></i>
                    </div>
                </div>
                <div class="card-body" style="display:none; padding:1rem; background:#fff; grid-template-columns:repeat(auto-fill, minmax(240px, 1fr)); gap:0.5rem;">
                    \${deptList}
                </div>`;

if (app.includes(OLD_CARD_HEADER)) {
    app = app.replace(OLD_CARD_HEADER, NEW_CARD_HEADER);
    console.log('Fix 3 (select all button): OK');
} else {
    console.log('Fix 3: pattern not found, trying alternate...');
    // Try adding it after the badge span
    app = app.replace(
        `<button onclick="event.stopPropagation(); window.selecionarTodosSetores(\${g.id})"`,
        `<button onclick="event.stopPropagation(); window.selecionarTodosSetores(\${g.id})"`
    );
}

// Add the selecionarTodosSetores function after updateLocalDocCount
app = app.replace(
    `window.saveBatchGeradorDeptTemplates = async function() {`,
    `window.selecionarTodosSetores = function(docId) {
    const chks = document.querySelectorAll(\`.gerador-dept-chk[data-gerador="\${docId}"]\`);
    const anyUnchecked = Array.from(chks).some(c => !c.checked);
    chks.forEach(c => { c.checked = anyUnchecked; });
    window.updateLocalDocCount(docId);
};

window.saveBatchGeradorDeptTemplates = async function() {`
);

fs.writeFileSync('frontend/app.js', app);

// ===================================================
// Verify fixes
// ===================================================
const verifyApp = fs.readFileSync('frontend/app.js', 'utf8');
console.log('selecionarTodosSetores OK:', verifyApp.includes('window.selecionarTodosSetores'));
console.log('safeGet OK:', verifyApp.includes('const safeGet'));
console.log('admissao-assinaturas OK:', verifyApp.includes('admissao-assinaturas'));
console.log('Done.');
