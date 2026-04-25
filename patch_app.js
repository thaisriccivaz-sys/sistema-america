const fs = require('fs');
let js = fs.readFileSync('frontend/app.js', 'utf8');

const regexTableRows = /row\.innerHTML = \`[\s\S]*?<td>\s*<div style="font-weight: 500; color: #1e293b;">\$\{doc\.colaborador_nome \|\| '--'\}<\/div>[\s\S]*?<\/td>\`;/;

const tableRowsReplacer = (match) => {
    // We want to add the "Outro Meio" button to the actions. The actions currently have "Ver PDF" and "Reenviar".
    const outroMeioBtn = `
        <button onclick="window.setStatusOutroMeio(\${doc.id}, '\${doc.source}')" class="btn btn-sm action-btn ml-1" style="background:#0ea5e9;color:#fff;border:none;padding:0.4rem 0.6rem;border-radius:6px;cursor:pointer;font-size:0.75rem;" title="Assinado fisicamente ou via outro link">
            <i class="ph ph-check-square-offset"></i> Outro Meio
        </button>`;
        
    return match.replace(/<button class="btn btn-sm action-btn" onclick="window\.reenviarAssinatura[^>]+>[^<]+<\/button>/, `$& ${outroMeioBtn}`)
                .replace(/<button class="btn btn-sm action-btn" onclick="window\.openSignedDocPopupAssinafy[^>]+>[^<]+<\/button>/, `$& ${outroMeioBtn}`);
};

// JS has a manual render mechanism
let replacedJs = js;

// Add function to window
const newFunc = `
window.setStatusOutroMeio = async function(id, source) {
    if (!confirm('Tem certeza que deseja marcar este documento como assinado por "Outro Meio"? Ele saíra da fila de pendentes.')) return;
    try {
        const res = await apiPost('/admissao-assinaturas/outro-meio', { id, source });
        alert(res.message || 'Status atualizado com sucesso!');
        await loadAssinaturasDigitaisList(); // Reload se existir
        if (window.filtrarAssinaturas) {
            const container = document.getElementById('assinaturas-digitais-container');
            if (container) {
                container.innerHTML = '<div style="text-align:center;padding:3rem;"><i class="ph ph-circle-notch ph-spin" style="font-size:2.5rem;color:#f503c5;"></i></div>';
                const dados = await apiGet('/admissao-assinaturas/todos');
                window._assinaturasData = dados || [];
                window.filtrarAssinaturas();
            }
        }
    } catch(e) { alert('Erro: ' + e.message); }
};
window.filtrarAssinaturas =`;
replacedJs = replacedJs.replace('window.filtrarAssinaturas =', newFunc);

// Update badge color
const badgeFix = `
            let statusColor = '#f59e0b';
            let statusBg = '#fef3c7';
            let statusIcon = 'ph-clock';
            const s = (doc.assinafy_status || '').toLowerCase();
            if (s.includes('assinad') || s.includes('conclu') || s.includes('finaliz')) {
                statusColor = '#10b981'; statusBg = '#d1fae5'; statusIcon = 'ph-check-circle';
            } else if (s.includes('erro') || s.includes('falha')) {
                statusColor = '#ef4444'; statusBg = '#fee2e2'; statusIcon = 'ph-warning-circle';
            } else if (s.includes('outro meio')) {
                statusColor = '#0ea5e9'; statusBg = '#e0f2fe'; statusIcon = 'ph-check-square-offset';
            }
`;
replacedJs = replacedJs.replace(/const s = \(doc\.assinafy_status \|\| ''\)\.toLowerCase\(\);[\s\S]*?if \(s\.includes\('assinad'\)[\s\S]*?statusIcon = 'ph-warning-circle';\s*\}/, badgeFix);

// Insert the Outro Meio button in the `window.filtrarAssinaturas` generated table row.
const btnRegex = /<button class="btn btn-sm action-btn[^<]+<i class="ph ph-file-pdf"><\/i> Ver PDF\n\s*<\/button>/;
const btnReplace = `$&
                    <button onclick="window.setStatusOutroMeio(\${doc.id}, '\${doc.source}')" class="btn btn-sm action-btn" style="background:#e0f2fe;color:#0369a1;border:1px solid #bae6fd;padding:0.4rem 0.6rem;border-radius:6px;cursor:pointer;font-size:0.75rem;"><i class="ph ph-check-square-offset"></i> Outro Meio</button>`;
replacedJs = replacedJs.replace(btnRegex, btnReplace);

fs.writeFileSync('frontend/app.js', replacedJs, 'utf8');
