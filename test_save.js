const http = require('http');

const options = (method, path) => ({
    hostname: 'localhost',
    port: 3000,
    path: path,
    method: method,
    headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer mock_token'
    }
});

function request(method, path, data) {
    return new Promise((resolve, reject) => {
        const req = http.request(options(method, path), (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => resolve(JSON.parse(body)));
        });
        req.on('error', reject);
        if (data) req.write(JSON.stringify(data));
        req.end();
    });
}

async function testPostThenGet() {
    try {
        const timestamp = Date.now();
        const data = {
            nome_completo: `Teste ${timestamp}`,
            cpf: `${timestamp}`.substring(0, 11),
            ferias_programadas_inicio: '2025-10-01',
            ferias_programadas_fim: '2025-10-30',
            status: 'Ativo'
        };
        
        console.log("POSTING NEW COLAB...");
        const postRes = await request('POST', '/api/colaboradores', data);
        console.log('POST res:', postRes);
        const id = postRes.id;
        
        if (!id) { console.log('No ID returned'); return; }
        
        const verifyRes = await request('GET', `/api/colaboradores/${id}`);
        console.log('VERIFY (POST) - INICIO:', verifyRes.ferias_programadas_inicio);
        console.log('VERIFY (POST) - FIM:', verifyRes.ferias_programadas_fim);
        
        // TEST PUT
        console.log("TESTING PUT...");
        const putRes = await request('PUT', `/api/colaboradores/${id}`, {
            ferias_programadas_inicio: '2026-01-01'
        });
        console.log('PUT result:', putRes);
        
        const finalRes = await request('GET', `/api/colaboradores/${id}`);
        console.log('FINAL VERIFY (PUT) - INICIO:', finalRes.ferias_programadas_inicio);
        
    } catch(e) { console.error(e); }
}

testPostThenGet();
