const fs = require('fs');
let code = fs.readFileSync('frontend/app.js', 'utf8');

const lines = code.split('\n');
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('onclick="editDepartamento(${d.id}')) {
        lines[i] = '                <button type="button" class="btn btn-primary btn-sm" onclick="editDepartamento(${d.id}, \'${d.nome.replace(/\\\'/g, "\\\\\'")}\',\'${tipo}\',\'${d.responsavel_id || \'\'}\',\'${(d.nome_aso||\'\').replace(/\\\'/g,"\\\\\'")}\', \'${(d.responsavel_nome||\'\').replace(/\\\'/g, "\\\\\'")}\')" title="Editar">';
    }
}
fs.writeFileSync('frontend/app.js', lines.join('\n'), 'utf8');
