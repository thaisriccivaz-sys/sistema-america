const fs = require('fs');

// ===== Fix 1: Frontend — change wrong endpoint to correct one =====
let app = fs.readFileSync('frontend/app.js', 'utf8');

const OLD_APIPUT = `try { await window.apiPut(\`/colaboradores/\${colab.id}/admissao\`, { santander_ficha_data: colab.santander_ficha_data }); } catch(e) {}`;

const NEW_APIPUT = `try {
            // Salvar santander_ficha_data diretamente no colaborador (endpoint correto)
            await fetch(\`\${API_URL}/colaboradores/\${colab.id}\`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': \`Bearer \${currentToken}\` },
                body: JSON.stringify({ santander_ficha_data: colab.santander_ficha_data })
            });
            console.log('[Santander] Data salva no banco:', colab.santander_ficha_data);
        } catch(e) { console.error('[Santander] Erro ao salvar data:', e); }`;

if (app.includes(OLD_APIPUT)) {
    app = app.replace(OLD_APIPUT, NEW_APIPUT);
    console.log('✅ Frontend: endpoint corrigido de /admissao para /colaboradores/:id');
} else {
    console.log('❌ OLD_APIPUT não encontrado - buscando variante...');
    const idx = app.indexOf('/colaboradores/${colab.id}/admissao');
    console.log('  variant idx:', idx);
    if (idx !== -1) {
        // Find the whole line
        const lineStart = app.lastIndexOf('\n', idx) + 1;
        const lineEnd = app.indexOf('\n', idx) + 1;
        console.log('  Line:', app.substring(lineStart, lineEnd));
    }
}

// ===== Fix 2: Fix logo to be centered in the PDF =====
const OLD_LOGO = `  .logo-area img { width: 100%; max-height: 100px; object-fit: contain; object-position: left; }`;
const NEW_LOGO = `  .logo-area { text-align: center; }
  .logo-area img { width: 100%; max-height: 100px; object-fit: contain; object-position: center; }`;

if (app.includes(OLD_LOGO)) {
    app = app.replace(OLD_LOGO, NEW_LOGO);
    console.log('✅ Frontend: logo centralizado');
} else {
    // Try without leading spaces
    const idx2 = app.indexOf('object-position: left');
    if (idx2 !== -1) {
        app = app.replace('object-position: left', 'object-position: center');
        console.log('✅ Frontend: object-position corrigido para center');
    } else {
        console.log('⚠️ Logo style not found');
    }
}

fs.writeFileSync('frontend/app.js', app);
console.log('Frontend saved. Size:', app.length);

// ===== Fix 3: Verify backend has santander_ficha_data in allowed columns =====
let server = fs.readFileSync('backend/server.js', 'utf8');

const hasCol = server.includes("'santander_ficha_data'");
const hasMigration = server.includes('ALTER TABLE colaboradores ADD COLUMN santander_ficha_data');
console.log('Backend santander_ficha_data in columns:', hasCol);
console.log('Backend migration present:', hasMigration);

if (!hasCol) {
    // Add to allowed columns in PUT /api/colaboradores/:id
    const TARGET = "'conjuge_nome', 'conjuge_cpf'";
    if (server.includes(TARGET)) {
        server = server.replace(TARGET, TARGET + ",\n        'santander_ficha_data'");
        fs.writeFileSync('backend/server.js', server);
        console.log('✅ Backend: santander_ficha_data added to PUT allowed columns');
    } else {
        console.log('❌ Could not find conjuge columns in backend');
    }
}

if (!hasMigration) {
    const MIGRATION_TARGET = '// --- ROTAS DE COLABORADORES ---';
    const MIGRATION_CODE = `// Auto-migration: ensure santander_ficha_data column exists
db.run("ALTER TABLE colaboradores ADD COLUMN santander_ficha_data TEXT", function(err) {
    if (err && !err.message.includes('duplicate column')) {
        console.error('[Migration] santander_ficha_data:', err.message);
    } else if (!err) {
        console.log('[Migration] Coluna santander_ficha_data criada');
    }
});

// --- ROTAS DE COLABORADORES ---`;
    server = server.replace(MIGRATION_TARGET, MIGRATION_CODE);
    fs.writeFileSync('backend/server.js', server);
    console.log('✅ Backend: migration adicionada');
}

// Summary check
const appFinal = fs.readFileSync('frontend/app.js', 'utf8');
console.log('\n=== VERIFICAÇÃO FINAL ===');
console.log('Endpoint correto (/colaboradores/:id PUT):', appFinal.includes("API_URL}/colaboradores/\${colab.id}\`, {\n                method: 'PUT'"));
console.log('Rota errada (/admissao) removida:', !appFinal.includes('/colaboradores/${colab.id}/admissao'));
console.log('Logo centrado:', appFinal.includes('object-position: center'));
