const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs'); 
const db = new sqlite3.Database('C:/A/OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA/Documentos - America Rental/Diretoria/Teste Sistema/cadastro-colaboradores/backend/data/hr_system_v2.sqlite');

db.all("SELECT id, username, nome, role FROM usuarios WHERE username LIKE '%diretoria%'", [], (err, rows) => {
    if (err) throw err;
    console.log("Found users:");
    console.log(rows);
    if (rows.length > 0) {
        const username = rows[0].username;
        const newPassword = '123'; 
        const hash = bcrypt.hashSync(newPassword, 10);
        db.run("UPDATE usuarios SET password_hash = ? WHERE username = ?", [hash, username], (err) => {
            if (err) throw err;
            console.log(`Password reset for ${username} to: 123`);
        });
    }
});
