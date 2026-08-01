const fs = require('fs');

let code = fs.readFileSync('backend/server.js', 'utf8');

// Use regex for Movimentar
const movRegex = /\\/\\/ Atualizar saldo por endereço se informado\\s+if \\(endereco_id\\) \\{[\\s\\S]*?res\\.json\\(\\{ success: true, quantidade_atual: novaQtd, tipo \\}\\);\\s+\\}/;
const newMovChunk = \`// Atualizar saldo por endereço se informado
                if (endereco_id) {
                    db.get('SELECT s.quantidade, s.quantidade_minima, ee.tipo_notificacao, ee.nome as e_nome FROM estoque_saldo_por_endereco s JOIN estoque_enderecos ee ON ee.id = s.endereco_id WHERE s.estoque_id = ? AND s.endereco_id = ?', [id, endereco_id], (errS, rowS) => {
                        const oldSaldo = rowS ? rowS.quantidade : 0;
                        const minSaldo = rowS ? (rowS.quantidade_minima || item.quantidade_minima || 0) : (item.quantidade_minima || 0);

                        if (isEntrada) {
                            db.run(
                                \\\\\`INSERT INTO estoque_saldo_por_endereco (estoque_id, endereco_id, quantidade)
                                 VALUES (?, ?, ?)
                                 ON CONFLICT(estoque_id, endereco_id) DO UPDATE SET quantidade = quantidade + ?\\\\\`,
                                [id, endereco_id, qtdAbs, qtdAbs], () => {
                                    registrarHistorico(rowS ? rowS.e_nome : null);
                                }
                            );
                        } else {
                            db.run(
                                'UPDATE estoque_saldo_por_endereco SET quantidade = MAX(0, quantidade - ?) WHERE estoque_id = ? AND endereco_id = ?',
                                [qtdAbs, id, endereco_id], () => {
                                    if (rowS) {
                                        const newSaldo = Math.max(0, oldSaldo - qtdAbs);
                                        verificarENotificarEstoqueMinimoPorEndereco(item.id, item.nome, item.departamento, endereco_id, oldSaldo, newSaldo, minSaldo, rowS.tipo_notificacao, item.foto_url, item.foto_base64);
                                    }
                                    registrarHistorico(rowS ? rowS.e_nome : null);
                                }
                            );
                        }
                    });
                } else {
                    registrarHistorico(null);
                }

                function registrarHistorico(endNome) {
                    db.run(
                        'INSERT INTO estoque_historico (estoque_id, quantidade, tipo, usuario, motivo, endereco_id, endereco_nome) VALUES (?, ?, ?, ?, ?, ?, ?)',
                        [id, qtdAbs, tipo, usuario, motivoFinal, endereco_id || null, endNome],
                        () => {}
                    );
                    res.json({ success: true, quantidade_atual: novaQtd, tipo });
                }\`;
                
if (movRegex.test(code)) {
    code = code.replace(movRegex, newMovChunk);
    console.log('patched movimentar with regex');
} else {
    console.log('regex for movimentar failed');
}

fs.writeFileSync('backend/server.js', code, 'utf8');
