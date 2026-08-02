const db = require('better-sqlite3')('database.sqlite');
const user = db.prepare("SELECT * FROM usuarios WHERE username = 'ana.vitoria'").get();
if (user) {
  const perms = db.prepare("SELECT * FROM grupos_permissao_paginas WHERE grupo_permissao_id = ?").all(user.grupo_permissao_id);
  console.log('Group ID:', user.grupo_permissao_id, 'Perms:', perms.filter(p => p.pagina_id.includes('sac')));
} else {
  console.log('User not found');
}
