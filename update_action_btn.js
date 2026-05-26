const fs = require('fs');
const path = 'frontend/credenciamento.js';
let content = fs.readFileSync(path, 'utf8');

const regexAction = /\$\{cred\.token \? \`<button class="btn btn-outline btn-sm" style="padding:4px 8px; font-size:12px; margin-right:4px;" onclick="window\.reenviarEmailCredenciamento\('\$\{cred\.id\}'\)"><i class="ph ph-envelope-simple"><\/i> Reenviar<\/button>\` : ''\}/g;

const replacementAction = `\${cred.status === 'solicitado' ? \`<button class="btn btn-primary btn-sm" style="padding:4px 8px; font-size:12px; margin-right:4px;" onclick="window.abrirModalCumprirSolicitacao('\${cred.id}')"><i class="ph ph-plus"></i> Atender</button>\` : (cred.token ? \`<button class="btn btn-outline btn-sm" style="padding:4px 8px; font-size:12px; margin-right:4px;" onclick="window.reenviarEmailCredenciamento('\${cred.id}')"><i class="ph ph-envelope-simple"></i> Reenviar</button>\` : '')}`;

if (content.match(regexAction)) {
    content = content.replace(regexAction, replacementAction);
    fs.writeFileSync(path, content, 'utf8');
    console.log("Fixed action button logic in credenciamento.js");
} else {
    console.log("Regex not matched!");
}