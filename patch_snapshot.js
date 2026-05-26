const fs = require('fs');

let c = fs.readFileSync('frontend/resumo_rota.js', 'utf8');

// 1. Remove _rrCapturarSnapshot() from the beginning of rrSalvarResumo
c = c.replace('window._rrCapturarSnapshot();\r\n    if (!_rrVeiculos.length) {', 'if (!_rrVeiculos.length) {');
c = c.replace('window._rrCapturarSnapshot();\n    if (!_rrVeiculos.length) {', 'if (!_rrVeiculos.length) {');

// 2. Add window._rrCapturarSnapshot() after rrCarregarHistorico finishes rendering
c = c.replace('_rrRenderCorpo();\r\n        const btnSalvar', '_rrRenderCorpo();\r\n        if (typeof window._rrCapturarSnapshot === "function") window._rrCapturarSnapshot();\r\n        const btnSalvar');
c = c.replace('_rrRenderCorpo();\n        const btnSalvar', '_rrRenderCorpo();\n        if (typeof window._rrCapturarSnapshot === "function") window._rrCapturarSnapshot();\n        const btnSalvar');

// 3. Add window._rrCapturarSnapshot() at the end of rrProcessarExcel
c = c.replace('_rrRenderCorpo();\r\n            document.getElementById(\'rr-btn-salvar\').style.display = \'flex\';', '_rrRenderCorpo();\r\n            if (typeof window._rrCapturarSnapshot === "function") window._rrCapturarSnapshot();\r\n            document.getElementById(\'rr-btn-salvar\').style.display = \'flex\';');
c = c.replace('_rrRenderCorpo();\n            document.getElementById(\'rr-btn-salvar\').style.display = \'flex\';', '_rrRenderCorpo();\n            if (typeof window._rrCapturarSnapshot === "function") window._rrCapturarSnapshot();\n            document.getElementById(\'rr-btn-salvar\').style.display = \'flex\';');

// 4. Add window._rrCapturarSnapshot() after _rrRegistrarAlteracoes finishes
c = c.replace('await window._rrRegistrarAlteracoes(nomeFinal);\r\n            const sel = document.getElementById(\'rr-historico-select\');', 'await window._rrRegistrarAlteracoes(nomeFinal);\r\n            if (typeof window._rrCapturarSnapshot === "function") window._rrCapturarSnapshot();\r\n            const sel = document.getElementById(\'rr-historico-select\');');
c = c.replace('await window._rrRegistrarAlteracoes(nomeFinal);\n            const sel = document.getElementById(\'rr-historico-select\');', 'await window._rrRegistrarAlteracoes(nomeFinal);\n            if (typeof window._rrCapturarSnapshot === "function") window._rrCapturarSnapshot();\n            const sel = document.getElementById(\'rr-historico-select\');');

fs.writeFileSync('frontend/resumo_rota.js', c);
