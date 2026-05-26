const fs = require('fs');
let html = fs.readFileSync('frontend/index.html', 'utf8');

const oldDest = `<div style="grid-column:1/-1;border-top:1px solid #e2e8f0;padding-top:1rem;margin-top:0.5rem;">
                                        <p style="font-size:0.8rem;font-weight:700;color:#475569;margin:0 0 0.75rem;text-transform:uppercase;letter-spacing:0.05em;">Destinador</p>
                                    </div>
                                    <div style="grid-column:1/-1;">
                                        <label style="font-size:0.82rem;font-weight:600;color:#475569;display:block;margin-bottom:4px;">Nome do Destinador *</label>
                                        <input type="text" id="mtr-destinador-nome" required placeholder="Nome do destinador" style="width:100%;padding:0.6rem 0.75rem;border:1px solid #e2e8f0;border-radius:8px;font-size:0.9rem;box-sizing:border-box;">
                                    </div>`;

const newDest = `<div style="grid-column:1/-1;border-top:1px solid #e2e8f0;padding-top:1rem;margin-top:0.5rem;">
                                        <p style="font-size:0.8rem;font-weight:700;color:#475569;margin:0 0 0.75rem;text-transform:uppercase;letter-spacing:0.05em;">Destinador</p>
                                    </div>
                                    <div style="grid-column:1/-1;">
                                        <label style="font-size:0.82rem;font-weight:600;color:#475569;display:block;margin-bottom:4px;">Selecionar Destinador</label>
                                        <select id="mtr-destinador-preset" onchange="window.preencherDestinador(this.value)" style="width:100%;padding:0.6rem 0.75rem;border:1px solid #e2e8f0;border-radius:8px;font-size:0.9rem;background:#fff;box-sizing:border-box;margin-bottom:0.75rem;">
                                            <option value="">-- Selecione ou preencha manualmente --</option>
                                            <option value="brk">BRK AMBIENTAL - MAUÁ S.A.</option>
                                            <option value="attend">ATTEND AMBIENTAL S.A.</option>
                                        </select>
                                    </div>
                                    <div style="grid-column:1/-1;">
                                        <label style="font-size:0.82rem;font-weight:600;color:#475569;display:block;margin-bottom:4px;">Nome do Destinador *</label>
                                        <input type="text" id="mtr-destinador-nome" required placeholder="Nome do destinador" style="width:100%;padding:0.6rem 0.75rem;border:1px solid #e2e8f0;border-radius:8px;font-size:0.9rem;box-sizing:border-box;">
                                    </div>`;

if(html.includes(oldDest)) {
    html = html.replace(oldDest, newDest);
    fs.writeFileSync('frontend/index.html', html);
    console.log('HTML DEST OK');
} else {
    console.log('NOT FOUND - checking...');
    console.log(html.includes('mtr-destinador-nome'));
}
