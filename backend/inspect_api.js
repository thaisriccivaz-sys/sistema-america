const https = require('https');const fs = require('fs');const FormData = require('form-data'); 
const API_KEY = 'AxaT-FiXBckHqEYV0s_MtUhLF3pReRz3dX4zVpC173vmjDwzLGHYtDJuQje4-4Pd'; const ACCOUNT_ID = '10237785fb23cf473d54845a013e'; const HOSTNAME = 'api.assinafy.com.br'; 
function req(method, urlPath, bodyObj) { return new Promise((resolve) => { const body = bodyObj ? JSON.stringify(bodyObj) : null; const options = { hostname: HOSTNAME, path: urlPath, method, headers: { 'X-Api-Key': API_KEY, 'Accept': 'application/json', ...(body ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } : {}) } }; const request = https.request(options, (res) => { const chunks = []; res.on('data', c => chunks.push(c)); res.on('end', () => { const raw = Buffer.concat(chunks).toString('utf8'); let json = null; try { json = JSON.parse(raw); } catch(e){} resolve({ status: res.statusCode, json, raw }); }); }); request.on('error', () => resolve({status:0})); if(body) request.write(body); request.end(); }); } 
async function test(){ 
    console.log('Testing disabled initials param on ASSINAFY..'); 
} test();
