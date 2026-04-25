const fs = require('fs');

// ===== FIX 1: server.js - pdfParse import =====
let server = fs.readFileSync('backend/server.js', 'utf8');

// Fix the import of pdf-parse to handle both v1 and v2
server = server.replace(
    "const pdfParse = require('pdf-parse');",
    "const _pdfParseModule = require('pdf-parse');\nconst pdfParse = (typeof _pdfParseModule === 'function') ? _pdfParseModule : (_pdfParseModule.default || _pdfParseModule.parse || Object.values(_pdfParseModule).find(v => typeof v === 'function'));"
);

// Fix documentos route: return [] instead of null
server = server.replace(
    "res.json(rows);\n    });\n});\n\n// ─── ROTAS DE MULTAS DE TRÂNSITO",
    "res.json(rows || []);\n    });\n});\n\n// ─── ROTAS DE MULTAS DE TRÂNSITO"
);

fs.writeFileSync('backend/server.js', server);
console.log('Fix 1 (server.js): OK');

// ===== FIX 2: app.js - filterGeradores deptName out of scope =====
let app = fs.readFileSync('frontend/app.js', 'utf8');

// Fix deptName referenced outside its forEach scope
app = app.replace(
    `            card.style.display = (deptName.includes(q) || hasVisibleDoc) ? 'block' : 'none';`,
    `            card.style.display = (docName.includes(q) || hasVisibleDoc) ? 'block' : 'none';`
);

// ===== FIX 3: app.js - Contratos renderContratosAvulso null-safe =====
// The docs, assinaturas etc could be null (not just [] on API errors)
app = app.replace(
    `const filteredDocs = docs.filter(d => d.tab_name === 'CONTRATOS');`,
    `const filteredDocs = (docs || []).filter(d => d.tab_name === 'CONTRATOS');`
);

// Also fix assinaturas null
app = app.replace(
    `window.buildContratosSignatureRows = function(assinaturas, docs, colab) {
    if (docs.length === 0) {`,
    `window.buildContratosSignatureRows = function(assinaturas, docs, colab) {
    assinaturas = assinaturas || [];
    docs = docs || [];
    if (docs.length === 0) {`
);

fs.writeFileSync('frontend/app.js', app);
console.log('Fix 2+3 (app.js): OK');
console.log('All 3 fixes applied.');
