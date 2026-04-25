const fs = require('fs');
let app = fs.readFileSync('frontend/app.js', 'utf8');

// Fix the buttons area using the exact text from the file
const ORIGINAL = `                \${(m.status === 'pendente' || m.status === 'doc_gerado') ? \`\r\n                \u003cdiv style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap;"\u003e\r\n                    \${m.status === 'pendente' ? \`\u003cbutton class="btn btn-sm btn-primary" onclick="window.continuarProcessoMulta(\${m.id}, '\${m.tipo_resolucao || ''}', \${colab.id})"\u003e\u003ci class="ph ph-arrow-right"\u003e\u003c/i\u003e Continuar Processo\u003c/button\u003e\` : ''}\r\n                    \u003cbutton style="background:#fee2e2;color:#dc2626;border:1.5px solid #fca5a5;border-radius:6px;padding:4px 10px;cursor:pointer;font-size:0.8rem;display:inline-flex;align-items:center;gap:4px;" onclick="window.excluirMulta(\${m.id}, \${colab.id}, this)"\u003e\r\n                        \u003ci class="ph ph-trash"\u003e\u003c/i\u003e Excluir\r\n                    \u003c/button\u003e\r\n                \u003c/div\u003e\` : ''}`;

console.log('Exact match:', app.includes(ORIGINAL));

// Find the area by a shorter anchor
const ANCHOR = "window.continuarProcessoMulta(${m.id}";
const anchorIdx = app.indexOf(ANCHOR);
console.log('Anchor found at:', anchorIdx);

if (anchorIdx !== -1) {
    // Find start of the ternary condition block
    const blockStart = app.lastIndexOf('${(m.status', anchorIdx);
    const blockEnd = app.indexOf("`: ''}", anchorIdx) + "`: ''}".length;
    console.log('Block from', blockStart, 'to', blockEnd);
    console.log('Block content:', app.substring(blockStart, blockEnd).substring(0, 200));
    
    const REPLACEMENT = `<div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap;">
                    \${m.status === 'pendente' ? \`<button class="btn btn-sm btn-primary" onclick="window.continuarProcessoMulta(\${m.id}, '\${m.tipo_resolucao || ''}', \${colab.id})"><i class="ph ph-arrow-right"></i> Continuar Processo</button>\` : ''}
                    \${(m.status === 'doc_gerado' || m.status === 'assinado' || m.status === 'confirmado') ? \`<button style="background:#dbeafe;color:#1d4ed8;border:1.5px solid #93c5fd;border-radius:6px;padding:4px 10px;cursor:pointer;font-size:0.8rem;display:inline-flex;align-items:center;gap:4px;" onclick="window.verDocumentoMulta(\${m.id}, \${colab.id}, '\${m.tipo_resolucao || 'indicacao'}')"><i class="ph ph-eye"></i> Ver Documento</button>\` : ''}
                    \${(m.status === 'pendente' || m.status === 'doc_gerado') ? \`<button style="background:#fee2e2;color:#dc2626;border:1.5px solid #fca5a5;border-radius:6px;padding:4px 10px;cursor:pointer;font-size:0.8rem;display:inline-flex;align-items:center;gap:4px;" onclick="window.excluirMulta(\${m.id}, \${colab.id}, this)"><i class="ph ph-trash"></i> Excluir</button>\` : ''}
                </div>`;
    
    app = app.substring(0, blockStart) + REPLACEMENT + app.substring(blockEnd);
    console.log('✅ Buttons replaced');
}

fs.writeFileSync('frontend/app.js', app);
console.log('Done. Size:', app.length);
