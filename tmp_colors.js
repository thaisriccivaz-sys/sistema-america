const fs = require('fs');
let code = fs.readFileSync('frontend/recibos.js', 'utf8');

// 1. Remove background colors from rows (so they are white/neutral)
// Around line 775:
code = code.replace(
  /else if \(isVerde\) \{ bg = '#dcfce7'; hoverBg = '#bbf7d0'; \}/g,
  'else if (isVerde) { bg = \'#fff\'; hoverBg = \'#f8fafc\'; }'
);
code = code.replace(
  /else if \(isVerde\) \{ bg = '#bbf7d0'; hoverBg = '#86efac'; \}/g,
  'else if (isVerde) { bg = \'#f0f9ff\'; hoverBg = \'#e0f2fe\'; }'
);

// 2. Change dynamic headers in _renderTabela
code = code.replace(
  /<th style="position:sticky;top:0;background:#f1f5f9;(.*?z-index:11;)">Meio Transp\.<\/th>/g,
  '<th style="position:sticky;top:0;background:#e0f2fe;$1">Meio Transp.</th>'
);
code = code.replace(
  /<th style="position:sticky;top:0;background:#f1f5f9;(.*?)>Folgas VT/g,
  '<th style="position:sticky;top:0;background:#e0f2fe;$1>Folgas VT'
);
code = code.replace(
  /<th style="position:sticky;top:0;background:#f1f5f9;(.*?)>Falta Transp\./g,
  '<th style="position:sticky;top:0;background:#e0f2fe;$1>Falta Transp.'
);

code = code.replace(
  /<th style="position:sticky;top:0;background:#f1f5f9;(.*?)>Jantar/g,
  '<th style="position:sticky;top:0;background:#dcfce7;$1>Jantar'
);
code = code.replace(
  /<th style="position:sticky;top:0;background:#f1f5f9;(.*?)>Folgas VR/g,
  '<th style="position:sticky;top:0;background:#dcfce7;$1>Folgas VR'
);
code = code.replace(
  /<th style="position:sticky;top:0;background:#f1f5f9;(.*?)>Faltas VR/g,
  '<th style="position:sticky;top:0;background:#dcfce7;$1>Faltas VR'
);


// 3. Change row cells
// Meio Transp cell:
code = code.replace(
  /<td style="padding:\.45rem \.4rem;text-align:center;">\n            <span style="/g,
  '<td style="padding:.45rem .4rem;text-align:center;background:#e0f2fe;">\n            <span style="'
);

// Folgas VT cell:
code = code.replace(
  /<td style="padding:\.45rem \.4rem;text-align:center;">\n            \$\{\(!_isVT\(m\) && m !== ''\) \? '<span/g,
  '<td style="padding:.45rem .4rem;text-align:center;background:#e0f2fe;">\n            ${(!_isVT(m) && m !== \'\') ? \'<span'
);

// Faltas VT cell:
code = code.replace(
  /<td style="padding:\.45rem \.4rem;text-align:center;">\n            <input type="number" min="0" max="35" value="\$\{s\.faltasVT\|\|''\}"/g,
  '<td style="padding:.45rem .4rem;text-align:center;background:#e0f2fe;">\n            <input type="number" min="0" max="35" value="${s.faltasVT||\'\'}"'
);

// Jantar cell:
code = code.replace(
  /<td style="padding:\.45rem \.4rem;text-align:center;">\n            <input type="number" min="0" max="35" value="\$\{s\.diasExtra\|\|''\}"/g,
  '<td style="padding:.45rem .4rem;text-align:center;background:#dcfce7;">\n            <input type="number" min="0" max="35" value="${s.diasExtra||\'\'}"'
);

// Folgas VR cell:
code = code.replace(
  /<td style="padding:\.45rem \.4rem;text-align:center;">\n            <input type="number" min="0" max="35" value="\$\{s\.folgasVR\|\|''\}"/g,
  '<td style="padding:.45rem .4rem;text-align:center;background:#dcfce7;">\n            <input type="number" min="0" max="35" value="${s.folgasVR||\'\'}"'
);

// Faltas VR cell:
code = code.replace(
  /<td style="padding:\.45rem \.4rem;text-align:center;">\n            <input type="number" min="0" max="35" value="\$\{s\.faltasVR\|\|''\}"/g,
  '<td style="padding:.45rem .4rem;text-align:center;background:#dcfce7;">\n            <input type="number" min="0" max="35" value="${s.faltasVR||\'\'}"'
);

fs.writeFileSync('frontend/recibos.js', code, 'utf8');
console.log('Colors replaced successfully!');
