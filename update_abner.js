const sqlite3 = require('sqlite3');
const fs = require('fs');
const path = require('path');

const db = new sqlite3.Database('backend/data/hr_system_v2.sqlite');

// ─── Dados extraídos da Ficha de Registro ─────────────────────────────────
const dados = {
    matricula_esocial:  '151',
    numero_registro:    '000151',
    data_nascimento:    '2003-05-05',
    local_nascimento:   'Guarulhos - SP',
    estado_civil:       'Solteiro',
    nacionalidade:      'Brasileira',
    nome_pai:           'Mauro Abrahão',
    nome_mae:           'Luciene Rodrigues da Silva',
    rg:                 '56.063.146-7',
    rg_data_emissao:    '2019-11-12',
    rg_orgao:           'SSP/SP',
    rg_tipo:            'RG',
    cpf:                '450.210.808-14',
    titulo_eleitoral:   '460832870159',
    titulo_zona:        '395',
    titulo_secao:       '533',
    certificado_militar:'320005363532',
    sexo:               'Masculino',
    cor_raca:           'Branca',
    grau_instrucao:     'Superior Completo',
    deficiencia:        'Não',
    telefone:           '11974363630',
    endereco:           'Rua Ibicuí, 445, Jardim Presidente Dutra, Guarulhos, SP, CEP: 07173-020',
    cargo:              'Assistente de Logística',
    departamento:       'Logística',
    cbo:                '342125',
    data_admissao:      '2025-06-09',
    salario:            2200.00,
    horario_entrada:    '10:42',
    horario_saida:      '20:30',
    intervalo_entrada:  '13:42',
    intervalo_saida:    '14:42',
    fgts_opcao:         '2025-06-09',
};

const sets   = Object.keys(dados).map(k => `${k} = ?`).join(', ');
const values = [...Object.values(dados), 'Abner Abrahão'];

db.run(`UPDATE colaboradores SET ${sets} WHERE nome_completo = ?`, values, function(err) {
    if (err) return console.error('❌ Erro ao atualizar dados:', err.message);
    if (this.changes === 0) return console.error('⚠️  Colaborador não encontrado!');
    console.log('✅ Dados cadastrais atualizados!');

    // ─── Foto de perfil ────────────────────────────────────────────────────
    const fotoSrc = path.join('Abner Abrahão', '13.Fotos', '3x4.jpg');
    const fotoDst = path.join(
        'C:\\A\\OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA\\Documentos - America Rental\\RH\\1.Colaboradores\\Sistema\\ABNER_ABRAHAO\\FOTOS',
        'foto_perfil.jpg'
    );

    if (fs.existsSync(fotoSrc)) {
        // Copiar para pasta OneDrive
        fs.mkdirSync(path.dirname(fotoDst), { recursive: true });
        fs.copyFileSync(fotoSrc, fotoDst);
        console.log('✅ Foto copiada para a pasta FOTOS do OneDrive!');

        // Salvar como base64 no banco
        const base64 = 'data:image/jpeg;base64,' + fs.readFileSync(fotoSrc).toString('base64');
        db.run(`UPDATE colaboradores SET foto_base64 = ? WHERE nome_completo = ?`, [base64, 'Abner Abrahão'], function(err2) {
            if (err2) console.error('❌ Erro ao salvar foto:', err2.message);
            else console.log('✅ Foto de perfil salva no banco de dados!');
            db.close();
        });
    } else {
        console.warn('⚠️  Foto não encontrada em:', fotoSrc);
        db.close();
    }
});
