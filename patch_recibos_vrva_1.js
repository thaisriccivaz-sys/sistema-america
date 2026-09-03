const fs = require('fs');
let c = fs.readFileSync('frontend/recibos.js', 'utf8');

let changes = 0;

function rep(oldStr, newStr, label) {
    if (c.includes(oldStr)) {
        const count = c.split(oldStr).length - 1;
        if (count > 1) { console.log(label + ' MULTI-MATCH (' + count + ') - SKIPPED'); return false; }
        c = c.replace(oldStr, newStr);
        changes++;
        console.log(label + ' OK');
        return true;
    }
    const altOld = oldStr.replace(/\r\n/g, '\n');
    if (c.includes(altOld)) {
        const count = c.split(altOld).length - 1;
        if (count > 1) { console.log(label + ' MULTI-MATCH LF (' + count + ') - SKIPPED'); return false; }
        c = c.replace(altOld, newStr.replace(/\r\n/g, '\n'));
        changes++;
        console.log(label + ' OK (LF)');
        return true;
    }
    console.log(label + ' MISS');
    return false;
}

// ─── 1. selsValidos loop ───
rep(
    "// VR — sempre para todos\r\n        corpo += _buildReciboBlock('VR', c, s, mes, mesNome, ano, valorVR, logo);\r\n\r\n        // VT ou VC — conforme meio_transporte cadastrado\r\n        if (_isVT(m)) { corpo += '<div class=\"pb\"></div>' + _buildReciboBlock('VT', c, s, mes, mesNome, ano, valorVR, logo); }\r\n        if (_isVC(m)) { corpo += '<div class=\"pb\"></div>' + _buildReciboBlock('VC', c, s, mes, mesNome, ano, valorVR, logo); }",
    "// VR — sempre para todos\r\n        const _vrColab = (c.folha_vr && c.folha_vr_valor > 0) ? c.folha_vr_valor : valorVR;\r\n        corpo += _buildReciboBlock('VR', c, s, mes, mesNome, ano, _vrColab, logo);\r\n\r\n        // VT ou VC — conforme meio_transporte cadastrado\r\n        if (_isVT(m)) { corpo += '<div class=\"pb\"></div>' + _buildReciboBlock('VT', c, s, mes, mesNome, ano, _vrColab, logo); }\r\n        if (_isVC(m)) { corpo += '<div class=\"pb\"></div>' + _buildReciboBlock('VC', c, s, mes, mesNome, ano, _vrColab, logo); }",
    '1. selsValidos loop VR'
);

// ─── 2. Dual PDF loop ───
rep(
    "corpo += pageDiv + _buildReciboBlock('VR', c, s, mes, mesNome, ano, valorVR, logo) + '</div>';\r\n                if (_isVT(m)) { corpo += pageDiv + _buildReciboBlock('VT', c, s, mes, mesNome, ano, valorVR, logo) + '</div>'; }\r\n                if (_isVC(m)) { corpo += pageDiv + _buildReciboBlock('VC', c, s, mes, mesNome, ano, valorVR, logo) + '</div>'; }",
    "const _vrColabD = (c.folha_vr && c.folha_vr_valor > 0) ? c.folha_vr_valor : valorVR;\r\n                corpo += pageDiv + _buildReciboBlock('VR', c, s, mes, mesNome, ano, _vrColabD, logo) + '</div>';\r\n                if (_isVT(m)) { corpo += pageDiv + _buildReciboBlock('VT', c, s, mes, mesNome, ano, _vrColabD, logo) + '</div>'; }\r\n                if (_isVC(m)) { corpo += pageDiv + _buildReciboBlock('VC', c, s, mes, mesNome, ano, _vrColabD, logo) + '</div>'; }",
    '2. Dual loop VR'
);

// ─── 3. TABLE HEADER: add VA ───
rep(
    'title="Valor Total VR">Valor<br>VR</th>\r\n        `;\r\n    }',
    'title="Valor Total VR">Valor<br>VR</th>\r\n            <th style="position:sticky;top:0;background:#fef9c3;padding:.7rem .4rem;text-align:center;color:#475569;font-weight:600;font-size:.65rem;text-transform:uppercase;letter-spacing:.04em;z-index:11;white-space:nowrap;" title="Vale Alimentação (fixo mensal)">Valor<br>VA</th>\r\n        `;\r\n    }',
    '3. VA header column'
);

// ─── 4. TABLE ROWS: add VA TD ───
rep(
    "onchange=\"window.atualizarValorEditado(${c.id},'valVREdit',this.value)\">\r\n          </td>\r\n        </tr>`;",
    "onchange=\"window.atualizarValorEditado(${c.id},'valVREdit',this.value)\">\r\n          </td>\r\n          <td style=\"padding:.45rem .2rem;text-align:center;background:#fef9c3;font-weight:700;color:${c.folha_va && c.folha_va_valor > 0 ? '#854d0e' : '#94a3b8'};font-size:.78rem;\">\r\n            ${c.folha_va && c.folha_va_valor > 0 ? 'R$\\u00a0' + _recFmt(c.folha_va_valor) : '—'}\r\n          </td>\r\n        </tr>`;",
    '4. VA TD row'
);

// ─── 5. EXCEL: add VALOR VA column ───
rep(
    "{ header: 'VALOR VR', key: 'valorVR', width: 15 }\r\n        ];",
    "{ header: 'VALOR VR', key: 'valorVR', width: 15 },\r\n            { header: 'VALOR VA', key: 'valorVA', width: 15 }\r\n        ];",
    '5. Excel VA column header'
);

// ─── 6. EXCEL: add valorVA to row data ───
rep(
    "valorVR: vr\r\n            });",
    "valorVR: vr,\r\n                valorVA: (c.folha_va && c.folha_va_valor > 0) ? c.folha_va_valor : 0\r\n            });",
    '6. Excel VA row data'
);

// ─── 7. EXCEL: add numFmt for valorVA ───
rep(
    "sheet.getColumn('valorVR').numFmt = '\"R$\" #,##0.00';",
    "sheet.getColumn('valorVR').numFmt = '\"R$\" #,##0.00';\r\n        sheet.getColumn('valorVA').numFmt = '\"R$\" #,##0.00';",
    '7. Excel VA numFmt'
);

// ─── 8. PDF VR block: add VA row after totalFinal line ───
// Very specific: VR block ends with </tbody></table></td></tr>`; then \r\n\r\n    } else if (tipo === 'VT')
// Use char positions to be sure — but let's use a unique string from VR block
// "TOTAL RECEBIDO:" only appears once. After that row closing there's </tbody></table>
// Before } else if (tipo === 'VT')
const vrTotalIdx = c.indexOf("} else if (tipo === 'VT') {");
const endOfVrBlock = c.lastIndexOf('</tbody>', vrTotalIdx);
const endOfVrLine = c.indexOf('\r\n', endOfVrBlock + 20);
// Find the backtick that closes the template literal for VR block
const backtickBeforeVT = c.lastIndexOf('`;\r\n\r\n    } else if', vrTotalIdx);
if (backtickBeforeVT > 0) {
    const oldEnd = '`;\r\n\r\n    } else if (tipo === \'VT\') {';
    const newEnd = '`;\r\n\r\n    // Vale Alimentação extra line (fora do template literal acima)\r\n    if (tipo === \'VR\' && colab.folha_va && parseFloat(colab.folha_va_valor) > 0) {\r\n        linhas += `<tr><td colspan="3" style="padding:0;"><table style="width:100%;border-collapse:collapse;"><tr style="background:#fef9c3;"><td style="padding:9px 16px;font-size:11px;font-weight:700;color:#854d0e;border-top:2px solid #f6d860;">VALE ALIMENTAÇÃO (VA):</td><td style="padding:9px 16px;text-align:right;font-size:14px;font-weight:800;color:#854d0e;border-top:2px solid #f6d860;">R$&nbsp;${_recFmt(parseFloat(colab.folha_va_valor))}</td></tr></table></td></tr>`;\r\n    }\r\n\r\n    } else if (tipo === \'VT\') {';
    // Use specific index-based replacement
    const startReplace = backtickBeforeVT;
    const endReplace = startReplace + oldEnd.length;
    const actual = c.substring(startReplace, endReplace);
    if (actual === oldEnd) {
        c = c.substring(0, startReplace) + newEnd + c.substring(endReplace);
        changes++;
        console.log('8. VA after TOTAL RECEBIDO (index-based) OK');
    } else {
        console.log('8. MISS index-based, actual:', JSON.stringify(actual.substring(0, 50)));
        // fallback: look for unique suffix
        const uniquePattern = "`;\r\n\r\n    } else if (tipo === 'VT') {\r\n        titulo    = 'RECIBO DE VALE TRANSPORTE';";
        const uniqueNew = "`;\r\n\r\n    // Vale Alimentação extra\r\n    if (tipo === 'VR' && colab.folha_va && parseFloat(colab.folha_va_valor) > 0) {\r\n        linhas += '<tr><td colspan=\"3\" style=\"padding:0;\"><table style=\"width:100%;border-collapse:collapse;\"><tr style=\"background:#fef9c3;\"><td style=\"padding:9px 16px;font-size:11px;font-weight:700;color:#854d0e;border-top:2px solid #f6d860;\">VALE ALIMENTA\\u00c7\\u00c3O (VA):</td><td style=\"padding:9px 16px;text-align:right;font-size:14px;font-weight:800;color:#854d0e;border-top:2px solid #f6d860;\">R$&nbsp;' + _recFmt(parseFloat(colab.folha_va_valor)) + '</td></tr></table></td></tr>';\r\n    }\r\n\r\n    } else if (tipo === 'VT') {\r\n        titulo    = 'RECIBO DE VALE TRANSPORTE';";
        if (c.includes(uniquePattern)) {
            c = c.replace(uniquePattern, uniqueNew);
            changes++;
            console.log('8. VA after TOTAL RECEBIDO (unique suffix) OK');
        } else {
            console.log('8. FINAL MISS - check manually');
        }
    }
}

fs.writeFileSync('frontend/recibos.js', c, 'utf8');
console.log('\nTotal changes applied:', changes, '/ 8');
