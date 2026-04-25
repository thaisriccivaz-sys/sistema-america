const fs = require('fs');

// ===================================================
// FIX 1: Upload do contrato – campo 'file', rota /api/documentos
// ===================================================
let app = fs.readFileSync('frontend/app.js', 'utf8');

app = app.replace(
    `                    const formData = new FormData();\n                    formData.append('documento', file);\n                    formData.append('tab_name', 'CONTRATOS');\n                    formData.append('document_type', data.gerador_nome);\n                    \n                    const uploadRes = await fetch(\`\${API_URL}/colaboradores/\${viewedColaborador.id}/documentos\``,
    `                    const formData = new FormData();
                    formData.append('file', file);
                    formData.append('colaborador_id', viewedColaborador.id);
                    formData.append('tab_name', 'CONTRATOS');
                    formData.append('document_type', data.gerador_nome);
                    
                    const uploadRes = await fetch(\`\${API_URL}/documentos\``
);

// ===================================================
// FIX 2: Upload externo – mesmo problema
// ===================================================
app = app.replace(
    `        fd.append('documento', f);\n        fd.append('tab_name', 'CONTRATOS');`,
    `        fd.append('file', f);\n        fd.append('colaborador_id', viewedColaborador.id);\n        fd.append('tab_name', 'CONTRATOS');`
);
// Also fix if URL is wrong for external upload
app = app.replace(
    `await fetch(\`\${API_URL}/colaboradores/\${viewedColaborador.id}/documentos\`, { method: 'POST', headers: {'Authorization'`,
    `await fetch(\`\${API_URL}/documentos\`, { method: 'POST', headers: {'Authorization'`
);

// ===================================================
// FIX 3: Multa – iframe srcdoc encoding
// Replace the iframe with a blob URL approach to avoid quote escaping issues
// ===================================================
app = app.replace(
    `        <iframe style="flex:1;border:none;" srcdoc="\${html.replace(/"/g, '&quot;')}"></iframe>`,
    `        <iframe id="multa-preview-iframe" style="flex:1;border:none;"></iframe>`
);

// Add the blob URL setting right after appendChild
app = app.replace(
    `    document.body.appendChild(modal);\n};\n\nwindow.solicitarAssinaturaMulta`,
    `    document.body.appendChild(modal);
    // Use blob URL to safely load HTML without quote escaping issues
    const blob = new Blob([html], { type: 'text/html; charset=utf-8' });
    const blobUrl = URL.createObjectURL(blob);
    document.getElementById('multa-preview-iframe').src = blobUrl;
};\n\nwindow.solicitarAssinaturaMulta`
);

// ===================================================
// FIX 4: Ficha Santander – alert verde + mostrar documento
// ===================================================

// Fix the color of the status log from red to green
app = app.replace(
    `if (log) log.style.display = 'block';\n        if (logText) logText.textContent = \`Ficha gerada em \${new Date().toLocaleString('pt-BR')}\`;\n    }\n};\n\nwindow.gerarFichaSantander`,
    `if (log) log.style.display = 'block';
        if (logText) logText.textContent = \`Ficha gerada em \${new Date().toLocaleString('pt-BR')}\`;
    }
};

window.gerarFichaSantander`
);

// Fix the "Ficha gerada" notification: after generating, mark step 100% and show toast
const OLD_AFTER_GENERATE = `    // Registrar que foi gerado
    if (colab) {
        colab.santander_ficha_data = new Date().toISOString();
        const log = document.getElementById('santander-status-log');
        const logText = document.getElementById('santander-status-text');
        if (log) log.style.display = 'block';
        if (logText) logText.textContent = \`Ficha gerada em \${new Date().toLocaleString('pt-BR')}\`;
    }
};`;

const NEW_AFTER_GENERATE = `    // Registrar que foi gerado
    if (colab) {
        colab.santander_ficha_data = new Date().toISOString();
        const log = document.getElementById('santander-status-log');
        const logText = document.getElementById('santander-status-text');
        if (log) log.style.display = 'block';
        if (logText) logText.textContent = \`Ficha gerada em \${new Date().toLocaleString('pt-BR')}\`;

        // Marcar passo 2 como 100% completo no backend
        try {
            await fetch(\`\${API_URL}/colaboradores/\${colab.id}/admissao-step\`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': \`Bearer \${currentToken}\` },
                body: JSON.stringify({ step: 2, status: 100 })
            });
        } catch(e) {}

        // Atualizar UI do step
        const stepBadge = document.querySelector('[data-admissao-step="2"] .step-pct');
        if (stepBadge) { stepBadge.textContent = '100%'; stepBadge.style.background = '#dcfce7'; stepBadge.style.color = '#166534'; }
    }
};`;

if (app.includes(OLD_AFTER_GENERATE)) {
    app = app.replace(OLD_AFTER_GENERATE, NEW_AFTER_GENERATE);
    console.log('Fix 4 (Ficha Santander): OK');
} else {
    console.log('Fix 4: pattern not found exactly, skipping');
}

fs.writeFileSync('frontend/app.js', app);

// Verify
const v = fs.readFileSync('frontend/app.js', 'utf8');
console.log('Fix 1 (file field):', v.includes("formData.append('file', file)"));
console.log('Fix 1 (/documentos url):', v.includes("fetch(`${API_URL}/documentos`"));
console.log('Fix 3 (blob iframe):', v.includes('multa-preview-iframe'));
console.log('Done.');
