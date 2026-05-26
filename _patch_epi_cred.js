const fs = require('fs');
let sv = fs.readFileSync('backend/server.js', 'utf8');

// ── 1. Adicionar query de EPI fichas junto com colabDocsPromise ──────────────
// O colabDocsPromise já existe. Precisamos adicionar a query de EPI fichas.
const oldColabDocsPromise = `        const colabDocsPromise = new Promise((resolve) => {
            if (colabIds.length === 0) return resolve([]);
            const placeholders = colabIds.map(() => '?').join(',');
            db.all(\`SELECT id, colaborador_id, document_type, file_name, file_path, signed_file_path FROM documentos WHERE colaborador_id IN (\${placeholders})\`, colabIds, (err, docs) => {
                resolve(docs || []);
            });
        });`;

const newColabDocsPromise = `        const colabDocsPromise = new Promise((resolve) => {
            if (colabIds.length === 0) return resolve([]);
            const placeholders = colabIds.map(() => '?').join(',');
            db.all(\`SELECT id, colaborador_id, document_type, file_name, file_path, signed_file_path FROM documentos WHERE colaborador_id IN (\${placeholders})\`, colabIds, (err, docs) => {
                resolve(docs || []);
            });
        });

        // Buscar fichas de EPI ativas (tabela separada)
        const epiPromise = new Promise((resolve) => {
            if (colabIds.length === 0) return resolve([]);
            const placeholders = colabIds.map(() => '?').join(',');
            db.all(\`SELECT id, colaborador_id FROM colaborador_epi_fichas WHERE colaborador_id IN (\${placeholders}) AND status='ativa' ORDER BY id DESC\`, colabIds, (err, rows) => {
                resolve((rows || []).map(r => ({
                    id: r.id,
                    colaborador_id: r.colaborador_id,
                    document_type: 'Ficha de EPI',
                    file_name: \`Ficha_EPI_colab\${r.colaborador_id}.pdf\`,
                    file_path: null,
                    signed_file_path: null,
                    _is_epi_ficha: true
                })));
            });
        });`;

if (!sv.includes(oldColabDocsPromise)) {
    // Try with CRLF
    const crlf = oldColabDocsPromise.replace(/\n/g, '\r\n');
    if (sv.includes(crlf)) {
        sv = sv.replace(crlf, newColabDocsPromise.replace(/\n/g, '\r\n'));
        console.log('[1] EPI query added (CRLF)');
    } else {
        console.log('ERROR: colabDocsPromise not found');
        // Try partial match
        const partial = "db.all(`SELECT id, colaborador_id, document_type, file_name, file_path, signed_file_path FROM documentos WHERE colaborador_id IN";
        const idx = sv.indexOf(partial);
        console.log('Partial match at:', idx);
        process.exit(1);
    }
} else {
    sv = sv.replace(oldColabDocsPromise, newColabDocsPromise);
    console.log('[1] EPI query added');
}

// ── 2. Add epiPromise to Promise.all ─────────────────────────────────────────
// The existing Promise.all was already patched to: Promise.all([colabDocsPromise, veicDocsPromise, licencasDbPromise])
// Need to add epiPromise
sv = sv.replace(
    'Promise.all([colabDocsPromise, veicDocsPromise, licencasDbPromise]).then(([docs, frotas, licencasDb]) => {',
    'Promise.all([colabDocsPromise, veicDocsPromise, licencasDbPromise, epiPromise]).then(([docs, frotas, licencasDb, epiDocs]) => {\n            // Merge EPI docs with regular docs (deduplicate by colaborador_id - keep only one EPI per collab)\n            const docsComEPI = [...docs];\n            epiDocs.forEach(ed => {\n                // Only add if not already present in documentos table\n                if (!docsComEPI.some(d => d.colaborador_id === ed.colaborador_id && (d.document_type || \'\').toLowerCase().includes(\'epi\'))) {\n                    docsComEPI.push(ed);\n                }\n            });'
);
console.log('[2] epiPromise added to Promise.all');

// ── 3. Use docsComEPI instead of docs in the collaboradores filter ────────────
sv = sv.replace(
    '                        const filtrados = docs\r\n                            .filter(d => d.colaborador_id === c.id && isPermitido(d))',
    '                        const filtrados = docsComEPI\r\n                            .filter(d => d.colaborador_id === c.id && isPermitido(d))'
);
// Try LF version
sv = sv.replace(
    '                        const filtrados = docs\n                            .filter(d => d.colaborador_id === c.id && isPermitido(d))',
    '                        const filtrados = docsComEPI\n                            .filter(d => d.colaborador_id === c.id && isPermitido(d))'
);
console.log('[3] docs replaced with docsComEPI in filter');

// ── 4. Add _is_epi_ficha flag to the mapped output so frontend can use right download URL ──
const oldMap = `                            .map(d => ({\r\n                                id: d.id,\r\n                                tipo: d.document_type,\r\n                                nome_arquivo: d.file_name,\r\n                                tem_assinado: !!d.signed_file_path,\r\n                                _chave: getChaveDoc(d)\r\n                            }));`;
const newMap = `                            .map(d => ({\r\n                                id: d.id,\r\n                                tipo: d.document_type,\r\n                                nome_arquivo: d.file_name,\r\n                                tem_assinado: !!d.signed_file_path,\r\n                                _chave: getChaveDoc(d),\r\n                                is_epi: !!d._is_epi_ficha\r\n                            }));`;
if (sv.includes(oldMap)) {
    sv = sv.replace(oldMap, newMap);
    console.log('[4] is_epi flag added to map output');
} else {
    const oldMapLF = oldMap.replace(/\r\n/g, '\n');
    if (sv.includes(oldMapLF)) {
        sv = sv.replace(oldMapLF, newMap.replace(/\r\n/g, '\n'));
        console.log('[4] is_epi flag added (LF)');
    } else {
        console.log('WARN: map not found for is_epi, skipping');
    }
}

fs.writeFileSync('backend/server.js', sv, 'utf8');
console.log('Done backend patches');
