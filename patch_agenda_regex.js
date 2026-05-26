const fs = require('fs');
let code = fs.readFileSync('backend/server.js', 'utf8');

const regex = /db\.run\('INSERT INTO faltas \(colaborador_id, data_falta, turno, observacao, avisado_previamente\) VALUES \(\?, \?, \?, \?, \?\)',\s*\[colab_id, card\.data, 'Dia todo', card\.descricao \|\| 'Falta registrada via Agenda da Logística', 'Não'\],/;

const replace = `const obsBase = card.descricao || 'Falta registrada via Agenda da Logística';
                const obsFinal = obsBase + (card.criado_por ? ' (Criado por: ' + card.criado_por + ')' : '');
                db.run('INSERT INTO faltas (colaborador_id, data_falta, turno, observacao, avisado_previamente) VALUES (?, ?, ?, ?, ?)',
                    [colab_id, card.data, 'Dia todo', obsFinal, 'Não'],`;

if (regex.test(code)) {
    code = code.replace(regex, replace);
    fs.writeFileSync('backend/server.js', code);
    console.log('OK FALTA OBSERVAÇÃO REGEX');
} else {
    console.log('Search not found!');
}
