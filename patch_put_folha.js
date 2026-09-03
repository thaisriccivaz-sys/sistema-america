const fs = require('fs');
let c = fs.readFileSync('backend/server.js', 'utf8');

// The PUT /api/colaboradores/:id has a separate 'colunas' allowlist that was missing the folha_ fields
// We need to add them after 'motorista_avaliador'
const oldPutEnd = "        'brigadista_participa', 'brigadista_validade',\r\n        'motorista_avaliador'\r\n    ];\r\n\r\n    const allowedColunas = colunas;";
const newPutEnd = "        'brigadista_participa', 'brigadista_validade',\r\n        'motorista_avaliador',\r\n        'folha_periculosidade', 'folha_periculosidade_valor',\r\n        'folha_insalubridade', 'folha_insalubridade_valor',\r\n        'folha_mensalidade_sindical', 'folha_mensalidade_sindical_valor',\r\n        'folha_pensao_tipo', 'folha_pensao_pct',\r\n        'folha_plr', 'folha_plr_valor', 'folha_plr_meses',\r\n        'academia_desconto_valor',\r\n        'folha_vr', 'folha_vr_valor',\r\n        'folha_va', 'folha_va_valor'\r\n    ];\r\n\r\n    const allowedColunas = colunas;";

if (c.includes(oldPutEnd)) {
    c = c.replace(oldPutEnd, newPutEnd);
    fs.writeFileSync('backend/server.js', c, 'utf8');
    console.log('PUT colunas list updated with folha_ fields OK');
} else {
    // try LF
    const altOld = oldPutEnd.replace(/\r\n/g, '\n');
    if (c.includes(altOld)) {
        c = c.replace(altOld, newPutEnd.replace(/\r\n/g, '\n'));
        fs.writeFileSync('backend/server.js', c, 'utf8');
        console.log('PUT colunas list updated with folha_ fields OK (LF)');
    } else {
        console.log('MISS - pattern not found');
        // debug
        const dbg = c.indexOf("'motorista_avaliador'");
        const allDbg = [];
        let pos = 0;
        while ((pos = c.indexOf("'motorista_avaliador'", pos)) !== -1) {
            allDbg.push(pos);
            pos++;
        }
        console.log("'motorista_avaliador' at:", allDbg);
        allDbg.forEach(i => console.log('Context at', i, ':', JSON.stringify(c.substring(i, i+120))));
    }
}
