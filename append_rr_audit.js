const fs = require('fs');

const code = `
window._rrSnapshot = null;
window._rrCapturarSnapshot = function() {
    window._rrSnapshot = JSON.parse(JSON.stringify(window._rrVeiculos || []));
};

window._rrRegistrarAlteracoes = async function(nomeFinal) {
    if (!window._rrSnapshot) return;
    const token = window.currentToken || localStorage.getItem('erp_token') || '';
    const hoje = new Date().toISOString().split('T')[0];
    
    let dataRota = hoje;
    const infoData = document.getElementById('rr-data-info');
    if (infoData && infoData.innerText) {
        const m = infoData.innerText.match(/(\\d{1,2})\\s+de\\s+([a-zA-Zç]+)\\s+de\\s+(\\d{4})/);
        if (m) {
            const meses = {janeiro:'01',fevereiro:'02','março':'03',abril:'04',maio:'05',junho:'06',julho:'07',agosto:'08',setembro:'09',outubro:'10',novembro:'11',dezembro:'12'};
            dataRota = \`\${m[3]}-\${meses[m[2].toLowerCase()]}-\${m[1].padStart(2,'0')}\`;
        }
    }

    const promises = [];
    window._rrVeiculos.forEach((v, i) => {
        const snap = window._rrSnapshot[i];
        if (!snap) return;
        const placa = (v.veiculo || 'N/A').split(' ')[0];

        const checkDiff = (campo, oldVal, newVal) => {
            if ((oldVal || '') !== (newVal || '')) {
                promises.push(fetch('/api/logistica/resumo-rota-auditoria', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
                    body: JSON.stringify({
                        data_rota: dataRota,
                        nome_resumo: nomeFinal,
                        veiculo: placa,
                        campo: campo,
                        valor_anterior: oldVal || '',
                        valor_atual: newVal || ''
                    })
                }));
            }
        };

        checkDiff('Resumo da Rota', snap.colBEditado, v.colBEditado);
        checkDiff('Observações do Roteirizador', snap.obsRoteirizador, v.obsRoteirizador);
        checkDiff('Observações de Alterações', snap.obsAlteracoes, v.obsAlteracoes);
    });

    if (promises.length) {
        try {
            await Promise.all(promises);
        } catch (e) {
            console.error('Erro ao registrar auditoria de Resumo Rota', e);
        }
    }
};
`;

fs.appendFileSync('frontend/resumo_rota.js', code, 'utf8');
