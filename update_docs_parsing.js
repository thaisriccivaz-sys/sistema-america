const fs = require('fs');
const path = 'frontend/credenciamento.js';
let content = fs.readFileSync(path, 'utf8');

const regexVars = /const licencas = cred\.licencas_ids \? JSON\.parse\(cred\.licencas_ids\) : \[\];/g;
const replacementVars = `const licencas = cred.licencas_ids ? JSON.parse(cred.licencas_ids) : [];
        const docs = cred.docs_exigidos ? JSON.parse(cred.docs_exigidos) : [];`;

if(content.match(regexVars)) {
    content = content.replace(regexVars, replacementVars);
    fs.writeFileSync(path, content, 'utf8');
    console.log("Added docs parsing to credenciamento.js");
} else {
    console.log("Not found");
}