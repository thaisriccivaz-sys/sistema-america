const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = process.env.DATABASE_PATH || path.join(__dirname, 'backend', 'data', 'hr_system_v2.sqlite');
const db = new sqlite3.Database(dbPath);

console.log("Rescuing database (V2) at:", dbPath);

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
    db.all("SELECT id, quantidade_atual, quantidade_minima, quantidade_maxima FROM estoque", (err, produtos) => {
        if (err) throw err;
        
        const stmtInsert = db.prepare(`
            INSERT INTO estoque_saldo_por_endereco (estoque_id, endereco_id, quantidade, quantidade_minima, quantidade_maxima)
            VALUES (?, ?, ?, ?, ?)
        `);
        
        const stmtUpdateGeral = db.prepare(`
            UPDATE estoque_saldo_por_endereco 
            SET quantidade_minima = ?, quantidade_maxima = ?
            WHERE estoque_id = ? AND endereco_id = ?
        `);

        db.serialize(() => {
            db.run("BEGIN TRANSACTION");
            let processados = 0;
            
            produtos.forEach(p => {
                db.all("SELECT * FROM estoque_saldo_por_endereco WHERE estoque_id = ?", [p.id], (err2, saldos) => {
                    if (err2) throw err2;
                    
                    const origMin = p.quantidade_minima || 0;
                    const origMax = p.quantidade_maxima || 0;
                    const origQtd = p.quantidade_atual || 0;

                    if (!saldos || saldos.length === 0) {
                        // Sem endereço! Migrar tudo para "Geral"
                        stmtInsert.run([p.id, geralId, origQtd, origMin, origMax]);
                    } else {
                        // Tem endereços.
                        // Verifica se eles têm algum min/max configurado no banco de endereços.
                        let hasAnyMinMax = saldos.some(s => s.quantidade_minima > 0 || s.quantidade_maxima > 0);
                        
                        // Se o usuário não configurou nenhum min/max nos endereços E o produto original Tinha min/max:
                        if (!hasAnyMinMax && (origMin > 0 || origMax > 0)) {
                            // Verifica se já existe um endereço "Geral"
                            let saldoGeral = saldos.find(s => s.endereco_id === geralId);
                            if (saldoGeral) {
                                // Atualiza o Geral existente com os limites
                                stmtUpdateGeral.run([origMin, origMax, p.id, geralId]);
                            } else {
                                // Cria um "Geral" zerado de quantidade, apenas para portar os limites!
                                stmtInsert.run([p.id, geralId, 0, origMin, origMax]);
                            }
                        }
                    }
                    
                    processados++;
                    if (processados === produtos.length) {
                        stmtInsert.finalize();
                        stmtUpdateGeral.finalize();
                        db.run("COMMIT", () => {
                            console.log("Migração V2 concluída.");
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
