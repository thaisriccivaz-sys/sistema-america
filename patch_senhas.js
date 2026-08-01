const fs = require('fs');
const path = require('path');

function patchSenhas(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');

    if (content.includes('mostrarToastSucesso(\'Usuário copiado!\')')) {
        console.log('Already patched:', filePath);
        return;
    }

    if (filePath.includes('logistica_senhas.js')) {
        const target = `        const usuarioExibicao = s.usuario ? (s.usuario.length > 20 ? s.usuario.substring(0, 20) + '.' : s.usuario) : '-';
        const usuarioHtml = s.usuario && s.usuario.length > 20 ? \`<span title="\${s.usuario.replace(/"/g, '&quot;')}">\${usuarioExibicao}</span>\` : usuarioExibicao;`;
        
        const replacement = `        const escUser = (s.usuario || '').replace(/'/g, "\\\\'").replace(/"/g, '&quot;');
        const copyBtn = s.usuario ? \`<button type="button" onclick="navigator.clipboard.writeText('\${escUser}'); mostrarToastSucesso('Usuário copiado!'); event.stopPropagation();" style="background:none; border:none; cursor:pointer; color:#64748b; padding:0; display:flex; align-items:center;" title="Copiar Usuário"><i class="ph ph-copy"></i></button>\` : '';
        const usuarioHtml = \`<div style="display:flex; align-items:center; gap:6px; justify-content:space-between;">
            <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="\${escUser}">\${s.usuario || '-'}</span>
            \${copyBtn}
        </div>\`;`;
        
        content = content.replace(target, replacement);
    } else if (filePath.includes('administrativo_senhas.js')) {
        const target1 = `        let linkHtml = s.link ? \`<a href="\${s.link}"`;
        const replacement1 = `        const escUser = (s.usuario || '').replace(/'/g, "\\\\'").replace(/"/g, '&quot;');
        const copyBtn = s.usuario ? \`<button type="button" onclick="navigator.clipboard.writeText('\${escUser}'); mostrarToastSucesso('Usuário copiado!'); event.stopPropagation();" style="background:none; border:none; cursor:pointer; color:#64748b; padding:0; display:flex; align-items:center;" title="Copiar Usuário"><i class="ph ph-copy"></i></button>\` : '';
        const usuarioHtml = \`<div style="display:flex; align-items:center; gap:6px; justify-content:space-between;">
            <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="\${escUser}">\${s.usuario || '-'}</span>
            \${copyBtn}
        </div>\`;
        
        let linkHtml = s.link ? \`<a href="\${s.link}"`;
        
        content = content.replace(target1, replacement1);
        
        const target2 = `<td style="font-family:monospace; font-size:0.95rem;">\${s.usuario}</td>`;
        const replacement2 = `<td style="font-family:monospace; font-size:0.95rem;">\${usuarioHtml}</td>`;
        content = content.replace(target2, replacement2);
    }

    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Patched:', filePath);
}

const dir = path.join(__dirname, 'frontend');
patchSenhas(path.join(dir, 'logistica_senhas.js'));
patchSenhas(path.join(dir, 'administrativo_senhas.js'));

// Bump cache for index.html
const indexHtmlPath = path.join(dir, 'index.html');
let indexContent = fs.readFileSync(indexHtmlPath, 'utf8');
indexContent = indexContent.replace(/logistica_senhas\.js\?v=([0-9a-z]+)/, 'logistica_senhas.js?v=20260731v10');
indexContent = indexContent.replace(/administrativo_senhas\.js\?v=([0-9a-z]+)/, 'administrativo_senhas.js?v=20260731v10');
fs.writeFileSync(indexHtmlPath, indexContent, 'utf8');
console.log('Bumped cache for senhas scripts');
