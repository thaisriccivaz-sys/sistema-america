const fs = require('fs');
let app = fs.readFileSync('frontend/app.js', 'utf8');
const lines = app.split('\n');
const originalCount = lines.length;

// Lines 11506-11512 (0-indexed: 11505-11511) are the buttons block
// We need to replace exactly these lines
const startLine = 11505; // 0-indexed (line 11506 in 1-indexed)
const endLine = 11512;   // 0-indexed (line 11513 in 1-indexed, exclusive)

const OLD_BLOCK = lines.slice(startLine, endLine).join('\n');
console.log('OLD block:');
console.log(OLD_BLOCK.substring(0, 300));

const NEW_BLOCK_LINES = [
    `                <div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap;">`,
    `                    \${m.status === 'pendente' ? \`<button class="btn btn-sm btn-primary" onclick="window.continuarProcessoMulta(\${m.id}, '\${m.tipo_resolucao || ''}', \${colab.id})"><i class="ph ph-arrow-right"></i> Continuar Processo</button>\` : ''}`,
    `                    \${(m.status === 'doc_gerado' || m.status === 'assinado' || m.status === 'confirmado') ? \`<button style="background:#dbeafe;color:#1d4ed8;border:1.5px solid #93c5fd;border-radius:6px;padding:4px 10px;cursor:pointer;font-size:0.8rem;display:inline-flex;align-items:center;gap:4px;" onclick="window.verDocumentoMulta(\${m.id}, \${colab.id}, '\${m.tipo_resolucao || 'indicacao'}')"><i class="ph ph-eye"></i> Ver Documento</button>\` : ''}`,
    `                    \${(m.status === 'pendente' || m.status === 'doc_gerado') ? \`<button style="background:#fee2e2;color:#dc2626;border:1.5px solid #fca5a5;border-radius:6px;padding:4px 10px;cursor:pointer;font-size:0.8rem;display:inline-flex;align-items:center;gap:4px;" onclick="window.excluirMulta(\${m.id}, \${colab.id}, this)"><i class="ph ph-trash"></i> Excluir</button>\` : ''}`,
    `                </div>`,
];

// Replace the block
lines.splice(startLine, endLine - startLine, ...NEW_BLOCK_LINES);

app = lines.join('\n');

const newCount = app.split('\n').length;
const growth = app.length - fs.statSync('frontend/app.js').size;
console.log(`Lines: ${originalCount} → ${newCount} (diff: ${newCount - originalCount})`);
console.log(`Byte growth: ${growth}`);

if (Math.abs(growth) > 10000) {
    console.log('❌ Too large! Aborting.');
    process.exit(1);
}

fs.writeFileSync('frontend/app.js', app);
console.log('✅ Done. verDocumentoMulta button injected.');

// Verify
const final = fs.readFileSync('frontend/app.js', 'utf8');
console.log('ph-eye in final:', final.includes('ph-eye'));
console.log('Ver Documento in final:', final.includes('Ver Documento'));
