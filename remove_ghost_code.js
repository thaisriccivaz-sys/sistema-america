const fs = require('fs');
const lines = fs.readFileSync('backend/server.js', 'utf8').split('\n');

// Remove linhas 2258 até 2354 (0-indexed: 2258 a 2353)
// Sao as linhas fantasmas do bloco duplicado de foto upload que crashou o sintaxe
const startRemove = 2258; // linha 2259 (0-indexed = 2258)
const endRemove = 2354;   // linha 2355 (0-indexed = 2354) — mantemos a linha "// --- ROTAS DE DEPENDENTES ---"

const removed = lines.splice(startRemove, endRemove - startRemove);
console.log(`Removidas ${removed.length} linhas (${startRemove+1} até ${endRemove})`);
console.log('Primeira linha removida:', removed[0]);
console.log('Ultima linha removida:', removed[removed.length - 1]);

fs.writeFileSync('backend/server.js', lines.join('\n'), 'utf8');
console.log('Arquivo salvo com sucesso.');
