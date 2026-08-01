const path = require('path');
const Database = require('better-sqlite3');
const db = new Database(path.join('backend', 'data', 'colaboradores.db'));
const r = db.prepare("SELECT id, nome_completo, departamento, departamento_tipo, cargo, status FROM colaboradores WHERE LOWER(nome_completo) LIKE '%alisson%'").all();
console.log(JSON.stringify(r, null, 2));

// Also check what docs Adriano has in contratos tab
const docs = db.prepare("SELECT id, document_type, tab_name, file_name FROM documentos WHERE colaborador_id = (SELECT id FROM colaboradores WHERE LOWER(nome_completo) LIKE '%adriano%' LIMIT 1) AND tab_name IN ('CONTRATOS', 'CERTIFICADOS', 'CONTRATOS_AVULSOS') ORDER BY tab_name, document_type").all();
console.log('\nAdrianos contratos/certificados docs:', JSON.stringify(docs, null, 2));
