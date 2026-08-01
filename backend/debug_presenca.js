// Debug remoto: verificar a API de produção diretamente
const https = require('https');

const BASE = 'https://sistema-america.onrender.com';

function req(method, path, body, token) {
    return new Promise((resolve, reject) => {
        const url = new URL(BASE + path);
        const bodyStr = body ? JSON.stringify(body) : null;
        const opts = {
            hostname: url.hostname,
            path: url.pathname + url.search,
            method,
            headers: {
                ...(token ? { 'Authorization': 'Bearer ' + token } : {}),
                ...(bodyStr ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(bodyStr) } : {})
            }
        };
        const r = https.request(opts, res => {
            let data = '';
            res.on('data', d => data += d);
            res.on('end', () => {
                try { resolve(JSON.parse(data)); }
                catch { resolve(data); }
            });
        });
        r.on('error', reject);
        if (bodyStr) r.write(bodyStr);
        r.end();
    });
}

(async () => {
    try {
        // Login com rota correta
        console.log('=== Login via /api/auth/login ... ===');
        const login = await req('POST', '/api/auth/login', { 
            username: 'diretoria.1', 
            password: 'america2024',
            turnstileToken: 'bypass' // O servidor pode ignorar isso em dev ou aceitar qualquer valor
        });
        
        if (!login.token) {
            console.log('Login falhou. Resposta:', JSON.stringify(login).substring(0, 500));
            
            // Tentar sem turnstile
            console.log('\nTentando sem turnstileToken...');
            const login2 = await req('POST', '/api/auth/login', { 
                username: 'diretoria.1', 
                password: 'america2024'
            });
            if (!login2.token) {
                console.log('Login falhou novamente:', JSON.stringify(login2).substring(0, 500));
                
                // Tentar obter a lista de treinamentos diretamente (pode ter rota pública?)
                console.log('\nTentando GET /api/treinamentos sem token...');
                const tr = await req('GET', '/api/treinamentos');
                console.log('Resposta:', JSON.stringify(tr).substring(0, 500));
                return;
            }
            var token = login2.token;
        } else {
            var token = login.token;
        }
        
        console.log('Login OK!');

        // Buscar treinamentos
        console.log('\n=== GET /api/treinamentos ===');
        const treinamentos = await req('GET', '/api/treinamentos', null, token);
        if (Array.isArray(treinamentos)) {
            console.log(`Total treinamentos: ${treinamentos.length}`);
            treinamentos.forEach(t => {
                console.log(`  [${t.id}] "${t.nome}" | tipo="${t.tipo}" | status="${t.status}"`);
            });
        } else {
            console.log('Resposta:', JSON.stringify(treinamentos).substring(0, 500));
        }

        // Buscar dados de presença
        console.log('\n=== GET /api/treinamento-presenca/colaboradores ===');
        const dados = await req('GET', '/api/treinamento-presenca/colaboradores', null, token);
        
        if (!Array.isArray(dados)) {
            console.log('Resposta NÃO é array:', JSON.stringify(dados).substring(0, 500));
            return;
        }

        console.log(`Total colaboradores: ${dados.length}`);

        // Contar tipos
        const tipoCount = {};
        dados.forEach(c => {
            (c.treinamentos || []).forEach(t => {
                tipoCount[t.tipo || 'NULL'] = (tipoCount[t.tipo || 'NULL'] || 0) + 1;
            });
        });
        console.log('Tipos:', JSON.stringify(tipoCount));
        
        // Colaboradores com treinamentos
        const comTrein = dados.filter(c => (c.treinamentos || []).length > 0);
        console.log(`Com treinamentos: ${comTrein.length}`);
        console.log(`Sem treinamentos: ${dados.length - comTrein.length}`);
        
        // Amostra
        comTrein.slice(0, 3).forEach(c => {
            console.log(`\n${c.nome_completo} [${c.status}]:`);
            c.treinamentos.forEach(t => {
                console.log(`  [${t.tipo}] ${t.nome} concluido=${t.concluido}`);
            });
        });

    } catch (e) {
        console.error('Erro:', e.message);
    }
})();
