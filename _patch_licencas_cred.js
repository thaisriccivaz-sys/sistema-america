const fs = require('fs');

// ── 1. database.js: migration para adicionar coluna licencas_ids ──────────────
let db = fs.readFileSync('backend/database.js', 'utf8');
const migrationMarker = 'CREATE TABLE IF NOT EXISTS credenciamentos (';
const migrationIdx = db.indexOf(migrationMarker);
if (migrationIdx === -1) { console.log('ERROR: credenciamentos table not found in database.js'); process.exit(1); }

// Find the closing ); of the CREATE TABLE block  
const afterCreate = db.indexOf('`);', migrationIdx);
const addColMigration = `\r\n\r\n            // Migration: adicionar coluna licencas_ids se nao existir\r\n            db.run(\`ALTER TABLE credenciamentos ADD COLUMN licencas_ids TEXT\`, () => {});\r\n`;
db = db.slice(0, afterCreate + 3) + addColMigration + db.slice(afterCreate + 3);
fs.writeFileSync('backend/database.js', db, 'utf8');
console.log('[1] database.js: migration adicionada');

// ── 2. server.js: INSERT com licencas ────────────────────────────────────────
let sv = fs.readFileSync('backend/server.js', 'utf8');

// Fix INSERT
const insertOld = 'INSERT INTO credenciamentos (cliente_nome, cliente_email, token, colaboradores_ids, veiculos_ids, docs_exigidos, valid_until) VALUES (?, ?, ?, ?, ?, ?, ?)';
const insertNew = 'INSERT INTO credenciamentos (cliente_nome, cliente_email, token, colaboradores_ids, veiculos_ids, docs_exigidos, licencas_ids, valid_until) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
if (!sv.includes(insertOld)) { console.log('ERROR: INSERT not found'); process.exit(1); }
sv = sv.replace(insertOld, insertNew);

// Fix INSERT values array
const valuesOld = '[cliente_nome, cliente_email, token, JSON.stringify(colaboradores || []), JSON.stringify(veiculos || []), JSON.stringify(docs_exigidos || []), validUntil.toISOString()]';
const valuesNew = '[cliente_nome, cliente_email, token, JSON.stringify(colaboradores || []), JSON.stringify(veiculos || []), JSON.stringify(docs_exigidos || []), JSON.stringify(licencas || []), validUntil.toISOString()]';
if (!sv.includes(valuesOld)) { console.log('ERROR: VALUES array not found'); process.exit(1); }
sv = sv.replace(valuesOld, valuesNew);
console.log('[2] server.js: INSERT corrigido com licencas');

// ── 3. server.js: GET público — retornar licencas no JSON response ────────────
const responseOld = `                veiculos: veics.map(v => {\r\n                    const f = frotas.find(fr => fr.id === v.id);\r\n                    return {\r\n                        ...v,\r\n                        crlv_filename: f ? f.crlv_filename : null,\r\n                        has_crlv: f && !!f.crlv_base64\r\n                    };\r\n                })\r\n            });`;
const responseNew = `                veiculos: veics.map(v => {\r\n                    const f = frotas.find(fr => fr.id === v.id);\r\n                    return {\r\n                        ...v,\r\n                        crlv_filename: f ? f.crlv_filename : null,\r\n                        has_crlv: f && !!f.crlv_base64\r\n                    };\r\n                }),\r\n                licencas: (() => { try { return JSON.parse(cred.licencas_ids || '[]'); } catch(e) { return []; } })()\r\n            });`;
if (!sv.includes(responseOld)) {
    // Try LF version
    const responseOldLF = responseOld.replace(/\r\n/g, '\n');
    if (sv.includes(responseOldLF)) {
        sv = sv.replace(responseOldLF, responseNew.replace(/\r\n/g, '\n'));
        console.log('[3] server.js: GET response corrigido (LF)');
    } else {
        console.log('ERROR: GET response block not found');
        process.exit(1);
    }
} else {
    sv = sv.replace(responseOld, responseNew);
    console.log('[3] server.js: GET response corrigido');
}

fs.writeFileSync('backend/server.js', sv, 'utf8');
console.log('Done backend patches');
