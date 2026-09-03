const fs = require('fs');

let c = fs.readFileSync('frontend/app.js', 'utf8');

const idx = c.indexOf('id="pm-file-emprestimo"');
if (idx !== -1) {
    const endIdx = c.indexOf('</div>', idx) + 6;
    
    const newDiv = `

                <div style="margin-bottom:1.5rem;padding:0.75rem;background:#f8fafc;border:1px solid #cbd5e1;border-radius:8px;">
                  <label style="font-size:0.8rem;font-weight:600;color:#334155;display:block;margin-bottom:4px;">
                    \uD83D\uDCE4 Comunicação (PDF Único)
                    <span style="font-weight:400;color:#64748b;font-size:0.75rem;"> — opcional, enviado igual para todos, anexado no final</span>
                  </label>
                  <input id="pm-file-comunicacao" type="file" accept=".pdf" style="width:100%;padding:0.5rem;border:1px solid #cbd5e1;border-radius:6px;background:#fff;">
                </div>`;
                
    if (!c.includes('id="pm-file-comunicacao"')) {
        c = c.substring(0, endIdx) + newDiv + c.substring(endIdx);
        fs.writeFileSync('frontend/app.js', c, 'utf8');
        console.log('Input inserido com sucesso!');
    } else {
        console.log('Input já existia.');
    }
} else {
    console.log('pm-file-emprestimo não encontrado.');
}
