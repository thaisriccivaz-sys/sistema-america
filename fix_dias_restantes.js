const fs = require('fs');

let server = fs.readFileSync('c:/A/OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA/Documentos - America Rental/Diretoria/Teste Sistema/cadastro-colaboradores/backend/server.js', 'utf8');

server = server.replace(
    /if \(!emailDestino\) return res\.status\(400\)\.json\(\{ error: 'Respons\uFFFDvel do departamento n\uFFFDo possui e-mail cadastrado\.' \}\);\s*if \(r\.situacao === 'finalizado'\) return res\.status\(400\)\.json\(\{ error: 'O formul\uFFFDrio j\uFFFD foi respondido e finalizado\.' \}\);\s*if \(diasRestantes !== '-' && diasRestantes < 0\) return res\.status\(400\)\.json\(\{ error: 'O prazo de experi\uFFFAncia deste colaborador j\uFFFD expirou\.' \}\);\s*const prazos = calcPrazoExp\(r\.data_admissao\);\s*const diasRestantes = prazos \? Math\.ceil\(\(new Date\(prazos\.prazo2_fim \+ 'T23:59:59'\) - new Date\(\)\) \/ 86400000\) : '-';/g,
    `const prazos = calcPrazoExp(r.data_admissao);
        const diasRestantes = prazos ? Math.ceil((new Date(prazos.prazo2_fim + 'T23:59:59') - new Date()) / 86400000) : '-';
        if (!emailDestino) return res.status(400).json({ error: 'Responsável do departamento não possui e-mail cadastrado.' });
        if (r.situacao === 'finalizado') return res.status(400).json({ error: 'O formulário já foi respondido e finalizado.' });
        if (diasRestantes !== '-' && diasRestantes < 0) return res.status(400).json({ error: 'O prazo de experiência deste colaborador já expirou.' });`
);

fs.writeFileSync('c:/A/OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA/Documentos - America Rental/Diretoria/Teste Sistema/cadastro-colaboradores/backend/server.js', server);
console.log('Fixed diasRestantes');
