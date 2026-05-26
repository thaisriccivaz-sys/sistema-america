const fs = require('fs');
let c = fs.readFileSync('frontend/resumo_rota.js', 'utf8');

const target = `        checkDiff('Resumo da Rota', snap.colBEditado, v.colBEditado);
        checkDiff('Observações do Roteirizador', snap.obsRoteirizador, v.obsRoteirizador);
        checkDiff('Observações de Alterações', snap.obsAlteracoes, v.obsAlteracoes);
    });

    if (promises.length) {`;

const replacement = `        checkDiff('Resumo da Rota', snap.colBEditado, v.colBEditado);
        checkDiff('Observações do Roteirizador', snap.obsRoteirizador, v.obsRoteirizador);
        checkDiff('Observações de Alterações', snap.obsAlteracoes, v.obsAlteracoes);
        checkDiff('Motorista', snap.motorista, v.motorista);
        checkDiff('Ajudante', snap.ajudante, v.ajudante);
        checkDiff('Veículo', snap.veiculo, v.veiculo);
    });

    if (promises.length === 0) {
        promises.push(fetch('/api/logistica/resumo-rota-auditoria', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
            body: JSON.stringify({
                data_rota: dataRota,
                nome_resumo: nomeFinal,
                veiculo: _rrVeiculos[0] ? _rrVeiculos[0].veiculo.split(' ')[0] : 'N/A',
                campo: 'SISTEMA',
                valor_anterior: '0',
                valor_atual: 'Salvo sem alterações'
            })
        }));
    }

    if (promises.length) {`;

c = c.replace(target, replacement);
fs.writeFileSync('frontend/resumo_rota.js', c);
