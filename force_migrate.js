const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.resolve(__dirname, 'backend', 'hr_system_v2.sqlite');
const db = new sqlite3.Database(dbPath);

const colabCols = [
    'matricula_esocial', 'local_nascimento', 'rg_orgao', 'rg_data_emissao', 'cbo',
    'titulo_eleitoral', 'titulo_zona', 'titulo_secao',
    'ctps_numero', 'ctps_serie', 'ctps_uf', 'ctps_data_expedicao',
    'fgts_opcao', 'banco_nome', 'banco_agencia', 'banco_conta',
    'escala_tipo', 'escala_folgas',
    'horario_entrada', 'horario_saida', 'intervalo_entrada', 'intervalo_saida',
    'sabado_entrada', 'sabado_saida'
];

db.serialize(() => {
    colabCols.forEach(col => {
        db.run(`ALTER TABLE colaboradores ADD COLUMN ${col} TEXT`, (err) => {
            if(!err) console.log(`Colaboradores: Adicionada coluna ${col}`);
        });
    });
    
    // Garantir Cargos
    db.run(`ALTER TABLE cargos ADD COLUMN documentos_obrigatorios TEXT`, (err) => {
        if(!err) console.log(`Cargos: Adicionada coluna documentos_obrigatorios`);
    });
});

console.log('Migração forçada iniciada...');
// db.close() runs after serialize, ideally.
setTimeout(() => db.close(), 5000);
