const fs = require('fs');
let js = fs.readFileSync('frontend/app.js', 'utf8');

const replacement = `window.nextAdmissaoStep = function(step, preventScroll = false) {
    window.currentActiveAdmissaoStep = step;
    
    // Clear and set active up to current step
    document.querySelectorAll('.admissao-stepper .step-item').forEach((s, idx) => {
        const itemStep = idx + 1;
        if (itemStep <= step) {
            s.classList.add('active');
        } else {
            s.classList.remove('active');
        }
    });

    // Atualizar Panels
    document.querySelectorAll('.admissao-panel').forEach(p => p.classList.remove('active'));
    const panel = document.getElementById(\`panel-step-\${step}\`);
    if (panel) panel.classList.add('active');
    if (panel) panel.style.display = ''; // force show if it had inline none
    
    // Se for Passo 2: carregar status do certificado digital
    if (step === 2 && typeof window.carregarStatusCertificado === 'function') {
        window.carregarStatusCertificado();
    }

    // Se for Passo 4, verificar se mostra linha de Exames Motorista
    if (step === 4 && window.viewedColaborador) {
        const rowExames = document.getElementById('row-aso-exames');
        if (rowExames) {
            rowExames.style.display = (viewedColaborador.cargo || '').toLowerCase().includes('motorista') ? 'flex' : 'none';
        }
    }

    if (!preventScroll) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
};`;

js = js.replace(/window\.nextAdmissaoStep = function\(step, preventScroll = false\) \{[\s\S]*?item\.classList\.toggle\('active', itemStep === step\);\s+\}\);\s+if \(!preventScroll\) \{[\s\S]*?\}\s+\};/m, replacement);

fs.writeFileSync('frontend/app.js', js, 'utf8');
