const fs = require('fs');

let exp = fs.readFileSync('c:/A/OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA/Documentos - America Rental/Diretoria/Teste Sistema/cadastro-colaboradores/frontend/experiencia.js', 'utf8');

// Fix isRH
exp = exp.replace(
    "const isRH = payload.permissoes && (payload.permissoes.includes('rh_completo') || payload.permissoes.includes('rh'));",
    "const isRH = payload.role === 'admin' || payload.role === 'Admin' || payload.role === 'Diretoria' || payload.role === 'diretoria' || (payload.permissoes && (payload.permissoes.includes('rh_completo') || payload.permissoes.includes('rh')));"
);

// Fix hide button
exp = exp.replace(
    /<button onclick="reenviarEmailExperiencia\(\$\{colab\.id\}\)" class="btn-acao btn-outline"/g,
    "${(!form || form.situacao !== 'finalizado') ? `<button onclick=\"reenviarEmailExperiencia(${colab.id})\" class=\"btn-acao btn-outline\"` : `<button style=\"display:none;\"`}"
);

fs.writeFileSync('c:/A/OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA/Documentos - America Rental/Diretoria/Teste Sistema/cadastro-colaboradores/frontend/experiencia.js', exp);
console.log('Fixed isRH and hide button');
