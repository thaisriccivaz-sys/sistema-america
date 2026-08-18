const fs = require('fs');
let code = fs.readFileSync('backend/server.js', 'utf8');

code = code.replace(/subject: \`\?\? SAC - Novo chamado atribudo para \$\{user\.nome \|\| assignedUsername\}: N \$\{protocol\}\`,/, 'subject: `\u2728 Novo SAC atribuído ao setor para ${user.nome || assignedUsername}: Nº ${protocol}`,');

code = code.replace(/<span style="color:#fff;font-size:1\.3rem;font-weight:800;">\?\? Chamado Atribudo  sua Equipe<\/span>/, '<span style="color:#fff;font-size:1.3rem;font-weight:800;">\u2728 Novo SAC atribuído ao setor</span>');

fs.writeFileSync('backend/server.js', code);
console.log('Replaced successfully');
