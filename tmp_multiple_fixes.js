const fs = require('fs');
let code = fs.readFileSync('frontend/recibos.js', 'utf8');

// 1. Folga limit for DSR
const targetFolga = `} else if (isFolgaSt2 || isFolgaFlag2 || isDSR2) {
                        tipo2 = hT2 >= MIN_VR ? '' : 'folga';`;
const replaceFolga = `} else if (isFolgaSt2 || isFolgaFlag2 || isDSR2) {
                        const dStr2 = String(d.date || d.dateTimeStr || '').substring(0, 10);
                        const dParsed2 = new Date(dStr2 + 'T12:00:00');
                        const dow2 = !isNaN(dParsed2) ? dParsed2.getDay() : -1;
                        const limite = (dow2 === 0) ? 120 : MIN_VR;
                        tipo2 = hT2 >= limite ? '' : 'folga';`;
code = code.replace(targetFolga, replaceFolga);

// 2. Sort columns
const targetSort = `            case 'folgas':
                valA = selA.folgas || 0;
                valB = selB.folgas || 0;
                break;
            case 'faltas':
                valA = selA.faltas || 0;
                valB = selB.faltas || 0;
                break;`;
const replaceSort = `            case 'folgas':
            case 'folgasVT':
            case 'folgasVR':
                valA = selA[_recibosSortCol] || 0;
                valB = selB[_recibosSortCol] || 0;
                break;
            case 'faltas':
            case 'faltasVT':
            case 'faltasVR':
                valA = selA[_recibosSortCol] || 0;
                valB = selB[_recibosSortCol] || 0;
                break;`;
code = code.replace(targetSort, replaceSort);

// 3. Remove \`-\` empty markers
code = code.replace(/<span style="color:#94a3b8;font-weight:600;">-<\/span>/g, '');

// 4. Remove VC text
const targetVC = "<tr><td style=\"padding:7px 12px;border:1px solid #ddd;\">Descontos por Falta${faltasVC !== 1 ? 's' : ''} (${faltasVC} dia${faltasVC !== 1 ? 's' : ''} × R$&nbsp;${_recFmt(diariaVC)})</td>";
const replaceVC = "<tr><td style=\"padding:7px 12px;border:1px solid #ddd;\">Descontos por Falta${faltasVC !== 1 ? 's' : ''}</td>";
code = code.replace(targetVC, replaceVC);

// 5. JUSTIFICADO text
code = code.replace(/FALTA\$\{faltas !== 1 \? 'S' : ''\} \/ ATESTADO\$\{faltas !== 1 \? 'S' : ''\}/g, "FALTA${faltas !== 1 ? 'S' : ''} / JUSTIFICADO${faltas !== 1 ? 'S' : ''}");

// 6. Supervisor logic
const targetProp = `            s.folgasVT = s.folgas;
            s.faltasVT = s.faltas;`;
const replaceProp = `            if (window._isSupervisao(c)) { s.faltas = 0; }
            s.folgasVT = s.folgas;
            s.faltasVT = s.faltas;`;
code = code.replace(targetProp, replaceProp);

fs.writeFileSync('frontend/recibos.js', code, 'utf8');
console.log('All modifications applied successfully.');
