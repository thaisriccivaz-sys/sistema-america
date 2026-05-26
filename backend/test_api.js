const fetch = require('node-fetch');

async function test() {
    try {
        const res = await fetch('http://localhost:3000/api/logistica/resumo-rota-auditoria', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }, // omitting token for test might return 401/403, we will see
            body: JSON.stringify({
                data_rota: '2026-05-15',
                nome_resumo: 'Teste',
                veiculo: 'ABC-1234',
                campo: 'Observações de Alterações',
                valor_anterior: '',
                valor_atual: 'teste'
            })
        });
        console.log('Status:', res.status);
        const text = await res.text();
        console.log('Body:', text);
    } catch(e) {
        console.error(e);
    }
}
test();
