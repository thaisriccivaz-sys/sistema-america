const fs = require('fs');
let code = fs.readFileSync('backend/server.js', 'utf8');

const regex = /const numeroMTR = obj\?\.manifestoNumeroEstadual \|\| obj\?\.numeroManifesto \|\| obj\?\.numero \|\| null;/;

const replace = `    let numeroMTR = obj?.numeroManifestoEstadual || obj?.manifestoNumeroEstadual || obj?.numeroManifesto || obj?.manifesto || obj?.numero || null;
    if (!numeroMTR) {
        const str = JSON.stringify(data);
        const match = str.match(/(?:numeroManifestoEstadual|manifesto|numero|manifestoNumeroEstadual|numeroManifesto)"?:\\s*"?(\\d+)"?/i) || str.match(/\\b(\\d{12,14})\\b/);
        if (match) numeroMTR = match[1];
    }`;

if (regex.test(code)) {
    code = code.replace(regex, replace);
    fs.writeFileSync('backend/server.js', code);
    console.log('PATCH MTR NUMERO OK');
} else {
    console.log('REGEX MTR NUMERO FAIL');
}
