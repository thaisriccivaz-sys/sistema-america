// SCRIPT DE RESET DE SENHA - uso exclusivo do administrador em ambiente local
// NUNCA execute em produção via acesso pública
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs'); 
const path = require('path');
const db = new sqlite3.Database(path.join(__dirname, 'data/hr_system_v2.sqlite'));

const targetUsername = process.argv[2];
const newPassword = process.argv[3];

if (!targetUsername || !newPassword) {
    console.error('USO: node reset_pass.js <username> <nova_senha>');
    console.error('Exemplo: node reset_pass.js Thais.Ricci MinhaS3nhaForte!');
    process.exit(1);
}

if (newPassword.length < 8) {
    console.error('ERRO: A senha deve ter no mínimo 8 caracteres.');
    process.exit(1);
}

db.get("SELECT id, username FROM usuarios WHERE username = ?", [targetUsername], (err, row) => {
    if (err) { console.error('Erro ao buscar usuario:', err); process.exit(1); }
    if (!row) { console.error('Usuário não encontrado:', targetUsername); process.exit(1); }
    const hash = bcrypt.hashSync(newPassword, 10);
    db.run("UPDATE usuarios SET password_hash = ? WHERE username = ?", [hash, targetUsername], (err2) => {
        if (err2) { console.error('Erro ao atualizar senha:', err2); process.exit(1); }
        console.log('Senha atualizada com sucesso para o usuário: ' + targetUsername);
    });
});
