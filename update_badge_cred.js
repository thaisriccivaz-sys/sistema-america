const fs = require('fs');
const path = 'frontend/credenciamento.js';
let content = fs.readFileSync(path, 'utf8');

const regexBadge = /let statusBadge = '';\s*if \(expirado\) \{\s*statusBadge = \`<span style="color:#dc2626; font-weight:600;"><i class="ph ph-x-circle"><\/i> Expirado<\/span>\`;\s*\} else if \(cred\.acessado_em\) \{\s*const acessStr = formatUTCDate\(cred\.acessado_em\)\.replace\(',', ' às'\);\s*statusBadge = \`<span style="color:#16a34a; font-weight:600;"><i class="ph ph-check-circle"><\/i> Acessado<\/span>\`;\s*\} else \{\s*statusBadge = \`<span style="color:#4f46e5; font-weight:600;"><i class="ph ph-paper-plane-right"><\/i> Enviado<\/span>\`;\s*\}/g;

const replacementBadge = `let statusBadge = '';
        if (cred.status === 'solicitado') {
            const dtLim = cred.data_limite_envio ? new Date(cred.data_limite_envio).toLocaleDateString('pt-BR') : '-';
            statusBadge = \`<span style="color:#eab308; font-weight:600;"><i class="ph ph-clock"></i> Solicitado (Limite: \${dtLim})</span>\`;
        } else if (expirado) {
            statusBadge = \`<span style="color:#dc2626; font-weight:600;"><i class="ph ph-x-circle"></i> Expirado</span>\`;
        } else if (cred.acessado_em) {
            const acessStr = window.formatUTCDate ? window.formatUTCDate(cred.acessado_em).replace(',', ' às') : cred.acessado_em;
            statusBadge = \`<span style="color:#16a34a; font-weight:600;"><i class="ph ph-check-circle"></i> Acessado</span>\`;
        } else {
            statusBadge = \`<span style="color:#4f46e5; font-weight:600;"><i class="ph ph-paper-plane-right"></i> Enviado</span>\`;
        }`;

content = content.replace(regexBadge, replacementBadge);
fs.writeFileSync(path, content, 'utf8');
console.log("Fixed status badge logic in credenciamento.js");