const fs = require('fs');

let content = fs.readFileSync('backend/server.js', 'utf8');

// Use regex to replace the duplicate db.all loop 
const regexStr = /        db\.all\(\s*`SELECT DISTINCT ee\.tipo_notificacao FROM estoque_saldo_por_endereco s\s*JOIN estoque_enderecos ee ON s\.endereco_id = ee\.id\s*WHERE s\.estoque_id \= \? AND s\.quantidade > 0 AND ee\.tipo_notificacao \!\= '' AND ee\.tipo_notificacao IS NOT NULL`,\s*\[id\], \(errT, tiposRows\) => \{\s*const tiposSet = new Set\(\(tiposRows \|\| \[\]\)\.map\(r => r\.tipo_notificacao\)\);\s*const tiposNotif = tiposSet\.size > 0 \? Array\.from\(tiposSet\) : \['compra'\]; \/\/ fallback: compra\s*tiposNotif\.forEach\(tipoNotif => \{\s*const dbTipo = tipoNotif === 'reposicao' \? 'estoque_reposicao' : 'estoque_minimo';\s*db\.all\(`SELECT usuario_id FROM config_notificacoes WHERE tipo \= '\$\{dbTipo\}'`\, \[\], \(errCR, rowsCR\) => \{\s*if \(\!errCR && rowsCR && rowsCR\.length > 0\) \{\s*rowsCR\.forEach\(c => \{\s*db\.run\("INSERT INTO notificacoes_usuarios \(usuario_id, tipo, mensagem, dados\) VALUES \(\?, \?, \?, \?\)", \[c\.usuario_id, dbTipo, msg, dadosStr\]\);\s*\}\);\s*\}\s*\}\);\s*\}\);\s*\}\s*\);\s*db\.all\("SELECT usuario_id FROM config_notificacoes WHERE tipo \= 'estoque_minimo'", \[\], \(errC, rowsC\) => \{\s*if \(\!errC && rowsC && rowsC\.length > 0\) \{\s*rowsC\.forEach\(c => \{\s*db\.run\("INSERT INTO notificacoes_usuarios \(usuario_id, tipo, mensagem, dados\) VALUES \(\?, \?, \?, \?\)", \[c\.usuario_id, 'estoque_minimo', msg, dadosStr\]\);\s*\}\);\s*const qIds = rowsC\.map\(r => r\.usuario_id\)\.join\(','\);/;

const replacementStr = `        db.all(
            \`SELECT DISTINCT ee.tipo_notificacao FROM estoque_saldo_por_endereco s
             JOIN estoque_enderecos ee ON s.endereco_id = ee.id
             WHERE s.estoque_id = ? AND s.quantidade > 0 AND ee.tipo_notificacao != '' AND ee.tipo_notificacao IS NOT NULL\`,
            [item.id], (errT, tiposRows) => {
                const tiposSet = new Set((tiposRows || []).map(r => r.tipo_notificacao));
                const tiposNotif = tiposSet.size > 0 ? Array.from(tiposSet) : ['compra']; // fallback: compra
                tiposNotif.forEach(tipoNotif => {
                    const dbTipo = tipoNotif === 'reposicao' ? 'estoque_reposicao' : 'estoque_minimo';
                    const subjectPrefix = tipoNotif === 'reposicao' ? 'Mínimo para Reposição Atingido' : 'Estoque Mínimo Atingido';
                    db.all(\`SELECT usuario_id FROM config_notificacoes WHERE tipo = ?\`, [dbTipo], (errCR, rowsCR) => {
                        if (!errCR && rowsCR && rowsCR.length > 0) {
                            rowsCR.forEach(c => {
                                db.run("INSERT INTO notificacoes_usuarios (usuario_id, tipo, mensagem, dados) VALUES (?, ?, ?, ?)", [c.usuario_id, dbTipo, msg, dadosStr]);
                            });
                            const qIds = rowsCR.map(r => r.usuario_id).join(',');`;

if (regexStr.test(content)) {
    content = content.replace(regexStr, replacementStr);

    const oldEmailSubject = "subject: 'ALERTA DE ESTOQUE MÍNIMO - America Rental',";
    const newEmailSubject = "subject: `ALERTA DE ESTOQUE - ${subjectPrefix}`,";
    content = content.replace(oldEmailSubject, newEmailSubject);
    
    const oldEmailTitle = '<h2 style="color: #dc2626; text-align: center;">Aviso de Estoque Mínimo</h2>';
    const newEmailTitle = '<h2 style="color: #dc2626; text-align: center;">${subjectPrefix}</h2>';
    content = content.replace(oldEmailTitle, newEmailTitle);

    fs.writeFileSync('backend/server.js', content, 'utf8');
    console.log('Replaced successfully');
} else {
    console.log('Search string not found! The fix could not be applied.');
}
