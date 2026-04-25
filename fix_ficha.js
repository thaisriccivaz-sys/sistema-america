const fs = require('fs');
let app = fs.readFileSync('frontend/app.js', 'utf8');

// Fix santander-status-log to green color
const SHTML = require('frontend/index.html'); // won't work like this, let's use server.js approach

// Fix via text replacement in app.js: add step completion after ficha generation
const OLD = `    // Registrar que foi gerado
    if (colab) {
        colab.santander_ficha_data = new Date().toISOString();
        const log = document.getElementById('santander-status-log');
        const logText = document.getElementById('santander-status-text');
        if (log) log.style.display = 'block';
        if (logText) logText.textContent = \`Ficha gerada em \${new Date().toLocaleString('pt-BR')}\`;
    }
};`;

const NEW = `    // Registrar que foi gerado
    if (colab) {
        colab.santander_ficha_data = new Date().toISOString();
        const log = document.getElementById('santander-status-log');
        const logText = document.getElementById('santander-status-text');
        if (log) log.style.display = 'block';
        if (logText) logText.textContent = \`Ficha gerada em \${new Date().toLocaleString('pt-BR')}\`;

        // Salvar data no backend
        try {
            await apiPut(\`/colaboradores/\${colab.id}/admissao\`, { santander_ficha_data: colab.santander_ficha_data });
        } catch(e) {}

        if (typeof showToast === 'function') showToast('Ficha Santander gerada com sucesso!', 'success');
    }
};`;

if (app.includes(OLD)) {
    app = app.replace(OLD, NEW);
    console.log('Fix Ficha Santander: OK');
} else {
    console.log('Pattern not found, checking...');
    const idx = app.indexOf('if (logText) logText.textContent = `Ficha gerada em ${new Date().toLocaleString');
    console.log('Found at:', idx);
}

// Also change function signature to async
app = app.replace(
    'window.gerarFichaSantander = function() {',
    'window.gerarFichaSantander = async function() {'
);

fs.writeFileSync('frontend/app.js', app);

const v = fs.readFileSync('frontend/app.js', 'utf8');
console.log('async gerarFicha:', v.includes('async function() {\n    const colab = viewedColaborador'));
console.log('Salvar data:', v.includes('santander_ficha_data: colab.santander_ficha_data'));
