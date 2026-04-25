const fs = require('fs');
let content = fs.readFileSync('frontend/app.js', 'utf8');

// Read with exact line numbers: lines 11184-11211 (0-indexed: 11183-11210)
const lines = content.split('\n');
console.log('Total lines:', lines.length);
console.log('Line 11184:', lines[11183].trim());
console.log('Line 11190:', lines[11189].trim());
console.log('Line 11212:', lines[11211].trim());

// Replace lines 11184-11212 (0-indexed 11183-11211)
// with new content using CSS classes
const NEW_LINES = [
    '', // replaces "    // === Marcar step 2 como 100% ==="
    '    // === Marcar step 2 como 100% usando classe CSS ===',
    '    // Usar .pc-success no step-item garante que o verde persista mesmo quando .active é aplicado.',
    '    // Inline styles são sobrescritos pelo CSS .step-item.active:not(.pc-success) { !important }',
    '    var stepEl = document.getElementById(\'step-2\');',
    '    if (stepEl) {',
    '        // Adicionar classe pc-success que já existe no style.css (mantém verde mesmo com .active)',
    '        stepEl.classList.remove(\'pc-warning\');',
    '        stepEl.classList.add(\'pc-success\');',
    '',
    '        // Limpar inline styles que conflitam com o CSS',
    '        var iconEl = stepEl.querySelector(\'.step-icon, .step-circle, .stepper-circle\');',
    '        if (iconEl) {',
    '            iconEl.style.background = \'\';',
    '            iconEl.style.borderColor = \'\';',
    '            iconEl.style.color = \'\';',
    '        }',
    '',
    '        // Atualizar percentagem',
    '        var pcEl = stepEl.querySelector(\'.percent, .step-percent, #step-2-pc\');',
    '        if (pcEl) { pcEl.style.background = \'\'; pcEl.textContent = \'100%\'; }',
    '    }',
    '',
    '    // Fallback: pelo ID direto',
    '    var elPc = document.getElementById(\'step-2-pc\');',
    '    if (elPc) elPc.textContent = \'100%\';',
];

// Build a regex replacement for the block between "=== Marcar step 2" and the end "});"
// Find lines 11183 to 11211 inclusive (0-indexed)
const startIdx = 11183; // 0-indexed = line 11184 (the "// === Marcar step")

// Find where "Estratégia 3" block ends
let endIdx = 11211; // 0-indexed = line 11212 (the closing })

// Show what we're replacing
console.log('\nReplacing lines', startIdx+1, 'to', endIdx+1);
const oldLines = lines.slice(startIdx, endIdx + 1);
console.log('Old block (first 3):', oldLines.slice(0, 3).map(l => l.trim()));

// Do the splice
lines.splice(startIdx, endIdx - startIdx + 1, ...NEW_LINES);

const newContent = lines.join('\n');
const growth = newContent.length - content.length;
console.log('Growth:', growth, 'bytes');

if (Math.abs(growth) > 15000) {
    console.log('ERROR: too much growth!');
    process.exit(1);
}

fs.writeFileSync('frontend/app.js', newContent);
console.log('Done. New lines:', newContent.split('\n').length);

// Verify
const final = fs.readFileSync('frontend/app.js', 'utf8');
console.log('Has pc-success:', final.includes('pc-success'));
console.log('Has 22c55e inline:', final.includes('#22c55e'));
