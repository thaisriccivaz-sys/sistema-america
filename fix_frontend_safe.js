/**
 * fix_frontend_safe.js — Reaplica os fixes do frontend com método seguro
 */
const fs = require('fs');
let code = fs.readFileSync('frontend/fechamento.js', 'utf8');
const orig = code.length;

// ===========================================================================
// FIX 3: aplicarPontoNaTabela — reescrever função completa
// ===========================================================================
const funcStart = '\n    function aplicarPontoNaTabela(idx, dados) {';
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
                if (htrab && oi.indexOf('horas_trabalhadas') !== -1) inp.value = htrab;
                if (faltas !== null && faltas !== undefined && oi.indexOf('dias_falta') !== -1) inp.value = faltas;
            }
            break;
        }

        // Disparar atualizar para salvar no _dados
        if (htrab) atualizar(idx, 'horas_trabalhadas', htrab);
        if (faltas !== null && faltas !== undefined) atualizar(idx, 'dias_falta', faltas);
    }`;

code = code.substring(0, idxStart) + novaFunc + code.substring(idxEnd);
console.log('✅ Fix 3: aplicarPontoNaTabela reescrita');

// ===========================================================================
// FIX 4: buscarPontoTodos — melhorar mensagem de sem cadastro
// ===========================================================================
const oldElse = "} else {\r\n                    semCadastro++;\r\n                    nomesSem.push(row.nome_completo);\r\n                }";
const newElse = "} else {\r\n                    semCadastro++;\r\n                    nomesSem.push(row.nome_completo + (dados.aviso ? ' (sem apura\u00e7\u00e3o)' : ''));\r\n                }";
const idxElse = code.indexOf(oldElse);
if (idxElse === -1) { console.log('❌ Fix 4: âncora else não encontrada, tentando sem \\r'); }
else {
    code = code.substring(0, idxElse) + newElse + code.substring(idxElse + oldElse.length);
    console.log('✅ Fix 4: buscarPontoTodos aviso');
}

fs.writeFileSync('frontend/fechamento.js', code, 'utf8');
console.log('✅ Frontend salvo, tamanho:', code.length, '(era:', orig, ')');
