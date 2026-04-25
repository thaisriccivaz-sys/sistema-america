const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('backend/data/hr_system_v2.sqlite');

const colaboradores = [
  {
    nome_completo:     'Adriano Duarte da Silva',
    cpf:               '313.539.688-63',
    data_nascimento:   '1983-02-06',
    local_nascimento:  'Guarulhos - SP',
    nacionalidade:     'Brasileira',
    estado_civil:      'Solteiro',
    sexo:              'Masculino',
    grau_instrucao:    'Ensino Médio Completo',
    deficiencia:       'Não',
    nome_mae:          'Solange de Oliveira',
    nome_pai:          'Natanael Duarte da Silva',
    endereco:          'R Damalau, 318, Vila Nova Cumbica, Guarulhos, SP, CEP: 07232-030',
    cargo:             'Motorista',
    data_admissao:     '2022-09-19',
    salario:           2294.61,
    matricula_esocial: '82',
    numero_registro:   '000082',
    rg:                '42.537.116-7',
    rg_data_emissao:   '2022-04-08',
    rg_orgao:          'SSP/SP',
    pis:               '13102909778',
    ctps_numero:       '00036648',
    ctps_serie:        '00248',
    ctps_uf:           'SP',
    titulo_eleitoral:  '306370200116',
    titulo_zona:       '395',
    titulo_secao:      '0144',
    certificado_militar: '04116204088-9',
  },
  {
    nome_completo:     'Alay Aportela Herrera',
    cpf:               '720.559.084-13',
    data_nascimento:   '1971-03-20',
    nacionalidade:     'Cubana',
    estado_civil:      'Casado',
    sexo:              'Masculino',
    cor_raca:          'Parda',
    grau_instrucao:    'Ensino Médio Completo',
    deficiencia:       'Não',
    nome_pai:          'Rene Aportela Hernadez',
    nome_mae:          'Silvia Herrera Diaz',
    endereco:          'Rua Jutai, 158, Cidade Parque Alvorada, Guarulhos, SP, CEP: 07242-225',
    telefone:          '82-99872745',
    cargo:             'Ajudante Geral',
    cbo:               '784205 - Ajudante de obras',
    data_admissao:     '2026-04-06',
    salario:           2100.00,
    matricula_esocial: '201',
    numero_registro:   '000001',
    horario_entrada:   '07:00',
    horario_saida:     '16:00',
    intervalo_entrada: '12:00',
    intervalo_saida:   '13:00',
    fgts_opcao:        '2026-04-06',
    rg_orgao:          'SSP/SP',
  },
  {
    nome_completo:     'Aldeci de Sa Menezes',
    cpf:               '044.486.984-08',
    data_nascimento:   '1973-08-25',
    local_nascimento:  'Floresta - PE',
    nacionalidade:     'Brasileira',
    estado_civil:      'Casado',
    sexo:              'Masculino',
    grau_instrucao:    'Ensino Médio Completo',
    deficiencia:       'Não',
    nome_mae:          'Eulina Maria de Araujo Almeida',
    nome_pai:          'Joao Silvino de Almeida',
    endereco:          'Rua Caçaquera, 625, Casa 2, Vila Antonina, São Paulo, SP, CEP: 03412-030',
    cargo:             'Motorista',
    data_admissao:     '2016-07-18',
    salario:           1479.60,
    numero_registro:   '000089',
    rg:                '384750448',
    rg_data_emissao:   '2003-08-29',
    rg_orgao:          'SSP/PE',
    pis:               '13366541775',
    ctps_numero:       '00039837',
    ctps_serie:        '00008',
    ctps_uf:           'SP',
    ctps_data_expedicao: '1994-01-03',
    titulo_eleitoral:  '0393012500809',
    titulo_zona:       '253',
    titulo_secao:      '0577',
  },
  {
    nome_completo:     'Aline Silva do Nascimento de Oliveira',
    cpf:               '316.046.538-17',
    data_nascimento:   '1989-10-28',
    local_nascimento:  'Guarulhos - SP',
    nacionalidade:     'Brasileira',
    estado_civil:      'Casado',
    sexo:              'Feminino',
    grau_instrucao:    'Superior Completo',
    deficiencia:       'Não',
    nome_mae:          'Helena Maria da Silva do Nascimento',
    nome_pai:          'Helio Silva do Nascimento',
    endereco:          'R Corinto, 85, Cidade Parque Alvorada, Guarulhos, SP, CEP: 07242-360',
    cargo:             'Auxiliar de Recursos Humanos',
    data_admissao:     '2023-07-27',
    salario:           1682.00,
    matricula_esocial: '100',
    numero_registro:   '000100',
    rg:                '46.526.722-1',
    rg_data_emissao:   '2019-02-27',
    rg_orgao:          'SSP/SP',
    pis:               '13454416816',
    ctps_numero:       '03160465',
    ctps_serie:        '03817',
    ctps_uf:           'SP',
    titulo_eleitoral:  '36108144018336',
    titulo_zona:       '185',
    titulo_secao:      '0231',
  },
  {
    nome_completo:     'Antonio Carlos Sabino da Silva',
    cpf:               '405.424.108-50',
    data_nascimento:   '1993-02-03',
    local_nascimento:  'Guarulhos - SP',
    nacionalidade:     'Brasileira',
    estado_civil:      'Divorciado',
    sexo:              'Masculino',
    cor_raca:          'Parda',
    grau_instrucao:    'Ensino Médio Incompleto',
    deficiencia:       'Não',
    nome_pai:          'Damiao Sabino da Silva',
    nome_mae:          'Maria Aparecida da Silva',
    endereco:          'Rua Constantina, 79, Jardim Anny, Guarulhos, SP, CEP: 07262-290',
    telefone:          '11-92006475',
    cargo:             'Motorista',
    cbo:               '782510 - Motorista de caminhão',
    data_admissao:     '2026-03-16',
    salario:           2816.11,
    matricula_esocial: '199',
    numero_registro:   '000001',
    rg:                '490149662',
    rg_data_emissao:   '2012-03-08',
    rg_orgao:          'SSP/SP',
    titulo_eleitoral:  '397850610116',
    titulo_zona:       '394',
    titulo_secao:      '0406',
    horario_entrada:   '07:00',
    horario_saida:     '16:00',
    intervalo_entrada: '12:00',
    intervalo_saida:   '13:00',
    fgts_opcao:        '2026-03-16',
  }
];

function upsertColaborador(dados) {
  return new Promise((resolve) => {
    db.get('SELECT id FROM colaboradores WHERE nome_completo = ?', [dados.nome_completo], (err, row) => {
      const fields = Object.keys(dados).filter(k => k !== 'nome_completo');
      if (row) {
        // UPDATE
        const sets = fields.map(f => `${f} = ?`).join(', ');
        const vals = [...fields.map(f => dados[f]), dados.nome_completo];
        db.run(`UPDATE colaboradores SET ${sets} WHERE nome_completo = ?`, vals, function(e) {
          if (e) console.error(`❌ Erro ao atualizar ${dados.nome_completo}:`, e.message);
          else console.log(`✅ Atualizado: ${dados.nome_completo} (id ${row.id})`);
          resolve();
        });
      } else {
        // INSERT
        const allFields = ['nome_completo', ...fields];
        const allVals = [dados.nome_completo, ...fields.map(f => dados[f])];
        const placeholders = allFields.map(() => '?').join(', ');
        db.run(`INSERT INTO colaboradores (${allFields.join(', ')}) VALUES (${placeholders})`, allVals, function(e) {
          if (e) console.error(`❌ Erro ao inserir ${dados.nome_completo}:`, e.message);
          else console.log(`✅ Inserido: ${dados.nome_completo} (novo id ${this.lastID})`);
          resolve();
        });
      }
    });
  });
}

(async () => {
  for (const c of colaboradores) {
    await upsertColaborador(c);
  }
  console.log('\n✅ Importação concluída!');
  db.close();
})();
