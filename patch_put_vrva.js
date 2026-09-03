const fs = require('fs');
let c = fs.readFileSync('backend/server.js', 'utf8');

const before = "'folha_plr', 'folha_plr_valor', 'folha_plr_meses',\r\n        'academia_desconto_valor'\r\n    ];";
const after = "'folha_plr', 'folha_plr_valor', 'folha_plr_meses',\r\n        'academia_desconto_valor',\r\n        'folha_vr', 'folha_vr_valor',\r\n        'folha_va', 'folha_va_valor'\r\n    ];";

if (c.includes(before)) {
    c = c.replace(before, after);
    fs.writeFileSync('backend/server.js', c, 'utf8');
    console.log('PUT columns updated OK');
} else {
    console.log('Pattern not found');
}
