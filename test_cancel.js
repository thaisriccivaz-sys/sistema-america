// Script para testar diretamente o cancelamento via SIGOR API
const fetch = require('node-fetch');

async function run() {
    // Auth
    const r1 = await fetch('https://mtrr.cetesb.sp.gov.br/apiws/rest/gettoken', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cpfCnpj: '38058722839', senha: 'gb5ti5', unidade: '19201' })
    });
    const d1 = await r1.json();
    const token = d1.objetoResposta;
    console.log('Token:', token ? 'OK' : 'FALHOU', token?.substring(0, 30));

    // Try numManifesto as integer
    console.log('\n--- Tentativa 1: numManifesto (int) ---');
    const r2 = await fetch('https://mtrr.cetesb.sp.gov.br/apiws/rest/cancelarManifestoLote', {
        method: 'POST',
        headers: { 'Authorization': token, 'Content-Type': 'application/json' },
        body: JSON.stringify([{ numManifesto: 260011827713, justificativaCancelamento: 'Teste cancelamento via sistema' }])
    });
    const t2 = await r2.text();
    console.log('Status:', r2.status, 'Response:', t2.substring(0, 400));

    // Try numeroManifesto as string
    console.log('\n--- Tentativa 2: numeroManifesto (string) ---');
    const r3 = await fetch('https://mtrr.cetesb.sp.gov.br/apiws/rest/cancelarManifestoLote', {
        method: 'POST',
        headers: { 'Authorization': token, 'Content-Type': 'application/json' },
        body: JSON.stringify([{ numeroManifesto: '260011827713', justificativaCancelamento: 'Teste cancelamento via sistema' }])
    });
    const t3 = await r3.text();
    console.log('Status:', r3.status, 'Response:', t3.substring(0, 400));
    
    // Try cancelarManifesto (singular)
    console.log('\n--- Tentativa 3: /cancelarManifesto (singular) ---');
    const r4 = await fetch('https://mtrr.cetesb.sp.gov.br/apiws/rest/cancelarManifesto/260011827713', {
        method: 'DELETE',
        headers: { 'Authorization': token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ justificativaCancelamento: 'Teste cancelamento via sistema' })
    });
    const t4 = await r4.text();
    console.log('Status:', r4.status, 'Response:', t4.substring(0, 400));
}

run().catch(console.error);
