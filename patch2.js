const fs = require('fs');
let c = fs.readFileSync('frontend/resumo_rota.js', 'utf8');

c = c.replace(
    '_rrRenderCorpo();\r\n    const btnSalvar = document.getElementById(\'rr-btn-salvar\');',
    '_rrRenderCorpo();\r\n    if (typeof window._rrCapturarSnapshot === "function") window._rrCapturarSnapshot();\r\n    const btnSalvar = document.getElementById(\'rr-btn-salvar\');'
);

c = c.replace(
    '_rrRenderCorpo();\n    const btnSalvar = document.getElementById(\'rr-btn-salvar\');',
    '_rrRenderCorpo();\n    if (typeof window._rrCapturarSnapshot === "function") window._rrCapturarSnapshot();\n    const btnSalvar = document.getElementById(\'rr-btn-salvar\');'
);

fs.writeFileSync('frontend/resumo_rota.js', c);
