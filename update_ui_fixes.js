const fs = require('fs');

function processFile(path) {
    let content = fs.readFileSync(path, 'utf8');

    // 1. Remove my ugly "Status Detalhado" block
    const uglyBlockRegex = /<div style="flex:1; min-width:250px;">\s*<div style="color:#64748b; font-weight:600; margin-bottom:4px;">⏱️ Status Detalhado:<\/div>\s*<div style="color:#334155; font-size:0.8rem; line-height:1.6;">[\s\S]*?<\/div>\s*<\/div>/g;
    content = content.replace(uglyBlockRegex, '');

    // 2. Color "Solicitação:" yellow and "Envio do Credenciamento:" blue in the Avatar block
    content = content.replace(/<div style="color:#64748b; font-weight:600; margin-bottom:8px;">Solicitação:<\/div>/g, 
                              '<div style="color:#eab308; font-weight:600; margin-bottom:8px;">Solicitação:</div>');
                              
    content = content.replace(/<div style="color:#64748b; font-weight:600; margin-bottom:8px;">Envio do Credenciamento:<\/div>/g, 
                              '<div style="color:#3b82f6; font-weight:600; margin-bottom:8px;">Envio do Credenciamento:</div>');

    // 3. Fix Link in _renderizarTabelaHistorico (search modal) if it exists
    const regexLink2 = /<a href="\/credenciamento-publico\.html\?token=\$\{cred\.token\}" target="_blank" class="btn btn-outline" style="padding:4px 8px; font-size:12px; margin-right:4px;" title="Testar \/ Visualizar Link">\s*<i class="ph ph-link"><\/i> Link\s*<\/a>/g;
    content = content.replace(regexLink2, `\${cred.token ? \`<button class="btn btn-outline btn-sm" style="padding:4px 8px; font-size:12px; margin-right:4px;" onclick="window.reenviarEmailCredenciamento('\${cred.id}')"><i class="ph ph-envelope-simple"></i> Reenviar</button>\` : ''}`);

    fs.writeFileSync(path, content, 'utf8');
}

processFile('frontend/comercial_credenciamento.js');
processFile('frontend/credenciamento.js');
console.log("Fixed colors and removed second Link button");