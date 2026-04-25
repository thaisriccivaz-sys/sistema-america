const fs = require('fs');
let content = fs.readFileSync('c:/A/OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA/Documentos - America Rental/Diretoria/Teste Sistema/cadastro-colaboradores/backend/server.js', 'utf8');

// 1. In /api/experiencia/cron/forcar
content = content.replace(
    "if (diasRestantes <= 0 || diasRestantes > 15) { pulados++; continue; }",
    "if (diasRestantes < 0 || diasRestantes > 15) { pulados++; continue; }\n            if (r.situacao === 'finalizado') { pulados++; continue; }"
);

// 2. In CRON job query
content = content.replace(
    "ef.id as form_id, ef.notificacao_15d_enviada",
    "ef.id as form_id, ef.notificacao_15d_enviada, ef.situacao"
);

// 3. In CRON job loop
content = content.replace(
    "if (r.notificacao_15d_enviada) continue;",
    "if (r.notificacao_15d_enviada) continue;\n            if (r.situacao === 'finalizado') continue;"
);

// 4. Also fix the /api/experiencia/enviar-email/:id to block if finalizado
content = content.replace(
    "if (!emailDestino) return res.status(400).json({ error: 'Responsável do departamento não possui e-mail cadastrado.' });",
    "if (!emailDestino) return res.status(400).json({ error: 'Responsável do departamento não possui e-mail cadastrado.' });\n        if (r.situacao === 'finalizado') return res.status(400).json({ error: 'O formulário já foi respondido e finalizado.' });\n        if (diasRestantes !== '-' && diasRestantes < 0) return res.status(400).json({ error: 'O prazo de experiência deste colaborador já expirou.' });"
);

fs.writeFileSync('c:/A/OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA/Documentos - America Rental/Diretoria/Teste Sistema/cadastro-colaboradores/backend/server.js', content);
console.log('Fixed forcar and cron');
