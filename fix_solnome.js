const fs = require('fs');

const missingVars = `
        const solNome = cred.sol_nome_usuario || cred.sol_username || cred.solicitado_por_nome || 'Usuário Comercial';
        const envNome = cred.env_nome_usuario || cred.env_username || cred.enviado_por_nome || 'Usuário Logística';
        const solDataStr = cred.created_at ? new Date(cred.created_at).toLocaleString('pt-BR') : 'Data não registrada';
        const envDataStr = cred.enviado_em ? new Date(cred.enviado_em).toLocaleString('pt-BR') : 'Data não registrada';
`;

function injectVars(path) {
    let content = fs.readFileSync(path, 'utf8');
    if (!content.includes('const solNome =')) {
        const lines = content.split('\n');
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes('return `') && lines[i+1] && lines[i+1].includes('<tr>')) {
                lines.splice(i, 0, missingVars);
                break;
            }
        }
        fs.writeFileSync(path, lines.join('\n'), 'utf8');
        console.log("Fixed " + path);
    } else {
        console.log(path + " already has solNome");
    }
}

injectVars('frontend/comercial_credenciamento.js');
injectVars('frontend/credenciamento.js');