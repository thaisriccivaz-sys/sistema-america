/**
 * fix_all_critical.js
 * 1. Fix mercado: text.match is not a function (PDFParse.getText() retorna objeto, não string)
 * 2. Fix multas: query SQL filtrar status do banco real + não exigir parcelas
 * 3. Frontend: mostrar eye buttons ao carregar mes/ano se há dados
 */
const fs = require('fs');

// ===========================================================================
// FIX 1: Backend — mercado pdfParse getText() retorna objeto, extrair .text
// ===========================================================================
{
    let code = fs.readFileSync('backend/server.js', 'utf8');
    const orig = code.length;

    // Substituir o bloco problemático do mercado PDF parser
    const oldParse = `            try {
                const pdfParse = require('pdf-parse');
                // The prompt says: const { PDFParse } = require('pdf-parse'); const parser = new PDFParse({ verbosity: 0, data: buf }); const pdfData = await parser.getText();
                // However, pdf-parse is usually a function. Let's try both:
                if (typeof pdfParse === 'function') {
                    const pdfData = await pdfParse(file.buffer);
                    text = pdfData.text;
                } else if (pdfParse.PDFParse) {
                    const parser = new pdfParse.PDFParse({ verbosity: 0, data: file.buffer });
                    text = await parser.getText();
                } else {
                    const pdfData = await pdfParse(file.buffer);
                    text = pdfData.text;
                }
            } catch (e) {
                console.error('Erro ao parsear PDF do mercado:', e);
            }`;

    const newParse = `            try {
                const { PDFParse } = require('pdf-parse');
                const _mercParser = new PDFParse({ verbosity: 0, data: file.buffer });
                const _mercData = await _mercParser.getText();
                // getText() retorna objeto { text: '...' } — garantir que é string
                text = (typeof _mercData === 'string') ? _mercData : (_mercData.text || '');
            } catch (e) {
                console.error('Erro ao parsear PDF do mercado:', e.message);
                text = '';
            }`;

    if (code.indexOf(oldParse) !== -1) {
        code = code.replace(oldParse, newParse);
        console.log('✅ Fix 1: mercado PDFParse getText → extract .text string');
    } else {
        // Tentar âncora alternativa (com CRLF)
        const oldParseCRLF = oldParse.replace(/\n/g, '\r\n');
        if (code.indexOf(oldParseCRLF) !== -1) {
            code = code.replace(oldParseCRLF, newParse);
            console.log('✅ Fix 1 (CRLF): mercado PDFParse getText → extract .text string');
        } else {
            console.log('❌ Fix 1: âncora não encontrada — tentando localização manual');
            // Localizar por linha única
            const anchor1 = "const pdfParse = require('pdf-parse');\r\n                // The prompt says:";
            const anchor1LF = "const pdfParse = require('pdf-parse');\n                // The prompt says:";
            const idx1 = code.indexOf(anchor1) !== -1 ? code.indexOf(anchor1) : code.indexOf(anchor1LF);
            if (idx1 !== -1) {
                // Encontrar fim do bloco try{}catch{}
                let depth = 0; let started = false; let endIdx = -1;
                for (let i = idx1 - 20; i < code.length; i++) {
                    if (code[i] === '{') { depth++; started = true; }
                    if (code[i] === '}') { depth--; if (started && depth === 0) { endIdx = i + 1; break; } }
                }
                if (endIdx !== -1) {
                    // Encontrar o catch correspondente
                    const catchStart = code.indexOf('} catch (e) {', idx1);
                    const catchEnd = code.indexOf('\n            }', catchStart) + '\n            }'.length;
                    code = code.substring(0, idx1 - 30) + `try {\r\n                const { PDFParse } = require('pdf-parse');\r\n                const _mercParser = new PDFParse({ verbosity: 0, data: file.buffer });\r\n                const _mercData = await _mercParser.getText();\r\n                text = (typeof _mercData === 'string') ? _mercData : (_mercData.text || '');\r\n            } catch (e) {\r\n                console.error('Erro ao parsear PDF do mercado:', e.message);\r\n                text = '';\r\n            }` + code.substring(catchEnd);
                    console.log('✅ Fix 1 (manual): mercado parser substituído');
                }
            }
        }
    }

    // Fix multas: remover filtro de status e flexibilizar parcelas
    const oldMultasQuery = `WHERE m.tipo_resolucao = 'desconto_folha'
            AND m.parcelas > 0
            AND m.status IN ('Aceita', 'Assinada', 'Processada', 'aceita', 'assinada')
            AND m.valor_multa IS NOT NULL\``;
    const newMultasQuery = `WHERE m.tipo_resolucao = 'desconto_folha'
            AND m.valor_multa IS NOT NULL
            AND m.status NOT IN ('Cancelada', 'cancelada', 'Rejeitada', 'rejeitada', 'Negada', 'negada')\``;

    if (code.indexOf(oldMultasQuery) !== -1) {
        code = code.replace(oldMultasQuery, newMultasQuery);
        console.log('✅ Fix 2: multas query flexibilizada (sem filtro de status rígido)');
    } else {
        const oldCRLF = oldMultasQuery.replace(/\n/g, '\r\n');
        if (code.indexOf(oldCRLF) !== -1) {
            code = code.replace(oldCRLF, newMultasQuery);
            console.log('✅ Fix 2 (CRLF): multas query flexibilizada');
        } else {
            console.log('❌ Fix 2: âncora multas não encontrada');
        }
    }

    // Fix multas: tratar parcelas = 0 como 1 parcela (parcela única)
    const oldParcelas = `            const numParcelas = parseInt(m.parcelas) || 1;`;
    const newParcelas = `            const numParcelas = parseInt(m.parcelas) > 0 ? parseInt(m.parcelas) : 1;`;
    if (code.indexOf(oldParcelas) !== -1) {
        code = code.replace(oldParcelas, newParcelas);
        console.log('✅ Fix 2b: multas parcelas 0 → 1');
    }

    fs.writeFileSync('backend/server.js', code, 'utf8');
    console.log('Backend salvo, tamanho:', code.length, '(era:', orig, ')');
}

// ===========================================================================
// FIX 3: Frontend — mostrar eye buttons ao carregar se há dados persistidos
// ===========================================================================
{
    let code = fs.readFileSync('frontend/fechamento.js', 'utf8');

    // Localizar a função que processa os dados ao buscar (renderizarTabela ou depois do buscar)
    // Após _dados ser preenchido, verificar se qualquer farmácia/consignado/mercado > 0
    // A função que carrega os dados é chamada após a API /api/fechamento/mes/:ano/:mes retornar

    // Encontrar onde _dados é preenchido com os dados vindos do server
    const anchorDados = "_dados = json.map(row => ({";
    const idxDados = code.indexOf(anchorDados);
    if (idxDados === -1) {
        console.log('❌ Fix 3: âncora _dados = json.map não encontrada');
    } else {
        // Encontrar o fim do bloco de carregamento de dados (após renderizarTabela())
        const anchorRender = "renderizarTabela(_dados);";
        const idxRender = code.indexOf(anchorRender, idxDados);
        if (idxRender === -1) {
            console.log('❌ Fix 3: âncora renderizarTabela não encontrada');
        } else {
            const after = idxRender + anchorRender.length;
            // Inserir código para mostrar eye buttons se houver dados
            const eyeCheckCode = `\r\n            // Mostrar botões de olho se houver dados persistidos para este mês\r\n            (function() {\r\n                var temFarm = _dados.some(function(r) { return parseFloat(r.farmacia) > 0; });\r\n                var temCons = _dados.some(function(r) { return parseFloat(r.consignado) > 0; });\r\n                var temMerc = _dados.some(function(r) { return parseFloat(r.mercado) > 0; });\r\n                if (temFarm) { _stateArquivos.farmacia = true; var b = document.getElementById('fech-btn-eye-farmacia'); if (b) b.style.display = 'inline-flex'; }\r\n                if (temCons) { _stateArquivos.consignado = true; var b = document.getElementById('fech-btn-eye-consignado'); if (b) b.style.display = 'inline-flex'; }\r\n                if (temMerc) { _stateArquivos.mercado_pdfs = true; var b = document.getElementById('fech-btn-eye-mercado'); if (b) b.style.display = 'inline-flex'; }\r\n            })();`;

            code = code.substring(0, after) + eyeCheckCode + code.substring(after);
            console.log('✅ Fix 3: eye buttons restaurados após buscar mes/ano');
        }
    }

    // Fix 4: verFarmácia e verConsignado mostrar resumo dos dados em vez de "importado nesta sessão"
    const oldVerFarm = `Swal.fire({ icon: 'success', title: 'Farmácia', text: 'Arquivo importado com sucesso nesta sessão.' });`;
    const newVerFarm = `var resumoFarm = _dados.filter(function(r) { return parseFloat(r.farmacia) > 0; });
        var linhas = resumoFarm.map(function(r) { return r.nome_completo + ': R$ ' + parseFloat(r.farmacia).toFixed(2); }).join('<br>');
        var total = resumoFarm.reduce(function(s, r) { return s + parseFloat(r.farmacia); }, 0);
        Swal.fire({ icon: 'info', title: 'Farmácia — ' + resumoFarm.length + ' colaboradores', html: '<div style="text-align:left;font-size:.8rem;max-height:300px;overflow:auto;">' + linhas + '</div><br><strong>Total: R$ ' + total.toFixed(2) + '</strong>', width: 500 });`;

    if (code.indexOf(oldVerFarm) !== -1) {
        code = code.replace(oldVerFarm, newVerFarm);
        console.log('✅ Fix 4: verFarmácia mostra resumo dos dados');
    } else {
        console.log('❌ Fix 4: âncora verFarmácia não encontrada');
    }

    const oldVerCons = `Swal.fire({ icon: 'success', title: 'Consignado', text: 'Planilha importada com sucesso nesta sessão.' });`;
    const newVerCons = `var resumoCons = _dados.filter(function(r) { return parseFloat(r.consignado) > 0; });
        var linhasCons = resumoCons.map(function(r) { return r.nome_completo + ': R$ ' + parseFloat(r.consignado).toFixed(2); }).join('<br>');
        var totalCons = resumoCons.reduce(function(s, r) { return s + parseFloat(r.consignado); }, 0);
        Swal.fire({ icon: 'info', title: 'Consignado — ' + resumoCons.length + ' colaboradores', html: '<div style="text-align:left;font-size:.8rem;max-height:300px;overflow:auto;">' + linhasCons + '</div><br><strong>Total: R$ ' + totalCons.toFixed(2) + '</strong>', width: 500 });`;

    if (code.indexOf(oldVerCons) !== -1) {
        code = code.replace(oldVerCons, newVerCons);
        console.log('✅ Fix 4b: verConsignado mostra resumo dos dados');
    } else {
        console.log('❌ Fix 4b: âncora verConsignado não encontrada');
    }

    fs.writeFileSync('frontend/fechamento.js', code, 'utf8');
    console.log('Frontend salvo, tamanho:', code.length);
}
