/**
 * patch_stepper_step2.js — corrige o comportamento do Step 2 (Santander) no stepper de admissão
 */
const fs = require('fs');
const path = require('path');
const appPath = path.join(__dirname, 'frontend', 'app.js');
let app = fs.readFileSync(appPath, 'utf8');

// Substituir a função _updateSantanderStepUI inteira
// A versão antiga usava style inline que conflitava com as classes CSS do stepper
// e escondia o número incorretamente

const OLD_FN = `window._updateSantanderStepUI = function(dataSantander) {
    var log = document.getElementById('santander-status-log');
    var logText = document.getElementById('santander-status-text');

    if (!dataSantander) return;

    // Mostrar bloco verde
    if (log) log.style.display = 'block';
    if (logText) {
        try {
            var dt = new Date(dataSantander);
            logText.textContent = 'Ficha gerada em ' + dt.toLocaleString('pt-BR');
        } catch(e) { logText.textContent = 'Ficha gerada'; }
    }

    // === Marcar step 2 como 100% ===
    // Estratégia 1: element com id step-2-pc
    var elPc = document.getElementById('step-2-pc');
    if (elPc) elPc.textContent = '100%';

    // Estratégia 2: o step-item do stepper (bolinha)
    var stepEl = document.getElementById('step-2');
    if (stepEl) {
        // Checar em diferentes estilos de stepper
        var iconEl = stepEl.querySelector('.step-icon, .step-circle, .stepper-circle');
        if (iconEl) {
            iconEl.style.background = '#22c55e';
            iconEl.style.borderColor = '#22c55e';
            iconEl.style.color = '#fff';
        }
        var numEl = stepEl.querySelector('.num, .step-number');
        if (numEl) numEl.style.display = 'none';
        var pcEl = stepEl.querySelector('.percent, .step-percent, .pc');
        if (pcEl) { pcEl.style.display = 'inline'; pcEl.textContent = '100%'; }
    }

    // Estratégia 3: procurar qualquer elemento que contenha "step-2" e "pc"
    var allPc = document.querySelectorAll('[id*="step"][id*="pc"]');
    allPc.forEach(function(el) {
        if (el.id === 'step-2-pc' || el.id.match(/step.?2.?pc/i)) {
            el.textContent = '100%';
        }
    });
}`;

const NEW_FN = `window._updateSantanderStepUI = function(dataSantander) {
    var log = document.getElementById('santander-status-log');
    var logText = document.getElementById('santander-status-text');

    if (!dataSantander) return;

    // Mostrar bloco verde com data de geração
    if (log) log.style.display = 'block';
    if (logText) {
        try {
            var dt = new Date(dataSantander);
            logText.textContent = 'Ficha gerada em ' + dt.toLocaleString('pt-BR');
        } catch(e) { logText.textContent = 'Ficha gerada'; }
    }

    // Atualizar o badge de percentual do step 2 para 100%
    var elPc = document.getElementById('step-2-pc');
    if (elPc) elPc.textContent = '100%';

    // Usar APENAS o sistema de classes CSS (pc-success) — NUNCA style inline.
    // Os estilos inline conflitam com a regra .step-item.active:not(.pc-success) do CSS
    // e apagam o verde ao clicar no step.
    var stepEl = document.getElementById('step-2');
    if (stepEl) {
        stepEl.classList.remove('pc-warning');
        stepEl.classList.add('pc-success');

        // Garantir que o número NUNCA seja escondido
        var numEl = stepEl.querySelector('.num');
        if (numEl) numEl.style.removeProperty('display');

        // Remover quaisquer estilos inline residuais no ícone
        var iconEl = stepEl.querySelector('.step-icon');
        if (iconEl) {
            iconEl.style.removeProperty('background');
            iconEl.style.removeProperty('border-color');
            iconEl.style.removeProperty('color');
        }
    }

    // Acionar recálculo geral para manter todos os steps consistentes
    if (typeof updateAdmissaoStepPercentages === 'function') {
        updateAdmissaoStepPercentages();
    }
}`;

if (app.includes(OLD_FN)) {
    app = app.replace(OLD_FN, NEW_FN);
    console.log('✅ Função _updateSantanderStepUI corrigida');
} else {
    // Tentar localização mais tolerante (sem as linhas de comentário exatas)
    const OLD_SIMPLE = `if (numEl) numEl.style.display = 'none';`;
    if (app.includes(OLD_SIMPLE)) {
        // Substituir apenas as linhas problemáticas dentro da função
        app = app.replace(
            `        var numEl = stepEl.querySelector('.num, .step-number');\r\n        if (numEl) numEl.style.display = 'none';`,
            `        var numEl = stepEl.querySelector('.num, .step-number');\r\n        if (numEl) numEl.style.removeProperty('display'); // NUNCA esconder o número`
        );
        app = app.replace(
            `        var numEl = stepEl.querySelector('.num, .step-number');\n        if (numEl) numEl.style.display = 'none';`,
            `        var numEl = stepEl.querySelector('.num, .step-number');\n        if (numEl) numEl.style.removeProperty('display'); // NUNCA esconder o número`
        );

        // Substituir os style inline do iconEl pelas classes CSS
        app = app.replace(
            `        var iconEl = stepEl.querySelector('.step-icon, .step-circle, .stepper-circle');\r\n        if (iconEl) {\r\n            iconEl.style.background = '#22c55e';\r\n            iconEl.style.borderColor = '#22c55e';\r\n            iconEl.style.color = '#fff';\r\n        }`,
            `        // Aplicar via classe CSS (não via style inline - conflita com .active:not(.pc-success))\n        stepEl.classList.remove('pc-warning');\n        stepEl.classList.add('pc-success');\n        var iconEl = stepEl.querySelector('.step-icon');\n        if (iconEl) {\n            iconEl.style.removeProperty('background');\n            iconEl.style.removeProperty('border-color');\n            iconEl.style.removeProperty('color');\n        }`
        );
        app = app.replace(
            `        var iconEl = stepEl.querySelector('.step-icon, .step-circle, .stepper-circle');\n        if (iconEl) {\n            iconEl.style.background = '#22c55e';\n            iconEl.style.borderColor = '#22c55e';\n            iconEl.style.color = '#fff';\n        }`,
            `        // Aplicar via classe CSS (não via style inline - conflita com .active:not(.pc-success))\n        stepEl.classList.remove('pc-warning');\n        stepEl.classList.add('pc-success');\n        var iconEl = stepEl.querySelector('.step-icon');\n        if (iconEl) {\n            iconEl.style.removeProperty('background');\n            iconEl.style.removeProperty('border-color');\n            iconEl.style.removeProperty('color');\n        }`
        );
        console.log('✅ Função _updateSantanderStepUI corrigida (fallback partial)');
    } else {
        console.error('❌ Não foi possível localizar a função. Verifique manualmente.');
        process.exit(1);
    }
}

fs.writeFileSync(appPath, app, 'utf8');
console.log('✅ frontend/app.js salvo');
