const fs = require('fs');
let app = fs.readFileSync('frontend/app.js', 'utf8');

// =====================================================
// 1. Replace populateSantanderPreview to also update step-2-pc
// =====================================================
const OLD_POPULATE = `window.populateSantanderPreview = function() {
    // Apenas mostra log se já foi gerado antes
    const colab = viewedColaborador || window._admissaoColabSelecionado;
    if (!colab) return;
    const log = document.getElementById('santander-status-log');
    const logText = document.getElementById('santander-status-text');
    const dataSantander = colab.santander_ficha_data;
    if (dataSantander && log) {
        log.style.display = 'block';
        if (logText) logText.textContent = \`Ficha gerada em \${new Date(dataSantander).toLocaleString('pt-BR')}\`;
    }
};`;

const NEW_POPULATE = `// Helper: atualiza toda a UI do Step 2 Santander com base no estado atual
window._updateSantanderStepUI = function(dataSantander) {
    const log = document.getElementById('santander-status-log');
    const logText = document.getElementById('santander-status-text');
    const elPc = document.getElementById('step-2-pc');
    const stepEl = document.getElementById('step-2');

    if (dataSantander && log) {
        log.style.display = 'block';
        if (logText) {
            const dt = new Date(dataSantander);
            logText.textContent = \`Ficha gerada em \${dt.toLocaleString('pt-BR')}\`;
        }
        // Marcar step 2 como 100%
        if (elPc) {
            elPc.textContent = '100%';
            elPc.style.color = '#22c55e';
        }
        if (stepEl) {
            stepEl.classList.add('completed');
            const iconEl = stepEl.querySelector('.step-icon');
            if (iconEl) iconEl.style.background = '#22c55e';
            const numEl = stepEl.querySelector('.num');
            if (numEl) numEl.style.display = 'none';
            const pcEl = stepEl.querySelector('.percent');
            if (pcEl) { pcEl.style.display = 'block'; pcEl.textContent = '100%'; }
        }
    }
};

window.populateSantanderPreview = function() {
    // Mostra log + atualiza step 2 se já foi gerado antes
    const colab = viewedColaborador || window._admissaoColabSelecionado;
    if (!colab) return;
    
    // Mesmo se colab em memória não tem, busca no servidor via campo de admissão
    const dataSantander = colab.santander_ficha_data;
    window._updateSantanderStepUI(dataSantander);
};`;

if (app.includes(OLD_POPULATE)) {
    app = app.replace(OLD_POPULATE, NEW_POPULATE);
    console.log('✅ populateSantanderPreview replaced');
} else {
    console.log('❌ OLD_POPULATE not found - trying partial match...');
    const idx = app.indexOf('window.populateSantanderPreview = function()');
    console.log('Partial index:', idx);
}

// =====================================================
// 2. In gerarFichaSantander: replace the manual step-2-pc update
//    with a call to _updateSantanderStepUI
// =====================================================
const OLD_STEP_UPDATE = `        // Atualizar visual da interface para 100% no step 2 se tiver função compatível (do fix_admissao)
        if (window._admissaoChecklist && window._admissaoChecklist[colab.id]) {
            window._admissaoChecklist[colab.id]['santander'] = 100;
            // Opcional: Atualizar a exibição das bolinhas de progresso
            const elPc = document.getElementById('step-2-pc');
            if (elPc) {
                 elPc.innerHTML = '<i class="ph ph-check" style="font-size:12px"></i>';
                 elPc.style.background = '#22c55e';
            }
            window._recalculateAdmissaoFinalProg();
        }`;

const NEW_STEP_UPDATE = `        // Atualizar visual do Step 2 para 100% (sempre, independente de _admissaoChecklist)
        window._updateSantanderStepUI(colab.santander_ficha_data);`;

if (app.includes(OLD_STEP_UPDATE)) {
    app = app.replace(OLD_STEP_UPDATE, NEW_STEP_UPDATE);
    console.log('✅ step-2 percent update replaced');
} else {
    console.log('❌ OLD_STEP_UPDATE not found');
    // Try to find a close match
    const idx = app.indexOf('_admissaoChecklist[colab.id]');
    console.log('Partial index:', idx);
}

fs.writeFileSync('frontend/app.js', app);
console.log('Done. File size:', app.length);
