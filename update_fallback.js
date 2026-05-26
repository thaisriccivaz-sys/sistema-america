const fs = require('fs');

let serverPath = 'backend/server.js';
let serverJs = fs.readFileSync(serverPath, 'utf8');

const fallbackOld = "SELECT id, cliente_nome, cliente_email, endereco_instalacao, token, colaboradores_ids, veiculos_ids, licencas_ids, docs_exigidos, valid_until, acessado_em, created_at";
const fallbackNew = "SELECT id, cliente_nome, os, cliente_email, endereco_instalacao, token, colaboradores_ids, veiculos_ids, licencas_ids, docs_exigidos, valid_until, acessado_em, created_at, qtd_max_colaboradores, qtd_max_veiculos, data_limite_envio, status";

serverJs = serverJs.replace(fallbackOld, fallbackNew);

const mappedOld = "const mapped = (rows2 || []).map(r => ({ ...r, os: '', status: r.status || 'enviado', qtd_max_colaboradores: 0, qtd_max_veiculos: 0, data_limite_envio: null }));";
const mappedNew = "const mapped = (rows2 || []).map(r => ({ ...r, status: r.status || 'enviado' }));";

serverJs = serverJs.replace(mappedOld, mappedNew);

fs.writeFileSync(serverPath, serverJs, 'utf8');
console.log("Updated fallback query in server.js");