const https = require('https');const fs = require('fs');const FormData = require('form-data'); 
const API_KEY = 'AxaT-FiXBckHqEYV0s_MtUhLF3pReRz3dX4zVpC173vmjDwzLGHYtDJuQje4-4Pd'; const ACCOUNT_ID = '10237785fb23cf473d54845a013e'; const HOSTNAME = 'api.assinafy.com.br'; 
const req = (m, u, b) => new Promise(r => { const bd = b ? JSON.stringify(b) : null; const rq = https.request({hostname: HOSTNAME, path: u, method: m, headers: { 'X-Api-Key': API_KEY, 'Accept': 'application/json', ...(bd ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(bd) } : {}) }}, rs => { let rw = ''; rs.on('data', c => rw += c); rs.on('end', () => r(rw)); }); if(bd) rq.write(bd); rq.end(); }); 
async function t(){ 
  let docId = '1028292371797b952857490e2a9f'; 
  let r = await req('GET', '/v1/documents/'+docId); let doc = JSON.parse(r).data; 
  let items = doc.assignment.items; 
  console.log('Este doc (Outros_Recebimento):', items.length, 'items:', items.map(i=>i.field.type)); 
  let docId2 = '102828fba96bb54e88693d273785'; 
  let r2 = await req('GET', '/v1/documents/'+docId2); let doc2 = JSON.parse(r2).data; 
  let items2 = doc2.assignment?.items || 'NO ASSIGNMENT'; 
  console.log('Este doc (metadata_ready):', items2, '| status:', doc2.status); 
} t();
