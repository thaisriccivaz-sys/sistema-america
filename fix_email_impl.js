const fs = require('fs');
let c = fs.readFileSync('backend/routes_candidatos_teste.js', 'utf8');

const oldFunc = `    function notificarTestesCandidatos(mensagem) {
        const tipoNotif = 'testes_candidatos';
        db.all('SELECT usuario_id FROM config_notificacoes WHERE tipo = ?', [tipoNotif], (err, rows) => {
            if (!err && rows && rows.length > 0) {
                rows.forEach(r => {
                    db.run("INSERT INTO notificacoes_usuarios (usuario_id, tipo, mensagem, dados) VALUES (?, ?, ?, ?)",
                        [r.usuario_id, tipoNotif, mensagem, '{}']);
                });
            }
        });
    }`;

const newFunc = `    function notificarTestesCandidatos(mensagem) {
        const tipoNotif = 'testes_candidatos';
        db.all('SELECT usuario_id FROM config_notificacoes WHERE tipo = ?', [tipoNotif], (err, rows) => {
            if (!err && rows && rows.length > 0) {
                rows.forEach(r => {
                    db.run("INSERT INTO notificacoes_usuarios (usuario_id, tipo, mensagem, dados) VALUES (?, ?, ?, ?)",
                        [r.usuario_id, tipoNotif, mensagem, '{}']);
                });
            }
        });
        if (typeof sendEmailParaNotificados === 'function') {
            sendEmailParaNotificados(tipoNotif, {
                subject: \`[Testes de Candidatos] \${mensagem}\`,
                html: \`<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#333;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;">
                          <div style="background:#fff;padding:0;"><img src="cid:empresa-logo" alt="America Rental" style="width:100%;display:block;max-height:120px;object-fit:cover;"></div>
                          <div style="padding:1.5rem 2rem;"><h2 style="color:#7c3aed;margin-top:0;text-align:center;">Atualizacao - Teste de Candidato</h2><p style="font-size:15px;line-height:1.6;margin:0;">\${mensagem}</p></div>
                          <hr style="border:none;border-top:1px solid #eee;margin:0;">
                          <div style="padding:1rem 2rem;background:#f8fafc;"><p style="color:#999;font-size:11px;text-align:center;margin:0;">Este e um e-mail automatico, por favor nao responda.</p></div>
                       </div>\`,
                attachments: [{ filename: 'logo-header.png', path: require('path').join(__dirname, '..', 'frontend', 'assets', 'logo-header.png'), cid: 'empresa-logo' }]
            });
        }
    }`;

c = c.replace(oldFunc, newFunc);
fs.writeFileSync('backend/routes_candidatos_teste.js', c, 'utf8');
console.log('Fixed email sending');
