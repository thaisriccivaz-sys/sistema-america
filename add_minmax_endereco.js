// add_minmax_endereco.js
// 1. Adiciona colunas quantidade_minima/maxima na tabela estoque_saldo_por_endereco
// 2. Atualiza o endpoint POST /api/estoque/:id/saldo-enderecos para salvar min/max
// 3. Atualiza o endpoint GET /api/estoque/:id/saldo-enderecos para retornar min/max
// 4. Atualiza /api/estoque-saldos para incluir min/max por endereço no mapa global
// 5. Atualiza renderLinhasEndereco no frontend para mostrar campos min/max por linha

const fs = require('fs');

// ─── 1. BACKEND: adicionar colunas e atualizar endpoints ─────────────────────
let server = fs.readFileSync('backend/server.js', 'utf8');

// 1a. ALTER TABLE migration após a criação da tabela
const tableCreation = `db.run(\`CREATE TABLE IF NOT EXISTS estoque_saldo_por_endereco (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    estoque_id  INTEGER NOT NULL,
    endereco_id INTEGER NOT NULL,
    quantidade  INTEGER DEFAULT 0,
    UNIQUE(estoque_id, endereco_id)
)\``;

const tableCreationNew = `db.run(\`CREATE TABLE IF NOT EXISTS estoque_saldo_por_endereco (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    estoque_id        INTEGER NOT NULL,
    endereco_id       INTEGER NOT NULL,
    quantidade        INTEGER DEFAULT 0,
    quantidade_minima INTEGER DEFAULT 0,
    quantidade_maxima INTEGER DEFAULT 0,
    UNIQUE(estoque_id, endereco_id)
)\``;

if (server.includes(tableCreation)) {
    server = server.replace(tableCreation, tableCreationNew);
    console.log('✅ CREATE TABLE atualizado com colunas min/max');
} else {
    console.log('⚠️  CREATE TABLE não encontrado — pode já estar atualizado');
}

// 1b. Migration para adicionar as colunas se o banco já existir (logo após o CREATE TABLE)
const afterCreate = `if (err && !err.message.includes('already exists')) console.error('[ESTOQUE] Erro ao criar tabela saldo_por_endereco:', err.message);`;
const afterCreateNew = `if (err && !err.message.includes('already exists')) console.error('[ESTOQUE] Erro ao criar tabela saldo_por_endereco:', err.message);
    // Migration: adicionar colunas min/max por endereço se não existirem
    db.run("ALTER TABLE estoque_saldo_por_endereco ADD COLUMN quantidade_minima INTEGER DEFAULT 0", () => {});
    db.run("ALTER TABLE estoque_saldo_por_endereco ADD COLUMN quantidade_maxima INTEGER DEFAULT 0", () => {});`;

if (server.includes(afterCreate) && !server.includes('ADD COLUMN quantidade_minima')) {
    server = server.replace(afterCreate, afterCreateNew);
    console.log('✅ Migration ALTER TABLE adicionada');
} else {
    console.log('⚠️  Migration já existente ou anchor não encontrado');
}

// 1c. Atualizar endpoint GET saldo-enderecos para retornar min/max
const getEndpoint = `app.get('/api/estoque/:id/saldo-enderecos', authenticateToken, (req, res) => {
    const { id } = req.params;
    db.all(
        \`SELECT s.*, e.nome as endereco_nome
         FROM estoque_saldo_por_endereco s
         JOIN estoque_enderecos e ON s.endereco_id = e.id
         WHERE s.estoque_id = ?
         ORDER BY e.nome ASC\`,
        [id], (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows || []);
        }
    );
});`;

// O GET já retorna s.* que inclui as novas colunas — não precisa mudar a query
// Mas vamos confirmar que está OK
if (server.includes("app.get('/api/estoque/:id/saldo-enderecos'")) {
    console.log('✅ GET saldo-enderecos existente — retorna s.* (inclui min/max automaticamente)');
}

// 1d. Atualizar endpoint POST saldo-enderecos para aceitar e salvar min/max
const postSaldoOld = `app.post('/api/estoque/:id/saldo-enderecos', authenticateToken, (req, res) => {
    const { id } = req.params;
    const { endereco_id, quantidade, motivo } = req.body;
    const usuario = req.user ? (req.user.nome || req.user.username || 'Sistema') : 'Sistema';
    if (!endereco_id || quantidade === undefined || quantidade === null) {
        return res.status(400).json({ error: 'endereco_id e quantidade são obrigatórios.' });
    }
    const qtd = parseInt(quantidade) || 0;

    // Upsert no saldo por endereço
    db.run(
        \`INSERT INTO estoque_saldo_por_endereco (estoque_id, endereco_id, quantidade)
         VALUES (?, ?, ?)
         ON CONFLICT(estoque_id, endereco_id) DO UPDATE SET quantidade = quantidade + ?\`,
        [id, endereco_id, qtd, qtd],`;

const postSaldoNew = `app.post('/api/estoque/:id/saldo-enderecos', authenticateToken, (req, res) => {
    const { id } = req.params;
    const { endereco_id, quantidade, quantidade_minima, quantidade_maxima, motivo } = req.body;
    const usuario = req.user ? (req.user.nome || req.user.username || 'Sistema') : 'Sistema';
    if (!endereco_id || quantidade === undefined || quantidade === null) {
        return res.status(400).json({ error: 'endereco_id e quantidade são obrigatórios.' });
    }
    const qtd  = parseInt(quantidade)        || 0;
    const qmin = parseInt(quantidade_minima) || 0;
    const qmax = parseInt(quantidade_maxima) || 0;

    // Upsert no saldo por endereço (define quantidade absoluta + min/max)
    db.run(
        \`INSERT INTO estoque_saldo_por_endereco (estoque_id, endereco_id, quantidade, quantidade_minima, quantidade_maxima)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(estoque_id, endereco_id) DO UPDATE SET
             quantidade = ?,
             quantidade_minima = ?,
             quantidade_maxima = ?\`,
        [id, endereco_id, qtd, qmin, qmax, qtd, qmin, qmax],`;

if (server.includes(postSaldoOld)) {
    server = server.replace(postSaldoOld, postSaldoNew);
    console.log('✅ POST saldo-enderecos atualizado com min/max');
} else {
    console.log('⚠️  POST saldo-enderecos não encontrado (pode estar diferente)');
    // Tenta patch alternativo apenas no INSERT
    const insertOld = `\`INSERT INTO estoque_saldo_por_endereco (estoque_id, endereco_id, quantidade)
         VALUES (?, ?, ?)
         ON CONFLICT(estoque_id, endereco_id) DO UPDATE SET quantidade = quantidade + ?\`,
        [id, endereco_id, qtd, qtd],`;
    const insertNew = `\`INSERT INTO estoque_saldo_por_endereco (estoque_id, endereco_id, quantidade, quantidade_minima, quantidade_maxima)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(estoque_id, endereco_id) DO UPDATE SET
             quantidade = ?,
             quantidade_minima = ?,
             quantidade_maxima = ?\`,
        [id, endereco_id, qtd, qmin, qmax, qtd, qmin, qmax],`;
    if (server.includes(insertOld)) {
        server = server.replace(insertOld, insertNew);
        // Adicionar parsing de qmin/qmax perto do parsing de qtd
        server = server.replace(
            `const { endereco_id, quantidade, motivo } = req.body;\n    const usuario`,
            `const { endereco_id, quantidade, quantidade_minima, quantidade_maxima, motivo } = req.body;\n    const usuario`
        );
        server = server.replace(
            `const qtd = parseInt(quantidade) || 0;\n\n    // Upsert`,
            `const qtd  = parseInt(quantidade)        || 0;\n    const qmin = parseInt(quantidade_minima) || 0;\n    const qmax = parseInt(quantidade_maxima) || 0;\n\n    // Upsert`
        );
        console.log('✅ INSERT upsert atualizado (via fallback)');
    } else {
        console.log('❌ Não foi possível atualizar o INSERT do saldo-enderecos');
    }
}

// 1e. Atualizar /api/estoque-saldos (mapa global) para incluir min/max por endereço
const saldosMapOld = `FROM estoque_saldo_por_endereco s
         JOIN estoque_enderecos e ON s.endereco_id = e.id
         WHERE s.quantidade > 0
         ORDER BY s.estoque_id, e.nome ASC`;
const saldosMapNew = `FROM estoque_saldo_por_endereco s
         JOIN estoque_enderecos e ON s.endereco_id = e.id
         ORDER BY s.estoque_id, e.nome ASC`;

// Queremos incluir todos os saldos (incluindo os zerados que tenham min/max definidos)
if (server.includes(saldosMapOld)) {
    server = server.replace(saldosMapOld, saldosMapNew);
    console.log('✅ /api/estoque-saldos atualizado para incluir todos saldos (com min/max)');
} else {
    console.log('⚠️  /api/estoque-saldos anchor não encontrado');
}

fs.writeFileSync('backend/server.js', server, 'utf8');
console.log('✅ backend/server.js salvo\n');

// ─── 2. FRONTEND: atualizar estoque.js ───────────────────────────────────────
let estoqueJs = fs.readFileSync('frontend/estoque.js', 'utf8');

// 2a. Atualizar _renderLinhasEndereco para mostrar campos min/max por endereço
const renderLinhasOld = `window._renderLinhasEndereco = function() {
    const lista = document.getElementById('estoque-enderecos-lista');
    const vazio = document.getElementById('estoque-enderecos-vazio');
    if (!lista) return;
    const linhas = window._enderecoLinhas;
    if (!linhas.length) {
        lista.innerHTML = '';
        if (vazio) vazio.style.display = 'block';
        window._calcularSomaEnderecos();
        return;
    }
    if (vazio) vazio.style.display = 'none';
    lista.innerHTML = linhas.map((linha, idx) => {
        const opcoesEnd = window._estoqueEnderecos.map(e =>
            '<option value="' + e.id + '"' + (e.id === linha.endereco_id ? ' selected' : '') + '>' + e.nome + '</option>'
        ).join('');
        return '<div style="display:flex;align-items:center;gap:8px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:6px 10px;">' +
            '<i class="ph ph-map-pin" style="color:#1d4ed8;flex-shrink:0;"></i>' +
            '<select onchange="window._enderecoLinhas[' + idx + '].endereco_id = parseInt(this.value)" style="flex:1;border:1px solid #cbd5e1;border-radius:6px;padding:4px 8px;font-size:0.85rem;background:#fff;">' +
                '<option value="">-- Selecione o endereço --</option>' + opcoesEnd +
            '</select>' +
            '<input type="number" min="0" value="' + (linha.quantidade || 0) + '" placeholder="Qtd" ' +
                'oninput="window._enderecoLinhas[' + idx + '].quantidade = parseInt(this.value) || 0; window._calcularSomaEnderecos();" ' +
                'style="width:80px;border:1px solid #cbd5e1;border-radius:6px;padding:4px 8px;font-size:0.85rem;text-align:center;">' +
            '<button type="button" onclick="window._removerLinhaEndereco(' + idx + ')" ' +
                'style="background:#fee2e2;color:#ef4444;border:none;border-radius:6px;padding:4px 8px;cursor:pointer;flex-shrink:0;">' +
                '<i class="ph ph-trash"></i>' +
            '</button>' +
        '</div>';
    }).join('');
    window._calcularSomaEnderecos();
};`;

const renderLinhasNew = `window._renderLinhasEndereco = function() {
    const lista = document.getElementById('estoque-enderecos-lista');
    const vazio = document.getElementById('estoque-enderecos-vazio');
    if (!lista) return;
    const linhas = window._enderecoLinhas;
    if (!linhas.length) {
        lista.innerHTML = '';
        if (vazio) vazio.style.display = 'block';
        window._calcularSomaEnderecos();
        return;
    }
    if (vazio) vazio.style.display = 'none';
    lista.innerHTML = linhas.map((linha, idx) => {
        const opcoesEnd = window._estoqueEnderecos.map(e =>
            '<option value="' + e.id + '"' + (e.id === linha.endereco_id ? ' selected' : '') + '>' + e.nome + '</option>'
        ).join('');
        return '<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:8px 10px;margin-bottom:2px;">' +
            // Linha 1: ícone + select endereço + botão remover
            '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">' +
                '<i class="ph ph-map-pin" style="color:#1d4ed8;flex-shrink:0;font-size:1rem;"></i>' +
                '<select onchange="window._enderecoLinhas[' + idx + '].endereco_id = parseInt(this.value)" ' +
                    'style="flex:1;border:1px solid #cbd5e1;border-radius:6px;padding:4px 8px;font-size:0.85rem;background:#fff;">' +
                    '<option value="">-- Selecione o endereço --</option>' + opcoesEnd +
                '</select>' +
                '<button type="button" onclick="window._removerLinhaEndereco(' + idx + ')" ' +
                    'style="background:#fee2e2;color:#ef4444;border:none;border-radius:6px;padding:4px 8px;cursor:pointer;flex-shrink:0;" title="Remover">' +
                    '<i class="ph ph-trash"></i>' +
                '</button>' +
            '</div>' +
            // Linha 2: Qtd Atual | Qtd Mínima | Qtd Máxima
            '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;">' +
                '<div>' +
                    '<label style="display:block;font-size:0.72rem;font-weight:600;color:#475569;margin-bottom:2px;">Qtd. Atual</label>' +
                    '<input type="number" min="0" value="' + (linha.quantidade || 0) + '" placeholder="0" ' +
                        'oninput="window._enderecoLinhas[' + idx + '].quantidade = parseInt(this.value) || 0; window._calcularSomaEnderecos();" ' +
                        'style="width:100%;border:1px solid #cbd5e1;border-radius:6px;padding:4px 8px;font-size:0.85rem;text-align:center;box-sizing:border-box;">' +
                '</div>' +
                '<div>' +
                    '<label style="display:block;font-size:0.72rem;font-weight:600;color:#f59e0b;margin-bottom:2px;">Qtd. Mínima</label>' +
                    '<input type="number" min="0" value="' + (linha.quantidade_minima || 0) + '" placeholder="0" ' +
                        'oninput="window._enderecoLinhas[' + idx + '].quantidade_minima = parseInt(this.value) || 0;" ' +
                        'style="width:100%;border:1.5px solid #fde68a;border-radius:6px;padding:4px 8px;font-size:0.85rem;text-align:center;background:#fffbeb;box-sizing:border-box;">' +
                '</div>' +
                '<div>' +
                    '<label style="display:block;font-size:0.72rem;font-weight:600;color:#10b981;margin-bottom:2px;">Qtd. Máxima</label>' +
                    '<input type="number" min="0" value="' + (linha.quantidade_maxima || 0) + '" placeholder="0" ' +
                        'oninput="window._enderecoLinhas[' + idx + '].quantidade_maxima = parseInt(this.value) || 0;" ' +
                        'style="width:100%;border:1.5px solid #a7f3d0;border-radius:6px;padding:4px 8px;font-size:0.85rem;text-align:center;background:#f0fdf4;box-sizing:border-box;">' +
                '</div>' +
            '</div>' +
        '</div>';
    }).join('');
    window._calcularSomaEnderecos();
};`;

if (estoqueJs.includes('window._renderLinhasEndereco = function()')) {
    estoqueJs = estoqueJs.replace(renderLinhasOld, renderLinhasNew);
    console.log('✅ _renderLinhasEndereco atualizado com campos min/max por endereço');
} else {
    console.log('❌ _renderLinhasEndereco não encontrado');
}

// 2b. Atualizar editarEstoque para carregar min/max do saldo
const editarSaldosOld = `window._enderecoLinhas = saldos.map(s => ({ endereco_id: s.endereco_id, quantidade: s.quantidade }));`;
const editarSaldosNew = `window._enderecoLinhas = saldos.map(s => ({
                    endereco_id:      s.endereco_id,
                    quantidade:       s.quantidade,
                    quantidade_minima: s.quantidade_minima || 0,
                    quantidade_maxima: s.quantidade_maxima || 0
                }));`;

if (estoqueJs.includes(editarSaldosOld)) {
    estoqueJs = estoqueJs.replace(editarSaldosOld, editarSaldosNew);
    console.log('✅ editarEstoque atualizado para carregar min/max');
} else {
    console.log('⚠️  editarSaldos anchor não encontrado');
}

// 2c. Atualizar salvarEstoque para enviar min/max ao fazer POST de saldo-enderecos
const salvarEndOld = `await fetch(API_URL + "/estoque/" + prodId + "/saldo-enderecos", {
                    method: "POST",
                    headers: { "Authorization": "Bearer " + token, "Content-Type": "application/json" },
                    body: JSON.stringify({ 
                        endereco_id: linha.endereco_id, 
                        quantidade: linha.quantidade, 
                        motivo: id ? "Ajuste manual" : "Saldo inicial" 
                    })
                });`;
const salvarEndNew = `await fetch(API_URL + "/estoque/" + prodId + "/saldo-enderecos", {
                    method: "POST",
                    headers: { "Authorization": "Bearer " + token, "Content-Type": "application/json" },
                    body: JSON.stringify({ 
                        endereco_id:       linha.endereco_id, 
                        quantidade:        linha.quantidade,
                        quantidade_minima: linha.quantidade_minima || 0,
                        quantidade_maxima: linha.quantidade_maxima || 0,
                        motivo: id ? "Ajuste manual" : "Saldo inicial" 
                    })
                });`;

if (estoqueJs.includes(salvarEndOld)) {
    estoqueJs = estoqueJs.replace(salvarEndOld, salvarEndNew);
    console.log('✅ salvarEstoque atualizado para enviar min/max');
} else {
    console.log('⚠️  salvarEstoque anchor não encontrado');
}

// 2d. Atualizar renderEstoqueTable: lógica de vermelho usa min/max POR ENDEREÇO
// Substituir a lógica de isLow para usar min/max por endereço quando disponível
const isLowOld = `// ── Verificar se está no mínimo ──
            let isLow = false;
            if (saldos.length > 0) {
                isLow = saldos.some(s => s.quantidade <= item.quantidade_minima && item.quantidade_minima > 0);
            } else {
                isLow = item.quantidade_minima > 0 && item.quantidade_atual <= item.quantidade_minima;
            }`;
const isLowNew = `// ── Verificar se está no mínimo (usa min/max por endereço quando disponível) ──
            let isLow = false;
            if (saldos.length > 0) {
                // Prioridade: min/max do próprio endereço; fallback para min global do produto
                isLow = saldos.some(s => {
                    const minRef = (s.quantidade_minima !== undefined && s.quantidade_minima !== null && s.quantidade_minima > 0)
                        ? s.quantidade_minima
                        : item.quantidade_minima;
                    return minRef > 0 && s.quantidade <= minRef;
                });
            } else {
                isLow = item.quantidade_minima > 0 && item.quantidade_atual <= item.quantidade_minima;
            }`;

if (estoqueJs.includes(isLowOld)) {
    estoqueJs = estoqueJs.replace(isLowOld, isLowNew);
    console.log('✅ isLow logic atualizada para usar min/max por endereço');
} else {
    console.log('⚠️  isLow anchor não encontrado');
}

// 2e. Atualizar sub-linha expandida: mostrar min/max por endereço nos badges
const subLinhaOld = `saldos.forEach(s => {
                    const low = item.quantidade_minima > 0 && s.quantidade <= item.quantidade_minima;
                    rows += '<div style="display:inline-flex;align-items:center;gap:6px;background:' + (low ? '#fef2f2' : '#eff6ff') + ';border:1px solid ' + (low ? '#fca5a5' : '#bfdbfe') + ';border-radius:20px;padding:4px 12px;">' +
                        '<i class="ph ph-map-pin" style="color:' + (low ? '#ef4444' : '#1d4ed8') + ';font-size:0.8rem;"></i>' +
                        '<span style="font-size:0.8rem;font-weight:600;color:' + (low ? '#ef4444' : '#1e40af') + ';">' + s.nome + '</span>' +
                        '<span style="background:' + (low ? '#ef4444' : '#1d4ed8') + ';color:#fff;border-radius:10px;padding:0 7px;font-size:0.75rem;font-weight:700;">' + s.quantidade + '</span>' +
                        (low ? '<i class="ph ph-warning" style="color:#ef4444;font-size:0.75rem;" title="Abaixo do mínimo"></i>' : '') +
                        '</div>';
                });`;
const subLinhaNew = `saldos.forEach(s => {
                    const minRef = (s.quantidade_minima !== undefined && s.quantidade_minima !== null && s.quantidade_minima > 0)
                        ? s.quantidade_minima : item.quantidade_minima;
                    const low = minRef > 0 && s.quantidade <= minRef;
                    const minText = (s.quantidade_minima > 0) ? ' min:' + s.quantidade_minima : '';
                    const maxText = (s.quantidade_maxima > 0) ? ' max:' + s.quantidade_maxima : '';
                    rows += '<div style="display:inline-flex;align-items:center;gap:5px;background:' + (low ? '#fef2f2' : '#eff6ff') + ';border:1.5px solid ' + (low ? '#fca5a5' : '#bfdbfe') + ';border-radius:10px;padding:5px 12px;">' +
                        '<i class="ph ph-map-pin" style="color:' + (low ? '#ef4444' : '#1d4ed8') + ';font-size:0.8rem;"></i>' +
                        '<span style="font-size:0.8rem;font-weight:700;color:' + (low ? '#ef4444' : '#1e40af') + ';">' + s.nome + '</span>' +
                        '<span style="background:' + (low ? '#ef4444' : '#1d4ed8') + ';color:#fff;border-radius:8px;padding:0 8px;font-size:0.78rem;font-weight:700;">' + s.quantidade + '</span>' +
                        (minText ? '<span style="font-size:0.7rem;color:#f59e0b;font-weight:600;">' + minText + '</span>' : '') +
                        (maxText ? '<span style="font-size:0.7rem;color:#10b981;font-weight:600;">' + maxText + '</span>' : '') +
                        (low ? '<i class="ph ph-warning" style="color:#ef4444;font-size:0.8rem;" title="Abaixo do mínimo deste endereço"></i>' : '') +
                        '</div>';
                });`;

if (estoqueJs.includes(subLinhaOld)) {
    estoqueJs = estoqueJs.replace(subLinhaOld, subLinhaNew);
    console.log('✅ Sub-linha expandida atualizada com min/max por endereço');
} else {
    console.log('⚠️  Sub-linha anchor não encontrado');
}

// 2f. Atualizar _adicionarLinhaEndereco para inicializar com min/max = 0
const addLinhaOld = `window._adicionarLinhaEndereco = function() {
    window._enderecoLinhas.push({ endereco_id: null, quantidade: 0 });
    window._renderLinhasEndereco();
};`;
const addLinhaNew = `window._adicionarLinhaEndereco = function() {
    window._enderecoLinhas.push({ endereco_id: null, quantidade: 0, quantidade_minima: 0, quantidade_maxima: 0 });
    window._renderLinhasEndereco();
};`;

if (estoqueJs.includes(addLinhaOld)) {
    estoqueJs = estoqueJs.replace(addLinhaOld, addLinhaNew);
    console.log('✅ _adicionarLinhaEndereco atualizado com min/max inicializados');
} else {
    console.log('⚠️  _adicionarLinhaEndereco anchor não encontrado');
}

fs.writeFileSync('frontend/estoque.js', estoqueJs, 'utf8');
console.log('✅ frontend/estoque.js salvo\n');

console.log('━'.repeat(50));
console.log('Tudo concluído! Execute: git add -A && git commit && git push');
