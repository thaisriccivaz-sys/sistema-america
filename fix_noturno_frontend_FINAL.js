/**
 * fix_noturno_frontend_FINAL.js
 * Versão final — substitui tudo com precisão cirúrgica baseada no texto exato do arquivo
 */
const fs = require('fs');
let code = fs.readFileSync('frontend/fechamento.js', 'utf8');
const orig = code.length;
let fixes = 0;

function replace(desc, oldStr, newStr) {
    if (code.indexOf(oldStr) !== -1) {
        code = code.replace(oldStr, newStr);
        console.log('✅', desc);
        fixes++;
    } else {
        const oldCRLF = oldStr.replace(/\n/g, '\r\n');
        if (code.indexOf(oldCRLF) !== -1) {
            code = code.replace(oldCRLF, newStr);
            console.log('✅ CRLF', desc);
            fixes++;
        } else {
            console.log('❌', desc, '— âncora não encontrada');
            // Debug: mostrar vizinhança
            const firstWord = oldStr.trim().substring(0, 40);
            const di = code.indexOf(firstWord);
            if (di !== -1) console.log('  Primeira linha encontrada em idx', di, ':', JSON.stringify(code.substring(di, di+80)));
        }
    }
}

// ── Fix 1: th Salário → display:none ──────────────────────────────────────────
replace('th Salário oculto',
    '<th style="padding:.4rem .3rem;white-space:nowrap;position:sticky;top:0;background:#1e40af;z-index:10;box-shadow:inset 0 -1px 0 #cbd5e1;text-align:center;line-height:1.3;"><strong>Sal&aacute;rio</strong><br><span style="font-size:.65rem;font-weight:400;opacity:.8;">—</span></th>',
    '<th style="display:none;"></th>'
);

// ── Fix 2: th H.Trab. → Total Noturno + Ad. Noturno ─────────────────────────
replace('th H.Trab → Total Noturno + Ad. Noturno',
    '<th style="padding:.4rem .3rem;white-space:nowrap;position:sticky;top:0;background:#1e40af;z-index:10;box-shadow:inset 0 -1px 0 #cbd5e1;text-align:center;line-height:1.3;"><strong>H.Trab.</strong><br><span style="font-size:.65rem;font-weight:400;opacity:.8;">—</span></th>',
    '<th id="fech-th-noturno" style="padding:.4rem .3rem;white-space:nowrap;position:sticky;top:0;background:#6d28d9;z-index:10;box-shadow:inset 0 -1px 0 #a78bfa;text-align:center;line-height:1.3;" title="Horas trabalhadas entre 22h e 5h"><strong>Total Noturno</strong><br><span style="font-size:.65rem;font-weight:400;opacity:.8;">HH:MM</span></th>\r\n            <th id="fech-th-adic-noturno" style="padding:.4rem .3rem;white-space:nowrap;position:sticky;top:0;background:#6d28d9;z-index:10;box-shadow:inset 0 -1px 0 #a78bfa;text-align:center;line-height:1.3;" title="Adicional noturno 20% (hora reduzida 52,5 min)"><strong>Ad. Noturno</strong><br><span style="font-size:.65rem;font-weight:400;opacity:.8;">R$</span></th>'
);

// ── Fix 3: td Salário → display:none ─────────────────────────────────────────
replace('td Salário oculto',
    '<td style="padding:.35rem .3rem;white-space:nowrap;">${fmt(row.salario)}</td>',
    '<td style="display:none;"></td>'
);

// ── Fix 4: td horas_trabalhadas → td noturno + td adic_noturno ───────────────
replace('td horas_trabalhadas → td noturno + td adic_noturno',
    '<td style="padding:.35rem .3rem;">${inpHora(idx,\'horas_trabalhadas\',row.horas_trabalhadas||\'\')}</td>',
    '<td id="fech-cell-noturno-${idx}" style="padding:.35rem .3rem;background:#f3f0ff;">${inpHora(idx,\'horas_noturnas\',row.horas_noturnas||\'\')}</td>\r\n<td id="fech-cell-adic-noturno-${idx}" style="padding:.35rem .3rem;background:#f3f0ff;">${inpValor(idx,\'adicional_noturno\',row.adicional_noturno||0)}</td>'
);

// ── Fix 5: salvarTudo — adicionar horas_noturnas e adicional_noturno ──────────
replace('salvarTudo: adicionar horas_noturnas + adicional_noturno',
    '                    horas_normais: row.horas_normais,\r\n                    horas_trabalhadas: row.horas_trabalhadas,\r\n                    extra_60: row.extra_60,',
    '                    horas_normais: row.horas_normais,\r\n                    horas_trabalhadas: row.horas_trabalhadas,\r\n                    horas_noturnas: row.horas_noturnas || null,\r\n                    adicional_noturno: row.adicional_noturno || 0,\r\n                    extra_60: row.extra_60,'
);

// ── Fix 6: aplicarPontoNaTabela — H.Normais só para intermitentes e preenchimento noturno ──
// Localizar onde preenche horas_trabalhadas após busca ponto
// Procurar a parte que preenche horas_trabalhadas na aplicarPontoNaTabela
const OLD_HTRAB_FILL = "        if (htrab) atualizar(idx, 'horas_trabalhadas', htrab);\r\n        if (faltas !== null && faltas !== undefined) atualizar(idx, 'dias_falta', faltas);";
const NEW_HTRAB_FILL = `        // H.Normais: preencher do ponto apenas para colaboradores intermitentes
        var isIntermitente = _dados[idx] && (_dados[idx].tipo_contrato || '').toLowerCase() === 'intermitente';
        if (htrab && isIntermitente) {
            _dados[idx].horas_normais = htrab;
            var inpHN = document.querySelector('#fech-cell-horas-normais-' + idx + ' input, tr[data-idx="' + idx + '"] input[data-campo="horas_normais"]');
            if (!inpHN) {
                var allInputs = document.querySelectorAll('#fech-tbody tr');
                if (allInputs[idx]) {
                    var found = Array.from(allInputs[idx].querySelectorAll('input')).find(function(i){ return (i.getAttribute('oninput')||'').indexOf('horas_normais') !== -1; });
                    if (found) inpHN = found;
                }
            }
            if (inpHN) inpHN.value = htrab;
            atualizar(idx, 'horas_normais', htrab);
        }
        // Horas noturnas (todos os colaboradores)
        if (dados.horasNoturnas) {
            _dados[idx].horas_noturnas = dados.horasNoturnas;
            var cellNot = document.getElementById('fech-cell-noturno-' + idx);
            if (cellNot) { var inpNot = cellNot.querySelector('input'); if (inpNot) inpNot.value = dados.horasNoturnas; }
            atualizar(idx, 'horas_noturnas', dados.horasNoturnas);
        }
        if (dados.adicionalNoturnoValor !== undefined && dados.adicionalNoturnoValor !== null) {
            _dados[idx].adicional_noturno = dados.adicionalNoturnoValor;
            var cellAdicNot = document.getElementById('fech-cell-adic-noturno-' + idx);
            if (cellAdicNot) { var inpAdicNot = cellAdicNot.querySelector('input'); if (inpAdicNot) inpAdicNot.value = dados.adicionalNoturnoValor; }
            atualizar(idx, 'adicional_noturno', dados.adicionalNoturnoValor);
        }
        if (faltas !== null && faltas !== undefined) atualizar(idx, 'dias_falta', faltas);`;

if (code.indexOf(OLD_HTRAB_FILL) !== -1) {
    code = code.replace(OLD_HTRAB_FILL, NEW_HTRAB_FILL);
    console.log('✅ Fix 6: aplicarPontoNaTabela — H.Normais intermitente + noturno');
    fixes++;
} else {
    // Tentar com LF
    const OLD_LF = OLD_HTRAB_FILL.replace(/\r\n/g, '\n');
    if (code.indexOf(OLD_LF) !== -1) {
        code = code.replace(OLD_LF, NEW_HTRAB_FILL);
        console.log('✅ Fix 6 LF');
        fixes++;
    } else {
        // Buscar variante
        const alt = "        if (htrab) atualizar(idx, 'horas_trabalhadas', htrab);";
        const altIdx = code.indexOf(alt);
        if (altIdx !== -1) {
            console.log('Fix 6: encontrado em idx', altIdx, '— substituindo manualmente');
            const lineEnd = code.indexOf('\n', altIdx + alt.length) + 1;
            // Pegar a linha de faltas também
            const faltasLine = "        if (faltas !== null && faltas !== undefined) atualizar(idx, 'dias_falta', faltas);";
            const faltasIdx = code.indexOf(faltasLine, lineEnd - 5);
            const faltasEnd = faltasIdx !== -1 ? code.indexOf('\n', faltasIdx) + 1 : lineEnd;
            code = code.substring(0, altIdx) + NEW_HTRAB_FILL + '\n' + code.substring(faltasEnd !== lineEnd ? faltasEnd : lineEnd);
            console.log('✅ Fix 6 manual');
            fixes++;
        } else {
            console.log('❌ Fix 6: âncora não encontrada');
        }
    }
}

// ── Fix 7: salvarSilencioso — adicionar horas_noturnas e adicional_noturno ───
replace('salvarSilencioso: adicionar horas_noturnas + adicional_noturno',
    '                horas_normais: row.horas_normais,\r\n                horas_trabalhadas: row.horas_trabalhadas,\r\n                horas_noturnas: row.horas_noturnas,',
    '                horas_normais: row.horas_normais,\r\n                horas_trabalhadas: row.horas_trabalhadas,\r\n                horas_noturnas: row.horas_noturnas,\r\n                adicional_noturno: row.adicional_noturno || 0,'
);

fs.writeFileSync('frontend/fechamento.js', code, 'utf8');
console.log('\nTotal fixes:', fixes, '/ 7');
console.log('Frontend salvo, tamanho:', code.length, '(era:', orig, ')');
