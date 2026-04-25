const fs = require('fs');
let app = fs.readFileSync('frontend/app.js', 'utf8');
const origSize = app.length;

const OLD_UI = `    // === Marcar step 2 como 100% ===
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
    });`;

const NEW_UI = `    // === Marcar step 2 como 100% usando classe CSS (mantém cor mesmo quando .active) ===
    var stepEl = document.getElementById('step-2');
    if (stepEl) {
        // Remove classes conflitantes e adiciona .pc-success para verde via CSS
        stepEl.classList.remove('pc-warning', 'pc-completed');
        stepEl.classList.add('pc-success');

        // Remove inline styles que podem conflitar com o CSS
        var iconEl = stepEl.querySelector('.step-icon, .step-circle, .stepper-circle');
        if (iconEl) {
            iconEl.style.background = '';
            iconEl.style.borderColor = '';
            iconEl.style.color = '';
        }

        // Atualiza porcentagem
        var pcEl = stepEl.querySelector('.percent, .step-percent, #step-2-pc');
        if (pcEl) { pcEl.textContent = '100%'; }

        // Esconde o número e mostra o check (opcional se existir)
        var numEl = stepEl.querySelector('.num, .step-number');
        if (numEl) { numEl.style.display = ''; } // mantém normal, CSS cuida da cor
    }

    // Fallback: atualizar pelo ID direto
    var elPc = document.getElementById('step-2-pc');
    if (elPc) elPc.textContent = '100%';`;

if (app.includes(OLD_UI)) {
    app = app.replace(OLD_UI, NEW_UI);
    console.log('✅ _updateSantanderStepUI: agora usa .pc-success em vez de inline styles');
} else {
    console.log('❌ OLD_UI not found - checking partial match...');
    const idx = app.indexOf('Estratégia 1: element com id step-2-pc');
    console.log('Partial match at:', idx);
}

const growth = app.length - origSize;
console.log('Growth:', growth, 'bytes');
if (Math.abs(growth) > 10000) { console.log('❌ Too big! Aborting.'); process.exit(1); }

fs.writeFileSync('frontend/app.js', app);
console.log('Done. Lines:', app.split('\n').length);
