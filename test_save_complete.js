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

async function testAllFields() {
    try {
        const data = {
            nome_completo: `Teste Total ${Date.now()}`,
            cpf: `${Date.now()}`.substring(0, 11),
            ferias_programadas_inicio: '2025-05-10',
            ferias_programadas_fim: '2025-05-30',
            alergias: 'Amendoim, Poeira',
            cnh_numero: '12345678901',
            status: 'Ativo'
        };
        
        console.log("POSTING...");
        const postRes = await request('POST', '/api/colaboradores', data);
        const id = postRes.id;
        
        const verifyRes = await request('GET', `/api/colaboradores/${id}`);
        console.log('--- VERIFY POST ---');
        console.log('Inicio:', verifyRes.ferias_programadas_inicio);
        console.log('Fim:', verifyRes.ferias_programadas_fim);
        console.log('Alergias:', verifyRes.alergias);
        console.log('CNH:', verifyRes.cnh_numero);
        
        console.log("TESTING PUT...");
        await request('PUT', `/api/colaboradores/${id}`, {
            alergias: 'Nenhuma',
            cnh_numero: '98765432100'
        });
        
        const finalRes = await request('GET', `/api/colaboradores/${id}`);
        console.log('--- VERIFY PUT ---');
        console.log('Alergias:', finalRes.alergias);
        console.log('CNH:', finalRes.cnh_numero);
        
    } catch(e) { console.error(e); }
}

testAllFields();
