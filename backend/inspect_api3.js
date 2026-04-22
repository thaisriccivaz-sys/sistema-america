const https = require('https');const fs = require('fs');const FormData = require('form-data'); 
const API_KEY = 'AxaT-FiXBckHqEYV0s_MtUhLF3pReRz3dX4zVpC173vmjDwzLGHYtDJuQje4-4Pd'; const ACCOUNT_ID = '10237785fb23cf473d54845a013e'; const HOSTNAME = 'api.assinafy.com.br'; 
function req(method, urlPath, bodyObj) { return new Promise((resolve) => { const body = bodyObj ? JSON.stringify(bodyObj) : null; const options = { hostname: HOSTNAME, path: urlPath, method, headers: { 'X-Api-Key': API_KEY, 'Accept': 'application/json', ...(body ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } : {}) } }; const request = https.request(options, (res) => { const chunks = []; res.on('data', c => chunks.push(c)); res.on('end', () => { const raw = Buffer.concat(chunks).toString('utf8'); let json = null; try { json = JSON.parse(raw); } catch(e){} resolve({ status: res.statusCode, json, raw }); }); }); request.on('error', () => resolve({status:0})); if(body) request.write(body); request.end(); }); } 
function uploadForm(urlPath, form) { return new Promise((resolve) => { const options = { hostname: HOSTNAME, path: urlPath, method: 'POST', headers: { 'X-Api-Key': API_KEY, ...form.getHeaders() } }; const request = https.request(options, (res) => { const chunks = []; res.on('data', c => chunks.push(c)); res.on('end', () => { const raw = Buffer.concat(chunks).toString('utf8'); let json = null; try { json = JSON.parse(raw); } catch(e) {} resolve({ status: res.statusCode, json, raw }); }); }); form.pipe(request); }); } 
async function t(){ 
  const s_res = await req('GET', '/v1/accounts/'+ACCOUNT_ID+'/signers?per_page=1'); const signerId = s_res.json.data[0].id; 
  let fd = new FormData(); fd.append('file', fs.readFileSync('test_2pages.pdf'), { filename:'test.pdf', contentType:'application/pdf'}); 
  let docRes = await uploadForm('/v1/accounts/'+ACCOUNT_ID+'/documents', fd); 
  let docId = docRes.json.data.id; 
  for(let i=0;i<15;i++){ let sr=await req('GET','/v1/documents/'+docId); if(!sr.json.data.status.includes('processing')) break; await new Promise(r=>setTimeout(r,1000)); } 
  let mVirtual = await req('POST','/v1/documents/'+docId+'/assignments', { signers: [{ id: signerId, role: 'signer', notification_methods: ['Email']}], method: 'virtual' }); 
  console.log('VIRTUAL ITEMS length:', mVirtual.json.data?.items?.length || 0); console.log(mVirtual.json.data?.items?.map(i => i.field.type)); 
  
  let fd2 = new FormData(); fd2.append('file', fs.readFileSync('test_2pages.pdf'), { filename:'test.pdf', contentType:'application/pdf'}); 
  let docRes2 = await uploadForm('/v1/accounts/'+ACCOUNT_ID+'/documents', fd2); 
  let docId2 = docRes2.json.data.id; 
  for(let i=0;i<15;i++){ let sr=await req('GET','/v1/documents/'+docId2); if(!sr.json.data.status.includes('processing')) break; await new Promise(r=>setTimeout(r,1000)); } 
  let mElect = await req('POST','/v1/documents/'+docId2+'/assignments', { signers: [{ id: signerId, role: 'signer', notification_methods: ['Email']}], method: 'electronic' }); 
  console.log('ELEC ITEMS length:', mElect.json.data?.items?.length || 0); console.log(mElect.json.data?.items?.map(i => i.field.type)); 
} t();
