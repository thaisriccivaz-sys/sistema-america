const https = require('https'); 
const API_KEY = 'AxaT-FiXBckHqEYV0s_MtUhLF3pReRz3dX4zVpC173vmjDwzLGHYtDJuQje4-4Pd'; const ACCOUNT_ID = '10237785fb23cf473d54845a013e'; const HOSTNAME = 'api.assinafy.com.br'; 
const req = (method, urlPath) => new Promise((resolve) => { const options = { hostname: HOSTNAME, path: urlPath, method, headers: { 'X-Api-Key': API_KEY, 'Accept': 'application/json' } }; const requ = https.request(options, (res) => { let raw = ''; res.on('data', c => raw += c); res.on('end', () => resolve(raw)); }); requ.end(); }); 
async function t(){ 
  let a = await req('GET','/v1/accounts/'+ACCOUNT_ID+'/fields'); 
  console.log(a); 
} t();
