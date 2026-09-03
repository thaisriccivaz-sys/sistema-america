/**
 * fix_all_issues.js
 * 1. Fix farmácia: pdfParse is not a function → usar PDFParse class
 * 2. Fix consignado: floating point → Math.round(valor * 100) / 100
 * 3. Fix ponto: aplicarPontoNaTabela → usar lógica correta para H.Trab/Faltas
 * 4. Fix buscar ponto: tratar null em diasTrabalhados + exibir RHID horas direto
 */
const fs = require('fs');

// ===========================================================================
// FIX 1: Backend farmácia — pdfParse is not a function
// ===========================================================================
{
    let code = fs.readFileSync('backend/server.js', 'utf8');
    const oldFarm = `        const pdfParse = require('pdf-parse');
        const pdfData = await pdfParse(req.file.buffer);
        const text = pdfData.text || '';`;
    const newFarm = `        const { PDFParse } = require('pdf-parse');
        const _farmParser = new PDFParse({ verbosity: 0, data: req.file.buffer });
        const _farmData = await _farmParser.getText();
        const text = _farmData.text || '';`;
    if (code.includes(oldFarm)) {
        code = code.replace(oldFarm, newFarm);
        console.log('✅ Fix 1: farmácia PDFParse');
    } else {
        console.log('❌ Fix 1: âncora farmácia não encontrada');
    }

    // Fix 2: consignado floating point
    const oldConsig = `                grouped[cpf].valor += valorParcela;`;
    const newConsig = `                grouped[cpf].valor = Math.round((grouped[cpf].valor + valorParcela) * 100) / 100;`;
    if (code.includes(oldConsig)) {
        code = code.replace(oldConsig, newConsig);
        console.log('✅ Fix 2: consignado floating point Math.round');
    } else {
        console.log('❌ Fix 2: âncora consignado não encontrada');
    }

    // Fix 2b: também arredondar o valor total salvo no banco
    const oldConsigSave = `stmtC.run([mes, ano, cpf, data.nome, data.valor, JSON.stringify(data.detalhes)]`;
    const newConsigSave = `stmtC.run([mes, ano, cpf, data.nome, Math.round(data.valor * 100) / 100, JSON.stringify(data.detalhes)]`;
    if (code.includes(oldConsigSave)) {
        code = code.replace(oldConsigSave, newConsigSave);
        console.log('✅ Fix 2b: consignado round no save');
    } else {
        console.log('❌ Fix 2b: âncora consignado save não encontrada');
    }

    // Fix 2c: retornar também o valor arredondado no grouped e adicionar debug de CPFs
    // Adicionar log de debug antes do res.json do consignado
    const oldConsigRes = `        res.json({ ok: true, consignado: grouped });`;
    const newConsigRes = `        // Garantir que todos os valores estão arredondados no response
        Object.keys(grouped).forEach(cpf => {
            grouped[cpf].valor = Math.round(grouped[cpf].valor * 100) / 100;
        });
        const debug_cpfs = Object.keys(grouped);
        console.log('[upload-consignado] CPFs encontrados no XLSX:', debug_cpfs.join(', ').substring(0, 500));
        res.json({ ok: true, consignado: grouped, debug_cpfs });`;
    if (code.includes(oldConsigRes)) {
        code = code.replace(oldConsigRes, newConsigRes);
        console.log('✅ Fix 2c: consignado debug e arredondamento final');
    } else {
        console.log('❌ Fix 2c: âncora consignado res não encontrada');
    }

    fs.writeFileSync('backend/server.js', code, 'utf8');
    console.log('✅ Backend salvo, tamanho:', code.length);
}

// ===========================================================================
// FIX 3 & 4: Frontend — aplicarPontoNaTabela + ponto logic
// ===========================================================================
{
    let code = fs.readFileSync('frontend/fechamento.js', 'utf8');

    // Substituir toda a função aplicarPontoNaTabela
    const funcStart = '\n    function aplicarPontoNaTabela(idx, dados) {';
    const funcEnd = '\n    }'; // próximo fechamento de bloco após funcStart

    const idxStart = code.indexOf(funcStart);
    if (idxStart === -1) { console.log('❌ aplicarPontoNaTabela não encontrada'); process.exit(1); }

    // Encontrar o fim da função
    let depth = 0;
    let inFunc = false;
    let idxEnd = -1;
    for (let i = idxStart; i < code.length; i++) {
        if (code[i] === '{') { depth++; inFunc = true; }
        if (code[i] === '}') {
            depth--;
            if (inFunc && depth === 0) { idxEnd = i + 1; break; }
        }
    }
    if (idxEnd === -1) { console.log('❌ fim da função não encontrado'); process.exit(1); }

    const novaFunc = `
    function aplicarPontoNaTabela(idx, dados) {
        if (!_dados[idx]) return;

        // Extrair dados do RHID
        var diasTrab = dados.diasTrabalhados;
        var faltas   = dados.faltas;

        // Converter diasTrabalhados em HH:MM (dias × 8h)
        var htrab = '';
        if (diasTrab !== null && diasTrab !== undefined && !isNaN(diasTrab)) {
            var totalMin = Math.round(diasTrab * 8 * 60);
            var hh = Math.floor(totalMin / 60);
            var mm = totalMin % 60;
            htrab = String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0');
        }

        // Atualizar _dados em memória
        if (htrab) _dados[idx].horas_trabalhadas = htrab;
        if (faltas !== null && faltas !== undefined) _dados[idx].dias_falta = faltas;

        // Atualizar DOM: encontrar tr por data-idx
        var trEls = document.querySelectorAll('#fech-tbody tr');
        for (var ti = 0; ti < trEls.length; ti++) {
            var tr = trEls[ti];
            if (parseInt(tr.dataset.idx) !== idx) continue;

            var inputs = tr.querySelectorAll('input');
            for (var ii = 0; ii < inputs.length; ii++) {
                var inp = inputs[ii];
                var oi = inp.getAttribute('oninput') || '';
                // H.Trab (horas_trabalhadas)
                if (htrab && oi.indexOf('horas_trabalhadas') !== -1) {
                    inp.value = htrab;
                }
                // Faltas (dias_falta)
                if (faltas !== null && faltas !== undefined && oi.indexOf('dias_falta') !== -1) {
                    inp.value = faltas;
                }
            }
            break;
        }

        // Disparar atualizar para salvar no _dados
        if (htrab) atualizar(idx, 'horas_trabalhadas', htrab);
        if (faltas !== null && faltas !== undefined) atualizar(idx, 'dias_falta', faltas);
    }`;

    code = code.substring(0, idxStart) + novaFunc + code.substring(idxEnd);
    console.log('✅ Fix 3: aplicarPontoNaTabela reescrita');

    // Fix 4: buscarPontoTodos — tratar erro 400 graciosamente + checar dados.encontrado
    // Também trocar dados.success && dados.encontrado por verificação mais robusta
    const oldPontoCheck = `                if (dados.success && dados.encontrado) {
                    _dadosPonto[row.colaborador_id || row.id] = dados;
                    aplicarPontoNaTabela(idx, dados);
                    ok++;
                    nomesOk.push(row.nome_completo);
                } else {
                    semCadastro++;
                    nomesSem.push(row.nome_completo);
                }`;
    const newPontoCheck = `                if (dados.success && dados.encontrado) {
                    _dadosPonto[row.colaborador_id || row.id] = dados;
                    aplicarPontoNaTabela(idx, dados);
                    ok++;
                    nomesOk.push(row.nome_completo);
                } else if (dados.success === false || !dados.encontrado) {
                    semCadastro++;
                    nomesSem.push(row.nome_completo + (dados.aviso ? ' (' + dados.aviso.substring(0,30) + ')' : ''));
                } else {
                    semCadastro++;
                    nomesSem.push(row.nome_completo);
                }`;
    if (code.includes(oldPontoCheck)) {
        code = code.replace(oldPontoCheck, newPontoCheck);
        console.log('✅ Fix 4: buscarPontoTodos tratamento mais robusto');
    } else {
        console.log('❌ Fix 4: âncora buscarPontoTodos não encontrada');
    }

    fs.writeFileSync('frontend/fechamento.js', code, 'utf8');
    console.log('✅ Frontend salvo, tamanho:', code.length);
}
