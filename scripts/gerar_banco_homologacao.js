const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');

// Caminhos dos arquivos
const sourceDbPath = path.join(__dirname, '../backend/data/hr_system_v2.sqlite');
const targetDbPath = path.join(__dirname, '../backend/data/hr_system_v2_homologacao.sqlite');

console.log('--- Iniciando processo de Anonimização de Banco de Dados para Homologação ---');

// 1. Verificar se o banco original existe
if (!fs.existsSync(sourceDbPath)) {
    console.error(`ERRO: Banco original não encontrado em ${sourceDbPath}`);
    process.exit(1);
}

// 2. Criar uma cópia do banco para trabalhar com segurança
console.log(`Copiando banco de dados de produção para ${targetDbPath}...`);
if (fs.existsSync(targetDbPath)) {
    console.log('Banco de homologação já existia. Sobrescrevendo...');
}
fs.copyFileSync(sourceDbPath, targetDbPath);
console.log('Cópia concluída.');

// 3. Conectar ao novo banco (A CÓPIA)
const db = new sqlite3.Database(targetDbPath, (err) => {
    if (err) {
        console.error('Erro ao conectar ao banco copiado:', err.message);
        process.exit(1);
    }
});

// Funções auxiliares para gerar dados falsos
function getRandomCPF() {
    return `111.${Math.floor(100 + Math.random() * 900)}.${Math.floor(100 + Math.random() * 900)}-${Math.floor(10 + Math.random() * 90)}`;
}

function getRandomPhone() {
    return `(11) 9${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`;
}

db.serialize(() => {
    console.log('Iniciando sanitização dos dados...');

    // A. Limpar tabelas de log e documentos (Economiza muito espaço e remove dados reais)
    console.log('A. Limpando tabelas de log e arquivos de documentos...');
    db.run('DELETE FROM historico_logs');
    db.run('DELETE FROM documentos');
    db.run('DELETE FROM diretoria_notificacoes_pendentes');
    db.run('DELETE FROM logistica_notificacoes_pendentes');
    db.run('DELETE FROM notificacoes_usuarios');
    // Para manter o banco leve, podemos limpar recibos antigos também
    db.run('DELETE FROM recibos_historico'); 

    // B. Excluir todos os Colaboradores
    console.log('B. Excluindo todos os Colaboradores (a pedido para limpar o ambiente)...');
    db.run('DELETE FROM colaboradores', function(err) {
        if (!err) console.log(`   -> ${this.changes} colaboradores excluídos.`);
    });
    db.run('DELETE FROM dependentes');
    db.run('DELETE FROM avaliacoes');

    // D. Anonimizar Usuários do Sistema
    console.log('D. Anonimizando Usuários (Senha e Login configurados)...');
    const defaultPasswordHash = bcrypt.hashSync('Teste_2499', 10);
    
    db.run('UPDATE usuarios SET password_hash = ?', [defaultPasswordHash], function(err) {
        if (err) throw err;
        console.log(`   -> Senhas resetadas para ${this.changes} usuários. (Senha nova: Teste_2499)`);
    });

    db.run("UPDATE usuarios SET username = 'testesistema' WHERE id = (SELECT id FROM usuarios WHERE role = 'Diretoria' ORDER BY id ASC LIMIT 1)", function(err) {
        if (!err) console.log('   -> Login do Admin alterado para: testesistema');
    });

    // VACUUM para compactar o banco e remover resquícios dos dados apagados
    db.run('VACUUM', (err) => {
        if (err) console.error('Erro no VACUUM:', err.message);
        console.log('Banco de dados compactado com sucesso.');
        
        // Fechar conexão APÓS o vacuum
        db.close((err2) => {
            if (err2) {
                console.error('Erro ao fechar o banco:', err2.message);
            } else {
                console.log('---------------------------------------------------------');
                console.log('✅ PROCESSO CONCLUÍDO COM SUCESSO!');
                console.log(`✅ O banco de dados seguro para homologação está em:`);
                console.log(`   ${targetDbPath}`);
                console.log(`\nImportante: Entregue APENAS este arquivo para o desenvolvedor.`);
                console.log('Login principal: testesistema');
                console.log('Senha para todos os usuários: Teste_2499');
                console.log('---------------------------------------------------------');
            }
        });
    });
});
