const fs = require('fs');

const renderBlock = `
window.renderAvatar = function(nome, foto, b64) {
    const initial = (nome || 'U')[0].toUpperCase();
    if (b64) return \`<img src="\${b64}" style="width:36px; height:36px; border-radius:50%; object-fit:cover;">\`;
    if (foto) return \`<img src="/\${foto}" style="width:36px; height:36px; border-radius:50%; object-fit:cover;" onerror="this.outerHTML='<div style=\\'width:36px; height:36px; border-radius:50%; background:#e2e8f0; display:flex; align-items:center; justify-content:center; font-weight:bold; color:#64748b; font-size:16px;\\'>\${initial}</div>'">\`;
    return \`<div style="width:36px; height:36px; border-radius:50%; background:#e2e8f0; display:flex; align-items:center; justify-content:center; font-weight:bold; color:#64748b; font-size:16px;">\${initial}</div>\`;
};
`;

function addRenderAvatar(path) {
    let content = fs.readFileSync(path, 'utf8');
    if (!content.includes('window.renderAvatar = function')) {
        content = renderBlock + '\n' + content;
    }
    
    // Also, we need to make sure solNome, envNome, solDataStr, envDataStr are defined!
    // Since my previous replace failed to define them, the variables are also undefined!
    
    const missingVars = `
        const solNome = cred.sol_nome_usuario || cred.sol_username || cred.solicitado_por_nome || 'Usuário Comercial';
        const envNome = cred.env_nome_usuario || cred.env_username || cred.enviado_por_nome || 'Usuário Logística';
        const solDataStr = cred.created_at ? new Date(cred.created_at).toLocaleString('pt-BR') : 'Data não registrada';
        const envDataStr = cred.enviado_em ? new Date(cred.enviado_em).toLocaleString('pt-BR') : 'Data não registrada';
    `;
    
    // In comercial_credenciamento.js and credenciamento.js, the htmlBlock is inside the map()
    // Let's replace `${renderAvatar(` with the actual evaluation of the missing variables if they are not defined yet!
    // Wait, let's just insert the variable definitions right before the <tr id="cred-det...
    
    // Actually, let's replace the whole HTML block to define variables inline, or just define them before the return `<tr>...`!
    const targetString = "return `\n        <tr>";
    if (content.includes(targetString) && !content.includes('const solNome =')) {
        content = content.replace(targetString, missingVars + "\n" + targetString);
    }
    
    // Fix: renderAvatar is global, so it should be window.renderAvatar
    content = content.replace(/\$\{renderAvatar\(/g, '${window.renderAvatar(');
    
    fs.writeFileSync(path, content, 'utf8');
}

addRenderAvatar('frontend/comercial_credenciamento.js');
addRenderAvatar('frontend/credenciamento.js');
console.log("Fixed ReferenceError!");