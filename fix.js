const fs = require('fs');

let code = fs.readFileSync('backend/server.js', 'utf8').replace(/\\r\\n/g, '\\n');

// FIX 1: movimentar
const anchor1Start = code.indexOf('if (endereco_id) {\\n                    if (isEntrada) {');
const anchor1End = code.indexOf('res.json({ success: true, quantidade_atual: novaQtd, tipo });', anchor1Start);

if (anchor1Start > 0 && anchor1End > 0) {
    const newChunk1 = `if (endereco_id) {
                    db.get('SELECT s.quantidade, s.quantidade_minima, ee.tipo_notificacao, ee.nome as e_nome FROM estoque_saldo_por_endereco s JOIN estoque_enderecos ee ON ee.id = s.endereco_id WHERE s.estoque_id = ? AND s.endereco_id = ?', [id, endereco_id], (errS, rowS) => {
                        const oldSaldo = rowS ? rowS.quantidade : 0;
                        const minSaldo = rowS ? (rowS.quantidade_minima || item.quantidade_minima || 0) : (item.quantidade_minima || 0);

                        if (isEntrada) {
                            db.run(
                                \`INSERT INTO estoque_saldo_por_endereco (estoque_id, endereco_id, quantidade)
                                 VALUES (?, ?, ?)
                                 ON CONFLICT(estoque_id, endereco_id) DO UPDATE SET quantidade = quantidade + ?\`,
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
                    `;
    code = code.substring(0, anchor1Start) + newChunk1 + code.substring(anchor1End);
    console.log('patched movimentar');
}

// FIX 2: processarBaixaEstoque
const anchor2Start = code.indexOf('function processarBaixaEstoque(item, count, enderecoId, enderecoNome) {');
const anchor2End = code.indexOf('// Carregar todo o estoque para a mem', anchor2Start);

if (anchor2Start > 0 && anchor2End > 0) {
    const newChunk2 = `function processarBaixaEstoque(item, count, enderecoId, enderecoNome) {
                    if (!item || item.quantidade_atual < count) {
                        console.warn(\`[ESTOQUE] Item "\${item ? item.nome : '?'}" com estoque insuficiente para baixa de \${count}.\`);
                        count = item ? Math.max(0, item.quantidade_atual) : 0;
                        if (count === 0) return;
                    }
                    
                    db.get('SELECT s.quantidade, s.quantidade_minima, ee.tipo_notificacao, ee.id as e_id FROM estoque_saldo_por_endereco s JOIN estoque_enderecos ee ON ee.id = s.endereco_id WHERE s.estoque_id = ? AND s.endereco_id = ?', [item.id, enderecoId || 0], (errS, rowS) => {
                        if (!rowS && !enderecoId) {
                            // Tenta pegar o 'Geral'
                            db.get("SELECT id, tipo_notificacao FROM estoque_enderecos WHERE nome = 'Geral'", [], (errG, rowG) => {
                                if (rowG) efetuarBaixa(rowG.id, rowG.tipo_notificacao, null);
                                else efetuarBaixa(null, null, null);
                            });
                        } else if (rowS) {
                            efetuarBaixa(rowS.e_id, rowS.tipo_notificacao, rowS);
                        } else {
                            efetuarBaixa(enderecoId, null, null);
                        }
                    });
                    
                    function efetuarBaixa(finalEnderecoId, tipoNotificacao, rowS) {
                        const oldSaldo = rowS ? rowS.quantidade : 0;
                        const minSaldo = rowS ? (rowS.quantidade_minima || item.quantidade_minima || 0) : (item.quantidade_minima || 0);
                        
                        db.run("UPDATE estoque SET quantidade_atual = quantidade_atual - ? WHERE id = ? AND quantidade_atual >= ?", [count, item.id, count], (errUpd) => {
                            if (!errUpd) {
                                if (finalEnderecoId) {
                                    db.run('UPDATE estoque_saldo_por_endereco SET quantidade = MAX(0, quantidade - ?) WHERE estoque_id = ? AND endereco_id = ?', [count, item.id, finalEnderecoId], () => {
                                        const newSaldo = Math.max(0, oldSaldo - count);
                                        verificarENotificarEstoqueMinimoPorEndereco(item.id, item.nome, item.departamento, finalEnderecoId, oldSaldo, newSaldo, minSaldo, tipoNotificacao, item.foto_url, item.foto_base64);
                                    });
                                }
                                db.run('INSERT INTO estoque_historico (estoque_id, quantidade, tipo, usuario, motivo, endereco_id, endereco_nome) VALUES (?, ?, ?, ?, ?, ?, ?)', [item.id, count, 'Saida', 'Sistema', 'Baixa prontuário Colaborador', finalEnderecoId, enderecoNome], () => {});
                            }
                        });
                    }
                }
                
                `;
    code = code.substring(0, anchor2Start) + newChunk2 + code.substring(anchor2End);
    console.log('patched processarBaixaEstoque');
}

fs.writeFileSync('backend/server.js', code, 'utf8');
