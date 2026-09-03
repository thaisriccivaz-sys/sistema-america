const fs = require('fs');
let c = fs.readFileSync('frontend/recibos.js', 'utf8');

// Fix the TOTAL RECEBIDO pattern for VR block
// The actual block ends with: </tr>\n      </tbody>\n    </table>\n  </td>\n</tr>`;
const oldTotalRec = "TOTAL RECEBIDO:</td>\r\n          <td colspan=\"2\" style=\"padding:9px 12px;border:1px solid #1e3a5f;text-align:right;font-size:1.05rem;\">R$&nbsp;${_recFmt(totalFinal)}</td>\r\n        </tr>\r\n      </tbody>\r\n    </table>\r\n  </td>\r\n</tr>`;\r\n\r\n    } else if (tipo === 'VT') {";
const newTotalRec = "TOTAL RECEBIDO:</td>\r\n          <td colspan=\"2\" style=\"padding:9px 12px;border:1px solid #1e3a5f;text-align:right;font-size:1.05rem;\">R$&nbsp;${_recFmt(totalFinal)}</td>\r\n        </tr>\r\n      </tbody>\r\n    </table>\r\n  </td>\r\n</tr>\r\n${(colab.folha_va && parseFloat(colab.folha_va_valor) > 0) ? `<tr><td colspan=\"3\" style=\"padding:0;\"><table style=\"width:100%;border-collapse:collapse;\"><tr style=\"background:#fef9c3;\"><td style=\"padding:9px 16px;font-size:11px;font-weight:700;color:#854d0e;letter-spacing:.03em;\">VALE ALIMENTAÇÃO (VA):</td><td style=\"padding:9px 16px;text-align:right;font-size:14px;font-weight:800;color:#854d0e;\">R$&nbsp;${_recFmt(parseFloat(colab.folha_va_valor))}</td></tr></table></td></tr>` : ''}`;\r\n\r\n    } else if (tipo === 'VT') {";

if (c.includes(oldTotalRec)) {
    c = c.replace(oldTotalRec, newTotalRec);
    console.log('8. VA line after TOTAL RECEBIDO OK (CRLF)');
} else {
    // Try LF
    const altOld = oldTotalRec.replace(/\r\n/g, '\n');
    const altNew = newTotalRec.replace(/\r\n/g, '\n');
    if (c.includes(altOld)) {
        c = c.replace(altOld, altNew);
        console.log('8. VA line after TOTAL RECEBIDO OK (LF)');
    } else {
        console.log('8. STILL MISS - checking exact bytes:');
        const idx = c.indexOf('TOTAL RECEBIDO:');
        console.log('at char:', idx, JSON.stringify(c.substring(idx - 10, idx + 400)));
    }
}

fs.writeFileSync('frontend/recibos.js', c, 'utf8');
