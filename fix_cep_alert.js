const fs = require('fs');

const injectionLogic = `
        let alertaCepHtml = '';
        if (cred.endereco_instalacao) {
            const cepMatch = cred.endereco_instalacao.match(/\\b\\d{5}-?\\d{3}\\b/);
            if (cepMatch) {
                const cep = cepMatch[0].replace('-', '');
                const outroCred = dados.find(c => {
                    if (c.id === cred.id) return false;
                    if (!c.endereco_instalacao) return false;
                    const match = c.endereco_instalacao.match(/\\b\\d{5}-?\\d{3}\\b/);
                    return match && match[0].replace('-', '') === cep;
                });
                if (outroCred) {
                    alertaCepHtml = \`
                    <div style="background:#fffbeb; border:1px solid #fde68a; color:#b45309; padding:10px 15px; border-radius:8px; margin-bottom:15px; display:flex; align-items:flex-start; gap:10px;">
                        <i class="ph-fill ph-warning" style="color:#d97706; font-size:1.4rem; margin-top:2px;"></i>
                        <div>
                            <strong style="display:block; margin-bottom:4px;">Atenção: CEP em comum</strong>
                            A OS <b>\${outroCred.os || '-'}</b> (Cliente: <b>\${outroCred.cliente_nome}</b>) possui o mesmo número de CEP cadastrado: <b>\${cepMatch[0]}</b>.
                            <div style="font-size:0.8rem; margin-top:4px; opacity:0.8;">Endereço vinculado: \${outroCred.endereco_instalacao}</div>
                        </div>
                    </div>\`;
                }
            }
        }
`;

function fixFile(path) {
    let content = fs.readFileSync(path, 'utf8');
    
    // Inject the logic
    const hookLine = "const envDataStr = cred.enviado_em ? new Date(cred.enviado_em).toLocaleString('pt-BR') : 'Data não registrada';";
    
    if (content.includes(hookLine)) {
        content = content.replace(hookLine, hookLine + '\n' + injectionLogic);
    } else {
        console.log("Hook line not found in " + path);
        // Let's try the unaccented version if the first fails
        const hookLineAlt = "const envDataStr = cred.enviado_em ? new Date(cred.enviado_em).toLocaleString('pt-BR') : 'Data no registrada';";
        content = content.replace(hookLineAlt, hookLine + '\n' + injectionLogic);
    }

    // Inject the HTML variable
    const htmlHook = '<div style="display:flex; flex-wrap:wrap; gap:30px;">';
    content = content.replace(htmlHook, '${alertaCepHtml}\n                ' + htmlHook);

    fs.writeFileSync(path, content, 'utf8');
    console.log("Fixed " + path);
}

fixFile('frontend/comercial_credenciamento.js');
fixFile('frontend/credenciamento.js');