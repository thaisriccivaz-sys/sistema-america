const fs = require('fs');

const path = 'backend/server.js';
let content = fs.readFileSync(path, 'utf8');

// POST /api/comercial/credenciamento
content = content.replace(
    "app.post('/api/comercial/credenciamento', authenticateToken, (req, res) => {\r\n    const { cliente_nome, cliente_email, endereco_instalacao, qtd_max_colaboradores, qtd_max_veiculos, data_limite_envio, docs_exigidos, licencas } = req.body;\r\n    if (!cliente_nome || !cliente_email) return res.status(400).json({ error: 'Nome e email são obrigatórios.' });\r\n\r\n    db.run(`INSERT INTO credenciamentos (cliente_nome, cliente_email, endereco_instalacao, qtd_max_colaboradores, qtd_max_veiculos, data_limite_envio, docs_exigidos, licencas_ids, status, token) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'solicitado', '')`,\r\n        [\r\n            cliente_nome, \r\n            cliente_email, ",
    "app.post('/api/comercial/credenciamento', authenticateToken, (req, res) => {\r\n    const { cliente_nome, os, cliente_email, endereco_instalacao, qtd_max_colaboradores, qtd_max_veiculos, data_limite_envio, docs_exigidos, licencas } = req.body;\r\n    if (!cliente_nome || !cliente_email) return res.status(400).json({ error: 'Nome e email são obrigatórios.' });\r\n\r\n    db.run(`INSERT INTO credenciamentos (cliente_nome, os, cliente_email, endereco_instalacao, qtd_max_colaboradores, qtd_max_veiculos, data_limite_envio, docs_exigidos, licencas_ids, status, token) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'solicitado', '')`,\r\n        [\r\n            cliente_nome, \r\n            os || '',\r\n            cliente_email, "
);
content = content.replace(
    "app.post('/api/comercial/credenciamento', authenticateToken, (req, res) => {\n    const { cliente_nome, cliente_email, endereco_instalacao, qtd_max_colaboradores, qtd_max_veiculos, data_limite_envio, docs_exigidos, licencas } = req.body;\n    if (!cliente_nome || !cliente_email) return res.status(400).json({ error: 'Nome e email são obrigatórios.' });\n\n    db.run(`INSERT INTO credenciamentos (cliente_nome, cliente_email, endereco_instalacao, qtd_max_colaboradores, qtd_max_veiculos, data_limite_envio, docs_exigidos, licencas_ids, status, token) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'solicitado', '')`,\n        [\n            cliente_nome, \n            cliente_email, ",
    "app.post('/api/comercial/credenciamento', authenticateToken, (req, res) => {\n    const { cliente_nome, os, cliente_email, endereco_instalacao, qtd_max_colaboradores, qtd_max_veiculos, data_limite_envio, docs_exigidos, licencas } = req.body;\n    if (!cliente_nome || !cliente_email) return res.status(400).json({ error: 'Nome e email são obrigatórios.' });\n\n    db.run(`INSERT INTO credenciamentos (cliente_nome, os, cliente_email, endereco_instalacao, qtd_max_colaboradores, qtd_max_veiculos, data_limite_envio, docs_exigidos, licencas_ids, status, token) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'solicitado', '')`,\n        [\n            cliente_nome, \n            os || '',\n            cliente_email, "
);

// PUT /api/comercial/credenciamento/:id
content = content.replace(
    "app.put('/api/comercial/credenciamento/:id', authenticateToken, (req, res) => {\r\n    const { cliente_nome, cliente_email, endereco_instalacao, qtd_max_colaboradores, qtd_max_veiculos, data_limite_envio, docs_exigidos, licencas } = req.body;\r\n    \r\n    db.run(`UPDATE credenciamentos SET cliente_nome = ?, cliente_email = ?, endereco_instalacao = ?, qtd_max_colaboradores = ?, qtd_max_veiculos = ?, data_limite_envio = ?, docs_exigidos = ?, licencas_ids = ? WHERE id = ? AND status = 'solicitado'`,\r\n        [\r\n            cliente_nome, \r\n            cliente_email, ",
    "app.put('/api/comercial/credenciamento/:id', authenticateToken, (req, res) => {\r\n    const { cliente_nome, os, cliente_email, endereco_instalacao, qtd_max_colaboradores, qtd_max_veiculos, data_limite_envio, docs_exigidos, licencas } = req.body;\r\n    \r\n    db.run(`UPDATE credenciamentos SET cliente_nome = ?, os = ?, cliente_email = ?, endereco_instalacao = ?, qtd_max_colaboradores = ?, qtd_max_veiculos = ?, data_limite_envio = ?, docs_exigidos = ?, licencas_ids = ? WHERE id = ? AND status = 'solicitado'`,\r\n        [\r\n            cliente_nome, \r\n            os || '',\r\n            cliente_email, "
);
content = content.replace(
    "app.put('/api/comercial/credenciamento/:id', authenticateToken, (req, res) => {\n    const { cliente_nome, cliente_email, endereco_instalacao, qtd_max_colaboradores, qtd_max_veiculos, data_limite_envio, docs_exigidos, licencas } = req.body;\n    \n    db.run(`UPDATE credenciamentos SET cliente_nome = ?, cliente_email = ?, endereco_instalacao = ?, qtd_max_colaboradores = ?, qtd_max_veiculos = ?, data_limite_envio = ?, docs_exigidos = ?, licencas_ids = ? WHERE id = ? AND status = 'solicitado'`,\n        [\n            cliente_nome, \n            cliente_email, ",
    "app.put('/api/comercial/credenciamento/:id', authenticateToken, (req, res) => {\n    const { cliente_nome, os, cliente_email, endereco_instalacao, qtd_max_colaboradores, qtd_max_veiculos, data_limite_envio, docs_exigidos, licencas } = req.body;\n    \n    db.run(`UPDATE credenciamentos SET cliente_nome = ?, os = ?, cliente_email = ?, endereco_instalacao = ?, qtd_max_colaboradores = ?, qtd_max_veiculos = ?, data_limite_envio = ?, docs_exigidos = ?, licencas_ids = ? WHERE id = ? AND status = 'solicitado'`,\n        [\n            cliente_nome, \n            os || '',\n            cliente_email, "
);

// GET /api/logistica/credenciamentos
content = content.replace(
    "SELECT id, cliente_nome, cliente_email, endereco_instalacao, token, colaboradores_ids, veiculos_ids, licencas_ids, docs_exigidos, valid_until, acessado_em, created_at\r\n            FROM credenciamentos",
    "SELECT id, cliente_nome, os, cliente_email, endereco_instalacao, token, colaboradores_ids, veiculos_ids, licencas_ids, docs_exigidos, valid_until, acessado_em, created_at\r\n            FROM credenciamentos"
);
content = content.replace(
    "SELECT id, cliente_nome, cliente_email, endereco_instalacao, token, colaboradores_ids, veiculos_ids, licencas_ids, docs_exigidos, valid_until, acessado_em, created_at\n            FROM credenciamentos",
    "SELECT id, cliente_nome, os, cliente_email, endereco_instalacao, token, colaboradores_ids, veiculos_ids, licencas_ids, docs_exigidos, valid_until, acessado_em, created_at\n            FROM credenciamentos"
);

fs.writeFileSync(path, content);
console.log('Fixed server.js carefully');
