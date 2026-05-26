const fs = require('fs');

let c = fs.readFileSync('server.js', 'utf8');

const target1 = `        let docBase64 = null;
        let docNome = null;
        if (payload.arquivos && payload.arquivos.length > 0) {
            const arq = payload.arquivos[0];
            if (arq.base64) {
                docBase64 = arq.base64;
                docNome = arq.nome || 'anexo_monaco.pdf';
            }
        }`;

const replace1 = `        let docBase64 = null;
        let docNome = null;
        let linkIndicacao = payload.link_indicacao || payload.link_indicacao_condutor || payload.url_indicacao || payload.link_formulario || payload.link || null;

        if (payload.arquivos && payload.arquivos.length > 0) {
            const arq = payload.arquivos[0];
            const b64 = arq.base64 || arq.arquivo || arq.conteudo || arq.content;
            if (b64) {
                docBase64 = b64;
                docNome = arq.nome || 'anexo_monaco.pdf';
            } else if (arq.url && !linkIndicacao) {
                linkIndicacao = arq.url;
            }
        }`;

c = c.replace(target1, replace1);

const target2 = `            // Só atualiza PDF se a multa não tiver um PDF anexado manualmente
            if (docBase64 && !row.documento_base64 && !row.documento_path) {
                updateSql += \`, documento_base64 = ?, documento_nome = ?\`;
                params.push(docBase64, docNome);
            }`;

const replace2 = `            if (linkIndicacao) {
                updateSql += \`, link_formulario = ?\`;
                params.push(linkIndicacao);
            }

            // Só atualiza PDF se a multa não tiver um PDF anexado manualmente
            if (docBase64 && !row.documento_base64 && !row.documento_path) {
                updateSql += \`, documento_base64 = ?, documento_nome = ?\`;
                params.push(docBase64, docNome);
            }`;

c = c.replace(target2, replace2);

const target3 = `            db.run(\`INSERT INTO multas_logistica (
                monaco_uuid, numero_ait, placa, data_infracao, hora_infracao,
                motivo, valor_multa, pontuacao, local_infracao, data_limite,
                status, created_by_nome, observacao, documento_base64, documento_nome, status_monaco
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Conferência', 'Integração Mônaco', 'Multa importada automaticamente da Mônaco via webhook.', ?, ?, ?)\`, [
                uuid, payload.numero_ait, payload.placa, payload.data_da_infracao, payload.hora_da_infracao,
                payload.descricao, payload.valor_da_infracao, payload.pontos, localInfracao, dataLimite,
                docBase64, docNome, statusMonaco
            ], function (errInsert) {`;

const replace3 = `            db.run(\`INSERT INTO multas_logistica (
                monaco_uuid, numero_ait, placa, data_infracao, hora_infracao,
                motivo, valor_multa, pontuacao, local_infracao, data_limite,
                status, created_by_nome, observacao, documento_base64, documento_nome, status_monaco, link_formulario
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Conferência', 'Integração Mônaco', 'Multa importada automaticamente da Mônaco via webhook.', ?, ?, ?, ?)\`, [
                uuid, payload.numero_ait, payload.placa, payload.data_da_infracao, payload.hora_da_infracao,
                payload.descricao, payload.valor_da_infracao, payload.pontos, localInfracao, dataLimite,
                docBase64, docNome, statusMonaco, linkIndicacao
            ], function (errInsert) {`;

c = c.replace(target3, replace3);

fs.writeFileSync('server.js', c);
console.log('Feito.');
