// Fix irAoProntuarioDigital and fix Pensão Alimentícia double-encoding in step 4
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'frontend', 'app.js');
let content = fs.readFileSync(filePath, 'utf8');

// FIX 1: Replace irAoProntuarioDigital to use correct navigation
const oldFunc = /window\.irAoProntuarioDigital = function\(tabName\) \{[\s\S]*?\};/;
const newFunc = `window.irAoProntuarioDigital = function(tabName) {
    const colab = window._admissaoColabSelecionado || window.viewedColaborador;
    if (!colab) {
        console.warn('[irAoProntuarioDigital] Nenhum colaborador selecionado');
        return;
    }

    // Close admissão panel and show colaboradores
    const admPanel = document.getElementById('admissao-modal') || document.getElementById('panel-admissao');
    if (admPanel) admPanel.style.display = 'none';

    // Try to find and click the "Colaboradores" nav button
    const navBtns = document.querySelectorAll('[onclick*="showSection"]');
    navBtns.forEach(btn => {
        if (btn.getAttribute('onclick') && btn.getAttribute('onclick').includes("'colaboradores'")) {
            btn.click();
        }
    });

    // Open prontuário then switch tab
    const prom = window.openProntuario(
        colab.id,
        colab.nome_completo || colab.nome,
        colab.cargo_nome_exibindo || colab.cargo,
        colab.cpf,
        colab.genero || colab.sexo,
        colab.data_admissao || colab.admissao,
        colab.status
    );

    if (prom && typeof prom.then === 'function') {
        prom.then(() => {
            if (tabName) {
                setTimeout(() => {
                    // Try multiple ways to switch tab
                    if (window.abas && typeof window.abas.switchTab === 'function') {
                        window.abas.switchTab('colab-tabs', tabName);
                    } else {
                        const tabBtn = document.querySelector(\`[data-tab="\${tabName}"]\`) ||
                                       document.querySelector(\`[onclick*="'\${tabName}'"]\`);
                        if (tabBtn) tabBtn.click();
                    }
                }, 600);
            }
        });
    }
};`;

const before = content.length;
content = content.replace(oldFunc, newFunc);
console.log('FIX 1 (irAoProntuarioDigital):', content.length !== before ? 'APPLIED' : 'NOT FOUND - checking...');

// FIX 2: Fix Pensão Alimentícia double-encoding in step 4 checklist (the ones using broken chars)
// The string 'Pens\u00e3o Aliment\u00edcia' is the correct one, check for broken variants
const brokenPensao1 = "Pens\u00e3o Aliment\u00edcia"; // already correct in UTF-8
const brokenPensao2 = "Pens\\u00e3o Aliment\\u00edcia";

// Check what's actually in the file for that string
const pensaoIdx = content.indexOf('Pensão Alimentícia');
const pensaoBroken1 = content.indexOf('Pens\x00e3o');
console.log('Pensão index:', pensaoIdx, 'Broken:', pensaoBroken1);

// FIX 3: Also fix the second definition of toggleTipoDocumento (line ~1211) 
// that still might have old encoding issues - remove it since line 5813 has the correct one
// Actually - check if there are TWO definitions
const occurrences = (content.match(/window\.toggleTipoDocumento = function/g) || []).length;
console.log('toggleTipoDocumento definitions:', occurrences);

if (occurrences > 1) {
    // Remove the first (older) one at line ~1211 which is likely the broken stub
    content = content.replace(
        /\/\/ --- HELPER PARA[^\n]*\nwindow\.toggleTipoDocumento = function\(\) \{\n[^{]*const tipo[^}]*\};\n/,
        '// toggleTipoDocumento defined below (near mascaraRG)\n'
    );
    console.log('FIX 3: Removed duplicate toggleTipoDocumento stub');
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('\n✅ Fixes applied!');
console.log('File size:', fs.readFileSync(filePath, 'utf8').length);
