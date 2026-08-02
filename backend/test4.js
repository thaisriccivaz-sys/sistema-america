const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('database.sqlite');
db.get("SELECT * FROM usuarios WHERE username = 'ana.vitoria'", (err, user) => {
  if (user) {
    db.all("SELECT * FROM grupos_permissao_paginas WHERE grupo_permissao_id = ?", [user.grupo_permissao_id], (err, perms) => {
      console.log('Group ID:', user.grupo_permissao_id, 'Perms:', perms.filter(p => p.pagina_id.includes('sac')));
    });
  } else {
    console.log('User not found');
  }
});
