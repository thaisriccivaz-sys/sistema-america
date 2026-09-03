/**
 * fix_noturno_frontend.js
 * 1. Ocultar coluna Salário (th + td)
 * 2. Renomear H.Trab. → Total Noturno (cor roxa)
 * 3. Adicionar coluna Ad. Noturno ao lado (mesma cor roxa)
 * 4. H.Normais: só preencher via ponto para intermitentes
 * 5. aplicarPontoNaTabela: preencher horas_noturnas e adicional_noturno
 * 6. salvarSilencioso e salvarTudo: incluir adicional_noturno
 */
const fs = require('fs');
let code = fs.readFileSync('frontend/fechamento.js', 'utf8');
const orig = code.length;

// ============================================================
// 1. Ocultar coluna Salário (th)
// ============================================================
const OLD_TH_SAL = '<th style="padding:.4rem .3rem;white-space:nowrap;position:sticky;top:0;background:#1e40af;z-index:10;box-shadow:inset 0 -1px 0 #cbd5e1;text-align:center;line-height:1.3;"><strong>Sal&aacute;rio</strong><br><span style="font-size:.65rem;font-weight:400;opacity:.8;">—</span></th>';
const NEW_TH_SAL = '<th style="display:none;"></th>';
if (code.indexOf(OLD_TH_SAL) !== -1) {
    code = code.replace(OLD_TH_SAL, NEW_TH_SAL);
    console.log('✅ Fix 1a: th Salário oculto');
} else console.log('❌ Fix 1a: th Salário não encontrado');

// ============================================================
// 2. Renomear H.Trab. → Total Noturno + adicionar Ad. Noturno
// ============================================================
const OLD_TH_HTRAB = '<th style="padding:.4rem .3rem;white-space:nowrap;position:sticky;top:0;background:#1e40af;z-index:10;box-shadow:inset 0 -1px 0 #cbd5e1;text-align:center;line-height:1.3;"><strong>H.Trab.</strong><br><span style="font-size:.65rem;font-weight:400;opacity:.8;">—</span></th>';
const NEW_TH_HTRAB = '<th id="fech-th-noturno" style="padding:.4rem .3rem;white-space:nowrap;position:sticky;top:0;background:#6d28d9;z-index:10;box-shadow:inset 0 -1px 0 #a78bfa;text-align:center;line-height:1.3;" title="Horas trabalhadas entre 22h e 5h"><strong>Total Noturno</strong><br><span style="font-size:.65rem;font-weight:400;opacity:.8;">HH:MM</span></th>\n            <th id="fech-th-adic-noturno" style="padding:.4rem .3rem;white-space:nowrap;position:sticky;top:0;background:#6d28d9;z-index:10;box-shadow:inset 0 -1px 0 #a78bfa;text-align:center;line-height:1.3;" title="Adicional noturno 20% (hora reduzida 52,5 min)"><strong>Ad. Noturno</strong><br><span style="font-size:.65rem;font-weight:400;opacity:.8;">R$</span></th>';
if (code.indexOf(OLD_TH_HTRAB) !== -1) {
    code = code.replace(OLD_TH_HTRAB, NEW_TH_HTRAB);
    console.log('✅ Fix 2: H.Trab. → Total Noturno + Ad. Noturno (roxo)');
} else console.log('❌ Fix 2: th H.Trab. não encontrado');

// ============================================================
// 3. Linha de dados: ocultar td Salário
// ============================================================
const OLD_TD_SAL = '`<td style="padding:.35rem .3rem;white-space:nowrap;">${fmt(row.salario)}</td>';
const NEW_TD_SAL = '`<td style="display:none;"></td>';
if (code.indexOf(OLD_TD_SAL) !== -1) {
    code = code.replace(OLD_TD_SAL, NEW_TD_SAL);
    console.log('✅ Fix 3: td Salário oculto');
} else {
    // Try with double backtick
    const ALT_TD_SAL = '<td style="padding:.35rem .3rem;white-space:nowrap;">${fmt(row.salario)}</td>';
    const idx = code.indexOf(ALT_TD_SAL);
    if (idx !== -1) {
        code = code.substring(0, idx) + '<td style="display:none;"></td>' + code.substring(idx + ALT_TD_SAL.length);
        console.log('✅ Fix 3: td Salário oculto (alt)');
    } else console.log('❌ Fix 3: td Salário não encontrado');
}

// ============================================================
// 4. Linha de dados: substituir td horas_trabalhadas por noturno + ad. noturno
// ============================================================
const OLD_TD_HTRAB = '<td style="padding:.35rem .3rem;">${inpHora(idx,\'horas_trabalhadas\',row.horas_trabalhadas||\'\')}</td>';
const NEW_TD_HTRAB = '<td id="fech-cell-noturno-${idx}" style="padding:.35rem .3rem;background:#f3f0ff;">${inpHora(idx,\'horas_noturnas\',row.horas_noturnas||\'\')}</td>\n<td id="fech-cell-adic-noturno-${idx}" style="padding:.35rem .3rem;background:#f3f0ff;">${inpValor(idx,\'adicional_noturno\',row.adicional_noturno||0)}</td>';
if (code.indexOf(OLD_TD_HTRAB) !== -1) {
    code = code.replace(OLD_TD_HTRAB, NEW_TD_HTRAB);
    console.log('✅ Fix 4: td horas_trabalhadas → td noturno + td adic.noturno (roxo claro)');
} else console.log('❌ Fix 4: td horas_trabalhadas não encontrado');

// ============================================================
// 5. H.Normais: só preencher do ponto se for Intermitente
// ============================================================
// Localizar na função aplicarPontoNaTabela onde preenche horas_normais e substituir
const OLD_HNORM = `        // Disparar atualizar para salvar no _dados
        if (htrab) atualizar(idx, 'horas_trabalhadas', htrab);
        if (faltas !== null && faltas !== undefined) atualizar(idx, 'dias_falta', faltas);`;
const NEW_HNORM = `        // H.Normais: só preencher via ponto para intermitentes
        var isIntermitente = _dados[idx] && (_dados[idx].tipo_contrato || '').toLowerCase() === 'intermitente';
        if (htrab && isIntermitente) {
            _dados[idx].horas_normais = htrab;
            var inpHN = document.querySelector('#fech-tbody tr[data-idx="' + idx + '"] input[oninput*="horas_normais"]');
            if (inpHN) inpHN.value = htrab;
            atualizar(idx, 'horas_normais', htrab);
        }
        // Horas noturnas e adicional noturno (de todos os colaboradores)
        if (dados.horasNoturnas) {
            _dados[idx].horas_noturnas = dados.horasNoturnas;
            var inpNot = document.querySelector('#fech-cell-noturno-' + idx + ' input');
            if (inpNot) inpNot.value = dados.horasNoturnas;
            atualizar(idx, 'horas_noturnas', dados.horasNoturnas);
        }
        if (dados.adicionalNoturnoValor) {
            _dados[idx].adicional_noturno = dados.adicionalNoturnoValor;
            var inpAdicNot = document.querySelector('#fech-cell-adic-noturno-' + idx + ' input');
            if (inpAdicNot) inpAdicNot.value = dados.adicionalNoturnoValor;
            atualizar(idx, 'adicional_noturno', dados.adicionalNoturnoValor);
        }
        // Faltas
        if (faltas !== null && faltas !== undefined) atualizar(idx, 'dias_falta', faltas);`;

if (code.indexOf(OLD_HNORM) !== -1) {
    code = code.replace(OLD_HNORM, NEW_HNORM);
    console.log('✅ Fix 5: H.Normais só para intermitentes + horas_noturnas preenchidas');
} else {
    const OLD_HNORM_CRLF = OLD_HNORM.replace(/\n/g, '\r\n');
    if (code.indexOf(OLD_HNORM_CRLF) !== -1) {
        code = code.replace(OLD_HNORM_CRLF, NEW_HNORM);
        console.log('✅ Fix 5 CRLF: horas noturnas');
    } else console.log('❌ Fix 5: âncora aplicarPontoNaTabela não encontrada');
}

// ============================================================
// 6. salvarTudo e salvarSilencioso: incluir adicional_noturno
// ============================================================
const OLD_SAVE_ITEM = `horas_normais: row.horas_normais,
                    horas_trabalhadas: row.horas_trabalhadas,
                    horas_noturnas: row.horas_noturnas,`;
const NEW_SAVE_ITEM = `horas_normais: row.horas_normais,
                    horas_trabalhadas: row.horas_trabalhadas,
                    horas_noturnas: row.horas_noturnas,
                    adicional_noturno: row.adicional_noturno || 0,`;
if (code.indexOf(OLD_SAVE_ITEM) !== -1) {
    code = code.replace(OLD_SAVE_ITEM, NEW_SAVE_ITEM);
    console.log('✅ Fix 6a: adicional_noturno no salvarTudo map');
} else {
    const OLD_CRLF = OLD_SAVE_ITEM.replace(/\n/g, '\r\n');
    if (code.indexOf(OLD_CRLF) !== -1) {
        code = code.replace(OLD_CRLF, NEW_SAVE_ITEM);
        console.log('✅ Fix 6a CRLF: adicional_noturno no salvarTudo');
    } else console.log('❌ Fix 6a: âncora salvarTudo não encontrada');
}

// salvarSilencioso também
const OLD_SILEN = `horas_normais: row.horas_normais,
                horas_trabalhadas: row.horas_trabalhadas,
                horas_noturnas: row.horas_noturnas,`;
const NEW_SILEN = `horas_normais: row.horas_normais,
                horas_trabalhadas: row.horas_trabalhadas,
                horas_noturnas: row.horas_noturnas,
                adicional_noturno: row.adicional_noturno || 0,`;
if (code.indexOf(OLD_SILEN) !== -1) {
    code = code.replace(OLD_SILEN, NEW_SILEN);
    console.log('✅ Fix 6b: adicional_noturno no salvarSilencioso');
} else {
    const OLD_SILEN_CRLF = OLD_SILEN.replace(/\n/g, '\r\n');
    if (code.indexOf(OLD_SILEN_CRLF) !== -1) {
        code = code.replace(OLD_SILEN_CRLF, NEW_SILEN);
        console.log('✅ Fix 6b CRLF: adicional_noturno no salvarSilencioso');
    } else console.log('❌ Fix 6b: âncora salvarSilencioso não encontrada');
}

fs.writeFileSync('frontend/fechamento.js', code, 'utf8');
console.log('Frontend salvo, tamanho:', code.length, '(era:', orig, ')');
