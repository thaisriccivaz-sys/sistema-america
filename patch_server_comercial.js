const fs = require('fs');

const path = 'backend/server.js';
let content = fs.readFileSync(path, 'utf8');

// POST route
content = content.replace(
    'const { cliente_nome, cliente_email, endereco_instalacao, qtd_max_colaboradores, qtd_max_veiculos, data_limite_envio, docs_exigidos, licencas } = req.body;',
    'const { cliente_nome, os, cliente_email, endereco_instalacao, qtd_max_colaboradores, qtd_max_veiculos, data_limite_envio, docs_exigidos, licencas } = req.body;'
);

content = content.replace(
    "db.run(`INSERT INTO credenciamentos (cliente_nome, cliente_email, endereco_instalacao, qtd_max_colaboradores, qtd_max_veiculos, data_limite_envio, docs_exigidos, licencas_ids, status, token) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'solicitado', '')`,",
    "db.run(`INSERT INTO credenciamentos (cliente_nome, os, cliente_email, endereco_instalacao, qtd_max_colaboradores, qtd_max_veiculos, data_limite_envio, docs_exigidos, licencas_ids, status, token) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'solicitado', '')`,"
);

// We need to add `os || '',` after `cliente_nome,` in the POST and PUT arrays
// They are exactly `cliente_nome, ` followed by `cliente_email, `
// I will use replace but replacing exactly what's there
content = content.replace(
    /cliente_nome,\s+cliente_email,/g,
    "cliente_nome, os || '', cliente_email,"
);

// PUT route
content = content.replace(
    "db.run(`UPDATE credenciamentos SET cliente_nome = ?, cliente_email = ?, endereco_instalacao = ?, qtd_max_colaboradores = ?, qtd_max_veiculos = ?, data_limite_envio = ?, docs_exigidos = ?, licencas_ids = ? WHERE id = ? AND status = 'solicitado'`,",
    "db.run(`UPDATE credenciamentos SET cliente_nome = ?, os = ?, cliente_email = ?, endereco_instalacao = ?, qtd_max_colaboradores = ?, qtd_max_veiculos = ?, data_limite_envio = ?, docs_exigidos = ?, licencas_ids = ? WHERE id = ? AND status = 'solicitado'`,"
);

// GET route
content = content.replace(
    'SELECT id, cliente_nome, cliente_email, endereco_instalacao, token, colaboradores_ids, veiculos_ids, licencas_ids, docs_exigidos, valid_until, acessado_em, created_at',
    'SELECT id, cliente_nome, os, cliente_email, endereco_instalacao, token, colaboradores_ids, veiculos_ids, licencas_ids, docs_exigidos, valid_until, acessado_em, created_at'
);

fs.writeFileSync(path, content);
console.log('Done');
