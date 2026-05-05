require('dotenv').config();
const db = require('./backend/database');

console.log('Iniciando script de limpeza de documento...');

// Dar 1 segundo pro banco inicializar caso tenha algo assíncrono (PRAGMAs etc)
setTimeout(() => {
    // 1. Procurar a colaboradora
    db.get(`SELECT id, nome_completo FROM colaboradores WHERE nome_completo LIKE '%Beatriz Batista Alves%'`, (err, colab) => {
        if (err) {
            console.error('Erro ao buscar colaboradora:', err);
            return;
        }
        if (!colab) {
            console.log('Colaboradora não encontrada!');
            return;
        }
        
        console.log(`Colaboradora encontrada: ${colab.nome_completo} (ID: ${colab.id})`);

        // 2. Buscar o documento (ignorando acentos usando LIKE generico)
        db.all(`SELECT id, document_type, file_name, assinafy_id FROM documentos WHERE colaborador_id = ? AND document_type LIKE '%ACORDO DE COMPENSA%'`, [colab.id], (err, docs) => {
            if (err) {
                console.error('Erro ao buscar documentos:', err);
                return;
            }

            if (docs.length === 0) {
                console.log('Nenhum documento encontrado com esse nome para a colaboradora. Buscando todos os documentos dela para debug...');
                db.all(`SELECT id, document_type FROM documentos WHERE colaborador_id = ?`, [colab.id], (err2, allDocs) => {
                    console.log('Documentos reais desta colaboradora:', allDocs);
                });
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
            });
        });
    });
}, 1000);
