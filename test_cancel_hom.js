// Testa todas as variações de payload para cancelarManifestoLote no SIGOR (homologacao)
// e também tenta descobrir o formato correto
const fetch = require('node-fetch');

async function run() {
    // Token homologacao
    const r1 = await fetch('https://mtrr-hom.cetesb.sp.gov.br/apiws/rest/gettoken', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cpfCnpj: '38058722839', senha: 'gb5ti5', unidade: '19201' })
    });
    const d1 = await r1.json();
    const token = d1.objetoResposta;
    console.log('Token HOM:', token ? 'OK' : 'FALHOU');
    if (!token) return;

    // Primeiro, gerar uma MTR de teste na homologação para ter um número válido
    const now = new Date().toISOString().split('T')[0];
    const payloadGerar = [{
        seuCodigo: 'TEST_CANCEL_001',
        dataExpedicao: now,
        transportador: { cpfCnpj: '03434448000101', razaoSocial: 'América Rental Equipamentos', motoristas: [{ nome: 'Teste Cancel', cpfMotorista: '00000000000' }], veiculo: { placa: 'DPE5A75' } },
        gerador: { cpfCnpj: '03434448000101', razaoSocial: 'América Rental Equipamentos' },
        destinador: { cpfCnpj: '05380441000260', unidade: { uniCodigo: 19154 } },
        observacoes: 'Teste cancelamento',
        listaManifestoResiduos: [{ resCodigoIbama: '200304', marQuantidade: 1, uniCodigo: 'TON', tiaCodigo: 11, tieCodigo: 2, traCodigo: 23, claCodigo: 43 }]
    }];
    
    const r2 = await fetch('https://mtrr-hom.cetesb.sp.gov.br/apiws/rest/salvarManifestoLote', {
        method: 'POST',
        headers: { 'Authorization': token, 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadGerar)
    });
    const d2 = await r2.json();
    const numMTR = d2.objetoResposta?.[0]?.numManifesto;
    console.log('MTR gerada:', numMTR, '| tipo:', typeof numMTR);
    if (!numMTR) { console.log('Erro ao gerar:', JSON.stringify(d2)); return; }

    // Tenta cancelar com numManifesto (int)
    console.log('\n--- Cancelar: numManifesto (int) ---');
    const r3 = await fetch('https://mtrr-hom.cetesb.sp.gov.br/apiws/rest/cancelarManifestoLote', {
        method: 'POST',
        headers: { 'Authorization': token, 'Content-Type': 'application/json' },
        body: JSON.stringify([{ numManifesto: numMTR, justificativaCancelamento: 'Teste cancelamento sistema' }])
    });
    console.log('Status:', r3.status, await r3.text());

    // Se falhou, tenta com numeroManifesto (string)
    console.log('\n--- Cancelar: numeroManifesto (string) ---');
    const r4 = await fetch('https://mtrr-hom.cetesb.sp.gov.br/apiws/rest/cancelarManifestoLote', {
        method: 'POST',
        headers: { 'Authorization': token, 'Content-Type': 'application/json' },
        body: JSON.stringify([{ numeroManifesto: String(numMTR), justificativaCancelamento: 'Teste cancelamento sistema' }])
    });
    console.log('Status:', r4.status, await r4.text());
}

run().catch(console.error);
