const fs = require('fs');

// 1. Fix server.js SELECT queries
let server = fs.readFileSync('c:/A/OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA/Documentos - America Rental/Diretoria/Teste Sistema/cadastro-colaboradores/backend/server.js', 'utf8');

// For /api/experiencia/enviar-email/:id
server = server.replace(
    /SELECT c\.id, c\.nome_completo, c\.cargo, c\.departamento, c\.data_admissao, c\.email_corporativo,\s*d\.responsavel_id,\s*\(SELECT email_corporativo FROM colaboradores WHERE id = d\.responsavel_id\) as resp_email,\s*\(SELECT nome_completo FROM colaboradores WHERE id = d\.responsavel_id\) as resp_nome,\s*ef\.id as form_id\s*FROM/g,
    `SELECT c.id, c.nome_completo, c.cargo, c.departamento, c.data_admissao, c.email_corporativo,
                   d.responsavel_id,
                   (SELECT email_corporativo FROM colaboradores WHERE id = d.responsavel_id) as resp_email,
                   (SELECT nome_completo FROM colaboradores WHERE id = d.responsavel_id) as resp_nome,
                   ef.id as form_id, ef.situacao
            FROM`
);

// For /api/experiencia/cron/forcar
server = server.replace(
    /SELECT c\.id, c\.nome_completo, c\.cargo, c\.departamento, c\.data_admissao,\s*d\.responsavel_id,\s*\(SELECT email_corporativo FROM colaboradores WHERE id = d\.responsavel_id\) as resp_email,\s*\(SELECT nome_completo FROM colaboradores WHERE id = d\.responsavel_id\) as resp_nome,\s*ef\.id as form_id\s*FROM/g,
    `SELECT c.id, c.nome_completo, c.cargo, c.departamento, c.data_admissao,
                   d.responsavel_id,
                   (SELECT email_corporativo FROM colaboradores WHERE id = d.responsavel_id) as resp_email,
                   (SELECT nome_completo FROM colaboradores WHERE id = d.responsavel_id) as resp_nome,
                   ef.id as form_id, ef.situacao
            FROM`
);

fs.writeFileSync('c:/A/OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA/Documentos - America Rental/Diretoria/Teste Sistema/cadastro-colaboradores/backend/server.js', server);

// 2. Fix frontend/experiencia.js
let exp = fs.readFileSync('c:/A/OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA/Documentos - America Rental/Diretoria/Teste Sistema/cadastro-colaboradores/frontend/experiencia.js', 'utf8');

// Fix isRH role
exp = exp.replace(
    "const isRH = ['admin', 'rh'].includes((currentUser.role || '').toLowerCase());",
    "const isRH = ['admin', 'rh', 'diretoria'].includes((currentUser.role || '').toLowerCase());"
);

// Fix hide button
exp = exp.replace(
    /\$\{c\.situacao !== 'finalizado' \? `<button onclick="reenviarEmailExperiencia/g,
    "${(!form || form.situacao !== 'finalizado') ? `<button onclick=\"reenviarEmailExperiencia"
);

// Fix date display logic in renderExperienciaList
// When form is finalizado, ensure we format the date correctly even if c.atualizado_em isn't set (use c.data_envio_email as fallback if needed)
exp = exp.replace(
    "const dataEnvioFormatada = c.atualizado_em ? new Date(c.atualizado_em + 'Z').toLocaleString('pt-BR', {day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}) : '';",
    "let d = c.atualizado_em || c.data_envio_email; const dataEnvioFormatada = d ? new Date(d.replace(' ', 'T') + (d.includes('Z')?'':'Z')).toLocaleString('pt-BR', {day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}) : '';"
);
exp = exp.replace(
    "const envData = c.data_envio_email ? new Date(c.data_envio_email + 'Z').toLocaleString('pt-BR', {day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}) : '';",
    "let e = c.data_envio_email; const envData = e ? new Date(e.replace(' ', 'T') + (e.includes('Z')?'':'Z')).toLocaleString('pt-BR', {day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}) : '';"
);


fs.writeFileSync('c:/A/OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA/Documentos - America Rental/Diretoria/Teste Sistema/cadastro-colaboradores/frontend/experiencia.js', exp);

console.log("Fixed server queries and frontend bugs");
