const fs = require('fs');
let code = fs.readFileSync('frontend/treinamento_presenca.js', 'utf8');

// Find and fix the broken section in _cardHtml
// The bad section has lines 176-179 with duplicate/corrupted return statements
const broken = `                return \`<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid #f1f5f9;">\r\n                    <i class="ph ph-check-circle" style="color:#10b981;font-size:1.1rem;flex-shrink:0;"></i>\r\n                    <div style="flex:1;min-width:0;">\r\n                return \`<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid #f1f5f9;">\r\n                    <i class="ph ph-warning-circle" style="color:#ef4444;font-size:1.1rem;flex-shrink:0;"></i>\r\n                    <div style="flex:1;min-width:0;">`;

const fixed = `                return \`<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid #f1f5f9;">\r\n                    <i class="ph ph-check-circle" style="color:#10b981;font-size:1.1rem;flex-shrink:0;"></i>\r\n                    <div style="flex:1;min-width:0;">\r\n                        <div style="font-size:0.82rem;font-weight:600;color:#334155;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="\${t.nome}">\${t.nome}</div>\r\n                        <div style="font-size:0.72rem;color:#10b981;">Concluído em \${fmtData(t.data_conclusao)}\${valStr}\${respStr}</div>\r\n                    </div>\r\n                    <div style="display:flex;flex-direction:column;gap:4px;flex-shrink:0;min-width:38px;">\r\n                        <button onclick="window._verDocTreinamento(\${c.id},\${t.id},'\${(c.nome_completo||'').replace(/'/g,\\"\\\\'\\")}')" title="Ver documento assinado" style="background:#eff6ff;color:#1d4ed8;border:1.5px solid #bfdbfe;border-radius:6px;padding:4px 8px;font-size:0.72rem;font-weight:600;cursor:pointer;white-space:nowrap;display:inline-flex;align-items:center;justify-content:center;gap:3px;width:100%;"><i class="ph ph-eye"></i></button>\r\n                        \${btnPesquisa}\r\n                    </div>\r\n                </div>\`;\r\n            } else if (t.vencido) {\r\n                return \`<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid #f1f5f9;">\r\n                    <i class="ph ph-warning-circle" style="color:#ef4444;font-size:1.1rem;flex-shrink:0;"></i>\r\n                    <div style="flex:1;min-width:0;">`;

const count = code.split(broken).length - 1;
console.log('Occurrences:', count);
if (count === 1) {
  code = code.replace(broken, fixed);
  fs.writeFileSync('frontend/treinamento_presenca.js', code);
  console.log('Fixed successfully');
} else {
  console.error('Not found. Manual inspection needed.');
  // Print the context around line 176
  const lines = code.split('\n');
  console.log('Lines 174-202:');
  console.log(lines.slice(173, 202).map((l, i) => `${174+i}: ${l}`).join('\n'));
}
