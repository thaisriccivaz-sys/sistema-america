const https = require('https');const fs = require('fs');const FormData = require('form-data'); 
const API_KEY = 'AxaT-FiXBckHqEYV0s_MtUhLF3pReRz3dX4zVpC173vmjDwzLGHYtDJuQje4-4Pd'; const ACCOUNT_ID = '10237785fb23cf473d54845a013e'; const HOSTNAME = 'api.assinafy.com.br'; 
const req = (m, u, b) => new Promise(r => { const bd = b ? JSON.stringify(b) : null; const rq = https.request({hostname: HOSTNAME, path: u, method: m, headers: { 'X-Api-Key': API_KEY, 'Accept': 'application/json', ...(bd ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(bd) } : {}) }}, rs => { let rw = ''; rs.on('data', c => rw += c); rs.on('end', () => r(rw)); }); if(bd) rq.write(bd); rq.end(); }); 
async function t(){ 
  let a = await req('GET','/v1/accounts/'+ACCOUNT_ID+'/fields'); 
  console.log(a); 
} t();
