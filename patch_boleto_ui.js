const fs = require('fs');
let content = fs.readFileSync('frontend/app.js', 'utf8');

const target1 = `                    \${(tabId === 'Faculdade' && isSaved && docType === 'Boleto') ? \`
                    <div style="display:flex; flex-direction:column; gap:0.35rem; margin-top:0.35rem; align-items:flex-end; width:100%; border-top: 1px dashed #e2e8f0; padding-top: 0.5rem;">
                        <div style="display:flex; gap:0.5rem; align-items:center; justify-content:flex-end; width:100%;">`;

const replacement1 = `                    \${(tabId === 'Faculdade' && isSaved && docType === 'Boleto') ? \`
                    <div style="display:flex; flex-direction:column; gap:0.35rem; margin-top:0.35rem; align-items:flex-end; width:100%; border-top: 1px dashed #e2e8f0; padding-top: 0.5rem;">
                        \${existingDoc.boleto_financeiro_enviado_em ? \`
                        <div style="font-size:0.82rem; color:#16a34a; font-weight:600; width:100%; margin-bottom: 0.3rem; text-align: left;">
                            <i class="ph ph-check-circle"></i> Enviado em: \${new Date(existingDoc.boleto_financeiro_enviado_em).toLocaleDateString('pt-BR')} às \${new Date(existingDoc.boleto_financeiro_enviado_em).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}
                        </div>\` : ''}
                        <div style="display:flex; gap:0.5rem; align-items:center; justify-content:flex-end; width:100%;">`;

const target2 = `                    \${(tabId === 'Faculdade' && isSaved && docType === 'Boleto') ? \`
                    <div style="display:flex; flex-direction:column; gap:0.35rem; margin-top:0.35rem; align-items:flex-end; width:100%; border-top: 1px dashed #e2e8f0; padding-top: 0.5rem;">
                        <div style="display:flex; gap:0.5rem; align-items:center; justify-content:flex-end; width:100%;">`; // In case there are multiple, replace globally

content = content.split(target1).join(replacement1);
fs.writeFileSync('frontend/app.js', content, 'utf8');
console.log('App patched!');
