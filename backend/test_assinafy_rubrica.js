/**
 * test_assinafy_rubrica.js
 * Testa a API do Assinafy para checar como desativar a rúbrica.
 * Executa: node backend/test_assinafy_rubrica.js
 */
const https = require('https');

const API_KEY    = 'AxaT-FiXBckHqEYV0s_MtUhLF3pReRz3dX4zVpC173vmjDwzLGHYtDJuQje4-4Pd';
const ACCOUNT_ID = '10237785fb23cf473d54845a013e';

function req(method, urlPath, bodyObj) {
    return new Promise((resolve, reject) => {
        const body = bodyObj ? JSON.stringify(bodyObj) : null;
        const options = {
            hostname: 'api.assinafy.com.br',
            path: urlPath,
            method,
            headers: {
                'X-Api-Key': API_KEY,
                'Accept': 'application/json',
                ...(body ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } : {})
            }
        };
        const request = https.request(options, (res) => {
            const chunks = [];
            res.on('data', c => chunks.push(c));
            res.on('end', () => {
                const raw = Buffer.concat(chunks).toString('utf8');
                let json = null;
                try { json = JSON.parse(raw); } catch(e) {}
                resolve({ status: res.statusCode, json, raw });
            });
        });
        request.on('error', reject);
        request.setTimeout(15000, () => request.destroy(new Error('Timeout')));
        if (body) request.write(body);
        request.end();
    });
}

async function main() {
    // 1. Listar documentos recentes para pegar um ID real
    console.log('\n=== 1. Listando documentos recentes ===');
    const docsRes = await req('GET', `/v1/accounts/${ACCOUNT_ID}/documents?per_page=5`, null);
    console.log('Status:', docsRes.status);
    const docs = docsRes.json?.data || [];
    console.log('Documentos:', docs.map(d => ({ id: d.id, name: d.name, status: d.status })));
    
    if (docs.length === 0) {
        console.log('Nenhum documento encontrado.');
        return;
    }
    
    const docId = docs[0].id;
    console.log('\n=== 2. Detalhes do documento mais recente ===');
    const docRes = await req('GET', `/v1/documents/${docId}`, null);
    console.log('Status:', docRes.status);
    console.log('Dados completos do documento:');
    console.log(JSON.stringify(docRes.json, null, 2));
    
    // 3. Listar signatários da conta
    console.log('\n=== 3. Signatários da conta ===');
    const signRes = await req('GET', `/v1/accounts/${ACCOUNT_ID}/signers?per_page=3`, null);
    console.log('Status:', signRes.status);
    const signers = signRes.json?.data || [];
    console.log('Signatários:', signers.map(s => ({ id: s.id, name: s.full_name, email: s.email })));
    
    // 4. Verificar schema do endpoint de assignments
    console.log('\n=== 4. Testando parâmetros do assignment ===');
    // Faz uma requisição inválida propositalmente para ver a mensagem de erro com os campos válidos
    if (signers.length > 0) {
        const testRes = await req('POST', `/v1/documents/${docId}/assignments`, {
            signers: [{ id: signers[0].id, role: 'signer', notification_methods: ['Email'], require_initials: false, initials_required: false }],
            method: 'virtual'
        });
        console.log('Status:', testRes.status);
        console.log('Resposta COMPLETA do assignment:');
        console.log(JSON.stringify(testRes.json, null, 2));
    }
}

main().catch(e => console.error('ERRO:', e.message));
