const fs = require('fs');
const path = 'frontend/credenciamento.js';
let content = fs.readFileSync(path, 'utf8');

const target = /const dtLim = cred\.data_limite_envio \? new Date\(cred\.data_limite_envio\)\.toLocaleDateString\('pt-BR'\) : '-';\s*statusBadge = `<span style="color:#eab308; font-weight:600;"><i class="ph ph-clock"><\/i> Solicitado \(Limite: \$\{dtLim\}\)<\/span>`;/g;

const replacement = `statusBadge = \`<span style="color:#eab308; font-weight:600;"><i class="ph ph-clock"></i> Solicitado</span>\`;`;

if(content.match(target)) {
    content = content.replace(target, replacement);
    fs.writeFileSync(path, content, 'utf8');
    console.log("Successfully removed Limite from Status badge in credenciamento.js");
} else {
    console.log("Target not found");
}