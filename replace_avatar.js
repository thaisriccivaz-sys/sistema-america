const fs = require('fs');
const file = 'c:/A/OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA/Documentos - America Rental/Diretoria/Teste Sistema/cadastro-colaboradores/frontend/treinamento_presenca.js';
let code = fs.readFileSync(file, 'utf8');

const anchor = "const iniciais = (c.nome_completo || '?').split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();";
const anchor2 = "const corBar = pct === 100 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444';";

if (code.includes(anchor) && code.includes(anchor2)) {
    let parts = code.split(anchor);
    if (parts.length > 1) {
        let after = parts[1];
        let parts2 = after.split(anchor2);
        
        const avatarHtml = `
        let avatarHtml = \`<div style="width:44px;height:44px;border-radius:50%;background:rgba(255,255,255,0.25);display:flex;align-items:center;justify-content:center;font-size:1rem;font-weight:700;color:#fff;flex-shrink:0;">\${iniciais}</div>\`;
        if (c.foto_base64) {
            avatarHtml = \`<img src="\${c.foto_base64}" style="width:44px;height:44px;border-radius:50%;object-fit:cover;border:2px solid rgba(255,255,255,0.4);flex-shrink:0;background:#fff;" onerror="this.onerror=null;this.outerHTML='<div style=\\'width:44px;height:44px;border-radius:50%;background:rgba(255,255,255,0.25);display:flex;align-items:center;justify-content:center;font-size:1rem;font-weight:700;color:#fff;flex-shrink:0;\\'>\${iniciais}</div>'">\`;
        } else if (c.foto_path) {
            avatarHtml = \`<img src="\${(window.API_URL || '')}/colaboradores/foto/\${c.id}" style="width:44px;height:44px;border-radius:50%;object-fit:cover;border:2px solid rgba(255,255,255,0.4);flex-shrink:0;background:#fff;" onerror="this.onerror=null;this.outerHTML='<div style=\\'width:44px;height:44px;border-radius:50%;background:rgba(255,255,255,0.25);display:flex;align-items:center;justify-content:center;font-size:1rem;font-weight:700;color:#fff;flex-shrink:0;\\'>\${iniciais}</div>'">\`;
        }
`;
        
        let newCode = parts[0] + anchor + avatarHtml + anchor2 + parts2[1];
        
        // Also replace the usage
        const oldUsage = `<div style="width:44px;height:44px;border-radius:50%;background:rgba(255,255,255,0.25);display:flex;align-items:center;justify-content:center;font-size:1rem;font-weight:700;color:#fff;flex-shrink:0;">\${iniciais}</div>`;
        const newUsage = `\${avatarHtml}`;
        
        newCode = newCode.replace(oldUsage, newUsage);
        
        fs.writeFileSync(file, newCode, 'utf8');
        console.log('Successfully updated!');
    } else {
        console.log('Anchor 1 not found in array');
    }
} else {
    console.log('Anchors not found in file!');
}
