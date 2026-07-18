const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('backend/data/hr_system_v2.sqlite');

// 1. Checar config_notificacoes
db.all("SELECT cn.tipo, u.username, u.nome FROM config_notificacoes cn JOIN usuarios u ON u.id = cn.usuario_id WHERE cn.tipo = 'celular_controle'", (err, rows) => {
    console.log('\n=== CONFIG_NOTIFICACOES (celular_controle) ===');
    console.log(err || rows);
});

// 2. Checar celular_participa do Vitor
db.get("SELECT id, nome_completo, celular_participa, celular_data FROM colaboradores WHERE nome_completo LIKE '%Vitor Leandro%'", (err, row) => {
    console.log('\n=== VITOR LEANDRO - celular_participa ===');
    console.log(err || row);
});

// 3. Checar vinculos dos usuários
db.all("SELECT id, username, colaborador_id FROM usuarios WHERE username IN ('Thais.Ricci', 'thiago.goncalves')", (err, rows) => {
    console.log('\n=== USUARIOS ===');
    console.log(err || rows);
});

// 4. Ultimas notificacoes criadas
db.all("SELECT * FROM notificacoes_usuarios ORDER BY id DESC LIMIT 10", (err, rows) => {
    console.log('\n=== ULTIMAS NOTIFICACOES ===');
    console.log(err || rows);
});
