const https = require('https');const fs = require('fs');const FormData = require('form-data'); 
const API_KEY = 'AxaT-FiXBckHqEYV0s_MtUhLF3pReRz3dX4zVpC173vmjDwzLGHYtDJuQje4-4Pd'; const ACCOUNT_ID = '10237785fb23cf473d54845a013e'; const HOSTNAME = 'api.assinafy.com.br'; 
const req = (m, u, b) => new Promise(r => { const bd = b ? JSON.stringify(b) : null; const rq = https.request({hostname: HOSTNAME, path: u, method: m, headers: { 'X-Api-Key': API_KEY, 'Accept': 'application/json', ...(bd ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(bd) } : {}) }}, rs => { let rw = ''; rs.on('data', c => rw += c); rs.on('end', () => r(rw)); }); if(bd) rq.write(bd); rq.end(); }); 
function uploadForm(u, f) { return new Promise(r => { const rq = https.request({hostname: HOSTNAME, path: u, method: 'POST', headers: { 'X-Api-Key': API_KEY, ...f.getHeaders() }}, rs => { let rw = ''; rs.on('data', c => rw += c); rs.on('end', () => r(rw)); }); f.pipe(rq); }); } 
async function t(){ 
  let fd = new FormData(); fd.append('file', fs.readFileSync('test_2pages.pdf'), {filename:'t.pdf'}); 
  let dr = await uploadForm('/v1/accounts/'+ACCOUNT_ID+'/documents', fd); let dId = JSON.parse(dr).data.id; 
  for(let i=0;i<10;i++){ let sr=await req('GET','/v1/documents/'+dId); if(!JSON.parse(sr).data.status.includes('processing')) break; await new Promise(res=>setTimeout(res,1000)); } 
  const s_res = await req('GET', '/v1/accounts/'+ACCOUNT_ID+'/signers?per_page=1'); let sId = JSON.parse(s_res).data[0].id; 
  let a = await req('POST','/v1/documents/'+dId+'/assignments', { signers: [{id: sId, role: 'signer', notification_methods: ['Email'], require_initials: false, has_initials: false}], method: 'virtual', require_initials: false, initials: false, has_initials: false, requires_initials: false, is_initials_required: false }); 
  console.log('Result URL:', JSON.parse(a).data?.signing_urls?.[0]?.url); 
} t();
