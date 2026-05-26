const fs = require('fs');

let serverJs = fs.readFileSync('backend/server.js', 'utf8');

const regex = /claCodigo:\s*1\n/;
if(regex.test(serverJs)) {
    serverJs = serverJs.replace(regex, `claCodigo: req.body.claCodigo ? parseInt(req.body.claCodigo) : 2\n`);
    fs.writeFileSync('backend/server.js', serverJs);
    console.log('SERVER JS CLA_CODIGO PATCHED');
} else {
    console.log('SERVER JS CLA_CODIGO NOT FOUND');
}
