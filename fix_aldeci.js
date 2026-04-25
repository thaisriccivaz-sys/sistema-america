const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('backend/data/hr_system_v2.sqlite');

const dados = {
    nome_completo:       'Aldeci de Sá Menezes',
    data_nascimento:     '1973-08-25',
    local_nascimento:    'Floresta - PE',
    nacionalidade:       'Brasileira',
    estado_civil:        'Casado',
    sexo:                'Masculino',
    grau_instrucao:      'Ensino Médio Completo',
    deficiencia:         'Não',
    nome_mae:            'Eulina Maria de Araujo Almeida',
    nome_pai:            'Joao Silvino de Almeida',
    endereco:            'Rua Caçaquera, 625, Casa 2, Vila Antonina, São Paulo, SP, CEP: 03412-030',
    cargo:               'Motorista',
    data_admissao:       '2016-07-18',
    salario:             1479.60,
    numero_registro:     '000089',
    rg:                  '384750448',
    rg_data_emissao:     '2003-08-29',
    rg_orgao:            'SSP/PE',
    pis:                 '13366541775',
    ctps_numero:         '00039837',
    ctps_serie:          '00008',
    ctps_uf:             'SP',
    ctps_data_expedicao: '1994-01-03',
    titulo_eleitoral:    '0393012500809',
    titulo_zona:         '253',
    titulo_secao:        '0577',
};

const sets = Object.keys(dados).map(k => `${k} = ?`).join(', ');
const vals = [...Object.values(dados), '044.486.984-08'];

db.run(`UPDATE colaboradores SET ${sets} WHERE cpf = ?`, vals, function(err) {
    if (err) console.error('❌ Erro:', err.message);
    else console.log('✅ Aldeci de Sá Menezes atualizado! Registros:', this.changes);
    db.close();
});
