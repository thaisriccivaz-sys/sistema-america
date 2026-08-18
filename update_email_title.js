const fs = require('fs');
let code = fs.readFileSync('backend/server.js', 'utf8');

// Replace User email subject
code = code.replace(/subject: `\?\? SAC - Novo chamado atribu\ufffddo a voc\ufffd: N\ufffd \$\{protocol\}\`,/, 'subject: `\u2728 SAC - Novo chamado atribuído a você: Nº ${protocol}`,');
code = code.replace(/subject: `\?\? SAC - Novo chamado atribu.do a voc.: N. \$\{protocol\}\`,/, 'subject: `\u2728 SAC - Novo chamado atribuído a você: Nº ${protocol}`,');

// Replace User email title
code = code.replace(/<span style="color:#fff;font-size:1\.3rem;font-weight:800;">\?\? Novo Chamado Atribu.do<\/span>/, '<span style="color:#fff;font-size:1.3rem;font-weight:800;">\u2728 Novo Chamado Atribuído a Você</span>');

// Replace Gestor email subject
code = code.replace(/subject: `\?\? SAC - Novo chamado atribu.do para \$\{user\.nome \|\| assignedUsername\}: N. \$\{protocol\}\`,/, 'subject: `\u2728 Novo SAC atribuído ao setor`,');

// Replace Gestor email title
code = code.replace(/<span style="color:#fff;font-size:1\.3rem;font-weight:800;">\?\? Chamado Atribu.do . sua Equipe<\/span>/, '<span style="color:#fff;font-size:1.3rem;font-weight:800;">\u2728 Novo SAC atribuído ao setor</span>');

fs.writeFileSync('backend/server.js', code);
console.log('Replaced successfully');
