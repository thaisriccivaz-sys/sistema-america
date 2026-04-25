const fs = require('fs');
let app = fs.readFileSync('frontend/app.js', 'utf8');

// Make gerarFichaSantander async
app = app.replace(
    'window.gerarFichaSantander = function() {',
    'window.gerarFichaSantander = async function() {'
);

// Find the exact position to insert after logText line
const searchStr = "if (logText) logText.textContent = `Ficha gerada em ${new Date().toLocaleString('pt-BR')}`;";
const idx = app.indexOf(searchStr, app.indexOf('window.gerarFichaSantander'));
if (idx === -1) {
    console.error('String not found!');
    process.exit(1);
}

const insertAfter = idx + searchStr.length;
const toInsert = `

        // Salvar data no backend e mostrar toast
        try { await apiPut(\`/colaboradores/\${colab.id}/admissao\`, { santander_ficha_data: colab.santander_ficha_data }); } catch(e) {}
        if (typeof showToast === 'function') showToast('Ficha Santander gerada com sucesso!', 'success');`;

app = app.substring(0, insertAfter) + toInsert + app.substring(insertAfter);
fs.writeFileSync('frontend/app.js', app);
console.log('Done.');
console.log('async OK:', app.includes('window.gerarFichaSantander = async function'));
console.log('toast OK:', app.includes("showToast('Ficha Santander gerada"));
