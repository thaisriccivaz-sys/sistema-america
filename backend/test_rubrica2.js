const https = require('https');const fs = require('fs');const FormData = require('form-data'); 
const API_KEY = 'AxaT-FiXBckHqEYV0s_MtUhLF3pReRz3dX4zVpC173vmjDwzLGHYtDJuQje4-4Pd'; 
const ACCOUNT_ID = '10237785fb23cf473d54845a013e'; 
const HOSTNAME = 'api.assinafy.com.br'; 
async function req(method, urlPath, bodyObj) { 
    return new Promise((resolve) => { 
        const body = bodyObj ? JSON.stringify(bodyObj) : null; 
        const options = { hostname: HOSTNAME, path: urlPath, method, headers: { 'X-Api-Key': API_KEY, 'Accept': 'application/json', ...(body ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } : {}) } }; 
        const request = https.request(options, (res) => { 
            const chunks = []; res.on('data', c => chunks.push(c)); 
            res.on('end', () => { const raw = Buffer.concat(chunks).toString('utf8'); let json = null; try { json = JSON.parse(raw); } catch(e){} resolve({ status: res.statusCode, json, raw }); }); 
        }); 
        request.on('error', () => resolve({status:0})); if(body) request.write(body); request.end(); 
    }); 
} 
function uploadForm(urlPath, form) { return new Promise((resolve) => { const options = { hostname: HOSTNAME, path: urlPath, method: 'POST', headers: { 'X-Api-Key': API_KEY, ...form.getHeaders() } }; const request = https.request(options, (res) => { const chunks = []; res.on('data', c => chunks.push(c)); res.on('end', () => { const raw = Buffer.concat(chunks).toString('utf8'); let json = null; try { json = JSON.parse(raw); } catch(e) {} resolve({ status: res.statusCode, json, raw }); }); }); form.pipe(request); }); } 
async function main() { 
    const s_res = await req('GET', '/v1/accounts/'+ACCOUNT_ID+'/signers?per_page=1'); 
    const ss = s_res.json.data[0].id; 
    const form = new FormData(); form.append('file', fs.readFileSync('out_test.pdf'), { filename: 'test.pdf', contentType: 'application/pdf' }); 
    const up = await uploadForm('/v1/accounts/'+ACCOUNT_ID+'/documents', form); 
    const docId = up.json.data.id; 
    console.log('doc', docId); 
    let ready = false; 
    for(let i=0; i<15; i++) { 
        await new Promise(r=>setTimeout(r, 2000)); 
        let statusRes = await req('GET', '/v1/documents/'+docId); 
        let ds = statusRes.json.data.status; 
        console.log('poll', ds); 
        if(!ds.includes('processing')) { ready = true; break; } 
    } 
    if(!ready) return; 
    const payload = { signers: [{ id: ss, role: 'signer', notification_methods: ['Email'], require_initials: false }], method: 'virtual', require_initials: false, initial_requirement: false, options:{ require_initials: false} }; 
    let d = await req('POST', '/v1/documents/'+docId+'/assignments', payload); 
    console.log('ASSIGN', d.status, d.raw); 
} main();
