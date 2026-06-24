const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'backend', 'data', 'hr_system_v2.sqlite');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    // 1. Garantir que existe o endereço "Geral"
    db.get("SELECT id FROM estoque_enderecos WHERE nome = 'Geral'", (err, row) => {
        if (err) throw err;
        
        let geralId;
        if (row) {
            geralId = row.id;
            migrate(geralId);
        } else {
            db.run("INSERT INTO estoque_enderecos (nome) VALUES ('Geral')", function(errI) {
                if (errI) throw errI;
                geralId = this.lastID;
                migrate(geralId);
            });
        }
    });
});

function migrate(geralId) {
    console.log("Endereço 'Geral' ID:", geralId);
    
    // 2. Buscar todos os produtos
    db.all("SELECT id, quantidade_atual, quantidade_minima, quantidade_maxima FROM estoque", (err, produtos) => {
        if (err) throw err;
        
        console.log(`Encontrados ${produtos.length} produtos no estoque.`);
        let countMigrados = 0;
        let countAtualizados = 0;
        
        const stmtInsert = db.prepare(`
            INSERT INTO estoque_saldo_por_endereco (estoque_id, endereco_id, quantidade, quantidade_minima, quantidade_maxima)
            VALUES (?, ?, ?, ?, ?)
        `);
        
        const stmtUpdateMinMax = db.prepare(`
            UPDATE estoque_saldo_por_endereco 
            SET quantidade_minima = ?, quantidade_maxima = ?
            WHERE estoque_id = ? AND endereco_id = ? AND quantidade_minima = 0 AND quantidade_maxima = 0
        `);

        db.serialize(() => {
            db.run("BEGIN TRANSACTION");
            
            let processados = 0;
            
            produtos.forEach(p => {
                db.all("SELECT * FROM estoque_saldo_por_endereco WHERE estoque_id = ?", [p.id], (err2, saldos) => {
                    if (err2) throw err2;
                    
                    if (!saldos || saldos.length === 0) {
                        // Sem endereço! Migrar para "Geral"
                        stmtInsert.run([p.id, geralId, p.quantidade_atual || 0, p.quantidade_minima || 0, p.quantidade_maxima || 0]);
                        countMigrados++;
                    } else {
                        // Tem endereço. Verificar se precisamos migrar o min/max da tabela estoque para o primeiro endereço (se estiver 0)
                        // Para não sobrescrever o que o usuario ja preencheu, só atualiza se min e max forem 0 no banco.
                        if (saldos.length === 1 && saldos[0].quantidade_minima === 0 && saldos[0].quantidade_maxima === 0) {
                            if (p.quantidade_minima > 0 || p.quantidade_maxima > 0) {
                                stmtUpdateMinMax.run([p.quantidade_minima, p.quantidade_maxima, p.id, saldos[0].endereco_id]);
                                countAtualizados++;
                            }
                        }
                    }
                    
                    processados++;
                    if (processados === produtos.length) {
                        stmtInsert.finalize();
                        stmtUpdateMinMax.finalize();
                        db.run("COMMIT", () => {
                            console.log(`Migração concluída. Migrados para Geral: ${countMigrados}. Atualizados min/max: ${countAtualizados}.`);
                        });
                    }
                });
            });
            
            if (produtos.length === 0) {
                db.run("COMMIT");
            }
        });
    });
}
