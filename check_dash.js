const https = require('https');
const options = {
  hostname: 'sistema-america.onrender.com',
  path: '/api/dashboard',
  method: 'GET',
  headers: {
    // Actually, I can't hit it without a valid JWT token. But I can check if it returns 401 instead of 500?
  }
};
https.get(options, (resp) => {
  let data = '';
  resp.on('data', (chunk) => { data += chunk; });
  resp.on('end', () => { console.log(resp.statusCode, data.substring(0, 50)); });
}).on("error", (err) => { console.log("Error: " + err.message); });
