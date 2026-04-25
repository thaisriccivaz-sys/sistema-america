const https = require('https');
const token = "rnd_yS6499F5DCHXWf7D0Rer3a91E33W"; // From previous context I know it might be invalid, but wait, let me extract from deploy.md securely

const fs = require('fs');
let deployToken = '';
try {
    const lines = fs.readFileSync('.agents/workflows/deploy.md', 'utf8').split('\n');
    for (let line of lines) {
        if (line.includes('Bearer rnd_')) {
            deployToken = line.match(/Bearer\s+(rnd_[A-Za-z0-9]+)/)[1];
            break;
        }
    }
} catch(e) {}

if (!deployToken) deployToken = "rnd_yS6499F5DCHXWf7D0Rer3a91E33W";

const options = {
  hostname: 'api.render.com',
  path: '/v1/services/srv-cu2b5g52ng1s739281a0/logs?limit=50',
  method: 'GET',
  headers: {
    'Accept': 'application/json',
    'Authorization': 'Bearer ' + deployToken
  }
};

const req = https.request(options, res => {
  let data = ''; res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
        const logs = JSON.parse(data);
        if (Array.isArray(logs)) {
            logs.forEach(l => console.log(l.message));
        } else { console.log('Response:', data.substring(0,200)); }
    } catch(e) { console.error('Error:', e.message); }
  });
});
req.on('error', e => console.error(e));
req.end();
