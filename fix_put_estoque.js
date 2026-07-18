/**
 * Recupera o PUT /api/estoque/:id que foi removido acidentalmente
 * e corrige o POST /api/estoque-enderecos para incluir tipo_notificacao
 */
const fs = require('fs');
const path = require('path');

const serverPath = path.join(__dirname, 'backend', 'server.js');
let content = fs.readFileSync(serverPath, 'utf8');

// 1. Verificar se o PUT ainda existe
if (!content.includes("app.put('/api/estoque/:id'")) {
    console.log('[FIX] PUT /api/estoque/:id removido - recuperando...');
    
    // O orphaned body começa em:  "        let foto_url = oldRow.foto_url || null;"
    // depois do catch do POST. Precisamos inserir o cabeçalho do PUT antes dele.
    
    const orphanStart = "    } catch (e) {\r\n        console.error('[ESTOQUE POST] Erro:', e.message);\r\n        res.status(500).json({ error: e.message });\r\n    }\r\n        let foto_url = oldRow.foto_url || null;";
    
    if (content.includes(orphanStart)) {
        content = content.replace(
            orphanStart,
            `    } catch (e) {
        console.error('[ESTOQUE POST] Erro:', e.message);
        res.status(500).json({ error: e.message });
    }
});

// Editar Item e Atualizar Quantidades
app.put('/api/estoque/:id', authenticateToken, async (req, res) => {
    let oldRow;
    try {
        const id = req.params.id;
        const { nome, departamento, categoria, quantidade_atual, quantidade_minima, quantidade_maxima, foto_base64 } = req.body;
        const usuario = req.user ? (req.user.nome || req.user.username || 'Sistema') : 'Sistema';

        // Obter dados antigos
        oldRow = await new Promise((resolve, reject) => {
            db.get('SELECT * FROM estoque WHERE id = ?', [id], (err, row) => err ? reject(err) : resolve(row));
        });
        if (!oldRow) return res.status(404).json({ error: 'Item não encontrado' });

        let foto_url = oldRow.foto_url || null;`
        );
        console.log('[FIX] Cabeçalho do PUT reinserido');
    } else {
        // Tentar outra abordagem - buscar o corpo orphaned de outra forma
        const orphanAlt = "    }\r\n        let foto_url = oldRow.foto_url || null;";
        if (content.includes(orphanAlt)) {
            // Encontrar o contexto correto (deve ser após ESTOQUE POST)
            const postErrIdx = content.lastIndexOf("[ESTOQUE POST] Erro:");
            const afterPost = content.indexOf(orphanAlt, postErrIdx > 0 ? postErrIdx : 0);
            if (afterPost > -1) {
                const before = content.substring(0, afterPost);
                const after = content.substring(afterPost + orphanAlt.length);
                content = before +
                    `    }
});

// Editar Item e Atualizar Quantidades
app.put('/api/estoque/:id', authenticateToken, async (req, res) => {
    let oldRow;
    try {
        const id = req.params.id;
        const { nome, departamento, categoria, quantidade_atual, quantidade_minima, quantidade_maxima, foto_base64 } = req.body;
        const usuario = req.user ? (req.user.nome || req.user.username || 'Sistema') : 'Sistema';

        // Obter dados antigos
        oldRow = await new Promise((resolve, reject) => {
            db.get('SELECT * FROM estoque WHERE id = ?', [id], (err, row) => err ? reject(err) : resolve(row));
        });
        if (!oldRow) return res.status(404).json({ error: 'Item não encontrado' });

        let foto_url = oldRow.foto_url || null;` +
                    after;
                console.log('[FIX] Cabeçalho do PUT reinserido (método alternativo)');
            } else {
                console.error('[FIX] ERRO: não consegui encontrar o corpo orphaned do PUT');
            }
        } else {
            console.error('[FIX] ERRO: corpo orphaned não encontrado!');
            console.log('  Verificando o arquivo - buscando "let foto_url = oldRow"...');
            const idx = content.indexOf('let foto_url = oldRow');
            console.log('  Encontrado em index:', idx);
            if (idx > -1) {
                console.log('  Contexto:', JSON.stringify(content.substring(idx-200, idx+100)));
            }
        }
    }
} else {
    console.log('[OK] PUT /api/estoque/:id já existe no arquivo');
}

// 2. Corrigir o POST /api/estoque-enderecos para incluir tipo_notificacao
// Verificar estado atual
if (content.includes("'INSERT INTO estoque_enderecos (nome, tipo_notificacao) VALUES (?, ?)'")) {
    console.log('[OK] POST já inclui tipo_notificacao');
} else if (content.includes("'INSERT INTO estoque_enderecos (nome) VALUES (?)'")) {
    content = content.replace(
        `const { nome } = req.body;\n    if (!nome || !nome.trim()) return res.status(400).json({ error: 'Nome obrigatório.' });\n    db.run('INSERT INTO estoque_enderecos (nome) VALUES (?)', [nome.trim()], function(err) {\n        if (err) {\n            if (err.message.includes('UNIQUE')) return res.status(409).json({ error: 'Endereço já existe.' });\n            return res.status(500).json({ error: err.message });\n        }\n        res.json({ id: this.lastID, nome: nome.trim() });\n    });`,
        `const { nome, tipo_notificacao } = req.body;\n    if (!nome || !nome.trim()) return res.status(400).json({ error: 'Nome obrigatório.' });\n    db.run('INSERT INTO estoque_enderecos (nome, tipo_notificacao) VALUES (?, ?)', [nome.trim(), tipo_notificacao || ''], function(err) {\n        if (err) {\n            if (err.message.includes('UNIQUE')) return res.status(409).json({ error: 'Endereço já existe.' });\n            return res.status(500).json({ error: err.message });\n        }\n        res.json({ id: this.lastID, nome: nome.trim(), tipo_notificacao: tipo_notificacao || '' });\n    });`
    );
    console.log('[FIX] POST atualizado para incluir tipo_notificacao');
}

// 3. Salvar
fs.writeFileSync(serverPath, content, 'utf8');
console.log('[SAVE] server.js salvo');

// 4. Verificar resultado
const final = fs.readFileSync(serverPath, 'utf8');
console.log('\n=== VERIFICAÇÃO ===');
console.log('PUT /api/estoque/:id existe:', final.includes("app.put('/api/estoque/:id'"));
console.log('POST tipo_notificacao:', final.includes('INSERT INTO estoque_enderecos (nome, tipo_notificacao)'));
console.log('Total chars:', final.length);
