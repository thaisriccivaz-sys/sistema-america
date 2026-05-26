/**
 * cache_bust.js
 * Atualiza o timestamp de cache do app.js no index.html SEM corromper encoding UTF-8.
 * Uso: node cache_bust.js [arquivo_alvo_opcional]
 * Por padrão atualiza frontend/index.html
 */
const fs = require('fs');
const path = require('path');

const targetFile = process.argv[2] || path.join(__dirname, 'frontend', 'index.html');

let html = fs.readFileSync(targetFile, 'utf8');

// Remove BOM se presente (PowerShell Set-Content -Encoding UTF8 adiciona BOM)
if (html.charCodeAt(0) === 0xFEFF) {
    html = html.substring(1);
}

// Corrige double-encoding se necessário
if (html.includes('AmÃ') || html.includes('FÃ©') || html.includes('Ã§Ã')) {
    html = Buffer.from(html, 'latin1').toString('utf8');
    // Remove BOM novamente se criado
    if (html.charCodeAt(0) === 0xFEFF) html = html.substring(1);
    console.log('[cache_bust] Encoding corrigido (double-encoding detectado)');
}

const ts = Date.now();

// Atualiza todas as versões de scripts conhecidos
html = html.replace(/app\.js\?v=\d+/g, `app.js?v=${ts}`);
html = html.replace(/multas_logistica\.js\?v=\d+/g, `multas_logistica.js?v=${ts}`);

// Salva SEM BOM, com LF puro
fs.writeFileSync(targetFile, html, { encoding: 'utf8', flag: 'w' });

console.log(`[cache_bust] OK — versão ${ts} aplicada em ${path.basename(targetFile)}`);
