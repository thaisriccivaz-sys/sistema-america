/**
 * SCRIPT DE ANONIMIZAÇÃO — APENAS HOMOLOGAÇÃO
 * Substitui dados reais dos colaboradores por dados fictícios no banco local.
 * NÃO DEVE SER EXECUTADO EM PRODUÇÃO.
 */
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'backend', 'data', 'hr_system_v2.sqlite');
const db = new sqlite3.Database(dbPath);

const PROTEGIDO = 'teste de sistema da silva';

const NOMES = ['João','Maria','Carlos','Ana','Pedro','Lucia','Rafael','Juliana','Marcos','Fernanda',
               'Roberto','Patricia','Lucas','Camila','Bruno','Larissa','Diego','Vanessa','Felipe','Aline'];
const SOBRENOMES = ['Silva','Santos','Oliveira','Souza','Lima','Pereira','Costa','Ferreira','Alves',
                    'Rodrigues','Nascimento','Carvalho','Araujo','Gomes','Martins','Rocha','Ribeiro','Mendes'];
const DEPTS = ['Logística','Administrativo','Comercial','RH','Financeiro','EXTERNO'];
const CARGOS = ['Assistente','Analista','Auxiliar','Operador','Técnico','Motorista','Ajudante Geral','Encarregado'];
const CONTRATOS = ['CLT','PJ','Temporário','Estágio'];

function fakeNome(i) {
    const n = NOMES[i % NOMES.length];
    const s1 = SOBRENOMES[(i + 3) % SOBRENOMES.length];
    const s2 = SOBRENOMES[(i + 7) % SOBRENOMES.length];
    return `${n} ${s1} ${s2}`;
}

function fakeCpf(i) {
    const n = String(i + 1).padStart(3, '0');
    return `000.000.${n}-${String((i % 99) + 1).padStart(2,'0')}`;
}

db.all("SELECT id, nome_completo FROM colaboradores ORDER BY id ASC", [], (err, rows) => {
    if (err) { console.error('Erro ao listar colaboradores:', err.message); db.close(); return; }

    const paraAnonimizar = rows.filter(r =>
        (r.nome_completo || '').trim().toLowerCase() !== PROTEGIDO
    );

    console.log(`\n🔒 ANONIMIZAÇÃO — APENAS HOMOLOGAÇÃO`);
    console.log(`   Total de colaboradores: ${rows.length}`);
    console.log(`   Protegido (não será alterado): "Teste de Sistema da Silva"`);
    console.log(`   Serão anonimizados: ${paraAnonimizar.length}\n`);

    let processados = 0;
    let erros = 0;

    db.serialize(() => {
        const stmt = db.prepare(`
            UPDATE colaboradores SET
                nome_completo = ?,
                cpf           = ?,
                rg            = ?,
                data_nascimento = ?,
                email         = ?,
                email_corporativo = ?,
                telefone      = ?,
                departamento  = ?,
                cargo         = ?,
                status        = ?,
                data_admissao = ?,
                tipo_contrato = ?,
                endereco      = ?,
                nome_mae      = ?,
                nome_pai      = ?,
                estado_civil  = ?,
                nacionalidade = ?,
                sexo          = ?,
                pis           = ?,
                ctps_numero   = ?,
                ctps_serie    = ?,
                banco_nome    = NULL,
                banco_agencia = NULL,
                banco_conta   = NULL,
                foto_path     = NULL,
                foto_base64   = NULL,
                cnh_numero    = NULL,
                cnh_vencimento = NULL,
                cnh_categoria  = NULL,
                titulo_eleitoral = NULL,
                titulo_zona   = NULL,
                titulo_secao  = NULL,
                certificado_militar = NULL,
                contato_emergencia_nome     = 'Contato Teste',
                contato_emergencia_telefone = '(11) 99999-9999',
                contato_emergencia2_nome     = NULL,
                contato_emergencia2_telefone = NULL,
                alergias      = NULL,
                admissao_contabil_enviada_em = NULL,
                aso_assinafy_link = NULL,
                aso_exames_assinafy_link = NULL
            WHERE id = ?
        `);

        for (let i = 0; i < paraAnonimizar.length; i++) {
            const colab = paraAnonimizar[i];
            const nomeOriginal = colab.nome_completo;
            const nomeFake = fakeNome(i);

            stmt.run(
                nomeFake,
                fakeCpf(i),
                `0000000${String(i+1).padStart(2,'0')}`,
                '1990-01-01',
                `colaborador${i+1}@homologacao.com`,
                `teste${i+1}@americarental.com.br`,
                `(11) 9${String(i+1).padStart(4,'0')}-${String(i+1).padStart(4,'0')}`,
                DEPTS[i % DEPTS.length],
                CARGOS[i % CARGOS.length],
                'Ativo',
                '2024-01-01',
                CONTRATOS[i % CONTRATOS.length],
                `Rua Fictícia, ${i+1} - São Paulo/SP`,
                'Maria de Teste',
                'José de Teste',
                i % 2 === 0 ? 'Solteiro' : 'Casado',
                'Brasileiro',
                i % 2 === 0 ? 'M' : 'F',
                `000.00000.00-${i % 10}`,
                `${String(i+1).padStart(7,'0')}`,
                '0001',
                colab.id,
                (err2) => {
                    if (err2) {
                        erros++;
                        console.error(`  ❌ Erro ID ${colab.id}: ${err2.message}`);
                    } else {
                        processados++;
                        process.stdout.write(`  ✅ ${String(processados).padStart(3)} | ${nomeOriginal} → ${nomeFake}\n`);
                    }
                }
            );
        }

        stmt.finalize(() => {
            console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
            console.log(`✅ Concluído: ${processados} anonimizados, ${erros} erros`);
            if (erros === 0) console.log(`🚀 Banco pronto para commit na branch homologacao`);
            db.close();
        });
    });
});
