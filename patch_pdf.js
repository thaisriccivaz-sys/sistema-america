const fs = require('fs');
let code = fs.readFileSync('backend/server.js', 'utf8');

const regex = /const data = await sigorReq\('\/downloadManifesto\/' \+ row\.numero_mtr\);\s*const pdf = data\.objetoResposta \|\| null;/;

const replace = `      const token = await sigorGetToken();
      const fetchResponse = await fetch(SIGOR_CFG.api + '/downloadManifesto/' + row.numero_mtr, {
          method: 'POST',
          headers: { 'Authorization': token, 'Content-Type': 'application/json' }
      });
      if (!fetchResponse.ok) throw new Error('Erro na API CETESB ao baixar PDF (' + fetchResponse.status + ')');
      const arrayBuffer = await fetchResponse.arrayBuffer();
      const pdf = Buffer.from(arrayBuffer).toString('base64');`;

if(regex.test(code)) {
    code = code.replace(regex, replace);
    fs.writeFileSync('backend/server.js', code);
    console.log('PATCH PDF DOWNLOAD OK');
} else {
    console.log('REGEX FAIL');
}
