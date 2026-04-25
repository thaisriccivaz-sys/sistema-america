const https = require('https');
https.get('https://sistema-america.onrender.com/api/version', (resp) => {
  let data = '';
  resp.on('data', (chunk) => { data += chunk; });
  resp.on('end', () => { console.log("VERSION:", data); });
}).on("error", (err) => { console.log("Error: " + err.message); });
