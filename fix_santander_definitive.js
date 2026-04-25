const fs = require('fs');

// ===== Fix 1: Backend - Add santander_ficha_data to allowed columns =====
let server = fs.readFileSync('backend/server.js', 'utf8');

const OLD_COLS = `        'conjuge_nome', 'conjuge_cpf'
    ];

    const allowedColunas = colunas;`;

const NEW_COLS = `        'conjuge_nome', 'conjuge_cpf',
        'santander_ficha_data'
    ];

    const allowedColunas = colunas;`;

if (server.includes(OLD_COLS)) {
    server = server.replace(OLD_COLS, NEW_COLS);
    console.log('✅ Backend PUT - santander_ficha_data added to allowed columns');
} else {
    // Try just the conjuge line with flexible whitespace
    const idx = server.indexOf("'conjuge_nome', 'conjuge_cpf'");
    if (idx !== -1) {
        server = server.substring(0, idx + "'conjuge_nome', 'conjuge_cpf'".length) 
                + ",\n        'santander_ficha_data'" 
                + server.substring(idx + "'conjuge_nome', 'conjuge_cpf'".length);
        console.log('✅ Backend PUT - santander_ficha_data injected after conjuge_cpf');
    } else {
        console.log('❌ Could not find conjuge columns!');
    }
}

// Also add to the DB schema migration (make sure the column exists)
// Add a migration at server startup if column doesn't exist
const MIGRATION_TARGET = '// --- ROTAS DE COLABORADORES ---';
const MIGRATION_CODE = `// Auto-migration: add santander_ficha_data column if it doesn't exist
db.run("ALTER TABLE colaboradores ADD COLUMN santander_ficha_data TEXT", (err) => {
    if (err && !err.message.includes('duplicate column')) {
        console.error('[Migration] Erro ao adicionar santander_ficha_data:', err.message);
    } else if (!err) {
        console.log('[Migration] Coluna santander_ficha_data adicionada com sucesso');
    }
});

// --- ROTAS DE COLABORADORES ---`;

if (!server.includes('santander_ficha_data TEXT')) {
    server = server.replace(MIGRATION_TARGET, MIGRATION_CODE);
    console.log('✅ Backend - auto-migration para santander_ficha_data adicionada');
} else {
    console.log('⚠️ Migration já existe, pulando.');
}

fs.writeFileSync('backend/server.js', server);
console.log('Backend saved.');

// ===== Fix 2: Frontend - Fix Logo to full width =====
let app = fs.readFileSync('frontend/app.js', 'utf8');

// Fix logo size in the Santander template
const OLD_LOGO_STYLE = `.logo-area img { height: 80px; max-width: 280px; object-fit: contain; }`;
const NEW_LOGO_STYLE = `.logo-area img { width: 100%; max-height: 100px; object-fit: contain; object-position: left; }`;

if (app.includes(OLD_LOGO_STYLE)) {
    app = app.replace(OLD_LOGO_STYLE, NEW_LOGO_STYLE);
    console.log('✅ Frontend - Logo style updated to full width');
} else {
    // Try to fix by finding the img height style
    const idx = app.indexOf('height: 80px; max-width: 280px;');
    if (idx !== -1) {
        app = app.substring(0, idx) + 'width: 100%; max-height: 100px;' + app.substring(idx + 'height: 80px; max-width: 280px;'.length);
        console.log('✅ Frontend - Logo style patched');
    } else {
        console.log('⚠️ Logo style not found, skipping');
    }
}

// ===== Fix 3: Frontend - Robust _updateSantanderStepUI =====
// Find and replace the current (possibly broken) _updateSantanderStepUI
const OLD_HELPER_START = '// Helper: atualiza UI do Step 2 Santander (usada ao gerar e ao voltar ao passo)\nwindow._updateSantanderStepUI = function(dataSantander) {';
const OLD_HELPER_END = '};';

const helperStart = app.indexOf('window._updateSantanderStepUI = function(dataSantander)');
if (helperStart !== -1) {
    // Find the closing };
    let depth = 0;
    let end = helperStart;
    for (let i = helperStart; i < app.length; i++) {
        if (app[i] === '{') depth++;
        if (app[i] === '}') {
            depth--;
            if (depth === 0) {
                end = i + 1;
                if (app[end] === ';') end++;
                break;
            }
        }
    }
    
    const ROBUST_HELPER = `window._updateSantanderStepUI = function(dataSantander) {
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

    app = app.substring(0, helperStart) + ROBUST_HELPER + app.substring(end);
    console.log('✅ Frontend - _updateSantanderStepUI replaced with robust version');
} else {
    console.log('⚠️ _updateSantanderStepUI not found in app.js');
}

// Fix populateSantanderPreview to ALSO fetch from server if colab data is stale
const OLD_POPULATE = `window.populateSantanderPreview = function() {
    const colab = viewedColaborador || window._admissaoColabSelecionado;
    if (!colab) return;
    window._updateSantanderStepUI(colab.santander_ficha_data);
};`;

const NEW_POPULATE = `window.populateSantanderPreview = async function() {
    var colab = viewedColaborador || window._admissaoColabSelecionado;
    if (!colab) return;

    // Se ainda não tem a data, busca do servidor (dados podem estar desatualizados na memória)
    if (!colab.santander_ficha_data && colab.id) {
        try {
            var fresh = await apiGet('/colaboradores/' + colab.id);
            if (fresh && fresh.santander_ficha_data) {
                colab.santander_ficha_data = fresh.santander_ficha_data;
                if (viewedColaborador) viewedColaborador.santander_ficha_data = fresh.santander_ficha_data;
            }
        } catch(e) { /* silent */ }
    }

    window._updateSantanderStepUI(colab.santander_ficha_data);
};`;

if (app.includes(OLD_POPULATE)) {
    app = app.replace(OLD_POPULATE, NEW_POPULATE);
    console.log('✅ Frontend - populateSantanderPreview now fetches fresh data from server');
} else {
    const idx = app.indexOf('window.populateSantanderPreview');
    console.log('⚠️ populateSantanderPreview not found at expected location, idx:', idx);
}

fs.writeFileSync('frontend/app.js', app);
console.log('Frontend saved. Size:', app.length);
