const fs = require('fs');
const s = fs.readFileSync('backend/server.js', 'utf8');
console.log('=== VERIFICACAO FINAL COMPLETA ===');
console.log('PUT /api/estoque/:id:', s.includes("app.put('/api/estoque/:id'"));
console.log('POST tipo_notificacao:', s.includes('INSERT INTO estoque_enderecos (nome, tipo_notificacao)'));
// Use broader search since line endings may vary
console.log('PUT /api/estoque-enderecos/:id:', s.includes("/api/estoque-enderecos/:id'") && s.includes("app.put("));
console.log('DELETE /api/estoque-enderecos/:id:', s.includes("app.delete('/api/estoque-enderecos/:id'"));
console.log('transferir route:', s.includes("/api/estoque/:id/transferir'"));
console.log('Migration tipo_notificacao:', s.includes('ALTER TABLE estoque_enderecos ADD COLUMN tipo_notificacao'));
console.log('Total bytes:', s.length);

// Also verify estoque.js
const e = fs.readFileSync('frontend/estoque.js', 'utf8');
console.log('\n=== ESTOQUE.JS ===');
console.log('Transferir button:', e.includes('abrirModalTransferirEstoque'));
console.log('Transfer function defined:', e.includes('window.abrirModalTransferirEstoque ='));

// And notificacoes.js
const n = fs.readFileSync('frontend/notificacoes.js', 'utf8');
console.log('\n=== NOTIFICACOES.JS ===');
console.log('estoque_minimo renamed:', n.includes('Estoque m'));
console.log('estoque_reposicao exists:', n.includes('estoque_reposicao'));
console.log('forEach exists:', n.includes('TIPOS_NOTIFICACAO.forEach'));

// end-produto.js
const p = fs.readFileSync('frontend/end-produto.js', 'utf8');
console.log('\n=== END-PRODUTO.JS ===');
console.log('abrirModalEndProduto:', p.includes('window.abrirModalEndProduto'));
console.log('abrirModalEditarEndProduto:', p.includes('window.abrirModalEditarEndProduto'));
console.log('excluirEndProduto:', p.includes('window.excluirEndProduto'));
console.log('renderEndProdutoTable:', p.includes('window.renderEndProdutoTable'));

// index.html
const h = fs.readFileSync('frontend/index.html', 'utf8');
console.log('\n=== INDEX.HTML ===');
console.log('view-end-produto section:', h.includes('id="view-end-produto"'));
console.log('end-produto menu link:', h.includes("data-target=\"end-produto\""));
console.log('end-produto.js script:', h.includes('end-produto.js'));
