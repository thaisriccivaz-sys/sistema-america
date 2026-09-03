const fs = require('fs');
let code = fs.readFileSync('backend/server.js', 'utf8');

code = code.replace(
    'i.valor_vt_editado, i.valor_vr_editado, i.edited_fields, i.diasUteisVT || 0, i.faltasVTN || 0, i.extrasVT || 0, i.valor_vt || 0], function(errRun)',
    'i.valor_vt_editado, i.valor_vr_editado, i.edited_fields, (i.dias_uteis_vt !== undefined ? i.dias_uteis_vt : i.diasUteisVT) || 0, (i.faltas_vtn !== undefined ? i.faltas_vtn : (i.faltas_vt !== undefined ? i.faltas_vt : i.faltasVTN)) || 0, (i.extras_vt !== undefined ? i.extras_vt : i.extrasVT) || 0, (i.valor_vt !== undefined ? i.valor_vt : i.valorVT) || 0], function(errRun)'
);

fs.writeFileSync('backend/server.js', code);
console.log('Fixed stmt run');
