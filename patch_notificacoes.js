const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'backend', 'server.js');
let code = fs.readFileSync(file, 'utf8');

const helperCode = 
// HELPER: Verifica e notifica estoque mínimo por endereço
function verificarENotificarEstoqueMinimoPorEndereco(itemId, itemNome, itemDepto, enderecoId, qtdAnterior, qtdAtual, minEnd, tipoNotifEnd, fotoUrl, fotoBase64) {
    if (minEnd > 0 && qtdAtual <= minEnd && qtdAnterior > minEnd) {
        const msg = \ESTOQUE BAIXO: O item "\" (\) atingiu o estoque mínimo no endereço. Quantidade Atual: \.\;
        const dadosStr = JSON.stringify({ item_id: itemId, nome: itemNome, quantidade_atual: qtdAtual, quantidade_minima: minEnd });
        const tiposNotif = (tipoNotifEnd && tipoNotifEnd.trim() !== '') ? [tipoNotifEnd] : ['compra'];
        tiposNotif.forEach(tipoNotif => {
            const dbTipo = tipoNotif === 'reposicao' ? 'estoque_reposicao' : 'estoque_minimo';
            db.all(\SELECT usuario_id FROM config_notificacoes WHERE tipo = ?\, [dbTipo], (errCR, rowsCR) => {
                if (!errCR && rowsCR && rowsCR.length > 0) {
                    rowsCR.forEach(c => {
                        db.run("INSERT INTO notificacoes_usuarios (usuario_id, tipo, mensagem, dados) VALUES (?, ?, ?, ?)", [c.usuario_id, dbTipo, msg, dadosStr]);
                    });
                    const qIds = rowsCR.map(r => r.usuario_id).join(',');
                    db.all(\
                        SELECT u.email as user_email, c.email_corporativo as colab_email
                        FROM usuarios u
                        LEFT JOIN colaboradores c ON u.nome = c.nome_completo
                        WHERE u.id IN (\)
                    \, [], (errU, users) => {
                        if (!errU && users && users.length > 0) {
                            const emailsArray = users.map(u => u.colab_email || u.user_email).filter(e => e && e.trim() !== '');
                            if (emailsArray.length > 0) {
                                const emails = [...new Set(emailsArray)].join(',');
                                const _logoPath = require('path').join(__dirname, '..', 'frontend', 'assets', 'logo-header.png');
                                (async () => {
                                    let fotoHtml = '';
                                    let fotoAttachment = null;
                                    if (fotoUrl && fotoUrl.startsWith('http')) {
                                        try {
                                            const https = require('https');
                                            const http = require('http');
                                            const fotoBuffer = await new Promise((resolve, reject) => {
                                                const mod = fotoUrl.startsWith('https') ? https : http;
                                                mod.get(fotoUrl, (resp) => {
                                                    const chunks = [];
                                                    resp.on('data', c => chunks.push(c));
                                                    resp.on('end', () => resolve(Buffer.concat(chunks)));
                                                    resp.on('error', reject);
                                                }).on('error', reject);
                                            });
                                            const contentType = fotoUrl.endsWith('.png') ? 'image/png' : (fotoUrl.endsWith('.webp') ? 'image/webp' : 'image/jpeg');
                                            const fotoExt = contentType.split('/')[1].replace('jpeg','jpg');
                                            fotoAttachment = { filename: 'produto.' + fotoExt, content: fotoBuffer, contentType, cid: 'produto-foto' };
                                            fotoHtml = '<div style=\\"text-align:center;margin:15px 0 20px;\\"><img src=\\"cid:produto-foto\\" alt=\\"' + itemNome + '\\" width=\\"200\\" height=\\"200\\" style=\\"max-width:200px;max-height:200px;border-radius:8px;border:1px solid #e2e8f0;object-fit:contain;\\" /><p style=\\"margin:6px 0 0;font-size:12px;color:#64748b;\\">Foto do produto</p></div>';
                                        } catch(eFoto) {
                                            fotoHtml = '<div style=\\"text-align:center;margin:15px 0 20px;\\"><img src=\\"' + fotoUrl + '\\" alt=\\"' + itemNome + '\\" width=\\"200\\" height=\\"200\\" style=\\"max-width:200px;max-height:200px;border-radius:8px;border:1px solid #e2e8f0;object-fit:contain;\\" /><p style=\\"margin:6px 0 0;font-size:12px;color:#64748b;\\">Foto do produto</p></div>';
                                        }
                                    } else if (fotoBase64 && fotoBase64.startsWith('data:image')) {
                                        const _fm = fotoBase64.match(/^data:([A-Za-z-+\\/]+);base64,(.+)$/);
                                        if (_fm) {
                                            const _fext = (_fm[1].split('/')[1] || 'jpg').replace('jpeg','jpg');
                                            fotoAttachment = { filename: 'produto.' + _fext, content: Buffer.from(_fm[2], 'base64'), cid: 'produto-foto' };
                                            fotoHtml = '<div style=\\"text-align:center;margin:15px 0 20px;\\"><img src=\\"cid:produto-foto\\" alt=\\"' + itemNome + '\\" width=\\"200\\" height=\\"200\\" style=\\"max-width:200px;max-height:200px;border-radius:8px;border:1px solid #e2e8f0;object-fit:contain;\\" /><p style=\\"margin:6px 0 0;font-size:12px;color:#64748b;\\">Foto do produto</p></div>';
                                        }
                                    }
                                    const mailOptions = {
                                        from: \"América Rental - Sistema" <\>\,
                                        to: emails,
                                        subject: 'ALERTA DE ESTOQUE MÍNIMO - America Rental',
                                        html: \
                                            <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
                                                <div style="text-align: center; margin-bottom: 20px;">
                                                    <img src="cid:empresa-logo" alt="America Rental" style="max-height: 80px;" />
                                                </div>
                                                <h2 style="color: #dc2626; text-align: center;">Aviso de Estoque Mínimo</h2>
                                                <p>O seguinte item atingiu ou está abaixo da quantidade mínima em estoque (Endereço ID: \):</p>
                                                \
                                                <table style="width: 100%; border-collapse: collapse; margin-top: 15px; margin-bottom: 20px;">
                                                    <tr><th style="text-align: left; padding: 8px; background: #f8fafc; border: 1px solid #e2e8f0;">Item</th><td style="padding: 8px; border: 1px solid #e2e8f0; font-weight: bold;">\</td></tr>
                                                    <tr><th style="text-align: left; padding: 8px; background: #f8fafc; border: 1px solid #e2e8f0;">Departamento</th><td style="padding: 8px; border: 1px solid #e2e8f0;">\</td></tr>
                                                    <tr><th style="text-align: left; padding: 8px; background: #f8fafc; border: 1px solid #e2e8f0;">Quantidade Atual no Endereço</th><td style="padding: 8px; border: 1px solid #e2e8f0; color: #dc2626; font-weight: bold;">\</td></tr>
                                                    <tr><th style="text-align:left;padding:8px;background:#f8fafc;border:1px solid #e2e8f0;">Quantidade Mínima do Endereço</th><td style="padding:8px;border:1px solid #e2e8f0;">\</td></tr>
                                                </table>
                                                <p>Por favor, providencie a reposição o mais breve possível.</p>
                                            </div>
                                        \,
                                        attachments: [
                                            { filename: 'logo.png', path: _logoPath, cid: 'empresa-logo' },
                                            ...(fotoAttachment ? [fotoAttachment] : [])
                                        ]
                                    };
                                    sendMailHelper(mailOptions).catch(e => console.error('[ESTOQUE] Erro ao enviar e-mail:', e));
                                })().catch(e => console.error('[ESTOQUE] Erro async ao montar email:', e));
                            }
                        }
                    });
                }
            });
        });
    }
}
;

// Insert the helper around line 11500
if (!code.includes('verificarENotificarEstoqueMinimoPorEndereco')) {
    code = code.replace(
        '// POST: registrar entrega assinada de EPIs',
        helperCode + '\n// POST: registrar entrega assinada de EPIs'
    );
}

// 1. Refactor processarBaixaEstoque
const oldProcessarBaixa = code.match(/function processarBaixaEstoque\(item, count, enderecoId, enderecoNome\) \{[\s\S]*?\/\/ Carregar todo o estoque para a memória/);
if (oldProcessarBaixa) {
    const newProcessarBaixa = unction processarBaixaEstoque(item, count, enderecoId, enderecoNome) {
        if (!item || item.quantidade_atual < count) {
            console.warn(\[ESTOQUE] Item "\" com estoque insuficiente para baixa de \.\);
            count = item ? Math.max(0, item.quantidade_atual) : 0;
            if (count === 0) return;
        }
        
        // Verifica qual endereco usar
        const endIdParaBaixar = enderecoId || 1; // Ajuste simplificado
        
        db.get('SELECT s.quantidade, s.quantidade_minima, ee.tipo_notificacao, ee.id as e_id FROM estoque_saldo_por_endereco s JOIN estoque_enderecos ee ON ee.id = s.endereco_id WHERE s.estoque_id = ? AND s.endereco_id = ?', [item.id, enderecoId], (errS, rowS) => {
            if (!rowS && !enderecoId) {
                // Tenta pegar o 'Geral'
                db.get("SELECT id, tipo_notificacao FROM estoque_enderecos WHERE nome = 'Geral'", [], (errG, rowG) => {
                    if (rowG) efetuarBaixa(rowG.id, rowG.tipo_notificacao, null);
                });
            } else if (rowS) {
                efetuarBaixa(rowS.e_id, rowS.tipo_notificacao, rowS);
            }
        });
        
        function efetuarBaixa(finalEnderecoId, tipoNotificacao, rowS) {
            const oldSaldo = rowS ? rowS.quantidade : 0;
            const minSaldo = rowS ? (rowS.quantidade_minima || item.quantidade_minima || 0) : (item.quantidade_minima || 0);
            
            db.run("UPDATE estoque SET quantidade_atual = quantidade_atual - ? WHERE id = ? AND quantidade_atual >= ?", [count, item.id, count], (errUpd) => {
                if (!errUpd) {
                    db.run('UPDATE estoque_saldo_por_endereco SET quantidade = MAX(0, quantidade - ?) WHERE estoque_id = ? AND endereco_id = ?', [count, item.id, finalEnderecoId], () => {
                        const newSaldo = Math.max(0, oldSaldo - count);
                        verificarENotificarEstoqueMinimoPorEndereco(item.id, item.nome, item.departamento, finalEnderecoId, oldSaldo, newSaldo, minSaldo, tipoNotificacao, item.foto_url, item.foto_base64);
                    });
                    db.run('INSERT INTO estoque_historico (estoque_id, quantidade, tipo, usuario, motivo, endereco_id, endereco_nome) VALUES (?, ?, ?, ?, ?, ?, ?)', [item.id, count, 'Saida', 'Sistema', 'Baixa prontuário Colaborador', finalEnderecoId, enderecoNome], () => {});
                }
            });
        }
    }
    // Carregar todo o estoque para a memória;
    code = code.replace(oldProcessarBaixa[0], newProcessarBaixa);
}

// 2. Refactor baixa manual
const oldBaixa = code.match(/db\.run\('UPDATE estoque SET quantidade_atual = quantidade_atual - \?, atualizado_em = CURRENT_TIMESTAMP WHERE id = \?', \[qtd, id\], \(errU\) => \{[\s\S]*?res\.json\(\{ success: true \}\);\s*\}\);/);
if (oldBaixa) {
    const newBaixa = db.run('UPDATE estoque SET quantidade_atual = quantidade_atual - ?, atualizado_em = CURRENT_TIMESTAMP WHERE id = ?', [qtd, id], (errU) => {
            if (errU) return res.status(500).json({ error: errU.message });
            if (endereco_id) {
                db.get('SELECT s.quantidade, s.quantidade_minima, ee.tipo_notificacao, ee.nome as e_nome FROM estoque_saldo_por_endereco s JOIN estoque_enderecos ee ON ee.id = s.endereco_id WHERE s.estoque_id = ? AND s.endereco_id = ?', [id, endereco_id], (errS, rowS) => {
                    if (rowS) {
                        const oldSaldo = rowS.quantidade;
                        const minSaldo = rowS.quantidade_minima || item.quantidade_minima || 0;
                        db.run('UPDATE estoque_saldo_por_endereco SET quantidade = MAX(0, quantidade - ?) WHERE estoque_id = ? AND endereco_id = ?', [qtd, id, endereco_id], () => {
                            const newSaldo = Math.max(0, oldSaldo - qtd);
                            verificarENotificarEstoqueMinimoPorEndereco(item.id, item.nome, item.departamento, endereco_id, oldSaldo, newSaldo, minSaldo, rowS.tipo_notificacao, item.foto_url, item.foto_base64);
                        });
                        db.run('INSERT INTO estoque_historico (estoque_id, quantidade, tipo, usuario, motivo, endereco_id, endereco_nome) VALUES (?, ?, ?, ?, ?, ?, ?)', [id, qtd, 'Saida', usuario, motivo || 'Baixa Manual', endereco_id, rowS.e_nome], () => {});
                    }
                });
            } else {
                db.run('INSERT INTO estoque_historico (estoque_id, quantidade, tipo, usuario, motivo, endereco_id, endereco_nome) VALUES (?, ?, ?, ?, ?, ?, ?)', [id, qtd, 'Saida', usuario, motivo || 'Baixa Manual', null, null], () => {});
            }
            res.json({ success: true });
        });;
    code = code.replace(oldBaixa[0], newBaixa);
}

// 3. Refactor movimentar
const oldMovimentar = code.match(/db\.run\('UPDATE estoque SET quantidade_atual = MAX\(0, quantidade_atual \+ \?\), atualizado_em = CURRENT_TIMESTAMP WHERE id = \?', \[qtd, id\], \(errU\) => \{[\s\S]*?res\.json\(\{ success: true \}\);\s*\}\);/);
if (oldMovimentar) {
    const newMovimentar = db.run('UPDATE estoque SET quantidade_atual = MAX(0, quantidade_atual + ?), atualizado_em = CURRENT_TIMESTAMP WHERE id = ?', [qtd, id], (errU) => {
            if (errU) return res.status(500).json({ error: errU.message });
            if (endereco_id) {
                db.get('SELECT s.quantidade, s.quantidade_minima, ee.tipo_notificacao, ee.nome as e_nome FROM estoque_saldo_por_endereco s JOIN estoque_enderecos ee ON ee.id = s.endereco_id WHERE s.estoque_id = ? AND s.endereco_id = ?', [id, endereco_id], (errS, rowS) => {
                    const oldSaldo = rowS ? rowS.quantidade : 0;
                    const minSaldo = rowS ? (rowS.quantidade_minima || item.quantidade_minima || 0) : (item.quantidade_minima || 0);
                    db.run('UPDATE estoque_saldo_por_endereco SET quantidade = MAX(0, quantidade + ?) WHERE estoque_id = ? AND endereco_id = ?', [qtd, id, endereco_id], () => {
                        if (qtd < 0 && rowS) {
                            const newSaldo = Math.max(0, oldSaldo + qtd);
                            verificarENotificarEstoqueMinimoPorEndereco(item.id, item.nome, item.departamento, endereco_id, oldSaldo, newSaldo, minSaldo, rowS.tipo_notificacao, item.foto_url, item.foto_base64);
                        }
                        const endNome = rowS ? rowS.e_nome : null;
                        db.run('INSERT INTO estoque_historico (estoque_id, quantidade, tipo, usuario, motivo, endereco_id, endereco_nome) VALUES (?, ?, ?, ?, ?, ?, ?)', [id, Math.abs(qtd), qtd > 0 ? 'Entrada' : 'Saida', usuario, motivo || 'Movimentacao', endereco_id, endNome], () => {});
                    });
                });
            } else {
                db.run('INSERT INTO estoque_historico (estoque_id, quantidade, tipo, usuario, motivo, endereco_id, endereco_nome) VALUES (?, ?, ?, ?, ?, ?, ?)', [id, Math.abs(qtd), qtd > 0 ? 'Entrada' : 'Saida', usuario, motivo || 'Movimentacao', null, null], () => {});
            }
            res.json({ success: true });
        });;
    code = code.replace(oldMovimentar[0], newMovimentar);
}

fs.writeFileSync(file, code, 'utf8');
console.log("Patched server.js successfully.");
