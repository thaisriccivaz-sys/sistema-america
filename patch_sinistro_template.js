const fs = require('fs');

const file = 'backend/server.js';
let content = fs.readFileSync(file, 'utf8');

const search = `        const geradorNome = 'Sinistro - ' + sin.tipo_sinistro;
        let gerador = await new Promise((resolve) => db.get('SELECT * FROM geradores WHERE nome = ?', [geradorNome], (e, r) => resolve(r)));
        
        let template = '';
        if(!gerador) {
            template = "<h2 style='text-align:center;'>TERMO DE RESPONSABILIDADE - SINISTRO</h2>"
                     + "<p><strong>Colaborador:</strong> {NOME_COMPLETO}</p>"
                     + "<p><strong>Tipo de Sinistro:</strong> " + sin.tipo_sinistro + "</p>"
                     + "<p><strong>BO:</strong> " + sin.numero_boletim + " - " + sin.data_hora + "</p>"
                     + "<p><strong>Placa/Veículo:</strong> " + sin.placa + " / " + sin.veiculo + "</p>"
                     + "<p><strong>Condições de Desconto:</strong> " + sin.parcelas + "x de " + (sin.valor_parcela || 'R$ 0,00') + "</p>"
                     + "<br/><br/><br/>";
        } else {
            template = gerador.conteudo;
        }

        // Substuicoes padroes (colab)
        let htmlFinal = template.replace(/\\{NOME_COMPLETO\\}/g, colab.nome_completo || colab.nome || '');
        htmlFinal = htmlFinal.replace(/\\{CPF\\}/g, colab.cpf || '');
        // O body deve ir formatado com HTML completo
        htmlFinal = \`<html><head><style>body{font-family:Arial,sans-serif;padding:30px;}</style></head><body>\` + htmlFinal + \`</body></html>\`;`;

const replace = `        // O tipo_sinistro mapeia pro nome do gerador
        const geradorNome = '%' + (sin.tipo_sinistro || '').trim() + '%';
        let gerador = await new Promise((resolve) => db.get('SELECT * FROM geradores WHERE nome LIKE ? AND nome LIKE "%Sinistro%"', [geradorNome], (e, r) => resolve(r)));
        
        let template = '';
        if(!gerador) {
            template = "<h2 style='text-align:center;'>TERMO DE RESPONSABILIDADE - SINISTRO</h2>"
                     + "<p><strong>Colaborador:</strong> {NOME_COMPLETO}</p>"
                     + "<p><strong>Tipo de Sinistro:</strong> " + sin.tipo_sinistro + "</p>"
                     + "<p><strong>BO:</strong> " + sin.numero_boletim + " - " + sin.data_hora + "</p>"
                     + "<p><strong>Placa/Veículo:</strong> " + sin.placa + " / " + sin.veiculo + "</p>"
                     + "<p><strong>Condições de Desconto:</strong> " + sin.parcelas + "x de " + (sin.valor_parcela || '0,00') + "</p>"
                     + "<br/><br/><br/>";
        } else {
            template = gerador.conteudo;
        }

        // Substuicoes avancadas
        let htmlFinal = template;
        const colabNome = (colab.nome_completo || colab.nome || '').toUpperCase();
        
        htmlFinal = htmlFinal.replace(/\\{NOME_COMPLETO\\}|\\{NOME_COLABORADOR\\}|\\{NOME_DO_COLABORADOR\\}/gi, colabNome);
        htmlFinal = htmlFinal.replace(/\\{CPF\\}/gi, colab.cpf || '');
        htmlFinal = htmlFinal.replace(/\\{RG\\}/gi, colab.rg || '');
        
        // Dados do Sinistro
        htmlFinal = htmlFinal.replace(/\\{SINISTRO_BO\\}|\\{BO_NUMERO\\}/gi, sin.numero_boletim || '');
        htmlFinal = htmlFinal.replace(/\\{SINISTRO_DATA\\}|\\{DATA_BO\\}/gi, sin.data_hora || '');
        htmlFinal = htmlFinal.replace(/\\{SINISTRO_PLACA\\}|\\{PLACA\\}|\\{PLACA_MODELO\\}/gi, sin.placa || '');
        htmlFinal = htmlFinal.replace(/\\{SINISTRO_VEICULO\\}|\\{VEICULO\\}/gi, sin.veiculo || '');
        htmlFinal = htmlFinal.replace(/\\{SINISTRO_PARCELAS\\}|\\{QTDE_PARCELAS\\}/gi, sin.parcelas || '');
        htmlFinal = htmlFinal.replace(/\\{SINISTRO_VALOR_PARCELA\\}|\\{VALOR_PARCELA\\}/gi, sin.valor_parcela || '');
        htmlFinal = htmlFinal.replace(/\\{SINISTRO_TIPO\\}|\\{TIPO_SINISTRO\\}/gi, sin.tipo_sinistro || '');
        htmlFinal = htmlFinal.replace(/\\{SINISTRO_CONDICOES\\}|\\{DESCRICAO_DESCONTO\\}/gi, \`\${sin.parcelas || 1}x de \${sin.valor_parcela || ''}\`);

        // O body deve ir formatado com HTML completo
        htmlFinal = \`<html><head><style>body{font-family:Arial,sans-serif;padding:30px;}</style></head><body>\` + htmlFinal + \`</body></html>\`;`;


// Remove possible carriage returns to make string replacement work smoothly
content = content.replace(/\r\n/g, '\n');
let s1 = search.replace(/\r\n/g, '\n');

// Also try replacing without matching exact symbols for Veículo:
content = content.replace(s1, replace);
content = content.replace(s1.replace('Placa/Veículo', 'Placa/Veculo'), replace);

fs.writeFileSync(file, content, 'utf8');
console.log('Template logic patched!');
