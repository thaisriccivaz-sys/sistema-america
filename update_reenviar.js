const fs = require('fs');

let path = 'backend/server.js';
let content = fs.readFileSync(path, 'utf8');

const regex = /sendMailHelper\(mailOptions\)\.then\(\(\) => \{\s*res\.json\(\{ message: 'E-mail reenviado com sucesso\.' \}\);\s*\}\)\.catch\(e => res\.status\(500\)\.json\(\{ error: e\.message \}\)\);/g;

const newContent = `db.run('UPDATE credenciamentos SET enviado_em = CURRENT_TIMESTAMP, enviado_por_id = ? WHERE id = ?', [req.user.id, req.params.id], function(errUpdate) {
            if (errUpdate) console.error("Erro ao atualizar dados de reenvio:", errUpdate);
            
            sendMailHelper(mailOptions).then(() => {
                res.json({ message: 'E-mail reenviado com sucesso e dados de envio atualizados.' });
            }).catch(e => res.status(500).json({ error: e.message }));
        });`;

content = content.replace(regex, newContent);
fs.writeFileSync(path, content, 'utf8');
console.log("Updated reenviar endpoint to update DB fields");