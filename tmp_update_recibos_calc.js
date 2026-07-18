const fs = require('fs');
let code = fs.readFileSync('frontend/recibos.js', 'utf8');

// VR update
code = code.replace(
  /const folgas = dados\.folgas \|\| 0;/g,
  'const folgas = dados.folgasVR || 0;'
);
code = code.replace(
  /const faltas    = dados\.faltas   \|\| 0;/g,
  'const faltas    = dados.faltasVR || 0; // Use faltasVR for VR, and we will extract faltasVT in VT/VC blocks'
);

// VT update
code = code.replace(
  /const folgasVT = dados\.folgas \|\| 0;/g,
  'const folgasVT = dados.folgasVT || 0;'
);

code = code.replace(
  /const diasVT   = Math\.max\(0, 30 - folgasVT - faltas\);/g,
  'const diasVT   = Math.max(0, 30 - folgasVT - (dados.faltasVT || 0));'
);

code = code.replace(
  /const descVC   = faltas \* diariaVC;/g,
  'const faltasVC = dados.faltasVT || 0;\n        const descVC   = faltasVC * diariaVC;'
);

code = code.replace(
  /Descontos por Falta\$\{faltas !== 1 \? 's' : ''\} \(\$\{faltas\} dia\$\{faltas !== 1 \? 's' : ''\} × R\$\&nbsp;\$\{_recFmt\(diariaVC\)\}\)<\/td><td style="padding:7px 12px;border:1px solid #ddd;text-align:center;">\$\{faltas\}<\/td>/g,
  'Descontos por Falta${faltasVC !== 1 ? \\\'s\\\' : \\\'\\\'} (${faltasVC} dia${faltasVC !== 1 ? \\\'s\\\' : \\\'\\\'} × R$&nbsp;${_recFmt(diariaVC)})</td><td style="padding:7px 12px;border:1px solid #ddd;text-align:center;">${faltasVC}</td>'
);

fs.writeFileSync('frontend/recibos.js', code, 'utf8');
console.log('Calc logic updated!');
