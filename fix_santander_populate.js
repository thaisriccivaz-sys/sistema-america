const fs = require('fs');
let app = fs.readFileSync('frontend/app.js', 'utf8');

const startMarker = 'window.populateSantanderPreview = function() {';
const startIdx = app.indexOf(startMarker);

if (startIdx === -1) {
    console.error('startMarker not found'); process.exit(1);
}

// Find the closing }; of this specific function
// The function ends at the first }; after startIdx
let depth = 0;
let endIdx = startIdx;
for (let i = startIdx; i < app.length; i++) {
    if (app[i] === '{') depth++;
    if (app[i] === '}') {
        depth--;
        if (depth === 0) {
            // Find the semicolon after the closing brace
            endIdx = i + 1;
            if (app[endIdx] === ';') endIdx++;
            break;
        }
    }
}

const REPLACEMENT = `// Helper: atualiza UI do Step 2 Santander (usada ao gerar e ao voltar ao passo)
window._updateSantanderStepUI = function(dataSantander) {
    var log = document.getElementById('santander-status-log');
    var logText = document.getElementById('santander-status-text');
    var elPc = document.getElementById('step-2-pc');
    var stepEl = document.getElementById('step-2');

    if (dataSantander && log) {
        log.style.display = 'block';
        if (logText) {
            try {
                var dt = new Date(dataSantander);
                logText.textContent = 'Ficha gerada em ' + dt.toLocaleString('pt-BR');
            } catch(e) { logText.textContent = 'Ficha gerada'; }
        }
        // Marcar step 2 como 100%
        if (elPc) elPc.textContent = '100%';
        if (stepEl) {
            var iconEl = stepEl.querySelector('.step-icon');
            if (iconEl) {
                iconEl.style.background = '#22c55e';
                iconEl.style.borderColor = '#22c55e';
                iconEl.style.color = '#fff';
            }
        }
    }
};

window.populateSantanderPreview = function() {
    var colab = viewedColaborador || window._admissaoColabSelecionado;
    if (!colab) return;
    window._updateSantanderStepUI(colab.santander_ficha_data);
};`;

console.log('Found function from index', startIdx, 'to', endIdx);
console.log('Old function:', JSON.stringify(app.substring(startIdx, endIdx).substring(0, 200)));

app = app.substring(0, startIdx) + REPLACEMENT + app.substring(endIdx);

// Also check/fix the gerarFichaSantander call to use the helper
const OLD_BLOCK = 'window._updateSantanderStepUI(colab.santander_ficha_data);';
if (app.includes(OLD_BLOCK)) {
    console.log('_updateSantanderStepUI already called in gerarFichaSantander ✅');
} else {
    console.log('⚠️ _updateSantanderStepUI not found in gerarFichaSantander - adding...');
    // Find the existing manual log update and add the helper call after
    const LOG_SHOW = `if (log) log.style.display = 'block';`;
    const idx2 = app.indexOf(LOG_SHOW);
    if (idx2 !== -1) {
        app = app.substring(0, idx2) + 'window._updateSantanderStepUI(colab.santander_ficha_data);\n        ' + app.substring(idx2);
        console.log('Injected _updateSantanderStepUI call');
    }
}

fs.writeFileSync('frontend/app.js', app);
console.log('Done!');
console.log('_updateSantanderStepUI count:', (app.match(/window\._updateSantanderStepUI/g)||[]).length);
console.log('File size:', app.length);
