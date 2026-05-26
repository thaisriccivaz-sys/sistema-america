const fs = require('fs');
const path = 'frontend/credenciamento.js';
let content = fs.readFileSync(path, 'utf8');

const regexRow = /(<td style="font-size:0\.8rem; line-height:1\.6;">\$\{licencasText\}<\/td>\s*)(<td style="font-size:0\.85rem;">\$\{statusBadge\}<\/td>)/g;
const replacementRow = `$1<td style="font-size:0.8rem; font-weight:600; color:\${cred.data_limite_envio ? '#475569' : '#94a3b8'};">\${cred.data_limite_envio ? cred.data_limite_envio.split('-').reverse().join('/') : '-'}</td>
            $2`;

if (content.match(regexRow)) {
    content = content.replace(regexRow, replacementRow);
    fs.writeFileSync(path, content, 'utf8');
    console.log("Added Data Limite column in credenciamento.js");
} else {
    console.log("Regex not matched!");
}