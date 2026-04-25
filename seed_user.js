const sqlite3 = require('sqlite3');
const bcrypt = require('bcryptjs');

const db = new sqlite3.Database('backend/data/hr_system_v2.sqlite');

// Senha padrão - vou criar a mesma que estava antes
const senha = '123';

bcrypt.hash(senha, 10, (err, hash) => {
    if (err) return console.error('Erro ao gerar hash:', err);

    db.run(`
        INSERT OR REPLACE INTO usuarios (username, password_hash, role)
        VALUES ('diretoria.1', ?, 'Diretoria')
    `, [hash], function(err2) {
        if (err2) return console.error('Erro ao inserir:', err2);
        console.log('Usuário diretoria.1 criado com sucesso! ID:', this.lastID);
        console.log('Senha:', senha);
        db.close();
    });
});
