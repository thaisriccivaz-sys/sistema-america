/**
 * Script de implementação: End. Prod. + Notificações + Transferência
 * Roda com: node implement_endprod.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname);
const SERVER = path.join(ROOT, 'backend', 'server.js');
const INDEX  = path.join(ROOT, 'frontend', 'index.html');
const ENDJS  = path.join(ROOT, 'frontend', 'end-produto.js');

// ─── 1. BACKEND: Adicionar migrações e novas rotas ────────────────────────────
let server = fs.readFileSync(SERVER, 'utf8');

// 1a. Adicionar coluna tipo_notificacao na tabela estoque_enderecos (migration)
const migrationAnchor = "db.run(\"INSERT OR IGNORE INTO estoque_enderecos (nome) VALUES ('Geral')\", () => {});";
if (!server.includes("ALTER TABLE estoque_enderecos ADD COLUMN tipo_notificacao")) {
    server = server.replace(
        migrationAnchor,
        migrationAnchor + `
    db.run("ALTER TABLE estoque_enderecos ADD COLUMN tipo_notificacao TEXT DEFAULT ''", () => {});`
    );
    console.log('[1a] Migration tipo_notificacao adicionada');
} else {
    console.log('[1a] Migration tipo_notificacao já existe');
}

// 1b. Adicionar rota PUT para editar endereço (nome + tipo_notificacao)
const editEnderecoAnchor = "// Excluir endereço global (não pode excluir 'Geral')";
if (!server.includes("app.put('/api/estoque-enderecos/:id'")) {
    server = server.replace(
        editEnderecoAnchor,
        `// Editar endereço global (nome + tipo_notificacao)
app.put('/api/estoque-enderecos/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    const { nome, tipo_notificacao } = req.body;
    if (!nome || !nome.trim()) return res.status(400).json({ error: 'Nome obrigatório.' });
    db.get('SELECT nome FROM estoque_enderecos WHERE id = ?', [id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: 'Endereço não encontrado.' });
        const novoNome = (row.nome === 'Geral' && nome.trim() !== 'Geral') ? 'Geral' : nome.trim();
        db.run(
            "UPDATE estoque_enderecos SET nome = ?, tipo_notificacao = ? WHERE id = ?",
            [novoNome, tipo_notificacao || '', id],
            (errU) => {
                if (errU) return res.status(500).json({ error: errU.message });
                res.json({ success: true, id: parseInt(id), nome: novoNome, tipo_notificacao: tipo_notificacao || '' });
            }
        );
    });
});

` + editEnderecoAnchor
    );
    console.log('[1b] Rota PUT /api/estoque-enderecos/:id adicionada');
} else {
    console.log('[1b] Rota PUT já existe');
}

// 1c. Adicionar rota de transferência entre endereços
const transferenciaAnchor = "// Obter todos os saldos por endereço (para todos os itens de uma vez";
if (!server.includes("app.post('/api/estoque/:id/transferir'")) {
    server = server.replace(
        transferenciaAnchor,
`// Transferência de estoque entre endereços
app.post('/api/estoque/:id/transferir', authenticateToken, (req, res) => {
    const { id } = req.params;
    const { origem_id, destino_id, quantidade, motivo } = req.body;
    const usuario = req.user ? (req.user.nome || req.user.username || 'Sistema') : 'Sistema';
    const qtd = parseInt(quantidade);
    if (!origem_id || !destino_id || !qtd || qtd <= 0) {
        return res.status(400).json({ error: 'origem_id, destino_id e quantidade são obrigatórios.' });
    }
    if (origem_id === destino_id) {
        return res.status(400).json({ error: 'Origem e destino não podem ser iguais.' });
    }
    db.get('SELECT * FROM estoque WHERE id = ?', [id], (err, item) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!item) return res.status(404).json({ error: 'Item não encontrado.' });

        db.get('SELECT quantidade FROM estoque_saldo_por_endereco WHERE estoque_id = ? AND endereco_id = ?', [id, origem_id], (errO, saldoRow) => {
            if (errO) return res.status(500).json({ error: errO.message });
            const saldoOrigem = saldoRow ? saldoRow.quantidade : 0;
            if (saldoOrigem < qtd) return res.status(400).json({ error: \`Saldo insuficiente no endereço de origem (disponível: \${saldoOrigem}).\` });

            // Debitar da origem
            db.run(
                'UPDATE estoque_saldo_por_endereco SET quantidade = MAX(0, quantidade - ?) WHERE estoque_id = ? AND endereco_id = ?',
                [qtd, id, origem_id], (errD) => {
                    if (errD) return res.status(500).json({ error: errD.message });
                    // Creditar no destino
                    db.run(
                        \`INSERT INTO estoque_saldo_por_endereco (estoque_id, endereco_id, quantidade)
                         VALUES (?, ?, ?)
                         ON CONFLICT(estoque_id, endereco_id) DO UPDATE SET quantidade = quantidade + ?\`,
                        [id, destino_id, qtd, qtd], (errC) => {
                            if (errC) return res.status(500).json({ error: errC.message });
                            // Registrar no histórico (origem: saída, destino: entrada)
                            db.get('SELECT nome FROM estoque_enderecos WHERE id = ?', [origem_id], (errN1, rowN1) => {
                                db.get('SELECT nome FROM estoque_enderecos WHERE id = ?', [destino_id], (errN2, rowN2) => {
                                    const nomeOrigem = rowN1 ? rowN1.nome : String(origem_id);
                                    const nomeDestino = rowN2 ? rowN2.nome : String(destino_id);
                                    const mot = motivo || \`Transferência de \${nomeOrigem} → \${nomeDestino}\`;
                                    db.run(
                                        'INSERT INTO estoque_historico (estoque_id, quantidade, tipo, usuario, motivo, endereco_id, endereco_nome) VALUES (?, ?, ?, ?, ?, ?, ?)',
                                        [id, qtd, 'Transferência', usuario, mot, destino_id, nomeDestino], () => {}
                                    );
                                    res.json({ success: true, de: nomeOrigem, para: nomeDestino, quantidade: qtd });
                                });
                            });
                        }
                    );
                }
            );
        });
    });
});

` + transferenciaAnchor
    );
    console.log('[1c] Rota POST /api/estoque/:id/transferir adicionada');
} else {
    console.log('[1c] Rota transferir já existe');
}

// 1d. Modificar a lógica de notificação no PUT /estoque/:id para usar tipo_notificacao do endereço
// Já existe a lógica genérica de notificação. Adicionar lógica de "reposição" baseada nos endereços
const notifAnchor = "// Lógica de Notificação de Estoque Mínimo (fora do try/catch para não bloquear resposta, precisa usar try/catch isolado para variaveis)";
if (!server.includes("notif_tipo_reposicao") && server.includes(notifAnchor)) {
    server = server.replace(
        "db.all(\"SELECT usuario_id FROM config_notificacoes WHERE tipo = 'estoque_minimo'\", [], (errC, rowsC) => {",
        `// Buscar tipo de notificação dos endereços onde o item tem saldo
        db.all(
            \`SELECT DISTINCT ee.tipo_notificacao FROM estoque_saldo_por_endereco s
             JOIN estoque_enderecos ee ON s.endereco_id = ee.id
             WHERE s.estoque_id = ? AND s.quantidade > 0 AND ee.tipo_notificacao != '' AND ee.tipo_notificacao IS NOT NULL\`,
            [id], (errT, tiposRows) => {
                const tiposSet = new Set((tiposRows || []).map(r => r.tipo_notificacao));
                const tiposNotif = tiposSet.size > 0 ? Array.from(tiposSet) : ['compra']; // fallback: compra
                tiposNotif.forEach(tipoNotif => {
                    const dbTipo = tipoNotif === 'reposicao' ? 'estoque_reposicao' : 'estoque_minimo';
                    db.all(\`SELECT usuario_id FROM config_notificacoes WHERE tipo = '\${dbTipo}'\`, [], (errCR, rowsCR) => {
                        if (!errCR && rowsCR && rowsCR.length > 0) {
                            rowsCR.forEach(c => {
                                db.run("INSERT INTO notificacoes_usuarios (usuario_id, tipo, mensagem, dados) VALUES (?, ?, ?, ?)", [c.usuario_id, dbTipo, msg, dadosStr]);
                            });
                        }
                    });
                });
            }
        );
        db.all("SELECT usuario_id FROM config_notificacoes WHERE tipo = 'estoque_minimo'", [], (errC, rowsC) => {`
    );
    console.log('[1d] Lógica de notificação por tipo de endereço adicionada');
} else {
    console.log('[1d] Notificação por tipo: já existe ou anchor não encontrado');
}

// 1e. Mesma lógica na rota de baixa (/api/estoque/:id/baixa) - adicionar notificação pós-baixa
const baixaNotifAnchor = "res.json({ success: true });\n        });\n    });\n});\n\n// Obter todos os saldos por endereço";
if (!server.includes("notif_baixa_tipo") && server.includes(baixaNotifAnchor)) {
    server = server.replace(
        baixaNotifAnchor,
`res.json({ success: true });

            // Notificação de estoque mínimo pós-baixa
            db.get('SELECT * FROM estoque WHERE id = ?', [id], (errChk, itemAtual) => {
                if (!errChk && itemAtual && itemAtual.quantidade_atual <= itemAtual.quantidade_minima) {
                    const msgBaixa = \`ESTOQUE BAIXO: "\${itemAtual.nome}" atingiu o mínimo após baixa manual. Qtd atual: \${itemAtual.quantidade_atual}.\`;
                    const dadosBaixa = JSON.stringify({ item_id: id, nome: itemAtual.nome, quantidade_atual: itemAtual.quantidade_atual });
                    db.all(
                        \`SELECT DISTINCT ee.tipo_notificacao FROM estoque_saldo_por_endereco s
                         JOIN estoque_enderecos ee ON s.endereco_id = ee.id
                         WHERE s.estoque_id = ? AND ee.tipo_notificacao != '' AND ee.tipo_notificacao IS NOT NULL\`,
                        [id], (errT, tiposRows) => {
                            const tiposSet = new Set((tiposRows || []).map(r => r.tipo_notificacao));
                            const tiposNotif = tiposSet.size > 0 ? Array.from(tiposSet) : ['compra'];
                            tiposNotif.forEach(tipoNotif => {
                                const dbTipo = tipoNotif === 'reposicao' ? 'estoque_reposicao' : 'estoque_minimo';
                                db.all(\`SELECT usuario_id FROM config_notificacoes WHERE tipo = '\${dbTipo}'\`, [], (errCN, rowsCN) => {
                                    if (!errCN && rowsCN) rowsCN.forEach(c => {
                                        db.run("INSERT INTO notificacoes_usuarios (usuario_id, tipo, mensagem, dados) VALUES (?, ?, ?, ?)", [c.usuario_id, dbTipo, msgBaixa, dadosBaixa]);
                                    });
                                });
                            });
                        }
                    );
                }
            }); // notif_baixa_tipo
        });
    });
});

// Obter todos os saldos por endereço`
    );
    console.log('[1e] Notificação pós-baixa adicionada');
} else {
    console.log('[1e] Notificação pós-baixa: já existe ou anchor não encontrado');
}

// 1f. Adicionar config_notificacoes para estoque_reposicao e o /api/estoque-saldos com tipo_notificacao
const saldosEnderecoAnchor = "SELECT s.estoque_id, s.quantidade, e.id as endereco_id, e.nome as endereco_nome\n         FROM estoque_saldo_por_endereco s\n         JOIN estoque_enderecos e ON s.endereco_id = e.id";
if (server.includes(saldosEnderecoAnchor) && !server.includes('e.tipo_notificacao as')) {
    server = server.replace(
        saldosEnderecoAnchor,
        `SELECT s.estoque_id, s.quantidade, e.id as endereco_id, e.nome as endereco_nome, e.tipo_notificacao as endereco_tipo_notificacao\n         FROM estoque_saldo_por_endereco s\n         JOIN estoque_enderecos e ON s.endereco_id = e.id`
    );
    console.log('[1f] tipo_notificacao incluído no GET /api/estoque-saldos');
}

fs.writeFileSync(SERVER, server, 'utf8');
console.log('\n[SERVER] server.js atualizado com sucesso!');

// ─── 2. FRONTEND: end-produto.js ──────────────────────────────────────────────
const endProdutoJS = `// frontend/end-produto.js
// Tela de Gerenciamento de Endereços de Produto (End. Prod.)

window.renderEndProdutoTable = async function() {
    const tbody = document.getElementById('table-end-produto');
    if (!tbody) return;
    try {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:#64748b;">Carregando...</td></tr>';
        const token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token');
        const r = await fetch(API_URL + '/estoque-enderecos', { headers: { 'Authorization': 'Bearer ' + token } });
        if (!r.ok) throw new Error('Erro ao buscar endereços');
        const data = await r.json();
        if (!data.length) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:#64748b;">Nenhum endereço cadastrado.</td></tr>';
            return;
        }
        tbody.innerHTML = data.map(end => {
            const tipoBadge = end.tipo_notificacao === 'compra'
                ? '<span style="background:#fff3e6;color:#e67700;border:1px solid #fed7aa;border-radius:20px;padding:2px 10px;font-size:0.75rem;font-weight:600;display:inline-flex;align-items:center;gap:4px;"><i class="ph ph-shopping-cart-simple"></i> Pedido de Compra</span>'
                : end.tipo_notificacao === 'reposicao'
                ? '<span style="background:#f0fdf4;color:#16a34a;border:1px solid #bbf7d0;border-radius:20px;padding:2px 10px;font-size:0.75rem;font-weight:600;display:inline-flex;align-items:center;gap:4px;"><i class="ph ph-arrows-left-right"></i> Pedido de Reposição</span>'
                : '<span style="background:#f1f5f9;color:#94a3b8;border-radius:20px;padding:2px 10px;font-size:0.75rem;">Sem notificação</span>';
            const isGeral = end.nome === 'Geral';
            return '<tr>' +
                '<td style="font-weight:600;display:flex;align-items:center;gap:8px;"><i class="ph ph-map-pin" style="color:#1d4ed8;"></i>' + end.nome + (isGeral ? ' <span style="font-size:0.72rem;color:#94a3b8;">(padrão)</span>' : '') + '</td>' +
                '<td>' + tipoBadge + '</td>' +
                '<td style="color:#64748b;font-size:0.83rem;">' + (end.criado_em ? new Date(end.criado_em).toLocaleDateString('pt-BR') : '—') + '</td>' +
                '<td style="text-align:right;white-space:nowrap;">' +
                    '<button class="btn btn-sm btn-secondary" onclick="window.abrirModalEditarEndProduto(' + JSON.stringify(JSON.stringify(end)).replace(/"/g,\'&quot;\') + ')" style="margin-right:4px;"><i class="ph ph-pencil-simple"></i></button>' +
                    (!isGeral ? '<button class="btn btn-sm" onclick="window.excluirEndProduto(' + end.id + ')" style="background:#fee2e2;color:#ef4444;border:none;"><i class="ph ph-trash"></i></button>' : '') +
                '</td>' +
            '</tr>';
        }).join('');
    } catch(e) {
        const tbody = document.getElementById('table-end-produto');
        if (tbody) tbody.innerHTML = '<tr><td colspan="4" style="color:#ef4444;text-align:center;">' + e.message + '</td></tr>';
    }
};

window.abrirModalEndProduto = async function() {
    const { value: vals, isConfirmed } = await Swal.fire({
        title: '<b><i class="ph ph-map-pin" style="color:#1d4ed8"></i> Novo Endereço</b>',
        html: _htmlFormEndProduto(null),
        showCancelButton: true,
        confirmButtonText: 'Criar Endereço',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#1d4ed8',
        focusConfirm: false,
        preConfirm: () => {
            const nome = document.getElementById('swal-end-nome').value.trim();
            const tipo = document.getElementById('swal-end-tipo').value;
            if (!nome) { Swal.showValidationMessage('Informe o nome do endereço'); return false; }
            return { nome, tipo_notificacao: tipo };
        }
    });
    if (!isConfirmed || !vals) return;
    const token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token');
    try {
        const res = await fetch(API_URL + '/estoque-enderecos', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
            body: JSON.stringify(vals)
        });
        if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Erro'); }
        // Salvar tipo_notificacao no PUT logo após criar (POST não suporta tipo ainda)
        const novo = await res.json();
        if (vals.tipo_notificacao) {
            await fetch(API_URL + '/estoque-enderecos/' + novo.id, {
                method: 'PUT',
                headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
                body: JSON.stringify({ nome: vals.nome, tipo_notificacao: vals.tipo_notificacao })
            });
        }
        Swal.fire({ icon: 'success', title: 'Endereço criado!', timer: 1400, showConfirmButton: false });
        window.renderEndProdutoTable();
        // Atualizar cache de endereços no estoque
        window._estoqueEnderecos = window._estoqueEnderecos || [];
        window._estoqueEnderecos.push(novo);
    } catch(e) { Swal.fire('Erro', e.message, 'error'); }
};

window.abrirModalEditarEndProduto = async function(endJson) {
    const end = typeof endJson === 'string' ? JSON.parse(endJson) : endJson;
    const { value: vals, isConfirmed } = await Swal.fire({
        title: '<b><i class="ph ph-pencil-simple" style="color:#1d4ed8"></i> Editar Endereço</b>',
        html: _htmlFormEndProduto(end),
        showCancelButton: true,
        confirmButtonText: 'Salvar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#1d4ed8',
        focusConfirm: false,
        preConfirm: () => {
            const nome = document.getElementById('swal-end-nome').value.trim();
            const tipo = document.getElementById('swal-end-tipo').value;
            if (!nome) { Swal.showValidationMessage('Informe o nome do endereço'); return false; }
            return { nome, tipo_notificacao: tipo };
        }
    });
    if (!isConfirmed || !vals) return;
    const token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token');
    try {
        const res = await fetch(API_URL + '/estoque-enderecos/' + end.id, {
            method: 'PUT',
            headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
            body: JSON.stringify(vals)
        });
        if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Erro'); }
        Swal.fire({ icon: 'success', title: 'Endereço atualizado!', timer: 1400, showConfirmButton: false });
        window.renderEndProdutoTable();
    } catch(e) { Swal.fire('Erro', e.message, 'error'); }
};

window.excluirEndProduto = async function(id) {
    const ok = await Swal.fire({ title: 'Excluir endereço?', text: 'Os saldos vinculados serão removidos.', icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444', confirmButtonText: 'Excluir' });
    if (!ok.isConfirmed) return;
    const token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token');
    try {
        const r = await fetch(API_URL + '/estoque-enderecos/' + id, { method: 'DELETE', headers: { 'Authorization': 'Bearer ' + token } });
        if (!r.ok) { const e = await r.json(); throw new Error(e.error || 'Erro'); }
        window.renderEndProdutoTable();
    } catch(e) { Swal.fire('Erro', e.message, 'error'); }
};

function _htmlFormEndProduto(end) {
    const nome = end ? end.nome : '';
    const tipo = end ? (end.tipo_notificacao || '') : '';
    const isGeral = end && end.nome === 'Geral';
    return '<div style="text-align:left;margin-top:8px;">' +
        '<div style="margin-bottom:14px;">' +
            '<label style="font-weight:600;font-size:0.85rem;color:#475569;display:block;margin-bottom:5px;">Nome do Endereço *</label>' +
            '<input id="swal-end-nome" class="swal2-input" style="width:100%;margin:0;box-sizing:border-box;" placeholder="Ex: Depósito Central, Prateleira A3..." value="' + nome + '"' + (isGeral ? ' disabled title="O endereço Geral não pode ser renomeado"' : '') + '>' +
        '</div>' +
        '<div>' +
            '<label style="font-weight:600;font-size:0.85rem;color:#475569;display:block;margin-bottom:5px;"><i class="ph ph-bell-ringing" style="color:#e67700;"></i> Tipo de Notificação ao atingir estoque mínimo</label>' +
            '<select id="swal-end-tipo" style="width:100%;padding:10px 12px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:0.9rem;background:#fff;">' +
                '<option value=""' + (!tipo ? ' selected' : '') + '>🔕 Sem notificação automática</option>' +
                '<option value="compra"' + (tipo === 'compra' ? ' selected' : '') + '>🛒 Pedido de Compra — notifica grupo &quot;Estoque mínimo para compra&quot;</option>' +
                '<option value="reposicao"' + (tipo === 'reposicao' ? ' selected' : '') + '>🔄 Pedido de Reposição — notifica grupo &quot;Mínimo para reposição de estoque&quot;</option>' +
            '</select>' +
            '<p style="font-size:0.78rem;color:#94a3b8;margin-top:6px;line-height:1.4;">' +
                '<strong>Compra:</strong> indica que o produto está acabando e deve ser comprado.<br>' +
                '<strong>Reposição:</strong> indica que o produto deve ser transferido de um endereço maior para este.' +
            '</p>' +
        '</div>' +
    '</div>';
}

// Hook de navegação
const _origNavEnd = window.navigateTo;
window.navigateTo = function(targetId) {
    if (_origNavEnd) _origNavEnd.apply(this, arguments);
    if (targetId === 'end-produto') window.renderEndProdutoTable();
};
`;

fs.writeFileSync(ENDJS, endProdutoJS, 'utf8');
console.log('\n[2] end-produto.js criado');

// ─── 3. FRONTEND: Modificar index.html ────────────────────────────────────────
let html = fs.readFileSync(INDEX, 'utf8');

// 3a. Adicionar menu End. Prod. no Diretoria (após Notificações)
const menuNotifAnchor = '<a href="#" class="nav-item" data-target="notificacoes"><i class="ph ph-bell-ringing"></i>\r\n                        Notificações</a>';
if (!html.includes('end-produto') && html.includes(menuNotifAnchor)) {
    html = html.replace(
        menuNotifAnchor,
        menuNotifAnchor + '\r\n                    <a href="#" class="nav-item" data-target="end-produto" onclick="navigateTo(\'end-produto\'); return false;"><i class="ph ph-map-pin"></i> End. Prod.</a>'
    );
    console.log('[3a] Menu End. Prod. adicionado');
} else if (html.includes('end-produto')) {
    console.log('[3a] Menu End. Prod. já existe');
} else {
    console.log('[3a] AVISO: anchor do menu Notificações não encontrado exatamente');
}

// 3b. Remover campo de endereço do modal de produto
const enderecoFieldAnchor = '                                    <div style="margin-bottom:1.5rem;">\r\n                                        <label style="display:block;margin-bottom:4px;font-weight:600;font-size:0.85rem;color:#475569;"><i class="ph ph-map-pin" style="color:#1d4ed8;"></i> Endereço de Estoque</label>';
const enderecoFieldEnd = '                                        <span style="font-size:0.78rem;color:#94a3b8;display:block;margin-top:3px;">Opcional. Define onde este item será armazenado.</span>\r\n                                    </div>';
if (html.includes(enderecoFieldAnchor)) {
    const startIdx = html.indexOf(enderecoFieldAnchor);
    const endIdx = html.indexOf(enderecoFieldEnd) + enderecoFieldEnd.length;
    html = html.substring(0, startIdx) + html.substring(endIdx);
    console.log('[3b] Campo endereço removido do modal de produto');
} else {
    console.log('[3b] Campo endereço já foi removido ou não encontrado');
}

// 3c. Adicionar VIEW da tela End. Prod. antes da VIEW LICENÇAS
const licencasAnchor = '                <!-- VIEW: LICENÇAS -->';
if (!html.includes('view-end-produto') && html.includes(licencasAnchor)) {
    html = html.replace(
        licencasAnchor,
        `                <!-- VIEW: ENDEREÇOS DE PRODUTO -->
                <section id="view-end-produto" class="content-view">
                    <div class="page-header flex-between" style="position:sticky;top:60px;z-index:20;background:var(--bg-main);padding:1rem 0;margin-top:-1.5rem;margin-bottom:1.5rem;border-bottom:1px solid var(--border-color);">
                        <div style="display:flex;align-items:center;gap:1.5rem;">
                            <div style="width:70px;height:70px;border-radius:50%;border:2px dashed #1d4ed8;display:flex;align-items:center;justify-content:center;background:#eff6ff;color:#1d4ed8;font-size:2rem;">
                                <i class="ph ph-map-pin"></i>
                            </div>
                            <div>
                                <h1 style="margin:0;font-size:1.75rem;font-weight:700;color:#334155;">Endereços de Produto</h1>
                                <p style="margin:4px 0 0;color:#64748b;font-size:0.88rem;">Gerencie os locais de armazenamento e defina o tipo de notificação para cada endereço.</p>
                            </div>
                        </div>
                        <button class="btn btn-primary" onclick="window.abrirModalEndProduto()" style="background:#1d4ed8;border-color:#1d4ed8;display:flex;align-items:center;gap:6px;">
                            <i class="ph ph-plus-circle"></i> Novo Endereço
                        </button>
                    </div>

                    <div class="card" style="border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
                        <!-- Legenda de tipos -->
                        <div style="background:#f8fafc;border-bottom:1px solid #e2e8f0;padding:14px 20px;display:flex;gap:20px;flex-wrap:wrap;font-size:0.83rem;">
                            <span style="color:#64748b;font-weight:600;">Tipos de notificação ao atingir estoque mínimo:</span>
                            <span style="display:inline-flex;align-items:center;gap:5px;background:#fff3e6;color:#e67700;border:1px solid #fed7aa;border-radius:20px;padding:2px 10px;font-size:0.75rem;font-weight:600;"><i class="ph ph-shopping-cart-simple"></i> Pedido de Compra</span>
                            <span style="display:inline-flex;align-items:center;gap:5px;background:#f0fdf4;color:#16a34a;border:1px solid #bbf7d0;border-radius:20px;padding:2px 10px;font-size:0.75rem;font-weight:600;"><i class="ph ph-arrows-left-right"></i> Pedido de Reposição</span>
                            <span style="display:inline-flex;align-items:center;gap:5px;background:#f1f5f9;color:#94a3b8;border-radius:20px;padding:2px 10px;font-size:0.75rem;">Sem notificação</span>
                        </div>
                        <div class="table-responsive">
                            <table class="table">
                                <thead>
                                    <tr style="font-size:0.82rem;">
                                        <th>Endereço</th>
                                        <th>Tipo de Notificação</th>
                                        <th>Criado em</th>
                                        <th style="text-align:right;">Ações</th>
                                    </tr>
                                </thead>
                                <tbody id="table-end-produto">
                                    <tr><td colspan="4" style="text-align:center;color:#64748b;">Carregando...</td></tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </section>

                ` + licencasAnchor
    );
    console.log('[3c] View End. Prod. adicionada ao HTML');
} else if (html.includes('view-end-produto')) {
    console.log('[3c] View End. Prod. já existe');
} else {
    console.log('[3c] AVISO: anchor licencas não encontrado');
}

// 3d. Adicionar <script> para end-produto.js antes do </body>
if (!html.includes('end-produto.js') && html.includes('</body>')) {
    html = html.replace('</body>', '    <script src="end-produto.js"></script>\n</body>');
    console.log('[3d] <script src="end-produto.js"> adicionado');
} else {
    console.log('[3d] script end-produto.js já incluído ou </body> não encontrado');
}

// 3e. Adicionar botão Transferir na tabela de estoque (será feito via estoque.js, mas precisamos garantir que a coluna Ações suporte)
// O botão será adicionado via JS, não precisa de mudança no HTML aqui

// 3f. Renomear os grupos de notificação na view-notificacoes
// A view usa JS para popular (id="notificacoes-container"), então a renomeação será no JS de configuração
// Verificar se existe algum texto hardcoded
if (html.includes('Notificação Estoque Mínimo')) {
    html = html.split('Notificação Estoque Mínimo').join('Estoque mínimo para compra');
    console.log('[3f] Renomeou "Notificação Estoque Mínimo" → "Estoque mínimo para compra" no HTML');
}

fs.writeFileSync(INDEX, html, 'utf8');
console.log('\n[3] index.html atualizado');

// ─── 4. Verificar se existem scripts de notificações populados por JS ────────
// Buscar o arquivo que popula notificacoes-container
const jsFiles = fs.readdirSync(path.join(ROOT, 'frontend')).filter(f => f.endsWith('.js'));
let notifJsFile = null;
let notifJsContent = '';
for (const f of jsFiles) {
    const c = fs.readFileSync(path.join(ROOT, 'frontend', f), 'utf8');
    if (c.includes('notificacoes-container') || c.includes('estoque_minimo') || c.includes('config_notificacoes')) {
        notifJsFile = f;
        notifJsContent = c;
        console.log('[4] Arquivo de notificações encontrado:', f);
        break;
    }
}

// Verificar no HTML inline scripts também
if (!notifJsFile) {
    if (html.includes('notificacoes-container') || html.includes('estoque_minimo')) {
        console.log('[4] Lógica de notificações está no HTML inline (index.html)');
        notifJsFile = 'index.html';
        notifJsContent = html;
    } else {
        console.log('[4] Não encontrado arquivo específico de notificações - reportando para verificação manual');
    }
}

if (notifJsContent.includes("'estoque_minimo'") || notifJsContent.includes('"estoque_minimo"')) {
    console.log('[4] Tipos de notificação encontrados no arquivo:', notifJsFile);
    console.log('    -> Será necessário adicionar "estoque_reposicao" como novo tipo no JS de notificações');
}

console.log('\n✅ Implementação concluída! Verificar:');
console.log('   - server.js: migrações, rotas PUT /estoque-enderecos/:id, POST /estoque/:id/transferir');
console.log('   - end-produto.js: novo arquivo criado');
console.log('   - index.html: menu End. Prod., view-end-produto, campo endereço removido do modal');
