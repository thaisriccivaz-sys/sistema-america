const fs = require('fs');
let code = fs.readFileSync('frontend/mtr.js', 'utf8');

code = code.replace(
    /const data = await res\.json\(\);\s*if \(\!data\.pdf\) throw new Error\('PDF não disponível'\);/g,
    `const data = await res.json();
    if (!res.ok) throw new Error(data.mensagem || 'Erro desconhecido');
    if (!data.pdf) throw new Error('PDF não disponível');`
);

fs.writeFileSync('frontend/mtr.js', code);
console.log('PATCH FRONTEND PDF ERROR OK');
