const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('backend/data/hr_system_v2.sqlite');

db.run(
    "UPDATE notificacoes_usuarios SET mensagem = REPLACE(REPLACE(mensagem, 'ocorr??ncia', 'ocorrência'), 'prontu??rio', 'prontuário') WHERE mensagem LIKE '%??%'", 
    (err) => console.log('UPDATED MENSAGEM:', err || 'success')
);

db.run(
    "UPDATE notificacoes_usuarios SET dados = REPLACE(REPLACE(dados, 'ocorr??ncia', 'ocorrência'), 'prontu??rio', 'prontuário') WHERE dados LIKE '%??%'", 
    (err) => console.log('UPDATED DADOS:', err || 'success')
);
