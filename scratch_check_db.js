const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('backend/data/hr_system_v2.sqlite');

db.serialize(() => {
    db.run("CREATE TABLE IF NOT EXISTS os_logistica ( \
        id INTEGER PRIMARY KEY AUTOINCREMENT, \
        numero_os TEXT, \
        tipo_os TEXT, \
        cliente TEXT, \
        endereco TEXT, \
        complemento TEXT, \
        cep TEXT, \
        lat REAL, \
        lng REAL, \
        contrato TEXT, \
        data_os TEXT, \
        responsavel TEXT, \
        telefone TEXT, \
        email TEXT, \
        tipo_servico TEXT, \
        hora_inicio TEXT, \
        hora_fim TEXT, \
        turno TEXT, \
        dias_semana TEXT, \
        produtos TEXT, \
        observacoes TEXT, \
        observacoes_internas TEXT, \
        habilidades TEXT, \
        variaveis TEXT, \
        link_video TEXT, \
        patrimonio TEXT, \
        status TEXT DEFAULT 'ativo', \
        criado_em TEXT DEFAULT (datetime('now')), \
        atualizado_em TEXT DEFAULT (datetime('now')) \
    )");
    
    db.all('SELECT COUNT(*) as count FROM os_logistica', [], (err, rows) => {
        if(err) console.error(err);
        else console.log('Count:', rows[0].count);
    });
});
