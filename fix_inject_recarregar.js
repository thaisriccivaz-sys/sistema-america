const fs = require('fs');
let app = fs.readFileSync('frontend/app.js', 'utf8');

// Verify there's no definition
const hasDefinition = app.includes('window._recarregarListaMultas = ') || app.includes('_recarregarListaMultas = async');
console.log('Definition exists:', hasDefinition);

if (!hasDefinition) {
    const DEFINITION = `
// ============================================================
// HELPER: Recarrega a lista de multas em tempo real
// ============================================================
window._recarregarListaMultas = async function(colabId) {
    var tabContent = document.getElementById('tab-dynamic-content');
    if (tabContent && typeof window.renderMultasMotoristaTab === 'function') {
        tabContent.innerHTML = '';
        await window.renderMultasMotoristaTab(tabContent);
    }
};

`;

    // Inject right before renderMultasMotoristaTab
    const TARGET = 'window.renderMultasMotoristaTab = async function(container) {';
    const idx = app.indexOf(TARGET);

    if (idx === -1) {
        console.error('renderMultasMotoristaTab not found!');
        process.exit(1);
    }

    app = app.substring(0, idx) + DEFINITION + app.substring(idx);
    fs.writeFileSync('frontend/app.js', app);

    // Verify
    const newMatches = [...app.matchAll(/_recarregarListaMultas/g)];
    console.log('Occurrences after fix:', newMatches.length);
    newMatches.forEach(m => {
        const ctx = app.substring(m.index - 5, m.index + 60).replace(/[\r\n]/g, '|');
        console.log(' -', ctx);
    });
    console.log('File size:', app.length);
} else {
    console.log('Definition already present, skipping.');
}
