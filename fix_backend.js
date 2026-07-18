const fs = require('fs');
let code = fs.readFileSync('backend/server.js', 'utf8');

// 1. Fix GET /api/estoque-saldos
const oldGetSaldos = `// Obter todos os saldos por endereço (para todos os itens de uma vez — usado na listagem geral)
app.get('/api/estoque-saldos', authenticateToken, (req, res) => {
    db.all(
        \`SELECT s.estoque_id, s.quantidade, e.id as endereco_id, e.nome as endereco_nome
         FROM estoque_saldo_por_endereco s
         JOIN estoque_enderecos e ON s.endereco_id = e.id
         WHERE s.quantidade > 0
         ORDER BY e.nome ASC\`,
        [], (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            // Agrupar por estoque_id
            const map = {};
            (rows || []).forEach(r => {
                if (!map[r.estoque_id]) map[r.estoque_id] = [];
                map[r.estoque_id].push({ endereco_id: r.endereco_id, nome: r.endereco_nome, quantidade: r.quantidade });
            });
            res.json(map);
        }
    );
});`;

const newGetSaldos = `// Obter todos os saldos por endereço (para todos os itens de uma vez — usado na listagem geral)
app.get('/api/estoque-saldos', authenticateToken, (req, res) => {
    db.all(
        \`SELECT s.estoque_id, s.quantidade, s.quantidade_minima, s.quantidade_maxima, e.id as endereco_id, e.nome as endereco_nome
         FROM estoque_saldo_por_endereco s
         JOIN estoque_enderecos e ON s.endereco_id = e.id
         ORDER BY e.nome ASC\`,
        [], (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            // Agrupar por estoque_id
            const map = {};
            (rows || []).forEach(r => {
                if (!map[r.estoque_id]) map[r.estoque_id] = [];
                map[r.estoque_id].push({ 
                    endereco_id: r.endereco_id, 
                    nome: r.endereco_nome, 
                    quantidade: r.quantidade,
                    quantidade_minima: r.quantidade_minima,
                    quantidade_maxima: r.quantidade_maxima
                });
            });
            res.json(map);
        }
    );
});`;

code = code.replace(oldGetSaldos, newGetSaldos);

// 2. Fix DELETE /api/estoque-enderecos/:id
const oldDeleteEnd = `// Excluir endereço global
app.delete('/api/estoque-enderecos/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    db.get('SELECT nome FROM estoque_enderecos WHERE id = ?', [id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: 'Endereço não encontrado.' });
        db.run('DELETE FROM estoque_enderecos WHERE id = ?', [id], (errD) => {
            if (errD) return res.status(500).json({ error: errD.message });
            // Limpar saldos zerados vinculados
            db.run('DELETE FROM estoque_saldo_por_endereco WHERE endereco_id = ?', [id], () => {});
            res.json({ success: true });
        });
    });
});`;

const newDeleteEnd = `// Excluir endereço global
app.delete('/api/estoque-enderecos/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    db.get('SELECT nome FROM estoque_enderecos WHERE id = ?', [id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: 'Endereço não encontrado.' });
        
        // Verificar se tem algum produto cadastrado
        db.get(
            \`SELECT e.nome as produto_nome
             FROM estoque_saldo_por_endereco s
             JOIN estoque e ON s.estoque_id = e.id
             WHERE s.endereco_id = ?
             LIMIT 1\`,
            [id], (errProd, prodRow) => {
                if (errProd) return res.status(500).json({ error: errProd.message });
                if (prodRow) {
                    return res.status(400).json({ error: \`Não é possível excluir o endereço pois tem o produto - \${prodRow.produto_nome} - cadastrado nesse endereço.\` });
                }
                
                db.run('DELETE FROM estoque_enderecos WHERE id = ?', [id], (errD) => {
                    if (errD) return res.status(500).json({ error: errD.message });
                    res.json({ success: true });
                });
            }
        );
    });
});`;

code = code.replace(oldDeleteEnd, newDeleteEnd);

// 3. Add POST /api/estoque/:id/sync-enderecos
const syncEndpoint = `
// Sincronizar saldos de endereços de um produto (substitui os existentes pelos novos)
app.post('/api/estoque/:id/sync-enderecos', authenticateToken, (req, res) => {
    const { id } = req.params;
    const enderecos = req.body.enderecos || []; // Array de { endereco_id, quantidade, quantidade_minima, quantidade_maxima }
    
    db.serialize(() => {
        const enderecoIds = enderecos.map(e => e.endereco_id);
        const placeholders = enderecoIds.map(() => '?').join(',');
        
        // Delete all addresses for this product that are not in the new list
        const deleteQuery = enderecoIds.length > 0 
            ? \`DELETE FROM estoque_saldo_por_endereco WHERE estoque_id = ? AND endereco_id NOT IN (\${placeholders})\`
            : \`DELETE FROM estoque_saldo_por_endereco WHERE estoque_id = ?\`;
        
        const deleteParams = enderecoIds.length > 0 ? [id, ...enderecoIds] : [id];
        
        db.run(deleteQuery, deleteParams, (err) => {
            if (err) return res.status(500).json({ error: err.message });
            
            // Now upsert the provided ones
            const stmt = db.prepare(\`
                INSERT INTO estoque_saldo_por_endereco (estoque_id, endereco_id, quantidade, quantidade_minima, quantidade_maxima)
                VALUES (?, ?, ?, ?, ?)
                ON CONFLICT(estoque_id, endereco_id) DO UPDATE SET
                    quantidade = EXCLUDED.quantidade,
                    quantidade_minima = EXCLUDED.quantidade_minima,
                    quantidade_maxima = EXCLUDED.quantidade_maxima
            \`);
            
            enderecos.forEach(e => {
                stmt.run([id, e.endereco_id, parseInt(e.quantidade) || 0, parseInt(e.quantidade_minima) || 0, parseInt(e.quantidade_maxima) || 0]);
            });
            
            stmt.finalize();
            
            res.json({ success: true });
        });
    });
});
`;

// Insert the syncEndpoint right after the single saldo post endpoint
const singlePostEnd = "app.post('/api/estoque/:id/saldo-enderecos', authenticateToken, (req, res) => {";
if (code.includes(singlePostEnd)) {
    code = code.replace(singlePostEnd, syncEndpoint + '\\n' + singlePostEnd);
}

fs.writeFileSync('backend/server.js', code, 'utf8');
console.log('Backend changes applied successfully.');
