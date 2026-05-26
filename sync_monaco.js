const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('backend/data/hr_system_v2.sqlite');

function syncToLogistica(uuid, payload) {
    db.get('SELECT id, documento_base64, documento_path FROM multas_logistica WHERE numero_ait = ? OR monaco_uuid = ?', [payload.numero_ait, uuid], (err, row) => {
        if (err) return;

        let docBase64 = null;
        let docNome = null;
        if (payload.arquivos && payload.arquivos.length > 0) {
            const arq = payload.arquivos[0];
            if (arq.base64) {
                docBase64 = arq.base64;
                docNome = arq.nome || 'anexo_monaco.pdf';
            }
        }

        const dataLimite = payload.prazo_identificacao_condutor || payload.vencimento_multa || null;
        const localInfracao = payload.local || payload.local_infracao || payload.cidade || null;

        if (row) {
            let updateSql = `UPDATE multas_logistica SET
                monaco_uuid = ?, placa = ?, data_infracao = ?, hora_infracao = ?,
                motivo = ?, valor_multa = ?, pontuacao = ?, local_infracao = ?, data_limite = ?`;
            let params = [
                uuid, payload.placa, payload.data_da_infracao, payload.hora_da_infracao,
                payload.descricao, payload.valor_da_infracao, payload.pontos, localInfracao, dataLimite
            ];

            if (docBase64 && !row.documento_base64 && !row.documento_path) {
                updateSql += `, documento_base64 = ?, documento_nome = ?`;
                params.push(docBase64, docNome);
            }

            updateSql += ` WHERE id = ?`;
            params.push(row.id);
            db.run(updateSql, params, () => console.log('Updated:', row.id));
        } else {
            db.run(`INSERT INTO multas_logistica (
                monaco_uuid, numero_ait, placa, data_infracao, hora_infracao,
                motivo, valor_multa, pontuacao, local_infracao, data_limite,
                status, created_by_nome, observacao, documento_base64, documento_nome
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Conferência', 'Integração Mônaco', 'Multa importada automaticamente da Mônaco via webhook.', ?, ?)`, [
                uuid, payload.numero_ait, payload.placa, payload.data_da_infracao, payload.hora_da_infracao,
                payload.descricao, payload.valor_da_infracao, payload.pontos, localInfracao, dataLimite,
                docBase64, docNome
            ], function () { console.log('Inserted:', this.lastID); });
        }
    });
}

db.all('SELECT * FROM multas_monaco', (err, rows) => {
    if (err) return;
    rows.forEach(m => {
        let payload = {
            numero_ait: m.numero_ait,
            placa: m.placa,
            data_da_infracao: m.data_da_infracao,
            hora_da_infracao: m.hora_da_infracao,
            descricao: m.descricao,
            valor_da_infracao: m.valor_da_infracao,
            pontos: m.pontos,
            local: m.local_infracao,
            cidade: m.cidade,
            prazo_identificacao_condutor: m.prazo_identificacao_condutor,
            vencimento_multa: m.vencimento_multa,
            arquivos: []
        };
        try {
            if (m.arquivos_json) {
                payload.arquivos = JSON.parse(m.arquivos_json);
            }
        } catch(e){}
        
        syncToLogistica(m.uuid, payload);
    });
});
