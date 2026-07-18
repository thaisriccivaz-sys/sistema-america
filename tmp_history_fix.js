const fs = require('fs');
let code = fs.readFileSync('frontend/recibos.js', 'utf8');

const targetStr = `                    _recibosSelecoes[h.colaborador_id].folgas = h.folgas || 0;
                    _recibosSelecoes[h.colaborador_id].diasExtra = h.dias_extra;`;

const replaceStr = `                    _recibosSelecoes[h.colaborador_id].folgas = h.folgas || 0;
                    _recibosSelecoes[h.colaborador_id].folgasVT = h.folgas || 0;
                    _recibosSelecoes[h.colaborador_id].faltasVT = h.faltas || 0;
                    _recibosSelecoes[h.colaborador_id].folgasVR = h.folgas || 0;
                    _recibosSelecoes[h.colaborador_id].faltasVR = h.faltas || 0;
                    _recibosSelecoes[h.colaborador_id].diasExtra = h.dias_extra;`;

code = code.replace(targetStr, replaceStr);

fs.writeFileSync('frontend/recibos.js', code, 'utf8');
console.log('Fixed history loader for VT/VR.');
