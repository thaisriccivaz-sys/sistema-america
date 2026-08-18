const fs = require('fs');
let code = fs.readFileSync('backend/server.js', 'utf8');

const regexAcomp = /\/\/ Notificar APENAS usu.rios configurados para sac_sla_vencido.*?res\.json\(\{ success: true \}\);\s*\}\);/s;
const newAcomp = `
    // Evita duplicidade por race condition do frontend verificando últimos 5 minutos
    db.get(\`SELECT id FROM notificacoes_usuarios WHERE tipo = 'sac_acompanhamento_vencido' AND dados LIKE ? AND criado_em > datetime('now', '-5 minute') LIMIT 1\`, [\`%"ticketId":"\${ticketId}"%\`], (errCheck, rowCheck) => {
        if (rowCheck) {
            console.log('[SAC notif] Duplicidade de acompanhamento evitada para ticket ' + ticketId);
            return res.json({ success: true, msg: 'Já notificado recentemente.' });
        }

        // Notificar APENAS usuários configurados para sac_sla_vencido (não todos os envolvidos)
        sendEmailParaNotificados('sac_sla_vencido', { subject, html, attachments: [{ filename: 'logo-header.png', path: logoPath, cid: 'empresa-logo' }] });

        // Popup interno para configurados em sac_sla_vencido
        db.all(\`SELECT DISTINCT usuario_id FROM config_notificacoes WHERE tipo = 'sac_sla_vencido'\`, [], (err, rows) => {
            if (err || !rows || rows.length === 0) return;
            const msg = \`🚨 Prazo de acompanhamento do chamado <strong>Nº \${protocol}</strong> - \${clientName} venceu. <a href="\${systemUrl}" style="color:#f97316;font-weight:700;">Acessar SAC</a>\`;
            rows.forEach(r => {
                db.run(\`INSERT INTO notificacoes_usuarios (usuario_id, tipo, mensagem, dados) VALUES (?, ?, ?, ?)\`,
                    [r.usuario_id, 'sac_acompanhamento_vencido', msg, JSON.stringify({ ticketId, protocol, clientName })]);
            });
        });

        res.json({ success: true });
    });
});
`;

if (code.match(regexAcomp)) {
    code = code.replace(regexAcomp, newAcomp.trim());
    fs.writeFileSync('backend/server.js', code);
    console.log('Replaced successfully');
} else {
    console.log('Regex did not match');
}
