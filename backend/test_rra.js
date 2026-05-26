const fetch = require('node-fetch'); // Assume it might be needed, or we just use http

async function testAuditoria() {
    try {
        // Need to simulate DB insert to check if there's any SQL error.
        const sqlite3 = require('sqlite3').verbose();
        const db = new sqlite3.Database('cadastro.db');
        
        const data_rota = '2026-05-15';
        const nome_resumo = 'Resumo Teste';
        const veiculo = 'ABC-1234';
        const campo = 'Observações de Alterações';
        const valor_anterior = '';
        const valor_atual = 'teste';
        const usuario = 'diretoria.1';

        db.run(
            `INSERT INTO resumo_rota_auditoria (data_rota, nome_resumo, veiculo, campo, valor_anterior, valor_atual, usuario_nome)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [data_rota || '', nome_resumo || '', veiculo || '', campo || '', valor_anterior || '', valor_atual || '', usuario],
            function(err) {
                if (err) console.error("SQL Error:", err.message);
                else console.log("Success! ID:", this.lastID);
                
                db.all(`SELECT * FROM resumo_rota_auditoria WHERE id = ?`, [this.lastID], (err, row) => {
                    console.log(row);
                });
            }
        );
    } catch(e) {
        console.error(e);
    }
}
testAuditoria();
