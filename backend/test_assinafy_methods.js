/**
 * test_assinafy_methods.js
 * Cria um documento de teste e testa diferentes métodos de assignment
 */
const https = require('https');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

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
        request.setTimeout(30000, () => request.destroy(new Error('Timeout')));
        if (body) request.write(body);
        request.end();
    });
}

function uploadForm(urlPath, form) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'api.assinafy.com.br',
            path: urlPath,
            method: 'POST',
            headers: { 'X-Api-Key': API_KEY, ...form.getHeaders() }
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
        request.setTimeout(60000, () => request.destroy(new Error('Timeout')));
        form.pipe(request);
    });
}

async function main() {
    // Pegar signatário existente
    const signRes = await req('GET', `/v1/accounts/${ACCOUNT_ID}/signers?per_page=3`, null);
    const signers = signRes.json?.data || [];
    const signerId = signers[0]?.id;
    console.log('Signatário para teste:', signers[0]?.full_name, signers[0]?.email);
    
    // Criar PDF simples de teste (1 página)
    const minPdf = Buffer.from([
        0x25,0x50,0x44,0x46,0x2D,0x31,0x2E,0x34,0x0A,
        0x31,0x20,0x30,0x20,0x6F,0x62,0x6A,0x0A,0x3C,
        0x3C,0x2F,0x54,0x79,0x70,0x65,0x2F,0x43,0x61,
        0x74,0x61,0x6C,0x6F,0x67,0x2F,0x50,0x61,0x67,
        0x65,0x73,0x20,0x32,0x20,0x30,0x20,0x52,0x3E,
        0x3E,0x0A,0x65,0x6E,0x64,0x6F,0x62,0x6A,0x0A,
        0x32,0x20,0x30,0x20,0x6F,0x62,0x6A,0x0A,0x3C,
        0x3C,0x2F,0x54,0x79,0x70,0x65,0x2F,0x50,0x61,
        0x67,0x65,0x73,0x2F,0x4B,0x69,0x64,0x73,0x5B,
        0x33,0x20,0x30,0x20,0x52,0x5D,0x2F,0x43,0x6F,
        0x75,0x6E,0x74,0x20,0x31,0x3E,0x3E,0x0A,0x65,
        0x6E,0x64,0x6F,0x62,0x6A,0x0A,0x33,0x20,0x30,
        0x20,0x6F,0x62,0x6A,0x0A,0x3C,0x3C,0x2F,0x54,
        0x79,0x70,0x65,0x2F,0x50,0x61,0x67,0x65,0x3E,
        0x3E,0x0A,0x65,0x6E,0x64,0x6F,0x62,0x6A,0x0A,
        0x78,0x72,0x65,0x66,0x0A,0x30,0x20,0x34,0x0A,
        0x30,0x30,0x30,0x30,0x30,0x30,0x30,0x30,0x30,
        0x30,0x20,0x36,0x35,0x35,0x33,0x35,0x20,0x66,
        0x20,0x0A,0x25,0x25,0x45,0x4F,0x46
    ]);
    
    const form = new FormData();
    form.append('file', minPdf, { filename: 'test_metodos.pdf', contentType: 'application/pdf' });
    
    console.log('\n=== Upload de documento de teste ===');
    const upRes = await uploadForm(`/v1/accounts/${ACCOUNT_ID}/documents`, form);
    console.log('Upload status:', upRes.status);
    const docId = (upRes.json?.data || upRes.json)?.id;
    console.log('Doc ID:', docId);
    
    if (!docId) {
        console.log('Upload falhou:', upRes.raw.substring(0, 300));
        return;
    }
    
    // Aguardar processamento
    await new Promise(r => setTimeout(r, 5000));
    
    // Testar método 'eletronic'
    console.log('\n=== Testando method: "eletronic" ===');
    const res1 = await req('POST', `/v1/documents/${docId}/assignments`, {
        signers: [{ id: signerId, role: 'signer', notification_methods: ['Email'] }],
        method: 'eletronic',
        copy_receivers: []
    });
    console.log('Status:', res1.status);
    console.log('Resposta:', JSON.stringify(res1.json, null, 2).substring(0, 500));
    
    if (res1.status >= 400) {
        // Se eletronic falhou, tentar electronic
        console.log('\n=== Testando method: "electronic" ===');
        const res2 = await req('POST', `/v1/documents/${docId}/assignments`, {
            signers: [{ id: signerId, role: 'signer', notification_methods: ['Email'] }],
            method: 'electronic',
            copy_receivers: []
        });
        console.log('Status:', res2.status);
        console.log('Resposta:', JSON.stringify(res2.json, null, 2).substring(0, 500));
        
        // Tentar click
        if (res2.status >= 400) {
            console.log('\n=== Testando method: "click" ===');
            const res3 = await req('POST', `/v1/documents/${docId}/assignments`, {
                signers: [{ id: signerId, role: 'signer', notification_methods: ['Email'] }],
                method: 'click',
                copy_receivers: []
            });
            console.log('Status:', res3.status);
            console.log('Resposta:', JSON.stringify(res3.json, null, 2).substring(0, 500));
        }
    }
}

main().catch(e => console.error('ERRO:', e.message));
