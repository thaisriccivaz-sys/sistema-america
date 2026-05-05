const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Caminho do banco de dados (ajuste se necessário, no Render costuma ficar na pasta raiz ou em data/)
// No nosso projeto, normalmente fica em backend/database.sqlite ou database.sqlite
const dbPath = path.join(__dirname, 'backend', 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Erro ao abrir o banco de dados:', err);
        return;
    }
    console.log('Conectado ao banco de dados:', dbPath);
});

// 1. Procurar a colaboradora
db.get(`SELECT id, nome_completo FROM colaboradores WHERE nome_completo LIKE '%Beatriz Batista Alves%'`, (err, colab) => {
    if (err) {
        console.error('Erro ao buscar colaboradora:', err);
        db.close();
        return;
    }
    if (!colab) {
        console.log('Colaboradora não encontrada!');
        db.close();
        return;
    }
    
    console.log(`Colaboradora encontrada: ${colab.nome_completo} (ID: ${colab.id})`);

    // 2. Buscar o documento
    db.all(`SELECT id, document_type, assinafy_id FROM documentos WHERE colaborador_id = ? AND document_type LIKE '%ACORDO DE COMPENSAÇÃO%'`, [colab.id], (err, docs) => {
        if (err) {
            console.error('Erro ao buscar documentos:', err);
            db.close();
            return;
        }

        if (docs.length === 0) {
            console.log('Nenhum documento encontrado com esse nome para a colaboradora.');
            db.close();
            return;
        }

        console.log('Documentos encontrados:', docs);

        // 3. Deletar os documentos encontrados
        const idsToDelete = docs.map(d => d.id).join(',');
        db.run(`DELETE FROM documentos WHERE id IN (${idsToDelete})`, function(err) {
            if (err) {
                console.error('Erro ao deletar:', err);
            } else {
                console.log(`Sucesso! ${this.changes} documento(s) removido(s) do banco de dados.`);
            }
            db.close();
        });
    });
});
