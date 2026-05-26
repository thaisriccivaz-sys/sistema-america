const fs = require('fs');
const path = 'backend/server.js';
let content = fs.readFileSync(path, 'utf8');

const regexAcessado = /if \(\!cred\.acessado_em\) \{\s*db\.run\('UPDATE credenciamentos SET acessado_em = \? WHERE id = \?', \[new Date\(\)\.toISOString\(\), cred\.id\], \(\) => \{ \}\);\s*\}/g;

const replacementAcessado = `if (!cred.acessado_em) {
            db.run('UPDATE credenciamentos SET acessado_em = ? WHERE id = ?', [new Date().toISOString(), cred.id], () => {
                if (cred.solicitado_por_id) {
                    db.run("INSERT INTO comercial_notificacoes (usuario_id, mensagem, tipo) VALUES (?, ?, 'credenciamento_acessado')", [cred.solicitado_por_id, \`O cliente \${cred.cliente_nome} acessou o link do credenciamento da OS \${cred.os || '-'}.\`]);
                }
            });
        }`;

content = content.replace(regexAcessado, replacementAcessado);
fs.writeFileSync(path, content, 'utf8');
console.log("Added notification insert when client accesses link in server.js");