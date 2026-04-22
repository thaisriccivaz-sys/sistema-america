const https = require('https');const fs = require('fs');const FormData = require('form-data'); 
const API_KEY = 'AxaT-FiXBckHqEYV0s_MtUhLF3pReRz3dX4zVpC173vmjDwzLGHYtDJuQje4-4Pd'; 
const ACCOUNT_ID = '10237785fb23cf473d54845a013e'; 
const HOSTNAME = 'api.assinafy.com.br'; 
function req(method, urlPath, bodyObj) { return new Promise((resolve) => { const body = bodyObj ? JSON.stringify(bodyObj) : null; const options = { hostname: HOSTNAME, path: urlPath, method, headers: { 'X-Api-Key': API_KEY, 'Accept': 'application/json', ...(body ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } : {}) } }; const request = https.request(options, (res) => { const chunks = []; res.on('data', c => chunks.push(c)); res.on('end', () => { const raw = Buffer.concat(chunks).toString('utf8'); let json = null; try { json = JSON.parse(raw); } catch(e){} resolve({ status: res.statusCode, json, raw }); }); }); request.on('error', () => resolve({status:0})); if(body) request.write(body); request.end(); }); } 
function uploadForm(urlPath, form) { return new Promise((resolve) => { const options = { hostname: HOSTNAME, path: urlPath, method: 'POST', headers: { 'X-Api-Key': API_KEY, ...form.getHeaders() } }; const request = https.request(options, (res) => { const chunks = []; res.on('data', c => chunks.push(c)); res.on('end', () => { const raw = Buffer.concat(chunks).toString('utf8'); let json = null; try { json = JSON.parse(raw); } catch(e) {} resolve({ status: res.statusCode, json, raw }); }); }); form.pipe(request); }); } 
async function testAssignment() { 
    const s_res = await req('GET', '/v1/accounts/'+ACCOUNT_ID+'/signers?per_page=1'); const ss = s_res.json.data[0].id; 
    
    const form2 = new FormData(); form2.append('file', fs.readFileSync('test_2pages.pdf'), { filename: 'test_2pages.pdf', contentType: 'application/pdf' }); 
    const up2 = await uploadForm('/v1/accounts/'+ACCOUNT_ID+'/documents', form2); const docId2 = up2.json.data.id; 
    for(let i=0; i<15; i++) { await new Promise(r=>setTimeout(r, 2000)); let sr = await req('GET', '/v1/documents/'+docId2); if(!sr.json.data.status.includes('processing')) break; } 
    
    let a2 = await req('POST', '/v1/documents/'+docId2+'/assignments', { signers: [{ id: ss, role: 'signer', notification_methods: ['Email'] }], method: 'virtual', items: [{ page: null, signer: { id: ss }, field: { name: 'Assinatura', type: 'virtual', is_active: true, is_required: true } }] }); 
    console.log('ASSIGN CUSTOM STATUS:', a2.status); 
} testAssignment();
