const fs = require('fs');
let app = fs.readFileSync('frontend/app.js', 'utf8');

// Find and replace populateSantanderPreview using char-level search
const START = 'window.populateSantanderPreview = function() {\n    var colab = viewedColaborador || window._admissaoColabSelecionado;\n    if (!colab) return;\n    window._updateSantanderStepUI(colab.santander_ficha_data);\n};';

const REPLACEMENT = `window.populateSantanderPreview = async function() {
    var colab = viewedColaborador || window._admissaoColabSelecionado;
    if (!colab) return;

    // Se ainda não tem a data na memória, busca do servidor (dados podem estar desatualizados)
    if (!colab.santander_ficha_data && colab.id) {
        try {
            var fresh = await apiGet('/colaboradores/' + colab.id);
            if (fresh && fresh.santander_ficha_data) {
                colab.santander_ficha_data = fresh.santander_ficha_data;
                if (viewedColaborador) viewedColaborador.santander_ficha_data = fresh.santander_ficha_data;
            }
        } catch(e) { /* silent fail */ }
    }

    window._updateSantanderStepUI(colab.santander_ficha_data);
};`;

if (app.includes(START)) {
    app = app.replace(START, REPLACEMENT);
    console.log('✅ populateSantanderPreview replaced with async server-fetch version');
} else {
    // Try with CRLF
    const START2 = 'window.populateSantanderPreview = function() {\n    var colab = viewedColaborador || window._admissaoColabSelecionado;\n    if (!colab) return;\n    window._updateSantanderStepUI(colab.santander_ficha_data);\n};\r';
    if (app.includes(START2)) {
        app = app.replace(START2, REPLACEMENT + '\r');
        console.log('✅ populateSantanderPreview replaced (CRLF variant)');
    } else {
        // Use indexOf + braces counting
        const funcStart = app.indexOf('window.populateSantanderPreview = function()');
        if (funcStart !== -1) {
            let depth = 0, end = funcStart;
            for (let i = funcStart; i < app.length; i++) {
                if (app[i] === '{') depth++;
                if (app[i] === '}') { depth--; if (depth === 0) { end = i+1; if (app[end] === ';') end++; break; } }
            }
            app = app.substring(0, funcStart) + REPLACEMENT + app.substring(end);
            console.log('✅ populateSantanderPreview replaced via brace counting');
        } else {
            console.log('❌ populateSantanderPreview not found!');
        }
    }
}

fs.writeFileSync('frontend/app.js', app);
console.log('Done. File size:', app.length);

// Verify
const count = (app.match(/populateSantanderPreview/g)||[]).length;
const hasAsync = app.includes('populateSantanderPreview = async function');
const hasFresh = app.includes("apiGet('/colaboradores/");
console.log('populateSantanderPreview occurrences:', count);
console.log('Is async:', hasAsync);
console.log('Fetches fresh from API:', hasFresh);
