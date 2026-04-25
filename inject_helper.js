const fs = require('fs');
let app = fs.readFileSync('frontend/app.js', 'utf8');

const HELPER = `// Recarrega a aba de multas em tempo real
window._recarregarListaMultas = async function(colabId) {
    const tabContent = document.getElementById('tab-dynamic-content');
    if (tabContent) {
        tabContent.innerHTML = '';
        await window.renderMultasMotoristaTab(tabContent);
    }
};

`;

const TARGET = 'window.renderMultasMotoristaTab = async function(container) {';
const idx = app.indexOf(TARGET);
if (idx === -1) {
    console.error('Target not found!');
    process.exit(1);
}

// Check if helper already injected
if (app.includes('window._recarregarListaMultas')) {
    console.log('Helper already injected, skipping.');
    process.exit(0);
}

app = app.substring(0, idx) + HELPER + app.substring(idx);
fs.writeFileSync('frontend/app.js', app);
console.log('Helper injected. New length:', app.length);
