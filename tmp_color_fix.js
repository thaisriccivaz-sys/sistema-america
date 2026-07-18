const fs = require('fs');

let code = fs.readFileSync('frontend/recibos.js', 'utf8');

// 1. Add folgasVT/faltasVT variables logic
const targetLogic = '    await Promise.all(workers);';
const replaceLogic = `    await Promise.all(workers);

    for (const c of sels) {
        const s = _recibosSelecoes[c.id];
        if (s) {
            s.folgasVT = s.folgas;
            s.faltasVT = s.faltas;
            s.folgasVR = s.folgas;
            s.faltasVR = s.faltas;
        }
    }
`;
code = code.replace(targetLogic, replaceLogic);

// 2. Replace specific background colors in table headers and cells
// Only replace in the regions that contain th or td to avoid touching _getRowColors
code = code.replace(/<th style="position:sticky;top:0;background:#e0f2fe/g, '<th style="position:sticky;top:0;background:#8aa0fe');
code = code.replace(/<td style="padding:.55rem .75rem;text-align:center;background:#e0f2fe/g, '<td style="padding:.55rem .75rem;text-align:center;background:#8aa0fe');
code = code.replace(/<td style="padding:.45rem .4rem;text-align:center;background:#e0f2fe/g, '<td style="padding:.45rem .4rem;text-align:center;background:#8aa0fe');

code = code.replace(/<th style="position:sticky;top:0;background:#dcfce7/g, '<th style="position:sticky;top:0;background:#adfca9');
code = code.replace(/<td style="padding:.45rem .4rem;text-align:center;background:#dcfce7/g, '<td style="padding:.45rem .4rem;text-align:center;background:#adfca9');

fs.writeFileSync('frontend/recibos.js', code, 'utf8');
console.log('Update finished.');
